import type {
	Binding,
	BuilderDocument,
	BuilderNode,
	BuilderPackage,
	ClassDefinition,
	ConditionGroup,
	DesignSystem,
	JsonValue,
	StyleMap,
	StyleSet,
	ThemeAssignment,
} from '@builder/schema';
import type {
	BindingProviderContext,
	BuilderElementDefinition,
	BuilderHostAdapter,
	BuilderRegistry,
	TemplateConditionContext,
} from '@builder/plugin-api';
import type { Component, Snippet } from 'svelte';
import { createDefaultBuilderRegistry } from '@builder/plugin-api';
import { createStyleSet } from '@builder/schema';
import { BUILDER_RUNTIME_BASE_STYLES } from './runtime-base-styles';

export interface BuilderRuntimeOptions {
	project: BuilderPackage;
	activeDocumentId?: string;
	previewDocumentId?: string;
	previewSlot?: string;
	previewAssignmentId?: string;
	previewSource?: string;
	registry?: BuilderRegistry;
	adapter?: BuilderHostAdapter;
	bindingContext?: BindingProviderContext;
	conditionContext?: Partial<TemplateConditionContext>;
	viewport?: string;
	reducedMotion?: boolean;
	showPopups?: boolean;
	authoringMode?: boolean;
	media?: BuilderRuntimeMediaAdapter;
	cssIsolation?: BuilderRuntimeCssIsolationOptions;
	runtimeComponents?: BuilderRuntimeComponentMap;
}

export interface BuilderRuntimeMediaAdapter {
	resolveAssetUrl?: ( asset: JsonValue | undefined, context: BuilderRuntimeMediaResolveContext ) => string | undefined;
}

export interface BuilderRuntimeMediaResolveContext {
	project: BuilderPackage;
	node: BuilderNode;
	prop: string;
}

export interface BuilderRuntimeCssIsolationOptions {
	rootSelector?: string;
}

export type BuilderRuntimeComponent = Component<BuilderRuntimeComponentProps>;

export interface BuilderRuntimeComponentProps {
	node: BuilderNode;
	props: Record<string, JsonValue>;
	attributes: Record<string, string>;
	style: string;
	className: string;
	model: BuilderRenderModel;
	record?: Record<string, unknown>;
	children?: Snippet;
}

export type BuilderRuntimeComponentMap = ReadonlyMap<string, BuilderRuntimeComponent>;

export interface BuilderRuntimeEmbeddingOptions extends Omit<BuilderRuntimeOptions, 'bindingContext' | 'activeDocumentId'> {
	documentId?: string;
	dynamicContext?: BindingProviderContext;
}

export interface BuilderComposition {
	activePage?: BuilderDocument;
	previewDocument?: BuilderDocument;
	previewSlot?: string;
	previewAssignmentId?: string;
	previewSource?: string;
	slotDocuments: Record<string, BuilderDocument[]>;
	slotAssignments: Record<string, ThemeAssignment | undefined>;
	assignments: ThemeAssignment[];
}

export interface BuilderRenderModel {
	project: BuilderPackage;
	registry: BuilderRegistry;
	adapter?: BuilderHostAdapter;
	bindingContext: BindingProviderContext;
	conditionContext: TemplateConditionContext;
	viewport: string;
	reducedMotion: boolean;
	showPopups: boolean;
	authoringMode: boolean;
	media?: BuilderRuntimeMediaAdapter;
	cssIsolation?: BuilderRuntimeCssIsolationOptions;
	runtimeComponents: BuilderRuntimeComponentMap;
	composition: BuilderComposition;
	componentsById: Map<string, BuilderDocument>;
	stylesheet: string;
}

export interface CompiledAssets {
	stylesheet: string;
}

export interface RuntimeTabItem {
	id: string;
	label: string;
	content: string;
	triggerNodes: BuilderNode[];
	panelNodes: BuilderNode[];
}

export interface RuntimeAccordionItem {
	id: string;
	title: string;
	body: string;
	open: boolean;
}

export interface RuntimeMenuItem {
	id: string;
	label: string;
	href: string;
	target?: string;
	rel?: string;
	icon?: string;
	children: RuntimeMenuItem[];
}

export interface RuntimeGalleryImage {
	id: string;
	src: string;
	alt: string;
	caption?: string;
	href?: string;
}

export interface RuntimeCarouselSlide {
	id: string;
	title: string;
	text: string;
	src?: string;
	alt?: string;
	ctaLabel?: string;
	ctaHref?: string;
}

export interface RuntimeFormFieldOption {
	label: string;
	value: string;
}

export interface RuntimeFormFieldShell {
	id: string;
	kind: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'hidden' | 'submit';
	label?: string;
	legend?: string;
	name?: string;
	placeholder?: string;
	value?: string;
	checked?: boolean;
	options: RuntimeFormFieldOption[];
	rows?: number;
	text?: string;
	required?: boolean;
}

export interface RuntimePopupBehavior {
	title: string;
	width?: string;
	closeOnOverlay: boolean;
	closeOnEsc: boolean;
	showCloseButton: boolean;
}

type ExclusiveSlot = 'page' | 'header' | 'footer' | 'sidebar' | 'loop-item' | 'empty';
type OverlaySlot = 'popup' | 'modal';
type ResolvedAssignmentEntry = {
	assignment: ThemeAssignment;
	document: BuilderDocument;
};

const EXCLUSIVE_SLOTS: ExclusiveSlot[] = [ 'page', 'header', 'footer', 'sidebar', 'loop-item', 'empty' ];
const OVERLAY_SLOTS: OverlaySlot[] = [ 'popup', 'modal' ];
const componentsByProject = new WeakMap<BuilderPackage, Map<string, BuilderDocument>>();
const stylesheetByDesignSystem = new WeakMap<DesignSystem, string>();
const emptyRuntimeComponentMap: BuilderRuntimeComponentMap = new Map();

export function createRuntimeComponentMap<const Components extends Record<string, BuilderRuntimeComponent>>(
	components: Components,
): ReadonlyMap<keyof Components & string, Components[keyof Components & string]> {
	return new Map( Object.entries( components ) ) as unknown as ReadonlyMap<keyof Components & string, Components[keyof Components & string]>;
}

export function renderDocument( options: BuilderRuntimeOptions ): BuilderRenderModel {
	return renderResolvedDocument( options );
}

export function renderPublishedDocument( options: BuilderRuntimeEmbeddingOptions ): BuilderRenderModel {
	return renderResolvedDocument( {
		...options,
		activeDocumentId: options.documentId ?? options.previewDocumentId,
		bindingContext: options.dynamicContext ?? {},
	} );
}

export function renderResolvedDocument( options: BuilderRuntimeOptions ): BuilderRenderModel {
	const registry = options.registry ?? createDefaultBuilderRegistry();
	const bindingContext = options.bindingContext ?? {};
	const conditionContext = createConditionContext( options.conditionContext, bindingContext );
	const viewport = options.viewport ?? 'desktop';
	const reducedMotion = options.reducedMotion ?? false;
	const showPopups = options.showPopups ?? false;
	const authoringMode = options.authoringMode ?? false;
	const runtimeComponents = options.runtimeComponents ?? emptyRuntimeComponentMap;
	const componentsById = getComponentsById( options.project );
	const composition = resolveComposition( {
		project: options.project,
		activeDocumentId: options.activeDocumentId ?? options.previewDocumentId,
		previewSlot: options.previewSlot,
		previewAssignmentId: options.previewAssignmentId,
		previewSource: options.previewSource,
		adapter: options.adapter,
		conditionContext,
	} );

	return {
		project: options.project,
		registry,
		adapter: options.adapter,
		bindingContext,
		conditionContext,
		viewport,
		reducedMotion,
		showPopups,
		authoringMode,
		media: options.media,
		cssIsolation: options.cssIsolation,
		runtimeComponents,
		composition,
		componentsById,
		stylesheet: compileDocumentAssets( {
			project: options.project,
			registry,
			adapter: options.adapter,
			bindingContext,
			conditionContext,
			viewport,
			reducedMotion,
			showPopups,
			authoringMode,
			media: options.media,
			cssIsolation: options.cssIsolation,
			runtimeComponents,
			composition,
			componentsById,
			stylesheet: '',
		} ).stylesheet,
	};
}

