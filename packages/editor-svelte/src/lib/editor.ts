import { writable } from 'svelte/store';

import type {
	BuilderCommand,
	BuilderContextMenuTargetKind,
	BuilderEngineState,
	BuilderNavigatorMode,
	BuilderPanel,
	BuilderPreviewSessionState,
	BuilderSaveState,
	BuilderShellPage,
	DropTarget,
} from '@builder/core';
import { BuilderEngine, createBuilderEngine, getActiveDocument, getNodeLocation, getSelectedNodes } from '@builder/core';
import type { Binding, BuilderDocument, BuilderNode, BuilderPackage, DocumentKind, DocumentRevision, EditorMode, JsonValue, ThemeAssignment } from '@builder/schema';
import { BuilderPackageSchema, createDocument, createNode } from '@builder/schema';
import type {
	BindingProviderContext,
	BuilderDynamicProviderDefinition,
	BuilderHostAdapter,
	BuilderHostExtensionDefinition,
	BuilderHostMediaAdapter,
	BuilderHostPermissionAdapter,
	BuilderHostPermissionKey,
	BuilderHostPermissionResult,
	BuilderHostPersistenceAdapter,
	BuilderRegistry,
	BuilderRoutePreviewContextAdapter,
	TemplateConditionContext,
} from '@builder/plugin-api';
import { applyBuilderHostExtension, createDefaultBuilderRegistry } from '@builder/plugin-api';
import { resolveComposition, type BuilderRuntimeComponentMap } from '@builder/runtime-svelte';
import {
	EMPTY_TRANSIENT_DRAG_STATE,
	areDropTargetsEqual,
	areTransientDragStatesEqual,
	type BuilderTransientDragPointer,
	type BuilderTransientDragState,
} from './transient-drag';
import { configureInteractionCore } from './interaction-core';
import {
	commitTemplateImportReview,
	importHtmlIntoProject,
	importTemplatesIntoProject,
	reviewHtmlImportPayload,
	reviewTemplateImportPayload,
	type TemplateImportOptions,
	type TemplateImportResult,
	type TemplateImportReviewResult,
} from './template-import';
import type { HtmlImportPayload } from './html-import';
import {
	createBrowserAiSettingsAdapter,
	createDefaultAiSessionState,
	createDefaultAiSettings,
	makeAiTranscriptMessage,
	type BuilderAiCreateRequest,
	type BuilderAiSessionState,
	type BuilderAiSettings,
	type BuilderAiSettingsAdapter,
	type BuilderAiToolCall,
	type BuilderAiToolExecutionResult,
} from './ai-core';
import {
	createBrowserLocalMediaAdapter,
	createMediaDiagnostics,
	deleteMediaCatalogAsset,
	mergeMediaCatalog,
	normalizeMediaAsset,
	toMediaAssetMetadata,
	updateMediaCatalogAsset,
	validateMediaUpload,
	type BuilderMediaAdapter,
	type BuilderMediaAssetMetadata,
	type BuilderMediaDiagnostic,
	type BuilderMediaOptions,
} from './media';

interface BuilderAiCompositionContext {
	activeDocument: BuilderDocument;
	primaryDocument: BuilderDocument;
	renderedDocuments: Array<{ slot: string; document: BuilderDocument }>;
}

export interface BuilderEditorController {
	subscribe: ( listener: ( state: BuilderEngineState ) => void ) => () => void;
	subscribeSelector: <T>( selector: ( state: BuilderEngineState ) => T, listener: ( slice: T, state: BuilderEngineState ) => void, equals?: ( left: T, right: T ) => boolean, surface?: string ) => () => void;
	subscribeAiSession: ( listener: ( state: BuilderAiSessionState ) => void ) => () => void;
	engine: BuilderEngine;
	registry: BuilderRegistry;
	runtimeComponents?: BuilderRuntimeComponentMap;
	features: Readonly<ResolvedBuilderEditorFeatures>;
	adapter?: BuilderHostAdapter;
	bindingContext?: BindingProviderContext;
	permissions: Readonly<Record<BuilderHostPermissionKey, BuilderHostPermissionResult>>;
	can: ( permission: BuilderHostPermissionKey ) => boolean;
	getPermission: ( permission: BuilderHostPermissionKey ) => BuilderHostPermissionResult;
	setDynamicPreviewContext: ( context: BindingProviderContext ) => void;
	listDynamicProviders: ( category?: Binding['category'] ) => BuilderDynamicProviderDefinition[];
	addDynamicBinding: ( nodeId: string, binding: Partial<Binding> & Pick<Binding, 'targetKind' | 'target' | 'path'> ) => string | undefined;
	updateDynamicBinding: ( bindingId: string, patch: Partial<Binding> ) => void;
	removeDynamicBinding: ( bindingId: string ) => void;
	getActiveDocumentCache: () => BuilderDocumentCache;
	getDocumentCache: ( documentId?: string ) => BuilderDocumentCache | undefined;
	getProjectNode: ( nodeId?: string ) => BuilderProjectNodeCacheEntry | undefined;
	subscribeTransientDrag: ( listener: ( state: BuilderTransientDragState ) => void ) => () => void;
	getTransientDragState: () => BuilderTransientDragState;
	setTransientDrag: ( state: { pointer?: BuilderTransientDragPointer; dropTarget?: DropTarget } ) => void;
	queueTransientDrag: ( state: { pointer?: BuilderTransientDragPointer; dropTarget?: DropTarget } ) => void;
	flushTransientDrag: () => void;
	clearTransientDrag: () => void;
	incrementPerfCounter: ( counter: string, amount?: number, surface?: string ) => void;
	dispatch: ( command: BuilderCommand ) => void;
	beginTransaction: ( label: string ) => void;
	commitTransaction: () => void;
	undo: () => void;
	redo: () => void;
	setPanel: ( panel: BuilderPanel ) => void;
	setShellPage: ( page: BuilderShellPage ) => void;
	toggleShellPanel: ( collapsed?: boolean ) => void;
	setNavigatorMode: ( mode: BuilderNavigatorMode ) => void;
	toggleNavigator: ( open?: boolean ) => void;
	toggleResponsiveBar: ( open?: boolean ) => void;
	toggleAppBarMenu: ( open?: boolean ) => void;
	focusDocument: ( documentId: string, mode?: EditorMode ) => void;
	openDocument: ( documentId: string, modeOrOptions?: EditorMode | BuilderDocumentOpenOptions, maybeOptions?: BuilderDocumentOpenOptions ) => void;
	focusBreadcrumb: ( nodeId?: string ) => void;
	saveDraft: () => Promise<void>;
	publish: () => Promise<void>;
	restoreRevision: ( revisionId: string, documentId?: string ) => Promise<void>;
	listRevisions: ( documentId?: string ) => Promise<DocumentRevision[]>;
	resolveSaveConflict: ( strategy: BuilderPersistenceConflictStrategy ) => Promise<void>;
	toggleRevisionBrowser: ( open?: boolean ) => void;
	selectRevision: ( revisionId?: string ) => void;
	setPreviewContext: ( context: Partial<BuilderPreviewSessionState> ) => void;
	setSiteEditorEntry: ( entryId?: string ) => void;
	updateComponentInstanceOverrides: ( nodeId: string, overrides: Record<string, JsonValue>, merge?: boolean ) => void;
	detachComponentInstance: ( nodeId?: string ) => void;
	relinkComponentInstance: ( nodeId?: string, componentId?: string, preserveOverrides?: boolean ) => void;
	createDocument: ( kind: DocumentKind, title: string ) => string;
	deleteDocument: ( documentId?: string ) => void;
	createLibraryItemFromSelection: ( title: string ) => string;
	createLibraryItemFromPage: ( title: string ) => string;
	reviewTemplatesFromJson: ( payload: unknown, options?: TemplateImportOptions ) => Promise<TemplateImportReviewResult>;
	reviewHtmlTemplate: ( payload: HtmlImportPayload, options?: TemplateImportOptions ) => Promise<TemplateImportReviewResult>;
	commitTemplateImportReview: ( review: TemplateImportReviewResult, options?: TemplateImportOptions ) => Promise<Omit<TemplateImportResult, 'project'>>;
	importTemplatesFromJson: ( payload: unknown, options?: TemplateImportOptions ) => Promise<Omit<TemplateImportResult, 'project'>>;
	importHtmlTemplate: ( payload: HtmlImportPayload, options?: TemplateImportOptions ) => Promise<Omit<TemplateImportResult, 'project'>>;
	listMediaAssets: () => Promise<BuilderMediaAssetMetadata[]>;
	uploadMediaAsset: ( file: File ) => Promise<BuilderMediaAssetMetadata>;
	updateMediaAsset: ( assetId: string, patch: Partial<BuilderMediaAssetMetadata> ) => Promise<BuilderMediaAssetMetadata | undefined>;
	deleteMediaAsset: ( assetId: string ) => Promise<void>;
	resolveMediaAssetUrl: ( asset: BuilderMediaAssetMetadata ) => string;
	getMediaDiagnostics: () => BuilderMediaDiagnostic[];
	insertLibraryItem: ( libraryDocumentId: string, targetParentId?: string, targetSlot?: string ) => void;
	insertComponentInstance: ( componentId: string, targetParentId?: string, targetSlot?: string ) => void;
	getAiSession: () => BuilderAiSessionState;
	getAiSettings: () => Promise<BuilderAiSettings>;
	saveAiSettings: ( settings: BuilderAiSettings ) => Promise<void>;
	startAiCreate: ( request: BuilderAiCreateRequest ) => Promise<void>;
	startAiEdit: () => void;
	stopAiEdit: () => void;
	sendAiMessage: ( message: string ) => Promise<void>;
	cancelAiRun: () => void;
	startNodeDrag: ( nodeId: string, pointer: { x: number; y: number }, documentId?: string ) => void;
	startElementDrag: ( elementType: string, pointer: { x: number; y: number }, documentId?: string ) => void;
	updateDrag: ( pointer: { x: number; y: number } ) => void;
	setDropTarget: ( target?: DropTarget ) => void;
	commitDrag: () => void;
	cancelDrag: () => void;
	moveSelectedNodeBy: ( direction: -1 | 1 ) => void;
	togglePreviewPopups: ( open?: boolean ) => void;
	openContextMenu: ( options: { x: number; y: number; targetKind: BuilderContextMenuTargetKind; documentId?: string; nodeId?: string; slot?: string } ) => void;
	closeContextMenu: () => void;
}

export type BuilderShellVariant = 'legacy' | 'v3';

export interface BuilderPersistenceEvent {
	project: BuilderPackage;
	documentId: string;
	revisionId?: string;
	revisionKind?: DocumentRevision['kind'];
	reason: 'save' | 'restore' | 'autosave' | 'draft' | 'publish';
	expectedVersionToken?: string;
	force?: boolean;
}

export interface BuilderPersistenceLoadResult {
	project: BuilderPackage;
	versionToken?: string;
	updatedAt?: string;
}

export interface BuilderPersistenceResult {
	ok?: boolean;
	state?: BuilderSaveState;
	project?: BuilderPackage;
	versionToken?: string;
	updatedAt?: string;
	message?: string;
	conflict?: boolean;
}

export interface BuilderPersistenceStatus {
	state: BuilderSaveState;
	versionToken?: string;
	updatedAt?: string;
	message?: string;
}

export interface BuilderPersistenceAdapter {
	autoSaveDelayMs?: number;
	loadProject?: () => Promise<BuilderPackage | BuilderPersistenceLoadResult | null>;
	saveAutosave?: ( event: BuilderPersistenceEvent ) => Promise<BuilderPersistenceResult | void>;
	saveDraft?: ( event: BuilderPersistenceEvent ) => Promise<BuilderPersistenceResult | void>;
	publish?: ( event: BuilderPersistenceEvent ) => Promise<BuilderPersistenceResult | void>;
	restoreRevision?: ( event: BuilderPersistenceEvent ) => Promise<BuilderPersistenceResult | void>;
	listRevisions?: ( documentId?: string ) => Promise<DocumentRevision[]>;
	getSaveStatus?: () => Promise<BuilderPersistenceStatus>;
	saveProject?: ( event: BuilderPersistenceEvent ) => Promise<void>;
}

export type BuilderEditorPersistenceOptions = BuilderPersistenceAdapter & {
	host?: BuilderHostPersistenceAdapter<BuilderPackage>;
};

