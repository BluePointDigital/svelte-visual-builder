<script lang="ts">
	import { onMount } from 'svelte';

	let LoadedPageSettingsPanel: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './PageSettingsPanel.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedPageSettingsPanel = module.default;
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

	export let title = 'Page Settings';
	export let subtitle = 'Document-scoped settings, route context, and assignment metadata.';
	export let documentTitle = '';
	export let documentSlug = '';
	export let documentKind = '';
	export let documentStatus = '';
	export let documentMode = '';
	export let routeLabel = '';
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
</script>

{#if LoadedPageSettingsPanel}
	<svelte:component
		this={LoadedPageSettingsPanel}
		{title}
		{subtitle}
		{documentTitle}
		{documentSlug}
		{documentKind}
		{documentStatus}
		{documentMode}
		{routeLabel}
		{surface}
		{width}
		{bodyPadding}
		{bodyGap}
		{bodyScrollable}
	>
		<svelte:fragment slot="summary"><slot name="summary" /></svelte:fragment>
		<svelte:fragment slot="header-actions"><slot name="header-actions" /></svelte:fragment>
		<svelte:fragment slot="footer"><slot name="footer" /></svelte:fragment>
		<slot />
	</svelte:component>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Page Settings</strong>
			<p>{loadError ? 'The page settings panel failed to load.' : 'Loading the page settings panel shell...'}</p>
		</div>
	</div>
{/if}
