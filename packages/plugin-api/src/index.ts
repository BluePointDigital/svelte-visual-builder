import { z } from 'zod';

import {
	contentSection,
	jsonField,
	imageField,
	numberField,
	richTextField,
	sectionField,
	selectField,
	textField,
	textareaField,
	toggleField,
	urlField,
} from './panel-section-utils.ts';
import {
	createAccordionPanelSections,
	createCarouselPanelSections,
	createContainerPanelSections,
	createGalleryPanelSections,
	createGridContainerPanelSections,
	createIconBoxPanelSections,
	createMenuPanelSections,
	createTabsPanelSections,
	createTogglePanelSections,
} from './section-definitions/index.ts';
import {
	createChoosePrimitive,
	createColorPrimitive,
	createDimensionsPrimitive,
	createMediaPrimitive,
	createSelectPrimitive,
	createSliderPrimitive,
	createSwitcherPrimitive,
	createUrlPrimitive,
	type BuilderControlPrimitive,
	type BuilderControlOption,
} from './control-family-helpers.ts';

export * from './control-family-helpers.ts';
export * from './panel-section-utils.ts';
export * from './section-definitions/index.ts';
export * from './style-advanced-families.ts';

import { createDocument, createNode, createStyleSet, StyleSetSchema, styleStateTargets } from '@builder/schema';
import type {
	Binding,
	BuilderDocument,
	BuilderNode,
	ComponentExposure,
	ConditionGroup,
	DocumentKind,
	JsonValue,
	StyleSet,
	ThemeAssignment,
} from '@builder/schema';
import {
	createButtonParityMetadata,
	createHeadingParityMetadata,
	createImageParityMetadata,
	createParagraphParityMetadata,
	createTextEditorParityMetadata,
} from './text-media-parity.ts';
import {
	createCompatParityPanelSections,
	createFormFieldParityPanelSections,
	createFormParityPanelSections,
	createLoopParityPanelSections,
	createPopupRootParityPanelSections,
} from './panel-section-presets.ts';

export {
	createCompatParityPanelSections,
	createFormFieldParityPanelSections,
	createFormParityPanelSections,
	createLoopParityPanelSections,
	createPopupRootParityPanelSections,
} from './panel-section-presets.ts';

export type BuilderElementCategory = 'layout' | 'content' | 'media' | 'interactive' | 'data' | 'form' | 'legacy';
export type BuilderFieldType = 'text' | 'rich-text' | 'textarea' | 'url' | 'select' | 'toggle' | 'number' | 'image' | 'token' | 'json';
export type BuilderStyleTarget = ( typeof styleStateTargets )[ number ];
export const builderControlStates = [ 'normal', 'hover', 'active', 'focus' ] as const;
export type BuilderControlState = ( typeof builderControlStates )[ number ];
export type BuilderRuntimeFamily =
	| 'container'
	| 'text'
	| 'image'
	| 'button'
	| 'divider'
	| 'video'
	| 'html'
	| 'icon'
	| 'icon-box'
	| 'list'
	| 'tabs'
	| 'accordion'
	| 'menu'
	| 'gallery'
	| 'carousel'
	| 'form'
	| 'loop'
	| 'popup'
	| 'compat';
export type BuilderPanelSectionTab = 'content' | 'style' | 'advanced';
export type BuilderStyleSectionFamily =
	| 'layout'
	| 'alignment'
	| 'spacing'
	| 'dimensions'
	| 'typography'
	| 'text-stroke'
	| 'text-shadow'
	| 'background'
	| 'background-overlay'
	| 'border'
	| 'border-radius'
	| 'box-shadow'
	| 'css-filters'
	| 'blend-mode'
	| 'caption'
	| 'shape-divider'
	| 'icon'
	| 'normal-hover-state-group';
export type BuilderAdvancedSectionFamily =
	| 'layout'
	| 'positioning'
	| 'motion-effects'
	| 'transform'
	| 'responsive'
	| 'visibility'
	| 'attributes'
	| 'custom-css'
	| 'background'
	| 'border'
	| 'mask-or-overlay';

export interface BuilderControlCondition {
	path: string;
	equals?: JsonValue;
	notEquals?: JsonValue;
	truthy?: boolean;
	oneOf?: JsonValue[];
}

export interface BuilderFieldDefinition {
	id: string;
	label: string;
	type: BuilderFieldType;
	path: string;
	styleProperty?: string;
	description?: string;
	placeholder?: string;
	options?: Array<{ label: string; value: string }>;
	responsive?: boolean;
	condition?: BuilderControlCondition;
	componentExposure?: {
		supported: boolean;
		type: ComponentExposure['type'];
		label?: string;
		allowBindings?: boolean;
	};
	primitive?: BuilderControlPrimitive;
}

export interface BuilderPanelSectionDefinition {
	id: string;
	label: string;
	description?: string;
	fields: BuilderFieldDefinition[];
	tab?: BuilderPanelSectionTab;
}

export interface BuilderStylePropertyDefinition {
	key: string;
	label: string;
	controlType: BuilderFieldType;
	responsive?: boolean;
	stateful?: boolean;
	tokenAware?: boolean;
	placeholder?: string;
	description?: string;
	options?: Array<{ label: string; value: string }>;
	condition?: BuilderControlCondition;
	groupLabel?: string;
	primitive?: BuilderControlPrimitive;
}

interface BuilderSectionDefinitionBase {
	id: string;
	label: string;
	description?: string;
	order: number;
	responsive?: boolean;
	condition?: BuilderControlCondition;
}

export interface BuilderStyleSectionInstance extends BuilderSectionDefinitionBase {
	family: BuilderStyleSectionFamily;
	enabledStates?: BuilderControlState[];
	presentation?: 'panel' | 'popover';
	summaryKeys?: string[];
	controls: BuilderStylePropertyDefinition[];
}

export interface BuilderAdvancedSectionInstance extends BuilderSectionDefinitionBase {
	family: BuilderAdvancedSectionFamily;
	fields?: BuilderFieldDefinition[];
	controls?: BuilderStylePropertyDefinition[];
}

export interface BuilderStyleContract {
	editableTargets: BuilderStyleTarget[];
	supportsBreakpoints: boolean;
	supportsStates: boolean;
	supportsTokens: boolean;
	supportsLogicalProperties: boolean;
	properties: BuilderStylePropertyDefinition[];
}

export interface BuilderSlotDefinition {
	id: string;
	label: string;
	accepts?: string[];
	multiple?: boolean;
}

export interface BuilderElementRuntimeDefinition {
	family: BuilderRuntimeFamily;
	tag?: string;
	acceptsChildren?: boolean;
	supportsInlineEditing?: boolean;
	slots?: BuilderSlotDefinition[];
}

export interface BuilderElementDefinition {
	type: string;
	label: string;
	category: BuilderElementCategory;
	icon?: string;
	propSchema: z.ZodTypeAny;
	styleSchema: z.ZodTypeAny;
	styleContract: BuilderStyleContract;
	defaults: {
		props?: Record<string, JsonValue>;
		layout?: Record<string, JsonValue>;
		styles?: Partial<StyleSet>;
		styleRefs?: string[];
	};
	panelSections: BuilderPanelSectionDefinition[];
	contentSections: BuilderPanelSectionDefinition[];
	styleSections: BuilderStyleSectionInstance[];
	advancedSections: BuilderAdvancedSectionInstance[];
	runtime: BuilderElementRuntimeDefinition;
	legacy?: {
		widgetTypes: string[];
	};
	createDefaultNode: () => BuilderNode;
}

export interface BuilderDocumentTypeDefinition {
	kind: DocumentKind;
	label: string;
	createDefaultDocument?: ( title: string ) => BuilderDocument;
}

export interface BindingProviderContext {
	routeParams?: Record<string, string>;
	query?: URLSearchParams;
	request?: Request;
	loadData?: Record<string, unknown>;
	siteData?: Record<string, unknown>;
	record?: Record<string, unknown>;
	session?: Record<string, unknown>;
	componentProps?: Record<string, unknown>;
	document?: BuilderDocument;
	collections?: Record<string, unknown[]>;
}

export interface BindingProviderDefinition {
	id: string;
	label: string;
	resolve: ( binding: Binding, context: BindingProviderContext ) => unknown;
}

export type BuilderDynamicValueCategory = NonNullable<Binding['category']>;

export interface BuilderDynamicProviderDefinition {
	id: string;
	label: string;
	group: string;
	categories: BuilderDynamicValueCategory[];
	description?: string;
	settingsSchema?: z.ZodTypeAny;
	resolve: ( context: BindingProviderContext, settings?: Record<string, JsonValue>, binding?: Binding ) => unknown;
	preview?: ( context: BindingProviderContext, settings?: Record<string, JsonValue>, binding?: Binding ) => unknown;
}

export interface TemplateConditionContext {
	pathname: string;
	query?: URLSearchParams;
	data?: Record<string, unknown>;
	siteData?: Record<string, unknown>;
	request?: Request;
	session?: Record<string, unknown>;
	record?: Record<string, unknown>;
	document?: BuilderDocument;
}

export interface TemplateConditionDefinition {
	source: ConditionGroup['rules'][ number ][ 'source' ];
	label: string;
	matches: ( rule: ConditionGroup['rules'][ number ], context: TemplateConditionContext ) => boolean;
}

export interface ExperimentDefinition {
	id: string;
	label: string;
	description: string;
	defaultEnabled?: boolean;
}

export interface BuilderHostAdapter {
	id: string;
	label: string;
	resolveBinding: ( binding: Binding, context: BindingProviderContext ) => unknown;
	resolveDynamicProvider?: ( providerId: string, context: BindingProviderContext, settings?: Record<string, JsonValue>, binding?: Binding ) => unknown;
	matchesConditionGroup: ( group: ConditionGroup, context: TemplateConditionContext ) => boolean;
	matchesAssignment: ( assignment: ThemeAssignment, context: TemplateConditionContext ) => boolean;
	resolveCollection: ( source: string, context: BindingProviderContext, query?: Record<string, JsonValue> ) => Array<Record<string, unknown>>;
}

export interface BuilderMediaAssetDefinition {
	id: string;
	url: string;
	alt?: string;
	title?: string;
	caption?: string;
	mimeType?: string;
	size?: number;
	width?: number;
	height?: number;
	createdAt?: string;
	source?: 'upload' | 'external' | 'generated' | 'host';
	meta?: Record<string, JsonValue>;
}

export interface BuilderHostMediaAdapter {
	listAssets?: () => Promise<BuilderMediaAssetDefinition[]>;
	uploadAsset?: ( file: File, options?: Record<string, JsonValue> ) => Promise<BuilderMediaAssetDefinition>;
	deleteAsset?: ( assetId: string ) => Promise<void>;
	updateAsset?: ( assetId: string, patch: Partial<BuilderMediaAssetDefinition> ) => Promise<BuilderMediaAssetDefinition>;
	resolveAssetUrl?: ( asset: string | BuilderMediaAssetDefinition, context?: BindingProviderContext ) => string | undefined;
}

export interface BuilderHostPersistenceAdapter<Project = unknown> {
	loadProject?: ( projectId: string ) => Promise<Project>;
	saveAutosave?: ( project: Project, context?: Record<string, JsonValue> ) => Promise<unknown>;
	saveDraft?: ( project: Project, context?: Record<string, JsonValue> ) => Promise<unknown>;
	publish?: ( project: Project, context?: Record<string, JsonValue> ) => Promise<unknown>;
	restoreRevision?: ( revisionId: string, context?: Record<string, JsonValue> ) => Promise<Project>;
	listRevisions?: ( context?: Record<string, JsonValue> ) => Promise<unknown[]>;
	getSaveStatus?: ( context?: Record<string, JsonValue> ) => Promise<unknown>;
}

export interface BuilderHostAiSettingsAdapter<Settings = unknown> {
	loadSettings: () => Promise<Partial<Settings> | undefined>;
	saveSettings: ( settings: Settings ) => Promise<void>;
}

export type BuilderHostPermissionKey =
	| 'editProject'
	| 'publish'
	| 'uploadMedia'
	| 'deleteMedia'
	| 'useAi'
	| 'accessDynamicData';

export interface BuilderHostPermissionResult {
	allowed: boolean;
	reason?: string;
}

export type BuilderHostPermissionValue = boolean | string | BuilderHostPermissionResult;

export type BuilderHostPermissionAdapter =
	Partial<Record<BuilderHostPermissionKey, BuilderHostPermissionValue>>
	| ( ( permission: BuilderHostPermissionKey ) => BuilderHostPermissionValue | undefined );

export interface BuilderRoutePreviewContextAdapter {
	getBindingContext?: () => BindingProviderContext | Promise<BindingProviderContext>;
	getConditionContext?: () => Partial<TemplateConditionContext> | Promise<Partial<TemplateConditionContext>>;
	resolveDocumentId?: ( context: BindingProviderContext ) => string | undefined | Promise<string | undefined>;
}

export interface BuilderHostExtensionDefinition {
	adapter?: BuilderHostAdapter;
	elements?: BuilderElementDefinition[];
	dynamicProviders?: BuilderDynamicProviderDefinition[];
	persistence?: BuilderHostPersistenceAdapter;
	media?: BuilderHostMediaAdapter;
	aiSettings?: BuilderHostAiSettingsAdapter;
	permissions?: BuilderHostPermissionAdapter;
	routePreview?: BuilderRoutePreviewContextAdapter;
}

export interface BuilderRegistry {
	elements: Map<string, BuilderElementDefinition>;
	documentTypes: Map<DocumentKind, BuilderDocumentTypeDefinition>;
	bindingProviders: Map<string, BindingProviderDefinition>;
	dynamicProviders: Map<string, BuilderDynamicProviderDefinition>;
	templateConditions: Map<ConditionGroup['rules'][ number ][ 'source' ], TemplateConditionDefinition>;
	experiments: Map<string, ExperimentDefinition>;
	registerElement: ( definition: BuilderElementDefinition ) => BuilderRegistry;
	registerDocumentType: ( definition: BuilderDocumentTypeDefinition ) => BuilderRegistry;
	registerBindingProvider: ( definition: BindingProviderDefinition ) => BuilderRegistry;
	registerDynamicProvider: ( definition: BuilderDynamicProviderDefinition ) => BuilderRegistry;
	registerTemplateCondition: ( definition: TemplateConditionDefinition ) => BuilderRegistry;
	registerExperiment: ( definition: ExperimentDefinition ) => BuilderRegistry;
	createBuilderHostAdapter: ( definition: BuilderHostAdapter ) => BuilderHostAdapter;
	createElementNode: ( type: string, overrides?: Partial<BuilderNode> ) => BuilderNode;
}

export interface BuilderElementDefinitionOverrides {
	propSchema?: z.ZodTypeAny;
	styleSchema?: z.ZodTypeAny;
	styleContract?: BuilderStyleContract;
	contentSections?: BuilderPanelSectionDefinition[];
	styleSections?: BuilderStyleSectionInstance[];
	advancedSections?: BuilderAdvancedSectionInstance[];
}

