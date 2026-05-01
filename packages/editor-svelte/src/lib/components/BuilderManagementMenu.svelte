<script lang="ts">
	import type { BuilderDocument, BuilderNode, DocumentKind, EditorMode, ThemeAssignment } from '@builder/schema';
	import type { PanelTabItem } from './panel-types';
	import AssignmentWorkflowPanel from './LazyAssignmentWorkflowPanel.svelte';
	import ComponentWorkflowPanel from './LazyComponentWorkflowPanel.svelte';
	import DocumentModeBrowser from './LazyDocumentModeBrowser.svelte';
	import MenuPanel from './LazyMenuPanel.svelte';

	type SiteEditorEntry = { id: string; label: string; route: string; templateType: string; documentId: string; slot: string };
	type PreviewPreset = { id: string; label: string; pathname: string; query: string };

	export let sections: PanelTabItem[] = [];
	export let activeSection = 'documents';
	export let documentFilter: DocumentKind | 'all' = 'all';
	export let creatableKinds: DocumentKind[] = [];
	export let documents: BuilderDocument[] = [];
	export let filteredDocuments: BuilderDocument[] = [];
	export let activeDocument: BuilderDocument;
	export let activeDocumentId = '';
	export let activeMode: EditorMode = 'page';
	export let projectAssignments: ThemeAssignment[] = [];
	export let documentsById: Map<string, BuilderDocument> = new Map();
	export let activeEntryId: string | undefined = undefined;
	export let siteEditorEntries: SiteEditorEntry[] = [];
	export let previewPresets: PreviewPreset[] = [];
	export let importWarnings: string[] = [];
	export let selectedNode: BuilderNode | undefined = undefined;
	export let editingContext: 'master' | 'instance' | 'detached' | undefined = undefined;
	export let editingComponentDocumentId: string | undefined = undefined;
	export let variant: 'sidebar' | 'workspace' = 'sidebar';
	export let onChangeSection: ( sectionId: string ) => void = () => {};
	export let onChangeDocumentFilter: ( value: DocumentKind | 'all' ) => void = () => {};
	export let onOpenDocument: ( documentId: string, mode?: EditorMode ) => void = () => {};
	export let onOpenSiteEditorEntry: ( entry: SiteEditorEntry ) => void = () => {};
	export let onOpenPreviewPreset: ( preset: PreviewPreset ) => void = () => {};
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
	export let onInsertComponentInstance: ( componentId: string ) => void = () => {};
	export let onDetachInstance: () => void = () => {};
	export let onRelinkInstance: ( componentId: string, preserveOverrides?: boolean ) => void = () => {};
</script>

