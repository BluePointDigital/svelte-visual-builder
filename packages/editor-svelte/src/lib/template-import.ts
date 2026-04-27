import type {
	BuilderDocument,
	BuilderNode,
	BuilderPackage,
	ClassDefinition,
	CollectionDefinition,
	DocumentKind,
	JsonValue,
	MediaAsset,
	StyleSet,
	ThemeAssignment,
	VariableDefinition,
} from '@builder/schema';
import { BuilderDocumentSchema, BuilderPackageSchema, BuilderNodeSchema, parseBuilderPackage, slugify } from '@builder/schema';
import { importHtmlPackage, type HtmlImportPayload } from './html-import';
import { mergeMediaCatalog, normalizeMediaAsset } from './media';

export type TemplateImportSource = 'builder-package' | 'elementor' | 'html';
export type TemplateImportDestination = 'library' | 'active-page' | 'new-page';

export interface TemplateImportCleanupOptions {
	preserveRawCss: boolean;
	convertCommonCss: boolean;
	importEditableNodes: boolean;
	fallbackUnknownToHtml: true;
}

export interface TemplateImportOptions {
	sourceName?: string;
	destination?: TemplateImportDestination;
	activeDocumentId?: string;
}

export interface TemplateImportDiagnostic {
	code: string;
	message: string;
	severity?: 'info' | 'warning' | 'unsupported';
	sourceKey?: string;
}

export interface TemplateImportSummary {
	source: TemplateImportSource;
	sourceName: string;
	documentCount: number;
	libraryItemCount: number;
	componentCount: number;
	nodeCount?: number;
	assetCount?: number;
	cssBlockCount?: number;
}

export interface TemplateImportResult {
	project: BuilderPackage;
	importedDocumentIds: string[];
	importedLibraryDocumentIds: string[];
	warnings: TemplateImportDiagnostic[];
	parityGaps: TemplateImportDiagnostic[];
	summary: TemplateImportSummary;
}

export interface TemplateImportStructureNode {
	id: string;
	type: string;
	label: string;
	fallback: boolean;
	children: TemplateImportStructureNode[];
}

export interface TemplateImportAssetSummary {
	kind: 'image' | 'link' | 'font' | 'media' | 'external';
	value: string;
	sourceKey?: string;
}

export interface TemplateImportCssSummary {
	label: string;
	css: string;
}

export interface TemplateImportReviewResult {
	source: TemplateImportSource;
	sourceName: string;
	project: BuilderPackage;
	warnings: TemplateImportDiagnostic[];
	parityGaps: TemplateImportDiagnostic[];
	summary: TemplateImportSummary;
	structure: TemplateImportStructureNode[];
	assets: TemplateImportAssetSummary[];
	cssBlocks: TemplateImportCssSummary[];
	cleanupOptions: TemplateImportCleanupOptions;
}

type IdMap = Map<string, string>;
type NameMap = Map<string, string>;

const LIBRARY_DOCUMENT_KINDS = new Set<DocumentKind>( [ 'page', 'layout', 'template', 'popup', 'kit', 'library-item' ] );

export async function importTemplatesIntoProject(
	currentProject: BuilderPackage,
	payload: unknown,
	options: TemplateImportOptions = {},
): Promise<TemplateImportResult> {
	const sourceName = options.sourceName?.trim() || 'Imported Template';
	const review = await reviewTemplateImportPayload( payload, { sourceName } );
	return commitTemplateImportReview( currentProject, review, options );
}

export async function importHtmlIntoProject(
	currentProject: BuilderPackage,
	payload: HtmlImportPayload,
	options: TemplateImportOptions = {},
): Promise<TemplateImportResult> {
	const sourceName = payload.sourceName?.trim() || options.sourceName?.trim() || 'Imported HTML';
	const review = reviewHtmlImportPayload( { ...payload, sourceName } );
	return commitTemplateImportReview( currentProject, review, options );
}

export async function reviewTemplateImportPayload(
	payload: unknown,
	options: TemplateImportOptions = {},
): Promise<TemplateImportReviewResult> {
	const sourceName = options.sourceName?.trim() || 'Imported Template';
	const detected = await detectTemplatePayload( payload, sourceName );
	return createImportReview( detected, sourceName );
}

