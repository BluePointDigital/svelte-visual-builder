import type { BuilderEngine, BuilderEngineState, BuilderMutationCommand } from '@builder/core';
import { getActiveDocument, getNodeById, getNodeLocation, getSelectedNodes } from '@builder/core';
import type { BuilderNode, ClassDefinition, HtmlAttribute, JsonValue, StyleSet, VariableDefinition } from '@builder/schema';
import { ClassDefinitionSchema, VariableDefinitionSchema, createNode } from '@builder/schema';
import type { BuilderRegistry } from '@builder/plugin-api';

import type { BuilderAiToolCall, BuilderAiToolDefinition, BuilderAiToolExecutionResult } from './ai';

export interface BuilderAiToolExecutorOptions {
	engine: BuilderEngine;
	registry: BuilderRegistry;
	defaultParentId?: string;
	defaultSlot?: string;
	mode?: 'create' | 'edit';
}

export interface BuilderAiToolExecutor {
	tools: BuilderAiToolDefinition[];
	executeTool: ( call: BuilderAiToolCall ) => Promise<BuilderAiToolExecutionResult>;
}

export function createBuilderAiToolExecutor( options: BuilderAiToolExecutorOptions ): BuilderAiToolExecutor {
	return {
		tools: getModelFacingAiTools( options.mode ?? 'edit' ),
		executeTool: async ( call ) => executeBuilderAiTool( options, call ),
	};
}

const objectSchema = {
	type: 'object',
	additionalProperties: true,
} satisfies Record<string, JsonValue>;

const READ_TOOL_NAMES = new Set( [
	'inspect_current_document',
	'inspect_selected_node',
	'search_nodes',
	'list_element_registry',
	'list_design_system',
	'list_documents',
] );

const CREATE_TOOL_NAMES = new Set( [
	...READ_TOOL_NAMES,
	'add_section_from_html',
] );

const EDIT_TOOL_NAMES = new Set( [
	...READ_TOOL_NAMES,
	'improve_section_visual_style',
	'match_style_from_node',
	'rewrite_text_content',
	'make_section_responsive',
	'apply_brand_palette',
	'convert_selection_to_pricing',
	'convert_selection_to_hero',
	'add_cta_block',
	'add_section_from_html',
	'replace_selected_with_html',
	'set_node_text',
	'set_node_background',
	'set_node_spacing',
	'set_node_typography',
	'set_node_link',
] );

export function getModelFacingAiTools( mode: 'create' | 'edit' = 'edit' ): BuilderAiToolDefinition[] {
	const allowed = mode === 'create' ? CREATE_TOOL_NAMES : EDIT_TOOL_NAMES;
	return builderAiTools.filter( ( entry ) => allowed.has( entry.function.name ) );
}

