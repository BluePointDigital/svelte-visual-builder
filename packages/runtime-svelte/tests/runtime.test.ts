import { describe, expect, it } from 'vitest';

import {
	createBuilderPackage,
	createEmptyDocument,
	createNode,
	createStyleSet,
	createThemeAssignment,
} from '@builder/schema';
import {
	compileDocumentAssets,
	expandComponentInstance,
	getNodeStyle,
	mergeNodeClassAttribute,
	getRenderableRoots,
	isNativeFormFieldNode,
	renderDocument,
	resolveAccordionItems,
	resolveCarouselSlides,
	resolveCollectionRecords,
	resolveFormFieldShell,
	resolveGalleryImages,
	resolveGeneratedFormFieldShells,
	resolveInitialAccordionIndexes,
	resolveInitialTabIndex,
	resolveMenuItems,
	resolvePopupBehavior,
	resolveNodeProps,
	resolveTabItems,
	renderPublishedDocument,
	createRuntimeComponentMap,
} from '../src/lib/runtime';
import { BUILDER_RUNTIME_BASE_STYLES } from '../src/lib/runtime-base-styles';
import CustomRuntimeCard from './CustomRuntimeCard.svelte';

describe( 'runtime-svelte', () => {
	it( 'builds a stylesheet from variables and classes', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const project = createBuilderPackage( 'Demo', [ document ] );
		project.designSystem.variables.push( {
			id: 'var-1',
			name: 'brand-color',
			label: 'Brand Color',
			kind: 'color',
			value: '#ff0000',
		} );
		project.designSystem.classes.push( {
			id: 'class-1',
			name: 'hero',
			label: 'Hero',
			order: 0,
			extends: [],
			styles: createStyleSet( {
				base: {
					color: { token: 'brand-color' },
				},
			} ),
			usageCount: 0,
			meta: {},
		} );

		const model = renderDocument( { project, activeDocumentId: document.id } );
		expect( compileDocumentAssets( model ).stylesheet ).toContain( '--builder-var-brand-color' );
		expect( compileDocumentAssets( model ).stylesheet ).toContain( '.builder-class-class-1' );
	} );

	it( 'emits element custom CSS and CSS custom properties', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const node = createNode( {
			id: 'hero-node',
			type: 'container',
			styles: createStyleSet( {
				base: {
					'--hero-gap': '24px',
					gap: 'var(--hero-gap)',
				},
				customCss: 'selector:hover { opacity: 0.75; }',
			} ),
		} );
		document.root = [ node ];
		const project = createBuilderPackage( 'Demo', [ document ] );
		const model = renderDocument( { project, activeDocumentId: document.id } );

		expect( getNodeStyle( node, model ) ).toContain( '--hero-gap: 24px;' );
		expect( compileDocumentAssets( model ).stylesheet ).toContain( '[data-builder-node="hero-node"]:hover { opacity: 0.75; }' );
	} );

	it( 'renders published documents with dynamic context and media URL resolution', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const image = createNode( {
			id: 'hero-image',
			type: 'image',
			props: { src: 'hero.jpg', alt: 'Hero' },
		} );
		document.root = [ image ];
		const project = createBuilderPackage( 'Demo', [ document ] );
		const model = renderPublishedDocument( {
			project,
			documentId: document.id,
			dynamicContext: {
				siteData: { title: 'Published' },
			},
			media: {
				resolveAssetUrl: ( asset ) => typeof asset === 'string' ? `https://cdn.example.com/${ asset }` : undefined,
			},
			cssIsolation: {
				rootSelector: '#published',
			},
		} );

		expect( model.bindingContext.siteData ).toEqual( { title: 'Published' } );
		expect( model.cssIsolation?.rootSelector ).toBe( '#published' );
		expect( resolveNodeProps( image, model ).src ).toBe( 'https://cdn.example.com/hero.jpg' );
	} );

	it( 'creates runtime component maps and carries them through render models', () => {
		const runtimeComponents = createRuntimeComponentMap( {
			'custom-card': CustomRuntimeCard,
		} );
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const project = createBuilderPackage( 'Demo', [ document ] );
		const model = renderDocument( {
			project,
			activeDocumentId: document.id,
			runtimeComponents,
		} );

		expect( runtimeComponents.get( 'custom-card' ) ).toBe( CustomRuntimeCard );
		expect( model.runtimeComponents.get( 'custom-card' ) ).toBe( CustomRuntimeCard );
	} );

	it( 'resolves props for nodes backed by custom Svelte runtime components', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const customNode = createNode( {
			id: 'custom-card',
			type: 'custom-card',
			props: { title: 'Fallback title' },
			styles: createStyleSet( { base: { color: '#123456' } } ),
			bindings: [ {
				id: 'title-binding',
				targetKind: 'prop',
				target: 'title',
				source: 'dynamic',
				path: 'post-title',
				category: 'text',
				args: {},
			} ],
			children: [
				createNode( {
					id: 'custom-card-child',
					type: 'paragraph',
					props: { text: 'Nested child' },
				} ),
			],
		} );
		document.root = [ customNode ];
		const project = createBuilderPackage( 'Demo', [ document ] );
		const runtimeComponents = createRuntimeComponentMap( {
			'custom-card': CustomRuntimeCard,
		} );
		const model = renderDocument( {
			project,
			activeDocumentId: document.id,
			runtimeComponents,
			bindingContext: {
				record: { title: 'Resolved title' },
			},
		} );

		expect( model.runtimeComponents.get( 'custom-card' ) ).toBe( CustomRuntimeCard );
		expect( resolveNodeProps( customNode, model ).title ).toBe( 'Resolved title' );
		expect( getNodeStyle( customNode, model ) ).toContain( 'color: #123456' );
		expect( customNode.children[ 0 ]?.props.text ).toBe( 'Nested child' );
	} );

	it( 'resolves host dynamic bindings for props, links, media, and styles', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const heading = createNode( {
			id: 'dynamic-heading',
			type: 'heading',
			props: { text: 'Fallback title' },
			bindings: [
				{
					id: 'title-binding',
					targetKind: 'prop',
					target: 'text',
					source: 'dynamic',
					path: 'post-title',
					category: 'text',
					before: 'Read: ',
					fallback: 'Fallback title',
				},
			],
		} );
		const button = createNode( {
			id: 'dynamic-button',
			type: 'button',
			props: { text: 'Read more', href: '#' },
			bindings: [
				{
					id: 'url-binding',
					targetKind: 'prop',
					target: 'href',
					source: 'dynamic',
					path: 'post-url',
					category: 'url',
					fallback: '#',
				},
			],
		} );
		const image = createNode( {
			id: 'dynamic-image',
			type: 'image',
			props: { src: '/placeholder.jpg' },
			bindings: [
				{
					id: 'image-binding',
					targetKind: 'prop',
					target: 'src',
					source: 'dynamic',
					path: 'featured-image',
					category: 'image',
				},
			],
		} );
		const section = createNode( {
			id: 'dynamic-section',
			type: 'container',
			styles: createStyleSet( { base: { backgroundColor: '#ffffff' } } ),
			bindings: [
				{
					id: 'color-binding',
					targetKind: 'style',
					target: 'backgroundColor',
					source: 'dynamic',
					path: 'custom-path',
					category: 'color',
					args: { path: 'brandColor' },
					fallback: '#ff6600',
				},
			],
			children: [ heading, button, image ],
		} );
		document.root = [ section ];
		const project = createBuilderPackage( 'Demo', [ document ] );
		const model = renderDocument( {
			project,
			activeDocumentId: document.id,
			bindingContext: {
				record: {
					title: 'Dynamic Post',
					url: '/dynamic-post',
					featuredImage: { url: '/dynamic.jpg' },
					brandColor: '#f3662b',
				},
			},
		} );

		expect( resolveNodeProps( heading, model ).text ).toBe( 'Read: Dynamic Post' );
		expect( resolveNodeProps( button, model ).href ).toBe( '/dynamic-post' );
		expect( resolveNodeProps( image, model ).src ).toBe( '/dynamic.jpg' );
		expect( getNodeStyle( section, model ) ).toContain( 'background-color: #f3662b;' );
	} );

	it( 'compiles imported visual fidelity styles, states, breakpoints, and scoped overlays', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const node = createNode( {
			id: 'imported-hero',
			type: 'container',
			styles: createStyleSet( {
				base: {
					backgroundImage: 'url("https://example.com/hero.jpg")',
					backgroundSize: 'cover',
					backgroundPosition: 'center center',
					position: 'relative',
				},
				states: {
					hover: {
						opacity: '0.9',
					},
				},
				breakpoints: {
					mobile: {
						backgroundPosition: 'top center',
					},
				},
				stateBreakpoints: {
					mobile: {
						hover: {
							opacity: '1',
						},
					},
				},
				customCss: 'selector::before { content: ""; position: absolute; inset: 0; background-color: rgba(0,0,0,0.45); pointer-events: none; }',
			} ),
		} );
		document.root = [ node ];
		const project = createBuilderPackage( 'Demo', [ document ] );
		const model = renderDocument( { project, activeDocumentId: document.id } );
		const stylesheet = compileDocumentAssets( model ).stylesheet;

		expect( getNodeStyle( node, model ) ).toContain( 'background-image: url("https://example.com/hero.jpg");' );
		expect( stylesheet ).toContain( '[data-builder-node="imported-hero"]:hover { opacity: 0.9 !important; }' );
		expect( stylesheet ).toContain( '@media (min-width: 0px) { [data-builder-node="imported-hero"] { background-position: top center; } }' );
		expect( stylesheet ).toContain( '@media (min-width: 0px) { [data-builder-node="imported-hero"]:hover { opacity: 1 !important; } }' );
		expect( stylesheet ).toContain( '[data-builder-node="imported-hero"]::before' );
	} );

	it( 'preserves authored CSS classes while adding runtime classes', () => {
		expect( mergeNodeClassAttribute( { id: 'hero', class: 'hero-card featured' }, 'builder-node builder-node--container' ) ).toEqual( {
			id: 'hero',
			class: 'hero-card featured builder-node builder-node--container',
		} );
	} );

	it( 'creates render models and expands component instances', () => {
		const component = createEmptyDocument( 'component', 'Hero Component', 'hero-component' );
		component.component = {
			lockedStructure: true,
			exposedProperties: [
				{
					id: 'component-title',
					nodeId: 'heading-1',
					label: 'Title',
					propPath: 'text',
					type: 'text',
					required: true,
				},
			],
		};
		component.root = [
			createNode( {
				id: 'heading-1',
				type: 'heading',
				props: { text: 'Default title', level: 'h1' },
			} ),
		];

		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [
			createNode( {
				type: 'container',
				children: [
					createNode( {
						type: 'component-instance',
						props: {
							componentId: component.id,
							overrides: {
								'component-title': 'Expanded title',
							},
						},
					} ),
				],
			} ),
		];

		const project = createBuilderPackage( 'Demo', [ page, component ] );
		const model = renderDocument( { project, activeDocumentId: page.id } );
		expect( model.composition.activePage?.root[ 0 ].type ).toBe( 'container' );

		const expanded = expandComponentInstance( page.root[ 0 ].children[ 0 ], model );
		expect( expanded[ 0 ].type ).toBe( 'heading' );
		expect( expanded[ 0 ].props.text ).toBe( 'Expanded title' );
	} );

	it( 'compiles state styles from component documents', () => {
		const component = createEmptyDocument( 'component', 'Hero Component', 'hero-component' );
		component.root = [
			createNode( {
				id: 'component-button',
				type: 'button',
				props: { text: 'Start' },
				styles: createStyleSet( {
					states: {
						hover: {
							'background-color': '#ff6600',
						},
					},
				} ),
			} ),
		];

		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [
			createNode( {
				id: 'hero-instance',
				type: 'component-instance',
				props: { componentId: component.id },
			} ),
		];

		const model = renderDocument( { project: createBuilderPackage( 'Demo', [ page, component ] ), activeDocumentId: page.id } );
		expect( compileDocumentAssets( model ).stylesheet ).toContain( '[data-builder-node="component-button"]:hover { background-color: #ff6600 !important; }' );
	} );

	it( 'normalizes native interactive families from their declared props and slots', () => {
		const tabs = createNode( {
			id: 'tabs',
			type: 'tabs',
			props: {
				activeTab: 1,
				items: [
					{ label: 'Overview', content: 'Overview content' },
					{ label: 'Specs', content: 'Specs content' },
				],
			},
			slots: {
				triggers: [ createNode( { id: 'trigger-1', type: 'heading', props: { text: 'Overview trigger' } } ) ],
				panels: [ createNode( { id: 'panel-1', type: 'paragraph', props: { text: 'Panel copy' } } ) ],
			},
		} );
		const accordion = createNode( {
			id: 'accordion',
			type: 'toggle',
			props: {
				items: [
					{ title: 'Question', body: 'Answer', open: true },
					{ title: 'Shipping', body: 'Ships tomorrow', open: false },
				],
			},
		} );
		const menu = createNode( {
			id: 'menu',
			type: 'menu',
			props: {
				items: [
					{ label: 'Home', href: '/' },
					{ label: 'Docs', href: '/docs', children: [ { label: 'API', href: '/docs/api' } ] },
				],
			},
		} );
		const gallery = createNode( {
			id: 'gallery',
			type: 'gallery',
			props: {
				images: [
					'https://placehold.co/640x480',
					{ src: 'https://placehold.co/640x481', alt: 'Second image', caption: 'Caption' },
				],
			},
		} );
		const carousel = createNode( {
			id: 'carousel',
			type: 'carousel',
			props: {
				slides: [
					{ title: 'Slide 1', text: 'First slide' },
					{ title: 'Slide 2', text: 'Second slide' },
				],
			},
		} );

		expect( resolveTabItems( tabs, tabs.props ) ).toHaveLength( 1 );
		expect( resolveInitialTabIndex( tabs, tabs.props ) ).toBe( 0 );
		expect( resolveAccordionItems( accordion, accordion.props )[ 0 ]?.title ).toBe( 'Question' );
		expect( resolveInitialAccordionIndexes( accordion, accordion.props ) ).toEqual( [ 0 ] );
		expect( resolveMenuItems( menu.props )[ 1 ]?.children[ 0 ]?.label ).toBe( 'API' );
		expect( resolveGalleryImages( gallery.props )[ 1 ]?.caption ).toBe( 'Caption' );
		expect( resolveCarouselSlides( carousel.props )[ 1 ]?.text ).toBe( 'Second slide' );
		expect( resolvePopupBehavior( { title: 'Newsletter popup', closeOnOverlay: false } ) ).toMatchObject( {
			title: 'Newsletter popup',
			closeOnOverlay: false,
		} );
	} );

	it( 'builds form shells and loop records without needing a detached runtime path', () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		const loop = createNode( {
			id: 'posts-loop',
			type: 'loop',
			props: {
				collection: 'posts',
				limit: 1,
				query: {
					filters: [ { path: 'category', operator: 'equals', value: 'blog' } ],
					orderBy: 'title',
				},
			},
			slots: {
				item: [
					createNode( {
						id: 'loop-title',
						type: 'heading',
						props: { text: 'Fallback title' },
						bindings: [ {
							id: 'loop-title-binding',
							targetKind: 'prop',
							target: 'text',
							source: 'collection',
							path: 'title',
							args: {},
						} ],
					} ),
				],
			},
		} );
		page.root = [ createNode( { id: 'detached-component-container', type: 'container', meta: { detachedComponent: { componentId: 'component-1' } } } ), loop ];

		const textField = createNode( {
			id: 'field-name',
			type: 'form-field-text',
			props: { markup: '<label class="builder-form-field"><span>Name</span><input type="text" name="name" placeholder="Name" /></label>' },
		} );

		const project = createBuilderPackage( 'Demo', [ page ] );
		const model = renderDocument( {
			project,
			activeDocumentId: page.id,
			bindingContext: {
				collections: {
					posts: [
						{ title: 'Beta', category: 'blog' },
						{ title: 'Alpha', category: 'blog' },
						{ title: 'Ignore', category: 'docs' },
					],
				},
			},
		} );

		expect( isNativeFormFieldNode( textField ) ).toBe( true );
		expect( resolveFormFieldShell( textField, textField.props ) ).toMatchObject( {
			kind: 'text',
			label: 'Name',
			placeholder: 'Name',
		} );
		expect( resolveGeneratedFormFieldShells( {
			fields: [ { kind: 'select', label: 'Choice', options: [ { label: 'One', value: '1' } ] } ],
		} )[ 0 ] ).toMatchObject( {
			kind: 'select',
			label: 'Choice',
		} );
		expect( resolveCollectionRecords( loop, model ) ).toEqual( [ { title: 'Alpha', category: 'blog' } ] );
		expect( model.composition.activePage?.root[ 0 ]?.type ).toBe( 'container' );
	} );

	it( 'respects explicit preview slot overrides for popup documents', () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		const popup = createEmptyDocument( 'popup', 'Newsletter', 'newsletter' );
		popup.root = [ createNode( { id: 'popup-root', type: 'popup-root', props: { title: 'Newsletter popup' } } ) ];

		const model = renderDocument( {
			project: createBuilderPackage( 'Demo', [ page, popup ], [
				createThemeAssignment( { documentId: popup.id, slot: 'modal', status: 'published', pathname: '/home' } ),
			] ),
			previewDocumentId: popup.id,
			previewSlot: 'modal',
			showPopups: false,
			conditionContext: { pathname: '/home' },
		} );

		expect( model.composition.previewSlot ).toBe( 'modal' );
		expect( getRenderableRoots( model ).some( ( rendered ) => rendered.slot === 'modal' ) ).toBe( true );
	} );

	it( 'normalizes camelCase style keys into valid CSS declarations at render time', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const node = createNode( {
			id: 'hero',
			type: 'container',
			styles: createStyleSet( {
				base: {
					minHeight: '400px',
					borderRadius: '24px',
					backgroundColor: '#112233',
				},
			} ),
		} );
		document.root = [ node ];

		const model = renderDocument( {
			project: createBuilderPackage( 'Demo', [ document ] ),
			activeDocumentId: document.id,
		} );

		expect( getNodeStyle( node, model ) ).toContain( 'min-height: 400px;' );
		expect( getNodeStyle( node, model ) ).toContain( 'border-radius: 24px;' );
		expect( getNodeStyle( node, model ) ).toContain( 'background-color: #112233;' );
	} );

	it( 'maps prop-backed alignment, fit, menu, and button controls into live CSS', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const heading = createNode( {
			id: 'heading',
			type: 'heading',
			props: { text: 'Aligned heading', align: 'center' },
		} );
		const image = createNode( {
			id: 'image',
			type: 'image',
			props: { src: 'https://placehold.co/640x480', fit: 'contain' },
		} );
		const menu = createNode( {
			id: 'menu',
			type: 'menu',
			props: {
				items: [ { label: 'Home', href: '/' } ],
				orientation: 'vertical',
				alignment: 'right',
			},
		} );
		const button = createNode( {
			id: 'button',
			type: 'button',
			props: {
				text: 'Call to action',
				variant: 'outline',
				size: 'lg',
			},
		} );
		document.root = [ heading, image, menu, button ];

		const model = renderDocument( {
			project: createBuilderPackage( 'Demo', [ document ] ),
			activeDocumentId: document.id,
		} );

		expect( getNodeStyle( heading, model ) ).toContain( 'text-align: center;' );
		expect( getNodeStyle( image, model ) ).toContain( 'object-fit: contain;' );
		expect( getNodeStyle( menu, model ) ).toContain( '--builder-menu-direction: column;' );
		expect( getNodeStyle( menu, model ) ).toContain( '--builder-menu-justify: flex-end;' );
		expect( getNodeStyle( button, model ) ).toContain( 'display: inline-flex;' );
		expect( getNodeStyle( button, model ) ).toContain( 'font-size: 1.125rem;' );
		expect( getNodeStyle( button, model ) ).toContain( 'background-color: transparent;' );
	} );

	it( 'keeps standalone image and video media responsive and container-safe', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const image = createNode( {
			id: 'image',
			type: 'image',
			props: { src: 'https://placehold.co/640x480', fit: 'contain' },
			styles: createStyleSet( {
				base: {
					width: '480px',
					align: 'center',
				},
			} ),
		} );
		const video = createNode( {
			id: 'video',
			type: 'video',
			props: { src: 'https://example.com/video.mp4' },
			styles: createStyleSet( {
				base: {
					width: '640px',
				},
			} ),
		} );
		document.root = [ image, video ];

		const model = renderDocument( {
			project: createBuilderPackage( 'Demo', [ document ] ),
			activeDocumentId: document.id,
		} );

		expect( getNodeStyle( image, model ) ).toContain( 'width: 480px;' );
		expect( getNodeStyle( image, model ) ).toContain( 'margin-inline-start: auto;' );
		expect( getNodeStyle( image, model ) ).toContain( 'margin-inline-end: auto;' );
		expect( getNodeStyle( image, model ) ).not.toContain( 'text-align:' );
		expect( getNodeStyle( video, model ) ).toContain( 'width: 640px;' );
		expect( BUILDER_RUNTIME_BASE_STYLES ).toContain( '.builder-node--image {' );
		expect( BUILDER_RUNTIME_BASE_STYLES ).toContain( '.builder-node--video {' );
		expect( BUILDER_RUNTIME_BASE_STYLES ).toContain( '.builder-node--video > video {' );
		expect( BUILDER_RUNTIME_BASE_STYLES ).toContain( 'max-width: 100%;' );
		expect( BUILDER_RUNTIME_BASE_STYLES ).toContain( 'height: auto;' );
		expect( BUILDER_RUNTIME_BASE_STYLES ).toContain( 'min-width: 0;' );
	} );

	it( 'maps container layout defaults into real runtime CSS', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const container = createNode( {
			id: 'container',
			type: 'container',
			layout: {
				display: 'flex',
				direction: 'column',
				gap: '1rem',
				width: '100%',
				maxWidth: '1200px',
			},
		} );
		const gridContainer = createNode( {
			id: 'grid-container',
			type: 'grid-container',
			layout: {
				display: 'grid',
				columns: 3,
				gap: '24px',
				width: '100%',
			},
		} );
		document.root = [ container, gridContainer ];

		const model = renderDocument( {
			project: createBuilderPackage( 'Demo', [ document ] ),
			activeDocumentId: document.id,
		} );

		expect( getNodeStyle( container, model ) ).toContain( 'display: flex;' );
		expect( getNodeStyle( container, model ) ).toContain( 'flex-direction: column;' );
		expect( getNodeStyle( container, model ) ).toContain( 'gap: 1rem;' );
		expect( getNodeStyle( container, model ) ).toContain( 'width: 100%;' );
		expect( getNodeStyle( container, model ) ).toContain( 'max-width: 1200px;' );
		expect( getNodeStyle( gridContainer, model ) ).toContain( 'display: grid;' );
		expect( getNodeStyle( gridContainer, model ) ).toContain( 'grid-template-columns: repeat(3, minmax(0, 1fr));' );
		expect( getNodeStyle( gridContainer, model ) ).toContain( 'gap: 24px;' );
		expect( getNodeStyle( gridContainer, model ) ).toContain( 'width: 100%;' );
	} );

	it( 'cascades node viewport styles through laptop and tablet before mobile overrides', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const container = createNode( {
			id: 'responsive-container',
			type: 'container',
			styles: createStyleSet( {
				base: {
					width: '100%',
					backgroundColor: '#111111',
				},
				breakpoints: {
					laptop: {
						backgroundColor: '#222222',
						maxWidth: '1200px',
					},
					tablet: {
						width: '80%',
						gap: '12px',
					},
					mobile: {
						width: '60%',
					},
				},
			} ),
		} );
		document.root = [ container ];
		const project = createBuilderPackage( 'Demo', [ document ] );

		const tabletModel = renderDocument( {
			project,
			activeDocumentId: document.id,
			viewport: 'tablet',
		} );
		expect( getNodeStyle( container, tabletModel ) ).toContain( 'background-color: #222222;' );
		expect( getNodeStyle( container, tabletModel ) ).toContain( 'max-width: 1200px;' );
		expect( getNodeStyle( container, tabletModel ) ).toContain( 'width: 80%;' );
		expect( getNodeStyle( container, tabletModel ) ).toContain( 'gap: 12px;' );

		const mobileModel = renderDocument( {
			project,
			activeDocumentId: document.id,
			viewport: 'mobile',
		} );
		expect( getNodeStyle( container, mobileModel ) ).toContain( 'background-color: #222222;' );
		expect( getNodeStyle( container, mobileModel ) ).toContain( 'max-width: 1200px;' );
		expect( getNodeStyle( container, mobileModel ) ).toContain( 'gap: 12px;' );
		expect( getNodeStyle( container, mobileModel ) ).toContain( 'width: 60%;' );
	} );

	it( 'keeps legacy semantic style keys working through runtime aliases', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const heading = createNode( {
			id: 'legacy-heading',
			type: 'heading',
			styles: createStyleSet( {
				base: {
					align: 'right',
				},
			} ),
		} );
		const loop = createNode( {
			id: 'loop',
			type: 'loop',
			styles: createStyleSet( {
				base: {
					columns: 3,
					itemPadding: '24px',
					emptyStatePadding: '32px',
				},
			} ),
		} );
		document.root = [ heading, loop ];

		const model = renderDocument( {
			project: createBuilderPackage( 'Demo', [ document ] ),
			activeDocumentId: document.id,
		} );

		expect( getNodeStyle( heading, model ) ).toContain( 'text-align: right;' );
		expect( getNodeStyle( loop, model ) ).toContain( '--builder-loop-columns: repeat(3, minmax(0, 1fr));' );
		expect( getNodeStyle( loop, model ) ).toContain( '--builder-loop-item-padding: 24px;' );
		expect( getNodeStyle( loop, model ) ).toContain( '--builder-loop-empty-padding: 32px;' );
	} );
} );
