<script lang="ts">
	import { onMount } from 'svelte';
	import type { PanelTabItem } from './panel-types';

	let LoadedGlobalsPanelShell: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './GlobalsPanelShell.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedGlobalsPanelShell = module.default;
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

	export let title = 'Globals';
	export let subtitle = 'Classes, variables, theme styles, and shared design system controls.';
	export let tabs: PanelTabItem[] = [];
	export let activeTab = 'classes';
	export let showTabs = true;
	export let surface: 'light' | 'dark' = 'dark';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-10)';
	export let bodyGap = 'var(--builder-shell-space-10)';
	export let bodyScrollable = true;
	export let onChangeTab: ( tabId: string ) => void = () => {};
</script>

{#if LoadedGlobalsPanelShell}
	<svelte:component
		this={LoadedGlobalsPanelShell}
		{title}
		{subtitle}
		{tabs}
		{activeTab}
		{showTabs}
		{surface}
		{width}
		{bodyPadding}
		{bodyGap}
		{bodyScrollable}
		{onChangeTab}
	>
		<svelte:fragment slot="summary"><slot name="summary" /></svelte:fragment>
		<svelte:fragment slot="header-actions"><slot name="header-actions" /></svelte:fragment>
		<svelte:fragment slot="footer"><slot name="footer" /></svelte:fragment>
		<slot />
	</svelte:component>
{:else}
	<div class="builder-shell-lazy-panel">
		<div class="builder-shell-card builder-shell-card--subtle builder-shell-lazy-panel__placeholder">
			<strong>Loading Globals</strong>
			<p>{loadError ? 'The globals panel failed to load.' : 'Loading the globals panel shell...'}</p>
		</div>
	</div>
{/if}
