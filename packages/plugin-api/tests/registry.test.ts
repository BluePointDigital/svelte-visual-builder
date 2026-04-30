import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createNode, createStyleSet } from '@builder/schema';
import {
	applyBuilderHostExtension,
	createBuilderRegistry,
	createDefaultBuilderRegistry,
	defineBuilderBindingProvider,
	defineBuilderDocumentType,
	defineBuilderDynamicProvider,
	defineBuilderElement,
	defineBuilderExperiment,
	defineBuilderHostExtension,
	defineBuilderTemplateCondition,
} from '../src/index';

describe( 'plugin registry', () => {
	function getAdvancedControl( type: string, sectionId: string, key: string ) {
		const registry = createDefaultBuilderRegistry();
		return registry.elements.get( type )?.advancedSections
			.find( ( section ) => section.id === sectionId )
			?.controls?.find( ( control ) => control.key === key );
	}

	function getStyleControl( type: string, sectionId: string, key: string ) {
		const registry = createDefaultBuilderRegistry();
		return registry.elements.get( type )?.styleSections
			.find( ( section ) => section.id === sectionId )
			?.controls.find( ( control ) => control.key === key );
	}

	function getContentField( type: string, sectionId: string, fieldId: string ) {
		const registry = createDefaultBuilderRegistry();
		return registry.elements.get( type )?.contentSections
			.find( ( section ) => section.id === sectionId )
			?.fields.find( ( field ) => field.id === fieldId );
	}

	function getPanelSection( type: string, sectionId: string ) {
		const registry = createDefaultBuilderRegistry();
		return registry.elements.get( type )?.panelSections.find( ( section ) => section.id === sectionId );
	}

	it( 'registers built-in elements and document types', () => {
		const registry = createDefaultBuilderRegistry();

		expect( registry.elements.has( 'container' ) ).toBe( true );
		expect( registry.elements.get( 'tabs' )?.runtime.slots?.map( ( slot ) => slot.id ) ).toEqual( [ 'triggers', 'panels' ] );
		expect( registry.elements.get( 'toggle' )?.runtime.family ).toBe( 'accordion' );
		expect( registry.elements.get( 'shortcode' )?.runtime.family ).toBe( 'html' );
		expect( registry.elements.get( 'form-field-email' )?.runtime.family ).toBe( 'html' );
		expect( registry.elements.get( 'social-icons' )?.runtime.family ).toBe( 'menu' );
		expect( registry.createElementNode( 'form-field-text' ).props.markup ).toContain( '<input type="text"' );
		expect( registry.documentTypes.get( 'component' )?.label ).toBe( 'Component' );
	} );

	it( 'applies complete host extensions to every registry-backed surface', () => {
		const customElement = defineBuilderElement( {
			type: 'booking-widget',
			label: 'Booking Widget',
			category: 'interactive',
			propSchema: z.object( { title: z.string() } ).passthrough(),
			styleSchema: z.object( {} ).passthrough(),
			styleContract: {
				editableTargets: [ 'base' ],
				supportsBreakpoints: true,
				supportsStates: false,
				supportsTokens: true,
				supportsLogicalProperties: true,
				properties: [],
			},
			defaults: {
				props: { title: 'Book now' },
				styles: { base: { padding: '16px' } },
			},
			panelSections: [],
			contentSections: [],
			styleSections: [],
			advancedSections: [],
			runtime: {
				family: 'html',
				tag: 'section',
				acceptsChildren: true,
			},
			createDefaultNode: () => createNode( {
				type: 'booking-widget',
				props: { title: 'Book now' },
				styles: createStyleSet( { base: { padding: '16px' } } ),
			} ),
		} );
		const extension = defineBuilderHostExtension( {
			elements: [ customElement ],
			documentTypes: [ defineBuilderDocumentType( { kind: 'page', label: 'Host Page' } ) ],
			bindingProviders: [ defineBuilderBindingProvider( {
				id: 'site',
				label: 'Host Site',
				resolve: ( binding, context ) => context.record?.[ binding.path ],
			} ) ],
			dynamicProviders: [ defineBuilderDynamicProvider( {
				id: 'booking-title',
				label: 'Booking Title',
				group: 'CMS',
				categories: [ 'text' ],
				resolve: ( context ) => context.record?.title,
			} ) ],
			templateConditions: [ defineBuilderTemplateCondition( {
				source: 'route',
				label: 'Route',
				matches: ( rule, context ) => context.pathname.startsWith( String( rule.value ?? '' ) ),
			} ) ],
			experiments: [ defineBuilderExperiment( {
				id: 'cms-extension',
				label: 'CMS Extension',
				description: 'Enables host CMS widgets.',
			} ) ],
		} );
		const registry = createBuilderRegistry();

		expect( applyBuilderHostExtension( registry, extension ) ).toBe( registry );
		expect( registry.elements.get( 'booking-widget' ) ).toBe( customElement );
		expect( registry.createElementNode( 'booking-widget' ).props.title ).toBe( 'Book now' );
		expect( registry.documentTypes.get( 'page' )?.label ).toBe( 'Host Page' );
		expect( registry.bindingProviders.get( 'site' )?.resolve( {
			id: 'binding',
			targetKind: 'prop',
			target: 'title',
			source: 'site',
			path: 'title',
			args: {},
		}, { record: { title: 'Resolved' } } ) ).toBe( 'Resolved' );
		expect( registry.dynamicProviders.get( 'booking-title' )?.resolve( { record: { title: 'Provider title' } } ) ).toBe( 'Provider title' );
		expect( registry.templateConditions.get( 'route' )?.matches( {
			id: 'condition',
			source: 'route',
			operator: 'startsWith',
			path: 'pathname',
			value: '/book',
			values: [],
		}, { pathname: '/book/demo' } ) ).toBe( true );
		expect( registry.experiments.get( 'cms-extension' )?.label ).toBe( 'CMS Extension' );
	} );

	it( 'exposes style and advanced section stacks for parity-sensitive widgets', () => {
		const registry = createDefaultBuilderRegistry();
		const contentStack = ( type: string ) => registry.elements.get( type )?.contentSections.map( ( section ) => section.label );
		const styleStack = ( type: string ) => registry.elements.get( type )?.styleSections.map( ( section ) => section.label );
		const advancedStack = ( type: string ) => registry.elements.get( type )?.advancedSections.map( ( section ) => section.label );

		expect( contentStack( 'container' ) ).toEqual( [
			'Layout',
			'Sizing & Overflow',
		] );
		expect( styleStack( 'container' ) ).toEqual( [
			'Background',
			'Border',
		] );
		expect( advancedStack( 'container' ) ).toEqual( [
			'Layout',
			'Position & Layer',
			'Motion & Animation',
			'Transform',
			'Responsive Visibility',
			'HTML Attributes',
			'Custom CSS',
		] );
		expect( styleStack( 'grid-container' ) ).toEqual( [
			'Background',
			'Border',
		] );
		expect( styleStack( 'icon-box' ) ).toEqual( [
			'Box',
			'Icon',
			'Content',
			'Title',
			'Description',
		] );
		expect( styleStack( 'paragraph' ) ).toEqual( [
			'Alignment',
			'Typography',
			'Paragraph Spacing',
			'Drop Cap',
			'Links',
			'Text Shadow',
		] );
		expect( styleStack( 'text-editor' ) ).toEqual( [
			'Alignment',
			'Typography',
			'Paragraph Spacing',
			'Drop Cap',
			'Links',
			'Text Shadow',
		] );
		expect( styleStack( 'blockquote' ) ).toEqual( [
			'Alignment',
			'Typography',
			'Text Shadow',
		] );
		expect( styleStack( 'tabs' ) ).toEqual( [ 'Title', 'Icon', 'Content' ] );
		expect( styleStack( 'accordion' ) ).toEqual( [ 'Title', 'Icon', 'Content' ] );
		expect( styleStack( 'toggle' ) ).toEqual( [ 'Title', 'Icon', 'Content' ] );
		expect( styleStack( 'menu' ) ).toEqual( [ 'Menu', 'Item', 'Dropdown' ] );
		expect( styleStack( 'gallery' ) ).toEqual( [ 'Layout', 'Images', 'Caption' ] );
		expect( styleStack( 'carousel' ) ).toEqual( [ 'Slides', 'Content', 'Navigation' ] );
		expect( advancedStack( 'menu' ) ).toEqual( [
			'Layout',
			'Position & Layer',
			'Motion & Animation',
			'Transform',
			'Border',
			'Responsive Visibility',
			'HTML Attributes',
			'Custom CSS',
		] );
		expect( getStyleControl( 'gallery', 'caption', '--builder-caption-align' )?.label ).toBe( 'Alignment' );
		expect( getStyleControl( 'carousel', 'content', 'font-size' )?.label ).toBe( 'Font Size' );
	} );

	it( 'uses width defaults and working layout controls for container elements', () => {
		const registry = createDefaultBuilderRegistry();

		expect( registry.elements.get( 'container' )?.defaults.layout?.width ).toBe( '100%' );
		expect( registry.elements.get( 'grid-container' )?.defaults.layout?.width ).toBe( '100%' );

		expect( getContentField( 'container', 'layout', 'container_layout' )?.options ).toEqual( [
			{ label: 'Flexbox', value: 'flex' },
			{ label: 'Grid', value: 'grid' },
		] );
		expect( getContentField( 'grid-container', 'layout', 'container_layout' )?.options ).toEqual( [
			{ label: 'Flexbox', value: 'flex' },
			{ label: 'Grid', value: 'grid' },
		] );

		const containerContentFields = getPanelSection( 'container', 'container' )?.fields;
		expect( containerContentFields?.map( ( field ) => field.id ) ).toEqual( [
			'container_type',
			'width',
			'max_width',
			'min_height',
		] );
		expect( getContentField( 'container', 'sizing-overflow', 'width' )?.path ).toBe( 'layout.width' );
		expect( getContentField( 'container', 'sizing-overflow', 'width' )?.styleProperty ).toBe( 'width' );
		expect( getContentField( 'container', 'sizing-overflow', 'max_width' )?.path ).toBe( 'layout.maxWidth' );
		expect( getContentField( 'container', 'sizing-overflow', 'max_width' )?.styleProperty ).toBe( 'max-width' );
		expect( containerContentFields?.some( ( field ) => field.id === 'content_width' || field.id === 'boxed_width' ) ).toBe( false );
	} );

	it( 'marks typography style sections as popovers with summaries', () => {
		const registry = createDefaultBuilderRegistry();
		const typographySections = [ ...registry.elements.values() ]
			.flatMap( ( element ) => element.styleSections.filter( ( section ) => section.family === 'typography' ) );

		expect( typographySections.length ).toBeGreaterThan( 0 );
		for ( const section of typographySections ) {
			expect( section.presentation ).toBe( 'popover' );
			expect( section.summaryKeys ).toEqual( [ 'color', 'font-family', 'font-size', 'font-weight' ] );
		}
	} );

	it( 'uses select-based font weight controls with explicit weights', () => {
		expect( getStyleControl( 'heading', 'typography', 'font-weight' )?.controlType ).toBe( 'select' );
		expect( getStyleControl( 'heading', 'typography', 'font-weight' )?.options ).toEqual( [
			{ label: 'Thin (100)', value: '100' },
			{ label: 'Extra Light (200)', value: '200' },
			{ label: 'Light (300)', value: '300' },
			{ label: 'Regular (400)', value: '400' },
			{ label: 'Medium (500)', value: '500' },
			{ label: 'Semi Bold (600)', value: '600' },
			{ label: 'Bold (700)', value: '700' },
			{ label: 'Extra Bold (800)', value: '800' },
			{ label: 'Black (900)', value: '900' },
		] );
	} );

	it( 'uses compact typography slider primitives without range rails', () => {
		expect( getStyleControl( 'heading', 'typography', 'font-size' )?.primitive ).toMatchObject( {
			kind: 'slider',
			showRange: false,
		} );
		expect( getStyleControl( 'heading', 'typography', 'line-height' )?.primitive ).toMatchObject( {
			kind: 'slider',
			showRange: false,
		} );
		expect( getStyleControl( 'heading', 'typography', 'letter-spacing' )?.primitive ).toMatchObject( {
			kind: 'slider',
			showRange: false,
		} );
	} );

	it( 'uses explicit container layout controls with flex/grid-specific visibility', () => {
		const registry = createDefaultBuilderRegistry();
		const layoutControls = registry.elements.get( 'container' )?.contentSections.find( ( section ) => section.id === 'layout' )?.fields ?? [];
		const layoutControlIds = layoutControls.map( ( control ) => control.id );
		const displayControl = layoutControls.find( ( control ) => control.id === 'container_layout' );
		const directionControl = layoutControls.find( ( control ) => control.id === 'direction' );
		const wrapControl = layoutControls.find( ( control ) => control.id === 'wrap' );
		const columnsControl = layoutControls.find( ( control ) => control.id === 'columns' );
		const rowsControl = layoutControls.find( ( control ) => control.id === 'rows' );
		const autoFlowControl = layoutControls.find( ( control ) => control.id === 'auto_flow' );
		const justifyItemsControl = layoutControls.find( ( control ) => control.id === 'justify_items' );

		expect( layoutControlIds ).toEqual( [
			'container_layout',
			'direction',
			'wrap',
			'columns',
			'rows',
			'gap',
			'auto_flow',
			'justify_items',
			'align_items',
			'justify_content',
			'align_content',
		] );
		expect( displayControl?.label ).toBe( 'Container Layout' );
		expect( displayControl?.primitive ).toMatchObject( {
			kind: 'select',
			options: [
				{ label: 'Flexbox', value: 'flex' },
				{ label: 'Grid', value: 'grid' },
			],
		} );
		expect( directionControl?.condition ).toEqual( { path: 'layout.display', equals: 'flex' } );
		expect( wrapControl?.condition ).toEqual( { path: 'layout.display', equals: 'flex' } );
		expect( columnsControl?.condition ).toEqual( { path: 'layout.display', equals: 'grid' } );
		expect( rowsControl?.condition ).toEqual( { path: 'layout.display', equals: 'grid' } );
		expect( autoFlowControl?.condition ).toEqual( { path: 'layout.display', equals: 'grid' } );
		expect( justifyItemsControl?.condition ).toEqual( { path: 'layout.display', equals: 'grid' } );
	} );

	it( 'uses compact container icons that match direction and justify semantics', () => {
		const registry = createDefaultBuilderRegistry();
		const layoutControls = registry.elements.get( 'container' )?.contentSections.find( ( section ) => section.id === 'layout' )?.fields ?? [];
		const directionField = layoutControls.find( ( control ) => control.id === 'direction' );
		const justifyField = layoutControls.find( ( control ) => control.id === 'justify_content' );
		const alignField = layoutControls.find( ( control ) => control.id === 'align_items' );

	expect( directionField?.primitive ).toMatchObject( {
		kind: 'choose',
		options: [
			expect.objectContaining( { value: 'row', icon: 'flex-row' } ),
			expect.objectContaining( { value: 'row-reverse', icon: 'flex-row-reverse' } ),
			expect.objectContaining( { value: 'column', icon: 'flex-column' } ),
			expect.objectContaining( { value: 'column-reverse', icon: 'flex-column-reverse' } ),
		],
	} );
		expect( justifyField?.primitive ).toMatchObject( {
			kind: 'choose',
			options: [
				expect.objectContaining( { value: 'start', icon: 'justify-start' } ),
				expect.objectContaining( { value: 'center', icon: 'justify-center' } ),
				expect.objectContaining( { value: 'end', icon: 'justify-end' } ),
				expect.objectContaining( { value: 'space-between', icon: 'space-between' } ),
				expect.objectContaining( { value: 'space-around', icon: 'space-around' } ),
				expect.objectContaining( { value: 'space-evenly', icon: 'space-evenly' } ),
			],
		} );
		expect( alignField?.primitive ).toMatchObject( {
			kind: 'choose',
			options: [
				expect.objectContaining( { value: 'start', icon: 'items-start' } ),
				expect.objectContaining( { value: 'center', icon: 'items-center' } ),
				expect.objectContaining( { value: 'end', icon: 'items-end' } ),
				expect.objectContaining( { value: 'stretch', icon: 'items-stretch' } ),
			],
		} );
	} );

	it( 'matches template conditions through the registry', () => {
		const registry = createDefaultBuilderRegistry();
		const routeMatcher = registry.templateConditions.get( 'route' );

		expect( routeMatcher?.matches( {
			id: 'route-test',
			source: 'route',
			operator: 'startsWith',
			path: 'pathname',
			value: '/blog',
			values: [],
		}, {
			pathname: '/blog/hello',
		} ) ).toBe( true );
	} );

	it( 'uses production-safe primitives for live advanced controls', () => {
		expect( getStyleControl( 'container', 'background', 'background-image' )?.primitive?.kind ).toBe( 'url' );
		expect( getStyleControl( 'container', 'background', 'background-position' )?.primitive ).toBeUndefined();
		expect( getStyleControl( 'container', 'background', 'background-size' )?.primitive ).toBeUndefined();
		expect( getStyleControl( 'container', 'border', 'box-shadow' )?.primitive ).toBeUndefined();
		expect( getAdvancedControl( 'container', 'layout', 'order' )?.primitive ).toMatchObject( {
			kind: 'slider',
			units: [],
		} );
		expect( getAdvancedControl( 'container', 'layout', 'width' ) ).toBeUndefined();
		expect( getAdvancedControl( 'container', 'layout', 'max-width' ) ).toBeUndefined();
		expect( getAdvancedControl( 'container', 'layout', 'min-height' ) ).toBeUndefined();
		expect( getAdvancedControl( 'container', 'positioning', 'z-index' )?.primitive ).toMatchObject( {
			kind: 'slider',
			units: [],
		} );
		expect( getAdvancedControl( 'container', 'motion-effects', 'transition-duration' )?.primitive ).toMatchObject( {
			kind: 'slider',
			units: [
				{ value: 'ms' },
				{ value: 's' },
			],
		} );
	} );

	it( 'upgrades common content fields to explicit media and url controls', () => {
		const registry = createDefaultBuilderRegistry();
		const imageSource = registry.elements.get( 'image' )?.contentSections[ 0 ]?.fields.find( ( field ) => field.id === 'src' );
		const buttonHref = registry.elements.get( 'button' )?.contentSections[ 0 ]?.fields.find( ( field ) => field.id === 'href' );
		const iconBoxLink = registry.elements.get( 'icon-box' )?.contentSections[ 0 ]?.fields.find( ( field ) => field.id === 'link' );

		expect( imageSource?.type ).toBe( 'image' );
		expect( buttonHref?.type ).toBe( 'url' );
		expect( iconBoxLink?.type ).toBe( 'url' );
	} );
} );
