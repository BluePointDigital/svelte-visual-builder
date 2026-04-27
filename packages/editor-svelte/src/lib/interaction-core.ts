import type { BuilderEngineState, BuilderRect, DropTarget, NodeBounds, SlotBounds } from '@builder/core';
import { getCanvasGeometryKey, getNodeLocation } from '@builder/core';

import type { BuilderNode } from '@builder/schema';

import { createDropIntent, createDropRuleContext, evaluateDropRule, type BuilderDragDescriptor } from './drop-rules';

const MIN_INSERTION_ZONE_SIZE = 24;
const MAX_INSERTION_ZONE_SIZE = 36;
const CONTAINER_INTERIOR_BIAS_ZONE = 44;

export interface InteractionCoreFeatureState {
	interactionCoreV3: boolean;
}

export function configureInteractionCore( _features: InteractionCoreFeatureState ) {
	void _features;
}

export function isInteractionCoreV3Enabled() {
	return true;
}

export function resolveInteractionCoreDropTarget(
	state: BuilderEngineState,
	pointer: { x: number; y: number },
): DropTarget | undefined {
	const session = state.ui.dragSession;
	if ( !session ) {
		return undefined;
	}

	const document = state.project.documents.find( ( entry ) => entry.id === session.documentId );
	if ( !document ) {
		return undefined;
	}

	const descriptor = createDragDescriptor( session );
	if ( !descriptor ) {
		return undefined;
	}

	const canvasIndex = state.ui.canvas.index;
	const explicitSlotTarget = findFirstResolvedTarget(
		canvasIndex.nonRootSlotsByDocument.get( session.documentId ) ?? [],
		( slot ) => pointInRect( slot.rect, pointer.x, pointer.y ) ? computeSlotDropTarget( slot, canvasIndex, pointer, session ) : undefined,
		document.root,
		descriptor,
	);

	const rootTarget = findFirstResolvedTarget(
		canvasIndex.rootSlotsByDocument.get( session.documentId ) ?? [],
		( slot ) => pointInRect( slot.rect, pointer.x, pointer.y ) ? computeSlotDropTarget( slot, canvasIndex, pointer, session ) : undefined,
		document.root,
		descriptor,
	);

	if ( shouldPreferRootCanvasTarget( descriptor, rootTarget, explicitSlotTarget, document.root ) ) {
		return rootTarget;
	}

	if ( explicitSlotTarget ) {
		return explicitSlotTarget;
	}

	const sameContainerReorderTarget = resolveSameContainerReorderTarget( session, canvasIndex, pointer, document.root, descriptor );
	if ( sameContainerReorderTarget ) {
		return sameContainerReorderTarget;
	}

	const containerTarget = findFirstResolvedTarget(
		canvasIndex.containersByDocument.get( session.documentId ) ?? [],
		( container ) => pointInRect( container.rect, pointer.x, pointer.y )
			? computeContainerDropTarget( container, canvasIndex, pointer, session )
			: undefined,
		document.root,
		descriptor,
	);

	if ( shouldPreferRootCanvasTarget( descriptor, rootTarget, containerTarget, document.root ) ) {
		return rootTarget;
	}

	if ( containerTarget ) {
		return containerTarget;
	}

	if ( pointerInsideSameDragContainer( session, canvasIndex, pointer ) ) {
		return undefined;
	}

	return rootTarget;
}

function resolveSameContainerReorderTarget(
	session: BuilderEngineState[ 'ui' ][ 'dragSession' ],
	index: BuilderEngineState[ 'ui' ][ 'canvas' ][ 'index' ],
	pointer: { x: number; y: number },
	documentRoot: BuilderNode[],
	descriptor: BuilderDragDescriptor,
) {
	if ( !session || session.kind !== 'move' || !session.sourceParentId ) {
		return undefined;
	}

	const container = index.nodeBoundsById.get( session.sourceParentId );
	if ( !container || !pointInRect( container.rect, pointer.x, pointer.y ) ) {
		return undefined;
	}

	const target = computeContainerDropTarget( container, index, pointer, session );
	if ( !target ) {
		return undefined;
	}

	return evaluateDropRule( createDropRuleContext( descriptor, createDropIntent( target ), documentRoot ) ).accepted
		? target
		: undefined;
}

