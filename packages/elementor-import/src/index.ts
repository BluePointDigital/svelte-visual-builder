import type { BuilderDocument, BuilderNode, BuilderPackage, HtmlAttribute, JsonValue, StyleSet, ThemeAssignment, VariableDefinition } from '@builder/schema';
import { createBuilderPackage, createDocument, createNode, createStyleSet, createThemeAssignment } from '@builder/schema';

export interface ElementorImportWarning {
	code: 'unsupported-widget' | 'legacy-layout-normalized' | 'missing-content' | 'assignment-imported' | 'unsupported-style';
	message: string;
	sourceId?: string;
	sourceType?: string;
}

export interface ElementorImportResult {
	project: BuilderPackage;
	warnings: ElementorImportWarning[];
	parityGaps: Record<string, ElementorParityGapReport>;
}

export interface ElementorParityGapReport {
	documentId: string;
	documentTitle: string;
	documentKind: BuilderDocument['kind'];
	widgetType: string;
	count: number;
	codes: ElementorImportWarning['code'][];
	messages: string[];
	sourceIds: string[];
	sourceTypes: string[];
	nativeReplacement?: string;
	compatKind?: string;
}

interface ElementorKitBridgeData {
	documentId: string;
	documentTitle: string;
	documentKind: BuilderDocument['kind'];
	rawSettings: Record<string, JsonValue>;
	siteIdentity: Record<string, JsonValue>;
	variables: VariableDefinition[];
	themeStyles: Record<string, StyleSet>;
	customCss: string;
	experiments: Record<string, boolean>;
}

interface ElementorDocumentPayload {
	title?: string;
	type?: string;
	page_settings?: Record<string, unknown>;
	content?: ElementorNodePayload[];
	root?: ElementorNodePayload[];
	conditions?: ElementorConditionPayload[];
}

interface ElementorConditionPayload {
	type?: string;
	value?: string;
	slot?: string;
	pathname?: string;
	source?: 'route' | 'query' | 'site' | 'request' | 'load' | 'collection' | 'session' | 'document';
	path?: string;
	operator?: 'equals' | 'contains' | 'matches' | 'startsWith' | 'exists' | 'not-exists' | 'truthy' | 'in';
	priority?: number;
	status?: ThemeAssignment['status'];
	label?: string;
}

interface ImportedElementorDocument {
	document: BuilderDocument;
	assignments: ThemeAssignment[];
	kitBridge?: ElementorKitBridgeData;
}

interface ElementorNodePayload {
	id?: string;
	elType?: string;
	widgetType?: string;
	settings?: Record<string, unknown>;
	elements?: ElementorNodePayload[];
}

export function importElementorPackage( payload: ElementorDocumentPayload | ElementorDocumentPayload[], name = 'Imported Elementor Project' ): ElementorImportResult {
	const warnings: ElementorImportWarning[] = [];
	const parityGaps: Record<string, ElementorParityGapReport> = {};
	const kitBridges: ElementorKitBridgeData[] = [];
	const imported = ( Array.isArray( payload ) ? payload : [ payload ] )
		.map( ( entry, index ) => importElementorDocument( entry, warnings, parityGaps, kitBridges, index ) )
		.filter( Boolean ) as ImportedElementorDocument[];

	const project = createBuilderPackage(
		name,
		imported.map( ( entry ) => entry.document ),
		imported.flatMap( ( entry ) => entry.assignments ),
	);

	applyKitBridgeToProject( project, kitBridges );
	project.meta = {
		...( project.meta ?? {} ),
		importedFrom: 'elementor',
		importBridge: {
			warnings,
			parityGaps,
			kits: kitBridges.map( ( bridge ) => ( {
				documentId: bridge.documentId,
				documentTitle: bridge.documentTitle,
				documentKind: bridge.documentKind,
				rawSettings: bridge.rawSettings,
				siteIdentity: bridge.siteIdentity,
				variableIds: bridge.variables.map( ( variable ) => variable.id ),
				themeStyleKeys: Object.keys( bridge.themeStyles ),
				customCss: bridge.customCss,
				experiments: bridge.experiments,
			} ) ),
		} as unknown as JsonValue,
	};

	return {
		project,
		warnings,
		parityGaps,
	};
}

export function importElementorDocument(
	payload: ElementorDocumentPayload,
	warnings: ElementorImportWarning[] = [],
	parityGaps: Record<string, ElementorParityGapReport> = {},
	kitBridges: ElementorKitBridgeData[] = [],
	index = 0,
): ImportedElementorDocument | null {
	const root = payload.root ?? payload.content;
	if ( !root ) {
		registerParityGap( parityGaps, {
			documentId: `missing-${ index }`,
			documentTitle: payload.title ?? `Imported ${ index + 1 }`,
			documentKind: mapElementorDocumentKind( payload.type ),
			widgetType: 'document',
			code: 'missing-content',
			message: `Elementor document "${ payload.title ?? index }" has no content tree.`,
		} );
		warnings.push( {
			code: 'missing-content',
			message: `Elementor document "${ payload.title ?? index }" has no content tree.`,
		} );
		return null;
	}

	const document = createDocument( mapElementorDocumentKind( payload.type ), payload.title ?? `Imported ${ index + 1 }`, slugify( payload.title ?? `imported-${ index + 1 }` ) );
	document.root = root.map( ( node ) => importNode( node, document, warnings, parityGaps ) );
	document.meta = {
		importedFrom: 'elementor',
		elementorType: payload.type ?? 'page',
		pageSettings: ( payload.page_settings ?? {} ) as Record<string, JsonValue>,
	};
	const kitBridge = extractKitBridge( document, payload.page_settings ?? {} );
	if ( kitBridge ) {
		kitBridges.push( kitBridge );
		document.meta.kitBridge = {
			rawSettingsKeys: Object.keys( kitBridge.rawSettings ),
			siteIdentity: kitBridge.siteIdentity,
			variableIds: kitBridge.variables.map( ( variable ) => variable.id ),
			themeStyleKeys: Object.keys( kitBridge.themeStyles ),
		};
	}

	const assignments = createAssignments( document, payload, warnings );
	return { document, assignments, kitBridge: kitBridge ?? undefined };
}

function createAssignments( document: BuilderDocument, payload: ElementorDocumentPayload, warnings: ElementorImportWarning[] ): ThemeAssignment[] {
	const assignments: ThemeAssignment[] = [];
	const slot = mapElementorSlot( payload.type );
	const conditionAssignments = ( payload.conditions ?? [] )
		.map( ( condition ) => createConditionAssignment( document, payload.type, slot, condition ) )
		.filter( Boolean ) as ThemeAssignment[];

	if ( conditionAssignments.length ) {
		assignments.push( ...conditionAssignments );
	} else if ( slot ) {
		assignments.push( createThemeAssignment( {
			documentId: document.id,
			slot,
			status: 'draft',
			pathname: inferImportedPathname( undefined, slot, document.slug, payload.type ),
			label: document.title,
		} ) );
	}

	for ( const assignment of assignments ) {
		warnings.push( {
			code: 'assignment-imported',
			message: `Imported ${ document.kind } assignment for slot "${ assignment.slot }".`,
			sourceId: document.id,
			sourceType: payload.type,
		} );
	}

	return assignments;
}

function createConditionAssignment(
	document: BuilderDocument,
	documentType: string | undefined,
	defaultSlot: ThemeAssignment['slot'] | null,
	condition: ElementorConditionPayload,
): ThemeAssignment | null {
	const slot = normalizeAssignmentSlot( condition.slot ) ?? inferSlotFromConditionType( condition.type ) ?? defaultSlot;
	if ( !slot ) {
		return null;
	}

	const assignment = createThemeAssignment( {
		documentId: document.id,
		slot,
		status: condition.status ?? 'draft',
		priority: Number.isFinite( Number( condition.priority ) ) ? Number( condition.priority ) : 0,
		pathname: inferImportedPathname( condition.pathname ?? condition.value, slot, document.slug, documentType ),
		label: condition.label ?? document.title,
		meta: compactObject( {
			importedConditionType: condition.type,
			importedConditionValue: condition.value,
			importedConditionSource: condition.source,
			importedConditionPath: condition.path,
			importedConditionOperator: condition.operator,
		} ) as Record<string, JsonValue>,
	} );

	const conditionGroup = createConditionGroupFromImport( condition );
	if ( conditionGroup ) {
		assignment.conditionGroups = [ conditionGroup ];
	}

	return assignment;
}

function createConditionGroupFromImport( condition: ElementorConditionPayload ): ThemeAssignment['conditionGroups'][ number ] | null {
	const explicitSource = condition.source;
	const explicitPath = condition.path;
	let source = explicitSource;
	let path = explicitPath;
	let value = condition.value;

	if ( !source && condition.type === 'query' ) {
		source = 'query';
	}

	if ( source === 'query' && !path && typeof value === 'string' && value.includes( '=' ) ) {
		const [ queryPath, queryValue ] = value.split( '=', 2 );
		path = queryPath;
		value = queryValue;
	}

	if ( !source || !path ) {
		return null;
	}

	return {
		id: crypto.randomUUID(),
		operator: 'and',
		rules: [
			{
				id: crypto.randomUUID(),
				source,
				path,
				operator: condition.operator ?? ( source === 'query' && value === undefined ? 'exists' : 'equals' ),
				value,
				values: [],
			},
		],
	};
}

function normalizeAssignmentSlot( value: unknown ): ThemeAssignment['slot'] | null {
	switch ( String( value ?? '' ).toLowerCase() ) {
		case 'page':
		case 'header':
		case 'footer':
		case 'sidebar':
		case 'popup':
		case 'modal':
		case 'loop-item':
		case 'empty':
			return String( value ) as ThemeAssignment['slot'];
		default:
			return null;
	}
}

function inferSlotFromConditionType( value: string | undefined ): ThemeAssignment['slot'] | null {
	switch ( String( value ?? '' ).toLowerCase() ) {
		case 'header':
		case 'footer':
		case 'sidebar':
		case 'popup':
		case 'modal':
		case 'loop-item':
		case 'empty':
		case 'page':
			return String( value ) as ThemeAssignment['slot'];
		default:
			return null;
	}
}

function inferImportedPathname(
	value: string | undefined,
	slot: ThemeAssignment['slot'],
	documentSlug: string,
	documentType: string | undefined,
): string | undefined {
	const normalized = String( value ?? '' ).trim();
	if ( normalized ) {
		if ( normalized.startsWith( '/' ) ) {
			return normalized;
		}
		if ( normalized === 'all' || normalized === 'entire_site' || normalized === 'site' ) {
			return '/[...all]';
		}
		if ( normalized === 'front_page' || normalized === 'front-page' || normalized === 'home' ) {
			return '/';
		}
	}

	if ( slot === 'header' || slot === 'footer' || slot === 'sidebar' || slot === 'popup' || slot === 'modal' ) {
		return '/[...all]';
	}

	switch ( documentType ) {
		case 'archive':
			return '/blog';
		case 'single':
			return '/blog/[...slug]';
		case 'search-results':
		case 'search':
			return '/search';
		case '404':
			return '/404';
		default:
			break;
	}

	if ( slot === 'page' ) {
		return `/${ documentSlug }`;
	}

	return undefined;
}

function extractKitBridge(
	document: BuilderDocument,
	pageSettings: Record<string, unknown>,
): ElementorKitBridgeData | undefined {
	if ( document.kind !== 'kit' && !hasKitSignals( pageSettings ) ) {
		return undefined;
	}

	const rawSettings = compactObject( pageSettings ) as Record<string, JsonValue>;
	const variables = dedupeVariables( [
		...extractColorVariables( rawSettings ),
		...extractTypographyVariables( rawSettings ),
	] );

	return {
		documentId: document.id,
		documentTitle: document.title,
		documentKind: document.kind,
		rawSettings,
		siteIdentity: extractKitSiteIdentity( rawSettings ),
		variables,
		themeStyles: extractKitThemeStyles( rawSettings ),
		customCss: extractKitCustomCss( rawSettings ),
		experiments: normalizeExperimentFlags( rawSettings ),
	};
}

