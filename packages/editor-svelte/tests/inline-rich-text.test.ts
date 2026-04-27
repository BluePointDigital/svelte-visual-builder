import { describe, expect, it } from 'vitest';

import { createDefaultBuilderRegistry } from '@builder/plugin-api';

import {
	normalizeInlineRichTextValue,
	resolveInlineRichTextMode,
	serializeInlineRichTextValue,
	textToInlineRichTextHtml,
} from '../src/lib/components/inline-rich-text';

describe( 'inline rich text helpers', () => {
	it( 'round-trips text and html values through normalization and serialization', () => {
		const textSnapshot = normalizeInlineRichTextValue( 'Hello <strong>world</strong>', 'text' );
		expect( textSnapshot ).toMatchObject( {
			mode: 'text',
			value: 'Hello world',
			html: '<p>Hello world</p>',
			text: 'Hello world',
		} );

		const htmlSnapshot = normalizeInlineRichTextValue( '<p>Hello <strong>world</strong></p>', 'auto' );
		expect( htmlSnapshot ).toMatchObject( {
			mode: 'html',
			value: '<p>Hello <strong>world</strong></p>',
			html: '<p>Hello <strong>world</strong></p>',
			text: 'Hello world',
		} );

		const editor = {
			getHTML: () => '<p>Hello <strong>world</strong></p>',
			getText: () => 'Hello world',
		} as never;

		expect( serializeInlineRichTextValue( editor, 'text' ) ).toMatchObject( {
			mode: 'text',
			value: 'Hello world',
			html: '<p>Hello <strong>world</strong></p>',
			text: 'Hello world',
		} );
		expect( serializeInlineRichTextValue( editor, 'html' ) ).toMatchObject( {
			mode: 'html',
			value: '<p>Hello <strong>world</strong></p>',
			html: '<p>Hello <strong>world</strong></p>',
			text: 'Hello world',
		} );
	} );

	it( 'detects HTML-like content and generates paragraph markup for plain text', () => {
		expect( resolveInlineRichTextMode( '<div>Markup</div>' ) ).toBe( 'html' );
		expect( resolveInlineRichTextMode( 'Plain text only' ) ).toBe( 'text' );
		expect( textToInlineRichTextHtml( 'Plain text only' ) ).toBe( '<p>Plain text only</p>' );
	} );

	it( 'keeps inline-editable definitions capability-driven and preserves blockquote rich text serialization', () => {
		const registry = createDefaultBuilderRegistry();

		for ( const type of [ 'heading', 'paragraph', 'text-editor', 'blockquote' ] as const ) {
			expect( registry.elements.get( type )?.runtime?.supportsInlineEditing ).toBe( true );
		}

		const blockquoteValue = '<blockquote><p>Quote <strong>text</strong></p></blockquote>';
		const blockquoteSnapshot = normalizeInlineRichTextValue( blockquoteValue, 'auto' );
		expect( blockquoteSnapshot ).toMatchObject( {
			mode: 'html',
			value: blockquoteValue,
			html: blockquoteValue,
			text: 'Quote text',
		} );

		const editor = {
			getHTML: () => blockquoteValue,
			getText: () => 'Quote text',
		} as never;

		expect( serializeInlineRichTextValue( editor, 'html' ) ).toMatchObject( {
			mode: 'html',
			value: blockquoteValue,
			html: blockquoteValue,
			text: 'Quote text',
		} );
	} );
} );