<div class={`builder-management-menu builder-management-menu--${variant}`}>
	<MenuPanel
		surface="dark"
		bodyScrollable={variant === 'workspace'}
		{sections}
		activeSection={activeSection}
		onChangeSection={onChangeSection}
	>
		<div slot="summary" class="builder-management-menu__stats">
			<span class="builder-management-menu__stat"><strong>{documents.length}</strong><small>Documents</small></span>
			<span class="builder-management-menu__stat"><strong>{siteEditorEntries.length}</strong><small>Site entries</small></span>
			<span class:builder-management-menu__stat--warn={importWarnings.length > 0} class="builder-management-menu__stat"><strong>{importWarnings.length}</strong><small>Import warnings</small></span>
		</div>

		<div slot="documents" class="builder-management-menu__card">
			<div class="builder-management-menu__card-header">
				<div class="builder-management-menu__stack-header">
					<h3>Documents</h3>
					<p>Open pages, parts, popups, and components from the same shell.</p>
				</div>
				<label class="builder-management-menu__filter">
					<span>Filter</span>
					<select value={documentFilter} onchange={(event) => onChangeDocumentFilter( ( event.currentTarget as HTMLSelectElement ).value as DocumentKind | 'all' )}>
						<option value="all">all</option>
						{#each creatableKinds as kind}
							<option value={kind}>{kind}</option>
						{/each}
					</select>
				</label>
			</div>
			<DocumentModeBrowser documents={filteredDocuments} activeDocumentId={activeDocumentId} activeMode={activeMode} onOpenDocument={onOpenDocument} />
		</div>

		<svelte:fragment slot="site-editor">
			{#if siteEditorEntries.length}
				<section class="builder-management-menu__card" aria-label="Site-editor entry cards">
					<div class="builder-management-menu__stack-header">
						<h3>Site Editor</h3>
						<p>Header, footer, template, and popup entry flows.</p>
					</div>
					<div class="builder-management-menu__entry-grid">
						{#each siteEditorEntries as entry (entry.id)}
							<button type="button" class="builder-management-menu__entry-card" onclick={() => onOpenSiteEditorEntry( entry )}>
								<strong>{entry.label}</strong>
								<span>{entry.templateType}</span>
								<small>{entry.route}</small>
							</button>
						{/each}
					</div>
				</section>
			{:else}
				<section class="builder-management-menu__card builder-management-menu__empty">
					<div class="builder-management-menu__stack-header"><h3>Site Editor</h3><p>No site-editor entries are available for this project.</p></div>
				</section>
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="preview-presets">
			{#if previewPresets.length}
				<section class="builder-management-menu__card">
					<div class="builder-management-menu__stack-header"><h3>Preview Presets</h3><p>Jump the preview frame without leaving the builder.</p></div>
					<div class="builder-management-menu__preset-list">
						{#each previewPresets as preset (preset.id)}
							<button type="button" class="builder-management-menu__preset-button" onclick={() => onOpenPreviewPreset( preset )}>
								<span>{preset.label}</span>
								<small>{preset.pathname}{preset.query ? `?${preset.query}` : ''}</small>
							</button>
						{/each}
					</div>
				</section>
			{:else}
				<section class="builder-management-menu__card builder-management-menu__empty">
					<div class="builder-management-menu__stack-header"><h3>Preview Presets</h3><p>No preview presets have been registered by the host.</p></div>
				</section>
			{/if}
		</svelte:fragment>

		<section slot="assignments" class="builder-management-menu__card">
			<div class="builder-management-menu__stack-header"><h3>Assignments</h3><p>Theme-builder assignments stay in the same workspace.</p></div>
			<AssignmentWorkflowPanel
				{activeDocument}
				{documentsById}
				projectAssignments={projectAssignments}
				activeEntryId={activeEntryId}
				onPreviewAssignment={onPreviewAssignment}
				onOpenAssignment={onOpenAssignment}
				onCreateAssignment={onCreateAssignment}
				onUpdateAssignment={onUpdateAssignment}
				onUpdateAssignmentRoutePattern={onUpdateAssignmentRoutePattern}
				onDeleteAssignment={onDeleteAssignment}
			/>
		</section>

		<section slot="components" class="builder-management-menu__card">
			<div class="builder-management-menu__stack-header"><h3>Components</h3><p>Open masters, insert instances, and manage detach or relink flows.</p></div>
			<ComponentWorkflowPanel
				{documents}
				{activeDocument}
				mode={activeMode}
				{selectedNode}
				{editingContext}
				{editingComponentDocumentId}
				onOpenDocument={onOpenDocument}
				onInsertComponentInstance={onInsertComponentInstance}
				onDetachInstance={onDetachInstance}
				onRelinkInstance={onRelinkInstance}
			/>
		</section>

		<svelte:fragment slot="import-diagnostics">
			{#if importWarnings.length}
				<section class="builder-management-menu__card">
					<div class="builder-management-menu__stack-header"><h3>Import Diagnostics</h3><p>Parity gaps and compat warnings from imported Elementor content.</p></div>
					<ul class="builder-management-menu__warning-list">
						{#each importWarnings as warning, index (`${index}-${warning}`)}
							<li>{warning}</li>
						{/each}
					</ul>
				</section>
			{:else}
				<section class="builder-management-menu__card builder-management-menu__empty">
					<div class="builder-management-menu__stack-header"><h3>Import Diagnostics</h3><p>No import warnings for the current project.</p></div>
				</section>
			{/if}
		</svelte:fragment>
	</MenuPanel>
</div>

<style>
	.builder-management-menu {
		display: grid;
		min-inline-size: 0;
		block-size: 100%;
		color: var(--builder-shell-toolbar-text);
	}

	.builder-management-menu--workspace {
		padding: 12px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0)),
			var(--builder-shell-gray-900);
	}

	.builder-management-menu--workspace :global(.builder-panel-shell) {
		max-inline-size: 1120px;
		margin-inline: auto;
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: 8px;
		box-shadow: 0 18px 54px rgba(0, 0, 0, 0.34);
	}

	.builder-management-menu--workspace :global(.builder-panel-tab-switcher-shell) {
		overflow-x: auto;
	}

	.builder-management-menu--workspace :global(.menu-panel) {
		gap: 12px;
	}

	.builder-management-menu--workspace :global(.menu-panel__body) {
		min-inline-size: 0;
	}

	.builder-management-menu--workspace .builder-management-menu__stats {
		grid-template-columns: repeat(3, minmax(9rem, 1fr));
	}

	.builder-management-menu--workspace .builder-management-menu__card {
		padding: 14px;
	}

	.builder-management-menu--workspace .builder-management-menu__entry-grid {
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}

	.builder-management-menu__card,
	.builder-management-menu__preset-list,
	.builder-management-menu__warning-list {
		display: grid;
		gap: 8px;
		min-inline-size: 0;
	}

	.builder-management-menu__card {
		padding: 10px;
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0)),
			var(--builder-shell-dark-panel-raised);
		color: var(--builder-shell-toolbar-text);
	}

	.builder-management-menu__card-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(112px, 0.42fr);
		gap: 10px;
		align-items: end;
		min-inline-size: 0;
	}

	.builder-management-menu__stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}

	.builder-management-menu__stat {
		display: grid;
		gap: 1px;
		min-inline-size: 0;
		padding: 7px 8px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--builder-shell-radius-lg);
		background: rgba(255, 255, 255, 0.04);
	}

	.builder-management-menu__stat strong {
		color: #ffffff;
		font-size: 13px;
		line-height: 1.1;
	}

	.builder-management-menu__stat small {
		overflow: hidden;
		color: var(--builder-shell-toolbar-text-muted);
		font-size: 10px;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-management-menu__stat--warn {
		border-color: rgba(245, 158, 11, 0.36);
		background: rgba(245, 158, 11, 0.1);
	}

	.builder-management-menu__stack-header {
		display: grid;
		gap: 2px;
		min-inline-size: 0;
	}

	.builder-management-menu__stack-header h3,
	.builder-management-menu__stack-header p {
		margin: 0;
	}

	.builder-management-menu__stack-header h3 {
		color: var(--builder-shell-toolbar-text);
		font-weight: 600;
	}

	.builder-management-menu__stack-header p {
		color: var(--builder-shell-toolbar-text-muted);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.builder-management-menu__filter {
		display: grid;
		gap: 4px;
		min-inline-size: 0;
	}

	.builder-management-menu__filter span {
		color: var(--builder-shell-toolbar-text-muted);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.builder-management-menu__filter select {
		inline-size: 100%;
		min-block-size: 28px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--builder-shell-radius-lg);
		background-color: var(--builder-shell-gray-900);
		color: var(--builder-shell-toolbar-text);
		color-scheme: dark;
	}

	.builder-management-menu__entry-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.builder-management-menu__entry-card,
	.builder-management-menu__preset-button {
		display: grid;
		gap: 4px;
		min-inline-size: 0;
		padding: 10px;
		border: 1px solid var(--builder-shell-dark-border);
		border-radius: var(--builder-shell-radius-lg);
		background: rgba(255, 255, 255, 0.035);
		color: var(--builder-shell-toolbar-text);
		text-align: left;
	}

	.builder-management-menu__entry-card:hover,
	.builder-management-menu__preset-button:hover {
		border-color: transparent;
		background: rgba(208, 4, 212, 0.16);
		color: #ffffff;
		box-shadow: inset 0 -2px 0 var(--builder-shell-accent), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
	}

	.builder-management-menu__entry-card small,
	.builder-management-menu__entry-card span,
	.builder-management-menu__preset-button small {
		overflow: hidden;
		color: var(--builder-shell-toolbar-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-management-menu__entry-card span {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.builder-management-menu__empty {
		border-style: dashed;
		background: rgba(255, 255, 255, 0.025);
	}

	.builder-management-menu__warning-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.builder-management-menu__warning-list li {
		padding: 8px 10px;
		border: 1px solid rgba(245, 158, 11, 0.22);
		border-radius: var(--builder-shell-radius-lg);
		background: rgba(245, 158, 11, 0.09);
		color: #fde68a;
	}

	.builder-management-menu :global(.builder-shell-card),
	.builder-management-menu :global(.assignment-panel__item),
	.builder-management-menu :global(.assignment-panel__group-item),
	.builder-management-menu :global(.component-panel__item) {
		border-color: var(--builder-shell-dark-border);
		background: rgba(255, 255, 255, 0.035);
		color: var(--builder-shell-toolbar-text);
	}

	.builder-management-menu :global(.builder-shell-card--subtle),
	.builder-management-menu :global(.assignment-panel__group),
	.builder-management-menu :global(.component-panel__focus) {
		background: rgba(12, 13, 14, 0.38);
	}

	.builder-management-menu :global(.builder-shell-button) {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: var(--builder-shell-toolbar-text);
	}

	.builder-management-menu :global(.builder-shell-button--primary) {
		border-color: rgba(208, 4, 212, 0.42);
		background: rgba(208, 4, 212, 0.18);
		color: #ffffff;
	}

	.builder-management-menu :global(.builder-shell-button--danger) {
		border-color: rgba(220, 38, 38, 0.42);
		background: rgba(220, 38, 38, 0.16);
		color: #fecaca;
	}

	@media (max-width: 760px) {
		.builder-management-menu--workspace {
			padding: 8px;
		}

		.builder-management-menu__card-header,
		.builder-management-menu__stats,
		.builder-management-menu__entry-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