function applyKitBridgeToProject( project: BuilderPackage, kitBridges: ElementorKitBridgeData[] ): void {
	if ( !kitBridges.length ) {
		return;
	}

	const variableMap = new Map( project.designSystem.variables.map( ( variable ) => [ variable.id, variable ] as const ) );
	for ( const bridge of kitBridges ) {
		for ( const variable of bridge.variables ) {
			variableMap.set( variable.id, variable );
		}
		project.designSystem.themeStyles = {
			...project.designSystem.themeStyles,
			...bridge.themeStyles,
		};
		if ( bridge.customCss ) {
			project.designSystem.customCss = [ project.designSystem.customCss, bridge.customCss ].filter( Boolean ).join( '\n\n' );
		}
		project.designSystem.experiments = {
			...project.designSystem.experiments,
			...bridge.experiments,
		};
	}

	project.designSystem.variables = [ ...variableMap.values() ];
}

function importNode(
	node: ElementorNodePayload,
	document: BuilderDocument,
	warnings: ElementorImportWarning[],
	parityGaps: Record<string, ElementorParityGapReport>,
): BuilderNode {
	const id = node.id ?? crypto.randomUUID();
	const children = ( node.elements ?? [] ).map( ( child ) => importNode( child, document, warnings, parityGaps ) );

	switch ( node.elType ) {
		case 'container':
			registerUnsupportedStyleDiagnostics( document, id, 'container', node.settings ?? {}, warnings, parityGaps );
			return builderNode( id, 'container', node.settings, children );
		case 'section':
		case 'column':
			registerParityGap( parityGaps, {
				documentId: document.id,
				documentTitle: document.title,
				documentKind: document.kind,
				widgetType: node.elType,
				code: 'legacy-layout-normalized',
				message: `Legacy ${ node.elType } "${ id }" was normalized into a container.`,
				sourceId: id,
				sourceType: node.elType,
				nativeReplacement: 'container',
				compatKind: 'container',
			} );
			warnings.push( {
				code: 'legacy-layout-normalized',
				message: `Legacy ${ node.elType } "${ id }" was normalized into a container.`,
				sourceId: id,
				sourceType: node.elType,
			} );
			registerUnsupportedStyleDiagnostics( document, id, node.elType, node.settings ?? {}, warnings, parityGaps );
			return builderNode( id, 'container', {
				...( node.settings ?? {} ),
				legacyType: node.elType,
				display: 'flex',
				direction: firstDefined(
					node.settings?.direction,
					node.settings?.flexDirection,
					node.settings?.flex_direction,
					node.settings?.container_direction,
					node.settings?.content_direction,
					node.elType === 'section' ? 'row' : 'column',
				),
			}, children );
		case 'widget':
			return importWidgetNode( id, node.widgetType ?? 'unknown', node.settings ?? {}, children, warnings, document, parityGaps );
		default:
			registerParityGap( parityGaps, {
				documentId: document.id,
				documentTitle: document.title,
				documentKind: document.kind,
				widgetType: node.widgetType ?? node.elType ?? 'unknown',
				code: 'unsupported-widget',
				message: `Node "${ node.elType ?? 'unknown' }" imported as editable compatibility widget.`,
				sourceId: id,
				sourceType: node.elType,
				nativeReplacement: inferNativeReplacement( node.widgetType ?? node.elType ?? 'unknown' ),
				compatKind: 'compat-widget',
			} );
			return compatNode( id, node.widgetType ?? node.elType ?? 'unknown', node.settings ?? {}, children, inferNativeReplacement( node.widgetType ?? node.elType ?? 'unknown' ) );
	}
}

function importWidgetNode(
	id: string,
	widgetType: string,
	settings: Record<string, unknown>,
	children: BuilderNode[],
	warnings: ElementorImportWarning[],
	document: BuilderDocument,
	parityGaps: Record<string, ElementorParityGapReport>,
): BuilderNode {
	switch ( widgetType ) {
		case 'form':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return importFormWidget( id, settings, warnings, document, parityGaps );
		case 'field-text':
		case 'field-email':
		case 'field-textarea':
		case 'field-select':
		case 'field-checkbox':
		case 'field-radio':
		case 'field-hidden':
		case 'field-submit':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return importFormFieldWidget( id, widgetType, settings );
		case 'heading':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'heading', { text: settings.title ?? 'Heading', level: settings.header_size ?? 'h2' }, children, settings );
		case 'text-editor':
		case 'text':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'text-editor', { text: stripHtml( settings.editor ?? settings.text ?? '' ) }, children, settings );
		case 'blockquote':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'blockquote', { text: stripHtml( settings.quote ?? settings.text ?? settings.content ?? 'Blockquote' ), cite: String( settings.cite ?? settings.author ?? '' ) }, children, settings );
		case 'image':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'image', compactObject( {
				src: extractImageSource( settings.image ),
				alt: extractImageAlt( settings.image ),
				fit: normalizeObjectFit( firstDefined( settings.object_fit, settings.objectFit, settings.image_fit ) ),
			} ), children, settings );
		case 'image-box':
		case 'call-to-action':
		case 'testimonial':
			return importCompositeWidget( id, widgetType, settings, children, document, parityGaps );
		case 'counter':
			return builderNode( id, 'container', {
				title: String( settings.title ?? settings.label ?? 'Counter' ),
				number: String( settings.number ?? settings.value ?? '0' ),
				suffix: String( settings.suffix ?? '' ),
			}, [
				builderNode( `${ id }-number`, 'heading', { text: String( settings.number ?? settings.value ?? '0' ), level: 'h2' }, [], settings ),
				builderNode( `${ id }-label`, 'paragraph', { text: String( settings.title ?? settings.label ?? 'Counter' ) }, [], settings ),
			], settings );
		case 'progress':
		case 'progress-bar':
			return builderNode( id, 'container', {
				label: String( settings.title ?? settings.label ?? 'Progress' ),
				value: Number( settings.percent ?? settings.value ?? settings.percentage ?? 0 ),
			}, [
				builderNode( `${ id }-label`, 'paragraph', { text: String( settings.title ?? settings.label ?? 'Progress' ) }, [], settings ),
				builderNode( `${ id }-bar`, 'container', { value: Number( settings.percent ?? settings.value ?? settings.percentage ?? 0 ) }, [], settings ),
			], settings );
		case 'button':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'button', { text: settings.text ?? settings.button_text ?? 'Button', href: extractLinkHref( settings.link ) }, children, settings );
		case 'spacer':
			return builderNode( id, 'spacer', {}, children, settings );
		case 'divider':
			return builderNode( id, 'divider', {}, children, settings );
		case 'video':
			return builderNode( id, 'video', { src: settings.youtube_url ?? settings.vimeo_url ?? settings.hosted_url ?? '' }, children, settings );
		case 'html':
			return builderNode( id, 'html', { markup: String( settings.html ?? '' ) }, children, settings );
		case 'shortcode':
			return builderNode( id, 'shortcode', { markup: String( settings.shortcode ?? settings.html ?? '' ) }, children, settings );
		case 'tabs':
		case 'nested-tabs':
			return importTabsWidget( id, settings, children );
		case 'accordion':
		case 'nested-accordion':
			return builderNode( id, 'accordion', { items: normalizeToggleItems( settings ) }, children, settings );
		case 'toggle':
			return builderNode( id, 'toggle', { items: normalizeToggleItems( settings ) }, children, settings );
		case 'nav-menu':
		case 'menu':
		case 'nested-menu':
		case 'breadcrumbs':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'menu', {
				items: normalizeMenuItems( settings ),
				orientation: normalizeMenuOrientation( firstDefined( settings.layout, settings.menu_layout, settings.orientation, settings.direction ) ),
				alignment: normalizeElementorAlignment( firstDefined( settings.align_items, settings.align, settings.text_align ) ),
			}, children, settings );
		case 'icon-box':
			return builderNode( id, 'icon-box', { title: settings.title_text ?? 'Icon Box', text: settings.description_text ?? '', symbol: settings.selected_icon && typeof settings.selected_icon === 'object' && 'value' in settings.selected_icon ? String( settings.selected_icon.value ) : 'spark' }, children, settings );
		case 'icon-list':
			return builderNode( id, 'list', { items: Array.isArray( settings.icon_list ) ? settings.icon_list.map( ( item ) => typeof item === 'object' && item && 'text' in item ? String( item.text ) : 'Item' ) : [] }, children, settings );
		case 'menu-anchor':
			return builderNode( id, 'menu', { items: [ { label: settings.anchor ?? 'Anchor', href: `#${ settings.anchor ?? 'anchor' }` } ] }, children, settings );
		case 'social-icons':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'social-icons', {
				items: normalizeSocialIcons( settings ),
				orientation: normalizeMenuOrientation( firstDefined( settings.shape, settings.layout, settings.orientation, settings.direction ) ),
				alignment: normalizeElementorAlignment( firstDefined( settings.align_items, settings.align, settings.text_align ) ),
			}, children, settings );
		case 'gallery':
		case 'image-gallery':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'gallery', { images: normalizeGalleryImages( settings ) }, children, settings );
		case 'image-carousel':
		case 'media-carousel':
		case 'carousel':
		case 'slides':
			registerUnsupportedStyleDiagnostics( document, id, widgetType, settings, warnings, parityGaps );
			return builderNode( id, 'carousel', { slides: normalizeCarouselSlides( settings ) }, children, settings );
		case 'loop-grid':
		case 'posts':
		case 'post-list':
		case 'archive-posts':
			return importLoopWidget( id, settings, children );
		default:
			registerParityGap( parityGaps, {
				documentId: document.id,
				documentTitle: document.title,
				documentKind: document.kind,
				widgetType,
				code: 'unsupported-widget',
				message: `Widget "${ widgetType }" imported as editable compatibility widget.`,
				sourceId: id,
				sourceType: widgetType,
				nativeReplacement: inferNativeReplacement( widgetType ),
				compatKind: 'compat-widget',
			} );
			warnings.push( {
				code: 'unsupported-widget',
				message: `Widget "${ widgetType }" imported as editable compatibility widget.`,
				sourceId: id,
				sourceType: widgetType,
			} );
			return compatNode( id, widgetType, settings, children, inferNativeReplacement( widgetType ) );
	}
}

function importFormWidget(
	id: string,
	settings: Record<string, unknown>,
	warnings: ElementorImportWarning[],
	document: BuilderDocument,
	parityGaps: Record<string, ElementorParityGapReport>,
): BuilderNode {
	const fields = normalizeFormFieldCollection( settings );
	const importedFields = importFormFieldChildren( id, fields, warnings, document, parityGaps );
	const children = importedFields.children;
	const submitLabel = importedFields.submitLabel;

	if ( !children.length ) {
		registerParityGap( parityGaps, {
			documentId: document.id,
			documentTitle: document.title,
			documentKind: document.kind,
			widgetType: 'form',
			code: 'missing-content',
			message: 'Imported form did not expose fields, so a placeholder text field was generated.',
			sourceId: id,
			sourceType: 'form',
			nativeReplacement: 'form-field-text',
			compatKind: 'form-field-text',
		} );
		warnings.push( {
			code: 'missing-content',
			message: 'Imported form did not expose fields, so a placeholder text field was generated.',
			sourceId: id,
			sourceType: 'form',
		} );
		children.push( importFormFieldWidget( `${ id }-field-0`, 'field-text', { field_label: 'Your name', field_placeholder: 'Your name' } ) );
	}

	return builderNode( id, 'form', {
		submitLabel: submitLabel ?? String( settings.submit_button_text ?? settings.submit_label ?? 'Submit' ),
		action: String( settings.form_action ?? settings.action ?? '' ),
		method: String( settings.method ?? 'post' ).toLowerCase(),
		fields: summarizeFormFields( children ),
	}, children, settings );
}

function importTabsWidget( id: string, settings: Record<string, unknown>, children: BuilderNode[] ): BuilderNode {
	const items = normalizeTabItems( settings );
	const triggerNodes = ( items.length ? items : children.map( ( _child, index ) => ( {
		label: `Tab ${ index + 1 }`,
		body: '',
	} ) ) ).map( ( item, index ) =>
		builderNode( `${ id }-trigger-${ index }`, 'button', { text: item.label, href: '#' }, [], settings ),
	);
	const panelNodes = children.length
		? children
		: items.map( ( item, index ) =>
			builderNode(
				`${ id }-panel-${ index }`,
				'container',
				{},
				createTextContentNodes( `${ id }-panel-${ index }`, item.body, settings ),
				settings,
			),
		);

	return {
		...builderNode( id, 'tabs', {
			activeTab: normalizeActiveIndex( settings, items.length || panelNodes.length ),
			items: items.map( ( item ) => compactObject( { label: item.label, content: item.body } ) ) as JsonValue[],
		}, [], settings ),
		slots: compactSlots( {
			triggers: triggerNodes,
			panels: panelNodes,
		} ),
	};
}

