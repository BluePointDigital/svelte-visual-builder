<script lang="ts">
	import { Tabs } from '../vendor/bits-tabs';

	import EditorShellIcon from './EditorShellIcon.svelte';
	import type { PanelTabItem } from './panel-types';

	export let tabs: PanelTabItem[] = [];
	export let activeTab = '';
	export let mode: 'compact' | 'editor' = 'compact';
	export let stretch = true;
	export let onChange: ( id: string ) => void = () => {};

	function activate( id: string ) {
		if ( id === activeTab ) {
			return;
		}

		onChange( id );
	}

	function getListClass() {
		return [
			'builder-panel-tab-switcher',
			stretch ? 'stretch' : '',
			mode === 'editor' ? 'editor-mode' : '',
		].filter( Boolean ).join( ' ' );
	}
</script>

<Tabs.Root value={activeTab} onValueChange={activate} activationMode="manual">
	<Tabs.List class={getListClass()}>
		{#each tabs as tab (tab.id)}
			<Tabs.Trigger
				value={tab.id}
				disabled={tab.disabled}
				class={`builder-panel-tab-switcher__tab${tab.id === activeTab ? ' active' : ''}`}
				type="button"
				title={tab.title ?? tab.label}
				aria-label={tab.title ?? tab.label}
			>
				{#if tab.icon}
					<span class="builder-panel-tab-switcher__icon" aria-hidden="true">
						<EditorShellIcon name={tab.icon} size={mode === 'editor' ? 17 : 14} />
					</span>
				{/if}
				<span>{tab.label}</span>
				{#if tab.dirty}
					<i aria-hidden="true" class="builder-panel-tab-switcher__dot"></i>
				{/if}
				{#if tab.badge !== undefined}
					<em>{tab.badge}</em>
				{/if}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>

<style>
	:global(.builder-panel-tab-switcher) {
		display: flex;
		align-items: stretch;
		min-block-size: 40px;
		background: var(--builder-shell-gray-50);
		border-block-end: 1px solid var(--builder-shell-border);
		overflow: hidden;
	}

	:global(.builder-panel-shell--dark) :global(.builder-panel-tab-switcher) {
		background: var(--builder-shell-gray-725);
		border-block-end-color: var(--builder-shell-border-dark);
	}

	:global(.builder-panel-tab-switcher.stretch .builder-panel-tab-switcher__tab) {
		flex: 1 1 0;
	}

	:global(.builder-panel-tab-switcher__tab) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-inline-size: 0;
		padding: 0 0.85rem;
		border: 0;
		border-block-end: 2px solid transparent;
		background: transparent;
		color: var(--builder-shell-text-muted);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		letter-spacing: 0;
		box-shadow: inset -1px 0 0 var(--builder-shell-border);
	}

	:global(.builder-panel-tab-switcher__icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
	}

	:global(.builder-panel-shell--dark) :global(.builder-panel-tab-switcher__tab) {
		color: var(--builder-shell-toolbar-text-muted);
		box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
	}

	:global(.builder-panel-tab-switcher__tab:hover:not(:disabled)) {
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-heading);
	}

	:global(.builder-panel-shell--dark) :global(.builder-panel-tab-switcher__tab:hover:not(:disabled)) {
		background: rgba(255, 255, 255, 0.06);
		color: var(--builder-shell-toolbar-text);
	}

	:global(.builder-panel-tab-switcher__tab.active),
	:global(.builder-panel-tab-switcher__tab[data-state='active']) {
		color: var(--builder-shell-heading);
		border-block-end-color: var(--builder-shell-accent);
		background: var(--builder-shell-panel-bg);
	}

	:global(.builder-panel-shell--dark) :global(.builder-panel-tab-switcher__tab.active) {
		color: var(--builder-shell-toolbar-text);
		background: var(--builder-shell-gray-800);
	}

	:global(.builder-panel-tab-switcher__tab:disabled) {
		opacity: 0.45;
		cursor: not-allowed;
	}

	:global(.builder-panel-tab-switcher__tab span),
	:global(.builder-panel-tab-switcher__tab em) {
		white-space: nowrap;
	}

	:global(.builder-panel-tab-switcher__tab em) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 16px;
		block-size: 16px;
		padding: 0 0.35rem;
		border-radius: 999px;
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-text);
		font-style: normal;
		font-size: 10px;
	}

	:global(.builder-panel-shell--dark) :global(.builder-panel-tab-switcher__tab em) {
		background: rgba(255, 255, 255, 0.08);
		color: var(--builder-shell-toolbar-text);
	}

	:global(.builder-panel-tab-switcher__dot) {
		inline-size: 6px;
		block-size: 6px;
		border-radius: 999px;
		background: var(--builder-shell-accent);
	}

	:global(.builder-panel-tab-switcher.editor-mode) {
		min-block-size: 56px;
		background: var(--builder-shell-gray-800);
		border-block-end-color: var(--builder-shell-border-dark);
	}

	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__tab) {
		flex-direction: column;
		gap: 0.3rem;
		min-height: 56px;
		padding: 7px 0 6px;
		color: rgba(255, 255, 255, 0.72);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.01em;
		box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
	}

	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__icon) {
		inline-size: 18px;
		block-size: 18px;
	}

	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__tab span) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__tab:hover:not(:disabled)) {
		background: rgba(255, 255, 255, 0.04);
		color: var(--builder-shell-toolbar-text);
	}

	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__tab.active),
	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__tab[data-state='active']) {
		background: rgba(255, 255, 255, 0.03);
		color: var(--builder-shell-toolbar-text);
		border-block-end-color: var(--builder-shell-accent);
	}

	:global(.builder-panel-tab-switcher.editor-mode .builder-panel-tab-switcher__tab em) {
		display: none;
	}
</style>
