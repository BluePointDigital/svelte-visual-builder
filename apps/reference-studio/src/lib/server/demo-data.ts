import type { BindingProviderContext } from '@builder/plugin-api';
import {
	createBuilderPackage,
	createDocument,
	createNode,
	createStyleSet,
	createThemeAssignment,
	type BuilderDocument,
	type BuilderNode,
	type BuilderPackage,
	type DocumentRevision,
} from '@builder/schema';
import { importElementorPackage, type ElementorImportWarning } from '@builder/elementor-import';

export type DemoStudioFixture = 'default' | 'dense-200' | 'dense-500';

export interface DemoStudioData {
	project: BuilderPackage;
	bindingContext: BindingProviderContext;
	importWarnings: ElementorImportWarning[];
}

export interface CreateDemoStudioDataOptions {
	fixture?: DemoStudioFixture;
}

function createSvgDataUrl( label: string, from: string, to: string ): string {
	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${ label }">
			<defs>
				<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color="${ from }" />
					<stop offset="100%" stop-color="${ to }" />
				</linearGradient>
			</defs>
			<rect width="1200" height="800" rx="48" fill="url(#g)" />
			<text x="72" y="118" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700">${ label }</text>
			<text x="72" y="185" fill="rgba(255,255,255,0.84)" font-family="Arial, Helvetica, sans-serif" font-size="28">Demo asset for reference-studio parity fixtures</text>
		</svg>
	`;
	return `data:image/svg+xml;charset=utf-8,${ encodeURIComponent( svg ) }`;
}

function createRevision( id: string, documentId: string, kind: DocumentRevision['kind'], label: string, createdAt: string ): DocumentRevision {
	return {
		id,
		documentId,
		kind,
		label,
		createdAt,
		meta: {
			source: 'reference-studio-demo',
		},
	};
}

function markPublished<T extends BuilderDocument>( document: T ): T {
	document.status = 'published';
	return document;
}

function createSurfaceCardStyle( accent = '#d7deec' ) {
	return createStyleSet( {
		base: {
			padding: '1.25rem',
			borderRadius: '1rem',
			border: `1px solid ${ accent }`,
			background: '#ffffff',
			boxShadow: '0 18px 38px rgba(15, 23, 42, 0.08)',
			gap: '0.75rem',
		},
	} );
}

function mergeImportedDesignSystem( target: BuilderPackage, source: BuilderPackage, namespace: string ): void {
	const variables = new Map( target.designSystem.variables.map( ( variable ) => [ variable.id, variable ] as const ) );
	for ( const variable of source.designSystem.variables ) {
		variables.set( variable.id, variable );
	}
	target.designSystem.variables = [ ...variables.values() ];
	target.designSystem.themeStyles = {
		...target.designSystem.themeStyles,
		...Object.fromEntries( Object.entries( source.designSystem.themeStyles ).map( ( [ key, value ] ) => [ `${ namespace }-${ key }`, value ] ) ),
	};
	target.designSystem.customCss = [ target.designSystem.customCss, source.designSystem.customCss ].filter( Boolean ).join( '\n\n' );
	target.designSystem.experiments = {
		...target.designSystem.experiments,
		...source.designSystem.experiments,
	};
}

function countBuilderNodes( nodes: BuilderNode[] ): number {
	let total = 0;
	for ( const node of nodes ) {
		total += 1;
		total += countBuilderNodes( node.children ?? [] );
		for ( const slotNodes of Object.values( node.slots ?? {} ) as BuilderNode[][] ) {
			total += countBuilderNodes( slotNodes );
		}
	}
	return total;
}

function createDenseFixtureCard( fixture: DemoStudioFixture, sectionIndex: number, cardIndex: number ): BuilderNode {
	const ordinal = ( sectionIndex * 8 ) + cardIndex + 1;
	return createNode( {
		id: `dense-${ fixture }-card-${ ordinal }`,
		type: 'container',
		styleRefs: [ 'surface-card' ],
		styles: createStyleSet( {
			base: {
				minHeight: '100%',
				padding: '0.875rem',
				borderRadius: '0.875rem',
				background: '#ffffff',
				border: '1px solid rgba(148,163,184,0.28)',
			},
		} ),
		layout: { display: 'flex', direction: 'column', gap: '0.5rem' },
		children: [
			createNode( {
				id: `dense-${ fixture }-card-heading-${ ordinal }`,
				type: 'heading',
				props: { text: `Dense card ${ ordinal }`, level: 'h3' },
			} ),
			createNode( {
				id: `dense-${ fixture }-card-copy-${ ordinal }`,
				type: 'paragraph',
				props: { text: 'Nested card content keeps the navigator and candidate resolution set large.' },
			} ),
			createNode( {
				id: `dense-${ fixture }-card-action-${ ordinal }`,
				type: 'button',
				props: { text: 'Inspect', href: '/marketing-landing' },
			} ),
		],
	} );
}

function createDenseFixtureSection( fixture: DemoStudioFixture, sectionIndex: number ): BuilderNode {
	const sectionLabel = fixture === 'dense-200' ? '200-node' : '500-node';
	return createNode( {
		id: `dense-${ fixture }-section-${ sectionIndex + 1 }`,
		type: 'container',
		layout: { display: 'grid', gap: '1rem' },
		styles: createStyleSet( {
			base: {
				padding: '1.25rem',
				borderRadius: '1rem',
				border: '1px solid #cbd5e1',
				background: sectionIndex % 2 === 0 ? '#f8fafc' : '#eff6ff',
			},
		} ),
		children: [
			createNode( {
				id: `dense-${ fixture }-section-heading-${ sectionIndex + 1 }`,
				type: 'heading',
				props: { text: `${ sectionLabel } performance fixture section ${ sectionIndex + 1 }`, level: 'h2' },
			} ),
			createNode( {
				id: `dense-${ fixture }-section-copy-${ sectionIndex + 1 }`,
				type: 'paragraph',
				props: { text: 'Deterministic dense content for drag, geometry, and candidate-resolution profiling.' },
			} ),
			createNode( {
				id: `dense-${ fixture }-grid-${ sectionIndex + 1 }`,
				type: 'container',
				layout: { display: 'grid', columns: 4, gap: '0.75rem' },
				children: Array.from( { length: 8 }, ( _, cardIndex ) => createDenseFixtureCard( fixture, sectionIndex, cardIndex ) ),
			} ),
			createNode( {
				id: `dense-${ fixture }-dropzone-${ sectionIndex + 1 }`,
				type: 'container',
				styles: createStyleSet( {
					base: {
						minHeight: '96px',
						border: '1px dashed #94a3b8',
						borderRadius: '0.875rem',
						background: 'rgba(255,255,255,0.72)',
					},
				} ),
				children: [],
			} ),
		],
	} );
}

function applyDenseFixture( document: BuilderDocument, fixture: DemoStudioFixture ): BuilderDocument {
	const targetNodeCount = fixture === 'dense-200' ? 200 : 500;
	const denseSections: BuilderNode[] = [];
	let nodeCount = countBuilderNodes( document.root );
	let sectionIndex = 0;

	while ( nodeCount < targetNodeCount ) {
		const section = createDenseFixtureSection( fixture, sectionIndex++ );
		denseSections.push( section );
		nodeCount += countBuilderNodes( [ section ] );
	}

	if ( denseSections.length ) {
		document.root = [ ...document.root, ...denseSections ];
		document.meta = {
			...document.meta,
			profilingFixture: fixture,
			profilingTargetNodes: targetNodeCount,
		};
	}

	return document;
}

export function createDemoStudioData( options: CreateDemoStudioDataOptions = {} ): DemoStudioData {
	const fixture = options.fixture ?? 'default';
	const kit = createDocument( 'kit', 'Default Site Kit', 'default-site-kit' );
	kit.meta = {
		siteSettings: {
			siteName: 'Builder Studio',
			logoText: 'Svelte Builder',
			pageWidth: '1120px',
			supportEmail: 'hello@builder.studio',
			footerNote: 'Built to mirror Elementor-style parity flows.',
		},
		navigation: {
			primary: [ 'Home', 'Blog', 'Pricing', 'Support' ],
			siteEditor: [ 'Templates', 'Layout', 'Popups', 'Library' ],
		},
	};

	const heroComponent = markPublished( createDocument( 'component', 'Hero Component', 'hero-component' ) );
	heroComponent.component = {
		lockedStructure: true,
		exposedProperties: [
			{
				id: 'hero-title',
				nodeId: 'hero-title-node',
				label: 'Hero title',
				propPath: 'text',
				type: 'text',
				required: true,
			},
			{
				id: 'hero-copy',
				nodeId: 'hero-copy-node',
				label: 'Hero copy',
				propPath: 'text',
				type: 'richText',
			},
			{
				id: 'hero-cta',
				nodeId: 'hero-cta-node',
				label: 'Hero CTA',
				propPath: 'text',
				type: 'text',
			},
		],
		libraryGroup: 'marketing',
	};
	heroComponent.meta = {
		flows: [ 'component-master', 'component-instance', 'safe-overrides' ],
	};
	heroComponent.root = [
		createNode( {
			id: 'hero-shell',
			type: 'container',
			styleRefs: [ 'hero-shell' ],
			styles: createStyleSet( {
				base: {
					padding: '1.5rem',
					borderRadius: '1.5rem',
				},
			} ),
			children: [
				createNode( {
					id: 'hero-title-node',
					type: 'heading',
					props: { text: 'Default hero title', level: 'h1' },
				} ),
				createNode( {
					id: 'hero-copy-node',
					type: 'paragraph',
					props: { text: 'Reusable marketing hero content with safe instance overrides.' },
				} ),
				createNode( {
					id: 'hero-cta-node',
					type: 'button',
					props: { text: 'Start building', href: '/pricing' },
				} ),
			],
		} ),
	];

	const statComponent = markPublished( createDocument( 'component', 'Stat Card Component', 'stat-card-component' ) );
	statComponent.component = {
		lockedStructure: true,
		exposedProperties: [
			{
				id: 'stat-label',
				nodeId: 'stat-label-node',
				label: 'Label',
				propPath: 'text',
				type: 'text',
			},
			{
				id: 'stat-value',
				nodeId: 'stat-value-node',
				label: 'Value',
				propPath: 'text',
				type: 'text',
			},
		],
		libraryGroup: 'metrics',
	};
	statComponent.meta = {
		flows: [ 'component-master', 'component-instance', 'metrics' ],
	};
	statComponent.root = [
		createNode( {
			id: 'stat-shell',
			type: 'container',
			styleRefs: [ 'surface-card' ],
			children: [
				createNode( {
					id: 'stat-value-node',
					type: 'heading',
					props: { text: '48', level: 'h2' },
				} ),
				createNode( {
					id: 'stat-label-node',
					type: 'paragraph',
					props: { text: 'Builder metrics' },
				} ),
			],
		} ),
	];

	const featureSpotlightComponent = markPublished( createDocument( 'component', 'Feature Spotlight Component', 'feature-spotlight-component' ) );
	featureSpotlightComponent.component = {
		lockedStructure: true,
		exposedProperties: [
			{
				id: 'feature-eyebrow',
				nodeId: 'feature-eyebrow-node',
				label: 'Eyebrow',
				propPath: 'text',
				type: 'text',
			},
			{
				id: 'feature-title',
				nodeId: 'feature-title-node',
				label: 'Title',
				propPath: 'text',
				type: 'text',
			},
			{
				id: 'feature-copy',
				nodeId: 'feature-copy-node',
				label: 'Copy',
				propPath: 'text',
				type: 'richText',
			},
			{
				id: 'feature-link',
				nodeId: 'feature-link-node',
				label: 'Link',
				propPath: 'text',
				type: 'text',
			},
		],
		libraryGroup: 'storytelling',
	};
	featureSpotlightComponent.meta = {
		flows: [ 'component-master', 'component-instance', 'campaigns' ],
	};
	featureSpotlightComponent.root = [
		createNode( {
			id: 'feature-shell',
			type: 'container',
			styleRefs: [ 'surface-card', 'compat-stage' ],
			children: [
				createNode( {
					id: 'feature-eyebrow-node',
					type: 'paragraph',
					styleRefs: [ 'eyebrow-pill' ],
					props: { text: 'Feature spotlight' },
				} ),
				createNode( {
					id: 'feature-title-node',
					type: 'heading',
					props: { text: 'Reusable stories ship faster', level: 'h2' },
				} ),
				createNode( {
					id: 'feature-copy-node',
					type: 'paragraph',
					props: { text: 'Master-driven storytelling blocks keep structure locked while allowing local copy changes.' },
				} ),
				createNode( {
					id: 'feature-link-node',
					type: 'button',
					props: { text: 'View component guide', href: '/components' },
				} ),
			],
		} ),
	];

	const header = markPublished( createDocument( 'layout', 'Global Header', 'global-header' ) );
	header.meta = {
		flows: [ 'theme-layout', 'site-editor-entry' ],
		siteEditorEntry: 'header',
	};
	header.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'row', gap: '1rem' },
			styles: createStyleSet( {
				base: {
					padding: '1rem 1.5rem',
					background: '#0f172a',
					color: '#ffffff',
					alignItems: 'center',
					justifyContent: 'space-between',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Svelte Builder', level: 'h3' } } ),
				createNode( { type: 'menu', props: { items: [ { label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: 'Pricing', href: '/pricing' }, { label: 'Support', href: '/support' } ] } } ),
				createNode( { type: 'button', props: { text: 'Book a demo', href: '/pricing' } } ),
			],
		} ),
	];

	const footer = markPublished( createDocument( 'layout', 'Global Footer', 'global-footer' ) );
	footer.meta = {
		flows: [ 'theme-layout', 'site-editor-entry' ],
		siteEditorEntry: 'footer',
	};
	footer.root = [
		createNode( {
			type: 'container',
			layout: { display: 'grid', columns: 2, gap: '1rem' },
			styles: createStyleSet( {
				base: {
					padding: '1.5rem',
					background: '#0f172a',
					color: '#ffffff',
				},
			} ),
			children: [
				createNode( {
					type: 'paragraph',
					props: { text: 'Footer content, legal links, and site metadata.' },
				} ),
				createNode( {
					type: 'menu',
					props: { items: [ { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Status', href: '/status' } ] },
				} ),
			],
		} ),
	];

	const siteEditorRail = markPublished( createDocument( 'layout', 'Site Editor Rail', 'site-editor-rail' ) );
	siteEditorRail.meta = {
		flows: [ 'site-editor-entry', 'sidebar-shell', 'loop-preview' ],
	};
	siteEditorRail.root = [
		createNode( {
			type: 'container',
			styleRefs: [ 'editor-rail' ],
			children: [
				createNode( { type: 'paragraph', styleRefs: [ 'eyebrow-pill' ], props: { text: 'Site Editor' } } ),
				createNode( { type: 'heading', props: { text: 'Template navigation', level: 'h3' } } ),
				createNode( { type: 'paragraph', props: { text: 'This rail appears when the preview query includes a site-editor marker.' } } ),
				createNode( {
					type: 'loop',
					props: { collection: 'siteEditorEntries', limit: 6, emptyText: 'No site-editor entries defined.' },
					slots: {
						item: [
							createNode( {
								type: 'container',
								styles: createStyleSet( {
									base: {
										padding: '0.85rem',
										borderRadius: '0.875rem',
										background: 'rgba(255,255,255,0.74)',
										border: '1px solid rgba(148,163,184,0.28)',
									},
								} ),
								children: [
									createNode( {
										type: 'heading',
										props: { text: 'Template entry', level: 'h4' },
										bindings: [ { id: 'site-entry-title', targetKind: 'prop', target: 'text', source: 'collection', path: 'label', args: {} } ],
									} ),
									createNode( {
										type: 'paragraph',
										props: { text: 'Entry route' },
										bindings: [ { id: 'site-entry-route', targetKind: 'prop', target: 'text', source: 'collection', path: 'route', args: {} } ],
									} ),
								],
							} ),
						],
					},
				} ),
			],
		} ),
	];

	const page = markPublished( createDocument( 'page', 'Marketing Landing', 'marketing-landing' ) );
	page.meta = {
		flows: [ 'composition', 'named-slots', 'popup-preview', 'library' ],
	};
	page.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '2rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '1120px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( {
					type: 'component-instance',
					props: {
						componentId: heroComponent.id,
						overrides: {
							'hero-title': 'Parity-oriented Svelte page building',
							'hero-copy': 'This page mixes native widgets, named slots, assignment-driven layout, loop rendering, popup composition, and editable compat content.',
							'hero-cta': 'Explore the system',
						},
					},
				} ),
				createNode( {
					type: 'container',
					styleRefs: [ 'surface-card' ],
					children: [
						createNode( {
							type: 'heading',
							props: { text: 'Named slot orchestration', level: 'h2' },
						} ),
						createNode( {
							type: 'paragraph',
							props: { text: 'This fixture uses named slots for status, supporting rail content, and action groups instead of forcing everything into children.' },
						} ),
					],
					slots: {
						status: [
							createNode( {
								type: 'paragraph',
								styleRefs: [ 'eyebrow-pill' ],
								props: { text: 'Slot: status' },
							} ),
						],
						rail: [
							createNode( {
								type: 'component-instance',
								props: {
									componentId: featureSpotlightComponent.id,
									overrides: {
										'feature-eyebrow': 'Slot: rail',
										'feature-title': 'Contextual content rail',
										'feature-copy': 'Named slots make future panel, sidebar, and auxiliary document insertion much easier to extend.',
										'feature-link': 'Inspect slot mapping',
									},
								},
							} ),
						],
						actions: [
							createNode( { type: 'button', props: { text: 'Open popup preview', href: '/marketing-landing?preview=1' } } ),
							createNode( { type: 'button', props: { text: 'Open site editor rail', href: '/marketing-landing?siteEditor=templates' } } ),
						],
					},
				} ),
				createNode( {
					type: 'container',
					layout: { display: 'grid', columns: 3, gap: '1rem' },
					children: [
						createNode( {
							type: 'component-instance',
							props: {
								componentId: statComponent.id,
								overrides: { 'stat-value': '9', 'stat-label': 'Document kinds and flows' },
							},
						} ),
						createNode( {
							type: 'component-instance',
							props: {
								componentId: statComponent.id,
								overrides: { 'stat-value': '12', 'stat-label': 'Theme assignments and slot routes' },
							},
						} ),
						createNode( {
							type: 'component-instance',
							props: {
								componentId: statComponent.id,
								overrides: { 'stat-value': '5', 'stat-label': 'Previewable media assets' },
							},
						} ),
					],
				} ),
				createNode( {
					type: 'paragraph',
					props: {
						text: 'The parity fixture surface now exercises layouts, templates, components, library items, native content nodes, data-driven loops, popup and modal previews, site-editor rails, and mixed legacy compatibility imports.',
					},
				} ),
				createNode( {
					type: 'text-editor',
					props: {
						text: '<p><strong>Inline rich text</strong> stays editor-owned in the V3 shell, so formatting changes round-trip without depending on runtime DOM editing.</p>',
					},
				} ),
				createNode( {
					type: 'blockquote',
					props: {
						text: 'Shared editing contracts make <em>preview surfaces</em> feel dependable instead of fragile.',
						cite: 'Builder runtime notes',
					},
				} ),
				createNode( {
					type: 'container',
					layout: { display: 'grid', columns: 4, gap: '1rem' },
					children: [
						createNode( { type: 'icon-box', props: { symbol: 'layers', title: 'Layouts', text: 'Header, footer, sidebar, and shell composition.' } } ),
						createNode( { type: 'icon-box', props: { symbol: 'database', title: 'Data bindings', text: 'Collections, load data, query params, and session context.' } } ),
						createNode( { type: 'icon-box', props: { symbol: 'spark', title: 'Components', text: 'Reusable masters with exposed overrides.' } } ),
						createNode( { type: 'icon-box', props: { symbol: 'shield', title: 'Legacy import', text: 'Editable compatibility widgets for unsupported Elementor content.' } } ),
					],
				} ),
				createNode( {
					type: 'tabs',
					props: { activeTab: 0 },
					slots: {
						triggers: [
							createNode( { type: 'button', props: { text: 'Audience', href: '#' } } ),
							createNode( { type: 'button', props: { text: 'System', href: '#' } } ),
							createNode( { type: 'button', props: { text: 'Delivery', href: '#' } } ),
						],
						panels: [
							createNode( {
								type: 'container',
								styles: createStyleSet( { base: { padding: '1rem', background: '#ffffff', border: '1px solid #d7deec', borderRadius: '1rem' } } ),
								children: [
									createNode( { type: 'paragraph', props: { text: 'Audience targeting is represented by path-aware assignments, popup preview conditions, and optional condition groups.' } } ),
								],
							} ),
							createNode( {
								type: 'container',
								styles: createStyleSet( { base: { padding: '1rem', background: '#ffffff', border: '1px solid #d7deec', borderRadius: '1rem' } } ),
								children: [
									createNode( { type: 'paragraph', props: { text: 'The system combines design tokens, classes, variables, templates, components, named slots, and theme assignments.' } } ),
								],
							} ),
							createNode( {
								type: 'container',
								styles: createStyleSet( { base: { padding: '1rem', background: '#ffffff', border: '1px solid #d7deec', borderRadius: '1rem' } } ),
								children: [
									createNode( { type: 'paragraph', props: { text: 'Delivery spans preview, publish, import, reusable library items, and a compact site-editor entry flow.' } } ),
								],
							} ),
						],
					},
				} ),
				createNode( {
					type: 'accordion',
					props: {
						items: [
							{ title: 'Named slots', body: 'Named slot nodes let the preview exercise rail, action, and status areas without hardcoding structure into the runtime.' },
							{ title: 'Loop item assignments', body: 'Loop item and empty-state documents exist as assignment targets so future runtime work can wire them in cleanly.' },
							{ title: 'Legacy compatibility', body: 'Unsupported Elementor widgets become editable compat widgets instead of disappearing.' },
						],
					},
				} ),
				createNode( {
					type: 'gallery',
					props: {
						images: [
							createSvgDataUrl( 'Gallery asset one', '#2563eb', '#1d4ed8' ),
							createSvgDataUrl( 'Gallery asset two', '#0f766e', '#115e59' ),
							createSvgDataUrl( 'Gallery asset three', '#7c3aed', '#5b21b6' ),
						],
					},
				} ),
				createNode( {
					type: 'carousel',
					props: {
						slides: [
							{ title: 'Composition view', caption: 'Header, page, footer, sidebar, popup, modal, and loop slot assignments resolved together.' },
							{ title: 'Runtime view', caption: 'Bindings, conditions, styles, and compatibility widgets remain separate.' },
							{ title: 'Editor view', caption: 'Selection, history, and preview state stay isolated from persisted documents.' },
						],
					},
				} ),
				createNode( {
					type: 'form',
					props: { submitLabel: 'Subscribe to updates' },
					children: [
						createNode( {
							type: 'form-field-email',
							props: {
								markup: '<label class="builder-form-field"><span>Email</span><input type="email" placeholder="name@example.com" /></label>',
							},
						} ),
						createNode( {
							type: 'form-field-checkbox',
							props: {
								markup: '<label class="builder-form-field builder-form-field--checkbox"><input type="checkbox" checked /><span>I want product and parity updates</span></label>',
							},
						} ),
					],
				} ),
				createNode( {
					type: 'loop',
					props: { collection: 'posts', limit: 3, emptyText: 'No posts available' },
					slots: {
						item: [
							createNode( {
								type: 'container',
								styles: createStyleSet( {
									base: {
										padding: '1rem',
										border: '1px solid #cbd5e1',
										borderRadius: '1rem',
										background: '#ffffff',
									},
								} ),
								children: [
									createNode( {
										type: 'heading',
										props: { text: 'Fallback title', level: 'h3' },
										bindings: [ { id: 'loop-title', targetKind: 'prop', target: 'text', source: 'collection', path: 'title', args: {} } ],
									} ),
									createNode( {
										type: 'paragraph',
										props: { text: 'Fallback excerpt' },
										bindings: [ { id: 'loop-excerpt', targetKind: 'prop', target: 'text', source: 'collection', path: 'excerpt', args: {} } ],
									} ),
									createNode( {
										type: 'paragraph',
										props: { text: 'Fallback author' },
										bindings: [ { id: 'loop-author', targetKind: 'prop', target: 'text', source: 'collection', path: 'author', args: {} } ],
									} ),
								],
							} ),
						],
						empty: [
							createNode( { type: 'paragraph', props: { text: 'Nothing in the collection yet.' } } ),
						],
					},
				} ),
				createNode( {
					type: 'svg',
					props: {
						markup: '<svg viewBox="0 0 200 56" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="56" rx="14" fill="#dbeafe"/><text x="20" y="35" fill="#1d4ed8" font-family="Arial" font-size="22" font-weight="700">Svelte Builder</text></svg>',
					},
				} ),
			],
		} ),
	];
	if ( fixture !== 'default' ) {
		applyDenseFixture( page, fixture );
	}

	const componentShowcasePage = markPublished( createDocument( 'page', 'Component Flow Playground', 'component-flow-playground' ) );
	componentShowcasePage.meta = {
		flows: [ 'component-master', 'component-instance', 'comparison' ],
		masterIds: [ heroComponent.id, statComponent.id, featureSpotlightComponent.id ],
	};
	componentShowcasePage.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '1.5rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '1120px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Component master and instance flow', level: 'h1' } } ),
				createNode( { type: 'paragraph', props: { text: 'This page keeps the master documents in the catalog while previewing multiple local overrides side by side.' } } ),
				createNode( {
					type: 'component-instance',
					props: {
						componentId: heroComponent.id,
						overrides: {
							'hero-title': 'Master-driven launch hero',
							'hero-copy': 'Instances can override copy and link content while keeping the structure locked to the component master.',
							'hero-cta': 'Review overrides',
						},
					},
				} ),
				createNode( {
					type: 'container',
					layout: { display: 'grid', columns: 2, gap: '1rem' },
					children: [
						createNode( {
							type: 'component-instance',
							props: {
								componentId: featureSpotlightComponent.id,
								overrides: {
									'feature-eyebrow': 'Master A',
									'feature-title': 'Launch narrative',
									'feature-copy': 'This instance is tuned for launch messaging.',
									'feature-link': 'Open launch story',
								},
							},
						} ),
						createNode( {
							type: 'component-instance',
							props: {
								componentId: featureSpotlightComponent.id,
								overrides: {
									'feature-eyebrow': 'Master B',
									'feature-title': 'Retention narrative',
									'feature-copy': 'The same component master can drive a retention-focused story without duplicating structure.',
									'feature-link': 'Open retention story',
								},
							},
						} ),
					],
				} ),
			],
		} ),
	];

	const mixedLegacyPage = markPublished( createDocument( 'page', 'Mixed Legacy Migration Page', 'legacy-mixed' ) );
	mixedLegacyPage.meta = {
		importedFrom: 'elementor-4.1.0',
		flows: [ 'legacy-import', 'compat-widget', 'native-and-legacy' ],
	};
	mixedLegacyPage.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '1.5rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '1120px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Mixed legacy migration page', level: 'h1' } } ),
				createNode( { type: 'paragraph', props: { text: 'This document intentionally mixes native nodes, component instances, and compatibility widgets to mimic a realistic Elementor migration surface.' } } ),
				createNode( {
					type: 'container',
					layout: { display: 'grid', columns: 2, gap: '1rem' },
					children: [
						createNode( {
							type: 'component-instance',
							props: {
								componentId: featureSpotlightComponent.id,
								overrides: {
									'feature-eyebrow': 'Native replacement',
									'feature-title': 'Atomic card beside compat widget',
									'feature-copy': 'This is the native side of the mixed migration surface.',
									'feature-link': 'Map replacement',
								},
							},
						} ),
						createNode( {
							type: 'compat-widget',
							props: { title: 'Legacy testimonial widget' },
							legacy: {
								widgetType: 'testimonial',
								rawSettings: {
									author_name: 'Legacy Author',
									testimonial_content: 'Imported testimonial content remains editable while native replacements are still being mapped.',
								},
								editable: true,
								nativeReplacement: 'feature-spotlight-component',
							},
							styles: createSurfaceCardStyle( '#fbbf24' ),
							children: [
								createNode( { type: 'heading', props: { text: 'Compatibility widget shell', level: 'h3' } } ),
								createNode( { type: 'paragraph', props: { text: 'The runtime keeps legacy settings visible instead of dropping them during import.' } } ),
							],
						} ),
					],
				} ),
				createNode( {
					type: 'image',
					props: {
						src: createSvgDataUrl( 'Legacy preview', '#f59e0b', '#b45309' ),
						alt: 'Legacy migration preview',
					},
				} ),
			],
		} ),
	];

	const singlePostTemplate = markPublished( createDocument( 'template', 'Single Post Template', 'single-post-template' ) );
	singlePostTemplate.meta = {
		flows: [ 'site-editor-entry', 'template-preview', 'load-bindings' ],
		siteEditorEntry: 'single-post',
	};
	singlePostTemplate.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '1.25rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '1120px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Single post', level: 'h1' } } ),
				createNode( {
					type: 'paragraph',
					props: { text: 'Template documents can resolve against load data, route context, and page-level metadata.' },
				} ),
				createNode( {
					type: 'image',
					props: { src: '', alt: 'Featured post image' },
					bindings: [
						{ id: 'single-post-image', targetKind: 'prop', target: 'src', source: 'load', path: 'post.featuredImage', args: {} },
					],
				} ),
				createNode( {
					type: 'heading',
					props: { text: 'Post title', level: 'h2' },
					bindings: [
						{ id: 'single-post-title', targetKind: 'prop', target: 'text', source: 'load', path: 'post.title', args: {} },
					],
				} ),
				createNode( {
					type: 'paragraph',
					props: { text: 'Post excerpt' },
					bindings: [
						{ id: 'single-post-excerpt', targetKind: 'prop', target: 'text', source: 'load', path: 'post.excerpt', args: {} },
					],
				} ),
				createNode( {
					type: 'paragraph',
					props: { text: 'Author / date metadata' },
					bindings: [
						{ id: 'single-post-meta', targetKind: 'prop', target: 'text', source: 'load', path: 'post.metaText', args: {} },
					],
				} ),
			],
		} ),
	];

	const blogArchiveTemplate = markPublished( createDocument( 'template', 'Blog Archive Template', 'blog-archive-template' ) );
	blogArchiveTemplate.meta = {
		flows: [ 'site-editor-entry', 'archive-template', 'loop-preview' ],
		siteEditorEntry: 'archive',
	};
	blogArchiveTemplate.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '1.5rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '1120px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Insights', level: 'h1' } } ),
				createNode( { type: 'paragraph', props: { text: 'Template documents can target archive-style routes independently from authored pages.' } } ),
				createNode( {
					type: 'loop',
					props: { collection: 'posts', limit: 6, emptyText: 'No posts published yet.' },
					slots: {
						item: [
							createNode( {
								type: 'container',
								styles: createStyleSet( {
									base: {
										padding: '1rem',
										border: '1px solid #d7deec',
										borderRadius: '1rem',
										background: '#ffffff',
									},
								} ),
								children: [
									createNode( {
										type: 'heading',
										props: { text: 'Post title', level: 'h3' },
										bindings: [ { id: 'blog-loop-title', targetKind: 'prop', target: 'text', source: 'collection', path: 'title', args: {} } ],
									} ),
									createNode( {
										type: 'paragraph',
										props: { text: 'Post summary' },
										bindings: [ { id: 'blog-loop-excerpt', targetKind: 'prop', target: 'text', source: 'collection', path: 'excerpt', args: {} } ],
									} ),
								],
							} ),
						],
					},
				} ),
			],
		} ),
	];

	const searchResultsTemplate = markPublished( createDocument( 'template', 'Search Results Template', 'search-results-template' ) );
	searchResultsTemplate.meta = {
		flows: [ 'site-editor-entry', 'search-template', 'query-preview' ],
		siteEditorEntry: 'search-results',
	};
	searchResultsTemplate.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '1rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '1120px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Search results', level: 'h1' } } ),
				createNode( { type: 'paragraph', props: { text: 'This template is ready for query-driven composition and loop results.' } } ),
				createNode( {
					type: 'loop',
					props: { collection: 'posts', limit: 4, emptyText: 'No matching results.' },
					slots: {
						item: [
							createNode( {
								type: 'container',
								styles: createStyleSet( {
									base: {
										padding: '0.75rem 1rem',
										borderLeft: '4px solid #2563eb',
										background: '#eff6ff',
									},
								} ),
								children: [
									createNode( {
										type: 'heading',
										props: { text: 'Search result', level: 'h3' },
										bindings: [ { id: 'search-loop-title', targetKind: 'prop', target: 'text', source: 'collection', path: 'title', args: {} } ],
									} ),
									createNode( {
										type: 'paragraph',
										props: { text: 'Result summary' },
										bindings: [ { id: 'search-loop-summary', targetKind: 'prop', target: 'text', source: 'collection', path: 'excerpt', args: {} } ],
									} ),
								],
							} ),
						],
					},
				} ),
			],
		} ),
	];

	const notFoundTemplate = markPublished( createDocument( 'template', '404 Template', 'not-found-template' ) );
	notFoundTemplate.meta = {
		flows: [ 'site-editor-entry', 'fallback-template' ],
		siteEditorEntry: 'not-found',
	};
	notFoundTemplate.root = [
		createNode( {
			type: 'container',
			layout: { display: 'flex', direction: 'column', gap: '1rem' },
			styles: createStyleSet( {
				base: {
					padding: '2rem',
					maxWidth: '720px',
					margin: '0 auto',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Page not found', level: 'h1' } } ),
				createNode( { type: 'paragraph', props: { text: '404 conditions and fallback templates are part of the parity fixture surface too.' } } ),
			],
		} ),
	];

	const loopItemTemplate = markPublished( createDocument( 'template', 'Post Loop Item Template', 'post-loop-item-template' ) );
	loopItemTemplate.meta = {
		flows: [ 'loop-slot', 'archive-item' ],
	};
	loopItemTemplate.root = [
		createNode( {
			type: 'container',
			styleRefs: [ 'surface-card' ],
			children: [
				createNode( { type: 'paragraph', styleRefs: [ 'eyebrow-pill' ], props: { text: 'Loop Item' } } ),
				createNode( { type: 'heading', props: { text: 'Reusable archive card', level: 'h3' } } ),
				createNode( { type: 'paragraph', props: { text: 'This template is assigned to the loop-item slot for future parity work.' } } ),
			],
		} ),
	];

	const loopEmptyTemplate = markPublished( createDocument( 'template', 'Post Loop Empty State', 'post-loop-empty-state' ) );
	loopEmptyTemplate.meta = {
		flows: [ 'loop-slot', 'empty-state' ],
	};
	loopEmptyTemplate.root = [
		createNode( {
			type: 'container',
			styleRefs: [ 'surface-card' ],
			children: [
				createNode( { type: 'heading', props: { text: 'Nothing has shipped yet', level: 'h3' } } ),
				createNode( { type: 'paragraph', props: { text: 'This empty-state template exists as a first-class assignment target.' } } ),
			],
		} ),
	];

	const popup = markPublished( createDocument( 'popup', 'Newsletter Popup', 'newsletter-popup' ) );
	popup.meta = {
		flows: [ 'popup-preview', 'conditional-assignment' ],
	};
	popup.root = [
		createNode( {
			type: 'popup-root',
			props: { title: 'Join the list' },
			styles: createStyleSet( {
				base: {
					padding: '1.5rem',
					border: '1px solid #cbd5e1',
					borderRadius: '1rem',
					background: '#ffffff',
					boxShadow: '0 20px 48px rgba(15, 23, 42, 0.15)',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Stay in the loop', level: 'h3' } } ),
				createNode( { type: 'paragraph', props: { text: 'Popup documents are composed separately from the page tree and are visible in preview mode.' } } ),
				createNode( {
					type: 'form',
					props: { submitLabel: 'Subscribe' },
					children: [
						createNode( { type: 'form-field-email', props: { markup: '<label class="builder-form-field"><span>Email</span><input type="email" placeholder="name@example.com" /></label>' } } ),
					],
				} ),
			],
		} ),
	];

	const themePreviewModal = markPublished( createDocument( 'popup', 'Theme Preview Modal', 'theme-preview-modal' ) );
	themePreviewModal.meta = {
		flows: [ 'modal-preview', 'site-editor-entry' ],
	};
	themePreviewModal.root = [
		createNode( {
			type: 'popup-root',
			props: { title: 'Template preview mode' },
			styles: createStyleSet( {
				base: {
					padding: '1.5rem',
					borderRadius: '1rem',
					background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
					border: '1px solid #bfdbfe',
				},
			} ),
			children: [
				createNode( { type: 'heading', props: { text: 'Theme Preview Modal', level: 'h3' } } ),
				createNode( { type: 'paragraph', props: { text: 'This modal previews assignment-driven overlays without leaving the current shell.' } } ),
				createNode( { type: 'button', props: { text: 'Open template list', href: '/site-editor/templates' } } ),
			],
		} ),
	];

	const libraryItem = markPublished( createDocument( 'library-item', 'FAQ Section Library Item', 'faq-section-library-item' ) );
	libraryItem.meta = {
		flows: [ 'library', 'accordion' ],
	};
	libraryItem.root = [
		createNode( {
			type: 'container',
			styleRefs: [ 'surface-card' ],
			layout: { display: 'flex', direction: 'column', gap: '1rem' },
			children: [
				createNode( { type: 'heading', props: { text: 'Frequently asked questions', level: 'h2' } } ),
				createNode( {
					type: 'accordion',
					props: {
						items: [
							{ title: 'Can this be reused?', body: 'Yes. Library items are reusable authored sections.' },
							{ title: 'Does it support the new model?', body: 'Yes. It uses the same node graph as pages and templates.' },
						],
					},
				} ),
			],
		} ),
	];

	const namedSlotLibraryItem = markPublished( createDocument( 'library-item', 'Named Slot Promo Strip', 'named-slot-promo-strip' ) );
	namedSlotLibraryItem.meta = {
		flows: [ 'library', 'named-slots' ],
	};
	namedSlotLibraryItem.root = [
		createNode( {
			type: 'container',
			styleRefs: [ 'surface-card' ],
			children: [
				createNode( { type: 'heading', props: { text: 'Named Slot Promo Strip', level: 'h2' } } ),
				createNode( { type: 'paragraph', props: { text: 'Reusable strip with action and supporting rail slots.' } } ),
			],
			slots: {
				lead: [
					createNode( { type: 'paragraph', styleRefs: [ 'eyebrow-pill' ], props: { text: 'Slot: lead' } } ),
				],
				aside: [
					createNode( { type: 'paragraph', props: { text: 'Slot: aside content' } } ),
				],
				actions: [
					createNode( { type: 'button', props: { text: 'Primary action', href: '/pricing' } } ),
				],
			},
		} ),
	];

	const imported = importElementorPackage( {
		title: 'Imported Legacy Sample',
		type: 'page',
		content: [
			{
				id: 'legacy-section',
				elType: 'section',
				elements: [
					{
						id: 'legacy-column',
						elType: 'column',
						elements: [
							{
								id: 'legacy-heading',
								elType: 'widget',
								widgetType: 'heading',
								settings: { title: 'Imported from Elementor', header_size: 'h2' },
							},
							{
								id: 'legacy-widget',
								elType: 'widget',
								widgetType: 'testimonial',
								settings: { author_name: 'Legacy Author' },
							},
						],
					},
				],
			},
		],
	}, 'Imported Example' );

	const importedKit = importElementorPackage( {
		title: 'Imported Kit Sample',
		type: 'kit',
		page_settings: {
			site_name: 'Imported Kit Studio',
			logo_text: 'Kit Bridge',
			page_width: '1240px',
			support_email: 'kit@example.com',
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
				heading: {
					font_family: 'Inter, sans-serif',
					font_size: '48px',
					line_height: '1.05',
					font_weight: '700',
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
			experiments: {
				atomic_form: true,
				legacy_compat_mode: true,
			},
			site_identity: {
				site_name: 'Imported Kit Studio',
				logo_text: 'Kit Bridge',
			},
		},
		content: [
			{
				id: 'kit-container',
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
	}, 'Imported Kit Sample' );

	const importedThemeBuilder = importElementorPackage( [
		{
			title: 'Imported Theme Header',
			type: 'header',
			conditions: [ { pathname: '/[...all]', priority: 96, label: 'Imported theme header' } ],
			content: [
				{
					id: 'imported-header-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-header-brand',
							elType: 'widget',
							widgetType: 'heading',
							settings: { title: 'Imported Theme Builder', header_size: 'h3' },
						},
						{
							id: 'imported-header-menu',
							elType: 'widget',
							widgetType: 'nav-menu',
							settings: {
								menu_items: [
									{ label: 'Overview', link: { url: '/imported-mixed' } },
									{ label: 'Archive', link: { url: '/imported-blog' } },
									{ label: 'Forms', link: { url: '/imported-mixed#imported-form' } },
								],
							},
						},
					],
				},
			],
		},
		{
			title: 'Imported Theme Footer',
			type: 'footer',
			conditions: [ { pathname: '/[...all]', priority: 96, label: 'Imported theme footer' } ],
			content: [
				{
					id: 'imported-footer-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-footer-copy',
							elType: 'widget',
							widgetType: 'text-editor',
							settings: { editor: '<p>Imported footer links and socials stay editable inside the same shell.</p>' },
						},
						{
							id: 'imported-footer-social',
							elType: 'widget',
							widgetType: 'social-icons',
							settings: {
								social_icons: [
									{ title: 'GitHub', link: { url: 'https://github.com' } },
									{ title: 'Discord', link: { url: 'https://discord.com' } },
								],
							},
						},
					],
				},
			],
		},
		{
			title: 'Imported Archive Template',
			type: 'archive',
			conditions: [ { pathname: '/imported-blog', priority: 72, label: 'Imported archive template' } ],
			content: [
				{
					id: 'imported-archive-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-archive-title',
							elType: 'widget',
							widgetType: 'heading',
							settings: { title: 'Imported archive loop', header_size: 'h1' },
						},
						{
							id: 'imported-archive-loop',
							elType: 'widget',
							widgetType: 'loop-grid',
							settings: {
								source: 'posts',
								posts_per_page: 3,
								empty_message: 'No imported posts yet.',
							},
						},
					],
				},
			],
		},
		{
			title: 'Imported Loop Item Template',
			type: 'loop-item',
			conditions: [ { slot: 'loop-item', pathname: '/imported-blog', priority: 71, label: 'Imported loop item template' } ],
			content: [
				{
					id: 'imported-loop-item-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-loop-item-title',
							elType: 'widget',
							widgetType: 'heading',
							settings: { title: 'Imported loop card', header_size: 'h3' },
						},
						{
							id: 'imported-loop-item-copy',
							elType: 'widget',
							widgetType: 'text-editor',
							settings: { editor: '<p>Imported loop item templates can be assigned separately from the archive page.</p>' },
						},
					],
				},
			],
		},
		{
			title: 'Imported Loop Empty Template',
			type: 'empty',
			conditions: [ { slot: 'empty', pathname: '/imported-blog', priority: 70, label: 'Imported loop empty state' } ],
			content: [
				{
					id: 'imported-empty-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-empty-copy',
							elType: 'widget',
							widgetType: 'text-editor',
							settings: { editor: '<p>The imported empty state keeps loop fallback copy editable.</p>' },
						},
					],
				},
			],
		},
		{
			title: 'Imported Newsletter Popup',
			type: 'popup',
			conditions: [ {
				pathname: '/[...all]',
				source: 'query',
				path: 'importedPopup',
				operator: 'equals',
				value: '1',
				priority: 92,
				label: 'Imported popup preview',
			} ],
			content: [
				{
					id: 'imported-popup-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-popup-heading',
							elType: 'widget',
							widgetType: 'heading',
							settings: { title: 'Imported popup workflow', header_size: 'h3' },
						},
						{
							id: 'imported-popup-copy',
							elType: 'widget',
							widgetType: 'text-editor',
							settings: { editor: '<p>Popup assignments from Elementor now land on previewable popup documents.</p>' },
						},
						{
							id: 'imported-popup-form',
							elType: 'widget',
							widgetType: 'form',
							settings: {
								submit_button_text: 'Join list',
								form_fields: [
									{ field_type: 'email', field_label: 'Email', field_placeholder: 'name@example.com' },
									{ field_type: 'checkbox', field_label: 'I want preview access' },
									{ field_type: 'submit', button_text: 'Join list' },
								],
							},
						},
					],
				},
			],
		},
		{
			title: 'Imported Mixed Workflow Page',
			type: 'page',
			conditions: [ { pathname: '/imported-mixed', priority: 74, label: 'Imported mixed workflow page' } ],
			content: [
				{
					id: 'imported-mixed-shell',
					elType: 'container',
					elements: [
						{
							id: 'imported-mixed-heading',
							elType: 'widget',
							widgetType: 'heading',
							settings: { title: 'Imported native and legacy mix', header_size: 'h1' },
						},
						{
							id: 'imported-mixed-menu',
							elType: 'widget',
							widgetType: 'nav-menu',
							settings: {
								links: [
									{ label: 'Playground', url: { url: '/imported-mixed' } },
									{ label: 'Archive', url: { url: '/imported-blog' } },
								],
							},
						},
						{
							id: 'imported-mixed-tabs',
							elType: 'widget',
							widgetType: 'tabs',
							settings: {
								active_tab: 1,
								tabs: [
									{ tab_title: 'Audience', tab_content: '<p>Assignments and templates can target distinct audiences.</p>' },
									{ tab_title: 'System', tab_content: '<p>Components, loops, forms, and popups now import into native families.</p>' },
								],
							},
						},
						{
							id: 'imported-mixed-accordion',
							elType: 'widget',
							widgetType: 'accordion',
							settings: {
								tabs: [
									{ tab_title: 'Collections', tab_content: 'Loop widgets now import into collection-aware loop nodes.' },
									{ tab_title: 'Forms', tab_content: 'Grouped fields stay editable and unsupported field types become compat nodes.' },
								],
							},
						},
						{
							id: 'imported-mixed-gallery',
							elType: 'widget',
							widgetType: 'gallery',
							settings: {
								images: [
									{ url: createSvgDataUrl( 'Imported gallery one', '#2563eb', '#1d4ed8' ) },
									{ url: createSvgDataUrl( 'Imported gallery two', '#0f766e', '#115e59' ) },
								],
							},
						},
						{
							id: 'imported-mixed-carousel',
							elType: 'widget',
							widgetType: 'carousel',
							settings: {
								slides: [
									{ title: 'Imported slide one', caption: 'Menu, tabs, gallery, and loop widgets render natively.' },
									{ title: 'Imported slide two', caption: 'Unsupported widgets remain editable compatibility nodes.' },
								],
							},
						},
						{
							id: 'imported-mixed-form',
							elType: 'widget',
							widgetType: 'form',
							settings: {
								submit_button_text: 'Request access',
								form_fields: [
									{
										field_type: 'group',
										field_label: 'Contact details',
										fields: [
											{ field_type: 'text', field_label: 'Name', field_placeholder: 'Ada Lovelace' },
											{ field_type: 'email', field_label: 'Work email', field_placeholder: 'ada@example.com' },
										],
									},
									{
										field_type: 'section',
										field_label: 'Rollout needs',
										fields: [
											{ field_type: 'textarea', field_label: 'Use case', field_rows: 4 },
											{ field_type: 'checkbox', field_label: 'Need migration support' },
											{ field_type: 'upload', field_label: 'Upload brief' },
										],
									},
									{ field_type: 'submit', button_text: 'Request access' },
								],
							},
						},
						{
							id: 'imported-mixed-legacy',
							elType: 'widget',
							widgetType: 'hotspot',
							settings: {
								title: 'Unsupported hotspot widget',
								description: 'This remains editable as a compat widget until a native mapping lands.',
							},
						},
					],
				},
			],
		},
	], 'Imported Theme Builder Sample' );

	const project = createBuilderPackage( 'Builder Studio', [
		kit,
		page,
		componentShowcasePage,
		mixedLegacyPage,
		header,
		footer,
		siteEditorRail,
		blogArchiveTemplate,
		singlePostTemplate,
		searchResultsTemplate,
		notFoundTemplate,
		loopItemTemplate,
		loopEmptyTemplate,
		heroComponent,
		statComponent,
		featureSpotlightComponent,
		popup,
		themePreviewModal,
		libraryItem,
		namedSlotLibraryItem,
		...imported.project.documents,
		...importedKit.project.documents,
		...importedThemeBuilder.project.documents,
	], [
		createThemeAssignment( {
			documentId: header.id,
			slot: 'header',
			status: 'published',
			pathname: '/[...all]',
			priority: 100,
			label: 'Global header',
		} ),
		createThemeAssignment( {
			documentId: footer.id,
			slot: 'footer',
			status: 'published',
			pathname: '/[...all]',
			priority: 100,
			label: 'Global footer',
		} ),
		createThemeAssignment( {
			documentId: siteEditorRail.id,
			slot: 'sidebar',
			status: 'published',
			pathname: '/[...all]',
			priority: 85,
			label: 'Site editor rail',
			conditionGroups: [
				{
					operator: 'and',
					rules: [
						{ source: 'query', path: 'siteEditor', operator: 'exists' },
					],
				},
			],
		} ),
		createThemeAssignment( {
			documentId: page.id,
			slot: 'page',
			status: 'published',
			pathname: '/marketing-landing',
			priority: 90,
			label: 'Marketing landing',
		} ),
		createThemeAssignment( {
			documentId: componentShowcasePage.id,
			slot: 'page',
			status: 'published',
			pathname: '/components',
			priority: 80,
			label: 'Component flow playground',
		} ),
		createThemeAssignment( {
			documentId: mixedLegacyPage.id,
			slot: 'page',
			status: 'published',
			pathname: '/legacy-mixed',
			priority: 78,
			label: 'Mixed legacy migration',
		} ),
		createThemeAssignment( {
			documentId: blogArchiveTemplate.id,
			slot: 'page',
			status: 'published',
			pathname: '/blog',
			priority: 70,
			label: 'Blog archive',
		} ),
		createThemeAssignment( {
			documentId: singlePostTemplate.id,
			slot: 'page',
			status: 'published',
			pathname: '/blog/[...slug]',
			priority: 75,
			label: 'Single post',
			conditionGroups: [
				{
					operator: 'and',
					rules: [
						{ source: 'route', path: 'pathname', operator: 'startsWith', value: '/blog' },
					],
				},
			],
		} ),
		createThemeAssignment( {
			documentId: searchResultsTemplate.id,
			slot: 'page',
			status: 'published',
			pathname: '/search',
			priority: 50,
			label: 'Search results',
		} ),
		createThemeAssignment( {
			documentId: notFoundTemplate.id,
			slot: 'page',
			status: 'published',
			pathname: '/404',
			priority: 10,
			label: '404 fallback',
		} ),
		createThemeAssignment( {
			documentId: loopItemTemplate.id,
			slot: 'loop-item',
			status: 'published',
			pathname: '/blog',
			priority: 60,
			label: 'Post loop item template',
		} ),
		createThemeAssignment( {
			documentId: loopEmptyTemplate.id,
			slot: 'empty',
			status: 'published',
			pathname: '/blog',
			priority: 55,
			label: 'Post loop empty state',
		} ),
		createThemeAssignment( {
			documentId: popup.id,
			slot: 'popup',
			status: 'published',
			pathname: '/[...all]',
			priority: 90,
			label: 'Newsletter popup',
			conditionGroups: [
				{
					operator: 'and',
					rules: [
						{ source: 'query', path: 'preview', operator: 'equals', value: '1' },
					],
				},
			],
		} ),
		createThemeAssignment( {
			documentId: themePreviewModal.id,
			slot: 'modal',
			status: 'published',
			pathname: '/[...all]',
			priority: 88,
			label: 'Theme preview modal',
			conditionGroups: [
				{
					operator: 'and',
					rules: [
						{ source: 'query', path: 'modal', operator: 'equals', value: '1' },
					],
				},
			],
		} ),
		...imported.project.themeAssignments,
		...importedKit.project.themeAssignments,
		...importedThemeBuilder.project.themeAssignments,
	] );

	project.designSystem.variables.push(
		{ id: 'brand', name: 'brand', label: 'Brand', kind: 'color', value: '#2563eb' },
		{ id: 'radius-xl', name: 'radius-xl', label: 'Radius XL', kind: 'radius', value: '24px' },
		{ id: 'surface-bg', name: 'surface-bg', label: 'Surface background', kind: 'color', value: '#f8fafc' },
		{ id: 'space-section', name: 'space-section', label: 'Section spacing', kind: 'spacing', value: '2rem' },
		{ id: 'rail-width', name: 'rail-width', label: 'Editor rail width', kind: 'size', value: '320px' },
	);

	project.designSystem.classes.push( {
		id: 'hero-shell',
		name: 'hero-shell',
		label: 'Hero Shell',
		order: 0,
		extends: [],
		styles: createStyleSet( {
			base: {
				padding: '3rem',
				borderRadius: { token: 'radius-xl' },
				background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
				gap: '1rem',
			},
			breakpoints: {
				mobile: {
					padding: '1.25rem',
				},
			},
		} ),
		usageCount: 1,
		meta: {},
	} );
	project.designSystem.classes.push( {
		id: 'surface-card',
		name: 'surface-card',
		label: 'Surface Card',
		order: 1,
		extends: [ 'hero-shell' ],
		styles: createStyleSet( {
			base: {
				padding: '1rem',
				borderRadius: '1rem',
				border: '1px solid #d7deec',
				background: '#ffffff',
				boxShadow: '0 18px 38px rgba(15, 23, 42, 0.08)',
			},
		} ),
		usageCount: 2,
		meta: {},
	} );
	project.designSystem.classes.push( {
		id: 'eyebrow-pill',
		name: 'eyebrow-pill',
		label: 'Eyebrow Pill',
		order: 2,
		extends: [],
		styles: createStyleSet( {
			base: {
				padding: '0.35rem 0.75rem',
				borderRadius: '999px',
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
			},
		} ),
		usageCount: 1,
		meta: {},
	} );
	project.designSystem.classes.push( {
		id: 'editor-rail',
		name: 'editor-rail',
		label: 'Editor Rail',
		order: 3,
		extends: [ 'surface-card' ],
		styles: createStyleSet( {
			base: {
				width: { token: 'rail-width' },
				background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(226,232,240,0.96) 100%)',
				position: 'sticky',
				top: '1rem',
			},
		} ),
		usageCount: 1,
		meta: {},
	} );
	project.designSystem.classes.push( {
		id: 'compat-stage',
		name: 'compat-stage',
		label: 'Compat Stage',
		order: 4,
		extends: [],
		styles: createStyleSet( {
			base: {
				border: '1px dashed #f59e0b',
				background: '#fffbeb',
			},
		} ),
		usageCount: 1,
		meta: {},
	} );

	project.designSystem.themeStyles = {
		buttons: createStyleSet( {
			base: {
				borderRadius: '999px',
				padding: '0.85rem 1.25rem',
				fontWeight: '700',
			},
		} ),
		headings: createStyleSet( {
			base: {
				letterSpacing: '-0.04em',
				lineHeight: '0.95',
			},
		} ),
		cards: createStyleSet( {
			base: {
				borderRadius: '1rem',
				boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)',
			},
		} ),
		forms: createStyleSet( {
			base: {
				display: 'grid',
				gap: '0.75rem',
			},
		} ),
		links: createStyleSet( {
			base: {
				color: '#2563eb',
				textDecoration: 'none',
			},
		} ),
	};
	project.designSystem.experiments = {
		'atomic-form': true,
		'component-overrides': true,
		'legacy-compat-mode': true,
		'named-slots': true,
		'site-editor-entry-shell': true,
	};

	mergeImportedDesignSystem( project, importedKit.project, 'kit' );

	project.collections.push(
		{
			id: 'posts',
			name: 'posts',
			source: 'posts',
			query: { limit: 4 },
		},
		{
			id: 'site-editor-entries',
			name: 'siteEditorEntries',
			source: 'siteEditorEntries',
			query: { limit: 6 },
		},
		{
			id: 'legacy-migrations',
			name: 'legacyMigrations',
			source: 'legacyMigrations',
			query: { limit: 3 },
		},
	);

	project.media.push(
		{
			id: 'media-hero',
			kind: 'image',
			url: createSvgDataUrl( 'Hero preview', '#1d4ed8', '#0f172a' ),
			alt: 'Hero preview asset',
			width: 1200,
			height: 800,
			meta: { slot: 'hero' },
		},
		{
			id: 'media-card',
			kind: 'image',
			url: createSvgDataUrl( 'Card preview', '#0f766e', '#115e59' ),
			alt: 'Card preview asset',
			width: 1200,
			height: 800,
			meta: { slot: 'card' },
		},
		{
			id: 'media-poster',
			kind: 'image',
			url: createSvgDataUrl( 'Poster preview', '#7c3aed', '#4c1d95' ),
			alt: 'Poster preview asset',
			width: 1200,
			height: 800,
			meta: { slot: 'poster' },
		},
		{
			id: 'media-popup',
			kind: 'image',
			url: createSvgDataUrl( 'Popup preview', '#0f172a', '#2563eb' ),
			alt: 'Popup preview asset',
			width: 1200,
			height: 800,
			meta: { slot: 'popup' },
		},
		{
			id: 'media-legacy',
			kind: 'image',
			url: createSvgDataUrl( 'Legacy migration preview', '#f59e0b', '#b45309' ),
			alt: 'Legacy migration preview asset',
			width: 1200,
			height: 800,
			meta: { slot: 'legacy' },
		},
	);

	project.revisions.push(
		createRevision( 'rev-marketing-draft', page.id, 'draft', 'Marketing landing draft', '2026-04-17T09:30:00.000Z' ),
		createRevision( 'rev-marketing-autosave', page.id, 'autosave', 'Marketing landing autosave', '2026-04-17T09:42:00.000Z' ),
		createRevision( 'rev-blog-published', blogArchiveTemplate.id, 'published', 'Blog archive published', '2026-04-16T18:15:00.000Z' ),
		createRevision( 'rev-component-master', heroComponent.id, 'draft', 'Hero component master', '2026-04-17T08:15:00.000Z' ),
		createRevision( 'rev-component-flow', componentShowcasePage.id, 'published', 'Component flow published', '2026-04-17T11:05:00.000Z' ),
		createRevision( 'rev-legacy-mixed', mixedLegacyPage.id, 'autosave', 'Mixed legacy autosave', '2026-04-17T11:15:00.000Z' ),
	);

	const importBridgeData = {
		warnings: [ ...imported.warnings, ...importedKit.warnings, ...importedThemeBuilder.warnings ],
		parityGaps: {
			...(( imported.project.meta.importBridge as { parityGaps?: Record<string, unknown> } | undefined )?.parityGaps ?? {}),
			...(( importedKit.project.meta.importBridge as { parityGaps?: Record<string, unknown> } | undefined )?.parityGaps ?? {}),
			...(( importedThemeBuilder.project.meta.importBridge as { parityGaps?: Record<string, unknown> } | undefined )?.parityGaps ?? {}),
		},
		kits: [
			...(( imported.project.meta.importBridge as { kits?: unknown[] } | undefined )?.kits ?? []),
			...(( importedKit.project.meta.importBridge as { kits?: unknown[] } | undefined )?.kits ?? []),
			...(( importedThemeBuilder.project.meta.importBridge as { kits?: unknown[] } | undefined )?.kits ?? []),
		],
	};

	project.meta = {
		surface: {
			release: 'parity-fixture-v2',
			documentKinds: [ 'page', 'layout', 'template', 'component', 'popup', 'kit', 'library-item' ],
			flows: [
				'composition',
				'theme-builder',
				'legacy-import',
				'library',
				'media',
				'named-slots',
				'loop-assignments',
				'popup-preview',
				'component-master-instance',
				'site-editor-entry',
			],
		},
		siteEditor: {
			entries: [
				{ id: 'header', label: 'Header', route: '/site-editor/header', templateType: 'header', documentId: header.id, slot: 'header' },
				{ id: 'footer', label: 'Footer', route: '/site-editor/footer', templateType: 'footer', documentId: footer.id, slot: 'footer' },
				{ id: 'single-post', label: 'Single Post', route: '/site-editor/single-post', templateType: 'single-post', documentId: singlePostTemplate.id, slot: 'page' },
				{ id: 'archive', label: 'Archive', route: '/site-editor/archive', templateType: 'archive', documentId: blogArchiveTemplate.id, slot: 'page' },
				{ id: 'search-results', label: 'Search Results', route: '/site-editor/search-results', templateType: 'search-results', documentId: searchResultsTemplate.id, slot: 'page' },
				{ id: 'not-found', label: '404', route: '/site-editor/404', templateType: '404', documentId: notFoundTemplate.id, slot: 'page' },
			],
		},
		previewPresets: [
			{ id: 'landing-popup', label: 'Marketing landing with popup preview', pathname: '/marketing-landing', query: 'preview=1&siteEditor=templates' },
			{ id: 'component-flow', label: 'Component flow playground', pathname: '/components', query: 'siteEditor=templates' },
			{ id: 'legacy-mixed', label: 'Mixed legacy migration', pathname: '/legacy-mixed', query: 'preview=1&modal=1' },
			{ id: 'imported-theme', label: 'Imported theme builder preview', pathname: '/imported-mixed', query: 'importedPopup=1' },
		],
		importBridge: importBridgeData as unknown as BuilderPackage['meta'][string],
	};

	const bindingContext: BindingProviderContext = {
		routeParams: { slug: 'marketing-landing', panel: 'templates' },
		loadData: {
			page: {
				title: 'Marketing Landing',
			},
			post: {
				title: 'Single Post Title',
				excerpt: 'Single post template content is driven by load data and route context.',
				featuredImage: createSvgDataUrl( 'Featured post image', '#0f172a', '#2563eb' ),
				metaText: 'By Builder Studio on April 17, 2026',
			},
			siteEditor: {
				activePanel: 'templates',
				entryCount: 6,
			},
		},
		siteData: {
			name: 'Builder Studio',
			locale: 'en-US',
		},
		collections: {
			posts: [
				{ title: 'Post One', excerpt: 'First post excerpt.', author: 'Mira', slug: 'post-one' },
				{ title: 'Post Two', excerpt: 'Second post excerpt.', author: 'Jon', slug: 'post-two' },
				{ title: 'Post Three', excerpt: 'Third post excerpt.', author: 'Ava', slug: 'post-three' },
				{ title: 'Post Four', excerpt: 'Fourth post excerpt.', author: 'Noah', slug: 'post-four' },
			],
			siteEditorEntries: [
				{ label: 'Header', route: '/site-editor/header', templateType: 'header' },
				{ label: 'Footer', route: '/site-editor/footer', templateType: 'footer' },
				{ label: 'Single Post', route: '/site-editor/single-post', templateType: 'single-post' },
				{ label: 'Archive', route: '/site-editor/archive', templateType: 'archive' },
				{ label: 'Search Results', route: '/site-editor/search-results', templateType: 'search-results' },
				{ label: '404', route: '/site-editor/404', templateType: '404' },
			],
			legacyMigrations: [
				{ label: 'Testimonial widget', status: 'compat', replacement: 'feature-spotlight-component' },
				{ label: 'Counter widget', status: 'compat', replacement: 'stat-card-component' },
				{ label: 'Tabs widget', status: 'native', replacement: 'tabs' },
			],
		},
		query: new URLSearchParams( 'preview=1&siteEditor=templates' ),
		session: {
			user: {
				role: 'admin',
				name: 'Builder Admin',
			},
		},
	};

	return {
		project,
		bindingContext,
		importWarnings: importBridgeData.warnings,
	};
}
