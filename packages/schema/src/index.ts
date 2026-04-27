import { z } from 'zod';

export const BUILDER_SCHEMA_VERSION = '2.0.0';
export const BUILDER_PACKAGE_VERSION = '2.0.0';

export const documentKinds = [
	'page',
	'layout',
	'template',
	'component',
	'popup',
	'kit',
	'library-item',
] as const;

export const documentStatuses = [ 'draft', 'published', 'archived' ] as const;
export const revisionKinds = [ 'draft', 'autosave', 'published' ] as const;
export const editorModes = [ 'page', 'layout', 'template', 'component-master', 'component-instance', 'popup', 'legacy-compat' ] as const;
export const variableKinds = [ 'color', 'font-family', 'font-size', 'size', 'spacing', 'number', 'radius', 'shadow', 'raw' ] as const;
export const assignmentSlots = [ 'page', 'header', 'footer', 'sidebar', 'popup', 'modal', 'loop-item', 'empty' ] as const;
export const bindingSources = [ 'route', 'load', 'site', 'query', 'request', 'collection', 'session', 'component-prop', 'document', 'dynamic' ] as const;
export const bindingTargetKinds = [ 'prop', 'attribute', 'content', 'style' ] as const;
export const bindingCategories = [ 'text', 'richText', 'url', 'color', 'image', 'media', 'gallery', 'number', 'boolean', 'object', 'postMeta' ] as const;
export const conditionSources = [ 'route', 'query', 'site', 'request', 'load', 'collection', 'session', 'document' ] as const;
export const conditionOperators = [ 'equals', 'contains', 'matches', 'startsWith', 'exists', 'not-exists', 'truthy', 'in' ] as const;
export const conditionGroupOperators = [ 'and', 'or' ] as const;
export const componentExposureSources = [ 'prop', 'attribute', 'content' ] as const;
export const pseudoStates = [ 'hover', 'focus', 'active', 'visited', 'disabled', 'success', 'error' ] as const;
export const interactionKinds = [ 'entrance', 'transition', 'hover', 'click', 'scroll' ] as const;
export const styleStateTargets = [ 'base', ...pseudoStates ] as const;

export const defaultBreakpoints = [
	{ id: 'desktop', label: 'Desktop', minWidth: 1280 },
	{ id: 'laptop', label: 'Laptop', minWidth: 1024 },
	{ id: 'tablet', label: 'Tablet', minWidth: 768 },
	{ id: 'mobile', label: 'Mobile', minWidth: 0 },
] as const;

const jsonLiteralSchema = z.union( [ z.string(), z.number(), z.boolean(), z.null() ] );
export type JsonPrimitive = z.infer<typeof jsonLiteralSchema>;
export type JsonValue = JsonPrimitive | { [ key: string ]: JsonValue } | JsonValue[];

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy( () =>
	z.union( [ jsonLiteralSchema, z.array( JsonValueSchema ), z.record( JsonValueSchema ) ] ),
);

export const StyleMapSchema = z.record( JsonValueSchema );

export const StyleStateTargetSchema = z.enum( styleStateTargets );

export const StyleTokenReferenceSchema = z.object( {
	token: z.string(),
	fallback: JsonValueSchema.optional(),
} );

export const StyleSetSchema = z.object( {
	base: StyleMapSchema.default( {} ),
	states: z.record( StyleMapSchema ).default( {} ),
	breakpoints: z.record( StyleMapSchema ).default( {} ),
	stateBreakpoints: z.record( z.record( StyleMapSchema ) ).default( {} ),
	customCss: z.string().default( '' ),
} );

export const BindingSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	targetKind: z.enum( bindingTargetKinds ).default( 'prop' ),
	target: z.string(),
	source: z.enum( bindingSources ),
	path: z.string(),
	category: z.enum( bindingCategories ).optional(),
	fallback: JsonValueSchema.optional(),
	before: z.string().optional(),
	after: z.string().optional(),
	transform: z.string().optional(),
	args: z.record( JsonValueSchema ).default( {} ),
} );

