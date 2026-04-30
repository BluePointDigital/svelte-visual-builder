<script module lang="ts">
	export interface PreviewBridgeCallbacks {
		onSelect: ( nodeElement: HTMLElement ) => void;
		onHover: ( nodeElement?: HTMLElement ) => void;
	}

	export function resolveBuilderNodeElement( target: EventTarget | null ): HTMLElement | undefined {
		const element = target instanceof Element
			? target
			: target instanceof Node
				? target.parentElement
				: undefined;

		return element?.closest( '[data-builder-node]' ) as HTMLElement | undefined;
	}

	export function createDelegatedPreviewBridge( targetDocument: Document, callbacks: PreviewBridgeCallbacks ) {
		const handleClick = ( event: MouseEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( !nodeElement ) {
				return;
			}

			event.preventDefault();
			callbacks.onSelect( nodeElement );
		};

		const handlePointerOver = ( event: PointerEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( !nodeElement || resolveBuilderNodeElement( event.relatedTarget ) === nodeElement ) {
				return;
			}

			callbacks.onHover( nodeElement );
		};

		const handlePointerOut = ( event: PointerEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( !nodeElement || resolveBuilderNodeElement( event.relatedTarget ) === nodeElement ) {
				return;
			}

			callbacks.onHover( undefined );
		};

		targetDocument.addEventListener( 'click', handleClick, true );
		targetDocument.addEventListener( 'pointerover', handlePointerOver, true );
		targetDocument.addEventListener( 'pointerout', handlePointerOut, true );

		return () => {
			targetDocument.removeEventListener( 'click', handleClick, true );
			targetDocument.removeEventListener( 'pointerover', handlePointerOver, true );
			targetDocument.removeEventListener( 'pointerout', handlePointerOut, true );
		};
	}
</script>

