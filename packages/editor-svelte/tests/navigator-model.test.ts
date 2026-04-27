import { describe, expect, it } from 'vitest';

import { createNode } from '@builder/schema';

import {
	buildNavigatorVirtualRows,
	estimateNavigatorVirtualRowSize,
	formatNavigatorSlotLabel,
	getNavigatorNodeBadge,
	getNavigatorNodeIndicators,
	getNavigatorNodeLabel,
	getNavigatorNodeSubtitle,
} from '../src/lib/navigator-model';

describe( 'navigator-model', () => {
	it( 'flattens visible rows in preorder while preserving slot headers and depth context', () => {
		const nodes = [
			createNode( {
				id: 'section',
				type: 'container',
				children: [
					createNode( { id: 'hero', type: 'heading', props: { text: 'Hero title' } } ),
					createNode( { id: 'cta', type: 'button', props: { text: 'Call to action' } } ),
				],
				slots: {
					footer: [
						createNode( { id: 'footer-note', type: 'paragraph', props: { text: 'Footer note' } } ),
					],
				},
			} ),
		];

		const rows = buildNavigatorVirtualRows( nodes );

		expect( rows.map( ( row ) => row.kind === 'slot' ? `slot:${row.slot}` : `node:${row.nodeId}` ) ).toEqual( [
			'node:section',
			'node:hero',
			'node:cta',
			'slot:footer',
			'node:footer-note',
		] );
		expect( new Set( rows.map( ( row ) => row.key ) ).size ).toBe( rows.length );
		expect( rows.find( ( row ) => row.kind === 'node' && row.nodeId === 'hero' ) ).toMatchObject( {
			depth: 2,
			index: 0,
			parentId: 'section',
			rowIndex: 1,
		} );
		expect( rows.find( ( row ) => row.kind === 'slot' && row.slot === 'footer' ) ).toMatchObject( {
			depth: 1,
			parentId: 'section',
			rowIndex: 3,
		} );
		expect( rows.find( ( row ) => row.kind === 'node' && row.nodeId === 'footer-note' ) ).toMatchObject( {
			depth: 2,
			parentId: 'section',
			slot: 'footer',
			rowIndex: 4,
		} );
	} );

	it( 'derives stable labels, indicators, badges, and virtual size hints', () => {
		const node = createNode( {
			id: 'legacy-instance',
			type: 'component-instance',
			props: { title: 'Legacy Hero' },
			slots: { content: [] },
			legacy: { widgetType: 'hero-widget', rawSettings: {}, editable: true },
			visibility: { hidden: true, breakpointHidden: { tablet: true }, conditionGroups: [], display: 'show' },
			meta: { detachedComponent: true },
		} );

		expect( getNavigatorNodeBadge( node.type ) ).toBe( 'CP' );
		expect( getNavigatorNodeLabel( node ) ).toBe( 'Legacy Hero' );
		expect( getNavigatorNodeSubtitle( node, 'Hero Component' ) ).toContain( 'Hero Component' );
		expect( getNavigatorNodeSubtitle( node, 'Hero Component' ) ).toContain( '1 slot' );
		expect( getNavigatorNodeIndicators( node ).map( ( entry ) => entry.label ) ).toEqual( [
			'Hidden',
			'Instance',
			'Detached',
			'Legacy',
		] );
		expect( formatNavigatorSlotLabel( 'hero_footer' ) ).toBe( 'Hero Footer' );
		expect( estimateNavigatorVirtualRowSize( { kind: 'node', key: 'a', rowIndex: 0, depth: 1, nodeId: 'a', index: 0, node, siblings: [ node ] } ) ).toBeGreaterThan( estimateNavigatorVirtualRowSize( { kind: 'slot', key: 'b', rowIndex: 1, depth: 1, nodeId: 'a', parentId: 'a', slot: 'footer', node, slotNodes: [] } ) );
	} );
} );
