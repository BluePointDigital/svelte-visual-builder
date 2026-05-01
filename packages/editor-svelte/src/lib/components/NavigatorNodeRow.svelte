<script lang="ts">
	import { createDraggable, createDroppable } from '@dnd-kit/svelte';
	import type { SvelteVirtualizer } from '@tanstack/svelte-virtual';
	import type { DropTarget } from '@builder/core';
	import type { BuilderNode } from '@builder/schema';

	import { createBuilderDndData, createBuilderDroppableData } from '../drag-drop';
	import type { NavigatorNodeRow, NavigatorNodeRowActions } from '../navigator-model';
	import EditorShellIcon from './EditorShellIcon.svelte';
import {
	getNavigatorNodeIndicators,
	getNavigatorNodeLabel,
	getNavigatorNodeSubtitle,
} from '../navigator-model';

	export let row: NavigatorNodeRow;
	export let selectedNodeIds: string[] = [];
	export let actions: NavigatorNodeRowActions;
	export let componentDocumentTitle: string | undefined = undefined;
	export let documentId = '';
	export let virtualizer: SvelteVirtualizer<HTMLElement, HTMLLIElement> | undefined = undefined;
	export let style = '';

	let rowElement: HTMLLIElement | null = null;
	let rowShellElement: HTMLDivElement | null = null;
	let nodeLabel = '';
	let nodeSubtitle = '';
	let nodeIndicators: ReturnType<typeof getNavigatorNodeIndicators> = [];
	let isSelected = false;

	const draggable = createDraggable( {
		get id() {
			return `navigator:${ row.nodeId }`;
		},
		get disabled() {
			return false;
		},
		get data() {
			return createBuilderDndData( nodeLabel || getNavigatorNodeLabel( row.node ), {
				kind: 'navigator-node',
				nodeId: row.nodeId,
				documentId,
			} );
		},
	} );

	const droppable = createDroppable( {
		get id() {
			return `navigator-drop:${ row.nodeId }`;
		},
		get data() {
			return createBuilderDroppableData( createNavigatorDropTarget(), 'container' );
		},
	} );

	$: nodeLabel = getNavigatorNodeLabel( row.node );
	$: nodeSubtitle = getNavigatorNodeSubtitle( row.node, componentDocumentTitle );
	$: nodeIndicators = getNavigatorNodeIndicators( row.node );
	$: isSelected = selectedNodeIds.includes( row.nodeId );

	$: if ( rowElement && virtualizer ) {
		virtualizer.measureElement( rowElement );
	}

	function measureRow( element: HTMLLIElement ) {
		rowElement = element;
		virtualizer?.measureElement( element );

		return {
			update() {
				virtualizer?.measureElement( element );
			},
			destroy() {
				virtualizer?.measureElement( null );
			},
		};
	}

	function scheduleMeasureRow() {
		if ( !rowElement || !virtualizer ) {
			return;
		}

		requestAnimationFrame( () => {
			if ( rowElement ) {
				virtualizer.measureElement( rowElement );
			}
		} );
	}

	function createNavigatorDropTarget(): DropTarget {
		const rect = rowShellElement?.getBoundingClientRect();
		const beforeRect = rect
			? {
				top: rect.top,
				left: rect.left,
				right: rect.right,
				bottom: rect.bottom,
				width: rect.width,
				height: rect.height,
			}
			: {
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				width: 0,
				height: 0,
			};
		return {
			documentId,
			parentId: row.parentId,
			slot: row.slot,
			index: row.index,
			placement: 'before',
			targetNodeId: row.nodeId,
			rect: beforeRect,
		};
	}

	function handleNodeKeydown( event: KeyboardEvent, node: BuilderNode ) {
		if ( event.altKey && !event.shiftKey && event.key === 'ArrowUp' ) {
			event.preventDefault();
			actions.onMove( node, -1 );
			return;
		}

		if ( event.altKey && !event.shiftKey && event.key === 'ArrowDown' ) {
			event.preventDefault();
			actions.onMove( node, 1 );
			return;
		}

		if ( event.altKey && !event.shiftKey && event.key === 'Home' ) {
			event.preventDefault();
			actions.onMoveToBoundary( node, row.siblings, 'start' );
			return;
		}

		if ( event.altKey && !event.shiftKey && event.key === 'End' ) {
			event.preventDefault();
			actions.onMoveToBoundary( node, row.siblings, 'end' );
			return;
		}

		if ( event.altKey && event.shiftKey && event.key === 'ArrowRight' ) {
			event.preventDefault();
			actions.onIndent( node, row.siblings, row.index );
			return;
		}

		if ( event.altKey && event.shiftKey && event.key === 'ArrowLeft' ) {
			event.preventDefault();
			actions.onOutdent( node );
		}
	}
