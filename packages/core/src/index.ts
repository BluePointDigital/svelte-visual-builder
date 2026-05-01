import type {
	Binding,
	BuilderDocument,
	BuilderNode,
	BuilderPackage,
	ClassDefinition,
	DocumentRevision,
	EditorMode,
	HtmlAttribute,
	JsonValue,
	LegacyCompat,
	StyleSet,
	ThemeAssignment,
	VariableDefinition,
} from '@builder/schema';
import {
	BuilderDocumentSchema,
	BuilderPackageSchema,
	BuilderNodeSchema,
	DocumentRevisionSchema,
	createNode,
	createStyleSet,
} from '@builder/schema';

export type BuilderPanel = 'content' | 'style' | 'advanced' | 'design-system' | 'components' | 'library' | 'settings' | 'history';
export type BuilderSaveState = 'idle' | 'saved' | 'dirty' | 'autosaving' | 'saving' | 'publishing' | 'published' | 'error' | 'conflict';
export type BuilderShellPage = 'elements' | 'editor' | 'page-settings' | 'history' | 'globals' | 'menu';
export type BuilderNavigatorMode = 'floating' | 'docked';

export interface ClipboardSnapshot {
	nodes: BuilderNode[];
	copiedAt: string;
}

export interface BuilderRect {
	top: number;
	left: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

export interface NodeBounds {
	nodeId: string;
	documentId: string;
	nodeType: string;
	parentId?: string;
	slot?: string;
	index: number;
	rect: BuilderRect;
	acceptsChildren: boolean;
	slotIds: string[];
	editable: boolean;
}

export interface SlotBounds {
	documentId: string;
	ownerId?: string;
	slot?: string;
	rect: BuilderRect;
	childNodeIds: string[];
	acceptsMultiple: boolean;
	isRoot: boolean;
}

export interface CanvasGeometrySnapshot {
	renderVersion: number;
	version: number;
	nodeBounds: NodeBounds[];
	slotBounds: SlotBounds[];
}

export interface CanvasGeometryIndex {
	nodeBoundsById: Map<string, NodeBounds>;
	containersByDocument: Map<string, NodeBounds[]>;
	nonRootSlotsByDocument: Map<string, SlotBounds[]>;
	rootSlotsByDocument: Map<string, SlotBounds[]>;
	childBoundsByContainer: Map<string, NodeBounds[]>;
	childBoundsBySlot: Map<string, NodeBounds[]>;
}

export interface BuilderCanvasState {
	renderVersion: number;
	snapshotVersion: number;
	nodeBounds: NodeBounds[];
	slotBounds: SlotBounds[];
	index: CanvasGeometryIndex;
}

export interface BreadcrumbEntry {
	nodeId: string;
	label: string;
	type: string;
}

export interface DropTarget {
	documentId: string;
	parentId?: string;
	slot?: string;
	index: number;
	placement: 'before' | 'after' | 'into' | 'root';
	targetNodeId?: string;
	rect: BuilderRect;
	indicatorRect?: BuilderRect;
}

export interface DragSession {
	kind: 'move' | 'create';
	documentId: string;
	label: string;
	pointer: {
		x: number;
		y: number;
	};
	nodeId?: string;
	sourceParentId?: string;
	sourceSlot?: string;
	sourceIndex?: number;
	elementType?: string;
	templateNode?: BuilderNode;
}

export interface InlineEditSession {
	documentId: string;
	nodeId: string;
	field: 'text';
	richText: boolean;
}

export type BuilderInlineEditingMode = 'text' | 'html';

export function resolveBuilderInlineEditingMode(
	nodeType: string | undefined,
	supportsInlineEditing: boolean | undefined,
): BuilderInlineEditingMode | undefined {
	if ( !supportsInlineEditing || !nodeType ) {
		return undefined;
	}

	return nodeType === 'heading' ? 'text' : 'html';
}

export interface RevisionBrowserState {
	panelOpen: boolean;
	selectedRevisionId?: string;
}

export interface SiteEditorSessionState {
	activeEntryId?: string;
}

export interface BuilderPreviewSessionState {
	pathname: string;
	query: string;
	showPopups: boolean;
	slot?: ThemeAssignment['slot'];
	assignmentId?: string;
	documentId?: string;
	source?: 'manual' | 'assignment' | 'site-entry';
}

export interface ComponentEditingState {
	context?: 'master' | 'instance' | 'detached';
	componentDocumentId?: string;
	nodeId?: string;
}

export type BuilderContextMenuTargetKind = 'canvas-node' | 'navigator-node' | 'canvas-root';

export interface BuilderContextMenuAnchor {
	x: number;
	y: number;
}

export interface BuilderContextMenuState {
	open: boolean;
	anchor?: BuilderContextMenuAnchor;
	targetKind?: BuilderContextMenuTargetKind;
	documentId?: string;
	nodeId?: string;
	slot?: string;
}

export interface BuilderShellUiState {
	leftPanelPage: BuilderShellPage;
	panelCollapsed: boolean;
	navigatorMode: BuilderNavigatorMode;
	navigatorOpen: boolean;
	responsiveBarVisible: boolean;
	appBarMenuOpen: boolean;
}

export interface BuilderUiState {
	mode: EditorMode;
	panel: BuilderPanel;
	shell: BuilderShellUiState;
	selectedNodeIds: string[];
	hoveredNodeId?: string;
	focusedPath: string[];
	breadcrumbs: BreadcrumbEntry[];
	viewport: string;
	inlineEditingNodeId?: string;
	inlineEditing?: InlineEditSession;
	dragSession?: DragSession;
	dropTarget?: DropTarget;
	canvas: BuilderCanvasState;
	preview: BuilderPreviewSessionState;
	revisions: RevisionBrowserState;
	siteEditor: SiteEditorSessionState;
	componentEditing: ComponentEditingState;
	contextMenu: BuilderContextMenuState;
	managers: {
		classManagerOpen: boolean;
		variableManagerOpen: boolean;
		libraryManagerOpen: boolean;
		componentManagerOpen: boolean;
	};
	saveState: BuilderSaveState;
}

export interface DocumentSession {
	documentId: string;
	dirty: boolean;
	lastDraftAt?: string;
	lastAutosaveAt?: string;
	lastPublishedAt?: string;
	draftRevisionId?: string;
	autosaveRevisionId?: string;
	publishedRevisionId?: string;
	lastRevisionAt?: string;
	lastRevisionId?: string;
	lastRevisionKind?: DocumentRevision['kind'];
}

export interface HistoryEntry {
	id: string;
	label: string;
	operations: BuilderMutationCommand[];
	inverses: BuilderMutationCommand[];
	documentIds: string[];
	committedAt: string;
}

export interface HistoryState {
	past: HistoryEntry[];
	future: HistoryEntry[];
	activeTransaction?: {
		label: string;
		operations: BuilderMutationCommand[];
		inverses: BuilderMutationCommand[];
		documentIds: Set<string>;
	};
}

export interface BuilderEngineState {
	project: BuilderPackage;
	activeDocumentId: string;
	ui: BuilderUiState;
	history: HistoryState;
	clipboard?: ClipboardSnapshot;
	documentSessions: Record<string, DocumentSession>;
}

export interface BuilderNodeLocation {
	node: BuilderNode;
	parentId?: string;
	slot?: string;
	index: number;
	path: string[];
}

export type BuilderMutationCommand =
	| { type: 'project/import'; project: BuilderPackage; importedDocumentIds?: string[] }
	| { type: 'document/create'; document: BuilderDocument; index?: number }
	| { type: 'document/delete'; documentId: string }
	| { type: 'document/update'; documentId?: string; patch: Partial<Pick<BuilderDocument, 'title' | 'slug' | 'status' | 'meta'>> }
	| { type: 'document/elements/create'; documentId?: string; node: BuilderNode; parentId?: string; slot?: string; index?: number }
	| { type: 'document/elements/update'; documentId?: string; nodeId: string; patch?: Partial<BuilderNode>; propsPatch?: Record<string, JsonValue>; layoutPatch?: Record<string, JsonValue>; stylesPatch?: Partial<StyleSet>; styleRefs?: string[]; bindings?: Binding[]; attributes?: HtmlAttribute[]; legacy?: LegacyCompat | null }
	| { type: 'document/elements/delete'; documentId?: string; nodeId: string }
	| { type: 'document/elements/move'; documentId?: string; nodeId: string; targetParentId?: string; targetSlot?: string; index?: number }
	| { type: 'document/component/update-instance-overrides'; documentId?: string; nodeId: string; overrides: Record<string, JsonValue>; merge?: boolean }
	| { type: 'document/component/detach-instance'; documentId?: string; nodeId: string }
	| { type: 'document/component/relink-instance'; documentId?: string; nodeId: string; componentId?: string; preserveOverrides?: boolean }
	| { type: 'design/classes/upsert'; definition: ClassDefinition }
	| { type: 'design/classes/delete'; classId: string }
	| { type: 'design/variables/upsert'; definition: VariableDefinition }
	| { type: 'design/variables/delete'; variableId: string }
	| { type: 'project/assignment/upsert'; assignment: ThemeAssignment }
	| { type: 'project/assignment/delete'; assignmentId: string };

export type BuilderUiCommand =
	| { type: 'document/ui/select-document'; documentId: string }
	| { type: 'document/ui/select-node'; nodeId?: string; additive?: boolean }
	| { type: 'document/ui/hover-node'; nodeId?: string }
	| { type: 'document/ui/focus-breadcrumb'; nodeId?: string }
	| { type: 'document/ui/set-mode'; mode: EditorMode }
	| { type: 'document/ui/set-panel'; panel: BuilderPanel }
	| { type: 'document/ui/set-shell-page'; page: BuilderShellPage }
	| { type: 'document/ui/toggle-shell-panel'; collapsed?: boolean }
	| { type: 'document/ui/set-navigator-mode'; mode: BuilderNavigatorMode }
	| { type: 'document/ui/toggle-navigator'; open?: boolean }
	| { type: 'document/ui/toggle-responsive-bar'; open?: boolean }
	| { type: 'document/ui/toggle-app-bar-menu'; open?: boolean }
	| { type: 'document/ui/open-context-menu'; anchor: BuilderContextMenuAnchor; targetKind: BuilderContextMenuTargetKind; documentId?: string; nodeId?: string; slot?: string }
	| { type: 'document/ui/close-context-menu' }
	| { type: 'document/ui/set-save-state'; state: BuilderSaveState }
	| { type: 'document/ui/toggle-revision-browser'; open?: boolean }
	| { type: 'document/ui/select-revision'; revisionId?: string }
	| { type: 'document/ui/set-site-entry'; entryId?: string }
	| { type: 'document/ui/toggle-manager'; manager: keyof BuilderUiState['managers']; open?: boolean }
	| { type: 'document/ui/set-viewport'; viewport: string }
	| { type: 'document/ui/set-preview-path'; pathname: string }
	| { type: 'document/ui/set-preview-query'; query: string }
	| { type: 'document/ui/set-preview-context'; context: Partial<BuilderPreviewSessionState> }
	| { type: 'document/ui/toggle-preview-popups'; open?: boolean }
	| { type: 'document/ui/start-inline-edit'; nodeId: string; richText?: boolean }
	| { type: 'document/ui/stop-inline-edit' }
	| { type: 'document/ui/start-drag'; session: DragSession }
	| { type: 'document/ui/update-drag'; x: number; y: number }
	| { type: 'document/ui/set-drop-target'; target?: DropTarget }
	| { type: 'document/ui/commit-drag' }
	| { type: 'document/ui/cancel-drag' }
	| { type: 'document/ui/set-canvas-measurements'; snapshot: CanvasGeometrySnapshot }
	| { type: 'document/history/undo' }
	| { type: 'document/history/redo' }
	| { type: 'clipboard/copy'; nodeIds?: string[] }
	| { type: 'clipboard/paste'; documentId?: string; targetParentId?: string; targetSlot?: string; index?: number }
	| { type: 'clipboard/paste-style'; documentId?: string; nodeIds?: string[] }
	| { type: 'document/elements/duplicate'; documentId?: string; nodeId: string; targetParentId?: string; targetSlot?: string; index?: number }
	| { type: 'document/save/draft'; documentId?: string; label?: string }
	| { type: 'document/save/autosave'; documentId?: string; label?: string }
	| { type: 'document/save/publish'; documentId?: string; label?: string }
	| { type: 'document/save/restore-revision'; documentId?: string; revisionId: string };

export type BuilderCommand = BuilderMutationCommand | BuilderUiCommand;

type Listener = ( state: BuilderEngineState ) => void;

export class BuilderEngine {
	#listeners = new Set<Listener>();
	#state: BuilderEngineState;

