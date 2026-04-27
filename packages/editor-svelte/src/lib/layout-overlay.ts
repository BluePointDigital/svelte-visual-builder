import type { BuilderRect, NodeBounds } from '@builder/core';
import type { BuilderNode, JsonValue } from '@builder/schema';

export type BuilderLayoutOverlayDisplay = 'flex' | 'grid';
export type BuilderLayoutOverlayAxis = 'x' | 'y';

export interface BuilderLayoutOverlayModel {
	display: BuilderLayoutOverlayDisplay;
	axis: BuilderLayoutOverlayAxis;
	label: string;
	gap: {
		value: string;
		number: number;
		unit: string;
	};
	alignment: {
		justify: string;
		align: string;
		wrap?: string;
	};
	childCount: number;
	grid: {
		columns: number;
		rows: number;
	};
}

export function createLayoutOverlayModel(
	node: BuilderNode | undefined,
	bounds: NodeBounds | undefined,
	childBounds: NodeBounds[],
): BuilderLayoutOverlayModel | undefined {
	if ( !node || !bounds || !isLayoutContainerNode( node, bounds ) ) {
		return undefined;
	}

	const display = normalizeDisplay( readEffectiveString( node, 'display' ) ?? node.layout.display );
	const direction = normalizeDirection( readEffectiveString( node, 'flex-direction' ) ?? node.layout.direction );
	const wrap = readEffectiveString( node, 'flex-wrap' ) ?? stringValue( node.layout.wrap ) ?? 'nowrap';
	const gap = parseGapValue( readEffectiveString( node, 'gap' ) ?? stringValue( node.layout.gap ) ?? '0px' );
	const axis: BuilderLayoutOverlayAxis = display === 'grid' || direction.startsWith( 'row' ) ? 'x' : 'y';
	const grid = resolveGridTracks( node, bounds.rect, childBounds );

	return {
		display,
		axis,
		label: display === 'grid'
			? `Grid ${ grid.columns } x ${ grid.rows }`
			: `${ direction.includes( 'column' ) ? 'Column' : 'Row' }${ wrap !== 'nowrap' ? ' wrap' : '' }`,
		gap,
		alignment: {
			justify: normalizeAlignment( readEffectiveString( node, 'justify-content' ) ?? node.layout.justifyContent ),
			align: normalizeAlignment( readEffectiveString( node, 'align-items' ) ?? node.layout.alignItems ),
			wrap: display === 'flex' ? wrap : undefined,
		},
		childCount: childBounds.length,
		grid,
	};
}

export function computeNextGapValue(
	currentValue: string,
	delta: number,
	options: { stepPx?: number; min?: number; max?: number } = {},
): string {
	const gap = parseGapValue( currentValue );
	const stepPx = options.stepPx ?? 1;
	const min = options.min ?? 0;
	const max = options.max ?? 240;
	const nextNumber = Math.max( min, Math.min( max, gap.number + delta * stepPx ) );
	const rounded = Math.round( nextNumber * 10 ) / 10;
	return `${ rounded }${ gap.unit }`;
}

export function getLayoutOverlayChildRects( bounds: NodeBounds[] ): BuilderRect[] {
	return bounds.map( ( entry ) => entry.rect );
}

function isLayoutContainerNode( node: BuilderNode, bounds: NodeBounds ): boolean {
	return node.type === 'container' || bounds.acceptsChildren || bounds.slotIds.length > 0;
}

function normalizeDisplay( value: JsonValue | undefined ): BuilderLayoutOverlayDisplay {
	return String( value ?? '' ).trim().toLowerCase() === 'grid' ? 'grid' : 'flex';
}

function normalizeDirection( value: JsonValue | undefined ): string {
	const direction = String( value ?? '' ).trim().toLowerCase();
	return direction || 'row';
}

function normalizeAlignment( value: JsonValue | undefined ): string {
	return String( value ?? '' ).trim().toLowerCase() || 'start';
}

function parseGapValue( value: string ): BuilderLayoutOverlayModel['gap'] {
	const match = value.trim().match( /^(-?\d*\.?\d+)([a-z%]*)$/i );
	if ( !match ) {
		return {
			value,
			number: 0,
			unit: 'px',
		};
	}

	const unit = match[ 2 ] || 'px';
	const number = Number( match[ 1 ] );
	return {
		value: `${ Number.isFinite( number ) ? number : 0 }${ unit }`,
		number: Number.isFinite( number ) ? number : 0,
		unit,
	};
}

function resolveGridTracks( node: BuilderNode, rect: BuilderRect, childBounds: NodeBounds[] ): BuilderLayoutOverlayModel['grid'] {
	const columnsValue = readEffectiveString( node, 'grid-template-columns' ) ?? stringValue( node.layout.columns );
	const rowsValue = readEffectiveString( node, 'grid-template-rows' ) ?? stringValue( node.layout.rows );
	const columns = countTrackDefinitions( columnsValue ) ?? estimateTrackCount( childBounds, 'x' ) ?? 1;
	const rows = countTrackDefinitions( rowsValue ) ?? estimateTrackCount( childBounds, 'y' ) ?? Math.max( 1, Math.ceil( childBounds.length / columns ) );

	return {
		columns: Math.max( 1, columns ),
		rows: Math.max( 1, rows || ( rect.height > rect.width ? childBounds.length : 1 ) ),
	};
}

function countTrackDefinitions( value: string | undefined ): number | undefined {
	if ( !value ) {
		return undefined;
	}

	const repeatMatch = value.match( /repeat\(\s*(\d+)/i );
	if ( repeatMatch ) {
		return Number( repeatMatch[ 1 ] );
	}

	const normalized = value.replace( /\([^)]*\)/g, 'token' ).trim();
	const count = normalized.split( /\s+/ ).filter( Boolean ).length;
	return count || undefined;
}

function estimateTrackCount( childBounds: NodeBounds[], axis: BuilderLayoutOverlayAxis ): number | undefined {
	if ( !childBounds.length ) {
		return undefined;
	}

	const centers = childBounds.map( ( entry ) => axis === 'x'
		? Math.round( ( entry.rect.left + entry.rect.right ) / 2 )
		: Math.round( ( entry.rect.top + entry.rect.bottom ) / 2 )
	);
	return new Set( centers ).size;
}

function stringValue( value: JsonValue | undefined ): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readEffectiveString( node: BuilderNode, key: string ): string | undefined {
	return stringValue( node.styles.base[ key ] );
}