export const HtmlAttributeSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	name: z.string(),
	value: z.string().optional(),
	kind: z.enum( [ 'static', 'binding' ] ).default( 'static' ),
	bindingId: z.string().optional(),
} );

export const ConditionRuleSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	source: z.enum( conditionSources ),
	path: z.string(),
	operator: z.enum( conditionOperators ).default( 'equals' ),
	value: JsonValueSchema.optional(),
	values: z.array( JsonValueSchema ).default( [] ),
} );

export const ConditionGroupSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	operator: z.enum( conditionGroupOperators ).default( 'and' ),
	rules: z.array( ConditionRuleSchema ).default( [] ),
} );

export const InteractionSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	kind: z.enum( interactionKinds ),
	trigger: z.string(),
	enabled: z.boolean().default( true ),
	options: z.record( JsonValueSchema ).default( {} ),
	respectReducedMotion: z.boolean().default( true ),
} );

export const AccessibilitySchema = z.object( {
	role: z.string().optional(),
	label: z.string().optional(),
	labelledBy: z.string().optional(),
	describedBy: z.string().optional(),
	decorative: z.boolean().default( false ),
	tabIndex: z.number().optional(),
} );

export const VisibilitySchema = z.object( {
	hidden: z.boolean().default( false ),
	breakpointHidden: z.record( z.boolean() ).default( {} ),
	conditionGroups: z.array( ConditionGroupSchema ).default( [] ),
	display: z.enum( [ 'show', 'hide-when-matched' ] ).default( 'show' ),
} );

export const LegacyCompatSchema = z.object( {
	widgetType: z.string(),
	version: z.string().default( 'elementor-4.1.0' ),
	rawSettings: z.record( JsonValueSchema ).default( {} ),
	editable: z.boolean().default( true ),
	nativeReplacement: z.string().optional(),
} );

export const BuilderNodeSchema: z.ZodTypeAny = z.lazy( () =>
	z.object( {
		id: z.string().default( () => crypto.randomUUID() ),
		type: z.string(),
		name: z.string().optional(),
		props: z.record( JsonValueSchema ).default( {} ),
		layout: z.record( JsonValueSchema ).default( {} ),
		styleRefs: z.array( z.string() ).default( [] ),
		styles: StyleSetSchema.default( createStyleSet() ),
		bindings: z.array( BindingSchema ).default( [] ),
		attributes: z.array( HtmlAttributeSchema ).default( [] ),
		interactions: z.array( InteractionSchema ).default( [] ),
		visibility: VisibilitySchema.default( {
			hidden: false,
			breakpointHidden: {},
			conditionGroups: [],
			display: 'show',
		} ),
		accessibility: AccessibilitySchema.default( {
			decorative: false,
		} ),
		children: z.array( BuilderNodeSchema ).default( [] ),
		slots: z.record( z.array( BuilderNodeSchema ) ).default( {} ),
		legacy: LegacyCompatSchema.optional(),
		meta: z.record( JsonValueSchema ).default( {} ),
	} ),
);

export const ComponentExposureSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	nodeId: z.string(),
	label: z.string(),
	propPath: z.string(),
	source: z.enum( componentExposureSources ).optional(),
	type: z.enum( [ 'text', 'richText', 'image', 'link', 'tag', 'boolean', 'number', 'attribute' ] ),
	required: z.boolean().optional(),
	group: z.string().optional(),
	description: z.string().optional(),
	placeholder: z.string().optional(),
	defaultValue: JsonValueSchema.optional(),
	allowBindings: z.boolean().optional(),
} );

export const ComponentInstancePolicySchema = z.object( {
	allowDetach: z.boolean().default( true ),
	allowRelink: z.boolean().default( true ),
	allowStyleOverrides: z.boolean().default( false ),
	allowClassOverrides: z.boolean().default( false ),
	allowVisibilityOverrides: z.boolean().default( false ),
} );