export type BuilderPersistenceConflictStrategy = 'overwrite' | 'reload' | 'keep-local';

export interface BuilderEditorFeatures {
	canvasInteractionV2?: boolean;
	interactionCoreV3?: boolean;
	navigatorVirtualization?: boolean;
	shellVariant?: BuilderShellVariant;
}

export interface ResolvedBuilderEditorFeatures {
	canvasInteractionV2: boolean;
	interactionCoreV3: boolean;
	navigatorVirtualization: boolean;
	shellVariant: BuilderShellVariant;
}

export interface BuilderEditorAdapterOptions {
	host?: BuilderHostAdapter;
	registry?: BuilderRegistry;
	route?: BuilderRoutePreviewContextAdapter;
	previewContext?: BindingProviderContext;
}

export interface BuilderEditorDynamicOptions {
	providers?: BuilderDynamicProviderDefinition[];
	previewContext?: BindingProviderContext;
	allowStyleBindings?: boolean;
}

export interface BuilderEditorAiOptions {
	settings?: BuilderAiSettingsAdapter;
	defaultSettings?: Partial<BuilderAiSettings>;
	enabled?: boolean;
}

export type BuilderEditorPermissionsOptions = BuilderHostPermissionAdapter;

export interface BuilderEditorMediaOptions {
	adapter?: BuilderMediaAdapter | BuilderHostMediaAdapter;
	maxUploadSize?: number;
	allowedMimeTypes?: string[];
	allowSvg?: boolean;
}

export interface BuilderEditorInitialStateOptions {
	activeDocumentId?: string;
	bindingContext?: BindingProviderContext;
}

export interface BuilderEditorLifecycleHooks {
	onProjectChange?: ( project: BuilderPackage, state: BuilderEngineState ) => void;
	onDocumentChange?: ( document: BuilderDocument, state: BuilderEngineState ) => void;
	onSelectionChange?: ( selectedNodeIds: string[], state: BuilderEngineState ) => void;
	onSaveStateChange?: ( saveState: BuilderSaveState, state: BuilderEngineState ) => void;
	onPublish?: ( event: BuilderPersistenceEvent, state: BuilderEngineState ) => void;
	onError?: ( error: Error, context: { phase: 'autosave' | 'persist' | 'ai' | 'hook'; state?: BuilderEngineState } ) => void;
}

export interface CreateBuilderEditorOptions {
	/** @deprecated Use initialState.activeDocumentId. */
	activeDocumentId?: string;
	/** @deprecated Use adapter.registry. */
	registry?: BuilderRegistry;
	extension?: BuilderHostExtensionDefinition;
	runtimeComponents?: BuilderRuntimeComponentMap;
	adapter?: BuilderHostAdapter | BuilderEditorAdapterOptions;
	/** @deprecated Use initialState.bindingContext, adapter.previewContext, or dynamic.previewContext. */
	bindingContext?: BindingProviderContext;
	persistence?: BuilderEditorPersistenceOptions;
	media?: BuilderEditorMediaOptions;
	features?: BuilderEditorFeatures;
	initialState?: BuilderEditorInitialStateOptions;
	hooks?: BuilderEditorLifecycleHooks;
	ai?: BuilderEditorAiOptions;
	dynamic?: BuilderEditorDynamicOptions;
	permissions?: BuilderEditorPermissionsOptions;
}

export interface BuilderDocumentOpenOptions {
	mode?: EditorMode;
	pathname?: string;
	query?: string;
	slot?: ThemeAssignment['slot'];
	assignmentId?: string;
	siteEntryId?: string;
	source?: BuilderPreviewSessionState['source'];
	openRevisionBrowser?: boolean;
	selectedRevisionId?: string;
}

export interface BuilderNodeLocationCacheEntry {
	node: BuilderNode;
	parentId?: string;
	slot?: string;
	index: number;
}

export interface BuilderDocumentCache {
	documentId: string;
	document: BuilderDocument;
	flatNodes: BuilderNode[];
	nodeById: Map<string, BuilderNode>;
	locationById: Map<string, BuilderNodeLocationCacheEntry>;
}

export interface BuilderProjectNodeCacheEntry {
	documentId: string;
	node: BuilderNode;
	location: BuilderNodeLocationCacheEntry;
}

interface SelectorSubscription<T> {
	selector: ( state: BuilderEngineState ) => T;
	listener: ( slice: T, state: BuilderEngineState ) => void;
	equals: ( left: T, right: T ) => boolean;
	current: T;
	surface?: string;
}

type SelectorSubscriptionEntry = SelectorSubscription<unknown>;

type BuilderPerfCounters = {
	previewMounts?: number;
	fullPreviewSyncs?: number;
	canvasMetricsDispatches?: number;
	geometrySnapshotsPosted?: number;
	geometryFallbackSnapshots?: number;
	geometryInvalidations?: number;
	overlayOnlyUpdates?: number;
	dragTargetUpdates?: number;
	engineDragPointerDispatches?: number;
	candidateResolutionCount?: number;
	selectorEmissions?: Record<string, number>;
	[ key: string ]: unknown;
};

declare global {
	interface Window {
		__builderPerf?: BuilderPerfCounters;
		__builderEditor?: BuilderEditorController;
	}
}

const emittedCompatibilityWarnings = new Set<string>();