export const builderAiTools: BuilderAiToolDefinition[] = [
	tool( 'inspect_current_document', 'Return the active document, root node tree, and selected node ids.', objectSchema ),
	tool( 'inspect_selected_node', 'Return the currently selected node and its document context.', objectSchema ),
	tool( 'search_nodes', 'Search nodes in the active document by id, type, name, text, class, or prop value.', {
		type: 'object',
		properties: { query: { type: 'string' } },
		required: [ 'query' ],
	} ),
	tool( 'list_element_registry', 'List available builder element definitions and whether each accepts children.', objectSchema ),
	tool( 'list_design_system', 'List classes, variables, breakpoints, and theme style keys.', objectSchema ),
	tool( 'list_documents', 'List documents, components, and library items in the current project.', objectSchema ),
	tool( 'add_section_from_html', 'Create page content from semantic HTML and optional CSS. Preferred for AI creation.', {
		type: 'object',
		properties: {
			html: { type: 'string' },
			css: { type: [ 'string', 'null' ] },
			title: { type: [ 'string', 'null' ] },
			parentId: { type: [ 'string', 'null' ] },
			slot: { type: [ 'string', 'null' ] },
			index: { type: [ 'number', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			summary: { type: [ 'string', 'null' ] },
		},
		required: [ 'html' ],
	} ),
	tool( 'replace_selected_with_html', 'Replace the currently selected node with content converted from semantic HTML and optional CSS.', {
		type: 'object',
		properties: {
			html: { type: 'string' },
			css: { type: [ 'string', 'null' ] },
			title: { type: [ 'string', 'null' ] },
			nodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			summary: { type: [ 'string', 'null' ] },
		},
		required: [ 'html' ],
	} ),
	tool( 'set_node_text', 'Set text/HTML content on a heading, paragraph, text-editor, button, blockquote, or icon-box node.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			text: { type: 'string' },
			documentId: { type: [ 'string', 'null' ] },
			field: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId', 'text' ],
	} ),
	tool( 'set_node_background', 'Set a node background color/image/gradient using safe CSS style values.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			color: { type: [ 'string', 'null' ] },
			image: { type: [ 'string', 'null' ] },
			gradient: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId' ],
	} ),
	tool( 'set_node_spacing', 'Set margin, padding, gap, width, max-width, or min-height for a node.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			padding: { type: [ 'string', 'null' ] },
			margin: { type: [ 'string', 'null' ] },
			gap: { type: [ 'string', 'null' ] },
			width: { type: [ 'string', 'null' ] },
			maxWidth: { type: [ 'string', 'null' ] },
			minHeight: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId' ],
	} ),
	tool( 'set_node_typography', 'Set common text styling for a node.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			color: { type: [ 'string', 'null' ] },
			fontSize: { type: [ 'string', 'null' ] },
			fontWeight: { type: [ 'string', 'number', 'null' ] },
			lineHeight: { type: [ 'string', 'null' ] },
			textAlign: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId' ],
	} ),
	tool( 'set_node_link', 'Set the href/link on a button, image, heading, icon-box, or menu-like node when supported.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			href: { type: 'string' },
			documentId: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId', 'href' ],
	} ),
	tool( 'improve_section_visual_style', 'Improve a selected section/container with safe spacing, color, typography, and elevation choices.', {
		type: 'object',
		properties: {
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			primaryColor: { type: [ 'string', 'null' ] },
			backgroundColor: { type: [ 'string', 'null' ] },
			textColor: { type: [ 'string', 'null' ] },
			style: { type: [ 'string', 'null' ] },
			intensity: { type: [ 'string', 'null' ] },
		},
	} ),
	tool( 'match_style_from_node', 'Copy safe visual styles from a source node to a target node. Prefer this for style matching.', {
		type: 'object',
		properties: {
			sourceNodeId: { type: 'string' },
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			includeLayout: { type: [ 'boolean', 'null' ] },
		},
		required: [ 'sourceNodeId' ],
	} ),
	tool( 'rewrite_text_content', 'Rewrite the selected or target text-bearing node content without changing layout.', {
		type: 'object',
		properties: {
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			text: { type: 'string' },
			field: { type: [ 'string', 'null' ] },
		},
		required: [ 'text' ],
	} ),
	tool( 'make_section_responsive', 'Apply safe responsive layout settings to a selected section/container.', {
		type: 'object',
		properties: {
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			mobileDirection: { type: [ 'string', 'null' ] },
			tabletDirection: { type: [ 'string', 'null' ] },
			gap: { type: [ 'string', 'null' ] },
			mobileGap: { type: [ 'string', 'null' ] },
		},
	} ),
	tool( 'apply_brand_palette', 'Apply a brand palette to the selected section and its obvious text/button descendants.', {
		type: 'object',
		properties: {
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			primaryColor: { type: 'string' },
			secondaryColor: { type: [ 'string', 'null' ] },
			backgroundColor: { type: [ 'string', 'null' ] },
			textColor: { type: [ 'string', 'null' ] },
		},
		required: [ 'primaryColor' ],
	} ),
	tool( 'convert_selection_to_pricing', 'Replace the selected node with an editable pricing section generated from structured settings.', {
		type: 'object',
		properties: {
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			title: { type: [ 'string', 'null' ] },
			currency: { type: [ 'string', 'null' ] },
			plans: { type: 'array', items: objectSchema },
			summary: { type: [ 'string', 'null' ] },
		},
	} ),
	tool( 'convert_selection_to_hero', 'Replace the selected node with an editable hero section generated from structured settings.', {
		type: 'object',
		properties: {
			targetNodeId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			headline: { type: 'string' },
			subheadline: { type: [ 'string', 'null' ] },
			primaryCta: { type: [ 'string', 'null' ] },
			secondaryCta: { type: [ 'string', 'null' ] },
			style: { type: [ 'string', 'null' ] },
			summary: { type: [ 'string', 'null' ] },
		},
		required: [ 'headline' ],
	} ),
	tool( 'add_cta_block', 'Add an editable call-to-action block near the selected target.', {
		type: 'object',
		properties: {
			parentId: { type: [ 'string', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			headline: { type: 'string' },
			body: { type: [ 'string', 'null' ] },
			buttonText: { type: [ 'string', 'null' ] },
			buttonHref: { type: [ 'string', 'null' ] },
			summary: { type: [ 'string', 'null' ] },
		},
		required: [ 'headline' ],
	} ),
	tool( 'create_node_batch', 'Create one or more nodes in the active document or target parent. Nodes must be valid BuilderNode-like objects.', {
		type: 'object',
		properties: {
			nodes: { type: 'array', items: objectSchema },
			parentId: { type: [ 'string', 'null' ] },
			slot: { type: [ 'string', 'null' ] },
			index: { type: [ 'number', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
			summary: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodes' ],
	} ),
	tool( 'update_node', 'Update a node props/layout/styles/attributes/style refs.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			documentId: { type: [ 'string', 'null' ] },
			patch: objectSchema,
			propsPatch: objectSchema,
			layoutPatch: objectSchema,
			stylesPatch: objectSchema,
			styleRefs: { type: 'array', items: { type: 'string' } },
			attributes: { type: 'array', items: objectSchema },
			summary: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId' ],
	} ),
	tool( 'move_node', 'Move a node to a new parent, slot, and index.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			targetParentId: { type: [ 'string', 'null' ] },
			targetSlot: { type: [ 'string', 'null' ] },
			index: { type: [ 'number', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId' ],
	} ),
	tool( 'delete_node', 'Delete a node from the active document.', {
		type: 'object',
		properties: { nodeId: { type: 'string' }, documentId: { type: [ 'string', 'null' ] } },
		required: [ 'nodeId' ],
	} ),
	tool( 'duplicate_node', 'Duplicate a node next to itself or into a target parent.', {
		type: 'object',
		properties: {
			nodeId: { type: 'string' },
			targetParentId: { type: [ 'string', 'null' ] },
			targetSlot: { type: [ 'string', 'null' ] },
			index: { type: [ 'number', 'null' ] },
			documentId: { type: [ 'string', 'null' ] },
		},
		required: [ 'nodeId' ],
	} ),
	tool( 'upsert_class', 'Create or update a design class definition.', {
		type: 'object',
		properties: { definition: objectSchema },
		required: [ 'definition' ],
	} ),
	tool( 'delete_class', 'Delete a design class by id.', {
		type: 'object',
		properties: { classId: { type: 'string' } },
		required: [ 'classId' ],
	} ),
	tool( 'upsert_variable', 'Create or update a design variable definition.', {
		type: 'object',
		properties: { definition: objectSchema },
		required: [ 'definition' ],
	} ),
	tool( 'delete_variable', 'Delete a design variable by id.', {
		type: 'object',
		properties: { variableId: { type: 'string' } },
		required: [ 'variableId' ],
	} ),
	tool( 'update_document', 'Update active document title, slug, status, or metadata.', {
		type: 'object',
		properties: { documentId: { type: [ 'string', 'null' ] }, patch: objectSchema },
		required: [ 'patch' ],
	} ),
	tool( 'insert_library_item', 'Insert a reusable library item document into the active page.', {
		type: 'object',
		properties: {
			libraryDocumentId: { type: 'string' },
			parentId: { type: [ 'string', 'null' ] },
			slot: { type: [ 'string', 'null' ] },
		},
		required: [ 'libraryDocumentId' ],
	} ),
	tool( 'create_component_instance', 'Create a component instance node for an existing component document.', {
		type: 'object',
		properties: {
			componentId: { type: 'string' },
			parentId: { type: [ 'string', 'null' ] },
			slot: { type: [ 'string', 'null' ] },
		},
		required: [ 'componentId' ],
	} ),
];

async function executeBuilderAiTool( options: BuilderAiToolExecutorOptions, call: BuilderAiToolCall ): Promise<BuilderAiToolExecutionResult> {
	const args = parseToolArguments( call.function.arguments );
	switch ( call.function.name ) {
		case 'inspect_current_document':
			return inspectCurrentDocument( options.engine.getState() );
		case 'inspect_selected_node':
			return inspectSelectedNode( options.engine.getState() );
		case 'search_nodes':
			return searchNodes( options.engine.getState(), readString( args.query, 'query' ) );
		case 'list_element_registry':
			return listElementRegistry( options.registry );
		case 'list_design_system':
			return listDesignSystem( options.engine.getState() );
		case 'list_documents':
			return listDocuments( options.engine.getState() );
		case 'add_section_from_html':
			return runMutationAsync( options.engine, readString( args.summary, 'summary', 'AI: Add section from HTML' ), () => addSectionFromHtml( options, args ) );
		case 'replace_selected_with_html':
			return runMutationAsync( options.engine, readString( args.summary, 'summary', 'AI: Replace selection with HTML' ), () => replaceSelectedWithHtml( options, args ) );
		case 'set_node_text':
			return runMutation( options.engine, 'AI: Set node text', () => setNodeText( options, args ) );
		case 'set_node_background':
			return runMutation( options.engine, 'AI: Set node background', () => setNodeBackground( options, args ) );
		case 'set_node_spacing':
			return runMutation( options.engine, 'AI: Set node spacing', () => setNodeSpacing( options, args ) );
		case 'set_node_typography':
			return runMutation( options.engine, 'AI: Set node typography', () => setNodeTypography( options, args ) );
		case 'set_node_link':
			return runMutation( options.engine, 'AI: Set node link', () => setNodeLink( options, args ) );
		case 'improve_section_visual_style':
			return runMutation( options.engine, 'AI: Improve section visual style', () => improveSectionVisualStyle( options, args ) );
		case 'match_style_from_node':
			return runMutation( options.engine, 'AI: Match style from node', () => matchStyleFromNode( options, args ) );
		case 'rewrite_text_content':
			return runMutation( options.engine, 'AI: Rewrite text content', () => rewriteTextContent( options, args ) );
		case 'make_section_responsive':
			return runMutation( options.engine, 'AI: Make section responsive', () => makeSectionResponsive( options, args ) );
		case 'apply_brand_palette':
			return runMutation( options.engine, 'AI: Apply brand palette', () => applyBrandPalette( options, args ) );
		case 'convert_selection_to_pricing':
			return runMutationAsync( options.engine, readString( args.summary, 'summary', 'AI: Convert selection to pricing' ), () => convertSelectionToPricing( options, args ) );
		case 'convert_selection_to_hero':
			return runMutationAsync( options.engine, readString( args.summary, 'summary', 'AI: Convert selection to hero' ), () => convertSelectionToHero( options, args ) );
		case 'add_cta_block':
			return runMutationAsync( options.engine, readString( args.summary, 'summary', 'AI: Add CTA block' ), () => addCtaBlock( options, args ) );
		case 'create_node_batch':
			return runMutation( options.engine, readString( args.summary, 'summary', 'AI: Create nodes' ), () => createNodeBatch( options, args ) );
		case 'update_node':
			return runMutation( options.engine, readString( args.summary, 'summary', 'AI: Update node' ), () => updateNode( options, args ) );
		case 'move_node':
			return runMutation( options.engine, 'AI: Move node', () => dispatchCommand( options.engine, {
				type: 'document/elements/move',
				documentId: readOptionalString( args.documentId ),
				nodeId: readString( args.nodeId, 'nodeId' ),
				targetParentId: readOptionalString( args.targetParentId ),
				targetSlot: readOptionalString( args.targetSlot ),
				index: readOptionalNumber( args.index ),
			} ) );
		case 'delete_node':
			return runMutation( options.engine, 'AI: Delete node', () => dispatchCommand( options.engine, {
				type: 'document/elements/delete',
				documentId: readOptionalString( args.documentId ),
				nodeId: readString( args.nodeId, 'nodeId' ),
			} ) );
		case 'duplicate_node':
			return runMutation( options.engine, 'AI: Duplicate node', () => duplicateNode( options, args ) );
		case 'upsert_class':
			return runMutation( options.engine, 'AI: Update class', () => upsertClass( options.engine, args.definition ) );
		case 'delete_class':
			return runMutation( options.engine, 'AI: Delete class', () => dispatchCommand( options.engine, {
				type: 'design/classes/delete',
				classId: readString( args.classId, 'classId' ),
			} ) );
		case 'upsert_variable':
			return runMutation( options.engine, 'AI: Update variable', () => upsertVariable( options.engine, args.definition ) );
		case 'delete_variable':
			return runMutation( options.engine, 'AI: Delete variable', () => dispatchCommand( options.engine, {
				type: 'design/variables/delete',
				variableId: readString( args.variableId, 'variableId' ),
			} ) );
		case 'update_document':
			return runMutation( options.engine, 'AI: Update document', () => updateDocument( options.engine, args ) );
		case 'insert_library_item':
			return runMutation( options.engine, 'AI: Insert library item', () => insertLibraryItem( options, args ) );
		case 'create_component_instance':
			return runMutation( options.engine, 'AI: Create component instance', () => createComponentInstance( options, args ) );
		default:
			return { ok: false, summary: `Unsupported tool: ${ call.function.name }` };
	}
}

function tool( name: string, description: string, parameters: Record<string, JsonValue> ): BuilderAiToolDefinition {
	return {
		type: 'function',
		function: {
			name,
			description,
			parameters,
		},
	};
}

function inspectCurrentDocument( state: BuilderEngineState ): BuilderAiToolExecutionResult {
	const document = getActiveDocument( state );
	return {
		ok: true,
		summary: `Active document ${ document.title } has ${ countNodes( document.root ) } nodes.`,
		data: {
			document,
			selectedNodeIds: state.ui.selectedNodeIds,
		} as JsonValue,
	};
}

function inspectSelectedNode( state: BuilderEngineState ): BuilderAiToolExecutionResult {
	const document = getActiveDocument( state );
	const node = getSelectedNodes( state )[ 0 ];
	return {
		ok: Boolean( node ),
		summary: node ? `Selected ${ node.type } ${ node.id }.` : 'No node is selected.',
		data: { documentId: document.id, node } as JsonValue,
	};
}

function searchNodes( state: BuilderEngineState, query: string ): BuilderAiToolExecutionResult {
	const needle = query.toLowerCase();
	const matches: Array<{ id: string; type: string; name?: string; props: Record<string, JsonValue> }> = [];
	for ( const node of flattenNodes( getActiveDocument( state ).root ) ) {
		const haystack = JSON.stringify( {
			id: node.id,
			type: node.type,
			name: node.name,
			props: node.props,
			styleRefs: node.styleRefs,
			attributes: node.attributes,
		} ).toLowerCase();
		if ( haystack.includes( needle ) ) {
			matches.push( { id: node.id, type: node.type, name: node.name, props: node.props } );
		}
	}
	return {
		ok: true,
		summary: `Found ${ matches.length } node${ matches.length === 1 ? '' : 's' } matching "${ query }".`,
		data: matches.slice( 0, 50 ) as JsonValue,
	};
}

function listElementRegistry( registry: BuilderRegistry ): BuilderAiToolExecutionResult {
	const definitions = [ ...registry.elements.values() ].map( ( definition ) => ( {
		type: definition.type,
		label: definition.label,
		category: definition.category,
		acceptsChildren: Boolean( definition.runtime.acceptsChildren ),
		props: Object.keys( definition.defaults.props ?? {} ),
	} ) );
	return { ok: true, summary: `Listed ${ definitions.length } element definitions.`, data: definitions as JsonValue };
}

function listDesignSystem( state: BuilderEngineState ): BuilderAiToolExecutionResult {
	const design = state.project.designSystem;
	return {
		ok: true,
		summary: `Design system has ${ design.classes.length } classes and ${ design.variables.length } variables.`,
		data: {
			classes: design.classes,
			variables: design.variables,
			breakpoints: design.breakpoints,
			themeStyleKeys: Object.keys( design.themeStyles ),
		} as JsonValue,
	};
}

function listDocuments( state: BuilderEngineState ): BuilderAiToolExecutionResult {
	const documents = state.project.documents.map( ( document ) => ( {
		id: document.id,
		kind: document.kind,
		title: document.title,
		slug: document.slug,
		rootNodeCount: countNodes( document.root ),
	} ) );
	return { ok: true, summary: `Listed ${ documents.length } documents.`, data: documents as JsonValue };
}

function createNodeBatch( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	if ( !Array.isArray( args.nodes ) || args.nodes.length === 0 ) {
		throw new Error( 'create_node_batch requires a non-empty nodes array.' );
	}
	const parentId = readOptionalString( args.parentId ) ?? options.defaultParentId ?? getPreferredInsertionParentId( options.engine.getState(), options.registry );
	const slot = readOptionalString( args.slot ) ?? options.defaultSlot;
	const index = readOptionalNumber( args.index );
	const documentId = readOptionalString( args.documentId );
	const nodes = args.nodes.map( ( nodeInput ) => normalizeAiNode( nodeInput, options.registry ) );
	nodes.forEach( ( node, offset ) => {
		options.engine.dispatch( {
			type: 'document/elements/create',
			documentId,
			parentId,
			slot,
			index: index === undefined ? undefined : index + offset,
			node,
		} );
	} );
	return { ok: true, summary: `Created ${ nodes.length } node${ nodes.length === 1 ? '' : 's' }.` };
}

function updateNode( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const state = options.engine.getState();
	const document = resolveDocument( state, readOptionalString( args.documentId ) );
	const node = getNodeById( document.root, readString( args.nodeId, 'nodeId' ) );
	if ( !node ) {
		throw new Error( `Node not found: ${ readString( args.nodeId, 'nodeId' ) }.` );
	}
	validateAiNodePatch( options.registry, node, args );
	const command: BuilderMutationCommand = {
		type: 'document/elements/update',
		documentId: readOptionalString( args.documentId ),
		nodeId: readString( args.nodeId, 'nodeId' ),
		patch: readOptionalRecord( args.patch ) as Partial<BuilderNode> | undefined,
		propsPatch: readOptionalRecord( args.propsPatch ),
		layoutPatch: readOptionalRecord( args.layoutPatch ),
		stylesPatch: readOptionalRecord( args.stylesPatch ) as Partial<StyleSet> | undefined,
		styleRefs: Array.isArray( args.styleRefs ) ? args.styleRefs.filter( ( value ): value is string => typeof value === 'string' ) : undefined,
		attributes: Array.isArray( args.attributes ) ? args.attributes as HtmlAttribute[] : undefined,
	};
	options.engine.dispatch( command );
	return { ok: true, summary: `Updated node ${ command.nodeId }.` };
}

async function addSectionFromHtml( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): Promise<BuilderAiToolExecutionResult> {
	const nodes = await importHtmlNodes( args );
	const parentId = readOptionalString( args.parentId ) ?? options.defaultParentId ?? getPreferredInsertionParentId( options.engine.getState(), options.registry );
	const slot = readOptionalString( args.slot ) ?? options.defaultSlot;
	const index = readOptionalNumber( args.index );
	const documentId = readOptionalString( args.documentId );
	nodes.forEach( ( node, offset ) => {
		options.engine.dispatch( {
			type: 'document/elements/create',
			documentId,
			parentId,
			slot,
			index: index === undefined ? undefined : index + offset,
			node,
		} );
	} );
	return {
		ok: true,
		summary: `Added ${ nodes.length } imported HTML root node${ nodes.length === 1 ? '' : 's' }.`,
		data: {
			html: readString( args.html, 'html' ),
			css: readOptionalString( args.css ) ?? '',
			parsedNodes: nodes.map( summarizeNodeForDebug ),
		} as JsonValue,
	};
}

async function replaceSelectedWithHtml( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): Promise<BuilderAiToolExecutionResult> {
	const state = options.engine.getState();
	const documentId = readOptionalString( args.documentId ) ?? state.activeDocumentId;
	const document = resolveDocument( state, documentId );
	const nodeId = readOptionalString( args.nodeId ) ?? state.ui.selectedNodeIds[ 0 ];
	if ( !nodeId ) {
		throw new Error( 'replace_selected_with_html requires a selected node or nodeId.' );
	}
	const location = getNodeLocation( document.root, nodeId );
	if ( !location ) {
		throw new Error( `Node not found: ${ nodeId }.` );
	}
	const nodes = await importHtmlNodes( args );
	options.engine.dispatch( { type: 'document/elements/delete', documentId, nodeId } );
	nodes.forEach( ( node, offset ) => {
		options.engine.dispatch( {
			type: 'document/elements/create',
			documentId,
			parentId: location.parentId,
			slot: location.slot,
			index: location.index + offset,
			node,
		} );
	} );
	return {
		ok: true,
		summary: `Replaced ${ nodeId } with ${ nodes.length } imported HTML root node${ nodes.length === 1 ? '' : 's' }.`,
		data: {
			html: readString( args.html, 'html' ),
			css: readOptionalString( args.css ) ?? '',
			replacedNodeId: nodeId,
			parsedNodes: nodes.map( summarizeNodeForDebug ),
		} as JsonValue,
	};
}

function setNodeText( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveToolNode( options, args );
	const text = readString( args.text, 'text' );
	const field = readOptionalString( args.field ) ?? defaultTextFieldForNode( node );
	if ( !field ) {
		throw new Error( `${ node.type } does not have a supported text field.` );
	}
	validatePatchProps( options.registry, node, { [ field ]: text } );
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		propsPatch: { [ field ]: text },
	} );
	return { ok: true, summary: `Updated ${ node.type } text.` };
}

function setNodeBackground( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveToolNode( options, args );
	const styles = compactJsonObject( {
		backgroundColor: readOptionalString( args.color ),
		backgroundImage: readOptionalString( args.gradient ) ?? ( readOptionalString( args.image ) ? `url("${ readOptionalString( args.image ) }")` : undefined ),
	} );
	if ( !Object.keys( styles ).length ) {
		throw new Error( 'set_node_background requires color, image, or gradient.' );
	}
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		stylesPatch: { base: styles },
	} );
	return { ok: true, summary: `Updated ${ node.type } background.` };
}

