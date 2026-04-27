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
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
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
		gap: var(--builder-shell-space-16);
	}

	.globals-panel-shell__intro {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.globals-panel-shell__intro-heading {
		display: flex;
		gap: var(--builder-shell-space-12);
		align-items: start;
	}

	.globals-panel-shell__intro h2,
	.globals-panel-shell__intro p {
		margin: 0;
	}

	.globals-panel-shell__intro p {
		color: var(--builder-shell-text-muted);
	}

	.globals-panel-shell__body {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	.globals-panel-shell__intro-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--builder-shell-space-8);
	}

	@media (max-width: 900px) {
		.globals-panel-shell__intro-heading {
			flex-direction: column;
		}
	}
</style>
