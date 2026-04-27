import { describe, expect, it } from 'vitest';

import { resolveBuilderInlineEditingMode } from '../src/index';

describe( 'inline editing mode resolution', () => {
	it( 'derives eligibility from supportsInlineEditing and keeps heading plain text', () => {
		expect( resolveBuilderInlineEditingMode( 'heading', true ) ).toBe( 'text' );
		expect( resolveBuilderInlineEditingMode( 'paragraph', true ) ).toBe( 'html' );
		expect( resolveBuilderInlineEditingMode( 'text-editor', true ) ).toBe( 'html' );
		expect( resolveBuilderInlineEditingMode( 'blockquote', true ) ).toBe( 'html' );
		expect( resolveBuilderInlineEditingMode( 'button', false ) ).toBeUndefined();
		expect( resolveBuilderInlineEditingMode( undefined, true ) ).toBeUndefined();
	} );
} );
