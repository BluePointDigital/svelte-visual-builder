<script lang="ts">
	import { onMount } from 'svelte';

	import type { BuilderEngineState } from '@builder/core';
	import type {
		Accessibility,
		Binding,
		BuilderDocument,
		BuilderNode,
		ClassDefinition,
		ComponentExposure,
		ComponentWorkflow,
		ConditionGroup,
		ConditionRule,
		DocumentRevision,
		HtmlAttribute,
		JsonValue,
		StyleSet,
		ThemeAssignment,
		VisibilityRule,
		VariableDefinition,
	} from '@builder/schema';
	import type {
		BuilderAdvancedSectionInstance,
		BuilderControlCondition,
		BuilderControlPrimitive,
		BuilderControlState,
		BuilderElementDefinition,
		BuilderFieldDefinition,
		BuilderPanelSectionDefinition,
		BuilderPanelSectionTab,
		BuilderStylePropertyDefinition,
		BuilderStyleSectionInstance,
	} from '@builder/plugin-api';
	import {
		createChoosePrimitive,
		createColorPrimitive,
		createMediaPrimitive,
		createSelectPrimitive,
		createSliderPrimitive,
		createSwitcherPrimitive,
		createUrlPrimitive,
	} from '@builder/plugin-api';
	import type { BuilderEditorController } from './editor';

	import { flattenNodeTree, getActiveDocument } from '@builder/core';
	import {
		assignmentSlots,
		bindingSources,
		bindingTargetKinds,
		conditionGroupOperators,
		conditionOperators,
		conditionSources,
		createThemeAssignment,
		getDocumentComponentWorkflow,
		patchDocumentComponentWorkflow,
		styleStateTargets,
		variableKinds,
	} from '@builder/schema';
	import { getElementDefinition, getStyleOrigins } from '@builder/runtime-svelte';
	import EditorShellIcon from './components/EditorShellIcon.svelte';
	import StructuredCollectionFieldEditor from './components/StructuredCollectionFieldEditor.svelte';
	import PrimitiveControl from './components/PrimitiveControl.svelte';
	import { resolvePrimitiveControl, serializeDimensionsValue, serializeMediaValue, serializeSliderValue, serializeUrlValue } from './components/PrimitiveControl.helpers';
	import { createAnchorController } from './anchor-controller';
	import {
		buildResponsiveStylePatch,
		buildResponsiveStyleReset,
		getAuthoringBreakpointDefinitions,
		readStyleRecordValue,
		resolveAuthoringViewportId,
		resolveResponsiveStyleValue,
		setStyleRecordValue,
		normalizeStylePropertyName,
		legacyStylePropertyName,
	} from './responsive-authoring';
	import { isStructuredCollectionField, resolveStructuredCollectionKind } from './structured-content';
	import type { TemplateImportResult } from './template-import';
	import type { BuilderMediaAssetMetadata } from './media';

	export let editor: BuilderEditorController;
	export let externalImportResult: Omit<TemplateImportResult, 'project'> | undefined = undefined;

	let state: BuilderEngineState = editor.engine.getState();
	let selectedStyleRef = '';
	let selectedVariableName = '';
	let selectedVariableValue = '';
	let selectedVariableKind: VariableDefinition['kind'] = 'raw';
	let selectedVariableGroup = '';
	let selectedVariableDescription = '';
	let selectedVariableSource: VariableDefinition['source'] = 'manual';
	let newLibraryTitle = 'Reusable Library Item';
	let libraryImportInput: HTMLInputElement | undefined;
	let libraryImportStatus: 'idle' | 'importing' | 'success' | 'error' = 'idle';
	let libraryImportMessage = '';
	let libraryImportWarnings: string[] = [];
	let libraryImportGaps: string[] = [];
	let newComponentTitle = 'Reusable Component';
	let classSearch = '';
	let variableSearch = '';
	let sectionStateTargets: Record<string, BuilderControlState> = {};
	let activeInspectorTab: BuilderPanelSectionTab = 'content';
	let unsubscribe = () => {};
	let activeDocument: BuilderDocument = getActiveDocument( state );
	let activeSession = state.documentSessions[ state.activeDocumentId ];
	let selectedNode: BuilderNode | undefined;
	let selectedDefinition: BuilderElementDefinition | undefined;
	let styleOrigins: Array<{ source: string; keys: string[] }> = [];
	let documentAssignments: ThemeAssignment[] = [];
	let componentDocuments: BuilderDocument[] = [];
	let componentDocumentsById = new Map<string, BuilderDocument>();
	let libraryDocuments: BuilderDocument[] = [];
	let lastExternalImportResult: Omit<TemplateImportResult, 'project'> | undefined;
	let componentUsage = new Map<string, number>();
	let filteredClasses: ClassDefinition[] = [];
	let filteredVariables: VariableDefinition[] = [];
	let selectedComponentDocument: BuilderDocument | undefined;
	let selectedComponentWorkflow: ComponentWorkflow | undefined;
	let selectedComponentExposures: ComponentExposure[] = [];
	let activeComponentWorkflow: ComponentWorkflow | undefined;
	let assignmentsBySlot = new Map<ThemeAssignment['slot'], ThemeAssignment[]>();
	let styleSections: BuilderStyleSectionInstance[] = [];
	let revisionEntries: DocumentRevision[] = [];
	let componentExposureCandidates: Array<{
		field: BuilderFieldDefinition;
		exposure: ComponentExposure;
		existing?: ComponentExposure;
	}> = [];
	let contentSections: BuilderPanelSectionDefinition[] = [];
	let visibleContentSections: BuilderPanelSectionDefinition[] = [];
	let advancedSections: BuilderAdvancedSectionInstance[] = [];
	let visibleStyleSections: BuilderStyleSectionInstance[] = [];
	let visibleAdvancedSections: BuilderAdvancedSectionInstance[] = [];
	let authoringBreakpoints = getAuthoringBreakpointDefinitions( state.project.designSystem.breakpoints );
	let selectedNodeLayoutDisplay = '';
	let selectedNodeLayoutDirection = '';
	let typographyPopoverSectionId = '';
	let typographyPopoverElement: HTMLDivElement | null = null;
	let typographyPopoverAnchorElement: HTMLElement | null = null;
	const typographyPopoverAnchorController = createAnchorController();
	let typographyPopoverAnchorCleanup = () => {};
	let jsonDrafts: Record<string, string> = {};
	let jsonErrors: Record<string, string> = {};
	let mediaAssets: BuilderMediaAssetMetadata[] = [];
	let mediaDiagnostics: string[] = [];
	const fieldPrimitiveCache = new WeakMap<BuilderFieldDefinition, BuilderControlPrimitive | undefined>();
	let selectedDefinitionMemoState: {
		node?: BuilderNode;
		project?: BuilderEngineState['project'];
		registry?: BuilderEditorController['registry'];
		adapter?: BuilderEditorController['adapter'];
		bindingContext?: BuilderEditorController['bindingContext'];
		pathname?: string;
		query?: string;
		viewport?: string;
		showPopups?: boolean;
		value?: BuilderElementDefinition;
	} = {};
	let styleOriginsMemoState: { node?: BuilderNode; project?: BuilderEngineState['project']; value: Array<{ source: string; keys: string[] }> } = { value: [] };
	let documentAssignmentsMemoState: { assignments?: ThemeAssignment[]; documentId?: string; value: ThemeAssignment[] } = { value: [] };
	let documentKindListsMemoState: { documents?: BuilderDocument[]; components: BuilderDocument[]; componentById: Map<string, BuilderDocument>; libraries: BuilderDocument[] } = { components: [], componentById: new Map(), libraries: [] };
	let componentUsageMemoState: { documents?: BuilderDocument[]; value: Map<string, number> } = { value: new Map() };
	let classFilterMemoState: { classes?: ClassDefinition[]; search: string; value: ClassDefinition[] } = { search: '', value: [] };
	let variableFilterMemoState: { variables?: VariableDefinition[]; search: string; value: VariableDefinition[] } = { search: '', value: [] };
	let assignmentsBySlotMemoState: { assignments?: ThemeAssignment[]; value: Map<ThemeAssignment['slot'], ThemeAssignment[]> } = { value: new Map() };
	let revisionEntriesMemoState: { revisions?: DocumentRevision[]; documentId?: string; value: DocumentRevision[] } = { value: [] };

	$: activeDocument = getActiveDocument( state );
	$: activeSession = state.documentSessions[ state.activeDocumentId ];
	$: isNodeInspectorPanel = state.ui.panel === 'content' || state.ui.panel === 'style' || state.ui.panel === 'advanced';
	$: activeInspectorTab = state.ui.panel === 'style' || state.ui.panel === 'advanced' ? state.ui.panel : 'content';
	$: {
		const nodeId = state.ui.selectedNodeIds[ 0 ];
		selectedNode = nodeId ? editor.getActiveDocumentCache().nodeById.get( nodeId ) : undefined;
	}
	$: selectedDefinition = getMemoizedSelectedDefinition( selectedNode, state );
	$: contentSections = selectedDefinition?.contentSections ?? selectedDefinition?.panelSections.filter( ( section ) => ( section.tab ?? 'content' ) === 'content' ) ?? [];
	$: styleSections = selectedDefinition?.styleSections ?? [];
	$: advancedSections = selectedDefinition?.advancedSections ?? [];
	$: visibleContentSections = selectedNode ? contentSections.filter( ( section ) => section.fields.some( ( field ) => isFieldVisible( field, selectedNode! ) ) ) : [];
	$: visibleStyleSections = selectedNode ? styleSections.filter( ( section ) => isConditionMatched( section.condition, selectedNode! ) && section.controls.some( ( control ) => isStyleControlVisible( control, selectedNode! ) ) ) : [];
	$: visibleAdvancedSections = selectedNode ? advancedSections.filter( ( section ) => isConditionMatched( section.condition, selectedNode! ) ) : [];
	$: authoringBreakpoints = getAuthoringBreakpointDefinitions( state.project.designSystem.breakpoints );
	$: selectedNodeLayoutDisplay = selectedNode ? getEffectiveContainerLayoutDisplay( selectedNode ) : '';
	$: selectedNodeLayoutDirection = selectedNode ? getEffectiveContainerLayoutDirection( selectedNode ) : '';
	$: if (
		typographyPopoverSectionId
		&& (
			activeInspectorTab !== 'style'
			|| !selectedNode
			|| !visibleStyleSections.some( ( section ) => section.id === typographyPopoverSectionId && isPopoverStyleSection( section ) )
		)
	) {
		closeTypographyPopover();
	}
	$: {
		typographyPopoverAnchorCleanup();
		typographyPopoverAnchorCleanup = () => {};
		if ( typographyPopoverSectionId && typographyPopoverAnchorElement && typographyPopoverElement ) {
			typographyPopoverAnchorCleanup = typographyPopoverAnchorController.open( typographyPopoverAnchorElement, typographyPopoverElement, {
				placement: 'bottom-end',
			} );
		}
	}
	$: styleOrigins = getMemoizedStyleOrigins( selectedNode, state.project );
	$: documentAssignments = getMemoizedDocumentAssignments( state.project.themeAssignments, state.activeDocumentId );
	$: componentDocuments = getMemoizedDocumentKindLists( state.project.documents ).components;
	$: componentDocumentsById = getMemoizedDocumentKindLists( state.project.documents ).componentById;
	$: libraryDocuments = getMemoizedDocumentKindLists( state.project.documents ).libraries;
	$: if ( externalImportResult && externalImportResult !== lastExternalImportResult ) {
		lastExternalImportResult = externalImportResult;
		showTemplateImportResult( externalImportResult );
	}
	$: componentUsage = getMemoizedComponentUsage( state.project.documents );
	$: filteredClasses = getMemoizedFilteredClasses( state.project.designSystem.classes, classSearch );
	$: filteredVariables = getMemoizedFilteredVariables( state.project.designSystem.variables, variableSearch );
	$: selectedComponentDocument = selectedNode?.type === 'component-instance'
		? componentDocumentsById.get( String( selectedNode?.props.componentId ?? '' ) )
		: undefined;
	$: activeComponentWorkflow = activeDocument.kind === 'component' ? getDocumentComponentWorkflow( activeDocument ) : undefined;
	$: selectedComponentWorkflow = selectedComponentDocument ? getDocumentComponentWorkflow( selectedComponentDocument ) : undefined;
	$: selectedComponentExposures = selectedComponentWorkflow?.exposedProperties ?? [];
	$: assignmentsBySlot = getMemoizedAssignmentsBySlot( documentAssignments );
	$: revisionEntries = getMemoizedRevisionEntries( state.project.revisions, activeDocument.id );
	$: mediaDiagnostics = editor.getMediaDiagnostics().map( ( diagnostic ) => diagnostic.message );
	$: componentExposureCandidates = activeDocument.kind === 'component' && selectedNode && selectedDefinition
		? buildComponentExposureCandidates( selectedNode, selectedDefinition, activeComponentWorkflow?.exposedProperties ?? [] )
		: [];

	onMount( () => {
		unsubscribe = editor.subscribeSelector( ( nextState ) => nextState, ( nextState ) => {
			state = nextState;
		}, areInspectorStatesEqual, 'inspector' );
		void refreshMediaAssets();

		const handleGlobalPointerDown = ( event: PointerEvent ) => {
			if ( !typographyPopoverSectionId ) {
				return;
			}
			const target = event.target;
			if ( !( target instanceof Node ) ) {
				return;
			}
			if ( typographyPopoverElement?.contains( target ) || typographyPopoverAnchorElement?.contains( target ) ) {
				return;
			}
			if ( target instanceof Element && target.closest( '[data-inline-edit-preserve-focus="true"]' ) ) {
				return;
			}
			closeTypographyPopover();
		};
		const handleGlobalKeyDown = ( event: KeyboardEvent ) => {
			if ( event.key === 'Escape' && typographyPopoverSectionId ) {
				closeTypographyPopover();
			}
		};
		window.addEventListener( 'pointerdown', handleGlobalPointerDown, true );
		window.addEventListener( 'keydown', handleGlobalKeyDown );

		return () => {
			typographyPopoverAnchorCleanup();
			typographyPopoverAnchorController.close();
			window.removeEventListener( 'pointerdown', handleGlobalPointerDown, true );
			window.removeEventListener( 'keydown', handleGlobalKeyDown );
			unsubscribe();
		};
	} );

	function areInspectorStatesEqual( left: BuilderEngineState, right: BuilderEngineState ) {
		return left.project === right.project
			&& left.activeDocumentId === right.activeDocumentId
			&& left.ui.panel === right.ui.panel
			&& left.ui.selectedNodeIds[ 0 ] === right.ui.selectedNodeIds[ 0 ]
			&& left.ui.preview.pathname === right.ui.preview.pathname
			&& left.ui.preview.query === right.ui.preview.query
			&& left.ui.preview.showPopups === right.ui.preview.showPopups
			&& left.ui.viewport === right.ui.viewport
			&& left.ui.componentEditing.context === right.ui.componentEditing.context
			&& left.ui.componentEditing.componentDocumentId === right.ui.componentEditing.componentDocumentId
			&& left.ui.saveState === right.ui.saveState
			&& left.documentSessions === right.documentSessions;
	}

	async function refreshMediaAssets() {
		mediaAssets = await editor.listMediaAssets();
	}

	async function uploadMediaAsset( file: File ) {
		const asset = await editor.uploadMediaAsset( file );
		await refreshMediaAssets();
		return asset;
	}

	async function updateMediaAsset( assetId: string, patch: Partial<BuilderMediaAssetMetadata> ) {
		const asset = await editor.updateMediaAsset( assetId, patch );
		await refreshMediaAssets();
		return asset;
	}

	async function deleteMediaAsset( assetId: string ) {
		await editor.deleteMediaAsset( assetId );
		await refreshMediaAssets();
	}

	function getMemoizedStyleOrigins( node: BuilderNode | undefined, project: BuilderEngineState['project'] ) {
		if ( !node ) {
			styleOriginsMemoState = { node: undefined, project, value: [] };
			return styleOriginsMemoState.value;
		}

		if ( styleOriginsMemoState.node === node && styleOriginsMemoState.project === project ) {
			return styleOriginsMemoState.value;
		}

		styleOriginsMemoState = {
			node,
			project,
			value: getStyleOrigins( node, project ),
		};
		return styleOriginsMemoState.value;
	}

	function getMemoizedDocumentAssignments( assignments: ThemeAssignment[], documentId: string ) {
		if ( documentAssignmentsMemoState.assignments === assignments && documentAssignmentsMemoState.documentId === documentId ) {
			return documentAssignmentsMemoState.value;
		}

		documentAssignmentsMemoState = {
			assignments,
			documentId,
			value: assignments.filter( ( assignment ) => assignment.documentId === documentId ),
		};
		return documentAssignmentsMemoState.value;
	}

	function getMemoizedDocumentKindLists( documents: BuilderDocument[] ) {
		if ( documentKindListsMemoState.documents === documents ) {
			return {
				components: documentKindListsMemoState.components,
				componentById: documentKindListsMemoState.componentById,
				libraries: documentKindListsMemoState.libraries,
			};
		}

		const components = documents.filter( ( document ) => document.kind === 'component' );
		documentKindListsMemoState = {
			documents,
			components,
			componentById: new Map( components.map( ( document ) => [ document.id, document ] ) ),
			libraries: documents.filter( ( document ) => document.kind === 'library-item' ),
		};
		return {
			components: documentKindListsMemoState.components,
			componentById: documentKindListsMemoState.componentById,
			libraries: documentKindListsMemoState.libraries,
		};
	}

	function getMemoizedSelectedDefinition( node: BuilderNode | undefined, nextState: BuilderEngineState ) {
		if ( !node ) {
			selectedDefinitionMemoState = {};
			return undefined;
		}

		if (
			selectedDefinitionMemoState.node === node
			&& selectedDefinitionMemoState.project === nextState.project
			&& selectedDefinitionMemoState.registry === editor.registry
			&& selectedDefinitionMemoState.adapter === editor.adapter
			&& selectedDefinitionMemoState.bindingContext === editor.bindingContext
			&& selectedDefinitionMemoState.pathname === nextState.ui.preview.pathname
			&& selectedDefinitionMemoState.query === nextState.ui.preview.query
			&& selectedDefinitionMemoState.viewport === nextState.ui.viewport
			&& selectedDefinitionMemoState.showPopups === nextState.ui.preview.showPopups
		) {
			return selectedDefinitionMemoState.value;
		}

		const value = getElementDefinition( node, {
			project: nextState.project,
			registry: editor.registry,
			adapter: editor.adapter,
			bindingContext: editor.bindingContext ?? {},
			conditionContext: {
				pathname: nextState.ui.preview.pathname,
				query: new URLSearchParams( nextState.ui.preview.query ),
			},
			viewport: nextState.ui.viewport,
			reducedMotion: false,
			showPopups: nextState.ui.preview.showPopups,
			runtimeComponents: editor.runtimeComponents ?? new Map(),
			composition: { activePage: undefined, previewDocument: undefined, previewSlot: undefined, slotDocuments: {}, slotAssignments: {}, assignments: [] },
			componentsById: new Map(),
			stylesheet: '',
		} );

		selectedDefinitionMemoState = {
			node,
			project: nextState.project,
			registry: editor.registry,
			adapter: editor.adapter,
			bindingContext: editor.bindingContext,
			pathname: nextState.ui.preview.pathname,
			query: nextState.ui.preview.query,
			viewport: nextState.ui.viewport,
			showPopups: nextState.ui.preview.showPopups,
			value,
		};
		return value;
	}

	function getMemoizedComponentUsage( documents: BuilderDocument[] ) {
		if ( componentUsageMemoState.documents === documents ) {
			return componentUsageMemoState.value;
		}

		componentUsageMemoState = {
			documents,
			value: buildComponentUsage( documents ),
		};
		return componentUsageMemoState.value;
	}

	function getMemoizedFilteredClasses( classes: ClassDefinition[], search: string ) {
		if ( classFilterMemoState.classes === classes && classFilterMemoState.search === search ) {
			return classFilterMemoState.value;
		}

		const normalizedSearch = search.toLowerCase();
		classFilterMemoState = {
			classes,
			search,
			value: classes.filter( ( definition ) => `${ definition.label } ${ definition.name } ${ definition.group ?? '' } ${ definition.description ?? '' } ${ ( definition.extends ?? [] ).join( ' ' ) }`.toLowerCase().includes( normalizedSearch ) ),
		};
		return classFilterMemoState.value;
	}

	function getMemoizedFilteredVariables( variables: VariableDefinition[], search: string ) {
		if ( variableFilterMemoState.variables === variables && variableFilterMemoState.search === search ) {
			return variableFilterMemoState.value;
		}

		const normalizedSearch = search.toLowerCase();
		variableFilterMemoState = {
			variables,
			search,
			value: variables.filter( ( definition ) => `${ definition.label } ${ definition.name } ${ definition.group ?? '' } ${ definition.description ?? '' } ${ definition.kind } ${ definition.source ?? '' }`.toLowerCase().includes( normalizedSearch ) ),
		};
		return variableFilterMemoState.value;
	}

	function getMemoizedAssignmentsBySlot( assignments: ThemeAssignment[] ) {
		if ( assignmentsBySlotMemoState.assignments === assignments ) {
			return assignmentsBySlotMemoState.value;
		}

		assignmentsBySlotMemoState = {
			assignments,
			value: assignments.reduce( ( grouped, assignment ) => {
				const bucket = grouped.get( assignment.slot ) ?? [];
				bucket.push( assignment );
				grouped.set( assignment.slot, bucket );
				return grouped;
			}, new Map<ThemeAssignment['slot'], ThemeAssignment[]>() ),
		};
		return assignmentsBySlotMemoState.value;
	}

	function getMemoizedRevisionEntries( revisions: DocumentRevision[], documentId: string ) {
		if ( revisionEntriesMemoState.revisions === revisions && revisionEntriesMemoState.documentId === documentId ) {
			return revisionEntriesMemoState.value;
		}

		revisionEntriesMemoState = {
			revisions,
			documentId,
			value: [ ...revisions ]
				.filter( ( revision ) => revision.documentId === documentId )
				.sort( ( left, right ) => Date.parse( right.createdAt ) - Date.parse( left.createdAt ) ),
		};
		return revisionEntriesMemoState.value;
	}

	function inferAssignmentSlot( document: BuilderDocument ): ThemeAssignment['slot'] {
		const title = `${ document.title } ${ document.slug }`.toLowerCase();
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
		if ( title.includes( 'loop' ) ) {
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
			return `/${ document.slug }`;
		}
		if ( slot === 'popup' ) {
			return state.ui.preview.pathname;
		}
		return '/[...all]';
	}

	const sharedFormSectionPrefixes: Record<string, string> = {
		labels: '--builder-form-label',
		fields: '--builder-form-field',
		submit: '--builder-form-submit',
	};
	const scopedStyleSectionPrefixes: Record<string, Record<string, string>> = {
		'icon-box': {
			title: '--builder-icon-box-title',
			description: '--builder-icon-box-description',
		},
		tabs: {
			title: '--builder-tabs-title',
			content: '--builder-tabs-content',
		},
		accordion: {
			title: '--builder-accordion-title',
			icon: '--builder-accordion-icon',
			content: '--builder-accordion-content',
		},
		toggle: {
			title: '--builder-accordion-title',
			icon: '--builder-accordion-icon',
			content: '--builder-accordion-content',
		},
		form: sharedFormSectionPrefixes,
		'form-field-text': sharedFormSectionPrefixes,
		'form-field-email': sharedFormSectionPrefixes,
		'form-field-textarea': sharedFormSectionPrefixes,
		'form-field-select': sharedFormSectionPrefixes,
		'form-field-checkbox': sharedFormSectionPrefixes,
		'form-field-submit': sharedFormSectionPrefixes,
		loop: {
			item: '--builder-loop-item',
			'empty-state': '--builder-loop-empty',
		},
		carousel: {
			slides: '--builder-carousel-slide',
			content: '--builder-carousel-content',
			navigation: '--builder-carousel-nav',
		},
		'popup-root': {
			'close-button': '--builder-popup-close',
		},
	};
	const sharedFormSectionAliases: Record<string, Record<string, string>> = {
		form: {
			gap: '--builder-form-gap',
			padding: '--builder-form-padding',
		},
	};
	const menuSectionAliases: Record<string, Record<string, string>> = {
		menu: {
			gap: '--builder-menu-gap',
			'flex-direction': '--builder-menu-direction',
			'justify-content': '--builder-menu-justify',
		},
		item: {
			color: '--builder-menu-item-color',
			'background-color': '--builder-menu-item-background',
			padding: '--builder-menu-item-padding',
			'border-radius': '--builder-menu-item-radius',
		},
		dropdown: {
			'background-color': '--builder-menu-dropdown-background',
			'border-color': '--builder-menu-dropdown-border-color',
			'box-shadow': '--builder-menu-dropdown-box-shadow',
		},
	};
	const scopedStyleSectionAliases: Record<string, Record<string, Record<string, string>>> = {
		menu: menuSectionAliases,
		'social-icons': menuSectionAliases,
		gallery: {
			layout: {
				'grid-template-columns': '--builder-gallery-columns',
				gap: '--builder-gallery-gap',
				'aspect-ratio': '--builder-gallery-aspect-ratio',
			},
			images: {
				'object-fit': '--builder-gallery-image-object-fit',
				filter: '--builder-gallery-image-filter',
				opacity: '--builder-gallery-image-opacity',
			},
		},
		form: sharedFormSectionAliases,
		'form-field-text': sharedFormSectionAliases,
		'form-field-email': sharedFormSectionAliases,
		'form-field-textarea': sharedFormSectionAliases,
		'form-field-select': sharedFormSectionAliases,
		'form-field-checkbox': sharedFormSectionAliases,
		'form-field-submit': sharedFormSectionAliases,
		loop: {
			grid: {
				'grid-template-columns': '--builder-loop-columns',
				'row-gap': '--builder-loop-row-gap',
				'column-gap': '--builder-loop-column-gap',
			},
		},
		'popup-root': {
			popup: {
				width: '--builder-popup-width',
				'max-width': '--builder-popup-max-width',
				padding: '--builder-popup-padding',
				'background-color': '--builder-popup-background',
			},
		},
		'icon-box': {
			icon: {
				'font-size': '--builder-icon-size',
				color: '--builder-icon-color',
			},
		},
		accordion: {
			icon: {
				'font-size': '--builder-accordion-icon-font-size',
				'--builder-icon-color': '--builder-accordion-icon-color',
				'--builder-icon-gap': '--builder-accordion-icon-gap',
			},
		},
		toggle: {
			icon: {
				'font-size': '--builder-accordion-icon-font-size',
				'--builder-icon-color': '--builder-accordion-icon-color',
				'--builder-icon-gap': '--builder-accordion-icon-gap',
			},
		},
	};

	function normalizeMenuDirectionValue( value: JsonValue ): string {
		return String( value ?? '' ) === 'vertical' ? 'column' : 'row';
	}

	function denormalizeMenuDirectionValue( value: string ): string | undefined {
		if ( !value ) {
			return undefined;
		}
		return value === 'column' ? 'vertical' : value === 'row' ? 'horizontal' : value;
	}

	function normalizeMenuAlignmentValue( value: JsonValue ): string {
		switch ( String( value ?? '' ) ) {
			case 'left':
				return 'flex-start';
			case 'right':
				return 'flex-end';
			case 'center':
				return 'center';
			case 'space-between':
				return 'space-between';
			default:
				return String( value ?? 'flex-start' );
		}
	}

	function denormalizeMenuAlignmentValue( value: string ): string | undefined {
		switch ( value ) {
			case 'flex-start':
				return 'left';
			case 'flex-end':
				return 'right';
			case 'center':
				return 'center';
			case 'space-between':
				return 'space-between';
			default:
				return value || undefined;
		}
	}

	function resolveScopedStylePropertyForNode( nodeType: string, sectionId: string, property: string ): string {
		const normalized = normalizeStylePropertyName( property );
		const aliased = scopedStyleSectionAliases[ nodeType ]?.[ sectionId ]?.[ normalized ];
		if ( aliased ) {
			return aliased;
		}

		const prefix = scopedStyleSectionPrefixes[ nodeType ]?.[ sectionId ];
		return prefix ? `${ prefix }-${ normalized }` : property;
	}

	function getSelectedNodeScopedStyleProperty( sectionId: string | undefined, property: string ): string {
		if ( !selectedNode || !sectionId ) {
			return property;
		}

		return resolveScopedStylePropertyForNode( selectedNode.type, sectionId, property );
	}

	function buildCompatibilityBaseStylePatch( node: BuilderNode, entries: Array<[ string, JsonValue ]> ): Partial<StyleSet> | undefined {
		if ( !entries.length ) {
			return undefined;
		}

		let base = structuredClone( node.styles.base ) as Record<string, JsonValue>;
		for ( const [ property, nextValue ] of entries ) {
			base = setStyleRecordValue( base, property, nextValue );
		}

		return { base };
	}

	function buildCompatibilityStylePatch( node: BuilderNode, path: string, value: JsonValue ): Partial<StyleSet> | undefined {
		if ( path === 'props.align' && [ 'heading', 'paragraph', 'text-editor', 'blockquote' ].includes( node.type ) ) {
			return buildCompatibilityBaseStylePatch( node, [ [ 'text-align', String( value ?? '' ) ] ] );
		}

		if ( path === 'props.fit' && node.type === 'image' ) {
			return buildCompatibilityBaseStylePatch( node, [ [ 'object-fit', String( value ?? '' ) ] ] );
		}

		if ( path === 'props.orientation' && [ 'menu', 'social-icons' ].includes( node.type ) ) {
			return buildCompatibilityBaseStylePatch( node, [ [ '--builder-menu-direction', normalizeMenuDirectionValue( value ) ] ] );
		}

		if ( path === 'props.alignment' && [ 'menu', 'social-icons' ].includes( node.type ) ) {
			return buildCompatibilityBaseStylePatch( node, [ [ '--builder-menu-justify', normalizeMenuAlignmentValue( value ) ] ] );
		}

		return undefined;
	}

	function readCompatibilityFieldValue( node: BuilderNode, path: string ): JsonValue | undefined {
		if ( path === 'props.align' && [ 'heading', 'paragraph', 'text-editor', 'blockquote' ].includes( node.type ) ) {
			return readStyleValue( node.styles, 'text-align', 'base' ) ?? readStyleValue( node.styles, 'align', 'base' ) ?? undefined;
		}

		if ( path === 'props.fit' && node.type === 'image' ) {
			return readStyleValue( node.styles, 'object-fit', 'base' ) ?? undefined;
		}

		if ( path === 'props.orientation' && [ 'menu', 'social-icons' ].includes( node.type ) ) {
			const direction = readStyleValue( node.styles, '--builder-menu-direction', 'base' );
			return typeof direction === 'string' ? denormalizeMenuDirectionValue( direction ) : undefined;
		}

		if ( path === 'props.alignment' && [ 'menu', 'social-icons' ].includes( node.type ) ) {
			const justify = readStyleValue( node.styles, '--builder-menu-justify', 'base' );
			return typeof justify === 'string' ? denormalizeMenuAlignmentValue( justify ) : undefined;
		}

		return undefined;
	}

	function serializeStyleUrlValue( property: string, value: JsonValue ): string {
		const raw = typeof value === 'string'
			? value.trim()
			: value && typeof value === 'object' && !Array.isArray( value )
				? serializeUrlValue( value as { url?: string } )
				: '';
		if ( !raw ) {
			return '';
		}
		if ( property === 'background-image' ) {
			return /^url\(/i.test( raw ) ? raw : `url("${ raw.replaceAll( '"', '\\"' ) }")`;
		}
		return raw;
	}

	function updateFieldValue( path: string, value: JsonValue ) {
		if ( !selectedNode ) {
			return;
		}

		if ( path.startsWith( 'props.' ) ) {
			const compatibilityStylesPatch = buildCompatibilityStylePatch( selectedNode, path, value );
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				propsPatch: setNestedValue( structuredClone( selectedNode.props ), path.replace( 'props.', '' ), value ),
				...( compatibilityStylesPatch ? { stylesPatch: compatibilityStylesPatch } : {} ),
			} );
			return;
		}

		if ( path.startsWith( 'layout.' ) ) {
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				layoutPatch: setNestedValue( structuredClone( selectedNode.layout ), path.replace( 'layout.', '' ), value ),
			} );
			return;
		}

		if ( path.startsWith( 'styles.' ) ) {
			const stylePath = path.replace( 'styles.', '' );
			const segments = stylePath.split( '.' ).filter( Boolean );
			if ( segments[ 0 ] === 'base' && segments.length === 2 ) {
				editor.dispatch( {
					type: 'document/elements/update',
					nodeId: selectedNode.id,
					stylesPatch: {
						base: setStyleRecordValue( structuredClone( selectedNode.styles.base ) as Record<string, JsonValue>, segments[ 1 ]!, value ),
					},
				} );
				return;
			}

			if ( segments[ 0 ] === 'breakpoints' && segments.length === 3 ) {
				const breakpointId = segments[ 1 ]!;
				editor.dispatch( {
					type: 'document/elements/update',
					nodeId: selectedNode.id,
					stylesPatch: {
						breakpoints: {
							...selectedNode.styles.breakpoints,
							[ breakpointId ]: setStyleRecordValue(
								structuredClone( selectedNode.styles.breakpoints[ breakpointId ] ?? {} ) as Record<string, JsonValue>,
								segments[ 2 ]!,
								value,
							),
						},
					},
				} );
				return;
			}

			if ( segments[ 0 ] === 'states' && segments.length === 3 ) {
				const stateId = segments[ 1 ]!;
				editor.dispatch( {
					type: 'document/elements/update',
					nodeId: selectedNode.id,
					stylesPatch: {
						states: {
							...selectedNode.styles.states,
							[ stateId ]: setStyleRecordValue(
								structuredClone( selectedNode.styles.states[ stateId ] ?? {} ) as Record<string, JsonValue>,
								segments[ 2 ]!,
								value,
							),
						},
					},
				} );
				return;
			}

			if ( segments[ 0 ] === 'stateBreakpoints' && segments.length === 4 ) {
				const breakpointId = segments[ 1 ]!;
				const stateId = segments[ 2 ]!;
				editor.dispatch( {
					type: 'document/elements/update',
					nodeId: selectedNode.id,
					stylesPatch: {
						stateBreakpoints: {
							...selectedNode.styles.stateBreakpoints,
							[ breakpointId ]: {
								...( selectedNode.styles.stateBreakpoints[ breakpointId ] ?? {} ),
								[ stateId ]: setStyleRecordValue(
									structuredClone( selectedNode.styles.stateBreakpoints[ breakpointId ]?.[ stateId ] ?? {} ) as Record<string, JsonValue>,
									segments[ 3 ]!,
									value,
								),
							},
						},
					},
				} );
				return;
			}

			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				stylesPatch: setNestedValue( structuredClone( selectedNode.styles ) as unknown as Record<string, JsonValue>, stylePath, value ) as Partial<StyleSet>,
			} );
			return;
		}

		if ( path.startsWith( 'legacy.' ) ) {
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				legacy: setNestedValue( structuredClone( selectedNode.legacy ?? {
					widgetType: 'legacy',
					version: 'elementor-4.1.0',
					rawSettings: {},
					editable: true,
				} ) as unknown as Record<string, JsonValue>, path.replace( 'legacy.', '' ), value ) as BuilderNode['legacy'],
			} );
			return;
		}

		if ( path.startsWith( 'meta.' ) ) {
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				patch: {
					meta: setNestedValue( structuredClone( selectedNode.meta ) as Record<string, JsonValue>, path.replace( 'meta.', '' ), value ),
				},
			} );
			return;
		}

		if ( path === 'meta' ) {
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				patch: {
					meta: value as Record<string, JsonValue>,
				},
			} );
			return;
		}

		if ( path.startsWith( 'visibility.' ) ) {
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				patch: {
					visibility: setNestedValue( structuredClone( selectedNode.visibility ) as unknown as Record<string, JsonValue>, path.replace( 'visibility.', '' ), value ) as VisibilityRule,
				},
			} );
			return;
		}

		if ( path.startsWith( 'accessibility.' ) ) {
			editor.dispatch( {
				type: 'document/elements/update',
				nodeId: selectedNode.id,
				patch: {
					accessibility: setNestedValue( structuredClone( selectedNode.accessibility ) as unknown as Record<string, JsonValue>, path.replace( 'accessibility.', '' ), value ) as Accessibility,
				},
			} );
		}
	}

	function updateSelectedNodePatch( patch: Partial<BuilderNode> ) {
		if ( !selectedNode ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			patch,
		} );
	}

	function updateBindings( bindings: Binding[] ) {
		if ( !selectedNode ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			bindings,
		} );
	}

	function updateAttributes( attributes: HtmlAttribute[] ) {
		if ( !selectedNode ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			attributes,
		} );
	}

	function addBinding() {
		if ( !selectedNode ) {
			return;
		}

		updateBindings( [
			...selectedNode.bindings,
			createBinding(),
		] );
	}

	function updateBinding( bindingId: string, patch: Partial<Binding> ) {
		if ( !selectedNode ) {
			return;
		}

		updateBindings( selectedNode.bindings.map( ( binding ) => binding.id === bindingId ? { ...binding, ...patch } : binding ) );
	}

	function removeBinding( bindingId: string ) {
		if ( !selectedNode ) {
			return;
		}

		updateBindings( selectedNode.bindings.filter( ( binding ) => binding.id !== bindingId ) );
	}

	function addAttribute() {
		if ( !selectedNode ) {
			return;
		}

		updateAttributes( [
			...selectedNode.attributes,
			createAttribute(),
		] );
	}

	function updateAttribute( attributeId: string, patch: Partial<HtmlAttribute> ) {
		if ( !selectedNode ) {
			return;
		}

		updateAttributes( selectedNode.attributes.map( ( attribute ) => attribute.id === attributeId ? { ...attribute, ...patch } : attribute ) );
	}

	function removeAttribute( attributeId: string ) {
		if ( !selectedNode ) {
			return;
		}

		updateAttributes( selectedNode.attributes.filter( ( attribute ) => attribute.id !== attributeId ) );
	}

	function getStaticAttributeValue( name: string ): string {
		return selectedNode?.attributes.find( ( attribute ) => attribute.kind === 'static' && attribute.name === name )?.value ?? '';
	}

	function updateStaticAttributeValue( name: string, value: string ) {
		if ( !selectedNode ) {
			return;
		}

		const normalizedValue = value.trim();
		const existing = selectedNode.attributes.find( ( attribute ) => attribute.kind === 'static' && attribute.name === name );
		if ( !normalizedValue ) {
			updateAttributes( selectedNode.attributes.filter( ( attribute ) => attribute.id !== existing?.id ) );
			return;
		}

		if ( existing ) {
			updateAttributes(
				selectedNode.attributes.map( ( attribute ) => attribute.id === existing.id ? { ...attribute, value: normalizedValue } : attribute ),
			);
			return;
		}

		updateAttributes( [
			...selectedNode.attributes,
			{
				id: crypto.randomUUID(),
				name,
				value: normalizedValue,
				kind: 'static',
			},
		] );
	}

	function createBinding(): Binding {
		return {
			id: crypto.randomUUID(),
			targetKind: 'prop',
			target: '',
			source: 'route',
			path: '',
			args: {},
		};
	}

	function getDynamicCategoryForField( field: BuilderFieldDefinition ): Binding['category'] | undefined {
		if ( field.type === 'rich-text' || field.type === 'textarea' ) {
			return 'richText';
		}
		if ( field.type === 'url' ) {
			return 'url';
		}
		if ( field.type === 'image' ) {
			return 'image';
		}
		if ( field.type === 'number' ) {
			return 'number';
		}
		if ( field.type === 'toggle' ) {
			return 'boolean';
		}
		if ( field.type === 'json' ) {
			return 'object';
		}
		return 'text';
	}

	function getDynamicCategoryForStyle( property: BuilderStylePropertyDefinition ): Binding['category'] | undefined {
		const key = property.key.toLowerCase();
		if ( key.includes( 'color' ) || property.primitive?.kind === 'color' ) {
			return 'color';
		}
		if ( property.controlType === 'url' || key.includes( 'image' ) ) {
			return 'url';
		}
		if ( property.controlType === 'number' ) {
			return 'number';
		}
		return 'text';
	}

	function getPropTargetFromField( field: BuilderFieldDefinition ): string {
		return field.path.startsWith( 'props.' ) ? field.path.slice( 'props.'.length ) : field.path;
	}

	function getDynamicBindingForTarget( targetKind: Binding['targetKind'], target: string ): Binding | undefined {
		return selectedNode?.bindings.find( ( binding ) => binding.targetKind === targetKind && binding.target === target );
	}

	function getDynamicProviderOptions( category: Binding['category'] | undefined ) {
		return editor.listDynamicProviders( category ).map( ( provider ) => ( {
			id: provider.id,
			label: provider.label,
			group: provider.group,
			categories: provider.categories,
		} ) );
	}

	function getDynamicBindingView( binding: Binding | undefined ) {
		if ( !binding ) {
			return undefined;
		}
		const provider = editor.listDynamicProviders().find( ( entry ) => entry.id === binding.path );
		return {
			id: binding.id,
			providerId: binding.path,
			label: provider?.label ?? binding.path,
			category: binding.category,
			fallback: binding.fallback,
			before: binding.before,
			after: binding.after,
			args: binding.args,
			preview: binding.fallback === undefined ? undefined : String( binding.fallback ),
		};
	}

	function selectDynamicBinding( targetKind: Binding['targetKind'], target: string, category: Binding['category'] | undefined, providerId: string ) {
		if ( !selectedNode || !providerId ) {
			return;
		}
		editor.addDynamicBinding( selectedNode.id, {
			targetKind,
			target,
			source: 'dynamic',
			path: providerId,
			category,
			fallback: targetKind === 'style'
				? readStyleRecordValue( selectedNode.styles.base, target ) as JsonValue
				: getByPath( selectedNode.props, target ) as JsonValue,
			args: {},
		} );
	}

	function clearDynamicBinding( targetKind: Binding['targetKind'], target: string ) {
		const binding = getDynamicBindingForTarget( targetKind, target );
		if ( binding ) {
			editor.removeDynamicBinding( binding.id );
		}
	}

	function getByPath( record: Record<string, JsonValue>, path: string ): JsonValue | undefined {
		return path.split( '.' ).filter( Boolean ).reduce<JsonValue | undefined>( ( current, segment ) => {
			if ( current && typeof current === 'object' && !Array.isArray( current ) && segment in current ) {
				return ( current as Record<string, JsonValue> )[ segment ];
			}
			return undefined;
		}, record );
	}

	function createAttribute(): HtmlAttribute {
		return {
			id: crypto.randomUUID(),
			name: '',
			value: '',
			kind: 'static',
		};
	}

	function updateVisibilityConditionGroups( conditionGroups: VisibilityRule['conditionGroups'] ) {
		updateFieldValue( 'visibility.conditionGroups', conditionGroups as JsonValue );
	}

	function updateMetaJson( value: string ) {
		if ( !selectedNode ) {
			return;
		}

		jsonDrafts = {
			...jsonDrafts,
			[ `${ selectedNode.id }:meta` ]: value,
		};
	}

	function commitMetaJson() {
		if ( !selectedNode ) {
			return;
		}

		const key = `${ selectedNode.id }:meta`;
		const draft = jsonDrafts[ key ] ?? JSON.stringify( selectedNode.meta ?? {}, null, 2 );
		try {
			const parsed = JSON.parse( draft ) as Record<string, JsonValue>;
			updateFieldValue( 'meta', parsed );
			delete jsonDrafts[ key ];
			delete jsonErrors[ key ];
			jsonDrafts = { ...jsonDrafts };
			jsonErrors = { ...jsonErrors };
		} catch {
			jsonErrors = {
				...jsonErrors,
				[ key ]: 'Enter valid JSON to apply this field.',
			};
		}
	}

	function getBindingDraftKey( bindingId: string, key: string ): string {
		return `binding:${ bindingId }:${ key }`;
	}

	function getBindingArgsInputValue( binding: Binding ): string {
		const key = getBindingDraftKey( binding.id, 'args' );
		return jsonDrafts[ key ] ?? JSON.stringify( binding.args ?? {}, null, 2 );
	}

	function onBindingArgsInput( binding: Binding, value: string ) {
		const key = getBindingDraftKey( binding.id, 'args' );
		jsonDrafts = {
			...jsonDrafts,
			[ key ]: value,
		};
	}

	function commitBindingArgs( binding: Binding ) {
		const key = getBindingDraftKey( binding.id, 'args' );
		const draft = jsonDrafts[ key ] ?? JSON.stringify( binding.args ?? {}, null, 2 );
		try {
			const parsed = JSON.parse( draft ) as Record<string, JsonValue>;
			updateBinding( binding.id, { args: parsed } );
			delete jsonDrafts[ key ];
			delete jsonErrors[ key ];
			jsonDrafts = { ...jsonDrafts };
			jsonErrors = { ...jsonErrors };
		} catch {
			jsonErrors = {
				...jsonErrors,
				[ key ]: 'Enter valid JSON to apply this field.',
			};
		}
	}

	function createVisibilityConditionGroup(): ConditionGroup {
		return {
			id: crypto.randomUUID(),
			operator: 'and',
			rules: [ createAssignmentRule() ],
		};
	}

	function addVisibilityConditionGroup() {
		if ( !selectedNode ) {
			return;
		}

		updateSelectedNodePatch( {
			visibility: {
				...selectedNode.visibility,
				conditionGroups: [ ...selectedNode.visibility.conditionGroups, createVisibilityConditionGroup() ],
			},
		} );
	}

	function clearVisibilityConditionGroups() {
		if ( !selectedNode ) {
			return;
		}

		updateSelectedNodePatch( {
			visibility: {
				...selectedNode.visibility,
				conditionGroups: [],
			},
		} );
	}

	function updateVisibilityBreakpointHidden( breakpointId: string, hidden: boolean ) {
		if ( !selectedNode ) {
			return;
		}

		updateSelectedNodePatch( {
			visibility: {
				...selectedNode.visibility,
				breakpointHidden: {
					...selectedNode.visibility.breakpointHidden,
					[ breakpointId ]: hidden,
				},
			},
		} );
	}

	function updateStyle( property: string, value: string, target: ( typeof styleStateTargets )[ number ] = 'base' ) {
		if ( !selectedNode ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			stylesPatch: buildStylePatch( selectedNode.styles, property, value, target ),
		} );
	}

	function attachClass() {
		if ( !selectedNode || !selectedStyleRef ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			styleRefs: [ ...new Set( [ ...selectedNode.styleRefs, selectedStyleRef ] ) ],
		} );
		selectedStyleRef = '';
	}

	function createVariable() {
		if ( !selectedVariableName.trim() ) {
			return;
		}

		const variable: VariableDefinition = {
			id: crypto.randomUUID(),
			name: selectedVariableName,
			label: selectedVariableName,
			kind: selectedVariableKind,
			value: selectedVariableValue,
			group: selectedVariableGroup.trim() || undefined,
			description: selectedVariableDescription.trim() || undefined,
			source: selectedVariableSource,
			meta: {},
		};
		editor.dispatch( { type: 'design/variables/upsert', definition: variable } );
		selectedVariableName = '';
		selectedVariableValue = '';
		selectedVariableKind = 'raw';
		selectedVariableGroup = '';
		selectedVariableDescription = '';
		selectedVariableSource = 'manual';
	}

	function createClass() {
		const className = `class-${ state.project.designSystem.classes.length + 1 }`;
		const definition: ClassDefinition = {
			id: crypto.randomUUID(),
			name: className,
			label: className,
			description: '',
			group: '',
			order: state.project.designSystem.classes.length,
			extends: [],
			styles: {
				base: { padding: '1rem' },
				states: {},
				breakpoints: {},
				stateBreakpoints: {},
				customCss: '',
			},
			usageCount: 0,
			meta: {},
		};
		editor.dispatch( { type: 'design/classes/upsert', definition } );
	}

	function updateClassDefinition( definition: ClassDefinition, patch: Partial<ClassDefinition> ) {
		editor.dispatch( {
			type: 'design/classes/upsert',
			definition: {
				...definition,
				...patch,
			},
		} );
	}

	function updateClassStyle( definition: ClassDefinition, property: string, value: string ) {
		updateClassDefinition( definition, {
			styles: {
				...definition.styles,
				...buildStylePatch( definition.styles, property, value ),
			},
		} );
	}

	function updateVariableDefinition( definition: VariableDefinition, patch: Partial<VariableDefinition> ) {
		editor.dispatch( {
			type: 'design/variables/upsert',
			definition: {
				...definition,
				...patch,
			},
		} );
	}

	function createAssignment() {
		const slot = inferAssignmentSlot( activeDocument );
		const assignment = createThemeAssignment( {
			documentId: activeDocument.id,
			slot,
			status: activeDocument.status === 'published' ? 'published' : 'draft',
			pathname: inferAssignmentPathname( activeDocument, slot ),
			label: activeDocument.title,
		} );
		editor.dispatch( { type: 'project/assignment/upsert', assignment } );
	}

	function updateAssignment( assignment: ThemeAssignment, patch: Partial<ThemeAssignment> ) {
		editor.dispatch( {
			type: 'project/assignment/upsert',
			assignment: {
				...assignment,
				...patch,
			},
		} );
	}

	function createLibraryItem() {
		editor.createLibraryItemFromSelection( newLibraryTitle.trim() || 'Reusable Library Item' );
		newLibraryTitle = 'Reusable Library Item';
	}

	async function handleTemplateImportFile( event: Event ) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[ 0 ];
		if ( !file ) {
			return;
		}

		libraryImportStatus = 'importing';
		libraryImportMessage = `Importing ${ file.name }`;
		libraryImportWarnings = [];
		libraryImportGaps = [];
		try {
			const payload = JSON.parse( await file.text() ) as unknown;
			const result = await editor.importTemplatesFromJson( payload, { sourceName: file.name } );
			showTemplateImportResult( result );
		} catch ( error ) {
			libraryImportStatus = 'error';
			libraryImportMessage = error instanceof Error ? error.message : 'Template import failed.';
			libraryImportWarnings = [];
			libraryImportGaps = [];
		} finally {
			input.value = '';
		}
	}

	function showTemplateImportResult( result: Omit<TemplateImportResult, 'project'> ) {
		libraryImportStatus = 'success';
		libraryImportMessage = `Imported ${ result.summary.libraryItemCount } library item${ result.summary.libraryItemCount === 1 ? '' : 's' } from ${ result.summary.sourceName }.`;
		libraryImportWarnings = result.warnings.map( ( warning ) => warning.message );
		libraryImportGaps = result.parityGaps.map( ( gap ) => gap.message );
	}

	function getLibrarySourceLabel( document: BuilderDocument ) {
		const sourceName = typeof document.meta.importSourceName === 'string' ? document.meta.importSourceName : 'Saved locally';
		const originalKind = typeof document.meta.originalDocumentKind === 'string' ? document.meta.originalDocumentKind : document.kind;
		return `${ sourceName } / ${ formatInspectorLabel( originalKind ) }`;
	}

	function getLibraryNodeCount( document: BuilderDocument ) {
		return flattenNodeTree( document.root ).length;
	}

	function createComponentDocument() {
		editor.createDocument( 'component', newComponentTitle.trim() || 'Reusable Component' );
		newComponentTitle = 'Reusable Component';
	}

	function openDocument( documentId: string, options?: Parameters<BuilderEditorController['openDocument']>[ 1 ] ) {
		editor.openDocument( documentId, options );
	}

	function updateAssignmentConditionGroups( assignment: ThemeAssignment, conditionGroups: ConditionGroup[] ) {
		updateAssignment( assignment, { conditionGroups } );
	}

	function addAssignmentGroup( assignment: ThemeAssignment ) {
		updateAssignmentConditionGroups( assignment, [
			...assignment.conditionGroups,
			{
				id: crypto.randomUUID(),
				operator: 'and',
				rules: [ createAssignmentRule() ],
			},
		] );
	}

	function addAssignmentRule( assignment: ThemeAssignment, groupIndex: number ) {
		const conditionGroups = structuredClone( assignment.conditionGroups );
		conditionGroups[ groupIndex ] ??= {
			id: crypto.randomUUID(),
			operator: 'and',
			rules: [],
		};
		conditionGroups[ groupIndex ].rules.push( createAssignmentRule() );
		updateAssignmentConditionGroups( assignment, conditionGroups );
	}

	function updateAssignmentGroupOperator( assignment: ThemeAssignment, groupIndex: number, operator: ConditionGroup['operator'] ) {
		const conditionGroups = structuredClone( assignment.conditionGroups );
		if ( !conditionGroups[ groupIndex ] ) {
			return;
		}
		conditionGroups[ groupIndex ].operator = operator;
		updateAssignmentConditionGroups( assignment, conditionGroups );
	}

	function updateAssignmentRule( assignment: ThemeAssignment, groupIndex: number, ruleIndex: number, patch: Partial<ConditionRule> ) {
		const conditionGroups = structuredClone( assignment.conditionGroups );
		const group = conditionGroups[ groupIndex ];
		const rule = group?.rules[ ruleIndex ];
		if ( !group || !rule ) {
			return;
		}
		group.rules[ ruleIndex ] = {
			...rule,
			...patch,
		};
		updateAssignmentConditionGroups( assignment, conditionGroups );
	}

	function deleteAssignmentRule( assignment: ThemeAssignment, groupIndex: number, ruleIndex: number ) {
		const conditionGroups = structuredClone( assignment.conditionGroups );
		if ( !conditionGroups[ groupIndex ] ) {
			return;
		}
		conditionGroups[ groupIndex ].rules = conditionGroups[ groupIndex ].rules.filter( ( _, index ) => index !== ruleIndex );
		updateAssignmentConditionGroups( assignment, conditionGroups.filter( ( group ) => group.rules.length ) );
	}

	function deleteAssignmentGroup( assignment: ThemeAssignment, groupIndex: number ) {
		updateAssignmentConditionGroups( assignment, assignment.conditionGroups.filter( ( _, index ) => index !== groupIndex ) );
	}

	function updateComponentWorkflow( patch: Partial<ComponentWorkflow> ) {
		if ( activeDocument.kind !== 'component' ) {
			return;
		}

		editor.dispatch( {
			type: 'document/update',
			documentId: activeDocument.id,
			patch: {
				meta: patchDocumentComponentWorkflow( activeDocument, patch ),
			},
		} );
	}

	function addComponentExposure( exposure: ComponentExposure ) {
		if ( !activeComponentWorkflow ) {
			return;
		}

		const exposures = upsertExposure( activeComponentWorkflow.exposedProperties, exposure );
		updateComponentWorkflow( { exposedProperties: exposures } );
	}

	function updateComponentExposure( exposureId: string, patch: Partial<ComponentExposure> ) {
		if ( !activeComponentWorkflow ) {
			return;
		}

		updateComponentWorkflow( {
			exposedProperties: activeComponentWorkflow.exposedProperties.map( ( exposure ) => exposure.id === exposureId
				? {
					...exposure,
					...patch,
				}
				: exposure ),
		} );
	}

	function removeComponentExposure( exposureId: string ) {
		if ( !activeComponentWorkflow ) {
			return;
		}

		updateComponentWorkflow( {
			exposedProperties: activeComponentWorkflow.exposedProperties.filter( ( exposure ) => exposure.id !== exposureId ),
		} );
	}

	function updateComponentPolicy( key: keyof NonNullable<ComponentWorkflow['instancePolicy']>, value: boolean ) {
		if ( !activeComponentWorkflow ) {
			return;
		}

		updateComponentWorkflow( {
			instancePolicy: {
				...activeComponentWorkflow.instancePolicy,
				[ key ]: value,
			},
		} );
	}

	function updateComponentOverride( exposure: ComponentExposure, value: JsonValue ) {
		if ( !selectedNode || state.ui.componentEditing.context !== 'instance' ) {
			return;
		}

		editor.updateComponentInstanceOverrides( selectedNode.id, {
			[ exposure.id ]: value,
		} );
	}

	async function restoreRevision( revisionId: string ) {
		await editor.restoreRevision( revisionId, activeDocument.id );
	}

	function resolveFieldStyleProperty( field: BuilderFieldDefinition ): BuilderStylePropertyDefinition | undefined {
		if ( !field.styleProperty ) {
			return undefined;
		}

		return {
			key: field.styleProperty,
			label: field.label,
			controlType: field.type,
			responsive: field.responsive,
			placeholder: field.placeholder,
			description: field.description,
			options: field.options,
			condition: field.condition,
			primitive: resolveFieldPrimitive( field ),
		};
	}

	function getActiveAuthoringViewport() {
		return resolveAuthoringViewportId( state.ui.viewport );
	}

	function getAuthoringBreakpointLabel( breakpointId: string = getActiveAuthoringViewport() ) {
		return authoringBreakpoints.find( ( breakpoint ) => breakpoint.id === breakpointId )?.label ?? breakpointId;
	}

	function getResponsiveStyleControlState(
		property: BuilderStylePropertyDefinition,
		target: ( typeof styleStateTargets )[ number ] = 'base',
		sectionId?: string,
	) {
		if ( !selectedNode || !property.responsive ) {
			return undefined;
		}

		const viewport = getActiveAuthoringViewport();
		if ( viewport === 'desktop' ) {
			return undefined;
		}

		const propertyKey = getSelectedNodeScopedStyleProperty( sectionId, property.key );
		const resolution = resolveResponsiveStyleValue( selectedNode.styles, propertyKey, viewport, target === 'base' ? 'base' : target );
		return {
			responsive: true,
			breakpoint: viewport,
			breakpointLabel: getAuthoringBreakpointLabel( viewport ),
			inherited: !resolution.hasOverride,
			hasOverride: resolution.hasOverride,
			canReset: resolution.canReset,
		};
	}

	function getResponsiveFieldState( field: BuilderFieldDefinition ) {
		if ( !selectedNode || !field.responsive || !field.styleProperty ) {
			return undefined;
		}

		const viewport = getActiveAuthoringViewport();
		if ( viewport === 'desktop' ) {
			return undefined;
		}

		const resolution = resolveResponsiveStyleValue( selectedNode.styles, field.styleProperty, viewport, 'base' );
		return {
			responsive: true,
			breakpoint: viewport,
			breakpointLabel: getAuthoringBreakpointLabel( viewport ),
			inherited: !resolution.hasOverride,
			hasOverride: resolution.hasOverride,
			canReset: resolution.canReset,
		};
	}

	function resetResponsiveStyleControl(
		property: BuilderStylePropertyDefinition,
		target: ( typeof styleStateTargets )[ number ] = 'base',
		sectionId?: string,
	) {
		if ( !selectedNode ) {
			return;
		}

		const viewport = getActiveAuthoringViewport();
		if ( viewport === 'desktop' ) {
			return;
		}

		const propertyKey = getSelectedNodeScopedStyleProperty( sectionId, property.key );
		const nextStyles = buildResponsiveStyleReset( selectedNode.styles, propertyKey, viewport, target === 'base' ? 'base' : target );
		if ( nextStyles === selectedNode.styles ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			patch: {
				styles: nextStyles,
			},
		} );
	}

	function resetResponsiveFieldControl( field: BuilderFieldDefinition ) {
		if ( !selectedNode || !field.styleProperty ) {
			return;
		}

		const viewport = getActiveAuthoringViewport();
		if ( viewport === 'desktop' ) {
			return;
		}

		const nextStyles = buildResponsiveStyleReset( selectedNode.styles, field.styleProperty, viewport, 'base' );
		if ( nextStyles === selectedNode.styles ) {
			return;
		}

		editor.dispatch( {
			type: 'document/elements/update',
			nodeId: selectedNode.id,
			patch: {
				styles: nextStyles,
			},
		} );
	}

	function getStyleBackedFieldValue( node: BuilderNode, field: BuilderFieldDefinition ): JsonValue | undefined {
		if ( !field.styleProperty ) {
			return undefined;
		}

		const rawValue = resolveResponsiveStyleValue( node.styles, field.styleProperty, state.ui.viewport, 'base' ).value;
		if ( rawValue !== undefined && rawValue !== '' ) {
			return rawValue as JsonValue;
		}

		const fallbackValue = readEffectiveContainerStyleControlValue( node, field.styleProperty );
		if ( fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '' ) {
			return fallbackValue;
		}

		return undefined;
	}

	function getFieldValue( node: BuilderNode, field: BuilderFieldDefinition ): JsonValue {
		const compatibilityValue = readCompatibilityFieldValue( node, field.path );
		if ( compatibilityValue !== undefined ) {
			return compatibilityValue;
		}

		const styleValue = getStyleBackedFieldValue( node, field );
		if ( styleValue !== undefined ) {
			return styleValue;
		}

		const value = readValueAtPath( node, field.path );
		if ( value === undefined || value === null ) {
			return field.type === 'json' ? [] : '';
		}
		return value as JsonValue;
	}

	function getFieldInputValue( node: BuilderNode, field: BuilderFieldDefinition ): string {
		const value = getFieldValue( node, field );
		if ( field.type === 'json' ) {
			const key = getFieldDraftKey( node.id, field.path );
			return jsonDrafts[ key ] ?? JSON.stringify( value, null, 2 );
		}
		if ( typeof value === 'string' ) {
			return value;
		}
		if ( typeof value === 'number' || typeof value === 'boolean' ) {
			return String( value );
		}
		return JSON.stringify( value, null, 2 );
	}

	function resolveFieldPrimitive( field: BuilderFieldDefinition ): BuilderControlPrimitive | undefined {
		const cachedPrimitive = fieldPrimitiveCache.get( field );
		if ( cachedPrimitive !== undefined ) {
			return cachedPrimitive;
		}

		if ( field.primitive ) {
			fieldPrimitiveCache.set( field, field.primitive );
			return field.primitive;
		}

		if ( field.type === 'select' && field.options?.length ) {
			const signature = `${ field.id } ${ field.label } ${ field.path }`.toLowerCase();
			if ( /align|justify|position|level|size|fit|layout/i.test( signature ) && field.options.length <= 6 ) {
				const primitive = createChoosePrimitive( field.options.map( ( option ) => ( {
					...option,
					icon: inferControlOptionIcon( option.value, option.label, signature ),
				} ) ), {
					layout: 'grid',
					iconPosition: 'top',
					presentation: /align|justify|direction|display|wrap/i.test( signature ) ? 'icon-only' : 'icon-label',
					columns: field.options.length >= 4 ? 2 : Math.min( field.options.length, 3 ),
				} );
				fieldPrimitiveCache.set( field, primitive );
				return primitive;
			}

			const primitive = createSelectPrimitive( field.options, {
				placeholder: field.placeholder,
				description: field.description,
			} );
			fieldPrimitiveCache.set( field, primitive );
			return primitive;
		}

		if ( field.type === 'toggle' ) {
			const primitive = createSwitcherPrimitive( {
				onLabel: 'Yes',
				offLabel: 'No',
				labelsInline: true,
				description: field.description,
			} );
			fieldPrimitiveCache.set( field, primitive );
			return primitive;
		}

		if ( field.type === 'url' ) {
			const primitive = createUrlPrimitive( {
				placeholder: field.placeholder,
				description: field.description,
				showNewTab: true,
				showNoFollow: true,
			} );
			fieldPrimitiveCache.set( field, primitive );
			return primitive;
		}

		if ( field.type === 'image' ) {
			const primitive = createMediaPrimitive( {
				assetType: 'image',
				placeholder: field.placeholder,
				description: field.description,
			} );
			fieldPrimitiveCache.set( field, primitive );
			return primitive;
		}

		if ( field.type === 'text' ) {
			const signature = `${ field.id } ${ field.label } ${ field.path } ${ field.componentExposure?.type ?? '' }`.toLowerCase();
			if ( field.componentExposure?.type === 'image' || /(^|[\s.])(src|source)([\s.]|$)/.test( signature ) ) {
				const assetType = /video/.test( signature ) ? 'video' : 'image';
				const primitive = createMediaPrimitive( {
					assetType,
					placeholder: field.placeholder,
					description: field.description,
				} );
				fieldPrimitiveCache.set( field, primitive );
				return primitive;
			}

			if ( field.componentExposure?.type === 'link' || /(^|[\s.])(href|link|url)([\s.]|$)/.test( signature ) ) {
				const primitive = createUrlPrimitive( {
					placeholder: field.placeholder,
					description: field.description,
					showNewTab: true,
					showNoFollow: true,
					showCustomAttributes: true,
				} );
				fieldPrimitiveCache.set( field, primitive );
				return primitive;
			}
		}

		if ( field.type === 'number' && /spacing|gap|width|height|size|radius|padding|margin/i.test( `${ field.id } ${ field.label } ${ field.path }` ) ) {
			const primitive = createSliderPrimitive( {
				min: 0,
				max: 1600,
				step: 1,
				units: [
					{ label: 'PX', value: 'px', shortLabel: 'px' },
					{ label: '%', value: '%', shortLabel: '%' },
				],
				defaultUnit: 'px',
				showUnit: true,
				description: field.description,
			} );
			fieldPrimitiveCache.set( field, primitive );
			return primitive;
		}

		if ( field.type === 'text' && /color/i.test( `${ field.id } ${ field.label } ${ field.path }` ) ) {
			const primitive = createColorPrimitive( {
				description: field.description,
				tokenAware: true,
			} );
			fieldPrimitiveCache.set( field, primitive );
			return primitive;
		}

		fieldPrimitiveCache.set( field, undefined );
		return undefined;
	}

	function inferControlOptionIcon( value: string, label: string, context = '' ): string | undefined {
		const normalized = `${ context } ${ value } ${ label }`.toLowerCase();
		if ( /display/.test( normalized ) ) {
			if ( normalized.includes( 'grid' ) ) {
				return 'grid';
			}
			if ( normalized.includes( 'flex' ) ) {
				return 'flex';
			}
			if ( normalized.includes( 'block' ) ) {
				return 'block';
			}
		}
		if ( /direction/.test( normalized ) ) {
			if ( normalized.includes( 'row-reverse' ) ) {
				return 'flex-row-reverse';
			}
			if ( normalized.includes( 'column-reverse' ) ) {
				return 'flex-column-reverse';
			}
			if ( normalized.includes( 'row' ) ) {
				return 'flex-row';
			}
			if ( normalized.includes( 'column' ) ) {
				return 'flex-column';
			}
		}
		if ( /wrap/.test( normalized ) ) {
			if ( normalized.includes( 'wrap-reverse' ) ) {
				return 'wrap-reverse';
			}
			if ( normalized.includes( 'nowrap' ) || normalized.includes( 'no wrap' ) ) {
				return 'nowrap';
			}
			if ( normalized.includes( 'wrap' ) ) {
				return 'wrap';
			}
		}
		if ( /justify/.test( normalized ) ) {
			if ( normalized.includes( 'space-between' ) ) {
				return 'space-between';
			}
			if ( normalized.includes( 'space-around' ) ) {
				return 'space-around';
			}
			if ( normalized.includes( 'space-evenly' ) ) {
				return 'space-evenly';
			}
			if ( normalized.includes( 'left' ) || normalized.includes( 'start' ) ) {
				return 'justify-start';
			}
			if ( normalized.includes( 'center' ) ) {
				return 'justify-center';
			}
			if ( normalized.includes( 'right' ) || normalized.includes( 'end' ) ) {
				return 'justify-end';
			}
		}
		if ( /align/.test( normalized ) ) {
			if ( normalized.includes( 'stretch' ) ) {
				return 'align-stretch';
			}
			if ( normalized.includes( 'top' ) || normalized.includes( 'start' ) ) {
				return 'align-top';
			}
			if ( normalized.includes( 'center' ) || normalized.includes( 'middle' ) ) {
				return 'align-middle';
			}
			if ( normalized.includes( 'bottom' ) || normalized.includes( 'end' ) ) {
				return 'align-bottom';
			}
		}
		if ( normalized.includes( 'grid' ) ) {
			return 'grid';
		}
		if ( normalized.includes( 'flex' ) ) {
			return 'flex';
		}
		if ( normalized.includes( 'block' ) ) {
			return 'block';
		}
		if ( normalized.includes( 'row-reverse' ) ) {
			return 'flex-row-reverse';
		}
		if ( normalized.includes( 'column-reverse' ) ) {
			return 'flex-column-reverse';
		}
		if ( normalized.includes( 'row' ) ) {
			return 'flex-row';
		}
		if ( normalized.includes( 'column' ) ) {
			return 'flex-column';
		}
		if ( normalized.includes( 'left' ) || normalized.includes( 'start' ) ) {
			return 'align-left';
		}
		if ( normalized.includes( 'center' ) ) {
			return 'align-center';
		}
		if ( normalized.includes( 'right' ) || normalized.includes( 'end' ) ) {
			return 'align-right';
		}
		if ( normalized.includes( 'justify' ) ) {
			return 'align-justify';
		}
		if ( normalized.includes( 'top' ) ) {
			return 'arrow-up';
		}
		if ( normalized.includes( 'bottom' ) ) {
			return 'arrow-down';
		}
		return undefined;
	}

