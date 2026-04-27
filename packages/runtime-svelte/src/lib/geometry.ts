import type { CanvasGeometrySnapshot, NodeBounds, SlotBounds } from '@builder/core';

export const BUILDER_GEOMETRY_CONTEXT = Symbol( 'builder-geometry-context' );

export interface BuilderGeometryNodeMeta extends Omit<NodeBounds, 'rect'> {}
export interface BuilderGeometrySlotMeta extends Omit<SlotBounds, 'rect' | 'childNodeIds'> {
	childNodeIds?: string[];
}

interface RegisteredNode {
	element: HTMLElement;
	meta: BuilderGeometryNodeMeta;
}

interface RegisteredSlot {
	element: HTMLElement;
	meta: BuilderGeometrySlotMeta;
}

interface RegisterHandle {
	update: ( meta: unknown ) => void;
	destroy: () => void;
}

export interface BuilderCanvasGeometryEmitter {
	registerNode: ( element: HTMLElement, meta: BuilderGeometryNodeMeta ) => RegisterHandle;
	registerSlot: ( element: HTMLElement, meta: BuilderGeometrySlotMeta ) => RegisterHandle;
	schedule: ( reason?: string ) => void;
	setEnabled: ( enabled: boolean ) => void;
	setRenderVersion: ( renderVersion: number ) => void;
	destroy: () => void;
}

export function createCanvasGeometryEmitter( options: {
	enabled: boolean;
	renderVersion: number;
	postSnapshot: ( snapshot: CanvasGeometrySnapshot ) => void;
	postInvalidation?: ( reason: string, renderVersion: number ) => void;
} ): BuilderCanvasGeometryEmitter {
	let enabled = options.enabled;
	let renderVersion = options.renderVersion;
	let snapshotVersion = 0;
	let measurementFrame = 0;
	const nodes = new Map<HTMLElement, RegisteredNode>();
	const slots = new Map<HTMLElement, RegisteredSlot>();
	const resizeObserver = typeof ResizeObserver === 'undefined'
		? undefined
		: new ResizeObserver( () => schedule( 'resize-observer' ) );

	function toRect( rect: DOMRect ) {
		return {
			top: rect.top,
			left: rect.left,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height,
		};
	}

	function measure() {
		if ( !enabled || typeof window === 'undefined' ) {
			return;
		}

		snapshotVersion += 1;
		const nodeBounds = [ ...nodes.values() ].map( ( entry ) => ( {
			...entry.meta,
			rect: toRect( entry.element.getBoundingClientRect() ),
		} ) );
		const slotBounds = [ ...slots.values() ].map( ( entry ) => ( {
			...entry.meta,
			rect: toRect( entry.element.getBoundingClientRect() ),
			childNodeIds: entry.meta.childNodeIds ?? readSlotChildNodeIds( entry.element ),
		} ) );

		options.postSnapshot( {
			renderVersion,
			version: snapshotVersion,
			nodeBounds,
			slotBounds,
		} );
	}

	function flushMeasurementFrame() {
		if ( measurementFrame && typeof window !== 'undefined' ) {
			cancelAnimationFrame( measurementFrame );
			measurementFrame = 0;
		}
		measure();
	}

	function schedule( reason = 'unspecified' ) {
		if ( !enabled ) {
			return;
		}

		options.postInvalidation?.( reason, renderVersion );
		if ( typeof window === 'undefined' ) {
			flushMeasurementFrame();
			return;
		}

		if ( measurementFrame ) {
			return;
		}

		measurementFrame = window.requestAnimationFrame( () => {
			measurementFrame = 0;
			measure();
		} );
	}

	function observeElement( element: HTMLElement ) {
		resizeObserver?.observe( element );
	}

	function readSlotChildNodeIds( element: HTMLElement ): string[] {
		return Array.from( element.children )
			.map( ( child ) => ( child as HTMLElement ).dataset.builderNode )
			.filter( Boolean ) as string[];
	}

	function unobserveElement( element: HTMLElement ) {
		resizeObserver?.unobserve( element );
	}

	function registerNode( element: HTMLElement, meta: BuilderGeometryNodeMeta ): RegisterHandle {
		nodes.set( element, { element, meta } );
		observeElement( element );
		schedule( 'node-register' );
		return {
			update( nextMeta ) {
				nodes.set( element, {
					element,
					meta: nextMeta as BuilderGeometryNodeMeta,
				} );
				schedule( 'node-update' );
			},
			destroy() {
				nodes.delete( element );
				unobserveElement( element );
				schedule( 'node-destroy' );
			},
		};
	}

	function registerSlot( element: HTMLElement, meta: BuilderGeometrySlotMeta ): RegisterHandle {
		slots.set( element, { element, meta } );
		observeElement( element );
		schedule( 'slot-register' );
		return {
			update( nextMeta ) {
				slots.set( element, {
					element,
					meta: nextMeta as BuilderGeometrySlotMeta,
				} );
				schedule( 'slot-update' );
			},
			destroy() {
				slots.delete( element );
				unobserveElement( element );
				schedule( 'slot-destroy' );
			},
		};
	}

	function destroy() {
		if ( measurementFrame && typeof window !== 'undefined' ) {
			cancelAnimationFrame( measurementFrame );
			measurementFrame = 0;
		}
		resizeObserver?.disconnect();
		nodes.clear();
		slots.clear();
	}

	return {
		registerNode,
		registerSlot,
		schedule,
		setEnabled( nextEnabled ) {
			enabled = nextEnabled;
			if ( !enabled && measurementFrame && typeof window !== 'undefined' ) {
				cancelAnimationFrame( measurementFrame );
				measurementFrame = 0;
				return;
			}

			if ( enabled ) {
				schedule( 'enabled' );
			}
		},
		setRenderVersion( nextRenderVersion ) {
			renderVersion = nextRenderVersion;
			snapshotVersion = 0;
			schedule( 'render-version' );
		},
		destroy,
	};
}