function setNodeSpacing( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveToolNode( options, args );
	const styles = compactJsonObject( {
		padding: readOptionalString( args.padding ),
		margin: readOptionalString( args.margin ),
		gap: readOptionalString( args.gap ),
		width: readOptionalString( args.width ),
		maxWidth: readOptionalString( args.maxWidth ),
		minHeight: readOptionalString( args.minHeight ),
	} );
	if ( !Object.keys( styles ).length ) {
		throw new Error( 'set_node_spacing requires at least one spacing or sizing value.' );
	}
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		stylesPatch: { base: styles },
	} );
	return { ok: true, summary: `Updated ${ node.type } spacing.` };
}

function setNodeTypography( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveToolNode( options, args );
	const styles = compactJsonObject( {
		color: readOptionalString( args.color ),
		fontSize: readOptionalString( args.fontSize ),
		fontWeight: typeof args.fontWeight === 'number' ? String( args.fontWeight ) : readOptionalString( args.fontWeight ),
		lineHeight: readOptionalString( args.lineHeight ),
		textAlign: readOptionalString( args.textAlign ),
	} );
	if ( !Object.keys( styles ).length ) {
		throw new Error( 'set_node_typography requires at least one typography value.' );
	}
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		stylesPatch: { base: styles },
	} );
	return { ok: true, summary: `Updated ${ node.type } typography.` };
}

