<script lang="ts">
	import { onMount } from 'svelte';
	import { createVirtualizer, type SvelteVirtualizer } from '@tanstack/svelte-virtual';

	import type { BuilderEngineState } from '@builder/core';
	import type { BuilderDocument, BuilderNode } from '@builder/schema';
	import type { BuilderEditorController } from './editor';

	import { getActiveDocument } from '@builder/core';
	import EditorShellIcon from './components/EditorShellIcon.svelte';
	import NavigatorNodeRow from './components/NavigatorNodeRow.svelte';
	import NavigatorSlotRow from './components/NavigatorSlotRow.svelte';
	import BuilderNavigator from './BuilderNavigator.svelte';
	import {
		buildNavigatorVirtualRows,
		createNavigatorNodeRow,
		estimateNavigatorVirtualRowSize,
		type NavigatorNodeRowActions,
		type NavigatorVirtualRow,
	} from './navigator-model';

	export let editor: BuilderEditorController;
	export let nodes: BuilderNode[] | undefined = undefined;
	export let depth = 0;
	export let parentId: string | undefined = undefined;
	export let slot: string | undefined = undefined;
	export let sharedState: BuilderEngineState | undefined = undefined;
	export let docked = false;

	type LooseRecord = Record<string, unknown>;

	const ZERO_RECT = {
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
	};

	let state: BuilderEngineState = sharedState ?? editor.engine.getState();
	let insertType = 'container';
	let unsubscribe = () => {};
	let currentNodes: BuilderNode[] = nodes ?? getActiveDocument( state ).root;
	const availableElements = [ ...editor.registry.elements.values() ];
	let projectDocuments = state.project.documents;
	let componentDocumentsById = buildComponentDocumentsById( projectDocuments );
	let activeDocument = getActiveDocument( state );
	let selectedNode: BuilderNode | undefined;
	let selectedComponentDocument: BuilderDocument | undefined;
	let dockRight = false;
	let showResizeAffordance = false;
	let navigatorVirtualizationEnabled = false;
	let navigatorScrollElement: HTMLElement | null = null;
	let navigatorVirtualRows: NavigatorVirtualRow[] = [];
	let navigatorVirtualRowsHeight = 0;
	let navigatorVirtualizer: SvelteVirtualizer<HTMLElement, HTMLLIElement> | undefined;
	let navigatorVirtualizerSignature = '';
	let navigatorVirtualizerCleanup = () => {};

	$: if ( sharedState ) state = sharedState;
	$: if ( state.project.documents !== projectDocuments ) {
		projectDocuments = state.project.documents;
		componentDocumentsById = buildComponentDocumentsById( projectDocuments );
	}
	$: activeDocument = getActiveDocument( state );
	$: currentNodes = nodes ?? activeDocument.root;
	$: selectedNode = state.ui.selectedNodeIds[ 0 ] ? editor.getActiveDocumentCache().nodeById.get( state.ui.selectedNodeIds[ 0 ] ) : undefined;
	$: selectedComponentDocument = state.ui.componentEditing.componentDocumentId
		? componentDocumentsById.get( state.ui.componentEditing.componentDocumentId )
		: selectedNode?.type === 'component-instance'
			? componentDocumentsById.get( String( selectedNode?.props.componentId ?? '' ) )
			: undefined;
	$: dockRight = docked || resolveNavigatorDockSide() === 'right';
	$: showResizeAffordance = resolveResizeAffordance();
	$: navigatorVirtualizationEnabled = depth === 0 && !dockRight && editor.features.navigatorVirtualization;
	$: navigatorVirtualRows = navigatorVirtualizationEnabled ? buildNavigatorVirtualRows( currentNodes, 1 ) : [];
	$: navigatorVirtualRowsHeight = navigatorVirtualRows.reduce( ( total, row ) => total + estimateNavigatorVirtualRowSize( row ), 0 );
	$: syncNavigatorVirtualizerOptions();

	onMount( () => {
		if ( depth > 0 ) {
			return;
		}

		unsubscribe = editor.subscribeSelector( ( nextState ) => nextState, ( nextState ) => {
			state = nextState;
		}, areNavigatorStatesEqual, 'navigator' );

		const virtualizerStore = createVirtualizer<HTMLElement, HTMLLIElement>( {
			count: navigatorVirtualRows.length,
			getScrollElement: () => navigatorScrollElement,
			estimateSize: ( index ) => {
				const row = navigatorVirtualRows[ index ];
				return row ? estimateNavigatorVirtualRowSize( row ) : 90;
			},
			enabled: navigatorVirtualizationEnabled,
			indexAttribute: 'data-index',
			overscan: 8,
		} );

		navigatorVirtualizerCleanup = virtualizerStore.subscribe( ( next ) => {
			navigatorVirtualizer = next;
			syncNavigatorVirtualizerOptions();
		} );

		return () => {
			unsubscribe();
			navigatorVirtualizerCleanup();
		};
	} );

	function selectNode( nodeId: string ) {
		editor.dispatch( { type: 'document/ui/select-node', nodeId } );
	}

	function syncNavigatorVirtualizerOptions() {
		if ( depth > 0 || !navigatorVirtualizer ) {
			return;
		}

		const nextSignature = `${ navigatorVirtualizationEnabled ? '1' : '0' }:${ navigatorScrollElement ? '1' : '0' }:${ navigatorVirtualRows.map( ( row ) => row.key ).join( '|' ) }`;
		if ( nextSignature === navigatorVirtualizerSignature ) {
			return;
		}

		navigatorVirtualizerSignature = nextSignature;
		navigatorVirtualizer.setOptions( {
			count: navigatorVirtualizationEnabled ? navigatorVirtualRows.length : 0,
			enabled: navigatorVirtualizationEnabled,
			getScrollElement: () => navigatorScrollElement,
			estimateSize: ( index ) => {
				const row = navigatorVirtualRows[ index ];
				return row ? estimateNavigatorVirtualRowSize( row ) : 90;
			},
			getItemKey: ( index ) => navigatorVirtualRows[ index ]?.key ?? index,
			indexAttribute: 'data-index',
			overscan: 8,
		} );
	}

	function buildComponentDocumentsById( documents: BuilderDocument[] ) {
		return new Map( documents
			.filter( ( document ) => document.kind === 'component' )
			.map( ( document ) => [ document.id, document ] ) );
	}

	function openNodeContextMenu( node: BuilderNode, event: MouseEvent, targetSlot?: string ) {
		event.preventDefault();
		selectNode( node.id );
		editor.openContextMenu( {
			x: event.clientX,
			y: event.clientY,
			targetKind: 'navigator-node',
			documentId: activeDocument.id,
			nodeId: node.id,
			slot: targetSlot,
		} );
	}

	function insertNode( targetParentId?: string, targetSlot?: string ) {
		const definition = editor.registry.elements.get( insertType );
		if ( !definition ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/create',
			parentId: targetParentId,
			slot: targetSlot,
			node: definition.createDefaultNode(),
		} );
	}

	function moveNode( nodeId: string, direction: -1 | 1 ) {
		selectNode( nodeId );
		editor.moveSelectedNodeBy( direction );
	}

	function canAcceptChildren( node: BuilderNode ): boolean {
		const definition = editor.registry.elements.get( node.type );
		return Boolean( definition?.runtime.acceptsChildren || Object.keys( node.slots ).length );
	}

	function resolvePreferredSlot( node: BuilderNode ): string | undefined {
		const definition = editor.registry.elements.get( node.type );
		if ( definition?.runtime.acceptsChildren ) {
			return undefined;
		}

		return Object.keys( node.slots )[ 0 ];
	}

	function moveNodeToSiblingIndex( nodeId: string, targetIndex: number ) {
		const location = editor.getActiveDocumentCache().locationById.get( nodeId );
		if ( !location ) {
			return;
		}

		const resolvedTargetIndex = targetIndex > location.index
			? targetIndex + 1
			: Math.max( 0, targetIndex );

		editor.dispatch( {
			type: 'document/ui/start-drag',
			session: {
				kind: 'move',
				documentId: state.activeDocumentId,
				nodeId,
				sourceParentId: location.parentId,
				sourceSlot: location.slot,
				sourceIndex: location.index,
				label: location.node.name ?? location.node.type,
				pointer: { x: 0, y: 0 },
			},
		} );
		editor.dispatch( {
			type: 'document/ui/set-drop-target',
			target: {
				documentId: state.activeDocumentId,
				parentId: location.parentId,
				slot: location.slot,
				index: resolvedTargetIndex,
				placement: targetIndex <= location.index ? 'before' : 'after',
				targetNodeId: nodeId,
				rect: ZERO_RECT,
			},
		} );
		editor.dispatch( { type: 'document/ui/commit-drag' } );
		selectNode( nodeId );
	}

	function moveNodeToBoundary( nodeId: string, siblings: BuilderNode[], target: 'start' | 'end' ) {
		moveNodeToSiblingIndex( nodeId, target === 'start' ? 0 : siblings.length );
	}

	function indentNode( node: BuilderNode, siblings: BuilderNode[], index: number ) {
		if ( index <= 0 ) {
			return;
		}

		const previousSibling = siblings[ index - 1 ];
		if ( !previousSibling || !canAcceptChildren( previousSibling ) ) {
			return;
		}

		const targetSlot = resolvePreferredSlot( previousSibling );
		const nextIndex = targetSlot
			? previousSibling.slots[ targetSlot ]?.length ?? 0
			: previousSibling.children.length;

		editor.dispatch( {
			type: 'document/elements/move',
			nodeId: node.id,
			targetParentId: previousSibling.id,
			targetSlot,
			index: nextIndex,
		} );
		selectNode( node.id );
	}

	function outdentNode( nodeId: string ) {
		const cache = editor.getActiveDocumentCache();
		const location = cache.locationById.get( nodeId );
		if ( !location?.parentId ) {
			return;
		}

		const parentLocation = cache.locationById.get( location.parentId );
		if ( !parentLocation ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/move',
			nodeId,
			targetParentId: parentLocation.parentId,
			targetSlot: parentLocation.slot,
			index: parentLocation.index + 1,
		} );
		selectNode( nodeId );
	}

	function getSlotEntries( targetNode: BuilderNode ): Array<{ slotName: string; slotNodes: BuilderNode[] }> {
		return Object.entries( targetNode.slots as Record<string, BuilderNode[]> )
			.map( ( [ slotName, slotNodes ] ) => ( {
				slotName,
				slotNodes: slotNodes as BuilderNode[],
			} ) )
			.filter( ( entry ) => entry.slotNodes.length > 0 );
	}

	function openSelectedComponentMaster() {
		if ( !selectedComponentDocument ) {
			return;
		}

		editor.openDocument( selectedComponentDocument.id, {
			mode: 'component-master',
			pathname: state.ui.preview.pathname,
			query: state.ui.preview.query,
			source: 'manual',
		} );
	}

	function resolveNodeComponentDocument( node: BuilderNode ) {
		return node.type === 'component-instance'
			? state.project.documents.find( ( document ) => document.id === String( node.props.componentId ?? '' ) && document.kind === 'component' )
			: undefined;
	}

	function openNodeComponentMaster( node: BuilderNode ) {
		const componentDocument = resolveNodeComponentDocument( node );
		if ( !componentDocument ) {
			return;
		}

		editor.openDocument( componentDocument.id, {
			mode: 'component-master',
			pathname: state.ui.preview.pathname,
			query: state.ui.preview.query,
			source: 'manual',
		} );
	}

	function asRecord( value: unknown ): LooseRecord | undefined {
		if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
			return undefined;
		}

		return value as LooseRecord;
	}

	function asString( value: unknown ): string | undefined {
		if ( typeof value === 'string' && value.trim() ) {
			return value.trim();
		}

		if ( typeof value === 'number' ) {
			return String( value );
		}

		return undefined;
	}

	function asBoolean( value: unknown ): boolean | undefined {
		return typeof value === 'boolean' ? value : undefined;
	}

	function prettifyLabel( value: string ): string {
		return value
			.split( /[-_]/g )
			.filter( Boolean )
			.map( ( part ) => part.charAt( 0 ).toUpperCase() + part.slice( 1 ) )
			.join( ' ' );
	}

	function getDocumentDescriptor(): string {
		return `${prettifyLabel( activeDocument.kind )} / ${activeDocument.title}`;
	}

	function getModeDescriptor(): string {
		return `${prettifyLabel( state.ui.mode )} mode`;
	}

	function getPreviewDescriptor(): string {
		const path = state.ui.preview.pathname || '/';
		return state.ui.preview.slot ? `${path} / ${state.ui.preview.slot}` : path;
	}

	function formatSlotLabel( slotName: string ): string {
		return prettifyLabel( slotName );
	}

	function resolveNavigatorDockSide(): 'left' | 'right' {
		const uiState = state.ui as unknown as LooseRecord;
		const navigatorState = asRecord( uiState.navigator );
		const panelLayout = asRecord( uiState.panelLayout );
		const previewState = asRecord( uiState.preview );
		const documentMeta = asRecord( activeDocument.meta );
		const side = asString( navigatorState?.dock )
			?? asString( navigatorState?.side )
			?? asString( panelLayout?.navigatorDock )
			?? asString( panelLayout?.navigatorSide )
			?? asString( previewState?.navigatorDock )
			?? asString( documentMeta?.navigatorDock )
			?? asString( documentMeta?.navigatorSide );

		return side === 'right' ? 'right' : 'left';
	}

	function resolveResizeAffordance(): boolean {
		const uiState = state.ui as unknown as LooseRecord;
		const navigatorState = asRecord( uiState.navigator );
		const panelLayout = asRecord( uiState.panelLayout );
		const documentMeta = asRecord( activeDocument.meta );

		return Boolean(
			asBoolean( navigatorState?.resizable )
			?? asBoolean( navigatorState?.showResizeHandle )
			?? asBoolean( panelLayout?.navigatorResizable )
			?? asBoolean( panelLayout?.resizeNavigator )
			?? asBoolean( documentMeta?.navigatorResizable ),
		);
	}

	const navigatorNodeActions: NavigatorNodeRowActions = {
		onSelect: selectNode,
		onOpenContextMenu: openNodeContextMenu,
		onMove: ( node, direction ) => moveNode( node.id, direction ),
		onMoveToBoundary: ( node, siblings, target ) => moveNodeToBoundary( node.id, siblings, target ),
		onIndent: indentNode,
		onOutdent: ( node ) => outdentNode( node.id ),
		onDuplicate: ( node, targetParentId, targetSlot ) => editor.dispatch( {
			type: 'document/elements/duplicate',
			nodeId: node.id,
			targetParentId,
			targetSlot,
		} ),
		onDelete: ( node ) => editor.dispatch( { type: 'document/elements/delete', nodeId: node.id } ),
		onInsertNode: insertNode,
		onOpenMaster: openNodeComponentMaster,
	};

	function getNavigatorVirtualRowStyle( start: number, size: number ) {
		return `position:absolute; inset-inline:0; top:0; width:100%; transform:translateY(${start}px); height:${size}px;`;
	}

	function areNavigatorStatesEqual( left: BuilderEngineState, right: BuilderEngineState ) {
		return left.project === right.project
			&& left.activeDocumentId === right.activeDocumentId
			&& left.ui.selectedNodeIds.join( '|' ) === right.ui.selectedNodeIds.join( '|' )
			&& left.ui.dragSession === right.ui.dragSession
			&& left.ui.dropTarget === right.ui.dropTarget
			&& left.ui.componentEditing.context === right.ui.componentEditing.context
			&& left.ui.componentEditing.componentDocumentId === right.ui.componentEditing.componentDocumentId
			&& left.ui.preview.pathname === right.ui.preview.pathname
			&& left.ui.preview.query === right.ui.preview.query
			&& left.ui.preview.slot === right.ui.preview.slot
			&& left.ui.mode === right.ui.mode
			&& left.ui.shell.navigatorMode === right.ui.shell.navigatorMode
			&& left.ui.shell.navigatorOpen === right.ui.shell.navigatorOpen;
	}