function createDragDescriptor( session: NonNullable<BuilderEngineState['ui']['dragSession']> ): BuilderDragDescriptor | undefined {
	if ( session.kind === 'create' ) {
		if ( !session.elementType ) {
			return undefined;
		}

		return {
			kind: 'palette-item',
			elementType: session.elementType,
			documentId: session.documentId,
		};
	}

	if ( !session.nodeId ) {
		return undefined;
	}

	return {
		kind: 'canvas-node',
		nodeId: session.nodeId,
		documentId: session.documentId,
	};
}

function findFirstResolvedTarget<T>(
	entries: T[],
	resolve: ( entry: T ) => DropTarget | undefined,
	documentRoot: BuilderNode[],
	descriptor: BuilderDragDescriptor,
): DropTarget | undefined {
	for ( const entry of entries ) {
		incrementCandidateResolutionCount();
		const target = resolve( entry );
		if ( !target ) {
			continue;
		}

		if ( evaluateDropRule( createDropRuleContext( descriptor, createDropIntent( target ), documentRoot ) ).accepted ) {
			return target;
		}
	}

	return undefined;
}

function incrementCandidateResolutionCount() {
	if ( typeof window === 'undefined' ) {
		return;
	}

	window.__builderPerf ??= {
		selectorEmissions: {},
	};
	const currentValue = typeof window.__builderPerf.candidateResolutionCount === 'number'
		? window.__builderPerf.candidateResolutionCount
		: 0;
	window.__builderPerf.candidateResolutionCount = currentValue + 1;
}

function computeSlotDropTarget(
	slot: SlotBounds,
	index: BuilderEngineState[ 'ui' ][ 'canvas' ][ 'index' ],
	pointer: { x: number; y: number },
	session: BuilderEngineState[ 'ui' ][ 'dragSession' ],
): DropTarget | undefined {
	const childBounds = index.childBoundsBySlot.get( getCanvasGeometryKey( slot.documentId, slot.ownerId, slot.slot ) ) ?? [];
	const axis = resolveDropAxis( slot.rect, childBounds );

	if ( !childBounds.length ) {
		return {
			documentId: slot.documentId,
			parentId: slot.ownerId,
			slot: slot.slot,
			index: 0,
			placement: slot.isRoot ? 'root' : 'into',
			rect: slot.rect,
		};
	}

	return resolveIndexedDropTarget( {
		documentId: slot.documentId,
		parentId: slot.ownerId,
		slot: slot.slot,
		containerRect: slot.rect,
		childBounds,
		pointer,
		axis,
		emptyPlacement: slot.isRoot ? 'root' : 'into',
		session,
	} );
}

function computeContainerDropTarget(
	container: NodeBounds,
	index: BuilderEngineState[ 'ui' ][ 'canvas' ][ 'index' ],
	pointer: { x: number; y: number },
	session: BuilderEngineState[ 'ui' ][ 'dragSession' ],
): DropTarget | undefined {
	const childBounds = index.childBoundsByContainer.get( getCanvasGeometryKey( container.documentId, container.nodeId, undefined ) ) ?? [];
	const axis = resolveDropAxis( container.rect, childBounds );

	if ( !childBounds.length ) {
		return {
			documentId: container.documentId,
			parentId: container.nodeId,
			slot: undefined,
			index: 0,
			placement: 'into',
			targetNodeId: container.nodeId,
			rect: container.rect,
		};
	}

	const indexedTarget = resolveIndexedDropTarget( {
		documentId: container.documentId,
		parentId: container.nodeId,
		slot: undefined,
		containerRect: container.rect,
		childBounds,
		pointer,
		axis,
		emptyPlacement: 'into',
		session,
	} );

	if (
		indexedTarget
		&&
		!indexedTarget.indicatorRect
		&&
		shouldPreferContainerInteriorTarget( container.rect, pointer, axis )
		&& !isSameDragContainer( session, container.documentId, container.nodeId, undefined )
	) {
		return {
			documentId: container.documentId,
			parentId: container.nodeId,
			slot: undefined,
			index: indexedTarget.index,
			placement: 'into',
			targetNodeId: container.nodeId,
			rect: container.rect,
		};
	}

	return indexedTarget;
}

function shouldPreferRootCanvasTarget(
	descriptor: BuilderDragDescriptor,
	rootTarget: DropTarget | undefined,
	competingTarget: DropTarget | undefined,
	documentRoot: BuilderNode[],
): rootTarget is DropTarget {
	if ( !rootTarget || !competingTarget ) {
		return false;
	}

	if ( descriptor.kind !== 'palette-item' || !isRootLevelLayoutBuilderElement( descriptor.elementType ) ) {
		return false;
	}

	const targetContainerId = competingTarget.parentId;
	if ( !targetContainerId ) {
		return false;
	}

	const topLevelTargetNode = resolveTopLevelTargetNode( documentRoot, targetContainerId );
	return Boolean( topLevelTargetNode && nodeHasChildContent( topLevelTargetNode ) );
}