function importCompositeWidget(
	id: string,
	widgetType: string,
	settings: Record<string, unknown>,
	children: BuilderNode[],
	document: BuilderDocument,
	parityGaps: Record<string, ElementorParityGapReport>,
): BuilderNode {
	const title = String( settings.title_text ?? settings.title ?? settings.headline ?? settings.heading ?? 'Title' );
	const body = String( settings.description_text ?? settings.description ?? settings.text ?? settings.content ?? '' );
	const image = extractImageSource( settings.image ?? settings.icon ?? settings.avatar );
	const alt = extractImageAlt( settings.image ?? settings.icon ?? settings.avatar ) || title;

	registerParityGap( parityGaps, {
		documentId: document.id,
		documentTitle: document.title,
		documentKind: document.kind,
		widgetType,
		code: 'unsupported-widget',
		message: `Widget "${ widgetType }" was normalized into a composite native layout.`,
		sourceId: id,
		sourceType: widgetType,
		nativeReplacement: 'container',
		compatKind: 'container',
	} );

	return builderNode( id, 'container', {
		title,
		text: body,
	}, [
		...( image ? [ builderNode( `${ id }-image`, 'image', { src: image, alt }, [], settings ) ] : [] ),
		builderNode( `${ id }-title`, 'heading', { text: title, level: 'h3' }, [], settings ),
		...( body ? [ builderNode( `${ id }-body`, 'paragraph', { text: stripHtml( body ) }, [], settings ) ] : [] ),
		...children,
	], settings );
}

function importFormFieldWidget( id: string, widgetType: string, settings: Record<string, unknown> ): BuilderNode {
	const label = String( settings.field_label ?? settings.label ?? settings.title ?? 'Field' );
	const slugName = slugify( label );
	const name = String( settings.field_id ?? settings.field_name ?? settings.name ?? ( slugName || id ) );
	const placeholder = String( settings.field_placeholder ?? settings.placeholder ?? label );

	switch ( widgetType ) {
		case 'field-email':
			return builderNode( id, 'form-field-email', { markup: buildInputMarkup( 'email', label, name, placeholder, settings ) }, [], settings );
		case 'field-textarea':
			return builderNode( id, 'form-field-textarea', { markup: buildTextareaMarkup( label, name, placeholder, settings ) }, [], settings );
		case 'field-select':
			return builderNode( id, 'form-field-select', { markup: buildSelectMarkup( label, name, settings ) }, [], settings );
		case 'field-checkbox':
			return builderNode( id, 'form-field-checkbox', { markup: buildCheckboxMarkup( label, name, settings ) }, [], settings );
		case 'field-radio':
			return builderNode( id, 'form-field-radio', { markup: buildRadioMarkup( label, name, settings ) }, [], settings );
		case 'field-hidden':
			return builderNode( id, 'form-field-hidden', { markup: `<input type="hidden" name="${ escapeHtml( name ) }" value="${ escapeHtml( String( settings.default ?? settings.value ?? '' ) ) }" />` }, [], settings );
		case 'field-submit':
			return builderNode( id, 'form-submit', { markup: `<button type="submit">${ escapeHtml( String( settings.button_text ?? settings.label ?? 'Submit' ) ) }</button>` }, [], settings );
		case 'field-text':
		default:
			return builderNode( id, 'form-field-text', { markup: buildInputMarkup( inferInputType( settings ), label, name, placeholder, settings ) }, [], settings );
	}
}

function importFormFieldChildren(
	id: string,
	fields: unknown[],
	warnings: ElementorImportWarning[],
	document: BuilderDocument,
	parityGaps: Record<string, ElementorParityGapReport>,
): { children: BuilderNode[]; submitLabel?: string } {
	const children: BuilderNode[] = [];
	let submitLabel: string | undefined;

	for ( const [ index, rawField ] of fields.entries() ) {
		const field = asRecord( rawField );
		const fieldId = `${ id }-field-${ index }`;
		const fieldType = String( field.field_type ?? field.type ?? 'text' ).toLowerCase();

		if ( isFormGroupField( field ) ) {
			const groupImport = importFormFieldChildren(
				fieldId,
				normalizeFormFieldCollection( field ),
				warnings,
				document,
				parityGaps,
			);
			if ( groupImport.submitLabel && !submitLabel ) {
				submitLabel = groupImport.submitLabel;
			}
			if ( groupImport.children.length ) {
				const groupLabel = asString( field.field_label ?? field.label ?? field.title ?? field.step_title );
				const groupDescription = asString( field.description ?? field.help_text ?? field.text );
				children.push( builderNode( fieldId, 'container', { fieldGroupType: fieldType }, [
					...( groupLabel ? [ builderNode( `${ fieldId }-label`, 'paragraph', { text: groupLabel }, [], field ) ] : [] ),
					...( groupDescription ? [ builderNode( `${ fieldId }-description`, 'paragraph', { text: stripHtml( groupDescription ) }, [], field ) ] : [] ),
					...groupImport.children,
				], field ) );
			}
			continue;
		}

		if ( fieldType === 'submit' || fieldType === 'field-submit' ) {
			submitLabel = asString( field.button_text ?? field.field_label ?? field.label ?? field.title ) || submitLabel;
			continue;
		}

		if ( isSupportedFormFieldType( fieldType ) ) {
			children.push( importFormFieldWidget( fieldId, inferFormFieldType( field ), field ) );
			continue;
		}

		registerParityGap( parityGaps, {
			documentId: document.id,
			documentTitle: document.title,
			documentKind: document.kind,
			widgetType: `form-field:${ fieldType }`,
			code: 'unsupported-widget',
			message: `Form field "${ fieldType }" imported as editable compatibility widget.`,
			sourceId: fieldId,
			sourceType: fieldType,
			nativeReplacement: inferNativeReplacement( fieldType ),
			compatKind: 'compat-widget',
		} );
		warnings.push( {
			code: 'unsupported-widget',
			message: `Form field "${ fieldType }" imported as editable compatibility widget.`,
			sourceId: fieldId,
			sourceType: fieldType,
		} );
		children.push( compatNode( fieldId, `form-field-${ fieldType }`, field, [], inferNativeReplacement( fieldType ) ) );
	}

	return { children, submitLabel };
}

function inferFormFieldType( field: unknown ): string {
	if ( !field || typeof field !== 'object' ) {
		return 'field-text';
	}

	const record = field as Record<string, unknown>;
	const rawType = String( record.field_type ?? record.type ?? 'text' ).toLowerCase();
	switch ( rawType ) {
		case 'email':
		case 'field-email':
			return 'field-email';
		case 'textarea':
		case 'field-textarea':
			return 'field-textarea';
		case 'select':
		case 'field-select':
			return 'field-select';
		case 'checkbox':
		case 'acceptance':
		case 'field-checkbox':
			return 'field-checkbox';
		case 'radio':
		case 'field-radio':
			return 'field-radio';
		case 'hidden':
		case 'field-hidden':
			return 'field-hidden';
		case 'submit':
		case 'field-submit':
			return 'field-submit';
		default:
			return 'field-text';
	}
}

function normalizeFormFieldCollection( settings: Record<string, unknown> ): unknown[] {
	return Array.isArray( settings.form_fields )
		? settings.form_fields
		: Array.isArray( settings.fields )
			? settings.fields
			: Array.isArray( settings.steps )
				? settings.steps
				: Array.isArray( settings.groups )
					? settings.groups
					: [];
}

function isFormGroupField( field: Record<string, unknown> ): boolean {
	const rawType = String( field.field_type ?? field.type ?? '' ).toLowerCase();
	return [ 'step', 'group', 'fieldset', 'section' ].includes( rawType )
		|| Array.isArray( field.fields )
		|| Array.isArray( field.form_fields );
}

function isSupportedFormFieldType( rawType: string ): boolean {
	return [
		'text',
		'textarea',
		'email',
		'url',
		'tel',
		'phone',
		'number',
		'date',
		'select',
		'checkbox',
		'acceptance',
		'radio',
		'hidden',
		'field-text',
		'field-email',
		'field-textarea',
		'field-select',
		'field-checkbox',
		'field-radio',
		'field-hidden',
	].includes( rawType );
}

function inferInputType( settings: Record<string, unknown> ): string {
	const rawType = String( settings.field_type ?? settings.type ?? settings.input_type ?? 'text' ).toLowerCase();
	switch ( rawType ) {
		case 'email':
			return 'email';
		case 'url':
			return 'url';
		case 'tel':
		case 'phone':
			return 'tel';
		case 'number':
			return 'number';
		case 'date':
			return 'date';
		default:
			return 'text';
	}
}

function normalizeActiveIndex( settings: Record<string, unknown>, count: number ): number {
	const requested = Number( settings.active_tab ?? settings.activeTab ?? settings.active_item ?? settings.activeItem ?? 0 );
	if ( !Number.isFinite( requested ) || requested < 0 || count <= 0 ) {
		return 0;
	}
	return Math.min( requested, Math.max( count - 1, 0 ) );
}

function normalizeTabItems( settings: Record<string, unknown> ): Array<{ label: string; body: string }> {
	const entries = Array.isArray( settings.tabs ) ? settings.tabs : Array.isArray( settings.items ) ? settings.items : [];
	if ( entries.length ) {
		return entries.map( ( item, index ) => {
			const record = asRecord( item );
			return {
				label: asString( record.title ?? record.label ?? record.tab_title ?? record.name ?? `Tab ${ index + 1 }` ) || `Tab ${ index + 1 }`,
				body: asString( record.body ?? record.content ?? record.tab_content ?? record.text ),
			};
		} );
	}

	return extractIndexedContentItems( settings, [ 'title', 'tab_title', 'label' ], [ 'content', 'tab_content', 'body', 'text' ] ).map( ( item, index ) => ( {
		label: item.title || `Tab ${ index + 1 }`,
		body: item.body,
	} ) );
}

function normalizeToggleItems( settings: Record<string, unknown> ): Array<{ title: string; body: string }> {
	if ( Array.isArray( settings.items ) ) {
		return settings.items.map( ( item ) => ( {
			title: asString( ( item as Record<string, unknown> ).title ?? ( item as Record<string, unknown> ).label ?? ( item as Record<string, unknown> ).tab_title ?? 'Item' ) || 'Item',
			body: asString( ( item as Record<string, unknown> ).body ?? ( item as Record<string, unknown> ).content ?? ( item as Record<string, unknown> ).tab_content ?? '' ),
		} ) );
	}

	if ( Array.isArray( settings.tabs ) ) {
		return settings.tabs.map( ( item ) => ( {
			title: asString( ( item as Record<string, unknown> ).title ?? ( item as Record<string, unknown> ).label ?? ( item as Record<string, unknown> ).tab_title ?? 'Item' ) || 'Item',
			body: asString( ( item as Record<string, unknown> ).body ?? ( item as Record<string, unknown> ).content ?? ( item as Record<string, unknown> ).tab_content ?? '' ),
		} ) );
	}

	const indexed = extractIndexedContentItems( settings, [ 'title', 'tab_title', 'label' ], [ 'content', 'tab_content', 'body', 'text' ] );
	if ( indexed.length ) {
		return indexed.map( ( item ) => ( { title: item.title || 'Item', body: item.body } ) );
	}

	return [ { title: String( settings.title ?? 'Item' ), body: String( settings.content ?? settings.text ?? '' ) } ];
}

function normalizeSocialIcons( settings: Record<string, unknown> ): Array<{ label: string; href: string }> {
	const icons = Array.isArray( settings.social_icons ) ? settings.social_icons : Array.isArray( settings.items ) ? settings.items : [];
	if ( !icons.length ) {
		return [ { label: 'Social', href: '#' } ];
	}

	return icons.map( ( icon ) => ( {
		label: String( ( icon as Record<string, unknown> ).title ?? ( icon as Record<string, unknown> ).label ?? ( icon as Record<string, unknown> ).text ?? ( icon as Record<string, unknown> ).icon ?? 'Social' ),
		href: extractLinkHref( ( icon as Record<string, unknown> ).link ?? ( icon as Record<string, unknown> ).url ),
	} ) );
}

function normalizeMenuItems( settings: Record<string, unknown> ): Array<{ label: string; href: string }> {
	const items = Array.isArray( settings.items )
		? settings.items
		: Array.isArray( settings.menu_items )
			? settings.menu_items
			: Array.isArray( settings.menu )
				? settings.menu
				: Array.isArray( settings.links )
					? settings.links
					: [];
	if ( !items.length ) {
		return [ { label: 'Link', href: '#' } ];
	}

	return items.map( ( item ) => {
		if ( item && typeof item === 'object' ) {
			const record = item as Record<string, unknown>;
			return {
				label: asString( record.label ?? record.title ?? record.text ?? record.name ?? record.anchor_text ?? record.menu_title ?? 'Link' ) || 'Link',
				href: extractLinkHref( record.link ?? record.url ?? record.href ),
			};
		}

		return {
			label: String( item ),
			href: '#',
		};
	} );
}

