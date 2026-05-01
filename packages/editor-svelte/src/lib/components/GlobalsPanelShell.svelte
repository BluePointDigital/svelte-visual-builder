<script lang="ts">
	import type { PanelTabItem } from './panel-types';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';
	import PanelHeaderCompact from './PanelHeaderCompact.svelte';
	import PanelShell from './PanelShell.svelte';
	import PanelTabSwitcher from './PanelTabSwitcher.svelte';

	export let title = 'Globals';
	export let subtitle = 'Classes, variables, theme styles, and shared design system controls.';
	export let tabs: PanelTabItem[] = [];
	export let activeTab = 'classes';
	export let showTabs = true;
	export let surface: 'light' | 'dark' = 'dark';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-10)';
	export let bodyGap = 'var(--builder-shell-space-10)';
	export let bodyScrollable = true;
	export let onChangeTab: ( tabId: string ) => void = () => {};
</script>

<EditorShellTokens>
	<PanelShell {surface} {width} {bodyPadding} {bodyGap} {bodyScrollable}>
		<svelte:fragment slot="header">
			<PanelHeaderCompact title={title} subtitle={subtitle} leadingIcon="globals" leadingLabel="Globals" showLeading={false}>
				<svelte:fragment slot="actions">
					<slot name="header-actions" />
				</svelte:fragment>
			</PanelHeaderCompact>
		</svelte:fragment>

		<svelte:fragment slot="tabs">
			{#if showTabs && tabs.length}
				<PanelTabSwitcher tabs={tabs} activeTab={activeTab} onChange={onChangeTab} />
			{/if}
		</svelte:fragment>

		<section class="globals-panel-shell">
			<div class="globals-panel-shell__intro builder-shell-card builder-shell-card--subtle">
				<div class="globals-panel-shell__intro-heading">
					<span class="builder-shell-icon-badge">
						<EditorShellIcon name="globals" title="Globals" />
					</span>
					<div>
						<h2>{title}</h2>
						<p>{subtitle}</p>
					</div>
				</div>
				<div class="globals-panel-shell__intro-actions">
					<slot name="summary" />
				</div>
			</div>

			<div class="globals-panel-shell__body">
				<slot />
			</div>
		</section>

		<svelte:fragment slot="footer">
			<slot name="footer" />
		</svelte:fragment>
	</PanelShell>
</EditorShellTokens>

<style>
	.globals-panel-shell {
		display: grid;
		gap: var(--builder-shell-space-10);
		min-inline-size: 0;
		padding-block-end: var(--builder-shell-space-12);
		background: var(--builder-shell-dark-panel);
		color: var(--builder-shell-toolbar-text);
	}

	.globals-panel-shell__intro {
		display: grid;
		gap: var(--builder-shell-space-10);
		padding: var(--builder-shell-space-12);
		border-color: var(--builder-shell-dark-border);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
			var(--builder-shell-dark-panel-raised);
		color: var(--builder-shell-toolbar-text);
	}

	.globals-panel-shell__intro-heading {
		display: flex;
		gap: var(--builder-shell-space-10);
		align-items: start;
		min-inline-size: 0;
	}

	.globals-panel-shell__intro h2,
	.globals-panel-shell__intro p {
		margin: 0;
	}

	.globals-panel-shell__intro p {
		color: var(--builder-shell-toolbar-text-muted);
		font-size: 12px;
		line-height: 1.35;
	}

	.globals-panel-shell__intro h2 {
		color: var(--builder-shell-toolbar-text);
		font-size: 13px;
		line-height: 1.2;
	}

	.globals-panel-shell__body {
		display: grid;
		gap: var(--builder-shell-space-10);
		min-inline-size: 0;
	}

	.globals-panel-shell__intro-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--builder-shell-space-6);
		color: var(--builder-shell-toolbar-text);
	}

	.globals-panel-shell :global(.builder-shell-icon-badge) {
		border-color: var(--builder-shell-dark-border);
		background: rgba(255, 255, 255, 0.055);
		color: var(--builder-shell-toolbar-text);
	}

	.globals-panel-shell :global(.builder-shell-card) {
		border-color: var(--builder-shell-dark-border);
	}

	@media (max-width: 900px) {
		.globals-panel-shell__intro-heading {
			flex-direction: column;
		}
	}
</style>
