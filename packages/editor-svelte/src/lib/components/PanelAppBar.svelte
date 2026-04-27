<script lang="ts">
	export let title = '';
	export let context = '';
	export let status = '';
	export let compact = false;
	export let showBack = false;
	export let backLabel = 'Back';
	export let actionLabel = '';
	export let actionDisabled = false;
	export let onBack: () => void = () => {};
	export let onAction: () => void = () => {};
</script>

<div class:compact class="builder-panel-appbar">
	<div class="builder-panel-appbar__start">
		{#if showBack}
			<button type="button" class="builder-panel-appbar__ghost" onclick={onBack}>
				<span aria-hidden="true">&lt;</span>
				<span>{backLabel}</span>
			</button>
		{/if}
		<slot name="leading" />
	</div>

	<div class="builder-panel-appbar__copy">
		{#if context}
			<span class="builder-panel-appbar__context">{context}</span>
		{/if}
		{#if title}
			<strong>{title}</strong>
		{/if}
	</div>

	<div class="builder-panel-appbar__end">
		{#if status}
			<span class="builder-panel-appbar__status">{status}</span>
		{/if}
		<slot name="trailing" />
		{#if actionLabel}
			<button type="button" class="builder-panel-appbar__action" disabled={actionDisabled} onclick={onAction}>
				{actionLabel}
			</button>
		{/if}
	</div>
</div>

<style>
	.builder-panel-appbar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		column-gap: 0.75rem;
		min-block-size: 34px;
		padding: 0 0.75rem;
		background: #f3f5f8;
		border-block-end: 1px solid #dde3ea;
		color: #344054;
	}

	.builder-panel-appbar.compact {
		min-block-size: 30px;
		padding-inline: 0.625rem;
	}

	.builder-panel-appbar__start,
	.builder-panel-appbar__end {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-inline-size: 0;
	}

	.builder-panel-appbar__copy {
		display: grid;
		gap: 0.125rem;
		min-inline-size: 0;
	}

	.builder-panel-appbar__copy strong,
	.builder-panel-appbar__context,
	.builder-panel-appbar__status {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.builder-panel-appbar__copy strong {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: #101828;
	}

	.builder-panel-appbar__context,
	.builder-panel-appbar__status {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #667085;
	}

	.builder-panel-appbar__ghost,
	.builder-panel-appbar__action {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		block-size: 24px;
		padding: 0 0.55rem;
		border: 1px solid transparent;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		font-size: 11px;
		font-weight: 600;
	}

	.builder-panel-appbar__ghost:hover,
	.builder-panel-appbar__action:hover:not(:disabled) {
		background: rgba(16, 24, 40, 0.06);
	}

	.builder-panel-appbar__action {
		border-color: #cfd6de;
		background: #ffffff;
		color: #101828;
	}

	.builder-panel-appbar__action:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