function normalizeGalleryImages( settings: Record<string, unknown> ): string[] {
	const rawImages = Array.isArray( settings.images )
		? settings.images
		: Array.isArray( settings.gallery )
			? settings.gallery
			: Array.isArray( settings.ids )
				? settings.ids
				: Array.isArray( settings.carousel )
					? settings.carousel
					: [];
	if ( !rawImages.length ) {
		return [ '' ];
	}

	return rawImages.map( ( image ) => {
		if ( typeof image === 'string' ) {
			return image;
		}
		if ( image && typeof image === 'object' ) {
			const record = image as Record<string, unknown>;
			return extractImageSource( record.image ?? record.thumbnail ?? record.media ?? record );
		}
		return '';
	} ).filter( Boolean );
}

function normalizeCarouselSlides( settings: Record<string, unknown> ): Array<{ title: string; caption?: string; image?: string; href?: string }> {
	const rawSlides = Array.isArray( settings.slides )
		? settings.slides
		: Array.isArray( settings.items )
			? settings.items
			: Array.isArray( settings.carousel )
				? settings.carousel
				: Array.isArray( settings.images )
					? settings.images
					: [];
	if ( !rawSlides.length ) {
		return [ { title: 'Slide 1' } ];
	}

	return rawSlides.map( ( slide, index ) => {
		if ( slide && typeof slide === 'object' ) {
			const record = slide as Record<string, unknown>;
			return {
				title: asString( record.title ?? record.label ?? record.heading ?? record.tab_title ?? `Slide ${ index + 1 }` ) || `Slide ${ index + 1 }`,
				caption: asString( record.caption ?? record.text ?? record.body ?? record.description ) || undefined,
				image: extractImageSource( record.image ?? record.background_image ?? record.thumbnail ?? record.media ),
				href: extractLinkHref( record.link ?? record.url ?? record.href ),
			};
		}

		return {
			title: String( slide ?? `Slide ${ index + 1 }` ),
		};
	} );
}

function importLoopWidget( id: string, settings: Record<string, unknown>, children: BuilderNode[] ): BuilderNode {
	const collection = normalizeLoopCollection( settings );
	const limit = normalizePositiveNumber( settings.posts_per_page ?? settings.limit ?? settings.posts_count ?? settings.number, 3 );
	const emptyText = asString( settings.empty_text ?? settings.empty_message ?? settings.no_results_text ?? settings.nothing_found_message ?? 'No content found' ) || 'No content found';
	const itemNodes = children.length ? children : createDefaultLoopItemNodes( id, settings );
	const emptyNodes = createDefaultLoopEmptyNodes( id, settings, emptyText );

	return {
		...builderNode( id, 'loop', {
			collection,
			limit,
			emptyText,
			query: compactObject( {
				source: asString( settings.source ?? settings.query_source ?? settings.post_type ),
				filter: asString( settings.filter ?? settings.query_filter ),
				orderBy: asString( settings.orderby ?? settings.order_by ),
			} ),
		}, [], settings ),
		slots: compactSlots( {
			item: itemNodes,
			empty: emptyNodes,
		} ),
	};
}

function normalizeLoopCollection( settings: Record<string, unknown> ): string {
	const source = slugify( asString( settings.collection ?? settings.source ?? settings.query_source ?? settings.post_type ?? 'posts' ) ) || 'posts';
	if ( source === 'post' || source === 'posts' ) {
		return 'posts';
	}
	return source;
}

function normalizePositiveNumber( value: unknown, fallback: number ): number {
	const numeric = Number( value );
	return Number.isFinite( numeric ) && numeric > 0 ? numeric : fallback;
}

function createDefaultLoopItemNodes( id: string, settings: Record<string, unknown> ): BuilderNode[] {
	const headingText = asString( settings.item_heading ?? settings.title ?? settings.template_title ) || 'Loop item';
	const bodyText = asString( settings.item_description ?? settings.description ?? settings.excerpt ) || 'Collection-driven item content';
	return [
		builderNode( `${ id }-item`, 'container', {}, [
			createBoundTextNode( `${ id }-item-title`, 'heading', headingText, 'title', settings, 'h3' ),
			createBoundTextNode( `${ id }-item-body`, 'paragraph', bodyText, 'excerpt', settings ),
		], settings ),
	];
}

function createDefaultLoopEmptyNodes( id: string, settings: Record<string, unknown>, emptyText: string ): BuilderNode[] {
	if ( !emptyText ) {
		return [];
	}

	return [
		builderNode( `${ id }-empty`, 'paragraph', { text: emptyText }, [], settings ),
	];
}

function createBoundTextNode(
	id: string,
	type: 'heading' | 'paragraph',
	text: string,
	bindingPath: string,
	settings: Record<string, unknown>,
	level = 'h2',
): BuilderNode {
	return createNode( {
		id,
		type,
		props: compactObject( type === 'heading' ? { text, level } : { text } ) as Record<string, JsonValue>,
		styles: createStyleSet( { base: extractStyleMap( settings ) } ),
		bindings: [
			{
				id: `${ id }-binding`,
				targetKind: 'prop',
				target: 'text',
				source: 'collection',
				path: bindingPath,
				args: {},
			},
		],
		meta: {
			imported: true,
			loopTemplate: true,
		},
	} );
}

function summarizeFormFields( children: BuilderNode[] ): JsonValue[] {
	return children.map( ( child ) => compactObject( {
		id: child.id,
		type: child.type,
		label: asString( child.props.label ?? child.props.title ?? child.name ),
	} ) as Record<string, JsonValue> );
}

function createTextContentNodes( id: string, body: string, settings: Record<string, unknown> ): BuilderNode[] {
	if ( !body ) {
		return [];
	}

	if ( hasMarkup( body ) ) {
		return [ builderNode( `${ id }-html`, 'html', { markup: body }, [], settings ) ];
	}

	return [ builderNode( `${ id }-text`, 'paragraph', { text: stripHtml( body ) }, [], settings ) ];
}

function hasMarkup( value: string ): boolean {
	return /<[^>]+>/.test( value );
}

function extractIndexedContentItems(
	settings: Record<string, unknown>,
	titleKeys: string[],
	bodyKeys: string[],
): Array<{ title: string; body: string }> {
	const indexed = new Map<number, { title?: string; body?: string }>();
	for ( const [ key, value ] of Object.entries( settings ) ) {
		const match = key.match( /^(?:tab_)?([a-z]+)_(\d+)$/i );
		if ( !match ) {
			continue;
		}
		const [, rawKey, rawIndex ] = match;
		const normalizedKey = String( rawKey ?? '' ).toLowerCase();
		const index = Number( rawIndex );
		const existing = indexed.get( index ) ?? {};
		if ( titleKeys.includes( normalizedKey ) ) {
			existing.title = asString( value );
		}
		if ( bodyKeys.includes( normalizedKey ) ) {
			existing.body = asString( value );
		}
		indexed.set( index, existing );
	}

	return [ ...indexed.entries() ]
		.sort( ( [ left ], [ right ] ) => left - right )
		.map( ( [ , entry ] ) => ( {
			title: entry.title ?? 'Item',
			body: entry.body ?? '',
		} ) )
		.filter( ( entry ) => entry.title || entry.body );
}

function compactSlots( slots: Record<string, BuilderNode[]> ): Record<string, BuilderNode[]> {
	return Object.fromEntries( Object.entries( slots ).filter( ( [ , nodes ] ) => nodes.length ) );
}

function registerParityGap( parityGaps: Record<string, ElementorParityGapReport>, entry: {
	documentId: string;
	documentTitle: string;
	documentKind: BuilderDocument['kind'];
	widgetType: string;
	code: ElementorImportWarning['code'];
	message: string;
	sourceId?: string;
	sourceType?: string;
	nativeReplacement?: string;
	compatKind?: string;
} ): void {
	const key = `${ entry.documentId }::${ entry.widgetType }`;
	const existing = parityGaps[ key ];
	if ( existing ) {
		existing.count += 1;
		if ( !existing.codes.includes( entry.code ) ) {
			existing.codes.push( entry.code );
		}
		if ( !existing.messages.includes( entry.message ) ) {
			existing.messages.push( entry.message );
		}
		if ( entry.sourceId && !existing.sourceIds.includes( entry.sourceId ) ) {
			existing.sourceIds.push( entry.sourceId );
		}
		if ( entry.sourceType && !existing.sourceTypes.includes( entry.sourceType ) ) {
			existing.sourceTypes.push( entry.sourceType );
		}
		if ( !existing.nativeReplacement && entry.nativeReplacement ) {
			existing.nativeReplacement = entry.nativeReplacement;
		}
		if ( !existing.compatKind && entry.compatKind ) {
			existing.compatKind = entry.compatKind;
		}
		return;
	}

	parityGaps[ key ] = {
		documentId: entry.documentId,
		documentTitle: entry.documentTitle,
		documentKind: entry.documentKind,
		widgetType: entry.widgetType,
		count: 1,
		codes: [ entry.code ],
		messages: [ entry.message ],
		sourceIds: entry.sourceId ? [ entry.sourceId ] : [],
		sourceTypes: entry.sourceType ? [ entry.sourceType ] : [],
		nativeReplacement: entry.nativeReplacement,
		compatKind: entry.compatKind,
	};
}

function buildInputMarkup( inputType: string, label: string, name: string, placeholder: string, settings: Record<string, unknown> ): string {
	const required = settings.field_required ? ' required' : '';
	return `<label class="builder-form-field"><span>${ escapeHtml( label ) }</span><input type="${ escapeHtml( inputType ) }" name="${ escapeHtml( name ) }" placeholder="${ escapeHtml( placeholder ) }"${ required } /></label>`;
}

function buildTextareaMarkup( label: string, name: string, placeholder: string, settings: Record<string, unknown> ): string {
	const required = settings.field_required ? ' required' : '';
	const rows = Number( settings.field_rows ?? settings.rows ?? 5 );
	return `<label class="builder-form-field"><span>${ escapeHtml( label ) }</span><textarea name="${ escapeHtml( name ) }" rows="${ Number.isFinite( rows ) && rows > 0 ? rows : 5 }" placeholder="${ escapeHtml( placeholder ) }"${ required }></textarea></label>`;
}

function buildSelectMarkup( label: string, name: string, settings: Record<string, unknown> ): string {
	const options = Array.isArray( settings.field_options ) ? settings.field_options : Array.isArray( settings.options ) ? settings.options : [];
	const optionMarkup = options.length ? options.map( ( option ) => {
		if ( option && typeof option === 'object' ) {
			const record = option as Record<string, unknown>;
			return `<option value="${ escapeHtml( String( record.value ?? record.label ?? record.text ?? '' ) ) }">${ escapeHtml( String( record.label ?? record.text ?? record.value ?? 'Option' ) ) }</option>`;
		}
		return `<option>${ escapeHtml( String( option ) ) }</option>`;
	} ).join( '' ) : '<option>Option</option>';
	return `<label class="builder-form-field"><span>${ escapeHtml( label ) }</span><select name="${ escapeHtml( name ) }">${ optionMarkup }</select></label>`;
}

function buildCheckboxMarkup( label: string, name: string, settings: Record<string, unknown> ): string {
	const checked = settings.checked ? ' checked' : '';
	return `<label class="builder-form-field builder-form-field--checkbox"><input type="checkbox" name="${ escapeHtml( name ) }"${ checked } /><span>${ escapeHtml( label ) }</span></label>`;
}

function buildRadioMarkup( label: string, name: string, settings: Record<string, unknown> ): string {
	const options = Array.isArray( settings.field_options ) ? settings.field_options : Array.isArray( settings.options ) ? settings.options : [];
	const optionMarkup = options.length ? options.map( ( option ) => {
		if ( option && typeof option === 'object' ) {
			const record = option as Record<string, unknown>;
			const value = String( record.value ?? record.label ?? record.text ?? '' );
			const optionLabel = String( record.label ?? record.text ?? value );
			return `<label><input type="radio" name="${ escapeHtml( name ) }" value="${ escapeHtml( value ) }" /> ${ escapeHtml( optionLabel ) }</label>`;
		}
		return `<label><input type="radio" name="${ escapeHtml( name ) }" value="${ escapeHtml( String( option ) ) }" /> ${ escapeHtml( String( option ) ) }</label>`;
	} ).join( '' ) : `<label><input type="radio" name="${ escapeHtml( name ) }" value="${ escapeHtml( label ) }" /> ${ escapeHtml( label ) }</label>`;
	return `<fieldset class="builder-form-field builder-form-field--radio"><legend>${ escapeHtml( label ) }</legend>${ optionMarkup }</fieldset>`;
}

