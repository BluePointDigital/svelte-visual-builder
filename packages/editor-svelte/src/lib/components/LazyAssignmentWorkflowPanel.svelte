<script lang="ts">
	import { onMount } from 'svelte';
	import type { BuilderDocument, ThemeAssignment } from '@builder/schema';

	let LoadedAssignmentWorkflowPanel: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './AssignmentWorkflowPanel.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedAssignmentWorkflowPanel = module.default;
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
	export let projectAssignments: ThemeAssignment[] = [];
	export let documentsById: Map<string, BuilderDocument> = new Map();
	export let activeEntryId: string | undefined = undefined;
	export let onPreviewAssignment: ( assignment: ThemeAssignment ) => void = () => {};
	export let onOpenAssignment: ( assignment: ThemeAssignment ) => void = () => {};
	export let onCreateAssignment: ( draft: {
		slot: ThemeAssignment['slot'];
		pathname?: string;
		priority: number;
		status: ThemeAssignment['status'];
		routePattern?: string;
	} ) => void = () => {};
	export let onUpdateAssignment: ( assignment: ThemeAssignment, patch: Partial<ThemeAssignment> ) => void = () => {};
	export let onUpdateAssignmentRoutePattern: ( assignment: ThemeAssignment, value: string ) => void = () => {};
	export let onDeleteAssignment: ( assignmentId: string ) => void = () => {};
</script>

{#if LoadedAssignmentWorkflowPanel}
	<svelte:component
		this={LoadedAssignmentWorkflowPanel}
		{activeDocument}
		{projectAssignments}
		{documentsById}
		{activeEntryId}
		{onPreviewAssignment}
		{onOpenAssignment}
		{onCreateAssignment}
		{onUpdateAssignment}
		{onUpdateAssignmentRoutePattern}
		{onDeleteAssignment}
	/>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Assignments</strong>
			<p>{loadError ? 'The assignments workflow failed to load.' : 'Loading the assignments workflow...'}</p>
		</div>
	</div>
{/if}
