<script lang="ts">
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';
	import PanelHeaderCompact from './PanelHeaderCompact.svelte';
	import PanelShell from './PanelShell.svelte';

	export let title = 'History';
	export let subtitle = 'Revision workflow, autosave checkpoints, and restore actions.';
	export let documentTitle = '';
	export let saveState = '';
	export let saveStateTone: 'default' | 'accent' | 'success' | 'warning' | 'danger' = 'default';
	export let panelOpen = false;
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
	export let onTogglePanel: ( open?: boolean ) => void = () => {};
</script>

<EditorShellTokens>
	<PanelShell {surface} {width} {bodyPadding} {bodyGap} {bodyScrollable}>
			<svelte:fragment slot="header">
			<PanelHeaderCompact title={title} subtitle={subtitle} leadingIcon="history" leadingLabel="History" showLeading={false}>
				<svelte:fragment slot="actions">
					{#if saveState}
						<span class={`builder-shell-badge builder-shell-badge--${saveStateTone}`}>{saveState}</span>
					{/if}
					{#if documentTitle}
						<span class="builder-shell-badge builder-shell-badge--neutral">{documentTitle}</span>
					{/if}
					<button type="button" class="builder-shell-button builder-shell-button--ghost" onclick={() => onTogglePanel( !panelOpen )}>
						{panelOpen ? 'Hide History' : 'Show History'}
					</button>
					<slot name="header-actions" />
				</svelte:fragment>
			</PanelHeaderCompact>
		</svelte:fragment>

		<section class="history-panel-shell">
			<div class="history-panel-shell__summary builder-shell-card builder-shell-card--subtle">
				<div class="history-panel-shell__summary-heading">
					<span class="builder-shell-icon-badge">
						<EditorShellIcon name="history" title="History" />
					</span>
					<div>
						<h2>{documentTitle || title}</h2>
						<p>{subtitle}</p>
					</div>
				</div>
				<div class="history-panel-shell__status">
					<slot name="summary" />
				</div>
			</div>

			<div class="history-panel-shell__body">
				<slot />
			</div>
		</section>

		<svelte:fragment slot="footer">
			<slot name="footer" />
		</svelte:fragment>
	</PanelShell>
</EditorShellTokens>

<style>
	.history-panel-shell {
		display: grid;
		gap: var(--builder-shell-space-16);
	}

	.history-panel-shell__summary {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.history-panel-shell__summary-heading {
		display: flex;
		gap: var(--builder-shell-space-12);
		align-items: start;
	}

	.history-panel-shell__summary h2,
	.history-panel-shell__summary p {
		margin: 0;
	}

	.history-panel-shell__summary p {
		color: var(--builder-shell-text-muted);
	}

	.history-panel-shell__body {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	.history-panel-shell__status {
		display: grid;
		gap: var(--builder-shell-space-8);
	}

	@media (max-width: 900px) {
		.history-panel-shell__summary-heading {
			flex-direction: column;
		}
	}
</style>