export function reviewHtmlImportPayload( payload: HtmlImportPayload, options: TemplateImportOptions = {} ): TemplateImportReviewResult {
	const sourceName = payload.sourceName?.trim() || options.sourceName?.trim() || 'Imported HTML';
	const result = importHtmlPackage( { ...payload, sourceName } );
	return createImportReview( {
		source: 'html',
		project: result.project,
		warnings: result.warnings,
		parityGaps: result.parityGaps,
	}, sourceName );
}

export function commitTemplateImportReview(
	currentProject: BuilderPackage,
	review: TemplateImportReviewResult,
	options: TemplateImportOptions = {},
): TemplateImportResult {
	return mergeImportedProject( currentProject, {
		source: review.source,
		project: review.project,
		warnings: review.warnings,
		parityGaps: review.parityGaps,
	}, review.sourceName, options );
}

function mergeImportedProject(
	currentProject: BuilderPackage,
	detected: {
		source: TemplateImportSource;
		project: BuilderPackage;
		warnings: TemplateImportDiagnostic[];
		parityGaps: TemplateImportDiagnostic[];
	},
	sourceName: string,
	options: TemplateImportOptions = {},
): TemplateImportResult {
	const importedProject = detected.project;
	const destination = options.destination ?? 'library';
	const activeDocumentId = options.activeDocumentId;

	if ( importedProject.documents.length === 0 ) {
		throw new Error( 'The template file did not contain any importable documents.' );
	}
	if ( destination === 'active-page' && !activeDocumentId ) {
		throw new Error( 'Choose an active page before importing into the current page.' );
	}
	if ( destination === 'active-page' && !currentProject.documents.some( ( document ) => document.id === activeDocumentId ) ) {
		throw new Error( 'The active page could not be found for this import.' );
	}

	const warnings = [ ...detected.warnings ];
	const parityGaps = [ ...detected.parityGaps ];
	const now = new Date().toISOString();
	const documentIdMap: IdMap = new Map();
	const classIdMap: IdMap = new Map();
	const classNameMap: NameMap = new Map();
	const variableIdMap: IdMap = new Map();
	const variableNameMap: NameMap = new Map();
	const mediaIdMap: IdMap = new Map();
	const collectionIdMap: IdMap = new Map();
	const existingDocumentSlugs = new Set( currentProject.documents.map( ( document ) => document.slug ) );

	for ( const document of importedProject.documents ) {
		documentIdMap.set( document.id, crypto.randomUUID() );
	}

	const variables = mergeVariables( currentProject.designSystem.variables, importedProject.designSystem.variables, variableIdMap, variableNameMap );
	const classes = mergeClasses( currentProject.designSystem.classes, importedProject.designSystem.classes, classIdMap, classNameMap, variableNameMap );
	const importedDocuments: BuilderDocument[] = [];
	const activePageNodes: BuilderNode[] = [];
	const componentDocuments: BuilderDocument[] = [];
	for ( const document of importedProject.documents ) {
		if ( document.kind === 'component' ) {
			componentDocuments.push( document );
		}
	}

	for ( const document of importedProject.documents ) {
		const nextKind: DocumentKind = resolveDestinationDocumentKind( document.kind, destination );
		if ( !LIBRARY_DOCUMENT_KINDS.has( document.kind ) && document.kind !== 'component' ) {
			warnings.push( {
				code: 'document-kind-coerced',
				message: `${ document.title } was imported as ${ destination === 'new-page' ? 'a page' : 'a library item' }.`,
				severity: 'info',
			} );
		}

		const remappedRoot = document.root.map( ( node ) => remapNode( node, {
			documentIdMap,
			classIdMap,
			classNameMap,
			variableNameMap,
		} ) );

		if ( destination === 'active-page' && document.kind !== 'component' ) {
			activePageNodes.push( ...remappedRoot );
			continue;
		}

		importedDocuments.push( BuilderDocumentSchema.parse( {
			...document,
			id: documentIdMap.get( document.id ),
			kind: nextKind,
			slug: uniqueSlug( document.slug || slugify( document.title ), existingDocumentSlugs ),
			status: 'draft',
			createdAt: now,
			updatedAt: now,
			root: remappedRoot,
			component: nextKind === 'component' ? document.component : undefined,
			meta: {
				...document.meta,
				importSource: detected.source,
				importSourceName: sourceName,
				originalDocumentId: document.id,
				originalDocumentKind: document.kind,
				importDestination: destination,
			},
		} ) );
	}

	const media = mergeMedia( currentProject.media, collectImportedMedia( importedProject ), mediaIdMap, sourceName );
	const collections = mergeCollections( currentProject.collections, importedProject.collections, collectionIdMap, sourceName );
	const themeStyles = mergeThemeStyles( currentProject.designSystem.themeStyles, importedProject.designSystem.themeStyles, variableNameMap );
	const importedCustomCss = importedProject.designSystem.customCss.trim();
	const customCss = importedCustomCss
		? [ currentProject.designSystem.customCss.trim(), `/* Imported from ${ sourceName } */\n${ importedCustomCss }` ].filter( Boolean ).join( '\n\n' )
		: currentProject.designSystem.customCss;
	const importRecord = compactJsonObject( {
		source: detected.source,
		sourceName,
		destination,
		importedAt: now,
		documentIds: importedDocuments.map( ( document ) => document.id ),
		libraryDocumentIds: importedDocuments.filter( ( document ) => document.kind === 'library-item' ).map( ( document ) => document.id ),
		componentDocumentIds: importedDocuments.filter( ( document ) => document.kind === 'component' ).map( ( document ) => document.id ),
		insertedIntoDocumentId: destination === 'active-page' ? activeDocumentId : undefined,
		insertedNodeCount: activePageNodes.length,
		themeAssignments: importedProject.themeAssignments.map( ( assignment ) => preserveAssignmentMetadata( assignment, documentIdMap ) ),
	} ) satisfies JsonValue;

	const nextCurrentDocuments = destination === 'active-page'
		? currentProject.documents.map( ( document ) => document.id === activeDocumentId
			? BuilderDocumentSchema.parse( {
				...document,
				updatedAt: now,
				root: [ ...document.root, ...activePageNodes ],
			} )
			: document )
		: currentProject.documents;
	const currentImports = Array.isArray( currentProject.meta.templateImports )
		? currentProject.meta.templateImports
		: [];
	const project = BuilderPackageSchema.parse( {
		...currentProject,
		documents: [ ...nextCurrentDocuments, ...importedDocuments ],
		themeAssignments: currentProject.themeAssignments,
		designSystem: {
			...currentProject.designSystem,
			variables,
			classes,
			themeStyles,
			customCss,
		},
		collections,
		media,
		meta: {
			...currentProject.meta,
			templateImports: [ ...currentImports, importRecord ],
		},
	} );

	const importedDocumentIds = [
		...importedDocuments.map( ( document ) => document.id ),
		...( destination === 'active-page' && activePageNodes.length && activeDocumentId ? [ activeDocumentId ] : [] ),
	];
	const importedLibraryDocumentIds = importedDocuments.filter( ( document ) => document.kind === 'library-item' ).map( ( document ) => document.id );
	return {
		project,
		importedDocumentIds,
		importedLibraryDocumentIds,
		warnings,
		parityGaps,
		summary: {
			source: detected.source,
			sourceName,
			documentCount: importedDocumentIds.length,
			libraryItemCount: importedLibraryDocumentIds.length,
			componentCount: componentDocuments.length,
			nodeCount: activePageNodes.length || importedDocuments.reduce( ( total, document ) => total + countNodes( document.root ), 0 ),
			assetCount: collectImportAssets( importedProject ).length,
			cssBlockCount: collectImportCssBlocks( importedProject ).length,
		},
	};
}