export const ComponentWorkflowSchema = z.object( {
	lockedStructure: z.boolean().default( true ),
	exposedProperties: z.array( ComponentExposureSchema ).default( [] ),
	libraryGroup: z.string().optional(),
	instancePolicy: ComponentInstancePolicySchema.default( {
		allowDetach: true,
		allowRelink: true,
		allowStyleOverrides: false,
		allowClassOverrides: false,
		allowVisibilityOverrides: false,
	} ),
} );

export const DocumentRevisionSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	documentId: z.string(),
	kind: z.enum( revisionKinds ),
	label: z.string(),
	createdAt: z.string().datetime().default( () => new Date().toISOString() ),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export const ThemeAssignmentSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	documentId: z.string(),
	slot: z.enum( assignmentSlots ).default( 'page' ),
	priority: z.number().default( 0 ),
	status: z.enum( documentStatuses ).default( 'draft' ),
	pathname: z.string().optional(),
	label: z.string().optional(),
	conditionGroups: z.array( ConditionGroupSchema ).default( [] ),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export const CollectionDefinitionSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	name: z.string(),
	source: z.string(),
	query: z.record( JsonValueSchema ).default( {} ),
} );

export const BuilderDocumentSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	schemaVersion: z.string().default( BUILDER_SCHEMA_VERSION ),
	kind: z.enum( documentKinds ),
	title: z.string(),
	slug: z.string(),
	status: z.enum( documentStatuses ).default( 'draft' ),
	createdAt: z.string().datetime().default( () => new Date().toISOString() ),
	updatedAt: z.string().datetime().default( () => new Date().toISOString() ),
	root: z.array( BuilderNodeSchema ).default( [] ),
	component: z.object( {
		lockedStructure: z.boolean().default( true ),
		exposedProperties: z.array( ComponentExposureSchema ).default( [] ),
		libraryGroup: z.string().optional(),
		instancePolicy: ComponentInstancePolicySchema.default( {
			allowDetach: true,
			allowRelink: true,
			allowStyleOverrides: false,
			allowClassOverrides: false,
			allowVisibilityOverrides: false,
		} ),
	} ).optional(),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export const VariableDefinitionSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	name: z.string(),
	label: z.string(),
	kind: z.enum( variableKinds ),
	value: JsonValueSchema,
	description: z.string().optional(),
	group: z.string().optional(),
	source: z.enum( [ 'manual', 'kit', 'theme', 'component' ] ).default( 'manual' ),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export const ClassDefinitionSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	name: z.string(),
	label: z.string(),
	description: z.string().optional(),
	group: z.string().optional(),
	order: z.number().default( 0 ),
	extends: z.array( z.string() ).default( [] ),
	styles: StyleSetSchema.default( createStyleSet() ),
	usageCount: z.number().min( 0 ).default( 0 ),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export const BreakpointDefinitionSchema = z.object( {
	id: z.string(),
	label: z.string(),
	minWidth: z.number().min( 0 ),
} );

export const DesignSystemSchema = z.object( {
	variables: z.array( VariableDefinitionSchema ).default( [] ),
	classes: z.array( ClassDefinitionSchema ).default( [] ),
	breakpoints: z.array( BreakpointDefinitionSchema ).default( [ ...defaultBreakpoints ] ),
	themeStyles: z.record( StyleSetSchema ).default( {} ),
	customCss: z.string().default( '' ),
	experiments: z.record( z.boolean() ).default( {} ),
} );

