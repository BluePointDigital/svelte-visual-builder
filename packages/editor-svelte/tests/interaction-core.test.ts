import { describe, expect, it } from 'vitest';

import { createBuilderEngine, type BuilderRect, type NodeBounds } from '@builder/core';
import { createBuilderPackage, createEmptyDocument, createNode } from '@builder/schema';

import { resolveInteractionCoreDropTarget } from '../src/lib/interaction-core';

const document = createEmptyDocument( 'page', 'Home', 'home' );
document.root = [
	createNode( {
		id: 'container',
		type: 'container',
		children: [
			createNode( { id: 'one', type: 'heading', props: { text: 'One' } } ),
			createNode( { id: 'two', type: 'paragraph', props: { text: 'Two' } } ),
			createNode( { id: 'three', type: 'button', props: { text: 'Three' } } ),
		],
	} ),
	createNode( { id: 'empty-container', type: 'container' } ),
];

describe( 'interaction core drop targeting', () => {
	it( 'resolves forgiving vertical insertion zones between siblings', () => {
		const state = createDragState( 'create', verticalBounds() );

		const beforeFirst = resolveInteractionCoreDropTarget( state, { x: 180, y: 101 } );
		const nearFirstGap = resolveInteractionCoreDropTarget( state, { x: 180, y: 145 } );
		const betweenFirstAndSecond = resolveInteractionCoreDropTarget( state, { x: 180, y: 156 } );
		const afterLast = resolveInteractionCoreDropTarget( state, { x: 180, y: 234 } );

		expect( beforeFirst ).toMatchObject( { parentId: 'container', index: 0, placement: 'before', targetNodeId: 'one' } );
		expect( beforeFirst?.indicatorRect?.height ).toBeGreaterThanOrEqual( 32 );
		expect( nearFirstGap ).toMatchObject( { parentId: 'container', index: 1, placement: 'after', targetNodeId: 'one' } );
		expect( betweenFirstAndSecond ).toMatchObject( { parentId: 'container', index: 1, placement: 'after', targetNodeId: 'one' } );
		expect( afterLast ).toMatchObject( { parentId: 'container', index: 3, placement: 'after', targetNodeId: 'three' } );
	} );

	it( 'resolves container palette drags with the same insertion bands as content nodes', () => {
		const state = createDragState( 'create-container', verticalBounds() );

		const beforeFirst = resolveInteractionCoreDropTarget( state, { x: 180, y: 101 } );
		const betweenFirstAndSecond = resolveInteractionCoreDropTarget( state, { x: 180, y: 156 } );

		expect( beforeFirst ).toMatchObject( { parentId: 'container', index: 0, placement: 'before', targetNodeId: 'one' } );
		expect( beforeFirst?.indicatorRect?.height ).toBeGreaterThanOrEqual( 32 );
		expect( betweenFirstAndSecond ).toMatchObject( { parentId: 'container', index: 1, placement: 'after', targetNodeId: 'one' } );
		expect( betweenFirstAndSecond?.indicatorRect?.height ).toBeGreaterThanOrEqual( 32 );
	} );

	it( 'suppresses same-parent no-op reorder targets while preserving real moves', () => {
		const state = createDragState( 'move-two', verticalBounds() );

		const beforeSelf = resolveInteractionCoreDropTarget( state, { x: 180, y: 160 } );
		const afterSelf = resolveInteractionCoreDropTarget( state, { x: 180, y: 198 } );
		const beforeFirst = resolveInteractionCoreDropTarget( state, { x: 180, y: 101 } );
		const afterLast = resolveInteractionCoreDropTarget( state, { x: 180, y: 234 } );

		expect( beforeSelf ).toBeUndefined();
		expect( afterSelf ).toBeUndefined();
		expect( beforeFirst ).toMatchObject( { index: 0, placement: 'before' } );
		expect( afterLast ).toMatchObject( { index: 3, placement: 'after' } );
	} );

	it( 'keeps empty containers and different-container interiors droppable as into targets', () => {
		const emptyState = createDragState( 'create', verticalBounds() );
		const filledDifferentContainerState = createDragState( 'move-three', verticalBounds() );

		expect( resolveInteractionCoreDropTarget( emptyState, { x: 180, y: 335 } ) ).toMatchObject( {
			parentId: 'empty-container',
			index: 0,
			placement: 'into',
		} );
		expect( resolveInteractionCoreDropTarget( filledDifferentContainerState, { x: 180, y: 175 } ) ).toMatchObject( {
			parentId: 'container',
			placement: 'into',
		} );
	} );

	it( 'resolves horizontal insertion zones for row-like child layouts', () => {
		const state = createDragState( 'create', horizontalBounds() );

		const beforeFirst = resolveInteractionCoreDropTarget( state, { x: 101, y: 140 } );
		const nearFirstGap = resolveInteractionCoreDropTarget( state, { x: 145, y: 140 } );
		const betweenFirstAndSecond = resolveInteractionCoreDropTarget( state, { x: 156, y: 140 } );
		const afterLast = resolveInteractionCoreDropTarget( state, { x: 284, y: 140 } );

		expect( beforeFirst ).toMatchObject( { index: 0, placement: 'before', targetNodeId: 'one' } );
		expect( beforeFirst?.indicatorRect?.width ).toBeGreaterThanOrEqual( 32 );
		expect( nearFirstGap ).toMatchObject( { index: 1, placement: 'after', targetNodeId: 'one' } );
		expect( betweenFirstAndSecond ).toMatchObject( { index: 1, placement: 'after', targetNodeId: 'one' } );
		expect( afterLast ).toMatchObject( { index: 3, placement: 'after', targetNodeId: 'three' } );
	} );

	it( 'preserves the current semantic target during small pointer jitter', () => {
		const initialState = createDragState( 'create', verticalBounds() );
		const currentTarget = resolveInteractionCoreDropTarget( initialState, { x: 180, y: 156 } );
		const stableState = {
			...initialState,
			ui: {
				...initialState.ui,
				dropTarget: currentTarget,
			},
		};

		const target = resolveInteractionCoreDropTarget( stableState, { x: 182, y: 151 } );

		expect( target ).toBe( currentTarget );
	} );
} );

