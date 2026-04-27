<script lang="ts">
	import { onMount } from 'svelte';
	import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
	import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';

	import type { BuilderEngineState, BuilderPanel, BuilderShellPage } from '@builder/core';
	import type { BuilderDocument, BuilderNode, DocumentKind, EditorMode, ThemeAssignment } from '@builder/schema';
	import type { BuilderElementDefinition } from '@builder/plugin-api';
	import type { BuilderEditorController } from './editor';
	import type { PanelTabItem, PanelTileGroup, PanelTileItem } from './components/panel-types';
	import type { TemplateImportDestination, TemplateImportReviewResult, TemplateImportResult, TemplateImportStructureNode } from './template-import';
	import type { BuilderAiProviderPreset, BuilderAiSessionState, BuilderAiSettings } from './ai-core';

	import { getActiveDocument, getDocumentRevisions } from '@builder/core';
	import { createThemeAssignment } from '@builder/schema';
	import { builderAiProviderPresets, createDefaultAiSettings } from './ai-core';

	import BuilderContextMenuSurface from './components/BuilderContextMenuSurface.svelte';
	import EditorPanelShell from './components/EditorPanelShell.svelte';
	import EditorShellIcon from './components/EditorShellIcon.svelte';
	import EditorShellTokens from './components/EditorShellTokens.svelte';
	import ElementsPanel from './components/ElementsPanel.svelte';
	import AssignmentWorkflowPanel from './components/LazyAssignmentWorkflowPanel.svelte';
	import ComponentWorkflowPanel from './components/LazyComponentWorkflowPanel.svelte';
	import DocumentModeBrowser from './components/LazyDocumentModeBrowser.svelte';
	import GlobalsPanelShell from './components/LazyGlobalsPanelShell.svelte';
	import HistoryPanelShell from './components/LazyHistoryPanelShell.svelte';
	import MenuPanel from './components/LazyMenuPanel.svelte';
	import PageSettingsPanel from './components/LazyPageSettingsPanel.svelte';
	import RevisionWorkflowPanel from './components/LazyRevisionWorkflowPanel.svelte';
	import BuilderInspector from './BuilderInspector.svelte';
	import BuilderNavigator from './BuilderNavigator.svelte';
	import BuilderPreview from './BuilderPreview.svelte';
	import {
		resolveBuilderContextMenuGroups,
		createContextMenuAnchorReference,
		resolveContextMenuTarget,
		type BuilderContextMenuAction,
	} from './context-menu';
	import { createAnchorController } from './anchor-controller';
	import {
		isBuilderDndData,
		resolveClientPoint,
		resolveEditorDragLocation,
	} from './drag-drop';
	import {
		createBuilderShellLayoutState,
		createPersistedShellLayoutPreferences,
		readBuilderShellLayoutPreferences,
		writeBuilderShellLayoutPreferences,
		type BuilderShellLayoutPreferences,
		type BuilderShellLayoutState,
	} from './shell-layout';

	type SiteEditorEntry = { id: string; label: string; route: string; templateType: string; documentId: string; slot: string };
	type PreviewPreset = { id: string; label: string; pathname: string; query: string };
	type IndexedElementDefinition = {
		definition: BuilderElementDefinition;
		searchText: string;
	};

	export let editor: BuilderEditorController;
	export let siteEditorEntries: SiteEditorEntry[] = [];
	export let previewPresets: PreviewPreset[] = [];
	export let importWarnings: string[] = [];

	let state: BuilderEngineState = editor.engine.getState();
	let unsubscribe = () => {};
	let unsubscribeAi = () => {};
	let newDocumentKind: DocumentKind = 'page';
	let newDocumentTitle = 'Untitled Page';
	let documentFilter: DocumentKind | 'all' = 'all';
	let elementSearch = '';
	let activeElementCategory = 'all';
	let activeMenuSection = 'documents';
	let activeDocument: BuilderDocument = getActiveDocument( state );
	let activeRevisions = getDocumentRevisions( state.project, state.activeDocumentId );
	let selectedNode: BuilderNode | undefined;
	let selectedDefinition: BuilderElementDefinition | undefined;
	let selectedHeaderNode: BuilderNode | undefined;
	let selectedHeaderDefinition: BuilderElementDefinition | undefined;
	let editorPanelTitle = 'Editor';
	let editorPanelSubtitle = 'Select an element on the canvas.';
	let panelHeaderTitle = 'Panel';
	let panelHeaderKicker = '';
	let projectDocuments = state.project.documents;
	let documentsById = buildDocumentsById( projectDocuments );
	let filteredDocuments = projectDocuments;
	let componentDocumentCount = projectDocuments.filter( ( document ) => document.kind === 'component' ).length;
	let breakpointDefinitions = state.project.designSystem.breakpoints;
	let viewports = breakpointDefinitions;
	const elementCatalog = createElementCatalog( [ ...editor.registry.elements.values() ] );
	const elementDefinitionsByType = elementCatalog.definitionByType;
	let elementCategoryTabs: PanelTabItem[] = [];
	let elementTileGroups: PanelTileGroup[] = [];
	let contextMenuElement: HTMLDivElement | undefined;
	let contextMenuGroups: ReturnType<typeof resolveBuilderContextMenuGroups> = [];
	let contextMenuAnchorCleanup = () => {};
	const contextMenuAnchorController = createAnchorController();
	let leftPanelPane: PaneAPI | undefined;
	let navigatorPane: PaneAPI | undefined;
	let compactViewport = false;
	let shellLayoutHydrated = false;
	let shellLayoutPreferences: BuilderShellLayoutPreferences = readBuilderShellLayoutPreferences();
	let shellLayout: BuilderShellLayoutState = createBuilderShellLayoutState( state.ui.shell, compactViewport, shellLayoutPreferences );
	let previewSurfaceElement: HTMLElement | undefined;
	let htmlImportOpen = false;
	let htmlImportSourceName = 'Imported HTML';
	let htmlImportMarkup = '';
	let htmlImportKind: 'html' | 'json' = 'html';
	let htmlImportDestination: TemplateImportDestination = 'library';
	let htmlImportStatus: 'idle' | 'reviewing' | 'ready' | 'importing' | 'success' | 'error' = 'idle';
	let htmlImportMessage = '';
	let htmlImportDiagnostics: Array<{ severity: string; message: string; sourceKey?: string }> = [];
	let htmlImportResult: Omit<TemplateImportResult, 'project'> | undefined;
	let htmlImportReview: TemplateImportReviewResult | undefined;
	let aiSession: BuilderAiSessionState = editor.getAiSession();
	let aiMenuOpen = false;
	let aiSettingsOpen = false;
	let aiCreateOpen = false;
	let aiSettingsStatus: 'idle' | 'loading' | 'saving' | 'error' | 'success' = 'idle';
	let aiSettingsMessage = '';
	let aiSettingsForm: BuilderAiSettings = createDefaultAiSettings();
	let aiCustomHeaders = '';
	let aiCreatePrompt = '';
	let aiCreateTarget = 'auto';
	let aiCreateDesignStyle = 'auto';
	let aiCreateOverwriteTheme = false;
	let aiChatDraft = '';
	$: canEditProject = editor.can( 'editProject' );
	$: canPublish = editor.can( 'publish' );
	$: canUseAi = editor.can( 'useAi' );
	$: publishPermissionReason = editor.getPermission( 'publish' ).reason ?? 'Publishing is disabled by this host.';
	$: aiPermissionReason = editor.getPermission( 'useAi' ).reason ?? 'AI is disabled by this host.';

	const shellPages: Array<{ id: BuilderShellPage; label: string }> = [
		{ id: 'elements', label: 'Elements' },
		{ id: 'editor', label: 'Editor' },
		{ id: 'page-settings', label: 'Page Settings' },
		{ id: 'history', label: 'History' },
		{ id: 'globals', label: 'Globals' },
		{ id: 'menu', label: 'Menu' },
	];
	const shellPageIcons: Record<BuilderShellPage, 'elements' | 'editor' | 'page-settings' | 'history' | 'globals' | 'menu'> = {
		elements: 'elements',
		editor: 'editor',
		'page-settings': 'page-settings',
		history: 'history',
		globals: 'globals',
		menu: 'menu',
	};
	const inspectorTabs: BuilderPanel[] = [ 'content', 'style', 'advanced' ];
	const globalTabs = [
		{ id: 'classes', label: 'Classes' },
		{ id: 'variables', label: 'Variables' },
		{ id: 'components', label: 'Components' },
		{ id: 'library', label: 'Library' },
	] as const;
	let menuSections: PanelTabItem[] = [];
	const creatableKinds: DocumentKind[] = [ 'page', 'layout', 'template', 'component', 'popup', 'kit', 'library-item' ];
	const modes: EditorMode[] = [ 'page', 'layout', 'template', 'component-master', 'component-instance', 'popup', 'legacy-compat' ];
	const compactWorkspaceBreakpoint = 1240;
	const elementCategoryOrder = new Map<string, number>( [
		[ 'layout', 0 ],
		[ 'content', 1 ],
		[ 'media', 2 ],
		[ 'interactive', 3 ],
		[ 'data', 4 ],
		[ 'form', 5 ],
		[ 'legacy', 6 ],
	] );
	const elementTileOrder = new Map<string, number>( [
		[ 'container', 0 ],
		[ 'grid-container', 1 ],
		[ 'spacer', 2 ],
		[ 'heading', 0 ],
		[ 'paragraph', 1 ],
		[ 'text-editor', 2 ],
		[ 'blockquote', 3 ],
		[ 'list', 4 ],
		[ 'divider', 5 ],
		[ 'icon', 6 ],
		[ 'icon-box', 7 ],
		[ 'html', 8 ],
		[ 'shortcode', 9 ],
		[ 'image', 0 ],
		[ 'video', 1 ],
		[ 'gallery', 2 ],
		[ 'svg', 3 ],
		[ 'button', 0 ],
		[ 'menu', 1 ],
		[ 'tabs', 2 ],
		[ 'accordion', 3 ],
		[ 'toggle', 4 ],
		[ 'social-icons', 5 ],
		[ 'carousel', 6 ],
		[ 'popup-root', 7 ],
		[ 'loop', 0 ],
		[ 'form', 0 ],
		[ 'form-field-text', 1 ],
		[ 'form-field-email', 2 ],
		[ 'form-field-textarea', 3 ],
		[ 'form-field-select', 4 ],
		[ 'form-field-checkbox', 5 ],
		[ 'form-field-radio', 6 ],
		[ 'form-field-hidden', 7 ],
		[ 'form-submit', 8 ],
		[ 'compat-widget', 0 ],
	] );

	$: activeDocument = getActiveDocument( state );
	$: activeRevisions = getDocumentRevisions( state.project, state.activeDocumentId );
	$: if ( state.project.documents !== projectDocuments ) {
		projectDocuments = state.project.documents;
		documentsById = buildDocumentsById( projectDocuments );
		componentDocumentCount = projectDocuments.filter( ( document ) => document.kind === 'component' ).length;
	}
	$: filteredDocuments = documentFilter === 'all' ? projectDocuments : projectDocuments.filter( ( document ) => document.kind === documentFilter );
	$: selectedNode = state.ui.selectedNodeIds[ 0 ] ? editor.getActiveDocumentCache().nodeById.get( state.ui.selectedNodeIds[ 0 ] ) : undefined;
	$: selectedDefinition = selectedNode ? elementDefinitionsByType.get( selectedNode.type ) : undefined;
	$: selectedHeaderNode = resolveSelectedNodeForChrome( state.ui.selectedNodeIds[ 0 ] );
	$: selectedHeaderDefinition = selectedHeaderNode ? elementDefinitionsByType.get( selectedHeaderNode.type ) : undefined;
	$: {
		if ( selectedHeaderNode ) {
			editorPanelTitle = `Edit ${ selectedHeaderDefinition?.label ?? selectedHeaderNode.type }`;
			editorPanelSubtitle = getSelectedNodeLabel( selectedHeaderNode, selectedHeaderDefinition );
		} else {
			editorPanelTitle = 'Editor';
			editorPanelSubtitle = 'Select an element on the canvas.';
		}
	}
	$: {
		if ( aiSession.mode === 'edit' ) {
			panelHeaderTitle = 'Edit with AI';
			panelHeaderKicker = aiSession.status === 'idle' ? 'Assistant' : aiSession.status;
		} else if ( state.ui.shell.leftPanelPage === 'editor' && selectedHeaderNode ) {
			panelHeaderTitle = editorPanelTitle;
			panelHeaderKicker = selectedHeaderDefinition?.category ? formatCategoryLabel( selectedHeaderDefinition.category ) : describeMode( state.ui.mode );
		} else {
			panelHeaderTitle = shellPages.find( ( page ) => page.id === state.ui.shell.leftPanelPage )?.label ?? 'Panel';
			panelHeaderKicker = describeMode( state.ui.mode );
		}
	}
	$: if ( state.project.designSystem.breakpoints !== breakpointDefinitions ) {
		breakpointDefinitions = state.project.designSystem.breakpoints;
		viewports = breakpointDefinitions;
	}
	$: elementCategoryTabs = elementCatalog.getCategoryTabs( elementSearch );
	$: if ( elementCategoryTabs.length && !elementCategoryTabs.some( ( tab ) => tab.id === activeElementCategory ) ) activeElementCategory = 'all';
	$: elementTileGroups = elementCatalog.getTileGroups( elementSearch, activeElementCategory );
	$: contextMenuGroups = resolveBuilderContextMenuGroups( state, editor.registry );
	$: {
		contextMenuAnchorCleanup();
		contextMenuAnchorCleanup = () => {};
		if ( state.ui.contextMenu.open && contextMenuElement ) {
			const reference = createContextMenuAnchorReference( state.ui.contextMenu.anchor );
			if ( reference ) {
				contextMenuAnchorCleanup = contextMenuAnchorController.open( reference, contextMenuElement );
			}
		}
	}
	$: menuSections = [
		{ id: 'documents', label: 'Documents' },
		{ id: 'site-editor', label: 'Site Editor', badge: siteEditorEntries.length || undefined },
		{ id: 'preview-presets', label: 'Preview Presets', badge: previewPresets.length || undefined },
		{ id: 'assignments', label: 'Assignments', badge: state.project.themeAssignments.length || undefined },
		{ id: 'components', label: 'Components', badge: componentDocumentCount || undefined },
		{ id: 'import-diagnostics', label: 'Imports', badge: importWarnings.length || undefined },
	];
	$: shellLayout = createBuilderShellLayoutState( state.ui.shell, compactViewport, shellLayoutPreferences );
	$: syncWorkspacePaneState();
	$: if ( shellLayoutHydrated ) persistShellLayoutPreferences();
	$: if ( !newDocumentTitle.trim() ) newDocumentTitle = `Untitled ${ newDocumentKind.replaceAll( '-', ' ' ) }`;

	onMount( () => {
		unsubscribe = editor.subscribeSelector( ( nextState ) => nextState, ( nextState ) => { state = nextState; }, areCanvasStatesEqual, 'canvas' );
		unsubscribeAi = editor.subscribeAiSession( ( nextSession ) => { aiSession = nextSession; } );
		const workspaceMediaQuery = window.matchMedia( `(max-width: ${ compactWorkspaceBreakpoint }px)` );
		const handleWorkspaceMediaChange = () => {
			compactViewport = workspaceMediaQuery.matches;
		};
		handleWorkspaceMediaChange();
		shellLayoutPreferences = readBuilderShellLayoutPreferences();
		shellLayoutHydrated = true;
		applyPersistedShellChrome();
		workspaceMediaQuery.addEventListener( 'change', handleWorkspaceMediaChange );
		return () => {
			workspaceMediaQuery.removeEventListener( 'change', handleWorkspaceMediaChange );
			contextMenuAnchorCleanup();
			unsubscribe();
			unsubscribeAi();
		};
	} );

	function buildDocumentsById( documents: BuilderDocument[] ) {
		return new Map( documents.map( ( document ) => [ document.id, document ] ) );
	}

	function resolveSelectedNodeForChrome( nodeId?: string ) {
		return editor.getProjectNode( nodeId )?.node;
	}

	function areCanvasStatesEqual( left: BuilderEngineState, right: BuilderEngineState ) {
		return left.project === right.project
			&& left.activeDocumentId === right.activeDocumentId
			&& left.ui.selectedNodeIds[ 0 ] === right.ui.selectedNodeIds[ 0 ]
			&& left.ui.panel === right.ui.panel
			&& left.ui.mode === right.ui.mode
			&& left.ui.saveState === right.ui.saveState
			&& left.ui.shell.leftPanelPage === right.ui.shell.leftPanelPage
			&& left.ui.shell.panelCollapsed === right.ui.shell.panelCollapsed
			&& left.ui.shell.navigatorMode === right.ui.shell.navigatorMode
			&& left.ui.shell.navigatorOpen === right.ui.shell.navigatorOpen
			&& left.ui.shell.responsiveBarVisible === right.ui.shell.responsiveBarVisible
			&& left.ui.shell.appBarMenuOpen === right.ui.shell.appBarMenuOpen
			&& left.ui.contextMenu === right.ui.contextMenu
			&& left.ui.preview.pathname === right.ui.preview.pathname
			&& left.ui.preview.query === right.ui.preview.query
			&& left.ui.preview.slot === right.ui.preview.slot
			&& left.ui.preview.documentId === right.ui.preview.documentId
			&& left.ui.preview.assignmentId === right.ui.preview.assignmentId
			&& left.ui.preview.source === right.ui.preview.source
			&& left.ui.componentEditing.context === right.ui.componentEditing.context
			&& left.ui.componentEditing.componentDocumentId === right.ui.componentEditing.componentDocumentId;
	}

	function createElementCatalog( definitions: BuilderElementDefinition[] ) {
		const indexedDefinitions: IndexedElementDefinition[] = definitions.map( ( definition ) => ( {
			definition,
			searchText: `${ definition.label } ${ definition.type } ${ definition.category } ${ definition.icon ?? '' }`.toLowerCase(),
		} ) );
		const definitionByType = new Map( definitions.map( ( definition ) => [ definition.type, definition ] ) );
		const tileGroupCache = new Map<string, PanelTileGroup[]>();
		const categoryTabCache = new Map<string, PanelTabItem[]>();

		function getTileGroups( query: string, category: string ) {
			const normalizedQuery = query.trim().toLowerCase();
			const cacheKey = `${ normalizedQuery }::${ category }`;
			const cachedGroups = tileGroupCache.get( cacheKey );
			if ( cachedGroups ) {
				return cachedGroups;
			}

			const grouped = new Map<string, BuilderElementDefinition[]>();
			for ( const entry of indexedDefinitions ) {
				if ( normalizedQuery && !entry.searchText.includes( normalizedQuery ) ) {
					continue;
				}
				if ( category !== 'all' && entry.definition.category !== category ) {
					continue;
				}

				const bucket = grouped.get( entry.definition.category ) ?? [];
				bucket.push( entry.definition );
				grouped.set( entry.definition.category, bucket );
			}

			const groups = [ ...grouped.entries() ]
				.sort( ( left, right ) => compareElementCategories( left[ 0 ], right[ 0 ] ) )
					.map( ( [ nextCategory, entries ] ) => ( {
						id: nextCategory,
						label: formatCategoryLabel( nextCategory ),
						description: describeElementCategory( nextCategory, entries.length ),
						badge: entries.length,
						items: entries
						.sort( ( left, right ) => compareElementTiles( left, right ) )
						.map<PanelTileItem>( ( definition ) => ( {
							id: definition.type,
							label: definition.label,
							description: definition.type,
							icon: getElementTileIconLabel( definition ),
							draggable: true,
						} ) ),
				} ) );
			tileGroupCache.set( cacheKey, groups );
			return groups;
		}

		function getCategoryTabs( query: string ) {
			const normalizedQuery = query.trim().toLowerCase();
			const cachedTabs = categoryTabCache.get( normalizedQuery );
			if ( cachedTabs ) {
				return cachedTabs;
			}

			const groups = getTileGroups( normalizedQuery, 'all' );
			const total = groups.reduce( ( count, group ) => count + group.items.length, 0 );
			const tabs = [
				{ id: 'all', label: 'All', badge: total },
				...groups.map<PanelTabItem>( ( group ) => ( {
					id: group.id,
					label: group.label,
					badge: group.badge,
				} ) ),
			];
			categoryTabCache.set( normalizedQuery, tabs );
			return tabs;
		}

		return {
			definitionByType,
			getCategoryTabs,
			getTileGroups,
		};
	}

	function formatCategoryLabel( category: string ) {
		return category
			.split( '-' )
			.map( ( segment ) => segment.slice( 0, 1 ).toUpperCase() + segment.slice( 1 ) )
			.join( ' ' );
	}

	function describeElementCategory( category: string, count: number ) {
		switch ( category ) {
			case 'layout': return `${ count } structural elements for sections, grids, and spacing.`;
			case 'content': return `${ count } content elements for copy, lists, and supporting blocks.`;
			case 'media': return `${ count } media elements for imagery, galleries, and video.`;
			case 'interactive': return `${ count } interactive elements for actions, menus, and layered UI.`;
			case 'data': return `${ count } dynamic elements for loops and data-driven presentation.`;
			case 'form': return `${ count } form elements for inputs, fields, and submission.`;
			case 'legacy': return `${ count } compatibility elements kept for migration workflows.`;
			default: return `${ count } available elements.`;
		}
	}

	function compareElementCategories( left: string, right: string ) {
		const leftPriority = elementCategoryOrder.get( left ) ?? 100;
		const rightPriority = elementCategoryOrder.get( right ) ?? 100;
		if ( leftPriority !== rightPriority ) {
			return leftPriority - rightPriority;
		}

		return formatCategoryLabel( left ).localeCompare( formatCategoryLabel( right ) );
	}

	function compareElementTiles( left: BuilderElementDefinition, right: BuilderElementDefinition ) {
		const leftPriority = elementTileOrder.get( left.type ) ?? 100;
		const rightPriority = elementTileOrder.get( right.type ) ?? 100;
		if ( leftPriority !== rightPriority ) {
			return leftPriority - rightPriority;
		}

		const leftLabel = left.label.toLowerCase();
		const rightLabel = right.label.toLowerCase();
		if ( leftLabel !== rightLabel ) {
			return leftLabel.localeCompare( rightLabel );
		}

		return left.type.localeCompare( right.type );
	}

	function getElementTileIconLabel( definition: BuilderElementDefinition ) {
		switch ( definition.type ) {
			case 'container': return 'CT';
			case 'grid-container': return 'GC';
			case 'spacer': return 'SP';
			case 'divider': return 'DV';
			case 'blockquote': return 'BQ';
			case 'list': return 'LS';
			case 'icon-box': return 'IB';
			case 'social-icons': return 'SI';
			case 'tabs': return 'TB';
			case 'accordion': return 'AC';
			case 'toggle': return 'TG';
			case 'menu': return 'MN';
			case 'gallery': return 'GA';
			case 'carousel': return 'CR';
			case 'loop': return 'LP';
			case 'popup-root': return 'PP';
		}

		if ( definition.icon ) {
			return definition.icon.toUpperCase();
		}

		return definition.type.slice( 0, 2 ).toUpperCase();
	}

	function createDocumentFromToolbar() {
		editor.createDocument( newDocumentKind, newDocumentTitle.trim() || `Untitled ${ newDocumentKind }` );
		newDocumentTitle = `Untitled ${ newDocumentKind.replaceAll( '-', ' ' ) }`;
	}

	function focusDocumentRoot() { editor.focusBreadcrumb(); }

	function focusBreadcrumbIndex( index: number ) {
		if ( index < 0 ) return focusDocumentRoot();
		const crumb = state.ui.breadcrumbs[ index ];
		if ( crumb ) editor.focusBreadcrumb( crumb.nodeId );
	}

	function handleBreadcrumbKeydown( event: KeyboardEvent, index: number ) {
		if ( event.key === 'ArrowLeft' ) { event.preventDefault(); return focusBreadcrumbIndex( index - 1 ); }
		if ( event.key === 'ArrowRight' ) {
			const nextIndex = index + 1;
			if ( nextIndex < state.ui.breadcrumbs.length ) { event.preventDefault(); focusBreadcrumbIndex( nextIndex ); }
			return;
		}
		if ( event.key === 'Home' ) { event.preventDefault(); return focusDocumentRoot(); }
		if ( event.key === 'End' && state.ui.breadcrumbs.length ) { event.preventDefault(); return focusBreadcrumbIndex( state.ui.breadcrumbs.length - 1 ); }
		if ( event.altKey && event.key === 'ArrowUp' ) { event.preventDefault(); return editor.moveSelectedNodeBy( -1 ); }
		if ( event.altKey && event.key === 'ArrowDown' ) { event.preventDefault(); editor.moveSelectedNodeBy( 1 ); }
	}

	function describeMode( mode: EditorMode ) {
		switch ( mode ) {
			case 'layout': return 'Layout';
			case 'template': return 'Theme Builder';
			case 'component-master': return 'Component';
			case 'component-instance': return 'Component Instance';
			case 'popup': return 'Popup';
			case 'legacy-compat': return 'Legacy';
			default: return 'Page';
		}
	}

	function getSelectedNodeLabel( node: BuilderNode | undefined, definition?: BuilderElementDefinition ) {
		if ( !node ) {
			return '';
		}
		if ( node.name?.trim() ) {
			return node.name.trim();
		}
		if ( typeof node.props.title === 'string' && node.props.title.trim() ) {
			return node.props.title.trim();
		}
		if ( typeof node.props.text === 'string' && node.props.text.trim() ) {
			return node.props.text.trim().slice( 0, 32 );
		}
		return definition?.label ?? node.type;
	}

	function documentContainsLegacyCompat( nodes: BuilderNode[] ): boolean {
		for ( const node of nodes ) {
			if ( node.legacy ) return true;
			if ( node.children.length && documentContainsLegacyCompat( node.children ) ) return true;
			for ( const slotNodes of Object.values( node.slots ) as BuilderNode[][] ) if ( documentContainsLegacyCompat( slotNodes ) ) return true;
		}
		return false;
	}

	function inferDocumentMode( document: BuilderDocument ): EditorMode {
		if ( documentContainsLegacyCompat( document.root ) ) return 'legacy-compat';
		switch ( document.kind ) {
			case 'layout': return 'layout';
			case 'template': return 'template';
			case 'component': return 'component-master';
			case 'popup': return 'popup';
			default: return 'page';
		}
	}

	function inferAssignmentSlot( document: BuilderDocument ): ThemeAssignment['slot'] {
		const title = `${ document.title } ${ document.slug }`.toLowerCase();
		if ( document.kind === 'popup' ) return 'popup';
		if ( title.includes( 'footer' ) ) return 'footer';
		if ( title.includes( 'sidebar' ) ) return 'sidebar';
		if ( title.includes( 'modal' ) ) return 'modal';
		if ( title.includes( 'loop' ) || title.includes( 'archive item' ) ) return 'loop-item';
		if ( title.includes( 'empty' ) ) return 'empty';
		if ( document.kind === 'layout' ) return 'header';
		return 'page';
	}

	function inferPreviewPathname( document: BuilderDocument, slot: ThemeAssignment['slot'] ): string {
		if ( slot === 'page' ) return `/${ document.slug }`;
		if ( slot === 'popup' || slot === 'modal' ) return state.ui.preview.pathname;
		return '/[...all]';
	}

	function buildSiteEntryId( entry: BuilderDocument | ThemeAssignment ) {
		return 'slot' in entry ? `assignment:${ entry.id }` : `document:${ entry.id }`;
	}

	function buildAssignmentRoutePattern( value: string ) {
		return value.trim() ? [ { id: crypto.randomUUID(), operator: 'and' as const, rules: [ { id: crypto.randomUUID(), source: 'route' as const, path: 'pathname', operator: 'matches' as const, value: value.trim(), values: [] } ] } ] : [];
	}

	function applyPreviewContext( document: BuilderDocument, assignment?: ThemeAssignment ) {
		const slot = assignment?.slot ?? inferAssignmentSlot( document );
		const pathname = assignment?.pathname ?? inferPreviewPathname( document, slot );
		editor.setPreviewContext( { documentId: document.id, pathname, query: '', slot, assignmentId: assignment?.id, source: assignment ? 'assignment' : 'site-entry' } );
		editor.setSiteEditorEntry( buildSiteEntryId( assignment ?? document ) );
		editor.togglePreviewPopups( slot === 'popup' || slot === 'modal' || state.ui.preview.showPopups );
	}

	function openDocumentFromShell( documentId: string, mode?: EditorMode ) {
		const document = state.project.documents.find( ( entry ) => entry.id === documentId );
		if ( !document ) return;
		const assignment = state.project.themeAssignments.find( ( entry ) => entry.documentId === documentId );
		const slot = assignment?.slot ?? inferAssignmentSlot( document );
		const pathname = assignment?.pathname ?? inferPreviewPathname( document, slot );
		editor.openDocument( documentId, { mode: mode ?? inferDocumentMode( document ), pathname, query: '', slot, assignmentId: assignment?.id, siteEntryId: buildSiteEntryId( assignment ?? document ), source: assignment ? 'assignment' : 'site-entry' } );
		editor.togglePreviewPopups( slot === 'popup' || slot === 'modal' || state.ui.preview.showPopups );
	}

	function previewAssignment( assignment: ThemeAssignment ) {
		const document = documentsById.get( assignment.documentId );
		if ( document ) applyPreviewContext( document, assignment );
	}

	function openAssignment( assignment: ThemeAssignment ) {
		const document = documentsById.get( assignment.documentId );
		if ( !document ) return;
		editor.openDocument( document.id, { mode: inferDocumentMode( document ), pathname: assignment.pathname ?? inferPreviewPathname( document, assignment.slot ), query: '', slot: assignment.slot, assignmentId: assignment.id, siteEntryId: buildSiteEntryId( assignment ), source: 'assignment' } );
		editor.togglePreviewPopups( assignment.slot === 'popup' || assignment.slot === 'modal' || state.ui.preview.showPopups );
	}

	function createAssignmentFromShell( draft: { slot: ThemeAssignment['slot']; pathname?: string; priority: number; status: ThemeAssignment['status']; routePattern?: string } ) {
		const assignment = createThemeAssignment( { documentId: activeDocument.id, slot: draft.slot, priority: draft.priority, status: draft.status, pathname: draft.pathname, label: activeDocument.title } );
		assignment.conditionGroups = buildAssignmentRoutePattern( draft.routePattern ?? '' );
		editor.dispatch( { type: 'project/assignment/upsert', assignment } );
	}

	function updateAssignment( assignment: ThemeAssignment, patch: Partial<ThemeAssignment> ) {
		editor.dispatch( { type: 'project/assignment/upsert', assignment: { ...assignment, ...patch } } );
	}

	function updateAssignmentRoutePattern( assignment: ThemeAssignment, value: string ) {
		updateAssignment( assignment, { conditionGroups: buildAssignmentRoutePattern( value ) } );
	}

	function relinkSelectedComponentInstance( componentId: string, preserveOverrides = true ) {
		if ( selectedNode ) editor.relinkComponentInstance( selectedNode.id, componentId, preserveOverrides );
	}

	function openShellPage( page: BuilderShellPage ) { editor.setShellPage( page ); }

	function openInspectorTab( panel: BuilderPanel ) {
		editor.setShellPage( 'editor' );
		editor.setPanel( panel );
	}

	function focusElementInspector() {
		editor.toggleShellPanel( false );
		editor.setShellPage( 'editor' );
		if ( state.ui.panel !== 'content' && state.ui.panel !== 'style' && state.ui.panel !== 'advanced' ) {
			editor.setPanel( 'content' );
		}
	}

	function resolveInsertionTargetFromContextMenu() {
		const menuState = state.ui.contextMenu;
		const target = resolveContextMenuTarget( state, editor.registry );
		if ( menuState.targetKind === 'canvas-root' ) {
			return {
				documentId: menuState.documentId ?? state.activeDocumentId,
				targetParentId: undefined,
				targetSlot: menuState.slot,
				index: undefined as number | undefined,
			};
		}

		if ( !target.node || !target.location ) {
			return {
				documentId: menuState.documentId ?? state.activeDocumentId,
				targetParentId: undefined,
				targetSlot: undefined,
				index: undefined as number | undefined,
			};
		}

		if ( target.acceptsChildren ) {
			return {
				documentId: menuState.documentId ?? state.activeDocumentId,
				targetParentId: target.node.id,
				targetSlot: target.preferredSlot,
				index: undefined as number | undefined,
			};
		}

		return {
			documentId: menuState.documentId ?? state.activeDocumentId,
			targetParentId: target.location.parentId,
			targetSlot: target.location.slot,
			index: target.location.index + 1,
		};
	}

	function insertElementFromContextMenu( elementType: string ) {
		const definition = editor.registry.elements.get( elementType );
		if ( !definition ) {
			return;
		}

		const insertion = resolveInsertionTargetFromContextMenu();
		editor.dispatch( {
			type: 'document/elements/create',
			documentId: insertion.documentId,
			parentId: insertion.targetParentId,
			slot: insertion.targetSlot,
			index: insertion.index,
			node: definition.createDefaultNode(),
		} );
		editor.closeContextMenu();
	}

	function handleContextMenuAction( action: BuilderContextMenuAction ) {
		const menuState = state.ui.contextMenu;
		const target = resolveContextMenuTarget( state, editor.registry );
		const nodeId = menuState.nodeId ?? target.node?.id;
		switch ( action.id ) {
			case 'edit':
				if ( nodeId ) {
					editor.dispatch( { type: 'document/ui/select-node', nodeId } );
				}
				focusElementInspector();
				editor.closeContextMenu();
				return;
			case 'copy':
				if ( nodeId ) {
					editor.dispatch( { type: 'clipboard/copy', nodeIds: [ nodeId ] } );
				}
				editor.closeContextMenu();
				return;
			case 'paste': {
				const insertion = resolveInsertionTargetFromContextMenu();
				editor.dispatch( {
					type: 'clipboard/paste',
					documentId: insertion.documentId,
					targetParentId: insertion.targetParentId,
					targetSlot: insertion.targetSlot,
					index: insertion.index,
				} );
				editor.closeContextMenu();
				return;
			}
			case 'paste-style':
				if ( nodeId ) {
					editor.dispatch( {
						type: 'clipboard/paste-style',
						documentId: menuState.documentId,
						nodeIds: [ nodeId ],
					} );
				}
				editor.closeContextMenu();
				return;
			case 'duplicate':
				if ( target.location && target.node ) {
					editor.dispatch( {
						type: 'document/elements/duplicate',
						documentId: menuState.documentId ?? state.activeDocumentId,
						nodeId: target.node.id,
						targetParentId: target.location.parentId,
						targetSlot: target.location.slot,
						index: target.location.index + 1,
					} );
				}
				editor.closeContextMenu();
				return;
			case 'delete':
				if ( nodeId ) {
					editor.dispatch( {
						type: 'document/elements/delete',
						documentId: menuState.documentId ?? state.activeDocumentId,
						nodeId,
					} );
				}
				editor.closeContextMenu();
				return;
			case 'add-child':
				insertElementFromContextMenu( 'container' );
				return;
			case 'add-container':
				insertElementFromContextMenu( 'container' );
				return;
			case 'add-heading':
				insertElementFromContextMenu( 'heading' );
				return;
			case 'add-button':
				insertElementFromContextMenu( 'button' );
				return;
			case 'open-master':
				if ( target.node?.type === 'component-instance' ) {
					const componentId = String( target.node.props.componentId ?? '' );
					if ( componentId ) {
						openDocumentFromShell( componentId, 'component-master' );
					}
				}
				editor.closeContextMenu();
				return;
		}
	}

	function openGlobalTab( tab: 'classes' | 'variables' | 'components' | 'library' ) {
		editor.setShellPage( 'globals' );
		if ( tab === 'classes' ) {
			editor.setPanel( 'design-system' );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'classManagerOpen', open: true } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'variableManagerOpen', open: false } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'componentManagerOpen', open: false } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: false } );
			return;
		}
		if ( tab === 'variables' ) {
			editor.setPanel( 'design-system' );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'classManagerOpen', open: false } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'variableManagerOpen', open: true } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'componentManagerOpen', open: false } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: false } );
			return;
		}
		if ( tab === 'components' ) {
			editor.setPanel( 'components' );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'classManagerOpen', open: false } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'variableManagerOpen', open: false } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'componentManagerOpen', open: true } );
			editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: false } );
			return;
		}
		editor.setPanel( 'library' );
		editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'classManagerOpen', open: false } );
		editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'variableManagerOpen', open: false } );
		editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'componentManagerOpen', open: false } );
		editor.dispatch( { type: 'document/ui/toggle-manager', manager: 'libraryManagerOpen', open: true } );
	}

	function getActiveGlobalTab(): 'classes' | 'variables' | 'components' | 'library' {
		if ( state.ui.managers.variableManagerOpen ) return 'variables';
		if ( state.ui.panel === 'components' || state.ui.managers.componentManagerOpen ) return 'components';
		if ( state.ui.panel === 'library' || state.ui.managers.libraryManagerOpen ) return 'library';
		return 'classes';
	}

	function getPreviewFrame() {
		if ( previewSurfaceElement ) {
			return previewSurfaceElement;
		}

		return typeof document === 'undefined'
			? null
			: document.querySelector<HTMLElement>( '[data-builder-preview-surface="true"], iframe[title="Builder preview"]' );
	}

	function registerPreviewSurface( element?: HTMLElement ) {
		previewSurfaceElement = element;
	}

	function syncInteractionCoreDrag(
		clientX: number,
		clientY: number,
		mode: 'immediate' | 'queued' = 'queued',
	) {
		const nextState = resolveEditorDragLocation( editor.engine.getState(), clientX, clientY, getPreviewFrame() );
		if ( mode === 'immediate' ) {
			editor.setTransientDrag( nextState );
			return nextState;
		}

		editor.queueTransientDrag( nextState );
		return nextState;
	}

	type InteractionCoreDragOperation = {
		source?: {
			data?: unknown;
		} | null;
		position?: {
			current?: { x: number; y: number };
			initial?: { x: number; y: number };
		} | null;
	} | null;

	type InteractionCoreDragEvent = {
		operation?: InteractionCoreDragOperation;
		nativeEvent?: Event;
		canceled?: boolean;
	};

	function resolveInteractionCoreDragData( operation?: InteractionCoreDragOperation ) {
		const candidate = operation?.source?.data;
		return isBuilderDndData( candidate ) ? candidate : undefined;
	}

	function resolveInteractionCoreDragPoint( event: InteractionCoreDragEvent ): { clientX: number; clientY: number } | undefined {
		const nativePoint = resolveClientPoint( event.nativeEvent );
		if ( nativePoint ) {
			return nativePoint;
		}

		const currentPosition = event.operation?.position?.current;
		if ( currentPosition ) {
			return {
				clientX: currentPosition.x,
				clientY: currentPosition.y,
			};
		}

		const initialPosition = event.operation?.position?.initial;
		if ( initialPosition ) {
			return {
				clientX: initialPosition.x,
				clientY: initialPosition.y,
			};
		}

		return undefined;
	}

	function handleInteractionCoreDragStart( event: InteractionCoreDragEvent ) {
		const dragData = resolveInteractionCoreDragData( event.operation );
		if ( !dragData ) {
			return;
		}

		editor.closeContextMenu();
		const clientPoint = resolveInteractionCoreDragPoint( event );
		const pointerState = clientPoint
			? syncInteractionCoreDrag( clientPoint.clientX, clientPoint.clientY, 'immediate' )
			: {
				pointer: {
					x: 0,
					y: 0,
					inside: false,
					clientX: undefined,
					clientY: undefined,
				},
				dropTarget: undefined,
			};

		if ( dragData.descriptor.kind === 'palette-item' ) {
			editor.startElementDrag(
				dragData.descriptor.elementType,
				{ x: pointerState.pointer.x, y: pointerState.pointer.y },
				dragData.descriptor.documentId,
			);
		} else {
			editor.startNodeDrag(
				dragData.descriptor.nodeId,
				{ x: pointerState.pointer.x, y: pointerState.pointer.y },
				dragData.descriptor.documentId,
			);
		}

		if ( clientPoint ) {
			syncInteractionCoreDrag( clientPoint.clientX, clientPoint.clientY, 'immediate' );
		} else {
			editor.clearTransientDrag();
		}
	}

	function handleInteractionCoreDragMove( event: InteractionCoreDragEvent ) {
		const clientPoint = resolveInteractionCoreDragPoint( event );
		if ( !clientPoint || !editor.engine.getState().ui.dragSession ) {
			return;
		}

		syncInteractionCoreDrag( clientPoint.clientX, clientPoint.clientY );
	}

	function handleInteractionCoreDragEnd( event: InteractionCoreDragEvent ) {
		if ( !editor.engine.getState().ui.dragSession ) {
			return;
		}

		const clientPoint = resolveInteractionCoreDragPoint( event );
		if ( clientPoint ) {
			syncInteractionCoreDrag( clientPoint.clientX, clientPoint.clientY, 'immediate' );
		} else {
			editor.flushTransientDrag();
		}

		if ( event.canceled || !editor.engine.getState().ui.dropTarget ) {
			editor.cancelDrag();
			return;
		}

		editor.commitDrag();
	}

	function handleElementCategoryChange( categoryId: string ) {
		activeElementCategory = categoryId;
	}

	function handleMenuSectionChange( sectionId: string ) {
		activeMenuSection = sectionId;
	}

	function handleElementTilePointerDown( _group: PanelTileGroup, tile: PanelTileItem, event: PointerEvent ) {
		void _group;
		void tile;
		void event;
	}

	function insertElement( definition: BuilderElementDefinition ) {
		editor.dispatch( { type: 'document/elements/create', parentId: selectedNode?.id, node: definition.createDefaultNode() } );
		editor.setShellPage( 'editor' );
	}

	function handleElementTileClick( _group: PanelTileGroup, tile: PanelTileItem ) {
		const definition = elementDefinitionsByType.get( tile.id );
		if ( !definition ) {
			return;
		}

		insertElement( definition );
	}

	function openPreviewPreset( preset: PreviewPreset ) {
		editor.setPreviewContext( { pathname: preset.pathname, query: preset.query, source: 'manual' } );
	}

	function openPreviewPresetMenu() {
		activeMenuSection = 'preview-presets';
		editor.setShellPage( 'menu' );
	}

	function openSiteEditorEntry( entry: SiteEditorEntry ) {
		const document = documentsById.get( entry.documentId );
		if ( !document ) return;
		editor.openDocument( entry.documentId, { mode: inferDocumentMode( document ), pathname: entry.route, query: `siteEditor=${ entry.templateType }`, slot: entry.slot as ThemeAssignment['slot'], siteEntryId: entry.id, source: 'site-entry' } );
		editor.setSiteEditorEntry( entry.id );
		editor.setShellPage( 'menu' );
	}

	function getSaveLabel() {
		return state.ui.saveState === 'saving' || state.ui.saveState === 'autosaving'
			? 'Saving'
			: state.ui.saveState === 'publishing'
				? 'Publishing'
				: state.ui.saveState === 'published'
					? 'Published'
					: state.ui.saveState === 'conflict'
						? 'Conflict'
						: state.ui.saveState === 'error'
							? 'Retry Save'
							: 'Save Draft';
	}

	function resolveSaveStateTone( saveState: BuilderEngineState['ui']['saveState'] ): 'default' | 'accent' | 'success' | 'warning' | 'danger' {
		switch ( saveState ) {
			case 'saved':
			case 'published':
				return 'success';
			case 'conflict':
			case 'error':
				return 'danger';
			case 'autosaving':
			case 'saving':
			case 'publishing':
				return 'accent';
			default:
				return 'default';
		}
	}

	function syncWorkspacePaneState() {
		syncPaneSize( leftPanelPane, shellLayout.leftPanel.size );
		syncPaneSize( navigatorPane, shellLayout.navigator.dockedSize );
		syncPaneVisibility( leftPanelPane, shellLayout.leftPanel.visible );
		syncPaneVisibility( navigatorPane, shellLayout.navigator.dockedVisible );
	}

	function syncPaneVisibility( pane: PaneAPI | undefined, shouldBeExpanded: boolean ) {
		if ( !pane ) {
			return;
		}

		if ( shouldBeExpanded ) {
			if ( pane.isCollapsed() ) {
				pane.expand();
			}
			return;
		}

		if ( pane.isExpanded() ) {
			pane.collapse();
		}
	}

	function syncPaneSize( pane: PaneAPI | undefined, size: number ) {
		if ( !pane || pane.isCollapsed() ) {
			return;
		}

		if ( Math.abs( pane.getSize() - size ) < 0.25 ) {
			return;
		}

		pane.resize( size );
	}

	function applyPersistedShellChrome() {
		const persisted = shellLayoutPreferences;
		if ( persisted.panelCollapsed !== state.ui.shell.panelCollapsed ) {
			editor.toggleShellPanel( persisted.panelCollapsed );
		}
		if ( state.ui.shell.navigatorMode !== 'docked' ) {
			editor.setNavigatorMode( 'docked' );
		}
		if ( persisted.navigatorOpen !== state.ui.shell.navigatorOpen ) {
			editor.toggleNavigator( persisted.navigatorOpen );
		}
	}

	function persistShellLayoutPreferences() {
		writeBuilderShellLayoutPreferences( createPersistedShellLayoutPreferences( state.ui.shell, shellLayoutPreferences ) );
	}

	function handleLeftPanelResize( size: number ) {
		shellLayoutPreferences = {
			...shellLayoutPreferences,
			leftPanelSize: size,
		};
	}

	function handleNavigatorDockedResize( size: number ) {
		shellLayoutPreferences = {
			...shellLayoutPreferences,
			navigatorDockedSize: size,
		};
	}

	function openHtmlImportDialog() {
		htmlImportOpen = true;
		htmlImportStatus = 'idle';
		htmlImportMessage = '';
		htmlImportDiagnostics = [];
		htmlImportReview = undefined;
		if ( !htmlImportSourceName.trim() ) {
			htmlImportSourceName = htmlImportKind === 'html' ? 'Imported HTML' : 'Imported Template';
		}
	}

	function closeHtmlImportDialog() {
		if ( htmlImportStatus === 'importing' ) {
			return;
		}
		htmlImportOpen = false;
	}

	function resetImportReview() {
		htmlImportReview = undefined;
		htmlImportStatus = 'idle';
		htmlImportMessage = '';
		htmlImportDiagnostics = [];
	}

	async function handleImportStudioFile( event: Event ) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[ 0 ];
		if ( !file ) return;
		htmlImportSourceName = file.name;
		htmlImportMarkup = await file.text();
		htmlImportKind = file.name.toLowerCase().endsWith( '.json' ) ? 'json' : 'html';
		resetImportReview();
		input.value = '';
	}

	async function reviewImportFromDialog() {
		const source = htmlImportMarkup.trim();
		if ( !source ) {
			htmlImportStatus = 'error';
			htmlImportMessage = htmlImportKind === 'html' ? 'Paste HTML before importing.' : 'Paste template JSON before importing.';
			htmlImportDiagnostics = [];
			return;
		}

		htmlImportStatus = 'reviewing';
		htmlImportMessage = 'Parsing import for review';
		htmlImportDiagnostics = [];
		htmlImportReview = undefined;
		try {
			htmlImportReview = htmlImportKind === 'html'
				? await editor.reviewHtmlTemplate( {
					html: source,
					sourceName: htmlImportSourceName.trim() || 'Imported HTML',
				} )
				: await editor.reviewTemplatesFromJson( JSON.parse( source ) as unknown, {
					sourceName: htmlImportSourceName.trim() || 'Imported Template',
				} );
			htmlImportStatus = 'ready';
			htmlImportMessage = `Ready to import ${ htmlImportReview.summary.documentCount } document${ htmlImportReview.summary.documentCount === 1 ? '' : 's' } with ${ htmlImportReview.summary.nodeCount ?? 0 } node${ htmlImportReview.summary.nodeCount === 1 ? '' : 's' }.`;
			htmlImportDiagnostics = getImportReviewDiagnostics( htmlImportReview );
		} catch ( error ) {
			htmlImportStatus = 'error';
			htmlImportMessage = error instanceof Error ? error.message : 'Import review failed.';
			htmlImportDiagnostics = [];
		}
	}

	async function importReviewedFromDialog() {
		if ( !htmlImportReview ) {
			await reviewImportFromDialog();
			if ( !htmlImportReview ) return;
		}

		htmlImportStatus = 'importing';
		htmlImportMessage = 'Importing reviewed content';
		try {
			const result = await editor.commitTemplateImportReview( htmlImportReview, {
				destination: htmlImportDestination,
				activeDocumentId: activeDocument.id,
			} );
			htmlImportResult = result;
			htmlImportStatus = 'success';
			htmlImportMessage = getImportSuccessMessage( result, htmlImportDestination );
			htmlImportDiagnostics = getImportResultDiagnostics( result );
			htmlImportOpen = false;
			htmlImportMarkup = '';
			htmlImportReview = undefined;
		} catch ( error ) {
			htmlImportStatus = 'error';
			htmlImportMessage = error instanceof Error ? error.message : 'Import failed.';
		}
	}

	function getImportSuccessMessage( result: Omit<TemplateImportResult, 'project'>, destination: TemplateImportDestination ) {
		if ( destination === 'active-page' ) {
			return `Inserted ${ result.summary.nodeCount ?? 0 } imported node${ result.summary.nodeCount === 1 ? '' : 's' } into the active page.`;
		}
		if ( destination === 'new-page' ) {
			return `Imported ${ result.summary.documentCount } page document${ result.summary.documentCount === 1 ? '' : 's' } from ${ result.summary.sourceName }.`;
		}
		return `Imported ${ result.summary.libraryItemCount } library item${ result.summary.libraryItemCount === 1 ? '' : 's' } from ${ result.summary.sourceName }.`;
	}

	function getImportReviewDiagnostics( review: TemplateImportReviewResult ) {
		return [
			...review.warnings,
			...review.parityGaps,
			...review.assets.filter( ( asset ) => asset.kind === 'font' || asset.kind === 'external' ).map( ( asset ) => ( {
				severity: 'info',
				message: `External ${ asset.kind } URL will be preserved: ${ asset.value }`,
				sourceKey: asset.sourceKey,
			} ) ),
		].map( ( diagnostic ) => ( {
			severity: diagnostic.severity ?? 'warning',
			message: diagnostic.message,
			sourceKey: diagnostic.sourceKey,
		} ) );
	}

	function getImportResultDiagnostics( result: Omit<TemplateImportResult, 'project'> ) {
		return [ ...result.warnings, ...result.parityGaps ].map( ( diagnostic ) => ( {
			severity: diagnostic.severity ?? 'warning',
			message: diagnostic.message,
			sourceKey: diagnostic.sourceKey,
		} ) );
	}

	function flattenImportStructure( nodes: TemplateImportStructureNode[], depth = 0 ): Array<TemplateImportStructureNode & { depth: number }> {
		return nodes.flatMap( ( node ) => [
			{ ...node, depth },
			...flattenImportStructure( node.children, depth + 1 ),
		] );
	}

	function toggleAiMenu() {
		aiMenuOpen = !aiMenuOpen;
	}

	async function openAiSettingsDialog() {
		aiMenuOpen = false;
		aiSettingsOpen = true;
		aiSettingsStatus = 'loading';
		aiSettingsMessage = '';
		try {
			aiSettingsForm = await editor.getAiSettings();
			aiCustomHeaders = JSON.stringify( aiSettingsForm.headers ?? {}, null, 2 );
			aiSettingsStatus = 'idle';
		} catch ( error ) {
			aiSettingsStatus = 'error';
			aiSettingsMessage = error instanceof Error ? error.message : 'Unable to load AI settings.';
		}
	}

	function closeAiSettingsDialog() {
		if ( aiSettingsStatus === 'saving' ) return;
		aiSettingsOpen = false;
	}

	function applyAiProviderPreset( provider: BuilderAiProviderPreset ) {
		const preset = builderAiProviderPresets[ provider ];
		aiSettingsForm = {
			...aiSettingsForm,
			provider,
			baseUrl: preset.baseUrl,
			model: preset.model,
		};
	}

	async function saveAiSettingsFromDialog() {
		aiSettingsStatus = 'saving';
		aiSettingsMessage = '';
		try {
			const headers = aiCustomHeaders.trim() ? JSON.parse( aiCustomHeaders ) as Record<string, string> : {};
			aiSettingsForm = createDefaultAiSettings( {
				...aiSettingsForm,
				headers,
				temperature: Number( aiSettingsForm.temperature ),
				maxOutputTokens: Number( aiSettingsForm.maxOutputTokens ),
			} );
			await editor.saveAiSettings( aiSettingsForm );
			aiSettingsStatus = 'success';
			aiSettingsMessage = 'AI settings saved.';
			aiSettingsOpen = false;
		} catch ( error ) {
			aiSettingsStatus = 'error';
			aiSettingsMessage = error instanceof Error ? error.message : 'Unable to save AI settings.';
		}
	}

	function openAiCreateDialog() {
		aiMenuOpen = false;
		aiCreateOpen = true;
		if ( !aiCreatePrompt.trim() ) {
			aiCreatePrompt = '';
		}
	}

	function closeAiCreateDialog() {
		if ( aiSession.status === 'streaming' || aiSession.status === 'applying' ) return;
		aiCreateOpen = false;
	}

	async function runAiCreate() {
		const prompt = aiCreatePrompt.trim();
		if ( !prompt ) return;
		await editor.startAiCreate( {
			prompt,
			targetParentId: aiCreateTarget === 'selected' ? selectedNode?.id : undefined,
			designStyle: aiCreateDesignStyle,
			overwriteThemeSettings: aiCreateOverwriteTheme,
		} );
		const nextAiSession = editor.getAiSession();
		const hasDebugTrace = nextAiSession.messages.some( ( message ) => message.toolName === 'debug' );
		if ( nextAiSession.status !== 'error' && !hasDebugTrace ) {
			aiCreateOpen = false;
			aiCreatePrompt = '';
		}
	}

	function startAiEditMode() {
		aiMenuOpen = false;
		editor.startAiEdit();
	}

	async function sendAiChatMessage() {
		const message = aiChatDraft.trim();
		if ( !message ) return;
		aiChatDraft = '';
		await editor.sendAiMessage( message );
	}

	function handleAiChatKeydown( event: KeyboardEvent ) {
		if ( event.key === 'Enter' && !event.shiftKey ) {
			event.preventDefault();
			void sendAiChatMessage();
		}
	}
