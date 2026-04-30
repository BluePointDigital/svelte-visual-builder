import type { BuilderEngineState, DropTarget } from '@builder/core';

import type { BuilderDragDescriptor } from './drop-rules';
import { resolveCanvasDropTarget } from './canvas';
import type { BuilderTransientDragPointer } from './transient-drag';

export interface BuilderDndData {
	kind: 'builder';
	label: string;
	descriptor: BuilderDragDescriptor;
}

export interface BuilderDroppableData {
	kind: 'builder-droppable';
	target: DropTarget;
	priority: 'root' | 'slot' | 'container';
}

export function createBuilderDndData(
	label: string,
	descriptor: BuilderDragDescriptor,
): BuilderDndData {
	return {
		kind: 'builder',
		label,
		descriptor,
	};
}

export function createBuilderDroppableData(
	target: DropTarget,
	priority: BuilderDroppableData['priority'],
): BuilderDroppableData {
	return {
		kind: 'builder-droppable',
		target,
		priority,
	};
}

export function isBuilderDndData( value: unknown ): value is BuilderDndData {
	if ( !value || typeof value !== 'object' ) {
		return false;
	}

	const candidate = value as Partial<BuilderDndData>;
	return candidate.kind === 'builder'
		&& typeof candidate.label === 'string'
		&& Boolean( candidate.descriptor && typeof candidate.descriptor === 'object' );
}

export function isBuilderDroppableData( value: unknown ): value is BuilderDroppableData {
	if ( !value || typeof value !== 'object' ) {
		return false;
	}

	const candidate = value as Partial<BuilderDroppableData>;
	return candidate.kind === 'builder-droppable'
		&& Boolean( candidate.target && typeof candidate.target === 'object' )
		&& ( candidate.priority === 'root' || candidate.priority === 'slot' || candidate.priority === 'container' );
}

export function resolveClientPoint( nativeEvent?: Event ) {
	if ( nativeEvent instanceof MouseEvent || nativeEvent instanceof PointerEvent ) {
		return {
			clientX: nativeEvent.clientX,
			clientY: nativeEvent.clientY,
		};
	}

	return undefined;
}

export function resolvePreviewPointerFromClientPoint(
	clientX: number,
	clientY: number,
	frame: HTMLElement | null | undefined,
): BuilderTransientDragPointer {
	const rect = frame?.getBoundingClientRect();
	if ( !rect || !frame ) {
		return {
			x: clientX,
			y: clientY,
			inside: false,
			clientX,
			clientY,
		};
	}

	return {
		x: clientX - rect.left - frame.clientLeft,
		y: clientY - rect.top - frame.clientTop,
		inside:
			clientX >= rect.left
			&& clientX <= rect.right
			&& clientY >= rect.top
			&& clientY <= rect.bottom,
		clientX,
		clientY,
	};
}

export function resolveNavigatorDropTargetFromPoint(
	state: BuilderEngineState,
	clientX: number,
	clientY: number,
): DropTarget | undefined {
	incrementCandidateResolutionCount();
	const dragSession = state.ui.dragSession;
	if ( !dragSession || typeof document === 'undefined' ) {
		return undefined;
	}

	const targetElement = document.elementFromPoint( clientX, clientY ) as HTMLElement | null;
	const rowShell = targetElement?.closest( '[data-navigator-node]' ) as HTMLElement | null;
	if ( !rowShell ) {
		return undefined;
	}

	const targetNodeId = rowShell.dataset.navigatorNode;
	if ( !targetNodeId || targetNodeId === dragSession.nodeId ) {
		return undefined;
	}

	const rect = rowShell.getBoundingClientRect();
	const before = clientY < rect.top + ( rect.height / 2 );
	const parentId = rowShell.dataset.navigatorParent || undefined;
	const slotName = rowShell.dataset.navigatorSlot || undefined;
	const baseIndex = Number( rowShell.dataset.navigatorIndex ?? 0 );

	return {
		documentId: state.activeDocumentId,
		parentId,
		slot: slotName,
		index: Math.max( 0, baseIndex + ( before ? 0 : 1 ) ),
		placement: before ? 'before' : 'after',
		targetNodeId,
		rect: {
			top: rect.top,
			left: rect.left,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height,
		},
	};
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

export function resolveEditorDragLocation(
	state: BuilderEngineState,
	clientX: number,
	clientY: number,
	frame: HTMLElement | null | undefined,
	coarseDropTarget?: DropTarget,
): { pointer: BuilderTransientDragPointer; dropTarget?: DropTarget } {
	const pointer = resolvePreviewPointerFromClientPoint( clientX, clientY, frame );
	const resolvedDropTarget = pointer.inside
		? resolveCanvasDropTarget( state, {
			x: pointer.clientX ?? clientX,
			y: pointer.clientY ?? clientY,
		} )
		: resolveNavigatorDropTargetFromPoint( state, clientX, clientY );
	return {
		pointer,
		dropTarget: resolvedDropTarget ?? coarseDropTarget,
	};
}
