import { describe, expect, it } from 'vitest';

import type { BuilderRect, NodeBounds } from '@builder/core';
import { createNode } from '@builder/schema';

import { computeNextGapValue, createLayoutOverlayModel } from '../src/lib/layout-overlay';

describe( 'layout overlay view model', () => {
	it( 'describes selected flex containers with direction, gap, and alignment', () => {
		const node = createNode( {
			id: 'container',
			type: 'container',
			layout: {
				display: 'flex',
				direction: 'column',
				gap: '1.5rem',
				justifyContent: 'space-between',
				alignItems: 'center',
				wrap: 'wrap',
			},
		} );

		const model = createLayoutOverlayModel( node, bounds( 'container', rect( 0, 0, 400, 300 ), true ), [
			bounds( 'one', rect( 20, 20, 380, 80 ) ),
			bounds( 'two', rect( 20, 110, 380, 170 ) ),
		] );

		expect( model ).toMatchObject( {
			display: 'flex',
			axis: 'y',
			label: 'Column wrap',
			gap: { value: '1.5rem', number: 1.5, unit: 'rem' },
			alignment: { justify: 'space-between', align: 'center', wrap: 'wrap' },
			childCount: 2,
		} );
	} );

	it( 'describes grid containers with track counts', () => {
		const node = createNode( {
			id: 'grid',
			type: 'container',
			layout: {
				display: 'grid',
				columns: 'repeat(3, minmax(0, 1fr))',
				rows: 'auto auto',
				gap: '24px',
			},
		} );

		const model = createLayoutOverlayModel( node, bounds( 'grid', rect( 0, 0, 600, 300 ), true ), [] );

		expect( model ).toMatchObject( {
			display: 'grid',
			axis: 'x',
			label: 'Grid 3 x 2',
			grid: { columns: 3, rows: 2 },
			gap: { value: '24px', number: 24, unit: 'px' },
		} );
	} );

	it( 'prefers style-backed layout values when inspector controls author styles', () => {
		const node = createNode( {
			id: 'style-grid',
			type: 'container',
			layout: {
				display: 'flex',
				direction: 'row',
				gap: '8px',
			},
			styles: {
				base: {
					display: 'grid',
					'grid-template-columns': 'repeat(4, minmax(0, 1fr))',
					'grid-template-rows': 'auto auto',
					gap: '32px',
				},
			},
		} );

		const model = createLayoutOverlayModel( node, bounds( 'style-grid', rect( 0, 0, 800, 360 ), true ), [] );

		expect( model ).toMatchObject( {
			display: 'grid',
			label: 'Grid 4 x 2',
			gap: { value: '32px', number: 32, unit: 'px' },
		} );
	} );

	it( 'computes gap drag values while preserving units', () => {
		expect( computeNextGapValue( '12px', 8 ) ).toBe( '20px' );
		expect( computeNextGapValue( '1rem', 16, { stepPx: 1 / 16 } ) ).toBe( '2rem' );
		expect( computeNextGapValue( '4px', -20 ) ).toBe( '0px' );
	} );
} );

function bounds( nodeId: string, nodeRect: BuilderRect, acceptsChildren = false ): NodeBounds {
	return {
		nodeId,
		documentId: 'doc',
		nodeType: 'container',
		parentId: undefined,
		index: 0,
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
