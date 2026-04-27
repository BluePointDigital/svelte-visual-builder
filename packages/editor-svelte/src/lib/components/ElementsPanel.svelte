<script lang="ts">
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';
	import ElementsPanelTile from './ElementsPanelTile.svelte';
	import type { PanelTabItem, PanelTileGroup, PanelTileItem } from './panel-types';

	export let title = 'Elements';
	export let subtitle = 'Browse elements, search, and add them to the canvas.';
	export let showHeader = true;
	export let searchValue = '';
	export let searchPlaceholder = 'Search elements';
	export let categories: PanelTabItem[] = [];
	export let activeCategory = '';
	export let groups: PanelTileGroup[] = [];
	export let documentId = '';
	export let useDnd = false;
	export let emptyTitle = 'No matching elements';
	export let emptyMessage = 'Try a different search or category.';
	export let onSearch: ( value: string ) => void = () => {};
	export let onSelectCategory: ( categoryId: string ) => void = () => {};
	export let onTilePointerDown: ( group: PanelTileGroup, tile: PanelTileItem, event: PointerEvent ) => void = () => {};
	export let onTileDragStart: ( group: PanelTileGroup, tile: PanelTileItem, event: DragEvent ) => void = () => {};
	export let onTileClick: ( group: PanelTileGroup, tile: PanelTileItem, event: MouseEvent ) => void = () => {};
	export let onTileDoubleClick: ( group: PanelTileGroup, tile: PanelTileItem, event: MouseEvent ) => void = () => {};
	export let onGroupAction: ( group: PanelTileGroup ) => void = () => {};

	$: normalizedGroups = groups.filter( ( group ) => group.items.length > 0 );

	function selectCategory( categoryId: string, disabled = false ) {
		if ( disabled || categoryId === activeCategory ) {
			return;
		}

		onSelectCategory( categoryId );
	}

	function handleSearch( event: Event ) {
		onSearch( ( event.currentTarget as HTMLInputElement ).value );
	}

	function beginDrag( group: PanelTileGroup, tile: PanelTileItem, event: DragEvent ) {
		if ( event.dataTransfer ) {
			event.dataTransfer.effectAllowed = tile.draggable === false ? 'none' : 'copyMove';
			event.dataTransfer.setData( 'text/plain', tile.id );
			event.dataTransfer.setData(
				'application/x-builder-element',
				JSON.stringify( {
					groupId: group.id,
					tileId: tile.id,
					label: tile.label,
				} )
			);
		}

		onTileDragStart( group, tile, event );
	}

	function getTileTone( tile: PanelTileItem ) {
		return tile.tone ? `builder-shell-badge--${tile.tone}` : 'builder-shell-badge--neutral';
	}

	function getTileKey( tile: PanelTileItem ) {
		return `${ tile.id } ${ tile.label } ${ tile.description ?? '' }`.toLowerCase();
	}

	function getCategoryIcon( category: PanelTabItem ) {
		const key = `${ category.id } ${ category.label }`.toLowerCase();

		if ( key.includes( 'all' ) ) {
			return 'elements';
		}

		if ( key.includes( 'content' ) || key.includes( 'text' ) ) {
			return 'editor';
		}

		if ( key.includes( 'layout' ) || key.includes( 'structure' ) || key.includes( 'container' ) ) {
			return 'navigator';
		}

		if ( key.includes( 'media' ) || key.includes( 'image' ) || key.includes( 'gallery' ) ) {
			return 'preview';
		}

		if ( key.includes( 'interactive' ) ) {
			return 'component';
		}

		if ( key.includes( 'data' ) ) {
			return 'assignment';
		}

		if ( key.includes( 'form' ) ) {
			return 'settings';
		}

		if ( key.includes( 'legacy' ) ) {
			return 'help';
		}

		if ( key.includes( 'global' ) ) {
			return 'globals';
		}

		if ( key.includes( 'history' ) ) {
			return 'history';
		}

		if ( key.includes( 'component' ) ) {
			return 'component';
		}

		return 'elements';
	}

	function getGroupIcon( group: PanelTileGroup ) {
		const key = `${ group.id } ${ group.label } ${ group.description ?? '' }`.toLowerCase();

		if ( key.includes( 'layout' ) || key.includes( 'structure' ) || key.includes( 'container' ) ) {
			return 'navigator';
		}

		if ( key.includes( 'media' ) || key.includes( 'image' ) || key.includes( 'gallery' ) ) {
			return 'preview';
		}

		if ( key.includes( 'interactive' ) ) {
			return 'component';
		}

		if ( key.includes( 'data' ) || key.includes( 'loop' ) ) {
			return 'assignment';
		}

		if ( key.includes( 'form' ) ) {
			return 'settings';
		}

		if ( key.includes( 'legacy' ) || key.includes( 'compat' ) ) {
			return 'help';
		}

		if ( key.includes( 'component' ) ) {
			return 'component';
		}

		if ( key.includes( 'document' ) || key.includes( 'page' ) ) {
			return 'document-browser';
		}

		return 'elements';
	}

	function getTileIcon( tile: PanelTileItem ) {
		const key = getTileKey( tile );

		if ( key.includes( 'heading' ) || key.includes( 'paragraph' ) || key.includes( 'text editor' ) || key.includes( 'text-editor' ) || key.includes( 'blockquote' ) ) {
			return 'editor';
		}

		if ( key.includes( 'list' ) ) {
			return 'editor';
		}

		if ( key.includes( 'icon box' ) || key.includes( 'icon-box' ) ) {
			return 'component';
		}

		if ( key.includes( 'spacer' ) ) {
			return 'block';
		}

		if ( key.includes( 'divider' ) ) {
			return 'align-justify';
		}

		if ( key.includes( 'popup-root' ) || key.includes( 'popup ' ) || key.endsWith( ' popup' ) || key.includes( 'popup' ) ) {
			return 'preview';
		}

		if ( key.includes( 'loop' ) ) {
			return 'assignment';
		}

		if ( key.includes( 'social' ) ) {
			return 'menu';
		}

		if ( key.includes( 'button' ) || key.includes( 'cta' ) || key.includes( 'call to action' ) ) {
			return 'preview';
		}

		if ( key.includes( 'image' ) || key.includes( 'gallery' ) || key.includes( 'video' ) || key.includes( 'svg' ) || key.includes( 'icon' ) ) {
			return 'preview';
		}

		if ( key.includes( 'tabs' ) || key.includes( 'accordion' ) || key.includes( 'toggle' ) || key.includes( 'menu' ) || key.includes( 'social' ) ) {
			return 'menu';
		}

		if ( key.includes( 'form' ) || key.includes( 'input' ) || key.includes( 'textarea' ) || key.includes( 'checkbox' ) || key.includes( 'submit' ) ) {
			return 'settings';
		}

		if ( key.includes( 'container' ) || key.includes( 'grid' ) || key.includes( 'section' ) || key.includes( 'column' ) || key.includes( 'spacer' ) ) {
			return 'navigator';
		}

		if ( key.includes( 'component' ) ) {
			return 'component';
		}

		if ( key.includes( 'assignment' ) ) {
			return 'assignment';
		}

		return 'elements';
	}
