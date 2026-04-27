<script lang="ts">
	import type { SvelteVirtualizer } from '@tanstack/svelte-virtual';

	import type { NavigatorSlotRow } from '../navigator-model';
	import { formatNavigatorSlotLabel } from '../navigator-model';

	export let row: NavigatorSlotRow;
	export let virtualizer: SvelteVirtualizer<HTMLElement, HTMLLIElement> | undefined = undefined;
	export let style = '';

	let rowElement: HTMLLIElement | null = null;
	let slotLabel = '';

	$: slotLabel = formatNavigatorSlotLabel( row.slot );

	function measureRow( element: HTMLLIElement ) {
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
</script>

<li
	bind:this={rowElement}
	class="navigator__item navigator__slot"
	style={style}
	style:--depth={row.depth}
	data-index={row.rowIndex}
	use:measureRow
	onmouseenter={scheduleMeasureRow}
	onmouseleave={scheduleMeasureRow}
	onfocusin={scheduleMeasureRow}
	onfocusout={scheduleMeasureRow}
>
	<div class="navigator__slot-header">
		<div class="navigator__slot-label">{slotLabel}</div>
	</div>

	<slot />
</li>

<style>
	.navigator__item {
		position: relative;
		display: grid;
		gap: 0.15rem;
		padding-left: calc( (var(--depth) - 1) * 0.8rem );
		border-bottom: 1px solid rgba(191, 202, 219, 0.36);
	}

	.navigator__item:last-child {
		border-bottom-color: transparent;
	}

	.navigator__item::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: -0.25rem;
		left: calc( (var(--depth) - 1) * 0.8rem + 0.26rem );
		width: 1px;
		background: linear-gradient(180deg, rgba(191, 202, 219, 0.72), rgba(191, 202, 219, 0));
		pointer-events: none;
	}

	.navigator__slot {
		padding-block-start: 0.18rem;
	}

	.navigator__slot-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
		padding-left: 14px;
	}

	.navigator__slot-label {
		font-size: 9px;
		line-height: 1;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--builder-shell-text-muted);
	}
</style>
