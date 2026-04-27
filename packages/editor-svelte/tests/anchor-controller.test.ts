import { afterEach, describe, expect, it, vi } from 'vitest';

const floatingUiMocks = vi.hoisted( () => {
	const cleanup = vi.fn();
	return {
		autoUpdate: vi.fn( ( _reference: unknown, _floating: unknown, update: () => void ) => {
			void update();
			return cleanup;
		} ),
		cleanup,
		computePosition: vi.fn( async () => ( { x: 32, y: 48 } ) ),
		flip: vi.fn( () => ( { name: 'flip' } ) ),
		offset: vi.fn( () => ( { name: 'offset' } ) ),
		shift: vi.fn( () => ( { name: 'shift' } ) ),
	};
} );

vi.mock( '@floating-ui/dom', () => floatingUiMocks );

import { createAnchorController } from '../src/lib/anchor-controller';

describe( 'anchor-controller', () => {
	afterEach( () => {
		floatingUiMocks.cleanup.mockClear();
		floatingUiMocks.computePosition.mockClear();
		floatingUiMocks.autoUpdate.mockClear();
		document.body.innerHTML = '';
	} );

	it( 'positions floating content and cleans up autoUpdate listeners on close', async () => {
		const controller = createAnchorController();
		const reference = {
			getBoundingClientRect: () => ( {
				x: 100,
				y: 120,
				top: 120,
				left: 100,
				right: 101,
				bottom: 121,
				width: 1,
				height: 1,
				toJSON: () => ( {} ),
			} ),
		};
		const floating = document.createElement( 'div' );
		document.body.appendChild( floating );

		const close = controller.open( reference as never, floating );
		await Promise.resolve();
		await Promise.resolve();

		expect( floatingUiMocks.autoUpdate ).toHaveBeenCalledTimes( 1 );
		expect( floatingUiMocks.computePosition ).toHaveBeenCalledTimes( 2 );
		expect( floating.style.left ).toBe( '32px' );
		expect( floating.style.top ).toBe( '48px' );

		close();
		expect( floatingUiMocks.cleanup ).toHaveBeenCalledTimes( 1 );
	} );
} );
