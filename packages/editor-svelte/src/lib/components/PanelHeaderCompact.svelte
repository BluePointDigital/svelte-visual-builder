<script lang="ts">
	export let title = '';
	export let subtitle = '';
	export let titleSuffix = '';
	export let showLeading = true;
	export let showTrailing = false;
	export let leadingLabel = 'Menu';
	export let trailingLabel = 'Add';
	export let leadingIcon = '=';
	export let trailingIcon = '+';
	export let dense = true;
	export let centered = true;
	export let onLeadingClick: () => void = () => {};
	export let onTrailingClick: () => void = () => {};
</script>

<header class:centered class:dense class="builder-panel-header-compact">
	<div class="builder-panel-header-compact__edge">
		{#if showLeading}
			<button type="button" class="builder-panel-header-compact__icon-button" aria-label={leadingLabel} title={leadingLabel} onclick={onLeadingClick}>
				<slot name="leading-icon">
					<span aria-hidden="true">{leadingIcon}</span>
				</slot>
			</button>
		{:else}
			<div class="builder-panel-header-compact__spacer"></div>
		{/if}
	</div>

	<div class="builder-panel-header-compact__title">
		<slot name="title-prefix" />
		<div class="builder-panel-header-compact__copy">
			<strong>{title}</strong>
			{#if subtitle}
				<small>{subtitle}</small>
			{/if}
		</div>
		{#if titleSuffix}
			<span class="builder-panel-header-compact__suffix">{titleSuffix}</span>
		{/if}
		<slot name="title-suffix" />
	</div>

	<div class="builder-panel-header-compact__edge builder-panel-header-compact__edge--end">
		<slot name="actions" />
		{#if showTrailing}
			<button type="button" class="builder-panel-header-compact__icon-button" aria-label={trailingLabel} title={trailingLabel} onclick={onTrailingClick}>
				<slot name="trailing-icon">
					<span aria-hidden="true">{trailingIcon}</span>
				</slot>
			</button>
		{:else}
			<div class="builder-panel-header-compact__spacer"></div>
		{/if}
	</div>
</header>

<style>
	.builder-panel-header-compact {
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr) 36px;
		align-items: center;
		min-block-size: 48px;
		padding-inline: 4px;
		background: var(--builder-shell-toolbar-bg);
		color: var(--builder-shell-toolbar-text);
		border-block-end: 1px solid var(--builder-shell-border-dark);
	}

	.builder-panel-header-compact.dense {
		min-block-size: 48px;
	}

	.builder-panel-header-compact__edge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 36px;
		block-size: 100%;
	}

	.builder-panel-header-compact__edge--end {
		justify-content: flex-end;
	}

	.builder-panel-header-compact__title {
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.35rem;
		min-inline-size: 0;
		padding-inline: 0.35rem;
	}

	.builder-panel-header-compact.centered .builder-panel-header-compact__title {
		justify-content: center;
	}

	.builder-panel-header-compact:not(.centered) .builder-panel-header-compact__title {
		justify-content: flex-start;
	}

	.builder-panel-header-compact__copy {
		display: grid;
		gap: 0.15rem;
		min-inline-size: 0;
		text-align: left;
	}

	.builder-panel-header-compact:not(.centered) .builder-panel-header-compact__copy {
		text-align: left;
	}

	.builder-panel-header-compact__copy strong,
	.builder-panel-header-compact__copy small {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
	}

	.builder-panel-header-compact__copy strong {
		font-size: 12px;
		font-weight: 600;
		line-height: 1.1;
	}

	.builder-panel-header-compact__copy small,
	.builder-panel-header-compact__suffix {
		font-size: 10px;
		color: var(--builder-shell-toolbar-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.builder-panel-header-compact__icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 36px;
		block-size: 48px;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 15px;
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.builder-panel-header-compact__icon-button:hover {
		color: var(--builder-shell-toolbar-text);
		background: rgba(255, 255, 255, 0.06);
	}

	.builder-panel-header-compact__spacer {
		inline-size: 36px;
		block-size: 48px;
	}
</style>
