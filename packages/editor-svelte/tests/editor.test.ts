import { describe, expect, it, vi } from 'vitest';

import { createBuilderPackage, createEmptyDocument, createNode, createStyleSet } from '@builder/schema';
import { createBuilderEditor } from '../src/lib/editor';
import { isInteractionCoreV3Enabled } from '../src/lib/interaction-core';
import type { BuilderTransientDragState } from '../src/lib/transient-drag';

describe( 'editor-svelte', () => {
	it( 'creates an editor controller and updates selection', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );

		expect( editor.engine.getState().ui.selectedNodeIds ).toEqual( [ 'hero' ] );
	} );

	it( 'registers dynamic providers and manages undoable node bindings', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			dynamic: {
				providers: [
					{
						id: 'host-title',
						label: 'Host Title',
						group: 'Host',
						categories: [ 'text' ],
						resolve: ( context ) => context.record?.title,
					},
				],
				previewContext: {
					record: { title: 'Preview title' },
				},
			},
		} );

		const providers = editor.listDynamicProviders( 'text' );
		const bindingId = editor.addDynamicBinding( 'hero', {
			targetKind: 'prop',
			target: 'text',
			source: 'dynamic',
			path: 'host-title',
			category: 'text',
			fallback: 'Hello',
		} );

		expect( providers.some( ( provider ) => provider.id === 'host-title' ) ).toBe( true );
		expect( bindingId ).toBeDefined();
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].bindings[ 0 ] ).toMatchObject( {
			id: bindingId,
			targetKind: 'prop',
			path: 'host-title',
		} );

		editor.updateDynamicBinding( bindingId ?? '', { before: 'Read: ' } );
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].bindings[ 0 ].before ).toBe( 'Read: ' );

		editor.undo();
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].bindings[ 0 ].before ).toBeUndefined();

		editor.removeDynamicBinding( bindingId ?? '' );
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].bindings ).toHaveLength( 0 );
	} );

	it( 'configures the interaction core feature flag from editor features', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const warnSpy = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				interactionCoreV3: false,
			},
		} );

		expect( editor.features.interactionCoreV3 ).toBe( true );
		expect( editor.features.canvasInteractionV2 ).toBe( true );
		expect( editor.features.shellVariant ).toBe( 'v3' );
		expect( isInteractionCoreV3Enabled() ).toBe( true );
		expect( warnSpy ).toHaveBeenCalledWith( expect.stringContaining( 'interactionCoreV3=false is deprecated' ) );
		warnSpy.mockRestore();
	} );

	it( 'adds new nodes through the controller', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.dispatch( {
			type: 'document/elements/create',
			parentId: 'root-container',
			node: createNode( { id: 'cta', type: 'button', props: { text: 'Click' } } ),
		} );

		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 2 );
	} );

	it( 'creates reusable library items from selection and inserts component instances', () => {
		const component = createEmptyDocument( 'component', 'Hero Component', 'hero-component' );
		component.root = [ createNode( { id: 'component-heading', type: 'heading', props: { text: 'Component heading' } } ) ];

		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];

		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document, component ] ) );
		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );

		const libraryItemId = editor.createLibraryItemFromSelection( 'Saved Hero' );
		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'root-container' } );
		editor.insertComponentInstance( component.id );
		editor.insertLibraryItem( libraryItemId );

		expect( editor.engine.getState().project.documents.some( ( entry ) => entry.id === libraryItemId && entry.kind === 'library-item' ) ).toBe( true );
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].children.some( ( node ) => node.type === 'component-instance' ) ).toBe( true );
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].children ).toHaveLength( 3 );
	} );

	it( 'opens documents in mode-aware flows and commits create drags', () => {
		const template = createEmptyDocument( 'template', 'Blog Template', 'blog-template' );
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'root-container', type: 'container' } ) ];

		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document, template ] ) );
		editor.openDocument( template.id );
		expect( editor.engine.getState().ui.mode ).toBe( 'template' );

		editor.openDocument( document.id );
		editor.startElementDrag( 'button', { x: 0, y: 0 } );
		editor.setDropTarget( {
			documentId: document.id,
			parentId: 'root-container',
			index: 0,
			placement: 'into',
			rect: {
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				width: 0,
				height: 0,
			},
		} );
		editor.commitDrag();

		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].children[ 0 ]?.type ).toBe( 'button' );
	} );

	it( 'opens documents with preview context and manages component detach and relink flows', () => {
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
					overrides: {},
				},
			} ),
		];

		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ page, component ] ) );
		editor.openDocument( page.id, {
			mode: 'component-instance',
			pathname: '/marketing',
			query: 'preview=site',
			slot: 'page',
			assignmentId: 'assignment-home',
			siteEntryId: 'entry-home',
			source: 'site-entry',
			openRevisionBrowser: true,
		} );

		expect( editor.engine.getState().ui.preview.pathname ).toBe( '/marketing' );
		expect( editor.engine.getState().ui.siteEditor.activeEntryId ).toBe( 'entry-home' );
		expect( editor.engine.getState().ui.revisions.panelOpen ).toBe( true );
		expect( editor.engine.getState().ui.shell.leftPanelPage ).toBe( 'editor' );

		editor.setShellPage( 'globals' );
		editor.toggleShellPanel( true );
		editor.setNavigatorMode( 'docked' );
		editor.toggleNavigator( false );
		editor.toggleResponsiveBar( true );
		editor.toggleAppBarMenu( true );
		expect( editor.engine.getState().ui.shell ).toMatchObject( {
			leftPanelPage: 'globals',
			panelCollapsed: true,
			navigatorMode: 'docked',
			navigatorOpen: false,
			responsiveBarVisible: true,
			appBarMenuOpen: true,
		} );

		editor.updateComponentInstanceOverrides( 'component-instance-node', { 'hero-title': 'Instance title' } );
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].props.overrides ).toMatchObject( {
			'hero-title': 'Instance title',
		} );

		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'component-instance-node' } );
		editor.detachComponentInstance();
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].type ).toBe( 'container' );

		editor.relinkComponentInstance();
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].type ).toBe( 'component-instance' );
	} );

	it( 'auto-switches the shell back to the editor surface when selecting a node from non-editor pages', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		for ( const page of [ 'page-settings', 'history', 'globals', 'menu' ] as const ) {
			editor.setShellPage( page );
			editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );

			expect( editor.engine.getState().ui.shell.leftPanelPage ).toBe( 'editor' );
			expect( editor.engine.getState().ui.panel ).toBe( 'content' );
			expect( editor.engine.getState().ui.selectedNodeIds ).toEqual( [ 'hero' ] );
		}

		editor.setShellPage( 'page-settings' );
		editor.setPanel( 'style' );
		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );

		expect( editor.engine.getState().ui.shell.leftPanelPage ).toBe( 'editor' );
		expect( editor.engine.getState().ui.panel ).toBe( 'style' );
	} );

	it( 'tracks canvas and navigator context menu requests in state', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.dispatch( {
			type: 'document/ui/open-context-menu',
			anchor: { x: 18, y: 24 },
			targetKind: 'canvas-root',
			documentId: document.id,
			slot: 'page',
		} );

		expect( editor.engine.getState().ui.contextMenu ).toMatchObject( {
			open: true,
			targetKind: 'canvas-root',
			documentId: document.id,
			slot: 'page',
			anchor: { x: 18, y: 24 },
		} );

		editor.dispatch( { type: 'document/ui/close-context-menu' } );
		expect( editor.engine.getState().ui.contextMenu.open ).toBe( false );

		editor.dispatch( {
			type: 'document/ui/open-context-menu',
			anchor: { x: 42, y: 56 },
			targetKind: 'navigator-node',
			documentId: document.id,
			nodeId: 'hero',
			slot: 'page',
		} );

		expect( editor.engine.getState().ui.contextMenu ).toMatchObject( {
			open: true,
			targetKind: 'navigator-node',
			documentId: document.id,
			nodeId: 'hero',
			slot: 'page',
			anchor: { x: 42, y: 56 },
		} );
	} );

	it( 'only emits selector subscriptions when the selected slice changes', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );
		const slices: Array<string | undefined> = [];

		const unsubscribe = editor.subscribeSelector(
			( state ) => state.ui.selectedNodeIds[ 0 ],
			( slice ) => slices.push( slice ),
		);

		editor.setPanel( 'style' );
		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );
		editor.setShellPage( 'history' );

		unsubscribe();

		expect( slices ).toEqual( [ 'hero' ] );
	} );

	it( 'reuses the active document cache until the active document changes', () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const template = createEmptyDocument( 'template', 'Archive', 'archive' );
		template.root = [ createNode( { id: 'archive-root', type: 'container' } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ page, template ] ) );

		const initialCache = editor.getActiveDocumentCache();
		const repeatedCache = editor.getActiveDocumentCache();
		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );
		const afterSelectionCache = editor.getActiveDocumentCache();

		expect( initialCache ).toBe( repeatedCache );
		expect( repeatedCache ).toBe( afterSelectionCache );
		expect( initialCache.nodeById.get( 'hero' )?.type ).toBe( 'heading' );

		editor.openDocument( template.id );
		const nextCache = editor.getActiveDocumentCache();

		expect( nextCache ).not.toBe( initialCache );
		expect( nextCache.documentId ).toBe( template.id );
		expect( nextCache.nodeById.get( 'archive-root' )?.type ).toBe( 'container' );
	} );

	it( 'keeps live drag pointer state transient and clears it after cancellation', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'root-container', type: 'container' } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );
		const transientStates: BuilderTransientDragState[] = [];

		const unsubscribe = editor.subscribeTransientDrag( ( state ) => {
			transientStates.push( state );
		} );

		editor.startElementDrag( 'button', { x: 16, y: 24 } );
		editor.queueTransientDrag( {
			pointer: {
				x: 96,
				y: 132,
				inside: true,
			},
			dropTarget: {
				documentId: document.id,
				parentId: 'root-container',
				index: 0,
				placement: 'into',
				rect: {
					top: 0,
					left: 0,
					right: 240,
					bottom: 180,
					width: 240,
					height: 180,
				},
			},
		} );
		editor.flushTransientDrag();

		expect( editor.getTransientDragState() ).toMatchObject( {
			pointer: {
				x: 96,
				y: 132,
				inside: true,
			},
			dropTarget: {
				parentId: 'root-container',
				placement: 'into',
			},
		} );
		expect( editor.engine.getState().ui.dragSession?.pointer ).toEqual( { x: 16, y: 24 } );
		expect( editor.engine.getState().ui.dropTarget ).toMatchObject( {
			parentId: 'root-container',
			placement: 'into',
		} );

		editor.cancelDrag();

		expect( editor.engine.getState().ui.dragSession ).toBeUndefined();
		expect( editor.getTransientDragState().pointer ).toBeUndefined();
		expect( transientStates.at( -1 )?.pointer ).toBeUndefined();

		unsubscribe();
	} );

	it( 'keeps deprecated compatibility flags as accepted no-ops while the shell always resolves to V3', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const warnSpy = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const defaultEditor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );
		const aliasDrivenEditor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				canvasInteractionV2: false,
			},
		} );
		const explicitV3Editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				interactionCoreV3: true,
				canvasInteractionV2: false,
				navigatorVirtualization: false,
			},
		} );
		const optedOutEditor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				interactionCoreV3: false,
			},
		} );
		const explicitNavigatorEditor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				interactionCoreV3: false,
				navigatorVirtualization: true,
			},
		} );
		const legacyShellEditor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				shellVariant: 'legacy',
			},
		} );
		const mismatchedV3ShellEditor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				shellVariant: 'v3',
				interactionCoreV3: false,
			},
		} );

		expect( defaultEditor.features.canvasInteractionV2 ).toBe( true );
		expect( defaultEditor.features.interactionCoreV3 ).toBe( true );
		expect( defaultEditor.features.navigatorVirtualization ).toBe( true );
		expect( defaultEditor.features.shellVariant ).toBe( 'v3' );
		expect( aliasDrivenEditor.features.interactionCoreV3 ).toBe( true );
		expect( aliasDrivenEditor.features.canvasInteractionV2 ).toBe( true );
		expect( aliasDrivenEditor.features.navigatorVirtualization ).toBe( true );
		expect( aliasDrivenEditor.features.shellVariant ).toBe( 'v3' );
		expect( explicitV3Editor.features.interactionCoreV3 ).toBe( true );
		expect( explicitV3Editor.features.canvasInteractionV2 ).toBe( true );
		expect( explicitV3Editor.features.navigatorVirtualization ).toBe( false );
		expect( explicitV3Editor.features.shellVariant ).toBe( 'v3' );
		expect( optedOutEditor.features.interactionCoreV3 ).toBe( true );
		expect( optedOutEditor.features.canvasInteractionV2 ).toBe( true );
		expect( optedOutEditor.features.navigatorVirtualization ).toBe( true );
		expect( optedOutEditor.features.shellVariant ).toBe( 'v3' );
		expect( explicitNavigatorEditor.features.navigatorVirtualization ).toBe( true );
		expect( legacyShellEditor.features.interactionCoreV3 ).toBe( true );
		expect( legacyShellEditor.features.canvasInteractionV2 ).toBe( true );
		expect( legacyShellEditor.features.navigatorVirtualization ).toBe( true );
		expect( legacyShellEditor.features.shellVariant ).toBe( 'v3' );
		expect( mismatchedV3ShellEditor.features.interactionCoreV3 ).toBe( true );
		expect( mismatchedV3ShellEditor.features.canvasInteractionV2 ).toBe( true );
		expect( mismatchedV3ShellEditor.features.navigatorVirtualization ).toBe( true );
		expect( mismatchedV3ShellEditor.features.shellVariant ).toBe( 'v3' );
		expect( warnSpy ).toHaveBeenCalled();
		warnSpy.mockRestore();
	} );

	it( 'imports native Builder packages as library items and remaps components, classes, and variables', async () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [ createNode( { id: 'root', type: 'container' } ) ];
		const currentProject = createBuilderPackage( 'Demo', [ page ] );
		currentProject.designSystem.variables = [
			{ id: 'color-current', name: 'brand-color', label: 'Brand Color', kind: 'color', value: '#111111', source: 'manual', meta: {} },
		];
		currentProject.designSystem.classes = [
			{ id: 'class-current', name: 'hero-card', label: 'Hero Card', order: 0, extends: [], usageCount: 0, styles: createStyleSet(), meta: {} },
		];

		const importedComponent = createEmptyDocument( 'component', 'Imported Card', 'imported-card' );
		importedComponent.id = 'component-old';
		importedComponent.root = [ createNode( { id: 'component-heading', type: 'heading', props: { text: 'Imported component' } } ) ];

		const importedPage = createEmptyDocument( 'page', 'Imported Template', 'home' );
		importedPage.id = 'page-old';
		importedPage.root = [
			createNode( {
				id: 'instance-old',
				type: 'component-instance',
				props: { componentId: 'component-old' },
				styleRefs: [ 'class-current' ],
				styles: createStyleSet( {
					base: {
						color: { token: 'brand-color', fallback: '#222222' },
					},
				} ),
			} ),
		];

		const importedPackage = createBuilderPackage( 'Import', [ importedPage, importedComponent ] );
		importedPackage.designSystem.variables = [
			{ id: 'color-current', name: 'brand-color', label: 'Brand Color', kind: 'color', value: '#ff00ff', source: 'manual', meta: {} },
		];
		importedPackage.designSystem.classes = [
			{ id: 'class-current', name: 'hero-card', label: 'Hero Card', order: 0, extends: [], usageCount: 0, styles: createStyleSet(), meta: {} },
		];

		const editor = createBuilderEditor( currentProject );
		const result = await editor.importTemplatesFromJson( importedPackage, { sourceName: 'native.json' } );
		const nextProject = editor.engine.getState().project;
		const importedLibrary = nextProject.documents.find( ( document ) => document.id === result.importedLibraryDocumentIds[ 0 ] );
		const importedComponentNext = nextProject.documents.find( ( document ) => document.kind === 'component' && document.meta.originalDocumentId === 'component-old' );
		const importedNode = importedLibrary?.root[ 0 ];

		expect( importedLibrary?.kind ).toBe( 'library-item' );
		expect( importedLibrary?.slug ).toBe( 'home-2' );
		expect( importedComponentNext?.kind ).toBe( 'component' );
		expect( importedNode?.id ).not.toBe( 'instance-old' );
		expect( importedNode?.props.componentId ).toBe( importedComponentNext?.id );
		expect( importedNode?.styleRefs[ 0 ] ).not.toBe( 'class-current' );
		expect( importedNode?.styles.base.color ).toMatchObject( { token: 'brand-color-imported' } );
		expect( nextProject.designSystem.variables.map( ( variable ) => variable.name ) ).toContain( 'brand-color-imported' );
		expect( nextProject.designSystem.classes.map( ( definition ) => definition.name ) ).toContain( 'hero-card-imported' );
		expect( editor.engine.getState().ui.panel ).toBe( 'library' );
		expect( editor.engine.getState().ui.shell.leftPanelPage ).toBe( 'globals' );
	} );

	it( 'imports Elementor JSON and inserts the imported library item into the active page', async () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [ createNode( { id: 'root', type: 'container' } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ page ] ) );

		const result = await editor.importTemplatesFromJson( {
			title: 'Elementor Hero',
			content: [
				{
					id: 'heading-source',
					elType: 'widget',
					widgetType: 'heading',
					settings: {
						title: 'Imported Elementor Heading',
					},
				},
			],
		}, { sourceName: 'elementor.json' } );

		const libraryDocument = editor.engine.getState().project.documents.find( ( document ) => document.id === result.importedLibraryDocumentIds[ 0 ] );
		expect( libraryDocument?.kind ).toBe( 'library-item' );
		expect( libraryDocument?.root[ 0 ]?.type ).toBe( 'heading' );

		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'root' } );
		editor.insertLibraryItem( libraryDocument!.id );

		const activePage = editor.engine.getState().project.documents.find( ( document ) => document.id === page.id );
		expect( activePage?.root[ 0 ]?.children[ 0 ]?.type ).toBe( 'heading' );
		expect( activePage?.root[ 0 ]?.children[ 0 ]?.id ).not.toBe( libraryDocument?.root[ 0 ]?.id );
	} );

	it( 'imports pasted HTML as a library item and switches to the Library panel', async () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		page.root = [ createNode( { id: 'root', type: 'container' } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ page ] ) );
		const beforeDocuments = editor.engine.getState().project.documents;

		const result = await editor.importHtmlTemplate( {
			sourceName: 'landing.html',
			html: '<html><head><title>HTML Landing</title><style>.hero{color:#fff}</style></head><body><section class="hero"><h1>Hello <span>HTML</span></h1><p>Copy</p></section></body></html>',
		} );
		const nextState = editor.engine.getState();
		const libraryDocument = nextState.project.documents.find( ( document ) => document.id === result.importedLibraryDocumentIds[ 0 ] );

		expect( nextState.project.documents ).not.toBe( beforeDocuments );
		expect( libraryDocument?.kind ).toBe( 'library-item' );
		expect( libraryDocument?.meta.importSource ).toBe( 'html' );
		expect( libraryDocument?.root[ 0 ]?.children[ 0 ]?.children[ 0 ] ).toMatchObject( {
			type: 'heading',
			props: {
				text: 'Hello <span>HTML</span>',
			},
		} );
		expect( nextState.ui.shell.leftPanelPage ).toBe( 'globals' );
		expect( nextState.ui.panel ).toBe( 'library' );
	} );

	it( 'rejects unsupported template JSON without mutating project documents', async () => {
		const page = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ page ] ) );
		const beforeDocuments = editor.engine.getState().project.documents;

		await expect( editor.importTemplatesFromJson( { nope: true }, { sourceName: 'invalid.json' } ) ).rejects.toThrow( /Unsupported template JSON/ );

		expect( editor.engine.getState().project.documents ).toBe( beforeDocuments );
	} );

	it( 'wraps legacy saveProject persistence for draft saves', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const saveProject = vi.fn().mockResolvedValue( undefined );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			persistence: {
				saveProject,
			},
		} );

		await editor.saveDraft();

		expect( saveProject ).toHaveBeenCalledTimes( 1 );
		expect( saveProject.mock.calls[ 0 ][ 0 ] ).toMatchObject( {
			documentId: document.id,
			reason: 'save',
			revisionKind: 'draft',
		} );
		expect( editor.engine.getState().ui.saveState ).toBe( 'saved' );
	} );

	it( 'autosaves dirty documents through the production adapter', async () => {
		vi.useFakeTimers();
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const saveAutosave = vi.fn().mockResolvedValue( { versionToken: 'autosave-v1' } );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			persistence: {
				autoSaveDelayMs: 25,
				saveAutosave,
			},
		} );

		editor.dispatch( {
			type: 'document/elements/update',
			documentId: document.id,
			nodeId: 'hero',
			patch: { props: { text: 'Changed' } },
		} );
		await vi.advanceTimersByTimeAsync( 30 );

		expect( saveAutosave ).toHaveBeenCalledTimes( 1 );
		expect( saveAutosave.mock.calls[ 0 ][ 0 ] ).toMatchObject( {
			documentId: document.id,
			reason: 'autosave',
			revisionKind: 'autosave',
		} );
		expect( editor.engine.getState().documentSessions[ document.id ].autosaveRevisionId ).toBeDefined();
		expect( editor.engine.getState().ui.saveState ).toBe( 'saved' );
		vi.useRealTimers();
	} );

	it( 'creates draft and published revisions through adapter-specific methods', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const saveDraft = vi.fn().mockResolvedValue( { versionToken: 'draft-v1' } );
		const publish = vi.fn().mockResolvedValue( { versionToken: 'published-v1' } );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			persistence: {
				saveDraft,
				publish,
			},
		} );

		await editor.saveDraft();
		await editor.publish();

		expect( saveDraft ).toHaveBeenCalledWith( expect.objectContaining( { reason: 'draft', revisionKind: 'draft' } ) );
		expect( publish ).toHaveBeenCalledWith( expect.objectContaining( { reason: 'publish', revisionKind: 'published', expectedVersionToken: 'draft-v1' } ) );
		expect( editor.engine.getState().project.revisions.map( ( revision ) => revision.kind ) ).toEqual( [ 'draft', 'published' ] );
		expect( editor.engine.getState().ui.saveState ).toBe( 'published' );
	} );

	it( 'restores revisions and persists the restored snapshot', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Original' } } ) ];
		const restoreRevision = vi.fn().mockResolvedValue( { versionToken: 'restore-v1' } );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			persistence: {
				saveDraft: vi.fn().mockResolvedValue( { versionToken: 'draft-v1' } ),
				restoreRevision,
			},
		} );

		await editor.saveDraft();
		const revisionId = editor.engine.getState().project.revisions[ 0 ].id;
		editor.dispatch( {
			type: 'document/elements/update',
			documentId: document.id,
			nodeId: 'hero',
			patch: { props: { text: 'Changed' } },
		} );
		await editor.restoreRevision( revisionId, document.id );

		expect( restoreRevision ).toHaveBeenCalledWith( expect.objectContaining( { reason: 'restore', revisionId } ) );
		expect( editor.engine.getState().project.documents[ 0 ].root[ 0 ].props.text ).toBe( 'Original' );
		expect( editor.engine.getState().ui.saveState ).toBe( 'saved' );
	} );

	it( 'surfaces save conflicts and resolves them without silent overwrites', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const remoteProject = createBuilderPackage( 'Remote', [ document ] );
		const publish = vi.fn()
			.mockResolvedValueOnce( { conflict: true, project: remoteProject, versionToken: 'remote-v1' } )
			.mockResolvedValueOnce( { versionToken: 'local-v2' } );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			persistence: {
				publish,
			},
		} );

		await editor.publish();
		expect( editor.engine.getState().ui.saveState ).toBe( 'conflict' );

		await editor.resolveSaveConflict( 'keep-local' );
		expect( editor.engine.getState().ui.saveState ).toBe( 'dirty' );

		await editor.publish();
		await editor.resolveSaveConflict( 'overwrite' );
		expect( publish.mock.calls.at( -1 )?.[ 0 ] ).toMatchObject( { force: true } );
		expect( editor.engine.getState().ui.saveState ).toBe( 'published' );
	} );

} );
