import type { JsonValue } from '@builder/schema';
import { arrayMove } from '@dnd-kit/sortable';

import type { StructuredCollectionKind } from '../structured-content';

let structuredCollectionInstanceSeed = 0;
let structuredCollectionRowSeed = 0;

export function createStructuredCollectionInstanceId( kind: StructuredCollectionKind, depth: number ): string {
	return `structured-collection-${kind}-${depth}-${++structuredCollectionInstanceSeed}`;
}

export function createStructuredCollectionRowKey( instanceId: string ): string {
	return `${instanceId}:row-${++structuredCollectionRowSeed}`;
}

export function reconcileStructuredCollectionRowKeys(
	instanceId: string,
	items: Record<string, JsonValue>[],
	previousKeys: string[],
): string[] {
	return items.map( ( item, index ) => {
		const itemId = typeof item.id === 'string' ? item.id.trim() : '';
		if ( itemId ) {
			return `${instanceId}:item-${itemId}`;
		}

		return previousKeys[ index ] ?? createStructuredCollectionRowKey( instanceId );
	} );
}

export function moveStructuredCollectionRowKeys( keys: string[], fromIndex: number, toIndex: number ): string[] {
	return arrayMove( keys, fromIndex, toIndex );
}

export function insertStructuredCollectionRowKeys(
	keys: string[],
	index: number,
	instanceId: string,
): string[] {
	const next = [ ...keys ];
	next.splice( index, 0, createStructuredCollectionRowKey( instanceId ) );
	return next;
}

export function removeStructuredCollectionRowKeys( keys: string[], index: number ): string[] {
	const next = [ ...keys ];
	next.splice( index, 1 );
	return next;
}

export function duplicateStructuredCollectionRowKeys(
	keys: string[],
	index: number,
	instanceId: string,
): string[] {
	const next = [ ...keys ];
	next.splice( index + 1, 0, createStructuredCollectionRowKey( instanceId ) );
	return next;
}