function commitFieldPrimitiveValue( field: BuilderFieldDefinition, nextValue: JsonValue ) {
	const primitive = resolvePrimitiveControl( resolveFieldPrimitive( field ) ?? field, field.label, field.description );
	const styleProperty = resolveFieldStyleProperty( field );

	if ( field.type === 'json' && typeof nextValue === 'string' ) {
		onFieldInput( field, nextValue );
		return;
	}

	if ( styleProperty ) {
		commitStylePrimitiveValue( styleProperty, nextValue, 'base' );
		return;
	}

	if ( primitive.kind === 'url' && nextValue && typeof nextValue === 'object' && !Array.isArray( nextValue ) ) {
		updateFieldValue( field.path, serializeUrlValue( nextValue as { url?: string } ) as JsonValue );
			return;
		}

		if ( primitive.kind === 'media' && nextValue && typeof nextValue === 'object' && !Array.isArray( nextValue ) ) {
			updateFieldValue( field.path, serializeMediaValue( nextValue as { src?: string } ) as JsonValue );
			return;
		}

		if ( field.path.startsWith( 'styles.' ) && nextValue && typeof nextValue === 'object' && !Array.isArray( nextValue ) ) {
			if ( primitive.kind === 'slider' ) {
				updateFieldValue( field.path, serializeSliderValue( nextValue as { value?: number | string; unit?: string }, primitive.units[ 0 ]?.value ?? '' ) as JsonValue );
				return;
			}

			if ( primitive.kind === 'dimensions' ) {
				updateFieldValue( field.path, serializeDimensionsValue( nextValue as { top?: string; right?: string; bottom?: string; left?: string; unit?: string; linked?: boolean }, primitive.units[ 0 ]?.value ?? 'px' ) as JsonValue );
				return;
			}
		}

		if ( typeof nextValue === 'boolean' || typeof nextValue === 'number' || Array.isArray( nextValue ) || ( nextValue && typeof nextValue === 'object' ) ) {
			updateFieldValue( field.path, nextValue );
			return;
		}

		onFieldInput( field, String( nextValue ?? '' ) );
	}

	function commitStylePrimitiveValue(
		property: BuilderStylePropertyDefinition,
		nextValue: JsonValue,
		target: ( typeof styleStateTargets )[ number ] = 'base',
		sectionId?: string,
	) {
		const propertyKey = getSelectedNodeScopedStyleProperty( sectionId, property.key );
		const primitive = resolvePrimitiveControl( property, property.label, property.description );
		if ( primitive.kind === 'url' ) {
			updateStyle( propertyKey, serializeStyleUrlValue( property.key, nextValue ), target );
			return;
		}

		if ( typeof nextValue === 'boolean' ) {
			updateStyle( propertyKey, nextValue ? 'true' : 'false', target );
			return;
		}

		if ( typeof nextValue === 'number' ) {
			updateStyle( propertyKey, String( nextValue ), target );
			return;
		}

		if ( nextValue && typeof nextValue === 'object' ) {
			if ( primitive.kind === 'slider' ) {
				updateStyle( propertyKey, serializeSliderValue( nextValue as { value?: number | string; unit?: string }, primitive.units[ 0 ]?.value ?? '' ), target );
				return;
			}

			if ( primitive.kind === 'dimensions' ) {
				updateStyle( propertyKey, serializeDimensionsValue( nextValue as { top?: string; right?: string; bottom?: string; left?: string; unit?: string; linked?: boolean }, primitive.units[ 0 ]?.value ?? 'px' ), target );
				return;
			}

			updateStyle( propertyKey, JSON.stringify( nextValue ), target );
			return;
		}

		updateStyle( propertyKey, String( nextValue ?? '' ), target );
	}

	function getStructuredCollectionKindForField( field: BuilderFieldDefinition ) {
		return selectedNode ? resolveStructuredCollectionKind( selectedNode.type, field.path ) : undefined;
	}