function setNodeLink( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveToolNode( options, args );
	const href = readString( args.href, 'href' );
	const field = node.type === 'image' || node.type === 'heading' || node.type === 'icon-box' ? 'link' : 'href';
	validatePatchProps( options.registry, node, { [ field ]: href } );
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		propsPatch: { [ field ]: href },
	} );
	return { ok: true, summary: `Updated ${ node.type } link.` };
}

function improveSectionVisualStyle( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveSemanticTargetNode( options, args, 'improve_section_visual_style' );
	const primaryColor = readOptionalString( args.primaryColor ) ?? '#4f46e5';
	const backgroundColor = readOptionalString( args.backgroundColor ) ?? 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)';
	const textColor = readOptionalString( args.textColor ) ?? '#111827';
	const style = readOptionalString( args.style ) ?? 'polished';
	const backgroundStyles = backgroundColor.includes( 'gradient(' )
		? { backgroundImage: backgroundColor }
		: { backgroundColor };
	const baseStyles = compactJsonObject( {
		...backgroundStyles,
		padding: node.type === 'container' || node.type === 'grid-container' ? 'clamp(48px, 7vw, 96px) clamp(24px, 5vw, 72px)' : undefined,
		gap: node.type === 'container' || node.type === 'grid-container' ? '24px' : undefined,
		borderRadius: /premium|polished|soft/i.test( style ) ? '24px' : '12px',
		boxShadow: /premium|elevated|polished/i.test( style ) ? '0 24px 70px rgba(15, 23, 42, 0.14)' : undefined,
		color: textColor,
	} );
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		patch: { styles: withBaseStyles( node, baseStyles ) },
	} );
	const textUpdates = collectDescendants( node )
		.filter( ( child ) => [ 'heading', 'paragraph', 'text-editor', 'blockquote' ].includes( child.type ) )
		.slice( 0, 8 );
	for ( const child of textUpdates ) {
		options.engine.dispatch( {
			type: 'document/elements/update',
			documentId: document.id,
			nodeId: child.id,
			patch: {
				styles: withBaseStyles( child, compactJsonObject( {
					color: child.type === 'heading' ? textColor : 'rgba(17, 24, 39, 0.72)',
					lineHeight: child.type === 'heading' ? '1.05' : '1.7',
					fontWeight: child.type === 'heading' ? '800' : undefined,
				} ) ),
			},
		} );
	}
	for ( const child of collectDescendants( node ).filter( ( entry ) => entry.type === 'button' ).slice( 0, 4 ) ) {
		options.engine.dispatch( {
			type: 'document/elements/update',
			documentId: document.id,
			nodeId: child.id,
			patch: {
				styles: withBaseStyles( child, {
					backgroundColor: primaryColor,
					color: '#ffffff',
					borderRadius: '999px',
					padding: '0.85rem 1.35rem',
				} ),
			},
		} );
	}
	return {
		ok: true,
		summary: `Improved visual style for ${ node.type } ${ node.id }.`,
		data: { normalizedArgs: { targetNodeId: node.id, primaryColor, backgroundColor, textColor, style }, mutations: 1 + textUpdates.length } as JsonValue,
	};
}

