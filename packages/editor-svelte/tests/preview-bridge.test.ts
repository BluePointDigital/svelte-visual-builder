// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock( '@dnd-kit/svelte', () => ( {
	DragDropProvider: {},
} ) );

import { createDelegatedPreviewBridge, resolveBuilderNodeElement } from '../src/lib/BuilderPreview.svelte';

describe( 'preview bridge', () => {
	it( 'routes selection, hover, and inline-edit events through delegated listeners', () => {
		const doc = document.implementation.createHTMLDocument( 'preview' );
		doc.body.innerHTML = `
			<div data-builder-node="hero" data-builder-document="page" data-builder-type="heading" data-builder-editable="true">
				<span class="inner">Hello</span>
			</div>
			<div data-builder-node="copy" data-builder-document="page" data-builder-type="paragraph">
				<span>Copy</span>
			</div>
		`;

		const events: string[] = [];
		const cleanup = createDelegatedPreviewBridge( doc, {
			onSelect: ( nodeElement ) => events.push( `select:${ nodeElement.dataset.builderNode }` ),
			onHover: ( nodeElement ) => events.push( `hover:${ nodeElement?.dataset.builderNode ?? 'clear' }` ),
			onStartInlineEdit: ( nodeElement ) => events.push( `start:${ nodeElement.dataset.builderNode }` ),
			onInlineInput: ( nodeElement ) => events.push( `input:${ nodeElement.dataset.builderNode }` ),
			onStopInlineEdit: ( nodeElement ) => events.push( `stop:${ nodeElement.dataset.builderNode }` ),
		} );

		const heading = doc.querySelector<HTMLElement>( '[data-builder-node="hero"]' );
		const headingInner = heading?.querySelector<HTMLElement>( '.inner' );
		expect( heading ).not.toBeNull();
		expect( headingInner ).not.toBeNull();
		expect( resolveBuilderNodeElement( headingInner ) ).toBe( heading );

		headingInner!.dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true } ) );
		headingInner!.dispatchEvent( new Event( 'pointerover', { bubbles: true, cancelable: true } ) );
		headingInner!.dispatchEvent( new Event( 'focusin', { bubbles: true, cancelable: true } ) );
		headingInner!.dispatchEvent( new Event( 'input', { bubbles: true, cancelable: true } ) );
		headingInner!.dispatchEvent( new Event( 'focusout', { bubbles: true, cancelable: true } ) );
		headingInner!.dispatchEvent( new Event( 'pointerout', { bubbles: true, cancelable: true } ) );

		expect( events ).toEqual( [
			'select:hero',
			'hover:hero',
			'hover:clear',
		] );

		cleanup();
	} );
} );