</script>

<EditorShellTokens>
	<DragDropProvider
		onDragStart={handleInteractionCoreDragStart}
		onDragMove={handleInteractionCoreDragMove}
		onDragEnd={handleInteractionCoreDragEnd}
	>
	<div class="builder-shell">
		<header class="builder-shell__appbar">
			<div class="builder-shell__appbar-left">
				<button type="button" class="builder-shell-icon-button builder-shell-button--dark" aria-label="Toggle panel" title="Toggle panel" onclick={() => editor.toggleShellPanel()}>
					<EditorShellIcon name="menu" title="Toggle panel" />
				</button>
				<button type="button" class="builder-shell__exit">Exit To Dashboard</button>
				<div class="builder-shell__document-meta">
					<span class="builder-shell__document-kicker">{describeMode( state.ui.mode )}</span>
					<strong>{activeDocument.title}</strong>
				</div>
			</div>

			<div class="builder-shell__appbar-center">
				<div class="builder-shell__context-summary" aria-label="Preview context">
					<span class="builder-shell__context-route">{state.ui.preview.pathname || '/'}</span>
					{#if state.ui.preview.query}
						<span class="builder-shell__context-query">?{state.ui.preview.query}</span>
					{/if}
					{#if state.ui.preview.slot}
						<span class="builder-shell__context-chip">{state.ui.preview.slot}</span>
					{/if}
				</div>
			</div>

			<div class="builder-shell__appbar-right">
				<button type="button" class="builder-shell-icon-button builder-shell-button--dark" aria-label="Responsive" title="Responsive" data-inline-edit-preserve-focus="true" onclick={() => editor.toggleResponsiveBar( state.ui.viewport === 'desktop' )}>
					<EditorShellIcon name="responsive" title="Responsive" />
				</button>
				<button type="button" class="builder-shell-icon-button builder-shell-button--dark" aria-label={shellLayout.navigator.open ? 'Hide Structure' : 'Show Structure'} title={shellLayout.navigator.open ? 'Hide Structure' : 'Show Structure'} onclick={() => editor.toggleNavigator()}>
					<EditorShellIcon name="navigator" title={shellLayout.navigator.open ? 'Hide Structure' : 'Show Structure'} />
				</button>
				<button type="button" class="builder-shell-toolbar-button builder-shell-button--dark" onclick={openHtmlImportDialog}>Import HTML</button>
				{#if canUseAi}
					<div class="builder-shell__ai-menu-wrap">
						<button type="button" class="builder-shell-toolbar-button builder-shell-button--dark" aria-haspopup="menu" aria-expanded={aiMenuOpen} onclick={toggleAiMenu}>AI</button>
						{#if aiMenuOpen}
							<div class="builder-shell__ai-menu" role="menu">
								<button type="button" role="menuitem" onclick={openAiCreateDialog}>+ Create with AI</button>
								<button type="button" role="menuitem" onclick={startAiEditMode}>Edit with AI</button>
								<button type="button" role="menuitem" onclick={openAiSettingsDialog}>Settings</button>
							</div>
						{/if}
					</div>
				{:else}
					<button type="button" class="builder-shell-toolbar-button builder-shell-button--dark" disabled title={aiPermissionReason}>AI disabled</button>
				{/if}
				<button type="button" class="builder-shell-toolbar-button builder-shell-button--dark" onclick={() => editor.toggleAppBarMenu()}>Menu</button>
				<button type="button" class="builder-shell-toolbar-button builder-shell-button--light" disabled={!canEditProject} title={canEditProject ? getSaveLabel() : editor.getPermission( 'editProject' ).reason ?? 'Editing is disabled by this host.'} onclick={() => editor.saveDraft()}>{getSaveLabel()}</button>
				<button type="button" class="builder-shell-toolbar-button builder-shell-button--publish" disabled={!canPublish} title={canPublish ? 'Publish' : publishPermissionReason} onclick={() => editor.publish()}>Publish</button>
			</div>

			{#if state.ui.shell.appBarMenuOpen}
				<div class="builder-shell__appbar-menu">
					<div>
						<p class="builder-shell__menu-label">Document</p>
						<select class="builder-shell-select" value={state.activeDocumentId} onchange={(event) => openDocumentFromShell( ( event.currentTarget as HTMLSelectElement ).value )}>
							{#each state.project.documents as document (document.id)}
								<option value={document.id}>{document.kind}: {document.title}</option>
							{/each}
						</select>
					</div>
					<div class="builder-shell__menu-grid">
						<label class="builder-shell__context-field">
							<span>Route</span>
							<input value={state.ui.preview.pathname} oninput={(event) => editor.dispatch( { type: 'document/ui/set-preview-path', pathname: ( event.currentTarget as HTMLInputElement ).value } )} />
						</label>
						<label class="builder-shell__context-field builder-shell__context-field--query">
							<span>Query</span>
							<input value={state.ui.preview.query} oninput={(event) => editor.dispatch( { type: 'document/ui/set-preview-query', query: ( event.currentTarget as HTMLInputElement ).value } )} />
						</label>
					</div>
					<div>
						<p class="builder-shell__menu-label">Mode</p>
						<select class="builder-shell-select" value={state.ui.mode} onchange={(event) => editor.dispatch( { type: 'document/ui/set-mode', mode: ( event.currentTarget as HTMLSelectElement ).value as EditorMode } )}>
							{#each modes as mode}
								<option value={mode}>{mode}</option>
							{/each}
						</select>
					</div>
					<div>
						<p class="builder-shell__menu-label">Create document</p>
						<div class="builder-shell__menu-row">
							<select class="builder-shell-select" bind:value={newDocumentKind}>
								{#each creatableKinds as kind}
									<option value={kind}>{kind}</option>
								{/each}
							</select>
							<input class="builder-shell-input" bind:value={newDocumentTitle} aria-label="New document title" />
							<button type="button" class="builder-shell-button builder-shell-button--light" onclick={createDocumentFromToolbar}>Create</button>
						</div>
					</div>
					<div class="builder-shell__menu-actions">
						<button type="button" class="builder-shell-button builder-shell-button--light" onclick={() => editor.undo()}>Undo</button>
						<button type="button" class="builder-shell-button builder-shell-button--light" onclick={() => editor.redo()}>Redo</button>
						<button type="button" class="builder-shell-button builder-shell-button--light" onclick={() => editor.toggleRevisionBrowser( true )}>Open Revisions</button>
					</div>
				</div>
			{/if}
		</header>

		{#if state.ui.saveState === 'conflict' || state.ui.saveState === 'error'}
			<div class={`builder-shell__save-banner builder-shell__save-banner--${state.ui.saveState}`} role="status">
				<div>
					<strong>{state.ui.saveState === 'conflict' ? 'Save conflict' : 'Save failed'}</strong>
					<span>{state.ui.saveState === 'conflict' ? 'The project changed elsewhere. Keep editing, reload the server copy, or overwrite with this draft.' : 'The last save did not complete. Your local edits are still in the editor.'}</span>
				</div>
				<div class="builder-shell__save-banner-actions">
					{#if state.ui.saveState === 'conflict'}
						<button type="button" onclick={() => editor.resolveSaveConflict( 'keep-local' )}>Keep local</button>
						<button type="button" onclick={() => editor.resolveSaveConflict( 'reload' )}>Reload server</button>
						<button type="button" onclick={() => editor.resolveSaveConflict( 'overwrite' )}>Overwrite</button>
					{:else}
						<button type="button" onclick={() => editor.saveDraft()}>Retry save</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if htmlImportOpen}
			<div class="builder-shell__modal-backdrop" role="presentation">
				<div class="builder-shell__html-import-dialog" role="dialog" aria-modal="true" aria-labelledby="html-import-title">
					<header class="builder-shell__html-import-header">
						<div>
							<p class="builder-shell__menu-label">Conversion Studio</p>
							<h2 id="html-import-title">Review Import</h2>
						</div>
						<button type="button" class="builder-shell-icon-button builder-shell-button--dark" aria-label="Close Import HTML" title="Close" onclick={closeHtmlImportDialog}>x</button>
					</header>
					<div class="builder-shell__import-steps" aria-label="Import steps">
						<span class:builder-shell__import-step--active={!htmlImportReview}>1 Input</span>
						<span class:builder-shell__import-step--active={Boolean( htmlImportReview )}>2 Preview</span>
						<span class:builder-shell__import-step--active={htmlImportStatus === 'ready'}>3 Destination</span>
					</div>
					<div class="builder-shell__import-mode-row">
						<label>
							<span>Source type</span>
							<select bind:value={htmlImportKind} onchange={resetImportReview}>
								<option value="html">HTML / CSS</option>
								<option value="json">Template JSON</option>
							</select>
						</label>
						<label>
							<span>Upload file</span>
							<input type="file" accept=".html,.htm,.json,text/html,application/json" onchange={handleImportStudioFile} />
						</label>
					</div>
					<label class="builder-shell__context-field">
						<span>Source name</span>
						<input bind:value={htmlImportSourceName} placeholder={htmlImportKind === 'html' ? 'Landing page' : 'template.json'} oninput={resetImportReview} />
					</label>
					<label class="builder-shell__context-field">
						<span>{htmlImportKind === 'html' ? 'HTML and CSS' : 'Template JSON'}</span>
						<textarea
							class="builder-shell__html-import-textarea"
							bind:value={htmlImportMarkup}
							oninput={resetImportReview}
							placeholder={htmlImportKind === 'html' ? 'Paste a full HTML document or fragment with style tags here' : 'Paste Elementor JSON or Builder package JSON here'}
						></textarea>
					</label>
					<div class="builder-shell__import-options">
						<label><input type="checkbox" checked disabled /> Preserve raw CSS</label>
						<label><input type="checkbox" checked disabled /> Convert common CSS to editable styles</label>
						<label><input type="checkbox" checked disabled /> Import editable nodes where possible</label>
						<label><input type="checkbox" checked disabled /> Fallback unknown blocks to HTML</label>
					</div>
					{#if htmlImportReview}
						<section class="builder-shell__import-review" aria-label="Parsed import preview">
							<div class="builder-shell__import-summary-grid">
								<div><span>Title</span><strong>{htmlImportReview.sourceName}</strong></div>
								<div><span>Type</span><strong>{htmlImportReview.source}</strong></div>
								<div><span>Documents</span><strong>{htmlImportReview.summary.documentCount}</strong></div>
								<div><span>Nodes</span><strong>{htmlImportReview.summary.nodeCount ?? 0}</strong></div>
								<div><span>Assets</span><strong>{htmlImportReview.summary.assetCount ?? 0}</strong></div>
								<div><span>CSS blocks</span><strong>{htmlImportReview.summary.cssBlockCount ?? 0}</strong></div>
							</div>
							<label class="builder-shell__context-field">
								<span>Destination</span>
								<select bind:value={htmlImportDestination}>
									<option value="library">Library Item</option>
									<option value="active-page">Insert into active page</option>
									<option value="new-page">New page document</option>
								</select>
							</label>
							<div class="builder-shell__import-preview-grid">
								<div>
									<h3>Structure</h3>
									<ul class="builder-shell__import-tree">
										{#each flattenImportStructure( htmlImportReview.structure ).slice( 0, 80 ) as node (`${node.id}-${node.depth}`)}
											<li style={`--depth:${node.depth}`}>
												<span class:builder-shell__import-tree-fallback={node.fallback}>{node.type}</span>
												<em>{node.label}</em>
											</li>
										{/each}
									</ul>
								</div>
								<div>
									<h3>Assets</h3>
									{#if htmlImportReview.assets.length}
										<ul class="builder-shell__import-asset-list">
											{#each htmlImportReview.assets.slice( 0, 8 ) as asset (`${asset.kind}-${asset.value}`)}
												<li><strong>{asset.kind}</strong><span>{asset.value}</span></li>
											{/each}
										</ul>
									{:else}
										<p class="builder-shell__import-muted">No external assets detected.</p>
									{/if}
								</div>
							</div>
							{#if htmlImportReview.cssBlocks.length}
								<details class="builder-shell__import-details">
									<summary>Imported CSS / custom CSS</summary>
									{#each htmlImportReview.cssBlocks.slice( 0, 4 ) as block (`${block.label}-${block.css.length}`)}
										<h4>{block.label}</h4>
										<pre>{block.css.slice( 0, 1600 )}</pre>
									{/each}
								</details>
							{/if}
						</section>
					{/if}
					{#if htmlImportMessage}
						<div class={`builder-shell__html-import-status builder-shell__html-import-status--${htmlImportStatus}`}>
							{htmlImportMessage}
						</div>
					{/if}
					{#if htmlImportDiagnostics.length}
						<ul class="builder-shell__warning-list">
							{#each htmlImportDiagnostics.slice( 0, 8 ) as diagnostic, index (`html-import-${index}-${diagnostic.message}`)}
								<li><strong>{diagnostic.severity}</strong> {diagnostic.message}{#if diagnostic.sourceKey} <span>{diagnostic.sourceKey}</span>{/if}</li>
							{/each}
						</ul>
					{/if}
					<footer class="builder-shell__html-import-actions">
						<button type="button" class="builder-shell-button builder-shell-button--dark" onclick={closeHtmlImportDialog}>Cancel</button>
						<button type="button" class="builder-shell-button builder-shell-button--light" disabled={htmlImportStatus === 'reviewing' || htmlImportStatus === 'importing'} onclick={reviewImportFromDialog}>
							{htmlImportStatus === 'reviewing' ? 'Reviewing' : 'Review'}
						</button>
						<button type="button" class="builder-shell-button builder-shell-button--publish" disabled={htmlImportStatus === 'reviewing' || htmlImportStatus === 'importing' || !htmlImportReview} onclick={importReviewedFromDialog}>
							{htmlImportStatus === 'importing' ? 'Importing' : 'Import'}
						</button>
					</footer>
				</div>
			</div>
		{/if}

		{#if aiSettingsOpen}
			<div class="builder-shell__modal-backdrop" role="presentation">
				<div class="builder-shell__html-import-dialog builder-shell__ai-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
					<header class="builder-shell__html-import-header">
						<div>
							<p class="builder-shell__menu-label">AI Assistant</p>
							<h2 id="ai-settings-title">AI Settings</h2>
						</div>
						<button type="button" class="builder-shell-icon-button builder-shell-button--dark" aria-label="Close AI Settings" title="Close" onclick={closeAiSettingsDialog}>x</button>
					</header>
					<label class="builder-shell__context-field">
						<span>Default prompt / system instructions</span>
						<textarea class="builder-shell__html-import-textarea builder-shell__ai-system-textarea" bind:value={aiSettingsForm.systemInstructions} placeholder="Instructions prepended to every AI request"></textarea>
					</label>
					<div class="builder-shell__modal-divider"></div>
					<label class="builder-shell__context-field">
						<span>AI provider</span>
						<select bind:value={aiSettingsForm.provider} onchange={(event) => applyAiProviderPreset( ( event.currentTarget as HTMLSelectElement ).value as BuilderAiProviderPreset )}>
							{#each Object.entries( builderAiProviderPresets ) as [provider, preset] (provider)}
								<option value={provider}>{preset.label}</option>
							{/each}
						</select>
					</label>
					<label class="builder-shell__context-field">
						<span>API endpoint</span>
						<input bind:value={aiSettingsForm.baseUrl} placeholder="https://api.openai.com/v1" />
					</label>
					<label class="builder-shell__context-field">
						<span>Model name</span>
						<input bind:value={aiSettingsForm.model} placeholder="gpt-4.1-mini" />
					</label>
					<label class="builder-shell__context-field">
						<span>API key</span>
						<input type="password" bind:value={aiSettingsForm.apiKey} placeholder="Stored locally in this browser" />
					</label>
					<div class="builder-shell__ai-settings-grid">
						<label class="builder-shell__context-field">
							<span>Temperature</span>
							<input type="number" min="0" max="2" step="0.1" bind:value={aiSettingsForm.temperature} />
						</label>
						<label class="builder-shell__context-field">
							<span>Max output tokens</span>
							<input type="number" min="256" step="256" bind:value={aiSettingsForm.maxOutputTokens} />
						</label>
					</div>
					<label class="builder-shell__context-field">
						<span>Optional headers (JSON)</span>
						<textarea class="builder-shell__html-import-textarea builder-shell__ai-headers-textarea" bind:value={aiCustomHeaders} placeholder="Optional headers JSON"></textarea>
					</label>
					<label class="builder-shell__check-row">
						<input type="checkbox" bind:checked={aiSettingsForm.debugMode} />
						<span>Debug mode</span>
					</label>
					{#if aiSettingsMessage}
						<div class={`builder-shell__html-import-status builder-shell__html-import-status--${aiSettingsStatus}`}>
							{aiSettingsMessage}
						</div>
					{/if}
					<footer class="builder-shell__html-import-actions">
						<button type="button" class="builder-shell-button builder-shell-button--dark" onclick={closeAiSettingsDialog}>Cancel</button>
						<button type="button" class="builder-shell-button builder-shell-button--publish" disabled={aiSettingsStatus === 'saving'} onclick={saveAiSettingsFromDialog}>
							{aiSettingsStatus === 'saving' ? 'Saving' : 'Save Settings'}
						</button>
					</footer>
				</div>
			</div>
		{/if}

		{#if aiCreateOpen}
			<div class="builder-shell__modal-backdrop" role="presentation">
				<div class="builder-shell__html-import-dialog builder-shell__ai-create-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-create-title">
					<header class="builder-shell__html-import-header">
						<div>
							<p class="builder-shell__menu-label">AI Assistant</p>
							<h2 id="ai-create-title">Create with AI</h2>
						</div>
						<button type="button" class="builder-shell-icon-button builder-shell-button--dark" aria-label="Close Create with AI" title="Close" onclick={closeAiCreateDialog}>x</button>
					</header>
					<label class="builder-shell__context-field">
						<span>What would you like to create?</span>
						<textarea class="builder-shell__html-import-textarea builder-shell__ai-create-textarea" bind:value={aiCreatePrompt} placeholder="Create a hero section with a heading, supporting copy, and call-to-action button"></textarea>
					</label>
					<div class="builder-shell__ai-settings-grid">
						<label class="builder-shell__context-field">
							<span>Target location</span>
							<select bind:value={aiCreateTarget}>
								<option value="auto">Auto (selected container or page root)</option>
								<option value="selected" disabled={!selectedNode}>Selected element</option>
								<option value="root">Page root</option>
							</select>
						</label>
						<label class="builder-shell__context-field">
							<span>Design style</span>
							<select bind:value={aiCreateDesignStyle}>
								<option value="auto">Auto (varied)</option>
								<option value="minimal">Minimal</option>
								<option value="bold">Bold editorial</option>
								<option value="saas">SaaS product</option>
								<option value="landing">Landing page</option>
							</select>
						</label>
					</div>
					<label class="builder-shell__check-row">
						<input type="checkbox" bind:checked={aiCreateOverwriteTheme} />
						<span>Overwrite theme settings</span>
					</label>
					{#if aiSession.mode === 'create' && aiSession.status !== 'idle'}
						<div class={`builder-shell__html-import-status builder-shell__html-import-status--${aiSession.status === 'error' ? 'error' : 'importing'}`}>
							{aiSession.error ?? aiSession.lastToolSummary ?? 'Creating with AI'}
						</div>
					{/if}
					{#if aiSession.mode === 'create' && aiSession.messages.some( ( message ) => message.toolName === 'debug' )}
						<section class="builder-shell__ai-debug-panel" aria-label="AI debug output">
							{#each aiSession.messages.filter( ( message ) => message.toolName === 'debug' ) as message (message.id)}
								<article class="builder-shell__ai-message builder-shell__ai-message--system">
									<div class="builder-shell__ai-message-role">debug</div>
									<pre>{message.content}</pre>
								</article>
							{/each}
						</section>
					{/if}
					<footer class="builder-shell__html-import-actions">
						<button type="button" class="builder-shell-button builder-shell-button--dark" onclick={closeAiCreateDialog}>Cancel</button>
						<button type="button" class="builder-shell-button builder-shell-button--publish" disabled={aiSession.status === 'streaming' || aiSession.status === 'applying' || !aiCreatePrompt.trim()} onclick={runAiCreate}>
							{aiSession.status === 'streaming' || aiSession.status === 'applying' ? 'Generating' : 'Generate'}
						</button>
					</footer>
				</div>
			</div>
		{/if}

		<PaneGroup direction="horizontal" class={`builder-shell__workspace ${ shellLayout.leftPanel.collapsed ? 'builder-shell__workspace--panel-collapsed' : '' } ${ shellLayout.navigator.dockedVisible ? 'builder-shell__workspace--navigator-docked' : '' }`}>
		<Pane bind:this={leftPanelPane} collapsible collapsedSize={0} defaultSize={shellLayout.leftPanel.size} minSize={shellLayout.leftPanel.minSize} onResize={handleLeftPanelResize} order={0} class={`builder-shell__panel ${ shellLayout.leftPanel.collapsed ? 'builder-shell__panel--collapsed' : '' }`} aria-label="Builder panel">
			<div class={`builder-shell__panel-surface ${ shellLayout.leftPanel.collapsed ? 'builder-shell__panel-surface--collapsed' : '' }`}>
			<header class="builder-shell__panel-header">
				<button type="button" class="builder-shell__panel-header-button" aria-label="Menu" title="Menu" onclick={() => openShellPage( 'menu' )}>
					<EditorShellIcon name="menu" title="Menu" />
				</button>
				<div class="builder-shell__panel-header-copy">
					<p class="builder-shell__panel-kicker">{panelHeaderKicker}</p>
					<h2>{panelHeaderTitle}</h2>
				</div>
				{#if aiSession.mode === 'edit'}
					<button type="button" class="builder-shell__panel-header-button builder-shell__ai-exit-button" aria-label="Exit AI mode" title="Exit AI mode" onclick={() => editor.stopAiEdit()}>
						Exit
					</button>
				{:else}
					<button type="button" class="builder-shell__panel-header-button" aria-label="Elements Panel" title="Elements Panel" onclick={() => openShellPage( 'elements' )}>
						<EditorShellIcon name="elements" title="Elements Panel" />
					</button>
				{/if}
			</header>

				<nav class="builder-shell__panel-pages" aria-label="Panel pages">
					{#each shellPages as page (page.id)}
						<button
							type="button"
							class:active={state.ui.shell.leftPanelPage === page.id}
							aria-label={page.label}
							title={page.label}
							onclick={() => openShellPage( page.id )}
						>
							<EditorShellIcon name={shellPageIcons[page.id]} title={page.label} />
						</button>
					{/each}
				</nav>

			<div class:builder-shell__panel-body--editor={state.ui.shell.leftPanelPage === 'editor' || aiSession.mode === 'edit'} class="builder-shell__panel-body">
				{#if aiSession.mode === 'edit'}
					<div class="builder-shell__panel-scroll builder-shell__ai-history">
						<section aria-label="AI chat history">
							{#each aiSession.messages as message (message.id)}
								<article class={`builder-shell__ai-message builder-shell__ai-message--${message.role}`}>
									<div class="builder-shell__ai-message-role">{message.toolName ?? message.role}</div>
									{#if message.toolName === 'debug'}
										<pre>{message.content}</pre>
									{:else}
										<p>{message.content}</p>
									{/if}
								</article>
							{/each}
							{#if aiSession.status === 'streaming' || aiSession.status === 'applying'}
								<article class="builder-shell__ai-message builder-shell__ai-message--assistant">
									<div class="builder-shell__ai-message-role">{aiSession.status}</div>
									<p>{aiSession.status === 'applying' ? 'Applying builder changes...' : 'Thinking through the next edit...'}</p>
								</article>
							{/if}
							{#if aiSession.error}
								<article class="builder-shell__ai-message builder-shell__ai-message--error">
									<div class="builder-shell__ai-message-role">error</div>
									<p>{aiSession.error}</p>
								</article>
							{/if}
						</section>
					</div>
				{:else if state.ui.shell.leftPanelPage === 'elements'}
					<div class="builder-shell__panel-scroll">
						<section aria-label="Element palette">
							<ElementsPanel
								title="Elements"
								subtitle="Drag to the canvas or click to insert."
								showHeader={false}
								searchValue={elementSearch}
								documentId={state.activeDocumentId}
								useDnd={true}
								categories={elementCategoryTabs}
								activeCategory={activeElementCategory}
								groups={elementTileGroups}
								onSearch={(value) => {
									elementSearch = value;
								}}
								onSelectCategory={handleElementCategoryChange}
								onTilePointerDown={handleElementTilePointerDown}
								onTileDragStart={(group, tile, event) => {
									void group;
									void tile;
									event.preventDefault();
								}}
								onTileClick={handleElementTileClick}
								onTileDoubleClick={handleElementTileClick}
							/>
						</section>
					</div>
				{:else if state.ui.shell.leftPanelPage === 'editor'}
					<EditorPanelShell
						title={editorPanelTitle}
						subtitle={editorPanelSubtitle}
						showHeader={false}
						tabMode="compact"
						bodyPadding="0"
						bodyGap="0"
						tabs={inspectorTabs.map<PanelTabItem>( ( panel ) => ( {
							id: panel,
							label: panel.slice( 0, 1 ).toUpperCase() + panel.slice( 1 ),
						} ) )}
						activeTab={state.ui.panel}
						surface="dark"
						onChangeTab={(tabId) => openInspectorTab( tabId as BuilderPanel )}
					>
						<BuilderInspector {editor} />
					</EditorPanelShell>
				{:else if state.ui.shell.leftPanelPage === 'page-settings'}
					<div class="builder-shell__panel-scroll">
						<PageSettingsPanel
							documentTitle={activeDocument.title}
							documentSlug={activeDocument.slug}
							documentKind={activeDocument.kind}
							documentStatus={activeDocument.status}
							documentMode={describeMode( state.ui.mode )}
							routeLabel={`${ state.ui.preview.pathname } | ${ state.ui.preview.slot ?? 'page' }`}
						>
							<div slot="summary" class="builder-shell__menu-card builder-shell__menu-card--compact">
								<p><strong>Preview source</strong>: {state.ui.preview.source ?? 'manual'}</p>
								{#if state.documentSessions[state.activeDocumentId]}
									<p><strong>Latest draft</strong>: {state.documentSessions[state.activeDocumentId].lastDraftAt ?? 'Not yet'}</p>
									<p><strong>Latest publish</strong>: {state.documentSessions[state.activeDocumentId].lastPublishedAt ?? 'Not yet'}</p>
								{/if}
							</div>
							<section class="builder-shell__menu-card">
								<AssignmentWorkflowPanel
									{activeDocument}
									projectAssignments={state.project.themeAssignments}
									{documentsById}
									activeEntryId={state.ui.siteEditor.activeEntryId}
									onPreviewAssignment={previewAssignment}
									onOpenAssignment={openAssignment}
									onCreateAssignment={createAssignmentFromShell}
									onUpdateAssignment={updateAssignment}
									onUpdateAssignmentRoutePattern={updateAssignmentRoutePattern}
									onDeleteAssignment={(assignmentId) => editor.dispatch( { type: 'project/assignment/delete', assignmentId } )}
								/>
							</section>
						</PageSettingsPanel>
					</div>
				{:else if state.ui.shell.leftPanelPage === 'history'}
					<div class="builder-shell__panel-scroll">
						<HistoryPanelShell
							documentTitle={activeDocument.title}
							saveState={state.ui.saveState}
							saveStateTone={resolveSaveStateTone( state.ui.saveState )}
							panelOpen={state.ui.revisions.panelOpen}
							onTogglePanel={(open) => editor.toggleRevisionBrowser( open )}
						>
							<div slot="summary" class="builder-shell__responsive-meta">
								<span>{activeRevisions.length} revisions</span>
								<span>{state.ui.revisions.selectedRevisionId ? 'Revision selected' : 'Live document'}</span>
							</div>
							<RevisionWorkflowPanel
								{activeDocument}
								session={state.documentSessions[state.activeDocumentId]}
								revisions={activeRevisions}
								saveState={state.ui.saveState}
								panelOpen={state.ui.revisions.panelOpen}
								selectedRevisionId={state.ui.revisions.selectedRevisionId}
								{canPublish}
								canSaveDraft={canEditProject}
								saveDraftDisabledReason={editor.getPermission( 'editProject' ).reason ?? 'Saving drafts is disabled by this host.'}
								publishDisabledReason={publishPermissionReason}
								onSaveDraft={() => editor.saveDraft()}
								onPublish={() => editor.publish()}
								onTogglePanel={(open) => editor.toggleRevisionBrowser( open )}
								onSelectRevision={(revisionId) => editor.selectRevision( revisionId )}
								onRestoreRevision={(revisionId) => editor.restoreRevision( revisionId, activeDocument.id )}
							/>
						</HistoryPanelShell>
					</div>
				{:else if state.ui.shell.leftPanelPage === 'globals'}
					<div class="builder-shell__panel-scroll">
						<GlobalsPanelShell
							tabs={[ ...globalTabs ]}
							activeTab={getActiveGlobalTab()}
							onChangeTab={(tabId) => openGlobalTab( tabId as 'classes' | 'variables' | 'components' | 'library' )}
						>
							<div slot="summary" class="builder-shell__responsive-meta">
								<span>{state.project.designSystem.classes.length} classes</span>
								<span>{state.project.designSystem.variables.length} variables</span>
								<span>{componentDocumentCount} components</span>
							</div>
							<BuilderInspector {editor} externalImportResult={htmlImportResult} />
						</GlobalsPanelShell>
					</div>
				{:else}
					<div class="builder-shell__panel-scroll builder-shell__panel-scroll--menu">
						<MenuPanel sections={menuSections} activeSection={activeMenuSection} onChangeSection={handleMenuSectionChange}>
							<div slot="summary" class="builder-shell__responsive-meta">
								<span>{state.project.documents.length} documents</span>
								<span>{siteEditorEntries.length} site entries</span>
								<span>{importWarnings.length} import warnings</span>
							</div>
							<div slot="documents" class="builder-shell__menu-card">
								<div class="builder-shell__stack-header"><h3>Documents</h3><p>Open pages, parts, popups, and components from the same shell.</p></div>
								<label class="builder-shell__search">
									<span>Filter</span>
									<select bind:value={documentFilter}>
										<option value="all">all</option>
										{#each creatableKinds as kind}
											<option value={kind}>{kind}</option>
										{/each}
									</select>
								</label>
								<DocumentModeBrowser documents={filteredDocuments} activeDocumentId={state.activeDocumentId} activeMode={state.ui.mode} onOpenDocument={openDocumentFromShell} />
							</div>

							<svelte:fragment slot="site-editor">
								{#if siteEditorEntries.length}
									<section class="builder-shell__menu-card" aria-label="Site-editor entry cards">
										<div class="builder-shell__stack-header"><h3>Site Editor</h3><p>Header, footer, template, and popup entry flows.</p></div>
										<div class="builder-shell__entry-grid">
											{#each siteEditorEntries as entry (entry.id)}
												<button type="button" class="builder-shell__entry-card" onclick={() => openSiteEditorEntry( entry )}>
													<strong>{entry.label}</strong>
													<span>{entry.templateType}</span>
													<small>{entry.route}</small>
												</button>
											{/each}
										</div>
									</section>
								{/if}
							</svelte:fragment>

							<svelte:fragment slot="preview-presets">
								{#if previewPresets.length}
									<section class="builder-shell__menu-card">
										<div class="builder-shell__stack-header"><h3>Preview Presets</h3><p>Jump the preview frame without leaving the builder.</p></div>
										<div class="builder-shell__preset-list">
											{#each previewPresets as preset (preset.id)}
												<button type="button" class="builder-shell__preset-button" onclick={() => openPreviewPreset( preset )}>
													<span>{preset.label}</span>
													<small>{preset.pathname}{preset.query ? `?${preset.query}` : ''}</small>
												</button>
											{/each}
										</div>
									</section>
								{/if}
							</svelte:fragment>

							<section slot="assignments" class="builder-shell__menu-card">
								<div class="builder-shell__stack-header"><h3>Assignments</h3><p>Theme-builder assignments stay in the same workspace.</p></div>
								<AssignmentWorkflowPanel
									{activeDocument}
									projectAssignments={state.project.themeAssignments}
									{documentsById}
									activeEntryId={state.ui.siteEditor.activeEntryId}
									onPreviewAssignment={previewAssignment}
									onOpenAssignment={openAssignment}
									onCreateAssignment={createAssignmentFromShell}
									onUpdateAssignment={updateAssignment}
									onUpdateAssignmentRoutePattern={updateAssignmentRoutePattern}
									onDeleteAssignment={(assignmentId) => editor.dispatch( { type: 'project/assignment/delete', assignmentId } )}
								/>
							</section>

							<section slot="components" class="builder-shell__menu-card">
								<div class="builder-shell__stack-header"><h3>Components</h3><p>Open masters, insert instances, and manage detach or relink flows.</p></div>
								<ComponentWorkflowPanel documents={state.project.documents} {activeDocument} mode={state.ui.mode} {selectedNode} editingContext={state.ui.componentEditing.context} editingComponentDocumentId={state.ui.componentEditing.componentDocumentId} onOpenDocument={openDocumentFromShell} onInsertComponentInstance={(componentId) => editor.insertComponentInstance( componentId )} onDetachInstance={() => editor.detachComponentInstance( selectedNode?.id )} onRelinkInstance={relinkSelectedComponentInstance} />
							</section>

							<svelte:fragment slot="import-diagnostics">
								{#if importWarnings.length}
									<section class="builder-shell__menu-card">
										<div class="builder-shell__stack-header"><h3>Import Diagnostics</h3><p>Parity gaps and compat warnings from imported Elementor content.</p></div>
										<ul class="builder-shell__warning-list">
											{#each importWarnings as warning, index (`${index}-${warning}`)}
												<li>{warning}</li>
											{/each}
										</ul>
									</section>
								{/if}
							</svelte:fragment>
						</MenuPanel>
					</div>
				{/if}
			</div>

			<footer class="builder-shell__panel-footer">
				<div class="builder-shell__panel-tools">
					<button type="button" class="builder-shell__panel-tool" aria-label="Page Settings" title="Page Settings" onclick={() => openShellPage( 'page-settings' )}>
						<EditorShellIcon name="settings" title="Page Settings" />
					</button>
					<button type="button" class="builder-shell__panel-tool" aria-label="Structure" title="Structure" onclick={() => editor.toggleNavigator()}>
						<EditorShellIcon name="navigator" title="Structure" />
					</button>
					<button type="button" class="builder-shell__panel-tool" aria-label="History" title="History" onclick={() => openShellPage( 'history' )}>
						<EditorShellIcon name="history" title="History" />
					</button>
					<button type="button" class="builder-shell__panel-tool" aria-label="Responsive Mode" title="Responsive Mode" data-inline-edit-preserve-focus="true" onclick={() => editor.toggleResponsiveBar( state.ui.viewport === 'desktop' )}>
						<EditorShellIcon name="responsive" title="Responsive Mode" />
					</button>
					<button type="button" class="builder-shell__panel-tool" aria-label="Preview Presets" title="Preview Presets" onclick={openPreviewPresetMenu}>
						<EditorShellIcon name="preview" title="Preview Presets" />
					</button>
				</div>
				<div class="builder-shell__panel-save">
					<span class={`builder-shell__save-state builder-shell__save-state--${state.ui.saveState}`}>{state.ui.saveState}</span>
					<small>{activeDocument.title}</small>
				</div>
			</footer>
			</div>
		</Pane>

		<PaneResizer class={`builder-shell__panel-divider ${ shellLayout.leftPanel.visible ? '' : 'builder-shell__panel-divider--hidden' }`} tabindex={0} aria-label="Resize builder panel" />

		<Pane defaultSize={60} minSize={36} order={1} class="builder-shell__stage" aria-label="Preview stage">
			<section class="builder-shell__stage">
				<div
					class:builder-shell__stage-body--navigator-floating={shellLayout.navigator.floatingVisible}
					class="builder-shell__stage-body"
				>
				<BuilderPreview {editor} registerSurface={registerPreviewSurface} />
				{#if shellLayout.navigator.floatingVisible}
					<div class="builder-shell__navigator-floating"><BuilderNavigator {editor} /></div>
				{/if}
				</div>
				{#if aiSession.mode === 'edit'}
					<section class="builder-shell__ai-chat-dock" aria-label="Edit with AI chat">
						<textarea
							bind:value={aiChatDraft}
							onkeydown={handleAiChatKeydown}
							placeholder="Describe the changes you want to make..."
							disabled={aiSession.status === 'streaming' || aiSession.status === 'applying'}
						></textarea>
						<div class="builder-shell__ai-chat-actions">
							<button type="button" class="builder-shell-button builder-shell-button--dark" onclick={() => editor.stopAiEdit()}>Exit AI</button>
							<button type="button" class="builder-shell-button builder-shell-button--dark" onclick={() => editor.undo()}>Undo last AI edit</button>
							{#if aiSession.status === 'streaming' || aiSession.status === 'applying'}
								<button type="button" class="builder-shell-button builder-shell-button--dark" onclick={() => editor.cancelAiRun()}>Cancel</button>
							{/if}
							<button type="button" class="builder-shell-button builder-shell-button--publish" disabled={!aiChatDraft.trim() || aiSession.status === 'streaming' || aiSession.status === 'applying'} onclick={sendAiChatMessage}>Send</button>
						</div>
					</section>
				{/if}
			</section>
		</Pane>

		<PaneResizer class={`builder-shell__navigator-divider ${ shellLayout.navigator.dockedVisible ? '' : 'builder-shell__navigator-divider--hidden' }`} style={shellLayout.navigator.dockedVisible ? undefined : 'display:none;'} tabindex={0} aria-label="Resize structure panel" />

		<Pane
			bind:this={navigatorPane}
			collapsible
			collapsedSize={0}
			defaultSize={shellLayout.navigator.dockedSize}
			minSize={shellLayout.navigator.minDockedSize}
			onResize={handleNavigatorDockedResize}
			order={2}
			class={`builder-shell__navigator-docked ${ shellLayout.navigator.dockedVisible ? '' : 'builder-shell__navigator-docked--collapsed' } ${ shellLayout.navigator.dockedVisible ? '' : 'builder-shell__navigator-docked--hidden' }`}
			style={shellLayout.navigator.dockedVisible ? undefined : 'display:none;'}
			aria-label="Structure panel"
		>
			<BuilderNavigator {editor} docked />
		</Pane>
		</PaneGroup>

	{#if state.ui.contextMenu.open && contextMenuGroups.length}
		<BuilderContextMenuSurface
			open={state.ui.contextMenu.open}
			groups={contextMenuGroups}
			registerElement={( element ) => {
				contextMenuElement = element;
			}}
			onAction={handleContextMenuAction}
			onOpenChange={( open ) => {
				if ( !open ) {
					editor.closeContextMenu();
				}
			}}
		/>
	{/if}
	</div>
	<DragOverlay disabled={false} dropAnimation={null}>
		{#snippet children(source)}
			{@const dragData = isBuilderDndData( source.data ) ? source.data : undefined}
			{#if dragData}
				<div class="builder-shell__drag-overlay">
					<span class="builder-shell__drag-overlay-badge">
						{dragData.descriptor.kind === 'palette-item' ? 'Add' : 'Move'}
					</span>
					<strong>{dragData.label}</strong>
				</div>
			{/if}
		{/snippet}
	</DragOverlay>
	</DragDropProvider>
</EditorShellTokens>

<style>
	.builder-shell {
		position: relative;
		display: grid;
		grid-template-rows: var( --builder-shell-top-bar-height ) minmax( 0, 1fr );
		height: 100%;
		min-height: 0;
		overflow: hidden;
		background: linear-gradient( 180deg, var( --builder-shell-gray-900 ) 0%, var( --builder-shell-gray-850 ) 100% );
		color: var( --builder-shell-text );
		font: 400 var( --builder-shell-font-size )/1.45 var( --builder-shell-font-family );
	}

	.builder-shell,
	.builder-shell :global(button),
	.builder-shell :global(input),
	.builder-shell :global(select),
	.builder-shell :global(textarea) {
		font: inherit;
	}

	.builder-shell__appbar {
		position: relative;
		z-index: 50;
		display: grid;
		grid-template-columns: minmax( 260px, auto ) minmax( 0, 1fr ) auto;
		align-items: center;
		min-height: var( --builder-shell-top-bar-height );
		padding: 0 10px 0 8px;
		border-bottom: 1px solid var( --builder-shell-border-dark );
		background:
			linear-gradient( 180deg, rgba( 255, 255, 255, 0.02 ), rgba( 255, 255, 255, 0 ) ),
			var( --builder-shell-toolbar-bg );
		color: var( --builder-shell-toolbar-text );
		box-shadow: inset 0 -1px 0 rgba( 255, 255, 255, 0.04 ), 0 1px 0 rgba( 0, 0, 0, 0.2 );
	}

	.builder-shell__appbar-left,
	.builder-shell__appbar-center,
	.builder-shell__appbar-right,
	.builder-shell__menu-row,
	.builder-shell__responsive-meta,
		.builder-shell__panel-pages,
		.builder-shell__inner-tabs,
		.builder-shell__appbar-menu,
		.builder-shell__menu-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.builder-shell__appbar-right {
		justify-content: flex-end;
		flex-wrap: wrap;
		row-gap: 4px;
	}

	.builder-shell__save-banner {
		position: relative;
		z-index: 45;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 8px 14px;
		border-bottom: 1px solid rgba( 255, 255, 255, 0.12 );
		background: #3a1720;
		color: #ffe7e7;
		font-size: 12px;
	}

	.builder-shell__save-banner--error {
		background: #3b1f11;
		color: #ffedd5;
	}

	.builder-shell__save-banner > div:first-child {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.builder-shell__save-banner strong,
	.builder-shell__save-banner span {
		white-space: nowrap;
	}

	.builder-shell__save-banner span {
		overflow: hidden;
		text-overflow: ellipsis;
		color: rgba( 255, 255, 255, 0.78 );
	}

	.builder-shell__save-banner-actions {
		display: flex;
		flex: 0 0 auto;
		gap: 6px;
	}

	.builder-shell__save-banner button {
		height: 26px;
		border: 1px solid rgba( 255, 255, 255, 0.22 );
		border-radius: 5px;
		background: rgba( 255, 255, 255, 0.1 );
		color: inherit;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	.builder-shell__document-meta,
	.builder-shell__panel-header-copy,
	.builder-shell__stack-header {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.builder-shell__panel-header-copy {
		flex: 1;
	}

	.builder-shell__document-meta strong,
	.builder-shell__document-meta span,
		.builder-shell__menu-label,
		.builder-shell__stack-header h3,
		.builder-shell__stack-header p,
		.builder-shell__panel-kicker,
		.builder-shell__panel-header h2 {
		margin: 0;
	}

	.builder-shell__document-meta strong,
		.builder-shell__panel-header h2,
		.builder-shell__stack-header h3 {
		color: inherit;
		font-weight: 600;
	}

	.builder-shell__document-kicker,
	.builder-shell__panel-kicker,
		.builder-shell__stack-header p,
		.builder-shell__menu-label {
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.builder-shell__document-meta strong {
		font-size: 13px;
		line-height: 1.1;
	}

	.builder-shell__exit {
		display: inline-flex;
		align-items: center;
		height: 28px;
		padding: 0 9px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.04 );
		color: var( --builder-shell-toolbar-text );
		font-size: 10px;
		font-weight: 500;
	}

	.builder-shell__context-summary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		justify-self: center;
		max-width: min( 100%, 520px );
		height: 32px;
		padding: 0 12px;
		border: 1px solid rgba( 255, 255, 255, 0.1 );
		border-radius: 8px;
		background: rgba( 10, 12, 16, 0.42 );
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 11px;
		box-shadow: inset 0 1px 0 rgba( 255, 255, 255, 0.02 );
	}

	.builder-shell__context-route,
	.builder-shell__context-query {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-shell__context-route {
		color: #ffffff;
		font-weight: 500;
	}

	.builder-shell__context-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 20px;
		padding: 0 9px;
		border-radius: 999px;
		background: rgba( 208, 4, 212, 0.16 );
		color: #f5d0fe;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.builder-shell__context-field,
	.builder-shell__search,
	.builder-shell__menu-grid {
		display: grid;
		gap: 8px;
	}

	.builder-shell__menu-grid {
		grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
	}

	.builder-shell__context-field {
		grid-template-columns: auto 1fr;
		align-items: center;
	}

	.builder-shell__context-field span {
		color: var( --builder-shell-text-muted );
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.builder-shell__context-field input,
		.builder-shell__search select {
		width: 100%;
	}

	.builder-shell__panel-pages button,
	.builder-shell__entry-card,
	.builder-shell__preset-button {
		border: 1px solid transparent;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.builder-shell__appbar-menu {
		position: absolute;
		top: calc( 100% + 8px );
		right: 12px;
		flex-direction: column;
		align-items: stretch;
		padding: 12px;
		width: min( 440px, calc( 100vw - 24px ) );
		border: 1px solid var( --builder-shell-border );
		border-radius: 10px;
		background: var( --builder-shell-dark-panel-raised );
		color: var( --builder-shell-toolbar-text );
		box-shadow: var( --builder-shell-shadow-popover );
	}

	.builder-shell__appbar-menu .builder-shell__menu-label {
		color: var( --builder-shell-toolbar-text-muted );
	}

	.builder-shell__ai-menu-wrap {
		position: relative;
		display: inline-flex;
	}

	.builder-shell__ai-menu {
		position: absolute;
		top: calc( 100% + 8px );
		right: 0;
		z-index: 80;
		display: grid;
		min-width: 180px;
		padding: 8px;
		border: 1px solid var( --builder-shell-border );
		border-radius: 10px;
		background: var( --builder-shell-dark-panel-raised );
		color: var( --builder-shell-toolbar-text );
		box-shadow: var( --builder-shell-shadow-popover );
	}

	.builder-shell__ai-menu button {
		padding: 9px 10px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.builder-shell__ai-menu button:hover {
		background: rgba( 255, 255, 255, 0.07 );
	}

	.builder-shell__ai-menu button:focus-visible,
	.builder-shell__panel-pages button:focus-visible,
	.builder-shell__panel-header-button:focus-visible,
	.builder-shell__panel-tool:focus-visible {
		outline: none;
		box-shadow: var( --builder-shell-focus-ring );
	}

	.builder-shell__modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: grid;
		place-items: center;
		padding: 24px;
		background: rgba( 7, 9, 13, 0.72 );
		backdrop-filter: blur( 2px );
	}

	.builder-shell__html-import-dialog {
		display: grid;
		gap: 14px;
		width: min( 920px, calc( 100vw - 48px ) );
		max-height: min( 82vh, 760px );
		padding: 18px;
		border: 1px solid var( --builder-shell-border );
		border-radius: 10px;
		background: var( --builder-shell-dark-panel-raised );
		color: var( --builder-shell-text );
		box-shadow: 0 24px 80px rgba( 0, 0, 0, 0.48 );
		overflow: auto;
	}

	.builder-shell__ai-settings-dialog {
		width: min( 720px, calc( 100vw - 48px ) );
	}

	.builder-shell__ai-create-dialog {
		width: min( 680px, calc( 100vw - 48px ) );
	}

	.builder-shell__ai-settings-dialog,
	.builder-shell__ai-create-dialog {
		background: var( --builder-shell-dark-panel-raised );
		color: #e5e7eb;
	}

	.builder-shell__ai-settings-dialog .builder-shell__context-field,
	.builder-shell__ai-create-dialog .builder-shell__context-field {
		grid-template-columns: 1fr;
		align-items: stretch;
	}

	.builder-shell__ai-settings-dialog .builder-shell__context-field span,
	.builder-shell__ai-create-dialog .builder-shell__context-field span {
		color: #cbd5e1;
	}

	.builder-shell__ai-settings-dialog :global(input),
	.builder-shell__ai-settings-dialog :global(select),
	.builder-shell__ai-settings-dialog :global(textarea),
	.builder-shell__ai-create-dialog :global(input),
	.builder-shell__ai-create-dialog :global(select),
	.builder-shell__ai-create-dialog :global(textarea) {
		width: 100%;
		border: 1px solid #334155;
		border-radius: 6px;
		background: #f8fafc;
		color: #0f172a;
	}

	.builder-shell__ai-settings-dialog :global(input),
	.builder-shell__ai-settings-dialog :global(select),
	.builder-shell__ai-create-dialog :global(input),
	.builder-shell__ai-create-dialog :global(select) {
		min-height: 34px;
		padding: 0 10px;
	}

	.builder-shell__ai-settings-dialog :global(textarea),
	.builder-shell__ai-create-dialog :global(textarea) {
		padding: 10px;
	}

	.builder-shell__html-import-header,
	.builder-shell__html-import-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.builder-shell__html-import-header h2 {
		margin: 0;
		font-size: 18px;
	}

	.builder-shell__import-steps,
	.builder-shell__import-mode-row,
	.builder-shell__import-options,
	.builder-shell__import-summary-grid,
	.builder-shell__import-preview-grid {
		display: grid;
		gap: 10px;
	}

	.builder-shell__import-steps {
		grid-template-columns: repeat( 3, minmax( 0, 1fr ) );
	}

	.builder-shell__import-steps span {
		padding: 7px 10px;
		border: 1px solid rgba( 148, 163, 184, 0.22 );
		border-radius: 999px;
		background: rgba( 15, 23, 42, 0.62 );
		color: #94a3b8;
		font-size: 11px;
		font-weight: 700;
		text-align: center;
		text-transform: uppercase;
	}

	.builder-shell__import-steps .builder-shell__import-step--active {
		border-color: rgba( 217, 70, 239, 0.58 );
		background: rgba( 217, 70, 239, 0.16 );
		color: #f5d0fe;
	}

	.builder-shell__import-mode-row,
	.builder-shell__import-summary-grid,
	.builder-shell__import-preview-grid {
		grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
	}

	.builder-shell__import-mode-row label,
	.builder-shell__import-summary-grid div {
		display: grid;
		gap: 6px;
	}

	.builder-shell__import-mode-row span,
	.builder-shell__import-summary-grid span,
	.builder-shell__import-review h3,
	.builder-shell__import-details summary {
		color: #cbd5e1;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.builder-shell__import-options {
		grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
		padding: 10px;
		border: 1px solid rgba( 148, 163, 184, 0.16 );
		border-radius: 8px;
		background: rgba( 15, 23, 42, 0.48 );
	}

	.builder-shell__import-options label {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #cbd5e1;
		font-size: 12px;
	}

	.builder-shell__import-review {
		display: grid;
		gap: 14px;
		padding: 12px;
		border: 1px solid rgba( 148, 163, 184, 0.18 );
		border-radius: 8px;
		background: rgba( 2, 6, 23, 0.34 );
	}

	.builder-shell__import-summary-grid div {
		padding: 10px;
		border-radius: 7px;
		background: rgba( 255, 255, 255, 0.05 );
	}

	.builder-shell__import-summary-grid strong {
		overflow: hidden;
		color: #f8fafc;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-shell__import-tree,
	.builder-shell__import-asset-list {
		display: grid;
		gap: 6px;
		max-height: 220px;
		margin: 0;
		padding: 0;
		overflow: auto;
		list-style: none;
	}

	.builder-shell__import-tree li {
		display: grid;
		grid-template-columns: auto minmax( 0, 1fr );
		gap: 8px;
		align-items: center;
		padding: 6px 8px;
		padding-left: calc( 8px + var( --depth, 0 ) * 14px );
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.04 );
	}

	.builder-shell__import-tree span {
		padding: 2px 6px;
		border-radius: 999px;
		background: rgba( 20, 184, 166, 0.14 );
		color: #99f6e4;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.builder-shell__import-tree .builder-shell__import-tree-fallback {
		background: rgba( 251, 191, 36, 0.16 );
		color: #fde68a;
	}

	.builder-shell__import-tree em {
		overflow: hidden;
		color: #cbd5e1;
		font-style: normal;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-shell__import-asset-list li {
		display: grid;
		grid-template-columns: auto minmax( 0, 1fr );
		gap: 8px;
		padding: 6px 0;
		border-bottom: 1px solid rgba( 148, 163, 184, 0.12 );
	}

	.builder-shell__import-asset-list span {
		overflow: hidden;
		color: #cbd5e1;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.builder-shell__import-muted {
		color: #94a3b8;
	}

	.builder-shell__import-details {
		border-top: 1px solid rgba( 148, 163, 184, 0.16 );
		padding-top: 10px;
	}

	.builder-shell__import-details pre {
		max-height: 180px;
		overflow: auto;
		border-radius: 6px;
		padding: 10px;
		background: #020617;
		color: #cbd5e1;
		font-size: 11px;
		white-space: pre-wrap;
	}

	.builder-shell__html-import-textarea {
		min-height: 320px;
		resize: vertical;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		line-height: 1.5;
	}

	.builder-shell__html-import-status {
		padding: 10px 12px;
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.05 );
		color: var( --builder-shell-text );
	}

	.builder-shell__html-import-status--error {
		background: rgba( 239, 68, 68, 0.16 );
		color: #fecaca;
	}

	.builder-shell__html-import-status--success {
		background: rgba( 20, 184, 166, 0.16 );
		color: #99f6e4;
	}

	.builder-shell__html-import-status--importing,
	.builder-shell__html-import-status--loading,
	.builder-shell__html-import-status--saving {
		background: rgba( 99, 102, 241, 0.16 );
		color: #c7d2fe;
	}

	.builder-shell__ai-settings-grid {
		display: grid;
		grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
		gap: 12px;
	}

	.builder-shell__ai-system-textarea {
		min-height: 140px;
	}

	.builder-shell__ai-headers-textarea {
		min-height: 96px;
	}

	.builder-shell__ai-create-textarea {
		min-height: 150px;
		font-family: inherit;
		font-size: 13px;
	}

	.builder-shell__ai-debug-panel {
		display: grid;
		gap: 8px;
		max-height: 320px;
		overflow: auto;
		padding: 10px;
		border: 1px solid rgba( 148, 163, 184, 0.26 );
		border-radius: 8px;
		background: rgba( 2, 6, 23, 0.34 );
	}

	.builder-shell__modal-divider {
		block-size: 1px;
		background: var( --builder-shell-border );
	}

	.builder-shell__check-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var( --builder-shell-text-muted );
	}

	.builder-shell__ai-history {
		padding: 14px;
	}

	.builder-shell__ai-history section {
		display: grid;
		gap: 12px;
	}

	.builder-shell__ai-message {
		display: grid;
		gap: 5px;
		padding: 11px 12px;
		border: 1px solid rgba( 255, 255, 255, 0.07 );
		border-radius: 8px;
		background: rgba( 255, 255, 255, 0.05 );
	}

	.builder-shell__ai-message--user {
		background: rgba( 79, 70, 229, 0.22 );
		border-color: rgba( 129, 140, 248, 0.24 );
	}

	.builder-shell__ai-message--tool {
		background: rgba( 20, 184, 166, 0.12 );
	}

	.builder-shell__ai-message--system {
		background: rgba( 148, 163, 184, 0.14 );
	}

	.builder-shell__ai-message--error {
		background: rgba( 239, 68, 68, 0.15 );
		border-color: rgba( 248, 113, 113, 0.3 );
	}

	.builder-shell__ai-message-role {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		color: var( --builder-shell-text-muted );
	}

	.builder-shell__ai-message p {
		margin: 0;
		white-space: pre-wrap;
	}

	.builder-shell__ai-message pre {
		max-height: 280px;
		overflow: auto;
		margin: 0;
		padding: 10px;
		border-radius: 6px;
		background: rgba( 2, 6, 23, 0.62 );
		color: #dbeafe;
		font-size: 11px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.builder-shell__ai-exit-button {
		width: auto;
		min-width: 48px;
		padding: 0 10px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.builder-shell__ai-chat-dock {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 45;
		display: grid;
		grid-template-columns: minmax( 0, 1fr ) auto;
		gap: 12px;
		padding: 12px;
		border-top: 1px solid var( --builder-shell-border );
		background: rgba( 12, 13, 14, 0.97 );
		box-shadow: 0 -18px 40px rgba( 0, 0, 0, 0.22 );
	}

	.builder-shell__ai-chat-dock textarea {
		width: 100%;
		min-width: 0;
		min-height: 58px;
		max-height: 140px;
		resize: vertical;
	}

	@media (max-width: 980px) {
		.builder-shell__ai-chat-dock {
			grid-template-columns: minmax( 0, 1fr );
		}
	}

	.builder-shell__ai-chat-actions {
		display: flex;
		align-items: stretch;
		justify-content: flex-end;
		gap: 8px;
		min-width: 0;
		max-width: 100%;
		flex-wrap: wrap;
	}

	.builder-shell__drag-overlay {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 999px;
		background: rgba( 13, 18, 28, 0.94 );
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		color: #ffffff;
		box-shadow: 0 18px 40px rgba( 0, 0, 0, 0.28 );
	}

	.builder-shell__drag-overlay strong {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	.builder-shell__drag-overlay-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 22px;
		padding: 0 10px;
		border-radius: 999px;
		background: rgba( 255, 255, 255, 0.08 );
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	:global(.builder-shell__workspace) {
		position: relative;
		display: flex;
		align-items: stretch;
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}

	:global(.builder-shell__panel) {
		display: flex;
		flex: 0 0 auto;
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}

	:global(.builder-shell__panel--collapsed) {
		visibility: hidden;
	}

	.builder-shell__panel-surface {
		display: grid;
		grid-template-rows: 48px 40px minmax( 0, 1fr ) 40px;
		inline-size: 100%;
		block-size: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-right: 1px solid var( --builder-shell-border-dark );
		background: var( --builder-shell-dark-panel );
	}

	.builder-shell__panel-surface--collapsed {
		visibility: hidden;
	}

	.builder-shell__panel-header,
	.builder-shell__panel-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		inline-size: 100%;
		padding: 0 8px;
		min-width: 0;
	}

	.builder-shell__panel-header {
		background: linear-gradient( 180deg, rgba( 255, 255, 255, 0.025 ), rgba( 255, 255, 255, 0 ) ), var( --builder-shell-gray-900 );
		color: var( --builder-shell-toolbar-text );
		border-bottom: 1px solid var( --builder-shell-border-dark );
	}

	.builder-shell__panel-header h2 {
		margin: 0;
		font-size: 14px;
		line-height: 1.1;
		font-weight: 600;
	}

	.builder-shell__panel-header-button,
	.builder-shell__panel-tool {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.builder-shell__panel-tool {
		width: 32px;
		height: 32px;
	}

	.builder-shell__panel-header-button:hover {
		background: rgba( 255, 255, 255, 0.08 );
		color: #ffffff;
	}

	.builder-shell__panel-pages {
		padding: 0 10px;
		border-bottom: 1px solid var( --builder-shell-border-dark );
		background: var( --builder-shell-dark-panel );
		overflow: hidden;
	}

	.builder-shell__panel-pages button {
		position: relative;
		height: 32px;
		padding: 0 11px;
		white-space: nowrap;
		font-size: 13px;
		font-weight: 400;
	}

	.builder-shell__panel-pages {
		display: grid;
		grid-template-columns: repeat( 6, minmax( 0, 1fr ) );
		gap: 2px;
		inline-size: 100%;
		padding: 4px 8px;
	}

	.builder-shell__panel-pages button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		inline-size: 100%;
		min-width: 0;
		min-height: 30px;
		padding-inline: 0;
		border-radius: 5px;
		font-size: 11px;
		color: var( --builder-shell-toolbar-text-muted );
		overflow: hidden;
	}

	.builder-shell__panel-pages button :global(svg) {
		inline-size: 14px;
		block-size: 14px;
	}

	.builder-shell__panel-pages button:hover {
		background: rgba( 255, 255, 255, 0.07 );
		color: var( --builder-shell-toolbar-text );
	}

	.builder-shell__panel-pages button.active,
	.builder-shell__preset-button:hover,
	.builder-shell__entry-card:hover {
		border-color: transparent;
		background: rgba( 208, 4, 212, 0.16 );
		color: #ffffff;
		box-shadow: inset 0 -2px 0 var( --builder-shell-accent ), inset 0 0 0 1px rgba( 255, 255, 255, 0.04 );
	}

	.builder-shell__panel-body {
		inline-size: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background: var( --builder-shell-dark-panel );
	}

	.builder-shell__panel-body--editor {
		overflow: hidden;
	}

	.builder-shell__panel-body--editor > * {
		inline-size: 100%;
		min-width: 0;
		min-height: 0;
		block-size: 100%;
	}

	.builder-shell__panel-body--editor :global(.builder-panel-shell) {
		border-inline-end: 0;
	}

	.builder-shell__panel-scroll {
		inline-size: 100%;
		min-width: 0;
		min-height: 0;
		block-size: 100%;
		overflow: auto;
		overflow-x: hidden;
	}

	.builder-shell__panel-scroll > * {
		inline-size: 100%;
		min-width: 0;
	}

	.builder-shell__panel-scroll :global(.inspector) {
		padding: 8px;
	}

	.builder-shell__panel-scroll :global(.inspector__section) {
		border-radius: 6px;
		border: 1px solid var( --builder-shell-border );
		box-shadow: inset 0 1px 0 rgba( 255, 255, 255, 0.025 );
	}

	.builder-shell__panel-scroll--menu,
	.builder-shell__library {
		display: grid;
		gap: 10px;
		padding: 10px 12px 12px;
	}

	:global(.builder-shell__panel-divider) {
		display: grid;
		flex: 0 0 12px;
		place-items: center;
		width: 12px;
		min-width: 12px;
		padding: 0;
		border: 0;
		border-right: 1px solid rgba( 255, 255, 255, 0.04 );
		border-left: 1px solid rgba( 0, 0, 0, 0.16 );
		background: linear-gradient( 180deg, rgba( 255, 255, 255, 0.03 ), rgba( 255, 255, 255, 0.01 ) ), var( --builder-shell-toolbar-bg );
		color: var( --builder-shell-toolbar-text-muted );
		cursor: col-resize;
		user-select: none;
	}

	:global(.builder-shell__panel-divider--hidden),
	:global(.builder-shell__navigator-divider--hidden) {
		display: none;
	}

	.builder-shell__stage {
		position: relative;
		display: grid;
		flex: 1 1 auto;
		grid-template-rows: minmax(0, 1fr);
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
		background:
			radial-gradient(circle at top, rgba( 255, 255, 255, 0.06 ), transparent 40%),
			linear-gradient( 180deg, var( --builder-shell-gray-850 ) 0%, var( --builder-shell-gray-900 ) 100% );
	}

	.builder-shell__stage-body {
		position: relative;
		min-width: 0;
		min-height: 0;
		height: 100%;
		padding: 0;
		overflow: hidden;
	}

	.builder-shell__stage-body--navigator-floating {
		padding-right: calc( var( --builder-shell-navigator-width ) + 16px );
	}

	.builder-shell__navigator-floating {
		position: absolute;
		top: 8px;
		right: 8px;
		z-index: 12;
		width: var( --builder-shell-navigator-width );
		max-height: min( 52vh, calc( 100% - 16px ) );
		overflow: hidden;
		border: 1px solid var( --builder-shell-border );
		border-radius: 10px;
		background: #ffffff;
		box-shadow: var( --builder-shell-shadow-panel );
	}

	:global(.builder-shell__navigator-docked) {
		flex: 0 0 auto;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-left: 1px solid var( --builder-shell-border );
		background: #ffffff;
	}

	:global(.builder-shell__navigator-docked--collapsed) {
		visibility: hidden;
	}

	:global(.builder-shell__navigator-docked--hidden) {
		display: none;
	}

	:global(.builder-shell__navigator-divider) {
		display: grid;
		flex: 0 0 12px;
		place-items: center;
		width: 12px;
		min-width: 12px;
		padding: 0;
		border: 0;
		border-right: 1px solid rgba( 255, 255, 255, 0.04 );
		border-left: 1px solid rgba( 0, 0, 0, 0.16 );
		background: linear-gradient( 180deg, rgba( 255, 255, 255, 0.03 ), rgba( 255, 255, 255, 0.01 ) ), var( --builder-shell-toolbar-bg );
		color: var( --builder-shell-toolbar-text-muted );
		cursor: col-resize;
		user-select: none;
	}

	:global(.builder-shell__navigator-docked) :global(.navigator),
	.builder-shell__navigator-floating :global(.navigator) {
		height: 100%;
	}

	.builder-shell__panel-footer {
		border-top: 1px solid var( --builder-shell-border-dark );
		background: linear-gradient( 180deg, rgba( 255, 255, 255, 0.02 ), rgba( 255, 255, 255, 0 ) ), var( --builder-shell-gray-900 );
		color: var( --builder-shell-toolbar-text-muted );
		grid-template-columns: minmax( 0, 1fr ) auto;
	}

	.builder-shell__panel-tools,
	.builder-shell__panel-save {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.builder-shell__panel-tool:hover {
		background: rgba( 255, 255, 255, 0.08 );
		color: #ffffff;
	}

	.builder-shell__panel-save {
		margin-left: auto;
		padding-left: 10px;
		border-left: 1px solid var( --builder-shell-border-dark );
		gap: 8px;
	}

	.builder-shell__panel-save small {
		display: none;
	}

	.builder-shell__element-grid,
	.builder-shell__entry-grid {
		display: grid;
		grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
		gap: 8px;
	}

	.builder-shell__entry-card,
	.builder-shell__preset-button {
		display: grid;
		gap: 3px;
		padding: 10px;
		border: 1px solid var( --builder-shell-border );
		background: var( --builder-shell-panel-surface );
		color: var( --builder-shell-heading );
		text-align: left;
	}

	.builder-shell__entry-card small,
	.builder-shell__entry-card span,
	.builder-shell__preset-button small {
		color: var( --builder-shell-text-muted );
	}

	.builder-shell__menu-card,
	.builder-shell__preset-list,
	.builder-shell__warning-list {
		display: grid;
		gap: 8px;
	}

	.builder-shell__menu-card {
		padding: 12px;
		border: 1px solid var( --builder-shell-border );
		background: var( --builder-shell-panel-surface );
	}

	.builder-shell__warning-list {
		margin: 0;
		padding-left: 18px;
	}

	.builder-shell__save-state {
		color: var( --builder-shell-text-muted );
		text-transform: capitalize;
	}

	.builder-shell__save-state--dirty {
		color: #9b6b00;
	}

	.builder-shell__save-state--saving,
	.builder-shell__save-state--autosaving,
	.builder-shell__save-state--publishing {
		color: var( --builder-shell-accent );
	}

	.builder-shell__save-state--published {
		color: #1f7a42;
	}

	.builder-shell__save-state--error,
	.builder-shell__save-state--conflict {
		color: #b91c1c;
	}

	@media ( max-width: 1240px ) {
		.builder-shell__appbar {
			grid-template-columns: 1fr;
			padding: 6px 10px;
		}

		.builder-shell__navigator-floating {
			top: 12px;
			right: 12px;
			max-height: min( 46vh, calc( 100% - 24px ) );
		}
	}

	.builder-shell-icon-button,
	.builder-shell-toolbar-button,
	.builder-shell-button {
		border: 0;
		border-radius: 999px;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			box-shadow 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.builder-shell-icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: rgba( 255, 255, 255, 0.04 );
		color: var( --builder-shell-toolbar-text );
		box-shadow: inset 0 0 0 1px rgba( 255, 255, 255, 0.05 );
	}

	.builder-shell-icon-button:hover,
	.builder-shell-toolbar-button:hover,
	.builder-shell-button:hover {
		transform: translateY( -1px );
	}

	.builder-shell-button--dark {
		background: rgba( 255, 255, 255, 0.04 );
		color: var( --builder-shell-toolbar-text );
	}

	.builder-shell-button--light {
		background: rgba( 255, 255, 255, 0.08 );
		color: #ffffff;
	}

	.builder-shell-button--publish {
		background: var( --builder-shell-accent );
		color: #ffffff;
		box-shadow: 0 6px 14px rgba( 255, 57, 113, 0.24 );
	}

	.builder-shell-toolbar-button {
		height: 32px;
		padding: 0 12px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.01em;
		background: rgba( 255, 255, 255, 0.04 );
		color: var( --builder-shell-toolbar-text );
		box-shadow: inset 0 0 0 1px rgba( 255, 255, 255, 0.05 );
	}

	.builder-shell-select,
	.builder-shell-input {
		min-height: 32px;
		padding: 0 10px;
		border: 1px solid var( --builder-shell-border );
		border-radius: 8px;
		background: #ffffff;
		color: var( --builder-shell-text-strong );
	}

	.builder-shell-select:focus,
	.builder-shell-input:focus {
		outline: 0;
		border-color: rgba( 255, 57, 113, 0.5 );
		box-shadow: 0 0 0 3px rgba( 255, 57, 113, 0.12 );
	}

	:global(.builder-shell__panel-divider:hover) {
		background:
			linear-gradient( 180deg, rgba( 255, 255, 255, 0.06 ), rgba( 255, 255, 255, 0.02 ) ),
			var( --builder-shell-toolbar-bg );
	}
</style>