export const MediaAssetSchema = z.object( {
	id: z.string().default( () => crypto.randomUUID() ),
	kind: z.enum( [ 'image', 'video', 'svg', 'file' ] ),
	url: z.string(),
	alt: z.string().optional(),
	title: z.string().optional(),
	caption: z.string().optional(),
	mimeType: z.string().optional(),
	size: z.number().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	createdAt: z.string().optional(),
	source: z.string().optional(),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export const BuilderPackageSchema = z.object( {
	packageVersion: z.string().default( BUILDER_PACKAGE_VERSION ),
	name: z.string(),
	documents: z.array( BuilderDocumentSchema ),
	themeAssignments: z.array( ThemeAssignmentSchema ).default( [] ),
	designSystem: DesignSystemSchema.default( {
		variables: [],
		classes: [],
		breakpoints: [ ...defaultBreakpoints ],
		themeStyles: {},
		customCss: '',
		experiments: {},
	} ),
	collections: z.array( CollectionDefinitionSchema ).default( [] ),
	revisions: z.array( DocumentRevisionSchema ).default( [] ),
	media: z.array( MediaAssetSchema ).default( [] ),
	meta: z.record( JsonValueSchema ).default( {} ),
} );

export type StyleMap = z.infer<typeof StyleMapSchema>;
export type StyleSet = z.infer<typeof StyleSetSchema>;
export type Binding = z.infer<typeof BindingSchema>;
export type HtmlAttribute = z.infer<typeof HtmlAttributeSchema>;
export type ConditionRule = z.infer<typeof ConditionRuleSchema>;
export type ConditionGroup = z.infer<typeof ConditionGroupSchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type Accessibility = z.infer<typeof AccessibilitySchema>;
export type VisibilityRule = z.infer<typeof VisibilitySchema>;
export type LegacyCompat = z.infer<typeof LegacyCompatSchema>;
export type BuilderNode = z.infer<typeof BuilderNodeSchema>;
export type ComponentExposure = z.infer<typeof ComponentExposureSchema>;
export type ComponentInstancePolicy = z.infer<typeof ComponentInstancePolicySchema>;
export type ComponentWorkflow = z.infer<typeof ComponentWorkflowSchema>;
export type DocumentRevision = z.infer<typeof DocumentRevisionSchema>;
export type ThemeAssignment = z.infer<typeof ThemeAssignmentSchema>;
export type CollectionDefinition = z.infer<typeof CollectionDefinitionSchema>;
export type BuilderDocument = z.infer<typeof BuilderDocumentSchema>;
export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>;
export type ClassDefinition = z.infer<typeof ClassDefinitionSchema>;
export type BreakpointDefinition = z.infer<typeof BreakpointDefinitionSchema>;
export type DesignSystem = z.infer<typeof DesignSystemSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type BuilderPackage = z.infer<typeof BuilderPackageSchema>;
export type DocumentKind = z.infer<typeof BuilderDocumentSchema>['kind'];
export type EditorMode = ( typeof editorModes )[ number ];

export function createStyleSet( input: Partial<StyleSet> = {} ): StyleSet {
	return StyleSetSchema.parse( input );
}

export function createNode( input: Partial<BuilderNode> & Pick<BuilderNode, 'type'> ): BuilderNode {
	return BuilderNodeSchema.parse( input );
}

export function createDocument( kind: DocumentKind, title: string, slug = slugify( title ) ): BuilderDocument {
	return BuilderDocumentSchema.parse( {
		kind,
		title,
		slug,
		component: kind === 'component'
			? {
				lockedStructure: true,
				exposedProperties: [],
				instancePolicy: {
					allowDetach: true,
					allowRelink: true,
					allowStyleOverrides: false,
					allowClassOverrides: false,
					allowVisibilityOverrides: false,
				},
			}
			: undefined,
	} );
}

export function createEmptyDocument( kind: DocumentKind, title: string, slug = slugify( title ) ): BuilderDocument {
	return createDocument( kind, title, slug );
}

export function createThemeAssignment( input: Partial<ThemeAssignment> & Pick<ThemeAssignment, 'documentId'> ): ThemeAssignment {
	return ThemeAssignmentSchema.parse( input );
}

export function createBuilderPackage( name: string, documents: BuilderDocument[] = [], themeAssignments: ThemeAssignment[] = [] ): BuilderPackage {
	return BuilderPackageSchema.parse( {
		name,
		documents,
		themeAssignments,
	} );
}

export function parseBuilderPackage( value: unknown ): BuilderPackage {
	return BuilderPackageSchema.parse( migrateBuilderPackage( value ) );
}

export function migrateBuilderPackage( value: unknown ): unknown {
	if ( !value || typeof value !== 'object' ) {
		return value;
	}

	const candidate = structuredClone( value as Record<string, unknown> );
	candidate.packageVersion ??= BUILDER_PACKAGE_VERSION;
	candidate.themeAssignments ??= [];
	candidate.revisions ??= [];
	candidate.collections ??= [];

	if ( Array.isArray( candidate.documents ) ) {
		candidate.documents = candidate.documents.map( migrateBuilderDocument );
	}

	if ( candidate.designSystem && typeof candidate.designSystem === 'object' ) {
		candidate.designSystem = migrateDesignSystem( candidate.designSystem as Record<string, unknown> );
	} else {
		candidate.designSystem = DesignSystemSchema.parse( {} );
	}

	if ( Array.isArray( candidate.documents ) && Array.isArray( candidate.themeAssignments ) ) {
		for ( const documentValue of candidate.documents as Record<string, unknown>[] ) {
			const documentId = String( documentValue.id ?? '' );
			const routePattern = typeof documentValue.routePattern === 'string' ? documentValue.routePattern : undefined;
			const layoutSlot = typeof documentValue.layoutSlot === 'string' ? documentValue.layoutSlot : undefined;
			if ( !documentId || ( !routePattern && !layoutSlot ) ) {
				continue;
			}

			const alreadyPresent = ( candidate.themeAssignments as unknown[] ).some( (assignmentValue) => {
				return assignmentValue && typeof assignmentValue === 'object' && ( assignmentValue as Record<string, unknown> ).documentId === documentId;
			} );

			if ( alreadyPresent ) {
				continue;
			}

			( candidate.themeAssignments as unknown[] ).push( {
				documentId,
				slot: layoutSlot ?? 'page',
				pathname: routePattern,
				status: documentValue.status ?? 'draft',
				conditionGroups: [],
			} );
		}
	}

	return candidate;
}

export function migrateBuilderDocument( value: unknown ): unknown {
	if ( !value || typeof value !== 'object' ) {
		return value;
	}

	const candidate = structuredClone( value as Record<string, unknown> );
	candidate.schemaVersion ??= BUILDER_SCHEMA_VERSION;

	if ( candidate.content && !candidate.root ) {
		candidate.root = candidate.content;
		delete candidate.content;
	}

	if ( Array.isArray( candidate.root ) ) {
		candidate.root = candidate.root.map( normalizeNode );
	}

	if ( candidate.kind === 'component' && !candidate.component ) {
		candidate.component = {
			lockedStructure: true,
			exposedProperties: [],
			instancePolicy: {
				allowDetach: true,
				allowRelink: true,
				allowStyleOverrides: false,
				allowClassOverrides: false,
				allowVisibilityOverrides: false,
			},
		};
	}

	delete candidate.routePattern;
	delete candidate.layoutSlot;

	return candidate;
}

export function normalizeNode( value: unknown ): BuilderNode {
	const record = ( value && typeof value === 'object' ? structuredClone( value as Record<string, unknown> ) : {} ) as Record<string, unknown>;

	if ( record.elType && !record.type ) {
		record.type = String( record.widgetType ?? record.elType );
	}

	if ( !record.props && record.settings && typeof record.settings === 'object' ) {
		record.props = record.settings as Record<string, JsonValue>;
	}

	if ( !record.children && Array.isArray( record.elements ) ) {
		record.children = ( record.elements as unknown[] ).map( normalizeNode );
	}

	if ( Array.isArray( record.classRefs ) && !record.styleRefs ) {
		record.styleRefs = record.classRefs;
	}

	if ( record.localStyles && !record.styles ) {
		record.styles = {
			base: record.localStyles,
		};
	}

	delete record.settings;
	delete record.elements;
	delete record.elType;
	delete record.widgetType;
	delete record.classRefs;
	delete record.localStyles;

	return BuilderNodeSchema.parse( record );
}

export function getDocumentComponentWorkflow( document: BuilderDocument ): ComponentWorkflow {
	const embedded = document.kind === 'component' && document.component
		? ComponentWorkflowSchema.parse( document.component )
		: ComponentWorkflowSchema.parse( {} );
	const metaValue = parseComponentWorkflowMeta( document.meta.componentWorkflow );

	return ComponentWorkflowSchema.parse( {
		lockedStructure: metaValue?.lockedStructure ?? embedded.lockedStructure,
		exposedProperties: metaValue?.exposedProperties ?? embedded.exposedProperties,
		libraryGroup: metaValue?.libraryGroup ?? embedded.libraryGroup,
		instancePolicy: {
			...embedded.instancePolicy,
			...( metaValue?.instancePolicy ?? {} ),
		},
	} );
}

export function patchDocumentComponentWorkflow( document: BuilderDocument, patch: Partial<ComponentWorkflow> ): BuilderDocument['meta'] {
	const current = getDocumentComponentWorkflow( document );
	const next = ComponentWorkflowSchema.parse( {
		...current,
		...patch,
		exposedProperties: patch.exposedProperties ?? current.exposedProperties,
		instancePolicy: {
			...current.instancePolicy,
			...( patch.instancePolicy ?? {} ),
		},
	} );

	return {
		...document.meta,
		componentWorkflow: JSON.parse( JSON.stringify( next ) ) as JsonValue,
	};
}

export function slugify( value: string ): string {
	return value.trim().toLowerCase().replaceAll( /[^a-z0-9]+/g, '-' ).replaceAll( /^-+|-+$/g, '' );
}

function migrateDesignSystem( value: Record<string, unknown> ): DesignSystem {
	const candidate = structuredClone( value );

	if ( Array.isArray( candidate.classes ) ) {
		candidate.classes = candidate.classes.map( (classValue) => migrateClassDefinition( classValue ) );
	}

	return DesignSystemSchema.parse( candidate );
}

function migrateClassDefinition( value: unknown ): unknown {
	if ( !value || typeof value !== 'object' ) {
		return value;
	}

	const candidate = structuredClone( value as Record<string, unknown> );
	if ( candidate.parentIds && !candidate.extends ) {
		candidate.extends = candidate.parentIds;
		delete candidate.parentIds;
	}

	if ( candidate.styles && isLegacyResponsiveMap( candidate.styles ) ) {
		candidate.styles = convertLegacyResponsiveMap( candidate.styles as Record<string, unknown> );
	}

	return candidate;
}

function isLegacyResponsiveMap( value: unknown ): boolean {
	if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
		return false;
	}

	return Object.values( value ).some( (entry) => {
		return entry && typeof entry === 'object' && 'base' in ( entry as Record<string, unknown> );
	} );
}

function convertLegacyResponsiveMap( value: Record<string, unknown> ): StyleSet {
	const base: StyleMap = {};
	const breakpoints: Record<string, StyleMap> = {};

	for ( const [ property, entry ] of Object.entries( value ) ) {
		if ( !entry || typeof entry !== 'object' || Array.isArray( entry ) ) {
			base[ property ] = entry as JsonValue;
			continue;
		}

		const responsive = entry as Record<string, unknown>;
		if ( 'base' in responsive ) {
			base[ property ] = ( responsive.base ?? '' ) as JsonValue;
		}

		if ( responsive.breakpoints && typeof responsive.breakpoints === 'object' ) {
			for ( const [ breakpointId, breakpointValue ] of Object.entries( responsive.breakpoints as Record<string, unknown> ) ) {
				breakpoints[ breakpointId ] ??= {};
				breakpoints[ breakpointId ][ property ] = breakpointValue as JsonValue;
			}
		}
	}

	return createStyleSet( {
		base,
		breakpoints,
	} );
}

function parseComponentWorkflowMeta( value: JsonValue | undefined ): ComponentWorkflow | undefined {
	if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
		return undefined;
	}

	try {
		return ComponentWorkflowSchema.parse( value );
	} catch {
		return undefined;
	}
}
