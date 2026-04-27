<script lang="ts">
	import { onMount } from 'svelte';
	import type { BuilderDocument, BuilderNode, EditorMode } from '@builder/schema';

	let LoadedComponentWorkflowPanel: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './ComponentWorkflowPanel.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedComponentWorkflowPanel = module.default;
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
	export let activeDocument: BuilderDocument;
	export let mode: EditorMode = 'page';
	export let selectedNode: BuilderNode | undefined = undefined;
	export let editingContext: 'master' | 'instance' | 'detached' | undefined = undefined;
	export let editingComponentDocumentId: string | undefined = undefined;
	export let onOpenDocument: ( documentId: string, mode?: EditorMode ) => void = () => {};
	export let onInsertComponentInstance: ( componentId: string ) => void = () => {};
	export let onDetachInstance: () => void = () => {};
	export let onRelinkInstance: ( componentId: string, preserveOverrides?: boolean ) => void = () => {};
</script>

{#if LoadedComponentWorkflowPanel}
	<svelte:component
		this={LoadedComponentWorkflowPanel}
		{documents}
		{activeDocument}
		{mode}
		{selectedNode}
		{editingContext}
		{editingComponentDocumentId}
		{onOpenDocument}
		{onInsertComponentInstance}
		{onDetachInstance}
		{onRelinkInstance}
	/>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Components</strong>
			<p>{loadError ? 'The component workflow failed to load.' : 'Loading the component workflow...'}</p>
		</div>
	</div>
{/if}
