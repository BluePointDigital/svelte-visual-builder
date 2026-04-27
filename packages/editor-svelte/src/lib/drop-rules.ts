import type { DropTarget } from '@builder/core';
import { getNodeLocation } from '@builder/core';
import type { BuilderNode } from '@builder/schema';

export type BuilderDragDescriptor =
	| {
		kind: 'palette-item';
		elementType: string;
		documentId: string;
	}
	| {
		kind: 'canvas-node' | 'navigator-node';
		nodeId: string;
		documentId: string;
	};

export type BuilderDropIntent =
	| {
		kind: 'root' | 'into-slot' | 'into-container';
		target: DropTarget;
	}
	| {
		kind: 'before-node' | 'after-node';
		target: DropTarget;
		targetNodeId: string;
	};

export interface BuilderDropRuleContext {
	descriptor: BuilderDragDescriptor;
	intent?: BuilderDropIntent;
	documentRoot?: BuilderNode[];
}

export interface BuilderDropRuleResult {
	accepted: boolean;
	reason?: 'self' | 'descendant' | 'missing-target';
}

export function createDropIntent( target?: DropTarget ): BuilderDropIntent | undefined {
	if ( !target ) {
		return undefined;
	}

	switch ( target.placement ) {
		case 'root':
			return { kind: 'root', target };
		case 'into':
			return target.slot
				? { kind: 'into-slot', target }
				: { kind: 'into-container', target };
		case 'before':
			return target.targetNodeId
				? { kind: 'before-node', target, targetNodeId: target.targetNodeId }
				: undefined;
		case 'after':
			return target.targetNodeId
				? { kind: 'after-node', target, targetNodeId: target.targetNodeId }
				: undefined;
		default:
			return undefined;
	}
}

export function createDropRuleContext(
	descriptor: BuilderDragDescriptor,
	intent?: BuilderDropIntent,
	documentRoot?: BuilderNode[],
): BuilderDropRuleContext {
	return {
		descriptor,
		intent,
		documentRoot,
	};
}

export function evaluateDropRule( context: BuilderDropRuleContext ): BuilderDropRuleResult {
	if ( !context.intent ) {
		return {
			accepted: false,
			reason: 'missing-target',
		};
	}

	const sourceNodeId = 'nodeId' in context.descriptor ? context.descriptor.nodeId : undefined;
	if ( !sourceNodeId ) {
		return {
			accepted: true,
		};
	}

	const targetNodeId = resolveIntentTargetNodeId( context.intent );
	if ( targetNodeId && sourceNodeId === targetNodeId ) {
		return {
			accepted: false,
			reason: 'self',
		};
	}

	if ( targetNodeId && context.documentRoot ) {
		const location = getNodeLocation( context.documentRoot, targetNodeId );
		if ( location?.path.includes( sourceNodeId ) ) {
			return {
				accepted: false,
				reason: 'descendant',
			};
		}
	}

	return {
		accepted: true,
	};
}

function resolveIntentTargetNodeId( intent: BuilderDropIntent ): string | undefined {
	switch ( intent.kind ) {
		case 'before-node':
		case 'after-node':
			return intent.targetNodeId;
		default:
			return intent.target.targetNodeId ?? intent.target.parentId;
	}
}
