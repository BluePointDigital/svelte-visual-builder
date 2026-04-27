<script lang="ts">
	import type { BuilderDocument, BuilderNode, EditorMode } from '@builder/schema';
	import { flattenNodeTree } from '@builder/core';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';

	export let documents: BuilderDocument[] = [];
	export let activeDocument: BuilderDocument;
	export let mode: EditorMode = 'page';
	export let selectedNode: BuilderNode | undefined = undefined;
	export let editingContext: 'master' | 'instance' | 'detached' | undefined = undefined;
	export let editingComponentDocumentId: string | undefined = undefined;
	export let onOpenDocument: ( documentId: string, mode?: EditorMode ) => void = () => {};
	export let onInsertComponentInstance: ( componentId: string ) => void = () => {};
	export let onDetachInstance: () => void = () => {};
	export let onRelinkInstance: ( componentId: string, preserveOverrides?: boolean ) => void = () => {};

	let relinkComponentId = '';
	let preserveOverrides = true;
	const componentUsageByDocument = new WeakMap<BuilderDocument, Map<string, number>>();

	$: componentDocuments = documents.filter( ( document ) => document.kind === 'component' );
	$: usageByComponent = buildUsageIndex( documents );
	$: selectedComponentDocument = componentDocuments.find( ( document ) => document.id === (
		editingComponentDocumentId
		?? ( selectedNode?.type === 'component-instance' ? String( selectedNode.props.componentId ?? '' ) : '' )
	) );
	$: if ( selectedComponentDocument?.id && !relinkComponentId ) {
		relinkComponentId = selectedComponentDocument.id;
	}

	function buildUsageIndex( source: BuilderDocument[] ) {
		const usage = new Map<string, number>();

		for ( const document of source ) {
			if ( document.kind === 'component' ) {
				continue;
			}

			const cachedUsage = componentUsageByDocument.get( document ) ?? buildDocumentUsageIndex( document );
			componentUsageByDocument.set( document, cachedUsage );
			for ( const [ componentId, count ] of cachedUsage ) {
				usage.set( componentId, ( usage.get( componentId ) ?? 0 ) + count );
			}
		}

		return usage;
	}

	function buildDocumentUsageIndex( document: BuilderDocument ) {
		const usage = new Map<string, number>();

		for ( const node of flattenNodeTree( document.root ) ) {
			if ( node.type !== 'component-instance' ) {
				continue;
			}

			const componentId = String( node.props.componentId ?? '' );
			if ( !componentId ) {
				continue;
			}

			usage.set( componentId, ( usage.get( componentId ) ?? 0 ) + 1 );
		}

		return usage;
	}

	function getUsageCount( componentId: string ) {
		return usageByComponent.get( componentId ) ?? 0;
	}
</script>

