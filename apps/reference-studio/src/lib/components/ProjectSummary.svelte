<script lang="ts">
	import { getDocumentRevisions } from '@builder/core';
	import type { BuilderEditorController } from '@builder/editor-svelte';
	import type { ElementorImportWarning, ElementorParityGapReport } from '@builder/elementor-import';
	import type { BuilderDocument, BuilderNode, EditorMode, ThemeAssignment } from '@builder/schema';

	type SiteEditorEntry = {
		id: string;
		label: string;
		route: string;
		templateType: string;
		documentId: string;
		slot: string;
	};

	type PreviewPreset = {
		id: string;
		label: string;
		pathname: string;
		query: string;
	};

	export let editor: BuilderEditorController;
	export let importWarnings: ElementorImportWarning[] = [];
	export let siteEditorEntries: SiteEditorEntry[] = [];
	export let previewPresets: PreviewPreset[] = [];

	$: editorState = $editor;
	$: project = editorState.project;
	$: activeDocument = project.documents.find( ( document ) => document.id === editorState.activeDocumentId );
	$: activeSession = editorState.documentSessions[ editorState.activeDocumentId ];
	$: activePreviewPath = editorState.ui.preview.pathname || previewPresets[ 0 ]?.pathname || '/';
	$: activePreviewQuery = editorState.ui.preview.query || previewPresets[ 0 ]?.query || '';
	$: activeQueryParams = new URLSearchParams( activePreviewQuery );
	$: activePreviewPanel = activeQueryParams.get( 'siteEditor' ) ?? '';
	$: activeSiteEntryId = editorState.ui.siteEditor.activeEntryId;
	$: componentEditing = editorState.ui.componentEditing;
	$: kindGroups = buildKindGroups( project.documents );
	$: assignmentGroups = buildAssignmentGroups( project.themeAssignments );
	$: activeRevisions = activeDocument ? getDocumentRevisions( project, activeDocument.id ) : [];
	$: componentDocuments = project.documents.filter( ( document ) => document.kind === 'component' );
	$: libraryDocuments = project.documents.filter( ( document ) => document.kind === 'library-item' );
	$: parityGapReports = readParityGapReports( project.meta );
	$: diagnosticGroups = buildDiagnosticGroups( importWarnings );

	type BrowserGroup = {
		label: string;
		description: string;
		items: BuilderDocument[];
	};

	type DiagnosticGroup = {
		label: string;
		items: ElementorImportWarning[];
	};

	function buildKindGroups( documents: BuilderDocument[] ): BrowserGroup[] {
		const order: BuilderDocument['kind'][] = [ 'page', 'layout', 'template', 'component', 'popup', 'kit', 'library-item' ];
		return order.map( ( kind ) => {
			const items = documents.filter( ( document ) => document.kind === kind );
			return {
				label: kind,
				description: describeKind( kind, items.length ),
				items,
			};
		} ).filter( ( group ) => group.items.length );
	}

	function buildAssignmentGroups( assignments: ThemeAssignment[] ): Array<{ slot: ThemeAssignment['slot']; items: ThemeAssignment[] }> {
		const order: ThemeAssignment['slot'][] = [ 'page', 'header', 'footer', 'sidebar', 'popup', 'modal', 'loop-item', 'empty' ];
		return order.map( ( slot ) => ( {
			slot,
			items: assignments
				.filter( ( assignment ) => assignment.slot === slot )
				.sort( ( left, right ) => right.priority - left.priority ),
		} ) ).filter( ( group ) => group.items.length );
	}

	function buildDiagnosticGroups( warnings: ElementorImportWarning[] ): DiagnosticGroup[] {
		const byCode = new Map<string, ElementorImportWarning[]>();
		for ( const warning of warnings ) {
			const bucket = byCode.get( warning.code ) ?? [];
			bucket.push( warning );
			byCode.set( warning.code, bucket );
		}

		return [ ...byCode.entries() ].map( ( [ label, items ] ) => ( { label, items } ) );
	}

	function containsCompatNode( nodes: BuilderNode[] ): boolean {
		for ( const node of nodes ) {
			if ( node.type === 'compat-widget' || node.legacy ) {
				return true;
			}
			if ( containsCompatNode( node.children ) ) {
				return true;
			}
			for ( const slotNodes of Object.values( node.slots ) as BuilderNode[][] ) {
				if ( containsCompatNode( slotNodes ) ) {
					return true;
				}
			}
		}

		return false;
	}

	function inferDocumentMode( document: BuilderDocument ): string {
		if ( document.kind === 'component' ) {
			return 'component-master';
		}

		if ( document.kind === 'kit' ) {
			return 'site-settings';
		}

		if ( document.kind === 'library-item' ) {
			return 'library';
		}

		if ( containsCompatNode( document.root ) ) {
			return 'legacy-compat';
		}

		return document.kind;
	}

	function resolveOpenMode( document: BuilderDocument ): EditorMode {
		const mode = inferDocumentMode( document );
		switch ( mode ) {
			case 'layout':
				return 'layout';
			case 'template':
				return 'template';
			case 'component-master':
				return 'component-master';
			case 'popup':
				return 'popup';
			case 'legacy-compat':
				return 'legacy-compat';
			default:
				return 'page';
		}
	}

	function describeKind( kind: BuilderDocument['kind'], count: number ): string {
		switch ( kind ) {
			case 'page':
				return `${ count } authored page${ count === 1 ? '' : 's' }`;
			case 'layout':
				return `${ count } reusable layout${ count === 1 ? '' : 's' }`;
			case 'template':
				return `${ count } route template${ count === 1 ? '' : 's' }`;
			case 'component':
				return `${ count } component master${ count === 1 ? '' : 's' }`;
			case 'popup':
				return `${ count } popup or modal${ count === 1 ? '' : 's' }`;
			case 'kit':
				return `${ count } site kit${ count === 1 ? '' : 's' }`;
			case 'library-item':
				return `${ count } library item${ count === 1 ? '' : 's' }`;
		}
	}

	function readParityGapReports( meta: Record<string, unknown> ): ElementorParityGapReport[] {
		const importBridge = meta.importBridge;
		if ( !importBridge || typeof importBridge !== 'object' || Array.isArray( importBridge ) ) {
			return [];
		}

		const parityGaps = ( importBridge as Record<string, unknown> ).parityGaps;
		if ( !parityGaps || typeof parityGaps !== 'object' || Array.isArray( parityGaps ) ) {
			return [];
		}

		return Object.values( parityGaps as Record<string, ElementorParityGapReport> );
	}

	function findDocument( documentId: string ): BuilderDocument | undefined {
		return project.documents.find( ( document ) => document.id === documentId );
	}

	function countComponentUsage( componentId: string ): number {
		return project.documents.reduce( ( total, document ) => total + countComponentUsageInNodes( document.root, componentId ), 0 );
	}

	function countComponentUsageInNodes( nodes: BuilderNode[], componentId: string ): number {
		let total = 0;
		for ( const node of nodes ) {
			if ( node.type === 'component-instance' && node.props.componentId === componentId ) {
				total += 1;
			}
			total += countComponentUsageInNodes( node.children, componentId );
			for ( const slotNodes of Object.values( node.slots ) as BuilderNode[][] ) {
				total += countComponentUsageInNodes( slotNodes, componentId );
			}
		}

		return total;
	}

	function getComponentConsumerTitles( componentId: string ): string[] {
		const consumers = project.documents
			.filter( ( document ) => countComponentUsageInNodes( document.root, componentId ) > 0 )
			.map( ( document ) => document.title );
		return consumers.slice( 0, 3 );
	}

	function findPreferredAssignment( documentId: string ): ThemeAssignment | undefined {
		return project.themeAssignments
			.filter( ( assignment ) => assignment.documentId === documentId )
			.sort( ( left, right ) => {
				if ( left.status !== right.status ) {
					return left.status === 'published' ? -1 : 1;
				}
				return right.priority - left.priority;
			} )[ 0 ];
	}

	function materializePreviewPath( pathname?: string ): string {
		const fallback = previewPresets[ 0 ]?.pathname || '/marketing-landing';
		if ( !pathname ) {
			return fallback;
		}

		if ( pathname === '/[...all]' || pathname === '/(.*)' ) {
			return fallback;
		}

		return pathname
			.replace( '[...all]', 'marketing-landing' )
			.replace( '[...slug]', 'post-one' )
			.replace( '[slug]', 'preview' );
	}

	function buildPreviewQuery( slot?: ThemeAssignment['slot'], panel?: string ): string {
		const query = new URLSearchParams();
		if ( panel ) {
			query.set( 'siteEditor', panel );
		}
		if ( slot === 'popup' ) {
			query.set( 'preview', '1' );
		}
		if ( slot === 'modal' ) {
			query.set( 'modal', '1' );
		}
		return query.toString();
	}

	function applyPreviewContext( pathname: string, query: string, context: Partial<typeof editorState.ui.preview> = {} ) {
		editor.setPreviewContext( {
			pathname,
			query,
			...context,
		} );
	}

	function openDocument( document: BuilderDocument ) {
		editor.openDocument( document.id, { mode: resolveOpenMode( document ) } );
	}

	function openSiteEditorEntry( entry: SiteEditorEntry ) {
		const document = findDocument( entry.documentId );
		if ( !document ) {
			return;
		}

		const assignment = findPreferredAssignment( document.id );
		editor.openDocument( document.id, {
			mode: resolveOpenMode( document ),
			pathname: materializePreviewPath( assignment?.pathname ),
			query: buildPreviewQuery( assignment?.slot, entry.id ),
			slot: assignment?.slot,
			assignmentId: assignment?.id,
			siteEntryId: entry.id,
			source: 'site-entry',
		} );
	}

	function previewSiteEditorEntry( entry: SiteEditorEntry ) {
		const assignment = findPreferredAssignment( entry.documentId );
		editor.setSiteEditorEntry( entry.id );
		applyPreviewContext( materializePreviewPath( assignment?.pathname ), buildPreviewQuery( assignment?.slot, entry.id ), {
			documentId: entry.documentId,
			slot: assignment?.slot,
			assignmentId: assignment?.id,
			source: 'site-entry',
		} );
	}

	function applyPreset( preset: PreviewPreset ) {
		applyPreviewContext( preset.pathname, preset.query, {
			source: 'manual',
		} );
	}

	function openAssignment( assignment: ThemeAssignment ) {
		const document = findDocument( assignment.documentId );
		if ( !document ) {
			return;
		}

		editor.openDocument( document.id, {
			mode: resolveOpenMode( document ),
			pathname: materializePreviewPath( assignment.pathname ),
			query: buildPreviewQuery( assignment.slot, 'assignments' ),
			slot: assignment.slot,
			assignmentId: assignment.id,
			source: 'assignment',
		} );
	}

	function previewAssignment( assignment: ThemeAssignment ) {
		applyPreviewContext( materializePreviewPath( assignment.pathname ), buildPreviewQuery( assignment.slot, 'assignments' ), {
			documentId: assignment.documentId,
			slot: assignment.slot,
			assignmentId: assignment.id,
			source: 'assignment',
		} );
	}

	async function restoreRevision( revisionId: string ) {
		if ( !activeDocument ) {
			return;
		}

		editor.openDocument( activeDocument.id, {
			mode: resolveOpenMode( activeDocument ),
			pathname: activePreviewPath,
			query: activePreviewQuery,
			slot: editorState.ui.preview.slot,
			assignmentId: editorState.ui.preview.assignmentId,
			siteEntryId: activeSiteEntryId,
			source: editorState.ui.preview.source,
			openRevisionBrowser: true,
			selectedRevisionId: revisionId,
		} );
		await editor.restoreRevision( revisionId, activeDocument.id );
	}

	function formatDate( value?: string ): string {
		if ( !value ) {
			return 'Not yet';
		}

		return new Date( value ).toLocaleString( 'en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		} );
	}

	function getRevisionLabel( revision: { label?: string; createdAt?: string } ): string {
		return `${ revision.label ?? 'Revision' } - ${ formatDate( revision.createdAt ) }`;
	}

	function getAssignmentPath( assignment: ThemeAssignment ): string {
		if ( assignment.pathname ) {
			return assignment.pathname;
		}

		return assignment.conditionGroups.length ? `${ assignment.conditionGroups.length } condition group(s)` : 'No pathname';
	}
</script>

<section class="summary" aria-labelledby="site-editor-shell-title">
	<header class="summary__head">
		<div>
			<p class="summary__eyebrow">Site Editor</p>
			<h2 id="site-editor-shell-title">Builder controls</h2>
			<p class="summary__lede">Open documents in the right mode, switch preview context, and manage revisions without leaving the canvas.</p>
		</div>
		<div class="summary__head-meta" aria-label="Editor state">
			<span class="summary__state-pill">{editorState.ui.saveState}</span>
			<strong>{activeDocument?.title ?? 'No active document'}</strong>
			<span>{editorState.ui.mode} mode</span>
		</div>
	</header>

	<section class="summary__section" aria-labelledby="site-editor-rail-title">
		<div class="summary__section-head">
			<div>
				<p class="summary__section-kicker">Navigation</p>
				<h3 id="site-editor-rail-title">Site-editor entries</h3>
			</div>
			<span class="summary__count-badge">{siteEditorEntries.length}</span>
		</div>
		<div class="summary__context-grid">
			<div class="summary__context-card">
				<strong>Preview path</strong>
				<span>{activePreviewPath}</span>
			</div>
			<div class="summary__context-card">
				<strong>Preview query</strong>
				<span>{activePreviewQuery || 'No preview query'}</span>
			</div>
			<div class="summary__context-card">
				<strong>Active panel</strong>
				<span>{activeSiteEntryId || activePreviewPanel || 'Not set'}</span>
			</div>
			<div class="summary__context-card">
				<strong>Project scale</strong>
				<span>{project.documents.length} docs · {project.themeAssignments.length} assignments</span>
			</div>
		</div>
		<div class="summary__entry-list">
			{#each siteEditorEntries as entry}
				<article class:summary__item--active={activeDocument?.id === entry.documentId || activeSiteEntryId === entry.id || activePreviewPanel === entry.id} class="summary__item">
					<div class="summary__item-head">
						<strong>{entry.label}</strong>
						<div class="summary__tag-row">
							<span class="summary__tag">{entry.slot}</span>
							<span class="summary__tag summary__tag--muted">{entry.templateType}</span>
						</div>
					</div>
					<span class="summary__item-meta">{entry.route}</span>
					<div class="summary__button-row">
						<button type="button" on:click={() => openSiteEditorEntry( entry )}>Open</button>
						<button type="button" class="summary__ghost-button" on:click={() => previewSiteEditorEntry( entry )}>Preview</button>
					</div>
				</article>
			{/each}
		</div>
		<div class="summary__chip-row">
			{#each previewPresets as preset}
				<button
					type="button"
					class:summary__chip-button--active={activePreviewPath === preset.pathname && activePreviewQuery === preset.query}
					class="summary__chip-button"
					on:click={() => applyPreset( preset )}
				>
					<strong>{preset.label}</strong>
					<span>{preset.pathname}</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="summary__section" aria-labelledby="browser-by-kind-title">
		<div class="summary__section-head">
			<div>
				<p class="summary__section-kicker">Documents</p>
				<h3 id="browser-by-kind-title">Open by document type</h3>
			</div>
			<span class="summary__count-badge">{project.documents.length}</span>
		</div>
		<div class="summary__group-stack">
			{#each kindGroups as group}
				<article class="summary__group">
					<div class="summary__group-head">
						<strong>{group.label}</strong>
						<span class="summary__count-badge">{group.items.length}</span>
					</div>
					<p class="summary__group-desc">{group.description}</p>
					<div class="summary__item-list">
						{#each group.items as document}
							<div class:summary__item--active={document.id === activeDocument?.id} class="summary__item">
								<div class="summary__item-head">
									<strong>{document.title}</strong>
									<span class="summary__tag summary__tag--muted">{inferDocumentMode( document )}</span>
								</div>
								<span class="summary__item-meta">{document.slug}</span>
								<div class="summary__button-row">
									<button type="button" on:click={() => openDocument( document )}>Open</button>
									{#if findPreferredAssignment( document.id )}
										<button type="button" class="summary__ghost-button" on:click={() => previewAssignment( findPreferredAssignment( document.id )! )}>Preview route</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="summary__section" aria-labelledby="assignment-board-title">
		<div class="summary__section-head">
			<div>
				<p class="summary__section-kicker">Assignments</p>
				<h3 id="assignment-board-title">Theme assignment board</h3>
			</div>
			<span class="summary__count-badge">{project.themeAssignments.length}</span>
		</div>
		<div class="summary__group-stack">
			{#each assignmentGroups as group}
				<article class="summary__group">
					<div class="summary__group-head">
						<strong>{group.slot}</strong>
						<span class="summary__count-badge">{group.items.length}</span>
					</div>
					<div class="summary__item-list">
						{#each group.items as assignment}
							<div class="summary__item">
								<div class="summary__item-head">
									<strong>{assignment.label ?? findDocument( assignment.documentId )?.title ?? assignment.documentId}</strong>
									<span class="summary__tag summary__tag--muted">{assignment.status}</span>
								</div>
								<span class="summary__item-meta">{getAssignmentPath( assignment )}</span>
								<span class="summary__item-meta">Priority {assignment.priority}</span>
								<div class="summary__button-row">
									<button type="button" on:click={() => openAssignment( assignment )}>Open</button>
									<button type="button" class="summary__ghost-button" on:click={() => previewAssignment( assignment )}>Preview</button>
								</div>
							</div>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="summary__section" aria-labelledby="revision-control-title">
		<div class="summary__section-head">
			<div>
				<p class="summary__section-kicker">Lifecycle</p>
				<h3 id="revision-control-title">Save, publish, restore</h3>
			</div>
			<span class="summary__count-badge">{activeRevisions.length}</span>
		</div>
		<div class="summary__status-grid">
			<div class="summary__context-card">
				<strong>{editorState.ui.saveState}</strong>
				<span>Current save state</span>
			</div>
			<div class="summary__context-card">
				<strong>{formatDate( activeSession?.lastDraftAt )}</strong>
				<span>Last draft</span>
			</div>
			<div class="summary__context-card">
				<strong>{formatDate( activeSession?.lastAutosaveAt )}</strong>
				<span>Last autosave</span>
			</div>
			<div class="summary__context-card">
				<strong>{formatDate( activeSession?.lastPublishedAt )}</strong>
				<span>Last publish</span>
			</div>
		</div>
		<div class="summary__button-row">
			<button type="button" on:click={() => editor.saveDraft()}>Save draft</button>
			<button type="button" on:click={() => editor.publish()}>Publish</button>
			<button
				type="button"
				class="summary__ghost-button"
				on:click={() => {
					if ( activeDocument ) {
						editor.openDocument( activeDocument.id, {
							mode: resolveOpenMode( activeDocument ),
							pathname: activePreviewPath,
							query: activePreviewQuery,
							slot: editorState.ui.preview.slot,
							assignmentId: editorState.ui.preview.assignmentId,
							siteEntryId: activeSiteEntryId,
							source: editorState.ui.preview.source,
							openRevisionBrowser: true,
							selectedRevisionId: editorState.ui.revisions.selectedRevisionId,
						} );
					}
				}}
			>
				{editorState.ui.revisions.panelOpen ? 'Revision browser open' : 'Open revisions'}
			</button>
		</div>
		<div class="summary__item-list">
			{#each activeRevisions as revision}
				<article class="summary__item">
					<div class="summary__item-head">
						<strong>{getRevisionLabel( revision )}</strong>
						<span class="summary__tag summary__tag--muted">{revision.kind}</span>
					</div>
					<span class="summary__item-meta">{findDocument( revision.documentId )?.title ?? revision.documentId}</span>
					<div class="summary__button-row">
						<button type="button" class="summary__ghost-button" on:click={() => void restoreRevision( revision.id )}>Restore</button>
					</div>
				</article>
			{/each}
			{#if !activeRevisions.length}
				<div class="summary__empty">No revisions yet for the active document.</div>
			{/if}
		</div>
	</section>

	<section class="summary__section" aria-labelledby="reusable-assets-title">
		<div class="summary__section-head">
			<div>
				<p class="summary__section-kicker">Reusable assets</p>
				<h3 id="reusable-assets-title">Components, library, diagnostics</h3>
			</div>
			<span class="summary__count-badge">{componentDocuments.length + libraryDocuments.length + importWarnings.length + parityGapReports.length}</span>
		</div>

		<div class="summary__subsection">
			<div class="summary__group-head">
				<strong>Component context</strong>
				<span class="summary__count-badge">{componentDocuments.length}</span>
			</div>
			<div class="summary__context-card">
				<strong>{componentEditing.context ?? 'No component instance selected'}</strong>
				<span>{componentEditing.componentDocumentId ? findDocument( componentEditing.componentDocumentId )?.title ?? componentEditing.componentDocumentId : 'Select a component instance or master to edit this flow.'}</span>
				<div class="summary__button-row">
					<button type="button" class="summary__ghost-button" on:click={() => editor.detachComponentInstance()} disabled={componentEditing.context !== 'instance'}>Detach</button>
					<button
						type="button"
						class="summary__ghost-button"
						on:click={() => editor.relinkComponentInstance( undefined, componentEditing.componentDocumentId )}
						disabled={!componentEditing.componentDocumentId || componentEditing.context === 'master'}
					>
						Relink
					</button>
				</div>
			</div>
			<div class="summary__item-list">
				{#each componentDocuments as document}
					<div class="summary__item">
						<div class="summary__item-head">
							<strong>{document.title}</strong>
							<span class="summary__tag summary__tag--muted">{countComponentUsage( document.id )} instance(s)</span>
						</div>
						<span class="summary__item-meta">{document.component?.exposedProperties.length ?? 0} exposed override(s)</span>
						{#if getComponentConsumerTitles( document.id ).length}
							<span class="summary__item-meta">Used in {getComponentConsumerTitles( document.id ).join( ', ' )}</span>
						{/if}
						<div class="summary__button-row">
							<button type="button" on:click={() => openDocument( document )}>Open master</button>
							<button type="button" class="summary__ghost-button" on:click={() => editor.insertComponentInstance( document.id )}>Insert</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="summary__subsection">
			<div class="summary__group-head">
				<strong>Library</strong>
				<span class="summary__count-badge">{libraryDocuments.length}</span>
			</div>
			<div class="summary__item-list">
				{#each libraryDocuments as document}
					<div class="summary__item">
						<div class="summary__item-head">
							<strong>{document.title}</strong>
							<span class="summary__tag summary__tag--muted">{document.slug}</span>
						</div>
						<div class="summary__button-row">
							<button type="button" on:click={() => openDocument( document )}>Open</button>
							<button type="button" class="summary__ghost-button" on:click={() => editor.insertLibraryItem( document.id )}>Insert</button>
						</div>
					</div>
				{/each}
				{#if !libraryDocuments.length}
					<div class="summary__empty">No library items available.</div>
				{/if}
			</div>
		</div>

		<div class="summary__subsection">
			<div class="summary__group-head">
				<strong>Import diagnostics</strong>
				<span class="summary__count-badge">{importWarnings.length + parityGapReports.length}</span>
			</div>
			<div class="summary__item-list">
				{#each diagnosticGroups as group}
					<div class="summary__item">
						<div class="summary__item-head">
							<strong>{group.label}</strong>
							<span class="summary__tag summary__tag--muted">{group.items.length} warning(s)</span>
						</div>
						<span class="summary__item-meta">{group.items[ 0 ]?.message}</span>
					</div>
				{/each}
				{#each parityGapReports as report}
					<div class="summary__item">
						<div class="summary__item-head">
							<strong>{report.documentTitle}</strong>
							<span class="summary__tag summary__tag--muted">{report.widgetType}</span>
						</div>
						<span class="summary__item-meta">{report.count} parity gap(s)</span>
						<div class="summary__button-row">
							<button
								type="button"
								class="summary__ghost-button"
								on:click={() => {
									const document = findDocument( report.documentId );
									if ( document ) {
										openDocument( document );
									}
								}}
							>
								Open source
							</button>
						</div>
					</div>
				{/each}
				{#if !diagnosticGroups.length && !parityGapReports.length}
					<div class="summary__empty">No import diagnostics present.</div>
				{/if}
			</div>
		</div>
	</section>
</section>

<style>
	.summary {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 1rem;
		border: 1px solid #cfd7e3;
		background: #ffffff;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
		max-height: calc(100vh - 1.5rem);
		overflow: auto;
	}

	.summary__head,
	.summary__section,
	.summary__subsection {
		display: grid;
		gap: 0.75rem;
	}

	.summary__head {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.summary__head-meta {
		display: grid;
		justify-items: end;
		gap: 0.2rem;
		text-align: right;
	}

	.summary__eyebrow,
	.summary__section-kicker {
		margin: 0 0 0.2rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #5a677a;
		font-size: 0.72rem;
		font-weight: 600;
	}

	.summary h2,
	.summary h3,
	.summary p {
		margin: 0;
	}

	.summary h2 {
		font-size: 1.05rem;
	}

	.summary h3 {
		font-size: 0.95rem;
	}

	.summary__lede {
		margin-top: 0.35rem;
		color: #5a677a;
		font-size: 0.88rem;
	}

	.summary__state-pill,
	.summary__tag,
	.summary__count-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		font-size: 0.72rem;
		line-height: 1.2;
	}

	.summary__state-pill {
		border: 1px solid #d8e0ea;
		background: #f1f5f9;
		color: #1e293b;
	}

	.summary__tag {
		border: 1px solid #dbe3ef;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.summary__tag--muted,
	.summary__count-badge {
		background: #f8fafc;
		color: #516074;
	}

	.summary__section {
		padding: 0.8rem;
		border-radius: 0.85rem;
		border: 1px solid #dce4ee;
		background: #fbfcfe;
	}

	.summary__section-head,
	.summary__group-head,
	.summary__item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.summary__tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		justify-content: flex-start;
	}

	.summary__context-grid,
	.summary__status-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6rem;
	}

	.summary__context-card,
	.summary__group,
	.summary__item,
	.summary__subsection {
		display: grid;
		gap: 0.35rem;
		padding: 0.75rem;
		border-radius: 0.75rem;
		background: #f8fafc;
		border: 1px solid #dbe3ef;
	}

	.summary__context-card span,
	.summary__group-desc,
	.summary__item-meta,
	.summary__head-meta span {
		color: #5a677a;
		font-size: 0.84rem;
	}

	.summary__entry-list,
	.summary__group-stack,
	.summary__item-list,
	.summary__chip-row {
		display: grid;
		gap: 0.6rem;
	}

	.summary__item--active {
		border-color: #7aa2ff;
		background: #f3f7ff;
		box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
	}

	.summary__button-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.summary__chip-row {
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	}

	.summary__chip-button,
	button {
		appearance: none;
		border: 1px solid #d5dde8;
		border-radius: 0.65rem;
		padding: 0.55rem 0.7rem;
		font: inherit;
		cursor: pointer;
		transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
		background: #ffffff;
		color: #132033;
	}

	.summary__chip-button {
		display: grid;
		gap: 0.2rem;
		text-align: left;
	}

	button:hover,
	.summary__chip-button:hover {
		border-color: #a9b9cd;
		background: #f8fafc;
	}

	.summary__chip-button span {
		color: #5a677a;
	}

	.summary__chip-button--active {
		border-color: #7aa2ff;
		background: #eff6ff;
	}

	.summary__ghost-button {
		background: #f8fafc;
		color: #35507a;
	}

	.summary__empty {
		padding: 0.75rem;
		border-radius: 0.7rem;
		border: 1px dashed #c8d2df;
		color: #5a677a;
		background: #ffffff;
	}

	@media (max-width: 1100px) {
		.summary__head,
		.summary__context-grid,
		.summary__status-grid {
			grid-template-columns: 1fr;
		}

		.summary__head-meta {
			justify-items: start;
			text-align: left;
		}
	}

	@media (max-width: 720px) {
		.summary {
			padding: 0.7rem;
			max-height: none;
		}
	}
</style>
