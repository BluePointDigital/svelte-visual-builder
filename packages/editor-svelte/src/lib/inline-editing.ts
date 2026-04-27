import type { BuilderInlineEditingMode } from '@builder/core';

const HTML_LIKE_PATTERN = /<\/?[a-z][\s\S]*>/i;

export function normalizeInlineEditingPlainText( value: string ): string {
	return value.replace( /\r\n?/g, '\n' );
}

export function serializeInlineEditingValue( options: {
	nodeType: string | undefined;
	mode: BuilderInlineEditingMode | undefined;
	value: string;
	html: string;
} ): string {
	if ( options.mode === 'text' ) {
		return normalizeInlineEditingPlainText( options.value );
	}

	if ( options.nodeType === 'paragraph' || options.nodeType === 'blockquote' ) {
		const normalizedHtml = unwrapSingleParagraphHtml( options.html );
		return normalizedHtml || normalizeInlineEditingPlainText( options.value );
	}

	return options.html || normalizeInlineEditingPlainText( options.value );
}

function unwrapSingleParagraphHtml( value: string ): string {
	if ( !value ) {
		return '';
	}

	if ( typeof DOMParser === 'undefined' || !HTML_LIKE_PATTERN.test( value ) ) {
		return value;
	}

	const parsed = new DOMParser().parseFromString( value, 'text/html' );
	const meaningfulNodes = Array.from( parsed.body.childNodes ).filter( ( node ) => {
		return node.nodeType !== Node.TEXT_NODE || node.textContent?.trim();
	} );
	if ( meaningfulNodes.length !== 1 ) {
		return parsed.body.innerHTML;
	}

	const [ firstNode ] = meaningfulNodes;
	if ( firstNode instanceof HTMLParagraphElement ) {
		return firstNode.innerHTML;
	}

	return parsed.body.innerHTML;
}