function matchStyleFromNode( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const state = options.engine.getState();
	const document = resolveDocument( state, readOptionalString( args.documentId ) );
	const sourceNodeId = readString( args.sourceNodeId, 'sourceNodeId' );
	const sourceNode = getNodeById( document.root, sourceNodeId );
	if ( !sourceNode ) {
		throw new Error( `Source node not found: ${ sourceNodeId }.` );
	}
	const targetNode = resolveSemanticTargetNode( options, { ...args, nodeId: args.targetNodeId }, 'match_style_from_node' ).node;
	if ( sourceNode.id === targetNode.id ) {
		throw new Error( 'match_style_from_node requires different source and target nodes.' );
	}
	const includeLayout = args.includeLayout === true;
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: targetNode.id,
		patch: { styles: structuredClone( sourceNode.styles ) },
		styleRefs: structuredClone( sourceNode.styleRefs ),
		...( includeLayout ? { layoutPatch: structuredClone( sourceNode.layout ) } : {} ),
	} );
	return {
		ok: true,
		summary: `Matched styles from ${ sourceNode.type } ${ sourceNode.id } to ${ targetNode.type } ${ targetNode.id }.`,
		data: { normalizedArgs: { sourceNodeId, targetNodeId: targetNode.id, includeLayout }, mutations: 1 } as JsonValue,
	};
}

function rewriteTextContent( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveSemanticTargetNode( options, args, 'rewrite_text_content' );
	const text = readString( args.text, 'text' );
	const field = readOptionalString( args.field ) ?? defaultTextFieldForNode( node );
	if ( !field ) {
		throw new Error( `${ node.type } does not have a supported text field.` );
	}
	validatePatchProps( options.registry, node, { [ field ]: text } );
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		propsPatch: { [ field ]: text },
	} );
	return {
		ok: true,
		summary: `Rewrote ${ node.type } text.`,
		data: { normalizedArgs: { targetNodeId: node.id, field, text }, mutations: 1 } as JsonValue,
	};
}

function makeSectionResponsive( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveSemanticTargetNode( options, args, 'make_section_responsive' );
	if ( node.type !== 'container' && node.type !== 'grid-container' ) {
		throw new Error( 'make_section_responsive requires a selected container or grid container.' );
	}
	const mobileDirection = normalizeFlexDirection( readOptionalString( args.mobileDirection ) ?? 'column' );
	const tabletDirection = normalizeFlexDirection( readOptionalString( args.tabletDirection ) ?? mobileDirection );
	const gap = readOptionalString( args.gap ) ?? '24px';
	const mobileGap = readOptionalString( args.mobileGap ) ?? '16px';
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		layoutPatch: {
			display: node.type === 'grid-container' ? 'grid' : 'flex',
			direction: node.type === 'container' ? node.layout.direction ?? 'column' : undefined,
		},
		patch: {
			styles: {
				...structuredClone( node.styles ),
				base: { ...structuredClone( node.styles.base ), gap },
				breakpoints: {
					...structuredClone( node.styles.breakpoints ),
					tablet: compactJsonObject( { gap, flexDirection: tabletDirection } ),
					mobile: compactJsonObject( { gap: mobileGap, flexDirection: mobileDirection } ),
				},
			},
		},
	} );
	return {
		ok: true,
		summary: `Added responsive layout settings to ${ node.type } ${ node.id }.`,
		data: { normalizedArgs: { targetNodeId: node.id, mobileDirection, tabletDirection, gap, mobileGap }, mutations: 1 } as JsonValue,
	};
}

function applyBrandPalette( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const { document, node } = resolveSemanticTargetNode( options, args, 'apply_brand_palette' );
	const primaryColor = readString( args.primaryColor, 'primaryColor' );
	const secondaryColor = readOptionalString( args.secondaryColor ) ?? primaryColor;
	const backgroundColor = readOptionalString( args.backgroundColor ) ?? '#ffffff';
	const textColor = readOptionalString( args.textColor ) ?? '#111827';
	const descendants = collectDescendants( node );
	options.engine.dispatch( {
		type: 'document/elements/update',
		documentId: document.id,
		nodeId: node.id,
		patch: { styles: withBaseStyles( node, compactJsonObject( { backgroundColor, color: textColor } ) ) },
	} );
	let mutations = 1;
	for ( const child of descendants ) {
		if ( [ 'heading', 'paragraph', 'text-editor', 'blockquote' ].includes( child.type ) ) {
			options.engine.dispatch( {
				type: 'document/elements/update',
				documentId: document.id,
				nodeId: child.id,
				patch: { styles: withBaseStyles( child, { color: child.type === 'heading' ? textColor : 'rgba(17, 24, 39, 0.72)' } ) },
			} );
			mutations += 1;
		}
		if ( child.type === 'button' ) {
			options.engine.dispatch( {
				type: 'document/elements/update',
				documentId: document.id,
				nodeId: child.id,
				patch: { styles: withBaseStyles( child, { backgroundColor: primaryColor, borderColor: secondaryColor, color: '#ffffff' } ) },
			} );
			mutations += 1;
		}
	}
	return {
		ok: true,
		summary: `Applied brand palette to ${ node.type } ${ node.id }.`,
		data: { normalizedArgs: { targetNodeId: node.id, primaryColor, secondaryColor, backgroundColor, textColor }, mutations } as JsonValue,
	};
}

async function convertSelectionToPricing( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): Promise<BuilderAiToolExecutionResult> {
	const target = resolveSemanticTargetNode( options, args, 'convert_selection_to_pricing' );
	const title = readOptionalString( args.title ) ?? 'Simple pricing that scales with you';
	const currency = readOptionalString( args.currency ) ?? '$';
	const plans = readPlans( args.plans, currency );
	const html = `<section class="ai-pricing"><div class="ai-pricing__intro"><span class="ai-eyebrow">Pricing</span><h2>${ escapeHtml( title ) }</h2><p>Choose the plan that fits your next stage.</p></div><div class="ai-pricing__grid">${ plans.map( ( plan ) => `<article class="ai-price-card"><h3>${ escapeHtml( plan.name ) }</h3><p class="ai-price-card__price">${ escapeHtml( currency ) }${ escapeHtml( plan.price ) }</p><p>${ escapeHtml( plan.description ) }</p><ul>${ plan.features.map( ( feature ) => `<li>${ escapeHtml( feature ) }</li>` ).join( '' ) }</ul><a class="btn btn-primary" href="#">${ escapeHtml( plan.cta ) }</a></article>` ).join( '' ) }</div></section>`;
	const css = '.ai-pricing{padding:64px 32px;background:#f8fafc}.ai-pricing__intro{text-align:center;margin:0 auto 32px;max-width:720px}.ai-eyebrow{color:#4f46e5;font-weight:800;text-transform:uppercase}.ai-pricing h2{font-size:clamp(2rem,5vw,3.5rem)}.ai-pricing__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.ai-price-card{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.08)}.ai-price-card__price{font-size:2.5rem;font-weight:800}@media(max-width:780px){.ai-pricing__grid{grid-template-columns:1fr}}';
	return replaceTargetWithHtml( options, target.node.id, target.document.id, html, css, 'AI Pricing Section' );
}