function createImportReview(
	detected: {
		source: TemplateImportSource;
		project: BuilderPackage;
		warnings: TemplateImportDiagnostic[];
		parityGaps: TemplateImportDiagnostic[];
	},
	sourceName: string,
): TemplateImportReviewResult {
	const warnings = detected.warnings.map( ( diagnostic ) => normalizeDiagnosticShape( diagnostic, 'warning' ) );
	const parityGaps = detected.parityGaps.map( ( diagnostic ) => normalizeDiagnosticShape( diagnostic, 'unsupported' ) );
	const assets = collectImportAssets( detected.project );
	const cssBlocks = collectImportCssBlocks( detected.project );
	const documentCount = detected.project.documents.length;
	const libraryItemCount = detected.project.documents.filter( ( document ) => document.kind === 'library-item' ).length;
	const componentCount = detected.project.documents.filter( ( document ) => document.kind === 'component' ).length;
	return {
		source: detected.source,
		sourceName,
		project: detected.project,
		warnings,
		parityGaps,
		summary: {
			source: detected.source,
			sourceName,
			documentCount,
			libraryItemCount,
			componentCount,
			nodeCount: detected.project.documents.reduce( ( total, document ) => total + countNodes( document.root ), 0 ),
			assetCount: assets.length,
			cssBlockCount: cssBlocks.length,
		},
		structure: detected.project.documents.flatMap( ( document ) => document.root.map( ( node ) => createStructureNode( node ) ) ),
		assets,
		cssBlocks,
		cleanupOptions: {
			preserveRawCss: true,
			convertCommonCss: true,
			importEditableNodes: true,
			fallbackUnknownToHtml: true,
		},
	};
}