export function createBuilderRegistry(): BuilderRegistry {
	const registry: BuilderRegistry = {
		elements: new Map(),
		documentTypes: new Map(),
		bindingProviders: new Map(),
		dynamicProviders: new Map(),
		templateConditions: new Map(),
		experiments: new Map(),
		registerElement( definition ) {
			registry.elements.set( definition.type, definition );
			return registry;
		},
		registerDocumentType( definition ) {
			registry.documentTypes.set( definition.kind, definition );
			return registry;
		},
		registerBindingProvider( definition ) {
			registry.bindingProviders.set( definition.id, definition );
			return registry;
		},
		registerDynamicProvider( definition ) {
			registry.dynamicProviders.set( definition.id, definition );
			return registry;
		},
		registerTemplateCondition( definition ) {
			registry.templateConditions.set( definition.source, definition );
			return registry;
		},
		registerExperiment( definition ) {
			registry.experiments.set( definition.id, definition );
			return registry;
		},
		createBuilderHostAdapter( definition ) {
			return definition;
		},
		createElementNode( type, overrides = {} ) {
			const definition = registry.elements.get( type );
			if ( !definition ) {
				throw new Error( `Unknown element type "${ type }".` );
			}

			return createNode( {
				...definition.createDefaultNode(),
				...overrides,
			} );
		},
	};

	return registry;
}

export function createBuilderHostAdapter( definition: BuilderHostAdapter ): BuilderHostAdapter {
	return definition;
}

export function applyBuilderHostExtension( registry: BuilderRegistry, extension: BuilderHostExtensionDefinition = {} ): BuilderRegistry {
	for ( const element of extension.elements ?? [] ) {
		registry.registerElement( element );
	}
	for ( const provider of extension.dynamicProviders ?? [] ) {
		registry.registerDynamicProvider( provider );
	}
	return registry;
}

export function createDefaultBuilderRegistry(): BuilderRegistry {
	const registry = createBuilderRegistry();

	for ( const element of createDefaultElements() ) {
		registry.registerElement( element );
	}

	for ( const documentType of createDefaultDocumentTypes() ) {
		registry.registerDocumentType( documentType );
	}

	for ( const provider of createDefaultBindingProviders() ) {
		registry.registerBindingProvider( provider );
	}

	for ( const provider of createDefaultDynamicProviders() ) {
		registry.registerDynamicProvider( provider );
	}

	for ( const condition of createDefaultConditionDefinitions() ) {
		registry.registerTemplateCondition( condition );
	}

	registry
		.registerExperiment( {
			id: 'atomic-grid',
			label: 'Atomic Grid',
			description: 'Enable grid-capable layout primitives and assignment-driven composition.',
			defaultEnabled: true,
		} )
		.registerExperiment( {
			id: 'legacy-two-track',
			label: 'Legacy Two Track',
			description: 'Keep editable compatibility widgets active beside native atomic elements.',
			defaultEnabled: true,
		} );

	return registry;
}

function createDefaultDocumentTypes(): BuilderDocumentTypeDefinition[] {
	const kinds: DocumentKind[] = [
		'page',
		'layout',
		'template',
		'component',
		'popup',
		'kit',
		'library-item',
	];

	return kinds.map( ( kind ) => ( {
		kind,
		label: sentenceCase( kind ),
		createDefaultDocument: ( title ) => createDocument( kind, title ),
	} ) );
}