async function convertSelectionToHero( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): Promise<BuilderAiToolExecutionResult> {
	const target = resolveSemanticTargetNode( options, args, 'convert_selection_to_hero' );
	const headline = readString( args.headline, 'headline' );
	const subheadline = readOptionalString( args.subheadline ) ?? 'A focused, high-converting section generated from your direction.';
	const primaryCta = readOptionalString( args.primaryCta ) ?? 'Get started';
	const secondaryCta = readOptionalString( args.secondaryCta ) ?? 'Learn more';
	const style = readOptionalString( args.style ) ?? 'premium';
	const html = `<section class="ai-hero ai-hero--${ escapeAttribute( style ) }"><div class="ai-hero__content"><span class="ai-eyebrow">Built for momentum</span><h1>${ escapeHtml( headline ) }</h1><p>${ escapeHtml( subheadline ) }</p><div class="ai-hero__actions"><a class="btn btn-primary" href="#">${ escapeHtml( primaryCta ) }</a><a class="btn btn-secondary" href="#">${ escapeHtml( secondaryCta ) }</a></div></div></section>`;
	const css = '.ai-hero{padding:clamp(64px,9vw,132px) clamp(24px,6vw,88px);background:linear-gradient(135deg,#111827,#312e81);color:white;border-radius:28px}.ai-hero__content{max-width:820px;display:grid;gap:22px}.ai-eyebrow{color:#a5b4fc;font-weight:800;text-transform:uppercase}.ai-hero h1{font-size:clamp(2.75rem,8vw,6rem);line-height:.95}.ai-hero p{font-size:1.2rem;max-width:680px;color:rgba(255,255,255,.78)}.ai-hero__actions{display:flex;flex-wrap:wrap;gap:12px}.btn{border-radius:999px;padding:.9rem 1.3rem;font-weight:800}.btn-primary{background:white;color:#111827}.btn-secondary{border:1px solid rgba(255,255,255,.35);color:white}';
	return replaceTargetWithHtml( options, target.node.id, target.document.id, html, css, 'AI Hero Section' );
}

async function addCtaBlock( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): Promise<BuilderAiToolExecutionResult> {
	const headline = readString( args.headline, 'headline' );
	const body = readOptionalString( args.body ) ?? 'Give visitors a clear next step with a focused call to action.';
	const buttonText = readOptionalString( args.buttonText ) ?? 'Take action';
	const buttonHref = readOptionalString( args.buttonHref ) ?? '#';
	const html = `<section class="ai-cta"><div><h2>${ escapeHtml( headline ) }</h2><p>${ escapeHtml( body ) }</p></div><a class="btn btn-primary" href="${ escapeAttribute( buttonHref ) }">${ escapeHtml( buttonText ) }</a></section>`;
	const css = '.ai-cta{margin:40px 0;padding:48px;display:flex;align-items:center;justify-content:space-between;gap:24px;background:#111827;color:white;border-radius:24px}.ai-cta h2{font-size:clamp(1.8rem,4vw,3rem)}.ai-cta p{color:rgba(255,255,255,.72)}.ai-cta .btn{background:#4f46e5;color:white;border-radius:999px;padding:.9rem 1.25rem;font-weight:800}@media(max-width:760px){.ai-cta{flex-direction:column;align-items:flex-start}}';
	const nodes = await importHtmlNodes( { html, css, title: 'AI CTA Block' } );
	const state = options.engine.getState();
	const parentId = readOptionalString( args.parentId ) ?? options.defaultParentId ?? getPreferredInsertionParentId( state, options.registry );
	const documentId = readOptionalString( args.documentId );
	nodes.forEach( ( node ) => {
		options.engine.dispatch( { type: 'document/elements/create', documentId, parentId, node } );
	} );
	return {
		ok: true,
		summary: `Added CTA block with ${ nodes.length } imported HTML root node${ nodes.length === 1 ? '' : 's' }.`,
		data: { normalizedArgs: { headline, body, buttonText, buttonHref, parentId }, parsedNodes: nodes.map( summarizeNodeForDebug ), mutations: nodes.length } as JsonValue,
	};
}

function duplicateNode( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const state = options.engine.getState();
	const documentId = readOptionalString( args.documentId ) ?? state.activeDocumentId;
	const document = state.project.documents.find( ( entry ) => entry.id === documentId );
	if ( !document ) {
		throw new Error( `Document not found: ${ documentId }.` );
	}
	const nodeId = readString( args.nodeId, 'nodeId' );
	const location = getNodeLocation( document.root, nodeId );
	if ( !location ) {
		throw new Error( `Node not found: ${ nodeId }.` );
	}
	options.engine.dispatch( {
		type: 'document/elements/create',
		documentId,
		parentId: readOptionalString( args.targetParentId ) ?? location.parentId,
		slot: readOptionalString( args.targetSlot ) ?? location.slot,
		index: readOptionalNumber( args.index ) ?? location.index + 1,
		node: cloneNodeTreeWithFreshIds( location.node ),
	} );
	return { ok: true, summary: `Duplicated node ${ nodeId }.` };
}

function upsertClass( engine: BuilderEngine, definitionInput: unknown ): BuilderAiToolExecutionResult {
	const definition = ClassDefinitionSchema.parse( definitionInput ) as ClassDefinition;
	engine.dispatch( { type: 'design/classes/upsert', definition } );
	return { ok: true, summary: `Upserted class ${ definition.label }.` };
}

function upsertVariable( engine: BuilderEngine, definitionInput: unknown ): BuilderAiToolExecutionResult {
	const definition = VariableDefinitionSchema.parse( definitionInput ) as VariableDefinition;
	engine.dispatch( { type: 'design/variables/upsert', definition } );
	return { ok: true, summary: `Upserted variable ${ definition.label }.` };
}

function updateDocument( engine: BuilderEngine, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const patch = readOptionalRecord( args.patch );
	if ( !patch ) {
		throw new Error( 'update_document requires a patch object.' );
	}
	engine.dispatch( {
		type: 'document/update',
		documentId: readOptionalString( args.documentId ),
		patch: {
			title: readOptionalString( patch.title ),
			slug: readOptionalString( patch.slug ),
			status: readOptionalString( patch.status ) as 'draft' | 'published' | undefined,
			meta: readOptionalRecord( patch.meta ),
		},
	} );
	return { ok: true, summary: 'Updated document metadata.' };
}

function insertLibraryItem( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const state = options.engine.getState();
	const libraryDocumentId = readString( args.libraryDocumentId, 'libraryDocumentId' );
	const libraryDocument = state.project.documents.find( ( document ) => document.id === libraryDocumentId && document.kind === 'library-item' );
	if ( !libraryDocument ) {
		throw new Error( `Library item not found: ${ libraryDocumentId }.` );
	}
	const parentId = readOptionalString( args.parentId ) ?? options.defaultParentId ?? getPreferredInsertionParentId( state, options.registry );
	const slot = readOptionalString( args.slot ) ?? options.defaultSlot;
	for ( const rootNode of libraryDocument.root ) {
		options.engine.dispatch( {
			type: 'document/elements/create',
			parentId,
			slot,
			node: cloneNodeTreeWithFreshIds( rootNode ),
		} );
	}
	return { ok: true, summary: `Inserted library item ${ libraryDocument.title }.` };
}

function createComponentInstance( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): BuilderAiToolExecutionResult {
	const state = options.engine.getState();
	const componentId = readString( args.componentId, 'componentId' );
	const component = state.project.documents.find( ( document ) => document.id === componentId && document.kind === 'component' );
	if ( !component ) {
		throw new Error( `Component not found: ${ componentId }.` );
	}
	options.engine.dispatch( {
		type: 'document/elements/create',
		parentId: readOptionalString( args.parentId ) ?? options.defaultParentId ?? getPreferredInsertionParentId( state, options.registry ),
		slot: readOptionalString( args.slot ) ?? options.defaultSlot,
		node: createNode( {
			type: 'component-instance',
			props: {
				componentId,
				overrides: {},
			},
		} ),
	} );
	return { ok: true, summary: `Created component instance ${ component.title }.` };
}

function dispatchCommand( engine: BuilderEngine, command: BuilderMutationCommand ): BuilderAiToolExecutionResult {
	engine.dispatch( command );
	return { ok: true, summary: command.type };
}

