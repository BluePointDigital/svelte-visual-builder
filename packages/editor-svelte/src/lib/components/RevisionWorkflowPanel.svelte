<script lang="ts">
	import type { BuilderSaveState, DocumentSession } from '@builder/core';
	import type { BuilderDocument, DocumentRevision } from '@builder/schema';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';

	export let activeDocument: BuilderDocument;
	export let session: DocumentSession | undefined = undefined;
	export let revisions: DocumentRevision[] = [];
	export let saveState: BuilderSaveState = 'saved';
	export let panelOpen = false;
	export let selectedRevisionId: string | undefined = undefined;
	export let canSaveDraft = true;
	export let canPublish = true;
	export let saveDraftDisabledReason = 'Saving drafts is disabled by this host.';
	export let publishDisabledReason = 'Publishing is disabled by this host.';
	export let onSaveDraft: () => void = () => {};
	export let onPublish: () => void = () => {};
	export let onTogglePanel: ( open?: boolean ) => void = () => {};
	export let onSelectRevision: ( revisionId?: string ) => void = () => {};
	export let onRestoreRevision: ( revisionId: string ) => Promise<void> | void = () => {};

	let restoring = false;

	const formatter = new Intl.DateTimeFormat( undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	} );

	$: if ( !selectedRevisionId || !revisions.some( ( revision ) => revision.id === selectedRevisionId ) ) {
		onSelectRevision( revisions[ 0 ]?.id );
	}

	$: selectedRevision = revisions.find( ( revision ) => revision.id === selectedRevisionId );

	function formatTime( value: string | undefined ) {
		if ( !value ) {
			return 'Not yet';
		}

		return formatter.format( new Date( value ) );
	}

	async function restoreSelectedRevision() {
		if ( !selectedRevisionId ) {
			return;
		}

		restoring = true;
		try {
			await onRestoreRevision( selectedRevisionId );
		} finally {
			restoring = false;
		}
	}
</script>