export function createBuilderEditor( project: BuilderPackage, options: CreateBuilderEditorOptions = {} ): BuilderEditorController {
	const adapterOptions = resolveEditorAdapterOptions( options.adapter );
	const extension = options.extension;
	const activeDocumentId = options.initialState?.activeDocumentId ?? options.activeDocumentId;
	const hostAdapter = adapterOptions.host ?? extension?.adapter;
	const engine = createBuilderEngine( project, activeDocumentId );
	const registry = options.registry ?? adapterOptions.registry ?? createDefaultBuilderRegistry();
	applyBuilderHostExtension( registry, extension );
	applyBuilderHostExtension( registry, {
		adapter: hostAdapter,
		dynamicProviders: options.dynamic?.providers,
		routePreview: adapterOptions.route ?? extension?.routePreview,
	} );
	for ( const provider of options.dynamic?.providers ?? [] ) {
		registry.registerDynamicProvider( provider );
	}
	const features = Object.freeze( resolveEditorFeatures( options.features ) );
	configureInteractionCore( { interactionCoreV3: features.interactionCoreV3 } );
	const state = writable( engine.getState() );
	let currentState = engine.getState();
	let dynamicPreviewContext: BindingProviderContext = options.dynamic?.previewContext ?? adapterOptions.previewContext ?? options.initialState?.bindingContext ?? options.bindingContext ?? {};
	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
	let persistQueue = Promise.resolve();
	const extensionPersistence = extension?.persistence as BuilderHostPersistenceAdapter<BuilderPackage> | undefined;
	const persistenceOptions = options.persistence ?? ( extensionPersistence ? { host: extensionPersistence } : undefined );
	const persistenceAdapter = resolvePersistenceAdapter( persistenceOptions );
	let persistenceVersionToken = readPersistenceVersionToken( project );
	let lastPersistEvent: BuilderPersistenceEvent | undefined;
	let lastConflict: BuilderPersistenceResult | undefined;
	const selectorSubscriptions = new Set<SelectorSubscriptionEntry>();
	const transientDrag = writable<BuilderTransientDragState>( EMPTY_TRANSIENT_DRAG_STATE );
	const aiSession = writable<BuilderAiSessionState>( createDefaultAiSessionState() );
	let aiSessionState = createDefaultAiSessionState();
	let activeAiAbortController: AbortController | undefined;
	const extensionAiSettings = extension?.aiSettings as BuilderAiSettingsAdapter | undefined;
	const aiSettingsAdapter = options.ai?.settings ?? extensionAiSettings ?? createBrowserAiSettingsAdapter( options.ai?.defaultSettings );
	const aiEnabled = options.ai?.enabled ?? true;
	const permissions = Object.freeze( resolveEditorPermissions( options.permissions ?? extension?.permissions ) );
	const mediaOptions = options.media ?? ( extension?.media ? { adapter: extension.media } : {} );
	const mediaValidationOptions: BuilderMediaOptions = {
		maxUploadSize: mediaOptions.maxUploadSize,
		allowedMimeTypes: mediaOptions.allowedMimeTypes,
		allowSvg: mediaOptions.allowSvg,
	};
	const mediaAdapter = resolveMediaAdapter( mediaOptions.adapter ) ?? createBrowserLocalMediaAdapter();
	let transientDragState = EMPTY_TRANSIENT_DRAG_STATE;
	let pendingTransientDragState: { pointer?: BuilderTransientDragPointer; dropTarget?: DropTarget } | undefined;
	let transientDragFrame = 0;
	const documentCaches = new Map<string, BuilderDocumentCache>();
	let activeDocumentCache = ensureDocumentCache( getActiveDocument( currentState ) );
	let projectNodeCacheProject = currentState.project;
	let projectNodeCache: Map<string, BuilderProjectNodeCacheEntry> | undefined;
	let projectDocumentsIndexProject = currentState.project;
	let projectDocumentsById = buildDocumentsIndex( currentState.project.documents );
	let previousHookState = currentState;

	engine.subscribe( ( nextState ) => {
		const previousState = previousHookState;
		currentState = nextState;
		const nextActiveDocument = getActiveDocument( nextState );
		activeDocumentCache = ensureDocumentCache( nextActiveDocument );
		if ( !nextState.ui.dragSession && ( transientDragState.pointer || transientDragState.dropTarget ) ) {
			resetTransientDragState();
		}

		state.set( nextState );
		emitLifecycleHooks( previousState, nextState, nextActiveDocument );
		previousHookState = nextState;
		syncAutosave( nextState );
		for ( const subscription of selectorSubscriptions ) {
			const nextSlice = subscription.selector( nextState );
			if ( subscription.equals( subscription.current, nextSlice ) ) {
				continue;
			}

			subscription.current = nextSlice;
			subscription.listener( nextSlice, nextState );
			incrementPerfCounter( 'selectorEmissions', 1, subscription.surface ?? 'unknown' );
		}
	} );

	aiSession.subscribe( ( nextAiSession ) => {
		aiSessionState = nextAiSession;
	} );

	function syncAutosave( nextState: BuilderEngineState ) {
		if ( typeof window === 'undefined' || !persistenceAdapter?.autoSaveDelayMs ) {
			return;
		}

		if ( autosaveTimer ) {
			clearTimeout( autosaveTimer );
			autosaveTimer = undefined;
		}

		if ( nextState.ui.saveState !== 'dirty' || nextState.history.activeTransaction ) {
			return;
		}

		const documentId = nextState.activeDocumentId;
		autosaveTimer = setTimeout( () => {
			const latestState = engine.getState();
			const session = latestState.documentSessions[ documentId ];
			if ( latestState.ui.saveState !== 'dirty' || !session?.dirty ) {
				return;
			}

			engine.dispatch( { type: 'document/save/autosave', documentId } );
			void queuePersist( {
				project: engine.getState().project,
				documentId,
				reason: 'autosave',
				...getLatestRevisionMeta( engine.getState(), documentId ),
			} );
		}, persistenceAdapter.autoSaveDelayMs );
	}

	function setAiSession( patch: Partial<BuilderAiSessionState> ) {
		aiSession.update( ( current ) => ( { ...current, ...patch } ) );
	}

	function appendAiMessage( message: BuilderAiSessionState['messages'][ number ] ) {
		aiSession.update( ( current ) => ( {
			...current,
			messages: [ ...current.messages, message ],
		} ) );
	}

	function emitLifecycleHooks( previousState: BuilderEngineState, nextState: BuilderEngineState, activeDocument: BuilderDocument ) {
		if ( previousState.project !== nextState.project ) {
			callLifecycleHook( () => options.hooks?.onProjectChange?.( nextState.project, nextState ) );
		}
		if ( previousState.activeDocumentId !== nextState.activeDocumentId || getActiveDocument( previousState ) !== activeDocument ) {
			callLifecycleHook( () => options.hooks?.onDocumentChange?.( activeDocument, nextState ) );
		}
		if ( !areStringArraysEqual( previousState.ui.selectedNodeIds, nextState.ui.selectedNodeIds ) ) {
			callLifecycleHook( () => options.hooks?.onSelectionChange?.( [ ...nextState.ui.selectedNodeIds ], nextState ) );
		}
		if ( previousState.ui.saveState !== nextState.ui.saveState ) {
			callLifecycleHook( () => options.hooks?.onSaveStateChange?.( nextState.ui.saveState, nextState ) );
		}
	}

	function callLifecycleHook( callback: () => void ) {
		try {
			callback();
		} catch ( error ) {
			notifyLifecycleError( error, 'hook' );
		}
	}

	function notifyLifecycleError( error: unknown, phase: 'autosave' | 'persist' | 'ai' | 'hook', stateSnapshot = engine.getState() ) {
		const normalized = error instanceof Error ? error : new Error( String( error ?? 'Unknown builder error.' ) );
		if ( phase === 'hook' ) {
			console.error( normalized );
			return;
		}
		try {
			options.hooks?.onError?.( normalized, { phase, state: stateSnapshot } );
		} catch ( hookError ) {
			console.error( hookError );
		}
	}

	async function resolveAiSettings(): Promise<BuilderAiSettings> {
		const loaded = await aiSettingsAdapter.loadSettings();
		return createDefaultAiSettings( {
			...options.ai?.defaultSettings,
			...loaded,
			headers: {
				...( options.ai?.defaultSettings?.headers ?? {} ),
				...( loaded?.headers ?? {} ),
			},
		} );
	}

	function buildAiContextPrompt( request?: BuilderAiCreateRequest, mode: BuilderAiSessionState['mode'] = 'edit', prompt = '' ) {
		const latestState = engine.getState();
		const compositionContext = getAiCompositionContext( latestState );
		const activeDocument = compositionContext.activeDocument;
		const contextDocument = compositionContext.primaryDocument;
		const activeDocumentIsEmpty = contextDocument.root.length === 0;
		const canCreateInEdit = mode === 'edit' && activeDocumentIsEmpty && hasExplicitAiCreateIntent( prompt );
		const selectedNodes = latestState.ui.selectedNodeIds
			.map( ( nodeId ) => getNodeLocation( contextDocument.root, nodeId )?.node )
			.filter( ( node ): node is BuilderNode => Boolean( node ) );
		const selectedSummaries = selectedNodes.map( ( node ) => summarizeAiContextNode( node ) );
		const nearbyStructure = selectedNodes[ 0 ]
			? summarizeNearbyAiStructure( contextDocument, selectedNodes[ 0 ].id )
			: summarizeRootAiStructure( contextDocument );
		const fullPageContext = summarizeFullAiPageContext( compositionContext );
		const semanticTools = mode === 'create' || canCreateInEdit ? [
			'add_section_from_html',
		] : [
			'improve_section_visual_style',
			'match_style_from_node',
			'rewrite_text_content',
			'make_section_responsive',
			'apply_brand_palette',
			'convert_selection_to_pricing',
			'convert_selection_to_hero',
			'replace_selected_with_html',
		];
		return [
			`Active document: ${ activeDocument.title } (${ activeDocument.kind}, ${ activeDocument.id }).`,
			`Preview/edit context document: ${ contextDocument.title } (${ contextDocument.kind}, ${ contextDocument.id }). Use this documentId for tool calls unless the user asks for another document.`,
			compositionContext.renderedDocuments.length ? `Rendered composition documents: ${ compositionContext.renderedDocuments.map( ( entry ) => `${ entry.slot }:${ entry.document.title }(${ entry.document.id })` ).join( ', ' ) }.` : '',
			`Selected node summary: ${ selectedSummaries.length ? JSON.stringify( selectedSummaries ) : 'none' }.`,
			`Nearby editable structure: ${ JSON.stringify( nearbyStructure ) }.`,
			`Full page context: ${ JSON.stringify( fullPageContext ) }.`,
			mode === 'create'
				? `Use create tools: ${ semanticTools.join( ', ' ) }.`
				: `Use semantic edit tools first: ${ semanticTools.join( ', ' ) }.`,
			'Do not request full project JSON unless the user asks for whole-page analysis or broad page restructuring.',
			'If no node is selected, use the full page context to choose the most relevant existing section or root node for broad page-level edit requests.',
			canCreateInEdit ? 'The edit context document has no editable nodes and the user explicitly asked to add/create content. Create one complete full-page/hero section with add_section_from_html instead of calling target-required edit tools or adding only a CTA block.' : '',
			mode === 'edit' && activeDocumentIsEmpty && !canCreateInEdit ? 'The edit context document has no editable nodes and the user did not explicitly ask to add new content. Do not append a section; explain that there is no editable page context to improve and ask the user to select visible content or use Create with AI.' : '',
			mode === 'edit' && !activeDocumentIsEmpty ? 'Edit with AI must improve or replace existing selected/searched nodes; do not append a new full page section unless the user explicitly asks to add new content.' : '',
			request?.targetParentId ? `Requested target parent: ${ request.targetParentId }${ request.targetSlot ? ` slot ${ request.targetSlot }` : '' }.` : '',
			request?.designStyle ? `Requested design style: ${ request.designStyle }.` : '',
			request?.overwriteThemeSettings ? 'The user allowed theme-setting changes for this create request.' : 'Do not overwrite global theme settings unless necessary.',
			request?.contextNotes ? `Additional context: ${ request.contextNotes }` : '',
		].filter( Boolean ).join( '\n' );
	}

	function extractAiCreatePreviewFromToolCall( call: BuilderAiToolCall ): BuilderAiSessionState['createPreview'] | undefined {
		const args = call.function.arguments.trim();
		if ( !args ) {
			return undefined;
		}
		try {
			const parsed = JSON.parse( args ) as Record<string, unknown>;
			const html = typeof parsed.html === 'string' ? parsed.html : '';
			if ( !html ) {
				return undefined;
			}
			return {
				html,
				css: typeof parsed.css === 'string' ? parsed.css : undefined,
				title: typeof parsed.title === 'string' ? parsed.title : undefined,
			};
		} catch {
			const html = readPartialJsonStringProperty( args, 'html' );
			if ( !html ) {
				return undefined;
			}
			return {
				html,
				css: readPartialJsonStringProperty( args, 'css' ),
				title: readPartialJsonStringProperty( args, 'title' ),
			};
		}
	}

	function readPartialJsonStringProperty( source: string, key: string ): string | undefined {
		const match = new RegExp( `"${ key }"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, 's' ).exec( source );
		const value = match?.[ 1 ];
		if ( !value ) {
			return undefined;
		}
		try {
			return JSON.parse( `"${ value.replaceAll( /(?<!\\)"/g, '\\"' ) }"` ) as string;
		} catch {
			return value
				.replaceAll( '\\"', '"' )
				.replaceAll( '\\n', '\n' )
				.replaceAll( '\\t', '\t' )
				.replaceAll( '\\/', '/' );
		}
	}

	function normalizeAssistantHtmlResponse( content: string ): string {
		const trimmed = content.trim();
		if ( !trimmed ) {
			return '';
		}
		try {
			const parsed = JSON.parse( trimmed ) as unknown;
			if ( parsed && typeof parsed === 'object' ) {
				const record = parsed as Record<string, unknown>;
				if ( typeof record.html === 'string' ) {
					const css = typeof record.css === 'string' && record.css.trim()
						? `<style>${ record.css }</style>`
						: '';
					return `${ css }${ record.html }`.trim();
				}
			}
		} catch {
			// Plain HTML or fenced HTML is the common fallback from non-tool providers.
		}
		const fenced = /^```(?:html)?\s*([\s\S]*?)\s*```$/i.exec( trimmed );
		const html = fenced?.[ 1 ]?.trim() ?? trimmed;
		return /<[a-z][\w-]*(\s|>|\/)/i.test( html ) ? html : '';
	}

	async function runAiRequest( prompt: string, mode: BuilderAiSessionState['mode'], request?: BuilderAiCreateRequest ) {
		if ( !aiEnabled ) {
			const message = 'AI assistant is disabled for this editor.';
			setAiSession( { mode, status: 'error', error: message } );
			appendAiMessage( makeAiTranscriptMessage( 'error', message ) );
			return;
		}

		activeAiAbortController?.abort();
		const abortController = new AbortController();
		activeAiAbortController = abortController;
		const runId = crypto.randomUUID();
		setAiSession( { mode, status: 'streaming', error: undefined, activeRunId: runId, createPreview: undefined } );

		try {
			const settings = await resolveAiSettings();
			if ( !settings.baseUrl.trim() || !settings.model.trim() ) {
				throw new Error( 'AI endpoint and model are required before running the assistant.' );
			}
			const { createAiSystemPrompt, runBuilderAiAgent } = await import( './ai' );
			const { createBuilderAiToolExecutor } = await import( './ai-tools' );
			const contextDocument = getAiCompositionContext( engine.getState() ).primaryDocument;
			const allowCreateInEdit = mode === 'edit' && contextDocument.root.length === 0 && hasExplicitAiCreateIntent( prompt );
			const toolExecutor = createBuilderAiToolExecutor( {
				engine,
				registry,
				defaultDocumentId: contextDocument.id,
				defaultParentId: request?.targetParentId,
				defaultSlot: request?.targetSlot,
				mode: mode === 'create' ? 'create' : 'edit',
				allowCreateInEdit,
			} );
			const systemPrompt = createAiSystemPrompt( [
				settings.systemInstructions,
				buildAiContextPrompt( request, mode, prompt ),
			].filter( Boolean ).join( '\n\n' ) );
			let hadToolFailure = false;
			let hadSuccessfulTool = false;
			let assistantCreateHtml = '';
			const deferredCreateCalls: BuilderAiToolCall[] = [];
			await runBuilderAiAgent( {
				settings,
				systemPrompt,
				userPrompt: prompt,
				tools: toolExecutor.tools,
				executeTool: async ( call ) => {
					if ( mode === 'create' && call.function.name === 'add_section_from_html' ) {
						const preview = extractAiCreatePreviewFromToolCall( call );
						if ( !preview?.html.trim() ) {
							return {
								ok: false,
								summary: 'Generated HTML tool call did not include usable HTML.',
							};
						}
						deferredCreateCalls.push( call );
						setAiSession( {
							status: 'streaming',
							createPreview: preview,
							lastToolSummary: 'Generated HTML received. Parsing will start when generation completes.',
						} );
						return {
							ok: true,
							summary: 'Generated HTML received. The builder will parse it after the model finishes.',
							terminal: true,
							assistantMessage: 'Generated HTML received. Parsing it into editable Builder nodes now.',
							data: { ...preview, deferredParse: true } as JsonValue,
						};
					}
					setAiSession( { status: 'applying' } );
					const result = await toolExecutor.executeTool( call );
					return result;
				},
				onAssistantMessage: ( content ) => {
					if ( mode === 'create' ) {
						assistantCreateHtml = normalizeAssistantHtmlResponse( content );
					}
					appendAiMessage( makeAiTranscriptMessage( 'assistant', content ) );
				},
				onAssistantDelta: ( content ) => {
					if ( mode !== 'create' ) {
						return;
					}
					const html = normalizeAssistantHtmlResponse( content );
					if ( html ) {
						setAiSession( {
							createPreview: { html },
							lastToolSummary: 'Streaming generated HTML...',
						} );
					}
				},
				onToolCallDelta: ( call ) => {
					if ( mode !== 'create' || call.function.name !== 'add_section_from_html' ) {
						return;
					}
					const preview = extractAiCreatePreviewFromToolCall( call );
					if ( preview?.html.trim() ) {
						setAiSession( {
							createPreview: preview,
							lastToolSummary: 'Streaming generated HTML...',
						} );
					}
				},
				onToolResult: ( call, result ) => {
					const content = result.ok ? result.summary : `Tool ${ call.function.name } failed: ${ result.summary }`;
					hadToolFailure ||= !result.ok;
					hadSuccessfulTool ||= result.ok;
					appendAiMessage( makeAiTranscriptMessage( 'tool', content, { toolName: call.function.name } ) );
					setAiSession( { lastToolSummary: content } );
				},
				onDebugMessage: ( label, payload ) => {
					const debugLabel = mode === 'create'
						&& label.includes( 'Builder parsed/applied add_section_from_html' )
						&& JSON.stringify( payload ).includes( '"deferredParse":true' )
						? 'Builder deferred add_section_from_html'
						: label;
					appendAiMessage( makeAiTranscriptMessage( 'system', `${ debugLabel }\n\n${ JSON.stringify( payload, null, 2 ) }`, { toolName: 'debug' } ) );
				},
				signal: abortController.signal,
				maxIterations: settings.maxToolIterations,
			} );
			if ( mode === 'create' && !deferredCreateCalls.length && assistantCreateHtml ) {
				deferredCreateCalls.push( {
					id: crypto.randomUUID(),
					type: 'function',
					function: {
						name: 'add_section_from_html',
						arguments: JSON.stringify( {
							html: assistantCreateHtml,
							title: 'AI Generated Section',
							parentId: request?.targetParentId,
							slot: request?.targetSlot,
						} ),
					},
				} );
			}
			if ( mode === 'create' && !deferredCreateCalls.length ) {
				throw new Error( 'AI did not return importable HTML. Try again with a more specific request, or use a provider/model that supports OpenAI-compatible tool calls.' );
			}
			if ( mode === 'create' && deferredCreateCalls.length ) {
				setAiSession( {
					status: 'applying',
					lastToolSummary: 'Parsing generated HTML into editable Builder nodes...',
				} );
				for ( const call of deferredCreateCalls ) {
					abortController.signal.throwIfAborted();
					let result: BuilderAiToolExecutionResult;
					try {
						result = await toolExecutor.executeTool( call );
					} catch ( error ) {
						result = {
							ok: false,
							summary: error instanceof Error ? error.message : 'Generated HTML could not be parsed.',
						};
					}
					const content = result.ok ? result.summary : `Tool ${ call.function.name } failed: ${ result.summary }`;
					hadToolFailure ||= !result.ok;
					hadSuccessfulTool ||= result.ok;
					appendAiMessage( makeAiTranscriptMessage( 'tool', content, { toolName: call.function.name } ) );
					setAiSession( { lastToolSummary: content } );
					if ( settings.debugMode ) {
						appendAiMessage( makeAiTranscriptMessage( 'system', `Builder parsed/applied ${ call.function.name }\n\n${ JSON.stringify( {
							ok: result.ok,
							summary: result.summary,
							data: result.data,
						}, null, 2 ) }`, { toolName: 'debug' } ) );
					}
					if ( !result.ok ) {
						throw new Error( result.summary );
					}
				}
			}
			if ( aiSessionState.activeRunId === runId ) {
				if ( hadToolFailure && !hadSuccessfulTool ) {
					const message = aiSessionState.lastToolSummary ?? 'AI could not apply the requested change.';
					setAiSession( { status: 'error', error: message, activeRunId: undefined } );
				} else {
					setAiSession( { status: 'idle', activeRunId: undefined, createPreview: undefined } );
				}
			}
		} catch ( error ) {
			if ( abortController.signal.aborted ) {
				if ( aiSessionState.activeRunId === runId ) {
					setAiSession( { status: 'idle', activeRunId: undefined, createPreview: undefined } );
					appendAiMessage( makeAiTranscriptMessage( 'assistant', 'AI run cancelled.' ) );
				}
				return;
			}
			const message = error instanceof Error ? error.message : 'AI request failed.';
			notifyLifecycleError( error, 'ai' );
			setAiSession( { mode, status: 'error', error: message, activeRunId: undefined } );
			appendAiMessage( makeAiTranscriptMessage( 'error', message ) );
		} finally {
			if ( activeAiAbortController === abortController ) {
				activeAiAbortController = undefined;
			}
		}
	}

	function queuePersist( event: BuilderPersistenceEvent ): Promise<void> {
		if ( !persistenceAdapter || typeof window === 'undefined' ) {
			return Promise.resolve();
		}

		persistQueue = persistQueue
			.catch( () => undefined )
			.then( async () => {
				const eventWithVersion = {
					...event,
					expectedVersionToken: event.expectedVersionToken ?? persistenceVersionToken,
				};
				lastPersistEvent = eventWithVersion;
				engine.dispatch( { type: 'document/ui/set-save-state', state: getPersistingSaveState( eventWithVersion ) } );
				try {
					const result = await callPersistenceAdapter( persistenceAdapter, eventWithVersion );
					if ( result?.conflict ) {
						lastConflict = result;
						engine.dispatch( { type: 'document/ui/set-save-state', state: 'conflict' } );
						return;
					}
					lastConflict = undefined;
					if ( result?.project ) {
						engine.dispatch( { type: 'project/import', project: result.project } );
					}
					persistenceVersionToken = result?.versionToken ?? readPersistenceVersionToken( result?.project ) ?? persistenceVersionToken;
					engine.dispatch( {
						type: 'document/ui/set-save-state',
						state: result?.state ?? ( eventWithVersion.revisionKind === 'published' ? 'published' : 'saved' ),
					} );
				} catch ( error ) {
					notifyLifecycleError( error, eventWithVersion.reason === 'autosave' ? 'autosave' : 'persist' );
					engine.dispatch( { type: 'document/ui/set-save-state', state: 'error' } );
				}
			} );

		return persistQueue;
	}

	function subscribeSelector<T>(
		selector: ( state: BuilderEngineState ) => T,
		listener: ( slice: T, state: BuilderEngineState ) => void,
		equals: ( left: T, right: T ) => boolean = Object.is,
		surface?: string,
	) {
		const subscription: SelectorSubscription<T> = {
			selector,
			listener,
			equals,
			current: selector( currentState ),
			surface,
		};
		selectorSubscriptions.add( subscription as SelectorSubscriptionEntry );
		return () => {
			selectorSubscriptions.delete( subscription as SelectorSubscriptionEntry );
		};
	}

	function getDocumentCache( documentId = engine.getState().activeDocumentId ): BuilderDocumentCache | undefined {
		const document = getProjectDocumentsById().get( documentId );
		if ( !document ) {
			return undefined;
		}

		return ensureDocumentCache( document );
	}

	function getProjectNode( nodeId?: string ): BuilderProjectNodeCacheEntry | undefined {
		if ( !nodeId ) {
			return undefined;
		}

		if ( !projectNodeCache || projectNodeCacheProject !== currentState.project ) {
			projectNodeCacheProject = currentState.project;
			projectNodeCache = buildProjectNodeCache( currentState.project.documents );
		}

		return projectNodeCache.get( nodeId );
	}

	function getProjectDocumentsById() {
		if ( projectDocumentsIndexProject !== currentState.project ) {
			projectDocumentsIndexProject = currentState.project;
			projectDocumentsById = buildDocumentsIndex( currentState.project.documents );
		}

		return projectDocumentsById;
	}

	function ensureDocumentCache( document: BuilderDocument ): BuilderDocumentCache {
		const cached = documentCaches.get( document.id );
		if ( cached?.document === document ) {
			return cached;
		}

		const nextCache = buildDocumentCache( document );
		documentCaches.set( document.id, nextCache );
		return nextCache;
	}

	function buildProjectNodeCache( documents: BuilderDocument[] ) {
		const projectNodes = new Map<string, BuilderProjectNodeCacheEntry>();

		for ( const document of documents ) {
			const cache = ensureDocumentCache( document );
			for ( const node of cache.flatNodes ) {
				const location = cache.locationById.get( node.id );
				if ( !location ) {
					continue;
				}

				projectNodes.set( node.id, {
					documentId: document.id,
					node,
					location,
				} );
			}
		}

		return projectNodes;
	}

	function getPerfCounters(): BuilderPerfCounters | undefined {
		if ( typeof window === 'undefined' ) {
			return undefined;
		}

		window.__builderPerf ??= {
			selectorEmissions: {},
		};
		return window.__builderPerf;
	}

	function incrementPerfCounter( counter: string, amount = 1, surface?: string ) {
		const perf = getPerfCounters();
		if ( !perf ) {
			return;
		}

		if ( counter === 'selectorEmissions' ) {
			perf.selectorEmissions ??= {};
			const key = surface ?? 'unknown';
			perf.selectorEmissions[ key ] = ( perf.selectorEmissions[ key ] ?? 0 ) + amount;
			return;
		}

		const currentValue = typeof perf[ counter ] === 'number' ? perf[ counter ] as number : 0;
		perf[ counter ] = currentValue + amount;
	}

	function listDynamicProviders( category?: Binding['category'] ) {
		const providers = [ ...registry.dynamicProviders.values() ];
		return category ? providers.filter( ( provider ) => provider.categories.includes( category ) ) : providers;
	}

	function updateNodeBindings( nodeId: string, updater: ( node: BuilderNode ) => Binding[] ): void {
		const entry = getProjectNode( nodeId );
		if ( !entry ) {
			return;
		}
		engine.dispatch( {
			type: 'document/elements/update',
			documentId: entry.documentId,
			nodeId,
			bindings: updater( entry.node ),
		} );
	}

	function addDynamicBinding( nodeId: string, binding: Partial<Binding> & Pick<Binding, 'targetKind' | 'target' | 'path'> ): string | undefined {
		const bindingId = binding.id ?? crypto.randomUUID();
		updateNodeBindings( nodeId, ( node ) => [
			...node.bindings.filter( ( entry: Binding ) => !( entry.targetKind === binding.targetKind && entry.target === binding.target ) ),
			{
				id: bindingId,
				targetKind: binding.targetKind,
				target: binding.target,
				source: 'dynamic',
				path: binding.path,
				category: binding.category,
				fallback: binding.fallback,
				before: binding.before,
				after: binding.after,
				transform: binding.transform,
				args: binding.args ?? {},
			},
		] );
		return bindingId;
	}

	function updateDynamicBinding( bindingId: string, patch: Partial<Binding> ): void {
		const current = engine.getState();
		for ( const document of current.project.documents ) {
			const cache = ensureDocumentCache( document );
			const node = cache.flatNodes.find( ( entry: BuilderNode ) => entry.bindings.some( ( binding: Binding ) => binding.id === bindingId ) );
			if ( !node ) {
				continue;
			}
			engine.dispatch( {
				type: 'document/elements/update',
				documentId: document.id,
				nodeId: node.id,
				bindings: node.bindings.map( ( binding: Binding ) => binding.id === bindingId ? { ...binding, ...patch } : binding ),
			} );
			return;
		}
	}

	function removeDynamicBinding( bindingId: string ): void {
		const current = engine.getState();
		for ( const document of current.project.documents ) {
			const cache = ensureDocumentCache( document );
			const node = cache.flatNodes.find( ( entry: BuilderNode ) => entry.bindings.some( ( binding: Binding ) => binding.id === bindingId ) );
			if ( !node ) {
				continue;
			}
			engine.dispatch( {
				type: 'document/elements/update',
				documentId: document.id,
				nodeId: node.id,
				bindings: node.bindings.filter( ( binding: Binding ) => binding.id !== bindingId ),
			} );
			return;
		}
	}

	function emitTransientDragState( nextState: BuilderTransientDragState ) {
		if ( areTransientDragStatesEqual( transientDragState, nextState ) ) {
			return;
		}

		transientDragState = nextState;
		transientDrag.set( nextState );
	}

	function syncTransientDropTarget( target: DropTarget | undefined ) {
		const currentTarget = engine.getState().ui.dropTarget;
		if ( areDropTargetsEqual( currentTarget, target ) ) {
			return;
		}

		engine.dispatch( { type: 'document/ui/set-drop-target', target } );
		incrementPerfCounter( 'dragTargetUpdates' );
	}

	function applyTransientDragState( nextState: { pointer?: BuilderTransientDragPointer; dropTarget?: DropTarget } ) {
		syncTransientDropTarget( nextState.dropTarget );
		emitTransientDragState( {
			pointer: nextState.pointer,
			dropTarget: nextState.dropTarget,
			version: transientDragState.version + 1,
		} );
	}

	function setTransientDragState( nextState: { pointer?: BuilderTransientDragPointer; dropTarget?: DropTarget } ) {
		pendingTransientDragState = undefined;
		if ( transientDragFrame && typeof window !== 'undefined' ) {
			cancelAnimationFrame( transientDragFrame );
			transientDragFrame = 0;
		}
		applyTransientDragState( nextState );
	}

	function flushPendingTransientDragState() {
		if ( transientDragFrame && typeof window !== 'undefined' ) {
			cancelAnimationFrame( transientDragFrame );
			transientDragFrame = 0;
		}

		const nextState = pendingTransientDragState;
		pendingTransientDragState = undefined;
		if ( !nextState ) {
			return;
		}

		applyTransientDragState( nextState );
	}

	function queueTransientDragState( nextState: { pointer?: BuilderTransientDragPointer; dropTarget?: DropTarget } ) {
		pendingTransientDragState = nextState;
		if ( typeof window === 'undefined' ) {
			flushPendingTransientDragState();
			return;
		}

		if ( transientDragFrame ) {
			return;
		}

		transientDragFrame = window.requestAnimationFrame( () => {
			transientDragFrame = 0;
			flushPendingTransientDragState();
		} );
	}

	function resetTransientDragState() {
		pendingTransientDragState = undefined;
		if ( transientDragFrame && typeof window !== 'undefined' ) {
			cancelAnimationFrame( transientDragFrame );
			transientDragFrame = 0;
		}
		emitTransientDragState( {
			...EMPTY_TRANSIENT_DRAG_STATE,
			version: transientDragState.version + 1,
		} );
	}

	function getAiCompositionContext( state: BuilderEngineState ): BuilderAiCompositionContext {
		const activeDocument = getActiveDocument( state );
		const documentsById = new Map( state.project.documents.map( ( document ) => [ document.id, document ] as const ) );
		const composition = resolveComposition( {
			project: state.project,
			activeDocumentId: state.ui.preview.documentId ?? state.activeDocumentId,
			previewSlot: state.ui.preview.slot,
			previewAssignmentId: state.ui.preview.assignmentId,
			previewSource: state.ui.preview.source,
			adapter: hostAdapter,
			conditionContext: getAiTemplateConditionContext( state ),
		} );
		const renderedDocuments: Array<{ slot: string; document: BuilderDocument }> = [];
		for ( const [ slot, documents ] of Object.entries( composition.slotDocuments ) ) {
			for ( const document of documents ) {
				const sourceDocument = documentsById.get( document.id ) ?? document;
				if ( !renderedDocuments.some( ( entry ) => entry.slot === slot && entry.document.id === sourceDocument.id ) ) {
					renderedDocuments.push( { slot, document: sourceDocument } );
				}
			}
		}
		if ( !renderedDocuments.some( ( entry ) => entry.document.root.length > 0 ) ) {
			const assignedPageDocument = findAiAssignedPageDocument( state, documentsById );
			if ( assignedPageDocument ) {
				renderedDocuments.push( { slot: 'page-assignment', document: assignedPageDocument } );
			}
		}
		const explicitPreviewDocument = state.ui.preview.documentId ? documentsById.get( state.ui.preview.documentId ) : undefined;
		const candidates = [
			...renderedDocuments.map( ( entry ) => entry.document ),
			explicitPreviewDocument,
			activeDocument,
		].filter( ( document ): document is BuilderDocument => Boolean( document ) );
		const selectedDocument = state.ui.selectedNodeIds[ 0 ]
			? candidates.find( ( document ) => state.ui.selectedNodeIds.some( ( nodeId ) => Boolean( getNodeLocation( document.root, nodeId ) ) ) )
			: undefined;
		const primaryDocument = selectedDocument
			?? candidates.find( ( document ) => document.root.length > 0 )
			?? activeDocument;
		return { activeDocument, primaryDocument, renderedDocuments };
	}

	function findAiAssignedPageDocument( state: BuilderEngineState, documentsById: Map<string, BuilderDocument> ): BuilderDocument | undefined {
		const pathname = normalizeAiPathname( state.ui.preview.pathname );
		return state.project.themeAssignments
			.filter( ( assignment ) => assignment.slot === 'page' && assignment.status !== 'archived' )
			.sort( ( left, right ) => right.priority - left.priority )
			.map( ( assignment ) => ( { assignment, document: documentsById.get( assignment.documentId ) } ) )
			.find( ( entry ) => {
				return Boolean( entry.document?.root.length )
					&& ( !entry.assignment.pathname || aiPathnameMatches( entry.assignment.pathname, pathname ) );
			} )?.document;
	}

	function normalizeAiPathname( value?: string ): string {
		const pathname = value?.trim() || '/';
		return pathname.startsWith( '/' ) ? pathname : `/${ pathname }`;
	}

	function aiPathnameMatches( pattern: string, pathname: string ): boolean {
		const normalizedPattern = normalizeAiPathname( pattern );
		if ( normalizedPattern === pathname ) {
			return true;
		}
		const escaped = normalizedPattern
			.replaceAll( /[.+^${}()|[\]\\]/g, '\\$&' )
			.replaceAll( /\*/g, '.*' )
			.replaceAll( /\[\.{3}[^\]]+\]/g, '.*' )
			.replaceAll( /\[[^\]]+\]/g, '[^/]+' );
		return new RegExp( `^${ escaped }$` ).test( pathname );
	}

	function getAiTemplateConditionContext( state: BuilderEngineState ): TemplateConditionContext {
		return {
			pathname: state.ui.preview.pathname || '/',
			query: new URLSearchParams( state.ui.preview.query ?? '' ),
			data: dynamicPreviewContext.loadData,
			siteData: dynamicPreviewContext.siteData,
			request: dynamicPreviewContext.request,
			session: dynamicPreviewContext.session,
			record: dynamicPreviewContext.record,
			document: dynamicPreviewContext.document,
		};
	}

	function hasExplicitAiCreateIntent( prompt: string ): boolean {
		return /\b(add|append|insert|create|generate|build|make\s+(?:a|an|new)|new\s+(?:section|block|page|hero|cta|area|part))\b/i.test( prompt );
	}

	function summarizeAiContextNode( node: BuilderNode ): JsonValue {
		const slotNodes = node.slots as Record<string, BuilderNode[]>;
		return {
			id: node.id,
			type: node.type,
			name: node.name,
			props: summarizeAiProps( node.props ),
			layout: node.layout,
			styleKeys: Object.keys( node.styles?.base ?? {} ).slice( 0, 12 ),
			styleRefs: node.styleRefs,
			children: node.children.length,
			slots: Object.fromEntries( Object.entries( slotNodes ).map( ( [ slotName, nodes ] ) => [ slotName, nodes.length ] ) ),
		} as JsonValue;
	}

	function summarizeAiProps( props: Record<string, JsonValue> ): Record<string, JsonValue> {
		const output: Record<string, JsonValue> = {};
		for ( const [ key, value ] of Object.entries( props ).slice( 0, 8 ) ) {
			output[ key ] = typeof value === 'string' && value.length > 140 ? `${ value.slice( 0, 140 ) }...` : value;
		}
		return output;
	}

	function summarizeNearbyAiStructure( document: BuilderDocument, selectedNodeId: string ): JsonValue {
		const location = getNodeLocation( document.root, selectedNodeId );
		if ( !location ) {
			return summarizeRootAiStructure( document );
		}
		const siblings = location.parentId
			? getNodeLocation( document.root, location.parentId )?.node.children ?? document.root
			: document.root;
		return {
			parentId: location.parentId,
			slot: location.slot,
			index: location.index,
			siblings: siblings.map( ( node: BuilderNode ) => ( {
				id: node.id,
				type: node.type,
				name: node.name,
				selected: node.id === selectedNodeId,
				text: getAiNodeTextPreview( node ),
				children: node.children.length,
			} ) ).slice( Math.max( 0, location.index - 3 ), location.index + 4 ),
		} as JsonValue;
	}

	function summarizeRootAiStructure( document: BuilderDocument ): JsonValue {
		return {
			root: document.root.slice( 0, 12 ).map( ( node: BuilderNode ) => ( {
				id: node.id,
				type: node.type,
				name: node.name,
				text: getAiNodeTextPreview( node ),
				children: node.children.length,
			} ) ),
			totalRootNodes: document.root.length,
		} as JsonValue;
	}

	function summarizeFullAiPageContext( context: BuilderAiCompositionContext ): JsonValue {
		let includedNodes = 0;
		const maxNodes = 80;
		const maxDepth = 5;
		const summarizeNode = ( node: BuilderNode, depth: number ): JsonValue | undefined => {
			if ( includedNodes >= maxNodes ) {
				return undefined;
			}
			includedNodes += 1;
			const slotNodes = Object.entries( node.slots as Record<string, BuilderNode[]> )
				.flatMap( ( [ slotName, nodes ] ) => nodes.slice( 0, 6 ).map( ( child: BuilderNode ) => ( { slotName, child } ) ) );
			const childSummaries: JsonValue[] = [];
			if ( depth < maxDepth ) {
				for ( const child of node.children.slice( 0, 12 ) ) {
					const summary = summarizeNode( child, depth + 1 );
					if ( summary ) {
						childSummaries.push( summary );
					}
				}
			}
			const slotSummaries: Record<string, JsonValue[]> = {};
			if ( depth < maxDepth ) {
				for ( const entry of slotNodes ) {
					const summary = summarizeNode( entry.child, depth + 1 );
					if ( summary ) {
						slotSummaries[ entry.slotName ] = [ ...( slotSummaries[ entry.slotName ] ?? [] ), summary ];
					}
				}
			}
			const baseStyles = node.styles?.base ?? {};
			return {
				id: node.id,
				type: node.type,
				name: node.name,
				text: getAiNodeTextPreview( node ),
				props: summarizeAiProps( node.props ),
				layout: node.layout,
				styleHints: Object.fromEntries( [
					'display',
					'flexDirection',
					'gridTemplateColumns',
					'gap',
					'padding',
					'margin',
					'background',
					'backgroundColor',
					'color',
					'fontSize',
					'fontWeight',
					'textAlign',
				].map( ( key ) => [ key, baseStyles[ key ] ] ).filter( ( [ , value ] ) => value !== undefined ) ),
				attributes: node.attributes.slice( 0, 5 ).map( ( attribute: BuilderNode['attributes'][ number ] ) => ( { name: attribute.name, value: attribute.value } ) ),
				children: childSummaries,
				slots: Object.keys( slotSummaries ).length ? slotSummaries : undefined,
				truncatedChildren: node.children.length > 12 ? node.children.length - 12 : undefined,
			} as JsonValue;
		};
		const documents = context.renderedDocuments.length
			? context.renderedDocuments
			: [ { slot: 'active', document: context.primaryDocument } ];
		return {
			activeDocumentId: context.activeDocument.id,
			primaryDocumentId: context.primaryDocument.id,
			renderedDocuments: documents.map( ( entry ) => ( {
				slot: entry.slot,
				documentId: entry.document.id,
				title: entry.document.title,
				kind: entry.document.kind,
				totalNodes: countBuilderNodesForAi( entry.document.root ),
				root: entry.document.root.map( ( node ) => summarizeNode( node, 0 ) ).filter( ( node ): node is JsonValue => Boolean( node ) ),
			} ) ),
			truncated: includedNodes >= maxNodes,
		} as JsonValue;
	}

	function countBuilderNodesForAi( nodes: BuilderNode[] ): number {
		return nodes.reduce( ( total, node ) => {
			const slotCount = Object.values( node.slots as Record<string, BuilderNode[]> )
				.reduce( ( slotTotal, slotNodes ) => slotTotal + countBuilderNodesForAi( slotNodes ), 0 );
			return total + 1 + countBuilderNodesForAi( node.children ) + slotCount;
		}, 0 );
	}

	function getAiNodeTextPreview( node: BuilderNode ): string | undefined {
		const text = typeof node.props.text === 'string'
			? node.props.text
			: typeof node.props.title === 'string'
				? node.props.title
				: undefined;
		return text ? text.replaceAll( /<[^>]+>/g, '' ).trim().slice( 0, 90 ) : undefined;
	}

	function replaceProjectMedia( media: BuilderPackage['media'] ) {
		engine.dispatch( {
			type: 'project/import',
			project: BuilderPackageSchema.parse( {
				...engine.getState().project,
				media,
			} ),
		} );
	}

	async function listMediaAssets(): Promise<BuilderMediaAssetMetadata[]> {
		const latestProject = engine.getState().project;
		const hostAssets = await mediaAdapter.listAssets?.( latestProject );
		const projectAssets = latestProject.media.map( toMediaAssetMetadata );
		return mergeMediaCatalog( [], [
			...projectAssets,
			...( hostAssets ?? [] ),
		] ).map( toMediaAssetMetadata );
	}

	async function uploadMediaAsset( file: File ): Promise<BuilderMediaAssetMetadata> {
		assertPermission( permissions, 'uploadMedia' );
		validateMediaUpload( file, mediaValidationOptions );
		const latestProject = engine.getState().project;
		const uploaded = await mediaAdapter.uploadAsset?.( { file, project: latestProject } );
		if ( !uploaded ) {
			throw new Error( 'This host does not support media uploads.' );
		}
		const normalized = normalizeMediaAsset( {
			...uploaded,
			source: uploaded.source ?? 'upload',
		} );
		replaceProjectMedia( mergeMediaCatalog( latestProject.media, [ normalized ] ) );
		return toMediaAssetMetadata( normalized );
	}

	async function updateMediaAsset( assetId: string, patch: Partial<BuilderMediaAssetMetadata> ): Promise<BuilderMediaAssetMetadata | undefined> {
		assertPermission( permissions, 'uploadMedia' );
		const latestProject = engine.getState().project;
		const updated = await mediaAdapter.updateAsset?.( assetId, patch, latestProject );
		const nextMetadata = updated ?? {
			...toMediaAssetMetadata( latestProject.media.find( ( asset ) => asset.id === assetId ) ?? normalizeMediaAsset( { id: assetId, url: patch.url ?? '' } ) ),
			...patch,
			id: assetId,
		};
		replaceProjectMedia( updateMediaCatalogAsset( latestProject.media, assetId, nextMetadata ) );
		return nextMetadata.url ? nextMetadata : undefined;
	}

	async function deleteMediaAsset( assetId: string ): Promise<void> {
		assertPermission( permissions, 'deleteMedia' );
		const latestProject = engine.getState().project;
		await mediaAdapter.deleteAsset?.( assetId, latestProject );
		replaceProjectMedia( deleteMediaCatalogAsset( latestProject.media, assetId ) );
	}

	function resolveMediaAssetUrl( asset: BuilderMediaAssetMetadata ): string {
		return mediaAdapter.resolveAssetUrl?.( asset, engine.getState().project ) ?? asset.url;
	}

	const controller: BuilderEditorController = {
		subscribe: state.subscribe,
		subscribeSelector,
		subscribeAiSession: aiSession.subscribe,
		engine,
		registry,
		runtimeComponents: options.runtimeComponents,
		features,
		adapter: hostAdapter,
		bindingContext: dynamicPreviewContext,
		permissions,
		can: ( permission ) => permissions[ permission ].allowed,
		getPermission: ( permission ) => permissions[ permission ],
		setDynamicPreviewContext: ( context ) => {
			dynamicPreviewContext = context;
			controller.bindingContext = context;
		},
		listDynamicProviders,
		addDynamicBinding,
		updateDynamicBinding,
		removeDynamicBinding,
		getActiveDocumentCache: () => activeDocumentCache,
		getDocumentCache,
		getProjectNode,
		subscribeTransientDrag: transientDrag.subscribe,
		getTransientDragState: () => transientDragState,
		setTransientDrag: setTransientDragState,
		queueTransientDrag: queueTransientDragState,
		flushTransientDrag: flushPendingTransientDragState,
		clearTransientDrag: resetTransientDragState,
		incrementPerfCounter,
		dispatch: ( command ) => engine.dispatch( command ),
		beginTransaction: ( label ) => engine.beginTransaction( label ),
		commitTransaction: () => engine.commitTransaction(),
		undo: () => engine.undo(),
		redo: () => engine.redo(),
		setPanel: ( panel ) => engine.dispatch( { type: 'document/ui/set-panel', panel } ),
		setShellPage: ( page ) => engine.dispatch( { type: 'document/ui/set-shell-page', page } ),
		toggleShellPanel: ( collapsed ) => engine.dispatch( { type: 'document/ui/toggle-shell-panel', collapsed } ),
		setNavigatorMode: ( mode ) => engine.dispatch( { type: 'document/ui/set-navigator-mode', mode } ),
		toggleNavigator: ( open ) => engine.dispatch( { type: 'document/ui/toggle-navigator', open } ),
		toggleResponsiveBar: ( open ) => engine.dispatch( { type: 'document/ui/toggle-responsive-bar', open } ),
		toggleAppBarMenu: ( open ) => engine.dispatch( { type: 'document/ui/toggle-app-bar-menu', open } ),
		focusDocument: ( documentId, mode ) => {
			const document = engine.getState().project.documents.find( ( entry ) => entry.id === documentId );
			if ( !document ) {
				return;
			}

			engine.dispatch( { type: 'document/ui/select-document', documentId } );
			engine.dispatch( { type: 'document/ui/set-mode', mode: mode ?? deriveEditorMode( document.kind ) } );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: inferShellPageForDocument( document.kind ) } );
		},
		openDocument: ( documentId, modeOrOptions, maybeOptions ) => {
			const document = engine.getState().project.documents.find( ( entry ) => entry.id === documentId );
			if ( !document ) {
				return;
			}

			const context = typeof modeOrOptions === 'string'
				? {
					...maybeOptions,
					mode: modeOrOptions,
				}
				: ( modeOrOptions ?? maybeOptions ?? {} );
			engine.dispatch( { type: 'document/ui/select-document', documentId } );
			engine.dispatch( { type: 'document/ui/set-mode', mode: context.mode ?? deriveEditorMode( document.kind ) } );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: inferShellPageForDocument( document.kind ) } );
			engine.dispatch( {
				type: 'document/ui/set-preview-context',
				context: {
					documentId,
					pathname: context.pathname,
					query: context.query,
					slot: context.slot,
					assignmentId: context.assignmentId,
					source: context.source ?? ( context.siteEntryId ? 'site-entry' : context.assignmentId ? 'assignment' : 'manual' ),
				},
			} );
			if ( context.siteEntryId !== undefined ) {
				engine.dispatch( { type: 'document/ui/set-site-entry', entryId: context.siteEntryId } );
			}
			if ( context.selectedRevisionId !== undefined ) {
				engine.dispatch( { type: 'document/ui/select-revision', revisionId: context.selectedRevisionId } );
			}
			if ( context.openRevisionBrowser !== undefined ) {
				engine.dispatch( { type: 'document/ui/toggle-revision-browser', open: context.openRevisionBrowser } );
			}
		},
		focusBreadcrumb: ( nodeId ) => engine.dispatch( { type: 'document/ui/focus-breadcrumb', nodeId } ),
		saveDraft: async () => {
			assertPermission( permissions, 'editProject' );
			const documentId = engine.getState().activeDocumentId;
			try {
				validateProjectForPersistence( engine.getState().project );
				engine.dispatch( { type: 'document/save/draft', documentId } );
			} catch ( error ) {
				engine.dispatch( { type: 'document/ui/set-save-state', state: 'error' } );
				throw error;
			}
			await queuePersist( {
				project: engine.getState().project,
				documentId,
				reason: 'draft',
				...getLatestRevisionMeta( engine.getState(), documentId ),
			} );
		},
		publish: async () => {
			assertPermission( permissions, 'publish' );
			const documentId = engine.getState().activeDocumentId;
			try {
				validateProjectForPersistence( engine.getState().project );
				engine.dispatch( { type: 'document/save/publish', documentId } );
				validateProjectForPersistence( engine.getState().project );
			} catch ( error ) {
				engine.dispatch( { type: 'document/ui/set-save-state', state: 'error' } );
				throw error;
			}
			const event = {
				project: engine.getState().project,
				documentId,
				reason: 'publish',
				...getLatestRevisionMeta( engine.getState(), documentId ),
			} satisfies BuilderPersistenceEvent;
			await queuePersist( event );
			callLifecycleHook( () => options.hooks?.onPublish?.( event, engine.getState() ) );
		},
		restoreRevision: async ( revisionId, documentId ) => {
			const targetDocumentId = documentId ?? engine.getState().activeDocumentId;
			engine.dispatch( { type: 'document/save/restore-revision', documentId: targetDocumentId, revisionId } );
			await queuePersist( {
				project: engine.getState().project,
				documentId: targetDocumentId,
				revisionId,
				revisionKind: engine.getState().project.revisions.find( ( revision ) => revision.id === revisionId )?.kind,
				reason: 'restore',
			} );
		},
		listRevisions: async ( documentId ) => {
			const targetDocumentId = documentId ?? engine.getState().activeDocumentId;
			if ( persistenceAdapter?.listRevisions ) {
				return persistenceAdapter.listRevisions( targetDocumentId );
			}

			return engine.getState().project.revisions
				.filter( ( revision ) => revision.documentId === targetDocumentId )
				.sort( ( left, right ) => right.createdAt.localeCompare( left.createdAt ) );
		},
		resolveSaveConflict: async ( strategy ) => {
			if ( strategy === 'keep-local' ) {
				lastConflict = undefined;
				engine.dispatch( { type: 'document/ui/set-save-state', state: 'dirty' } );
				return;
			}

			if ( strategy === 'reload' ) {
				const remoteProject = lastConflict?.project
					? {
						project: lastConflict.project,
						versionToken: lastConflict.versionToken,
						updatedAt: lastConflict.updatedAt,
					}
					: await loadProjectFromPersistence( persistenceAdapter );
				lastConflict = undefined;
				if ( remoteProject?.project ) {
					persistenceVersionToken = remoteProject.versionToken ?? readPersistenceVersionToken( remoteProject.project ) ?? persistenceVersionToken;
					engine.dispatch( { type: 'project/import', project: remoteProject.project } );
					engine.dispatch( { type: 'document/ui/set-save-state', state: 'saved' } );
					return;
				}
				engine.dispatch( { type: 'document/ui/set-save-state', state: 'error' } );
				return;
			}

			if ( strategy === 'overwrite' && lastPersistEvent ) {
				const retryEvent = {
					...lastPersistEvent,
					project: engine.getState().project,
					force: true,
				};
				lastConflict = undefined;
				await queuePersist( retryEvent );
			}
		},
		toggleRevisionBrowser: ( open ) => engine.dispatch( { type: 'document/ui/toggle-revision-browser', open } ),
		selectRevision: ( revisionId ) => engine.dispatch( { type: 'document/ui/select-revision', revisionId } ),
		setPreviewContext: ( context ) => engine.dispatch( { type: 'document/ui/set-preview-context', context } ),
		setSiteEditorEntry: ( entryId ) => engine.dispatch( { type: 'document/ui/set-site-entry', entryId } ),
		updateComponentInstanceOverrides: ( nodeId, overrides, merge = true ) => {
			engine.dispatch( {
				type: 'document/component/update-instance-overrides',
				nodeId,
				overrides,
				merge,
			} );
		},
		detachComponentInstance: ( nodeId ) => {
			const targetNodeId = nodeId ?? engine.getState().ui.selectedNodeIds[ 0 ];
			if ( !targetNodeId ) {
				return;
			}

			engine.dispatch( {
				type: 'document/component/detach-instance',
				nodeId: targetNodeId,
			} );
		},
		relinkComponentInstance: ( nodeId, componentId, preserveOverrides = true ) => {
			const targetNodeId = nodeId ?? engine.getState().ui.selectedNodeIds[ 0 ];
			if ( !targetNodeId ) {
				return;
			}

			engine.dispatch( {
				type: 'document/component/relink-instance',
				nodeId: targetNodeId,
				componentId,
				preserveOverrides,
			} );
		},
		createDocument: ( kind, title ) => {
			const document = createDocument( kind, title );
			engine.dispatch( { type: 'document/create', document } );
			engine.dispatch( { type: 'document/ui/select-document', documentId: document.id } );
			engine.dispatch( { type: 'document/ui/set-mode', mode: deriveEditorMode( kind ) } );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: inferShellPageForDocument( kind ) } );
			return document.id;
		},
		deleteDocument: ( documentId ) => {
			const targetId = documentId ?? engine.getState().activeDocumentId;
			const currentState = engine.getState();
			if ( currentState.project.documents.length <= 1 ) {
				return;
			}

			engine.dispatch( { type: 'document/delete', documentId: targetId } );
			if ( currentState.activeDocumentId === targetId ) {
				const fallback = engine.getState().project.documents[ 0 ]?.id;
				if ( fallback ) {
					engine.dispatch( { type: 'document/ui/select-document', documentId: fallback } );
				}
			}
		},
		createLibraryItemFromSelection: ( title ) => {
			const currentState = engine.getState();
			const activeDocument = getActiveDocument( currentState );
			const selectedNodes = getSelectedNodes( currentState );
			const sourceNodes = ( selectedNodes.length ? selectedNodes : activeDocument.root ).map( cloneNodeTreeWithFreshIds );
			const document = createDocument( 'library-item', title );
			document.root = sourceNodes;
			document.meta = {
				sourceDocumentId: activeDocument.id,
				selectionBased: selectedNodes.length > 0,
			};
			engine.dispatch( { type: 'document/create', document } );
			return document.id;
		},
		createLibraryItemFromPage: ( title ) => {
			const activeDocument = getActiveDocument( engine.getState() );
			const document = createDocument( 'library-item', title );
			document.root = activeDocument.root.map( cloneNodeTreeWithFreshIds );
			document.meta = {
				sourceDocumentId: activeDocument.id,
				sourceDocumentTitle: activeDocument.title,
				sourceDocumentKind: activeDocument.kind,
				selectionBased: false,
				fullPageTemplate: true,
			};
			engine.dispatch( { type: 'document/create', document } );
			return document.id;
		},
		importTemplatesFromJson: async ( payload, importOptions ) => {
			const result = await importTemplatesIntoProject( engine.getState().project, payload, importOptions );
			engine.dispatch( {
				type: 'project/import',
				project: result.project,
				importedDocumentIds: result.importedDocumentIds,
			} );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: 'globals' } );
			engine.dispatch( { type: 'document/ui/set-panel', panel: 'library' } );
			engine.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: true } );
			const { project: _project, ...publicResult } = result;
			return publicResult;
		},
		reviewTemplatesFromJson: async ( payload, importOptions ) => reviewTemplateImportPayload( payload, importOptions ),
		reviewHtmlTemplate: async ( payload, importOptions ) => reviewHtmlImportPayload( payload, importOptions ),
		commitTemplateImportReview: async ( review, importOptions ) => {
			const currentState = engine.getState();
			const result = commitTemplateImportReview( currentState.project, review, {
				...importOptions,
				activeDocumentId: importOptions?.activeDocumentId ?? currentState.activeDocumentId,
			} );
			engine.dispatch( {
				type: 'project/import',
				project: result.project,
				importedDocumentIds: result.importedDocumentIds,
			} );
			const destination = importOptions?.destination ?? 'library';
			if ( destination === 'new-page' ) {
				const pageId = result.importedDocumentIds.find( ( documentId ) => {
					const document = result.project.documents.find( ( entry ) => entry.id === documentId );
					return document?.kind === 'page';
				} );
				if ( pageId ) {
					engine.dispatch( { type: 'document/ui/select-document', documentId: pageId } );
					engine.dispatch( { type: 'document/ui/set-mode', mode: 'page' } );
					engine.dispatch( { type: 'document/ui/set-shell-page', page: 'editor' } );
				}
			} else if ( destination === 'active-page' ) {
				engine.dispatch( { type: 'document/ui/set-shell-page', page: 'editor' } );
				engine.dispatch( { type: 'document/ui/set-panel', panel: 'content' } );
			} else {
				engine.dispatch( { type: 'document/ui/set-shell-page', page: 'globals' } );
				engine.dispatch( { type: 'document/ui/set-panel', panel: 'library' } );
				engine.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: true } );
			}
			const { project: _project, ...publicResult } = result;
			return publicResult;
		},
		importHtmlTemplate: async ( payload, importOptions ) => {
			const result = await importHtmlIntoProject( engine.getState().project, payload, importOptions );
			engine.dispatch( {
				type: 'project/import',
				project: result.project,
				importedDocumentIds: result.importedDocumentIds,
			} );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: 'globals' } );
			engine.dispatch( { type: 'document/ui/set-panel', panel: 'library' } );
			engine.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: true } );
			const { project: _project, ...publicResult } = result;
			return publicResult;
		},
		listMediaAssets,
		uploadMediaAsset,
		updateMediaAsset,
		deleteMediaAsset,
		resolveMediaAssetUrl,
		getMediaDiagnostics: () => createMediaDiagnostics( engine.getState().project.media, mediaValidationOptions.allowedMimeTypes ),
		insertLibraryItem: ( libraryDocumentId, targetParentId, targetSlot ) => {
			const currentState = engine.getState();
			const libraryDocument = currentState.project.documents.find( ( document ) => document.id === libraryDocumentId && document.kind === 'library-item' );
			if ( !libraryDocument ) {
				return;
			}

			const resolvedParentId = targetParentId ?? getPreferredInsertionParentId( currentState, registry );
			engine.beginTransaction( `Insert library item ${ libraryDocument.title }` );
			for ( const rootNode of libraryDocument.root ) {
				engine.dispatch( {
					type: 'document/elements/create',
					parentId: resolvedParentId,
					slot: targetSlot,
					node: cloneNodeTreeWithFreshIds( rootNode ),
				} );
			}
			engine.commitTransaction();
		},
		insertComponentInstance: ( componentId, targetParentId, targetSlot ) => {
			const currentState = engine.getState();
			const resolvedParentId = targetParentId ?? getPreferredInsertionParentId( currentState, registry );
			engine.dispatch( {
				type: 'document/elements/create',
				parentId: resolvedParentId,
				slot: targetSlot,
				node: createNode( {
					type: 'component-instance',
					props: {
						componentId,
						overrides: {},
					},
				} ),
			} );
		},
		getAiSession: () => aiSessionState,
		getAiSettings: resolveAiSettings,
		saveAiSettings: async ( settings ) => {
			assertPermission( permissions, 'useAi' );
			await aiSettingsAdapter.saveSettings( createDefaultAiSettings( settings ) );
		},
		startAiCreate: async ( request ) => {
			assertPermission( permissions, 'useAi' );
			const prompt = [
				`Create with AI: ${ request.prompt }`,
				request.designStyle ? `Design style: ${ request.designStyle }` : '',
				request.overwriteThemeSettings ? 'Theme overwrite allowed.' : '',
			].filter( Boolean ).join( '\n' );
			appendAiMessage( makeAiTranscriptMessage( 'user', request.prompt ) );
			await runAiRequest( prompt, 'create', request );
		},
		startAiEdit: () => {
			assertPermission( permissions, 'useAi' );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: 'editor' } );
			aiSession.update( ( current ) => {
				if ( current.mode === 'edit' ) {
					return current;
				}
				const greeting = current.messages.length
					? current.messages
					: [ makeAiTranscriptMessage( 'assistant', 'Hello! I can help edit this page. What would you like to change or modify?' ) ];
				return {
					...current,
					mode: 'edit',
					status: 'idle',
					error: undefined,
					messages: greeting,
				};
			} );
		},
		stopAiEdit: () => {
			activeAiAbortController?.abort();
			setAiSession( { mode: 'idle', status: 'idle', error: undefined, activeRunId: undefined } );
			engine.dispatch( { type: 'document/ui/set-shell-page', page: 'editor' } );
		},
		sendAiMessage: async ( message ) => {
			assertPermission( permissions, 'useAi' );
			const trimmed = message.trim();
			if ( !trimmed ) {
				return;
			}
			if ( aiSessionState.mode !== 'edit' ) {
				controller.startAiEdit();
			}
			appendAiMessage( makeAiTranscriptMessage( 'user', trimmed ) );
			await runAiRequest( trimmed, 'edit' );
		},
		cancelAiRun: () => {
			activeAiAbortController?.abort();
		},
		startNodeDrag: ( nodeId, pointer, documentId ) => {
			const currentState = engine.getState();
			const targetDocumentId = documentId ?? currentState.activeDocumentId;
			const document = currentState.project.documents.find( ( entry ) => entry.id === targetDocumentId );
			if ( !document ) {
				return;
			}

			const location = getNodeLocation( document.root, nodeId );
			if ( !location ) {
				return;
			}

			engine.dispatch( {
				type: 'document/ui/start-drag',
				session: {
					kind: 'move',
					documentId: targetDocumentId,
					nodeId,
					sourceParentId: location.parentId,
					sourceSlot: location.slot,
					sourceIndex: location.index,
					label: location.node.name ?? location.node.type,
					pointer,
				},
			} );
			setTransientDragState( {
				pointer: {
					x: pointer.x,
					y: pointer.y,
					inside: true,
				},
				dropTarget: undefined,
			} );
		},
		startElementDrag: ( elementType, pointer, documentId ) => {
			const definition = registry.elements.get( elementType );
			if ( !definition ) {
				return;
			}

			engine.dispatch( {
				type: 'document/ui/start-drag',
				session: {
					kind: 'create',
					documentId: documentId ?? engine.getState().activeDocumentId,
					elementType,
					templateNode: definition.createDefaultNode(),
					label: definition.label,
					pointer,
				},
			} );
			setTransientDragState( {
				pointer: {
					x: pointer.x,
					y: pointer.y,
					inside: true,
				},
				dropTarget: undefined,
			} );
		},
		updateDrag: ( pointer ) => {
			incrementPerfCounter( 'engineDragPointerDispatches' );
			setTransientDragState( {
				pointer: {
					x: pointer.x,
					y: pointer.y,
					inside: true,
				},
				dropTarget: engine.getState().ui.dropTarget,
			} );
		},
		setDropTarget: ( target ) => engine.dispatch( { type: 'document/ui/set-drop-target', target } ),
		commitDrag: () => {
			flushPendingTransientDragState();
			engine.dispatch( { type: 'document/ui/commit-drag' } );
			resetTransientDragState();
		},
		cancelDrag: () => {
			flushPendingTransientDragState();
			engine.dispatch( { type: 'document/ui/cancel-drag' } );
			resetTransientDragState();
		},
		moveSelectedNodeBy: ( direction ) => {
			const currentState = engine.getState();
			const selectedNodeId = currentState.ui.selectedNodeIds[ 0 ];
			if ( !selectedNodeId ) {
				return;
			}

			const location = getNodeLocation( getActiveDocument( currentState ).root, selectedNodeId );
			if ( !location ) {
				return;
			}

			const targetIndex = direction > 0
				? location.index + direction + 1
				: Math.max( 0, location.index + direction );

			engine.dispatch( {
				type: 'document/ui/start-drag',
				session: {
					kind: 'move',
					documentId: currentState.activeDocumentId,
					nodeId: selectedNodeId,
					sourceParentId: location.parentId,
					sourceSlot: location.slot,
					sourceIndex: location.index,
					label: location.node.name ?? location.node.type,
					pointer: { x: 0, y: 0 },
				},
			} );
			engine.dispatch( {
				type: 'document/ui/set-drop-target',
				target: {
					documentId: currentState.activeDocumentId,
					parentId: location.parentId,
					slot: location.slot,
					index: targetIndex,
					placement: direction < 0 ? 'before' : 'after',
					targetNodeId: selectedNodeId,
					rect: {
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						width: 0,
						height: 0,
					},
				},
			} );
			engine.dispatch( { type: 'document/ui/commit-drag' } );
		},
		togglePreviewPopups: ( open ) => engine.dispatch( { type: 'document/ui/toggle-preview-popups', open } ),
		openContextMenu: ( options ) => engine.dispatch( {
			type: 'document/ui/open-context-menu',
			anchor: {
				x: options.x,
				y: options.y,
			},
			targetKind: options.targetKind,
			documentId: options.documentId,
			nodeId: options.nodeId,
			slot: options.slot,
		} ),
		closeContextMenu: () => engine.dispatch( { type: 'document/ui/close-context-menu' } ),
	};

	if (
		typeof window !== 'undefined'
		&& ( window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' )
	) {
		window.__builderEditor = controller;
	}

	return controller;
}