export function resolveComposition( options: {
	project: BuilderPackage;
	activeDocumentId?: string;
	previewSlot?: string;
	previewAssignmentId?: string;
	previewSource?: string;
	adapter?: BuilderHostAdapter;
	conditionContext: TemplateConditionContext;
} ): BuilderComposition {
	const documentsById = new Map( options.project.documents.map( ( document ) => [ document.id, document ] as const ) );
	const previewAssignment = options.previewAssignmentId
		? options.project.themeAssignments.find( ( assignment ) => assignment.id === options.previewAssignmentId )
		: undefined;
	const previewDocument = resolvePreviewDocument( options.project, options.activeDocumentId ?? previewAssignment?.documentId );
	const previewAssignments = previewDocument
		? options.project.themeAssignments
			.filter( ( assignment ) => assignment.documentId === previewDocument.id && assignment.status !== 'archived' )
			.sort( ( left, right ) => compareAssignmentEntries( {
				assignment: left,
				document: previewDocument,
			}, {
				assignment: right,
				document: previewDocument,
			} ) )
		: [];
	const previewSlot = options.previewSlot
		?? previewAssignment?.slot
		?? ( previewDocument ? resolvePreviewSlot( previewDocument, previewAssignments, options.conditionContext ) : undefined );

	const matchedAssignments = options.project.themeAssignments
		.map( ( assignment ) => {
			const document = documentsById.get( assignment.documentId );
			if ( !document ) {
				return undefined;
			}

			return {
				assignment,
				document,
			} satisfies ResolvedAssignmentEntry;
		} )
		.filter( Boolean )
		.filter( ( entry ): entry is ResolvedAssignmentEntry => {
			if ( !entry ) {
				return false;
			}

			if ( entry.assignment.status !== 'published' ) {
				return false;
			}

			if ( !isDocumentCompatibleWithSlot( entry.document, entry.assignment.slot ) ) {
				return false;
			}

			return options.adapter
				? options.adapter.matchesAssignment( entry.assignment, options.conditionContext )
				: fallbackMatchesAssignment( entry.assignment, options.conditionContext );
		} );

	const assignments = matchedAssignments
		.map( ( entry ) => entry.assignment )
		.sort( ( left, right ) => compareAssignmentEntries( {
			assignment: left,
			document: documentsById.get( left.documentId )!,
		}, {
			assignment: right,
			document: documentsById.get( right.documentId )!,
		}, left.slot === right.slot ? left.slot : undefined ) );

	const selectedBySlot: Partial<Record<ExclusiveSlot, BuilderDocument>> = {};
	const selectedAssignments: Partial<Record<ExclusiveSlot, ThemeAssignment>> = {};
	for ( const slot of EXCLUSIVE_SLOTS ) {
		const winner = selectAssignmentForSlot( slot, matchedAssignments );
		if ( winner ) {
			selectedBySlot[ slot ] = winner.document;
			selectedAssignments[ slot ] = winner.assignment;
		}
	}

	const overlayDocuments: Partial<Record<OverlaySlot, BuilderDocument[]>> = {};
	for ( const slot of OVERLAY_SLOTS ) {
		overlayDocuments[ slot ] = selectStackedAssignmentsForSlot( slot, matchedAssignments ).map( ( entry ) => entry.document );
	}

	if ( previewDocument && previewSlot ) {
		if ( isExclusiveSlot( previewSlot ) ) {
			selectedBySlot[ previewSlot ] = previewDocument;
			selectedAssignments[ previewSlot ] = previewAssignments[ 0 ];
		} else if ( isOverlaySlot( previewSlot ) ) {
			overlayDocuments[ previewSlot ] = [ previewDocument ];
		}
	}

	const loopItemTemplate = selectedBySlot['loop-item']
		? prepareDocumentForComposition( selectedBySlot['loop-item'] )
		: undefined;
	const emptyStateTemplate = selectedBySlot.empty
		? prepareDocumentForComposition( selectedBySlot.empty )
		: undefined;

	const slotDocuments: Record<string, BuilderDocument[]> = {};
	for ( const slot of [ 'page', 'header', 'footer', 'sidebar' ] as const ) {
		const document = slot === 'page'
			? undefined
			: selectedBySlot[ slot ];
		if ( document ) {
			slotDocuments[ slot ] = [ prepareDocumentForComposition( document, loopItemTemplate, emptyStateTemplate ) ];
		}
	}

	const activePageBase = previewSlot === 'page'
		? previewDocument
		: selectedBySlot.page
			?? resolveFallbackPage( options.project, options.conditionContext.pathname );
	const activePage = activePageBase
		? prepareDocumentForComposition( activePageBase, loopItemTemplate, emptyStateTemplate )
		: undefined;

	if ( activePage ) {
		slotDocuments.page = [ activePage ];
	}

	for ( const slot of OVERLAY_SLOTS ) {
		const documents = overlayDocuments[ slot ] ?? [];
		if ( !documents.length ) {
			continue;
		}

		slotDocuments[ slot ] = documents.map( ( document ) => prepareDocumentForComposition( document, loopItemTemplate, emptyStateTemplate ) );
	}

	if ( loopItemTemplate ) {
		slotDocuments['loop-item'] = [ loopItemTemplate ];
	}

	if ( emptyStateTemplate ) {
		slotDocuments.empty = [ emptyStateTemplate ];
	}

	return {
		activePage,
		previewDocument,
		previewSlot,
		previewAssignmentId: previewAssignment?.id,
		previewSource: options.previewSource,
		slotDocuments,
		slotAssignments: {
			page: selectedAssignments.page,
			header: selectedAssignments.header,
			footer: selectedAssignments.footer,
			sidebar: selectedAssignments.sidebar,
			'loop-item': selectedAssignments['loop-item'],
			empty: selectedAssignments.empty,
			popup: undefined,
			modal: undefined,
		},
		assignments,
	};
}

export function compileDocumentAssets( model: BuilderRenderModel ): CompiledAssets {
	const activeDocument = model.composition.activePage;
	const breakpointMap = new Map( model.project.designSystem.breakpoints.map( ( breakpoint ) => [ breakpoint.id, breakpoint.minWidth ] ) );
	const documentsWithScopedCss: BuilderDocument[] = [];
	for ( const document of [ activeDocument, ...model.componentsById.values() ] ) {
		if ( document && !documentsWithScopedCss.some( ( existing ) => existing.id === document.id ) ) {
			documentsWithScopedCss.push( document );
		}
	}
	const stylesheet = [
		compileDesignSystemStylesheet( model ),
		...documentsWithScopedCss.map( ( document ) => compileDocumentCustomCss( document, breakpointMap ) ),
	].filter( Boolean ).join( '\n' );

	return { stylesheet };
}

function compileDesignSystemStylesheet( model: BuilderRenderModel ): string {
	const cachedStylesheet = stylesheetByDesignSystem.get( model.project.designSystem );
	if ( cachedStylesheet !== undefined ) {
		return cachedStylesheet;
	}

	const breakpointMap = new Map( model.project.designSystem.breakpoints.map( ( breakpoint ) => [ breakpoint.id, breakpoint.minWidth ] ) );
	const variableCss = model.project.designSystem.variables
		.map( ( variable ) => `--builder-var-${ sanitizeCssToken( variable.name ) }: ${ stringifyCssValue( variable.value ) };` )
		.join( '\n' );

	const classCss = [ ...model.project.designSystem.classes ]
		.sort( ( left, right ) => left.order - right.order )
		.flatMap( ( definition ) => compileStyleSet( `.builder-class-${ sanitizeCssToken( definition.id ) }`, definition.styles, breakpointMap ) )
		.join( '\n' );

	const themeCss = Object.entries( model.project.designSystem.themeStyles )
		.flatMap( ( [ name, styles ] ) => compileStyleSet( `.builder-theme-${ sanitizeCssToken( name ) }`, styles, breakpointMap ) )
		.join( '\n' );

	const stylesheet = [
		BUILDER_RUNTIME_BASE_STYLES,
		':root {',
		variableCss,
		'}',
		'@layer builder-theme {',
		themeCss,
		classCss,
		'}',
		model.project.designSystem.customCss,
	].filter( Boolean ).join( '\n' );

	stylesheetByDesignSystem.set( model.project.designSystem, stylesheet );
	return stylesheet;
}

function getComponentsById( project: BuilderPackage ): Map<string, BuilderDocument> {
	const cached = componentsByProject.get( project );
	if ( cached ) {
		return cached;
	}

	const components = new Map(
		project.documents
			.filter( ( document ) => document.kind === 'component' )
			.map( ( document ) => [ document.id, document ] as const ),
	);
	componentsByProject.set( project, components );
	return components;
}

export function resolveNodeProps( node: BuilderNode, model: BuilderRenderModel, record?: Record<string, unknown> ): Record<string, JsonValue> {
	const props = structuredClone( node.props );
	for ( const binding of node.bindings.filter( ( entry: Binding ) => entry.targetKind !== 'attribute' ) ) {
		if ( binding.targetKind === 'style' ) {
			continue;
		}
		const resolved = resolveBinding( binding, model, record );
		if ( resolved === undefined ) {
			continue;
		}
		const target = binding.targetKind === 'content' ? binding.target || 'text' : binding.target;
		props[ target ] = coerceDynamicBindingValue( resolved, binding.category );
	}
	return resolveMediaProps( node, props, model );
}

export function resolveNodeAttributes( node: BuilderNode, model: BuilderRenderModel, record?: Record<string, unknown> ): Record<string, string> {
	const attributes = Object.fromEntries(
		node.attributes
			.filter( ( attribute: BuilderNode['attributes'][ number ] ) => attribute.kind === 'static' )
			.map( ( attribute: BuilderNode['attributes'][ number ] ) => [ attribute.name, attribute.value ?? '' ] as const ),
	);

	for ( const attribute of node.attributes.filter( ( entry: BuilderNode['attributes'][ number ] ) => entry.kind === 'binding' && entry.bindingId ) ) {
		const binding = node.bindings.find( ( entry: Binding ) => entry.id === attribute.bindingId );
		if ( !binding ) {
			continue;
		}

		const resolved = resolveBinding( binding, model, record );
		attributes[ attribute.name ] = String( resolved ?? '' );
	}

	if ( node.accessibility.role ) {
		attributes.role = node.accessibility.role;
	}
	if ( node.accessibility.label ) {
		attributes[ 'aria-label' ] = node.accessibility.label;
	}
	if ( node.accessibility.labelledBy ) {
		attributes[ 'aria-labelledby' ] = node.accessibility.labelledBy;
	}
	if ( node.accessibility.describedBy ) {
		attributes[ 'aria-describedby' ] = node.accessibility.describedBy;
	}
	if ( node.accessibility.tabIndex !== undefined ) {
		attributes.tabindex = String( node.accessibility.tabIndex );
	}

	const interactionAttributes = playInteractions( node, model );
	return {
		...attributes,
		...interactionAttributes,
	};
}

function resolveMediaProps( node: BuilderNode, props: Record<string, JsonValue>, model: BuilderRenderModel ): Record<string, JsonValue> {
	if ( !model.media?.resolveAssetUrl ) {
		return props;
	}

	if ( node.type === 'image' || node.type === 'video' ) {
		if ( props.src === undefined ) {
			return props;
		}
		return {
			...props,
			src: resolveMediaUrl( props.src, model, node, 'src' ),
		};
	}

	if ( node.type === 'gallery' && Array.isArray( props.images ) ) {
		return {
			...props,
			images: props.images.map( ( image ) => resolveMediaRecordUrl( image, model, node, 'images' ) ) as JsonValue,
		};
	}

	if ( node.type === 'carousel' && Array.isArray( props.slides ) ) {
		return {
			...props,
			slides: props.slides.map( ( slide ) => resolveMediaRecordUrl( slide, model, node, 'slides' ) ) as JsonValue,
		};
	}

	return props;
}

function resolveMediaRecordUrl( value: JsonValue, model: BuilderRenderModel, node: BuilderNode, prop: string ): JsonValue {
	if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
		const record = value as Record<string, JsonValue>;
		const source = record.src ?? record.url ?? record.id;
		if ( source === undefined ) {
			return value;
		}
		const resolvedUrl = resolveMediaUrl( source, model, node, prop );
		return resolvedUrl ? { ...record, src: resolvedUrl } as JsonValue : value;
	}
	return resolveMediaUrl( value, model, node, prop );
}

function resolveMediaUrl( value: JsonValue | undefined, model: BuilderRenderModel, node: BuilderNode, prop: string ): JsonValue {
	const resolvedUrl = model.media?.resolveAssetUrl?.( value, { project: model.project, node, prop } );
	return resolvedUrl ?? value ?? '';
}

export function mergeNodeClassAttribute( attributes: Record<string, string>, classNames: string ): Record<string, string> {
	const attributeClassName = attributes.class ?? '';
	const mergedClassName = [ attributeClassName, classNames ].filter( Boolean ).join( ' ' );
	return {
		...attributes,
		class: mergedClassName,
	};
}

export function getNodeStyle( node: BuilderNode, model: BuilderRenderModel, record?: Record<string, unknown> ): string {
	const styles = applyRuntimeStyleFallbacks( node, resolveBoundStyleMap( node, model, record ) );
	return Object.entries( styles )
		.filter( ( [ property ] ) => isSupportedCssPropertyName( property ) )
		.map( ( [ property, value ] ) => `${ normalizeCssPropertyName( property ) }: ${ stringifyCssValue( value ) };` )
		.join( ' ' );
}

export function resolveBoundStyleMap( node: BuilderNode, model: BuilderRenderModel, record?: Record<string, unknown> ): StyleMap {
	const styles = { ...resolveStyleMap( node.styles, model.viewport ) };
	for ( const binding of node.bindings.filter( ( entry: Binding ) => entry.targetKind === 'style' ) ) {
		const resolved = resolveBinding( binding, model, record );
		if ( resolved === undefined ) {
			continue;
		}
		styles[ binding.target ] = coerceDynamicBindingValue( resolved, binding.category );
	}
	return styles;
}