function isRootLevelLayoutBuilderElement( elementType: string ) {
	return elementType === 'container' || elementType === 'grid-container';
}

function nodeHasChildContent( node: BuilderNode ) {
	if ( node.children.length > 0 ) {
		return true;
	}

	return Object.values( node.slots as Record<string, BuilderNode[]> ).some( ( slotNodes ) => slotNodes.length > 0 );
}

function resolveTopLevelTargetNode( documentRoot: BuilderNode[], nodeId: string ) {
	const location = getNodeLocation( documentRoot, nodeId );
	const topLevelTargetId = location?.path[ 0 ];
	return topLevelTargetId
		? documentRoot.find( ( node ) => node.id === topLevelTargetId )
		: undefined;
}

function resolveIndexedDropTarget( options: {
	documentId: string;
	parentId?: string;
	slot?: string;
	containerRect: BuilderRect;
	childBounds: NodeBounds[];
	pointer: { x: number; y: number };
	axis: 'x' | 'y';
	emptyPlacement: 'into' | 'root';
	session?: BuilderEngineState[ 'ui' ][ 'dragSession' ];
} ): DropTarget | undefined {
	const { axis, childBounds, containerRect, pointer } = options;
	const insertionTarget = resolveInsertionZoneDropTarget( options );
	if ( insertionTarget ) {
		return isNoOpMoveTarget( options.session, insertionTarget ) ? undefined : insertionTarget;
	}

	for ( const [ index, child ] of childBounds.entries() ) {
		const value = axis === 'x' ? pointer.x : pointer.y;
		const childStart = axis === 'x' ? child.rect.left : child.rect.top;
		const childEnd = axis === 'x' ? child.rect.right : child.rect.bottom;
		const childCenter = ( childStart + childEnd ) / 2;
		const nextChild = childBounds[ index + 1 ];

		if ( value <= childCenter ) {
			const target: DropTarget = {
				documentId: options.documentId,
				parentId: options.parentId,
				slot: options.slot,
				index,
				placement: 'before',
				targetNodeId: child.nodeId,
				rect: child.rect,
			};
			return isNoOpMoveTarget( options.session, target ) ? undefined : target;
		}

		if ( nextChild ) {
			const nextChildStart = axis === 'x' ? nextChild.rect.left : nextChild.rect.top;
			const gapBoundary = childEnd + ( ( nextChildStart - childEnd ) / 2 );
			if ( value <= gapBoundary ) {
				const target: DropTarget = {
					documentId: options.documentId,
					parentId: options.parentId,
					slot: options.slot,
					index: index + 1,
					placement: 'after',
					targetNodeId: child.nodeId,
					rect: child.rect,
				};
				return isNoOpMoveTarget( options.session, target ) ? undefined : target;
			}
		}
	}

	const last = childBounds.at( -1 );
	if ( !last ) {
		return {
			documentId: options.documentId,
			parentId: options.parentId,
			slot: options.slot,
			index: 0,
			placement: options.emptyPlacement,
			rect: containerRect,
		};
	}

	const target: DropTarget = {
		documentId: options.documentId,
		parentId: options.parentId,
		slot: options.slot,
		index: childBounds.length,
		placement: 'after',
		targetNodeId: last.nodeId,
		rect: last.rect,
	};
	return isNoOpMoveTarget( options.session, target ) ? undefined : target;
}