<script lang="ts">
	import { createDraggable } from '@dnd-kit/svelte';
	import { onMount } from 'svelte';
	import { mount, unmount } from 'svelte';

	import type {
		BuilderEngineState,
		BuilderInlineEditingMode,
		BuilderRect,
		CanvasGeometrySnapshot,
		DropTarget,
		NodeBounds,
		SlotBounds,
	} from '@builder/core';
	import type { BreakpointDefinition, BuilderDocument, BuilderNode } from '@builder/schema';
	import type { BuilderEditorController } from './editor';
	import { BuilderRenderer } from '@builder/runtime-svelte';

	import { getActiveDocument, getCanvasGeometryKey, resolveBuilderInlineEditingMode } from '@builder/core';
	import EditorShellIcon from './components/EditorShellIcon.svelte';
	import InlineRichTextEditor from './components/LazyInlineRichTextEditor.svelte';
	import PreviewDroppableRegion from './components/PreviewDroppableRegion.svelte';
	import { createBuilderDndData } from './drag-drop';
	import { createAnchorController } from './anchor-controller';
	import { normalizeInlineEditingPlainText, serializeInlineEditingValue } from './inline-editing';
	import { createPreviewHostController, type PreviewHostController } from './preview-host';
	import {
		rectToStyle,
		resolvePreviewViewportKind,
		resolvePreviewViewportWidth,
		type PreviewViewportKind,
	} from './canvas';
	import {
		computeNextGapValue,
		createLayoutOverlayModel,
		getLayoutOverlayChildRects,
		type BuilderLayoutOverlayModel,
	} from './layout-overlay';
	import { getAuthoringBreakpointDefinitions } from './responsive-authoring';

	export let editor: BuilderEditorController;
	export let registerSurface: ( element?: HTMLElement ) => void = () => {};
	export let liveAiPreviewActive = false;
	export let liveAiPreviewSrcdoc = '';
	export let liveAiPreviewTitle = '';
	export let liveAiPreviewStatus = '';

	interface PendingInlineUpdate {
		documentId: string;
		nodeId: string;
		value: string;
		html: string;
		richText: boolean;
	}

	interface PreviewContextBanner {
		tone: 'component' | 'compat' | 'detached';
		label: string;
		title: string;
		detail: string;
		action?: 'open-master';
	}

	interface CoarseDropRegion {
		id: string;
		target: DropTarget;
		priority: 'root' | 'slot' | 'container';
		style: string;
	}

	let previewShell: HTMLDivElement | undefined;
	let frameShell: HTMLDivElement | undefined;
	let previewHostController: PreviewHostController | undefined;
	let state: BuilderEngineState = editor.engine.getState();
	let mountedRuntime: ReturnType<typeof mount> | undefined;
	let unsubscribe = () => {};
	let previewBridgeCleanup = () => {};
	let aiStandinElement: HTMLDivElement | undefined;
	let aiStandinIframe: HTMLIFrameElement | undefined;
	let previewSyncFrame = 0;
	let renderVersion = 0;
	let runtimeMeasurementVersion = 0;
	let pendingInlineUpdate: PendingInlineUpdate | undefined;
	let inlineCommitTimer: number | undefined;
	let inlineBlurTimer: number | undefined;
	let suppressNextProjectSyncFor: { documentId: string; nodeId: string } | undefined;
	let activeDocument: BuilderDocument = getActiveDocument( state );
	let projectDocuments = state.project.documents;
	let documentsById = buildDocumentsById( projectDocuments );
	let componentDocumentsById = buildComponentDocumentsById( projectDocuments );
	let previewDocument: BuilderDocument = activeDocument;
	let selectedNode: BuilderNode | undefined;
	let selectedComponentDocument: BuilderDocument | undefined;
	let themeAssignments = state.project.themeAssignments;
	let activeAssignments = themeAssignments.filter( ( assignment ) => assignment.documentId === state.activeDocumentId );
	let breakpointDefinitions: BreakpointDefinition[] = state.project.designSystem.breakpoints;
	let viewportDefinitions: BreakpointDefinition[] = getAuthoringBreakpointDefinitions( breakpointDefinitions );
	let previewViewportWidth = 1280;
	let previewViewportHeight = 0;
	let previewViewportKind: PreviewViewportKind = 'desktop';
	let previewFrameStyle = '--builder-preview-frame-width:1280px;';
	let liveAiPreviewFrameSrcdoc = createEmptyLiveAiPreviewSrcdoc();
	let previewLoading = true;
	let contextBanner: PreviewContextBanner | undefined;
	let dropTarget: DropTarget | undefined;
	let coarseDropRegions: CoarseDropRegion[] = [];
	let dropTargetAxis: 'x' | 'y' | undefined;
	let dropTargetIndicatorStyle = '';
	let dropTargetHighlightStyle = '';
	let dropTargetHandleStyles: string[] = [];
	let selectedBounds: NodeBounds | undefined;
	let hoveredBounds: NodeBounds | undefined;
	let inlineEditingBounds: NodeBounds | undefined;
	let selectedLayoutChildBounds: NodeBounds[] = [];
	let selectedLayoutOverlay: BuilderLayoutOverlayModel | undefined;
	let layoutGapDrag:
		| {
			pointerId: number;
			startX: number;
			startY: number;
			initialValue: string;
			axis: 'x' | 'y';
			documentId: string;
			nodeId: string;
		}
		| undefined;
	let selectionRailElement: HTMLDivElement | undefined;
	let hoverRailElement: HTMLDivElement | undefined;
	let selectionOverlayElement: HTMLDivElement | undefined;
	let hoverOverlayElement: HTMLDivElement | undefined;
	const selectionRailAnchor = createAnchorController();
	const hoverRailAnchor = createAnchorController();
	let selectionRailCleanup = () => {};
	let hoverRailCleanup = () => {};
	let inlineEditorSessionKey = '';
	let inlineEditorValue = '';
	let inlineEditorMode: 'html' | 'text' = 'text';
	const selectedNodeDraggable = createDraggable( {
		get id() {
			return `preview:${ selectedBounds?.nodeId ?? 'selection' }`;
		},
		get disabled() {
			return !selectedBounds;
		},
		get data() {
			return selectedBounds
				? createBuilderDndData( formatNodeTypeLabel( selectedBounds.nodeType ), {
					kind: 'canvas-node',
					nodeId: selectedBounds.nodeId,
					documentId: selectedBounds.documentId,
				} )
				: undefined;
		},
	} );

	const INLINE_COMMIT_DELAY = 180;

	$: dropTarget = state.ui.dropTarget;
	$: coarseDropRegions = createCoarseDropRegions( state );
	$: dropTargetAxis = resolveDropIndicatorAxis( dropTarget );
	$: dropTargetIndicatorStyle = getDropIndicatorStyle( dropTarget, dropTargetAxis );
	$: dropTargetHighlightStyle = getDropTargetHighlightStyle( dropTarget, dropTargetAxis );
	$: dropTargetHandleStyles = getDropTargetHandleStyles( dropTarget, dropTargetAxis );
	$: activeDocument = getActiveDocument( state );
	$: if ( state.project.documents !== projectDocuments ) {
		projectDocuments = state.project.documents;
		documentsById = buildDocumentsById( projectDocuments );
		componentDocumentsById = buildComponentDocumentsById( projectDocuments );
	}
	$: previewDocument = documentsById.get( state.ui.preview.documentId ?? state.activeDocumentId ) ?? activeDocument;
	$: selectedNode = state.ui.selectedNodeIds[ 0 ] ? editor.getActiveDocumentCache().nodeById.get( state.ui.selectedNodeIds[ 0 ] ) : undefined;
	$: selectedComponentDocument = state.ui.componentEditing.componentDocumentId
		? componentDocumentsById.get( state.ui.componentEditing.componentDocumentId )
		: selectedNode?.type === 'component-instance'
			? componentDocumentsById.get( String( selectedNode?.props.componentId ?? '' ) )
			: undefined;
	$: if ( state.project.themeAssignments !== themeAssignments ) {
		themeAssignments = state.project.themeAssignments;
	}
	$: activeAssignments = themeAssignments.filter( ( assignment ) => assignment.documentId === previewDocument.id );
	$: if ( state.project.designSystem.breakpoints !== breakpointDefinitions ) {
		breakpointDefinitions = state.project.designSystem.breakpoints;
		viewportDefinitions = getAuthoringBreakpointDefinitions( breakpointDefinitions );
	}
	$: previewViewportKind = resolvePreviewViewportKind( state.ui.viewport, viewportDefinitions );
	$: previewViewportWidth = resolvePreviewViewportWidth( state.ui.viewport, viewportDefinitions );
	$: previewFrameStyle = previewViewportKind === 'desktop'
		? '--builder-preview-frame-width:100%;'
		: `--builder-preview-frame-width:${ previewViewportWidth }px;`;
	$: liveAiPreviewFrameSrcdoc = liveAiPreviewSrcdoc || createEmptyLiveAiPreviewSrcdoc();
	$: previewLoading = renderVersion === 0 || runtimeMeasurementVersion < renderVersion;
	$: contextBanner = buildContextBanner();
	$: selectedBounds = state.ui.selectedNodeIds[ 0 ]
		? state.ui.canvas.index.nodeBoundsById.get( state.ui.selectedNodeIds[ 0 ] )
		: undefined;
	$: hoveredBounds = state.ui.hoveredNodeId
		? state.ui.canvas.index.nodeBoundsById.get( state.ui.hoveredNodeId )
		: undefined;
	$: inlineEditingBounds = state.ui.inlineEditing?.nodeId
		? state.ui.canvas.index.nodeBoundsById.get( state.ui.inlineEditing.nodeId )
		: undefined;
	$: selectedLayoutChildBounds = selectedBounds
		? state.ui.canvas.index.childBoundsByContainer.get( getCanvasGeometryKey( selectedBounds.documentId, selectedBounds.nodeId, undefined ) ) ?? []
		: [];
	$: selectedLayoutOverlay = createLayoutOverlayModel( selectedNode, selectedBounds, selectedLayoutChildBounds );
	$: registerSurface( frameShell );
	$: {
		const nextInlineSessionKey = state.ui.inlineEditing
			? `${ state.ui.inlineEditing.documentId }:${ state.ui.inlineEditing.nodeId }:${ state.ui.inlineEditing.richText ? 'html' : 'text' }`
			: '';
		if ( nextInlineSessionKey !== inlineEditorSessionKey ) {
			inlineEditorSessionKey = nextInlineSessionKey;
			inlineEditorMode = state.ui.inlineEditing?.richText ? 'html' : 'text';
			inlineEditorValue = resolveInlineEditorValue( state.ui.inlineEditing );
		}
	}
	$: {
		selectionRailCleanup();
		selectionRailCleanup = () => {};
		if ( selectedBounds && selectionOverlayElement && selectionRailElement ) {
			selectionRailCleanup = selectionRailAnchor.open( selectionOverlayElement, selectionRailElement, {
				placement: 'top-start',
			} );
		}
	}
	$: {
		hoverRailCleanup();
		hoverRailCleanup = () => {};
		if ( hoveredBounds && hoverOverlayElement && hoverRailElement ) {
			hoverRailCleanup = hoverRailAnchor.open( hoverOverlayElement, hoverRailElement, {
				placement: 'top-end',
			} );
		}
	}

	function buildContextBanner(): PreviewContextBanner | undefined {
		if ( state.ui.componentEditing.context === 'master' || activeDocument.kind === 'component' || state.ui.mode === 'component-master' ) {
			const exposedCount = activeDocument.component?.exposedProperties.length ?? 0;
			return {
				tone: 'component',
				label: 'Master Editing',
				title: `${ exposedCount } exposed override${ exposedCount === 1 ? '' : 's' }`,
				detail: `Structure ${ activeDocument.component?.lockedStructure === false ? 'can be changed per instance' : 'is locked to the master' }`,
			};
		}

		if ( state.ui.componentEditing.context === 'instance' && selectedComponentDocument ) {
			return {
				tone: 'component',
				label: 'Instance Editing',
				title: selectedComponentDocument.title,
				detail: 'Override-only surface for the selected component instance.',
				action: 'open-master',
			};
		}

		if ( state.ui.componentEditing.context === 'detached' ) {
			return {
				tone: 'detached',
				label: 'Detached Component',
				title: selectedComponentDocument?.title ?? 'Detached content',
				detail: 'This selection is no longer linked to a live component master.',
			};
		}

		if ( selectedNode?.legacy ) {
			return {
				tone: 'compat',
				label: 'Compat Editing',
				title: selectedNode.legacy.widgetType,
				detail: 'Legacy content remains active on the selected node.',
			};
		}

		return undefined;
	}

	function buildDocumentsById( documents: BuilderDocument[] ) {
		return new Map( documents.map( ( document ) => [ document.id, document ] ) );
	}

	function buildComponentDocumentsById( documents: BuilderDocument[] ) {
		return new Map( documents
			.filter( ( document ) => document.kind === 'component' )
			.map( ( document ) => [ document.id, document ] ) );
	}

	function ensurePreviewHostController() {
		if ( !frameShell ) {
			return undefined;
		}

		if ( !previewHostController || previewHostController.hostElement !== frameShell ) {
			previewHostController?.destroy();
			previewHostController = createPreviewHostController( frameShell );
		}

		return previewHostController;
	}

	function syncLiveAiPreview() {
		const previewHost = ensurePreviewHostController();
		if ( !previewHost ) {
			return;
		}
		if ( !liveAiPreviewActive ) {
			aiStandinElement?.remove();
			aiStandinElement = undefined;
			aiStandinIframe = undefined;
			return;
		}
		ensureLiveAiPreviewStyle( previewHost.shadowRoot );
		let created = false;
		if ( !aiStandinElement || !aiStandinIframe || aiStandinElement.parentElement !== previewHost.mountTarget ) {
			aiStandinElement?.remove();
			aiStandinElement = document.createElement( 'div' );
			aiStandinElement.className = 'builder-ai-standin';
			aiStandinElement.dataset.builderAiStandin = 'true';
			aiStandinElement.innerHTML = `
				<div class="builder-ai-standin__header">
					<span></span>
					<small></small>
				</div>
				<iframe title="AI generated HTML preview"></iframe>
			`;
			aiStandinIframe = aiStandinElement.querySelector( 'iframe' ) ?? undefined;
			if ( aiStandinIframe ) {
				aiStandinIframe.setAttribute( 'sandbox', 'allow-same-origin' );
				aiStandinIframe.addEventListener( 'load', resizeLiveAiPreviewIframe );
			}
			previewHost.mountTarget.prepend( aiStandinElement );
			created = true;
		}
		const headerLabel = aiStandinElement.querySelector( '.builder-ai-standin__header span' );
		const headerDetail = aiStandinElement.querySelector( '.builder-ai-standin__header small' );
		if ( headerLabel ) {
			headerLabel.textContent = 'HTML preview';
		}
		if ( headerDetail ) {
			headerDetail.textContent = liveAiPreviewStatus || liveAiPreviewTitle || 'Waiting for generated HTML';
		}
		const nextSrcdoc = liveAiPreviewSrcdoc || createEmptyLiveAiPreviewSrcdoc();
		if ( aiStandinIframe && aiStandinIframe.srcdoc !== nextSrcdoc ) {
			aiStandinIframe.style.height = '520px';
			aiStandinIframe.srcdoc = nextSrcdoc;
		}
		if ( aiStandinElement.parentElement === previewHost.mountTarget && previewHost.mountTarget.firstElementChild !== aiStandinElement ) {
			previewHost.mountTarget.prepend( aiStandinElement );
		}
		if ( created ) {
			requestAnimationFrame( () => {
				aiStandinElement?.scrollIntoView( { block: 'start', behavior: 'smooth' } );
			} );
		}
	}

	function resizeLiveAiPreviewIframe() {
		if ( !aiStandinIframe ) {
			return;
		}
		try {
			const documentElement = aiStandinIframe.contentDocument?.documentElement;
			const body = aiStandinIframe.contentDocument?.body;
			const height = Math.max(
				360,
				documentElement?.scrollHeight ?? 0,
				body?.scrollHeight ?? 0,
				body?.offsetHeight ?? 0,
			);
			aiStandinIframe.style.height = `${ height }px`;
		} catch {
			aiStandinIframe.style.height = '70vh';
		}
	}

	function createEmptyLiveAiPreviewSrcdoc(): string {
		return [
			'<!doctype html>',
			'<html>',
			'<head>',
			'<meta charset="utf-8" />',
			'<style>',
			'html,body{margin:0;min-height:360px;font-family:Inter,system-ui,sans-serif;background:#fff;color:#0f172a;}',
			'body{display:grid;place-items:center;padding:32px;}',
			'.empty{display:grid;place-items:center;gap:10px;width:min(520px,100%);min-height:220px;border:1px dashed #d004d4;border-radius:12px;background:#fdf4ff;color:#86198f;text-align:center;}',
			'.empty strong{font-size:14px;text-transform:uppercase;letter-spacing:.08em;}',
			'.empty span{font-size:13px;color:#64748b;}',
			'</style>',
			'</head>',
			'<body><div class="empty"><strong>HTML preview</strong><span>Waiting for the AI to stream generated HTML...</span></div></body>',
			'</html>',
		].join( '' );
	}

	function ensureLiveAiPreviewStyle( shadowRoot: ShadowRoot ) {
		if ( shadowRoot.querySelector( 'style[data-builder-ai-standin-style]' ) ) {
			return;
		}
		const style = document.createElement( 'style' );
		style.dataset.builderAiStandinStyle = 'true';
		style.textContent = `
			.builder-ai-standin {
				display: block;
				width: min(100%, 1180px);
				margin: 24px auto;
				border: 1px solid rgba(168, 85, 247, 0.55);
				border-radius: 12px;
				overflow: hidden;
				background: #ffffff;
				box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
			}
			.builder-ai-standin__header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
				padding: 8px 12px;
				background: linear-gradient(90deg, #111827, #312e81);
				color: #f8fafc;
				font: 800 12px/1.25 Inter, system-ui, sans-serif;
			}
			.builder-ai-standin__header small {
				overflow: hidden;
				color: #cbd5e1;
				font-size: 11px;
				font-weight: 700;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.builder-ai-standin iframe {
				display: block;
				width: 100%;
				min-height: 360px;
				border: 0;
				background: #ffffff;
			}
		`;
		shadowRoot.append( style );
	}

	function applyGeometrySnapshot( snapshot: CanvasGeometrySnapshot ) {
		if ( snapshot.renderVersion < renderVersion ) {
			return;
		}

		const currentCanvas = editor.engine.getState().ui.canvas;
		if (
			currentCanvas.renderVersion === snapshot.renderVersion
			&& currentCanvas.snapshotVersion >= snapshot.version
		) {
			return;
		}

		runtimeMeasurementVersion = snapshot.renderVersion;
		previewViewportHeight = ensurePreviewHostController()?.mountTarget.clientHeight ?? previewViewportHeight;
		editor.incrementPerfCounter( 'canvasMetricsDispatches' );
		editor.dispatch( {
			type: 'document/ui/set-canvas-measurements',
			snapshot,
		} );
	}

	function cleanupPreviewBridge() {
		previewBridgeCleanup();
		previewBridgeCleanup = () => {};
	}

	function openPreviewDocumentForNode( documentId: string ) {
		const currentState = editor.engine.getState();
		if ( documentId === currentState.activeDocumentId ) {
			return;
		}

		editor.focusDocument( documentId );
	}

	function selectPreviewNode( element: HTMLElement ) {
		const nodeId = element.dataset.builderNode;
		if ( !nodeId ) {
			return;
		}

		flushInlineUpdate();
		openPreviewDocumentForNode( element.dataset.builderDocument ?? editor.engine.getState().activeDocumentId );
		editor.dispatch( { type: 'document/ui/select-node', nodeId } );
	}

	function focusSelectedNodeInEditor( panel: 'content' | 'style' | 'advanced' = 'content' ) {
		editor.toggleShellPanel( false );
		editor.setShellPage( 'editor' );
		if ( state.ui.panel !== 'content' && state.ui.panel !== 'style' && state.ui.panel !== 'advanced' ) {
			editor.setPanel( panel );
		}
	}

	function hoverPreviewNode( element: HTMLElement | undefined ) {
		editor.dispatch( {
			type: 'document/ui/hover-node',
			nodeId: element?.dataset.builderNode,
		} );
	}

	function resolveInlineContentElement( element: HTMLElement ): HTMLElement {
		if ( element.dataset.builderInlineContent === 'true' ) {
			return element;
		}

		return element.querySelector( '[data-builder-inline-content="true"]' ) as HTMLElement ?? element;
	}

	function startInlineEditingForNode( element: HTMLElement ) {
		const nodeId = element.dataset.builderNode;
		if ( !nodeId ) {
			return;
		}

		const documentId = element.dataset.builderDocument ?? editor.engine.getState().activeDocumentId;
		const inlineEditMode = resolveInlineEditMode( documentId, nodeId, element.dataset.builderInlineMode );
		if ( !inlineEditMode ) {
			return;
		}

		openPreviewDocumentForNode( documentId );
		editor.dispatch( {
			type: 'document/ui/start-inline-edit',
			nodeId,
			richText: inlineEditMode === 'html',
		} );
	}

	function getInlineUpdatePayload( element: HTMLElement ): PendingInlineUpdate | undefined {
		const nodeId = element.dataset.builderNode;
		if ( !nodeId ) {
			return undefined;
		}

		const documentId = element.dataset.builderDocument ?? editor.engine.getState().activeDocumentId;
		const inlineEditMode = resolveInlineEditMode( documentId, nodeId, element.dataset.builderInlineMode );
		if ( !inlineEditMode ) {
			return undefined;
		}

		const inlineContentElement = resolveInlineContentElement( element );
		const textValue = inlineContentElement.innerText || inlineContentElement.textContent || '';

		return {
			documentId,
			nodeId,
			value: textValue,
			html: inlineContentElement.innerHTML,
			richText: inlineEditMode === 'html',
		};
	}

	function resolvePreviewContextMenuAnchor( clientX: number, clientY: number ) {
		return {
			x: clientX,
			y: clientY,
		};
	}

	function openPreviewContextMenu(
		event: MouseEvent,
		targetKind: 'canvas-node' | 'canvas-root',
		options: {
			documentId?: string;
			nodeId?: string;
			slot?: string;
		} = {},
	) {
		event.preventDefault();
		const anchor = resolvePreviewContextMenuAnchor( event.clientX, event.clientY );
		editor.openContextMenu( {
			x: anchor.x,
			y: anchor.y,
			targetKind,
			documentId: options.documentId,
			nodeId: options.nodeId,
			slot: options.slot,
		} );
	}

	function openPreviewNodeContextMenu( element: HTMLElement, event: MouseEvent ) {
		const nodeId = element.dataset.builderNode;
		if ( !nodeId ) {
			return;
		}

		openPreviewDocumentForNode( element.dataset.builderDocument ?? editor.engine.getState().activeDocumentId );
		editor.dispatch( { type: 'document/ui/select-node', nodeId } );
		openPreviewContextMenu( event, 'canvas-node', {
			documentId: element.dataset.builderDocument ?? editor.engine.getState().activeDocumentId,
			nodeId,
			slot: element.dataset.builderSlot || undefined,
		} );
	}

	function openPreviewRootContextMenu( event: MouseEvent ) {
		openPreviewContextMenu( event, 'canvas-root', {
			documentId: previewDocument.id,
			slot: state.ui.preview.slot,
		} );
	}

	function duplicateSelectedNode() {
		if ( !selectedBounds ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/duplicate',
			documentId: selectedBounds.documentId,
			nodeId: selectedBounds.nodeId,
			targetParentId: selectedBounds.parentId,
			targetSlot: selectedBounds.slot,
			index: selectedBounds.index + 1,
		} );
		editor.closeContextMenu();
	}

	function startLayoutGapDrag( event: PointerEvent ) {
		if ( !selectedBounds || !selectedLayoutOverlay ) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		( event.currentTarget as HTMLElement ).setPointerCapture?.( event.pointerId );
		layoutGapDrag = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			initialValue: selectedLayoutOverlay.gap.value,
			axis: selectedLayoutOverlay.axis,
			documentId: selectedBounds.documentId,
			nodeId: selectedBounds.nodeId,
		};
		editor.beginTransaction( 'Adjust container gap' );
		window.addEventListener( 'pointermove', handleLayoutGapDrag );
		window.addEventListener( 'pointerup', stopLayoutGapDrag, { once: true } );
		window.addEventListener( 'pointercancel', stopLayoutGapDrag, { once: true } );
	}

	function handleLayoutGapDrag( event: PointerEvent ) {
		if ( !layoutGapDrag || event.pointerId !== layoutGapDrag.pointerId ) {
			return;
		}

		const delta = layoutGapDrag.axis === 'x'
			? event.clientX - layoutGapDrag.startX
			: event.clientY - layoutGapDrag.startY;
		const stepPx = resolveGapDragStep( layoutGapDrag.initialValue );
		const nextGap = computeNextGapValue( layoutGapDrag.initialValue, delta, { stepPx } );
		editor.dispatch( {
			type: 'document/elements/update',
			documentId: layoutGapDrag.documentId,
			nodeId: layoutGapDrag.nodeId,
			layoutPatch: { gap: nextGap },
		} );
	}

	function stopLayoutGapDrag( event: PointerEvent ) {
		if ( layoutGapDrag && event.pointerId !== layoutGapDrag.pointerId ) {
			return;
		}

		clearLayoutGapDragListeners();
		editor.commitTransaction();
		layoutGapDrag = undefined;
	}

	function clearLayoutGapDragListeners() {
		window.removeEventListener( 'pointermove', handleLayoutGapDrag );
		window.removeEventListener( 'pointerup', stopLayoutGapDrag );
		window.removeEventListener( 'pointercancel', stopLayoutGapDrag );
	}

	function resolveGapDragStep( value: string ) {
		const unit = value.trim().match( /[a-z%]+$/i )?.[ 0 ] ?? 'px';
		if ( unit === 'rem' || unit === 'em' ) {
			return 1 / 16;
		}
		if ( unit === '%' ) {
			return 0.1;
		}
		return 1;
	}

	function getLayoutOverlayStyle( bounds: NodeBounds | undefined ): string {
		return bounds ? rectToPreviewStyle( bounds.rect ) : '';
	}

	function getLayoutGridLineStyles( model: BuilderLayoutOverlayModel, axis: 'x' | 'y' ): string[] {
		const count = axis === 'x' ? model.grid.columns : model.grid.rows;
		if ( model.display !== 'grid' || count <= 1 ) {
			return [];
		}

		return Array.from( { length: count - 1 }, ( _, index ) => {
			const position = ( ( index + 1 ) / count ) * 100;
			return axis === 'x'
				? `left:${ position }%;top:0;width:1px;height:100%;`
				: `top:${ position }%;left:0;height:1px;width:100%;`;
		} );
	}

	function getLayoutChildRectStyle( rect: BuilderRect ): string {
		if ( !selectedBounds ) {
			return rectToPreviewStyle( rect );
		}

		return rectToStyle( {
			left: rect.left - selectedBounds.rect.left,
			top: rect.top - selectedBounds.rect.top,
			right: rect.right - selectedBounds.rect.left,
			bottom: rect.bottom - selectedBounds.rect.top,
			width: rect.width,
			height: rect.height,
		} );
	}

	function deleteSelectedNode() {
		const nodeId = state.ui.selectedNodeIds[ 0 ];
		if ( !nodeId ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/delete',
			documentId: state.activeDocumentId,
			nodeId,
		} );
		editor.closeContextMenu();
	}

	function wirePreviewBridge() {
		const previewHost = ensurePreviewHostController();
		if ( !previewHost ) {
			return;
		}

		cleanupPreviewBridge();
		const document = previewHost.mountTarget;

		const handleClick = ( event: MouseEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( !nodeElement ) {
				return;
			}

			event.preventDefault();
			selectPreviewNode( nodeElement );
		};

		const handlePointerOver = ( event: PointerEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( !nodeElement || resolveBuilderNodeElement( event.relatedTarget ) === nodeElement ) {
				return;
			}

			hoverPreviewNode( nodeElement );
		};

		const handlePointerOut = ( event: PointerEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( !nodeElement || resolveBuilderNodeElement( event.relatedTarget ) === nodeElement ) {
				return;
			}

			hoverPreviewNode( undefined );
		};

		const handleDoubleClick = ( event: MouseEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			const nodeId = nodeElement?.dataset.builderNode;
			const documentId = nodeElement?.dataset.builderDocument ?? editor.engine.getState().activeDocumentId;
			if ( !nodeId || !resolveInlineEditMode( documentId, nodeId ) ) {
				return;
			}

			event.preventDefault();
			selectPreviewNode( nodeElement );
			startInlineEditingForNode( nodeElement );
		};

		const handleContextMenu = ( event: MouseEvent ) => {
			const nodeElement = resolveBuilderNodeElement( event.target );
			if ( nodeElement ) {
				openPreviewNodeContextMenu( nodeElement, event );
				return;
			}

			openPreviewRootContextMenu( event );
		};

		document.addEventListener( 'click', handleClick, true );
		document.addEventListener( 'pointerover', handlePointerOver, true );
		document.addEventListener( 'pointerout', handlePointerOut, true );
		document.addEventListener( 'dblclick', handleDoubleClick, true );
		document.addEventListener( 'contextmenu', handleContextMenu, true );

		previewBridgeCleanup = () => {
			document.removeEventListener( 'click', handleClick, true );
			document.removeEventListener( 'pointerover', handlePointerOver, true );
			document.removeEventListener( 'pointerout', handlePointerOut, true );
			document.removeEventListener( 'dblclick', handleDoubleClick, true );
			document.removeEventListener( 'contextmenu', handleContextMenu, true );
		};
	}

	function queuePreviewSync() {
		if ( typeof window === 'undefined' ) {
			syncPreview();
			return;
		}

		cancelAnimationFrame( previewSyncFrame );
		previewSyncFrame = window.requestAnimationFrame( () => {
			previewSyncFrame = 0;
			syncPreview();
		} );
	}

	function syncPreview() {
		const previewHost = ensurePreviewHostController();
		if ( !previewHost ) {
			return;
		}

		cleanupPreviewBridge();
		renderVersion += 1;
		const nextRenderVersion = renderVersion;
		const mountTarget = previewHost.mountTarget;
		previewViewportHeight = mountTarget.clientHeight;
		runtimeMeasurementVersion = Math.min( runtimeMeasurementVersion, nextRenderVersion - 1 );

		if ( mountedRuntime ) {
			unmount( mountedRuntime );
			mountedRuntime = undefined;
		}

		mountTarget.replaceChildren();

		mountedRuntime = mount( BuilderRenderer, {
			target: mountTarget,
			props: {
				project: state.project,
				activeDocumentId: state.ui.preview.documentId ?? state.activeDocumentId,
				registry: editor.registry,
				adapter: editor.adapter,
				bindingContext: {
					...editor.bindingContext,
					query: new URLSearchParams( state.ui.preview.query ),
				},
				conditionContext: {
					pathname: state.ui.preview.pathname,
					query: new URLSearchParams( state.ui.preview.query ),
				},
				viewport: state.ui.viewport,
				showPopups: state.ui.preview.showPopups,
				bridgeEvents: true,
				bridgeRenderVersion: nextRenderVersion,
				onGeometrySnapshot: ( snapshot ) => {
					editor.incrementPerfCounter( 'geometrySnapshotsPosted' );
					applyGeometrySnapshot( snapshot );
				},
				onGeometryInvalidated: ( reason, renderVersion ) => {
					void reason;
					void renderVersion;
					editor.incrementPerfCounter( 'geometryInvalidations' );
				},
			},
		} );
		editor.incrementPerfCounter( 'previewMounts' );
		wirePreviewBridge();
		editor.incrementPerfCounter( 'fullPreviewSyncs' );
	}

	function getPreviewHostViewportRect() {
		const rect = ensurePreviewHostController()?.mountTarget.getBoundingClientRect();
		if ( !rect ) {
			return undefined;
		}

		return {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
		};
	}

	function resolvePreviewLocalRect( rect: BuilderRect ): BuilderRect {
		const viewportRect = getPreviewHostViewportRect();
		if ( !viewportRect ) {
			return rect;
		}

		return {
			top: rect.top - viewportRect.top,
			left: rect.left - viewportRect.left,
			right: rect.right - viewportRect.left,
			bottom: rect.bottom - viewportRect.top,
			width: rect.width,
			height: rect.height,
		};
	}

	function rectToPreviewStyle( rect: BuilderRect ): string {
		return rectToStyle( resolvePreviewLocalRect( rect ) );
	}

	function resolveDropIndicatorAxis( target: DropTarget | undefined ): 'x' | 'y' | undefined {
		if ( !target || target.placement === 'into' || target.placement === 'root' ) {
			return undefined;
		}

		const canvasIndex = state.ui.canvas.index;
		if ( target.slot !== undefined ) {
			const childBounds = canvasIndex.childBoundsBySlot.get( getCanvasGeometryKey( target.documentId, target.parentId, target.slot ) ) ?? [];
			return resolveDropIndicatorAxisFromBounds( target.rect, childBounds );
		}

		if ( target.parentId ) {
			const childBounds = canvasIndex.childBoundsByContainer.get( getCanvasGeometryKey( target.documentId, target.parentId, undefined ) ) ?? [];
			return resolveDropIndicatorAxisFromBounds( target.rect, childBounds );
		}

		return resolveDropIndicatorAxisFromBounds( target.rect, [] );
	}

	function createCoarseDropRegions( latestState: BuilderEngineState ): CoarseDropRegion[] {
		if ( !latestState.ui.dragSession || latestState.ui.dragSession.kind !== 'create' ) {
			return [];
		}

		const canvasIndex = latestState.ui.canvas.index;
		const regions: CoarseDropRegion[] = [];
		const addRegion = ( id: string, target: DropTarget, priority: CoarseDropRegion['priority'] ) => {
			regions.push( {
				id,
				target,
				priority,
				style: `${ rectToPreviewStyle( target.rect ) }pointer-events:auto;`,
			} );
		};

		for ( const slot of canvasIndex.rootSlotsByDocument.get( previewDocument.id ) ?? [] ) {
			addRegion(
				`root:${ slot.documentId }:${ slot.slot ?? 'default' }`,
				{
					documentId: slot.documentId,
					parentId: slot.ownerId,
					slot: slot.slot,
					index: slot.childNodeIds.length,
					placement: 'root',
					rect: slot.rect,
				},
				'root',
			);
		}

		for ( const slot of canvasIndex.nonRootSlotsByDocument.get( previewDocument.id ) ?? [] ) {
			addRegion(
				`slot:${ slot.documentId }:${ slot.ownerId ?? 'root' }:${ slot.slot ?? 'default' }`,
				{
					documentId: slot.documentId,
					parentId: slot.ownerId,
					slot: slot.slot,
					index: slot.childNodeIds.length,
					placement: 'into',
					targetNodeId: slot.ownerId,
					rect: slot.rect,
				},
				'slot',
			);
		}

		for ( const container of canvasIndex.containersByDocument.get( previewDocument.id ) ?? [] ) {
			const childBounds = canvasIndex.childBoundsByContainer.get( getCanvasGeometryKey( container.documentId, container.nodeId, undefined ) ) ?? [];
			if ( childBounds.length > 0 ) {
				continue;
			}

			addRegion(
				`container:${ container.documentId }:${ container.nodeId }`,
				{
					documentId: container.documentId,
					parentId: container.nodeId,
					slot: undefined,
					index: 0,
					placement: 'into',
					targetNodeId: container.nodeId,
					rect: container.rect,
				},
				'container',
			);
		}

		return regions;
	}

	function resolveDropIndicatorAxisFromBounds( rect: BuilderRect, childBounds: NodeBounds[] ): 'x' | 'y' {
		if ( childBounds.length > 1 ) {
			const first = childBounds[ 0 ];
			const last = childBounds.at( -1 );
			if ( first && last ) {
				const spreadX = Math.abs( last.rect.left - first.rect.left ) + last.rect.width;
				const spreadY = Math.abs( last.rect.top - first.rect.top ) + last.rect.height;
				return spreadX > spreadY ? 'x' : 'y';
			}
		}

		return rect.width > rect.height * 1.4 ? 'x' : 'y';
	}

	function getDropIndicatorStyle( target: DropTarget | undefined, axis: 'x' | 'y' | undefined ): string {
		if ( !target ) {
			return '';
		}

		const rect = resolvePreviewLocalRect( target.indicatorRect ?? target.rect );

		if ( target.placement === 'into' || target.placement === 'root' ) {
			return rectToStyle( rect );
		}

		const resolvedAxis = axis ?? 'y';
		const bandThickness = 12;
		const coreThickness = 3;

		if ( resolvedAxis === 'x' ) {
			const left = target.indicatorRect
				? ( rect.left + rect.right - bandThickness ) / 2
				: target.placement === 'before'
				? rect.left - ( bandThickness / 2 )
				: rect.right - ( bandThickness / 2 );
			return [
				`left:${ left }px`,
				`top:${ rect.top }px`,
				`width:${ bandThickness }px`,
				`height:${ rect.height }px`,
				'border:1px solid rgba(208, 4, 212, 0.28)',
				'border-radius:999px',
				'background:linear-gradient(90deg, rgba(208, 4, 212, 0.12) 0%, rgba(208, 4, 212, 0.22) 100%)',
				'box-shadow:0 8px 22px rgba(143, 0, 157, 0.18)',
				`background-image:linear-gradient(90deg,
					rgba(208, 4, 212, 0.12) 0%,
					rgba(208, 4, 212, 0.22) 100%
				),
				linear-gradient(90deg,
					transparent calc(50% - ${ coreThickness / 2 }px),
					rgba(246, 208, 255, 0.96) calc(50% - ${ coreThickness / 2 }px),
					rgba(208, 4, 212, 0.98) calc(50% + ${ coreThickness / 2 }px),
					transparent calc(50% + ${ coreThickness / 2 }px)
				)`,
			].join( ';' ) + ';';
		}

		const top = target.indicatorRect
			? ( rect.top + rect.bottom - bandThickness ) / 2
			: target.placement === 'before'
			? rect.top - ( bandThickness / 2 )
			: rect.bottom - ( bandThickness / 2 );
		return [
			`left:${ rect.left }px`,
			`top:${ top }px`,
			`width:${ rect.width }px`,
			`height:${ bandThickness }px`,
			'border:1px solid rgba(208, 4, 212, 0.28)',
			'border-radius:999px',
			'background:linear-gradient(180deg, rgba(208, 4, 212, 0.12) 0%, rgba(208, 4, 212, 0.22) 100%)',
			'box-shadow:0 8px 22px rgba(143, 0, 157, 0.18)',
			`background-image:linear-gradient(180deg,
				rgba(208, 4, 212, 0.12) 0%,
				rgba(208, 4, 212, 0.22) 100%
			),
			linear-gradient(180deg,
				transparent calc(50% - ${ coreThickness / 2 }px),
				rgba(246, 208, 255, 0.96) calc(50% - ${ coreThickness / 2 }px),
				rgba(208, 4, 212, 0.98) calc(50% + ${ coreThickness / 2 }px),
				transparent calc(50% + ${ coreThickness / 2 }px)
			)`,
		].join( ';' ) + ';';
	}

	function getDropTargetHighlightStyle( target: DropTarget | undefined, axis: 'x' | 'y' | undefined ): string {
		if ( !target || target.placement === 'into' || target.placement === 'root' ) {
			return '';
		}

		const rect = resolvePreviewLocalRect( target.indicatorRect ?? target.rect );
		const resolvedAxis = axis ?? 'y';
		const edgeShadow = resolvedAxis === 'x'
			? target.placement === 'before'
				? `inset 2px 0 0 rgba(208, 4, 212, 0.32)`
				: `inset -2px 0 0 rgba(208, 4, 212, 0.32)`
			: target.placement === 'before'
				? `inset 0 2px 0 rgba(208, 4, 212, 0.32)`
				: `inset 0 -2px 0 rgba(208, 4, 212, 0.32)`;

		return `${ rectToStyle( rect ) }border:1px solid rgba(208, 4, 212, 0.16);background:rgba(208, 4, 212, 0.035);box-shadow:${ edgeShadow };`;
	}

	function getDropTargetHandleStyles( target: DropTarget | undefined, axis: 'x' | 'y' | undefined ): string[] {
		if ( !target || target.placement === 'into' || target.placement === 'root' ) {
			return [];
		}

		const rect = resolvePreviewLocalRect( target.indicatorRect ?? target.rect );
		const resolvedAxis = axis ?? 'y';
		const bandThickness = 12;
		const handleSize = 8;

		if ( resolvedAxis === 'x' ) {
			const left = target.indicatorRect
				? ( rect.left + rect.right - handleSize ) / 2
				: target.placement === 'before'
				? rect.left - ( bandThickness / 2 ) + ( bandThickness / 2 ) - ( handleSize / 2 )
				: rect.right - ( bandThickness / 2 ) + ( bandThickness / 2 ) - ( handleSize / 2 );
			return [
				`left:${ left }px;top:${ rect.top - ( handleSize / 2 ) }px;width:${ handleSize }px;height:${ handleSize }px;`,
				`left:${ left }px;top:${ rect.bottom - ( handleSize / 2 ) }px;width:${ handleSize }px;height:${ handleSize }px;`,
			];
		}

		const top = target.indicatorRect
			? ( rect.top + rect.bottom - handleSize ) / 2
			: target.placement === 'before'
			? rect.top - ( bandThickness / 2 ) + ( bandThickness / 2 ) - ( handleSize / 2 )
			: rect.bottom - ( bandThickness / 2 ) + ( bandThickness / 2 ) - ( handleSize / 2 );
		return [
			`left:${ rect.left - ( handleSize / 2 ) }px;top:${ top }px;width:${ handleSize }px;height:${ handleSize }px;`,
			`left:${ rect.right - ( handleSize / 2 ) }px;top:${ top }px;width:${ handleSize }px;height:${ handleSize }px;`,
		];
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

	function clearInlineCommitTimer() {
		if ( inlineCommitTimer ) {
			clearTimeout( inlineCommitTimer );
			inlineCommitTimer = undefined;
		}
	}

	function clearInlineBlurTimer() {
		if ( inlineBlurTimer ) {
			clearTimeout( inlineBlurTimer );
			inlineBlurTimer = undefined;
		}
	}

	function normalizePlainText( value: string ): string {
		return normalizeInlineEditingPlainText( value );
	}

	function resolveInlineEditingNode( documentId: string, nodeId: string ) {
		const cache = editor.getDocumentCache( documentId );
		const node = cache?.nodeById.get( nodeId );
		if ( !node ) {
			return undefined;
		}

		const definition = editor.registry.elements.get( node.type );
		if ( !definition?.runtime.supportsInlineEditing ) {
			return undefined;
		}

		return {
			node,
			definition,
		};
	}

	function parseInlineEditMode( value: string | undefined ): BuilderInlineEditingMode | undefined {
		return value === 'text' || value === 'html' ? value : undefined;
	}

	function resolveInlineEditMode(
		documentId: string,
		nodeId: string,
		datasetMode?: string,
	): BuilderInlineEditingMode | undefined {
		const modeFromDataset = parseInlineEditMode( datasetMode );
		if ( modeFromDataset ) {
			return modeFromDataset;
		}

		const inlineEditingNode = resolveInlineEditingNode( documentId, nodeId );
		if ( !inlineEditingNode ) {
			return undefined;
		}

		return resolveBuilderInlineEditingMode(
			inlineEditingNode.node.type,
			inlineEditingNode.definition.runtime.supportsInlineEditing,
		);
	}

	function resolveInlineTextValue( update: PendingInlineUpdate ): string {
		return serializeInlineEditingValue( {
			nodeType: resolveInlineEditingNode( update.documentId, update.nodeId )?.node.type,
			mode: resolveInlineEditMode( update.documentId, update.nodeId ),
			value: update.value,
			html: update.html,
		} );
	}

	function resolveInlineEditorValue( session = state.ui.inlineEditing ): string {
		if ( !session ) {
			return '';
		}

		const cache = editor.getDocumentCache( session.documentId );
		const node = cache?.nodeById.get( session.nodeId );
		return typeof node?.props.text === 'string' ? node.props.text : '';
	}

	function handleInlineEditorChange( detail: { mode: 'html' | 'text'; value: string; html: string; text: string } ) {
		const inlineSession = state.ui.inlineEditing;
		if ( !inlineSession ) {
			return;
		}

		inlineEditorValue = detail.value;
		const inlineEditMode = resolveInlineEditMode( inlineSession.documentId, inlineSession.nodeId );
		if ( !inlineEditMode ) {
			return;
		}

		queueInlineUpdate( {
			documentId: inlineSession.documentId,
			nodeId: inlineSession.nodeId,
			value: detail.text,
			html: detail.html,
			richText: inlineEditMode === 'html',
		} );
	}

	function stopInlineEditor() {
		clearInlineBlurTimer();
		flushInlineUpdate();
		editor.dispatch( { type: 'document/ui/stop-inline-edit' } );
		queuePreviewSync();
	}

	function shouldPreserveInlineEditorForTarget( target: Element | null ): boolean {
		return Boolean( target?.closest( '[data-inline-rich-text-root="true"], [data-inline-edit-preserve-focus="true"]' ) );
	}

	function handleInlineEditorBlur() {
		clearInlineBlurTimer();
		inlineBlurTimer = window.setTimeout( () => {
			if ( shouldPreserveInlineEditorForTarget( document.activeElement ) ) {
				return;
			}

			stopInlineEditor();
		}, 0 );
	}

	function getInlineEditorStyle( rect: BuilderRect ): string {
		const localRect = resolvePreviewLocalRect( rect );
		return `left:${ localRect.left }px;top:${ localRect.top }px;width:${ Math.max( localRect.width, 180 ) }px;min-height:${ Math.max( localRect.height, 48 ) }px;`;
	}

	function flushInlineUpdate() {
		clearInlineCommitTimer();
		if ( !pendingInlineUpdate ) {
			return;
		}

		const update = pendingInlineUpdate;
		pendingInlineUpdate = undefined;
		suppressNextProjectSyncFor = {
			documentId: update.documentId,
			nodeId: update.nodeId,
		};
		editor.dispatch( {
			type: 'document/elements/update',
			documentId: update.documentId,
			nodeId: update.nodeId,
			propsPatch: {
				text: resolveInlineTextValue( update ),
			},
		} );
	}

	function queueInlineUpdate( update: PendingInlineUpdate ) {
		pendingInlineUpdate = {
			...update,
			value: normalizePlainText( update.value ),
		};
		clearInlineCommitTimer();
		inlineCommitTimer = window.setTimeout( flushInlineUpdate, INLINE_COMMIT_DELAY );
	}

	function setViewport( viewport: string ) {
		if ( state.ui.viewport === viewport ) {
			return;
		}

		editor.dispatch( { type: 'document/ui/set-viewport', viewport } );
	}

	function togglePreviewPopups() {
		editor.togglePreviewPopups( !state.ui.preview.showPopups );
	}

	function closeResponsiveBar() {
		setViewport( 'desktop' );
		editor.toggleResponsiveBar( false );
	}

	function resolveViewportIconName( viewportId: string ): 'desktop' | 'tablet' | 'mobile' {
		switch ( viewportKindFor( viewportId ) ) {
			case 'tablet':
				return 'tablet';
			case 'mobile':
				return 'mobile';
			default:
				return 'desktop';
		}
	}

	function formatModeLabel( value: string ) {
		return value.replaceAll( '-', ' ' );
	}

	function formatNodeTypeLabel( value: string | undefined ) {
		return ( value ?? 'node' )
			.replaceAll( '-', ' ' )
			.replace( /\b\w/g, ( character ) => character.toUpperCase() );
	}

	function resolveViewportTitle( viewport: BreakpointDefinition ) {
		return `${ viewport.label } (${ resolvePreviewViewportWidth( viewport.id, viewportDefinitions ) }px)`;
	}

	function viewportKindFor( viewportId: string ) {
		return resolvePreviewViewportKind( viewportId, viewportDefinitions );
	}

	function arePreviewStatesEqual( left: BuilderEngineState, right: BuilderEngineState ) {
		return left.project === right.project
			&& left.activeDocumentId === right.activeDocumentId
			&& left.ui.viewport === right.ui.viewport
			&& left.ui.preview.pathname === right.ui.preview.pathname
			&& left.ui.preview.query === right.ui.preview.query
			&& left.ui.preview.showPopups === right.ui.preview.showPopups
			&& left.ui.preview.documentId === right.ui.preview.documentId
			&& left.ui.preview.slot === right.ui.preview.slot
			&& left.ui.preview.assignmentId === right.ui.preview.assignmentId
			&& left.ui.preview.source === right.ui.preview.source
			&& left.ui.selectedNodeIds[ 0 ] === right.ui.selectedNodeIds[ 0 ]
			&& left.ui.hoveredNodeId === right.ui.hoveredNodeId
			&& left.ui.inlineEditing?.nodeId === right.ui.inlineEditing?.nodeId
			&& left.ui.dragSession === right.ui.dragSession
			&& left.ui.dropTarget === right.ui.dropTarget
			&& left.ui.canvas.renderVersion === right.ui.canvas.renderVersion
			&& left.ui.canvas.snapshotVersion === right.ui.canvas.snapshotVersion
			&& left.ui.shell.responsiveBarVisible === right.ui.shell.responsiveBarVisible
			&& left.ui.saveState === right.ui.saveState
			&& left.ui.mode === right.ui.mode
			&& left.ui.componentEditing.context === right.ui.componentEditing.context
			&& left.ui.componentEditing.componentDocumentId === right.ui.componentEditing.componentDocumentId;
	}

	onMount( () => {
		unsubscribe = editor.subscribeSelector( ( nextState ) => nextState, ( nextState ) => {
			const previousState = state;
			const projectChanged = nextState.project !== previousState.project;
			const suppressProjectSync = projectChanged
				&& Boolean( suppressNextProjectSyncFor )
				&& suppressNextProjectSyncFor?.documentId === nextState.activeDocumentId
				&& suppressNextProjectSyncFor?.nodeId === previousState.ui.inlineEditing?.nodeId
				&& suppressNextProjectSyncFor?.nodeId === nextState.ui.inlineEditing?.nodeId;
			const shouldSyncPreview = !suppressProjectSync && (
				projectChanged
				|| nextState.activeDocumentId !== previousState.activeDocumentId
				|| nextState.ui.viewport !== previousState.ui.viewport
				|| nextState.ui.preview.pathname !== previousState.ui.preview.pathname
				|| nextState.ui.preview.query !== previousState.ui.preview.query
				|| nextState.ui.preview.showPopups !== previousState.ui.preview.showPopups
				|| nextState.ui.preview.documentId !== previousState.ui.preview.documentId
				|| nextState.ui.preview.slot !== previousState.ui.preview.slot
				|| nextState.ui.preview.assignmentId !== previousState.ui.preview.assignmentId
				|| nextState.ui.preview.source !== previousState.ui.preview.source
			);
			const shouldRefreshOverlay = suppressProjectSync
				|| nextState.ui.selectedNodeIds[ 0 ] !== previousState.ui.selectedNodeIds[ 0 ]
				|| nextState.ui.hoveredNodeId !== previousState.ui.hoveredNodeId
				|| nextState.ui.inlineEditing?.nodeId !== previousState.ui.inlineEditing?.nodeId
				|| nextState.ui.canvas.renderVersion !== previousState.ui.canvas.renderVersion
				|| nextState.ui.canvas.snapshotVersion !== previousState.ui.canvas.snapshotVersion;
			state = nextState;
			if ( suppressProjectSync ) {
				suppressNextProjectSyncFor = undefined;
			}
			if ( shouldSyncPreview ) {
				if ( pendingInlineUpdate ) {
					flushInlineUpdate();
					return;
				}
				queuePreviewSync();
				return;
			}
			if ( shouldRefreshOverlay ) {
				previewViewportHeight = ensurePreviewHostController()?.mountTarget.clientHeight ?? previewViewportHeight;
				editor.incrementPerfCounter( 'overlayOnlyUpdates' );
			}
		}, arePreviewStatesEqual, 'preview' );
		queuePreviewSync();

		return () => {
			registerSurface( undefined );
			cleanupPreviewBridge();
			flushInlineUpdate();
			clearInlineCommitTimer();
			clearInlineBlurTimer();
			clearLayoutGapDragListeners();
			cancelAnimationFrame( previewSyncFrame );
			editor.clearTransientDrag();
			selectionRailCleanup();
			hoverRailCleanup();
			unsubscribe();
			if ( mountedRuntime ) {
				unmount( mountedRuntime );
			}
			previewHostController?.destroy();
			previewHostController = undefined;
		};
	} );
</script>

<div
	bind:this={previewShell}
	class="builder-preview-shell"
	data-builder-preview-source={state.ui.preview.source ?? 'manual'}
	data-builder-preview-device={previewViewportKind}
>
	<div class:expanded={state.ui.shell.responsiveBarVisible} class="builder-preview__responsive-bar">
		<div class="builder-preview__bar-spacer"></div>

		<div class="builder-preview__bar-center">
			<div class="builder-preview__device-strip" role="toolbar" aria-label="Preview devices">
				{#each viewportDefinitions as viewport (viewport.id)}
					<button
						type="button"
						class:active={state.ui.viewport === viewport.id}
						class="builder-preview__device-button"
						data-inline-edit-preserve-focus="true"
						aria-label={viewport.label}
						title={resolveViewportTitle( viewport )}
						onclick={() => setViewport( viewport.id )}
					>
						<EditorShellIcon name={resolveViewportIconName( viewport.id )} title={viewport.label} size={16} />
					</button>
				{/each}
			</div>

			<div class="builder-preview__scale-strip" aria-label="Preview scale">
				<button type="button" class="builder-preview__scale-button" disabled aria-label="Decrease zoom">-</button>
				<div class="builder-preview__scale-value">100%</div>
				<button type="button" class="builder-preview__scale-button" disabled aria-label="Increase zoom">+</button>
				<button type="button" class="builder-preview__scale-button" data-inline-edit-preserve-focus="true" onclick={() => setViewport( 'desktop' )} aria-label="Reset viewport">
					<EditorShellIcon name="revision" title="Reset viewport" size={14} />
				</button>
			</div>
		</div>

		<div class="builder-preview__bar-end">
			<div class="builder-preview__size-inputs" aria-label="Viewport size">
				<label for="builder-preview-width">W</label>
				<input id="builder-preview-width" readonly value={previewViewportWidth} />
				<label for="builder-preview-height">H</label>
				<input id="builder-preview-height" readonly value={previewViewportHeight} />
			</div>
			<button
				type="button"
				class:active={state.ui.preview.showPopups}
				class="builder-preview__bar-button"
				onclick={togglePreviewPopups}
			>
				Popups
			</button>
			<button type="button" class="builder-preview__bar-button builder-preview__bar-button--icon" data-inline-edit-preserve-focus="true" aria-label="Close responsive bar" onclick={closeResponsiveBar}>
				<EditorShellIcon name="close" title="Close responsive bar" size={14} />
			</button>
		</div>
	</div>

	<div class="builder-preview__stage">
		<div
			class:collapsed={state.ui.shell.panelCollapsed}
			class="builder-preview__divider-affordance builder-preview__divider-affordance--left"
			data-builder-shell-divider="left"
			aria-hidden="true"
		>
			<span></span>
		</div>
		<div class="builder-preview__frame-stack">
			<div class="builder-preview__frame-chrome">
				<div class="builder-preview__window-dots" aria-hidden="true">
					<span></span>
					<span></span>
					<span></span>
				</div>
				<div class="builder-preview__location-pill">
					<span class="builder-preview__location-path">{state.ui.preview.pathname || '/'}</span>
					{#if state.ui.preview.query}
						<span class="builder-preview__location-query">?{state.ui.preview.query}</span>
					{/if}
				</div>
				<div class="builder-preview__frame-meta">
					<span>{state.ui.saveState}</span>
					<span>{previewViewportWidth}px</span>
					<span>{activeAssignments.length} assignment{activeAssignments.length === 1 ? '' : 's'}</span>
				</div>
			</div>

			{#if contextBanner}
				<div class={`builder-preview__context-banner builder-preview__context-banner--${contextBanner.tone}`}>
					<div class="builder-preview__context-copy">
						<span>{contextBanner.label}</span>
						<strong>{contextBanner.title}</strong>
						<small>{contextBanner.detail}</small>
					</div>
					{#if contextBanner.action === 'open-master'}
						<button type="button" onclick={openSelectedComponentMaster}>Open Master</button>
					{/if}
				</div>
			{/if}

			<div class="builder-preview__viewport-shell" style={previewFrameStyle}>
				<div class="builder-preview__viewport-frame">
					<div class="builder-preview__iframe-clip">
						<div bind:this={frameShell} class="builder-preview" data-builder-preview-surface="true" title="Builder preview"></div>
						{#if liveAiPreviewActive}
							<div class="builder-preview__ai-standin" data-builder-ai-standin="true">
								<div class="builder-preview__ai-standin-header">
									<span>HTML preview</span>
									<small>{liveAiPreviewStatus || liveAiPreviewTitle || 'Waiting for generated HTML'}</small>
								</div>
								<iframe
									bind:this={aiStandinIframe}
									title="AI generated HTML preview"
									sandbox="allow-same-origin"
									srcdoc={liveAiPreviewFrameSrcdoc}
									onload={resizeLiveAiPreviewIframe}
								></iframe>
							</div>
						{/if}
						{#if previewLoading}
							<div class="builder-preview__loading">
								<div class="builder-preview__loading-card">
									<div class="builder-preview__loading-badge">Rendering preview</div>
									<div class="builder-preview__loading-line builder-preview__loading-line--short"></div>
									<div class="builder-preview__loading-line"></div>
									<div class="builder-preview__loading-line builder-preview__loading-line--mid"></div>
								</div>
							</div>
						{/if}
						<div class:dragging={Boolean( state.ui.dragSession )} class="builder-preview__overlay">
							{#if state.ui.dragSession}
								{#each coarseDropRegions as region (region.id)}
									<PreviewDroppableRegion
										id={region.id}
										target={region.target}
										priority={region.priority}
										style={region.style}
									/>
								{/each}
							{/if}

							{#if hoveredBounds && hoveredBounds.nodeId !== state.ui.selectedNodeIds[0]}
								<div bind:this={hoverOverlayElement} class="builder-preview__hover" style={rectToPreviewStyle( hoveredBounds.rect )}>
									<div bind:this={hoverRailElement} class="builder-preview__action-rail builder-preview__action-rail--hover">
										<button type="button" onclick={() => {
											editor.dispatch( { type: 'document/ui/select-node', nodeId: hoveredBounds.nodeId } );
											focusSelectedNodeInEditor();
										}}>
											Edit
										</button>
										<span>{formatNodeTypeLabel( hoveredBounds.nodeType )}</span>
									</div>
								</div>
							{/if}

							{#if selectedBounds}
								<div
									bind:this={selectionOverlayElement}
									class:builder-preview__selection--container={selectedBounds.acceptsChildren || selectedBounds.slotIds.length > 0}
									class="builder-preview__selection"
									{@attach selectedNodeDraggable.attach}
									style={rectToPreviewStyle( selectedBounds.rect )}
								></div>
							{/if}

							{#if selectedBounds && selectedLayoutOverlay && !state.ui.dragSession && !state.ui.inlineEditing}
								<div
									class="builder-preview__layout-overlay"
									data-layout-display={selectedLayoutOverlay.display}
									data-layout-axis={selectedLayoutOverlay.axis}
									style={getLayoutOverlayStyle( selectedBounds )}
								>
									<div class="builder-preview__layout-label">
										<span>{selectedLayoutOverlay.label}</span>
										<span>Gap {selectedLayoutOverlay.gap.value}</span>
										<span>J {selectedLayoutOverlay.alignment.justify}</span>
										<span>A {selectedLayoutOverlay.alignment.align}</span>
									</div>
									{#if selectedLayoutOverlay.display === 'grid'}
										<div class="builder-preview__layout-grid-lines" aria-hidden="true">
											{#each getLayoutGridLineStyles( selectedLayoutOverlay, 'x' ) as lineStyle}
												<span class="builder-preview__layout-grid-line builder-preview__layout-grid-line--column" style={lineStyle}></span>
											{/each}
											{#each getLayoutGridLineStyles( selectedLayoutOverlay, 'y' ) as lineStyle}
												<span class="builder-preview__layout-grid-line builder-preview__layout-grid-line--row" style={lineStyle}></span>
											{/each}
										</div>
									{/if}
									{#if selectedLayoutOverlay.childCount === 0}
										<div class="builder-preview__layout-empty">
											<span>Drop into {selectedLayoutOverlay.display}</span>
										</div>
									{/if}
									<div class="builder-preview__layout-child-outlines" aria-hidden="true">
										{#each getLayoutOverlayChildRects( selectedLayoutChildBounds ) as childRect}
											<span class="builder-preview__layout-child-outline" style={getLayoutChildRectStyle( childRect )}></span>
										{/each}
									</div>
									<button
										type="button"
										class="builder-preview__layout-gap-handle"
										data-layout-gap-handle="true"
										data-inline-edit-preserve-focus="true"
										aria-label={`Adjust ${ selectedLayoutOverlay.display } gap`}
										title="Drag to adjust gap"
										onpointerdown={startLayoutGapDrag}
									>
										<span></span>
									</button>
								</div>
							{/if}

							{#if dropTarget}
								{#if dropTargetHighlightStyle}
									<div
										class="builder-preview__drop-target-highlight"
										data-drop-axis={dropTargetAxis ?? ''}
										data-drop-placement={dropTarget.placement}
										style={dropTargetHighlightStyle}
									></div>
								{/if}
								<div
									class:band={dropTarget.placement === 'before' || dropTarget.placement === 'after'}
									class:band-x={dropTargetAxis === 'x'}
									class:band-y={dropTargetAxis !== 'x'}
									class="builder-preview__drop-target"
									data-drop-axis={dropTargetAxis ?? ''}
									data-drop-placement={dropTarget.placement}
									style={dropTargetIndicatorStyle}
								></div>
								{#each dropTargetHandleStyles as handleStyle, handleIndex}
									<div
										class="builder-preview__drop-target-handle"
										data-drop-axis={dropTargetAxis ?? ''}
										data-drop-placement={dropTarget.placement}
										data-drop-handle={handleIndex}
										style={handleStyle}
									></div>
								{/each}
							{/if}

							{#if state.ui.inlineEditing && inlineEditingBounds}
								<div class="builder-preview__inline-editor-shell" style={getInlineEditorStyle( inlineEditingBounds.rect )}>
									<InlineRichTextEditor
										value={inlineEditorValue}
										valueMode={inlineEditorMode}
										minHeight={`${ Math.max( inlineEditingBounds.rect.height, 48 ) }px`}
										showBubbleMenu={state.ui.inlineEditing.richText}
										showToolbar={true}
										autofocus={true}
										onChange={handleInlineEditorChange}
										onBlur={handleInlineEditorBlur}
										onFocus={clearInlineBlurTimer}
									/>
								</div>
							{/if}
						</div>
						{#if selectedBounds}
							<div
								bind:this={selectionRailElement}
								class:builder-preview__action-rail--container={selectedBounds.acceptsChildren || selectedBounds.slotIds.length > 0}
								class="builder-preview__action-rail"
							>
								<span class="builder-preview__action-label">{formatNodeTypeLabel( selectedBounds.nodeType )}</span>
								<button type="button" onclick={() => focusSelectedNodeInEditor()}>Edit</button>
								<button
									type="button"
									class="builder-preview__action-button--grab"
									{@attach selectedNodeDraggable.attachHandle}
									aria-label="Grab selected node"
								>
									Grab
								</button>
								<button type="button" onclick={duplicateSelectedNode}>Duplicate</button>
								<button type="button" class="builder-preview__action-button--danger" onclick={deleteSelectedNode}>Delete</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div
			class:collapsed={state.ui.shell.panelCollapsed}
			class="builder-preview__divider-affordance builder-preview__divider-affordance--right"
			data-builder-shell-divider="right"
			aria-hidden="true"
		>
			<span></span>
		</div>
	</div>
</div>

<style>
	.builder-preview-shell {
		--builder-preview-stage: var(--builder-shell-stage-bg, #2b2c31);
		--builder-preview-stage-deep: var(--builder-shell-stage-bg-deep, #1f2124);
		--builder-preview-accent: var(--builder-shell-accent, #d004d4);
		--builder-preview-accent-strong: var(--builder-shell-accent-strong, #524cff);
		--builder-preview-text: #f4f7fb;
		--builder-preview-muted: rgba(228, 233, 243, 0.72);
		--builder-preview-frame-bg: #ffffff;
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		color: var(--builder-preview-text);
		background: linear-gradient(180deg, var(--builder-preview-stage) 0%, var(--builder-preview-stage-deep) 100%);
	}

	.builder-preview__responsive-bar {
		position: sticky;
		top: 0;
		z-index: 6;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.6rem;
		height: 0;
		padding: 0 0.75rem;
		overflow: hidden;
		color: var(--builder-shell-gray-200);
		background: var(--builder-shell-gray-800);
		opacity: 0;
		border-bottom: 0;
		box-shadow: 0 0 10px 2px rgba(0, 0, 0, 0.33), 0 0 2px 1px rgba(0, 0, 0, 0.25), 0 0 6px -3px rgba(255, 255, 255, 0.5);
		transition: height 160ms ease, opacity 120ms ease, border-color 160ms ease;
	}

	.builder-preview__responsive-bar.expanded {
		height: var(--builder-shell-responsive-bar-height);
		opacity: 1;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.builder-preview__bar-spacer,
	.builder-preview__bar-center,
	.builder-preview__bar-end,
	.builder-preview__size-inputs,
	.builder-preview__device-strip,
	.builder-preview__scale-strip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

	.builder-preview__bar-center {
		justify-content: center;
		padding-inline: 18px;
	}

	.builder-preview__bar-end {
		justify-content: flex-end;
	}

	.builder-preview__size-inputs {
		gap: 4px;
		padding-inline-end: 8px;
		border-inline-end: 1px solid rgba(255, 255, 255, 0.12);
	}

	.builder-preview__size-inputs label {
		font-size: 11px;
		color: var(--builder-shell-gray-200);
	}

	.builder-preview__size-inputs input {
		width: 56px;
		height: 18px;
		padding: 0 3px;
		border: 1px solid var(--builder-shell-gray-200);
		border-radius: 0;
		background: transparent;
		color: var(--builder-shell-gray-200);
		font-size: 12px;
		line-height: 16px;
		text-align: center;
	}

	.builder-preview__bar-button,
	.builder-preview__scale-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 22px;
		min-width: 22px;
		padding: 0 8px;
		border: 0;
		border-radius: 3px;
		background: transparent;
		color: inherit;
		font-size: 12px;
		cursor: pointer;
		transition: var(--builder-shell-transition-hover);
	}

	.builder-preview__bar-button:hover,
	.builder-preview__scale-button:hover {
		color: var(--builder-shell-gray-50);
		background: var(--builder-shell-gray-700);
	}

	.builder-preview__bar-button.active {
		background: var(--builder-shell-gray-700);
		color: var(--builder-shell-gray-25);
	}

	.builder-preview__bar-button--icon {
		width: 22px;
		padding: 0;
	}

	.builder-preview__scale-strip {
		padding-inline-start: 14px;
		border-inline-start: 1px solid rgba(255, 255, 255, 0.12);
	}

	.builder-preview__scale-button:disabled {
		opacity: 0.75;
		cursor: default;
	}

	.builder-preview__scale-value {
		min-width: 38px;
		text-align: center;
		font-size: 13px;
	}

	.builder-preview__device-strip {
		padding-inline-end: 14px;
		border-inline-end: 1px solid rgba(255, 255, 255, 0.12);
	}

	.builder-preview__device-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: 0;
		border-radius: 3px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		transition: var(--builder-shell-transition-hover);
	}

	.builder-preview__device-button:hover {
		color: var(--builder-shell-gray-50);
		background: var(--builder-shell-gray-700);
	}

	.builder-preview__device-button.active {
		background: var(--builder-shell-gray-700);
		color: var(--builder-shell-gray-25);
	}

	.builder-preview__stage {
		position: relative;
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
		background:
			radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 38%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.015), rgba(255, 255, 255, 0.01)),
			linear-gradient(180deg, var(--builder-preview-stage), var(--builder-preview-stage-deep));
		overflow: hidden;
	}

	.builder-preview__divider-affordance {
		position: absolute;
		top: 50%;
		z-index: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 112px;
		transform: translateY( -50% );
		pointer-events: none;
	}

	.builder-preview__divider-affordance--left {
		left: 6px;
	}

	.builder-preview__divider-affordance--right {
		right: 6px;
	}

	.builder-preview__divider-affordance span {
		position: relative;
		display: block;
		width: 6px;
		height: 70px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
	}

	.builder-preview__divider-affordance span::before {
		content: '';
		position: absolute;
		inset: 21px 1px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
	}

	.builder-preview__divider-affordance.collapsed span {
		background: rgba(208, 4, 212, 0.1);
	}

	.builder-preview__frame-stack {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		height: 100%;
		min-height: 0;
		min-width: 0;
	}

	.builder-preview__frame-chrome,
	.builder-preview__context-banner {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		padding: 8px 14px;
		border-radius: 6px;
		background: rgba(31, 33, 36, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
	}

	.builder-preview__window-dots {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.builder-preview__window-dots span {
		width: 0.62rem;
		height: 0.62rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
	}

	.builder-preview__window-dots span:nth-child(1) {
		background: #ff6b6b;
	}

	.builder-preview__window-dots span:nth-child(2) {
		background: #ffd166;
	}

	.builder-preview__window-dots span:nth-child(3) {
		background: #4ade80;
	}

	.builder-preview__location-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 12px;
		color: rgba(244, 247, 251, 0.92);
	}

	.builder-preview__location-path,
	.builder-preview__location-query {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-preview__location-query {
		color: var(--builder-preview-muted);
	}

	.builder-preview__frame-meta {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-size: 11px;
		color: var(--builder-preview-muted);
	}

	.builder-preview__frame-meta span {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 0.55rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.builder-preview__context-banner {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.builder-preview__context-banner--component {
		border-color: rgba(208, 4, 212, 0.18);
	}

	.builder-preview__context-banner--detached {
		border-color: rgba(250, 204, 21, 0.2);
	}

	.builder-preview__context-banner--compat {
		border-color: rgba(248, 113, 113, 0.2);
	}

	.builder-preview__context-copy {
		display: grid;
		gap: 0.18rem;
		min-width: 0;
	}

	.builder-preview__context-copy span,
	.builder-preview__context-copy strong,
	.builder-preview__context-copy small {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-preview__context-copy span {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #f0abfc;
	}

	.builder-preview__context-copy strong {
		font-size: 0.88rem;
		color: #ffffff;
	}

	.builder-preview__context-copy small {
		color: var(--builder-preview-muted);
	}

	.builder-preview__context-banner button {
		height: 30px;
		padding: 0 0.9rem;
		border: 0;
		border-radius: 999px;
		background: rgba(208, 4, 212, 0.18);
		color: #ffffff;
		font-weight: 700;
		cursor: pointer;
	}

	.builder-preview__viewport-shell {
		display: flex;
		flex: 1;
		align-items: stretch;
		justify-content: center;
		width: min(100%, var(--builder-preview-frame-width, 1280px));
		height: 100%;
		min-height: 0;
		margin-inline: auto;
		padding-block-start: 0;
		transition: width 180ms ease;
	}

	.builder-preview__viewport-frame {
		position: relative;
		display: flex;
		flex: 1;
		min-height: 0;
		width: 100%;
	}

	.builder-preview__iframe-clip {
		position: relative;
		display: flex;
		flex: 1;
		width: 100%;
		height: 100%;
		min-height: 0;
		border-radius: 6px;
		overflow: hidden;
		background: var(--builder-preview-frame-bg);
		border: 1px solid rgba(15, 23, 42, 0.2);
		box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28);
	}

	.builder-preview {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
		background: var(--builder-preview-frame-bg);
	}

	.builder-preview__ai-standin {
		position: absolute;
		z-index: 8;
		top: 18px;
		left: 18px;
		right: 18px;
		display: flex;
		flex-direction: column;
		max-height: calc(100% - 36px);
		border: 1px solid rgba(208, 4, 212, 0.72);
		border-radius: 10px;
		overflow: hidden;
		background: #ffffff;
		box-shadow: 0 18px 50px rgba(15, 23, 42, 0.22);
	}

	.builder-preview__ai-standin-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 12px;
		background: linear-gradient(90deg, #111827, #312e81);
		color: #f8fafc;
		font-size: 12px;
		font-weight: 800;
		line-height: 1.25;
	}

	.builder-preview__ai-standin-header span,
	.builder-preview__ai-standin-header small {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-preview__ai-standin-header small {
		color: #cbd5e1;
		font-size: 11px;
	}

	.builder-preview__ai-standin iframe {
		display: block;
		width: 100%;
		min-height: 360px;
		max-height: calc(100vh - 240px);
		border: 0;
		background: #ffffff;
	}

	.builder-preview__loading {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(247, 250, 255, 0.94)),
			repeating-linear-gradient(
				-45deg,
				rgba(208, 4, 212, 0.04),
				rgba(208, 4, 212, 0.04) 12px,
				rgba(208, 4, 212, 0.08) 12px,
				rgba(208, 4, 212, 0.08) 24px
			);
		pointer-events: none;
	}

	.builder-preview__loading-card {
		display: grid;
		gap: 0.7rem;
		width: min(320px, calc(100% - 3rem));
		padding: 1rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
	}

	.builder-preview__loading-badge {
		display: inline-flex;
		align-items: center;
		width: fit-content;
		height: 26px;
		padding: 0 0.7rem;
		border-radius: 999px;
		background: rgba(208, 4, 212, 0.12);
		color: #8a0ea0;
		font-size: 0.74rem;
		font-weight: 700;
	}

	.builder-preview__loading-line {
		height: 0.75rem;
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(191, 219, 254, 0.5), rgba(96, 165, 250, 0.3), rgba(191, 219, 254, 0.5));
		background-size: 180% 100%;
		animation: builder-preview-shimmer 1.4s linear infinite;
	}

	.builder-preview__loading-line--short {
		width: 38%;
	}

	.builder-preview__loading-line--mid {
		width: 62%;
	}

	.builder-preview__overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 30;
	}

	.builder-preview__overlay.dragging {
		pointer-events: auto;
	}

	.builder-preview__selection,
	.builder-preview__hover,
	.builder-preview__coarse-droppable,
	.builder-preview__layout-overlay,
	.builder-preview__drop-target-highlight,
	.builder-preview__drop-target-handle,
	.builder-preview__drop-target {
		position: absolute;
		border-radius: 0.9rem;
		pointer-events: none;
	}

	.builder-preview__coarse-droppable {
		z-index: 31;
		border-radius: 0.9rem;
		background: transparent;
	}

	.builder-preview__coarse-droppable.active {
		background: rgba( 208, 4, 212, 0.04 );
		box-shadow: inset 0 0 0 1px rgba( 208, 4, 212, 0.16 );
	}

	.builder-preview__selection {
		border: 2px solid rgba(208, 4, 212, 0.9);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
		background: transparent;
	}

	.builder-preview__selection--container {
		border-radius: 0;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.92);
	}

	.builder-preview__hover {
		border: 1px dashed rgba(208, 4, 212, 0.88);
		background: rgba(208, 4, 212, 0.03);
	}

	.builder-preview__drop-target-highlight,
	.builder-preview__drop-target {
		border: 2px solid rgba(208, 4, 212, 0.78);
		background: rgba(208, 4, 212, 0.1);
		box-shadow: 0 0 0 4px rgba(208, 4, 212, 0.06);
	}

	.builder-preview__drop-target-highlight {
		border-radius: 0.9rem;
	}

	.builder-preview__layout-overlay {
		z-index: 34;
		pointer-events: none;
		border: 1px dashed rgba( 208, 4, 212, 0.7 );
		background:
			linear-gradient( 90deg, rgba( 208, 4, 212, 0.08 ), transparent 26px ),
			linear-gradient( 180deg, rgba( 208, 4, 212, 0.08 ), transparent 26px );
	}

	.builder-preview__layout-label {
		position: absolute;
		inset-block-start: 6px;
		inset-inline-start: auto;
		inset-inline-end: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 3px;
		max-inline-size: calc( 100% - 12px );
		overflow: hidden;
		padding: 2px;
		border-radius: 6px;
		border: 1px solid rgba( 255, 255, 255, 0.16 );
		background: rgba( 12, 18, 32, 0.92 );
		box-shadow: 0 10px 24px rgba( 0, 0, 0, 0.22 );
		color: #f8fbff;
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		white-space: nowrap;
		pointer-events: none;
	}

	.builder-preview__layout-label span {
		display: inline-flex;
		align-items: center;
		min-block-size: 18px;
		padding: 0 6px;
		border-radius: 4px;
		background: rgba( 255, 255, 255, 0.08 );
	}

	.builder-preview__layout-label span:first-child {
		background: rgba( 208, 4, 212, 0.26 );
		color: #ffffff;
	}

	.builder-preview__layout-grid-lines,
	.builder-preview__layout-child-outlines {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: inherit;
	}

	.builder-preview__layout-grid-line {
		position: absolute;
		background: rgba( 82, 76, 255, 0.5 );
		box-shadow: 0 0 0 1px rgba( 255, 255, 255, 0.28 );
	}

	.builder-preview__layout-child-outline {
		position: absolute;
		border: 1px solid rgba( 82, 76, 255, 0.45 );
		border-radius: 6px;
		background: rgba( 82, 76, 255, 0.05 );
	}

	.builder-preview__layout-empty {
		position: absolute;
		inset: 10px;
		display: grid;
		place-items: center;
		border: 1px dashed rgba( 208, 4, 212, 0.45 );
		border-radius: 8px;
		background: rgba( 208, 4, 212, 0.06 );
		color: rgba( 248, 251, 255, 0.84 );
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.builder-preview__layout-gap-handle {
		position: absolute;
		z-index: 41;
		pointer-events: auto;
		inset-inline-end: -13px;
		inset-block-end: -13px;
		display: inline-grid;
		place-items: center;
		inline-size: 26px;
		block-size: 26px;
		border: 1px solid rgba( 255, 255, 255, 0.26 );
		border-radius: 999px;
		background: #d004d4;
		box-shadow: 0 8px 22px rgba( 0, 0, 0, 0.26 );
		color: #ffffff;
		cursor: ew-resize;
	}

	.builder-preview__layout-overlay[data-layout-axis='y'] .builder-preview__layout-gap-handle {
		cursor: ns-resize;
	}

	.builder-preview__layout-gap-handle span,
	.builder-preview__layout-gap-handle::before,
	.builder-preview__layout-gap-handle::after {
		content: '';
		display: block;
		inline-size: 3px;
		block-size: 3px;
		border-radius: 999px;
		background: currentColor;
		box-shadow: 0 0 0 1px rgba( 255, 255, 255, 0.14 );
	}

	.builder-preview__layout-gap-handle {
		gap: 2px;
		grid-template-columns: repeat( 3, 3px );
	}

	.builder-preview__layout-gap-handle:hover,
	.builder-preview__layout-gap-handle:focus-visible {
		background: #f012f4;
		outline: 2px solid rgba( 255, 255, 255, 0.72 );
		outline-offset: 2px;
	}

	.builder-preview__drop-target.band {
		border-radius: 999px;
	}

	.builder-preview__drop-target.band[data-drop-axis='x'] {
		border-radius: 999px;
	}

	.builder-preview__drop-target.band[data-drop-axis='y'] {
		border-radius: 999px;
	}

	.builder-preview__drop-target[data-drop-placement='into'],
	.builder-preview__drop-target[data-drop-placement='root'] {
		border-style: dashed;
		border-width: 2px;
		background:
			linear-gradient( 135deg, rgba( 208, 4, 212, 0.12 ) 0 10px, rgba( 208, 4, 212, 0.06 ) 10px 20px );
		box-shadow: inset 0 0 0 2px rgba( 255, 255, 255, 0.5 ), 0 0 0 5px rgba( 208, 4, 212, 0.08 );
	}

	.builder-preview__drop-target-handle {
		position: absolute;
		border-radius: 999px;
		background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.98), rgba(244, 193, 255, 0.94) 35%, rgba(208, 4, 212, 0.98) 100%);
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 0 5px rgba(208, 4, 212, 0.12);
	}

	.builder-preview__action-rail {
		position: absolute;
		z-index: 40;
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 1px;
		min-height: 22px;
		padding: 1px;
		border: 0;
		border-radius: 2px 2px 0 0;
		background: #93003f;
		color: #ffffff;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
	}

	.builder-preview__action-rail--hover {
		background: #a00353;
	}

	.builder-preview__action-rail--container {
		border-radius: 0;
		background: #8a0c53;
	}

	.builder-preview__action-rail button,
	.builder-preview__action-label,
	.builder-preview__action-rail span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 20px;
		padding: 0 7px;
	}

	.builder-preview__action-rail button {
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		touch-action: none;
		user-select: none;
	}

	.builder-preview__action-rail button:hover,
	.builder-preview__action-rail button:focus-visible {
		background: rgba(255, 255, 255, 0.12);
		outline: none;
	}

	.builder-preview__action-button--grab {
		cursor: grab;
	}

	.builder-preview__action-button--grab:active {
		cursor: grabbing;
	}

	.builder-preview__action-button--danger:hover,
	.builder-preview__action-button--danger:focus-visible {
		background: rgba(255, 255, 255, 0.18);
	}

	.builder-preview__action-label {
		background: rgba(0, 0, 0, 0.18);
	}

	.builder-preview__drag-ghost {
		position: absolute;
		pointer-events: none;
		padding: 0.55rem 0.8rem;
		border-radius: 0.85rem;
		background: rgba(10, 14, 20, 0.94);
		color: white;
		font-size: 0.8rem;
		font-weight: 700;
		box-shadow: 0 20px 42px rgba(15, 23, 42, 0.24);
	}

	.builder-preview__inline-editor-shell {
		position: absolute;
		z-index: 6;
		pointer-events: auto;
	}

	.builder-preview__inline-editor-shell :global(.inline-rich-text) {
		width: 100%;
	}

	.builder-preview__inline-editor-shell :global(.inline-rich-text__toolbar) {
		margin-bottom: 6px;
	}

	@keyframes builder-preview-shimmer {
		0% {
			background-position: 100% 50%;
		}

		100% {
			background-position: -100% 50%;
		}
	}

	@media (max-width: 1100px) {
		.builder-preview__responsive-bar,
		.builder-preview__frame-chrome {
			grid-template-columns: 1fr;
		}

		.builder-preview__bar-end,
		.builder-preview__frame-meta {
			justify-content: flex-start;
		}
	}

	@media (max-width: 720px) {
		.builder-preview__stage {
			grid-template-columns: 1fr;
			padding-inline: 0.7rem;
		}

		.builder-preview__divider-affordance {
			display: none;
		}

		.builder-preview__responsive-bar {
			padding-inline: 0.55rem;
			gap: 0.5rem;
		}

		.builder-preview__bar-center,
		.builder-preview__bar-end {
			flex-wrap: wrap;
			justify-content: flex-start;
		}

		.builder-preview__size-inputs {
			border-inline-end: 0;
			padding-inline-end: 0;
		}
	}
</style>