export function getNodeClassNames( node: BuilderNode, _model: BuilderRenderModel ): string {
	return node.styleRefs.map( ( styleRef: string ) => `builder-class-${ sanitizeCssToken( styleRef ) }` ).join( ' ' );
}

export function getStyleOrigins( node: BuilderNode, project: BuilderPackage ): Array<{ source: string; keys: string[] }> {
	const classOrigins = node.styleRefs
		.map( ( styleRef: string ) => project.designSystem.classes.find( ( definition ) => definition.id === styleRef || definition.name === styleRef ) )
		.filter( Boolean )
		.map( ( definition: ClassDefinition | undefined ) => ( {
			source: `class:${ definition!.label }`,
			keys: Object.keys( resolveStyleMap( definition!.styles, 'desktop' ) ),
		} ) );

	const localKeys = Object.keys( node.styles.base );
	return localKeys.length ? [ ...classOrigins, { source: 'local', keys: localKeys } ] : classOrigins;
}

export function isNodeVisible( node: BuilderNode, model: BuilderRenderModel, record?: Record<string, unknown> ): boolean {
	if ( node.visibility.hidden || node.visibility.breakpointHidden[ model.viewport ] ) {
		return false;
	}

	if ( !node.visibility.conditionGroups.length ) {
		return true;
	}

	const conditionContext = record ? { ...model.conditionContext, record } : model.conditionContext;
	const matched = node.visibility.conditionGroups.some( ( group: ConditionGroup ) => evaluateConditionGroup( group, model, conditionContext ) );
	return node.visibility.display === 'hide-when-matched' ? !matched : matched;
}

export function getRenderableRoots( model: BuilderRenderModel ): Array<{ slot: string; document: BuilderDocument }> {
	const output: Array<{ slot: string; document: BuilderDocument }> = [];

	for ( const slot of [ 'header', 'page', 'footer', 'sidebar' ] ) {
		for ( const document of model.composition.slotDocuments[ slot ] ?? [] ) {
			if ( slot === 'page' && document.id === model.composition.activePage?.id ) {
				continue;
			}
			output.push( { slot, document } );
		}
		if ( slot === 'page' && model.composition.activePage ) {
			output.push( { slot: 'page-content', document: model.composition.activePage } );
		}
	}

	const shouldRenderPopupLayers = model.showPopups
		|| model.composition.previewSlot === 'popup'
		|| model.composition.previewSlot === 'modal';

	if ( shouldRenderPopupLayers && model.composition.slotDocuments.popup?.length ) {
		for ( const document of model.composition.slotDocuments.popup ) {
			output.push( { slot: 'popup', document } );
		}
	}

	if ( shouldRenderPopupLayers && model.composition.slotDocuments.modal?.length ) {
		for ( const document of model.composition.slotDocuments.modal ) {
			output.push( { slot: 'modal', document } );
		}
	}

	return output;
}

export function resolveTabItems( node: BuilderNode, props: Record<string, JsonValue> ): RuntimeTabItem[] {
	const propItems = ensureArray( props.items ).map( ( item, index ) => {
		const entry = asRecord( item );
		return {
			id: stringValue( entry.id ) ?? `${ node.id }-tab-${ index }`,
			label: stringValue( entry.label ) ?? stringValue( entry.title ) ?? `Tab ${ index + 1 }`,
			content: stringValue( entry.content ) ?? stringValue( entry.body ) ?? '',
			triggerNodes: [],
			panelNodes: [],
		} satisfies RuntimeTabItem;
	} );

	const triggerNodes = node.slots.triggers ?? [];
	const panelNodes = node.slots.panels ?? [];
	const slotCount = Math.max( triggerNodes.length, panelNodes.length );
	if ( !slotCount ) {
		return propItems;
	}

	return Array.from( { length: slotCount }, ( _, index ) => ( {
		id: propItems[ index ]?.id ?? `${ node.id }-tab-${ index }`,
		label: propItems[ index ]?.label
			?? inferNodeLabel( triggerNodes[ index ] )
			?? `Tab ${ index + 1 }`,
		content: propItems[ index ]?.content ?? '',
		triggerNodes: triggerNodes[ index ] ? [ triggerNodes[ index ] ] : [],
		panelNodes: panelNodes[ index ] ? [ panelNodes[ index ] ] : [],
	} satisfies RuntimeTabItem ) );
}

export function resolveInitialTabIndex( node: BuilderNode, props: Record<string, JsonValue> ): number {
	const items = resolveTabItems( node, props );
	if ( !items.length ) {
		return 0;
	}

	const requested = numberValue( props.activeTab );
	return clampIndex( requested ?? 0, items.length );
}

export function resolveAccordionItems( node: BuilderNode, props: Record<string, JsonValue> ): RuntimeAccordionItem[] {
	return ensureArray( props.items ).map( ( item, index ) => {
		const entry = asRecord( item );
		return {
			id: stringValue( entry.id ) ?? `${ node.id }-item-${ index }`,
			title: stringValue( entry.title ) ?? `Item ${ index + 1 }`,
			body: stringValue( entry.body ) ?? stringValue( entry.content ) ?? '',
			open: booleanValue( entry.open ) ?? false,
		} satisfies RuntimeAccordionItem;
	} );
}

export function resolveInitialAccordionIndexes( node: BuilderNode, props: Record<string, JsonValue> ): number[] {
	const items = resolveAccordionItems( node, props );
	if ( !items.length ) {
		return [];
	}

	const explicitActive = numberValue( props.activeIndex );
	if ( explicitActive !== undefined ) {
		return [ clampIndex( explicitActive, items.length ) ];
	}

	const openIndexes = items
		.map( ( item, index ) => item.open ? index : -1 )
		.filter( ( index ) => index >= 0 );

	if ( node.type === 'toggle' ) {
		return openIndexes;
	}

	return openIndexes.length ? [ openIndexes[ 0 ]! ] : [ 0 ];
}

export function resolveMenuItems( props: Record<string, JsonValue> ): RuntimeMenuItem[] {
	return ensureArray( props.items ).map( ( item, index ) => normalizeMenuItem( item, `menu-${ index }` ) );
}

export function resolveGalleryImages( props: Record<string, JsonValue> ): RuntimeGalleryImage[] {
	return ensureArray( props.images ).map( ( image, index ) => {
		if ( typeof image === 'string' ) {
			return {
				id: `image-${ index }`,
				src: image,
				alt: '',
			} satisfies RuntimeGalleryImage;
		}

		const entry = asRecord( image );
		return {
			id: stringValue( entry.id ) ?? `image-${ index }`,
			src: stringValue( entry.src ) ?? stringValue( entry.url ) ?? '',
			alt: stringValue( entry.alt ) ?? stringValue( entry.label ) ?? '',
			caption: stringValue( entry.caption ),
			href: stringValue( entry.href ),
		} satisfies RuntimeGalleryImage;
	} ).filter( ( image ) => Boolean( image.src ) );
}

export function resolveCarouselSlides( props: Record<string, JsonValue> ): RuntimeCarouselSlide[] {
	return ensureArray( props.slides ).map( ( slide, index ) => {
		if ( typeof slide === 'string' ) {
			return {
				id: `slide-${ index }`,
				title: `Slide ${ index + 1 }`,
				text: slide,
			} satisfies RuntimeCarouselSlide;
		}

		const entry = asRecord( slide );
		return {
			id: stringValue( entry.id ) ?? `slide-${ index }`,
			title: stringValue( entry.title ) ?? `Slide ${ index + 1 }`,
			text: stringValue( entry.text ) ?? stringValue( entry.body ) ?? stringValue( entry.description ) ?? '',
			src: stringValue( entry.src ) ?? stringValue( entry.image ),
			alt: stringValue( entry.alt ),
			ctaLabel: stringValue( entry.ctaLabel ) ?? stringValue( entry.buttonLabel ),
			ctaHref: stringValue( entry.ctaHref ) ?? stringValue( entry.buttonHref ) ?? stringValue( entry.href ),
		} satisfies RuntimeCarouselSlide;
	} );
}

export function resolvePopupBehavior( props: Record<string, JsonValue> ): RuntimePopupBehavior {
	return {
		title: stringValue( props.title ) ?? 'Announcement',
		width: stringValue( props.width ),
		closeOnOverlay: booleanValue( props.closeOnOverlay ) ?? true,
		closeOnEsc: booleanValue( props.closeOnEsc ) ?? true,
		showCloseButton: booleanValue( props.showCloseButton ) ?? true,
	};
}

export function isNativeFormFieldNode( node: BuilderNode ): boolean {
	return node.type.startsWith( 'form-field-' ) || node.type === 'form-submit';
}

export function resolveFormFieldShell( node: BuilderNode, props: Record<string, JsonValue> ): RuntimeFormFieldShell {
	const parsed = parseFormMarkup( stringValue( props.markup ) );
	const base = {
		id: node.id,
		label: stringValue( props.label ) ?? parsed?.label,
		legend: stringValue( props.legend ) ?? parsed?.legend,
		name: stringValue( props.name ) ?? parsed?.name,
		placeholder: stringValue( props.placeholder ) ?? parsed?.placeholder,
		value: stringValue( props.value ) ?? parsed?.value,
		checked: booleanValue( props.checked ) ?? parsed?.checked,
		options: parsed?.options ?? [],
		rows: numberValue( props.rows ) ?? parsed?.rows,
		text: stringValue( props.text ) ?? parsed?.text,
		required: booleanValue( props.required ) ?? parsed?.required,
	};

	switch ( node.type ) {
		case 'form-field-email':
			return { ...base, kind: 'email', label: base.label ?? 'Email' };
		case 'form-field-textarea':
			return { ...base, kind: 'textarea', label: base.label ?? 'Message', rows: base.rows ?? 5 };
		case 'form-field-select':
			return { ...base, kind: 'select', label: base.label ?? 'Select' };
		case 'form-field-checkbox':
			return { ...base, kind: 'checkbox', label: base.label ?? 'Checkbox' };
		case 'form-field-radio':
			return { ...base, kind: 'radio', legend: base.legend ?? base.label ?? 'Choice' };
		case 'form-field-hidden':
			return { ...base, kind: 'hidden', label: undefined };
		case 'form-submit':
			return { ...base, kind: 'submit', text: base.text ?? base.label ?? 'Submit' };
		case 'form-field-text':
		default:
			return { ...base, kind: 'text', label: base.label ?? 'Text Field' };
	}
}

export function resolveGeneratedFormFieldShells( props: Record<string, JsonValue> ): RuntimeFormFieldShell[] {
	return ensureArray( props.fields ).map( ( field, index ) => normalizeGeneratedField( field, index ) );
}

