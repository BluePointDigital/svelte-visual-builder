<script lang="ts">
	import type { PanelTabItem } from './panel-types';
	import EditorShellTokens from './EditorShellTokens.svelte';
	import PanelShell from './PanelShell.svelte';
	import PanelTabSwitcher from './PanelTabSwitcher.svelte';
	import PanelHeaderCompact from './PanelHeaderCompact.svelte';

	export let title = 'Editor';
	export let subtitle = 'Selected element inspector';
	export let titleSuffix = '';
	export let tabs: PanelTabItem[] = [];
	export let activeTab = 'content';
	export let surface: 'light' | 'dark' = 'light';
	export let tabMode: 'compact' | 'editor' = 'compact';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
	export let showHeader = true;
	export let showTabs = true;
	export let leadingIcon = 'editor';
	export let leadingLabel = 'Panel';
	export let showLeading = false;
	export let showTrailing = false;
	export let trailingIcon = '+';
	export let trailingLabel = 'Add';
	export let onChangeTab: ( tabId: string ) => void = () => {};
	export let onLeadingClick: () => void = () => {};
	export let onTrailingClick: () => void = () => {};
</script>

<EditorShellTokens>
	<PanelShell {surface} {width} {bodyPadding} {bodyGap} {bodyScrollable}>
		<svelte:fragment slot="header">
			{#if showHeader}
				<PanelHeaderCompact
					title={title}
					subtitle={subtitle}
					{titleSuffix}
					leadingIcon={leadingIcon}
					leadingLabel={leadingLabel}
					showLeading={showLeading}
					showTrailing={showTrailing}
					trailingIcon={trailingIcon}
					trailingLabel={trailingLabel}
					onLeadingClick={onLeadingClick}
					onTrailingClick={onTrailingClick}
				>
					<svelte:fragment slot="actions">
						<slot name="header-actions" />
					</svelte:fragment>
				</PanelHeaderCompact>
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="tabs">
			{#if showTabs && tabs.length}
				<PanelTabSwitcher tabs={tabs} activeTab={activeTab} mode={tabMode} onChange={onChangeTab} />
			{/if}
		</svelte:fragment>

		<slot />

		<svelte:fragment slot="footer">
			<slot name="footer" />
		</svelte:fragment>
	</PanelShell>
</EditorShellTokens>