function escapeHtml( value: string ): string {
	return value
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' )
		.replaceAll( "'", '&#39;' );
}

function stripHtml( value: unknown ): string {
	return String( value ?? '' ).replaceAll( /<[^>]*>/g, '' );
}

function builderNode(
	id: string,
	type: string,
	props: Record<string, unknown> = {},
	children: BuilderNode[] = [],
	settings: Record<string, unknown> = {},
): BuilderNode {
	const sourceSettings = Object.keys( settings ).length ? settings : props;
	const layout = type === 'container' ? extractContainerLayout( sourceSettings, props ) : {};
	const baseStyles = extractStyleMap( sourceSettings );
	const customCss = extractCustomCss( sourceSettings );
	if ( customCss && extractOverlayCss( sourceSettings ) && !baseStyles.position ) {
		baseStyles.position = 'relative';
	}
	return createNode( {
		id,
		type,
		props: compactObject( omitContainerLayoutProps( props ) ) as Record<string, JsonValue>,
		layout: compactObject( layout ) as Record<string, JsonValue>,
		styles: createStyleSet( {
			base: baseStyles,
			states: extractStateStyleMaps( sourceSettings ),
			breakpoints: extractBreakpointStyleMaps( sourceSettings ),
			stateBreakpoints: extractStateBreakpointStyleMaps( sourceSettings ),
			customCss,
		} ),
		attributes: extractHtmlAttributes( sourceSettings ),
		children,
		meta: {
			imported: true,
		},
	} );
}

function extractContainerLayout( settings: Record<string, unknown>, props: Record<string, unknown> = {} ): Record<string, unknown> {
	const display = settings.display ?? props.display ?? 'flex';
	const direction = normalizeFlexDirection(
		settings.direction
		?? settings.flexDirection
		?? settings.flex_direction
		?? settings.container_direction
		?? settings.content_direction
		?? props.direction
		?? props.flexDirection
		?? props.flex_direction
		?? 'column',
	);

	return {
		display,
		direction,
		wrap: firstDefined( settings.wrap, settings.flex_wrap, props.wrap ),
		gap: extractCssSize( firstDefined( settings.gap, settings.flex_gap, settings.space_between_widgets, settings.space_between, settings.column_gap, props.gap ) ),
		width: extractCssSize( firstDefined( settings.width, settings.content_width, props.width ) ),
		maxWidth: extractCssSize( firstDefined( settings.maxWidth, settings.max_width, props.maxWidth ) ),
		minHeight: extractCssSize( firstDefined( settings.minHeight, settings.min_height, props.minHeight ) ),
		overflow: firstDefined( settings.overflow, settings.overflow_hidden === 'yes' ? 'hidden' : undefined, props.overflow ),
		position: normalizePositionValue( firstDefined( settings.position, settings._position, settings.element_position, props.position ) ),
		zIndex: extractUnitlessCssNumber( firstDefined( settings.z_index, settings.zIndex, settings._z_index, props.zIndex ) ),
		top: extractCssSize( firstDefined( settings.top, settings.offset_y, settings._offset_y, props.top ) ),
		right: extractCssSize( firstDefined( settings.right, props.right ) ),
		bottom: extractCssSize( firstDefined( settings.bottom, props.bottom ) ),
		left: extractCssSize( firstDefined( settings.left, settings.offset_x, settings._offset_x, props.left ) ),
		justifyContent: normalizeElementorAlignment( firstDefined(
			settings.justifyContent,
			settings.justify_content,
			settings.flex_justify_content,
			settings.content_justify_content,
			settings.content_position,
			props.justifyContent,
		) ),
		alignItems: normalizeElementorAlignment( firstDefined(
			settings.alignItems,
			settings.align_items,
			settings.flex_align_items,
			settings.content_align_items,
			settings.align,
			props.alignItems,
		) ),
		alignContent: normalizeElementorAlignment( firstDefined( settings.alignContent, settings.align_content, props.alignContent ) ),
	};
}

function normalizeFlexDirection( value: unknown ): string {
	const normalized = String( value ?? '' ).trim().toLowerCase().replaceAll( '_', '-' );
	switch ( normalized ) {
		case 'row':
		case 'row-reverse':
		case 'column-reverse':
			return normalized;
		case 'column':
		default:
			return 'column';
	}
}

function normalizeOptionalFlexDirection( value: unknown ): string | undefined {
	if ( value === undefined || value === null || value === '' ) {
		return undefined;
	}
	return normalizeFlexDirection( value );
}

function omitContainerLayoutProps( props: Record<string, unknown> ): Record<string, unknown> {
	const {
		display: _display,
		direction: _direction,
		flexDirection: _flexDirection,
		flex_direction: _flexDirectionSnake,
		wrap: _wrap,
		gap: _gap,
		width: _width,
		maxWidth: _maxWidth,
		max_width: _maxWidthSnake,
		minHeight: _minHeight,
		min_height: _minHeightSnake,
		justifyContent: _justifyContent,
		justify_content: _justifyContentSnake,
		alignItems: _alignItems,
		align_items: _alignItemsSnake,
		alignContent: _alignContent,
		align_content: _alignContentSnake,
		overflow: _overflow,
		position: _position,
		zIndex: _zIndex,
		z_index: _zIndexSnake,
		top: _top,
		right: _right,
		bottom: _bottom,
		left: _left,
		...rest
	} = props;
	return rest;
}

function compatNode(id: string, widgetType: string, settings: Record<string, unknown>, children: BuilderNode[], nativeReplacement?: string, compatKind = 'compat-widget'): BuilderNode {
	return createNode( {
		id,
		type: 'compat-widget',
		props: {
			title: sentenceCase( widgetType ),
		},
		children,
		legacy: {
			widgetType,
			rawSettings: settings as Record<string, JsonValue>,
			editable: true,
			compatKind,
			nativeReplacement,
		},
		meta: compactObject( {
			imported: true,
			importedFrom: 'elementor',
			compatKind,
			nativeReplacement,
		} ) as Record<string, JsonValue>,
	} );
}

function mapElementorDocumentKind( type?: string ): BuilderDocument['kind'] {
	switch ( type ) {
		case 'kit':
			return 'kit';
		case 'header':
		case 'footer':
		case 'sidebar':
		case 'theme-part':
			return 'layout';
		case 'popup':
		case 'modal':
			return 'popup';
		case 'archive':
		case 'single':
		case 'search-results':
		case 'search':
		case '404':
		case 'loop-item':
		case 'empty':
			return 'template';
		case 'section':
			return 'library-item';
		default:
			return 'page';
	}
}

function mapElementorSlot( type?: string ): ThemeAssignment['slot'] | null {
	switch ( type ) {
		case 'kit':
			return null;
		case 'header':
			return 'header';
		case 'footer':
			return 'footer';
		case 'sidebar':
			return 'sidebar';
		case 'popup':
			return 'popup';
		case 'modal':
			return 'modal';
		case 'loop-item':
			return 'loop-item';
		case 'empty':
			return 'empty';
		default:
			return 'page';
	}
}

function slugify( value: string ): string {
	return value.trim().toLowerCase().replaceAll( /[^a-z0-9]+/g, '-' ).replaceAll( /^-+|-+$/g, '' );
}

function extractImageSource( value: unknown ): string {
	return value && typeof value === 'object' && 'url' in value && typeof value.url === 'string' ? value.url : '';
}

function extractImageAlt( value: unknown ): string {
	return value && typeof value === 'object' && 'alt' in value && typeof value.alt === 'string' ? value.alt : '';
}

function extractLinkHref( value: unknown ): string {
	return value && typeof value === 'object' && 'url' in value && typeof value.url === 'string' ? value.url : '#';
}

function extractStyleMap( settings: Record<string, unknown> ): Record<string, JsonValue> {
	const background = extractBackgroundStyles( settings );
	const border = extractBorderStyles( settings );
	const effects = extractEffectStyles( settings );
	const widget = extractWidgetStyleAliases( settings );
	return compactObject( {
		color: extractColorValue( settings.text_color ?? settings.color ),
		...background,
		textAlign: normalizeElementorTextAlignment( firstDefined( settings.align, settings.text_align, settings.textAlign ) ),
		display: settings.display,
		flexDirection: normalizeOptionalFlexDirection( firstDefined( settings.direction, settings.flexDirection, settings.flex_direction, settings.container_direction, settings.content_direction ) ),
		justifyContent: normalizeElementorAlignment( firstDefined( settings.justifyContent, settings.justify_content, settings.flex_justify_content, settings.content_justify_content, settings.content_position ) ),
		alignItems: normalizeElementorAlignment( firstDefined( settings.alignItems, settings.align_items, settings.flex_align_items, settings.content_align_items ) ),
		alignContent: normalizeElementorAlignment( firstDefined( settings.alignContent, settings.align_content ) ),
		borderRadius: extractBoxValue( firstDefined( settings.border_radius, settings.radius, settings.borderRadius ) ),
		fontFamily: firstDefined( settings.font_family, settings.fontFamily, settings.typography_font_family ),
		fontSize: extractCssSize( firstDefined( settings.font_size, settings.fontSize, settings.typography_font_size ) ),
		fontWeight: firstDefined( settings.font_weight, settings.fontWeight, settings.typography_font_weight ),
		lineHeight: extractCssSize( firstDefined( settings.line_height, settings.lineHeight, settings.typography_line_height ) ),
		letterSpacing: extractCssSize( firstDefined( settings.letter_spacing, settings.letterSpacing, settings.typography_letter_spacing ) ),
		textTransform: firstDefined( settings.text_transform, settings.textTransform, settings.typography_text_transform ),
		textDecoration: firstDefined( settings.text_decoration, settings.textDecoration, settings.typography_text_decoration ),
		padding: extractBoxValue( firstDefined( settings.padding, settings._padding, settings.element_padding ) ),
		margin: extractBoxValue( firstDefined( settings.margin, settings._margin, settings.element_margin ) ),
		gap: extractCssSize( firstDefined( settings.gap, settings.flex_gap, settings.space_between_widgets, settings.space_between, settings.column_gap ) ),
		width: extractCssSize( firstDefined( settings.width, settings.image_width, settings.button_width, settings._element_width, settings._element_custom_width ) ),
		height: extractCssSize( firstDefined( settings.height, settings.image_height ) ),
		maxWidth: extractCssSize( settings.max_width ?? settings.maxWidth ),
		minHeight: extractCssSize( settings.min_height ?? settings.minHeight ),
		objectFit: normalizeObjectFit( firstDefined( settings.object_fit, settings.objectFit, settings.image_fit ) ),
		objectPosition: normalizeBackgroundPosition( firstDefined( settings.object_position, settings.objectPosition, settings.image_position ) ),
		overflow: firstDefined( settings.overflow, settings.overflow_hidden === 'yes' ? 'hidden' : undefined ),
		position: normalizePositionValue( firstDefined( settings.position, settings._position, settings.element_position ) ),
		zIndex: extractUnitlessCssNumber( firstDefined( settings.z_index, settings.zIndex, settings._z_index ) ),
		top: extractCssSize( firstDefined( settings.top, settings.offset_y, settings._offset_y ) ),
		right: extractCssSize( settings.right ),
		bottom: extractCssSize( settings.bottom ),
		left: extractCssSize( firstDefined( settings.left, settings.offset_x, settings._offset_x ) ),
		...border,
		...effects,
		...widget,
	} ) as Record<string, JsonValue>;
}

function extractBreakpointStyleMaps( settings: Record<string, unknown> ): Record<string, Record<string, JsonValue>> {
	const output: Record<string, Record<string, JsonValue>> = {};
	for ( const breakpoint of [ 'desktop', 'tablet', 'mobile' ] ) {
		const breakpointSettings = extractSuffixedSettings( settings, breakpoint );
		if ( !Object.keys( breakpointSettings ).length ) {
			continue;
		}
		const styleMap = extractStyleMap( breakpointSettings );
		if ( Object.keys( styleMap ).length ) {
			output[ breakpoint ] = styleMap;
		}
	}
	return output;
}