function resolveEditorFeatures( features: BuilderEditorFeatures | undefined ): ResolvedBuilderEditorFeatures {
	warnOnDeprecatedEditorFeatures( features );

	const interactionCoreV3 = true;
	const shellVariant = 'v3';
	const canvasInteractionV2 = true;
	const navigatorVirtualization = features?.navigatorVirtualization ?? true;
	return {
		canvasInteractionV2,
		interactionCoreV3,
		navigatorVirtualization,
		shellVariant,
	};
}

function warnOnDeprecatedEditorFeatures( features: BuilderEditorFeatures | undefined ) {
	if ( !shouldWarnDeprecatedEditorFeatures() || !features ) {
		return;
	}

	if ( features.interactionCoreV3 === false ) {
		warnCompatibilityOnce( 'interaction-core-v3', 'interactionCoreV3=false is deprecated and is now ignored; the V3 shell always stays enabled.' );
	}

	if ( features.canvasInteractionV2 === false ) {
		warnCompatibilityOnce( 'canvas-interaction-v2', 'canvasInteractionV2 is deprecated and is now a no-op compatibility flag.' );
	}

	if ( features.shellVariant === 'legacy' ) {
		warnCompatibilityOnce( 'shell-variant-legacy', 'shellVariant=\"legacy\" is deprecated and is now coerced to the V3 shell.' );
	}
}

