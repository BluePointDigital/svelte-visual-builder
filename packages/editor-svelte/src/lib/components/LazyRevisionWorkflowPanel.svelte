<script lang="ts">
	import { onMount } from 'svelte';
	import type { BuilderSaveState, DocumentSession } from '@builder/core';
	import type { BuilderDocument, DocumentRevision } from '@builder/schema';

	let LoadedRevisionWorkflowPanel: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './RevisionWorkflowPanel.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedRevisionWorkflowPanel = module.default;
				}
			} )
			.catch( ( error ) => {
				if ( !cancelled ) {
					loadError = error as Error;
				}
			} );

		return () => {
			cancelled = true;
		};
	} );

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
</script>

{#if LoadedRevisionWorkflowPanel}
	<svelte:component
		this={LoadedRevisionWorkflowPanel}
		{activeDocument}
		{session}
		{revisions}
		{saveState}
		{panelOpen}
		{selectedRevisionId}
		{canSaveDraft}
		{canPublish}
		{saveDraftDisabledReason}
		{publishDisabledReason}
		{onSaveDraft}
		{onPublish}
		{onTogglePanel}
		{onSelectRevision}
		{onRestoreRevision}
	/>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Revisions</strong>
			<p>{loadError ? 'The revision workflow failed to load.' : 'Loading the revision workflow...'}</p>
		</div>
	</div>
{/if}
