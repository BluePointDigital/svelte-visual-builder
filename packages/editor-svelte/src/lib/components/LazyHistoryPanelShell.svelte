<script lang="ts">
	import { onMount } from 'svelte';
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

	let LoadedHistoryPanelShell: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './HistoryPanelShell.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedHistoryPanelShell = module.default;
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

</script>

{#if LoadedHistoryPanelShell}
	<svelte:component
		this={LoadedHistoryPanelShell}
		{title}
		{subtitle}
		{documentTitle}
		{saveState}
		{saveStateTone}
		{panelOpen}
		{surface}
		{width}
		{bodyPadding}
		{bodyGap}
		{bodyScrollable}
		{onTogglePanel}
	>
		<svelte:fragment slot="summary"><slot name="summary" /></svelte:fragment>
		<svelte:fragment slot="header-actions"><slot name="header-actions" /></svelte:fragment>
		<svelte:fragment slot="footer"><slot name="footer" /></svelte:fragment>
		<slot />
	</svelte:component>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading History</strong>
			<p>{loadError ? 'The history panel failed to load.' : 'Loading the history panel shell...'}</p>
		</div>
	</div>
{/if}