<EditorShellTokens>
	<section class="component-panel">
		<div class="component-panel__header">
			<div class="component-panel__heading">
				<span class="builder-shell-icon-badge">
					<EditorShellIcon name="component" title="Component workflow" />
				</span>
				<div>
					<h2>Component Workflow</h2>
					<p>Switch between masters and instances without losing track of reuse or override context.</p>
				</div>
			</div>
			<span class="builder-shell-badge">{componentDocuments.length} masters</span>
		</div>

		{#if editingContext === 'master' || activeDocument.kind === 'component' || mode === 'component-master'}
			<div class="component-panel__focus builder-shell-card builder-shell-card--subtle">
				<span class="builder-shell-badge">Master editing</span>
				<h3>{activeDocument.title}</h3>
				<p>Structure {activeDocument.component?.lockedStructure === false ? 'can' : 'cannot'} be edited from instances. Exposed overrides: {activeDocument.component?.exposedProperties.length ?? 0}.</p>
				<p>Project usage: {getUsageCount( activeDocument.id )} instance{getUsageCount( activeDocument.id ) === 1 ? '' : 's'}.</p>
				{#if activeDocument.component?.exposedProperties.length}
					<ul class="component-panel__exposures">
						{#each activeDocument.component.exposedProperties as exposure (exposure.id)}
							<li>{exposure.label} | {exposure.type} | {exposure.propPath}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{:else if editingContext === 'instance' && selectedComponentDocument}
			<div class="component-panel__focus builder-shell-card builder-shell-card--subtle">
				<span class="builder-shell-badge">Instance editing</span>
				<h3>{selectedComponentDocument.title}</h3>
				<p>Only exposed values should change here. The selected node carries {( Object.keys( selectedNode?.props.overrides as Record<string, unknown> ?? {} ) ).length} override value(s).</p>
				<div class="component-panel__actions">
					<button class="builder-shell-button builder-shell-button--primary" type="button" onclick={() => onOpenDocument( selectedComponentDocument.id, 'component-master' )}>Open Master</button>
					<button class="builder-shell-button builder-shell-button--danger" type="button" onclick={onDetachInstance}>Detach</button>
					<label class="builder-shell-field">
						<span>Relink to master</span>
						<select class="builder-shell-select" bind:value={relinkComponentId}>
							{#each componentDocuments as document (document.id)}
								<option value={document.id}>{document.title}</option>
							{/each}
						</select>
					</label>
					<label class="component-panel__toggle">
						<input type="checkbox" bind:checked={preserveOverrides} />
						<span>Preserve overrides</span>
					</label>
					<button class="builder-shell-button" type="button" disabled={!relinkComponentId} onclick={() => onRelinkInstance( relinkComponentId, preserveOverrides )}>Relink Instance</button>
				</div>
			</div>
		{:else if editingContext === 'detached'}
			<div class="component-panel__focus builder-shell-card builder-shell-card--subtle">
				<span class="builder-shell-badge builder-shell-badge--neutral">Detached instance</span>
				<h3>{selectedComponentDocument?.title ?? 'Detached component'}</h3>
				<p>The selected node is now a concrete container tree. Relink it to a master when you want reusable behavior back.</p>
				<div class="component-panel__actions">
					<label class="builder-shell-field">
						<span>Relink to master</span>
						<select class="builder-shell-select" bind:value={relinkComponentId}>
							{#each componentDocuments as document (document.id)}
								<option value={document.id}>{document.title}</option>
							{/each}
						</select>
					</label>
					<label class="component-panel__toggle">
						<input type="checkbox" bind:checked={preserveOverrides} />
						<span>Preserve detached overrides</span>
					</label>
					<button class="builder-shell-button" type="button" disabled={!relinkComponentId} onclick={() => onRelinkInstance( relinkComponentId, preserveOverrides )}>Relink To Master</button>
				</div>
			</div>
		{:else}
			<div class="component-panel__focus builder-shell-card builder-shell-card--subtle">
				<span class="builder-shell-badge builder-shell-badge--neutral">Catalog</span>
				<h3>Reusable masters</h3>
				<p>Select a component instance on canvas to edit overrides, or open a master directly from this list.</p>
			</div>
		{/if}

		<div class="component-panel__catalog">
			{#each componentDocuments as document (document.id)}
				<article class:active={document.id === activeDocument.id} class="component-panel__item builder-shell-card">
					<div>
						<strong>{document.title}</strong>
						<small>{document.component?.exposedProperties.length ?? 0} exposed prop(s) | {getUsageCount( document.id )} use(s)</small>
					</div>
					<div class="component-panel__actions">
						<button class="builder-shell-button" type="button" onclick={() => onInsertComponentInstance( document.id )}>Insert Instance</button>
						<button class="builder-shell-button builder-shell-button--primary" type="button" onclick={() => onOpenDocument( document.id, 'component-master' )}>Open Master</button>
					</div>
				</article>
			{/each}
		</div>
	</section>
</EditorShellTokens>

<style>
	.component-panel {
		display: grid;
		gap: var(--builder-shell-space-16);
	}

	.component-panel__header,
	.component-panel__heading,
	.component-panel__item {
		display: flex;
		gap: var(--builder-shell-space-16);
		align-items: start;
	}

	.component-panel__header,
	.component-panel__item {
		justify-content: space-between;
	}

	.component-panel__heading {
		flex: 1;
	}

	.component-panel__header h2,
	.component-panel__header p,
	.component-panel__focus h3,
	.component-panel__focus p,
	.component-panel__item strong,
	.component-panel__item small {
		margin: 0;
	}

	.component-panel__header p,
	.component-panel__item small,
	.component-panel__focus p {
		color: var(--builder-shell-text-muted);
	}

	.component-panel__focus,
	.component-panel__item {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.component-panel__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--builder-shell-space-8);
		align-items: end;
	}

	.component-panel__toggle {
		display: inline-flex !important;
		align-items: center;
		gap: var(--builder-shell-space-8);
		padding: var(--builder-shell-space-8) var(--builder-shell-space-10);
		border-radius: var(--builder-shell-radius);
		border: 1px solid var(--builder-shell-border-color);
		background: var(--builder-shell-bg-surface);
	}

	.component-panel__catalog {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	.component-panel__item.active {
		border-color: var(--builder-shell-accent);
		background: var(--builder-shell-accent-surface);
	}

	.component-panel__item > div:first-child {
		display: grid;
		gap: var(--builder-shell-space-5);
	}

	.component-panel__exposures {
		margin: 0;
		padding-left: 1.1rem;
		display: grid;
		gap: var(--builder-shell-space-5);
	}
</style>
