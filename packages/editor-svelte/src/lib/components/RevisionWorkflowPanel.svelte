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
				<button class="builder-shell-button" type="button" onclick={() => onTogglePanel( !panelOpen )}>{panelOpen ? 'Hide History' : 'Show History'}</button>
			</div>
		</div>

		<div class="revision-panel__summary">
			<div class="builder-shell-card builder-shell-card--subtle">
				<span>Draft</span>
				<strong>{formatTime( session?.lastDraftAt )}</strong>
			</div>
			<div class="builder-shell-card builder-shell-card--subtle">
				<span>Autosave</span>
				<strong>{formatTime( session?.lastAutosaveAt )}</strong>
			</div>
			<div class="builder-shell-card builder-shell-card--subtle">
				<span>Published</span>
				<strong>{formatTime( session?.lastPublishedAt )}</strong>
			</div>
		</div>

		<div class="revision-panel__actions">
			<button class="builder-shell-button" type="button" disabled={!canSaveDraft} title={canSaveDraft ? 'Save Draft' : saveDraftDisabledReason} onclick={onSaveDraft}>Save Draft</button>
			<button class="builder-shell-button builder-shell-button--dark revision-panel__publish" type="button" disabled={!canPublish} title={canPublish ? 'Publish' : publishDisabledReason} onclick={onPublish}>Publish</button>
			<button class="builder-shell-button builder-shell-button--primary" type="button" disabled={!selectedRevisionId || restoring} onclick={restoreSelectedRevision}>
				{restoring ? 'Restoring...' : 'Restore Selected'}
			</button>
		</div>

		{#if selectedRevision}
			<div class="revision-panel__selected builder-shell-card builder-shell-card--subtle">
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
					<p class="revision-panel__empty">No revisions exist yet for this document.</p>
				{/if}
			</div>
		{/if}
	</section>
</EditorShellTokens>

<style>
	.revision-panel {
		display: grid;
		gap: var(--builder-shell-space-16);
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
	}

	.revision-panel__heading {
		flex: 1;
		align-items: start;
	}

	.revision-panel__header-actions {
		align-items: center;
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
		color: var(--builder-shell-text-muted);
	}

	.revision-panel__save-state--dirty {
		background: var(--builder-shell-warning-surface);
		color: #92400e;
	}

	.revision-panel__save-state--saving,
	.revision-panel__save-state--autosaving,
	.revision-panel__save-state--publishing {
		background: var(--builder-shell-info-surface);
		color: var(--builder-shell-info);
	}

	.revision-panel__save-state--published {
		background: var(--builder-shell-success-surface);
		color: var(--builder-shell-success);
	}

	.revision-panel__save-state--error,
	.revision-panel__save-state--conflict {
		background: rgba( 220, 38, 38, 0.12 );
		color: #b91c1c;
	}

	.revision-panel__summary {
		display: grid;
		grid-template-columns: repeat( 3, minmax( 0, 1fr ) );
	}

	.revision-panel__summary > div,
	.revision-panel__selected {
		display: grid;
		gap: var(--builder-shell-space-5);
		padding: var(--builder-shell-space-12);
	}

	.revision-panel__actions {
		flex-wrap: wrap;
	}

	.revision-panel__list {
		display: grid;
		gap: var(--builder-shell-space-10);
		max-height: 20rem;
		overflow: auto;
		padding-right: var(--builder-shell-space-5);
	}

	.revision-panel__item {
		width: 100%;
		justify-content: space-between;
		align-items: center;
		padding: var(--builder-shell-space-12);
		text-align: left;
	}

	.revision-panel__item.selected {
		border-color: var(--builder-shell-accent);
		background: var(--builder-shell-accent-surface);
	}

	.revision-panel__item > div {
		display: grid;
		gap: var(--builder-shell-space-5);
	}

	.revision-panel__empty {
		margin: 0;
		color: var(--builder-shell-text-muted);
	}

	@media (max-width: 900px) {
		.revision-panel__summary {
			grid-template-columns: 1fr;
		}
	}
</style>
