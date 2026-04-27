import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDebouncedPrimitiveCommitController } from '../src/lib/components/PrimitiveControl.draft';

describe( 'primitive control draft controller', () => {
	beforeEach( () => {
		vi.useFakeTimers();
	} );

	afterEach( () => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	} );

	it( 'debounces repeated updates and only commits the latest callback after 150ms', () => {
		const controller = createDebouncedPrimitiveCommitController();
		const first = vi.fn();
		const second = vi.fn();

		controller.schedule( first );
		vi.advanceTimersByTime( 149 );
		expect( first ).not.toHaveBeenCalled();

		controller.schedule( second );
		vi.advanceTimersByTime( 149 );
		expect( first ).not.toHaveBeenCalled();
		expect( second ).not.toHaveBeenCalled();

		vi.advanceTimersByTime( 1 );
		expect( first ).not.toHaveBeenCalled();
		expect( second ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'flushes immediately and cancels any scheduled commit', () => {
		const controller = createDebouncedPrimitiveCommitController();
		const scheduled = vi.fn();
		const immediate = vi.fn();

		controller.schedule( scheduled );
		controller.flush( immediate );

		expect( immediate ).toHaveBeenCalledTimes( 1 );
		vi.advanceTimersByTime( 150 );
		expect( scheduled ).not.toHaveBeenCalled();
	} );

	it( 'cancels pending work without committing when destroyed', () => {
		const controller = createDebouncedPrimitiveCommitController();
		const callback = vi.fn();

		controller.schedule( callback );
		controller.cancel();
		vi.advanceTimersByTime( 150 );

		expect( callback ).not.toHaveBeenCalled();
	} );

	it( 'supports a shorter debounce window for high-frequency controls', () => {
		const controller = createDebouncedPrimitiveCommitController( 50 );
		const callback = vi.fn();

		controller.schedule( callback );
		vi.advanceTimersByTime( 49 );
		expect( callback ).not.toHaveBeenCalled();

		vi.advanceTimersByTime( 1 );
		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );
} );