function runMutation( engine: BuilderEngine, label: string, mutate: () => BuilderAiToolExecutionResult ): BuilderAiToolExecutionResult {
	engine.beginTransaction( label );
	try {
		const result = mutate();
		engine.commitTransaction();
		return result;
	} catch ( error ) {
		engine.commitTransaction();
		throw error;
	}
}

async function runMutationAsync( engine: BuilderEngine, label: string, mutate: () => Promise<BuilderAiToolExecutionResult> ): Promise<BuilderAiToolExecutionResult> {
	engine.beginTransaction( label );
	try {
		const result = await mutate();
		engine.commitTransaction();
		return result;
	} catch ( error ) {
		engine.commitTransaction();
		throw error;
	}
}

function parseToolArguments( value: string ): Record<string, unknown> {
	try {
		const parsed = JSON.parse( value || '{}' ) as unknown;
		if ( parsed && typeof parsed === 'object' && !Array.isArray( parsed ) ) {
			return parsed as Record<string, unknown>;
		}
		throw new Error( 'Tool arguments must be an object.' );
	} catch ( error ) {
		throw new Error( `Invalid tool arguments: ${ error instanceof Error ? error.message : 'unknown parse error' }` );
	}
}

async function importHtmlNodes( args: Record<string, unknown> ): Promise<BuilderNode[]> {
	const html = readString( args.html, 'html' );
	const css = readOptionalString( args.css );
	const title = readOptionalString( args.title ) ?? 'AI Generated Section';
	const quality = analyzeGeneratedHtmlQuality( html, css );
	if ( !quality.ok ) {
		throw new Error( `Low detail generation: ${ quality.summary } Regenerate with a complete semantic section containing heading, body copy, CTA/media or layout structure, and usable CSS.` );
	}
	const payload = css ? `<!doctype html><html><head><title>${ escapeHtml( title ) }</title><style>${ css }</style></head><body>${ html }</body></html>` : html;
	const { importHtmlPackage } = await import( './html-import' );
	const result = importHtmlPackage( { html: payload, sourceName: title } );
	const document = result.project.documents.find( ( entry ) => entry.kind === 'library-item' );
	if ( !document?.root.length ) {
		throw new Error( 'Generated HTML did not produce importable Builder nodes.' );
	}
	return document.root.map( cloneNodeTreeWithFreshIds );
}

export function analyzeGeneratedHtmlQuality( html: string, css?: string ): { ok: boolean; summary: string; score: number } {
	const stripped = html.replaceAll( /<script[\s\S]*?<\/script>/gi, '' ).trim();
	const text = stripped.replaceAll( /<[^>]+>/g, ' ' ).replaceAll( /\s+/g, ' ' ).trim();
	const tagCount = ( stripped.match( /<[a-z][\w-]*(\s|>|\/)/gi ) ?? [] ).length;
	const hasHeading = /<h[1-6][\s>]/i.test( stripped );
	const hasBodyCopy = /<(p|ul|ol|article|section|div)[\s>]/i.test( stripped ) && text.length >= 32;
	const hasActionOrMedia = /<(a|button|img|video|form)[\s>]/i.test( stripped );
	const hasCss = Boolean( css?.trim() ) || /style\s*=/i.test( stripped ) || /<style[\s>]/i.test( stripped );
	const score = [
		stripped.length >= 120,
		tagCount >= 4,
		hasHeading,
		hasBodyCopy,
		hasActionOrMedia,
		hasCss,
	].filter( Boolean ).length;
	const missing = [
		hasHeading ? '' : 'a heading',
		hasBodyCopy ? '' : 'substantial body copy',
		hasActionOrMedia ? '' : 'a call-to-action or media element',
		hasCss ? '' : 'visual CSS or inline styling',
		tagCount >= 4 ? '' : 'enough structure',
	].filter( Boolean );
	return {
		ok: score >= 4,
		score,
		summary: missing.length ? `Missing ${ missing.join( ', ' ) }.` : 'Generated HTML has enough semantic structure.',
	};
}

function normalizeAiNode( input: unknown, registry: BuilderRegistry ): BuilderNode {
	if ( !input || typeof input !== 'object' || Array.isArray( input ) ) {
		throw new Error( 'AI node input must be an object.' );
	}
	const record = structuredClone( input ) as Partial<BuilderNode>;
	if ( !record.type ) {
		throw new Error( 'AI node input is missing type.' );
	}
	const definition = registry.elements.get( record.type );
	if ( !definition ) {
		throw new Error( `Invalid AI node type "${ record.type }". Use add_section_from_html for unsupported markup or one of the registered element types.` );
	}
	const props = normalizePropsForElement( record.type, {
		...( definition.defaults.props ?? {} ),
		...( record.props ?? {} ),
	} );
	const parsedProps = definition.propSchema.parse( props ) as Record<string, JsonValue>;
	const styles = definition.styleSchema.parse( record.styles ?? definition.createDefaultNode().styles ) as StyleSet;
	return createNode( {
		...record,
		type: record.type,
		id: crypto.randomUUID(),
		props: parsedProps,
		styles,
		children: Array.isArray( record.children ) ? record.children.map( ( child ) => normalizeAiNode( child, registry ) ) : [],
		slots: Object.fromEntries(
			Object.entries( record.slots ?? {} ).map( ( [ slotName, nodes ] ) => [
				slotName,
				Array.isArray( nodes ) ? nodes.map( ( child ) => normalizeAiNode( child, registry ) ) : [],
			] ),
		),
	} );
}

function validateAiNodePatch( registry: BuilderRegistry, node: BuilderNode, args: Record<string, unknown> ) {
	const propsPatch = readOptionalRecord( args.propsPatch );
	const patch = readOptionalRecord( args.patch );
	if ( propsPatch ) {
		validatePatchProps( registry, node, propsPatch );
	}
	if ( patch?.props && typeof patch.props === 'object' && !Array.isArray( patch.props ) ) {
		validatePatchProps( registry, node, patch.props as Record<string, JsonValue> );
	}
	if ( patch?.type && patch.type !== node.type ) {
		const nextType = readOptionalString( patch.type );
		if ( !nextType || !registry.elements.has( nextType ) ) {
			throw new Error( `Invalid AI node type "${ String( patch.type ) }".` );
		}
	}
}

function validatePatchProps( registry: BuilderRegistry, node: BuilderNode, propsPatch: Record<string, JsonValue> ) {
	const definition = registry.elements.get( node.type );
	if ( !definition ) {
		throw new Error( `Invalid existing node type "${ node.type }".` );
	}
	const nextProps = normalizePropsForElement( node.type, {
		...( node.props ?? {} ),
		...propsPatch,
	} );
	definition.propSchema.parse( nextProps );
}

function normalizePropsForElement( type: string, props: Record<string, JsonValue> ): Record<string, JsonValue> {
	if ( type !== 'heading' ) {
		return props;
	}
	const rawLevel = props.level;
	if ( typeof rawLevel === 'number' && rawLevel >= 1 && rawLevel <= 6 ) {
		return { ...props, level: `h${ rawLevel }` };
	}
	if ( typeof rawLevel === 'string' && /^[1-6]$/.test( rawLevel ) ) {
		return { ...props, level: `h${ rawLevel }` };
	}
	if ( rawLevel !== undefined && ![ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ].includes( String( rawLevel ) ) ) {
		throw new Error( `Invalid heading level "${ String( rawLevel ) }"; use "h1" through "h6".` );
	}
	return props;
}

function resolveSemanticTargetNode( options: BuilderAiToolExecutorOptions, args: Record<string, unknown>, toolName: string ): { document: ReturnType<typeof getActiveDocument>; node: BuilderNode } {
	const state = options.engine.getState();
	const document = resolveDocument( state, readOptionalString( args.documentId ) );
	const targetNodeId = readOptionalString( args.targetNodeId ) ?? readOptionalString( args.nodeId ) ?? state.ui.selectedNodeIds[ 0 ];
	if ( !targetNodeId ) {
		throw new Error( `${ toolName } needs a selected target node. Select a section/element first or provide targetNodeId.` );
	}
	const node = getNodeById( document.root, targetNodeId );
	if ( !node ) {
		throw new Error( `Target node not found: ${ targetNodeId }.` );
	}
	return { document, node };
}