export function resolveCollectionRecords( node: BuilderNode, model: BuilderRenderModel ): Array<Record<string, unknown>> {
	const source = String( node.props.collection ?? '' );
	if ( !source ) {
		return [];
	}

	const collection = model.project.collections.find( ( entry ) => entry.id === source || entry.name === source || entry.source === source );
	const bindingCollections = model.bindingContext.collections ?? {};
	const query = resolveCollectionQuery( node.props, collection?.query as Record<string, JsonValue> | undefined );
	const resolved = model.adapter?.resolveCollection( source, model.bindingContext, query )
		?? collectionContextRecords( bindingCollections, collection?.id ?? source )
		?? collectionContextRecords( bindingCollections, collection?.name ?? source )
		?? collectionContextRecords( bindingCollections, collection?.source ?? source )
		?? [];

	const filtered = applyCollectionQuery( resolved, query );
	const limit = Number( query.limit ?? 0 );
	return limit > 0 ? filtered.slice( 0, limit ) : filtered;
}

export function expandComponentInstance( node: BuilderNode, model: BuilderRenderModel ): BuilderNode[] {
	if ( node.type !== 'component-instance' ) {
		return [ node ];
	}

	const component = model.componentsById.get( String( node.props.componentId ?? '' ) );
	if ( !component ) {
		return [ createFallbackCompatNode( node, 'Missing component document' ) ];
	}

	const overrides = ( node.props.overrides ?? {} ) as Record<string, JsonValue>;
	const roots = structuredClone( component.root );
	if ( !roots.length ) {
		return [ createFallbackCompatNode( node, 'Component document has no renderable roots' ) ];
	}

	for ( const exposure of component.component?.exposedProperties ?? [] ) {
		if ( !( exposure.id in overrides ) ) {
			continue;
		}

		for ( const root of roots ) {
			applyOverrideToNode( root, exposure.nodeId, exposure.propPath, overrides[ exposure.id ] ?? null );
		}
	}

	return roots;
}

export function getElementDefinition( node: BuilderNode, model: BuilderRenderModel ): BuilderElementDefinition | undefined {
	return model.registry.elements.get( node.type );
}

export function playInteractions( node: BuilderNode, model: BuilderRenderModel ): Record<string, string> {
	if ( model.reducedMotion ) {
		return {};
	}

	const enabled = node.interactions.filter( ( interaction: BuilderNode['interactions'][ number ] ) => interaction.enabled && ( !interaction.respectReducedMotion || !model.reducedMotion ) );
	return Object.fromEntries( enabled.map( ( interaction: BuilderNode['interactions'][ number ], index: number ) => [ `data-builder-interaction-${ index }`, interaction.kind ] as const ) );
}

function createConditionContext(
	conditionContext: Partial<TemplateConditionContext> | undefined,
	bindingContext: BindingProviderContext,
): TemplateConditionContext {
	return {
		pathname: normalizePathname( conditionContext?.pathname ?? '/' ),
		query: conditionContext?.query ?? bindingContext.query,
		data: conditionContext?.data ?? bindingContext.loadData,
		siteData: conditionContext?.siteData ?? bindingContext.siteData,
		request: conditionContext?.request ?? bindingContext.request,
		session: conditionContext?.session ?? bindingContext.session,
		record: conditionContext?.record ?? bindingContext.record,
		document: conditionContext?.document ?? bindingContext.document,
	};
}

function resolvePreviewDocument( project: BuilderPackage, activeDocumentId?: string ): BuilderDocument | undefined {
	if ( !activeDocumentId ) {
		return undefined;
	}

	const document = project.documents.find( ( entry ) => entry.id === activeDocumentId );
	if ( !document ) {
		return undefined;
	}

	return isPreviewableDocumentKind( document.kind ) ? document : undefined;
}

function resolvePreviewSlot(
	document: BuilderDocument,
	assignments: ThemeAssignment[],
	context: TemplateConditionContext,
): ExclusiveSlot | OverlaySlot | undefined {
	if ( document.kind === 'popup' ) {
		const modalAssignment = assignments.find( ( assignment ) => assignment.slot === 'modal' && fallbackMatchesAssignment( assignment, context ) );
		if ( modalAssignment ) {
			return 'modal';
		}

		return assignments.find( ( assignment ) => assignment.slot === 'modal' ) ? 'modal' : 'popup';
	}

	if ( document.kind === 'layout' ) {
		const matchingLayoutAssignment = assignments.find( ( assignment ) => isExclusiveSlot( assignment.slot ) && assignment.slot !== 'page' && fallbackMatchesAssignment( assignment, context ) );
		if ( matchingLayoutAssignment && isExclusiveSlot( matchingLayoutAssignment.slot ) ) {
			return matchingLayoutAssignment.slot;
		}

		const fallbackLayoutAssignment = assignments.find( ( assignment ) => isExclusiveSlot( assignment.slot ) && assignment.slot !== 'page' );
		if ( fallbackLayoutAssignment && isExclusiveSlot( fallbackLayoutAssignment.slot ) ) {
			return fallbackLayoutAssignment.slot;
		}
	}

	return 'page';
}

function resolveFallbackPage( project: BuilderPackage, pathname: string ): BuilderDocument | undefined {
	const normalizedPath = normalizePathname( pathname );
	return project.documents.find( ( document ) => document.kind === 'page' && normalizePathname( `/${ document.slug }` ) === normalizedPath )
		?? project.documents.find( ( document ) => document.kind === 'page' );
}

function selectAssignmentForSlot( slot: ExclusiveSlot, entries: ResolvedAssignmentEntry[] ): ResolvedAssignmentEntry | undefined {
	const candidates = dedupeAssignmentEntries(
		entries
			.filter( ( entry ) => entry.assignment.slot === slot )
			.sort( ( left, right ) => compareAssignmentEntries( left, right, slot ) ),
	);

	return candidates[ 0 ];
}

function selectStackedAssignmentsForSlot( slot: OverlaySlot, entries: ResolvedAssignmentEntry[] ): ResolvedAssignmentEntry[] {
	return dedupeAssignmentEntries(
		entries
			.filter( ( entry ) => entry.assignment.slot === slot )
			.sort( ( left, right ) => compareAssignmentEntries( left, right, slot ) ),
	);
}

function dedupeAssignmentEntries( entries: ResolvedAssignmentEntry[] ): ResolvedAssignmentEntry[] {
	const seen = new Set<string>();
	const output: ResolvedAssignmentEntry[] = [];
	for ( const entry of entries ) {
		if ( seen.has( entry.document.id ) ) {
			continue;
		}

		seen.add( entry.document.id );
		output.push( entry );
	}

	return output;
}

function compareAssignmentEntries(
	left: ResolvedAssignmentEntry,
	right: ResolvedAssignmentEntry,
	slot: ThemeAssignment['slot'] | undefined = left.assignment.slot,
): number {
	const statusDelta = getAssignmentStatusRank( right.assignment.status ) - getAssignmentStatusRank( left.assignment.status );
	if ( statusDelta ) {
		return statusDelta;
	}

	const priorityDelta = right.assignment.priority - left.assignment.priority;
	if ( priorityDelta ) {
		return priorityDelta;
	}

	const specificityDelta = getAssignmentSpecificity( right.assignment ) - getAssignmentSpecificity( left.assignment );
	if ( specificityDelta ) {
		return specificityDelta;
	}

	const leftKindRank = getDocumentKindRankForSlot( slot, left.document.kind );
	const rightKindRank = getDocumentKindRankForSlot( slot, right.document.kind );
	if ( leftKindRank !== rightKindRank ) {
		return leftKindRank - rightKindRank;
	}

	const updatedAtDelta = Date.parse( right.document.updatedAt ) - Date.parse( left.document.updatedAt );
	if ( Number.isFinite( updatedAtDelta ) && updatedAtDelta ) {
		return updatedAtDelta;
	}

	const titleDelta = left.document.title.localeCompare( right.document.title );
	if ( titleDelta ) {
		return titleDelta;
	}

	return left.document.id.localeCompare( right.document.id );
}

function getAssignmentStatusRank( status: ThemeAssignment['status'] ): number {
	switch ( status ) {
		case 'published':
			return 3;
		case 'draft':
			return 2;
		case 'archived':
		default:
			return 1;
	}
}

function getAssignmentSpecificity( assignment: ThemeAssignment ): number {
	return getRouteSpecificity( assignment.pathname ) + assignment.conditionGroups.reduce( ( score, group ) => {
		return score + 4 + ( group.rules.length * 6 );
	}, 0 );
}

function getRouteSpecificity( pattern?: string ): number {
	if ( !pattern ) {
		return 0;
	}

	const normalized = normalizePathname( pattern );
	if ( normalized === '/[...all]' || normalized === '/*' || normalized === '/(.*)' ) {
		return 1;
	}

	return normalized
		.split( '/' )
		.filter( Boolean )
		.reduce( ( score, segment ) => {
			if ( segment === '*' || segment === '(.*)' ) {
				return score + 1;
			}
			if ( /^\[\.\.\..+\]$/.test( segment ) ) {
				return score + 6;
			}
			if ( /^\[.+\]$/.test( segment ) ) {
				return score + 12;
			}

			return score + 24;
		}, 0 );
}

function getDocumentKindRankForSlot(
	slot: ThemeAssignment['slot'] | undefined,
	kind: BuilderDocument['kind'],
): number {
	if ( slot === 'header' || slot === 'footer' || slot === 'sidebar' ) {
		return slotKindRank( kind, [ 'layout', 'template', 'page', 'library-item', 'popup', 'component', 'kit' ] );
	}

	if ( slot === 'loop-item' || slot === 'empty' ) {
		return slotKindRank( kind, [ 'template', 'library-item', 'layout', 'page', 'popup', 'component', 'kit' ] );
	}

	if ( slot === 'popup' || slot === 'modal' ) {
		return slotKindRank( kind, [ 'popup', 'template', 'layout', 'library-item', 'page', 'component', 'kit' ] );
	}

	return slotKindRank( kind, [ 'page', 'template', 'layout', 'library-item', 'popup', 'component', 'kit' ] );
}

