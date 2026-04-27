import { describe, expect, it } from 'vitest';

import { importElementorPackage } from '../src/index';

describe( 'Elementor importer', () => {
	it( 'normalizes legacy sections and columns into containers', () => {
		const result = importElementorPackage( {
			title: 'Legacy Page',
			type: 'page',
			content: [
				{
					id: 'section-1',
					elType: 'section',
					elements: [
						{
							id: 'column-1',
							elType: 'column',
							elements: [
								{
									id: 'heading-1',
									elType: 'widget',
									widgetType: 'heading',
									settings: { title: 'Imported Heading' },
								},
							],
						},
					],
				},
			],
		} );

		expect( result.project.documents[ 0 ].root[ 0 ].type ).toBe( 'container' );
		expect( result.project.documents[ 0 ].root[ 0 ].layout ).toMatchObject( {
			display: 'flex',
			direction: 'column',
		} );
		expect( result.project.documents[ 0 ].root[ 0 ].children[ 0 ].type ).toBe( 'container' );
		expect( result.project.documents[ 0 ].root[ 0 ].children[ 0 ].layout ).toMatchObject( {
			display: 'flex',
			direction: 'column',
		} );
		expect( result.project.documents[ 0 ].root[ 0 ].children[ 0 ].children[ 0 ].type ).toBe( 'heading' );
		expect( result.warnings.some( ( warning ) => warning.code === 'legacy-layout-normalized' ) ).toBe( true );
	} );

	it( 'defaults modern Elementor containers to column flex layout unless an explicit direction is provided', () => {
		const result = importElementorPackage( {
			title: 'Container Page',
			type: 'page',
			content: [
				{
					id: 'container-default',
					elType: 'container',
					settings: {},
					elements: [
						{
							id: 'container-row',
							elType: 'container',
							settings: {
								flex_direction: 'row',
								gap: '24px',
							},
						},
					],
				},
			],
		} );

		const root = result.project.documents[ 0 ].root[ 0 ];
		const child = root.children[ 0 ];
		expect( root.layout ).toMatchObject( {
			display: 'flex',
			direction: 'column',
		} );
		expect( child.layout ).toMatchObject( {
			display: 'flex',
			direction: 'row',
			gap: '24px',
		} );
		expect( root.props ).not.toHaveProperty( 'direction' );
		expect( child.props ).not.toHaveProperty( 'flex_direction' );
	} );

	it( 'preserves Elementor spacing, sizing, and alignment control objects', () => {
		const result = importElementorPackage( {
			title: 'Spacing Page',
			type: 'page',
			content: [
				{
					id: 'spaced-container',
					elType: 'container',
					settings: {
						padding: { top: '40', right: '32', bottom: '24', left: '32', unit: 'px' },
						margin: { top: '0', right: 'auto', bottom: '48', left: 'auto', unit: 'px' },
						gap: { size: 20, unit: 'px' },
						content_width: { size: 92, unit: '%' },
						max_width: { size: 1140, unit: 'px' },
						min_height: { size: 420, unit: 'px' },
						justify_content: 'center',
						align_items: 'stretch',
					},
					elements: [
						{
							id: 'aligned-heading',
							elType: 'widget',
							widgetType: 'heading',
							settings: {
								title: 'Aligned Heading',
								align: 'center',
								typography_font_size: { size: 48, unit: 'px' },
								typography_font_size_tablet: { size: 36, unit: 'px' },
								align_mobile: 'right',
								margin: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px' },
								margin_mobile: { top: '0', right: '0', bottom: '8', left: '0', unit: 'px' },
							},
						},
					],
				},
			],
		} );

		const container = result.project.documents[ 0 ].root[ 0 ];
		const heading = container.children[ 0 ];
		expect( container.layout ).toMatchObject( {
			display: 'flex',
			direction: 'column',
			gap: '20px',
			width: '92%',
			maxWidth: '1140px',
			minHeight: '420px',
			justifyContent: 'center',
			alignItems: 'stretch',
		} );
		expect( container.styles.base ).toMatchObject( {
			padding: '40px 32px 24px 32px',
			margin: '0px auto 48px auto',
			gap: '20px',
			maxWidth: '1140px',
			minHeight: '420px',
		} );
		expect( heading.styles.base ).toMatchObject( {
			textAlign: 'center',
			fontSize: '48px',
			margin: '0px 0px 16px 0px',
		} );
		expect( heading.styles.breakpoints.tablet ).toMatchObject( {
			fontSize: '36px',
		} );
		expect( heading.styles.breakpoints.mobile ).toMatchObject( {
			textAlign: 'right',
			margin: '0px 0px 8px 0px',
		} );
	} );

	it( 'preserves background images, gradients, overlays, borders, ids, and classes', () => {
		const result = importElementorPackage( {
			title: 'Visual Fidelity Page',
			type: 'page',
			content: [
				{
					id: 'hero-section',
					elType: 'section',
					settings: {
						html_id: 'hero',
						css_classes: 'hero-section imported',
						background_background: 'classic',
						background_color: '#101827',
						background_image: { url: 'https://example.com/hero.jpg' },
						background_position: 'center center',
						background_size: 'cover',
						background_repeat: 'no-repeat',
						background_attachment: 'fixed',
						background_overlay_color: 'rgba(0,0,0,0.45)',
						background_overlay_opacity: { size: 60 },
						border_border: 'solid',
						border_width: { top: 2, right: 2, bottom: 4, left: 2, unit: 'px' },
						border_color: '#ffffff',
						border_radius: { top: 24, right: 24, bottom: 24, left: 24, unit: 'px' },
						box_shadow: { horizontal: 0, vertical: 20, blur: 45, spread: 0, color: 'rgba(15,23,42,0.3)' },
					},
				},
			],
		} );

		const section = result.project.documents[ 0 ].root[ 0 ];
		expect( section.layout ).toMatchObject( {
			display: 'flex',
			direction: 'column',
		} );
		expect( section.attributes ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { name: 'id', value: 'hero' } ),
			expect.objectContaining( { name: 'class', value: 'hero-section imported' } ),
		] ) );
		expect( section.styles.base ).toMatchObject( {
			backgroundColor: '#101827',
			backgroundImage: 'url("https://example.com/hero.jpg")',
			backgroundPosition: 'center center',
			backgroundSize: 'cover',
			backgroundRepeat: 'no-repeat',
			backgroundAttachment: 'fixed',
			border: '2px solid #ffffff',
			borderWidth: '2px 2px 4px 2px',
			borderColor: '#ffffff',
			borderRadius: '24px 24px 24px 24px',
			position: 'relative',
		} );
		expect( section.styles.base.boxShadow ).toContain( '0px 20px 45px 0px rgba(15,23,42,0.3)' );
		expect( section.styles.customCss ).toContain( 'selector::before' );
		expect( section.styles.customCss ).toContain( 'background-color: rgba(0,0,0,0.45);' );
		expect( section.styles.customCss ).toContain( 'opacity: 0.6;' );
	} );

	it( 'imports hover and responsive visual styles', () => {
		const result = importElementorPackage( {
			title: 'Stateful Page',
			type: 'page',
			content: [
				{
					id: 'button-1',
					elType: 'widget',
					widgetType: 'button',
					settings: {
						text: 'Buy now',
						background_color: '#111827',
						background_color_hover: '#2563eb',
						text_color_hover: '#ffffff',
						padding_tablet: { top: 12, right: 20, bottom: 12, left: 20, unit: 'px' },
						background_color_mobile: '#0f172a',
						background_color_hover_mobile: '#1d4ed8',
					},
				},
			],
		} );

		const button = result.project.documents[ 0 ].root[ 0 ];
		expect( button.styles.base ).toMatchObject( {
			backgroundColor: '#111827',
		} );
		expect( button.styles.states.hover ).toMatchObject( {
			backgroundColor: '#2563eb',
			color: '#ffffff',
		} );
		expect( button.styles.breakpoints.tablet ).toMatchObject( {
			padding: '12px 20px 12px 20px',
		} );
		expect( button.styles.breakpoints.mobile ).toMatchObject( {
			backgroundColor: '#0f172a',
		} );
		expect( button.styles.stateBreakpoints.mobile.hover ).toMatchObject( {
			backgroundColor: '#1d4ed8',
		} );
	} );

	it( 'maps positioning, effects, and widget-specific style aliases', () => {
		const result = importElementorPackage( {
			title: 'Widget Style Page',
			type: 'page',
			content: [
				{
					id: 'image-1',
					elType: 'widget',
					widgetType: 'image',
					settings: {
						image: { url: 'https://example.com/product.png', alt: 'Product' },
						object_fit: 'cover',
						image_position: 'center center',
						width: { size: 320, unit: 'px' },
						height: { size: 240, unit: 'px' },
						_position: 'absolute',
						_offset_x: { size: 16, unit: 'px' },
						_offset_y: { size: 24, unit: 'px' },
						_z_index: 3,
						opacity: { size: 85 },
						filter_blur: { size: 2 },
						rotate: 8,
					},
				},
				{
					id: 'form-1',
					elType: 'widget',
					widgetType: 'form',
					settings: {
						field_gap: { size: 18, unit: 'px' },
						input_padding: { top: 10, right: 12, bottom: 10, left: 12, unit: 'px' },
						input_background_color: '#f8fafc',
						input_border_radius: { top: 8, right: 8, bottom: 8, left: 8, unit: 'px' },
						button_padding: { top: 12, right: 18, bottom: 12, left: 18, unit: 'px' },
						form_fields: [ { field_type: 'email', field_label: 'Email' } ],
					},
				},
				{
					id: 'menu-1',
					elType: 'widget',
					widgetType: 'nav-menu',
					settings: {
						layout: 'vertical',
						item_padding: { top: 8, right: 10, bottom: 8, left: 10, unit: 'px' },
						item_background_color: '#e0f2fe',
						item_text_color: '#075985',
					},
				},
			],
		} );

		const [ image, form, menu ] = result.project.documents[ 0 ].root;
		expect( image.props.fit ).toBe( 'cover' );
		expect( image.styles.base ).toMatchObject( {
			objectFit: 'cover',
			objectPosition: 'center center',
			width: '320px',
			height: '240px',
			position: 'absolute',
			left: '16px',
			top: '24px',
			zIndex: 3,
			opacity: '0.85',
			filter: 'blur(2px)',
			transform: 'rotate(8deg)',
		} );
		expect( form.styles.base ).toMatchObject( {
			fieldGap: '18px',
			inputPadding: '10px 12px 10px 12px',
			inputBackground: '#f8fafc',
			inputBorderRadius: '8px 8px 8px 8px',
			submitPadding: '12px 18px 12px 18px',
		} );
		expect( menu.props.orientation ).toBe( 'vertical' );
		expect( menu.styles.base ).toMatchObject( {
			itemPadding: '8px 10px 8px 10px',
			itemBackground: '#e0f2fe',
			itemColor: '#075985',
		} );
	} );

	it( 'reports unsupported advanced Elementor style keys with source names', () => {
		const result = importElementorPackage( {
			title: 'Advanced Styles',
			type: 'page',
			content: [
				{
					id: 'animated-heading',
					elType: 'widget',
					widgetType: 'heading',
					settings: {
						title: 'Animated',
						entrance_animation: 'fadeInUp',
						background_video_link: 'https://example.com/video.mp4',
						mask_shape: 'circle',
					},
				},
			],
		} );

		expect( result.warnings ).toEqual( expect.arrayContaining( [
			expect.objectContaining( {
				code: 'unsupported-style',
				sourceId: 'animated-heading',
				sourceType: 'heading',
			} ),
		] ) );
		expect( result.parityGaps[ `${ result.project.documents[ 0 ].id }::heading` ].messages[ 0 ] ).toContain( 'entrance_animation' );
		expect( result.parityGaps[ `${ result.project.documents[ 0 ].id }::heading` ].messages[ 0 ] ).toContain( 'background_video_link' );
	} );

	it( 'maps forms into native field nodes', () => {
		const result = importElementorPackage( {
			title: 'Contact Form',
			content: [
				{
					id: 'form-1',
					elType: 'widget',
					widgetType: 'form',
					settings: {
						submit_button_text: 'Send',
						form_fields: [
							{ field_type: 'text', field_label: 'Name', field_placeholder: 'Your name' },
							{ field_type: 'email', field_label: 'Email', field_placeholder: 'name@example.com' },
							{ field_type: 'textarea', field_label: 'Message', field_rows: 4 },
							{ field_type: 'checkbox', field_label: 'Agree' },
						],
					},
				},
			],
		} );

		const form = result.project.documents[ 0 ].root[ 0 ];
		expect( form.type ).toBe( 'form' );
		expect( form.props.submitLabel ).toBe( 'Send' );
		expect( form.children.map( ( child ) => child.type ) ).toEqual( [
			'form-field-text',
			'form-field-email',
			'form-field-textarea',
			'form-field-checkbox',
		] );
		expect( String( form.children[ 1 ].props.markup ) ).toContain( 'type="email"' );
		expect( String( form.children[ 2 ].props.markup ) ).toContain( '<textarea' );
		expect( String( form.children[ 3 ].props.markup ) ).toContain( 'type="checkbox"' );
	} );

	it( 'extracts kit and theme bridge data from kit payloads', () => {
		const result = importElementorPackage( {
			title: 'Imported Kit Sample',
			type: 'kit',
			page_settings: {
				site_name: 'Imported Kit Studio',
				logo_text: 'Kit Bridge',
				page_width: '1240px',
				custom_css: '.kit-bridge { color: #1d4ed8; }',
				global_colors: [
					{ id: 'kit-primary', title: 'Primary', color: '#2563eb' },
					{ id: 'kit-accent', title: 'Accent', color: '#7c3aed' },
				],
				global_typography: {
					body: {
						font_family: 'Inter, sans-serif',
						font_size: '16px',
						line_height: '1.6',
						font_weight: '400',
					},
				},
				theme_style_buttons: {
					base: {
						padding: '0.875rem 1.25rem',
						borderRadius: '999px',
						fontWeight: '700',
					},
				},
				theme_style_form_fields: {
					base: {
						padding: '0.75rem 1rem',
						borderRadius: '0.75rem',
						border: '1px solid #cbd5e1',
					},
				},
			},
			content: [
				{
					id: 'kit-root',
					elType: 'container',
					elements: [
						{
							id: 'kit-heading',
							elType: 'widget',
							widgetType: 'heading',
							settings: { title: 'Imported Kit', header_size: 'h1' },
						},
						{
							id: 'kit-copy',
							elType: 'widget',
							widgetType: 'text-editor',
							settings: { editor: '<p>Kit bridge metadata extracted from Elementor settings.</p>' },
						},
						{
							id: 'kit-gallery',
							elType: 'widget',
							widgetType: 'gallery-pro',
							settings: { layout: 'masonry' },
						},
					],
				},
			],
		} );

		const document = result.project.documents[ 0 ];
		const bridge = result.project.meta.importBridge as {
			kits?: Array<{ documentKind?: string; variableIds?: string[]; themeStyleKeys?: string[] }>;
			parityGaps?: Record<string, { nativeReplacement?: string }>;
		};

		expect( document.kind ).toBe( 'kit' );
		expect( document.meta.kitBridge ).toMatchObject( {
			rawSettingsKeys: expect.arrayContaining( [ 'site_name', 'global_colors' ] ),
			themeStyleKeys: expect.arrayContaining( [ 'buttons', 'forms' ] ),
		} );
		expect( result.project.designSystem.variables.some( ( variable ) => variable.id === 'kit-primary' && variable.source === 'kit' && variable.kind === 'color' ) ).toBe( true );
		expect( result.project.designSystem.variables.some( ( variable ) => variable.kind === 'font-family' && variable.source === 'kit' ) ).toBe( true );
		expect( result.project.designSystem.themeStyles.buttons.base.padding ).toBe( '0.875rem 1.25rem' );
		expect( result.project.designSystem.themeStyles.forms.base.border ).toBe( '1px solid #cbd5e1' );
		expect( result.project.designSystem.customCss ).toContain( '.kit-bridge' );
		expect( bridge.kits?.[ 0 ] ).toMatchObject( {
			documentKind: 'kit',
		} );
		expect( bridge.kits?.[ 0 ]?.variableIds ).toEqual( expect.arrayContaining( [ 'kit-primary' ] ) );
		expect( result.parityGaps[ `${ document.id }::gallery-pro` ] ).toMatchObject( {
			nativeReplacement: 'gallery',
			compatKind: 'compat-widget',
		} );
		expect( bridge.parityGaps?.[ `${ document.id }::gallery-pro` ] ).toMatchObject( {
			nativeReplacement: 'gallery',
		} );
		expect( ( document.root[ 0 ].children[ 2 ] as { legacy?: { nativeReplacement?: string } } ).legacy?.nativeReplacement ).toBe( 'gallery' );
	} );

	it( 'maps common widgets to native aliases', () => {
		const result = importElementorPackage( {
			title: 'Content Widgets',
			content: [
				{
					id: 'shortcode-1',
					elType: 'widget',
					widgetType: 'shortcode',
					settings: { shortcode: '[gallery id="10"]' },
				},
				{
					id: 'image-box-1',
					elType: 'widget',
					widgetType: 'image-box',
					settings: {
						title_text: 'Feature callout',
						description_text: 'Composite image box copy',
						image: { url: 'https://example.com/feature.png', alt: 'Feature' },
					},
				},
				{
					id: 'testimonial-1',
					elType: 'widget',
					widgetType: 'testimonial',
					settings: {
						title: 'Trusted by teams',
						text: 'Testimonial body copy',
						avatar: { url: 'https://example.com/avatar.png', alt: 'Avatar' },
					},
				},
				{
					id: 'counter-1',
					elType: 'widget',
					widgetType: 'counter',
					settings: { value: 48, title: 'Projects shipped' },
				},
				{
					id: 'progress-1',
					elType: 'widget',
					widgetType: 'progress-bar',
					settings: { percent: 72, title: 'Launch readiness' },
				},
				{
					id: 'nav-menu-1',
					elType: 'widget',
					widgetType: 'nav-menu',
					settings: {
						items: [
							{ label: 'Home', link: { url: '/' } },
							{ label: 'Blog', link: { url: '/blog' } },
						],
					},
				},
				{
					id: 'gallery-1',
					elType: 'widget',
					widgetType: 'gallery',
					settings: {
						images: [
							{ url: 'https://example.com/hero-1.jpg' },
							{ url: 'https://example.com/hero-2.jpg' },
						],
					},
				},
				{
					id: 'carousel-1',
					elType: 'widget',
					widgetType: 'carousel',
					settings: {
						slides: [
							{ title: 'Slide one', caption: 'First caption' },
							{ title: 'Slide two', caption: 'Second caption' },
						],
					},
				},
				{
					id: 'toggle-1',
					elType: 'widget',
					widgetType: 'toggle',
					settings: {
						items: [
							{ title: 'One', body: 'First item' },
							{ title: 'Two', body: 'Second item' },
						],
					},
				},
				{
					id: 'blockquote-1',
					elType: 'widget',
					widgetType: 'blockquote',
					settings: { quote: 'Quote text', cite: 'Someone' },
				},
				{
					id: 'social-icons-1',
					elType: 'widget',
					widgetType: 'social-icons',
					settings: {
						social_icons: [
							{ title: 'GitHub', link: { url: 'https://github.com' } },
							{ title: 'Mastodon', link: { url: 'https://example.social' } },
						],
					},
				},
			],
		} );

		expect( result.project.documents[ 0 ].root.map( ( node ) => node.type ) ).toEqual( [
			'shortcode',
			'container',
			'container',
			'container',
			'container',
			'menu',
			'gallery',
			'carousel',
			'toggle',
			'blockquote',
			'social-icons',
		] );
		expect( String( result.project.documents[ 0 ].root[ 0 ].props.markup ) ).toContain( '[gallery id="10"]' );
		expect( result.project.documents[ 0 ].root[ 1 ].children[ 0 ].type ).toBe( 'image' );
		expect( result.project.documents[ 0 ].root[ 2 ].children[ 1 ].type ).toBe( 'heading' );
		expect( result.project.documents[ 0 ].root[ 3 ].children[ 0 ].type ).toBe( 'heading' );
		expect( result.project.documents[ 0 ].root[ 4 ].props.value ).toBe( 72 );
		expect( result.project.documents[ 0 ].root[ 5 ].props.items ).toHaveLength( 2 );
		expect( result.project.documents[ 0 ].root[ 6 ].props.images ).toHaveLength( 2 );
		expect( result.project.documents[ 0 ].root[ 7 ].props.slides ).toHaveLength( 2 );
		expect( result.project.documents[ 0 ].root[ 10 ].props.items[ 0 ].href ).toBe( 'https://github.com' );
	} );

	it( 'maps interactive families, grouped forms, and mixed legacy fallbacks for supported imports', () => {
		const result = importElementorPackage( {
			title: 'Interactive Widgets',
			content: [
				{
					id: 'menu-1',
					elType: 'widget',
					widgetType: 'nav-menu',
					settings: {
						links: [
							{ label: 'Overview', url: { url: '/overview' } },
							{ label: 'Pricing', url: { url: '/pricing' } },
						],
					},
				},
				{
					id: 'tabs-1',
					elType: 'widget',
					widgetType: 'tabs',
					settings: {
						active_tab: 1,
						tabs: [
							{ tab_title: 'First', tab_content: '<p>First tab</p>' },
							{ tab_title: 'Second', tab_content: '<p>Second tab</p>' },
						],
					},
				},
				{
					id: 'accordion-1',
					elType: 'widget',
					widgetType: 'accordion',
					settings: {
						tabs: [
							{ tab_title: 'Question one', tab_content: 'Answer one' },
							{ tab_title: 'Question two', tab_content: 'Answer two' },
						],
					},
				},
				{
					id: 'gallery-1',
					elType: 'widget',
					widgetType: 'gallery',
					settings: {
						gallery: [
							{ image: { url: 'https://example.com/a.jpg' } },
							{ image: { url: 'https://example.com/b.jpg' } },
						],
					},
				},
				{
					id: 'carousel-1',
					elType: 'widget',
					widgetType: 'slides',
					settings: {
						carousel: [
							{ heading: 'Slide A', description: 'A description', image: { url: 'https://example.com/slide-a.jpg' } },
							{ heading: 'Slide B', description: 'B description', image: { url: 'https://example.com/slide-b.jpg' } },
						],
					},
				},
				{
					id: 'form-1',
					elType: 'widget',
					widgetType: 'form',
					settings: {
						submit_button_text: 'Send',
						form_fields: [
							{
								field_type: 'group',
								field_label: 'Contact',
								fields: [
									{ field_type: 'text', field_label: 'Name' },
									{ field_type: 'email', field_label: 'Email' },
								],
							},
							{
								field_type: 'section',
								field_label: 'Project details',
								fields: [
									{ field_type: 'textarea', field_label: 'Summary' },
									{ field_type: 'upload', field_label: 'Brief' },
								],
							},
							{ field_type: 'submit', button_text: 'Send' },
						],
					},
				},
				{
					id: 'legacy-1',
					elType: 'widget',
					widgetType: 'hotspot',
					settings: { title: 'Unsupported hotspot' },
				},
			],
		} );

		const nodes = result.project.documents[ 0 ].root;
		const menu = nodes[ 0 ];
		const tabs = nodes[ 1 ];
		const accordion = nodes[ 2 ];
		const gallery = nodes[ 3 ];
		const carousel = nodes[ 4 ];
		const form = nodes[ 5 ];
		const legacy = nodes[ 6 ];

		expect( menu.type ).toBe( 'menu' );
		expect( menu.props.items ).toEqual( [
			{ label: 'Overview', href: '/overview' },
			{ label: 'Pricing', href: '/pricing' },
		] );
		expect( tabs.type ).toBe( 'tabs' );
		expect( tabs.slots.triggers ).toHaveLength( 2 );
		expect( tabs.slots.panels ).toHaveLength( 2 );
		expect( tabs.props.activeTab ).toBe( 1 );
		expect( tabs.slots.panels[ 0 ].children[ 0 ].type ).toBe( 'html' );
		expect( accordion.type ).toBe( 'accordion' );
		expect( accordion.props.items ).toEqual( expect.arrayContaining( [ expect.objectContaining( { title: 'Question one' } ) ] ) );
		expect( gallery.type ).toBe( 'gallery' );
		expect( gallery.props.images ).toEqual( [ 'https://example.com/a.jpg', 'https://example.com/b.jpg' ] );
		expect( carousel.type ).toBe( 'carousel' );
		expect( carousel.props.slides ).toEqual( expect.arrayContaining( [ expect.objectContaining( { title: 'Slide A', image: 'https://example.com/slide-a.jpg' } ) ] ) );
		expect( form.type ).toBe( 'form' );
		expect( form.props.submitLabel ).toBe( 'Send' );
		expect( form.children[ 0 ].type ).toBe( 'container' );
		expect( form.children[ 0 ].children.map( ( child ) => child.type ) ).toEqual( [ 'paragraph', 'form-field-text', 'form-field-email' ] );
		expect( form.children[ 1 ].children.some( ( child ) => child.type === 'compat-widget' ) ).toBe( true );
		expect( legacy.type ).toBe( 'compat-widget' );
		expect( result.parityGaps[ `${ result.project.documents[ 0 ].id }::form-field:upload` ] ).toMatchObject( {
			nativeReplacement: undefined,
			compatKind: 'compat-widget',
		} );
		expect( result.parityGaps[ `${ result.project.documents[ 0 ].id }::hotspot` ] ).toMatchObject( {
			compatKind: 'compat-widget',
		} );
	} );

	it( 'imports theme-part, popup, and loop assignment structures where supported', () => {
		const result = importElementorPackage( [
			{
				title: 'Imported Header',
				type: 'header',
				conditions: [ { pathname: '/[...all]', priority: 100 } ],
				content: [
					{
						id: 'header-menu',
						elType: 'widget',
						widgetType: 'nav-menu',
						settings: {
							menu_items: [ { label: 'Home', link: { url: '/' } } ],
						},
					},
				],
			},
			{
				title: 'Imported Popup',
				type: 'popup',
				conditions: [ { pathname: '/[...all]', source: 'query', path: 'preview', operator: 'equals', value: '1' } ],
				content: [
					{
						id: 'popup-form',
						elType: 'widget',
						widgetType: 'form',
						settings: {
							form_fields: [ { field_type: 'email', field_label: 'Email' } ],
						},
					},
				],
			},
			{
				title: 'Imported Archive',
				type: 'archive',
				conditions: [ { pathname: '/blog' } ],
				content: [
					{
						id: 'loop-grid-1',
						elType: 'widget',
						widgetType: 'loop-grid',
						settings: {
							source: 'posts',
							posts_per_page: 4,
							empty_message: 'No posts yet.',
						},
					},
				],
			},
			{
				title: 'Imported Loop Item',
				type: 'loop-item',
				conditions: [ { pathname: '/blog', slot: 'loop-item' } ],
				content: [
					{
						id: 'loop-item-copy',
						elType: 'widget',
						widgetType: 'text-editor',
						settings: { editor: '<p>Loop item</p>' },
					},
				],
			},
			{
				title: 'Imported Loop Empty',
				type: 'empty',
				conditions: [ { pathname: '/blog', slot: 'empty' } ],
				content: [
					{
						id: 'loop-empty-copy',
						elType: 'widget',
						widgetType: 'text-editor',
						settings: { editor: '<p>Nothing here yet</p>' },
					},
				],
			},
		] );

		const [ header, popup, archive, loopItem, emptyState ] = result.project.documents;
		const archiveLoop = archive.root[ 0 ];
		const popupAssignment = result.project.themeAssignments.find( ( assignment ) => assignment.documentId === popup.id );

		expect( header.kind ).toBe( 'layout' );
		expect( popup.kind ).toBe( 'popup' );
		expect( archive.kind ).toBe( 'template' );
		expect( loopItem.kind ).toBe( 'template' );
		expect( emptyState.kind ).toBe( 'template' );
		expect( result.project.themeAssignments.map( ( assignment ) => assignment.slot ) ).toEqual(
			expect.arrayContaining( [ 'header', 'popup', 'page', 'loop-item', 'empty' ] ),
		);
		expect( popupAssignment?.conditionGroups[ 0 ]?.rules[ 0 ] ).toMatchObject( {
			source: 'query',
			path: 'preview',
			operator: 'equals',
			value: '1',
		} );
		expect( archiveLoop.type ).toBe( 'loop' );
		expect( archiveLoop.props.collection ).toBe( 'posts' );
		expect( archiveLoop.props.limit ).toBe( 4 );
		expect( archiveLoop.slots.item[ 0 ].children[ 0 ].bindings[ 0 ]?.path ).toBe( 'title' );
		expect( archiveLoop.slots.empty[ 0 ].props.text ).toBe( 'No posts yet.' );
	} );

	it( 'reports parity gaps keyed by document and widget type', () => {
		const result = importElementorPackage( {
			title: 'Gap Report',
			content: [
				{
					id: 'section-1',
					elType: 'section',
					elements: [
						{
							id: 'column-1',
							elType: 'column',
							elements: [
								{
									id: 'widget-1',
									elType: 'widget',
									widgetType: 'gallery-pro',
									settings: { layout: 'masonry' },
								},
							],
						},
					],
				},
			],
		} );

		const documentId = result.project.documents[ 0 ].id;
		expect( result.parityGaps[ `${ documentId }::section` ] ).toMatchObject( {
			documentId,
			widgetType: 'section',
			count: 1,
			nativeReplacement: 'container',
			compatKind: 'container',
		} );
		expect( result.parityGaps[ `${ documentId }::column` ] ).toMatchObject( {
			documentId,
			widgetType: 'column',
			count: 1,
		} );
		expect( result.parityGaps[ `${ documentId }::gallery-pro` ] ).toMatchObject( {
			documentId,
			widgetType: 'gallery-pro',
			count: 1,
			nativeReplacement: 'gallery',
			compatKind: 'compat-widget',
		} );
		expect( result.warnings.filter( ( warning ) => warning.code === 'legacy-layout-normalized' ) ).toHaveLength( 2 );
		expect( result.warnings.some( ( warning ) => warning.code === 'unsupported-widget' && warning.sourceType === 'gallery-pro' ) ).toBe( true );
	} );

	it( 'preserves unsupported widgets as editable compat widgets', () => {
		const result = importElementorPackage( {
			title: 'Unknown Widget',
			content: [
				{
					id: 'widget-1',
					elType: 'widget',
					widgetType: 'gallery-pro',
					settings: { layout: 'masonry' },
				},
			],
		} );

		expect( result.project.documents[ 0 ].root[ 0 ].type ).toBe( 'compat-widget' );
		expect( ( result.project.documents[ 0 ].root[ 0 ] as { legacy?: { nativeReplacement?: string } } ).legacy?.nativeReplacement ).toBe( 'gallery' );
		expect( result.warnings.some( ( warning ) => warning.code === 'unsupported-widget' ) ).toBe( true );
	} );
} );