function shouldWarnDeprecatedEditorFeatures() {
	if ( typeof process !== 'undefined' && process.env?.NODE_ENV && process.env.NODE_ENV !== 'production' ) {
		return true;
	}

	if ( typeof window !== 'undefined' ) {
		return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
	}

	return false;
}

function warnCompatibilityOnce( key: string, message: string ) {
	if ( emittedCompatibilityWarnings.has( key ) || typeof console === 'undefined' ) {
		return;
	}

	emittedCompatibilityWarnings.add( key );
	console.warn( `[builder-editor] ${ message }` );
}

function resolveMediaAdapter( adapter: BuilderMediaAdapter | BuilderHostMediaAdapter | undefined ): BuilderMediaAdapter | undefined {
	if ( !adapter ) {
		return undefined;
	}

	const candidate = adapter as BuilderMediaAdapter;
	const hostCandidate = adapter as BuilderHostMediaAdapter;
	return {
		listAssets: async ( project ) => {
			if ( candidate.listAssets ) {
				return candidate.listAssets.length > 0
					? candidate.listAssets( project )
					: ( candidate.listAssets as unknown as () => Promise<BuilderMediaAssetMetadata[]> | BuilderMediaAssetMetadata[] )();
			}
			return project.media.map( toMediaAssetMetadata );
		},
		uploadAsset: async ( input ) => {
			if ( candidate.uploadAsset && candidate.uploadAsset.length <= 1 ) {
				return candidate.uploadAsset( input );
			}
			if ( hostCandidate.uploadAsset ) {
				return hostCandidate.uploadAsset( input.file ) as Promise<BuilderMediaAssetMetadata>;
			}
			return undefined as unknown as BuilderMediaAssetMetadata;
		},
		deleteAsset: async ( assetId, project ) => {
			if ( candidate.deleteAsset && candidate.deleteAsset.length > 1 ) {
				return candidate.deleteAsset( assetId, project );
			}
			return hostCandidate.deleteAsset?.( assetId );
		},
		updateAsset: async ( assetId, patch, project ) => {
			if ( candidate.updateAsset && candidate.updateAsset.length > 2 ) {
				const updated = await candidate.updateAsset( assetId, patch, project );
				return updated ?? toMediaAssetMetadata( project.media.find( ( asset ) => asset.id === assetId ) ?? normalizeMediaAsset( { id: assetId, url: patch.url ?? '' } ) );
			}
			if ( !hostCandidate.updateAsset ) {
				return undefined as unknown as BuilderMediaAssetMetadata;
			}
			const updated = await hostCandidate.updateAsset?.( assetId, patch as never );
			if ( updated ) {
				return updated as BuilderMediaAssetMetadata;
			}
			return undefined as unknown as BuilderMediaAssetMetadata;
		},
		resolveAssetUrl: ( asset, project ) => {
			if ( candidate.resolveAssetUrl && candidate.resolveAssetUrl.length > 1 ) {
				return candidate.resolveAssetUrl( asset, project );
			}
			return hostCandidate.resolveAssetUrl?.( asset as never, {} ) ?? asset.url;
		},
	};
}

