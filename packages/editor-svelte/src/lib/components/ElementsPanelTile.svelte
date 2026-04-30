<script lang="ts">
	import { createDraggable } from '@dnd-kit/svelte';

	import { createBuilderDndData } from '../drag-drop';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import type { PanelTileGroup, PanelTileItem } from './panel-types';

	export let group: PanelTileGroup;
	export let tile: PanelTileItem;
	export let documentId = '';
	export let useDnd = false;
	export let icon = 'elements';
	export let toneClass = 'builder-shell-badge--neutral';
	export let onLegacyPointerDown: ( group: PanelTileGroup, tile: PanelTileItem, event: PointerEvent ) => void = () => {};
	export let onLegacyDragStart: ( group: PanelTileGroup, tile: PanelTileItem, event: DragEvent ) => void = () => {};
	export let onClick: ( group: PanelTileGroup, tile: PanelTileItem, event: MouseEvent ) => void = () => {};
	export let onDoubleClick: ( group: PanelTileGroup, tile: PanelTileItem, event: MouseEvent ) => void = () => {};

	const draggable = createDraggable( {
		get id() {
			return `palette:${ tile.id }`;
		},
		get disabled() {
			return !useDnd || tile.draggable === false || Boolean( tile.disabled );
		},
		get data() {
			return createBuilderDndData( tile.label, {
				kind: 'palette-item',
				elementType: tile.id,
				documentId,
			} );
		},
	} );

	function handleDragStart( event: DragEvent ) {
		if ( useDnd ) {
			event.preventDefault();
			return;
		}

		onLegacyDragStart( group, tile, event );
	}

	function handlePointerDown( event: PointerEvent ) {
		if ( useDnd ) {
			const button = event.currentTarget;
			if ( button instanceof HTMLButtonElement ) {
				button.focus();
			}
			return;
		}

		onLegacyPointerDown( group, tile, event );
	}
</script>

<button
	type="button"
	class="elements-panel__tile"
	class:armed={draggable.isDragSource && !draggable.isDragging}
	class:dragging={draggable.isDragging}
	disabled={tile.disabled}
	draggable={!useDnd && tile.draggable !== false}
	title={tile.title ?? tile.description ?? tile.label}
	{@attach useDnd ? draggable.attach : undefined}
	onpointerdown={handlePointerDown}
	ondragstart={handleDragStart}
	onclick={( event ) => onClick( group, tile, event )}
	ondblclick={( event ) => onDoubleClick( group, tile, event )}
>
	<div class="elements-panel__tile-icon">
		<EditorShellIcon name={icon} title={tile.label} />
	</div>
	<div class="elements-panel__tile-copy">
		<div class="elements-panel__tile-title">
			<strong>{tile.label}</strong>
			{#if tile.shortcut}
				<small>{tile.shortcut}</small>
			{/if}
		</div>
		{#if tile.description}
			<p>{tile.description}</p>
		{/if}
	</div>
	{#if tile.badge !== undefined}
		<em class={`builder-shell-badge ${ toneClass }`}>{tile.badge}</em>
	{/if}
</button>

<style>
	.elements-panel__tile,
	.elements-panel__tile-copy,
	.elements-panel__tile-title {
		display: flex;
		gap: var(--builder-shell-space-12);
		align-items: start;
		inline-size: 100%;
		min-inline-size: 0;
	}

	.elements-panel__tile {
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		min-height: 86px;
		padding: 12px 10px;
		text-align: center;
		border: 1px solid rgba( 255, 255, 255, 0.12 );
		border-radius: 4px;
		background: rgba( 255, 255, 255, 0.02 );
		box-shadow: none;
		min-inline-size: 0;
		overflow: hidden;
		color: inherit;
		cursor: pointer;
		touch-action: none;
		user-select: none;
	}

	.elements-panel__tile.armed,
	.elements-panel__tile.dragging {
		border-color: rgba( 208, 4, 212, 0.55 );
		background: rgba( 208, 4, 212, 0.1 );
		box-shadow: inset 0 0 0 1px rgba( 208, 4, 212, 0.14 );
	}

	.elements-panel__tile:hover:not(:disabled) {
		border-color: rgba( 255, 255, 255, 0.2 );
		background: rgba( 255, 255, 255, 0.06 );
		box-shadow: inset 0 0 0 1px rgba( 255, 255, 255, 0.02 );
	}

	.elements-panel__tile:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.elements-panel__tile-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 30px;
		block-size: 30px;
		border-radius: 4px;
		background: transparent;
		color: var(--builder-shell-toolbar-text);
		flex-shrink: 0;
	}

	.elements-panel__tile-icon :global(svg) {
		display: block;
		inline-size: 19px;
		block-size: 19px;
	}

	.elements-panel__tile-copy {
		flex-direction: column;
		gap: 2px;
		flex: 1;
		align-items: center;
	}

	.elements-panel__tile-title {
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
	}

	.elements-panel__tile-title strong,
	.elements-panel__tile p {
		margin: 0;
		min-inline-size: 0;
	}

	.elements-panel__tile-title strong {
		font-size: 11px;
		font-weight: 600;
		line-height: 1.15;
		color: var(--builder-shell-toolbar-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: normal;
		text-wrap: balance;
		text-align: center;
	}

	.elements-panel__tile-title small,
	.elements-panel__tile p {
		font-size: 10px;
		line-height: 1.2;
		color: var(--builder-shell-toolbar-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.elements-panel__tile-title small {
		flex-shrink: 0;
		display: inline-flex;
	}

	.elements-panel__tile p {
		display: none;
	}

	.elements-panel__tile em {
		align-self: center;
		font-style: normal;
		flex-shrink: 0;
	}

	@media (max-width: 900px) {
		.elements-panel__tile {
			align-items: flex-start;
		}

		.elements-panel__tile-title {
			align-items: flex-start;
		}
	}
</style>