async function replaceTargetWithHtml(
	options: BuilderAiToolExecutorOptions,
	nodeId: string,
	documentId: string,
	html: string,
	css: string,
	title: string,
): Promise<BuilderAiToolExecutionResult> {
	const state = options.engine.getState();
	const document = resolveDocument( state, documentId );
	const location = getNodeLocation( document.root, nodeId );
	if ( !location ) {
		throw new Error( `Target node not found: ${ nodeId }.` );
	}
	const nodes = await importHtmlNodes( { html, css, title } );
	options.engine.dispatch( { type: 'document/elements/delete', documentId, nodeId } );
	nodes.forEach( ( node, offset ) => {
		options.engine.dispatch( {
			type: 'document/elements/create',
			documentId,
			parentId: location.parentId,
			slot: location.slot,
			index: location.index + offset,
			node,
		} );
	} );
	return {
		ok: true,
		summary: `Replaced ${ nodeId } with ${ nodes.length } imported HTML root node${ nodes.length === 1 ? '' : 's' }.`,
		data: {
			normalizedArgs: { targetNodeId: nodeId, title },
			html,
			css,
			parsedNodes: nodes.map( summarizeNodeForDebug ),
			mutations: nodes.length + 1,
		} as JsonValue,
	};
}

function collectDescendants( node: BuilderNode ): BuilderNode[] {
	return [
		...node.children,
		...node.children.flatMap( collectDescendants ),
		...Object.values( node.slots as Record<string, BuilderNode[]> ).flatMap( ( children ) => [
			...children,
			...children.flatMap( collectDescendants ),
		] ),
	];
}

function withBaseStyles( node: BuilderNode, basePatch: Record<string, JsonValue> ): StyleSet {
	return {
		...structuredClone( node.styles ),
		base: {
			...structuredClone( node.styles.base ),
			...basePatch,
		},
	};
}

function normalizeFlexDirection( value: string ): string {
	const normalized = value.toLowerCase();
	if ( [ 'row', 'row-reverse', 'column', 'column-reverse' ].includes( normalized ) ) {
		return normalized;
	}
	return 'column';
}

function readPlans( value: unknown, currency: string ): Array<{ name: string; price: string; description: string; features: string[]; cta: string }> {
	if ( !Array.isArray( value ) || !value.length ) {
		return [
			{ name: 'Starter', price: '19', description: 'Launch with the essentials.', features: [ 'Core page sections', 'Email support', 'Basic analytics' ], cta: 'Start now' },
			{ name: 'Growth', price: '49', description: 'Scale your most important workflows.', features: [ 'Advanced sections', 'Priority support', 'Conversion insights' ], cta: 'Choose Growth' },
			{ name: 'Scale', price: '99', description: 'Power for larger teams.', features: [ 'Custom workflows', 'Dedicated support', 'Team permissions' ], cta: 'Contact sales' },
		];
	}
	return value.slice( 0, 4 ).map( ( entry, index ) => {
		const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
		const features = Array.isArray( record.features )
			? record.features.filter( ( feature ): feature is string => typeof feature === 'string' && feature.trim().length > 0 ).slice( 0, 6 )
			: [ 'Key feature', 'Helpful support', 'Easy setup' ];
		return {
			name: readOptionalString( record.name ) ?? `Plan ${ index + 1 }`,
			price: readOptionalString( record.price )?.replace( currency, '' ) ?? String( ( index + 1 ) * 29 ),
			description: readOptionalString( record.description ) ?? 'A focused plan for your next stage.',
			features,
			cta: readOptionalString( record.cta ) ?? 'Get started',
		};
	} );
}

function resolveToolNode( options: BuilderAiToolExecutorOptions, args: Record<string, unknown> ): { document: ReturnType<typeof getActiveDocument>; node: BuilderNode } {
	const state = options.engine.getState();
	const document = resolveDocument( state, readOptionalString( args.documentId ) );
	const nodeId = readString( args.nodeId, 'nodeId' );
	const node = getNodeById( document.root, nodeId );
	if ( !node ) {
		throw new Error( `Node not found: ${ nodeId }.` );
	}
	return { document, node };
}

function resolveDocument( state: BuilderEngineState, documentId?: string ) {
	const resolvedId = documentId ?? state.activeDocumentId;
	const document = state.project.documents.find( ( entry ) => entry.id === resolvedId );
	if ( !document ) {
		throw new Error( `Document not found: ${ resolvedId }.` );
	}
	return document;
}

function defaultTextFieldForNode( node: BuilderNode ): string | undefined {
	switch ( node.type ) {
		case 'heading':
		case 'paragraph':
		case 'text-editor':
		case 'blockquote':
			return 'text';
		case 'button':
			return 'text';
		case 'icon-box':
			return 'title';
		default:
			return undefined;
	}
}

function compactJsonObject( input: Record<string, JsonValue | undefined> ): Record<string, JsonValue> {
	return Object.fromEntries( Object.entries( input ).filter( ( [ , value ] ) => value !== undefined && value !== '' ) ) as Record<string, JsonValue>;
}

function escapeHtml( value: string ): string {
	return value.replaceAll( '&', '&amp;' ).replaceAll( '<', '&lt;' ).replaceAll( '>', '&gt;' ).replaceAll( '"', '&quot;' );
}

function escapeAttribute( value: string ): string {
	return escapeHtml( value ).replaceAll( "'", '&#39;' );
}

function cloneNodeTreeWithFreshIds( node: BuilderNode ): BuilderNode {
	return createNode( {
		...structuredClone( node ),
		id: crypto.randomUUID(),
		children: node.children.map( cloneNodeTreeWithFreshIds ),
		slots: Object.fromEntries(
			Object.entries( node.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, slotNodes ] ) => [
				slotName,
				slotNodes.map( cloneNodeTreeWithFreshIds ),
			] ),
		),
	} );
}

function summarizeNodeForDebug( node: BuilderNode ): JsonValue {
	return {
		id: node.id,
		type: node.type,
		name: node.name,
		props: node.props,
		styles: node.styles,
		attributes: node.attributes,
		styleRefs: node.styleRefs,
		children: node.children.map( summarizeNodeForDebug ),
		slots: Object.fromEntries(
			Object.entries( node.slots as Record<string, BuilderNode[]> ).map( ( [ slotName, nodes ] ) => [
				slotName,
				nodes.map( summarizeNodeForDebug ),
			] ),
		),
	} as JsonValue;
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

function flattenNodes( nodes: BuilderNode[] ): BuilderNode[] {
	return nodes.flatMap( ( node ) => [
		node,
		...flattenNodes( node.children ),
		...Object.values( node.slots as Record<string, BuilderNode[]> ).flatMap( ( slotNodes ) => flattenNodes( slotNodes ) ),
	] );
}

function countNodes( nodes: BuilderNode[] ): number {
	return flattenNodes( nodes ).length;
}

function readString( value: unknown, key: string, fallback?: string ): string {
	if ( typeof value === 'string' && value.trim() ) {
		return value;
	}
	if ( fallback !== undefined ) {
		return fallback;
	}
	throw new Error( `${ key } is required.` );
}

function readOptionalString( value: unknown ): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function readOptionalNumber( value: unknown ): number | undefined {
	return typeof value === 'number' && Number.isFinite( value ) ? value : undefined;
}

function readOptionalRecord( value: unknown ): Record<string, JsonValue> | undefined {
	return value && typeof value === 'object' && !Array.isArray( value ) ? value as Record<string, JsonValue> : undefined;
}