function buildDocumentsIndex( documents: BuilderDocument[] ) {
	return new Map( documents.map( ( document ) => [ document.id, document ] ) );
}

function buildDocumentCache( document: BuilderDocument ): BuilderDocumentCache {
	const flatNodes: BuilderNode[] = [];
	const nodeById = new Map<string, BuilderNode>();
	const locationById = new Map<string, BuilderNodeLocationCacheEntry>();

	function visitNodes( nodes: BuilderNode[], parentId?: string, slot?: string ) {
		nodes.forEach( ( node, index ) => {
			flatNodes.push( node );
			nodeById.set( node.id, node );
			locationById.set( node.id, {
				node,
				parentId,
				slot,
				index,
			} );

			if ( node.children.length ) {
				visitNodes( node.children, node.id );
			}

			for ( const [ slotName, slotNodes ] of Object.entries( node.slots as Record<string, BuilderNode[]> ) ) {
				if ( slotNodes.length ) {
					visitNodes( slotNodes, node.id, slotName );
				}
			}
		} );
	}

	visitNodes( document.root );

	return {
		documentId: document.id,
		document,
		flatNodes,
		nodeById,
		locationById,
	};
}

function getPreferredInsertionParentId( state: BuilderEngineState, registry: BuilderRegistry ): string | undefined {
	const selectedNode = getSelectedNodes( state )[ 0 ];
	if ( !selectedNode ) {
		return undefined;
	}

	const definition = registry.elements.get( selectedNode.type );
	if ( definition?.runtime.acceptsChildren || Object.keys( selectedNode.slots ).length ) {
		return selectedNode.id;
	}

	return undefined;
}