async function detectTemplatePayload( payload: unknown, sourceName: string ): Promise<{
	source: TemplateImportSource;
	project: BuilderPackage;
	warnings: TemplateImportDiagnostic[];
	parityGaps: TemplateImportDiagnostic[];
}> {
	if ( isBuilderPackageShape( payload ) ) {
		return {
			source: 'builder-package',
			project: parseBuilderPackage( payload ),
			warnings: [],
			parityGaps: [],
		};
	}

	if ( isElementorShape( payload ) ) {
		const { importElementorPackage } = await import( '@builder/elementor-import' );
		const result = importElementorPackage( payload as Parameters<typeof importElementorPackage>[ 0 ], sourceName );
		return {
			source: 'elementor',
			project: result.project,
			warnings: result.warnings.map( normalizeImporterDiagnostic ),
			parityGaps: Object.values( result.parityGaps ).map( normalizeImporterDiagnostic ),
		};
	}

	throw new Error( 'Unsupported template JSON. Upload an Elementor template export or Builder package JSON.' );
}

function isBuilderPackageShape( value: unknown ): boolean {
	return isRecord( value ) && ( Array.isArray( value.documents ) || typeof value.packageVersion === 'string' );
}

function isElementorShape( value: unknown ): boolean {
	if ( Array.isArray( value ) ) {
		return value.some( isElementorShape );
	}
	if ( !isRecord( value ) ) {
		return false;
	}
	return Array.isArray( value.content )
		|| Array.isArray( value.elements )
		|| Array.isArray( value.root )
		|| 'page_settings' in value
		|| 'elType' in value
		|| 'widgetType' in value;
}

function normalizeImporterDiagnostic( value: unknown ): TemplateImportDiagnostic {
	if ( typeof value === 'string' ) {
		return {
			code: 'importer',
			message: value,
		};
	}
	if ( isRecord( value ) ) {
		return {
			code: String( value.code ?? value.type ?? 'importer' ),
			message: String( value.message ?? value.label ?? JSON.stringify( value ) ),
			severity: normalizeSeverity( value.severity ),
			sourceKey: typeof value.sourceKey === 'string' ? value.sourceKey : typeof value.key === 'string' ? value.key : undefined,
		};
	}
	return {
		code: 'importer',
		message: String( value ),
	};
}

function normalizeDiagnosticShape( diagnostic: TemplateImportDiagnostic, fallbackSeverity: NonNullable<TemplateImportDiagnostic['severity']> ): TemplateImportDiagnostic {
	return {
		code: diagnostic.code,
		message: diagnostic.message,
		severity: diagnostic.severity ?? fallbackSeverity,
		sourceKey: diagnostic.sourceKey,
	};
}

function normalizeSeverity( value: unknown ): TemplateImportDiagnostic['severity'] {
	return value === 'info' || value === 'warning' || value === 'unsupported' ? value : undefined;
}