function createDefaultElements(): BuilderElementDefinition[] {
	return [
		createElementDefinition( 'container', 'Container', 'layout', 'container', {
			layout: { display: 'flex', direction: 'column', gap: '1rem', width: '100%' },
			styles: { base: { minHeight: '40px', padding: '20px' } },
		}, [ ...createContainerPanelSections() ], {}, [], { contentSections: createContainerContentSections() } ),
		createElementDefinition( 'grid-container', 'Grid Container', 'layout', 'container', {
			layout: { display: 'grid', columns: 2, gap: '1rem', width: '100%' },
			styles: { base: { padding: '20px' } },
		}, [ ...createGridContainerPanelSections() ], {}, [], { contentSections: createContainerContentSections() } ),
		(() => {
			const parity = createHeadingParityMetadata();
			return createElementDefinition( 'heading', 'Heading', 'content', 'text', {
				props: { text: 'Heading', level: 'h2', align: 'left' },
			}, [
				sectionField( 'content', 'Content', [
					textField( 'text', 'Text', 'props.text', {
						description: 'Primary heading copy shown in the component or page.',
						componentExposure: { supported: true, type: 'text', label: 'Heading text', allowBindings: true },
					} ),
					selectField( 'level', 'Level', 'props.level', [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ] ),
					selectField( 'align', 'Alignment', 'props.align', [ 'left', 'center', 'right', 'justify' ] ),
				] ),
				...parity.advancedSections,
			], { supportsInlineEditing: true, tag: 'h2' }, [], { propSchema: headingPropSchema, styleContract: parity.styleContract } );
		} )(),
		(() => {
			const parity = createParagraphParityMetadata();
			return createElementDefinition( 'paragraph', 'Paragraph', 'content', 'text', {
				props: { text: 'Paragraph copy', align: 'left' },
			}, [
				sectionField( 'content', 'Content', [
					richTextField( 'text', 'Text', 'props.text', {
						description: 'Rich text copy with inline formatting support.',
						componentExposure: { supported: true, type: 'richText', label: 'Paragraph text', allowBindings: true },
					} ),
					selectField( 'align', 'Alignment', 'props.align', [ 'left', 'center', 'right', 'justify' ] ),
				] ),
				...parity.advancedSections,
			], { supportsInlineEditing: true, tag: 'p' }, [], { propSchema: paragraphPropSchema, styleContract: parity.styleContract } );
		} )(),
		(() => {
			const parity = createTextEditorParityMetadata();
			return createElementDefinition( 'text-editor', 'Text Editor', 'content', 'text', {
				props: { text: 'Editable text' },
			}, [
				sectionField( 'content', 'Content', [
					richTextField( 'text', 'Text', 'props.text', {
						description: 'Long-form rich text content.',
						componentExposure: { supported: true, type: 'richText', label: 'Rich text', allowBindings: true },
					} ),
				] ),
				...parity.advancedSections,
			], { supportsInlineEditing: true, tag: 'div' }, [ 'text-editor', 'text' ], { styleContract: parity.styleContract } );
		} )(),
		createElementDefinition( 'blockquote', 'Blockquote', 'content', 'text', {
			props: { text: 'Quote text', cite: 'Author' },
		}, [ sectionField( 'content', 'Content', [
			richTextField( 'text', 'Quote', 'props.text', {
				componentExposure: { supported: true, type: 'richText', label: 'Quote text', allowBindings: true },
			} ),
			textField( 'cite', 'Cite', 'props.cite', {
				componentExposure: { supported: true, type: 'text', label: 'Quote cite', allowBindings: true },
			} ),
		] ) ], { supportsInlineEditing: true, tag: 'blockquote' } ),
		createElementDefinition( 'spacer', 'Spacer', 'layout', 'container', {
			layout: { display: 'block' },
			styles: { base: { minHeight: '2rem' } },
		}, [ sectionField( 'layout', 'Layout', [ textField( 'height', 'Height', 'styles.base.minHeight' ) ] ) ] ),
		(() => {
			const parity = createImageParityMetadata();
			return createElementDefinition( 'image', 'Image', 'media', 'image', {
				props: { src: 'https://placehold.co/960x540', alt: 'Placeholder image', fit: 'cover' },
			}, [
				sectionField( 'content', 'Content', [
					imageField( 'src', 'Source', 'props.src', {
						description: 'Image URL or uploaded asset path.',
						placeholder: 'https://â€¦',
						componentExposure: { supported: true, type: 'image', label: 'Image source', allowBindings: true },
					} ),
					textField( 'alt', 'Alt', 'props.alt', {
						componentExposure: { supported: true, type: 'text', label: 'Image alt text', allowBindings: true },
					} ),
					selectField( 'fit', 'Fit', 'props.fit', [ 'cover', 'contain', 'fill', 'scale-down' ] ),
				] ),
				...parity.advancedSections,
			], {}, [], { propSchema: imagePropSchema, styleContract: parity.styleContract } );
		} )(),
		(() => {
			const parity = createButtonParityMetadata();
			return createElementDefinition( 'button', 'Button', 'interactive', 'button', {
				props: { text: 'Button', href: '#', variant: 'solid', size: 'md', iconPosition: 'start' },
			}, [
				sectionField( 'content', 'Content', [
					textField( 'text', 'Text', 'props.text', {
						componentExposure: { supported: true, type: 'text', label: 'Button text', allowBindings: true },
					} ),
					urlField( 'href', 'Link', 'props.href', {
						placeholder: '/contact',
						componentExposure: { supported: true, type: 'link', label: 'Button link', allowBindings: true },
					} ),
					selectField( 'variant', 'Variant', 'props.variant', [ 'solid', 'outline', 'ghost' ] ),
					selectField( 'size', 'Size', 'props.size', [ 'sm', 'md', 'lg' ] ),
				] ),
				...parity.advancedSections,
			], {}, [], { propSchema: buttonPropSchema, styleContract: parity.styleContract } );
		} )(),
		createElementDefinition( 'divider', 'Divider', 'content', 'divider', {}, [] ),
		createElementDefinition( 'video', 'Video', 'media', 'video', {
			props: { src: '', title: 'Video' },
		}, [ sectionField( 'content', 'Content', [ {
			id: 'src',
			label: 'Source',
			path: 'props.src',
			type: 'image',
			placeholder: 'https://example.com/video.mp4',
			primitive: createMediaPrimitive( {
				assetType: 'video',
				placeholder: 'https://example.com/video.mp4',
			} ),
		} ] ) ] ),
		createElementDefinition( 'html', 'HTML', 'content', 'html', {
			props: { markup: '<div>Custom HTML</div>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ) ] ),
		createElementDefinition( 'shortcode', 'Shortcode', 'content', 'html', {
			props: { markup: '<div>[shortcode]</div>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ) ] ),
		createElementDefinition( 'svg', 'SVG', 'media', 'html', {
			props: { markup: '<svg viewBox="0 0 100 100"></svg>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ) ] ),
		createElementDefinition( 'icon', 'Icon', 'content', 'icon', {
			props: { symbol: 'star', label: 'Icon' },
		}, [ sectionField( 'content', 'Content', [ textField( 'symbol', 'Symbol', 'props.symbol' ) ] ) ] ),
		createElementDefinition( 'icon-box', 'Icon Box', 'content', 'icon-box', {
			props: { title: 'Icon Box', text: 'Supporting copy', symbol: 'spark', iconPosition: 'top' },
		}, [
			sectionField( 'content', 'Content', [
			textField( 'title', 'Title', 'props.title', {
				componentExposure: { supported: true, type: 'text', label: 'Icon box title', allowBindings: true },
			} ),
			richTextField( 'text', 'Copy', 'props.text', {
				componentExposure: { supported: true, type: 'richText', label: 'Icon box copy', allowBindings: true },
			} ),
			textField( 'symbol', 'Symbol', 'props.symbol' ),
			selectField( 'iconPosition', 'Icon Position', 'props.iconPosition', [ 'top', 'left', 'right' ] ),
			urlField( 'link', 'Link', 'props.link', {
				placeholder: '/learn-more',
				componentExposure: { supported: true, type: 'link', label: 'Icon box link', allowBindings: true },
			} ),
		] ),
			...createIconBoxPanelSections(),
		], {}, [], { propSchema: iconBoxPropSchema, styleContract: createInteractiveStyleContract() } ),
		createElementDefinition( 'social-icons', 'Social Icons', 'interactive', 'menu', {
			props: { items: [ { label: 'X', href: '#' }, { label: 'Instagram', href: '#' } ] },
		}, [ sectionField( 'content', 'Content', [
			jsonField( 'items', 'Items', 'props.items', {
				description: 'Editable social link items rendered by the runtime family.',
				placeholder: "[\n  { \"label\": \"X\", \"href\": \"https://x.com\" }\n]",
			} ),
		] ) ], {}, [], { propSchema: socialIconsPropSchema, styleContract: createMenuStyleContract() } ),
		createElementDefinition( 'list', 'List', 'content', 'list', {
			props: { items: [ 'First item', 'Second item' ] },
		}, [ sectionField( 'content', 'Content', [ jsonField( 'items', 'Items', 'props.items' ) ] ) ] ),
		createElementDefinition( 'toggle', 'Toggle', 'interactive', 'accordion', {
			props: { items: [ { title: 'Toggle Item', body: 'Toggle content' } ] },
		}, [
			sectionField( 'content', 'Content', [
			jsonField( 'items', 'Items', 'props.items', {
				description: 'Each item becomes a toggle title and body pair.',
				placeholder: "[\n  { \"title\": \"Toggle Item\", \"body\": \"Toggle content\" }\n]",
			} ),
		] ),
			...createTogglePanelSections(),
		], {}, [], { propSchema: accordionPropSchema, styleContract: createInteractiveStyleContract() } ),
		createElementDefinition( 'tabs', 'Tabs', 'interactive', 'tabs', {
			props: { activeTab: 0, tabPosition: 'top', equalHeight: false, items: [ { label: 'Tab 1', content: 'Panel 1' }, { label: 'Tab 2', content: 'Panel 2' } ] },
		}, [
			sectionField( 'content', 'Content', [
			numberField( 'activeTab', 'Active Tab', 'props.activeTab', {
				description: 'Zero-based tab index used for preview and default open state.',
			} ),
			selectField( 'tabPosition', 'Tab Position', 'props.tabPosition', [ 'top', 'left', 'right', 'bottom' ] ),
			jsonField( 'items', 'Items', 'props.items', {
				description: 'Fallback tab items used when trigger/panel slots are empty.',
				placeholder: "[\n  { \"label\": \"Tab 1\", \"content\": \"Panel 1\" }\n]",
			} ),
		] ),
			...createTabsPanelSections(),
		], { slots: [ { id: 'triggers', label: 'Triggers', multiple: true }, { id: 'panels', label: 'Panels', multiple: true } ] }, [], { propSchema: tabsPropSchema, styleContract: createInteractiveStyleContract() } ),
		createElementDefinition( 'accordion', 'Accordion', 'interactive', 'accordion', {
			props: { items: [ { title: 'Item', body: 'Accordion body', open: false } ], multipleOpen: false, activeIndex: 0, animation: 'slide' },
		}, [
			sectionField( 'content', 'Content', [
			jsonField( 'items', 'Items', 'props.items', {
				description: 'Accordion title/body items used for fallback rendering.',
				placeholder: "[\n  { \"title\": \"Item\", \"body\": \"Accordion body\", \"open\": false }\n]",
			} ),
			toggleField( 'multipleOpen', 'Multiple Open', 'props.multipleOpen' ),
			selectField( 'animation', 'Animation', 'props.animation', [ 'slide', 'fade', 'none' ] ),
		] ),
			...createAccordionPanelSections(),
		], {}, [], { propSchema: accordionPropSchema, styleContract: createInteractiveStyleContract() } ),
		createElementDefinition( 'menu', 'Menu', 'interactive', 'menu', {
			props: { items: [ { label: 'Home', href: '/' }, { label: 'About', href: '/about' } ], orientation: 'horizontal', alignment: 'left' },
		}, [
			sectionField( 'content', 'Content', [
			jsonField( 'items', 'Items', 'props.items', {
				description: 'Link items with label, href, target, and optional icon.',
				placeholder: "[\n  { \"label\": \"Home\", \"href\": \"/\" }\n]",
			} ),
			selectField( 'orientation', 'Orientation', 'props.orientation', [ 'horizontal', 'vertical' ] ),
			selectField( 'alignment', 'Alignment', 'props.alignment', [ 'left', 'center', 'right', 'space-between' ] ),
		] ),
			...createMenuPanelSections(),
		], {}, [], { propSchema: menuPropSchema, styleContract: createMenuStyleContract() } ),
		createElementDefinition( 'gallery', 'Gallery', 'media', 'gallery', {
			props: { images: [ 'https://placehold.co/600x400', 'https://placehold.co/600x401' ] },
		}, [
			sectionField( 'content', 'Content', [
			jsonField( 'images', 'Images', 'props.images', {
				description: 'Ordered gallery image sources or asset objects.',
				placeholder: "[\n  \"https://placehold.co/600x400\",\n  \"https://placehold.co/600x401\"\n]",
			} ),
		] ),
			...createGalleryPanelSections(),
		], {}, [], { propSchema: galleryPropSchema, styleContract: createMediaStyleContract() } ),
		createElementDefinition( 'carousel', 'Carousel', 'interactive', 'carousel', {
			props: { slides: [ { title: 'Slide 1' }, { title: 'Slide 2' } ] },
		}, [
			sectionField( 'content', 'Content', [
			jsonField( 'slides', 'Slides', 'props.slides', {
				description: 'Ordered slide objects rendered by the carousel family.',
				placeholder: "[\n  { \"title\": \"Slide 1\" },\n  { \"title\": \"Slide 2\" }\n]",
			} ),
		] ),
			...createCarouselPanelSections(),
		], {}, [], { propSchema: carouselPropSchema, styleContract: createInteractiveStyleContract() } ),
		createElementDefinition( 'form', 'Form', 'form', 'form', {
			props: { submitLabel: 'Submit', method: 'post', action: '', fields: [] },
		}, [ sectionField( 'content', 'Content', [
			textField( 'submitLabel', 'Submit Label', 'props.submitLabel', {
				componentExposure: { supported: true, type: 'text', label: 'Form submit label', allowBindings: true },
			} ),
			textField( 'action', 'Action', 'props.action', {
				placeholder: '/api/contact',
			} ),
			selectField( 'method', 'Method', 'props.method', [ 'get', 'post' ] ),
			jsonField( 'fields', 'Fields', 'props.fields', {
				description: 'Fallback field schema used when field child nodes are absent.',
				placeholder: "[\n  { \"type\": \"text\", \"label\": \"Name\", \"name\": \"name\" }\n]",
			} ),
		] ), ...createFormParityPanelSections() ], { acceptsChildren: true }, [], { propSchema: formPropSchema, styleContract: createFormStyleContract() } ),
		createElementDefinition( 'form-field-text', 'Form Text Field', 'form', 'html', {
			props: { markup: '<label class="builder-form-field"><span>Name</span><input type="text" name="name" placeholder="Name" /></label>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-text', 'text-field' ] ),
		createElementDefinition( 'form-field-email', 'Form Email Field', 'form', 'html', {
			props: { markup: '<label class="builder-form-field"><span>Email</span><input type="email" name="email" placeholder="name@example.com" /></label>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-email', 'email-field' ] ),
		createElementDefinition( 'form-field-textarea', 'Form Textarea Field', 'form', 'html', {
			props: { markup: '<label class="builder-form-field"><span>Message</span><textarea name="message" rows="5" placeholder="Message"></textarea></label>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-textarea', 'textarea-field' ] ),
		createElementDefinition( 'form-field-select', 'Form Select Field', 'form', 'html', {
			props: { markup: '<label class="builder-form-field"><span>Choice</span><select name="choice"><option>One</option><option>Two</option></select></label>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-select', 'select-field' ] ),
		createElementDefinition( 'form-field-checkbox', 'Form Checkbox Field', 'form', 'html', {
			props: { markup: '<label class="builder-form-field builder-form-field--checkbox"><input type="checkbox" name="consent" /><span>Consent</span></label>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-checkbox', 'checkbox-field', 'acceptance' ] ),
		createElementDefinition( 'form-field-radio', 'Form Radio Field', 'form', 'html', {
			props: { markup: '<fieldset class="builder-form-field builder-form-field--radio"><legend>Choice</legend><label><input type="radio" name="choice" value="one" /> One</label><label><input type="radio" name="choice" value="two" /> Two</label></fieldset>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-radio', 'radio-field' ] ),
		createElementDefinition( 'form-field-hidden', 'Form Hidden Field', 'form', 'html', {
			props: { markup: '<input type="hidden" name="hidden" value="" />' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ), ...createFormFieldParityPanelSections() ], {}, [ 'field-hidden', 'hidden-field' ] ),
		createElementDefinition( 'form-submit', 'Form Submit', 'form', 'html', {
			props: { markup: '<button type="submit">Submit</button>' },
		}, [ sectionField( 'content', 'Content', [ textareaField( 'markup', 'Markup', 'props.markup' ) ] ) ], {}, [ 'field-submit', 'submit-field' ] ),
		createElementDefinition( 'loop', 'Loop', 'data', 'loop', {
			props: { collection: 'posts', limit: 3, emptyText: 'No content found', query: {}, pagination: false },
		}, [ sectionField( 'data', 'Data', [
			textField( 'collection', 'Collection', 'props.collection', {
				description: 'Collection key resolved by the active adapter.',
			} ),
			numberField( 'limit', 'Limit', 'props.limit' ),
			textField( 'emptyText', 'Empty Text', 'props.emptyText' ),
			jsonField( 'query', 'Query', 'props.query', {
				description: 'Query arguments forwarded to the collection resolver.',
				placeholder: "{\n  \"category\": \"featured\"\n}",
			} ),
			toggleField( 'pagination', 'Pagination', 'props.pagination' ),
		] ), ...createLoopParityPanelSections() ], { slots: [ { id: 'item', label: 'Item Template', multiple: true }, { id: 'empty', label: 'Empty State', multiple: true } ] }, [], { propSchema: loopPropSchema, styleContract: createLoopStyleContract() } ),
		createElementDefinition( 'popup-root', 'Popup Root', 'interactive', 'popup', {
			props: { title: 'Announcement', width: '720px', closeOnOverlay: true, closeOnEsc: true, showCloseButton: true },
		}, [ sectionField( 'settings', 'Settings', [
			textField( 'title', 'Title', 'props.title', {
				componentExposure: { supported: true, type: 'text', label: 'Popup title', allowBindings: true },
			} ),
			textField( 'width', 'Width', 'props.width', {
				placeholder: '720px',
			} ),
			toggleField( 'closeOnOverlay', 'Close on Overlay', 'props.closeOnOverlay' ),
			toggleField( 'closeOnEsc', 'Close on Esc', 'props.closeOnEsc' ),
			toggleField( 'showCloseButton', 'Show Close Button', 'props.showCloseButton' ),
		] ), ...createPopupRootParityPanelSections() ], { acceptsChildren: true }, [], { propSchema: popupRootPropSchema, styleContract: createPopupStyleContract() } ),
		createElementDefinition( 'compat-widget', 'Compatibility Widget', 'legacy', 'compat', {
			props: { widgetType: 'legacy', title: 'Legacy widget', rawSettings: {}, editable: true },
		}, [ sectionField( 'legacy', 'Legacy', [ textField( 'title', 'Title', 'props.title' ), textField( 'widgetType', 'Widget Type', 'legacy.widgetType' ), jsonField( 'settings', 'Settings', 'legacy.rawSettings' ) ] ), ...createCompatParityPanelSections() ], { acceptsChildren: true }, [ 'heading', 'text-editor', 'image', 'button', 'video', 'html' ], { propSchema: compatWidgetPropSchema, styleContract: createCompatStyleContract() } ),
	];
}

function createDefaultBindingProviders(): BindingProviderDefinition[] {
	return [
		{ id: 'route', label: 'Route Params', resolve: ( binding, context ) => getByPath( context.routeParams ?? {}, binding.path ) ?? binding.fallback },
		{ id: 'load', label: 'Load Data', resolve: ( binding, context ) => getByPath( context.loadData ?? {}, binding.path ) ?? binding.fallback },
		{ id: 'site', label: 'Site Data', resolve: ( binding, context ) => getByPath( context.siteData ?? {}, binding.path ) ?? binding.fallback },
		{ id: 'query', label: 'Query Params', resolve: ( binding, context ) => context.query?.get( binding.path ) ?? binding.fallback },
		{ id: 'request', label: 'Request', resolve: ( binding, context ) => context.request ? getByPath( requestToObject( context.request ), binding.path ) ?? binding.fallback : binding.fallback },
		{ id: 'collection', label: 'Collection Record', resolve: ( binding, context ) => getByPath( context.record ?? {}, binding.path ) ?? binding.fallback },
		{ id: 'session', label: 'Session', resolve: ( binding, context ) => getByPath( context.session ?? {}, binding.path ) ?? binding.fallback },
		{ id: 'component-prop', label: 'Component Prop', resolve: ( binding, context ) => getByPath( context.componentProps ?? {}, binding.path ) ?? binding.fallback },
		{ id: 'document', label: 'Document', resolve: ( binding, context ) => context.document ? getByPath( context.document as unknown as Record<string, unknown>, binding.path ) ?? binding.fallback : binding.fallback },
		{ id: 'dynamic', label: 'Dynamic Tag', resolve: ( binding ) => binding.fallback },
	];
}

function createDefaultDynamicProviders(): BuilderDynamicProviderDefinition[] {
	const provider = (
		id: string,
		label: string,
		group: string,
		categories: BuilderDynamicValueCategory[],
		resolve: BuilderDynamicProviderDefinition['resolve'],
		description?: string,
	): BuilderDynamicProviderDefinition => ( { id, label, group, categories, resolve, preview: resolve, description } );
	const readPath = ( source: keyof BindingProviderContext, fallbackPath: string ) =>
		( context: BindingProviderContext, settings: Record<string, JsonValue> = {} ) =>
			getByPath( context[ source ] ?? {}, stringSetting( settings.path ) ?? fallbackPath );
	const readRecord = ( fallbackPath: string ) =>
		( context: BindingProviderContext, settings: Record<string, JsonValue> = {} ) =>
			getByPath( context.record ?? context.loadData ?? {}, stringSetting( settings.path ) ?? fallbackPath );

	return [
		provider( 'post-title', 'Post Title', 'Content', [ 'text', 'richText' ], readRecord( 'title' ) ),
		provider( 'post-excerpt', 'Post Excerpt', 'Content', [ 'text', 'richText' ], readRecord( 'excerpt' ) ),
		provider( 'post-content', 'Post Content', 'Content', [ 'richText', 'text' ], readRecord( 'content' ) ),
		provider( 'post-id', 'Post ID', 'Content', [ 'number', 'text' ], readRecord( 'id' ) ),
		provider( 'post-date', 'Post Date', 'Content', [ 'text' ], readRecord( 'date' ) ),
		provider( 'post-time', 'Post Time', 'Content', [ 'text' ], readRecord( 'time' ) ),
		provider( 'post-url', 'Post URL', 'Content', [ 'url', 'text' ], readRecord( 'url' ) ),
		provider( 'post-terms', 'Post Terms', 'Content', [ 'text', 'object' ], readRecord( 'terms' ) ),
		provider( 'post-custom-field', 'Post Custom Field', 'Content', [ 'text', 'richText', 'url', 'color', 'image', 'media', 'number', 'object', 'postMeta' ], ( context, settings = {} ) => getByPath( context.record ?? context.loadData ?? {}, stringSetting( settings.key ) ?? stringSetting( settings.path ) ?? '' ) ),
		provider( 'archive-title', 'Archive Title', 'Archive', [ 'text' ], readPath( 'loadData', 'archive.title' ) ),
		provider( 'archive-description', 'Archive Description', 'Archive', [ 'text', 'richText' ], readPath( 'loadData', 'archive.description' ) ),
		provider( 'archive-url', 'Archive URL', 'Archive', [ 'url', 'text' ], readPath( 'loadData', 'archive.url' ) ),
		provider( 'archive-meta', 'Archive Meta', 'Archive', [ 'text', 'object', 'postMeta' ], readPath( 'loadData', 'archive.meta' ) ),
		provider( 'site-title', 'Site Title', 'Site', [ 'text' ], readPath( 'siteData', 'title' ) ),
		provider( 'site-tagline', 'Site Tagline', 'Site', [ 'text' ], readPath( 'siteData', 'tagline' ) ),
		provider( 'site-url', 'Site URL', 'Site', [ 'url', 'text' ], readPath( 'siteData', 'url' ) ),
		provider( 'page-title', 'Page Title', 'Site', [ 'text' ], ( context ) => context.document?.title ?? getByPath( context.loadData ?? {}, 'page.title' ) ),
		provider( 'current-date-time', 'Current Date Time', 'Site', [ 'text' ], ( _context, settings = {} ) => new Date().toLocaleString( stringSetting( settings.locale ) || undefined ) ),
		provider( 'request-parameter', 'Request Parameter', 'Site', [ 'text', 'url', 'number' ], ( context, settings = {} ) => {
			const key = stringSetting( settings.key ) ?? stringSetting( settings.path ) ?? '';
			return context.query?.get( key ) ?? ( context.request ? getByPath( requestToObject( context.request ), key ) : undefined );
		} ),
		provider( 'user-info', 'User Info', 'User', [ 'text', 'url', 'number', 'object' ], readPath( 'session', 'user.name' ) ),
		provider( 'author-name', 'Author Name', 'Author', [ 'text' ], readRecord( 'author.name' ) ),
		provider( 'author-url', 'Author URL', 'Author', [ 'url', 'text' ], readRecord( 'author.url' ) ),
		provider( 'author-info', 'Author Info', 'Author', [ 'text', 'url', 'object' ], readRecord( 'author' ) ),
		provider( 'comments-number', 'Comments Number', 'Comments', [ 'number', 'text' ], readRecord( 'comments.count' ) ),
		provider( 'comments-url', 'Comments URL', 'Comments', [ 'url', 'text' ], readRecord( 'comments.url' ) ),
		provider( 'featured-image', 'Featured Image', 'Media', [ 'image', 'media', 'url' ], readRecord( 'featuredImage' ) ),
		provider( 'featured-image-data', 'Featured Image Data', 'Media', [ 'text', 'url', 'image', 'media' ], ( context, settings = {} ) => getByPath( getByPath( context.record ?? context.loadData ?? {}, 'featuredImage' ) ?? {}, stringSetting( settings.path ) ?? 'src' ) ),
		provider( 'product-title', 'Product Title', 'Commerce', [ 'text' ], readRecord( 'product.title' ) ),
		provider( 'product-price', 'Product Price', 'Commerce', [ 'text', 'number' ], readRecord( 'product.price' ) ),
		provider( 'product-rating', 'Product Rating', 'Commerce', [ 'text', 'number' ], readRecord( 'product.rating' ) ),
		provider( 'product-sale', 'Product Sale', 'Commerce', [ 'boolean', 'text' ], readRecord( 'product.sale' ) ),
		provider( 'product-short-description', 'Product Short Description', 'Commerce', [ 'text', 'richText' ], readRecord( 'product.shortDescription' ) ),
		provider( 'product-sku', 'Product SKU', 'Commerce', [ 'text' ], readRecord( 'product.sku' ) ),
		provider( 'product-stock', 'Product Stock', 'Commerce', [ 'number', 'text' ], readRecord( 'product.stock' ) ),
		provider( 'product-terms', 'Product Terms', 'Commerce', [ 'text', 'object' ], readRecord( 'product.terms' ) ),
		provider( 'product-image', 'Product Image', 'Commerce', [ 'image', 'media', 'url' ], readRecord( 'product.image' ) ),
		provider( 'custom-path', 'Custom Path', 'Generic', [ 'text', 'richText', 'url', 'color', 'image', 'media', 'gallery', 'number', 'boolean', 'object', 'postMeta' ], ( context, settings = {} ) => getByPath( context.record ?? context.loadData ?? context.siteData ?? {}, stringSetting( settings.path ) ?? '' ) ),
		provider( 'host-function', 'Host Function', 'Generic', [ 'text', 'richText', 'url', 'color', 'image', 'media', 'gallery', 'number', 'boolean', 'object' ], ( context, settings = {} ) => getByPath( context.loadData ?? {}, `dynamic.${ stringSetting( settings.key ) ?? stringSetting( settings.path ) ?? '' }` ) ),
		provider( 'shortcode', 'Shortcode', 'Generic', [ 'text', 'richText' ], ( context, settings = {} ) => getByPath( context.loadData ?? {}, `shortcodes.${ stringSetting( settings.key ) ?? stringSetting( settings.shortcode ) ?? '' }` ), 'Host-resolved shortcode-like output; no browser code is executed.' ),
	];
}

function createDefaultConditionDefinitions(): TemplateConditionDefinition[] {
	const sources: TemplateConditionDefinition['source'][] = [
		'route',
		'query',
		'site',
		'request',
		'load',
		'collection',
		'session',
		'document',
	];

	return sources.map( ( source ) => ( {
		source,
		label: sentenceCase( source ),
		matches: ( rule, context ) => matchCondition( rule, context ),
	} ) );
}

const alignmentOptions = [
	{ label: 'Left', value: 'left' },
	{ label: 'Center', value: 'center' },
	{ label: 'Right', value: 'right' },
	{ label: 'Justify', value: 'justify' },
];

const orientationOptions = [
	{ label: 'Horizontal', value: 'horizontal' },
	{ label: 'Vertical', value: 'vertical' },
];

const variantOptions = [
	{ label: 'Solid', value: 'solid' },
	{ label: 'Outline', value: 'outline' },
	{ label: 'Ghost', value: 'ghost' },
];

const sizeOptions = [
	{ label: 'Small', value: 'sm' },
	{ label: 'Medium', value: 'md' },
	{ label: 'Large', value: 'lg' },
];

const objectFitOptions = [
	{ label: 'Cover', value: 'cover' },
	{ label: 'Contain', value: 'contain' },
	{ label: 'Fill', value: 'fill' },
	{ label: 'Scale Down', value: 'scale-down' },
];

const fontWeightOptions = [
	{ label: 'Thin (100)', value: '100' },
	{ label: 'Extra Light (200)', value: '200' },
	{ label: 'Light (300)', value: '300' },
	{ label: 'Regular (400)', value: '400' },
	{ label: 'Medium (500)', value: '500' },
	{ label: 'Semi Bold (600)', value: '600' },
	{ label: 'Bold (700)', value: '700' },
	{ label: 'Extra Bold (800)', value: '800' },
	{ label: 'Black (900)', value: '900' },
];

function createStyleContract(
	properties: BuilderStylePropertyDefinition[],
	overrides: Partial<BuilderStyleContract> = {},
): BuilderStyleContract {
	return {
		editableTargets: overrides.editableTargets ?? [ ...styleStateTargets ],
		supportsBreakpoints: overrides.supportsBreakpoints ?? true,
		supportsStates: overrides.supportsStates ?? true,
		supportsTokens: overrides.supportsTokens ?? true,
		supportsLogicalProperties: overrides.supportsLogicalProperties ?? true,
		properties: overrides.properties ?? properties,
	};
}

function styleProperty(
	key: string,
	label: string,
	controlType: BuilderFieldType,
	options?: Array<{ label: string; value: string }>,
	overrides: Partial<BuilderStylePropertyDefinition> = {},
): BuilderStylePropertyDefinition {
	const { primitive, ...rest } = overrides;
	return {
		key,
		label,
		controlType,
		options,
		primitive: primitive ?? inferStyleControlPrimitive( key, label, controlType, options, rest ),
		...rest,
	};
}

const pixelUnits = [ { label: 'PX', value: 'px', shortLabel: 'px' } ];
const textMeasureUnits = [
	{ label: 'PX', value: 'px', shortLabel: 'px' },
	{ label: 'EM', value: 'em', shortLabel: 'em' },
	{ label: 'REM', value: 'rem', shortLabel: 'rem' },
];
const timeUnits = [
	{ label: 'MS', value: 'ms', shortLabel: 'ms' },
	{ label: 'S', value: 's', shortLabel: 's' },
];
const layoutUnits = [
	{ label: 'PX', value: 'px', shortLabel: 'px' },
	{ label: '%', value: '%', shortLabel: '%' },
	{ label: 'VW', value: 'vw', shortLabel: 'vw' },
];
const containerLayoutModeOptions: BuilderControlOption[] = [
	{ label: 'Flexbox', value: 'flex' },
	{ label: 'Grid', value: 'grid' },
];
const flexDirectionChooseOptions: BuilderControlOption[] = [
	{ label: 'Row', value: 'row', icon: 'flex-row' },
	{ label: 'Row Reverse', value: 'row-reverse', icon: 'flex-row-reverse' },
	{ label: 'Column', value: 'column', icon: 'flex-column' },
	{ label: 'Column Reverse', value: 'column-reverse', icon: 'flex-column-reverse' },
];
const gridAutoFlowChooseOptions: BuilderControlOption[] = [
	{ label: 'Row', value: 'row', icon: 'flex-row' },
	{ label: 'Column', value: 'column', icon: 'flex-column' },
];
const flexWrapChooseOptions: BuilderControlOption[] = [
	{ label: 'No Wrap', value: 'nowrap', icon: 'nowrap' },
	{ label: 'Wrap', value: 'wrap', icon: 'wrap' },
	{ label: 'Wrap Reverse', value: 'wrap-reverse', icon: 'wrap-reverse' },
];
const justifyDistributionChooseOptions: BuilderControlOption[] = [
	{ label: 'Start', value: 'start', icon: 'justify-start' },
	{ label: 'Center', value: 'center', icon: 'justify-center' },
	{ label: 'End', value: 'end', icon: 'justify-end' },
	{ label: 'Space Between', value: 'space-between', icon: 'space-between' },
	{ label: 'Space Around', value: 'space-around', icon: 'space-around' },
	{ label: 'Space Evenly', value: 'space-evenly', icon: 'space-evenly' },
];
const crossAxisAlignmentChooseOptions: BuilderControlOption[] = [
	{ label: 'Start', value: 'start', icon: 'items-start' },
	{ label: 'Center', value: 'center', icon: 'items-center' },
	{ label: 'End', value: 'end', icon: 'items-end' },
	{ label: 'Stretch', value: 'stretch', icon: 'items-stretch' },
];

function createLayoutIconChoicePrimitive(
	options: BuilderControlOption[],
	columns: number,
): BuilderControlPrimitive {
	return createChoosePrimitive( options, {
		layout: 'grid',
		iconPosition: 'top',
		presentation: 'icon-only',
		columns,
		responsive: true,
	} );
}

function createLayoutModeSelectPrimitive(): BuilderControlPrimitive {
	return createSelectPrimitive( containerLayoutModeOptions, {
		responsive: true,
	} );
}

function layoutModeCondition( value: 'flex' | 'grid' ): BuilderControlCondition {
	return styleCondition( 'layout.display', { equals: value } );
}

function normalizeStyleControlKey( key: string ): string {
	if ( key.startsWith( '--' ) ) {
		return key.toLowerCase();
	}

	return key
		.replace( /([a-z0-9])([A-Z])/g, '$1-$2' )
		.replace( /\s+/g, '-' )
		.toLowerCase();
}

function inferStyleControlPrimitive(
	key: string,
	label: string,
	controlType: BuilderFieldType,
	options: Array<{ label: string; value: string }> | undefined,
	overrides: Partial<BuilderStylePropertyDefinition>,
): BuilderControlPrimitive | undefined {
	const normalizedKey = normalizeStyleControlKey( key );

	if ( controlType === 'select' && options?.length ) {
		if ( isChooseStyleControl( key, label, options ) ) {
			const signature = `${ key } ${ label } ${ options.map( ( option ) => option.value ).join( ' ' ) }`.toLowerCase();
			return createChoosePrimitive( decorateChooseOptions( options, signature ), {
				layout: 'inline',
				iconPosition: 'top',
				presentation: /align|justify|direction|display|wrap/i.test( signature ) ? 'icon-only' : 'icon-label',
				columns: Math.min( options.length, 4 ),
				responsive: overrides.responsive,
				stateful: overrides.stateful,
				tokenAware: overrides.tokenAware,
				placeholder: overrides.placeholder,
				description: overrides.description,
			} );
		}

		return createSelectPrimitive( options, {
			responsive: overrides.responsive,
			stateful: overrides.stateful,
			tokenAware: overrides.tokenAware,
			placeholder: overrides.placeholder,
			description: overrides.description,
		} );
	}

	if ( controlType === 'toggle' ) {
		return createSwitcherPrimitive( {
			onLabel: 'Yes',
			offLabel: 'No',
			labelsInline: true,
			responsive: overrides.responsive,
			stateful: overrides.stateful,
			tokenAware: overrides.tokenAware,
			description: overrides.description,
		} );
	}

	if ( controlType === 'url' ) {
		return createUrlPrimitive( {
			placeholder: overrides.placeholder,
			description: overrides.description,
			showNewTab: true,
			showNoFollow: true,
			showCustomAttributes: true,
		} );
	}

	if ( controlType === 'image' ) {
		return createMediaPrimitive( {
			assetType: 'image',
			placeholder: overrides.placeholder,
			description: overrides.description,
		} );
	}

	if ( normalizedKey === 'background-image' ) {
		return createUrlPrimitive( {
			placeholder: overrides.placeholder ?? 'https://example.com/image.jpg',
			description: overrides.description,
			responsive: overrides.responsive,
			stateful: overrides.stateful,
			showNewTab: false,
			showNoFollow: false,
			showCustomAttributes: false,
			showLinkIcon: false,
		} );
	}

	if ( isColorStyleControl( key, label ) ) {
		return createColorPrimitive( {
			responsive: overrides.responsive,
			stateful: overrides.stateful,
			tokenAware: overrides.tokenAware ?? true,
			placeholder: overrides.placeholder,
			description: overrides.description,
		} );
	}

	if ( isDimensionsStyleControl( key, label ) ) {
		return createDimensionsPrimitive( {
			units: textMeasureUnits,
			defaultUnit: 'px',
			linked: true,
			showLinkedToggle: true,
			responsive: overrides.responsive,
			stateful: overrides.stateful,
			tokenAware: overrides.tokenAware,
			description: overrides.description,
		} );
	}

	if ( isSliderStyleControl( key, label ) ) {
		const slider = inferSliderConfig( key, label );
		const compactTypographySlider = isCompactTypographySliderControl( key, label );
		return createSliderPrimitive( {
			min: slider.min,
			max: slider.max,
			step: slider.step,
			units: slider.units,
			defaultUnit: slider.defaultUnit,
			showUnit: slider.units.length > 0,
			showInput: true,
			showRange: !compactTypographySlider,
			showReset: true,
			responsive: overrides.responsive,
			stateful: overrides.stateful,
			tokenAware: overrides.tokenAware,
			description: overrides.description,
		} );
	}

	return undefined;
}

function isColorStyleControl( key: string, label: string ): boolean {
	const signature = `${ normalizeStyleControlKey( key ) } ${ label }`.toLowerCase();
	return /(^|[\s-])color\b/.test( signature ) || signature.includes( '--builder-overlay-color' );
}

function isDimensionsStyleControl( key: string, label: string ): boolean {
	return /padding|margin|radius|border-width/i.test( `${ normalizeStyleControlKey( key ) } ${ label }` );
}

function isSliderStyleControl( key: string, label: string ): boolean {
	const signature = `${ normalizeStyleControlKey( key ) } ${ label }`.toLowerCase();
	if ( signature.includes( 'background-size' ) ) {
		return false;
	}

	return /font-size|font-weight|line-height|letter-spacing|word-spacing|opacity|z-index|order|gap|width|height|top|right|bottom|left|duration|delay|perspective|stroke width|(^|[\s-])size\b/.test( signature );
}

function isCompactTypographySliderControl( key: string, label: string ): boolean {
	const signature = `${ normalizeStyleControlKey( key ) } ${ label }`.toLowerCase();
	return /font-size|line-height|letter-spacing|word-spacing/.test( signature );
}

function isChooseStyleControl(
	key: string,
	label: string,
	options: Array<{ label: string; value: string }>,
): boolean {
	const signature = `${ key } ${ label } ${ options.map( ( option ) => option.value ).join( ' ' ) }`;
	return /align|justify|position|direction|display|fit|decoration|transform/i.test( signature ) && options.length <= 5;
}

function decorateChooseOptions( options: Array<{ label: string; value: string }>, context = '' ): BuilderControlOption[] {
	return options.map( ( option ) => ( {
		...option,
		icon: inferOptionIcon( context, option.value, option.label ),
	} ) );
}

function inferOptionIcon( context: string, value: string, label: string ): string | undefined {
	const normalized = `${ context } ${ value } ${ label }`.toLowerCase();
	if ( /display/.test( normalized ) ) {
		if ( normalized.includes( 'grid' ) ) {
			return 'grid';
		}
		if ( normalized.includes( 'flex' ) ) {
			return 'flex';
		}
		if ( normalized.includes( 'block' ) ) {
			return 'block';
		}
	}
	if ( /direction/.test( normalized ) ) {
		if ( normalized.includes( 'row-reverse' ) ) {
			return 'flex-row-reverse';
		}
		if ( normalized.includes( 'column-reverse' ) ) {
			return 'flex-column-reverse';
		}
		if ( normalized.includes( 'row' ) ) {
			return 'flex-row';
		}
		if ( normalized.includes( 'column' ) ) {
			return 'flex-column';
		}
	}
	if ( /wrap/.test( normalized ) ) {
		if ( normalized.includes( 'wrap-reverse' ) ) {
			return 'wrap-reverse';
		}
		if ( normalized.includes( 'nowrap' ) || normalized.includes( 'no wrap' ) ) {
			return 'nowrap';
		}
		if ( normalized.includes( 'wrap' ) ) {
			return 'wrap';
		}
	}
	if ( /justify/.test( normalized ) ) {
		if ( normalized.includes( 'space-between' ) ) {
			return 'space-between';
		}
		if ( normalized.includes( 'space-around' ) ) {
			return 'space-around';
		}
		if ( normalized.includes( 'space-evenly' ) ) {
			return 'space-evenly';
		}
		if ( normalized.includes( 'left' ) || normalized.includes( 'start' ) ) {
			return 'justify-start';
		}
		if ( normalized.includes( 'center' ) ) {
			return 'justify-center';
		}
		if ( normalized.includes( 'right' ) || normalized.includes( 'end' ) ) {
			return 'justify-end';
		}
	}
	if ( /align/.test( normalized ) ) {
		if ( normalized.includes( 'stretch' ) ) {
			return 'align-stretch';
		}
		if ( normalized.includes( 'top' ) || normalized.includes( 'start' ) ) {
			return 'align-top';
		}
		if ( normalized.includes( 'center' ) || normalized.includes( 'middle' ) ) {
			return 'align-middle';
		}
		if ( normalized.includes( 'bottom' ) || normalized.includes( 'end' ) ) {
			return 'align-bottom';
		}
	}
	if ( normalized.includes( 'left' ) || normalized.includes( 'start' ) ) {
		return 'align-left';
	}
	if ( normalized.includes( 'center' ) ) {
		return 'align-center';
	}
	if ( normalized.includes( 'right' ) || normalized.includes( 'end' ) ) {
		return 'align-right';
	}
	if ( normalized.includes( 'justify' ) || normalized.includes( 'space-between' ) ) {
		return 'align-justify';
	}
	if ( normalized.includes( 'space-around' ) ) {
		return 'space-around';
	}
	if ( normalized.includes( 'space-evenly' ) || normalized.includes( 'stretch' ) ) {
		return normalized.includes( 'stretch' ) ? 'align-stretch' : 'space-evenly';
	}
	if ( normalized.includes( 'row-reverse' ) ) {
		return 'flex-row-reverse';
	}
	if ( normalized.includes( 'column-reverse' ) ) {
		return 'flex-column-reverse';
	}
	if ( normalized.includes( 'row' ) ) {
		return 'flex-row';
	}
	if ( normalized.includes( 'column' ) ) {
		return 'flex-column';
	}
	if ( normalized.includes( 'nowrap' ) || normalized.includes( 'no wrap' ) ) {
		return 'nowrap';
	}
	if ( normalized.includes( 'wrap-reverse' ) || normalized.includes( 'wrap reverse' ) ) {
		return 'wrap-reverse';
	}
	if ( normalized.includes( 'wrap' ) ) {
		return 'wrap';
	}
	if ( normalized.includes( 'cover' ) ) {
		return 'fit-cover';
	}
	if ( normalized.includes( 'contain' ) ) {
		return 'fit-contain';
	}
	return undefined;
}

function inferSliderConfig( key: string, label: string ) {
	const normalizedKey = normalizeStyleControlKey( key );
	const signature = `${ normalizedKey } ${ label }`.toLowerCase();
	if ( /opacity/.test( signature ) ) {
		return { min: 0, max: 1, step: 0.01, units: [] as typeof pixelUnits, defaultUnit: undefined as string | undefined };
	}
	if ( /font-weight/.test( signature ) ) {
		return { min: 100, max: 900, step: 100, units: [] as typeof pixelUnits, defaultUnit: undefined as string | undefined };
	}
	if ( /line-height/.test( signature ) ) {
		return { min: 0, max: 4, step: 0.1, units: [] as typeof pixelUnits, defaultUnit: undefined as string | undefined };
	}
	if ( /font-size|letter-spacing|word-spacing|stroke width|(^|[\s-])size\b/.test( signature ) && normalizedKey !== 'background-size' ) {
		return { min: 0, max: 160, step: 1, units: textMeasureUnits, defaultUnit: 'px' };
	}
	if ( /(^|[\s-])(order|z-index)\b/.test( signature ) ) {
		return { min: -100, max: 100, step: 1, units: [] as typeof pixelUnits, defaultUnit: undefined as string | undefined };
	}
	if ( /duration|delay/.test( signature ) ) {
		return { min: 0, max: 5000, step: 10, units: timeUnits, defaultUnit: 'ms' };
	}
	if ( /perspective/.test( signature ) ) {
		return { min: 0, max: 2000, step: 1, units: textMeasureUnits, defaultUnit: 'px' };
	}
	if ( /top|right|bottom|left/.test( signature ) ) {
		return { min: -1600, max: 1600, step: 1, units: layoutUnits, defaultUnit: 'px' };
	}
	if ( /width|height|gap|padding|margin|radius/.test( signature ) ) {
		return { min: 0, max: 1600, step: 1, units: layoutUnits, defaultUnit: 'px' };
	}
	return { min: 0, max: 100, step: 1, units: pixelUnits, defaultUnit: 'px' };
}

function createTextStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'color', 'Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'fontSize', 'Font Size', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'fontWeight', 'Font Weight', 'select', fontWeightOptions, { responsive: true } ),
		styleProperty( 'lineHeight', 'Line Height', 'text', undefined, { responsive: true } ),
		styleProperty( 'letterSpacing', 'Letter Spacing', 'text', undefined, { responsive: true } ),
		styleProperty( 'textAlign', 'Text Align', 'select', alignmentOptions, { responsive: true } ),
		styleProperty( 'textTransform', 'Text Transform', 'select', [
			{ label: 'None', value: 'none' },
			{ label: 'Uppercase', value: 'uppercase' },
			{ label: 'Lowercase', value: 'lowercase' },
			{ label: 'Capitalize', value: 'capitalize' },
		], { responsive: true } ),
		styleProperty( 'maxWidth', 'Max Width', 'text', undefined, { responsive: true } ),
	] );
}

function createSurfaceStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'margin', 'Margin', 'text', undefined, { responsive: true } ),
		styleProperty( 'background', 'Background', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'border', 'Border', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'boxShadow', 'Shadow', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'minHeight', 'Min Height', 'text', undefined, { responsive: true } ),
	] );
}

function createMediaStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'width', 'Width', 'text', undefined, { responsive: true } ),
		styleProperty( 'height', 'Height', 'text', undefined, { responsive: true } ),
		styleProperty( 'maxWidth', 'Max Width', 'text', undefined, { responsive: true } ),
		styleProperty( 'objectFit', 'Object Fit', 'select', objectFitOptions, { responsive: true } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'opacity', 'Opacity', 'number', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'filter', 'Filter', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'boxShadow', 'Shadow', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
	] );
}

function createInteractiveStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'margin', 'Margin', 'text', undefined, { responsive: true } ),
		styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'background', 'Background', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'boxShadow', 'Shadow', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'transition', 'Transition', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'color', 'Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
	] );
}

function createFormStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'fieldGap', 'Field Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'labelSpacing', 'Label Spacing', 'text', undefined, { responsive: true } ),
		styleProperty( 'inputPadding', 'Input Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'inputBackground', 'Input Background', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'inputBorder', 'Input Border', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'inputBorderRadius', 'Input Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'submitPadding', 'Submit Padding', 'text', undefined, { responsive: true } ),
	] );
}

function createMenuStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'direction', 'Direction', 'select', orientationOptions, { responsive: true } ),
		styleProperty( 'alignItems', 'Align Items', 'select', alignmentOptions, { responsive: true } ),
		styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'itemGap', 'Item Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'itemPadding', 'Item Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'itemBackground', 'Item Background', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'itemColor', 'Item Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
	] );
}

function createLoopStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'columns', 'Columns', 'number', undefined, { responsive: true } ),
		styleProperty( 'rowGap', 'Row Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'columnGap', 'Column Gap', 'text', undefined, { responsive: true } ),
		styleProperty( 'itemPadding', 'Item Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'emptyStatePadding', 'Empty State Padding', 'text', undefined, { responsive: true } ),
	] );
}

function createPopupStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'width', 'Width', 'text', undefined, { responsive: true } ),
		styleProperty( 'maxWidth', 'Max Width', 'text', undefined, { responsive: true } ),
		styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'background', 'Background', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'overlayColor', 'Overlay Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'boxShadow', 'Shadow', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
	] );
}

function createCompatStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'margin', 'Margin', 'text', undefined, { responsive: true } ),
		styleProperty( 'background', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', undefined, { responsive: true } ),
		styleProperty( 'opacity', 'Opacity', 'number', undefined, { responsive: true } ),
	] );
}

