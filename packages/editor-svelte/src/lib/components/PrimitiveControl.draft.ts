export interface DebouncedPrimitiveCommitController {
	cancel: () => void;
	flush: ( callback: () => void ) => void;
	schedule: ( callback: () => void ) => void;
}

export function createDebouncedPrimitiveCommitController( delayMs = 150 ): DebouncedPrimitiveCommitController {
	let timer: ReturnType<typeof setTimeout> | undefined;

	function cancel() {
		if ( timer !== undefined ) {
			clearTimeout( timer );
			timer = undefined;
		}
	}

	return {
		cancel,
		flush( callback ) {
			cancel();
			callback();
		},
		schedule( callback ) {
			cancel();
			timer = setTimeout( () => {
				timer = undefined;
				callback();
			}, delayMs );
		},
	};
}