function extractStateStyleMaps( settings: Record<string, unknown> ): Record<string, Record<string, JsonValue>> {
	const output: Record<string, Record<string, JsonValue>> = {};
	for ( const state of [ 'hover', 'focus', 'active' ] ) {
		const stateSettings = extractStateSettings( settings, state );
		if ( !Object.keys( stateSettings ).length ) {
			continue;
		}
		const styleMap = extractStyleMap( stateSettings );
		if ( Object.keys( styleMap ).length ) {
			output[ state ] = styleMap;
		}
	}
	return output;
}

function extractStateBreakpointStyleMaps( settings: Record<string, unknown> ): Record<string, Record<string, Record<string, JsonValue>>> {
	const output: Record<string, Record<string, Record<string, JsonValue>>> = {};
	for ( const breakpoint of [ 'desktop', 'tablet', 'mobile' ] ) {
		const breakpointSettings = extractSuffixedSettings( settings, breakpoint );
		for ( const [ state, stateStyles ] of Object.entries( extractStateStyleMaps( breakpointSettings ) ) ) {
			output[ breakpoint ] ??= {};
			output[ breakpoint ][ state ] = stateStyles;
		}
	}
	return output;
}

function extractStateSettings( settings: Record<string, unknown>, state: string ): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	const suffix = `_${ state }`;
	const infix = `_${ state }_`;
	const prefix = `${ state }_`;
	for ( const [ key, value ] of Object.entries( settings ) ) {
		if ( key.endsWith( suffix ) ) {
			output[ key.slice( 0, -suffix.length ) ] = value;
			continue;
		}
		if ( key.includes( infix ) ) {
			output[ key.replace( infix, '_' ) ] = value;
			continue;
		}
		if ( key.startsWith( prefix ) ) {
			output[ key.slice( prefix.length ) ] = value;
		}
	}
	return output;
}

function extractSuffixedSettings( settings: Record<string, unknown>, suffix: string ): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	const marker = `_${ suffix }`;
	for ( const [ key, value ] of Object.entries( settings ) ) {
		if ( !key.endsWith( marker ) ) {
			continue;
		}
		output[ key.slice( 0, -marker.length ) ] = value;
	}
	return output;
}

function extractBackgroundStyles( settings: Record<string, unknown> ): Record<string, JsonValue | undefined> {
	const backgroundColor = extractColorValue( firstDefined(
		settings.background_color,
		settings.backgroundColor,
		settings._background_color,
		settings.bg_color,
		extractNestedBackgroundValue( settings.background, 'color' ),
	) );
	const backgroundImage = extractBackgroundImage( settings );
	const backgroundPosition = normalizeBackgroundPosition( firstDefined(
		settings.background_position,
		settings.backgroundPosition,
		settings._background_position,
		extractNestedBackgroundValue( settings.background, 'position' ),
	) );
	const backgroundSize = normalizeBackgroundSize( firstDefined(
		settings.background_size,
		settings.backgroundSize,
		settings._background_size,
		extractNestedBackgroundValue( settings.background, 'size' ),
	) );
	const backgroundRepeat = normalizeBackgroundRepeat( firstDefined(
		settings.background_repeat,
		settings.backgroundRepeat,
		settings._background_repeat,
		extractNestedBackgroundValue( settings.background, 'repeat' ),
	) );
	const backgroundAttachment = asString( firstDefined(
		settings.background_attachment,
		settings.backgroundAttachment,
		settings._background_attachment,
		extractNestedBackgroundValue( settings.background, 'attachment' ),
	) ) || undefined;
	const backgroundBlendMode = asString( firstDefined( settings.background_blend_mode, settings.backgroundBlendMode, settings._background_blend_mode ) ) || undefined;

	return {
		backgroundColor,
		backgroundImage,
		backgroundPosition,
		backgroundSize,
		backgroundRepeat,
		backgroundAttachment,
		backgroundBlendMode,
		background: backgroundColor && !backgroundImage ? backgroundColor : undefined,
	};
}

function extractNestedBackgroundValue( value: unknown, key: string ): unknown {
	const record = asRecord( value );
	return firstDefined( record[ key ], record[ `background_${ key }` ] );
}

function extractBackgroundImage( settings: Record<string, unknown>, prefix = 'background' ): string | undefined {
	const gradient = extractGradient( settings, prefix );
	if ( gradient ) {
		return gradient;
	}

	const image = firstDefined(
		settings[ `${ prefix }_image` ],
		settings[ `${ prefix }Image` ],
		prefix === 'background' ? settings._background_image : undefined,
		extractNestedBackgroundValue( settings[ prefix ], 'image' ),
	);
	const url = extractMediaUrl( image );
	return url ? `url("${ escapeCssString( url ) }")` : undefined;
}

function extractGradient( settings: Record<string, unknown>, prefix = 'background' ): string | undefined {
	const type = asString( firstDefined( settings[ `${ prefix }_background` ], settings[ `${ prefix }_type` ], settings[ `${ prefix }Type` ] ) ).toLowerCase();
	const firstColor = extractColorValue( firstDefined(
		settings[ `${ prefix }_color` ],
		settings[ `${ prefix }_color_a` ],
		settings[ `${ prefix }_gradient_color` ],
	) );
	const secondColor = extractColorValue( firstDefined(
		settings[ `${ prefix }_color_b` ],
		settings[ `${ prefix }_gradient_second_color` ],
		settings[ `${ prefix }_second_color` ],
	) );
	if ( !firstColor || !secondColor || ( type && type !== 'gradient' ) ) {
		return undefined;
	}

	const angle = extractUnitlessCssNumber( firstDefined( settings[ `${ prefix }_gradient_angle` ], settings[ `${ prefix }_angle` ] ) ) ?? '180';
	const firstLocation = extractUnitlessCssNumber( firstDefined( settings[ `${ prefix }_color_stop` ], settings[ `${ prefix }_gradient_location` ] ) );
	const secondLocation = extractUnitlessCssNumber( firstDefined( settings[ `${ prefix }_color_b_stop` ], settings[ `${ prefix }_gradient_second_location` ] ) );
	const firstStop = firstLocation ? `${ firstColor } ${ firstLocation }%` : String( firstColor );
	const secondStop = secondLocation ? `${ secondColor } ${ secondLocation }%` : String( secondColor );
	return `linear-gradient(${ angle }deg, ${ firstStop }, ${ secondStop })`;
}

function extractBorderStyles( settings: Record<string, unknown> ): Record<string, JsonValue | undefined> {
	const borderStyle = firstDefined( settings.border_style, settings.borderStyle, settings.border_border, settings._border_border );
	const borderWidth = extractBoxValue( settings.border_width ?? settings.borderWidth ?? settings._border_width );
	const borderColor = extractColorValue( settings.border_color ?? settings.borderColor ?? settings._border_color );
	const normalizedStyle = normalizeBorderStyle( borderStyle );

	return {
		borderWidth,
		borderStyle: normalizedStyle,
		borderColor,
		border: asString( settings.border ) || synthesizeBorder( normalizedStyle, borderWidth, borderColor ),
		borderRadius: extractBoxValue( firstDefined( settings.border_radius, settings.radius, settings.borderRadius, settings._border_radius ) ),
		boxShadow: extractBoxShadow( firstDefined( settings.box_shadow, settings.boxShadow, settings._box_shadow ) ),
	};
}

function extractEffectStyles( settings: Record<string, unknown> ): Record<string, JsonValue | undefined> {
	return {
		opacity: extractOpacity( firstDefined( settings.opacity, settings._opacity ) ),
		filter: extractCssFilter( settings ),
		transform: extractTransform( settings ),
		mixBlendMode: asString( firstDefined( settings.mix_blend_mode, settings.mixBlendMode, settings.blend_mode ) ) || undefined,
	};
}

function extractWidgetStyleAliases( settings: Record<string, unknown> ): Record<string, JsonValue | undefined> {
	return {
		fieldGap: extractCssSize( firstDefined( settings.field_gap, settings.row_gap, settings.fields_gap ) ),
		labelSpacing: extractCssSize( firstDefined( settings.label_spacing, settings.label_gap ) ),
		inputPadding: extractBoxValue( firstDefined( settings.input_padding, settings.field_padding ) ),
		inputBackground: extractColorValue( firstDefined( settings.input_background_color, settings.field_background_color ) ),
		inputBorderRadius: extractBoxValue( firstDefined( settings.input_border_radius, settings.field_border_radius ) ),
		submitPadding: extractBoxValue( firstDefined( settings.button_padding, settings.submit_padding ) ),
		itemPadding: extractBoxValue( firstDefined( settings.item_padding, settings.menu_item_padding ) ),
		itemBackground: extractColorValue( firstDefined( settings.item_background_color, settings.menu_item_background_color ) ),
		itemColor: extractColorValue( firstDefined( settings.item_text_color, settings.item_color, settings.menu_item_color ) ),
		captionAlign: normalizeElementorTextAlignment( firstDefined( settings.caption_align, settings.caption_alignment ) ),
		columns: extractUnitlessCssNumber( firstDefined( settings.columns, settings.gallery_columns, settings.slides_per_view ) ),
	};
}

function firstDefined( ...values: unknown[] ): unknown {
	return values.find( ( value ) => value !== undefined && value !== null && value !== '' );
}

function extractCssSize( value: unknown ): JsonValue | undefined {
	if ( value === undefined || value === null || value === '' ) {
		return undefined;
	}
	if ( typeof value === 'number' ) {
		return Number.isFinite( value ) ? `${ value }px` : undefined;
	}
	if ( typeof value === 'string' ) {
		return value;
	}
	const record = asRecord( value );
	const size = firstDefined( record.size, record.value );
	const unit = asString( record.unit ) || 'px';
	if ( size !== undefined && size !== null && size !== '' ) {
		return `${ size }${ unit }`;
	}
	return undefined;
}

function extractBoxValue( value: unknown ): JsonValue | undefined {
	if ( value === undefined || value === null || value === '' ) {
		return undefined;
	}
	if ( typeof value === 'string' || typeof value === 'number' ) {
		return extractCssSize( value );
	}
	const record = asRecord( value );
	const unit = asString( record.unit ) || 'px';
	const top = firstDefined( record.top, record.Top );
	const right = firstDefined( record.right, record.Right );
	const bottom = firstDefined( record.bottom, record.Bottom );
	const left = firstDefined( record.left, record.Left );
	if ( top !== undefined || right !== undefined || bottom !== undefined || left !== undefined ) {
		const values = [
			formatCssBoxSide( top, unit ),
			formatCssBoxSide( right ?? top, unit ),
			formatCssBoxSide( bottom ?? top, unit ),
			formatCssBoxSide( left ?? right ?? top, unit ),
		];
		return values.every( Boolean ) ? values.join( ' ' ) : undefined;
	}
	return extractCssSize( value );
}

function extractUnitlessCssNumber( value: unknown ): JsonValue | undefined {
	if ( value === undefined || value === null || value === '' ) {
		return undefined;
	}
	if ( typeof value === 'number' ) {
		return Number.isFinite( value ) ? value : undefined;
	}
	const record = asRecord( value );
	const source = Object.keys( record ).length ? firstDefined( record.size, record.value ) : value;
	const text = String( source ?? '' ).trim();
	return text || undefined;
}

function extractMediaUrl( value: unknown ): string {
	if ( typeof value === 'string' ) {
		return value;
	}
	const record = asRecord( value );
	return asString( firstDefined( record.url, record.src, record.source, asRecord( record.image ).url ) );
}

function extractOpacity( value: unknown ): JsonValue | undefined {
	const raw = extractUnitlessCssNumber( value );
	if ( raw === undefined ) {
		return undefined;
	}
	const numeric = Number( raw );
	if ( Number.isFinite( numeric ) && numeric > 1 ) {
		return String( numeric / 100 );
	}
	return raw;
}

function extractBoxShadow( value: unknown ): JsonValue | undefined {
	if ( value === undefined || value === null || value === '' ) {
		return undefined;
	}
	if ( typeof value === 'string' ) {
		return value;
	}
	const record = asRecord( value );
	if ( record.box_shadow_type === 'no' || record.enabled === false ) {
		return undefined;
	}
	const horizontal = formatCssBoxSide( firstDefined( record.horizontal, record.h_offset, record.x ), 'px' );
	const vertical = formatCssBoxSide( firstDefined( record.vertical, record.v_offset, record.y ), 'px' );
	const blur = formatCssBoxSide( firstDefined( record.blur, record.blur_radius ), 'px' );
	const spread = formatCssBoxSide( firstDefined( record.spread, record.spread_radius ), 'px' );
	const color = extractColorValue( record.color ) ?? 'rgba(0, 0, 0, 0.2)';
	if ( [ horizontal, vertical, blur, spread ].every( ( part ) => part === '0' ) && !record.color ) {
		return undefined;
	}
	const inset = record.position === 'inset' || record.inset ? ' inset' : '';
	return `${ horizontal } ${ vertical } ${ blur } ${ spread } ${ color }${ inset }`;
}

