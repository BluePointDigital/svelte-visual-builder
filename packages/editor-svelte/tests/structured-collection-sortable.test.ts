import { describe, expect, it } from 'vitest';

import { createStructuredCollectionInstanceId, duplicateStructuredCollectionRowKeys, insertStructuredCollectionRowKeys, moveStructuredCollectionRowKeys, reconcileStructuredCollectionRowKeys, removeStructuredCollectionRowKeys } from '../src/lib/components/structured-collection-sortable';

describe( 'structured collection sortable helpers', () => {
	it( 'keeps stable keys for items with ids and preserves generated keys for anonymous items', () => {
		const instanceId = createStructuredCollectionInstanceId( 'menu', 0 );
		const items = [
			{ id: 'alpha', label: 'Alpha' },
			{ label: 'Beta' },
			{ label: 'Gamma' },
		] as const;

		const keys = reconcileStructuredCollectionRowKeys( instanceId, [ ...items ], [] );

		expect( keys[ 0 ] ).toBe( `${instanceId}:item-alpha` );
		expect( keys[ 1 ] ).toMatch( new RegExp( `^${ instanceId }:row-` ) );
		expect( keys[ 2 ] ).toMatch( new RegExp( `^${ instanceId }:row-` ) );
		expect( new Set( keys ).size ).toBe( 3 );
	} );

	it( 'preserves keyed row identity across reorder operations so drag-sort does not churn keys', () => {
		const instanceId = createStructuredCollectionInstanceId( 'menu', 1 );
		const initialItems = [
			{ id: 'alpha', label: 'Alpha' },
			{ label: 'Beta' },
			{ id: 'gamma', label: 'Gamma' },
		] as const;

		const initialKeys = reconcileStructuredCollectionRowKeys( instanceId, [ ...initialItems ], [] );
		const reorderedItems = [ initialItems[ 1 ], initialItems[ 2 ], initialItems[ 0 ] ] as const;
		const movedKeys = moveStructuredCollectionRowKeys( initialKeys, 0, 2 );
		const reconciledKeys = reconcileStructuredCollectionRowKeys( instanceId, [ ...reorderedItems ], movedKeys );

		expect( movedKeys ).toEqual( [ initialKeys[ 1 ], initialKeys[ 2 ], initialKeys[ 0 ] ] );
		expect( reconciledKeys[ 0 ] ).toBe( initialKeys[ 1 ] );
		expect( reconciledKeys[ 1 ] ).toBe( initialKeys[ 2 ] );
		expect( reconciledKeys[ 2 ] ).toBe( initialKeys[ 0 ] );
		expect( new Set( reconciledKeys ).size ).toBe( 3 );
	} );

	it( 'updates keys in lockstep with insert, move, duplicate, and remove operations', () => {
		const instanceId = createStructuredCollectionInstanceId( 'form-options', 0 );
		const originalKeys = reconcileStructuredCollectionRowKeys( instanceId, [ { label: 'One' }, { label: 'Two' } ], [] );

		const insertedKeys = insertStructuredCollectionRowKeys( originalKeys, 1, instanceId );
		expect( insertedKeys ).toHaveLength( 3 );
		expect( insertedKeys[ 1 ] ).toMatch( new RegExp( `^${ instanceId }:row-` ) );

		const movedKeys = moveStructuredCollectionRowKeys( insertedKeys, 0, 2 );
		expect( movedKeys ).toHaveLength( 3 );
		expect( movedKeys[ 2 ] ).toBe( insertedKeys[ 0 ] );

		const duplicatedKeys = duplicateStructuredCollectionRowKeys( movedKeys, 1, instanceId );
		expect( duplicatedKeys ).toHaveLength( 4 );
		expect( duplicatedKeys[ 2 ] ).toMatch( new RegExp( `^${ instanceId }:row-` ) );

		const removedKeys = removeStructuredCollectionRowKeys( duplicatedKeys, 1 );
		expect( removedKeys ).toHaveLength( 3 );
		expect( removedKeys ).not.toContain( duplicatedKeys[ 1 ] );
	} );
} );