	constructor( initialProject: BuilderPackage, activeDocumentId = initialProject.documents[ 0 ]?.id ) {
		const project = recalculateProjectDerivedState( BuilderPackageSchema.parse( initialProject ) );
		const initialDocumentId = activeDocumentId ?? project.documents[ 0 ]?.id;

		if ( !initialDocumentId ) {
			throw new Error( 'BuilderEngine requires at least one document.' );
		}

		this.#state = {
			project,
			activeDocumentId: initialDocumentId,
			ui: {
				mode: 'page',
				panel: 'content',
				shell: {
					leftPanelPage: 'elements',
					panelCollapsed: false,
					navigatorMode: 'docked',
					navigatorOpen: true,
					responsiveBarVisible: false,
					appBarMenuOpen: false,
				},
				selectedNodeIds: [],
				focusedPath: [],
				breadcrumbs: [],
				viewport: 'desktop',
				canvas: createCanvasGeometryState(),
					preview: {
						pathname: '/',
						query: '',
						showPopups: false,
					},
				revisions: {
					panelOpen: false,
				},
				siteEditor: {},
				componentEditing: {},
				contextMenu: {
					open: false,
				},
				managers: {
					classManagerOpen: false,
					variableManagerOpen: false,
					libraryManagerOpen: false,
					componentManagerOpen: false,
				},
				saveState: 'saved',
			},
			history: {
				past: [],
				future: [],
			},
			documentSessions: createDocumentSessions( project ),
		};
	}

	subscribe( listener: Listener ): () => void {
		this.#listeners.add( listener );
		listener( this.#state );
		return () => this.#listeners.delete( listener );
	}

	getState(): BuilderEngineState {
		return this.#state;
	}

	beginTransaction( label: string ): void {
		if ( this.#state.history.activeTransaction ) {
			throw new Error( 'Nested transactions are not supported.' );
		}

		this.#state = {
			...this.#state,
			history: {
				...this.#state.history,
				activeTransaction: {
					label,
					operations: [],
					inverses: [],
					documentIds: new Set(),
				},
			},
		};
		this.#emit();
	}

	commitTransaction(): void {
		const transaction = this.#state.history.activeTransaction;
		if ( !transaction ) {
			return;
		}

		const nextPast = [ ...this.#state.history.past ];
		if ( transaction.operations.length ) {
			nextPast.push( {
				id: crypto.randomUUID(),
				label: transaction.label,
				operations: structuredClone( transaction.operations ),
				inverses: structuredClone( transaction.inverses ),
				documentIds: [ ...transaction.documentIds ],
				committedAt: new Date().toISOString(),
			} );
		}

		this.#state = {
			...this.#state,
			history: {
				past: nextPast,
				future: [],
				activeTransaction: undefined,
			},
		};
		this.#emit();
	}

	dispatch( command: BuilderCommand ): void {
		if ( command.type === 'document/history/undo' ) {
			this.undo();
			return;
		}

		if ( command.type === 'document/history/redo' ) {
			this.redo();
			return;
		}

		if ( command.type === 'clipboard/copy' ) {
			this.#copyToClipboard( command.nodeIds );
			return;
		}

		if ( command.type === 'clipboard/paste' ) {
			this.#pasteClipboard( command );
			return;
		}

		if ( command.type === 'clipboard/paste-style' ) {
			this.#pasteClipboardStyle( command );
			return;
		}

		if ( command.type === 'document/elements/duplicate' ) {
			this.#duplicateNode( command );
			return;
		}

		if ( command.type === 'document/save/draft' || command.type === 'document/save/autosave' || command.type === 'document/save/publish' ) {
			this.#persistRevision( command );
			return;
		}

		if ( command.type === 'document/save/restore-revision' ) {
			this.#restoreRevision( command );
			return;
		}

		if ( command.type === 'document/ui/commit-drag' ) {
			this.#commitDrag();
			return;
		}

		if ( isUiCommand( command ) ) {
			this.#state = applyUiCommand( this.#state, command );
			this.#emit();
			return;
		}

		const result = applyMutation( this.#state, command );
		this.#state = result.state;

		if ( result.historyOperation ) {
			const transaction = this.#state.history.activeTransaction;
			if ( transaction ) {
				transaction.operations.push( result.historyOperation.operation );
				transaction.inverses.push( result.historyOperation.inverse );
				for ( const documentId of result.historyOperation.documentIds ) {
					transaction.documentIds.add( documentId );
				}
			} else {
				this.#state = {
					...this.#state,
					history: {
						...this.#state.history,
						past: [
							...this.#state.history.past,
							{
								id: crypto.randomUUID(),
								label: getCommandLabel( result.historyOperation.operation ),
								operations: [ result.historyOperation.operation ],
								inverses: [ result.historyOperation.inverse ],
								documentIds: result.historyOperation.documentIds,
								committedAt: new Date().toISOString(),
							},
						],
						future: [],
					},
				};
			}
		}

		this.#emit();
	}

	#commitDrag(): void {
		const session = this.#state.ui.dragSession;
		const target = this.#state.ui.dropTarget;
		if ( !session || !target ) {
			this.#state = applyUiCommand( this.#state, { type: 'document/ui/cancel-drag' } );
			this.#emit();
			return;
		}

		if ( session.kind === 'move' && session.nodeId ) {
			let index = target.index;
			if (
				session.documentId === target.documentId
				&& session.sourceParentId === target.parentId
				&& session.sourceSlot === target.slot
				&& session.sourceIndex !== undefined
				&& session.sourceIndex < index
			) {
				index -= 1;
			}

			this.dispatch( {
				type: 'document/elements/move',
				documentId: target.documentId,
				nodeId: session.nodeId,
				targetParentId: target.parentId,
				targetSlot: target.slot,
				index: Math.max( 0, index ),
			} );
		}

		if ( session.kind === 'create' && session.templateNode ) {
			const resolvedCreateTarget = resolveCreateDropTarget( target );
			this.dispatch( {
				type: 'document/elements/create',
				documentId: target.documentId,
				parentId: resolvedCreateTarget.parentId,
				slot: resolvedCreateTarget.slot,
				index: Math.max( 0, resolvedCreateTarget.index ),
				node: regenerateTreeIds( session.templateNode ),
			} );
		}