function createDefaultStyleContract( family: BuilderRuntimeFamily ): BuilderStyleContract {
	switch ( family ) {
		case 'text':
			return createTextStyleContract();
		case 'image':
			return createMediaStyleContract();
		case 'button':
		case 'icon':
		case 'icon-box':
		case 'list':
		case 'tabs':
		case 'accordion':
		case 'menu':
		case 'gallery':
		case 'carousel':
			return createInteractiveStyleContract();
		case 'form':
			return createFormStyleContract();
		case 'loop':
			return createLoopStyleContract();
		case 'popup':
			return createPopupStyleContract();
		case 'compat':
			return createCompatStyleContract();
		case 'container':
		default:
			return createSurfaceStyleContract();
	}
}

function styleSection(
	id: string,
	label: string,
	family: BuilderStyleSectionFamily,
	controls: BuilderStylePropertyDefinition[],
	options: Partial<Omit<BuilderStyleSectionInstance, 'id' | 'label' | 'family' | 'controls'>> = {},
): BuilderStyleSectionInstance {
	return {
		id,
		label,
		family,
		controls,
		order: options.order ?? 0,
		description: options.description,
		enabledStates: options.enabledStates,
		presentation: options.presentation,
		summaryKeys: options.summaryKeys,
		responsive: options.responsive,
		condition: options.condition,
	};
}

function advancedSection(
	id: string,
	label: string,
	family: BuilderAdvancedSectionFamily,
	options: Partial<Omit<BuilderAdvancedSectionInstance, 'id' | 'label' | 'family'>> = {},
): BuilderAdvancedSectionInstance {
	return {
		id,
		label,
		family,
		order: options.order ?? 0,
		description: options.description,
		responsive: options.responsive,
		condition: options.condition,
		fields: options.fields,
		controls: options.controls,
	};
}

function sortSectionInstances<T extends { order: number; label: string }>( sections: T[] ): T[] {
	return [ ...sections ].sort( ( left, right ) => left.order - right.order || left.label.localeCompare( right.label ) );
}

function sectionControls( ...controls: BuilderStylePropertyDefinition[] ): BuilderStylePropertyDefinition[] {
	return controls;
}

function styleCondition( path: string, options: Omit<BuilderControlCondition, 'path'> ): BuilderControlCondition {
	return { path, ...options };
}

function alignmentControl( label = 'Alignment', key = 'text-align' ): BuilderStylePropertyDefinition {
	return styleProperty( key, label, 'select', alignmentOptions, { responsive: true } );
}

function typographyControls( options: {
	includeColor?: boolean;
	includeDecoration?: boolean;
	includeShadowColor?: boolean;
} = {} ): BuilderStylePropertyDefinition[] {
	const controls: BuilderStylePropertyDefinition[] = [];
	if ( options.includeColor ?? true ) {
		controls.push( styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ) );
	}
	controls.push(
		styleProperty( 'font-family', 'Font Family', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'font-size', 'Font Size', 'text', undefined, { responsive: true, tokenAware: true } ),
		styleProperty( 'font-weight', 'Font Weight', 'select', fontWeightOptions, { responsive: true } ),
		styleProperty( 'line-height', 'Line Height', 'text', undefined, { responsive: true } ),
		styleProperty( 'letter-spacing', 'Letter Spacing', 'text', undefined, { responsive: true } ),
		styleProperty( 'text-transform', 'Transform', 'select', [
			{ label: 'Default', value: 'none' },
			{ label: 'Uppercase', value: 'uppercase' },
			{ label: 'Lowercase', value: 'lowercase' },
			{ label: 'Capitalize', value: 'capitalize' },
		], { responsive: true } ),
	);
	if ( options.includeDecoration ) {
		controls.push( styleProperty( 'text-decoration', 'Decoration', 'select', [
			{ label: 'Default', value: 'none' },
			{ label: 'Underline', value: 'underline' },
			{ label: 'Overline', value: 'overline' },
			{ label: 'Line Through', value: 'line-through' },
		], { responsive: true, stateful: true } ) );
	}
	if ( options.includeShadowColor ) {
		controls.push( styleProperty( 'text-decoration-color', 'Link Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ) );
	}
	return controls;
}

const typographySummaryKeys = [ 'color', 'font-family', 'font-size', 'font-weight' ];

function typographyStyleSection(
	id: string,
	label: string,
	controls: BuilderStylePropertyDefinition[],
	order: number,
	options: Partial<Omit<BuilderStyleSectionInstance, 'id' | 'label' | 'family' | 'controls'>> = {},
): BuilderStyleSectionInstance {
	return styleSection( id, label, 'typography', controls, {
		order,
		responsive: true,
		presentation: 'popover',
		summaryKeys: typographySummaryKeys,
		...options,
	} );
}

function textStrokeControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( '-webkit-text-stroke-width', 'Stroke Width', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( '-webkit-text-stroke-color', 'Stroke Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
	);
}

function textShadowControls(): BuilderStylePropertyDefinition[] {
	return sectionControls( styleProperty( 'text-shadow', 'Text Shadow', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ) );
}

function backgroundControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'background-color', 'Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( 'background-image', 'Image', 'url', undefined, { responsive: true, stateful: true, placeholder: 'https://example.com/image.jpg' } ),
		styleProperty( 'background-position', 'Position', 'text', undefined, { responsive: true, stateful: true, placeholder: 'center center' } ),
		styleProperty( 'background-size', 'Size', 'text', undefined, { responsive: true, stateful: true, placeholder: 'cover' } ),
		styleProperty( 'background-repeat', 'Repeat', 'select', [
			{ label: 'No Repeat', value: 'no-repeat' },
			{ label: 'Repeat', value: 'repeat' },
			{ label: 'Repeat X', value: 'repeat-x' },
			{ label: 'Repeat Y', value: 'repeat-y' },
		], { responsive: true, stateful: true } ),
	);
}

function backgroundOverlayControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( '--builder-overlay-color', 'Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
		styleProperty( '--builder-overlay-opacity', 'Opacity', 'number', undefined, { responsive: true, stateful: true } ),
		styleProperty( '--builder-overlay-blend-mode', 'Blend Mode', 'select', [
			{ label: 'Normal', value: 'normal' },
			{ label: 'Multiply', value: 'multiply' },
			{ label: 'Screen', value: 'screen' },
			{ label: 'Overlay', value: 'overlay' },
		], { responsive: true, stateful: true } ),
	);
}

function borderControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'border-style', 'Border Type', 'select', [
			{ label: 'None', value: 'none' },
			{ label: 'Solid', value: 'solid' },
			{ label: 'Double', value: 'double' },
			{ label: 'Dotted', value: 'dotted' },
			{ label: 'Dashed', value: 'dashed' },
		], { responsive: true, stateful: true } ),
		styleProperty( 'border-width', 'Width', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'border-color', 'Color', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
	);
}

function borderRadiusControls(): BuilderStylePropertyDefinition[] {
	return sectionControls( styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ) );
}

function boxShadowControls(): BuilderStylePropertyDefinition[] {
	return sectionControls( styleProperty( 'box-shadow', 'Box Shadow', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ) );
}

function cssFilterControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'filter', 'CSS Filters', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'opacity', 'Opacity', 'number', undefined, { responsive: true, stateful: true } ),
	);
}

function layoutControls( family: BuilderRuntimeFamily, type: string ): BuilderStylePropertyDefinition[] {
	const displayOptions = family === 'container'
		? containerLayoutModeOptions
		: [
			{ label: 'Block', value: 'block' },
			{ label: 'Flex', value: 'flex' },
			{ label: 'Grid', value: 'grid' },
		];
	const controls = sectionControls(
		styleProperty( 'display', family === 'container' ? 'Container Layout' : 'Display', 'select', displayOptions, {
			responsive: true,
			primitive: family === 'container' ? createLayoutModeSelectPrimitive() : undefined,
		} ),
		styleProperty( 'flex-direction', 'Direction', 'select', [
			{ label: 'Row', value: 'row' },
			{ label: 'Row Reverse', value: 'row-reverse' },
			{ label: 'Column', value: 'column' },
			{ label: 'Column Reverse', value: 'column-reverse' },
		], {
			responsive: true,
			condition: family === 'container' ? layoutModeCondition( 'flex' ) : undefined,
			primitive: createLayoutIconChoicePrimitive( flexDirectionChooseOptions, 2 ),
		} ),
		styleProperty( 'flex-wrap', 'Wrap', 'select', [
			{ label: 'No Wrap', value: 'nowrap' },
			{ label: 'Wrap', value: 'wrap' },
			{ label: 'Wrap Reverse', value: 'wrap-reverse' },
		], {
			responsive: true,
			condition: family === 'container' ? layoutModeCondition( 'flex' ) : undefined,
			primitive: createLayoutIconChoicePrimitive( flexWrapChooseOptions, 3 ),
		} ),
		styleProperty( 'justify-content', 'Justify Content', 'select', [
			{ label: 'Start', value: 'start' },
			{ label: 'Center', value: 'center' },
			{ label: 'End', value: 'end' },
			{ label: 'Space Between', value: 'space-between' },
			{ label: 'Space Around', value: 'space-around' },
			{ label: 'Space Evenly', value: 'space-evenly' },
		], {
			responsive: true,
			primitive: createLayoutIconChoicePrimitive( justifyDistributionChooseOptions, 6 ),
		} ),
		styleProperty( 'align-items', 'Align Items', 'select', [
			{ label: 'Start', value: 'start' },
			{ label: 'Center', value: 'center' },
			{ label: 'End', value: 'end' },
			{ label: 'Stretch', value: 'stretch' },
		], {
			responsive: true,
			primitive: createLayoutIconChoicePrimitive( crossAxisAlignmentChooseOptions, 4 ),
		} ),
		styleProperty( 'align-content', 'Align Content', 'select', [
			{ label: 'Start', value: 'start' },
			{ label: 'Center', value: 'center' },
			{ label: 'End', value: 'end' },
			{ label: 'Stretch', value: 'stretch' },
			{ label: 'Space Between', value: 'space-between' },
			{ label: 'Space Around', value: 'space-around' },
			{ label: 'Space Evenly', value: 'space-evenly' },
		], {
			responsive: true,
			primitive: createLayoutIconChoicePrimitive( [
				...crossAxisAlignmentChooseOptions,
				...justifyDistributionChooseOptions.filter( ( option ) => option.value.startsWith( 'space-' ) ),
			], 4 ),
		} ),
		styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
	);
	if ( family === 'container' || type === 'loop' ) {
		controls.push(
			styleProperty( 'grid-template-columns', 'Columns', 'text', undefined, {
				responsive: true,
				condition: family === 'container' ? layoutModeCondition( 'grid' ) : undefined,
				placeholder: 'repeat(2, minmax(0, 1fr))',
			} ),
			styleProperty( 'grid-template-rows', 'Rows', 'text', undefined, {
				responsive: true,
				condition: family === 'container' ? layoutModeCondition( 'grid' ) : undefined,
				placeholder: 'auto',
			} ),
			styleProperty( 'grid-auto-flow', 'Auto Flow', 'select', [
				{ label: 'Row', value: 'row' },
				{ label: 'Column', value: 'column' },
			], {
				responsive: true,
				condition: family === 'container' ? layoutModeCondition( 'grid' ) : undefined,
				primitive: createLayoutIconChoicePrimitive( gridAutoFlowChooseOptions, 2 ),
			} ),
			styleProperty( 'justify-items', 'Justify Items', 'select', [
				{ label: 'Start', value: 'start' },
				{ label: 'Center', value: 'center' },
				{ label: 'End', value: 'end' },
				{ label: 'Stretch', value: 'stretch' },
			], {
				responsive: true,
				condition: family === 'container' ? layoutModeCondition( 'grid' ) : undefined,
				primitive: createLayoutIconChoicePrimitive( crossAxisAlignmentChooseOptions, 4 ),
			} ),
		);
	}
	return controls;
}

function containerSizingOverflowControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'width', 'Width', 'text', undefined, { responsive: true } ),
		styleProperty( 'max-width', 'Max Width', 'text', undefined, { responsive: true } ),
		styleProperty( 'min-height', 'Min Height', 'text', undefined, { responsive: true } ),
		styleProperty( 'overflow', 'Overflow', 'select', [
			{ label: 'Visible', value: 'visible' },
			{ label: 'Hidden', value: 'hidden' },
			{ label: 'Auto', value: 'auto' },
		], { responsive: true } ),
		styleProperty( 'aspect-ratio', 'Aspect Ratio', 'text', undefined, { responsive: true } ),
	);
}

function createStyleBackedContentField(
	id: string,
	path: string,
	property: BuilderStylePropertyDefinition,
	overrides: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'type' | 'path' | 'styleProperty'>> = {},
): BuilderFieldDefinition {
	return {
		id,
		label: property.label,
		type: property.controlType,
		path,
		styleProperty: property.key,
		description: property.description,
		placeholder: property.placeholder,
		options: property.options,
		responsive: property.responsive,
		condition: property.condition,
		primitive: property.primitive,
		...overrides,
	};
}

function createContainerContentSections(): BuilderPanelSectionDefinition[] {
	const layoutControlMap = new Map( layoutControls( 'container', 'container' ).map( ( control ) => [ control.key, control ] ) );
	const sizingControlMap = new Map( containerSizingOverflowControls().map( ( control ) => [ control.key, control ] ) );
	const getLayoutControl = ( key: string ) => {
		const control = layoutControlMap.get( key );
		if ( !control ) {
			throw new Error( `Missing container layout control "${ key }".` );
		}
		return control;
	};
	const getSizingControl = ( key: string ) => {
		const control = sizingControlMap.get( key );
		if ( !control ) {
			throw new Error( `Missing container sizing control "${ key }".` );
		}
		return control;
	};

	return [
		contentSection( 'layout', 'Layout', [
			createStyleBackedContentField( 'container_layout', 'layout.display', getLayoutControl( 'display' ) ),
			createStyleBackedContentField( 'direction', 'layout.direction', getLayoutControl( 'flex-direction' ) ),
			createStyleBackedContentField( 'wrap', 'layout.wrap', getLayoutControl( 'flex-wrap' ) ),
			createStyleBackedContentField( 'columns', 'layout.columns', getLayoutControl( 'grid-template-columns' ) ),
			createStyleBackedContentField( 'rows', 'layout.rows', getLayoutControl( 'grid-template-rows' ) ),
			createStyleBackedContentField( 'gap', 'layout.gap', getLayoutControl( 'gap' ) ),
			createStyleBackedContentField( 'auto_flow', 'layout.autoFlow', getLayoutControl( 'grid-auto-flow' ) ),
			createStyleBackedContentField( 'justify_items', 'layout.justifyItems', getLayoutControl( 'justify-items' ) ),
			createStyleBackedContentField( 'align_items', 'layout.alignItems', getLayoutControl( 'align-items' ) ),
			createStyleBackedContentField( 'justify_content', 'layout.justifyContent', getLayoutControl( 'justify-content' ) ),
			createStyleBackedContentField( 'align_content', 'layout.alignContent', getLayoutControl( 'align-content' ) ),
		] ),
		contentSection( 'sizing-overflow', 'Sizing & Overflow', [
			createStyleBackedContentField( 'width', 'layout.width', getSizingControl( 'width' ) ),
			createStyleBackedContentField( 'max_width', 'layout.maxWidth', getSizingControl( 'max-width' ) ),
			createStyleBackedContentField( 'min_height', 'layout.minHeight', getSizingControl( 'min-height' ) ),
			createStyleBackedContentField( 'overflow', 'layout.overflow', getSizingControl( 'overflow' ) ),
			createStyleBackedContentField( 'aspect_ratio', 'layout.aspectRatio', getSizingControl( 'aspect-ratio' ) ),
		] ),
	];
}

function advancedLayoutControls( options: {
	includeSizing?: boolean;
} = {} ): BuilderStylePropertyDefinition[] {
	const controls = sectionControls(
		styleProperty( 'margin', 'Margin', 'text', undefined, { responsive: true } ),
		styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
		styleProperty( 'order', 'Order', 'number', undefined, { responsive: true } ),
		styleProperty( 'align-self', 'Align Self', 'select', [
			{ label: 'Auto', value: 'auto' },
			{ label: 'Start', value: 'flex-start' },
			{ label: 'Center', value: 'center' },
			{ label: 'End', value: 'flex-end' },
			{ label: 'Stretch', value: 'stretch' },
		], { responsive: true } ),
	);
	if ( options.includeSizing ?? true ) {
		controls.splice(
			2,
			0,
			styleProperty( 'width', 'Width', 'text', undefined, { responsive: true } ),
			styleProperty( 'max-width', 'Max Width', 'text', undefined, { responsive: true } ),
			styleProperty( 'min-height', 'Min Height', 'text', undefined, { responsive: true } ),
		);
	}
	return controls;
}

function positioningControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'position', 'Position', 'select', [
			{ label: 'Default', value: 'static' },
			{ label: 'Relative', value: 'relative' },
			{ label: 'Absolute', value: 'absolute' },
			{ label: 'Fixed', value: 'fixed' },
			{ label: 'Sticky', value: 'sticky' },
		], { responsive: true } ),
		styleProperty( 'top', 'Top', 'text', undefined, { responsive: true } ),
		styleProperty( 'right', 'Right', 'text', undefined, { responsive: true } ),
		styleProperty( 'bottom', 'Bottom', 'text', undefined, { responsive: true } ),
		styleProperty( 'left', 'Left', 'text', undefined, { responsive: true } ),
		styleProperty( 'z-index', 'Z-Index', 'number', undefined, { responsive: true } ),
	);
}

function motionControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'transition-duration', 'Transition Duration', 'text', undefined, { responsive: true, placeholder: '300ms' } ),
		styleProperty( 'animation-name', 'Animation', 'text', undefined, { responsive: true } ),
		styleProperty( 'animation-duration', 'Animation Duration', 'text', undefined, { responsive: true, placeholder: '800ms' } ),
		styleProperty( 'animation-timing-function', 'Animation Timing', 'text', undefined, { responsive: true } ),
	);
}

function transformControls(): BuilderStylePropertyDefinition[] {
	return sectionControls(
		styleProperty( 'transform', 'Transform', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'transform-origin', 'Transform Origin', 'text', undefined, { responsive: true, stateful: true } ),
		styleProperty( 'perspective', 'Perspective', 'text', undefined, { responsive: true } ),
	);
}

function customCssSection( order: number ): BuilderAdvancedSectionInstance {
	return advancedSection( 'custom-css', 'Custom CSS', 'custom-css', {
		order,
		fields: [ textareaField( 'customCss', 'Custom CSS', 'styles.customCss', { description: 'Applied directly to this element in the runtime stylesheet.' } ) ],
	} );
}

function responsiveSection( order: number ): BuilderAdvancedSectionInstance {
	return advancedSection( 'responsive', 'Responsive Visibility', 'responsive', { order, responsive: true } );
}

function attributesSection( order: number ): BuilderAdvancedSectionInstance {
	return advancedSection( 'attributes', 'HTML Attributes', 'attributes', { order } );
}

function normalHoverSection(
	id: string,
	label: string,
	controls: BuilderStylePropertyDefinition[],
	order: number,
	description?: string,
): BuilderStyleSectionInstance {
	return styleSection( id, label, 'normal-hover-state-group', controls.map( ( control ) => ( {
		...control,
		stateful: control.stateful ?? true,
	} ) ), {
		order,
		description,
		enabledStates: [ 'normal', 'hover' ],
	} );
}

