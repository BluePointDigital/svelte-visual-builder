// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { serializeInlineEditingValue } from '../src/lib/inline-editing';

describe( 'inline editing writeback serialization', () => {
	it( 'keeps heading plain text while preserving rich html for supported node types', () => {
		expect( serializeInlineEditingValue( {
			nodeType: 'heading',
			mode: 'text',
			value: 'Heading inline edit updated',
			html: '<p><strong>Heading inline edit updated</strong></p>',
		} ) ).toBe( 'Heading inline edit updated' );

		expect( serializeInlineEditingValue( {
			nodeType: 'paragraph',
			mode: 'html',
			value: 'Paragraph inline edit updated',
			html: '<p><strong>Paragraph inline edit updated</strong></p>',
		} ) ).toBe( '<strong>Paragraph inline edit updated</strong>' );

		expect( serializeInlineEditingValue( {
			nodeType: 'text-editor',
			mode: 'html',
			value: 'Text editor inline edit updated',
			html: '<p><strong>Text editor inline edit updated</strong></p>',
		} ) ).toBe( '<p><strong>Text editor inline edit updated</strong></p>' );

		expect( serializeInlineEditingValue( {
			nodeType: 'blockquote',
			mode: 'html',
			value: 'Blockquote inline edit updated',
			html: '<p><strong>Blockquote inline edit updated</strong></p>',
		} ) ).toBe( '<strong>Blockquote inline edit updated</strong>' );
	} );
} );
