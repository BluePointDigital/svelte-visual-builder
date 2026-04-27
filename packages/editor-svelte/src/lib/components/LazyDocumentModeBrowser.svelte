<script lang="ts">
	import { onMount } from 'svelte';
	import type { BuilderDocument, EditorMode } from '@builder/schema';

	let LoadedDocumentModeBrowser: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './DocumentModeBrowser.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedDocumentModeBrowser = module.default;
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

	export let documents: BuilderDocument[] = [];
	export let activeDocumentId = '';
	export let activeMode: EditorMode = 'page';
	export let onOpenDocument: ( documentId: string, mode?: EditorMode ) => void = () => {};
</script>

{#if LoadedDocumentModeBrowser}
	<svelte:component
		this={LoadedDocumentModeBrowser}
		{documents}
		{activeDocumentId}
		{activeMode}
		{onOpenDocument}
	/>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Documents</strong>
			<p>{loadError ? 'The document browser failed to load.' : 'Loading the document browser...'}</p>
		</div>
	</div>
{/if}
