import { describe, expect, it } from 'vitest';

import { createBuilderEngine, getDocumentRevisions } from '../src/index';
import { createBuilderPackage, createEmptyDocument, createNode, createStyleSet } from '@builder/schema';

function createDemoEngine() {
	const page = createEmptyDocument( 'page', 'Home', 'home' );
	page.root = [
		createNode( {
			id: 'root-container',
			type: 'container',
			children: [
				createNode( {
					id: 'headline',
					type: 'heading',
					props: { text: 'Hello' },
				} ),
			],
		} ),
	];

	return createBuilderEngine( createBuilderPackage( 'Demo', [ page ] ) );
}

describe( 'BuilderEngine', () => {
	it( 'adds and deletes nodes', () => {
		const engine = createDemoEngine();

		engine.dispatch( {
			type: 'document/elements/create',
			parentId: 'root-container',
			node: createNode( { id: 'button', type: 'button', props: { text: 'CTA' } } ),
		} );

		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 2 );

		engine.dispatch( { type: 'document/elements/delete', nodeId: 'button' } );
		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 1 );
	} );

	it( 'supports transactional history boundaries', () => {
		const engine = createDemoEngine();

		engine.beginTransaction( 'Batch edit' );
		engine.dispatch( { type: 'document/elements/update', nodeId: 'headline', propsPatch: { text: 'Updated' } } );
		engine.dispatch( { type: 'document/elements/duplicate', nodeId: 'headline', targetParentId: 'root-container' } );
		engine.commitTransaction();

		expect( engine.getState().history.past ).toHaveLength( 1 );
		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 2 );

		engine.undo();
		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 1 );

		engine.redo();
		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 2 );
	} );

	it( 'copies and pastes from clipboard', () => {
		const engine = createDemoEngine();

		engine.dispatch( { type: 'clipboard/copy', nodeIds: [ 'headline' ] } );
		engine.dispatch( { type: 'clipboard/paste', targetParentId: 'root-container' } );

		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 2 );
		expect( engine.getState().history.past.at( -1 )?.label ).toBe( 'Paste nodes' );
	} );

	it( 'pastes copied styles without replacing target content', () => {
		const engine = createDemoEngine();

		engine.dispatch( {
			type: 'document/elements/update',
			nodeId: 'headline',
			layoutPatch: { width: '60%' },
			stylesPatch: createStyleSet( { base: { color: '#2563eb', backgroundColor: '#f8fafc' }, states: { hover: { color: '#dc2626' } } } ),
			styleRefs: [ 'hero-heading' ],
		} );
		engine.dispatch( {
			type: 'document/elements/create',
			parentId: 'root-container',
			node: createNode( {
				id: 'target-heading',
				type: 'heading',
				props: { text: 'Target copy' },
				layout: { width: '100%' },
				styles: createStyleSet( { base: { color: '#111827' } } ),
				styleRefs: [ 'target-heading-class' ],
			} ),
		} );

		engine.dispatch( { type: 'clipboard/copy', nodeIds: [ 'headline' ] } );
		engine.dispatch( { type: 'clipboard/paste-style', nodeIds: [ 'target-heading' ] } );

		const target = engine.getState().project.documents[ 0 ].root[ 0 ].children.find( ( node ) => node.id === 'target-heading' );
		expect( target?.props.text ).toBe( 'Target copy' );
		expect( target?.layout.width ).toBe( '60%' );
		expect( target?.styles.base.color ).toBe( '#2563eb' );
		expect( target?.styles.base.backgroundColor ).toBe( '#f8fafc' );
		expect( target?.styles.states.hover?.color ).toBe( '#dc2626' );
		expect( target?.styleRefs ).toEqual( [ 'hero-heading' ] );
		expect( engine.getState().history.past.at( -1 )?.label ).toBe( 'Paste style' );
	} );

	it( 'updates node properties with structural sharing for untouched branches', () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [
			createNode( {
				id: 'root',
				type: 'container',
				children: [
					createNode( {
						id: 'left-branch',
						type: 'container',
						children: [
							createNode( { id: 'target-heading', type: 'heading', props: { text: 'Before' } } ),
						],
					} ),
					createNode( {
						id: 'right-branch',
						type: 'container',
						children: [
							createNode( { id: 'stable-copy', type: 'paragraph', props: { text: 'Keep me' } } ),
						],
					} ),
				],
			} ),
		];
		const engine = createBuilderEngine( createBuilderPackage( 'Demo', [ page ] ) );
		const beforeDocument = engine.getState().project.documents[ 0 ];
		const beforeDesignSystem = engine.getState().project.designSystem;
		const beforeRoot = beforeDocument.root[ 0 ];
		const beforeLeftBranch = beforeRoot.children[ 0 ];
		const beforeRightBranch = beforeRoot.children[ 1 ];

		engine.dispatch( {
			type: 'document/elements/update',
			nodeId: 'target-heading',
			propsPatch: { text: 'After' },
		} );

		const afterDocument = engine.getState().project.documents[ 0 ];
		const afterDesignSystem = engine.getState().project.designSystem;
		const afterRoot = afterDocument.root[ 0 ];
		const afterLeftBranch = afterRoot.children[ 0 ];
		const afterRightBranch = afterRoot.children[ 1 ];
		expect( afterDocument ).not.toBe( beforeDocument );
		expect( afterRoot ).not.toBe( beforeRoot );
		expect( afterLeftBranch ).not.toBe( beforeLeftBranch );
		expect( afterLeftBranch.children[ 0 ].props.text ).toBe( 'After' );
		expect( afterRightBranch ).toBe( beforeRightBranch );
		expect( afterDesignSystem ).toBe( beforeDesignSystem );
	} );

	it( 'derives class usage counts on load and after style ref updates', () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [
			createNode( {
				id: 'styled-heading',
				type: 'heading',
				styleRefs: [ 'hero-class' ],
				props: { text: 'Styled' },
			} ),
		];

		const project = createBuilderPackage( 'Demo', [ page ] );
		project.designSystem.classes.push( {
			id: 'hero-class',
			name: 'hero-class',
			label: 'Hero Class',
			order: 0,
			extends: [],
			styles: createStyleSet( { base: { color: '#2563eb' } } ),
			usageCount: 0,
			meta: {},
		} );

		const engine = createBuilderEngine( project );
		expect( engine.getState().project.designSystem.classes[ 0 ].usageCount ).toBe( 1 );

		engine.dispatch( {
			type: 'document/elements/update',
			nodeId: 'styled-heading',
			styleRefs: [],
		} );

		expect( engine.getState().project.designSystem.classes[ 0 ].usageCount ).toBe( 0 );
	} );

	it( 'tracks breadcrumbs and commits drag sessions through the UI command path', () => {
		const engine = createDemoEngine();
		engine.dispatch( {
			type: 'document/elements/create',
			parentId: 'root-container',
			node: createNode( { id: 'cta', type: 'button', props: { text: 'Click' } } ),
		} );

		engine.dispatch( { type: 'document/ui/select-node', nodeId: 'headline' } );
		expect( engine.getState().ui.breadcrumbs.map( ( crumb ) => crumb.nodeId ) ).toEqual( [ 'root-container', 'headline' ] );

		engine.dispatch( { type: 'document/ui/focus-breadcrumb', nodeId: 'root-container' } );
		expect( engine.getState().ui.selectedNodeIds ).toEqual( [ 'root-container' ] );

		engine.dispatch( {
			type: 'document/ui/start-drag',
			session: {
				kind: 'move',
				documentId: engine.getState().activeDocumentId,
				nodeId: 'headline',
				sourceParentId: 'root-container',
				sourceIndex: 0,
				label: 'Heading',
				pointer: { x: 0, y: 0 },
			},
		} );
		engine.dispatch( {
			type: 'document/ui/set-drop-target',
			target: {
				documentId: engine.getState().activeDocumentId,
				parentId: 'root-container',
				index: 2,
				placement: 'after',
				targetNodeId: 'cta',
				rect: {
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					width: 0,
					height: 0,
				},
			},
		} );
		engine.dispatch( { type: 'document/ui/commit-drag' } );

		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children.map( ( node ) => node.id ) ).toEqual( [ 'cta', 'headline' ] );
		expect( engine.getState().ui.dragSession ).toBeUndefined();
		expect( engine.getState().ui.dropTarget ).toBeUndefined();
	} );

	it( 'respects explicit into targets when creating layout nodes through drag commit', () => {
		const engine = createDemoEngine();
		const documentId = engine.getState().activeDocumentId;

		engine.dispatch( {
			type: 'document/ui/start-drag',
			session: {
				kind: 'create',
				documentId,
				elementType: 'container',
				templateNode: createNode( { id: 'new-container', type: 'container' } ),
				label: 'Container',
				pointer: { x: 0, y: 0 },
			},
		} );
		engine.dispatch( {
			type: 'document/ui/set-drop-target',
			target: {
				documentId,
				parentId: 'root-container',
				index: 1,
				placement: 'into',
				targetNodeId: 'root-container',
				rect: {
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					width: 0,
					height: 0,
				},
			},
		} );
		engine.dispatch( { type: 'document/ui/commit-drag' } );

		const root = engine.getState().project.documents[ 0 ].root;
		expect( root ).toHaveLength( 1 );
		expect( root[ 0 ].children.map( ( node ) => node.type ) ).toEqual( [ 'heading', 'container' ] );
	} );

	it( 'respects before targets when creating layout nodes inside containers through drag commit', () => {
		const engine = createDemoEngine();
		const documentId = engine.getState().activeDocumentId;

		engine.dispatch( {
			type: 'document/ui/start-drag',
			session: {
				kind: 'create',
				documentId,
				elementType: 'container',
				templateNode: createNode( { id: 'new-container', type: 'container' } ),
				label: 'Container',
				pointer: { x: 0, y: 0 },
			},
		} );
		engine.dispatch( {
			type: 'document/ui/set-drop-target',
			target: {
				documentId,
				parentId: 'root-container',
				index: 0,
				placement: 'before',
				targetNodeId: 'headline',
				rect: {
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					width: 0,
					height: 0,
				},
			},
		} );
		engine.dispatch( { type: 'document/ui/commit-drag' } );

		const root = engine.getState().project.documents[ 0 ].root;
		expect( root ).toHaveLength( 1 );
		expect( root[ 0 ].children.map( ( node ) => node.type ) ).toEqual( [ 'container', 'heading' ] );
	} );

	it( 'tracks draft, autosave, publish, and restore flows with revision snapshots', () => {
		const engine = createDemoEngine();

		engine.dispatch( { type: 'document/elements/update', nodeId: 'headline', propsPatch: { text: 'Draft headline' } } );
		engine.dispatch( { type: 'document/save/draft', documentId: engine.getState().activeDocumentId } );

		engine.dispatch( { type: 'document/elements/update', nodeId: 'headline', propsPatch: { text: 'Autosaved headline' } } );
		engine.dispatch( { type: 'document/save/autosave', documentId: engine.getState().activeDocumentId } );

		engine.dispatch( { type: 'document/elements/update', nodeId: 'headline', propsPatch: { text: 'Published headline' } } );
		engine.dispatch( { type: 'document/save/publish', documentId: engine.getState().activeDocumentId } );

		const session = engine.getState().documentSessions[ engine.getState().activeDocumentId ];
		expect( session.draftRevisionId ).toBeTruthy();
		expect( session.autosaveRevisionId ).toBeTruthy();
		expect( session.publishedRevisionId ).toBeTruthy();
		expect( session.lastRevisionKind ).toBe( 'published' );
		expect( engine.getState().ui.saveState ).toBe( 'published' );

		engine.dispatch( { type: 'document/elements/update', nodeId: 'headline', propsPatch: { text: 'Unsaved mutation' } } );
		const publishedRevision = getDocumentRevisions( engine.getState().project, engine.getState().activeDocumentId )
			.find( ( revision ) => revision.kind === 'published' );
		expect( publishedRevision ).toBeTruthy();

		engine.dispatch( {
			type: 'document/save/restore-revision',
			documentId: engine.getState().activeDocumentId,
			revisionId: publishedRevision!.id,
		} );

		expect( engine.getState().project.documents[ 0 ].root[ 0 ].children[ 0 ].props.text ).toBe( 'Published headline' );
		expect( engine.getState().ui.saveState ).toBe( 'published' );
		expect( engine.getState().documentSessions[ engine.getState().activeDocumentId ].dirty ).toBe( false );
	} );

	it( 'tracks preview session state and supports detaching and relinking component instances', () => {
		const component = createEmptyDocument( 'component', 'Hero Component', 'hero-component' );
		component.component = {
			lockedStructure: true,
			exposedProperties: [
				{ id: 'hero-title', nodeId: 'component-heading', label: 'Hero title', propPath: 'text', type: 'text', required: false },
			],
		};
		component.root = [ createNode( { id: 'component-heading', type: 'heading', props: { text: 'Master title' } } ) ];

		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [
			createNode( {
				id: 'component-instance-node',
				type: 'component-instance',
				props: {
					componentId: component.id,
					overrides: {
						'hero-title': 'Instance title',
					},
				},
			} ),
		];

		const engine = createBuilderEngine( createBuilderPackage( 'Demo', [ page, component ] ) );

		engine.dispatch( { type: 'document/ui/set-mode', mode: 'component-instance' } );
		engine.dispatch( { type: 'document/ui/set-shell-page', page: 'menu' } );
		engine.dispatch( { type: 'document/ui/toggle-shell-panel', collapsed: true } );
		engine.dispatch( { type: 'document/ui/set-navigator-mode', mode: 'docked' } );
		engine.dispatch( { type: 'document/ui/toggle-responsive-bar', open: true } );
		engine.dispatch( { type: 'document/ui/select-node', nodeId: 'component-instance-node' } );
		engine.dispatch( {
			type: 'document/ui/set-preview-context',
			context: {
				documentId: page.id,
				pathname: '/blog/post-a',
				query: 'preview=theme',
				slot: 'page',
				assignmentId: 'assignment-1',
				source: 'assignment',
			},
		} );
		engine.dispatch( { type: 'document/ui/set-site-entry', entryId: 'entry-single-post' } );
		engine.dispatch( { type: 'document/ui/toggle-revision-browser', open: true } );

		expect( engine.getState().ui.preview.pathname ).toBe( '/blog/post-a' );
		expect( engine.getState().ui.preview.assignmentId ).toBe( 'assignment-1' );
		expect( engine.getState().ui.siteEditor.activeEntryId ).toBe( 'entry-single-post' );
		expect( engine.getState().ui.shell.leftPanelPage ).toBe( 'editor' );
		expect( engine.getState().ui.shell.panelCollapsed ).toBe( true );
		expect( engine.getState().ui.shell.navigatorMode ).toBe( 'docked' );
		expect( engine.getState().ui.shell.responsiveBarVisible ).toBe( true );
		expect( engine.getState().ui.componentEditing.context ).toBe( 'instance' );

		engine.dispatch( { type: 'document/component/detach-instance', nodeId: 'component-instance-node' } );
		const detachedNode = engine.getState().project.documents[ 0 ].root[ 0 ];
		expect( detachedNode.type ).toBe( 'container' );
		expect( detachedNode.meta.detachedComponent ).toBeTruthy();
		expect( detachedNode.children[ 0 ]?.props.text ).toBe( 'Instance title' );
		expect( engine.getState().ui.componentEditing.context ).toBe( 'detached' );

		engine.dispatch( { type: 'document/component/relink-instance', nodeId: 'component-instance-node' } );
		const relinkedNode = engine.getState().project.documents[ 0 ].root[ 0 ];
		expect( relinkedNode.type ).toBe( 'component-instance' );
		expect( relinkedNode.props.componentId ).toBe( component.id );
		expect( engine.getState().ui.componentEditing.context ).toBe( 'instance' );
		expect( engine.getState().project.meta.preview ).toBeUndefined();
	} );
} );
