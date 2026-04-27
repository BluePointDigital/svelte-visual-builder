import type { BuilderNode } from '@builder/schema';

export type NavigatorIndicatorTone = 'default' | 'accent' | 'warning' | 'muted';

export interface NavigatorIndicator {
	label: string;
	tone?: NavigatorIndicatorTone;
}

export interface NavigatorNodeRowActions {
	onSelect: ( nodeId: string ) => void;
	onOpenContextMenu: ( node: BuilderNode, event: MouseEvent, targetSlot?: string ) => void;
	onMove: ( node: BuilderNode, direction: -1 | 1 ) => void;
	onMoveToBoundary: ( node: BuilderNode, siblings: BuilderNode[], target: 'start' | 'end' ) => void;
	onIndent: ( node: BuilderNode, siblings: BuilderNode[], index: number ) => void;
	onOutdent: ( node: BuilderNode ) => void;
	onDuplicate: ( node: BuilderNode, parentId?: string, targetSlot?: string ) => void;
	onDelete: ( node: BuilderNode ) => void;
	onInsertNode: ( targetParentId?: string, targetSlot?: string ) => void;
	onOpenMaster: ( node: BuilderNode ) => void;
}

export interface NavigatorNodeRow {
	kind: 'node';
	key: string;
	rowIndex: number;
	depth: number;
	nodeId: string;
	parentId?: string;
	slot?: string;
	index: number;
	node: BuilderNode;
	siblings: BuilderNode[];
}

export interface NavigatorSlotRow {
	kind: 'slot';
	key: string;
	rowIndex: number;
	depth: number;
	nodeId: string;
	parentId?: string;
	slot: string;
	node: BuilderNode;
	slotNodes: BuilderNode[];
}

export type NavigatorVirtualRow = NavigatorNodeRow | NavigatorSlotRow;

const NODE_BADGES: Record<string, string> = {
	container: 'CT',
	heading: 'H',
	paragraph: 'P',
	'text-editor': 'RT',
	image: 'IM',
	button: 'BT',
	divider: 'DV',
	video: 'VD',
	svg: 'SV',
	html: 'HT',
	list: 'LS',
	menu: 'MN',
	'social-icons': 'SI',
	tabs: 'TB',
	toggle: 'TG',
	accordion: 'AC',
	gallery: 'GY',
	carousel: 'CR',
	form: 'FM',
	loop: 'LP',
	'popup-root': 'PP',
	'component-instance': 'CP',
	'compat-widget': 'LG',
};

type LooseRecord = Record<string, unknown>;

export function createNavigatorNodeRow(
	node: BuilderNode,
	index: number,
	depth: number,
	siblings: BuilderNode[],
	parentId?: string,
	slot?: string,
	rowIndex = index,
): NavigatorNodeRow {
	return {
		kind: 'node',
		key: `node:${ node.id }`,
		rowIndex,
		depth,
		nodeId: node.id,
		parentId,
		slot,
		index,
		node,
		siblings,
	};
}

export function buildNavigatorVirtualRows(
	nodes: BuilderNode[],
	depth = 1,
	parentId?: string,
	slot?: string,
	rows: NavigatorVirtualRow[] = [],
): NavigatorVirtualRow[] {
	nodes.forEach( ( node, index ) => {
		rows.push( createNavigatorNodeRow( node, index, depth, nodes, parentId, slot, rows.length ) );

		if ( node.children.length ) {
			buildNavigatorVirtualRows( node.children, depth + 1, node.id, undefined, rows );
		}

		for ( const [ slotName, slotNodes ] of Object.entries( node.slots as Record<string, BuilderNode[]> ) ) {
			if ( !slotNodes.length ) {
				continue;
			}

			rows.push( {
				kind: 'slot',
				key: `slot:${ node.id }:${ slotName }`,
				rowIndex: rows.length,
				depth,
				nodeId: node.id,
				parentId: node.id,
				slot: slotName,
				node,
				slotNodes,
			} );

			buildNavigatorVirtualRows( slotNodes, depth + 1, node.id, slotName, rows );
		}
	} );

	return rows;
}

export function getNavigatorNodeBadge( type: string ): string {
	if ( NODE_BADGES[ type ] ) {
		return NODE_BADGES[ type ];
	}

	const compact = type
		.split( /[-_]/g )
		.filter( Boolean )
		.slice( 0, 2 )
		.map( ( part ) => part.slice( 0, 1 ).toUpperCase() )
		.join( '' );

	return compact || type.slice( 0, 2 ).toUpperCase();
}

export function getNavigatorNodeLabel( node: BuilderNode ): string {
	const props = asRecord( node.props );

	return node.name
		?? asString( props?.title )
		?? asString( props?.label )
		?? asString( props?.text )
		?? asString( props?.content )
		?? asString( props?.name )
		?? prettifyLabel( node.type );
}

export function getNavigatorNodeSubtitle( node: BuilderNode, componentDocumentTitle?: string ): string {
	const fragments = [ prettifyLabel( node.type ) ];
	const slotCount = Object.keys( node.slots ).length;

	if ( componentDocumentTitle ) {
		fragments.push( componentDocumentTitle );
	}

	if ( slotCount > 0 ) {
		fragments.push( `${slotCount} slot${slotCount === 1 ? '' : 's'}` );
	}

	if ( node.children.length > 0 ) {
		fragments.push( `${node.children.length} child${node.children.length === 1 ? '' : 'ren'}` );
	}

	if ( node.legacy?.widgetType ) {
		fragments.push( node.legacy.widgetType );
	}

	return fragments.join( ' / ' );
}

export function getNavigatorNodeIndicators( node: BuilderNode ): NavigatorIndicator[] {
	const indicators: NavigatorIndicator[] = [];
	const hiddenOnBreakpoint = Object.values( node.visibility.breakpointHidden ?? {} ).some( Boolean );

	if ( node.visibility.hidden || hiddenOnBreakpoint ) {
		indicators.push( { label: 'Hidden', tone: 'warning' } );
	} else if ( node.visibility.conditionGroups.length > 0 ) {
		indicators.push( { label: 'Cond', tone: 'muted' } );
	}

	if ( node.type === 'component-instance' ) {
		indicators.push( { label: 'Instance', tone: 'accent' } );
	}

	if ( node.meta.detachedComponent ) {
		indicators.push( { label: 'Detached', tone: 'warning' } );
	}

	if ( node.legacy ) {
		indicators.push( { label: 'Legacy', tone: 'muted' } );
	}

	return indicators;
}

export function formatNavigatorSlotLabel( slotName: string ): string {
	return prettifyLabel( slotName );
}

export function estimateNavigatorVirtualRowSize( row: NavigatorVirtualRow ): number {
	return row.kind === 'slot' ? 42 : 90;
}

function prettifyLabel( value: string ): string {
	return value
		.split( /[-_]/g )
		.filter( Boolean )
		.map( ( part ) => part.charAt( 0 ).toUpperCase() + part.slice( 1 ) )
		.join( ' ' );
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
