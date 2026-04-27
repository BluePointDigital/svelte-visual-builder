<script lang="ts">
	import { onMount } from 'svelte';
	import type { PanelTabItem } from './panel-types';

	let LoadedMenuPanel: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './MenuPanel.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedMenuPanel = module.default;
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

	export let title = 'Menu';
	export let subtitle = 'Documents, site editor, preview presets, assignments, components, and imports.';
	export let sections: PanelTabItem[] = [];
	export let activeSection = 'documents';
	export let showTabs = true;
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
	export let onChangeSection: ( sectionId: string ) => void = () => {};
</script>

{#if LoadedMenuPanel}
	<svelte:component
		this={LoadedMenuPanel}
		{title}
		{subtitle}
		{sections}
		{activeSection}
		{showTabs}
		{surface}
		{width}
		{bodyPadding}
		{bodyGap}
		{bodyScrollable}
		{onChangeSection}
	>
		<svelte:fragment slot="header-actions"><slot name="header-actions" /></svelte:fragment>
		<svelte:fragment slot="summary"><slot name="summary" /></svelte:fragment>
		<svelte:fragment slot="documents"><slot name="documents" /></svelte:fragment>
		<svelte:fragment slot="site-editor"><slot name="site-editor" /></svelte:fragment>
		<svelte:fragment slot="preview-presets"><slot name="preview-presets" /></svelte:fragment>
		<svelte:fragment slot="assignments"><slot name="assignments" /></svelte:fragment>
		<svelte:fragment slot="components"><slot name="components" /></svelte:fragment>
		<svelte:fragment slot="import-diagnostics"><slot name="import-diagnostics" /></svelte:fragment>
		<svelte:fragment slot="footer"><slot name="footer" /></svelte:fragment>
		<slot />
	</svelte:component>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Menu</strong>
			<p>{loadError ? 'The menu panel failed to load.' : 'Loading the menu panel shell...'}</p>
		</div>
	</div>
{/if}
