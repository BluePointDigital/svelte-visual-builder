import { describe, expect, it } from 'vitest';

import { buildCanvasGeometryIndex, createCanvasGeometryState, getCanvasGeometryKey } from '../src/index';

describe( 'canvas geometry state', () => {
	it( 'builds ordered container and slot indexes from a snapshot', () => {
		const nodeBounds = [
			{
				nodeId: 'root-container',
				documentId: 'doc-1',
				nodeType: 'container',
				parentId: undefined,
				slot: undefined,
				index: 0,
				rect: { top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 },
				acceptsChildren: true,
				slotIds: [ 'content', 'sidebar' ],
				editable: false,
			},
			{
				nodeId: 'nested-container',
				documentId: 'doc-1',
				nodeType: 'container',
				parentId: 'root-container',
				slot: undefined,
				index: 2,
				rect: { top: 100, left: 120, right: 420, bottom: 340, width: 300, height: 240 },
				acceptsChildren: true,
				slotIds: [],
				editable: false,
			},
			{
				nodeId: 'heading-b',
				documentId: 'doc-1',
				nodeType: 'heading',
				parentId: 'root-container',
				slot: undefined,
				index: 1,
				rect: { top: 60, left: 80, right: 260, bottom: 120, width: 180, height: 60 },
				acceptsChildren: false,
				slotIds: [],
				editable: true,
			},
			{
				nodeId: 'heading-a',
				documentId: 'doc-1',
				nodeType: 'heading',
				parentId: 'root-container',
				slot: undefined,
				index: 0,
				rect: { top: 20, left: 80, right: 260, bottom: 60, width: 180, height: 40 },
				acceptsChildren: false,
				slotIds: [],
				editable: true,
			},
			{
				nodeId: 'slot-child-b',
				documentId: 'doc-1',
				nodeType: 'paragraph',
				parentId: 'root-container',
				slot: 'content',
				index: 1,
				rect: { top: 200, left: 120, right: 360, bottom: 260, width: 240, height: 60 },
				acceptsChildren: false,
				slotIds: [],
				editable: true,
			},
			{
				nodeId: 'slot-child-a',
				documentId: 'doc-1',
				nodeType: 'paragraph',
				parentId: 'root-container',
				slot: 'content',
				index: 0,
				rect: { top: 140, left: 120, right: 360, bottom: 190, width: 240, height: 50 },
				acceptsChildren: false,
				slotIds: [],
				editable: true,
			},
		];
		const slotBounds = [
			{
				documentId: 'doc-1',
				ownerId: undefined,
				slot: 'page',
				rect: { top: 0, left: 0, right: 900, bottom: 900, width: 900, height: 900 },
				childNodeIds: [ 'root-container' ],
				acceptsMultiple: true,
				isRoot: true,
			},
			{
				documentId: 'doc-1',
				ownerId: 'root-container',
				slot: 'sidebar',
				rect: { top: 120, left: 500, right: 660, bottom: 300, width: 160, height: 180 },
				childNodeIds: [],
				acceptsMultiple: true,
				isRoot: false,
			},
			{
				documentId: 'doc-1',
				ownerId: 'root-container',
				slot: 'content',
				rect: { top: 120, left: 120, right: 440, bottom: 340, width: 320, height: 220 },
				childNodeIds: [ 'slot-child-b', 'slot-child-a' ],
				acceptsMultiple: true,
				isRoot: false,
			},
		];

		const index = buildCanvasGeometryIndex( nodeBounds, slotBounds );

		expect( index.nodeBoundsById.get( 'heading-a' )?.nodeType ).toBe( 'heading' );
		expect( index.containersByDocument.get( 'doc-1' )?.map( ( entry ) => entry.nodeId ) ).toEqual( [
			'nested-container',
			'root-container',
		] );
		expect( index.nonRootSlotsByDocument.get( 'doc-1' )?.map( ( entry ) => entry.slot ) ).toEqual( [
			'sidebar',
			'content',
		] );
		expect( index.childBoundsByContainer.get( getCanvasGeometryKey( 'doc-1', 'root-container' ) )?.map( ( entry ) => entry.nodeId ) ).toEqual( [
			'heading-a',
			'heading-b',
			'nested-container',
		] );
		expect( index.childBoundsBySlot.get( getCanvasGeometryKey( 'doc-1', 'root-container', 'content' ) )?.map( ( entry ) => entry.nodeId ) ).toEqual( [
			'slot-child-a',
			'slot-child-b',
		] );
	} );

	it( 'tracks snapshot versions while keeping a safe empty default state', () => {
		const state = createCanvasGeometryState();
		expect( state.renderVersion ).toBe( 0 );
		expect( state.snapshotVersion ).toBe( 0 );
		expect( state.index.nodeBoundsById.size ).toBe( 0 );

		const snapshotState = createCanvasGeometryState( {
			renderVersion: 7,
			version: 3,
			nodeBounds: [],
			slotBounds: [],
		} );
		expect( snapshotState.renderVersion ).toBe( 7 );
		expect( snapshotState.snapshotVersion ).toBe( 3 );
	} );
} );
