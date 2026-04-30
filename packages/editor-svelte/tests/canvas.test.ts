import { describe, expect, it } from 'vitest';

import { createBuilderPackage, createEmptyDocument, createNode } from '@builder/schema';
import { buildCanvasGeometryIndex } from '@builder/core';
import { createBuilderEditor } from '../src/lib/editor';
import { resolveCanvasDropTarget } from '../src/lib/canvas';

describe( 'canvas drop targeting', () => {
	it( 'targets the container interior when adding a container over the middle of an existing root container', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.startElementDrag( 'container', { x: 250, y: 300 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'root-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 420,
							bottom: 380,
							width: 380,
							height: 340,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'root-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 380,
							bottom: 160,
							width: 300,
							height: 80,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 480,
							bottom: 480,
							width: 480,
							height: 480,
						},
						childNodeIds: [ 'root-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		const target = resolveCanvasDropTarget( editor.engine.getState(), { x: 250, y: 300 } );

		expect( target ).toMatchObject( {
			documentId: document.id,
			parentId: 'root-container',
			index: 1,
			placement: 'into',
			targetNodeId: 'root-container',
		} );
	} );

	it( 'keeps the V3 resolver active even when deprecated interaction flags are passed', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				interactionCoreV3: false,
				shellVariant: 'legacy',
			},
		} );

		editor.startElementDrag( 'container', { x: 250, y: 300 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'root-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 420,
							bottom: 380,
							width: 380,
							height: 340,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'root-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 380,
							bottom: 160,
							width: 300,
							height: 80,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 480,
							bottom: 480,
							width: 480,
							height: 480,
						},
						childNodeIds: [ 'root-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		const target = resolveCanvasDropTarget( editor.engine.getState(), { x: 250, y: 300 } );

		expect( target ).toMatchObject( {
			documentId: document.id,
			parentId: 'root-container',
			index: 1,
			placement: 'into',
			targetNodeId: 'root-container',
		} );
	} );

	it( 'treats canvasInteractionV2 as a deprecated no-op while keeping V3 targeting active', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			features: {
				interactionCoreV3: true,
				canvasInteractionV2: false,
			},
		} );

		editor.startElementDrag( 'container', { x: 250, y: 300 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'root-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 420,
							bottom: 380,
							width: 380,
							height: 340,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'root-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 380,
							bottom: 160,
							width: 300,
							height: 80,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 480,
							bottom: 480,
							width: 480,
							height: 480,
						},
						childNodeIds: [ 'root-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		const target = resolveCanvasDropTarget( editor.engine.getState(), { x: 250, y: 300 } );

		expect( target ).toMatchObject( {
			documentId: document.id,
			parentId: 'root-container',
			index: 1,
			placement: 'into',
			targetNodeId: 'root-container',
		} );
	} );

	it( 'keeps non-container palette inserts targeted at the container interior when hovering a root container', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.startElementDrag( 'button', { x: 250, y: 300 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'root-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 420,
							bottom: 380,
							width: 380,
							height: 340,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'root-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 380,
							bottom: 160,
							width: 300,
							height: 80,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 480,
							bottom: 480,
							width: 480,
							height: 480,
						},
						childNodeIds: [ 'root-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		const target = resolveCanvasDropTarget( editor.engine.getState(), { x: 250, y: 300 } );

		expect( target ).toMatchObject( {
			documentId: document.id,
			parentId: 'root-container',
			index: 1,
			placement: 'into',
			targetNodeId: 'root-container',
		} );
	} );

	it( 'treats the interior of a different container as an intentional reparent target', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'source-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
			createNode( {
				id: 'target-container',
				type: 'container',
				children: [ createNode( { id: 'target-copy', type: 'paragraph', props: { text: 'Target copy' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.startNodeDrag( 'hero', { x: 560, y: 200 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'source-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 300,
							bottom: 260,
							width: 260,
							height: 220,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'source-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 260,
							bottom: 140,
							width: 180,
							height: 60,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
					{
						nodeId: 'target-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 1,
						rect: {
							top: 40,
							left: 360,
							right: 700,
							bottom: 360,
							width: 340,
							height: 320,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'target-copy',
						documentId: document.id,
						nodeType: 'paragraph',
						parentId: 'target-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 110,
							left: 420,
							right: 640,
							bottom: 200,
							width: 220,
							height: 90,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 760,
							bottom: 420,
							width: 760,
							height: 420,
						},
						childNodeIds: [ 'source-container', 'target-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		const target = resolveCanvasDropTarget( editor.engine.getState(), { x: 560, y: 210 } );

		expect( target ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			placement: 'into',
			targetNodeId: 'target-container',
		} );
	} );

	it( 'uses container edge zones to resolve before and after while preserving interior nesting in vertical stacks', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'source-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
			createNode( {
				id: 'target-container',
				type: 'container',
				children: [ createNode( { id: 'target-copy', type: 'paragraph', props: { text: 'Target copy' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.startNodeDrag( 'hero', { x: 560, y: 60 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'source-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 300,
							bottom: 260,
							width: 260,
							height: 220,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'source-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 260,
							bottom: 140,
							width: 180,
							height: 60,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
					{
						nodeId: 'target-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 1,
						rect: {
							top: 40,
							left: 360,
							right: 700,
							bottom: 360,
							width: 340,
							height: 320,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'target-copy',
						documentId: document.id,
						nodeType: 'paragraph',
						parentId: 'target-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 110,
							left: 420,
							right: 640,
							bottom: 200,
							width: 220,
							height: 90,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 760,
							bottom: 420,
							width: 760,
							height: 420,
						},
						childNodeIds: [ 'source-container', 'target-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		expect( resolveCanvasDropTarget( editor.engine.getState(), { x: 560, y: 60 } ) ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			index: 0,
			placement: 'before',
			targetNodeId: 'target-copy',
		} );

		expect( resolveCanvasDropTarget( editor.engine.getState(), { x: 560, y: 210 } ) ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			placement: 'into',
			targetNodeId: 'target-container',
		} );

		expect( resolveCanvasDropTarget( editor.engine.getState(), { x: 560, y: 340 } ) ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			index: 1,
			placement: 'after',
			targetNodeId: 'target-copy',
		} );
	} );

	it( 'uses container edge zones on the horizontal axis without losing interior reparenting', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'source-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
			createNode( {
				id: 'target-container',
				type: 'container',
				children: [ createNode( { id: 'target-copy', type: 'paragraph', props: { text: 'Target copy' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );

		editor.startNodeDrag( 'hero', { x: 380, y: 160 } );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot: {
				renderVersion: 1,
				version: 1,
				nodeBounds: [
					{
						nodeId: 'source-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 0,
						rect: {
							top: 40,
							left: 40,
							right: 300,
							bottom: 260,
							width: 260,
							height: 220,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'hero',
						documentId: document.id,
						nodeType: 'heading',
						parentId: 'source-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 80,
							left: 80,
							right: 260,
							bottom: 140,
							width: 180,
							height: 60,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
					{
						nodeId: 'target-container',
						documentId: document.id,
						nodeType: 'container',
						parentId: undefined,
						slot: undefined,
						index: 1,
						rect: {
							top: 40,
							left: 360,
							right: 740,
							bottom: 260,
							width: 380,
							height: 220,
						},
						acceptsChildren: true,
						slotIds: [],
						editable: false,
					},
					{
						nodeId: 'target-copy',
						documentId: document.id,
						nodeType: 'paragraph',
						parentId: 'target-container',
						slot: undefined,
						index: 0,
						rect: {
							top: 90,
							left: 420,
							right: 520,
							bottom: 190,
							width: 100,
							height: 100,
						},
						acceptsChildren: false,
						slotIds: [],
						editable: true,
					},
				],
				slotBounds: [
					{
						documentId: document.id,
						ownerId: undefined,
						slot: 'page',
						rect: {
							top: 0,
							left: 0,
							right: 820,
							bottom: 320,
							width: 820,
							height: 320,
						},
						childNodeIds: [ 'source-container', 'target-container' ],
						acceptsMultiple: true,
						isRoot: true,
					},
				],
			},
		} );

		expect( resolveCanvasDropTarget( editor.engine.getState(), { x: 380, y: 160 } ) ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			index: 0,
			placement: 'before',
			targetNodeId: 'target-copy',
		} );

		expect( resolveCanvasDropTarget( editor.engine.getState(), { x: 560, y: 160 } ) ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			placement: 'into',
			targetNodeId: 'target-container',
		} );

		expect( resolveCanvasDropTarget( editor.engine.getState(), { x: 720, y: 160 } ) ).toMatchObject( {
			documentId: document.id,
			parentId: 'target-container',
			index: 1,
			placement: 'after',
			targetNodeId: 'target-copy',
		} );
	} );

	it( 'resolves drop targets from the precomputed geometry index without relying on raw arrays', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [
					createNode( { id: 'heading-a', type: 'heading', props: { text: 'A' } } ),
					createNode( { id: 'heading-b', type: 'heading', props: { text: 'B' } } ),
				],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );
		editor.startElementDrag( 'button', { x: 120, y: 180 } );

		const nodeBounds = [
			{
				nodeId: 'root-container',
				documentId: document.id,
				nodeType: 'container',
				parentId: undefined,
				slot: undefined,
				index: 0,
				rect: {
					top: 20,
					left: 20,
					right: 420,
					bottom: 360,
					width: 400,
					height: 340,
				},
				acceptsChildren: true,
				slotIds: [],
				editable: false,
			},
			{
				nodeId: 'heading-a',
				documentId: document.id,
				nodeType: 'heading',
				parentId: 'root-container',
				slot: undefined,
				index: 0,
				rect: {
					top: 60,
					left: 60,
					right: 260,
					bottom: 120,
					width: 200,
					height: 60,
				},
				acceptsChildren: false,
				slotIds: [],
				editable: true,
			},
			{
				nodeId: 'heading-b',
				documentId: document.id,
				nodeType: 'heading',
				parentId: 'root-container',
				slot: undefined,
				index: 1,
				rect: {
					top: 150,
					left: 60,
					right: 260,
					bottom: 210,
					width: 200,
					height: 60,
				},
				acceptsChildren: false,
				slotIds: [],
				editable: true,
			},
		];
		const slotBounds = [
			{
				documentId: document.id,
				ownerId: undefined,
				slot: 'page',
				rect: {
					top: 0,
					left: 0,
					right: 480,
					bottom: 420,
					width: 480,
					height: 420,
				},
				childNodeIds: [ 'root-container' ],
				acceptsMultiple: true,
				isRoot: true,
			},
		];
		const indexedState = {
			...editor.engine.getState(),
			ui: {
				...editor.engine.getState().ui,
				canvas: {
					renderVersion: 1,
					snapshotVersion: 1,
					nodeBounds: [],
					slotBounds: [],
					index: buildCanvasGeometryIndex( nodeBounds, slotBounds ),
				},
			},
		};

		const target = resolveCanvasDropTarget( indexedState, { x: 410, y: 330 } );

		expect( target ).toMatchObject( {
			documentId: document.id,
			parentId: 'root-container',
			index: 2,
			placement: 'after',
			targetNodeId: 'heading-b',
		} );
	} );
} );