function extractCssFilter( settings: Record<string, unknown> ): JsonValue | undefined {
	const filters = [
		createFilterFunction( 'blur', firstDefined( settings.filter_blur, settings.css_filters_blur ), 'px' ),
		createFilterFunction( 'brightness', firstDefined( settings.filter_brightness, settings.css_filters_brightness ), '%' ),
		createFilterFunction( 'contrast', firstDefined( settings.filter_contrast, settings.css_filters_contrast ), '%' ),
		createFilterFunction( 'saturate', firstDefined( settings.filter_saturate, settings.css_filters_saturation ), '%' ),
		normalizeHueFilter( firstDefined( settings.filter_hue, settings.css_filters_hue ) ),
	].filter( Boolean );
	return filters.length ? filters.join( ' ' ) : undefined;
}

function createFilterFunction( name: string, value: unknown, unit: string ): string | undefined {
	const raw = extractUnitlessCssNumber( value );
	return raw === undefined ? undefined : `${ name }(${ raw }${ unit })`;
}

function normalizeHueFilter( value: unknown ): string | undefined {
	const raw = extractUnitlessCssNumber( value );
	return raw === undefined ? undefined : `hue-rotate(${ raw }deg)`;
}

function extractTransform( settings: Record<string, unknown> ): JsonValue | undefined {
	const transforms = [
		createTranslateTransform( 'X', firstDefined( settings.translate_x, settings._translate_x, settings.motion_fx_translateX_effect ) ),
		createTranslateTransform( 'Y', firstDefined( settings.translate_y, settings._translate_y, settings.motion_fx_translateY_effect ) ),
		createRotateTransform( firstDefined( settings.rotate, settings._rotate, settings.transform_rotate ) ),
		createScaleTransform( firstDefined( settings.scale, settings._scale, settings.transform_scale ) ),
	].filter( Boolean );
	return transforms.length ? transforms.join( ' ' ) : undefined;
}

function createTranslateTransform( axis: 'X' | 'Y', value: unknown ): string | undefined {
	const size = extractCssSize( value );
	return size ? `translate${ axis }(${ size })` : undefined;
}

function createRotateTransform( value: unknown ): string | undefined {
	const raw = extractUnitlessCssNumber( value );
	return raw === undefined ? undefined : `rotate(${ raw }deg)`;
}

function createScaleTransform( value: unknown ): string | undefined {
	const raw = extractUnitlessCssNumber( value );
	return raw === undefined ? undefined : `scale(${ raw })`;
}

function synthesizeBorder( style: unknown, width: JsonValue | undefined, color: JsonValue | undefined ): string | undefined {
	if ( !style || !width || !color ) {
		return undefined;
	}
	const widthParts = String( width ).trim().split( /\s+/ );
	const borderWidth = widthParts.length === 1 ? widthParts[ 0 ] : widthParts[ 0 ] || '1px';
	return `${ borderWidth } ${ style } ${ color }`;
}

function normalizeBorderStyle( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase();
	if ( !normalized || normalized === 'none' || normalized === 'no' || normalized === 'default' ) {
		return undefined;
	}
	return normalized;
}

function normalizePositionValue( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', '-' );
	if ( !normalized || normalized === 'default' ) {
		return undefined;
	}
	if ( normalized === 'absolute' || normalized === 'fixed' || normalized === 'relative' || normalized === 'sticky' ) {
		return normalized;
	}
	return undefined;
}

function normalizeObjectFit( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', '-' );
	if ( [ 'cover', 'contain', 'fill', 'none', 'scale-down' ].includes( normalized ) ) {
		return normalized;
	}
	return undefined;
}

function normalizeBackgroundSize( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', '-' );
	if ( normalized === 'auto' || normalized === 'cover' || normalized === 'contain' ) {
		return normalized;
	}
	return extractCssSize( value ) as string | undefined;
}

function normalizeBackgroundRepeat( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', '-' );
	if ( [ 'repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round' ].includes( normalized ) ) {
		return normalized;
	}
	return undefined;
}

function normalizeBackgroundPosition( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', ' ' ).replaceAll( '-', ' ' );
	if ( !normalized ) {
		return undefined;
	}
	if ( normalized === 'initial' || normalized === 'default' ) {
		return undefined;
	}
	return normalized;
}

function normalizeMenuOrientation( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase();
	if ( normalized === 'vertical' || normalized === 'column' ) {
		return 'vertical';
	}
	if ( normalized === 'horizontal' || normalized === 'row' || normalized === 'inline' ) {
		return 'horizontal';
	}
	return undefined;
}

function formatCssBoxSide( value: unknown, unit: string ): string {
	if ( value === undefined || value === null || value === '' ) {
		return '0';
	}
	if ( typeof value === 'number' ) {
		return Number.isFinite( value ) ? `${ value }${ unit }` : '0';
	}
	const text = String( value ).trim();
	return /^-?\d+(?:\.\d+)?$/.test( text ) ? `${ text }${ unit }` : text;
}

function normalizeElementorAlignment( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', '-' );
	switch ( normalized ) {
		case 'left':
		case 'top':
		case 'start':
			return 'start';
		case 'right':
		case 'bottom':
		case 'end':
			return 'end';
		case 'middle':
			return 'center';
		default:
			return normalized || undefined;
	}
}

function normalizeElementorTextAlignment( value: unknown ): string | undefined {
	const normalized = asString( value ).trim().toLowerCase().replaceAll( '_', '-' );
	switch ( normalized ) {
		case 'start':
			return 'left';
		case 'end':
			return 'right';
		default:
			return normalized || undefined;
	}
}

function extractHtmlAttributes( settings: Record<string, unknown> ): HtmlAttribute[] {
	const attributes: HtmlAttribute[] = [];
	const htmlId = asString( firstDefined( settings.html_id, settings._element_id, settings.css_id, settings.anchor ) ).trim().replace( /^#/, '' );
	const className = normalizeClassList( firstDefined( settings.css_classes, settings._css_classes, settings.class, settings.className ) );
	if ( htmlId ) {
		attributes.push( { id: crypto.randomUUID(), name: 'id', value: htmlId, kind: 'static' } );
	}
	if ( className ) {
		attributes.push( { id: crypto.randomUUID(), name: 'class', value: className, kind: 'static' } );
	}
	return attributes;
}

function normalizeClassList( value: unknown ): string {
	if ( Array.isArray( value ) ) {
		return value.map( asString ).map( ( entry ) => entry.trim().replace( /^\./, '' ) ).filter( Boolean ).join( ' ' );
	}
	return asString( value )
		.split( /\s+/ )
		.map( ( entry ) => entry.trim().replace( /^\./, '' ) )
		.filter( Boolean )
		.join( ' ' );
}

function extractCustomCss( settings: Record<string, unknown> ): string {
	return [
		normalizeScopedCustomCss( asString( firstDefined( settings.custom_css, settings.customCss, settings._custom_css ) ) ),
		extractOverlayCss( settings ),
	].filter( Boolean ).join( '\n\n' );
}

function normalizeScopedCustomCss( value: string ): string {
	const trimmed = value.trim();
	if ( !trimmed ) {
		return '';
	}
	return trimmed.includes( 'selector' ) || trimmed.includes( '{' ) ? trimmed : `selector { ${ trimmed } }`;
}

function extractOverlayCss( settings: Record<string, unknown> ): string {
	const overlaySettings = extractOverlaySettings( settings );
	const overlayBackground = extractOverlayBackground( overlaySettings );
	if ( !overlayBackground ) {
		return '';
	}
	const opacity = extractOpacity( firstDefined( overlaySettings.opacity, overlaySettings.background_overlay_opacity, overlaySettings._background_overlay_opacity ) );
	const blendMode = firstDefined( overlaySettings.mix_blend_mode, overlaySettings.background_overlay_blend_mode, overlaySettings._background_overlay_blend_mode );
	const declarations = [
		'content: "";',
		'position: absolute;',
		'inset: 0;',
		'pointer-events: none;',
		'z-index: 0;',
		overlayBackground,
		opacity !== undefined ? `opacity: ${ opacity };` : '',
		blendMode ? `mix-blend-mode: ${ blendMode };` : '',
	].filter( Boolean ).join( ' ' );
	return [
		'selector { position: relative; }',
		`selector::before { ${ declarations } }`,
		'selector > * { position: relative; z-index: 1; }',
	].join( '\n' );
}

function extractOverlaySettings( settings: Record<string, unknown> ): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	for ( const [ key, value ] of Object.entries( settings ) ) {
		if ( key.startsWith( 'background_overlay_' ) ) {
			output[ key.slice( 'background_overlay_'.length ) ] = value;
		}
		if ( key.startsWith( '_background_overlay_' ) ) {
			output[ key.slice( '_background_overlay_'.length ) ] = value;
		}
	}
	return output;
}

function extractOverlayBackground( settings: Record<string, unknown> ): string {
	const image = extractBackgroundImage( settings );
	const color = extractColorValue( firstDefined( settings.color, settings.background_color ) );
	const parts = [
		color ? `background-color: ${ color };` : '',
		image ? `background-image: ${ image };` : '',
		normalizeBackgroundPosition( settings.position ) ? `background-position: ${ normalizeBackgroundPosition( settings.position ) };` : '',
		normalizeBackgroundSize( settings.size ) ? `background-size: ${ normalizeBackgroundSize( settings.size ) };` : '',
		normalizeBackgroundRepeat( settings.repeat ) ? `background-repeat: ${ normalizeBackgroundRepeat( settings.repeat ) };` : '',
	].filter( Boolean );
	return parts.join( ' ' );
}

function registerUnsupportedStyleDiagnostics(
	document: BuilderDocument,
	sourceId: string,
	sourceType: string | undefined,
	settings: Record<string, unknown>,
	warnings: ElementorImportWarning[],
	parityGaps: Record<string, ElementorParityGapReport>,
): void {
	const unsupported = Object.keys( settings ).filter( ( key ) => isUnsupportedStyleKey( key, settings[ key ] ) );
	if ( !unsupported.length ) {
		return;
	}
	const unique = [ ...new Set( unsupported ) ];
	const message = `Unsupported Elementor style keys were preserved where possible or skipped: ${ unique.join( ', ' ) }.`;
	registerParityGap( parityGaps, {
		documentId: document.id,
		documentTitle: document.title,
		documentKind: document.kind,
		widgetType: sourceType ?? 'element',
		code: 'unsupported-style',
		message,
		sourceId,
		sourceType,
		nativeReplacement: inferNativeReplacement( sourceType ?? '' ),
	} );
	warnings.push( {
		code: 'unsupported-style',
		message,
		sourceId,
		sourceType,
	} );
}

function isUnsupportedStyleKey( key: string, value: unknown ): boolean {
	const normalized = key.toLowerCase();
	if ( value === undefined || value === null || value === '' ) {
		return false;
	}
	return [
		'motion_fx',
		'entrance_animation',
		'animation',
		'background_video',
		'background_slideshow',
		'background_ken_burns',
		'mask_',
		'dynamic',
	].some( ( marker ) => normalized.includes( marker ) );
}

function escapeCssString( value: string ): string {
	return value.replaceAll( '\\', '\\\\' ).replaceAll( '"', '\\"' );
}

function hasKitSignals( settings: Record<string, unknown> ): boolean {
	return [
		'global_colors',
		'globalColors',
		'global_typography',
		'globalTypography',
		'custom_css',
		'customCss',
		'theme_style_button',
		'theme_style_buttons',
		'theme_style_form_fields',
		'theme_style_headings',
		'theme_style_links',
		'site_identity',
		'siteIdentity',
	].some( ( key ) => key in settings );
}

function extractKitSiteIdentity( settings: Record<string, unknown> ): Record<string, JsonValue> {
	return compactObject( {
		siteName: settings.site_name ?? settings.siteName,
		logoText: settings.logo_text ?? settings.logoText,
		description: settings.site_description ?? settings.siteDescription,
		pageWidth: settings.page_width ?? settings.pageWidth,
		supportEmail: settings.support_email ?? settings.supportEmail,
		favicon: settings.favicon,
		logo: settings.site_logo ?? settings.siteLogo,
	} ) as Record<string, JsonValue>;
}