function cloneNodeTreeWithFreshIds( node: BuilderNode ): BuilderNode {
	return createNode( {
		...structuredClone( node ),
		id: crypto.randomUUID(),
		children: node.children.map( cloneNodeTreeWithFreshIds ),
		slots: Object.fromEntries(
			Object.entries( node.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, slotNodes ] ) => [ slotName, slotNodes.map( cloneNodeTreeWithFreshIds ) ] ),
		),
	} );
}

function getLatestRevisionMeta( state: BuilderEngineState, documentId: string ): Pick<BuilderPersistenceEvent, 'revisionId' | 'revisionKind'> {
	const revision = [ ...state.project.revisions ]
		.reverse()
		.find( ( entry ) => entry.documentId === documentId );
	return {
		revisionId: revision?.id,
		revisionKind: revision?.kind,
	};
}

function resolveEditorAdapterOptions( adapter: CreateBuilderEditorOptions['adapter'] ): BuilderEditorAdapterOptions {
	if ( !adapter ) {
		return {};
	}
	if ( 'resolveBinding' in adapter ) {
		return { host: adapter };
	}
	return adapter;
}

function areStringArraysEqual( left: string[], right: string[] ): boolean {
	return left.length === right.length && left.every( ( value, index ) => value === right[ index ] );
}