function resolveDestinationDocumentKind( kind: DocumentKind, destination: TemplateImportDestination ): DocumentKind {
	if ( kind === 'component' ) {
		return 'component';
	}
	if ( destination === 'new-page' ) {
		return 'page';
	}
	return 'library-item';
}

function createStructureNode( node: BuilderNode ): TemplateImportStructureNode {
	return {
		id: node.id,
		type: node.type,
		label: createStructureLabel( node ),
		fallback: node.type === 'html' || node.meta.htmlFallback === true,
		children: [
			...node.children.map( createStructureNode ),
			...Object.values( node.slots as Record<string, BuilderNode[]> ).flatMap( ( children ) => children.map( createStructureNode ) ),
		],
	};
}

function createStructureLabel( node: BuilderNode ): string {
	const htmlTag = typeof node.meta.htmlTag === 'string' ? node.meta.htmlTag : undefined;
	const text = typeof node.props.text === 'string' ? node.props.text.replaceAll( /<[^>]+>/g, '' ).trim() : '';
	if ( text ) {
		return `${ node.type }: ${ text.slice( 0, 42 ) }`;
	}
	return htmlTag ? `${ node.type } <${ htmlTag }>` : node.type;
}

function countNodes( nodes: BuilderNode[] ): number {
	return nodes.reduce( ( total, node ) => total + 1 + countNodes( node.children ) + Object.values( node.slots as Record<string, BuilderNode[]> ).reduce( ( slotTotal, children ) => slotTotal + countNodes( children ), 0 ), 0 );
}

function collectImportCssBlocks( project: BuilderPackage ): TemplateImportCssSummary[] {
	const blocks: TemplateImportCssSummary[] = [];
	if ( project.designSystem.customCss.trim() ) {
		blocks.push( { label: 'Global imported CSS', css: project.designSystem.customCss.trim() } );
	}
	for ( const document of project.documents ) {
		for ( const node of flattenNodes( document.root ) ) {
			if ( node.styles.customCss.trim() ) {
				blocks.push( {
					label: `${ document.title } / ${ createStructureLabel( node ) }`,
					css: node.styles.customCss.trim(),
				} );
			}
		}
	}
	return blocks;
}

function collectImportAssets( project: BuilderPackage ): TemplateImportAssetSummary[] {
	const assets = new Map<string, TemplateImportAssetSummary>();
	for ( const asset of project.media ) {
		if ( asset.url ) {
			assets.set( `media:${ asset.url }`, { kind: 'media', value: asset.url, sourceKey: asset.id } );
		}
	}
	for ( const document of project.documents ) {
		for ( const node of flattenNodes( document.root ) ) {
			addAssetFromValue( assets, node.props.src, 'image', `${ document.title }/${ node.type }.props.src` );
			addAssetFromValue( assets, node.props.href, 'link', `${ document.title }/${ node.type }.props.href` );
			addAssetsFromStyleRecord( assets, node.styles.base, `${ document.title }/${ node.type }.styles.base` );
			for ( const [ state, styles ] of Object.entries( node.styles.states ) ) {
				addAssetsFromStyleRecord( assets, styles as Record<string, JsonValue>, `${ document.title }/${ node.type }.states.${ state }` );
			}
			for ( const [ breakpoint, styles ] of Object.entries( node.styles.breakpoints ) ) {
				addAssetsFromStyleRecord( assets, styles as Record<string, JsonValue>, `${ document.title }/${ node.type }.breakpoints.${ breakpoint }` );
			}
			const customCss = node.styles.customCss;
			for ( const url of extractCssUrls( customCss ) ) {
				addAssetFromValue( assets, url, classifyAssetUrl( url ), `${ document.title }/${ node.type }.customCss` );
			}
		}
	}
	for ( const cssBlock of collectImportCssBlocks( project ) ) {
		for ( const url of extractCssUrls( cssBlock.css ) ) {
			addAssetFromValue( assets, url, classifyAssetUrl( url ), cssBlock.label );
		}
	}
	return [ ...assets.values() ];
}

