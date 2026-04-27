<script lang="ts">
	import type { BuilderDocument, ThemeAssignment } from '@builder/schema';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';

	export let activeDocument: BuilderDocument;
	export let projectAssignments: ThemeAssignment[] = [];
	export let documentsById: Map<string, BuilderDocument> = new Map();
	export let activeEntryId: string | undefined = undefined;
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

	let draftSlot: ThemeAssignment['slot'] = inferAssignmentSlot( activeDocument );
	let draftPathname = inferAssignmentPathname( activeDocument, draftSlot );
	let draftPriority = 0;
	let draftStatus: ThemeAssignment['status'] = activeDocument.status === 'published' ? 'published' : 'draft';
	let draftRoutePattern = draftPathname ?? '';

	$: if ( activeDocument.id ) {
		draftSlot = inferAssignmentSlot( activeDocument );
		draftPathname = inferAssignmentPathname( activeDocument, draftSlot );
		draftStatus = activeDocument.status === 'published' ? 'published' : 'draft';
		draftRoutePattern = draftPathname ?? '';
	}

	$: activeAssignments = projectAssignments.filter( ( assignment ) => assignment.documentId === activeDocument.id );
	$: groupedAssignments = [ ...groupAssignments( projectAssignments ).entries() ];

	function groupAssignments( assignments: ThemeAssignment[] ) {
		return assignments.reduce( ( grouped, assignment ) => {
			const bucket = grouped.get( assignment.slot ) ?? [];
			bucket.push( assignment );
			grouped.set( assignment.slot, bucket.sort( ( left, right ) => right.priority - left.priority ) );
			return grouped;
		}, new Map<ThemeAssignment['slot'], ThemeAssignment[]>() );
	}

	function inferAssignmentSlot( document: BuilderDocument ): ThemeAssignment['slot'] {
		const title = `${document.title} ${document.slug}`.toLowerCase();
		if ( document.kind === 'popup' ) {
			return 'popup';
		}
		if ( title.includes( 'footer' ) ) {
			return 'footer';
		}
		if ( title.includes( 'sidebar' ) ) {
			return 'sidebar';
		}
		if ( title.includes( 'modal' ) ) {
			return 'modal';
		}
		if ( title.includes( 'loop' ) || title.includes( 'archive item' ) ) {
			return 'loop-item';
		}
		if ( title.includes( 'empty' ) ) {
			return 'empty';
		}
		if ( document.kind === 'layout' ) {
			return 'header';
		}
		return 'page';
	}

	function inferAssignmentPathname( document: BuilderDocument, slot: ThemeAssignment['slot'] ): string | undefined {
		if ( slot === 'page' ) {
			return `/${document.slug}`;
		}
		if ( slot === 'popup' || slot === 'modal' ) {
			return undefined;
		}
		return '/[...all]';
	}

	function createAssignment() {
		onCreateAssignment( {
			slot: draftSlot,
			pathname: draftPathname || undefined,
			priority: draftPriority,
			status: draftStatus,
			routePattern: draftRoutePattern || undefined,
		} );
	}

	function getDocumentLabel( assignment: ThemeAssignment ) {
		const document = documentsById.get( assignment.documentId );
		return document ? document.title : assignment.documentId;
	}

	function getAssignmentEntryId( assignment: ThemeAssignment ) {
		return `assignment:${ assignment.id }`;
	}
</script>