function onFieldInput( field: BuilderFieldDefinition, value: string ) {
	if ( !selectedNode ) {
		return;
	}

		if ( field.type === 'json' ) {
			jsonDrafts = {
				...jsonDrafts,
				[ getFieldDraftKey( selectedNode.id, field.path ) ]: value,
		};
		return;
	}

	const styleProperty = resolveFieldStyleProperty( field );
	if ( styleProperty ) {
		commitStylePrimitiveValue( styleProperty, coerceFieldValue( field, value ), 'base' );
		return;
	}

	updateFieldValue( field.path, coerceFieldValue( field, value ) );
}

	function commitJsonField( node: BuilderNode, field: BuilderFieldDefinition ) {
		const key = getFieldDraftKey( node.id, field.path );
		const draft = jsonDrafts[ key ] ?? JSON.stringify( getFieldValue( node, field ), null, 2 );
		try {
			const parsed = JSON.parse( draft ) as JsonValue;
			updateFieldValue( field.path, parsed );
			delete jsonDrafts[ key ];
			delete jsonErrors[ key ];
			jsonDrafts = { ...jsonDrafts };
			jsonErrors = { ...jsonErrors };
		} catch {
			jsonErrors = {
				...jsonErrors,
				[ key ]: 'Enter valid JSON to apply this field.',
			};
		}
	}

	function getStyleInputValue(
		property: BuilderStylePropertyDefinition | string,
		target: ( typeof styleStateTargets )[ number ] = 'base',
		allowState = true,
		sectionId?: string,
	) {
		if ( !selectedNode ) {
			return '';
		}

		const propertyKey = typeof property === 'string'
			? getSelectedNodeScopedStyleProperty( sectionId, property )
			: getSelectedNodeScopedStyleProperty( sectionId, property.key );
		const rawValue = readStyleValue( selectedNode.styles, propertyKey, allowState ? target : 'base' );
		if ( typeof property !== 'string' && property.key === 'background-image' ) {
			return rawValue;
		}
		if ( ( rawValue === '' || rawValue === undefined ) && typeof property !== 'string' ) {
			const fallbackValue = readEffectiveContainerStyleControlValue( selectedNode, property.key );
			if ( fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '' ) {
				return String( fallbackValue );
			}
		}

		return String( rawValue ?? '' );
	}

	function getClassStyleValue( definition: ClassDefinition, property: string ) {
		return String( readStyleValue( definition.styles, property, 'base' ) ?? '' );
	}

	function getComponentUsageCount( componentId: string ): number {
		return componentUsage.get( componentId ) ?? 0;
	}

	function buildComponentUsage( documents: BuilderDocument[] ): Map<string, number> {
		const usage = new Map<string, number>();
		for ( const document of documents ) {
			if ( document.kind === 'component' ) {
				continue;
			}
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
		}
		return usage;
	}

	function readStyleValue(
		styles: StyleSet,
		property: string,
		target: ( typeof styleStateTargets )[ number ] = 'base',
	) {
		return resolveResponsiveStyleValue( styles, property, state.ui.viewport, target === 'base' ? 'base' : target ).value ?? '';
	}

	function buildStylePatch(
		styles: StyleSet,
		property: string,
		value: string,
		target: ( typeof styleStateTargets )[ number ] = 'base',
	): Partial<StyleSet> {
		return buildResponsiveStylePatch( styles, property, value, state.ui.viewport, target === 'base' ? 'base' : target );
	}

	function getSectionState(
		sectionId: string,
		enabledStates?: BuilderControlState[],
		targets: Record<string, BuilderControlState> = sectionStateTargets,
	): BuilderControlState {
		const states: BuilderControlState[] = enabledStates?.length ? enabledStates : [ 'normal' ];
		const current = targets[ sectionId ];
		return current && states.includes( current ) ? current : states[ 0 ] ?? 'normal';
	}

	function isStylePropertyStateful( property: BuilderStylePropertyDefinition, section: BuilderStyleSectionInstance ): boolean {
		return property.stateful ?? Boolean( section.enabledStates && section.enabledStates.length > 1 );
	}

	function setSectionState( sectionId: string, value: BuilderControlState ) {
		sectionStateTargets = {
			...sectionStateTargets,
			[ sectionId ]: value,
		};
	}

	function isPopoverStyleSection( section: BuilderStyleSectionInstance ) {
		return section.presentation === 'popover';
	}

	function getVisibleStyleControls( section: BuilderStyleSectionInstance ) {
		return selectedNode
			? section.controls.filter( ( control ) => isStyleControlVisible( control, selectedNode ) )
			: [];
	}

	function normalizeStyleSummaryKey( value: string ) {
		return value.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).replace( /\s+/g, '-' ).toLowerCase();
	}

	function getStyleSectionSummaryItems( section: BuilderStyleSectionInstance ) {
		const summaryKeys = section.summaryKeys ?? [];
		if ( !summaryKeys.length ) {
			return [];
		}
		const controls = getVisibleStyleControls( section );
		return summaryKeys.flatMap( ( key ) => {
			const normalized = normalizeStyleSummaryKey( key );
			const control = controls.find( ( candidate ) => normalizeStyleSummaryKey( candidate.key ) === normalized );
			if ( !control ) {
				return [];
			}
			const rawValue = String( getStyleInputValue( control, 'base', false, section.id ) ?? '' ).trim();
			if ( !rawValue ) {
				return [];
			}
			const formattedValue = formatStyleSummaryValue( control, rawValue );
			return [ {
				key: control.key,
				label: control.label,
				value: formattedValue,
				color: /(^|[\s-])color\b/i.test( `${ control.key } ${ control.label }` ) ? rawValue : undefined,
			} ];
		} );
	}

	function formatStyleSummaryValue( control: BuilderStylePropertyDefinition, rawValue: string ) {
		const selectedOption = control.options?.find( ( option ) => option.value === rawValue );
		if ( selectedOption ) {
			return selectedOption.label;
		}
		if ( control.key === 'font-family' ) {
			return rawValue.replace( /^["']|["']$/g, '' );
		}
		return rawValue;
	}

	function closeTypographyPopover() {
		typographyPopoverSectionId = '';
		typographyPopoverAnchorElement = null;
		typographyPopoverAnchorCleanup();
		typographyPopoverAnchorCleanup = () => {};
		typographyPopoverAnchorController.close();
	}

	function toggleTypographyPopover( sectionId: string, anchorElement: HTMLElement ) {
		if ( typographyPopoverSectionId === sectionId ) {
			closeTypographyPopover();
			return;
		}
		typographyPopoverSectionId = sectionId;
		typographyPopoverAnchorElement = anchorElement;
	}

	function toStyleTarget( stateValue: BuilderControlState ): ( typeof styleStateTargets )[ number ] {
		return stateValue === 'normal' ? 'base' : stateValue;
	}

	function getStyleSectionTarget(
		property: BuilderStylePropertyDefinition,
		section: BuilderStyleSectionInstance,
		targets: Record<string, BuilderControlState> = sectionStateTargets,
	): ( typeof styleStateTargets )[ number ] {
		if ( !isStylePropertyStateful( property, section ) ) {
			return 'base';
		}
		return toStyleTarget( getSectionState( section.id, section.enabledStates, targets ) );
	}

	function createAssignmentRule(): ConditionRule {
		return {
			id: crypto.randomUUID(),
			source: 'route',
			path: 'pathname',
			operator: 'matches',
			value: '',
			values: [],
		};
	}

	function getFieldDraftKey( nodeId: string, path: string ): string {
		return `${ nodeId }:${ path }`;
	}

	function coerceFieldValue( field: BuilderFieldDefinition, value: string ): JsonValue {
		switch ( field.type ) {
			case 'number': {
				if ( value.trim() === '' ) {
					return 0;
				}
				const parsed = Number( value );
				return Number.isFinite( parsed ) ? parsed : 0;
			}
			case 'toggle':
				return value === 'true';
			default:
				return value;
		}
	}

	function readValueAtPath( node: BuilderNode, path: string ): unknown {
		const segments = path.split( '.' );
		let current: unknown = node as unknown as Record<string, unknown>;
		for ( const segment of segments ) {
			if ( !current || typeof current !== 'object' ) {
				return undefined;
			}

			const record = current as Record<string, unknown>;
			if ( segment in record ) {
				current = record[ segment ];
				continue;
			}

			const normalized = normalizeStylePropertyName( segment );
			if ( normalized in record ) {
				current = record[ normalized ];
				continue;
			}

			const legacy = legacyStylePropertyName( normalized );
			if ( legacy in record ) {
				current = record[ legacy ];
				continue;
			}

			return undefined;
		}
		return current;
	}

	function isConditionMatched( condition: BuilderControlCondition | undefined, node: BuilderNode ): boolean {
		if ( !condition ) {
			return true;
		}

		const actual = readConditionValue( node, condition.path );
		if ( condition.truthy !== undefined ) {
			return condition.truthy ? Boolean( actual ) : !Boolean( actual );
		}
		if ( condition.oneOf?.length ) {
			return condition.oneOf.some( ( value ) => String( value ) === String( actual ?? '' ) );
		}
		if ( condition.notEquals !== undefined ) {
			return String( actual ?? '' ) !== String( condition.notEquals );
		}
		if ( condition.equals !== undefined ) {
			return String( actual ?? '' ) === String( condition.equals );
		}
		return true;
	}

	function isFieldVisible( field: BuilderFieldDefinition, node: BuilderNode ): boolean {
		return isConditionMatched( field.condition, node );
	}

	function isStyleControlVisible( control: BuilderStylePropertyDefinition, node: BuilderNode ): boolean {
		return isConditionMatched( control.condition, node );
	}

	function isContainerLayoutNode( node: BuilderNode ): boolean {
		return node.type === 'container' || node.type === 'grid-container';
	}

	function normalizeEffectiveDisplayValue( value: JsonValue | undefined, node: BuilderNode ): string {
		const normalized = String( value ?? '' ).trim().toLowerCase();
		if ( normalized === 'grid' || normalized === 'flex' ) {
			return normalized;
		}
		return node.type === 'grid-container' ? 'grid' : 'flex';
	}

	function mapContainerLayoutPathToStyleProperty( path: string ): string | undefined {
		switch ( path ) {
			case 'display':
				return 'display';
			case 'direction':
				return 'flex-direction';
			case 'wrap':
				return 'flex-wrap';
			case 'justifyContent':
				return 'justify-content';
			case 'alignItems':
				return 'align-items';
			case 'alignContent':
				return 'align-content';
			case 'justifyItems':
				return 'justify-items';
			case 'autoFlow':
				return 'grid-auto-flow';
			case 'columns':
				return 'grid-template-columns';
			case 'rows':
				return 'grid-template-rows';
			case 'gap':
				return 'gap';
			case 'width':
				return 'width';
			case 'maxWidth':
				return 'max-width';
			case 'minHeight':
				return 'min-height';
			case 'overflow':
				return 'overflow';
			case 'aspectRatio':
				return 'aspect-ratio';
			default:
				return undefined;
		}
	}

	function readEffectiveContainerLayoutValue( node: BuilderNode, path: string ): JsonValue | undefined {
		if ( !isContainerLayoutNode( node ) ) {
			return undefined;
		}

		const styleProperty = mapContainerLayoutPathToStyleProperty( path );
		const styleValue = styleProperty ? readStyleValue( node.styles, styleProperty, 'base' ) : undefined;
		if ( styleValue !== undefined && styleValue !== '' ) {
			return styleValue;
		}

		if ( path === 'display' ) {
			return normalizeEffectiveDisplayValue( node.layout.display, node );
		}

		const layoutValue = readValueAtPath( node.layout as Record<string, JsonValue>, path ) as JsonValue | undefined;
		return layoutValue ?? undefined;
	}

	function readEffectiveContainerStyleControlValue( node: BuilderNode, property: string ): JsonValue | undefined {
		switch ( property ) {
			case 'display':
				return readEffectiveContainerLayoutValue( node, 'display' );
			case 'flex-direction':
				return readEffectiveContainerLayoutValue( node, 'direction' );
			case 'flex-wrap':
				return readEffectiveContainerLayoutValue( node, 'wrap' );
			case 'justify-content':
				return readEffectiveContainerLayoutValue( node, 'justifyContent' );
			case 'align-items':
				return readEffectiveContainerLayoutValue( node, 'alignItems' );
			case 'align-content':
				return readEffectiveContainerLayoutValue( node, 'alignContent' );
			case 'justify-items':
				return readEffectiveContainerLayoutValue( node, 'justifyItems' );
			case 'grid-auto-flow':
				return readEffectiveContainerLayoutValue( node, 'autoFlow' );
			case 'grid-template-columns':
				return readEffectiveContainerLayoutValue( node, 'columns' );
			case 'grid-template-rows':
				return readEffectiveContainerLayoutValue( node, 'rows' );
			case 'gap':
				return readEffectiveContainerLayoutValue( node, 'gap' );
			case 'width':
				return readEffectiveContainerLayoutValue( node, 'width' );
			case 'max-width':
				return readEffectiveContainerLayoutValue( node, 'maxWidth' );
			case 'min-height':
				return readEffectiveContainerLayoutValue( node, 'minHeight' );
			case 'overflow':
				return readEffectiveContainerLayoutValue( node, 'overflow' );
			case 'aspect-ratio':
				return readEffectiveContainerLayoutValue( node, 'aspectRatio' );
			default:
				return undefined;
		}
	}

	function getEffectiveContainerLayoutDisplay( node: BuilderNode ): string {
		return normalizeEffectiveDisplayValue( readEffectiveContainerLayoutValue( node, 'display' ), node );
	}

	function getEffectiveContainerLayoutDirection( node: BuilderNode ): string {
		const value = readEffectiveContainerLayoutValue( node, 'direction' );
		return String( value ?? '' ).trim().toLowerCase().startsWith( 'column' ) ? 'column' : 'row';
	}

	function readConditionValue( node: BuilderNode, path: string ): JsonValue | undefined {
		if ( path.startsWith( 'layout.' ) ) {
			const effectiveValue = readEffectiveContainerLayoutValue( node, path.replace( /^layout\./, '' ) );
			if ( effectiveValue !== undefined && effectiveValue !== '' ) {
				return effectiveValue;
			}
		}

		return readValueAtPath( node, path ) as JsonValue | undefined;
	}

	function setNestedValue( record: Record<string, JsonValue>, path: string, value: JsonValue ): Record<string, JsonValue> {
		const segments = path.split( '.' ).filter( Boolean );
		if ( !segments.length ) {
			return record;
		}

		const next = structuredClone( record );
		let cursor: Record<string, JsonValue> = next;
		for ( const segment of segments.slice( 0, -1 ) ) {
			const entry = cursor[ segment ];
			if ( !entry || typeof entry !== 'object' || Array.isArray( entry ) ) {
				cursor[ segment ] = {};
			}
			cursor = cursor[ segment ] as Record<string, JsonValue>;
		}
		cursor[ segments.at( -1 )! ] = value;
		return next;
	}

	function buildComponentExposureCandidates(
		node: BuilderNode,
		definition: BuilderElementDefinition,
		exposures: ComponentExposure[],
	): Array<{ field: BuilderFieldDefinition; exposure: ComponentExposure; existing?: ComponentExposure }> {
		return definition.panelSections.flatMap( ( section ) => section.fields )
			.filter( ( field ) => field.componentExposure?.supported )
			.map( ( field ) => {
				const existing = exposures.find( ( exposure ) => exposure.nodeId === node.id && exposure.propPath === field.path );
				return {
					field,
					existing,
					exposure: {
						id: existing?.id ?? crypto.randomUUID(),
						nodeId: node.id,
						label: existing?.label ?? `${ getNodeDisplayLabel( node, definition ) } ${ field.componentExposure?.label ?? field.label }`,
						propPath: field.path,
						source: inferExposureSource( field.path ),
						type: field.componentExposure?.type ?? 'text',
						required: existing?.required ?? false,
						group: existing?.group,
						description: existing?.description ?? field.description,
						placeholder: existing?.placeholder ?? field.placeholder,
						defaultValue: existing?.defaultValue ?? ( getFieldValue( node, field ) as JsonValue ),
						allowBindings: existing?.allowBindings ?? field.componentExposure?.allowBindings ?? true,
					},
				};
			} );
	}

	function inferExposureSource( path: string ): ComponentExposure['source'] {
		if ( path.startsWith( 'legacy.' ) ) {
			return 'attribute';
		}
		if ( path.startsWith( 'props.' ) ) {
			return 'prop';
		}
		return 'content';
	}

	function upsertExposure( exposures: ComponentExposure[], nextExposure: ComponentExposure ): ComponentExposure[] {
		const existingIndex = exposures.findIndex( ( exposure ) => exposure.id === nextExposure.id || ( exposure.nodeId === nextExposure.nodeId && exposure.propPath === nextExposure.propPath ) );
		if ( existingIndex === -1 ) {
			return [ ...exposures, nextExposure ];
		}

		return exposures.map( ( exposure, index ) => index === existingIndex ? nextExposure : exposure );
	}

	function getNodeDisplayLabel( node: BuilderNode, definition?: BuilderElementDefinition ): string {
		if ( node.name ) {
			return node.name;
		}
		if ( typeof node.props.title === 'string' && node.props.title.trim() ) {
			return node.props.title.trim();
		}
		if ( typeof node.props.text === 'string' && node.props.text.trim() ) {
			return node.props.text.trim().slice( 0, 32 );
		}
		return definition?.label ?? node.type;
	}

	function formatInspectorLabel( value: string ) {
		return value
			.replaceAll( '-', ' ' )
			.split( ' ' )
			.filter( Boolean )
			.map( ( segment ) => segment.slice( 0, 1 ).toUpperCase() + segment.slice( 1 ) )
			.join( ' ' );
	}

	function getNodeBadgeLabel( node: BuilderNode, definition?: BuilderElementDefinition ) {
		const source = definition?.label ?? node.type;
		const compact = source
			.replaceAll( '-', ' ' )
			.split( ' ' )
			.filter( Boolean )
			.slice( 0, 2 )
			.map( ( segment ) => segment.slice( 0, 1 ).toUpperCase() )
			.join( '' );
		return compact || 'EL';
	}

	function getRevisionBadge( revision: DocumentRevision ): string {
		if ( activeSession?.publishedRevisionId === revision.id ) {
			return 'Published snapshot';
		}
		if ( activeSession?.autosaveRevisionId === revision.id ) {
			return 'Latest autosave';
		}
		if ( activeSession?.draftRevisionId === revision.id ) {
			return 'Latest draft';
		}
		return revision.kind;
	}

	function getSelectedRevision(): DocumentRevision | undefined {
		return revisionEntries.find( ( revision ) => revision.id === state.ui.revisions.selectedRevisionId ) ?? revisionEntries[ 0 ];
	}

	function getComponentOverrideValue( exposure: ComponentExposure ): JsonValue {
		if ( !selectedNode ) {
			return '';
		}
		return ( selectedNode.props.overrides as Record<string, JsonValue> | undefined )?.[ exposure.id ]
			?? exposure.defaultValue
			?? '';
	}

	function readDetachedComponentMeta( node: BuilderNode ): Record<string, JsonValue> | undefined {
		const value = node.meta.detachedComponent;
		if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
			return undefined;
		}
		return value as Record<string, JsonValue>;
	}
</script>

<div class="inspector">
	{#if state.ui.panel === 'library'}
		<section class="inspector__section inspector__section--library">
			<div class="inspector__section-header">
				<div>
					<p class="inspector__eyebrow">Globals</p>
					<h3>Library</h3>
				</div>
				<button type="button" onclick={() => libraryImportInput?.click()} disabled={libraryImportStatus === 'importing'}>Import Template</button>
				<input
					bind:this={libraryImportInput}
					class="inspector__file-input"
					type="file"
					accept="application/json,.json"
					onchange={handleTemplateImportFile}
				/>
			</div>
			<div class="inspector__subsection inspector__utility-section">
				<h4>Save Selection</h4>
				<label>
					<span>Title</span>
					<input bind:value={newLibraryTitle} />
				</label>
				<button type="button" onclick={createLibraryItem}>Save Selection</button>
			</div>
			{#if libraryImportStatus !== 'idle'}
				<div class:inspector__import-banner={true} class:inspector__import-banner--error={libraryImportStatus === 'error'}>
					<strong>{libraryImportStatus === 'importing' ? 'Importing' : libraryImportStatus === 'error' ? 'Import failed' : 'Import complete'}</strong>
					<p>{libraryImportMessage}</p>
					{#if libraryImportWarnings.length}
						<ul>
							{#each libraryImportWarnings.slice( 0, 4 ) as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					{/if}
					{#if libraryImportGaps.length}
						<ul>
							{#each libraryImportGaps.slice( 0, 4 ) as gap}
								<li>{gap}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
			<div class="inspector__subsection">
				<div class="inspector__section-header">
					<h4>Items</h4>
					<span class="inspector__pill inspector__pill--muted">{libraryDocuments.length}</span>
				</div>
				{#if libraryDocuments.length}
					<div class="inspector__library-list">
						{#each libraryDocuments as document (document.id)}
							<article class="inspector__class-card inspector__library-card">
								<div>
									<h5>{document.title}</h5>
									<p>{getLibrarySourceLabel( document )}</p>
									<p>{getLibraryNodeCount( document )} nodes</p>
								</div>
								<div class="inspector__actions">
									<button type="button" onclick={() => editor.insertLibraryItem( document.id )}>Insert</button>
									<button type="button" onclick={() => openDocument( document.id )}>Open</button>
									<button type="button" onclick={() => editor.deleteDocument( document.id )}>Delete</button>
								</div>
							</article>
						{/each}
					</div>
				{:else}
					<p class="inspector__empty-state">No library items yet. Import a JSON template or save the current selection.</p>
				{/if}
			</div>
		</section>
	{:else if isNodeInspectorPanel}
		{#if selectedNode}
			{#if state.ui.inlineEditingNodeId === selectedNode.id || state.ui.componentEditing.context}
				<section class="inspector__section inspector__section--context">
					<div class="inspector__context-strip">
						<span class="inspector__selection-badge">{getNodeBadgeLabel( selectedNode, selectedDefinition )}</span>
						<span class="inspector__pill">{formatInspectorLabel( state.ui.viewport )}</span>
						{#if state.ui.inlineEditingNodeId === selectedNode.id}
							<span class="inspector__pill inspector__pill--accent">Inline Edit</span>
						{/if}
						{#if state.ui.componentEditing.context}
							<span class="inspector__pill inspector__pill--muted">{formatInspectorLabel( state.ui.componentEditing.context )}</span>
						{/if}
					</div>
				</section>
			{/if}

			{#if activeInspectorTab === 'content'}
				<section class="inspector__section">
					{#if visibleContentSections.length}
						{#each visibleContentSections as section (section.id)}
							<div class="inspector__subsection inspector__content-section" data-content-section={section.id}>
								<h4>{section.label}</h4>
								{#if section.description}<p class="inspector__help">{section.description}</p>{/if}
								{#each section.fields.filter( ( field ) => isFieldVisible( field, selectedNode ) ) as field (field.id)}
									{@const structuredKind = getStructuredCollectionKindForField( field )}
									<div class="inspector__control">
										{#if structuredKind}
											<StructuredCollectionFieldEditor
												kind={structuredKind}
												title={field.label}
												description={field.description ?? ''}
												value={getFieldValue( selectedNode, field )}
												onChange={(nextValue) => updateFieldValue( field.path, nextValue )}
											/>
										{:else}
											{@const fieldStyleProperty = resolveFieldStyleProperty( field )}
											{@const fieldDynamicTargetKind = fieldStyleProperty ? 'style' : 'prop'}
											{@const fieldDynamicTarget = fieldStyleProperty?.key ?? getPropTargetFromField( field )}
											{@const fieldDynamicCategory = fieldStyleProperty ? getDynamicCategoryForStyle( fieldStyleProperty ) : getDynamicCategoryForField( field )}
											<PrimitiveControl
												label={field.label}
												description={field.description ?? ''}
												fieldType={field.type}
												controlPath={field.path}
												layoutDisplay={selectedNodeLayoutDisplay}
												layoutDirection={selectedNodeLayoutDirection}
												primitive={resolveFieldPrimitive( field )}
												value={getFieldValue( selectedNode, field )}
												placeholder={field.placeholder ?? ''}
												state={getResponsiveFieldState( field )}
												dynamicProviders={getDynamicProviderOptions( fieldDynamicCategory )}
												dynamicBinding={getDynamicBindingView( getDynamicBindingForTarget( fieldDynamicTargetKind, fieldDynamicTarget ) )}
												{mediaAssets}
												{mediaDiagnostics}
												error={field.type === 'json' ? ( jsonErrors[ getFieldDraftKey( selectedNode.id, field.path ) ] ?? '' ) : ''}
												onChange={(nextValue) => commitFieldPrimitiveValue( field, nextValue )}
												onReset={() => resetResponsiveFieldControl( field )}
												onBlur={() => field.type === 'json' && commitJsonField( selectedNode, field )}
												onDynamicSelect={(providerId) => selectDynamicBinding( fieldDynamicTargetKind, fieldDynamicTarget, fieldDynamicCategory, providerId )}
												onDynamicClear={() => clearDynamicBinding( fieldDynamicTargetKind, fieldDynamicTarget )}
												onMediaRefresh={refreshMediaAssets}
												onMediaUpload={uploadMediaAsset}
												onMediaUpdate={updateMediaAsset}
												onMediaDelete={deleteMediaAsset}
											/>
										{/if}
										{#if activeDocument.kind === 'component' && field.componentExposure?.supported}
											<div class="inspector__actions inspector__actions--inline">
												{#each componentExposureCandidates.filter( ( candidate ) => candidate.field.id === field.id ) as candidate (candidate.exposure.id)}
													<button type="button" onclick={() => addComponentExposure( candidate.exposure )}>{candidate.existing ? 'Update Exposure' : 'Expose In Instances'}</button>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/each}
					{:else}
						<p class="inspector__empty-state">No content controls are configured for this element.</p>
					{/if}

					{#if state.ui.componentEditing.context === 'instance' && selectedComponentDocument}
						<div class="inspector__subsection">
							<div class="inspector__section-header">
								<div>
									<h4>Component Instance Overrides</h4>
									<p>Linked to {selectedComponentDocument.title}. Edit exposed values here.</p>
								</div>
								<div class="inspector__actions">
									<button type="button" onclick={() => openDocument( selectedComponentDocument.id, { mode: 'component-master', pathname: state.ui.preview.pathname, query: state.ui.preview.query, slot: state.ui.preview.slot, source: state.ui.preview.source } )}>Open Master</button>
									{#if selectedNode}<button type="button" onclick={() => editor.detachComponentInstance( selectedNode.id )}>Detach</button>{/if}
								</div>
							</div>
							{#if selectedComponentWorkflow}
								<p>Structure locked: {selectedComponentWorkflow.lockedStructure ? 'yes' : 'no'}</p>
								<p>Detach: {selectedComponentWorkflow.instancePolicy.allowDetach ? 'allowed' : 'locked'} | Relink: {selectedComponentWorkflow.instancePolicy.allowRelink ? 'allowed' : 'locked'}</p>
							{/if}
							{#each selectedComponentExposures as exposure (exposure.id)}
								<label>
									<span>{exposure.label}</span>
									{#if exposure.description}<span class="inspector__help">{exposure.description}</span>{/if}
									{#if exposure.type === 'richText' || exposure.type === 'tag' || exposure.type === 'attribute'}
										<textarea rows="3" placeholder={exposure.placeholder} oninput={(event) => updateComponentOverride( exposure, ( event.currentTarget as HTMLTextAreaElement ).value )}>{String( getComponentOverrideValue( exposure ) ?? '' )}</textarea>
									{:else if exposure.type === 'boolean'}
										<input type="checkbox" checked={getComponentOverrideValue( exposure ) === true || getComponentOverrideValue( exposure ) === 'true'} onchange={(event) => updateComponentOverride( exposure, ( event.currentTarget as HTMLInputElement ).checked )} />
									{:else if exposure.type === 'number'}
										<input type="number" value={String( getComponentOverrideValue( exposure ) ?? '' )} oninput={(event) => updateComponentOverride( exposure, Number( ( event.currentTarget as HTMLInputElement ).value ) || 0 )} />
									{:else}
										<input type={exposure.type === 'link' || exposure.type === 'image' ? 'url' : 'text'} placeholder={exposure.placeholder} value={String( getComponentOverrideValue( exposure ) ?? '' )} oninput={(event) => updateComponentOverride( exposure, ( event.currentTarget as HTMLInputElement ).value )} />
									{/if}
								</label>
							{/each}
							{#if !selectedComponentExposures.length}<p>No exposed properties are configured on the master yet.</p>{/if}
						</div>
					{/if}
				</section>
			{:else if activeInspectorTab === 'style'}
				<section class="inspector__section">
					{#if visibleStyleSections.length}
						{#each visibleStyleSections as section (section.id)}
							<div class="inspector__subsection inspector__style-section" data-style-section={section.id}>
								<div class="inspector__section-header">
									<div>
										<h4>{section.label}</h4>
										{#if section.description}<p class="inspector__help">{section.description}</p>{/if}
									</div>
									<div class="inspector__meta">
										{#if isPopoverStyleSection( section )}
											<button
												type="button"
												class="inspector__summary-action"
												class:inspector__summary-action--active={typographyPopoverSectionId === section.id}
												aria-label={`Edit ${ section.label.toLowerCase() } settings`}
												aria-expanded={typographyPopoverSectionId === section.id}
												onclick={(event) => toggleTypographyPopover( section.id, event.currentTarget as HTMLElement )}
											>
												<EditorShellIcon name="editor" size={12} />
											</button>
										{/if}
										{#if section.responsive}
											<span class="inspector__meta-icon" title="Responsive control" aria-label="Responsive control">
												<EditorShellIcon name="responsive" size={11} />
											</span>
										{/if}
										{#if section.enabledStates && section.enabledStates.length > 1}
											<div class="inspector__state-tabs" role="tablist" aria-label={`${ section.label } states`}>
												{#each section.enabledStates as stateValue (stateValue)}
													<button
														type="button"
														class:inspector__state-tab--active={getSectionState( section.id, section.enabledStates, sectionStateTargets ) === stateValue}
														onclick={() => setSectionState( section.id, stateValue )}
													>
														{stateValue === 'normal' ? 'Normal' : stateValue.slice( 0, 1 ).toUpperCase() + stateValue.slice( 1 )}
													</button>
												{/each}
											</div>
										{/if}
									</div>
								</div>
								{#if isPopoverStyleSection( section )}
									{@const summaryItems = getStyleSectionSummaryItems( section )}
									<div class="inspector__summary-row">
										<div class="inspector__summary-list">
											{#if summaryItems.length}
												{#each summaryItems as item (item.key)}
													<span
														class="inspector__summary-chip"
														title={`${ item.label }: ${ item.value }`}
													>
														{#if item.color}
															<span class="inspector__summary-swatch" style={`background: ${ item.color };`}></span>
														{/if}
														<span>{item.value}</span>
													</span>
												{/each}
											{:else}
												<span class="inspector__summary-placeholder">Open typography settings</span>
											{/if}
										</div>
									</div>
								{:else}
									{#each getVisibleStyleControls( section ) as property (property.key)}
										{@const propertyStateful = isStylePropertyStateful( property, section )}
										{@const styleTarget = getStyleSectionTarget( property, section, sectionStateTargets )}
										{@const dynamicStyleTarget = getSelectedNodeScopedStyleProperty( section.id, property.key )}
										{@const dynamicStyleCategory = getDynamicCategoryForStyle( property )}
										<div class="inspector__control">
											{#key `${ property.key }:${ styleTarget }:${ state.ui.viewport }`}
												<PrimitiveControl
													label={property.label}
													description={property.description ?? ''}
													fieldType={property.controlType}
													controlPath={property.key}
													layoutDisplay={selectedNodeLayoutDisplay}
													layoutDirection={selectedNodeLayoutDirection}
													primitive={property.primitive}
													value={getStyleInputValue( property, styleTarget, propertyStateful, section.id )}
													placeholder={property.placeholder ?? ''}
													dynamicProviders={getDynamicProviderOptions( dynamicStyleCategory )}
													dynamicBinding={getDynamicBindingView( getDynamicBindingForTarget( 'style', dynamicStyleTarget ) )}
													{mediaAssets}
													{mediaDiagnostics}
													state={{
														activeStateTab: propertyStateful ? getSectionState( section.id, section.enabledStates, sectionStateTargets ) : undefined,
														...( getResponsiveStyleControlState( property, styleTarget, section.id ) ?? {} ),
													}}
													onStateTabChange={(nextState) => setSectionState( section.id, nextState as BuilderControlState )}
													onChange={(nextValue) => commitStylePrimitiveValue( property, nextValue, getStyleSectionTarget( property, section ), section.id )}
													onReset={() => resetResponsiveStyleControl( property, getStyleSectionTarget( property, section ), section.id )}
													onDynamicSelect={(providerId) => selectDynamicBinding( 'style', dynamicStyleTarget, dynamicStyleCategory, providerId )}
													onDynamicClear={() => clearDynamicBinding( 'style', dynamicStyleTarget )}
													onMediaRefresh={refreshMediaAssets}
													onMediaUpload={uploadMediaAsset}
													onMediaUpdate={updateMediaAsset}
													onMediaDelete={deleteMediaAsset}
												/>
											{/key}
										</div>
									{/each}
								{/if}
							</div>
						{/each}
					{:else}
						<p class="inspector__empty-state">No explicit style sections are configured for this element.</p>
					{/if}
					{#if typographyPopoverSectionId}
						{@const popoverSection = visibleStyleSections.find( ( section ) => section.id === typographyPopoverSectionId )}
						{#if popoverSection}
							<div
								class="inspector__popover-surface"
								bind:this={typographyPopoverElement}
								role="dialog"
								aria-label={`${ popoverSection.label } settings`}
							>
								<div class="inspector__popover-header">
									<div>
										<h5>{popoverSection.label}</h5>
										<p>Compact typography controls</p>
									</div>
									<button type="button" class="inspector__popover-close" aria-label="Close typography settings" onclick={closeTypographyPopover}>
										<EditorShellIcon name="close" size={11} />
									</button>
								</div>
								{#if popoverSection.enabledStates && popoverSection.enabledStates.length > 1}
									<div class="inspector__state-tabs" role="tablist" aria-label={`${ popoverSection.label } states`}>
										{#each popoverSection.enabledStates as stateValue (stateValue)}
											<button
												type="button"
												class:inspector__state-tab--active={getSectionState( popoverSection.id, popoverSection.enabledStates, sectionStateTargets ) === stateValue}
												onclick={() => setSectionState( popoverSection.id, stateValue )}
											>
												{stateValue === 'normal' ? 'Normal' : stateValue.slice( 0, 1 ).toUpperCase() + stateValue.slice( 1 )}
											</button>
										{/each}
									</div>
								{/if}
								<div class="inspector__popover-body">
									{#each getVisibleStyleControls( popoverSection ) as property (property.key)}
										{@const propertyStateful = isStylePropertyStateful( property, popoverSection )}
										{@const styleTarget = getStyleSectionTarget( property, popoverSection, sectionStateTargets )}
										{@const dynamicStyleTarget = getSelectedNodeScopedStyleProperty( popoverSection.id, property.key )}
										{@const dynamicStyleCategory = getDynamicCategoryForStyle( property )}
										<div class="inspector__control">
											{#key `${ property.key }:${ styleTarget }:${ state.ui.viewport }`}
												<PrimitiveControl
													label={property.label}
													description={property.description ?? ''}
													fieldType={property.controlType}
													controlPath={property.key}
													layoutDisplay={selectedNodeLayoutDisplay}
													layoutDirection={selectedNodeLayoutDirection}
													primitive={property.primitive}
													value={getStyleInputValue( property, styleTarget, propertyStateful, popoverSection.id )}
													placeholder={property.placeholder ?? ''}
													dynamicProviders={getDynamicProviderOptions( dynamicStyleCategory )}
													dynamicBinding={getDynamicBindingView( getDynamicBindingForTarget( 'style', dynamicStyleTarget ) )}
													{mediaAssets}
													{mediaDiagnostics}
													state={{
														activeStateTab: propertyStateful ? getSectionState( popoverSection.id, popoverSection.enabledStates, sectionStateTargets ) : undefined,
														...( getResponsiveStyleControlState( property, styleTarget, popoverSection.id ) ?? {} ),
													}}
													onStateTabChange={(nextState) => setSectionState( popoverSection.id, nextState as BuilderControlState )}
													onChange={(nextValue) => commitStylePrimitiveValue( property, nextValue, getStyleSectionTarget( property, popoverSection ), popoverSection.id )}
													onReset={() => resetResponsiveStyleControl( property, getStyleSectionTarget( property, popoverSection ), popoverSection.id )}
													onDynamicSelect={(providerId) => selectDynamicBinding( 'style', dynamicStyleTarget, dynamicStyleCategory, providerId )}
													onDynamicClear={() => clearDynamicBinding( 'style', dynamicStyleTarget )}
													onMediaRefresh={refreshMediaAssets}
													onMediaUpload={uploadMediaAsset}
													onMediaUpdate={updateMediaAsset}
													onMediaDelete={deleteMediaAsset}
												/>
											{/key}
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
					<div class="inspector__subsection inspector__utility-section">
						<h4>Design System</h4>
						<label><span>Attach Class</span><select bind:value={selectedStyleRef}><option value="">Choose class</option>{#each state.project.designSystem.classes as definition (definition.id)}<option value={definition.id}>{definition.label}</option>{/each}</select><button type="button" onclick={attachClass}>Attach</button></label>
					</div>
					<div class="inspector__subsection">
						<h4>Style Origins</h4>
						{#if styleOrigins.length}
							<ul class="inspector__list">{#each styleOrigins as origin}<li><strong>{origin.source}</strong>: {origin.keys.join( ', ' )}</li>{/each}</ul>
						{:else}
							<p>No style origins are registered for this selection.</p>
						{/if}
					</div>
					<div class="inspector__subsection inspector__utility-section">
						<h4>Breakpoints</h4>
						{#each authoringBreakpoints as breakpoint (breakpoint.id)}
							<p><strong>{breakpoint.label}</strong> {breakpoint.minWidth}px</p>
						{/each}
					</div>
				</section>
			{:else}
				<section class="inspector__section">
					{#if visibleAdvancedSections.length}
						{#each visibleAdvancedSections as section (section.id)}
							<div class="inspector__subsection inspector__advanced-section" data-advanced-section={section.id}>
								<h4>{section.label}</h4>
								{#if section.description}<p class="inspector__help">{section.description}</p>{/if}
								{#if section.controls?.length}
									{#each section.controls.filter( ( control ) => isStyleControlVisible( control, selectedNode ) ) as property (property.key)}
										{@const dynamicStyleTarget = getSelectedNodeScopedStyleProperty( section.id, property.key )}
										{@const dynamicStyleCategory = getDynamicCategoryForStyle( property )}
										<div class="inspector__control">
											<PrimitiveControl
												label={property.label}
												description={property.description ?? ''}
												fieldType={property.controlType}
												controlPath={property.key}
												layoutDisplay={selectedNodeLayoutDisplay}
												layoutDirection={selectedNodeLayoutDirection}
												primitive={property.primitive}
												value={getStyleInputValue( property )}
												placeholder={property.placeholder ?? ''}
												state={getResponsiveStyleControlState( property )}
												dynamicProviders={getDynamicProviderOptions( dynamicStyleCategory )}
												dynamicBinding={getDynamicBindingView( getDynamicBindingForTarget( 'style', dynamicStyleTarget ) )}
												{mediaAssets}
												{mediaDiagnostics}
												onChange={(nextValue) => commitStylePrimitiveValue( property, nextValue )}
												onReset={() => resetResponsiveStyleControl( property )}
												onDynamicSelect={(providerId) => selectDynamicBinding( 'style', dynamicStyleTarget, dynamicStyleCategory, providerId )}
												onDynamicClear={() => clearDynamicBinding( 'style', dynamicStyleTarget )}
												onMediaRefresh={refreshMediaAssets}
												onMediaUpload={uploadMediaAsset}
												onMediaUpdate={updateMediaAsset}
												onMediaDelete={deleteMediaAsset}
											/>
										</div>
									{/each}
								{/if}
								{#each ( section.fields ?? [] ).filter( ( field ) => isFieldVisible( field, selectedNode ) ) as field (field.id)}
									{@const structuredKind = getStructuredCollectionKindForField( field )}
									<div class="inspector__control">
										{#if structuredKind}
											<StructuredCollectionFieldEditor
												kind={structuredKind}
												title={field.label}
												description={field.description ?? ''}
												value={getFieldValue( selectedNode, field )}
												onChange={(nextValue) => updateFieldValue( field.path, nextValue )}
											/>
										{:else}
											{@const fieldStyleProperty = resolveFieldStyleProperty( field )}
											{@const fieldDynamicTargetKind = fieldStyleProperty ? 'style' : 'prop'}
											{@const fieldDynamicTarget = fieldStyleProperty?.key ?? getPropTargetFromField( field )}
											{@const fieldDynamicCategory = fieldStyleProperty ? getDynamicCategoryForStyle( fieldStyleProperty ) : getDynamicCategoryForField( field )}
											<PrimitiveControl
												label={field.label}
												description={field.description ?? ''}
												fieldType={field.type}
												controlPath={field.path}
												layoutDisplay={selectedNodeLayoutDisplay}
												layoutDirection={selectedNodeLayoutDirection}
												primitive={resolveFieldPrimitive( field )}
												value={getFieldValue( selectedNode, field )}
												placeholder={field.placeholder ?? ''}
												state={getResponsiveFieldState( field )}
												dynamicProviders={getDynamicProviderOptions( fieldDynamicCategory )}
												dynamicBinding={getDynamicBindingView( getDynamicBindingForTarget( fieldDynamicTargetKind, fieldDynamicTarget ) )}
												{mediaAssets}
												{mediaDiagnostics}
												error={field.type === 'json' ? ( jsonErrors[ getFieldDraftKey( selectedNode.id, field.path ) ] ?? '' ) : ''}
												onChange={(nextValue) => commitFieldPrimitiveValue( field, nextValue )}
												onReset={() => resetResponsiveFieldControl( field )}
												onBlur={() => field.type === 'json' && commitJsonField( selectedNode, field )}
												onDynamicSelect={(providerId) => selectDynamicBinding( fieldDynamicTargetKind, fieldDynamicTarget, fieldDynamicCategory, providerId )}
												onDynamicClear={() => clearDynamicBinding( fieldDynamicTargetKind, fieldDynamicTarget )}
												onMediaRefresh={refreshMediaAssets}
												onMediaUpload={uploadMediaAsset}
												onMediaUpdate={updateMediaAsset}
												onMediaDelete={deleteMediaAsset}
											/>
										{/if}
									</div>
								{/each}
								{#if section.family === 'responsive'}
									<div class="inspector__nested-group">
										<div class="inspector__section-header">
											<h5>Visibility</h5>
											<div class="inspector__actions"><button type="button" onclick={addVisibilityConditionGroup}>Add Condition Group</button><button type="button" onclick={clearVisibilityConditionGroups}>Clear</button></div>
										</div>
										<label><span>Hidden</span><input type="checkbox" checked={selectedNode.visibility.hidden} onchange={(event) => updateFieldValue( 'visibility.hidden', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
										<label><span>Display</span><select value={selectedNode.visibility.display} onchange={(event) => updateFieldValue( 'visibility.display', ( event.currentTarget as HTMLSelectElement ).value )}><option value="show">show</option><option value="hide-when-matched">hide-when-matched</option></select></label>
										<div class="inspector__nested-group">
											<h5>Hide On</h5>
											{#each authoringBreakpoints as breakpoint (breakpoint.id)}<label><span>{breakpoint.label}</span><input type="checkbox" checked={selectedNode.visibility.breakpointHidden[ breakpoint.id ] ?? false} onchange={(event) => updateVisibilityBreakpointHidden( breakpoint.id, ( event.currentTarget as HTMLInputElement ).checked )} /></label>{/each}
										</div>
										<p>Condition groups: {selectedNode.visibility.conditionGroups.length}</p>
									</div>
								{/if}
								{#if section.family === 'attributes'}
									<div class="inspector__nested-group">
										<div class="inspector__section-header"><h5>CSS Selectors</h5></div>
										<label><span>CSS ID</span><input value={getStaticAttributeValue( 'id' )} placeholder="hero" oninput={(event) => updateStaticAttributeValue( 'id', ( event.currentTarget as HTMLInputElement ).value )} /></label>
										<label><span>CSS Classes</span><input value={getStaticAttributeValue( 'class' )} placeholder="hero-card featured" oninput={(event) => updateStaticAttributeValue( 'class', ( event.currentTarget as HTMLInputElement ).value )} /></label>
									</div>
									<div class="inspector__nested-group">
										<div class="inspector__section-header"><h5>Attributes</h5><button type="button" onclick={addAttribute}>Add Attribute</button></div>
										{#if selectedNode.attributes.length}
											{#each selectedNode.attributes as attribute (attribute.id)}
												<div class="inspector__class-card">
													<label><span>Name</span><input value={attribute.name} oninput={(event) => updateAttribute( attribute.id, { name: ( event.currentTarget as HTMLInputElement ).value } )} /></label>
													<label><span>Kind</span><select value={attribute.kind} onchange={(event) => updateAttribute( attribute.id, { kind: ( event.currentTarget as HTMLSelectElement ).value as HtmlAttribute['kind'] } )}><option value="static">static</option><option value="binding">binding</option></select></label>
													<label><span>Value</span><input value={attribute.value ?? ''} oninput={(event) => updateAttribute( attribute.id, { value: ( event.currentTarget as HTMLInputElement ).value || undefined } )} /></label>
													<label><span>Binding ID</span><input value={attribute.bindingId ?? ''} oninput={(event) => updateAttribute( attribute.id, { bindingId: ( event.currentTarget as HTMLInputElement ).value || undefined } )} /></label>
													<button type="button" onclick={() => removeAttribute( attribute.id )}>Remove Attribute</button>
												</div>
											{/each}
										{:else}<p>No attributes are defined yet.</p>{/if}
									</div>
									<div class="inspector__nested-group">
										<div class="inspector__section-header"><h5>Bindings</h5><button type="button" onclick={addBinding}>Add Binding</button></div>
										{#if selectedNode.bindings.length}
											{#each selectedNode.bindings as binding (binding.id)}
												<div class="inspector__class-card">
													<label><span>Target Kind</span><select value={binding.targetKind} onchange={(event) => updateBinding( binding.id, { targetKind: ( event.currentTarget as HTMLSelectElement ).value as Binding['targetKind'] } )}>{#each bindingTargetKinds as targetKind}<option value={targetKind}>{targetKind}</option>{/each}</select></label>
													<label><span>Target</span><input value={binding.target} oninput={(event) => updateBinding( binding.id, { target: ( event.currentTarget as HTMLInputElement ).value } )} /></label>
													<label><span>Source</span><select value={binding.source} onchange={(event) => updateBinding( binding.id, { source: ( event.currentTarget as HTMLSelectElement ).value as Binding['source'] } )}>{#each bindingSources as source}<option value={source}>{source}</option>{/each}</select></label>
													<label><span>Path</span><input value={binding.path} oninput={(event) => updateBinding( binding.id, { path: ( event.currentTarget as HTMLInputElement ).value } )} /></label>
													<label><span>Category</span><select value={binding.category ?? ''} onchange={(event) => updateBinding( binding.id, { category: ( event.currentTarget as HTMLSelectElement ).value as Binding['category'] || undefined } )}><option value="">auto</option><option value="text">text</option><option value="richText">richText</option><option value="url">url</option><option value="color">color</option><option value="image">image</option><option value="media">media</option><option value="gallery">gallery</option><option value="number">number</option><option value="boolean">boolean</option><option value="object">object</option><option value="postMeta">postMeta</option></select></label>
													<label><span>Fallback</span><input value={String( binding.fallback ?? '' )} oninput={(event) => updateBinding( binding.id, { fallback: ( event.currentTarget as HTMLInputElement ).value } )} /></label>
													<label><span>Before</span><input value={binding.before ?? ''} oninput={(event) => updateBinding( binding.id, { before: ( event.currentTarget as HTMLInputElement ).value || undefined } )} /></label>
													<label><span>After</span><input value={binding.after ?? ''} oninput={(event) => updateBinding( binding.id, { after: ( event.currentTarget as HTMLInputElement ).value || undefined } )} /></label>
													<label><span>Transform</span><input value={binding.transform ?? ''} oninput={(event) => updateBinding( binding.id, { transform: ( event.currentTarget as HTMLInputElement ).value || undefined } )} /></label>
													<label><span>Args JSON</span><textarea rows="3" value={getBindingArgsInputValue( binding )} oninput={(event) => onBindingArgsInput( binding, ( event.currentTarget as HTMLTextAreaElement ).value )} onblur={() => commitBindingArgs( binding )}></textarea>{#if jsonErrors[ getBindingDraftKey( binding.id, 'args' ) ]}<span class="inspector__error">{jsonErrors[ getBindingDraftKey( binding.id, 'args' ) ]}</span>{/if}</label>
													<button type="button" onclick={() => removeBinding( binding.id )}>Remove Binding</button>
												</div>
											{/each}
										{:else}<p>No bindings are defined yet.</p>{/if}
									</div>
									<div class="inspector__nested-group">
										<h5>Accessibility</h5>
										<label><span>Role</span><input value={selectedNode.accessibility.role ?? ''} oninput={(event) => updateFieldValue( 'accessibility.role', ( event.currentTarget as HTMLInputElement ).value )} /></label>
										<label><span>Label</span><input value={selectedNode.accessibility.label ?? ''} oninput={(event) => updateFieldValue( 'accessibility.label', ( event.currentTarget as HTMLInputElement ).value )} /></label>
										<label><span>Labelled By</span><input value={selectedNode.accessibility.labelledBy ?? ''} oninput={(event) => updateFieldValue( 'accessibility.labelledBy', ( event.currentTarget as HTMLInputElement ).value )} /></label>
										<label><span>Described By</span><input value={selectedNode.accessibility.describedBy ?? ''} oninput={(event) => updateFieldValue( 'accessibility.describedBy', ( event.currentTarget as HTMLInputElement ).value )} /></label>
										<label><span>Decorative</span><input type="checkbox" checked={selectedNode.accessibility.decorative} onchange={(event) => updateFieldValue( 'accessibility.decorative', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
										<label><span>Tab Index</span><input type="number" value={selectedNode.accessibility.tabIndex ?? ''} oninput={(event) => updateFieldValue( 'accessibility.tabIndex', Number( ( event.currentTarget as HTMLInputElement ).value ) || 0 )} /></label>
									</div>
									<div class="inspector__nested-group">
										<h5>Meta</h5>
										<textarea rows="6" value={jsonDrafts[ `${ selectedNode.id }:meta` ] ?? JSON.stringify( selectedNode.meta ?? {}, null, 2 )} oninput={(event) => updateMetaJson( ( event.currentTarget as HTMLTextAreaElement ).value )} onblur={commitMetaJson}></textarea>
										{#if jsonErrors[ `${ selectedNode.id }:meta` ]}<span class="inspector__error">{jsonErrors[ `${ selectedNode.id }:meta` ]}</span>{/if}
									</div>
									{#if state.ui.componentEditing.context === 'detached'}
										<section class="inspector__nested-group">
											<div class="inspector__section-header"><div><h5>Detached Component</h5><p>This instance is detached from its original master.</p></div><button type="button" onclick={() => editor.relinkComponentInstance( selectedNode.id, String( readDetachedComponentMeta( selectedNode )?.componentId ?? '' ), true )}>Relink</button></div>
											<p>Source component: {String( readDetachedComponentMeta( selectedNode )?.componentId ?? 'Unknown' )}</p>
										</section>
									{/if}
								{/if}
							</div>
						{/each}
					{:else}
						<p class="inspector__empty-state">No explicit advanced sections are configured for this element.</p>
					{/if}
				</section>
			{/if}
		{:else}
			<section class="inspector__section inspector__section--empty">
				<p class="inspector__eyebrow">Editor</p>
				<h2>Select an element</h2>
				<p>Click any element on the canvas or in Structure to edit its content, styles, and advanced settings.</p>
			</section>
		{/if}
		{:else}
			<section class="inspector__section inspector__section--summary">
				<p class="inspector__eyebrow">{formatInspectorLabel( activeDocument.kind )}</p>
				<h2>{activeDocument.title}</h2>
				<p>Use the shell pages for page settings, history, globals, and site-level workflows.</p>
				<div class="inspector__meta">
					<span class="inspector__pill inspector__pill--muted">{activeDocument.status}</span>
					<span class="inspector__pill inspector__pill--muted">{state.ui.saveState}</span>
					<span class="inspector__pill inspector__pill--muted">{state.ui.preview.slot ?? 'page'}</span>
				</div>
			</section>
		{/if}

	{#if state.ui.componentEditing.context === 'master' && activeComponentWorkflow}
		<section class="inspector__section">
			<div class="inspector__section-header"><div><h3>Component Master</h3><p>Manage instance policy and exposed properties for this master.</p></div><p class="inspector__eyebrow">Usage: {getComponentUsageCount( activeDocument.id )}</p></div>
			<label><span>Locked Structure</span><input type="checkbox" checked={activeComponentWorkflow.lockedStructure} onchange={(event) => updateComponentWorkflow( { lockedStructure: ( event.currentTarget as HTMLInputElement ).checked } )} /></label>
			<div class="inspector__subsection">
				<h4>Instance Policy</h4>
				<label><span>Allow Detach</span><input type="checkbox" checked={activeComponentWorkflow.instancePolicy.allowDetach} onchange={(event) => updateComponentPolicy( 'allowDetach', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
				<label><span>Allow Relink</span><input type="checkbox" checked={activeComponentWorkflow.instancePolicy.allowRelink} onchange={(event) => updateComponentPolicy( 'allowRelink', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
				<label><span>Allow Style Overrides</span><input type="checkbox" checked={activeComponentWorkflow.instancePolicy.allowStyleOverrides} onchange={(event) => updateComponentPolicy( 'allowStyleOverrides', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
				<label><span>Allow Class Overrides</span><input type="checkbox" checked={activeComponentWorkflow.instancePolicy.allowClassOverrides} onchange={(event) => updateComponentPolicy( 'allowClassOverrides', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
				<label><span>Allow Visibility Overrides</span><input type="checkbox" checked={activeComponentWorkflow.instancePolicy.allowVisibilityOverrides} onchange={(event) => updateComponentPolicy( 'allowVisibilityOverrides', ( event.currentTarget as HTMLInputElement ).checked )} /></label>
			</div>
			<div class="inspector__subsection">
				<h4>Exposed Properties</h4>
				{#if activeComponentWorkflow.exposedProperties.length}
					{#each activeComponentWorkflow.exposedProperties as exposure (exposure.id)}
						<div class="inspector__class-card">
							<label><span>Label</span><input value={exposure.label} oninput={(event) => updateComponentExposure( exposure.id, { label: ( event.currentTarget as HTMLInputElement ).value } )} /></label>
							<label><span>Group</span><input value={exposure.group ?? ''} oninput={(event) => updateComponentExposure( exposure.id, { group: ( event.currentTarget as HTMLInputElement ).value || undefined } )} /></label>
							<label><span>Description</span><textarea rows="2" oninput={(event) => updateComponentExposure( exposure.id, { description: ( event.currentTarget as HTMLTextAreaElement ).value || undefined } )}>{exposure.description ?? ''}</textarea></label>
							<p>Path: {exposure.propPath} | Type: {exposure.type}</p>
							<button type="button" onclick={() => removeComponentExposure( exposure.id )}>Remove Exposure</button>
						</div>
					{/each}
				{:else}
					<p>Select a node and expose supported fields to build instance overrides.</p>
				{/if}
			</div>
		</section>
	{/if}
</div>
<style>
	.inspector {
		padding: 0;
		display: grid;
		gap: 0;
		background: var( --builder-shell-gray-800 );
		color: var( --builder-shell-toolbar-text );
		--builder-shell-text: var( --builder-shell-toolbar-text );
		--builder-shell-text-muted: var( --builder-shell-toolbar-text-muted );
		--builder-shell-text-strong: var( --builder-shell-toolbar-text );
		--builder-shell-heading: #ffffff;
		--builder-shell-border: rgba( 255, 255, 255, 0.08 );
		--builder-shell-border-strong: rgba( 255, 255, 255, 0.14 );
		--builder-shell-panel-bg: var( --builder-shell-gray-800 );
		--builder-shell-panel-bg-muted: var( --builder-shell-gray-750 );
		--builder-shell-bg-surface: #2d3037;
		--builder-shell-bg-subtle: #252932;
		--builder-shell-border-color: rgba( 255, 255, 255, 0.08 );
		--builder-shell-border-color-bold: rgba( 255, 255, 255, 0.15 );
		--builder-shell-accent-soft: rgba( 208, 4, 212, 0.12 );
	}

	.inspector__section {
		padding: 10px 12px 12px;
		border: 1px solid var( --builder-shell-border );
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.025 );
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	.inspector__section h2,
	.inspector__section h3,
	.inspector__section h4,
	.inspector__section p {
		margin: 0;
	}

	.inspector__section--context,
	.inspector__section--empty,
	.inspector__section--summary {
		padding-top: 10px;
	}

	.inspector__selection-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 24px;
		block-size: 24px;
		border-radius: 3px;
		background: rgba( 255, 255, 255, 0.05 );
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.inspector__context-strip {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-wrap: wrap;
	}

	.inspector__eyebrow {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var( --builder-shell-toolbar-text-muted );
		font-weight: 600;
	}

	.inspector__help {
		font-size: 11px;
		line-height: 1.45;
		color: var( --builder-shell-toolbar-text-muted );
	}

	.inspector__error {
		font-size: 11px;
		color: var( --builder-shell-danger );
	}

	.inspector__subsection,
	.inspector__class-card {
		display: grid;
		gap: 6px;
		padding: 10px;
		border: 1px solid var( --builder-shell-border );
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.025 );
	}

	.inspector__nested-group {
		display: grid;
		gap: 10px;
		padding: 12px;
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.035 );
		border: 1px solid rgba( 255, 255, 255, 0.08 );
	}

	.inspector label {
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	.inspector label > span {
		font-size: 11px;
		font-weight: 500;
		line-height: 1.3;
		color: var( --builder-shell-toolbar-text-muted );
	}

	.inspector textarea,
	.inspector input,
	.inspector select {
		width: 100%;
		box-sizing: border-box;
		min-height: var( --builder-shell-control-height );
		border-radius: 5px;
		border: 1px solid rgba( 255, 255, 255, 0.14 );
		padding: 0 10px;
		background: rgba( 255, 255, 255, 0.055 );
		color: var( --builder-shell-toolbar-text );
	}

	.inspector textarea {
		min-height: 72px;
		padding-block: 8px;
		resize: vertical;
	}

	.inspector textarea:hover,
	.inspector input:hover,
	.inspector select:hover {
		border-color: rgba( 255, 255, 255, 0.24 );
		background: rgba( 255, 255, 255, 0.075 );
	}

	.inspector textarea:focus-visible,
	.inspector input:focus-visible,
	.inspector select:focus-visible,
	.inspector button:focus-visible {
		outline: none;
		box-shadow: var( --builder-shell-focus-ring );
	}

	.inspector__section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
		min-width: 0;
		padding-bottom: 2px;
	}

	.inspector__section-header h3,
	.inspector__section-header h4,
	.inspector__section-header h5 {
		margin: 0;
		color: var( --builder-shell-heading );
		line-height: 1.2;
	}

	.inspector__section-header p {
		margin-top: 2px;
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 11px;
	}

	.inspector__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.inspector__file-input {
		display: none;
	}

	.inspector__library-list {
		display: grid;
		gap: 10px;
	}

	.inspector__library-card {
		padding: 10px;
		border: 1px solid var( --builder-shell-border );
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.035 );
	}

	.inspector__library-card h5,
	.inspector__library-card p {
		margin: 0;
	}

	.inspector__library-card h5 {
		font-size: 13px;
		line-height: 1.3;
		color: var( --builder-shell-heading );
	}

	.inspector__library-card p {
		font-size: 11px;
		line-height: 1.35;
		color: var( --builder-shell-text-muted );
	}

	.inspector__import-banner {
		display: grid;
		gap: 6px;
		padding: 10px;
		border-radius: 6px;
		border: 1px solid rgba( 57, 217, 138, 0.28 );
		background: rgba( 57, 217, 138, 0.08 );
		color: var( --builder-shell-toolbar-text );
	}

	.inspector__import-banner--error {
		border-color: rgba( 255, 107, 107, 0.36 );
		background: rgba( 255, 107, 107, 0.1 );
	}

	.inspector__import-banner p,
	.inspector__import-banner ul {
		margin: 0;
	}

	.inspector__import-banner ul {
		padding-left: 16px;
		font-size: 11px;
		line-height: 1.45;
	}

	.inspector__list {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 6px;
	}

	.inspector__meta {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.inspector__summary-action,
	.inspector__popover-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 24px;
		block-size: 24px;
		min-height: 24px;
		padding: 0;
		border-radius: 999px;
	}

	.inspector__summary-action--active {
		border-color: rgba( 208, 4, 212, 0.28 );
		background: rgba( 208, 4, 212, 0.12 );
		color: var( --builder-shell-accent );
	}

	.inspector__meta-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 18px;
		block-size: 18px;
		border-radius: 999px;
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		background: rgba( 255, 255, 255, 0.04 );
		color: var( --builder-shell-toolbar-text-muted );
	}

	.inspector__pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		border-radius: 999px;
		background: rgba( 255, 255, 255, 0.08 );
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.inspector__pill--accent {
		background: rgba( 208, 4, 212, 0.08 );
		color: var( --builder-shell-accent );
	}

	.inspector__pill--muted {
		background: rgba( 255, 255, 255, 0.05 );
	}

	.inspector__state-tabs {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 2px;
		border-radius: 6px;
		background: rgba( 255, 255, 255, 0.045 );
		border: 1px solid rgba( 255, 255, 255, 0.08 );
	}

	.inspector__state-tabs button {
		min-height: 22px;
		padding: 0 8px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
	}

	.inspector__state-tab--active {
		background: rgba( 208, 4, 212, 0.18 ) !important;
		color: var( --builder-shell-toolbar-text ) !important;
		box-shadow: inset 0 0 0 1px rgba( 255, 255, 255, 0.06 ), inset 0 -2px 0 var( --builder-shell-accent );
	}

	.inspector__style-section,
	.inspector__advanced-section {
		gap: 4px;
	}

	.inspector__style-section > .inspector__section-header {
		align-items: flex-start;
	}

	.inspector__summary-row {
		padding: 2px 0 0;
	}

	.inspector__summary-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-width: 0;
	}

	.inspector__summary-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 4px 8px;
		border-radius: 6px;
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		background: rgba( 255, 255, 255, 0.04 );
		color: var( --builder-shell-toolbar-text-muted );
		font-size: 11px;
		line-height: 1.2;
	}

	.inspector__summary-chip span:last-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inspector__summary-swatch {
		inline-size: 10px;
		block-size: 10px;
		flex-shrink: 0;
		border-radius: 999px;
		border: 1px solid rgba( 255, 255, 255, 0.18 );
	}

	.inspector__summary-placeholder {
		font-size: 11px;
		color: var( --builder-shell-toolbar-text-muted );
	}

	.inspector__popover-surface {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 80;
		inline-size: min( 320px, calc( 100vw - 24px ) );
		display: grid;
		gap: 10px;
		padding: 12px;
		border-radius: 8px;
		border: 1px solid rgba( 255, 255, 255, 0.1 );
		background: #1f2024;
		box-shadow: 0 18px 44px rgba( 0, 0, 0, 0.35 );
	}

	.inspector__popover-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.inspector__popover-header h5,
	.inspector__popover-header p {
		margin: 0;
	}

	.inspector__popover-header h5 {
		font-size: 12px;
		font-weight: 700;
		color: var( --builder-shell-toolbar-text );
	}

	.inspector__popover-header p {
		font-size: 10px;
		color: var( --builder-shell-toolbar-text-muted );
	}

	.inspector__popover-body {
		display: grid;
		gap: 8px;
	}

	.inspector__control {
		padding: 0;
		min-width: 0;
	}

	.inspector__actions--inline {
		padding: 2px 0 0;
	}

	.inspector__utility-section {
		background: rgba( 255, 255, 255, 0.03 );
		padding: 12px;
		border-radius: 3px;
		border: 1px solid rgba( 255, 255, 255, 0.08 );
	}

	.inspector__empty-state {
		font-size: 12px;
		line-height: 1.5;
		color: var( --builder-shell-text-muted );
	}

	.inspector button {
		appearance: none;
		min-height: var( --builder-shell-control-height );
		padding: 0 10px;
		border: 1px solid var( --builder-shell-border-strong );
		border-radius: 3px;
		background: rgba( 255, 255, 255, 0.05 );
		color: var( --builder-shell-toolbar-text );
		font-size: 12px;
		line-height: 1;
		cursor: pointer;
		transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
	}

	.inspector button:hover {
		background: rgba( 255, 255, 255, 0.08 );
		border-color: rgba( 255, 255, 255, 0.2 );
	}

	.inspector button:focus-visible {
		outline: none;
		border-color: var( --builder-shell-accent );
		box-shadow: 0 0 0 1px var( --builder-shell-accent );
	}
</style>