function extractColorVariables( settings: Record<string, unknown> ): VariableDefinition[] {
	const variables: VariableDefinition[] = [];
	const colorCollections = [
		settings.global_colors,
		settings.globalColors,
		settings.system_colors,
		settings.systemColors,
		settings.colors,
		settings.theme_colors,
		settings.themeColors,
	].flatMap( ( collection ) => normalizeIterableSettings( collection ) );

	for ( const [ key, entry ] of colorCollections ) {
		const value = extractColorValue( entry.color ?? entry.value ?? entry.hex ?? entry.rgba ?? entry );
		if ( value === undefined ) {
			continue;
		}
		const baseName = slugify( String( entry.name ?? entry.label ?? entry.title ?? key ) ) || key;
		variables.push( {
			id: String( entry.id ?? `kit-color-${ baseName }` ),
			name: String( entry.name ?? baseName ),
			label: String( entry.label ?? entry.title ?? entry.name ?? sentenceCase( baseName ) ),
			kind: 'color',
			value,
			source: 'kit',
			meta: compactObject( {
				sourceKey: key,
				originalLabel: entry.title ?? entry.label,
			} ) as Record<string, JsonValue>,
		} );
	}

	for ( const [ key, value ] of Object.entries( settings ) ) {
		if ( /(?:^|_)(?:primary|secondary|accent|success|warning|danger|info|brand)(?:_|$)/i.test( key ) && typeof value !== 'object' ) {
			variables.push( {
				id: `kit-color-${ slugify( key ) || key }`,
				name: slugify( key ) || key,
				label: sentenceCase( key ),
				kind: 'color',
				value: String( value ),
				source: 'kit',
				meta: { sourceKey: key },
			} );
		}
	}

	return variables;
}

function extractTypographyVariables( settings: Record<string, unknown> ): VariableDefinition[] {
	const variables: VariableDefinition[] = [];
	const typographyCollections = [
		settings.global_typography,
		settings.globalTypography,
		settings.typography,
		settings.site_typography,
		settings.siteTypography,
	].flatMap( ( collection ) => normalizeIterableSettings( collection ) );

	for ( const [ key, entry ] of typographyCollections ) {
		const baseName = slugify( String( entry.name ?? entry.label ?? entry.title ?? key ) ) || key;
		const family = asString( entry.font_family ?? entry.fontFamily ?? entry.family ?? entry.typography ?? entry.font );
		const size = asString( entry.font_size ?? entry.fontSize ?? entry.size );
		const weight = asString( entry.font_weight ?? entry.fontWeight ?? entry.weight );
		const lineHeight = asString( entry.line_height ?? entry.lineHeight );
		const letterSpacing = asString( entry.letter_spacing ?? entry.letterSpacing );

		if ( family ) {
			variables.push( {
				id: String( entry.id ?? `kit-font-family-${ baseName }` ),
				name: `${ baseName }-font-family`,
				label: `${ sentenceCase( baseName ) } Font Family`,
				kind: 'font-family',
				value: family,
				source: 'kit',
				meta: { sourceKey: key },
			} );
		}
		if ( size ) {
			variables.push( {
				id: String( entry.id ?? `kit-font-size-${ baseName }` ),
				name: `${ baseName }-font-size`,
				label: `${ sentenceCase( baseName ) } Font Size`,
				kind: 'font-size',
				value: size,
				source: 'kit',
				meta: { sourceKey: key },
			} );
		}
		if ( weight ) {
			variables.push( {
				id: String( entry.id ?? `kit-font-weight-${ baseName }` ),
				name: `${ baseName }-font-weight`,
				label: `${ sentenceCase( baseName ) } Font Weight`,
				kind: 'number',
				value: Number.isFinite( Number( weight ) ) ? Number( weight ) : weight,
				source: 'kit',
				meta: { sourceKey: key },
			} );
		}
		if ( lineHeight ) {
			variables.push( {
				id: String( entry.id ?? `kit-line-height-${ baseName }` ),
				name: `${ baseName }-line-height`,
				label: `${ sentenceCase( baseName ) } Line Height`,
				kind: 'raw',
				value: lineHeight,
				source: 'kit',
				meta: { sourceKey: key },
			} );
		}
		if ( letterSpacing ) {
			variables.push( {
				id: String( entry.id ?? `kit-letter-spacing-${ baseName }` ),
				name: `${ baseName }-letter-spacing`,
				label: `${ sentenceCase( baseName ) } Letter Spacing`,
				kind: 'raw',
				value: letterSpacing,
				source: 'kit',
				meta: { sourceKey: key },
			} );
		}
	}

	return variables;
}

function extractKitThemeStyles( settings: Record<string, unknown> ): Record<string, StyleSet> {
	const themeStyles: Record<string, StyleSet> = {};

	for ( const [ key, value ] of Object.entries( settings ) ) {
		if ( /^theme[_-]?style[_-]/i.test( key ) || /^themeStyle[A-Z_]/.test( key ) ) {
			const styleKey = normalizeThemeStyleKey( key );
			if ( !styleKey ) {
				continue;
			}
			themeStyles[ styleKey ] = extractStyleSetFromKitValue( value );
		}
	}

	return themeStyles;
}

function extractStyleSetFromKitValue( value: unknown ): StyleSet {
	const record = asRecord( value );
	const baseSource = asRecord( record.base ?? record.styles ?? record.default ?? record );
	const statesSource = asRecord( record.states );
	const breakpointsSource = asRecord( record.breakpoints );
	const stateBreakpointsSource = asRecord( record.stateBreakpoints );

	return createStyleSet( {
		base: extractStyleMap( baseSource ),
		states: Object.fromEntries( Object.entries( statesSource ).map( ( [ state, stateValue ] ) => [ state, extractStyleMap( asRecord( stateValue ) ) ] ) ),
		breakpoints: Object.fromEntries( Object.entries( breakpointsSource ).map( ( [ breakpoint, breakpointValue ] ) => [ breakpoint, extractStyleMap( asRecord( breakpointValue ) ) ] ) ),
		stateBreakpoints: Object.fromEntries( Object.entries( stateBreakpointsSource ).map( ( [ state, breakpointsValue ] ) => [ state, Object.fromEntries( Object.entries( asRecord( breakpointsValue ) ).map( ( [ breakpoint, breakpointValue ] ) => [ breakpoint, extractStyleMap( asRecord( breakpointValue ) ) ] ) ) ] ) ),
		customCss: asString( record.customCss ?? record.custom_css ),
	} );
}

function extractKitCustomCss( settings: Record<string, unknown> ): string {
	return asString( settings.custom_css ?? settings.customCss );
}

function normalizeExperimentFlags( settings: Record<string, unknown> ): Record<string, boolean> {
	const experimentSources = [
		settings.experiments,
		settings.experiment_flags,
		settings.experimentFlags,
	];
	const experiments: Record<string, boolean> = {};

	for ( const source of experimentSources ) {
		const record = asRecord( source );
		for ( const [ key, value ] of Object.entries( record ) ) {
			experiments[ key ] = Boolean( value );
		}
	}

	return experiments;
}

function normalizeThemeStyleKey( key: string ): string | null {
	const normalized = key
		.replace( /^theme[_-]?style[_-]?/i, '' )
		.replaceAll( /([a-z0-9])([A-Z])/g, '$1-$2' )
		.replaceAll( /[_\s]+/g, '-' )
		.toLowerCase();

	if ( !normalized ) {
		return null;
	}

	if ( normalized.includes( 'button' ) ) {
		return 'buttons';
	}
	if ( normalized.includes( 'form' ) ) {
		return 'forms';
	}
	if ( normalized.includes( 'heading' ) ) {
		return 'headings';
	}
	if ( normalized.includes( 'link' ) ) {
		return 'links';
	}
	if ( normalized.includes( 'card' ) ) {
		return 'cards';
	}

	return normalized;
}

function normalizeIterableSettings( value: unknown ): Array<[ string, Record<string, unknown> ]> {
	if ( Array.isArray( value ) ) {
		return value.map( ( entry, index ) => {
			if ( entry && typeof entry === 'object' ) {
				const record = entry as Record<string, unknown>;
				return [
					String( record.id ?? record.name ?? record.label ?? record.title ?? index ),
					record,
				] as [ string, Record<string, unknown> ];
			}
			return [ String( index ), { value: entry as JsonValue } ];
		} );
	}

	const record = asRecord( value );
	if ( Object.keys( record ).length ) {
		return Object.entries( record ).map( ( [ key, entry ] ) => [ key, asRecord( entry ) ] as [ string, Record<string, unknown> ] );
	}

	return [];
}

function extractColorValue( value: unknown ): JsonValue | undefined {
	if ( value === null || value === undefined ) {
		return undefined;
	}
	if ( typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ) {
		return value;
	}
	if ( Array.isArray( value ) ) {
		return value as JsonValue[];
	}
	const record = asRecord( value );
	if ( typeof record.value === 'string' || typeof record.value === 'number' || typeof record.value === 'boolean' ) {
		return record.value;
	}
	if ( typeof record.color === 'string' || typeof record.color === 'number' || typeof record.color === 'boolean' ) {
		return record.color;
	}
	if ( typeof record.hex === 'string' ) {
		return record.hex;
	}
	if ( typeof record.rgba === 'string' ) {
		return record.rgba;
	}
	return compactObject( record ) as Record<string, JsonValue>;
}

function asString( value: unknown ): string {
	if ( value === null || value === undefined ) {
		return '';
	}
	if ( typeof value === 'string' ) {
		return value;
	}
	if ( typeof value === 'number' || typeof value === 'boolean' ) {
		return String( value );
	}
	if ( typeof value === 'object' ) {
		const record = value as Record<string, unknown>;
		return asString( record.value ?? record.text ?? record.label ?? record.name ?? record.color ?? record.hex ?? '' );
	}
	return '';
}

function asRecord( value: unknown ): Record<string, unknown> {
	if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
		return {};
	}
	return value as Record<string, unknown>;
}

function dedupeVariables( variables: VariableDefinition[] ): VariableDefinition[] {
	const seen = new Set<string>();
	return variables.filter( ( variable ) => {
		if ( seen.has( variable.id ) ) {
			return false;
		}
		seen.add( variable.id );
		return true;
	} );
}

function inferNativeReplacement( widgetType: string ): string | undefined {
	const normalized = widgetType.toLowerCase();
	const base = normalized.endsWith( '-pro' ) ? normalized.slice( 0, -4 ) : normalized;

	switch ( base ) {
		case 'section':
		case 'column':
		case 'container':
			return 'container';
		case 'heading':
			return 'heading';
		case 'text':
		case 'text-editor':
			return 'text-editor';
		case 'blockquote':
			return 'blockquote';
		case 'image':
			return 'image';
		case 'form':
			return 'form';
		case 'field-text':
			return 'form-field-text';
		case 'field-email':
			return 'form-field-email';
		case 'field-textarea':
			return 'form-field-textarea';
		case 'field-select':
			return 'form-field-select';
		case 'field-checkbox':
			return 'form-field-checkbox';
		case 'field-radio':
			return 'form-field-radio';
		case 'button':
			return 'button';
		case 'spacer':
			return 'spacer';
		case 'divider':
			return 'divider';
		case 'shortcode':
			return 'shortcode';
		case 'html':
			return 'html';
		case 'tabs':
		case 'nested-tabs':
			return 'tabs';
		case 'nested-accordion':
			return 'accordion';
		case 'toggle':
		case 'accordion':
			return base;
		case 'nav-menu':
		case 'menu':
		case 'nested-menu':
		case 'breadcrumbs':
			return 'menu';
		case 'social-icons':
			return 'social-icons';
		case 'gallery':
		case 'image-gallery':
			return 'gallery';
		case 'image-carousel':
		case 'media-carousel':
		case 'carousel':
		case 'slides':
			return 'carousel';
		case 'loop-grid':
		case 'posts':
		case 'post-list':
		case 'archive-posts':
			return 'loop';
		default:
			return undefined;
	}
}

function sentenceCase(value: string): string {
	return value.split( /[-_]/g ).map( ( word ) => word.slice( 0, 1 ).toUpperCase() + word.slice( 1 ) ).join( ' ' );
}

function compactObject( value: Record<string, unknown> ): Record<string, unknown> {
	return Object.fromEntries( Object.entries( value ).filter( ( [ , entryValue ] ) => entryValue !== undefined && entryValue !== null && entryValue !== '' ) );
}