function resolveInsertionZoneDropTarget( options: {
	documentId: string;
	parentId?: string;
	slot?: string;
	containerRect: BuilderRect;
	childBounds: NodeBounds[];
	pointer: { x: number; y: number };
	axis: 'x' | 'y';
	emptyPlacement: 'into' | 'root';
	session?: BuilderEngineState[ 'ui' ][ 'dragSession' ];
} ): DropTarget | undefined {
	const { axis, childBounds, containerRect, pointer } = options;
	const pointerValue = axis === 'x' ? pointer.x : pointer.y;
	const containerStart = axis === 'x' ? containerRect.left : containerRect.top;
	const containerEnd = axis === 'x' ? containerRect.right : containerRect.bottom;
	const sameDragContainer = isSameDragContainer( options.session, options.documentId, options.parentId, options.slot );

	const zones = childBounds.flatMap( ( child, index ) => {
		const previous = childBounds[ index - 1 ];
		const childStart = axis === 'x' ? child.rect.left : child.rect.top;
		const childEnd = axis === 'x' ? child.rect.right : child.rect.bottom;
		const previousEnd = previous
			? axis === 'x' ? previous.rect.right : previous.rect.bottom
			: containerStart;
		const zoneHalfSize = resolveInsertionZoneSize( child.rect, axis ) / 2;
		const beforeAnchor = index === 0
			? sameDragContainer
				? childStart
				: Math.min( childStart, containerStart + zoneHalfSize )
			: ( previousEnd + childStart ) / 2;
		const trailingGutter = containerEnd - childEnd;
		const finalAfterAnchor = sameDragContainer
			? Math.min( containerEnd, childEnd )
			: trailingGutter > CONTAINER_INTERIOR_BIAS_ZONE
				? Math.max( childEnd, containerEnd - zoneHalfSize )
				: Math.min( containerEnd, childEnd );

		return [
			createInsertionZoneTarget( {
				...options,
				index,
				placement: 'before',
				targetNode: child,
				anchor: beforeAnchor,
			} ),
			index === childBounds.length - 1
				? createInsertionZoneTarget( {
					...options,
					index: index + 1,
					placement: 'after',
					targetNode: child,
					anchor: finalAfterAnchor,
				} )
				: undefined,
			index < childBounds.length - 1
				? createInsertionZoneTarget( {
					...options,
					index: index + 1,
					placement: 'after',
					targetNode: child,
					anchor: ( childEnd + getNodeStart( childBounds[ index + 1 ], axis ) ) / 2,
				} )
				: undefined,
		].filter( Boolean ) as DropTarget[];
	} );

	const containingZone = zones.find( ( zone ) => {
		const zoneStart = axis === 'x' ? zone.indicatorRect?.left ?? zone.rect.left : zone.indicatorRect?.top ?? zone.rect.top;
		const zoneEnd = axis === 'x' ? zone.indicatorRect?.right ?? zone.rect.right : zone.indicatorRect?.bottom ?? zone.rect.bottom;
		return pointerValue >= zoneStart && pointerValue <= zoneEnd;
	} );
	if ( containingZone ) {
		return containingZone;
	}

	const closestZone = zones
		.map( ( zone ) => ( {
			zone,
			distance: Math.abs( pointerValue - getInsertionAnchor( zone.indicatorRect ?? zone.rect, axis ) ),
		} ) )
		.sort( ( left, right ) => left.distance - right.distance )[ 0 ];

	if ( closestZone && closestZone.distance <= resolveInsertionZoneReach( childBounds, axis ) ) {
		return closestZone.zone;
	}

	return undefined;
}

function createInsertionZoneTarget( options: {
	documentId: string;
	parentId?: string;
	slot?: string;
	containerRect: BuilderRect;
	axis: 'x' | 'y';
	index: number;
	placement: 'before' | 'after';
	targetNode: NodeBounds;
	anchor: number;
} ): DropTarget {
	const { axis, containerRect, targetNode, anchor } = options;
	const halfSize = resolveInsertionZoneSize( targetNode.rect, axis ) / 2;
	const indicatorRect = axis === 'x'
		? {
			top: Math.min( containerRect.top, targetNode.rect.top ),
			bottom: Math.max( containerRect.bottom, targetNode.rect.bottom ),
			left: anchor - halfSize,
			right: anchor + halfSize,
			width: halfSize * 2,
			height: Math.max( containerRect.height, targetNode.rect.height ),
		}
		: {
			top: anchor - halfSize,
			bottom: anchor + halfSize,
			left: Math.min( containerRect.left, targetNode.rect.left ),
			right: Math.max( containerRect.right, targetNode.rect.right ),
			width: Math.max( containerRect.width, targetNode.rect.width ),
			height: halfSize * 2,
		};

	return {
		documentId: options.documentId,
		parentId: options.parentId,
		slot: options.slot,
		index: options.index,
		placement: options.placement,
		targetNodeId: targetNode.nodeId,
		rect: targetNode.rect,
		indicatorRect,
	};
}

function getInsertionAnchor( rect: BuilderRect, axis: 'x' | 'y' ) {
	return axis === 'x'
		? ( rect.left + rect.right ) / 2
		: ( rect.top + rect.bottom ) / 2;
}

function getNodeStart( node: NodeBounds | undefined, axis: 'x' | 'y' ) {
	if ( !node ) {
		return 0;
	}

	return axis === 'x' ? node.rect.left : node.rect.top;
}