		this.#state = applyUiCommand( this.#state, { type: 'document/ui/cancel-drag' } );
		this.#emit();
	}

	undo(): void {
		const entry = this.#state.history.past.at( -1 );
		if ( !entry ) {
			return;
		}

		let nextState = {
			...this.#state,
			history: {
				...this.#state.history,
				past: this.#state.history.past.slice( 0, -1 ),
				future: [ entry, ...this.#state.history.future ],
			},
		};

		for ( const inverse of [ ...entry.inverses ].reverse() ) {
			nextState = applyMutation( nextState, inverse, { historyless: true } ).state;
		}

		this.#state = nextState;
		this.#emit();
	}

	redo(): void {
		const entry = this.#state.history.future[ 0 ];
		if ( !entry ) {
			return;
		}

		let nextState = {
			...this.#state,
			history: {
				...this.#state.history,
				past: [ ...this.#state.history.past, entry ],
				future: this.#state.history.future.slice( 1 ),
			},
		};

		for ( const operation of entry.operations ) {
			nextState = applyMutation( nextState, operation, { historyless: true } ).state;
		}

		this.#state = nextState;
		this.#emit();
	}

	#copyToClipboard( nodeIds?: string[] ): void {
		const document = getActiveDocument( this.#state );
		const ids = nodeIds?.length ? nodeIds : this.#state.ui.selectedNodeIds;
		const nodes = ids
			.map( ( nodeId ) => getNodeById( document.root, nodeId ) )
			.filter( Boolean ) as BuilderNode[];

		if ( !nodes.length ) {
			return;
		}

		this.#state = {
			...this.#state,
			clipboard: {
				nodes: nodes.map( ( node ) => structuredClone( node ) ),
				copiedAt: new Date().toISOString(),
			},
		};
		this.#emit();
	}

	#pasteClipboard( command: Extract<BuilderUiCommand, { type: 'clipboard/paste' }> ): void {
		if ( !this.#state.clipboard?.nodes.length ) {
			return;
		}

		this.beginTransaction( 'Paste nodes' );
		for ( const [ offset, node ] of this.#state.clipboard.nodes.entries() ) {
			this.dispatch( {
				type: 'document/elements/create',
				documentId: command.documentId,
				parentId: command.targetParentId,
				slot: command.targetSlot,
				index: command.index === undefined ? undefined : command.index + offset,
				node: regenerateTreeIds( node ),
			} );
		}
		this.commitTransaction();
	}

	#pasteClipboardStyle( command: Extract<BuilderUiCommand, { type: 'clipboard/paste-style' }> ): void {
		const sourceNode = this.#state.clipboard?.nodes[ 0 ];
		if ( !sourceNode ) {
			return;
		}

		const documentId = command.documentId ?? this.#state.activeDocumentId;
		const document = getDocumentById( this.#state.project, documentId );
		const nodeIds = command.nodeIds?.length ? command.nodeIds : this.#state.ui.selectedNodeIds;
		const targetNodeIds = nodeIds.filter( ( nodeId ) => Boolean( getNodeById( document.root, nodeId ) ) );
		if ( !targetNodeIds.length ) {
			return;
		}

		this.beginTransaction( 'Paste style' );
		for ( const nodeId of targetNodeIds ) {
			this.dispatch( {
				type: 'document/elements/update',
				documentId,
				nodeId,
				patch: {
					layout: structuredClone( sourceNode.layout ),
					styles: structuredClone( sourceNode.styles ),
				},
				styleRefs: [ ...sourceNode.styleRefs ],
			} );
		}
		this.commitTransaction();
	}

	#duplicateNode( command: Extract<BuilderUiCommand, { type: 'document/elements/duplicate' }> ): void {
		const documentId = command.documentId ?? this.#state.activeDocumentId;
		const document = getDocumentById( this.#state.project, documentId );
		const node = getNodeById( document.root, command.nodeId );
		if ( !node ) {
			return;
		}

		this.dispatch( {
			type: 'document/elements/create',
			documentId,
			parentId: command.targetParentId,
			slot: command.targetSlot,
			index: command.index,
			node: regenerateTreeIds( node ),
		} );
	}

	#persistRevision( command: Extract<BuilderUiCommand, { type: 'document/save/draft' | 'document/save/autosave' | 'document/save/publish' }> ): void {
		const documentId = command.documentId ?? this.#state.activeDocumentId;
		const document = getDocumentById( this.#state.project, documentId );
		const revisionKind = command.type === 'document/save/publish'
			? 'published'
			: command.type === 'document/save/draft'
				? 'draft'
				: 'autosave';
		const nextDocument = BuilderDocumentSchema.parse( {
			...document,
			status: revisionKind === 'published' ? 'published' : document.status,
			updatedAt: new Date().toISOString(),
		} );
		const revision = DocumentRevisionSchema.parse( {
			documentId,
			kind: revisionKind,
			label: command.label ?? (
				revisionKind === 'published'
					? `Published ${ document.title }`
					: revisionKind === 'draft'
						? `Saved draft ${ document.title }`
						: `Autosaved ${ document.title }`
			),
			meta: {
				documentSnapshot: toJsonSnapshot( nextDocument ),
				source: 'builder-engine',
			},
		} );

		const session = this.#state.documentSessions[ documentId ] ?? createDocumentSession( documentId );
		this.#state = {
			...this.#state,
			project: {
				...this.#state.project,
				revisions: [ ...this.#state.project.revisions, revision ],
				documents: this.#state.project.documents.map( ( entry ) => entry.id === documentId
					? nextDocument
					: entry ),
			},
			documentSessions: {
				...this.#state.documentSessions,
				[ documentId ]: {
					...session,
					dirty: false,
					lastDraftAt: revisionKind === 'draft' ? revision.createdAt : session.lastDraftAt,
					lastAutosaveAt: revisionKind === 'autosave' ? revision.createdAt : session.lastAutosaveAt,
					lastPublishedAt: revisionKind === 'published' ? revision.createdAt : session.lastPublishedAt,
					draftRevisionId: revisionKind === 'draft' ? revision.id : session.draftRevisionId,
					autosaveRevisionId: revisionKind === 'autosave' ? revision.id : session.autosaveRevisionId,
					publishedRevisionId: revisionKind === 'published' ? revision.id : session.publishedRevisionId,
					lastRevisionAt: revision.createdAt,
					lastRevisionId: revision.id,
					lastRevisionKind: revisionKind,
				},
			},
			ui: {
				...this.#state.ui,
				revisions: {
					...this.#state.ui.revisions,
					selectedRevisionId: revision.id,
				},
				saveState: revisionKind === 'published' ? 'published' : 'saved',
			},
		};
		this.#emit();
	}

	#restoreRevision( command: Extract<BuilderUiCommand, { type: 'document/save/restore-revision' }> ): void {
		const documentId = command.documentId ?? this.#state.activeDocumentId;
		const revision = this.#state.project.revisions.find( ( entry ) => entry.id === command.revisionId && entry.documentId === documentId );
		const snapshot = revision ? getDocumentSnapshotFromRevision( revision ) : undefined;
		if ( !revision || !snapshot ) {
			return;
		}

		const restoredDocument = BuilderDocumentSchema.parse( {
			...snapshot,
			updatedAt: new Date().toISOString(),
		} );
		const nextProject = recalculateProjectDerivedState( {
			...this.#state.project,
			documents: this.#state.project.documents.map( ( entry ) => entry.id === documentId ? restoredDocument : entry ),
		} );
		const session = this.#state.documentSessions[ documentId ] ?? createDocumentSession( documentId, nextProject.revisions.filter( ( entry ) => entry.documentId === documentId ) );
		this.#state = {
			...this.#state,
			project: nextProject,
			activeDocumentId: documentId,
			documentSessions: {
				...this.#state.documentSessions,
				[ documentId ]: {
					...session,
					dirty: false,
					lastRevisionAt: revision.createdAt,
					lastRevisionId: revision.id,
					lastRevisionKind: revision.kind,
				},
			},
			ui: {
				...this.#state.ui,
				selectedNodeIds: [],
				hoveredNodeId: undefined,
				focusedPath: [],
				breadcrumbs: [],
				componentEditing: {},
				revisions: {
					...this.#state.ui.revisions,
					selectedRevisionId: revision.id,
				},
				saveState: revision.kind === 'published' ? 'published' : 'saved',
			},
		};
		this.#emit();
	}

	#emit(): void {
		for ( const listener of this.#listeners ) {
			listener( this.#state );
		}
	}
}

export function createBuilderEngine( project: BuilderPackage, activeDocumentId?: string ): BuilderEngine {
	return new BuilderEngine( project, activeDocumentId );
}

export function getActiveDocument( state: BuilderEngineState ): BuilderDocument {
	return getDocumentById( state.project, state.activeDocumentId );
}

function resolveCreateDropTarget( target: DropTarget ): Pick<DropTarget, 'parentId' | 'slot' | 'index'> {
	return {
		parentId: target.parentId,
		slot: target.slot,
		index: target.index,
	};
}

export function getDocumentRevisions( project: BuilderPackage, documentId: string ): DocumentRevision[] {
	return project.revisions
		.filter( ( revision ) => revision.documentId === documentId )
		.sort( ( left, right ) => right.createdAt.localeCompare( left.createdAt ) );
}

export function getDocumentById( project: BuilderPackage, documentId: string ): BuilderDocument {
	const document = project.documents.find( ( entry ) => entry.id === documentId );
	if ( !document ) {
		throw new Error( `Document "${ documentId }" not found.` );
	}

	return document;
}

export function getNodeById( nodes: BuilderNode[], nodeId: string ): BuilderNode | undefined {
	return getNodeLocation( nodes, nodeId )?.node;
}

export function flattenNodeTree( nodes: BuilderNode[] ): BuilderNode[] {
	const output: BuilderNode[] = [];
	for ( const node of nodes ) {
		output.push( node );
		output.push( ...flattenNodeTree( node.children ) );
		for ( const slotNodes of Object.values( node.slots as Record<string, BuilderNode[]> ) ) {
			output.push( ...flattenNodeTree( slotNodes ) );
		}
	}

	return output;
}

export function getSelectedNodes( state: BuilderEngineState ): BuilderNode[] {
	return state.ui.selectedNodeIds
		.map( ( nodeId ) => getNodeById( getActiveDocument( state ).root, nodeId ) )
		.filter( Boolean ) as BuilderNode[];
}

function isUiCommand( command: BuilderCommand ): command is Exclude<BuilderUiCommand, { type: 'document/history/undo' | 'document/history/redo' | 'clipboard/copy' | 'clipboard/paste' | 'clipboard/paste-style' | 'document/elements/duplicate' | 'document/save/draft' | 'document/save/autosave' | 'document/save/publish' | 'document/save/restore-revision' }> {
	return command.type.startsWith( 'document/ui/' );
}

