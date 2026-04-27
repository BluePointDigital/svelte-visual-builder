import type { DropTarget } from '@builder/core';

export interface BuilderTransientDragPointer {
	x: number;
	y: number;
	inside: boolean;
	clientX?: number;
	clientY?: number;
}

export interface BuilderTransientDragState {
	pointer?: BuilderTransientDragPointer;
	dropTarget?: DropTarget;
	version: number;
}

export const EMPTY_TRANSIENT_DRAG_STATE: BuilderTransientDragState = {
	version: 0,
};

export function areDropTargetsEqual( left: DropTarget | undefined, right: DropTarget | undefined ) {
	if ( left === right ) {
		return true;
	}

	if ( !left || !right ) {
		return false;
	}

	return left.documentId === right.documentId
		&& left.parentId === right.parentId
		&& left.slot === right.slot
		&& left.index === right.index
		&& left.placement === right.placement
		&& left.targetNodeId === right.targetNodeId
		&& left.rect.left === right.rect.left
		&& left.rect.top === right.rect.top
		&& left.rect.width === right.rect.width
		&& left.rect.height === right.rect.height;
}

export function areTransientPointersEqual(
	left: BuilderTransientDragPointer | undefined,
	right: BuilderTransientDragPointer | undefined,
) {
	if ( left === right ) {
		return true;
	}

	if ( !left || !right ) {
		return false;
	}

	return left.x === right.x
		&& left.y === right.y
		&& left.inside === right.inside
		&& left.clientX === right.clientX
		&& left.clientY === right.clientY;
}

export function areTransientDragStatesEqual(
	left: BuilderTransientDragState,
	right: BuilderTransientDragState,
) {
	return areTransientPointersEqual( left.pointer, right.pointer )
		&& areDropTargetsEqual( left.dropTarget, right.dropTarget );
}