function createDragState( mode: 'create' | 'create-container' | 'move-two' | 'move-three', nodeBounds: NodeBounds[] ) {
	const engine = createBuilderEngine( createBuilderPackage( 'Demo', [ document ] ), document.id );
	engine.dispatch( {
		type: 'document/ui/set-canvas-measurements',
		snapshot: {
			renderVersion: 1,
			version: 1,
			nodeBounds,
			slotBounds: [
				{
					documentId: document.id,
					rect: rect( 90, 90, 360, 380 ),
					childNodeIds: [ 'container', 'empty-container' ],
					acceptsMultiple: true,
					isRoot: true,
				},
			],
		},
	} );
	engine.dispatch( {
		type: 'document/ui/start-drag',
		session: mode === 'create' || mode === 'create-container'
			? {
				kind: 'create',
				documentId: document.id,
				start: { x: 0, y: 0 },
				current: { x: 0, y: 0 },
				elementType: mode === 'create-container' ? 'container' : 'heading',
				templateNode: createNode( { type: mode === 'create-container' ? 'container' : 'heading' } ),
			}
			: {
				kind: 'move',
				documentId: document.id,
				start: { x: 0, y: 0 },
				current: { x: 0, y: 0 },
				nodeId: mode === 'move-two' ? 'two' : 'three',
				sourceParentId: mode === 'move-two' ? 'container' : undefined,
				sourceIndex: mode === 'move-two' ? 1 : 2,
			},
	} );

	return engine.getState();
}

function verticalBounds(): NodeBounds[] {
	return [
		bounds( 'container', 'container', undefined, 0, rect( 100, 100, 320, 260 ), true ),
		bounds( 'one', 'heading', 'container', 0, rect( 120, 100, 300, 140 ) ),
		bounds( 'two', 'paragraph', 'container', 1, rect( 120, 160, 300, 198 ) ),
		bounds( 'three', 'button', 'container', 2, rect( 120, 220, 300, 252 ) ),
		bounds( 'empty-container', 'container', undefined, 1, rect( 100, 300, 320, 370 ), true ),
	];
}

function horizontalBounds(): NodeBounds[] {
	return [
		bounds( 'container', 'container', undefined, 0, rect( 100, 100, 340, 180 ), true ),
		bounds( 'one', 'heading', 'container', 0, rect( 100, 120, 140, 170 ) ),
		bounds( 'two', 'paragraph', 'container', 1, rect( 170, 120, 220, 170 ) ),
		bounds( 'three', 'button', 'container', 2, rect( 250, 120, 300, 170 ) ),
		bounds( 'empty-container', 'container', undefined, 1, rect( 100, 300, 320, 370 ), true ),
	];
}

function bounds( nodeId: string, nodeType: string, parentId: string | undefined, index: number, nodeRect: BuilderRect, acceptsChildren = false ): NodeBounds {
	return {
		nodeId,
		documentId: document.id,
		nodeType,
		parentId,
		index,
		rect: nodeRect,
		acceptsChildren,
		slotIds: [],
		editable: true,
	};
}

function rect( left: number, top: number, right: number, bottom: number ): BuilderRect {
	return {
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}