</script>

{#if depth === 0}
	<div
		class="navigator"
		class:navigator--dock-right={dockRight}
		class:navigator--floating={!dockRight}
		class:navigator--resizable={showResizeAffordance}
	>
		<div class="navigator__header">
			<button type="button" id="elementor-navigator__toggle-all" aria-label="Expand all elements" title="Expand all elements">
				<EditorShellIcon name="expand" title="Expand all elements" />
			</button>
			<h2 id="elementor-navigator__header__title">Structure</h2>
			<button type="button" id="elementor-navigator__close" aria-label="Close structure" title="Close structure" onclick={() => editor.toggleNavigator( false )}>
				<EditorShellIcon name="close" title="Close structure" />
			</button>
		</div>

		<div class="navigator__elements builder-shell-scrollbar" bind:this={navigatorScrollElement}>
			{#if navigatorVirtualizationEnabled && navigatorVirtualizer}
				<ul class="navigator__tree navigator__tree--root navigator__tree--virtual" style={`height:${navigatorVirtualizer?.getTotalSize() ?? navigatorVirtualRowsHeight}px;`}>
					{#each navigatorVirtualizer?.getVirtualItems() ?? [] as virtualItem (virtualItem.key)}
						{@const row = navigatorVirtualRows[ virtualItem.index ]}
						{#if row?.kind === 'node'}
							<NavigatorNodeRow
								row={row}
								selectedNodeIds={state.ui.selectedNodeIds}
								componentDocumentTitle={resolveNodeComponentDocument( row.node )?.title}
								actions={navigatorNodeActions}
								documentId={state.activeDocumentId}
								virtualizer={navigatorVirtualizer}
								style={getNavigatorVirtualRowStyle( virtualItem.start, virtualItem.size )}
							/>
						{:else if row?.kind === 'slot'}
							<NavigatorSlotRow
								row={row}
								virtualizer={navigatorVirtualizer}
								style={getNavigatorVirtualRowStyle( virtualItem.start, virtualItem.size )}
							/>
						{/if}
					{/each}
				</ul>
			{:else}
				<ul class="navigator__tree navigator__tree--root">
					<BuilderNavigator {editor} sharedState={state} nodes={currentNodes} depth={1} />
				</ul>
			{/if}
		</div>

		<div class="navigator__footer">
			<div class="navigator__resize-bar" aria-hidden="true">
				<EditorShellIcon name="dots" title="Resize structure" />
			</div>
		</div>
	</div>
{:else}
	{#each currentNodes as node, nodeIndex (node.id)}
		{@const nodeRow = createNavigatorNodeRow( node, nodeIndex, depth, currentNodes, parentId, slot )}
		<NavigatorNodeRow
			row={nodeRow}
			selectedNodeIds={state.ui.selectedNodeIds}
			componentDocumentTitle={resolveNodeComponentDocument( node )?.title}
			actions={navigatorNodeActions}
			documentId={state.activeDocumentId}
			virtualizer={undefined}
		>
			{#if node.children.length}
				<ul class="navigator__tree">
					<BuilderNavigator {editor} sharedState={state} nodes={node.children} depth={depth + 1} parentId={node.id} />
				</ul>
			{/if}

			{#each getSlotEntries( node ) as slotEntry (slotEntry.slotName)}
				<div class="navigator__slot">
					<div class="navigator__slot-header">
						<div class="navigator__slot-label">{formatSlotLabel( slotEntry.slotName )}</div>
					</div>
					<ul class="navigator__tree navigator__tree--slot">
						<BuilderNavigator
							{editor}
							sharedState={state}
							nodes={slotEntry.slotNodes}
							depth={depth + 1}
							parentId={node.id}
							slot={slotEntry.slotName}
						/>
					</ul>
				</div>
			{/each}
		</NavigatorNodeRow>
	{/each}
{/if}

<style>
	.navigator {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 0;
		width: var(--e-editor-navigator-width, 240px);
		height: 100%;
		border: 1px solid var(--builder-shell-border);
		background: var(--builder-shell-panel-bg, #ffffff);
		box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
		color: var(--builder-shell-heading);
		user-select: none;
		overflow: hidden;
	}

	.navigator--floating {
		height: min(50vh, 100%);
		border-radius: 10px;
	}

	.navigator--dock-right {
		width: 100%;
		height: 100%;
		border-inline: 0;
		border-radius: 0;
		box-shadow: none;
	}

	.navigator--dock-right .navigator__footer {
		display: none;
	}

	.navigator--dock-right .navigator__elements {
		height: calc(100% - 35px);
	}

	.navigator--dock-right .navigator__resize-bar {
		display: none;
	}

	.navigator__header {
		display: flex;
		align-items: stretch;
		min-height: 35px;
		border-bottom: 1px solid var(--builder-shell-border);
		background: linear-gradient(180deg, #ffffff, #f6f8fb);
		color: var(--builder-shell-heading);
	}

	.navigator__header h2 {
		flex: 1;
		margin: 0;
		padding: 9px 0;
		text-align: center;
		font-size: 13px;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		cursor: move;
	}

	#elementor-navigator__toggle-all,
	#elementor-navigator__close {
		width: 35px;
		height: 35px;
		border: 0;
		background: transparent;
		color: var(--builder-shell-text);
		cursor: pointer;
		transition: background 140ms ease, color 140ms ease;
		border-radius: 0;
	}

	#elementor-navigator__toggle-all:focus-visible,
	#elementor-navigator__close:focus-visible {
		outline: none;
		box-shadow: var(--builder-shell-focus-ring);
	}

	#elementor-navigator__toggle-all:hover,
	#elementor-navigator__close:hover {
		background: rgba(240, 243, 248, 0.9);
		color: var(--builder-shell-heading);
	}

	.navigator__elements {
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
		padding: 3px 0 5px;
		background: var(--builder-shell-panel-bg, #ffffff);
	}

	.navigator__footer {
		width: 100%;
		text-align: center;
		border-top: 1px solid var(--builder-shell-border);
		background: linear-gradient(180deg, rgba(250, 251, 254, 0.95), rgba(245, 247, 250, 0.95));
	}

	.navigator__resize-bar {
		height: 23px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-text-muted);
		cursor: ns-resize;
	}

	.navigator__tree {
		display: grid;
		gap: 0;
		margin: 0;
		padding-left: 0;
		list-style: none;
	}

	.navigator__tree--root {
		gap: 0;
	}

	.navigator__tree--virtual {
		position: relative;
		display: block;
		width: 100%;
	}

	.navigator__slot {
		display: grid;
		gap: 0.28rem;
		padding-block-start: 0.18rem;
	}

	.navigator__slot-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
		padding: 4px 8px 4px 14px;
		border-top: 1px solid rgba(191, 202, 219, 0.28);
		background: rgba(247, 249, 252, 0.72);
	}

	.navigator__slot-label {
		font-size: 9px;
		line-height: 1;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--builder-shell-text-muted);
	}
	.navigator__tree--slot {
		padding-left: 0.12rem;
	}
</style>
