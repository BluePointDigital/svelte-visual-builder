<script lang="ts">
	import PanelTabSwitcherBits from './PanelTabSwitcherBits.svelte';
	import type { PanelTabItem } from './panel-types';

	export let tabs: PanelTabItem[] = [];
	export let activeTab = '';
	export let stretch = true;
	export let dense = true;
	export let mode: 'compact' | 'editor' = 'compact';
	export let onChange: ( id: string ) => void = () => {};

	function activate( id: string ) {
		if ( id === activeTab ) {
			return;
		}

		onChange( id );
	}
</script>

<nav class:dense class:stretch class:editor-mode={mode === 'editor'} class="builder-panel-tab-switcher-shell" aria-label="Panel pages">
	<PanelTabSwitcherBits {tabs} {activeTab} {mode} {stretch} onChange={activate} />
</nav>