function collectImportedMedia( project: BuilderPackage ): MediaAsset[] {
	const assets = [ ...project.media ];
	for ( const asset of collectImportAssets( project ) ) {
		if ( asset.kind === 'image' || asset.kind === 'media' ) {
			assets.push( normalizeMediaAsset( {
				url: asset.value,
				source: isExternalOrDataAsset( asset.value ) ? 'external' : 'import',
			} ) );
		}
	}
	return mergeMediaCatalog( [], assets );
}

function flattenNodes( nodes: BuilderNode[] ): BuilderNode[] {
	return nodes.flatMap( ( node ) => [
		node,
		...flattenNodes( node.children ),
		...Object.values( node.slots as Record<string, BuilderNode[]> ).flatMap( flattenNodes ),
	] );
}

function addAssetsFromStyleRecord( assets: Map<string, TemplateImportAssetSummary>, styles: Record<string, JsonValue>, sourceKey: string ) {
	for ( const [ key, value ] of Object.entries( styles ) ) {
		if ( typeof value === 'string' ) {
			for ( const url of extractCssUrls( value ) ) {
				addAssetFromValue( assets, url, classifyAssetUrl( url ), `${ sourceKey }.${ key }` );
			}
		}
	}
}

function addAssetFromValue( assets: Map<string, TemplateImportAssetSummary>, value: unknown, kind: TemplateImportAssetSummary['kind'], sourceKey: string ) {
	if ( typeof value !== 'string' || !value.trim() ) {
		return;
	}
	const normalized = value.trim();
	if ( !isExternalOrDataAsset( normalized ) && kind !== 'link' ) {
		return;
	}
	assets.set( `${ kind }:${ normalized }`, {
		kind,
		value: normalized,
		sourceKey,
	} );
}