function applyUiCommand( state: BuilderEngineState, command: Exclude<BuilderUiCommand, { type: 'document/history/undo' | 'document/history/redo' | 'clipboard/copy' | 'clipboard/paste' | 'clipboard/paste-style' | 'document/elements/duplicate' | 'document/save/draft' | 'document/save/autosave' | 'document/save/publish' | 'document/save/restore-revision' | 'document/ui/commit-drag' }> ): BuilderEngineState {
	switch ( command.type ) {
		case 'document/ui/select-document':
			return withDerivedUiState( {
				...state,
				activeDocumentId: command.documentId,
				ui: {
					...state.ui,
					selectedNodeIds: [],
					hoveredNodeId: undefined,
					focusedPath: [],
					breadcrumbs: [],
					dragSession: undefined,
					dropTarget: undefined,
					contextMenu: {
						open: false,
					},
					revisions: {
						...state.ui.revisions,
						selectedRevisionId: getLatestRevisionForDocument( state.project, command.documentId )?.id,
					},
				},
			} );
		case 'document/ui/select-node': {
			const nextSelected = command.nodeId
				? command.additive
					? [ ...new Set( [ ...state.ui.selectedNodeIds, command.nodeId ] ) ]
					: [ command.nodeId ]
				: [];
			const nextPath = command.nodeId ? ( getNodeLocation( getActiveDocument( state ).root, command.nodeId )?.path ?? [] ) : [];
			const selectionSurface = resolveSelectionEditorSurface( state.ui.shell.leftPanelPage, state.ui.panel );
			return withDerivedUiState( {
				...state,
				ui: {
					...state.ui,
					panel: selectionSurface.panel,
					selectedNodeIds: nextSelected,
					focusedPath: nextPath,
					breadcrumbs: getBreadcrumbEntries( getActiveDocument( state ).root, nextPath ),
					shell: {
						...state.ui.shell,
						leftPanelPage: selectionSurface.page,
					},
					contextMenu: {
						open: false,
					},
				},
			} );
		}
		case 'document/ui/hover-node':
			return {
				...state,
				ui: {
					...state.ui,
					hoveredNodeId: command.nodeId,
				},
			};
		case 'document/ui/focus-breadcrumb': {
			const nextPath = command.nodeId ? ( getNodeLocation( getActiveDocument( state ).root, command.nodeId )?.path ?? [] ) : [];
			const selectionSurface = resolveSelectionEditorSurface( state.ui.shell.leftPanelPage, state.ui.panel );
			return withDerivedUiState( {
				...state,
				ui: {
					...state.ui,
					panel: selectionSurface.panel,
					selectedNodeIds: command.nodeId ? [ command.nodeId ] : [],
					focusedPath: nextPath,
					breadcrumbs: getBreadcrumbEntries( getActiveDocument( state ).root, nextPath ),
					shell: {
						...state.ui.shell,
						leftPanelPage: selectionSurface.page,
					},
					contextMenu: {
						open: false,
					},
				},
			} );
		}
		case 'document/ui/set-mode':
			return withDerivedUiState( {
				...state,
				ui: {
					...state.ui,
					mode: command.mode,
				},
			} );
		case 'document/ui/set-panel':
			return {
				...state,
				ui: {
					...state.ui,
					panel: command.panel,
					shell: {
						...state.ui.shell,
						leftPanelPage: resolveShellPageForPanel( command.panel, state.ui.shell.leftPanelPage ),
					},
					contextMenu: {
						open: false,
					},
				},
			};
		case 'document/ui/set-shell-page':
			return {
				...state,
				ui: {
					...state.ui,
					panel: command.page === 'globals'
						? resolveGlobalsPanelFromManagers( state.ui.managers, state.ui.panel )
						: resolvePanelForShellPage( command.page, state.ui.panel ),
					shell: {
						...state.ui.shell,
						leftPanelPage: command.page,
						panelCollapsed: false,
					},
					contextMenu: {
						open: false,
					},
				},
			};
		case 'document/ui/toggle-shell-panel':
			return {
				...state,
				ui: {
					...state.ui,
					shell: {
						...state.ui.shell,
						panelCollapsed: command.collapsed ?? !state.ui.shell.panelCollapsed,
					},
				},
			};
		case 'document/ui/set-navigator-mode':
			return {
				...state,
				ui: {
					...state.ui,
					shell: {
						...state.ui.shell,
						navigatorMode: command.mode,
						navigatorOpen: true,
					},
				},
			};
		case 'document/ui/toggle-navigator':
			return {
				...state,
				ui: {
					...state.ui,
					shell: {
						...state.ui.shell,
						navigatorOpen: command.open ?? !state.ui.shell.navigatorOpen,
					},
				},
			};
		case 'document/ui/toggle-responsive-bar':
			return {
				...state,
				ui: {
					...state.ui,
					shell: {
						...state.ui.shell,
						responsiveBarVisible: command.open ?? !state.ui.shell.responsiveBarVisible,
					},
				},
			};
		case 'document/ui/toggle-app-bar-menu':
			return {
				...state,
				ui: {
					...state.ui,
					shell: {
						...state.ui.shell,
						appBarMenuOpen: command.open ?? !state.ui.shell.appBarMenuOpen,
					},
				},
			};
		case 'document/ui/open-context-menu':
			return {
				...state,
				ui: {
					...state.ui,
					contextMenu: {
						open: true,
						anchor: command.anchor,
						targetKind: command.targetKind,
						documentId: command.documentId,
						nodeId: command.nodeId,
						slot: command.slot,
					},
				},
			};
		case 'document/ui/close-context-menu':
			return {
				...state,
				ui: {
					...state.ui,
					contextMenu: {
						open: false,
					},
				},
			};
		case 'document/ui/set-save-state':
			return {
				...state,
				ui: {
					...state.ui,
					saveState: command.state,
				},
			};
		case 'document/ui/toggle-revision-browser':
			return {
				...state,
				ui: {
					...state.ui,
					revisions: {
						panelOpen: command.open ?? !state.ui.revisions.panelOpen,
						selectedRevisionId: state.ui.revisions.selectedRevisionId ?? getLatestRevisionForDocument( state.project, state.activeDocumentId )?.id,
					},
				},
			};
		case 'document/ui/select-revision':
			return {
				...state,
				ui: {
					...state.ui,
					revisions: {
						...state.ui.revisions,
						selectedRevisionId: command.revisionId,
					},
				},
			};
		case 'document/ui/set-site-entry':
			return {
				...state,
				ui: {
					...state.ui,
					siteEditor: {
						activeEntryId: command.entryId,
					},
				},
			};
		case 'document/ui/toggle-manager':
			return {
				...state,
				ui: {
					...state.ui,
					managers: {
						...state.ui.managers,
						[ command.manager ]: command.open ?? !state.ui.managers[ command.manager ],
					},
				},
			};
		case 'document/ui/set-viewport':
			return {
				...state,
				ui: {
					...state.ui,
					viewport: command.viewport,
					shell: {
						...state.ui.shell,
						responsiveBarVisible: command.viewport !== 'desktop',
					},
				},
			};
		case 'document/ui/set-preview-path':
			return {
				...state,
				ui: {
					...state.ui,
					preview: {
						...state.ui.preview,
						pathname: command.pathname,
					},
				},
			};
		case 'document/ui/set-preview-query':
			return {
				...state,
				ui: {
					...state.ui,
					preview: {
						...state.ui.preview,
						query: command.query,
					},
				},
			};
		case 'document/ui/set-preview-context':
			return {
				...state,
				ui: {
					...state.ui,
					preview: {
						...state.ui.preview,
						...command.context,
					},
				},
			};
		case 'document/ui/toggle-preview-popups':
			return {
				...state,
				ui: {
					...state.ui,
					preview: {
						...state.ui.preview,
						showPopups: command.open ?? !state.ui.preview.showPopups,
					},
				},
			};
		case 'document/ui/start-inline-edit':
			return {
				...state,
				ui: {
					...state.ui,
					inlineEditingNodeId: command.nodeId,
					inlineEditing: {
						documentId: state.activeDocumentId,
						nodeId: command.nodeId,
						field: 'text',
						richText: command.richText ?? false,
					},
					contextMenu: {
						open: false,
					},
				},
			};
		case 'document/ui/stop-inline-edit':
			return {
				...state,
				ui: {
					...state.ui,
					inlineEditingNodeId: undefined,
					inlineEditing: undefined,
				},
			};
		case 'document/ui/start-drag':
			return {
				...state,
				ui: {
					...state.ui,
					dragSession: command.session,
					dropTarget: undefined,
					contextMenu: {
						open: false,
					},
				},
			};
		case 'document/ui/update-drag':
			return {
				...state,
				ui: {
					...state.ui,
					dragSession: state.ui.dragSession ? {
						...state.ui.dragSession,
						pointer: {
							x: command.x,
							y: command.y,
						},
					} : undefined,
				},
			};
		case 'document/ui/set-drop-target':
			return {
				...state,
				ui: {
					...state.ui,
					dropTarget: command.target,
				},
			};
		case 'document/ui/cancel-drag':
			return {
				...state,
				ui: {
					...state.ui,
					dragSession: undefined,
					dropTarget: undefined,
				},
			};
		case 'document/ui/set-canvas-measurements':
			return {
				...state,
				ui: {
					...state.ui,
					canvas: createCanvasGeometryState( command.snapshot ),
				},
			};
	}
}

export function createCanvasGeometryState( snapshot?: CanvasGeometrySnapshot ): BuilderCanvasState {
	return {
		renderVersion: snapshot?.renderVersion ?? 0,
		snapshotVersion: snapshot?.version ?? 0,
		nodeBounds: snapshot?.nodeBounds ?? [],
		slotBounds: snapshot?.slotBounds ?? [],
		index: buildCanvasGeometryIndex( snapshot?.nodeBounds ?? [], snapshot?.slotBounds ?? [] ),
	};
}

export function buildCanvasGeometryIndex(
	nodeBounds: NodeBounds[] = [],
	slotBounds: SlotBounds[] = [],
): CanvasGeometryIndex {
	const nodeBoundsById = new Map<string, NodeBounds>();
	const containersByDocument = new Map<string, NodeBounds[]>();
	const nonRootSlotsByDocument = new Map<string, SlotBounds[]>();
	const rootSlotsByDocument = new Map<string, SlotBounds[]>();
	const childBoundsByContainer = new Map<string, NodeBounds[]>();
	const childBoundsBySlot = new Map<string, NodeBounds[]>();

	for ( const entry of nodeBounds ) {
		if ( entry.nodeId ) {
			nodeBoundsById.set( entry.nodeId, entry );
		}

		if ( entry.acceptsChildren ) {
			pushCanvasGeometryEntry( containersByDocument, entry.documentId, entry );
		}

		if ( entry.parentId && !entry.slot ) {
			pushCanvasGeometryEntry(
				childBoundsByContainer,
				getCanvasGeometryKey( entry.documentId, entry.parentId, undefined ),
				entry,
			);
		}
	}

	for ( const entry of slotBounds ) {
		pushCanvasGeometryEntry(
			entry.isRoot ? rootSlotsByDocument : nonRootSlotsByDocument,
			entry.documentId,
			entry,
		);

		const key = getCanvasGeometryKey( entry.documentId, entry.ownerId, entry.slot );
		const children = entry.childNodeIds
			.map( ( nodeId ) => nodeBoundsById.get( nodeId ) )
			.filter( Boolean ) as NodeBounds[];
		children.sort( sortNodeBoundsByIndex );
		childBoundsBySlot.set( key, children );
	}

	for ( const entries of containersByDocument.values() ) {
		entries.sort( sortRectsByArea );
	}

	for ( const entries of nonRootSlotsByDocument.values() ) {
		entries.sort( sortRectsByArea );
	}

	for ( const entries of rootSlotsByDocument.values() ) {
		entries.sort( sortRectsByArea );
	}

	for ( const entries of childBoundsByContainer.values() ) {
		entries.sort( sortNodeBoundsByIndex );
	}

	return {
		nodeBoundsById,
		containersByDocument,
		nonRootSlotsByDocument,
		rootSlotsByDocument,
		childBoundsByContainer,
		childBoundsBySlot,
	};
}

export function getCanvasGeometryKey(
	documentId: string,
	parentId?: string,
	slot?: string,
): string {
	return `${ documentId }::${ parentId ?? '' }::${ slot ?? '' }`;
}

function pushCanvasGeometryEntry<T>( bucket: Map<string, T[]>, key: string, entry: T ) {
	const entries = bucket.get( key );
	if ( entries ) {
		entries.push( entry );
		return;
	}

	bucket.set( key, [ entry ] );
}

function sortNodeBoundsByIndex( left: NodeBounds, right: NodeBounds ) {
	return left.index - right.index;
}

function sortRectsByArea( left: { rect: BuilderRect }, right: { rect: BuilderRect } ) {
	return ( left.rect.width * left.rect.height ) - ( right.rect.width * right.rect.height );
}