const defaultPermissionKeys: BuilderHostPermissionKey[] = [
	'editProject',
	'publish',
	'uploadMedia',
	'deleteMedia',
	'useAi',
	'accessDynamicData',
];

function resolveEditorPermissions( adapter: BuilderEditorPermissionsOptions | undefined ): Record<BuilderHostPermissionKey, BuilderHostPermissionResult> {
	return Object.fromEntries( defaultPermissionKeys.map( ( permission ) => {
		const raw = typeof adapter === 'function' ? adapter( permission ) : adapter?.[ permission ];
		return [ permission, normalizePermissionValue( raw ) ];
	} ) ) as Record<BuilderHostPermissionKey, BuilderHostPermissionResult>;
}

function normalizePermissionValue( value: ReturnType<Extract<BuilderEditorPermissionsOptions, ( permission: BuilderHostPermissionKey ) => unknown>> | undefined ): BuilderHostPermissionResult {
	if ( value === undefined || value === true ) {
		return { allowed: true };
	}
	if ( value === false ) {
		return { allowed: false };
	}
	if ( typeof value === 'string' ) {
		return { allowed: false, reason: value };
	}
	return {
		allowed: value.allowed,
		reason: value.reason,
	};
}

function assertPermission( permissions: Readonly<Record<BuilderHostPermissionKey, BuilderHostPermissionResult>>, permission: BuilderHostPermissionKey ) {
	const result = permissions[ permission ];
	if ( result.allowed ) {
		return;
	}
	throw new Error( result.reason ?? `This host does not allow ${ permission }.` );
}

function resolvePersistenceAdapter( adapter: BuilderEditorPersistenceOptions | undefined ): BuilderPersistenceAdapter | undefined {
	if ( !adapter ) {
		return undefined;
	}
	const host = adapter.host;

	return {
		...adapter,
		loadProject: adapter.loadProject ?? ( host?.loadProject ? async () => {
			const project = await host.loadProject!( 'default' );
			return project ? { project } : null;
		} : undefined ),
		saveAutosave: adapter.saveAutosave ?? ( host?.saveAutosave ? async ( event ) => await host.saveAutosave?.( event.project, event as unknown as Record<string, JsonValue> ) as BuilderPersistenceResult | void : adapter.saveProject ? async ( event ) => { await adapter.saveProject?.( { ...event, reason: 'save' } ); } : undefined ),
		saveDraft: adapter.saveDraft ?? ( host?.saveDraft ? async ( event ) => await host.saveDraft?.( event.project, event as unknown as Record<string, JsonValue> ) as BuilderPersistenceResult | void : adapter.saveProject ? async ( event ) => { await adapter.saveProject?.( { ...event, reason: 'save' } ); } : undefined ),
		publish: adapter.publish ?? ( host?.publish ? async ( event ) => await host.publish?.( event.project, event as unknown as Record<string, JsonValue> ) as BuilderPersistenceResult | void : adapter.saveProject ? async ( event ) => { await adapter.saveProject?.( { ...event, reason: 'save' } ); } : undefined ),
		restoreRevision: adapter.restoreRevision ?? ( adapter.saveProject ? async ( event ) => { await adapter.saveProject?.( { ...event, reason: 'restore' } ); } : undefined ),
		listRevisions: adapter.listRevisions ?? ( host?.listRevisions ? async () => await host.listRevisions?.() as DocumentRevision[] : undefined ),
	};
}

async function callPersistenceAdapter( adapter: BuilderPersistenceAdapter, event: BuilderPersistenceEvent ): Promise<BuilderPersistenceResult | undefined> {
	let result: BuilderPersistenceResult | void | undefined;
	switch ( event.reason ) {
		case 'autosave':
			result = await adapter.saveAutosave?.( event );
			break;
		case 'draft':
			result = await adapter.saveDraft?.( event );
			break;
		case 'publish':
			result = await adapter.publish?.( event );
			break;
		case 'restore':
			result = await adapter.restoreRevision?.( event );
			break;
		default:
			if ( event.revisionKind === 'autosave' ) {
				result = await adapter.saveAutosave?.( event );
				break;
			}
			if ( event.revisionKind === 'published' ) {
				result = await adapter.publish?.( event );
				break;
			}
			result = await adapter.saveDraft?.( event );
	}

	return result === undefined ? undefined : result as BuilderPersistenceResult;
}

function getPersistingSaveState( event: BuilderPersistenceEvent ): BuilderSaveState {
	if ( event.reason === 'autosave' || event.revisionKind === 'autosave' ) {
		return 'autosaving';
	}

	if ( event.reason === 'publish' || event.revisionKind === 'published' ) {
		return 'publishing';
	}

	return 'saving';
}

async function loadProjectFromPersistence( adapter: BuilderPersistenceAdapter | undefined ): Promise<BuilderPersistenceLoadResult | undefined> {
	const loaded = await adapter?.loadProject?.();
	if ( !loaded ) {
		return undefined;
	}

	if ( 'project' in loaded ) {
		return loaded;
	}

	return { project: loaded };
}

function validateProjectForPersistence( project: BuilderPackage ): BuilderPackage {
	return BuilderPackageSchema.parse( project );
}

function readPersistenceVersionToken( project: BuilderPackage | undefined ): string | undefined {
	const persistenceMeta = project?.meta?.persistence;
	if ( !persistenceMeta || typeof persistenceMeta !== 'object' || Array.isArray( persistenceMeta ) ) {
		return undefined;
	}

	const versionToken = ( persistenceMeta as Record<string, unknown> ).versionToken;
	return typeof versionToken === 'string' ? versionToken : undefined;
}

function deriveEditorMode( kind: DocumentKind ): EditorMode {
	switch ( kind ) {
		case 'layout':
			return 'layout';
		case 'template':
			return 'template';
		case 'component':
			return 'component-master';
		case 'popup':
			return 'popup';
		default:
			return 'page';
	}
}

function inferShellPageForDocument( kind: DocumentKind ): BuilderShellPage {
	switch ( kind ) {
		case 'kit':
			return 'globals';
		case 'library-item':
			return 'menu';
		default:
			return 'editor';
	}
}
