import { describe, expect, it } from 'vitest';

import { createEmptyDocument, createNode } from '@builder/schema';

import { createDropIntent, createDropRuleContext, evaluateDropRule } from '../src/lib/drop-rules';

describe( 'drop rules', () => {
	it( 'rejects self and descendant move targets', () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( {
				id: 'source-container',
				type: 'container',
				children: [
					createNode( {
						id: 'nested-container',
						type: 'container',
						children: [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ],
					} ),
				],
			} ),
		];

		const selfTarget = {
			documentId: document.id,
			parentId: 'source-container',
			slot: undefined,
			index: 0,
			placement: 'into' as const,
			targetNodeId: 'source-container',
			rect: {
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				width: 0,
				height: 0,
			},
		};

		const descendantTarget = {
			documentId: document.id,
			parentId: 'nested-container',
			slot: undefined,
			index: 0,
			placement: 'into' as const,
			targetNodeId: 'nested-container',
			rect: {
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				width: 0,
				height: 0,
			},
		};

		expect( evaluateDropRule( createDropRuleContext(
			{ kind: 'canvas-node', nodeId: 'source-container', documentId: document.id },
			createDropIntent( selfTarget ),
			document.root,
		) ) ).toMatchObject( { accepted: false, reason: 'self' } );
		expect( evaluateDropRule( createDropRuleContext(
			{ kind: 'canvas-node', nodeId: 'source-container', documentId: document.id },
			createDropIntent( descendantTarget ),
			document.root,
		) ) ).toMatchObject( { accepted: false, reason: 'descendant' } );
	} );
} );