function slotKindRank(
	kind: BuilderDocument['kind'],
	orderedKinds: BuilderDocument['kind'][],
): number {
	const index = orderedKinds.indexOf( kind );
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function isDocumentCompatibleWithSlot( document: BuilderDocument, slot: ThemeAssignment['slot'] ): boolean {
	if ( document.kind === 'component' || document.kind === 'kit' ) {
		return false;
	}

	switch ( slot ) {
		case 'header':
		case 'footer':
		case 'sidebar':
			return document.kind === 'layout' || document.kind === 'template' || document.kind === 'page' || document.kind === 'library-item';
		case 'loop-item':
		case 'empty':
			return document.kind === 'template' || document.kind === 'library-item' || document.kind === 'layout' || document.kind === 'page';
		case 'popup':
		case 'modal':
			return document.kind === 'popup' || document.kind === 'template' || document.kind === 'layout';
		case 'page':
		default:
			return document.kind === 'page' || document.kind === 'template' || document.kind === 'layout' || document.kind === 'library-item';
	}
}

function isPreviewableDocumentKind( kind: BuilderDocument['kind'] ): boolean {
	return kind !== 'component' && kind !== 'kit';
}

function isExclusiveSlot( slot: string ): slot is ExclusiveSlot {
	return EXCLUSIVE_SLOTS.includes( slot as ExclusiveSlot );
}

function isOverlaySlot( slot: string ): slot is OverlaySlot {
	return OVERLAY_SLOTS.includes( slot as OverlaySlot );
}

function prepareDocumentForComposition(
	document: BuilderDocument,
	loopItemTemplate?: BuilderDocument,
	emptyStateTemplate?: BuilderDocument,
): BuilderDocument {
	const prepared = structuredClone( document );
	if ( loopItemTemplate || emptyStateTemplate ) {
		applyLoopAssignments( prepared.root, loopItemTemplate, emptyStateTemplate );
	}

	return prepared;
}

function applyLoopAssignments(
	nodes: BuilderNode[],
	loopItemTemplate?: BuilderDocument,
	emptyStateTemplate?: BuilderDocument,
): void {
	for ( const node of nodes ) {
		if ( node.type === 'loop' ) {
			if ( !( node.slots.item?.length ) && loopItemTemplate?.root.length ) {
				node.slots.item = structuredClone( loopItemTemplate.root );
			}

			if ( !( node.slots.empty?.length ) && emptyStateTemplate?.root.length ) {
				node.slots.empty = structuredClone( emptyStateTemplate.root );
			}
		}

		applyLoopAssignments( node.children, loopItemTemplate, emptyStateTemplate );
		for ( const slotNodes of Object.values( node.slots as Record<string, BuilderNode[]> ) ) {
			applyLoopAssignments( slotNodes, loopItemTemplate, emptyStateTemplate );
		}
	}
}

function fallbackMatchesAssignment( assignment: ThemeAssignment, context: TemplateConditionContext ): boolean {
	if ( assignment.pathname && !routePatternToRegExp( assignment.pathname ).test( normalizePathname( context.pathname ) ) ) {
		return false;
	}

	if ( !assignment.conditionGroups.length ) {
		return true;
	}

	return assignment.conditionGroups.some( ( group ) => evaluateConditionGroup( group, undefined, context ) );
}

function evaluateConditionGroup( group: ConditionGroup, model: BuilderRenderModel | undefined, context: TemplateConditionContext ): boolean {
	const evaluator = ( rule: ConditionGroup['rules'][ number ] ) => {
		if ( model?.adapter ) {
			return model.adapter.matchesConditionGroup( { ...group, rules: [ rule ] }, context );
		}

		return fallbackConditionMatch( rule, context );
	};

	return group.operator === 'or'
		? group.rules.some( evaluator )
		: group.rules.every( evaluator );
}

function fallbackConditionMatch( rule: ConditionGroup['rules'][ number ], context: TemplateConditionContext ): boolean {
	const actual = resolveContextValue( rule.source, rule.path, context );
	switch ( rule.operator ) {
		case 'exists':
			return actual !== undefined && actual !== null && actual !== '';
		case 'not-exists':
			return actual === undefined || actual === null || actual === '';
		case 'contains':
			return String( actual ?? '' ).includes( String( rule.value ?? '' ) );
		case 'matches':
			return new RegExp( String( rule.value ?? '' ) ).test( String( actual ?? '' ) );
		case 'startsWith':
			return String( actual ?? '' ).startsWith( String( rule.value ?? '' ) );
		case 'truthy':
			return Boolean( actual );
		case 'in':
			return rule.values.map( String ).includes( String( actual ?? '' ) );
		case 'equals':
		default:
			return String( actual ?? '' ) === String( rule.value ?? '' );
	}
}

function resolveBinding( binding: Binding, model: BuilderRenderModel, record?: Record<string, unknown> ): unknown {
	const context = record ? { ...model.bindingContext, record } : model.bindingContext;
	const resolved = binding.source === 'dynamic'
		? model.adapter?.resolveDynamicProvider?.( binding.path, context, binding.args, binding )
			?? model.registry.dynamicProviders.get( binding.path )?.resolve( context, binding.args, binding )
			?? binding.fallback
		: model.adapter?.resolveBinding( binding, context )
			?? model.registry.bindingProviders.get( binding.source )?.resolve( binding, context )
			?? binding.fallback;

	const transformed = applyBindingTransform( resolved, binding.transform );
	if ( transformed === undefined || transformed === null || transformed === '' ) {
		return transformed;
	}
	if ( typeof transformed === 'object' ) {
		return transformed;
	}
	const withAffixes = `${ binding.before ?? '' }${ String( transformed ) }${ binding.after ?? '' }`;
	return binding.category === 'number' ? Number( transformed ) : withAffixes;
}

function coerceDynamicBindingValue( value: unknown, category?: Binding['category'] ): JsonValue {
	if ( category === 'number' ) {
		const numberValue = typeof value === 'number' ? value : Number( value );
		return Number.isFinite( numberValue ) ? numberValue : 0;
	}
	if ( category === 'boolean' ) {
		return Boolean( value );
	}
	if ( category === 'image' || category === 'media' ) {
		if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
			const record = value as Record<string, unknown>;
			return String( record.src ?? record.url ?? record.href ?? '' );
		}
		return String( value ?? '' );
	}
	if ( category === 'gallery' ) {
		return Array.isArray( value ) ? value as JsonValue : [];
	}
	if ( value && typeof value === 'object' ) {
		return value as JsonValue;
	}
	return String( value ?? '' );
}

function applyBindingTransform( value: unknown, transform?: string ): unknown {
	switch ( transform ) {
		case 'uppercase':
			return String( value ?? '' ).toUpperCase();
		case 'lowercase':
			return String( value ?? '' ).toLowerCase();
		case 'json':
			return JSON.stringify( value );
		default:
			return value;
	}
}

function resolveContextValue( source: ConditionGroup['rules'][ number ][ 'source' ], path: string, context: TemplateConditionContext ): unknown {
	switch ( source ) {
		case 'route':
			return path === 'pathname' ? normalizePathname( context.pathname ) : undefined;
		case 'query':
			return context.query?.get( path );
		case 'site':
			return getByPath( context.siteData ?? {}, path );
		case 'request':
			return context.request ? getByPath( requestToObject( context.request ), path ) : undefined;
		case 'load':
			return getByPath( context.data ?? {}, path );
		case 'collection':
			return getByPath( context.record ?? {}, path );
		case 'session':
			return getByPath( context.session ?? {}, path );
		case 'document':
			return context.document ? getByPath( context.document as unknown as Record<string, unknown>, path ) : undefined;
	}
}

function resolveStyleMap( styles: StyleSet, viewport: string ): StyleMap {
	const responsiveViewport = resolveResponsiveCascadeViewportId( viewport );
	const cascade = getResponsiveBreakpointCascade( responsiveViewport );
	return cascade.reduce<StyleMap>(
		( resolvedStyles, breakpointId ) => {
			if ( breakpointId === 'desktop' ) {
				return {
					...resolvedStyles,
					...styles.base,
				};
			}

			return {
				...resolvedStyles,
				...( styles.breakpoints[ breakpointId ] ?? {} ),
			};
		},
		{},
	);
}

function resolveResponsiveCascadeViewportId( viewport: string ): 'desktop' | 'laptop' | 'tablet' | 'mobile' {
	switch ( viewport ) {
		case 'laptop':
		case 'tablet':
		case 'mobile':
			return viewport;
		default:
			return 'desktop';
	}
}

function getResponsiveBreakpointCascade( viewport: 'desktop' | 'laptop' | 'tablet' | 'mobile' ) {
	const orderedBreakpoints = [ 'desktop', 'laptop', 'tablet', 'mobile' ] as const;
	const viewportIndex = orderedBreakpoints.indexOf( viewport );
	return orderedBreakpoints.slice( 0, viewportIndex + 1 );
}

function applyRuntimeStyleFallbacks( node: BuilderNode, styles: StyleMap ): StyleMap {
	let next = normalizeRuntimeStyleAliases( node, styles );

	if ( [ 'heading', 'paragraph', 'text-editor', 'blockquote' ].includes( node.type ) && !hasStyleValue( next, [ 'text-align' ] ) && typeof node.props.align === 'string' ) {
		next = {
			...next,
			'text-align': node.props.align,
		};
	}

	if ( node.type === 'image' && !hasStyleValue( next, [ 'object-fit' ] ) && typeof node.props.fit === 'string' ) {
		next = {
			...next,
			'object-fit': node.props.fit,
		};
	}

	if ( [ 'menu', 'social-icons' ].includes( node.type ) ) {
		if ( !hasStyleValue( next, [ '--builder-menu-direction' ] ) && typeof node.props.orientation === 'string' ) {
			next = {
				...next,
				'--builder-menu-direction': normalizeMenuDirectionValue( node.props.orientation ),
			};
		}

		if ( !hasStyleValue( next, [ '--builder-menu-justify' ] ) && typeof node.props.alignment === 'string' ) {
			next = {
				...next,
				'--builder-menu-justify': normalizeMenuAlignmentValue( node.props.alignment ),
			};
		}
	}

	if ( node.type === 'button' ) {
		next = applyButtonStyleFallbacks( node, next );
	}

	if ( node.type === 'icon-box' ) {
		next = applyIconBoxStyleFallbacks( node, next );
	}

	if ( node.type !== 'container' && node.type !== 'grid-container' ) {
		return next;
	}

	next = applyContainerStyleFallbacks( node, next );

	const hasExplicitPadding = Object.keys( next ).some( ( key ) => key === 'padding' || key.startsWith( 'padding-' ) );
	if ( hasExplicitPadding ) {
		return next;
	}

	return {
		...next,
		padding: '20px',
	};
}

