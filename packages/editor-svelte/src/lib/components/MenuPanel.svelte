<script lang="ts">
	import type { PanelTabItem } from './panel-types';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';
	import PanelHeaderCompact from './PanelHeaderCompact.svelte';
	import PanelShell from './PanelShell.svelte';
	import PanelTabSwitcher from './PanelTabSwitcher.svelte';

	export let title = 'Menu';
	export let subtitle = 'Documents, site editor, preview presets, assignments, components, and imports.';
	export let sections: PanelTabItem[] = defaultSections();
	export let activeSection = 'documents';
	export let showTabs = true;
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = 'var(--builder-shell-space-12)';
	export let bodyGap = 'var(--builder-shell-space-12)';
	export let bodyScrollable = true;
	export let onChangeSection: ( sectionId: string ) => void = () => {};

	const defaultSectionList: PanelTabItem[] = [
		{ id: 'documents', label: 'Documents', title: 'Open document browser' },
		{ id: 'site-editor', label: 'Site Editor', title: 'Open theme-part entry flow' },
		{ id: 'preview-presets', label: 'Preview Presets', title: 'Preview routes and states' },
		{ id: 'assignments', label: 'Assignments', title: 'Route and slot assignments' },
		{ id: 'components', label: 'Components', title: 'Reusable masters and instances' },
		{ id: 'import-diagnostics', label: 'Imports', title: 'Import diagnostics and gaps' },
	];

	function defaultSections() {
		return defaultSectionList;
	}

	$: normalizedSections = sections.length ? sections : defaultSections();
	$: fallbackSection = normalizedSections[ 0 ]?.id ?? 'documents';
	$: currentSection = normalizedSections.some( ( section ) => section.id === activeSection ) ? activeSection : fallbackSection;
	$: currentSectionLabel = normalizedSections.find( ( section ) => section.id === currentSection )?.label ?? 'Documents';
	$: currentSectionTitle = normalizedSections.find( ( section ) => section.id === currentSection )?.title ?? '';

	function selectSection( sectionId: string ) {
		if ( sectionId === currentSection ) {
			return;
		}

		onChangeSection( sectionId );
	}
</script>

<EditorShellTokens>
	<PanelShell {surface} {width} {bodyPadding} {bodyGap} {bodyScrollable}>
		<svelte:fragment slot="header">
			<PanelHeaderCompact title={title} subtitle={subtitle} leadingIcon="menu" leadingLabel="Menu" showLeading={false}>
				<svelte:fragment slot="actions">
					<span class="builder-shell-badge builder-shell-badge--neutral">{currentSectionLabel}</span>
					{#if currentSectionTitle}
						<span class="builder-shell-muted">{currentSectionTitle}</span>
					{/if}
					<slot name="header-actions" />
				</svelte:fragment>
			</PanelHeaderCompact>
		</svelte:fragment>

		<svelte:fragment slot="tabs">
			{#if showTabs && normalizedSections.length}
				<PanelTabSwitcher tabs={normalizedSections} activeTab={currentSection} onChange={selectSection} />
			{/if}
		</svelte:fragment>

		<section class="menu-panel">
			<div class="menu-panel__intro builder-shell-card builder-shell-card--subtle">
				<div class="menu-panel__intro-heading">
					<span class="builder-shell-icon-badge">
						<EditorShellIcon name="menu" title="Menu" />
					</span>
					<div>
						<h2>{title}</h2>
						<p>{subtitle}</p>
					</div>
				</div>
				<div class="menu-panel__intro-actions">
					<slot name="summary" />
				</div>
			</div>

			<div class="menu-panel__body">
				{#if currentSection === 'documents'}
					<slot name="documents" />
				{:else if currentSection === 'site-editor'}
					<slot name="site-editor" />
				{:else if currentSection === 'preview-presets'}
					<slot name="preview-presets" />
				{:else if currentSection === 'assignments'}
					<slot name="assignments" />
				{:else if currentSection === 'components'}
					<slot name="components" />
				{:else if currentSection === 'import-diagnostics'}
					<slot name="import-diagnostics" />
				{:else}
					<slot />
				{/if}
			</div>
		</section>

		<svelte:fragment slot="footer">
			<slot name="footer" />
		</svelte:fragment>
	</PanelShell>
</EditorShellTokens>

<style>
	.menu-panel {
		display: grid;
		gap: var(--builder-shell-space-16);
	}

	.menu-panel__intro {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.menu-panel__intro-heading {
		display: flex;
		gap: var(--builder-shell-space-12);
		align-items: start;
	}

	.menu-panel__intro h2,
	.menu-panel__intro p {
		margin: 0;
	}

	.menu-panel__intro p,
	.menu-panel__intro-actions {
		color: var(--builder-shell-text-muted);
	}

	.menu-panel__intro-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--builder-shell-space-8);
	}

	.menu-panel__body {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	@media (max-width: 900px) {
		.menu-panel__intro-heading {
			flex-direction: column;
		}
	}
</style>