function createDefaultStyleSections( type: string, family: BuilderRuntimeFamily ): BuilderStyleSectionInstance[] {
	switch ( type ) {
		case 'heading':
			return sortSectionInstances( [
				styleSection( 'alignment', 'Alignment', 'alignment', [ alignmentControl() ], { order: 10, responsive: true } ),
				typographyStyleSection( 'typography', 'Typography', typographyControls( { includeDecoration: true } ), 20 ),
				styleSection( 'text-stroke', 'Text Stroke', 'text-stroke', textStrokeControls(), { order: 30, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'text-shadow', 'Text Shadow', 'text-shadow', textShadowControls(), { order: 40, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'blend-mode', 'Blend Mode', 'blend-mode', [ styleProperty( 'mix-blend-mode', 'Blend Mode', 'select', [
					{ label: 'Normal', value: 'normal' },
					{ label: 'Multiply', value: 'multiply' },
					{ label: 'Screen', value: 'screen' },
					{ label: 'Overlay', value: 'overlay' },
				], { stateful: true } ) ], { order: 50 } ),
				normalHoverSection( 'text', 'Color & Links', sectionControls(
					styleProperty( 'color', 'Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'text-decoration-color', 'Link Color', 'text', undefined, { responsive: true, tokenAware: true } ),
				), 60 ),
			] );
		case 'paragraph':
		case 'text-editor':
			return sortSectionInstances( [
				styleSection( 'alignment', 'Alignment', 'alignment', [ alignmentControl() ], { order: 10, responsive: true } ),
				typographyStyleSection( 'typography', 'Typography', typographyControls( { includeDecoration: true } ), 20 ),
				styleSection( 'paragraph-spacing', 'Paragraph Spacing', 'spacing', [
					styleProperty( 'margin-bottom', 'Paragraph Spacing', 'text', undefined, { responsive: true } ),
				], { order: 30, responsive: true } ),
				typographyStyleSection( 'drop-cap', 'Drop Cap', [
					styleProperty( 'initial-letter', 'Drop Cap Size', 'text', undefined, { responsive: true } ),
					styleProperty( '--builder-drop-cap-color', 'Drop Cap Color', 'text', undefined, { responsive: true, tokenAware: true } ),
				], 40, { condition: styleCondition( 'props.dropCap', { truthy: true } ) } ),
				normalHoverSection( 'links', 'Links', sectionControls(
					styleProperty( 'text-decoration-color', 'Link Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'text-decoration', 'Decoration', 'select', [
						{ label: 'None', value: 'none' },
						{ label: 'Underline', value: 'underline' },
						{ label: 'Overline', value: 'overline' },
						{ label: 'Line Through', value: 'line-through' },
					], { responsive: true } ),
				), 50 ),
				styleSection( 'text-shadow', 'Text Shadow', 'text-shadow', textShadowControls(), { order: 60, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
			] );
		case 'blockquote':
			return sortSectionInstances( [
				styleSection( 'alignment', 'Alignment', 'alignment', [ alignmentControl() ], { order: 10, responsive: true } ),
				typographyStyleSection( 'typography', 'Typography', typographyControls( { includeDecoration: true } ), 20 ),
				styleSection( 'text-shadow', 'Text Shadow', 'text-shadow', textShadowControls(), { order: 30, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
			] );
		case 'button':
			return sortSectionInstances( [
				styleSection( 'alignment', 'Alignment', 'alignment', sectionControls(
					styleProperty( 'justify-content', 'Justify', 'select', [
						{ label: 'Start', value: 'flex-start' },
						{ label: 'Center', value: 'center' },
						{ label: 'End', value: 'flex-end' },
						{ label: 'Space Between', value: 'space-between' },
					], { responsive: true } ),
					alignmentControl(),
				), { order: 10, responsive: true } ),
				typographyStyleSection( 'typography', 'Typography', typographyControls( { includeDecoration: true } ), 20 ),
				styleSection( 'text-shadow', 'Text Shadow', 'text-shadow', textShadowControls(), { order: 30, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				normalHoverSection( 'button', 'Surface', sectionControls(
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-color', 'Border Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'box-shadow', 'Box Shadow', 'text', undefined, { responsive: true, tokenAware: true } ),
				), 40 ),
				styleSection( 'border', 'Border', 'border', borderControls(), { order: 50, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'border-radius', 'Border Radius', 'border-radius', borderRadiusControls(), { order: 60, responsive: true } ),
				styleSection( 'spacing', 'Padding & Spacing', 'spacing', [
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
				], { order: 70, responsive: true } ),
				styleSection( 'hover-effects', 'Interaction', 'normal-hover-state-group', [
					styleProperty( 'transition-duration', 'Transition Duration', 'text', undefined, { responsive: true } ),
					styleProperty( 'transform', 'Hover Transform', 'text', undefined, { responsive: true, stateful: true } ),
				], { order: 80, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
			] );
		case 'image':
			return sortSectionInstances( [
				styleSection( 'image', 'Image', 'dimensions', sectionControls(
					styleProperty( 'width', 'Width', 'text', undefined, { responsive: true } ),
					styleProperty( 'max-width', 'Max Width', 'text', undefined, { responsive: true } ),
					styleProperty( 'height', 'Height', 'text', undefined, { responsive: true } ),
					styleProperty( 'object-fit', 'Object Fit', 'select', objectFitOptions, { responsive: true } ),
					styleProperty( 'object-position', 'Object Position', 'text', undefined, { responsive: true } ),
				), { order: 10, responsive: true } ),
				normalHoverSection( 'effects', 'Effects & Filters', sectionControls(
					styleProperty( 'opacity', 'Opacity', 'number', undefined, { responsive: true } ),
					styleProperty( 'filter', 'CSS Filters', 'text', undefined, { responsive: true } ),
					styleProperty( 'transform', 'Transform', 'text', undefined, { responsive: true } ),
				), 20 ),
				styleSection( 'border', 'Border', 'border', borderControls(), { order: 30, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'border-radius', 'Border Radius', 'border-radius', borderRadiusControls(), { order: 40, responsive: true } ),
				styleSection( 'box-shadow', 'Box Shadow', 'box-shadow', boxShadowControls(), { order: 50, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'caption', 'Caption', 'caption', [
					styleProperty( '--builder-caption-color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-caption-font-size', 'Font Size', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-caption-spacing', 'Spacing', 'text', undefined, { responsive: true } ),
				], { order: 60, responsive: true, condition: styleCondition( 'props.caption', { truthy: true } ) } ),
			] );
		case 'container':
		case 'grid-container':
			return sortSectionInstances( [
				styleSection( 'background', 'Background', 'background', backgroundControls(), { order: 10, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'border', 'Border', 'border', borderControls(), { order: 20, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
			] );
		case 'icon-box':
			return sortSectionInstances( [
				styleSection( 'box', 'Box', 'background', sectionControls(
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, stateful: true, tokenAware: true } ),
					styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
				), { order: 10, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				normalHoverSection( 'icon', 'Icon', sectionControls(
					styleProperty( 'font-size', 'Size', 'text', undefined, { responsive: true } ),
					styleProperty( 'color', 'Primary Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-icon-background', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-icon-padding', 'Padding', 'text', undefined, { responsive: true } ),
				), 20 ),
				styleSection( 'content', 'Content', 'alignment', [ alignmentControl() ], { order: 30, responsive: true } ),
				typographyStyleSection( 'title', 'Title', typographyControls( { includeDecoration: true } ), 40 ),
				typographyStyleSection( 'description', 'Description', [
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'font-size', 'Font Size', 'text', undefined, { responsive: true } ),
					styleProperty( 'line-height', 'Line Height', 'text', undefined, { responsive: true } ),
				], 50 ),
			] );
		case 'tabs':
		case 'accordion':
		case 'toggle':
			return sortSectionInstances( [
				normalHoverSection( 'title', 'Title', sectionControls(
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
				), 10 ),
				normalHoverSection( 'icon', 'Icon', sectionControls(
					styleProperty( 'font-size', 'Size', 'text', undefined, { responsive: true } ),
					styleProperty( '--builder-icon-color', 'Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-icon-gap', 'Gap', 'text', undefined, { responsive: true } ),
				), 20 ),
				typographyStyleSection( 'content', 'Content', [
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'border-color', 'Border Color', 'text', undefined, { responsive: true, tokenAware: true } ),
				], 30, { enabledStates: [ 'normal', 'active' ] } ),
			] );
		case 'menu':
		case 'social-icons':
			return sortSectionInstances( [
				styleSection( 'menu', type === 'social-icons' ? 'Icons' : 'Menu', 'layout', sectionControls(
					styleProperty( 'gap', 'Space Between', 'text', undefined, { responsive: true } ),
					styleProperty( 'flex-direction', 'Direction', 'select', orientationOptions, { responsive: true } ),
					styleProperty( 'justify-content', 'Align', 'select', [
						{ label: 'Start', value: 'flex-start' },
						{ label: 'Center', value: 'center' },
						{ label: 'End', value: 'flex-end' },
						{ label: 'Space Between', value: 'space-between' },
					], { responsive: true } ),
				), { order: 10, responsive: true } ),
				normalHoverSection( 'item', type === 'social-icons' ? 'Icon' : 'Item', sectionControls(
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true, tokenAware: true } ),
				), 20 ),
				styleSection( 'dropdown', type === 'social-icons' ? 'Container' : 'Dropdown', 'background', [
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-color', 'Border Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'box-shadow', 'Box Shadow', 'text', undefined, { responsive: true, tokenAware: true } ),
				], { order: 30, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
			] );
		case 'gallery':
			return sortSectionInstances( [
				styleSection( 'layout', 'Layout', 'layout', sectionControls(
					styleProperty( 'grid-template-columns', 'Columns', 'text', undefined, { responsive: true } ),
					styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
					styleProperty( 'aspect-ratio', 'Aspect Ratio', 'text', undefined, { responsive: true } ),
				), { order: 10, responsive: true } ),
				normalHoverSection( 'images', 'Images', sectionControls(
					styleProperty( 'object-fit', 'Object Fit', 'select', objectFitOptions, { responsive: true } ),
					styleProperty( 'filter', 'CSS Filters', 'text', undefined, { responsive: true } ),
					styleProperty( 'opacity', 'Opacity', 'number', undefined, { responsive: true } ),
				), 20 ),
				styleSection( 'caption', 'Caption', 'caption', [
					styleProperty( '--builder-caption-align', 'Alignment', 'select', alignmentOptions, { responsive: true } ),
					styleProperty( '--builder-caption-color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-caption-background', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-caption-padding', 'Padding', 'text', undefined, { responsive: true } ),
				], { order: 30, responsive: true } ),
			] );
		case 'carousel':
			return sortSectionInstances( [
				styleSection( 'slides', 'Slides', 'layout', sectionControls(
					styleProperty( 'min-height', 'Min Height', 'text', undefined, { responsive: true } ),
					styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
				), { order: 10, responsive: true } ),
				typographyStyleSection( 'content', 'Content', typographyControls( { includeDecoration: true } ), 20 ),
				normalHoverSection( 'navigation', 'Navigation', sectionControls(
					styleProperty( 'color', 'Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true } ),
				), 30 ),
			] );
		case 'form':
		case 'form-field-text':
		case 'form-field-email':
		case 'form-field-textarea':
		case 'form-field-select':
		case 'form-field-checkbox':
		case 'form-field-submit':
			return sortSectionInstances( [
				styleSection( 'form', 'Form', 'layout', sectionControls(
					styleProperty( 'gap', 'Gap', 'text', undefined, { responsive: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
				), { order: 10, responsive: true } ),
				typographyStyleSection( 'labels', 'Labels', [
					styleProperty( 'color', 'Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'font-size', 'Font Size', 'text', undefined, { responsive: true } ),
					styleProperty( 'font-weight', 'Font Weight', 'select', fontWeightOptions, { responsive: true } ),
				], 20 ),
				normalHoverSection( 'fields', 'Fields', sectionControls(
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-color', 'Border Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
				), 30 ),
				normalHoverSection( 'submit', 'Button', sectionControls(
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'box-shadow', 'Box Shadow', 'text', undefined, { responsive: true, tokenAware: true } ),
				), 40 ),
			] );
		case 'loop':
			return sortSectionInstances( [
				styleSection( 'grid', 'Grid', 'layout', sectionControls(
					styleProperty( 'grid-template-columns', 'Columns', 'text', undefined, { responsive: true } ),
					styleProperty( 'row-gap', 'Row Gap', 'text', undefined, { responsive: true } ),
					styleProperty( 'column-gap', 'Column Gap', 'text', undefined, { responsive: true } ),
				), { order: 10, responsive: true } ),
				styleSection( 'item', 'Item', 'background', [
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true } ),
				], { order: 20, responsive: true } ),
				styleSection( 'empty-state', 'Empty State', 'caption', [
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'text-align', 'Alignment', 'select', alignmentOptions, { responsive: true } ),
					styleProperty( 'color', 'Text Color', 'text', undefined, { responsive: true, tokenAware: true } ),
				], { order: 30, responsive: true } ),
			] );
		case 'popup-root':
			return sortSectionInstances( [
				styleSection( 'popup', 'Popup', 'background', sectionControls(
					styleProperty( 'width', 'Width', 'text', undefined, { responsive: true } ),
					styleProperty( 'max-width', 'Max Width', 'text', undefined, { responsive: true } ),
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
				), { order: 10, responsive: true } ),
				styleSection( 'overlay', 'Overlay', 'background-overlay', [
					styleProperty( '--builder-overlay-color', 'Overlay Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( '--builder-overlay-opacity', 'Overlay Opacity', 'number', undefined, { responsive: true } ),
				], { order: 20, responsive: true } ),
				normalHoverSection( 'close-button', 'Close Button', sectionControls(
					styleProperty( 'color', 'Color', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
				), 30 ),
			] );
		case 'compat-widget':
			return sortSectionInstances( [
				styleSection( 'compat', 'Compatibility Widget', 'background', sectionControls(
					styleProperty( 'padding', 'Padding', 'text', undefined, { responsive: true } ),
					styleProperty( 'margin', 'Margin', 'text', undefined, { responsive: true } ),
					styleProperty( 'background-color', 'Background', 'text', undefined, { responsive: true, tokenAware: true } ),
					styleProperty( 'border-radius', 'Border Radius', 'text', undefined, { responsive: true } ),
				), { order: 10, responsive: true } ),
			] );
		default:
			return sortSectionInstances( [
				styleSection( 'layout', 'Layout', 'layout', layoutControls( family, type ), { order: 10, responsive: true } ),
				styleSection( 'background', 'Background', 'background', backgroundControls(), { order: 20, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
				styleSection( 'border', 'Border', 'border', borderControls(), { order: 30, responsive: true, enabledStates: [ 'normal', 'hover' ] } ),
			] );
	}
}

function createCommonAdvancedSections( options: {
	includePositioning?: boolean;
	includeBackground?: boolean;
	includeBorder?: boolean;
	includeMask?: boolean;
	includeLayoutSizing?: boolean;
} = {} ): BuilderAdvancedSectionInstance[] {
	const sections: BuilderAdvancedSectionInstance[] = [
		advancedSection( 'layout', 'Layout', 'layout', {
			order: 10,
			responsive: true,
			controls: advancedLayoutControls( { includeSizing: options.includeLayoutSizing } ),
		} ),
	];
	if ( options.includePositioning ?? true ) {
		sections.push( advancedSection( 'positioning', 'Position & Layer', 'positioning', { order: 20, responsive: true, controls: positioningControls() } ) );
	}
	sections.push(
		advancedSection( 'motion-effects', 'Motion & Animation', 'motion-effects', { order: 30, responsive: true, controls: motionControls() } ),
		advancedSection( 'transform', 'Transform', 'transform', { order: 40, responsive: true, controls: transformControls() } ),
	);
	if ( options.includeBackground ) {
		sections.push( advancedSection( 'background', 'Background', 'background', { order: 50, responsive: true, controls: backgroundControls() } ) );
	}
	if ( options.includeBorder ) {
		sections.push( advancedSection( 'border', 'Border', 'border', { order: 60, responsive: true, controls: [ ...borderControls(), ...borderRadiusControls(), ...boxShadowControls() ] } ) );
	}
	if ( options.includeMask ) {
		sections.push( advancedSection( 'mask-overlay', 'Mask & Overlay', 'mask-or-overlay', {
			order: 70,
			responsive: true,
			controls: [
				styleProperty( '--builder-mask-image', 'Mask Image', 'text', undefined, { responsive: true } ),
				styleProperty( '--builder-mask-size', 'Mask Size', 'text', undefined, { responsive: true } ),
			],
		} ) );
	}
	sections.push( responsiveSection( 80 ), attributesSection( 90 ), customCssSection( 100 ) );
	return sortSectionInstances( sections );
}

function createDefaultAdvancedSections( type: string, family: BuilderRuntimeFamily ): BuilderAdvancedSectionInstance[] {
	switch ( type ) {
		case 'container':
		case 'grid-container':
			return createCommonAdvancedSections( { includeLayoutSizing: false } );
		case 'image':
			return createCommonAdvancedSections( { includePositioning: true, includeBackground: false, includeBorder: true } );
		case 'popup-root':
			return createCommonAdvancedSections( { includePositioning: true, includeBackground: true, includeBorder: true } );
		case 'compat-widget':
			return sortSectionInstances( [
				advancedSection( 'layout', 'Layout', 'layout', { order: 10, responsive: true, controls: advancedLayoutControls() } ),
				responsiveSection( 20 ),
				attributesSection( 30 ),
				customCssSection( 40 ),
			] );
		default:
			if ( family === 'container' ) {
				return createCommonAdvancedSections( { includeLayoutSizing: false } );
			}
			return createCommonAdvancedSections( { includePositioning: true, includeBackground: false, includeBorder: true } );
	}
}

function createPropSchemaFromDefaults( defaults: Record<string, JsonValue> = {} ): z.ZodType<Record<string, JsonValue>> {
	const shape: Record<string, z.ZodTypeAny> = {};

	for ( const [ key, value ] of Object.entries( defaults ) ) {
		shape[ key ] = inferJsonSchema( value );
	}

	return z.object( shape ).passthrough() as z.ZodType<Record<string, JsonValue>>;
}

function inferJsonSchema( value: JsonValue ): z.ZodTypeAny {
	if ( Array.isArray( value ) ) {
		if ( value.length === 0 ) {
			return z.array( z.any() );
		}

		return z.array( inferJsonSchema( value[ 0 ] as JsonValue ) );
	}

	if ( value === null ) {
		return z.null();
	}

	switch ( typeof value ) {
		case 'string':
			return z.string();
		case 'number':
			return z.number();
		case 'boolean':
			return z.boolean();
		case 'object': {
			const shape: Record<string, z.ZodTypeAny> = {};
			for ( const [ key, child ] of Object.entries( value ) ) {
				shape[ key ] = inferJsonSchema( child as JsonValue );
			}
			return z.object( shape ).passthrough();
		}
		default:
			return z.any();
	}
}

const linkItemSchema = z.object( {
	label: z.string(),
	href: z.string().default( '#' ),
	target: z.string().optional(),
	icon: z.string().optional(),
} ).passthrough();

const tabItemSchema = z.object( {
	label: z.string(),
	content: z.string().optional(),
	icon: z.string().optional(),
} ).passthrough();

const accordionItemSchema = z.object( {
	title: z.string(),
	body: z.string(),
	icon: z.string().optional(),
	open: z.boolean().default( false ),
} ).passthrough();

const formFieldSchema = z.object( {
	type: z.enum( [ 'text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'hidden', 'number', 'url' ] ),
	label: z.string(),
	name: z.string().optional(),
	placeholder: z.string().optional(),
	required: z.boolean().default( false ),
	options: z.array( z.string() ).default( [] ),
} ).passthrough();

const headingPropSchema = z.object( {
	text: z.string(),
	level: z.enum( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ] ),
	align: z.enum( [ 'left', 'center', 'right', 'justify' ] ).default( 'left' ),
	htmlTag: z.string().optional(),
	link: z.string().optional(),
	rel: z.string().optional(),
} ).passthrough();

const paragraphPropSchema = z.object( {
	text: z.string(),
	align: z.enum( [ 'left', 'center', 'right', 'justify' ] ).default( 'left' ),
	dropCap: z.boolean().default( false ),
	htmlTag: z.string().optional(),
} ).passthrough();

const imagePropSchema = z.object( {
	src: z.string(),
	alt: z.string().default( '' ),
	caption: z.string().optional(),
	link: z.string().optional(),
	fit: z.enum( [ 'cover', 'contain', 'fill', 'scale-down' ] ).default( 'cover' ),
	width: z.number().optional(),
	height: z.number().optional(),
	lazyLoad: z.boolean().default( true ),
} ).passthrough();

const buttonPropSchema = z.object( {
	text: z.string(),
	href: z.string().default( '#' ),
	variant: z.enum( [ 'solid', 'outline', 'ghost' ] ).default( 'solid' ),
	size: z.enum( [ 'sm', 'md', 'lg' ] ).default( 'md' ),
	icon: z.string().optional(),
	iconPosition: z.enum( [ 'start', 'end' ] ).default( 'start' ),
	openInNewTab: z.boolean().default( false ),
	noFollow: z.boolean().default( false ),
	ariaLabel: z.string().optional(),
} ).passthrough();

const iconBoxPropSchema = z.object( {
	title: z.string(),
	text: z.string(),
	symbol: z.string(),
	link: z.string().optional(),
	iconPosition: z.enum( [ 'top', 'left', 'right' ] ).default( 'top' ),
	badge: z.string().optional(),
} ).passthrough();

const tabsPropSchema = z.object( {
	activeTab: z.number().default( 0 ),
	items: z.array( tabItemSchema ).default( [] ),
	tabPosition: z.enum( [ 'top', 'left', 'right', 'bottom' ] ).default( 'top' ),
	equalHeight: z.boolean().default( false ),
} ).passthrough();

const accordionPropSchema = z.object( {
	items: z.array( accordionItemSchema ).default( [] ),
	multipleOpen: z.boolean().default( false ),
	activeIndex: z.number().default( 0 ),
	animation: z.enum( [ 'slide', 'fade', 'none' ] ).default( 'slide' ),
} ).passthrough();

const menuPropSchema = z.object( {
	items: z.array( linkItemSchema ).default( [] ),
	orientation: z.enum( [ 'horizontal', 'vertical' ] ).default( 'horizontal' ),
	alignment: z.enum( [ 'left', 'center', 'right', 'space-between' ] ).default( 'left' ),
	collapseBreakpoint: z.enum( [ 'desktop', 'laptop', 'tablet', 'mobile' ] ).default( 'tablet' ),
} ).passthrough();

const socialIconsPropSchema = z.object( {
	items: z.array( linkItemSchema ).default( [] ),
	size: z.enum( [ 'sm', 'md', 'lg' ] ).default( 'md' ),
	shape: z.enum( [ 'square', 'circle', 'none' ] ).default( 'circle' ),
} ).passthrough();

const galleryImageSchema = z.union( [
	z.string(),
	z.object( {
		src: z.string(),
		alt: z.string().optional(),
		caption: z.string().optional(),
	} ).passthrough(),
] );

const galleryPropSchema = z.object( {
	images: z.array( galleryImageSchema ).default( [] ),
	columns: z.number().default( 3 ),
	lightbox: z.boolean().default( false ),
} ).passthrough();

const carouselSlideSchema = z.object( {
	title: z.string().optional(),
	text: z.string().optional(),
	image: z.string().optional(),
	link: z.string().optional(),
} ).passthrough();

const carouselPropSchema = z.object( {
	slides: z.array( carouselSlideSchema ).default( [] ),
	autoplay: z.boolean().default( false ),
	interval: z.number().default( 5000 ),
} ).passthrough();

const formPropSchema = z.object( {
	submitLabel: z.string().default( 'Submit' ),
	method: z.enum( [ 'get', 'post' ] ).default( 'post' ),
	action: z.string().default( '' ),
	fields: z.array( formFieldSchema ).default( [] ),
	successMessage: z.string().optional(),
	errorMessage: z.string().optional(),
	redirectUrl: z.string().optional(),
} ).passthrough();

const loopPropSchema = z.object( {
	collection: z.string(),
	limit: z.number().default( 3 ),
	emptyText: z.string().default( 'No content found' ),
	query: z.record( z.any() ).default( {} ),
	pagination: z.boolean().default( false ),
} ).passthrough();

const popupRootPropSchema = z.object( {
	title: z.string().default( 'Popup' ),
	width: z.string().default( '720px' ),
	maxWidth: z.string().optional(),
	closeOnOverlay: z.boolean().default( true ),
	closeOnEsc: z.boolean().default( true ),
	showCloseButton: z.boolean().default( true ),
	overlayBackdrop: z.string().optional(),
} ).passthrough();

const compatWidgetPropSchema = z.object( {
	widgetType: z.string(),
	title: z.string(),
	rawSettings: z.record( z.any() ).default( {} ),
	nativeReplacement: z.string().optional(),
	editable: z.boolean().default( true ),
} ).passthrough();

function createPropSchema( schema: z.ZodTypeAny ): z.ZodTypeAny {
	return schema;
}

function createStyleSchema( schema: z.ZodTypeAny ): z.ZodTypeAny {
	return schema;
}

function createElementDefinition(
	type: string,
	label: string,
	category: BuilderElementCategory,
	family: BuilderRuntimeFamily,
	defaults: BuilderElementDefinition['defaults'],
	panelSections: BuilderPanelSectionDefinition[],
	runtimeOverrides: Partial<BuilderElementRuntimeDefinition> = {},
	legacyWidgetTypes: string[] = [],
	schemaOverrides: BuilderElementDefinitionOverrides = {},
): BuilderElementDefinition {
	const runtime: BuilderElementRuntimeDefinition = {
		family,
		tag: runtimeOverrides.tag,
		acceptsChildren: runtimeOverrides.acceptsChildren ?? ( family === 'container' || family === 'form' || family === 'popup' || family === 'compat' ),
		supportsInlineEditing: runtimeOverrides.supportsInlineEditing ?? family === 'text',
		slots: runtimeOverrides.slots ?? [],
	};
	const propSchema = createPropSchema( schemaOverrides.propSchema ?? createPropSchemaFromDefaults( defaults.props ?? {} ) );
	const styleSchema = createStyleSchema( schemaOverrides.styleSchema ?? StyleSetSchema );
	const styleContract = schemaOverrides.styleContract ?? createDefaultStyleContract( family );
	const contentSections = schemaOverrides.contentSections ?? panelSections.filter( ( section ) => ( section.tab ?? 'content' ) === 'content' );
	const styleSections = schemaOverrides.styleSections ?? createDefaultStyleSections( type, family );
	const advancedSections = schemaOverrides.advancedSections ?? createDefaultAdvancedSections( type, family );

	return {
		type,
		label,
		category,
		propSchema,
		styleSchema,
		styleContract,
		defaults,
		panelSections,
		contentSections,
		styleSections,
		advancedSections,
		runtime,
		legacy: legacyWidgetTypes.length ? { widgetTypes: legacyWidgetTypes } : undefined,
		createDefaultNode: () => createNode( {
			type,
			props: defaults.props ?? {},
			layout: defaults.layout ?? {},
			styles: createStyleSet( defaults.styles ),
			styleRefs: defaults.styleRefs ?? [],
			slots: Object.fromEntries( runtime.slots?.map( ( slot ) => [ slot.id, [] ] ) ?? [] ),
			legacy: legacyWidgetTypes.length ? {
				widgetType: legacyWidgetTypes[ 0 ],
				rawSettings: {},
			} : undefined,
		} ),
	};
}

function createStyleSectionsFromPanelSections(
	panelSections: BuilderPanelSectionDefinition[],
	styleContract: BuilderStyleContract,
): BuilderStyleSectionInstance[] {
	return panelSections.map( ( section, index ) => {
		const controls = section.fields
			.map( ( field ) => styleContract.properties.find( ( property ) => property.key === field.id ) )
			.filter( ( property ): property is BuilderStylePropertyDefinition => Boolean( property ) );

		return {
			id: section.id,
			label: section.label,
			description: section.description,
			order: index,
			family: inferStyleSectionFamily( section.id ),
			controls,
		};
	} );
}

function createAdvancedSectionsFromPanelSections( panelSections: BuilderPanelSectionDefinition[] ): BuilderAdvancedSectionInstance[] {
	return panelSections.map( ( section, index ) => ( {
		id: section.id,
		label: section.label,
		description: section.description,
		order: index,
		family: inferAdvancedSectionFamily( section.id ),
		fields: section.fields,
	} ) );
}

function inferStyleSectionFamily( sectionId: string ): BuilderStyleSectionFamily {
	if ( sectionId.includes( 'popup' ) ) {
		return 'dimensions';
	}
	if ( sectionId.includes( 'overlay' ) ) {
		return 'background-overlay';
	}
	if ( sectionId.includes( 'button' ) ) {
		return 'typography';
	}
	if ( sectionId.includes( 'fields' ) ) {
		return 'border';
	}
	if ( sectionId.includes( 'spacing' ) ) {
		return 'spacing';
	}
	if ( sectionId.includes( 'surface' ) ) {
		return 'background';
	}
	return 'layout';
}

function inferAdvancedSectionFamily( sectionId: string ): BuilderAdvancedSectionFamily {
	if ( sectionId.includes( 'visibility' ) ) {
		return 'visibility';
	}
	if ( sectionId.includes( 'custom' ) ) {
		return 'custom-css';
	}
	if ( sectionId.includes( 'attributes' ) || sectionId.includes( 'accessibility' ) ) {
		return 'attributes';
	}
	if ( sectionId.includes( 'popup' ) ) {
		return 'positioning';
	}
	return 'layout';
}

function sentenceCase( value: string ): string {
	return value.split( /[-_]/g ).map( ( word ) => word.slice( 0, 1 ).toUpperCase() + word.slice( 1 ) ).join( ' ' );
}

function requestToObject( request: Request ) {
	return {
		url: request.url,
		method: request.method,
		headers: Object.fromEntries( request.headers.entries() ),
	};
}

function getByPath( value: unknown, path: string ): unknown {
	return path.split( '.' ).reduce<unknown>( ( current, segment ) => {
		if ( current && typeof current === 'object' && segment in ( current as Record<string, unknown> ) ) {
			return ( current as Record<string, unknown> )[ segment ];
		}
		return undefined;
	}, value );
}

function stringSetting( value: JsonValue | undefined ): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function matchCondition( rule: ConditionGroup['rules'][ number ], context: TemplateConditionContext ): boolean {
	const actual = resolveConditionValue( rule.source, rule.path, context );
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

function resolveConditionValue( source: ConditionGroup['rules'][ number ][ 'source' ], path: string, context: TemplateConditionContext ): unknown {
	switch ( source ) {
		case 'route':
			return path === 'pathname' ? context.pathname : undefined;
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