function normalizeRuntimeStyleAliases( node: BuilderNode, styles: StyleMap ): StyleMap {
	let next = { ...styles };

	if ( [ 'heading', 'paragraph', 'text-editor', 'blockquote' ].includes( node.type ) && !hasStyleValue( next, [ 'text-align' ] ) && hasStyleValue( next, [ 'align' ] ) ) {
		next[ 'text-align' ] = readStyleProperty( next, 'align' ) as JsonValue;
		delete next.align;
	}

	if ( !hasStyleValue( next, [ '--builder-caption-align' ] ) && hasStyleValue( next, [ 'captionAlign' ] ) ) {
		next[ '--builder-caption-align' ] = readStyleProperty( next, 'captionAlign' ) as JsonValue;
		delete next.captionAlign;
	}

	if ( node.type === 'image' && hasStyleValue( next, [ 'align' ] ) ) {
		const alignment = normalizeImageAlignmentValue( readStyleProperty( next, 'align' ) ?? '' );
		delete next.align;
		next = {
			...next,
			...applyImageAlignmentStyles( alignment, next ),
		};
	}

	if ( [ 'menu', 'social-icons' ].includes( node.type ) ) {
		if ( !hasStyleValue( next, [ '--builder-menu-direction' ] ) && hasStyleValue( next, [ 'direction' ] ) ) {
			next[ '--builder-menu-direction' ] = normalizeMenuDirectionValue( readStyleProperty( next, 'direction' ) ?? '' );
		}
		if ( !hasStyleValue( next, [ '--builder-menu-item-padding' ] ) && hasStyleValue( next, [ 'itemPadding' ] ) ) {
			next[ '--builder-menu-item-padding' ] = readStyleProperty( next, 'itemPadding' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-menu-item-background' ] ) && hasStyleValue( next, [ 'itemBackground' ] ) ) {
			next[ '--builder-menu-item-background' ] = readStyleProperty( next, 'itemBackground' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-menu-item-color' ] ) && hasStyleValue( next, [ 'itemColor' ] ) ) {
			next[ '--builder-menu-item-color' ] = readStyleProperty( next, 'itemColor' ) as JsonValue;
		}
	}

	if ( isFormNodeType( node.type ) ) {
		if ( !hasStyleValue( next, [ '--builder-form-gap' ] ) && hasStyleValue( next, [ 'fieldGap' ] ) ) {
			next[ '--builder-form-gap' ] = readStyleProperty( next, 'fieldGap' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-form-label-gap' ] ) && hasStyleValue( next, [ 'labelSpacing' ] ) ) {
			next[ '--builder-form-label-gap' ] = readStyleProperty( next, 'labelSpacing' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-form-field-padding' ] ) && hasStyleValue( next, [ 'inputPadding' ] ) ) {
			next[ '--builder-form-field-padding' ] = readStyleProperty( next, 'inputPadding' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-form-field-background-color' ] ) && hasStyleValue( next, [ 'inputBackground' ] ) ) {
			next[ '--builder-form-field-background-color' ] = readStyleProperty( next, 'inputBackground' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-form-field-border-radius' ] ) && hasStyleValue( next, [ 'inputBorderRadius' ] ) ) {
			next[ '--builder-form-field-border-radius' ] = readStyleProperty( next, 'inputBorderRadius' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-form-submit-padding' ] ) && hasStyleValue( next, [ 'submitPadding' ] ) ) {
			next[ '--builder-form-submit-padding' ] = readStyleProperty( next, 'submitPadding' ) as JsonValue;
		}
	}

	if ( node.type === 'loop' ) {
		if ( !hasStyleValue( next, [ '--builder-loop-columns' ] ) && hasStyleValue( next, [ 'columns' ] ) ) {
			next[ '--builder-loop-columns' ] = normalizeLoopColumnsValue( readStyleProperty( next, 'columns' ) ?? '' );
		}
		if ( !hasStyleValue( next, [ '--builder-loop-item-padding' ] ) && hasStyleValue( next, [ 'itemPadding' ] ) ) {
			next[ '--builder-loop-item-padding' ] = readStyleProperty( next, 'itemPadding' ) as JsonValue;
		}
		if ( !hasStyleValue( next, [ '--builder-loop-empty-padding' ] ) && hasStyleValue( next, [ 'emptyStatePadding' ] ) ) {
			next[ '--builder-loop-empty-padding' ] = readStyleProperty( next, 'emptyStatePadding' ) as JsonValue;
		}
	}

	return next;
}

function applyButtonStyleFallbacks( node: BuilderNode, styles: StyleMap ): StyleMap {
	const next = { ...styles };

	if ( !hasStyleValue( next, [ 'display' ] ) ) {
		next.display = 'inline-flex';
	}
	if ( !hasStyleValue( next, [ 'align-items' ] ) ) {
		next[ 'align-items' ] = 'center';
	}
	if ( !hasStyleValue( next, [ 'justify-content' ] ) ) {
		next[ 'justify-content' ] = 'center';
	}
	if ( !hasStyleValue( next, [ 'text-decoration' ] ) ) {
		next[ 'text-decoration' ] = 'none';
	}

	const size = typeof node.props.size === 'string' ? node.props.size : 'md';
	if ( !hasStyleValue( next, [ 'padding' ] ) ) {
		next.padding = size === 'sm' ? '0.55rem 0.9rem' : size === 'lg' ? '0.9rem 1.25rem' : '0.7rem 1rem';
	}
	if ( !hasStyleValue( next, [ 'font-size' ] ) ) {
		next[ 'font-size' ] = size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem';
	}

	const variant = typeof node.props.variant === 'string' ? node.props.variant : 'solid';
	if ( !hasStyleValue( next, [ 'background-color' ] ) ) {
		next[ 'background-color' ] = variant === 'solid' ? '#111827' : 'transparent';
	}
	if ( !hasStyleValue( next, [ 'border-color' ] ) ) {
		next[ 'border-color' ] = variant === 'ghost' ? 'transparent' : '#111827';
	}
	if ( !hasStyleValue( next, [ 'color' ] ) ) {
		next.color = variant === 'solid' ? '#ffffff' : '#111827';
	}

	return next;
}

function applyIconBoxStyleFallbacks( node: BuilderNode, styles: StyleMap ): StyleMap {
	const next = { ...styles };
	if ( !hasStyleValue( next, [ 'display' ] ) ) {
		next.display = 'flex';
	}
	if ( !hasStyleValue( next, [ '--builder-icon-box-direction' ] ) ) {
		const iconPosition = typeof node.props.iconPosition === 'string' ? node.props.iconPosition : 'top';
		next[ '--builder-icon-box-direction' ] = iconPosition === 'top' ? 'column' : 'row';
		next[ '--builder-icon-box-icon-order' ] = iconPosition === 'right' ? '1' : '0';
	}
	return next;
}

function applyContainerStyleFallbacks( node: BuilderNode, styles: StyleMap ): StyleMap {
	const next = { ...styles };
	const layout = node.layout ?? {};
	const display = normalizeContainerDisplayValue( stringValue( layout.display ), node.type );
	const width = stringValue( layout.width );
	const maxWidth = stringValue( layout.maxWidth );
	const minHeight = stringValue( layout.minHeight );
	const overflow = stringValue( layout.overflow );
	const position = stringValue( layout.position );
	const gap = stringValue( layout.gap );
	const direction = stringValue( layout.direction );
	const wrap = stringValue( layout.wrap );
	const justifyContent = normalizeContainerAlignmentValue( stringValue( layout.justifyContent ) );
	const alignItems = normalizeContainerAlignmentValue( stringValue( layout.alignItems ) );
	const alignContent = normalizeContainerAlignmentValue( stringValue( layout.alignContent ) );
	const justifyItems = normalizeContainerAlignmentValue( stringValue( layout.justifyItems ) );
	const autoFlow = stringValue( layout.autoFlow );
	const gridTemplateColumns = normalizeContainerGridTrackValue( layout.columns );
	const gridTemplateRows = normalizeContainerGridTrackValue( layout.rows );
	const gridColumn = normalizeContainerPlacementValue( layout.gridColumn, layout.gridColumnCustom );
	const gridRow = normalizeContainerPlacementValue( layout.gridRow, layout.gridRowCustom );

	if ( !hasStyleValue( next, [ 'display' ] ) && display ) {
		next.display = display;
	}
	if ( !hasStyleValue( next, [ 'width' ] ) ) {
		next.width = width ?? '100%';
	}
	if ( !hasStyleValue( next, [ 'max-width' ] ) && maxWidth ) {
		next[ 'max-width' ] = maxWidth;
	}
	if ( !hasStyleValue( next, [ 'min-height' ] ) && minHeight ) {
		next[ 'min-height' ] = minHeight;
	}
	if ( !hasStyleValue( next, [ 'overflow' ] ) && overflow ) {
		next.overflow = overflow;
	}
	if ( !hasStyleValue( next, [ 'position' ] ) && position ) {
		next.position = position;
	}
	if ( !hasStyleValue( next, [ 'grid-column' ] ) && gridColumn ) {
		next[ 'grid-column' ] = gridColumn;
	}
	if ( !hasStyleValue( next, [ 'grid-row' ] ) && gridRow ) {
		next[ 'grid-row' ] = gridRow;
	}
	if ( !hasStyleValue( next, [ 'gap' ] ) && gap ) {
		next.gap = gap;
	}

	const resolvedDisplay = String( next.display ?? display ?? '' ).toLowerCase();
	if ( resolvedDisplay === 'flex' ) {
		if ( !hasStyleValue( next, [ 'flex-direction' ] ) && direction ) {
			next[ 'flex-direction' ] = direction;
		}
		if ( !hasStyleValue( next, [ 'flex-wrap' ] ) && wrap ) {
			next[ 'flex-wrap' ] = wrap;
		}
		if ( !hasStyleValue( next, [ 'justify-content' ] ) && justifyContent ) {
			next[ 'justify-content' ] = justifyContent;
		}
		if ( !hasStyleValue( next, [ 'align-items' ] ) && alignItems ) {
			next[ 'align-items' ] = alignItems;
		}
		if ( !hasStyleValue( next, [ 'align-content' ] ) && alignContent ) {
			next[ 'align-content' ] = alignContent;
		}
	}

	if ( resolvedDisplay === 'grid' ) {
		if ( !hasStyleValue( next, [ 'grid-template-columns' ] ) && gridTemplateColumns ) {
			next[ 'grid-template-columns' ] = gridTemplateColumns;
		}
		if ( !hasStyleValue( next, [ 'grid-template-rows' ] ) && gridTemplateRows ) {
			next[ 'grid-template-rows' ] = gridTemplateRows;
		}
		if ( !hasStyleValue( next, [ 'grid-auto-flow' ] ) && autoFlow ) {
			next[ 'grid-auto-flow' ] = autoFlow;
		}
		if ( !hasStyleValue( next, [ 'justify-items' ] ) && justifyItems ) {
			next[ 'justify-items' ] = justifyItems;
		}
		if ( !hasStyleValue( next, [ 'align-items' ] ) && alignItems ) {
			next[ 'align-items' ] = alignItems;
		}
		if ( !hasStyleValue( next, [ 'justify-content' ] ) && justifyContent ) {
			next[ 'justify-content' ] = justifyContent;
		}
		if ( !hasStyleValue( next, [ 'align-content' ] ) && alignContent ) {
			next[ 'align-content' ] = alignContent;
		}
	}

	return next;
}

function hasStyleValue( styles: StyleMap, properties: string[] ): boolean {
	return properties.some( ( property ) => {
		const value = readStyleProperty( styles, property );
		return value !== undefined && value !== null && String( value ) !== '';
	} );
}

function readStyleProperty( styles: StyleMap, property: string ): JsonValue | undefined {
	const legacy = property.startsWith( '--' ) || !property.includes( '-' )
		? property
		: property.replace( /-([a-z])/g, ( _, character: string ) => character.toUpperCase() );
	return styles[ property ] ?? ( legacy !== property ? styles[ legacy ] : undefined );
}

function isFormNodeType( type: string ): boolean {
	return [
		'form',
		'form-field-text',
		'form-field-email',
		'form-field-textarea',
		'form-field-select',
		'form-field-checkbox',
		'form-field-submit',
	].includes( type );
}

function normalizeMenuDirectionValue( value: JsonValue ): string {
	return String( value ?? '' ) === 'vertical' || String( value ?? '' ) === 'column' ? 'column' : 'row';
}

function normalizeImageAlignmentValue( value: JsonValue ): 'start' | 'center' | 'end' | 'stretch' {
	switch ( String( value ?? '' ).toLowerCase() ) {
		case 'center':
		case 'middle':
			return 'center';
		case 'right':
		case 'end':
		case 'flex-end':
			return 'end';
		case 'justify':
		case 'stretch':
			return 'stretch';
		case 'left':
		case 'start':
		case 'flex-start':
		default:
			return 'start';
	}
}

function normalizeContainerDisplayValue( value: string | undefined, type: BuilderNode['type'] ): string {
	const normalized = String( value ?? '' ).trim().toLowerCase();
	if ( normalized === 'grid' || normalized === 'flex' || normalized === 'block' ) {
		return normalized;
	}
	return type === 'grid-container' ? 'grid' : 'flex';
}

function normalizeContainerAlignmentValue( value: string | undefined ): string | undefined {
	switch ( String( value ?? '' ).trim().toLowerCase() ) {
		case 'left':
		case 'top':
		case 'start':
			return 'start';
		case 'right':
		case 'bottom':
		case 'end':
			return 'end';
		case 'center':
		case 'stretch':
		case 'space-between':
		case 'space-around':
		case 'space-evenly':
			return String( value ?? '' ).trim().toLowerCase();
		case 'flex-start':
		case 'flex-end':
			return String( value ?? '' ).trim().toLowerCase();
		default:
			return value ? String( value ) : undefined;
	}
}

function normalizeContainerGridTrackValue( value: JsonValue | undefined ): string | undefined {
	if ( typeof value === 'number' && Number.isFinite( value ) && value > 0 ) {
		return `repeat(${ value }, minmax(0, 1fr))`;
	}
	if ( typeof value === 'string' ) {
		const trimmed = value.trim();
		if ( !trimmed ) {
			return undefined;
		}
		if ( /^\d+$/.test( trimmed ) ) {
			return `repeat(${ trimmed }, minmax(0, 1fr))`;
		}
		return trimmed;
	}
	return undefined;
}

function normalizeContainerPlacementValue( value: JsonValue | undefined, custom: JsonValue | undefined ): string | undefined {
	const customValue = stringValue( custom )?.trim();
	if ( customValue ) {
		return customValue;
	}
	const raw = stringValue( value )?.trim();
	if ( !raw || raw === 'custom' ) {
		return undefined;
	}
	return raw;
}

function applyImageAlignmentStyles( alignment: 'start' | 'center' | 'end' | 'stretch', styles: StyleMap ): StyleMap {
	const next = { ...styles };

	switch ( alignment ) {
		case 'center':
			next[ 'margin-inline-start' ] = 'auto';
			next[ 'margin-inline-end' ] = 'auto';
			break;
		case 'end':
			next[ 'margin-inline-start' ] = 'auto';
			next[ 'margin-inline-end' ] = '0';
			break;
		case 'stretch':
			next[ 'margin-inline-start' ] = '0';
			next[ 'margin-inline-end' ] = '0';
			if ( !hasStyleValue( next, [ 'width' ] ) ) {
				next.width = '100%';
			}
			break;
		case 'start':
		default:
			next[ 'margin-inline-start' ] = '0';
			next[ 'margin-inline-end' ] = 'auto';
			break;
	}

	return next;
}

function normalizeMenuAlignmentValue( value: JsonValue ): string {
	switch ( String( value ?? '' ) ) {
		case 'left':
		case 'flex-start':
			return 'flex-start';
		case 'right':
		case 'flex-end':
			return 'flex-end';
		case 'center':
			return 'center';
		case 'space-between':
			return 'space-between';
		default:
			return String( value ?? 'flex-start' );
	}
}

function normalizeLoopColumnsValue( value: JsonValue ): string {
	const raw = String( value ?? '' ).trim();
	if ( /^\d+$/.test( raw ) ) {
		return `repeat(${ raw }, minmax(0, 1fr))`;
	}
	return raw || '1fr';
}

function compileStyleSet(selector: string, styles: StyleSet, breakpoints: Map<string, number>): string[] {
	const lines: string[] = [];
	const baseDeclarations = stringifyDeclarations( styles.base );
	if ( baseDeclarations ) {
		lines.push( `${ selector } { ${ baseDeclarations } }` );
	}

	for ( const [ state, declarations ] of Object.entries( styles.states ) ) {
		const body = stringifyDeclarations( declarations, { important: true } );
		if ( body ) {
			lines.push( `${ selector }:${ state } { ${ body } }` );
		}
	}

	for ( const [ breakpointId, declarations ] of Object.entries( styles.breakpoints ) ) {
		const body = stringifyDeclarations( declarations );
		const minWidth = breakpoints.get( breakpointId );
		if ( body && minWidth !== undefined ) {
			lines.push( `@media (min-width: ${ minWidth }px) { ${ selector } { ${ body } } }` );
		}
	}

	for ( const [ breakpointId, states ] of Object.entries( styles.stateBreakpoints ) ) {
		const minWidth = breakpoints.get( breakpointId );
		if ( minWidth === undefined ) {
			continue;
		}
		for ( const [ state, declarations ] of Object.entries( states ) ) {
			const body = stringifyDeclarations( declarations, { important: true } );
			if ( body ) {
				lines.push( `@media (min-width: ${ minWidth }px) { ${ selector }:${ state } { ${ body } } }` );
			}
		}
	}

	if ( styles.customCss ) {
		lines.push( styles.customCss );
	}

	return lines;
}

function compileDocumentCustomCss( document: BuilderDocument, breakpoints: Map<string, number> ): string {
	return document.root
		.flatMap( ( node ) => compileNodeCustomCss( node, breakpoints ) )
		.join( '\n' );
}

function compileNodeCustomCss( node: BuilderNode, breakpoints: Map<string, number> ): string[] {
	const customCss = node.styles.customCss.trim();
	const selector = `[data-builder-node="${ escapeCssAttributeValue( node.id ) }"]`;
	const slotChildren = Object.values( node.slots ) as BuilderNode[][];
	const localResponsiveCss = compileStyleSet( selector, createStyleSet( {
		states: node.styles.states,
		breakpoints: node.styles.breakpoints,
		stateBreakpoints: node.styles.stateBreakpoints,
	} ), breakpoints );
	const ownCss = customCss
		? [ ...localResponsiveCss, scopeCustomCssToSelector( customCss, selector ) ]
		: localResponsiveCss;

	return [
		...ownCss,
		...( node.children as BuilderNode[] ).flatMap( ( child: BuilderNode ) => compileNodeCustomCss( child, breakpoints ) ),
		...slotChildren.flatMap( ( children ) => children.flatMap( ( child: BuilderNode ) => compileNodeCustomCss( child, breakpoints ) ) ),
	];
}

function scopeCustomCssToSelector( customCss: string, selector: string ): string {
	if ( customCss.includes( 'selector' ) ) {
		return customCss.replaceAll( /\bselector\b/g, selector );
	}

	if ( customCss.includes( '{' ) ) {
		return customCss;
	}

	return `${ selector } { ${ customCss } }`;
}

function escapeCssAttributeValue( value: string ): string {
	return value.replace( /\\/g, '\\\\' ).replace( /"/g, '\\"' );
}

function stringifyDeclarations( declarations: StyleMap, options: { important?: boolean } = {} ): string {
	return Object.entries( declarations )
		.filter( ( [ property ] ) => isSupportedCssPropertyName( property ) )
		.map( ( [ property, value ] ) => `${ normalizeCssPropertyName( property ) }: ${ stringifyCssValue( value ) }${ options.important ? ' !important' : '' };` )
		.join( ' ' );
}

function stringifyCssValue( value: JsonValue ): string {
	if ( value && typeof value === 'object' && !Array.isArray( value ) && 'token' in value ) {
		return `var(--builder-var-${ sanitizeCssToken( String( ( value as Record<string, unknown> ).token ) ) })`;
	}
	return String( value ?? '' );
}

function normalizeCssPropertyName( property: string ): string {
	if ( property.startsWith( '--' ) ) {
		return property;
	}

	return property.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();
}

function isSupportedCssPropertyName( property: string ): boolean {
	if ( !property || /\s|;|:/.test( property ) ) {
		return false;
	}

	if ( property.startsWith( '--' ) ) {
		return /^--[a-z0-9-_]+$/i.test( property );
	}

	return /^[a-z][a-z0-9-]*$/i.test( property ) || /^[a-z][a-zA-Z0-9]*$/.test( property );
}

function sanitizeCssToken( value: string ): string {
	return value.toLowerCase().replaceAll( /[^a-z0-9_-]+/g, '-' );
}

function routePatternToRegExp( pattern: string ): RegExp {
	const normalizedPattern = normalizePathname( pattern );
	if ( normalizedPattern === '*' || normalizedPattern === '/*' || normalizedPattern === '/[...all]' || normalizedPattern === '/(.*)' ) {
		return /^\/(?:.*)?$/;
	}

	const segments = normalizedPattern.split( '/' ).filter( Boolean );
	if ( !segments.length ) {
		return /^\/$/;
	}

	const expression = segments
		.map( ( segment ) => {
			if ( segment === '*' || segment === '(.*)' ) {
				return '.*';
			}
			if ( /^\[\.\.\..+\]$/.test( segment ) ) {
				return '.*';
			}
			if ( /^\[.+\]$/.test( segment ) ) {
				return '[^/]+';
			}
			return segment.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
		} )
		.join( '/' );

	return new RegExp( `^/${ expression }/?$` );
}

function normalizePathname( pathname: string | undefined ): string {
	if ( !pathname ) {
		return '/';
	}

	const value = pathname.split( '?' )[ 0 ]?.split( '#' )[ 0 ] ?? pathname;
	const normalized = value.startsWith( '/' ) ? value : `/${ value }`;
	if ( normalized.length === 1 ) {
		return normalized;
	}

	return normalized.replace( /\/+$/, '' );
}

function collectionContextRecords(
	collections: Record<string, unknown> | undefined,
	key: string | undefined,
): Array<Record<string, unknown>> | undefined {
	if ( !collections || !key ) {
		return undefined;
	}

	const value = collections[ key ];
	if ( Array.isArray( value ) ) {
		return value.filter( ( entry ): entry is Record<string, unknown> => Boolean( entry ) && typeof entry === 'object' && !Array.isArray( entry ) );
	}

	return undefined;
}

function resolveCollectionQuery(
	nodeProps: Record<string, JsonValue>,
	collectionQuery?: Record<string, JsonValue>,
): Record<string, JsonValue> {
	const localQuery = asRecord( nodeProps.query );
	return {
		...( collectionQuery ?? {} ),
		...( localQuery ?? {} ),
		limit: nodeProps.limit ?? localQuery?.limit ?? collectionQuery?.limit ?? 0,
	};
}

function applyCollectionQuery(
	records: Array<Record<string, unknown>>,
	query: Record<string, JsonValue>,
): Array<Record<string, unknown>> {
	let output = [ ...records ];
	const filters = extractCollectionFilters( query );
	for ( const filter of filters ) {
		output = output.filter( ( record ) => compareCollectionValue(
			getByPath( record, filter.path ),
			filter.operator,
			filter.value,
			filter.values,
		) );
	}

	const orderBy = stringValue( query.orderBy );
	if ( orderBy ) {
		const direction = stringValue( query.direction ) === 'desc' ? -1 : 1;
		output.sort( ( left, right ) => compareSortValues( getByPath( left, orderBy ), getByPath( right, orderBy ) ) * direction );
	}

	return output;
}

function extractCollectionFilters( query: Record<string, JsonValue> ): Array<{
	path: string;
	operator: string;
	value?: JsonValue;
	values?: JsonValue[];
}> {
	const directPath = stringValue( query.path );
	if ( directPath ) {
		return [ {
			path: directPath,
			operator: stringValue( query.operator ) ?? 'equals',
			value: query.value,
			values: ensureArray( query.values ),
		} ];
	}

	const filters = ensureArray( query.filters );
	return filters
		.map( ( filter ) => asRecord( filter ) )
		.filter( Boolean )
		.map( ( filter ) => ( {
			path: stringValue( filter.path ) ?? '',
			operator: stringValue( filter.operator ) ?? 'equals',
			value: filter.value,
			values: ensureArray( filter.values ),
		} ) )
		.filter( ( filter ) => Boolean( filter.path ) );
}

function compareCollectionValue(
	actual: unknown,
	operator: string,
	expected?: JsonValue,
	values: JsonValue[] = [],
): boolean {
	switch ( operator ) {
		case 'exists':
			return actual !== undefined && actual !== null && actual !== '';
		case 'not-exists':
			return actual === undefined || actual === null || actual === '';
		case 'contains':
			return String( actual ?? '' ).includes( String( expected ?? '' ) );
		case 'startsWith':
			return String( actual ?? '' ).startsWith( String( expected ?? '' ) );
		case 'truthy':
			return Boolean( actual );
		case 'in':
			return values.map( String ).includes( String( actual ?? '' ) );
		case 'equals':
		default:
			return String( actual ?? '' ) === String( expected ?? '' );
	}
}

function compareSortValues( left: unknown, right: unknown ): number {
	if ( typeof left === 'number' && typeof right === 'number' ) {
		return left - right;
	}

	return String( left ?? '' ).localeCompare( String( right ?? '' ) );
}

function getByPath( value: unknown, path: string ): unknown {
	return path.split( '.' ).reduce<unknown>( ( current, segment ) => {
		if ( current && typeof current === 'object' && segment in ( current as Record<string, unknown> ) ) {
			return ( current as Record<string, unknown> )[ segment ];
		}
		return undefined;
	}, value );
}

function requestToObject( request: Request ) {
	return {
		url: request.url,
		method: request.method,
		headers: Object.fromEntries( request.headers.entries() ),
	};
}

function createFallbackCompatNode( node: BuilderNode, reason: string ): BuilderNode {
	return createNodeShim( {
		...node,
		type: 'compat-widget',
		props: {
			...node.props,
			reason,
		},
	} );
}

function applyOverrideToNode( node: BuilderNode, nodeId: string, propPath: string, value: JsonValue ): void {
	if ( node.id === nodeId ) {
		setByPath( node.props, propPath, value );
	}
	node.children.forEach( ( child: BuilderNode ) => applyOverrideToNode( child, nodeId, propPath, value ) );
	Object.values( node.slots as Record<string, BuilderNode[]> ).forEach( ( slotNodes ) => slotNodes.forEach( ( child: BuilderNode ) => applyOverrideToNode( child, nodeId, propPath, value ) ) );
}

function setByPath( target: Record<string, JsonValue>, path: string, value: JsonValue ): void {
	const segments = path.split( '.' );
	let cursor: Record<string, JsonValue> = target;
	for ( const segment of segments.slice( 0, -1 ) ) {
		const current = cursor[ segment ];
		if ( !current || typeof current !== 'object' || Array.isArray( current ) ) {
			cursor[ segment ] = {};
		}
		cursor = cursor[ segment ] as Record<string, JsonValue>;
	}
	cursor[ segments.at( -1 )! ] = value;
}

function createNodeShim( input: Partial<BuilderNode> & Pick<BuilderNode, 'type'> ): BuilderNode {
	return {
		id: input.id ?? crypto.randomUUID(),
		type: input.type,
		name: input.name,
		props: input.props ?? {},
		layout: input.layout ?? {},
		styleRefs: input.styleRefs ?? [],
		styles: input.styles ?? { base: {}, states: {}, breakpoints: {}, stateBreakpoints: {}, customCss: '' },
		bindings: input.bindings ?? [],
		attributes: input.attributes ?? [],
		interactions: input.interactions ?? [],
		visibility: input.visibility ?? { hidden: false, breakpointHidden: {}, conditionGroups: [], display: 'show' },
		accessibility: input.accessibility ?? { decorative: false },
		children: input.children ?? [],
		slots: input.slots ?? {},
		legacy: input.legacy,
		meta: input.meta ?? {},
	};
}

function ensureArray( value: JsonValue | unknown ): JsonValue[] {
	return Array.isArray( value ) ? value as JsonValue[] : [];
}

function asRecord( value: JsonValue | unknown ): Record<string, JsonValue> {
	return value && typeof value === 'object' && !Array.isArray( value ) ? value as Record<string, JsonValue> : {};
}

function stringValue( value: JsonValue | unknown ): string | undefined {
	return typeof value === 'string' && value.length ? value : undefined;
}

function numberValue( value: JsonValue | unknown ): number | undefined {
	return typeof value === 'number' && Number.isFinite( value )
		? value
		: typeof value === 'string' && value.trim() !== '' && Number.isFinite( Number( value ) )
			? Number( value )
			: undefined;
}

function booleanValue( value: JsonValue | unknown ): boolean | undefined {
	return typeof value === 'boolean'
		? value
		: value === 'true'
			? true
			: value === 'false'
				? false
				: undefined;
}

function clampIndex( value: number, length: number ): number {
	if ( length <= 0 ) {
		return 0;
	}

	return Math.min( Math.max( value, 0 ), length - 1 );
}

function inferNodeLabel( node: BuilderNode | undefined ): string | undefined {
	if ( !node ) {
		return undefined;
	}

	return stringValue( node.props.label )
		?? stringValue( node.props.title )
		?? stringValue( node.props.text )
		?? stringValue( node.props.name );
}

function normalizeMenuItem( item: JsonValue, fallbackId: string ): RuntimeMenuItem {
	const entry = asRecord( item );
	return {
		id: stringValue( entry.id ) ?? fallbackId,
		label: stringValue( entry.label ) ?? stringValue( entry.title ) ?? 'Link',
		href: stringValue( entry.href ) ?? '#',
		target: stringValue( entry.target ),
		rel: stringValue( entry.rel ),
		icon: stringValue( entry.icon ) ?? stringValue( entry.symbol ),
		children: ensureArray( entry.children ).map( ( child, index ) => normalizeMenuItem( child, `${ fallbackId }-${ index }` ) ),
	};
}

function normalizeGeneratedField( field: JsonValue, index: number ): RuntimeFormFieldShell {
	const entry = asRecord( field );
	const rawKind = stringValue( entry.kind ) ?? stringValue( entry.type ) ?? 'text';
	const kind = rawKind === 'submit'
		? 'submit'
		: rawKind === 'textarea'
			? 'textarea'
			: rawKind === 'select'
				? 'select'
				: rawKind === 'checkbox'
					? 'checkbox'
					: rawKind === 'radio'
						? 'radio'
						: rawKind === 'hidden'
							? 'hidden'
							: rawKind === 'email'
								? 'email'
								: 'text';

	return {
		id: stringValue( entry.id ) ?? `generated-field-${ index }`,
		kind,
		label: stringValue( entry.label ),
		legend: stringValue( entry.legend ),
		name: stringValue( entry.name ),
		placeholder: stringValue( entry.placeholder ),
		value: stringValue( entry.value ),
		checked: booleanValue( entry.checked ),
		options: ensureArray( entry.options ).map( ( option, optionIndex ) => {
			const normalized = asRecord( option );
			return {
				label: stringValue( normalized.label ) ?? `Option ${ optionIndex + 1 }`,
				value: stringValue( normalized.value ) ?? String( optionIndex + 1 ),
			} satisfies RuntimeFormFieldOption;
		} ),
		rows: numberValue( entry.rows ),
		text: stringValue( entry.text ),
		required: booleanValue( entry.required ),
	};
}

function parseFormMarkup( markup?: string ): Partial<RuntimeFormFieldShell> | undefined {
	if ( !markup ) {
		return undefined;
	}

	if ( typeof DOMParser === 'undefined' ) {
		return parseFormMarkupFallback( markup );
	}

	try {
		const document = new DOMParser().parseFromString( markup, 'text/html' );
		const root = document.body.firstElementChild;
		if ( !root ) {
			return undefined;
		}

		const label = root.querySelector( 'span,label' )?.textContent?.trim()
			|| root.querySelector( 'legend' )?.textContent?.trim()
			|| undefined;
		const legend = root.querySelector( 'legend' )?.textContent?.trim() || undefined;
		const input = root.matches( 'input, textarea, select, button' )
			? root
			: root.querySelector( 'input, textarea, select, button' );
		const options = input?.matches( 'select' )
			? Array.from( input.querySelectorAll( 'option' ) ).map( ( option ) => ( {
				label: option.textContent?.trim() || option.getAttribute( 'value' ) || '',
				value: option.getAttribute( 'value' ) || option.textContent?.trim() || '',
			} ) )
			: input?.matches( 'fieldset' )
				? Array.from( input.querySelectorAll( 'input' ) ).map( ( option, index ) => ( {
					label: option.closest( 'label' )?.textContent?.trim() || `Option ${ index + 1 }`,
					value: option.getAttribute( 'value' ) || String( index + 1 ),
				} ) )
				: [];

		return {
			label,
			legend,
			name: input?.getAttribute( 'name' ) || undefined,
			placeholder: input?.getAttribute( 'placeholder' ) || undefined,
			value: input?.getAttribute( 'value' ) || undefined,
			checked: input?.hasAttribute( 'checked' ),
			options,
			rows: input?.matches( 'textarea' ) ? numberValue( input.getAttribute( 'rows' ) ) : undefined,
			text: input?.matches( 'button' ) ? input.textContent?.trim() || undefined : undefined,
			required: input?.hasAttribute( 'required' ),
		};
	} catch {
		return parseFormMarkupFallback( markup );
	}
}

function parseFormMarkupFallback( markup: string ): Partial<RuntimeFormFieldShell> | undefined {
	const labelMatch = markup.match( /<span>([^<]+)<\/span>/i ) ?? markup.match( /<legend>([^<]+)<\/legend>/i );
	const placeholderMatch = markup.match( /placeholder="([^"]+)"/i );
	const nameMatch = markup.match( /name="([^"]+)"/i );
	const valueMatch = markup.match( /value="([^"]*)"/i );
	const buttonTextMatch = markup.match( /<button[^>]*>([^<]+)<\/button>/i );

	return {
		label: labelMatch?.[ 1 ],
		legend: labelMatch?.[ 1 ],
		name: nameMatch?.[ 1 ],
		placeholder: placeholderMatch?.[ 1 ],
		value: valueMatch?.[ 1 ],
		text: buttonTextMatch?.[ 1 ],
	};
}