<EditorShellTokens>
	<section class="assignment-panel">
		<div class="assignment-panel__header">
			<div class="assignment-panel__heading">
				<span class="builder-shell-icon-badge">
					<EditorShellIcon name="assignment" title="Assignments" />
				</span>
				<div>
					<h2>Assignments</h2>
					<p>Browse route and slot coverage, then compose a new assignment for the active document.</p>
				</div>
			</div>
			<span class="builder-shell-badge">{projectAssignments.length} total</span>
		</div>

		<div class="assignment-panel__composer builder-shell-card builder-shell-card--subtle">
			<h3>Create for {activeDocument.title}</h3>
			<div class="assignment-panel__composer-grid">
				<label class="builder-shell-field">
					<span>Slot</span>
					<select class="builder-shell-select" bind:value={draftSlot}>
						<option value="page">page</option>
						<option value="header">header</option>
						<option value="footer">footer</option>
						<option value="sidebar">sidebar</option>
						<option value="popup">popup</option>
						<option value="modal">modal</option>
						<option value="loop-item">loop-item</option>
						<option value="empty">empty</option>
					</select>
				</label>
				<label class="builder-shell-field">
					<span>Pathname</span>
					<input class="builder-shell-input" bind:value={draftPathname} placeholder="/[...all]" />
				</label>
				<label class="builder-shell-field">
					<span>Priority</span>
					<input class="builder-shell-input" type="number" bind:value={draftPriority} />
				</label>
				<label class="builder-shell-field">
					<span>Status</span>
					<select class="builder-shell-select" bind:value={draftStatus}>
						<option value="draft">draft</option>
						<option value="published">published</option>
						<option value="archived">archived</option>
					</select>
				</label>
				<label class="builder-shell-field assignment-panel__composer-wide">
					<span>Route pattern</span>
					<input class="builder-shell-input" bind:value={draftRoutePattern} placeholder="/blog/[slug]" />
				</label>
			</div>
			<button class="builder-shell-button builder-shell-button--primary" type="button" onclick={createAssignment}>Create Assignment</button>
		</div>

		{#if activeAssignments.length}
			<div class="assignment-panel__active builder-shell-card builder-shell-card--subtle">
				<h3>Active Document Coverage</h3>
				<div class="assignment-panel__list">
					{#each activeAssignments as assignment (assignment.id)}
						<article class:active={activeEntryId === getAssignmentEntryId( assignment )} class="assignment-panel__item builder-shell-card">
							<div class="assignment-panel__item-meta">
								<strong>{assignment.slot}</strong>
								<small>{assignment.pathname ?? 'No fixed pathname'}</small>
							</div>
							<div class="assignment-panel__item-edit">
								<label class="builder-shell-field">
									<span>Priority</span>
									<input
										class="builder-shell-input"
										type="number"
										value={String( assignment.priority )}
										oninput={(event) => onUpdateAssignment( assignment, { priority: Number( ( event.currentTarget as HTMLInputElement ).value ) || 0 } )}
									/>
								</label>
								<label class="builder-shell-field">
									<span>Status</span>
									<select class="builder-shell-select" value={assignment.status} onchange={(event) => onUpdateAssignment( assignment, { status: ( event.currentTarget as HTMLSelectElement ).value as ThemeAssignment['status'] } )}>
										<option value="draft">draft</option>
										<option value="published">published</option>
										<option value="archived">archived</option>
									</select>
								</label>
								<label class="builder-shell-field">
									<span>Pattern</span>
									<input
										class="builder-shell-input"
										value={String( assignment.conditionGroups[0]?.rules[0]?.value ?? '' )}
										oninput={(event) => onUpdateAssignmentRoutePattern( assignment, ( event.currentTarget as HTMLInputElement ).value )}
									/>
								</label>
							</div>
							<div class="assignment-panel__actions">
								<button class="builder-shell-button" type="button" onclick={() => onPreviewAssignment( assignment )}>Preview</button>
								<button class="builder-shell-button builder-shell-button--primary" type="button" onclick={() => onOpenAssignment( assignment )}>Open</button>
								<button class="builder-shell-button builder-shell-button--danger" type="button" onclick={() => onDeleteAssignment( assignment.id )}>Delete</button>
							</div>
						</article>
					{/each}
				</div>
			</div>
		{/if}

		<div class="assignment-panel__groups">
			{#each groupedAssignments as [ slotName, assignments ] (slotName)}
				<section class="assignment-panel__group builder-shell-card builder-shell-card--subtle">
					<header>
						<h3>{slotName}</h3>
						<span class="builder-shell-badge builder-shell-badge--neutral">{assignments.length}</span>
					</header>
					{#each assignments as assignment (assignment.id)}
						<article class:active={activeEntryId === getAssignmentEntryId( assignment )} class="assignment-panel__group-item builder-shell-card">
							<div>
								<strong>{getDocumentLabel( assignment )}</strong>
								<small>{assignment.pathname ?? assignment.conditionGroups[0]?.rules[0]?.value ?? 'Conditional only'}</small>
							</div>
							<div class="assignment-panel__actions">
								<button class="builder-shell-button" type="button" onclick={() => onPreviewAssignment( assignment )}>Preview</button>
								<button class="builder-shell-button builder-shell-button--primary" type="button" onclick={() => onOpenAssignment( assignment )}>Open</button>
							</div>
						</article>
					{/each}
				</section>
			{/each}
		</div>
	</section>
</EditorShellTokens>

<style>
	.assignment-panel {
		display: grid;
		gap: var(--builder-shell-space-16);
	}

	.assignment-panel__header,
	.assignment-panel__heading,
	.assignment-panel__group header,
	.assignment-panel__item,
	.assignment-panel__group-item {
		display: flex;
		gap: var(--builder-shell-space-16);
		align-items: start;
	}

	.assignment-panel__header,
	.assignment-panel__group header,
	.assignment-panel__item,
	.assignment-panel__group-item {
		justify-content: space-between;
	}

	.assignment-panel__heading {
		flex: 1;
	}

	.assignment-panel__header h2,
	.assignment-panel__header p,
	.assignment-panel__group h3,
	.assignment-panel__group span,
	.assignment-panel__group-item strong,
	.assignment-panel__group-item small,
	.assignment-panel__item-meta strong,
	.assignment-panel__item-meta small {
		margin: 0;
	}

	.assignment-panel__header p,
	.assignment-panel__group-item small,
	.assignment-panel__item-meta small {
		color: var(--builder-shell-text-muted);
	}

	.assignment-panel__composer,
	.assignment-panel__active,
	.assignment-panel__group {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.assignment-panel__composer h3,
	.assignment-panel__active h3 {
		margin: 0;
	}

	.assignment-panel__composer-grid,
	.assignment-panel__item-edit {
		display: grid;
		grid-template-columns: repeat( 4, minmax( 0, 1fr ) );
		gap: var(--builder-shell-space-12);
	}

	.assignment-panel__composer-wide {
		grid-column: 1 / -1;
	}

	.assignment-panel__list,
	.assignment-panel__groups {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	.assignment-panel__item,
	.assignment-panel__group-item {
		padding: var(--builder-shell-space-12);
	}

	.assignment-panel__item.active,
	.assignment-panel__group-item.active {
		border-color: var(--builder-shell-accent);
		background: var(--builder-shell-accent-surface);
	}

	.assignment-panel__item {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	.assignment-panel__item-meta,
	.assignment-panel__group-item > div:first-child {
		display: grid;
		gap: var(--builder-shell-space-5);
	}

	.assignment-panel__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--builder-shell-space-8);
	}

	@media (max-width: 900px) {
		.assignment-panel__composer-grid,
		.assignment-panel__item-edit {
			grid-template-columns: 1fr;
		}

		.assignment-panel__header,
		.assignment-panel__heading,
		.assignment-panel__group header,
		.assignment-panel__group-item {
			flex-direction: column;
		}
	}
</style>