function applyMutation(
	state: BuilderEngineState,
	command: BuilderMutationCommand,
	options: { historyless?: boolean } = {},
): {
	state: BuilderEngineState;
	historyOperation?: {
		operation: BuilderMutationCommand;
		inverse: BuilderMutationCommand;
		documentIds: string[];
	};
} {
	switch ( command.type ) {
		case 'project/import': {
			const nextProject = recalculateProjectDerivedState( BuilderPackageSchema.parse( command.project ) );
			const nextSessions = createDocumentSessions( nextProject );
			for ( const [ documentId, session ] of Object.entries( state.documentSessions ) ) {
				if ( nextSessions[ documentId ] ) {
					nextSessions[ documentId ] = session;
				}
			}
			for ( const documentId of command.importedDocumentIds ?? [] ) {
				nextSessions[ documentId ] = {
					...( nextSessions[ documentId ] ?? createDocumentSession( documentId ) ),
					dirty: true,
				};
			}
			const activeDocumentId = nextProject.documents.some( ( document ) => document.id === state.activeDocumentId )
				? state.activeDocumentId
				: nextProject.documents[ 0 ]?.id ?? state.activeDocumentId;
			return {
				state: {
					...state,
					project: nextProject,
					activeDocumentId,
					documentSessions: nextSessions,
					ui: {
						...state.ui,
						saveState: 'dirty' as const,
					},
				},
			};
		}
		case 'document/create': {
			const nextDocuments = [ ...state.project.documents ];
			insertAt( nextDocuments, BuilderDocumentSchema.parse( command.document ), command.index );
			const nextProject = recalculateProjectDerivedState( {
				...state.project,
				documents: nextDocuments,
			} );
			const nextState = {
				...state,
				project: nextProject,
				documentSessions: {
					...state.documentSessions,
					[ command.document.id ]: createDocumentSession( command.document.id ),
				},
			};
			return {
				state: nextState,
				historyOperation: options.historyless ? undefined : {
					operation: command,
					inverse: {
						type: 'document/delete',
						documentId: command.document.id,
					},
					documentIds: [ command.document.id ],
				},
			};
		}
		case 'document/delete': {
			const index = state.project.documents.findIndex( ( document ) => document.id === command.documentId );
			const deleted = state.project.documents[ index ];
			if ( index === -1 || !deleted ) {
				return { state };
			}

			return {
				state: {
					...state,
					project: recalculateProjectDerivedState( {
						...state.project,
						documents: state.project.documents.filter( ( document ) => document.id !== command.documentId ),
					} ),
				},
				historyOperation: options.historyless ? undefined : {
					operation: command,
					inverse: {
						type: 'document/create',
						document: deleted,
						index,
					},
					documentIds: [ command.documentId ],
				},
			};
		}
		case 'document/update': {
			const documentId = command.documentId ?? state.activeDocumentId;
			const document = getDocumentById( state.project, documentId );
			const previousPatch = Object.fromEntries(
				Object.keys( command.patch ).map( ( key ) => [ key, ( document as Record<string, unknown> )[ key ] ] ),
			) as Partial<Pick<BuilderDocument, 'title' | 'slug' | 'status' | 'meta'>>;
			return {
				state: {
					...state,
					project: {
						...state.project,
						documents: state.project.documents.map( ( entry ) => entry.id === documentId
							? BuilderDocumentSchema.parse( {
								...entry,
								...command.patch,
								updatedAt: new Date().toISOString(),
							} )
							: entry ),
					},
					documentSessions: markDirty( state.documentSessions, documentId ),
					ui: {
						...state.ui,
						saveState: 'dirty' as const,
					},
				},
				historyOperation: options.historyless ? undefined : {
					operation: {
						...command,
						documentId,
					},
					inverse: {
						type: 'document/update',
						documentId,
						patch: previousPatch,
					},
					documentIds: [ documentId ],
				},
			};
		}
		case 'document/elements/create':
			return applyCreateNodeMutation( state, command, options.historyless );
		case 'document/elements/update':
			return applyUpdateNodeMutation( state, command, options.historyless );
		case 'document/elements/delete':
			return applyDeleteNodeMutation( state, command, options.historyless );
		case 'document/elements/move':
			return applyMoveNodeMutation( state, command, options.historyless );
		case 'document/component/update-instance-overrides':
			return applyComponentInstanceOverrideMutation( state, command, options.historyless );
		case 'document/component/detach-instance':
			return applyComponentDetachMutation( state, command, options.historyless );
		case 'document/component/relink-instance':
			return applyComponentRelinkMutation( state, command, options.historyless );
		case 'design/classes/upsert':
			return applyClassMutation( state, command, options.historyless );
		case 'design/classes/delete':
			return applyClassDeleteMutation( state, command, options.historyless );
		case 'design/variables/upsert':
			return applyVariableMutation( state, command, options.historyless );
		case 'design/variables/delete':
			return applyVariableDeleteMutation( state, command, options.historyless );
		case 'project/assignment/upsert':
			return applyAssignmentMutation( state, command, options.historyless );
		case 'project/assignment/delete':
			return applyAssignmentDeleteMutation( state, command, options.historyless );
	}
}

function applyCreateNodeMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/create' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const nextDocument = withDocumentNodes( state.project, documentId, ( document ) => insertNodeIntoDocument( document, structuredClone( command.node ), command.parentId, command.slot, command.index ) );
	const nextState = updateStateAfterDocumentMutation( state, documentId, nextDocument );
	return {
		state: nextState,
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
			},
			inverse: {
				type: 'document/elements/delete',
				documentId,
				nodeId: command.node.id,
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyUpdateNodeMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/update' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const document = getDocumentById( state.project, documentId );
	const previousNode = getNodeById( document.root, command.nodeId );
	if ( !previousNode ) {
		return { state };
	}

	const nextDocument = updateNodeInDocument( document, command.nodeId, command );
	const updatesStyleRefs = command.styleRefs !== undefined || command.patch?.styleRefs !== undefined;
	const nextProject = replaceDocumentInProject( state.project, documentId, nextDocument, { updateClassUsage: updatesStyleRefs } );
	const nextState = updateStateAfterDocumentMutation( state, documentId, nextProject, command.nodeId );

	return {
		state: nextState,
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
			},
			inverse: {
				type: 'document/elements/update',
				documentId,
				nodeId: previousNode.id,
				patch: {
					name: previousNode.name,
					visibility: previousNode.visibility,
					accessibility: previousNode.accessibility,
					meta: previousNode.meta,
				},
				propsPatch: previousNode.props,
				layoutPatch: previousNode.layout,
				stylesPatch: previousNode.styles,
				styleRefs: previousNode.styleRefs,
				bindings: previousNode.bindings,
				attributes: previousNode.attributes,
				legacy: previousNode.legacy ?? null,
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyDeleteNodeMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/delete' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const document = getDocumentById( state.project, documentId );
	const location = getNodeLocation( document.root, command.nodeId );
	if ( !location ) {
		return { state };
	}

	const nextDocument = withDocumentNodes( state.project, documentId, ( entry ) => deleteNodeFromDocument( entry, command.nodeId ) );
	const nextState = updateStateAfterDocumentMutation( state, documentId, nextDocument );
	return {
		state: nextState,
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
			},
			inverse: {
				type: 'document/elements/create',
				documentId,
				node: location.node,
				parentId: location.parentId,
				slot: location.slot,
				index: location.index,
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyMoveNodeMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/move' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const document = getDocumentById( state.project, documentId );
	const originalLocation = getNodeLocation( document.root, command.nodeId );
	if ( !originalLocation ) {
		return { state };
	}

	const nextDocument = withDocumentNodes( state.project, documentId, ( entry ) => moveNodeInDocument( entry, command.nodeId, command.targetParentId, command.targetSlot, command.index ) );
	const nextState = updateStateAfterDocumentMutation( state, documentId, nextDocument, command.nodeId );
	return {
		state: nextState,
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
			},
			inverse: {
				type: 'document/elements/move',
				documentId,
				nodeId: command.nodeId,
				targetParentId: originalLocation.parentId,
				targetSlot: originalLocation.slot,
				index: originalLocation.index,
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyComponentInstanceOverrideMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/component/update-instance-overrides' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const document = getDocumentById( state.project, documentId );
	const node = getNodeById( document.root, command.nodeId );
	if ( !node || node.type !== 'component-instance' ) {
		return { state };
	}

	const componentId = String( node.props.componentId ?? '' );
	const componentDocument = state.project.documents.find( ( entry ) => entry.id === componentId && entry.kind === 'component' );
	const allowedOverrideIds = new Set( ( componentDocument?.component?.exposedProperties ?? [] ).map( ( exposure ) => exposure.id ) );
	const previousOverrides = normalizeComponentOverrides( node.props.overrides );
	const mergedOverrides = command.merge
		? {
			...previousOverrides,
			...command.overrides,
		}
		: { ...command.overrides };
	const nextOverrides = allowedOverrideIds.size
		? Object.fromEntries( Object.entries( mergedOverrides ).filter( ( [ key ] ) => allowedOverrideIds.has( key ) ) )
		: mergedOverrides;
	const nextDocument = withDocumentNodes( state.project, documentId, ( entry ) => updateNodeInDocument( entry, command.nodeId, {
		type: 'document/elements/update',
		nodeId: command.nodeId,
		propsPatch: {
			overrides: nextOverrides,
		},
	} ) );
	return {
		state: updateStateAfterDocumentMutation( state, documentId, nextDocument, command.nodeId ),
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
				overrides: nextOverrides,
			},
			inverse: {
				type: 'document/component/update-instance-overrides',
				documentId,
				nodeId: command.nodeId,
				overrides: previousOverrides,
				merge: false,
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyComponentDetachMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/component/detach-instance' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const document = getDocumentById( state.project, documentId );
	const node = getNodeById( document.root, command.nodeId );
	if ( !node || node.type !== 'component-instance' ) {
		return { state };
	}

	const componentId = String( node.props.componentId ?? '' );
	const componentDocument = state.project.documents.find( ( entry ) => entry.id === componentId && entry.kind === 'component' );
	const detachedRoots = componentDocument
		? materializeComponentRoots( componentDocument, normalizeComponentOverrides( node.props.overrides ) )
		: [
			createNode( {
				type: 'compat-widget',
				props: {
					title: 'Missing component master',
					widgetType: 'component-instance',
				},
				legacy: {
					widgetType: 'component-instance',
					rawSettings: {
						componentId,
						error: 'Missing component document',
					},
					editable: true,
					nativeReplacement: 'component-instance',
				},
			} ),
		];
	const detachedNode = BuilderNodeSchema.parse( {
		...node,
		type: 'container',
		name: node.name ?? componentDocument?.title ?? 'Detached component',
		children: detachedRoots,
		slots: {},
		meta: {
			...node.meta,
			detachedComponent: {
				componentId,
				componentTitle: componentDocument?.title ?? componentId,
				originalProps: toJsonSnapshot( node.props ),
				detachedAt: new Date().toISOString(),
			},
		},
	} );
	const nextDocument = withDocumentNodes( state.project, documentId, ( entry ) => updateNodeInDocument( entry, command.nodeId, {
		type: 'document/elements/update',
		nodeId: command.nodeId,
		patch: {
			type: detachedNode.type,
			name: detachedNode.name,
			children: detachedNode.children,
			slots: detachedNode.slots,
			props: {
				...node.props,
				detached: true,
				title: String( detachedNode.name ?? 'Detached component' ),
			},
			meta: detachedNode.meta,
		},
		legacy: null,
	} ) );
	return {
		state: updateStateAfterDocumentMutation( state, documentId, nextDocument, command.nodeId ),
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
			},
			inverse: {
				type: 'document/elements/update',
				documentId,
				nodeId: command.nodeId,
				patch: {
					type: node.type,
					name: node.name,
					children: node.children,
					slots: node.slots,
					props: node.props,
					layout: node.layout,
					styles: node.styles,
					styleRefs: node.styleRefs,
					bindings: node.bindings,
					attributes: node.attributes,
					meta: node.meta,
					legacy: node.legacy,
				},
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyComponentRelinkMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'document/component/relink-instance' }>,
	historyless = false,
) {
	const documentId = command.documentId ?? state.activeDocumentId;
	const document = getDocumentById( state.project, documentId );
	const node = getNodeById( document.root, command.nodeId );
	if ( !node || node.type !== 'container' ) {
		return { state };
	}

	const detachedMeta = readDetachedComponentMeta( node );
	if ( !detachedMeta ) {
		return { state };
	}

	const originalProps = normalizeDetachedOriginalProps( detachedMeta.originalProps );
	const componentId = command.componentId ?? String( detachedMeta.componentId ?? originalProps.componentId ?? '' );
	const nextProps = {
		...originalProps,
		componentId,
		detached: false,
		overrides: command.preserveOverrides === false ? {} : normalizeComponentOverrides( originalProps.overrides ),
	};
	const nextMeta = {
		...node.meta,
	};
	delete ( nextMeta as Record<string, JsonValue> ).detachedComponent;
	const nextDocument = withDocumentNodes( state.project, documentId, ( entry ) => updateNodeInDocument( entry, command.nodeId, {
		type: 'document/elements/update',
		nodeId: command.nodeId,
		patch: {
			type: 'component-instance',
			children: [],
			slots: {},
			props: nextProps,
			meta: nextMeta,
		},
	} ) );
	return {
		state: updateStateAfterDocumentMutation( state, documentId, nextDocument, command.nodeId ),
		historyOperation: historyless ? undefined : {
			operation: {
				...command,
				documentId,
				componentId,
			},
			inverse: {
				type: 'document/elements/update',
				documentId,
				nodeId: command.nodeId,
				patch: {
					type: node.type,
					name: node.name,
					children: node.children,
					slots: node.slots,
					props: node.props,
					layout: node.layout,
					styles: node.styles,
					styleRefs: node.styleRefs,
					bindings: node.bindings,
					attributes: node.attributes,
					meta: node.meta,
					legacy: node.legacy,
				},
			} as BuilderMutationCommand,
			documentIds: [ documentId ],
		},
	};
}

function applyClassMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'design/classes/upsert' }>,
	historyless = false,
) {
	const previous = state.project.designSystem.classes.find( ( definition ) => definition.id === command.definition.id );
	const nextProject = recalculateProjectDerivedState( {
		...state.project,
		designSystem: {
			...state.project.designSystem,
			classes: upsertById( state.project.designSystem.classes, command.definition ),
		},
	} );
	return {
		state: {
			...state,
			project: nextProject,
			ui: {
				...state.ui,
				saveState: 'dirty' as const,
			},
		},
		historyOperation: historyless ? undefined : {
			operation: command,
			inverse: previous
				? {
					type: 'design/classes/upsert',
					definition: previous,
				} as BuilderMutationCommand
				: {
					type: 'design/classes/delete',
					classId: command.definition.id,
				} as BuilderMutationCommand,
			documentIds: [],
		},
	};
}

function applyClassDeleteMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'design/classes/delete' }>,
	historyless = false,
) {
	const previous = state.project.designSystem.classes.find( ( definition ) => definition.id === command.classId );
	if ( !previous ) {
		return { state };
	}

	const nextProject = recalculateProjectDerivedState( {
		...state.project,
		designSystem: {
			...state.project.designSystem,
			classes: state.project.designSystem.classes.filter( ( definition ) => definition.id !== command.classId ),
		},
	} );

	return {
		state: {
			...state,
			project: nextProject,
			ui: {
				...state.ui,
				saveState: 'dirty' as const,
			},
		},
		historyOperation: historyless ? undefined : {
			operation: command,
			inverse: {
				type: 'design/classes/upsert',
				definition: previous,
			} as BuilderMutationCommand,
			documentIds: [],
		},
	};
}

function applyVariableMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'design/variables/upsert' }>,
	historyless = false,
) {
	const previous = state.project.designSystem.variables.find( ( definition ) => definition.id === command.definition.id );
	const nextProject = recalculateProjectDerivedState( {
		...state.project,
		designSystem: {
			...state.project.designSystem,
			variables: upsertById( state.project.designSystem.variables, command.definition ),
		},
	} );
	return {
		state: {
			...state,
			project: nextProject,
			ui: {
				...state.ui,
				saveState: 'dirty' as const,
			},
		},
		historyOperation: historyless ? undefined : {
			operation: command,
			inverse: previous
				? {
					type: 'design/variables/upsert',
					definition: previous,
				} as BuilderMutationCommand
				: {
					type: 'design/variables/delete',
					variableId: command.definition.id,
				} as BuilderMutationCommand,
			documentIds: [],
		},
	};
}

function applyVariableDeleteMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'design/variables/delete' }>,
	historyless = false,
) {
	const previous = state.project.designSystem.variables.find( ( definition ) => definition.id === command.variableId );
	if ( !previous ) {
		return { state };
	}

	const nextProject = recalculateProjectDerivedState( {
		...state.project,
		designSystem: {
			...state.project.designSystem,
			variables: state.project.designSystem.variables.filter( ( definition ) => definition.id !== command.variableId ),
		},
	} );

	return {
		state: {
			...state,
			project: nextProject,
			ui: {
				...state.ui,
				saveState: 'dirty' as const,
			},
		},
		historyOperation: historyless ? undefined : {
			operation: command,
			inverse: {
				type: 'design/variables/upsert',
				definition: previous,
			} as BuilderMutationCommand,
			documentIds: [],
		},
	};
}

function applyAssignmentMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'project/assignment/upsert' }>,
	historyless = false,
) {
	const previous = state.project.themeAssignments.find( ( assignment ) => assignment.id === command.assignment.id );
	const nextProject = recalculateProjectDerivedState( {
		...state.project,
		themeAssignments: upsertById( state.project.themeAssignments, command.assignment ),
	} );
	return {
		state: {
			...state,
			project: nextProject,
			ui: {
				...state.ui,
				saveState: 'dirty' as const,
			},
		},
		historyOperation: historyless ? undefined : {
			operation: command,
			inverse: previous
				? {
					type: 'project/assignment/upsert',
					assignment: previous,
				} as BuilderMutationCommand
				: {
					type: 'project/assignment/delete',
					assignmentId: command.assignment.id,
				} as BuilderMutationCommand,
			documentIds: [ command.assignment.documentId ],
		},
	};
}

function applyAssignmentDeleteMutation(
	state: BuilderEngineState,
	command: Extract<BuilderMutationCommand, { type: 'project/assignment/delete' }>,
	historyless = false,
) {
	const previous = state.project.themeAssignments.find( ( assignment ) => assignment.id === command.assignmentId );
	if ( !previous ) {
		return { state };
	}

	const nextProject = recalculateProjectDerivedState( {
		...state.project,
		themeAssignments: state.project.themeAssignments.filter( ( assignment ) => assignment.id !== command.assignmentId ),
	} );

	return {
		state: {
			...state,
			project: nextProject,
			ui: {
				...state.ui,
				saveState: 'dirty' as const,
			},
		},
		historyOperation: historyless ? undefined : {
			operation: command,
			inverse: {
				type: 'project/assignment/upsert',
				assignment: previous,
			} as BuilderMutationCommand,
			documentIds: [ previous.documentId ],
		},
	};
}

function updateStateAfterDocumentMutation(
	state: BuilderEngineState,
	documentId: string,
	project: BuilderPackage,
	selectedNodeId?: string,
): BuilderEngineState {
	const nextDocument = getDocumentById( project, documentId );
	const focusNodeId = selectedNodeId ?? state.ui.selectedNodeIds[ 0 ];
	const focusedPath = focusNodeId ? ( getNodeLocation( nextDocument.root, focusNodeId )?.path ?? state.ui.focusedPath ) : state.ui.focusedPath;
	return withDerivedUiState( {
		...state,
		project,
		documentSessions: markDirty( state.documentSessions, documentId ),
		ui: {
			...state.ui,
			saveState: 'dirty' as const,
			selectedNodeIds: focusNodeId ? [ focusNodeId ] : state.ui.selectedNodeIds,
			focusedPath,
			breadcrumbs: getBreadcrumbEntries( nextDocument.root, focusedPath ),
		},
	} );
}

function withDerivedUiState( state: BuilderEngineState ): BuilderEngineState {
	return {
		...state,
		ui: {
			...state.ui,
			componentEditing: deriveComponentEditingState( state.project, state.activeDocumentId, state.ui.mode, state.ui.selectedNodeIds[ 0 ] ),
			revisions: {
				...state.ui.revisions,
				selectedRevisionId: state.ui.revisions.selectedRevisionId ?? getLatestRevisionForDocument( state.project, state.activeDocumentId )?.id,
			},
		},
	};
}

function resolveShellPageForPanel( panel: BuilderPanel, fallback: BuilderShellPage ): BuilderShellPage {
	switch ( panel ) {
		case 'content':
		case 'style':
		case 'advanced':
			return 'editor';
		case 'settings':
			return 'page-settings';
		case 'history':
			return 'history';
		case 'design-system':
		case 'components':
		case 'library':
			return 'globals';
		default:
			return fallback;
	}
}

function resolvePanelForShellPage( page: BuilderShellPage, currentPanel: BuilderPanel ): BuilderPanel {
	switch ( page ) {
		case 'editor':
			return currentPanel === 'style' || currentPanel === 'advanced' ? currentPanel : 'content';
		case 'page-settings':
			return 'settings';
		case 'history':
			return 'history';
		case 'globals':
			return currentPanel === 'components' || currentPanel === 'library' ? currentPanel : 'design-system';
		default:
			return currentPanel;
	}
}

function resolveGlobalsPanelFromManagers( managers: BuilderUiState['managers'], currentPanel: BuilderPanel ): BuilderPanel {
	if ( managers.libraryManagerOpen ) {
		return 'library';
	}
	if ( managers.componentManagerOpen ) {
		return 'components';
	}
	if ( currentPanel === 'components' || currentPanel === 'library' ) {
		return currentPanel;
	}
	return 'design-system';
}

