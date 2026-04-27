import { describe, expect, it } from 'vitest';

import {
	BuilderPackageSchema,
	createBuilderPackage,
	createEmptyDocument,
	createNode,
	migrateBuilderDocument,
	parseBuilderPackage,
} from '../src/index';

describe( 'schema package', () => {
	it( 'creates empty documents with component defaults', () => {
		const document = createEmptyDocument( 'component', 'Hero' );

		expect( document.kind ).toBe( 'component' );
		expect( document.component?.lockedStructure ).toBe( true );
	} );

	it( 'normalizes legacy content trees to root nodes', () => {
		const migrated = migrateBuilderDocument( {
			kind: 'page',
			title: 'Legacy',
			slug: 'legacy',
			content: [
				{
					id: 'abc',
					elType: 'widget',
					widgetType: 'heading',
					settings: { title: 'Hello' },
					elements: [],
				},
			],
		} );

		const parsed = BuilderPackageSchema.parse( createBuilderPackage( 'Legacy', [ migrated as never ] ) );

		expect( parsed.documents[ 0 ].root[ 0 ].type ).toBe( 'heading' );
		expect( parsed.documents[ 0 ].root[ 0 ].props.title ).toBe( 'Hello' );
	} );

	it( 'parses complete packages', () => {
		const project = parseBuilderPackage( {
			name: 'Demo',
			documents: [
				{
					kind: 'page',
					title: 'Home',
					slug: 'home',
					root: [ createNode( { type: 'container' } ) ],
				},
			],
		} );

		expect( project.packageVersion ).toBeDefined();
		expect( project.documents ).toHaveLength( 1 );
	} );

	it( 'keeps legacy bindings compatible while accepting dynamic style metadata', () => {
		const legacyProject = parseBuilderPackage( {
			name: 'Legacy bindings',
			documents: [
				{
					kind: 'page',
					title: 'Home',
					slug: 'home',
					root: [
						createNode( {
							type: 'heading',
							bindings: [
								{
									id: 'legacy-title',
									targetKind: 'prop',
									target: 'text',
									source: 'query',
									path: 'title',
								},
							],
						} ),
					],
				},
			],
		} );
		const dynamicProject = parseBuilderPackage( {
			name: 'Dynamic styles',
			documents: [
				{
					kind: 'page',
					title: 'Home',
					slug: 'home',
					root: [
						createNode( {
							type: 'container',
							bindings: [
								{
									id: 'hero-color',
									targetKind: 'style',
									target: 'backgroundColor',
									source: 'dynamic',
									path: 'brand-color',
									category: 'color',
									before: '',
									after: '',
									fallback: '#ff6600',
								},
							],
						} ),
					],
				},
			],
		} );

		expect( legacyProject.documents[ 0 ].root[ 0 ].bindings[ 0 ].source ).toBe( 'query' );
		expect( dynamicProject.documents[ 0 ].root[ 0 ].bindings[ 0 ] ).toMatchObject( {
			targetKind: 'style',
			category: 'color',
			fallback: '#ff6600',
		} );
	} );
} );