</script>

<li
	bind:this={rowElement}
	class="navigator__item"
	style={style}
	style:--depth={row.depth}
	data-index={row.rowIndex}
	use:measureRow
	onmouseenter={scheduleMeasureRow}
	onmouseleave={scheduleMeasureRow}
	onfocusin={scheduleMeasureRow}
	onfocusout={scheduleMeasureRow}
>
	<div
		bind:this={rowShellElement}
		class="navigator__row-shell"
		data-navigator-node={row.nodeId}
		data-navigator-parent={row.parentId}
		data-navigator-slot={row.slot}
		data-navigator-index={row.index}
		role="group"
		aria-label={`${nodeLabel} structure row`}
		{@attach droppable.attach}
		oncontextmenu={( event ) => actions.onOpenContextMenu( row.node, event, row.slot )}
	>
		<button
			type="button"
			class="navigator__row"
			class:selected={isSelected}
			onclick={() => actions.onSelect( row.nodeId )}
			onkeydown={( event ) => handleNodeKeydown( event, row.node )}
		>
			<span class="navigator__row-main">
				<span class="navigator__row-copy">
					<span class="navigator__row-title">{nodeLabel}</span>
					<span class="navigator__row-subtitle" title={row.node.id}>{nodeSubtitle}</span>
				</span>
			</span>
			<span class="navigator__row-status">
				{#each nodeIndicators as indicator (indicator.label)}
					<span class={`navigator__row-indicator navigator__row-indicator--${indicator.tone ?? 'default'}`}>
						{indicator.label}
					</span>
				{/each}
			</span>
		</button>

		<div class="navigator__actions">
			<button
				type="button"
				class="navigator__row-handle"
				class:armed={draggable.isDragSource && !draggable.isDragging}
				class:dragging={draggable.isDragging}
				aria-label={`Drag ${nodeLabel}`}
				title={`Drag to move ${nodeLabel}`}
				{@attach draggable.attachHandle}
				onpointerdown={( event ) => {
					const handle = event.currentTarget;
					if ( handle instanceof HTMLButtonElement ) {
						handle.focus();
					}
				}}
			>
				<span class="navigator__row-handle-grip" aria-hidden="true"></span>
				<span class="navigator__action-label">Move</span>
			</button>
			<button type="button" aria-label={`Move ${nodeLabel} up`} title="Move up" onclick={() => actions.onMove( row.node, -1 )}>
				<EditorShellIcon name="arrow-up" size={13} />
				<span class="navigator__action-label">Up</span>
			</button>
			<button type="button" aria-label={`Move ${nodeLabel} down`} title="Move down" onclick={() => actions.onMove( row.node, 1 )}>
				<EditorShellIcon name="arrow-down" size={13} />
				<span class="navigator__action-label">Down</span>
			</button>
			<button
				type="button"
				aria-label={`Duplicate ${nodeLabel}`}
				title="Duplicate"
				onclick={() => actions.onDuplicate( row.node, row.parentId, row.slot )}
			>
				<EditorShellIcon name="copy" size={13} />
				<span class="navigator__action-label">Duplicate</span>
			</button>
			<button
				type="button"
				aria-label={`Delete ${nodeLabel}`}
				title="Delete"
				onclick={() => actions.onDelete( row.node )}
			>
				<EditorShellIcon name="trash" size={13} />
				<span class="navigator__action-label">Delete</span>
			</button>
		</div>
	</div>

	{#if componentDocumentTitle}
		<div class="navigator__inline-actions">
			<button type="button" onclick={() => actions.onOpenMaster( row.node )}>Open master</button>
		</div>
	{/if}

	<slot />
</li>

<style>
	.navigator__item {
		position: relative;
		display: grid;
		gap: 0.15rem;
		padding-left: calc( (var(--depth) - 1) * 0.55rem );
		border-bottom: 1px solid rgba(191, 202, 219, 0.28);
	}

	.navigator__item:last-child {
		border-bottom-color: transparent;
	}

	.navigator__item::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: -0.25rem;
		left: calc( (var(--depth) - 1) * 0.55rem + 0.2rem );
		width: 1px;
		background: linear-gradient(180deg, rgba(191, 202, 219, 0.72), rgba(191, 202, 219, 0.12));
		pointer-events: none;
	}

	.navigator__row-shell {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0;
		align-items: center;
		min-width: 0;
	}

	.navigator__row,
	.navigator__inline-actions,
	.navigator__actions {
		display: flex;
		align-items: center;
	}

	.navigator__row {
		position: relative;
		width: 100%;
		min-height: 30px;
		padding: 0 8px 0 9px;
		border: 0;
		border-inline-start: 3px solid transparent;
		border-radius: 0;
		background: transparent;
		color: inherit;
		text-align: left;
		gap: 0.45rem;
		justify-content: space-between;
		overflow: hidden;
	}

	.navigator__row.selected {
		background: linear-gradient(90deg, rgba(250, 232, 255, 0.9), rgba(232, 238, 247, 0.96));
		color: var(--builder-shell-heading);
		border-inline-start-color: var(--builder-shell-accent);
		box-shadow: inset 3px 0 0 var(--builder-shell-accent), 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.navigator__row-main {
		display: flex;
		align-items: center;
		min-width: 0;
		flex: 1;
	}

	.navigator__row-copy {
		display: grid;
		min-width: 0;
	}

	.navigator__row-title,
	.navigator__row-subtitle {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.navigator__row-title {
		font-size: 12px;
		font-weight: 700;
		color: var(--builder-shell-heading);
	}

	.navigator__row-subtitle {
		font-size: 10px;
		color: var(--builder-shell-text-muted);
	}

	.navigator__row-status {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.navigator__row-indicator {
		display: inline-flex;
		align-items: center;
		height: 1.1rem;
		padding: 0 0.35rem;
		border-radius: 999px;
		font-size: 8px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		background: rgba(240, 243, 248, 0.92);
		color: #4f5f7a;
	}

	.navigator__row-indicator--accent {
		background: rgba(243, 186, 253, 0.24);
		color: var(--builder-shell-pink-900);
	}

	.navigator__row-indicator--warning {
		background: rgba(245, 158, 11, 0.16);
		color: #9a5d00;
	}

	.navigator__row-indicator--muted {
		background: rgba(148, 163, 184, 0.16);
		color: #5c6473;
	}

	.navigator__actions,
	.navigator__inline-actions {
		gap: 0.35rem;
	}

	.navigator__actions {
		display: none;
		flex-wrap: nowrap;
		justify-content: flex-end;
		gap: 2px;
		max-width: 120px;
		padding: 0 5px 0 0;
	}

	.navigator__inline-actions {
		display: none;
		justify-content: flex-start;
		flex-wrap: nowrap;
		padding: 0 0.45rem 0.35rem 0.45rem;
		max-width: 100%;
		overflow: hidden;
	}

	.navigator__row-handle,
	.navigator__actions button,
	.navigator__inline-actions button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.34rem 0.55rem;
		border: 1px solid rgba(152, 166, 187, 0.34);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.92);
		color: #2f4059;
		font-size: 0.7rem;
		line-height: 1;
		cursor: pointer;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			box-shadow 140ms ease,
			transform 140ms ease;
	}

	.navigator__row-handle,
	.navigator__actions button {
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border-radius: 6px;
	}

	.navigator__row:focus-visible,
	.navigator__row-handle:focus-visible,
	.navigator__actions button:focus-visible,
	.navigator__inline-actions button:focus-visible {
		outline: none;
		box-shadow: var(--builder-shell-focus-ring);
	}

	.navigator__row-handle {
		border-style: dashed;
	}

	.navigator__action-label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.navigator__row-handle:hover,
	.navigator__actions button:hover,
	.navigator__inline-actions button:hover {
		border-color: rgba(76, 119, 187, 0.38);
		background: rgba(248, 251, 255, 0.98);
	}

	.navigator__row-handle.armed {
		border-color: rgba(76, 119, 187, 0.5);
		box-shadow: 0 0 0 1px rgba(76, 119, 187, 0.25);
	}

	.navigator__row-handle.dragging {
		border-color: rgba(208, 4, 212, 0.5);
		box-shadow: 0 0 0 1px rgba(208, 4, 212, 0.2);
		background: rgba(250, 232, 255, 0.98);
	}

	.navigator__row-handle-grip {
		display: inline-block;
		width: 8px;
		height: 10px;
		border-top: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		opacity: 0.62;
	}

	.navigator__item:hover > .navigator__row-shell .navigator__actions,
	.navigator__item:focus-within > .navigator__row-shell .navigator__actions,
	.navigator__row.selected + .navigator__actions,
	.navigator__item:hover > .navigator__inline-actions,
	.navigator__item:focus-within > .navigator__inline-actions {
		display: flex;
	}

	@media (max-width: 1100px) {
		.navigator__row-shell {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.navigator__actions {
			max-width: 124px;
		}
	}
</style>
