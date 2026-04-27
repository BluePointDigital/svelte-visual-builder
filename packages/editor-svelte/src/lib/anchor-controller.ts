import { autoUpdate, computePosition, flip, offset, shift, type ComputePositionConfig, type VirtualElement } from '@floating-ui/dom';

export interface BuilderAnchorController {
	open: ( reference: Element | VirtualElement, floating: HTMLElement, options?: ComputePositionConfig ) => () => void;
	close: () => void;
}

export function createAnchorController(): BuilderAnchorController {
	let cleanup: (() => void) | undefined;

	function close() {
		cleanup?.();
		cleanup = undefined;
	}

	return {
		open( reference, floating, options ) {
			close();
			const update = async () => {
				const result = await computePosition( reference, floating, {
					placement: 'bottom-start',
					middleware: [ offset( 8 ), flip(), shift( { padding: 8 } ) ],
					...options,
				} );

				Object.assign( floating.style, {
					left: `${ result.x }px`,
					top: `${ result.y }px`,
				} );
			};

			cleanup = autoUpdate( reference, floating, update );
			void update();
			return close;
		},
		close,
	};
}
