<script lang="ts">
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';
	import PanelHeaderCompact from './PanelHeaderCompact.svelte';
	import PanelShell from './PanelShell.svelte';

	export let title = 'Page Settings';
	export let subtitle = 'Document-scoped settings, route context, and assignment metadata.';
	export let documentTitle = '';
	export let documentSlug = '';
	export let documentKind = '';
	export let documentStatus = '';
	export let documentMode = '';
	export let routeLabel = '';
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
</script>

<EditorShellTokens>
	<PanelShell {surface} {width} {bodyPadding} {bodyGap} {bodyScrollable}>
		<svelte:fragment slot="header">
			<PanelHeaderCompact title={title} subtitle={subtitle} leadingIcon="page-settings" leadingLabel="Page settings" showLeading={false}>
				<svelte:fragment slot="actions">
					<slot name="header-actions" />
				</svelte:fragment>
			</PanelHeaderCompact>
		</svelte:fragment>

		<section class="page-settings-panel">
			<div class="page-settings-panel__summary builder-shell-card builder-shell-card--subtle">
				<div class="page-settings-panel__summary-heading">
					<span class="builder-shell-icon-badge">
						<EditorShellIcon name="page-settings" title="Page settings" />
					</span>
					<div>
						<h2>{documentTitle || title}</h2>
						<p>{subtitle}</p>
					</div>
				</div>
				<div class="page-settings-panel__meta">
					{#if documentKind}
						<span class="builder-shell-badge builder-shell-badge--neutral">{documentKind}</span>
					{/if}
					{#if documentMode}
						<span class="builder-shell-badge">{documentMode}</span>
					{/if}
					{#if documentStatus}
						<span class="builder-shell-badge builder-shell-badge--dark">{documentStatus}</span>
					{/if}
					{#if documentSlug}
						<small>/{documentSlug}</small>
					{/if}
					{#if routeLabel}
						<small>{routeLabel}</small>
					{/if}
				</div>
			</div>

			<div class="page-settings-panel__body">
				<slot name="summary" />
				<slot />
			</div>
		</section>

		<svelte:fragment slot="footer">
			<slot name="footer" />
		</svelte:fragment>
	</PanelShell>
</EditorShellTokens>

<style>
	.page-settings-panel {
		display: grid;
		gap: var(--builder-shell-space-16);
	}

	.page-settings-panel__summary {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.page-settings-panel__summary-heading,
	.page-settings-panel__meta {
		display: flex;
		gap: var(--builder-shell-space-12);
		align-items: center;
		flex-wrap: wrap;
	}

	.page-settings-panel__summary-heading {
		align-items: start;
	}

	.page-settings-panel__summary h2,
	.page-settings-panel__summary p,
	.page-settings-panel__meta small {
		margin: 0;
	}

	.page-settings-panel__summary p,
	.page-settings-panel__meta small {
		color: var(--builder-shell-text-muted);
	}

	.page-settings-panel__body {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	@media (max-width: 900px) {
		.page-settings-panel__summary-heading {
			flex-direction: column;
		}
	}
</style>
