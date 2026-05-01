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
	export let surface: 'light' | 'dark' = 'dark';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
	export let onTogglePanel: ( open?: boolean ) => void = () => {};
</script>

<EditorShellTokens>
	<PanelShell {surface} {width} {bodyPadding} {bodyGap} {bodyScrollable}>
		<svelte:fragment slot="header">
			<PanelHeaderCompact title={title} subtitle={subtitle} leadingIcon="history" leadingLabel="History" showLeading={false} centered={false}>
				<svelte:fragment slot="actions">
					{#if saveState}
						<span class={`builder-shell-badge builder-shell-badge--${saveStateTone} history-panel-shell__header-badge`}>{saveState}</span>
					{/if}
					{#if documentTitle}
						<span class="builder-shell-badge builder-shell-badge--dark history-panel-shell__header-badge">{documentTitle}</span>
					{/if}
					<button type="button" class="builder-shell-button builder-shell-button--dark history-panel-shell__toggle" onclick={() => onTogglePanel( !panelOpen )}>
						{panelOpen ? 'Hide' : 'Show'}
					</button>
					<slot name="header-actions" />
				</svelte:fragment>
			</PanelHeaderCompact>
		</svelte:fragment>

		<section class="history-panel-shell">
			<div class="history-panel-shell__summary">
				<div class="history-panel-shell__summary-heading">
					<span class="builder-shell-icon-badge history-panel-shell__icon">
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
		gap: var(--builder-shell-space-12);
		min-inline-size: 0;
		color: var(--builder-shell-toolbar-text);
	}

	.history-panel-shell__summary {
		display: grid;
		gap: var(--builder-shell-space-10);
		padding: var(--builder-shell-space-12);
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-dark-panel-raised);
	}

	.history-panel-shell__summary-heading {
		display: flex;
		gap: var(--builder-shell-space-10);
		align-items: start;
		min-inline-size: 0;
	}

	.history-panel-shell__summary h2,
	.history-panel-shell__summary p {
		margin: 0;
	}

	.history-panel-shell__summary h2 {
		color: var(--builder-shell-toolbar-text);
		font-size: 13px;
		line-height: 1.2;
	}

	.history-panel-shell__summary p {
		color: var(--builder-shell-toolbar-text-muted);
		font-size: 12px;
		line-height: 1.35;
	}

	.history-panel-shell__body {
		display: grid;
		gap: var(--builder-shell-space-10);
		min-inline-size: 0;
	}

	.history-panel-shell__status {
		display: grid;
		gap: var(--builder-shell-space-8);
		min-inline-size: 0;
	}

	.history-panel-shell__icon {
		border-color: var(--builder-shell-dark-border-strong);
		background: rgba(255, 255, 255, 0.06);
		color: var(--builder-shell-toolbar-text);
	}

	.history-panel-shell__header-badge {
		max-inline-size: 8.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background: rgba(255, 255, 255, 0.08);
		color: var(--builder-shell-toolbar-text-muted);
	}

	.history-panel-shell__header-badge.builder-shell-badge--accent {
		background: rgba(208, 4, 212, 0.18);
		color: var(--builder-shell-pink-200);
	}

	.history-panel-shell__header-badge.builder-shell-badge--success {
		background: rgba(10, 135, 90, 0.22);
		color: #76e0ba;
	}

	.history-panel-shell__header-badge.builder-shell-badge--warning {
		background: rgba(245, 158, 11, 0.18);
		color: #fbbf24;
	}

	.history-panel-shell__header-badge.builder-shell-badge--danger {
		background: rgba(220, 38, 38, 0.18);
		color: #fca5a5;
	}

	.history-panel-shell__toggle {
		min-inline-size: 3.75rem;
	}

	@media (max-width: 900px) {
		.history-panel-shell__summary-heading {
			flex-direction: column;
		}
	}
</style>