function resolveSelectionEditorSurface(
	currentPage: BuilderShellPage,
	currentPanel: BuilderPanel,
): { page: BuilderShellPage; panel: BuilderPanel } {
	if ( currentPage === 'editor' ) {
		return {
			page: 'editor',
			panel: currentPanel === 'style' || currentPanel === 'advanced' ? currentPanel : 'content',
		};
	}

	return {
		page: 'editor',
		panel: 'content',
	};
}

function deriveComponentEditingState(
	project: BuilderPackage,
	documentId: string,
	mode: EditorMode,
	selectedNodeId?: string,
): ComponentEditingState {
	const document = project.documents.find( ( entry ) => entry.id === documentId );
	if ( mode === 'component-master' && document?.kind === 'component' ) {
		return {
			context: 'master',
			componentDocumentId: documentId,
		};
	}

	if ( !selectedNodeId ) {
		return {};
	}

	const selectedNode = document ? getNodeById( document.root, selectedNodeId ) : undefined;
	if ( !selectedNode ) {
		return {};
	}

	if ( selectedNode.type === 'component-instance' ) {
		return {
			context: 'instance',
			componentDocumentId: String( selectedNode.props.componentId ?? '' ),
			nodeId: selectedNode.id,
		};
	}

	if ( readDetachedComponentMeta( selectedNode ) ) {
		return {
			context: 'detached',
			componentDocumentId: String( readDetachedComponentMeta( selectedNode )?.componentId ?? '' ),
			nodeId: selectedNode.id,
		};
	}

	return {};
}

function getLatestRevisionForDocument( project: BuilderPackage, documentId: string ): DocumentRevision | undefined {
	return [ ...project.revisions ]
		.reverse()
		.find( ( revision ) => revision.documentId === documentId );
}

function normalizeComponentOverrides( value: unknown ): Record<string, JsonValue> {
	if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
		return {};
	}

	return Object.fromEntries(
		Object.entries( value as Record<string, unknown> )
			.map( ( [ key, entryValue ] ) => [ key, entryValue as JsonValue ] as const ),
	);
}

function normalizeDetachedOriginalProps( value: unknown ): Record<string, JsonValue> {
	if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
		return {};
	}

	return value as Record<string, JsonValue>;
}

function readDetachedComponentMeta( node: BuilderNode ): Record<string, JsonValue> | undefined {
	const value = node.meta.detachedComponent;
	if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
		return undefined;
	}

	return value as Record<string, JsonValue>;
}

function materializeComponentRoots( component: BuilderDocument, overrides: Record<string, JsonValue> ): BuilderNode[] {
	const roots = structuredClone( component.root );
	if ( !roots.length ) {
		return [];
	}

	for ( const exposure of component.component?.exposedProperties ?? [] ) {
		if ( !( exposure.id in overrides ) ) {
			continue;
		}

		for ( const root of roots ) {
			applyOverrideToComponentNode( root, exposure.nodeId, exposure.propPath, overrides[ exposure.id ] ?? null );
		}
	}

	return roots;
}

function applyOverrideToComponentNode( node: BuilderNode, nodeId: string, propPath: string, value: JsonValue ): void {
	if ( node.id === nodeId ) {
		setJsonValueByPath( node.props, propPath, value );
	}

	node.children.forEach( ( child: BuilderNode ) => applyOverrideToComponentNode( child, nodeId, propPath, value ) );
	Object.values( node.slots as Record<string, BuilderNode[]> )
		.forEach( ( slotNodes ) => slotNodes.forEach( ( child: BuilderNode ) => applyOverrideToComponentNode( child, nodeId, propPath, value ) ) );
}

function setJsonValueByPath( target: Record<string, JsonValue>, path: string, value: JsonValue ): void {
	const segments = path.split( '.' );
	let cursor: Record<string, JsonValue> = target;
	for ( const segment of segments.slice( 0, -1 ) ) {
		const current = cursor[ segment ];
		if ( !current || typeof current !== 'object' || Array.isArray( current ) ) {
			cursor[ segment ] = {};
		}

		cursor = cursor[ segment ] as Record<string, JsonValue>;
	}

	cursor[ segments.at( -1 )! ] = value;
}

function withDocumentNodes(
	project: BuilderPackage,
	documentId: string,
	updater: ( document: BuilderDocument ) => BuilderDocument,
): BuilderPackage {
	return recalculateProjectDerivedState( {
		...project,
		documents: project.documents.map( ( document ) => document.id === documentId ? updater( structuredClone( document ) ) : document ),
	}, project, [ documentId ] );
}

function replaceDocumentInProject(
	project: BuilderPackage,
	documentId: string,
	nextDocument: BuilderDocument,
	options: { updateClassUsage?: boolean } = {},
): BuilderPackage {
	const nextProject = {
		...project,
		documents: project.documents.map( ( document ) => document.id === documentId ? nextDocument : document ),
	};
	return options.updateClassUsage === false
		? nextProject
		: recalculateProjectDerivedState( nextProject, project, [ documentId ] );
}

function insertNodeIntoDocument( document: BuilderDocument, node: BuilderNode, parentId?: string, slot?: string, index?: number ): BuilderDocument {
	if ( !parentId ) {
		const nextRoot = [ ...document.root ];
		insertAt( nextRoot, BuilderNodeSchema.parse( node ), index );
		return BuilderDocumentSchema.parse( { ...document, root: nextRoot, updatedAt: new Date().toISOString() } );
	}

	return BuilderDocumentSchema.parse( {
		...document,
		root: insertNodeIntoCollection( document.root, parentId, slot, BuilderNodeSchema.parse( node ), index ),
		updatedAt: new Date().toISOString(),
	} );
}

function updateNodeInDocument(
	document: BuilderDocument,
	nodeId: string,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/update' }>,
): BuilderDocument {
	const nextRoot = updateNodeInCollection( document.root, nodeId, command );
	if ( nextRoot === document.root ) {
		return document;
	}

	return {
		...document,
		root: nextRoot,
		updatedAt: new Date().toISOString(),
	};
}

function updateNodeInCollection(
	nodes: BuilderNode[],
	nodeId: string,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/update' }>,
): BuilderNode[] {
	for ( const [ index, node ] of nodes.entries() ) {
		if ( node.id === nodeId ) {
			const nextNodes = [ ...nodes ];
			nextNodes[ index ] = updateSingleNode( node, command );
			return nextNodes;
		}

		const nextChildren = updateNodeInCollection( node.children, nodeId, command );
		if ( nextChildren !== node.children ) {
			const nextNodes = [ ...nodes ];
			nextNodes[ index ] = {
				...node,
				children: nextChildren,
			};
			return nextNodes;
		}

		for ( const [ slotName, slotNodes ] of Object.entries( node.slots as Record<string, BuilderNode[]> ) ) {
			const nextSlotNodes = updateNodeInCollection( slotNodes, nodeId, command );
			if ( nextSlotNodes !== slotNodes ) {
				const nextNodes = [ ...nodes ];
				nextNodes[ index ] = {
					...node,
					slots: {
						...node.slots,
						[ slotName ]: nextSlotNodes,
					},
				};
				return nextNodes;
			}
		}
	}

	return nodes;
}

function updateSingleNode(
	node: BuilderNode,
	command: Extract<BuilderMutationCommand, { type: 'document/elements/update' }>,
): BuilderNode {
	const patch = command.patch ?? {};
	return BuilderNodeSchema.parse( {
		...node,
		...patch,
		props: {
			...( ( patch.props && typeof patch.props === 'object' && !Array.isArray( patch.props ) ) ? patch.props as Record<string, JsonValue> : node.props ),
			...command.propsPatch,
		},
		layout: {
			...( ( patch.layout && typeof patch.layout === 'object' && !Array.isArray( patch.layout ) ) ? patch.layout as Record<string, JsonValue> : node.layout ),
			...command.layoutPatch,
		},
		styles: mergeStyleSet( ( patch.styles as StyleSet | undefined ) ?? node.styles, command.stylesPatch ),
		styleRefs: command.styleRefs ?? patch.styleRefs ?? node.styleRefs,
		bindings: command.bindings ?? patch.bindings ?? node.bindings,
		attributes: command.attributes ?? patch.attributes ?? node.attributes,
		legacy: command.legacy === null ? undefined : command.legacy ?? patch.legacy ?? node.legacy,
	} );
}

function deleteNodeFromDocument( document: BuilderDocument, nodeId: string ): BuilderDocument {
	return BuilderDocumentSchema.parse( {
		...document,
		root: deleteNodeFromCollection( document.root, nodeId ),
		updatedAt: new Date().toISOString(),
	} );
}

function moveNodeInDocument( document: BuilderDocument, nodeId: string, targetParentId?: string, targetSlot?: string, index?: number ): BuilderDocument {
	const location = getNodeLocation( document.root, nodeId );
	if ( !location ) {
		return document;
	}

	const withoutNode = deleteNodeFromDocument( document, nodeId );
	return insertNodeIntoDocument( withoutNode, location.node, targetParentId, targetSlot, index );
}

function mapNodes( nodes: BuilderNode[], mapper: ( node: BuilderNode ) => BuilderNode ): BuilderNode[] {
	return nodes.map( ( node ) => {
		const mapped = mapper( node );
		return BuilderNodeSchema.parse( {
			...mapped,
			children: mapNodes( mapped.children, mapper ),
			slots: Object.fromEntries(
				Object.entries( mapped.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, slotNodes ] ) => [ slotName, mapNodes( slotNodes, mapper ) ] ),
			),
		} );
	} );
}

function deleteNodeFromCollection( nodes: BuilderNode[], nodeId: string ): BuilderNode[] {
	return nodes
		.filter( ( node ) => node.id !== nodeId )
		.map( ( node ) => BuilderNodeSchema.parse( {
			...node,
			children: deleteNodeFromCollection( node.children, nodeId ),
			slots: Object.fromEntries(
				Object.entries( node.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, slotNodes ] ) => [ slotName, deleteNodeFromCollection( slotNodes, nodeId ) ] ),
			),
		} ) );
}

function insertNodeIntoCollection( nodes: BuilderNode[], parentId: string, slot: string | undefined, node: BuilderNode, index?: number ): BuilderNode[] {
	return nodes.map( ( entry ) => {
		if ( entry.id !== parentId ) {
			return BuilderNodeSchema.parse( {
				...entry,
				children: insertNodeIntoCollection( entry.children, parentId, slot, node, index ),
				slots: Object.fromEntries(
					Object.entries( entry.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, slotNodes ] ) => [ slotName, insertNodeIntoCollection( slotNodes, parentId, slot, node, index ) ] ),
				),
			} );
		}

		if ( slot ) {
			const slotNodes = [ ...( entry.slots[ slot ] ?? [] ) ];
			insertAt( slotNodes, node, index );
			return BuilderNodeSchema.parse( {
				...entry,
				slots: {
					...entry.slots,
					[ slot ]: slotNodes,
				},
			} );
		}

		const children = [ ...entry.children ];
		insertAt( children, node, index );
		return BuilderNodeSchema.parse( {
			...entry,
			children,
		} );
	} );
}

