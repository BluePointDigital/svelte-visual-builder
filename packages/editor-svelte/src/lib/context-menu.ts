import type { BuilderContextMenuAnchor, BuilderEngineState, BuilderNodeLocation } from '@builder/core';
import { getActiveDocument, getNodeById, getNodeLocation } from '@builder/core';
import type { BuilderNode } from '@builder/schema';
import type { BuilderRegistry } from '@builder/plugin-api';

export type BuilderContextMenuActionTone = 'default' | 'danger';

export interface BuilderContextMenuAction {
	id:
		| 'edit'
		| 'copy'
		| 'paste'
		| 'paste-style'
		| 'duplicate'
		| 'delete'
		| 'add-child'
		| 'add-container'
		| 'add-heading'
		| 'add-button'
		| 'open-master';
	label: string;
	tone?: BuilderContextMenuActionTone;
	disabled?: boolean;
}

export interface BuilderContextMenuGroup {
	id: string;
	items: BuilderContextMenuAction[];
}

export interface BuilderContextMenuResolvedTarget {
	node?: BuilderNode;
	location?: BuilderNodeLocation;
	preferredSlot?: string;
	acceptsChildren: boolean;
}

export interface BuilderContextMenuAnchorReference {
	getBoundingClientRect: () => DOMRect;
}

export function createContextMenuAnchorReference( anchor?: BuilderContextMenuAnchor ): BuilderContextMenuAnchorReference | undefined {
	if ( !anchor ) {
		return undefined;
	}

	const rect = {
		x: anchor.x,
		y: anchor.y,
		width: 1,
		height: 1,
		top: anchor.y,
		left: anchor.x,
		right: anchor.x + 1,
		bottom: anchor.y + 1,
	} as DOMRect;

	return {
		getBoundingClientRect: () => rect,
	};
}

export function resolveBuilderContextMenuGroups(
	state: BuilderEngineState,
	registry: BuilderRegistry,
): BuilderContextMenuGroup[] {
	const menuState = state.ui.contextMenu;
	if ( !menuState.open ) {
		return [];
	}

	if ( menuState.targetKind === 'canvas-root' ) {
		return [
			{
				id: 'insert',
				items: [
					{ id: 'add-container', label: 'Add Container' },
					{ id: 'add-heading', label: 'Add Heading' },
					{ id: 'add-button', label: 'Add Button' },
				],
			},
			{
				id: 'clipboard',
				items: [
					{ id: 'paste', label: 'Paste' },
				],
			},
		];
	}

	const target = resolveContextMenuTarget( state, registry );
	if ( !target.node ) {
		return [];
	}

	const structureItems: BuilderContextMenuAction[] = [];
	if ( target.acceptsChildren ) {
		structureItems.push( { id: 'add-child', label: 'Add Child' } );
	}
	if ( target.node.type === 'component-instance' ) {
		structureItems.push( { id: 'open-master', label: 'Open Master' } );
	}

	return [
		{
			id: 'edit',
			items: [
				{ id: 'edit', label: 'Edit' },
			],
		},
		{
			id: 'clipboard',
			items: [
				{ id: 'copy', label: 'Copy' },
				{ id: 'paste', label: 'Paste' },
				{ id: 'paste-style', label: 'Paste Style', disabled: !state.clipboard?.nodes.length },
				{ id: 'duplicate', label: 'Duplicate' },
			],
		},
		...( structureItems.length
			? [
				{
					id: 'structure',
					items: structureItems,
				},
			]
			: [] ),
		{
			id: 'destructive',
			items: [
				{ id: 'delete', label: 'Delete', tone: 'danger' },
			],
		},
	];
}

export function resolveContextMenuTarget(
	state: BuilderEngineState,
	registry: BuilderRegistry,
): BuilderContextMenuResolvedTarget {
	const targetDocument = state.ui.contextMenu.documentId
		? state.project.documents.find( ( document ) => document.id === state.ui.contextMenu.documentId )
		: undefined;
	const nodeId = state.ui.contextMenu.nodeId;
	if ( !nodeId ) {
		return {
			acceptsChildren: false,
		};
	}

	const document = targetDocument ?? getActiveDocument( state );
	const node = getNodeById( document.root, nodeId );
	const location = getNodeLocation( document.root, nodeId );
	const definition = node ? registry.elements.get( node.type ) : undefined;
	const slotIds = node ? Object.keys( node.slots ) : [];

	return {
		node,
		location,
		preferredSlot: definition?.runtime.acceptsChildren ? undefined : slotIds[ 0 ],
		acceptsChildren: Boolean( definition?.runtime.acceptsChildren || slotIds.length ),
	};
}