function resolveInsertionZoneSize( rect: BuilderRect, axis: 'x' | 'y' ) {
	const size = axis === 'x' ? rect.width : rect.height;
	return Math.max( MIN_INSERTION_ZONE_SIZE, Math.min( MAX_INSERTION_ZONE_SIZE, size * 0.32 ) );
}

function resolveInsertionZoneReach( childBounds: NodeBounds[], axis: 'x' | 'y' ) {
	const averageSize = childBounds.reduce( ( total, child ) => total + ( axis === 'x' ? child.rect.width : child.rect.height ), 0 ) / Math.max( 1, childBounds.length );
	return Math.max( MIN_INSERTION_ZONE_SIZE, Math.min( CONTAINER_INTERIOR_BIAS_ZONE, averageSize * 0.25 ) );
}

function pointInRect( rect: BuilderRect, x: number, y: number ): boolean {
	return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function resolveDropAxis( rect: BuilderRect, childBounds: NodeBounds[] ): 'x' | 'y' {
	if ( childBounds.length > 1 ) {
		const first = childBounds[ 0 ];
		const last = childBounds.at( -1 );
		if ( first && last ) {
			const firstCenterX = ( first.rect.left + first.rect.right ) / 2;
			const lastCenterX = ( last.rect.left + last.rect.right ) / 2;
			const firstCenterY = ( first.rect.top + first.rect.bottom ) / 2;
			const lastCenterY = ( last.rect.top + last.rect.bottom ) / 2;
			const spreadX = Math.abs( lastCenterX - firstCenterX );
			const spreadY = Math.abs( lastCenterY - firstCenterY );
			return spreadX > spreadY ? 'x' : 'y';
		}
	}

	return rect.width > rect.height * 1.4 ? 'x' : 'y';
}

function isSameDragContainer(
	session: BuilderEngineState[ 'ui' ][ 'dragSession' ],
	documentId: string,
	parentId: string | undefined,
	slot: string | undefined,
): boolean {
	if ( !session || session.kind !== 'move' ) {
		return false;
	}

	return session.documentId === documentId
		&& session.sourceParentId === parentId
		&& session.sourceSlot === slot;
}

function pointerInsideSameDragContainer(
	session: BuilderEngineState[ 'ui' ][ 'dragSession' ],
	index: BuilderEngineState[ 'ui' ][ 'canvas' ][ 'index' ],
	pointer: { x: number; y: number },
) {
	if ( !session || session.kind !== 'move' ) {
		return false;
	}

	if ( session.sourceParentId ) {
		const container = index.nodeBoundsById.get( session.sourceParentId );
		return Boolean( container && pointInRect( container.rect, pointer.x, pointer.y ) );
	}

	const rootSlot = ( index.rootSlotsByDocument.get( session.documentId ) ?? [] )
		.find( ( slot ) => slot.slot === session.sourceSlot );
	return Boolean( rootSlot && pointInRect( rootSlot.rect, pointer.x, pointer.y ) );
}

function isNoOpMoveTarget(
	session: BuilderEngineState[ 'ui' ][ 'dragSession' ] | undefined,
	target: DropTarget,
) {
	if (
		!session
		|| session.kind !== 'move'
		|| session.sourceIndex === undefined
		|| session.documentId !== target.documentId
		|| session.sourceParentId !== target.parentId
		|| session.sourceSlot !== target.slot
	) {
		return false;
	}

	const resolvedIndex = session.sourceIndex < target.index
		? target.index - 1
		: target.index;
	return resolvedIndex === session.sourceIndex;
}

function shouldPreferContainerInteriorTarget(
	rect: BuilderRect,
	pointer: { x: number; y: number },
	axis: 'x' | 'y',
): boolean {
	const edgeZone = resolveDropEdgeZone( rect, axis );
	const axisSize = axis === 'x' ? rect.width : rect.height;
	if ( axisSize <= edgeZone * 2 ) {
		return false;
	}

	const value = axis === 'x' ? pointer.x : pointer.y;
	const start = axis === 'x' ? rect.left : rect.top;
	const end = axis === 'x' ? rect.right : rect.bottom;
	return value >= start + edgeZone && value <= end - edgeZone;
}

function resolveDropEdgeZone( rect: BuilderRect, axis: 'x' | 'y' ) {
	const size = axis === 'x' ? rect.width : rect.height;
	return Math.max( 16, Math.min( 32, size * 0.18 ) );
}