function extractCssUrls( value: string ): string[] {
	return [ ...value.matchAll( /url\((['"]?)(.*?)\1\)/gi ) ].map( ( match ) => match[ 2 ]?.trim() ?? '' ).filter( Boolean );
}

function classifyAssetUrl( value: string ): TemplateImportAssetSummary['kind'] {
	if ( /fonts\.(googleapis|gstatic)\.com|font/i.test( value ) ) {
		return 'font';
	}
	if ( /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test( value ) || value.startsWith( 'data:image/' ) ) {
		return 'image';
	}
	return isExternalOrDataAsset( value ) ? 'external' : 'link';
}

function isExternalOrDataAsset( value: string ): boolean {
	return /^(https?:)?\/\//i.test( value ) || value.startsWith( 'data:' );
}

function mergeVariables( current: VariableDefinition[], imported: VariableDefinition[], idMap: IdMap, nameMap: NameMap ) {
	const usedIds = new Set( current.map( ( variable ) => variable.id ) );
	const usedNames = new Set( current.map( ( variable ) => variable.name ) );
	const next = [ ...current ];
	for ( const variable of imported ) {
		const idConflict = usedIds.has( variable.id );
		const nameConflict = usedNames.has( variable.name );
		const id = idConflict ? crypto.randomUUID() : variable.id;
		const name = nameConflict ? uniqueName( `${ variable.name }-imported`, usedNames ) : variable.name;
		idMap.set( variable.id, id );
		nameMap.set( variable.name, name );
		usedIds.add( id );
		usedNames.add( name );
		next.push( {
			...variable,
			id,
			name,
			label: nameConflict ? `${ variable.label } Imported` : variable.label,
			value: remapTokenValue( variable.value, nameMap ),
			meta: {
				...variable.meta,
				originalVariableId: variable.id,
			},
		} );
	}
	return next;
}

function mergeClasses( current: ClassDefinition[], imported: ClassDefinition[], idMap: IdMap, nameMap: NameMap, variableNameMap: NameMap ) {
	const usedIds = new Set( current.map( ( definition ) => definition.id ) );
	const usedNames = new Set( current.map( ( definition ) => definition.name ) );
	const next = [ ...current ];
	for ( const definition of imported ) {
		const idConflict = usedIds.has( definition.id );
		const nameConflict = usedNames.has( definition.name );
		const id = idConflict ? crypto.randomUUID() : definition.id;
		const name = nameConflict ? uniqueName( `${ definition.name }-imported`, usedNames ) : definition.name;
		idMap.set( definition.id, id );
		nameMap.set( definition.name, name );
		usedIds.add( id );
		usedNames.add( name );
		next.push( {
			...definition,
			id,
			name,
			label: nameConflict ? `${ definition.label } Imported` : definition.label,
			extends: definition.extends.map( ( classId ) => idMap.get( classId ) ?? classId ),
			styles: remapStyleSet( definition.styles, variableNameMap ),
			usageCount: 0,
			meta: {
				...definition.meta,
				originalClassId: definition.id,
			},
		} );
	}
	return next;
}

function mergeMedia( current: MediaAsset[], imported: MediaAsset[], idMap: IdMap, sourceName: string ) {
	const usedIds = new Set( current.map( ( asset ) => asset.id ) );
	const usedUrls = new Set( current.map( ( asset ) => asset.url.trim().toLowerCase() ).filter( Boolean ) );
	const next = [ ...current ];
	for ( const asset of imported ) {
		const normalizedUrl = asset.url.trim().toLowerCase();
		if ( normalizedUrl && usedUrls.has( normalizedUrl ) ) {
			continue;
		}
		const id = usedIds.has( asset.id ) ? crypto.randomUUID() : asset.id;
		idMap.set( asset.id, id );
		usedIds.add( id );
		if ( normalizedUrl ) {
			usedUrls.add( normalizedUrl );
		}
		next.push( {
			...asset,
			id,
			meta: {
				...asset.meta,
				importSourceName: sourceName,
				originalMediaId: asset.id,
			},
		} );
	}
	return next;
}

function mergeCollections( current: CollectionDefinition[], imported: CollectionDefinition[], idMap: IdMap, sourceName: string ) {
	const usedIds = new Set( current.map( ( collection ) => collection.id ) );
	const usedNames = new Set( current.map( ( collection ) => collection.name ) );
	const next = [ ...current ];
	for ( const collection of imported ) {
		const id = usedIds.has( collection.id ) ? crypto.randomUUID() : collection.id;
		const name = usedNames.has( collection.name ) ? uniqueName( `${ collection.name } Imported`, usedNames ) : collection.name;
		idMap.set( collection.id, id );
		usedIds.add( id );
		usedNames.add( name );
		next.push( {
			...collection,
			id,
			name,
			query: remapTokenValue( collection.query as JsonValue, new Map() ) as CollectionDefinition['query'],
			source: collection.source,
		} );
	}
	return next.map( ( collection ) => ( {
		...collection,
		query: {
			...collection.query,
			...( idMap.has( collection.id ) ? { importSourceName: sourceName } : {} ),
		},
	} ) );
}

function mergeThemeStyles( current: Record<string, StyleSet>, imported: Record<string, StyleSet>, variableNameMap: NameMap ) {
	const next = { ...current };
	for ( const [ key, styles ] of Object.entries( imported ) ) {
		const nextKey = next[ key ] ? uniqueRecordKey( `${ key }-imported`, next ) : key;
		next[ nextKey ] = remapStyleSet( styles, variableNameMap );
	}
	return next;
}

function remapNode( node: BuilderNode, maps: { documentIdMap: IdMap; classIdMap: IdMap; classNameMap: NameMap; variableNameMap: NameMap } ): BuilderNode {
	const props = remapTokenValue( node.props as JsonValue, maps.variableNameMap ) as BuilderNode['props'];
	const componentId = typeof props.componentId === 'string' ? maps.documentIdMap.get( props.componentId ) : undefined;
	if ( componentId ) {
		props.componentId = componentId;
	}

	return BuilderNodeSchema.parse( {
		...node,
		id: crypto.randomUUID(),
		props,
		styleRefs: ( node.styleRefs as string[] ).map( ( ref: string ) => maps.classIdMap.get( ref ) ?? maps.classNameMap.get( ref ) ?? ref ),
		styles: remapStyleSet( node.styles, maps.variableNameMap ),
		bindings: ( node.bindings as BuilderNode['bindings'] ).map( ( binding: BuilderNode['bindings'][ number ] ) => ( {
			...binding,
			id: crypto.randomUUID(),
			args: remapTokenValue( binding.args as JsonValue, maps.variableNameMap ) as BuilderNode['bindings'][ number ]['args'],
			fallback: binding.fallback === undefined ? undefined : remapTokenValue( binding.fallback, maps.variableNameMap ),
		} ) ),
		attributes: ( node.attributes as BuilderNode['attributes'] ).map( ( attribute: BuilderNode['attributes'][ number ] ) => ( { ...attribute, id: crypto.randomUUID() } ) ),
		interactions: ( node.interactions as BuilderNode['interactions'] ).map( ( interaction: BuilderNode['interactions'][ number ] ) => ( {
			...interaction,
			id: crypto.randomUUID(),
			options: remapTokenValue( interaction.options as JsonValue, maps.variableNameMap ) as BuilderNode['interactions'][ number ]['options'],
		} ) ),
		children: ( node.children as BuilderNode[] ).map( ( child: BuilderNode ) => remapNode( child, maps ) ),
		slots: Object.fromEntries(
			Object.entries( node.slots as Record<string, BuilderNode[]> ).map( ( [ slot, children ] ) => [
				slot,
				children.map( ( child: BuilderNode ) => remapNode( child, maps ) ),
			] ),
		),
	} );
}

function remapStyleSet( styles: StyleSet, variableNameMap: NameMap ): StyleSet {
	return {
		base: remapTokenValue( styles.base as JsonValue, variableNameMap ) as StyleSet['base'],
		states: remapTokenValue( styles.states as JsonValue, variableNameMap ) as StyleSet['states'],
		breakpoints: remapTokenValue( styles.breakpoints as JsonValue, variableNameMap ) as StyleSet['breakpoints'],
		stateBreakpoints: remapTokenValue( styles.stateBreakpoints as JsonValue, variableNameMap ) as StyleSet['stateBreakpoints'],
		customCss: styles.customCss,
	};
}

function remapTokenValue( value: JsonValue, variableNameMap: NameMap ): JsonValue {
	if ( Array.isArray( value ) ) {
		return value.map( ( entry ) => remapTokenValue( entry, variableNameMap ) );
	}
	if ( !isRecord( value ) ) {
		return value;
	}
	const next: Record<string, JsonValue> = {};
	for ( const [ key, entry ] of Object.entries( value ) ) {
		next[ key ] = key === 'token' && typeof entry === 'string'
			? variableNameMap.get( entry ) ?? entry
			: remapTokenValue( entry, variableNameMap );
	}
	return next;
}

function preserveAssignmentMetadata( assignment: ThemeAssignment, documentIdMap: IdMap ): JsonValue {
	return {
		...assignment,
		id: crypto.randomUUID(),
		documentId: documentIdMap.get( assignment.documentId ) ?? assignment.documentId,
		originalDocumentId: assignment.documentId,
	};
}

function uniqueSlug( value: string, used: Set<string> ) {
	const base = slugify( value ) || 'imported-template';
	let candidate = base;
	let index = 2;
	while ( used.has( candidate ) ) {
		candidate = `${ base }-${ index }`;
		index += 1;
	}
	used.add( candidate );
	return candidate;
}

function uniqueName( value: string, used: Set<string> ) {
	let candidate = value;
	let index = 2;
	while ( used.has( candidate ) ) {
		candidate = `${ value }-${ index }`;
		index += 1;
	}
	return candidate;
}

function uniqueRecordKey( value: string, record: Record<string, unknown> ) {
	let candidate = value;
	let index = 2;
	while ( candidate in record ) {
		candidate = `${ value }-${ index }`;
		index += 1;
	}
	return candidate;
}

function compactJsonObject( value: Record<string, JsonValue | undefined> ): Record<string, JsonValue> {
	return Object.fromEntries( Object.entries( value ).filter( ( entry ): entry is [ string, JsonValue ] => entry[ 1 ] !== undefined ) );
}

function isRecord( value: unknown ): value is Record<string, unknown> {
	return Boolean( value ) && typeof value === 'object' && !Array.isArray( value );
}