function createDocumentSessions( project: BuilderPackage ): Record<string, DocumentSession> {
	return Object.fromEntries( project.documents.map( ( document ) => [ document.id, createDocumentSession( document.id, project.revisions.filter( ( revision ) => revision.documentId === document.id ) ) ] ) );
}

function createDocumentSession( documentId: string, revisions: DocumentRevision[] = [] ): DocumentSession {
	const draft = [ ...revisions ].reverse().find( ( revision ) => revision.kind === 'draft' );
	const autosave = [ ...revisions ].reverse().find( ( revision ) => revision.kind === 'autosave' );
	const published = [ ...revisions ].reverse().find( ( revision ) => revision.kind === 'published' );
	const latest = [ ...revisions ].reverse()[ 0 ];
	return {
		documentId,
		dirty: false,
		lastDraftAt: draft?.createdAt,
		lastAutosaveAt: autosave?.createdAt,
		lastPublishedAt: published?.createdAt,
		draftRevisionId: draft?.id,
		autosaveRevisionId: autosave?.id,
		publishedRevisionId: published?.id,
		lastRevisionAt: latest?.createdAt,
		lastRevisionId: latest?.id,
		lastRevisionKind: latest?.kind,
	};
}

function markDirty( sessions: Record<string, DocumentSession>, documentId: string ): Record<string, DocumentSession> {
	const existing = sessions[ documentId ] ?? createDocumentSession( documentId );
	return {
		...sessions,
		[ documentId ]: {
			...existing,
			dirty: true,
		},
	};
}

function recalculateProjectDerivedState( project: BuilderPackage, previousProject?: BuilderPackage, changedDocumentIds: string[] = [] ): BuilderPackage {
	const classUsage = previousProject && changedDocumentIds.length
		? updateClassUsageForChangedDocuments( previousProject, project, changedDocumentIds )
		: countClassUsage( project.documents );
	return {
		...project,
		designSystem: {
			...project.designSystem,
			classes: project.designSystem.classes.map( ( definition ) => ( {
				...definition,
				usageCount: classUsage.get( definition.id ) ?? classUsage.get( definition.name ) ?? 0,
			} ) ),
		},
	};
}

function updateClassUsageForChangedDocuments(
	previousProject: BuilderPackage,
	nextProject: BuilderPackage,
	changedDocumentIds: string[],
): Map<string, number> {
	const usage = new Map<string, number>();
	for ( const definition of previousProject.designSystem.classes ) {
		usage.set( definition.id, definition.usageCount ?? 0 );
		if ( definition.name ) {
			usage.set( definition.name, definition.usageCount ?? 0 );
		}
	}

	for ( const documentId of changedDocumentIds ) {
		const previousDocument = previousProject.documents.find( ( document ) => document.id === documentId );
		const nextDocument = nextProject.documents.find( ( document ) => document.id === documentId );
		applyClassUsageDelta( usage, previousProject, previousDocument, -1 );
		applyClassUsageDelta( usage, nextProject, nextDocument, 1 );
	}

	return usage;
}

function applyClassUsageDelta( usage: Map<string, number>, project: BuilderPackage, document: BuilderDocument | undefined, direction: 1 | -1 ) {
	if ( !document ) {
		return;
	}

	for ( const [ styleRef, count ] of countClassUsage( [ document ] ) ) {
		for ( const key of resolveClassUsageKeys( project, styleRef ) ) {
			usage.set( key, Math.max( 0, ( usage.get( key ) ?? 0 ) + count * direction ) );
		}
	}
}

function resolveClassUsageKeys( project: BuilderPackage, styleRef: string ): string[] {
	const keys = new Set<string>( [ styleRef ] );
	const definition = project.designSystem.classes.find( ( entry ) => entry.id === styleRef || entry.name === styleRef );
	if ( definition ) {
		keys.add( definition.id );
		if ( definition.name ) {
			keys.add( definition.name );
		}
	}
	return [ ...keys ];
}

function countClassUsage( documents: BuilderDocument[] ): Map<string, number> {
	const usage = new Map<string, number>();
	for ( const document of documents ) {
		for ( const node of flattenNodeTree( document.root ) ) {
			for ( const styleRef of node.styleRefs ) {
				usage.set( styleRef, ( usage.get( styleRef ) ?? 0 ) + 1 );
			}
		}
	}
	return usage;
}

export function getNodeLocation(
	nodes: BuilderNode[],
	nodeId: string,
	parentId?: string,
	slot?: string,
	path: string[] = [],
): BuilderNodeLocation | undefined {
	for ( const [ index, node ] of nodes.entries() ) {
		const nextPath = [ ...path, node.id ];
		if ( node.id === nodeId ) {
			return {
				node,
				parentId,
				slot,
				index,
				path: nextPath,
			};
		}

		const childMatch = getNodeLocation( node.children, nodeId, node.id, undefined, nextPath );
		if ( childMatch ) {
			return childMatch;
		}

		for ( const [ slotName, slotNodes ] of Object.entries( node.slots as Record<string, BuilderNode[]> ) ) {
			const slotMatch = getNodeLocation( slotNodes, nodeId, node.id, slotName, nextPath );
			if ( slotMatch ) {
				return slotMatch;
			}
		}
	}

	return undefined;
}

export function getBreadcrumbEntries( nodes: BuilderNode[], path: string[] ): BreadcrumbEntry[] {
	return path
		.map( ( nodeId ) => getNodeById( nodes, nodeId ) )
		.filter( Boolean )
		.map( ( node ) => ( {
			nodeId: node!.id,
			label: getNodeLabel( node! ),
			type: node!.type,
		} ) );
}

export function getDocumentSnapshotFromRevision( revision: DocumentRevision ): BuilderDocument | undefined {
	const snapshot = revision.meta.documentSnapshot;
	if ( !snapshot || typeof snapshot !== 'object' || Array.isArray( snapshot ) ) {
		return undefined;
	}

	try {
		return BuilderDocumentSchema.parse( snapshot );
	} catch {
		return undefined;
	}
}

function regenerateTreeIds( node: BuilderNode ): BuilderNode {
	return createNode( {
		...structuredClone( node ),
		id: crypto.randomUUID(),
		children: node.children.map( regenerateTreeIds ),
		slots: Object.fromEntries(
			Object.entries( node.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, slotNodes ] ) => [ slotName, slotNodes.map( regenerateTreeIds ) ] ),
		),
	} );
}

function mergeStyleSet( base: StyleSet, patch?: Partial<StyleSet> ): StyleSet {
	if ( !patch ) {
		return base;
	}

	if ( isCompleteStyleSetPatch( patch ) ) {
		return createStyleSet( patch );
	}

	const partialPatch = patch as Partial<StyleSet>;
	return createStyleSet( {
		base: {
			...base.base,
			...partialPatch.base,
		},
		states: mergeNestedRecord( base.states, partialPatch.states ),
		breakpoints: mergeNestedRecord( base.breakpoints, partialPatch.breakpoints ),
		stateBreakpoints: mergeDeepNestedRecord( base.stateBreakpoints, partialPatch.stateBreakpoints ),
		customCss: partialPatch.customCss ?? base.customCss,
	} );
}

function isCompleteStyleSetPatch( patch: Partial<StyleSet> ): patch is StyleSet {
	return patch.base !== undefined
		&& patch.states !== undefined
		&& patch.breakpoints !== undefined
		&& patch.stateBreakpoints !== undefined
		&& patch.customCss !== undefined;
}

function mergeNestedRecord(
	base: Record<string, Record<string, JsonValue>>,
	patch?: Record<string, Record<string, JsonValue>>,
): Record<string, Record<string, JsonValue>> {
	const output = structuredClone( base );
	for ( const [ key, value ] of Object.entries( patch ?? {} ) ) {
		output[ key ] = {
			...( output[ key ] ?? {} ),
			...value,
		};
	}
	return output;
}

function mergeDeepNestedRecord(
	base: Record<string, Record<string, Record<string, JsonValue>>>,
	patch?: Record<string, Record<string, Record<string, JsonValue>>>,
): Record<string, Record<string, Record<string, JsonValue>>> {
	const output = structuredClone( base );
	for ( const [ breakpointId, stateValue ] of Object.entries( patch ?? {} ) ) {
		output[ breakpointId ] ??= {};
		for ( const [ stateKey, styleMap ] of Object.entries( stateValue ) ) {
			output[ breakpointId ][ stateKey ] = {
				...( output[ breakpointId ][ stateKey ] ?? {} ),
				...styleMap,
			};
		}
	}
	return output;
}

function insertAt<T>( array: T[], value: T, index?: number ): void {
	if ( index === undefined || index < 0 || index > array.length ) {
		array.push( value );
		return;
	}

	array.splice( index, 0, value );
}

function upsertById<T extends { id?: string }>( entries: T[], definition: T ): T[] {
	if ( !definition.id ) {
		return entries;
	}

	const index = entries.findIndex( ( entry ) => entry.id === definition.id );
	if ( index === -1 ) {
		return [ ...entries, definition ];
	}

	return entries.map( ( entry ) => entry.id === definition.id ? definition : entry );
}

function getCommandLabel( command: BuilderMutationCommand ): string {
	switch ( command.type ) {
		case 'project/import':
			return 'Import project templates';
		case 'document/create':
			return `Create ${ command.document.kind }`;
		case 'document/delete':
			return 'Delete document';
		case 'document/update':
			return 'Update document';
		case 'document/elements/create':
			return `Add ${ command.node.type }`;
		case 'document/elements/update':
			return 'Update element';
		case 'document/elements/delete':
			return 'Delete element';
		case 'document/elements/move':
			return 'Move element';
		case 'document/component/update-instance-overrides':
			return 'Update component overrides';
		case 'document/component/detach-instance':
			return 'Detach component instance';
		case 'document/component/relink-instance':
			return 'Relink component instance';
		case 'design/classes/upsert':
			return `Update class ${ command.definition.label }`;
		case 'design/classes/delete':
			return 'Delete class';
		case 'design/variables/upsert':
			return `Update variable ${ command.definition.label }`;
		case 'design/variables/delete':
			return 'Delete variable';
		case 'project/assignment/upsert':
			return 'Update assignment';
		case 'project/assignment/delete':
			return 'Delete assignment';
	}
}

function getNodeLabel( node: BuilderNode ): string {
	if ( node.name ) {
		return node.name;
	}

	if ( typeof node.props.text === 'string' && node.props.text.trim() ) {
		return node.props.text.trim().slice( 0, 48 );
	}

	if ( typeof node.props.title === 'string' && node.props.title.trim() ) {
		return node.props.title.trim().slice( 0, 48 );
	}

	return node.type;
}

function toJsonSnapshot<T>( value: T ): T {
	return JSON.parse( JSON.stringify( value ) ) as T;
}