<EditorShellTokens>
	<section class="revision-panel">
		<div class="revision-panel__header">
			<div class="revision-panel__heading">
				<span class="builder-shell-icon-badge">
					<EditorShellIcon name="revision" title="Revisions" />
				</span>
				<div>
					<h2>Revisions</h2>
					<p>{activeDocument.title} keeps draft, autosave, and published snapshots ready for restore.</p>
				</div>
			</div>
			<div class="revision-panel__header-actions">
				<span class={`builder-shell-badge revision-panel__save-state revision-panel__save-state--${saveState}`}>{saveState}</span>
				<button class="builder-shell-button builder-shell-button--dark revision-panel__toggle" type="button" onclick={() => onTogglePanel( !panelOpen )}>{panelOpen ? 'Hide' : 'Show'}</button>
			</div>
		</div>

		<div class="revision-panel__summary">
			<div class="revision-panel__metric builder-shell-card">
				<span>Draft</span>
				<strong>{formatTime( session?.lastDraftAt )}</strong>
			</div>
			<div class="revision-panel__metric builder-shell-card">
				<span>Autosave</span>
				<strong>{formatTime( session?.lastAutosaveAt )}</strong>
			</div>
			<div class="revision-panel__metric builder-shell-card">
				<span>Published</span>
				<strong>{formatTime( session?.lastPublishedAt )}</strong>
			</div>
		</div>

		<div class="revision-panel__actions">
			<button class="builder-shell-button builder-shell-button--dark revision-panel__action revision-panel__action--draft" type="button" disabled={!canSaveDraft} title={canSaveDraft ? 'Save Draft' : saveDraftDisabledReason} onclick={onSaveDraft}>Save Draft</button>
			<button class="builder-shell-button builder-shell-button--dark revision-panel__publish" type="button" disabled={!canPublish} title={canPublish ? 'Publish' : publishDisabledReason} onclick={onPublish}>Publish</button>
			<button class="builder-shell-button revision-panel__action revision-panel__action--restore" type="button" disabled={!selectedRevisionId || restoring} onclick={restoreSelectedRevision}>
				{restoring ? 'Restoring...' : 'Restore Selected'}
			</button>
		</div>

		{#if selectedRevision}
			<div class="revision-panel__selected builder-shell-card">
				<span>Selected revision</span>
				<strong>{selectedRevision.label}</strong>
				<small>{selectedRevision.kind} | {formatTime( selectedRevision.createdAt )}</small>
			</div>
		{/if}

		{#if panelOpen}
			<div class="revision-panel__list">
				{#if revisions.length}
					{#each revisions as revision (revision.id)}
						<button
							type="button"
							class:selected={revision.id === selectedRevisionId}
							class="revision-panel__item builder-shell-card"
							onclick={() => onSelectRevision( revision.id )}
						>
							<div>
								<strong>{revision.label}</strong>
								<small>{formatTime( revision.createdAt )}</small>
							</div>
							<span class="builder-shell-badge builder-shell-badge--neutral">{revision.kind}</span>
						</button>
					{/each}
				{:else}
					<p class="revision-panel__empty builder-shell-card">No revisions exist yet for this document.</p>
				{/if}
			</div>
		{/if}
	</section>
</EditorShellTokens>

<style>
	.revision-panel {
		display: grid;
		gap: var(--builder-shell-space-12);
		min-inline-size: 0;
		padding-block-end: var(--builder-shell-space-12);
		background: var(--builder-shell-dark-panel);
		color: var(--builder-shell-toolbar-text);
	}

	.revision-panel__header,
	.revision-panel__heading,
	.revision-panel__header-actions,
	.revision-panel__summary,
	.revision-panel__actions,
	.revision-panel__item {
		display: flex;
		gap: var(--builder-shell-space-12);
	}

	.revision-panel__header {
		justify-content: space-between;
		align-items: start;
		min-inline-size: 0;
		padding: var(--builder-shell-space-10);
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-dark-panel-raised);
	}

	.revision-panel__heading {
		flex: 1;
		align-items: start;
		min-inline-size: 0;
	}

	.revision-panel__heading .builder-shell-icon-badge {
		border-color: var(--builder-shell-dark-border-strong);
		background: rgba(255, 255, 255, 0.06);
		color: var(--builder-shell-toolbar-text);
	}

	.revision-panel__header-actions {
		align-items: center;
		flex-shrink: 0;
		gap: var(--builder-shell-space-8);
		max-inline-size: 100%;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.revision-panel__header h2,
	.revision-panel__header p,
	.revision-panel__selected span,
	.revision-panel__selected strong,
	.revision-panel__selected small,
	.revision-panel__summary span,
	.revision-panel__summary strong,
	.revision-panel__item strong,
	.revision-panel__item small {
		margin: 0;
	}

	.revision-panel__header p,
	.revision-panel__summary span,
	.revision-panel__selected span,
	.revision-panel__selected small,
	.revision-panel__item small {
		color: var(--builder-shell-toolbar-text-muted);
	}

	.revision-panel__header h2 {
		font-size: 13px;
		line-height: 1.2;
		color: var(--builder-shell-toolbar-text);
	}

	.revision-panel__header p {
		font-size: 12px;
		line-height: 1.35;
	}

	.revision-panel__heading > div,
	.revision-panel__item > div {
		min-inline-size: 0;
	}

	.revision-panel__save-state--dirty {
		background: rgba(245, 158, 11, 0.18);
		color: #fbbf24;
	}

	.revision-panel__save-state--saving,
	.revision-panel__save-state--autosaving,
	.revision-panel__save-state--publishing {
		background: rgba(82, 76, 255, 0.18);
		color: #c4c2ff;
	}

	.revision-panel__save-state--published {
		background: rgba(10, 135, 90, 0.22);
		color: #76e0ba;
	}

	.revision-panel__save-state--error,
	.revision-panel__save-state--conflict {
		background: rgba(220, 38, 38, 0.18);
		color: #fca5a5;
	}

	.revision-panel__save-state {
		max-inline-size: 7rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.revision-panel__summary {
		display: grid;
		grid-template-columns: repeat( 3, minmax( 0, 1fr ) );
		gap: var(--builder-shell-space-8);
	}

	.revision-panel__metric,
	.revision-panel__selected {
		display: grid;
		gap: var(--builder-shell-space-5);
		padding: var(--builder-shell-space-10);
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-dark-panel-raised);
		min-inline-size: 0;
	}

	.revision-panel__metric strong,
	.revision-panel__selected strong,
	.revision-panel__item strong {
		color: var(--builder-shell-toolbar-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.revision-panel__actions {
		display: grid;
		grid-template-columns: repeat( 3, minmax( 0, 1fr ) );
		gap: var(--builder-shell-space-8);
	}

	.revision-panel__action,
	.revision-panel__publish {
		inline-size: 100%;
		min-inline-size: 0;
		padding-inline: var(--builder-shell-space-8);
	}

	.revision-panel__publish {
		border-color: var(--builder-shell-rose-800);
		background: var(--builder-shell-rose-800);
		color: #ffffff;
		font-weight: 500;
	}

	.revision-panel__publish:hover {
		border-color: var(--builder-shell-pink-900);
		background: var(--builder-shell-pink-900);
		color: #ffffff;
	}

	.revision-panel__action--draft {
		border-color: rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.045);
		color: var(--builder-shell-toolbar-text);
	}

	.revision-panel__action--restore {
		border-color: rgba(10, 135, 90, 0.7);
		background: rgba(10, 135, 90, 0.18);
		color: #b8f3dc;
		font-weight: 500;
	}

	.revision-panel__action--restore:hover {
		border-color: #76e0ba;
		background: rgba(10, 135, 90, 0.28);
		color: #ffffff;
	}

	.revision-panel__action:disabled,
	.revision-panel__publish:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.revision-panel__list {
		display: grid;
		gap: var(--builder-shell-space-8);
		max-height: 20rem;
		overflow: auto;
		padding-right: var(--builder-shell-space-5);
		scrollbar-width: thin;
		scrollbar-color: var(--builder-shell-gray-600) transparent;
	}

	.revision-panel__item {
		width: 100%;
		justify-content: space-between;
		align-items: center;
		padding: var(--builder-shell-space-10);
		text-align: left;
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-dark-panel);
		color: inherit;
		transition: var(--builder-shell-transition-hover);
		min-inline-size: 0;
		cursor: pointer;
	}

	.revision-panel__item:hover {
		border-color: var(--builder-shell-dark-border-strong);
		background: var(--builder-shell-dark-panel-muted);
	}

	.revision-panel__item.selected {
		border-color: var(--builder-shell-accent);
		background: rgba(208, 4, 212, 0.16);
		box-shadow: inset 3px 0 0 var(--builder-shell-accent);
	}

	.revision-panel__item > div {
		display: grid;
		gap: var(--builder-shell-space-5);
	}

	.revision-panel__empty {
		margin: 0;
		padding: var(--builder-shell-space-10);
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-dark-panel);
		color: var(--builder-shell-toolbar-text-muted);
	}

	@media (max-width: 900px) {
		.revision-panel__summary {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 520px) {
		.revision-panel__header {
			display: grid;
		}

		.revision-panel__header-actions {
			justify-content: space-between;
		}

		.revision-panel__actions {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 380px) {
		.revision-panel__actions {
			grid-template-columns: 1fr;
		}
	}
</style>