</script>

<EditorShellTokens>
	<section class="elements-panel">
		{#if showHeader}
			<div class="elements-panel__header">
				<div class="elements-panel__heading">
					<span class="builder-shell-icon-badge elements-panel__header-icon">
						<EditorShellIcon name="elements" title="Elements browser" />
					</span>
					<div class="elements-panel__heading-copy">
						<h2>{title}</h2>
						<p>{subtitle}</p>
					</div>
				</div>
				<slot name="header-actions" />
			</div>
		{/if}

		<label class="builder-shell-field elements-panel__search">
			<span class="sr-only">{searchPlaceholder}</span>
			<div class="elements-panel__search-input">
				<EditorShellIcon name="search" title={searchPlaceholder} />
				<input
					class="builder-shell-input"
					value={searchValue}
					placeholder={searchPlaceholder}
					oninput={handleSearch}
				/>
			</div>
		</label>

		{#if categories.length}
			<div class="elements-panel__categories">
				{#each categories as category (category.id)}
					<button
						type="button"
						class:active={category.id === activeCategory}
						class="elements-panel__category builder-shell-button"
						disabled={category.disabled}
						title={category.title ?? category.label}
						onclick={() => selectCategory( category.id, category.disabled )}
					>
						<span class="elements-panel__category-icon">
							<EditorShellIcon name={getCategoryIcon( category )} title={category.label} />
						</span>
						<span>{category.label}</span>
						{#if category.dirty}
							<i aria-hidden="true" class="elements-panel__dot"></i>
						{/if}
						{#if category.badge !== undefined}
							<em>{category.badge}</em>
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		<div class="elements-panel__groups">
			{#if normalizedGroups.length}
				{#each normalizedGroups as group (group.id)}
					<section class="elements-panel__group">
						<header class="elements-panel__group-header">
							<div class="elements-panel__group-title">
								<span class="elements-panel__group-icon">
									<EditorShellIcon name={getGroupIcon( group )} title={group.label} />
								</span>
								<div class="elements-panel__group-copy">
									<h3>{group.label}</h3>
								{#if group.description}
									<p>{group.description}</p>
								{/if}
								</div>
							</div>
							<div class="elements-panel__group-actions">
								{#if group.badge !== undefined}
									<span class="builder-shell-badge builder-shell-badge--neutral">{group.badge}</span>
								{/if}
								{#if group.actionLabel}
									<button type="button" class="builder-shell-button builder-shell-button--ghost" onclick={() => onGroupAction( group )}>
										{group.actionLabel}
									</button>
								{/if}
							</div>
						</header>

						<div class="elements-panel__tiles">
							{#each group.items as tile (tile.id)}
								<ElementsPanelTile
									{group}
									{tile}
									{documentId}
									{useDnd}
									icon={getTileIcon( tile )}
									toneClass={getTileTone( tile )}
									onLegacyPointerDown={onTilePointerDown}
									onLegacyDragStart={beginDrag}
									onClick={onTileClick}
									onDoubleClick={onTileDoubleClick}
								/>
							{/each}
						</div>
					</section>
				{/each}
			{:else}
				<div class="elements-panel__empty builder-shell-card builder-shell-card--subtle">
					<h3>{emptyTitle}</h3>
					<p>{emptyMessage}</p>
					<slot name="empty" />
				</div>
			{/if}
		</div>

		<slot name="footer" />
	</section>
</EditorShellTokens>

<style>
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.elements-panel {
		display: grid;
		gap: 12px;
		inline-size: 100%;
		min-inline-size: 0;
		overflow-x: clip;
		padding: 0 0 12px;
		background: var(--builder-shell-gray-800);
		color: var(--builder-shell-toolbar-text);
	}

	.elements-panel__header + .elements-panel__search {
		margin-top: -2px;
	}

	.elements-panel__header,
	.elements-panel__heading,
	.elements-panel__group-header,
	.elements-panel__group-actions,
	.elements-panel__group-title {
		display: flex;
		gap: var(--builder-shell-space-12);
		align-items: start;
		inline-size: 100%;
		min-inline-size: 0;
	}

	.elements-panel__header,
	.elements-panel__group-header {
		justify-content: space-between;
	}

	.elements-panel__heading {
		flex: 1;
		min-inline-size: 0;
	}

	.elements-panel__header-icon {
		inline-size: 30px;
		block-size: 30px;
	}

	.elements-panel__header h2,
	.elements-panel__header p,
	.elements-panel__group h3,
	.elements-panel__group p,
	.elements-panel__empty h3,
	.elements-panel__empty p {
		margin: 0;
		min-inline-size: 0;
	}

	.elements-panel__header p,
	.elements-panel__group p,
	.elements-panel__empty p {
		color: var(--builder-shell-toolbar-text-muted);
	}

	.elements-panel__group p {
		display: none;
	}

	.elements-panel__header h2 {
		font-size: 14px;
		font-weight: 600;
		line-height: 1.2;
		color: var(--builder-shell-toolbar-text);
	}

	.elements-panel__header p {
		font-size: 10px;
		line-height: 1.3;
	}

	.elements-panel__search-input {
		display: flex;
		align-items: center;
		gap: var(--builder-shell-space-8);
		min-block-size: 36px;
		padding-inline: 9px;
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		border-radius: 3px;
		background: rgba( 255, 255, 255, 0.03 );
		box-shadow: none;
		color: var(--builder-shell-toolbar-text);
	}

	.elements-panel__search-input :global(.builder-shell-input) {
		border: 0;
		padding-inline: 0;
		background: transparent;
		color: inherit;
	}

	.elements-panel__categories {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding-bottom: 2px;
	}

	.elements-panel__category {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 30px;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		background: rgba( 255, 255, 255, 0.04 );
		color: var(--builder-shell-toolbar-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-inline-size: 100%;
	}

	.elements-panel__category.active {
		border-color: rgba( 255, 255, 255, 0.1 );
		background: rgba( 255, 255, 255, 0.08 );
		color: var(--builder-shell-toolbar-text);
		box-shadow: inset 0 -2px 0 var(--builder-shell-accent), inset 0 1px 0 rgba( 255, 255, 255, 0.04 );
	}

	.elements-panel__category-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 14px;
		block-size: 14px;
		flex-shrink: 0;
		color: currentColor;
	}

	.elements-panel__category em {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 18px;
		block-size: 18px;
		padding: 0 0.35rem;
		border-radius: 999px;
		background: rgba( 255, 255, 255, 0.08 );
		font-style: normal;
		font-size: 10px;
		flex-shrink: 0;
	}

	.elements-panel__category .elements-panel__dot {
		inline-size: 6px;
		block-size: 6px;
		border-radius: 999px;
		background: var(--builder-shell-accent);
	}

	.elements-panel__groups {
		display: grid;
		gap: 8px;
		min-inline-size: 0;
		overflow-x: clip;
	}

	.elements-panel__group {
		display: grid;
		gap: 8px;
		inline-size: 100%;
		padding: 10px 0 0;
		border: 0;
		border-top: 1px solid rgba( 255, 255, 255, 0.08 );
		border-radius: 0;
		background: transparent;
		min-inline-size: 0;
	}

	.elements-panel__group:first-child {
		padding-top: 0;
		border-top: 0;
	}

	.elements-panel__group-actions {
		align-items: center;
		flex-shrink: 0;
	}

	.elements-panel__group-header {
		flex-wrap: wrap;
	}

	.elements-panel__group-title {
		align-items: center;
		min-inline-size: 0;
		flex: 1;
	}

	.elements-panel__group-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 16px;
		block-size: 16px;
		flex-shrink: 0;
		color: var(--builder-shell-toolbar-text-muted);
	}

	.elements-panel__group-copy {
		display: grid;
		gap: 0.1rem;
		min-inline-size: 0;
	}

	.elements-panel__group-header h3 {
		font-size: 10px;
		font-weight: 700;
		color: var(--builder-shell-toolbar-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.elements-panel__tiles {
		display: grid;
		grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
		gap: 10px;
		min-inline-size: 0;
	}

	.elements-panel__empty {
		display: grid;
		gap: var(--builder-shell-space-8);
		padding: var(--builder-shell-space-12);
		border: 1px dashed rgba( 255, 255, 255, 0.16 );
		border-radius: 4px;
		background: rgba( 255, 255, 255, 0.03 );
	}

	@media (max-width: 900px) {
		.elements-panel__header,
		.elements-panel__heading,
		.elements-panel__group-header {
			flex-direction: column;
		}

		.elements-panel__tiles {
			grid-template-columns: minmax( 0, 1fr );
		}
	}
</style>
