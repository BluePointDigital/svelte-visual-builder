import { describe, expect, it } from 'vitest';

import { createDefaultBuilderRegistry } from '@builder/plugin-api';
import { createBuilderPackage, createEmptyDocument, createNode } from '@builder/schema';

import { createBuilderEditor } from '../src/lib/editor';
import { createContextMenuAnchorReference, resolveBuilderContextMenuGroups } from '../src/lib/context-menu';

describe( 'context menu behavior', () => {
	it( 'keeps canvas-root and node menu groups aligned with the anchor model', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'root-container',
				type: 'container',
				children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
			} ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ) );
		const registry = createDefaultBuilderRegistry();

		editor.dispatch( {
			type: 'document/ui/open-context-menu',
			anchor: { x: 24, y: 32 },
			targetKind: 'canvas-root',
			documentId: document.id,
			slot: 'page',
		} );

		expect( resolveBuilderContextMenuGroups( editor.engine.getState(), registry ) ).toEqual( [
			{
				id: 'insert',
				items: [
					{ id: 'add-container', label: 'Add Container' },
					{ id: 'add-heading', label: 'Add Heading' },
					{ id: 'add-button', label: 'Add Button' },
				],
			},
			{
				id: 'clipboard',
				items: [ { id: 'paste', label: 'Paste' } ],
			},
		] );

		editor.dispatch( {
			type: 'document/ui/open-context-menu',
			anchor: { x: 48, y: 64 },
			targetKind: 'navigator-node',
			documentId: document.id,
			nodeId: 'root-container',
			slot: 'page',
		} );

		const nodeGroups = resolveBuilderContextMenuGroups( editor.engine.getState(), registry );
		expect( nodeGroups.flatMap( ( group ) => group.items.map( ( item ) => item.id ) ) ).toEqual( [
			'edit',
			'copy',
			'paste',
			'paste-style',
			'duplicate',
			'add-child',
			'delete',
		] );

		const anchorReference = createContextMenuAnchorReference( { x: 88, y: 120 } );
		expect( anchorReference?.getBoundingClientRect() ).toMatchObject( {
			top: 120,
			left: 88,
			right: 89,
			bottom: 121,
			width: 1,
			height: 1,
		} );
	} );
} );
