<script lang="ts">
	import { DragDropProvider } from '@dnd-kit/svelte';
	import type { JsonValue } from '@builder/schema';
	import {
		createStructuredCollectionItem,
		getStructuredCollectionSpec,
		normalizeStructuredCollectionValue,
		type StructuredCollectionFieldSpec,
		type StructuredCollectionKind,
	} from '../structured-content';
	import StructuredCollectionFieldEditorRow from './StructuredCollectionFieldEditorRow.svelte';
	import {
		createStructuredCollectionInstanceId,
		duplicateStructuredCollectionRowKeys,
		insertStructuredCollectionRowKeys,
		moveStructuredCollectionRowKeys,
		reconcileStructuredCollectionRowKeys,
		removeStructuredCollectionRowKeys,
	} from './structured-collection-sortable';

	export let kind: StructuredCollectionKind;
	export let title = '';
	export let description = '';
	export let value: JsonValue = [];
	export let onChange: ( nextValue: JsonValue ) => void = () => {};
	export let depth = 0;

	let rowKeys: string[] = [];
	let collectionIdentity = '';
	let collectionInstanceId = '';

	$: spec = getStructuredCollectionSpec( kind );
	$: items = normalizeStructuredCollectionValue( kind, value );
	$: collectionInstanceId = getCollectionInstanceId( kind, depth );
	$: rowKeys = reconcileStructuredCollectionRowKeys( collectionInstanceId, items, rowKeys );

	function commit( nextItems: Record<string, JsonValue>[] ) {
		onChange( nextItems as JsonValue );
	}

	function updateItem( index: number, patch: Record<string, JsonValue> ) {
		commit( items.map( ( item, itemIndex ) => itemIndex === index ? { ...item, ...patch } : item ) );
	}

	function updateItemField( index: number, field: StructuredCollectionFieldSpec, nextValue: string | boolean | number ) {
		updateItem( index, {
			[ field.key ]: nextValue as JsonValue,
		} );
	}

	function addItem() {
		const nextItems = [
			...items,
			createStructuredCollectionItem( kind, items.length ),
		];
		rowKeys = insertStructuredCollectionRowKeys( rowKeys, nextItems.length - 1, collectionInstanceId );
		commit( nextItems );
	}

	function duplicateItem( index: number ) {
		const item = items[ index ];
		if ( !item ) {
			return;
		}

		const nextItems = [
			...items.slice( 0, index + 1 ),
			{
				...structuredClone( item ),
				id: `${ String( item.id ?? spec.itemLabel.toLowerCase() ) }-copy-${ index + 1 }`,
			},
			...items.slice( index + 1 ),
		];
		rowKeys = duplicateStructuredCollectionRowKeys( rowKeys, index, collectionInstanceId );
		commit( nextItems );
	}

	function removeItem( index: number ) {
		rowKeys = removeStructuredCollectionRowKeys( rowKeys, index );
		commit( items.filter( ( _, itemIndex ) => itemIndex !== index ) );
	}

	function nestedChildren( item: Record<string, JsonValue> ): Record<string, JsonValue>[] {
		return Array.isArray( item.children ) ? item.children as Record<string, JsonValue>[] : [];
	}

	function nestedOptions( item: Record<string, JsonValue> ): Record<string, JsonValue>[] {
		return Array.isArray( item.options ) ? item.options as Record<string, JsonValue>[] : [];
	}

	function canShowMenuChildren() {
		return kind === 'menu';
	}

	function canShowFormOptions( item: Record<string, JsonValue> ) {
		return kind === 'form-fields' && ( item.kind === 'select' || item.kind === 'radio' );
	}

	function getCollectionInstanceId( currentKind: StructuredCollectionKind, currentDepth: number ) {
		if ( collectionIdentity !== `${ currentKind }:${ currentDepth }` ) {
			collectionIdentity = `${ currentKind }:${ currentDepth }`;
			rowKeys = [];
			return createStructuredCollectionInstanceId( currentKind, currentDepth );
		}

		return collectionInstanceId;
	}

	function handleDragEnd( event: { canceled: boolean; operation?: { source?: { id?: string | number | null } | null; target?: { id?: string | number | null } | null } | null } ) {
		if ( event.canceled ) {
			return;
		}

		const sourceId = String( event.operation?.source?.id ?? '' );
		const targetId = String( event.operation?.target?.id ?? '' );
		if ( !sourceId || !targetId || sourceId === targetId ) {
			return;
		}

		const sourceIndex = rowKeys.indexOf( sourceId );
		const targetIndex = rowKeys.indexOf( targetId );
		if ( sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex ) {
			return;
		}

		const nextItems = [ ...items ];
		const [ movedItem ] = nextItems.splice( sourceIndex, 1 );
		nextItems.splice( targetIndex, 0, movedItem );
		rowKeys = moveStructuredCollectionRowKeys( rowKeys, sourceIndex, targetIndex );
		commit( nextItems );
	}

	function getRowKey( item: Record<string, JsonValue>, index: number ) {
		return rowKeys[ index ]
			?? ( typeof item.id === 'string' && item.id ? `${ collectionInstanceId }:item-${ item.id }` : `${ collectionInstanceId }:row-${ index }` );
	}
</script>

<DragDropProvider onDragEnd={handleDragEnd}>
<section class="structured-collection" class:structured-collection--nested={depth > 0}>
	<div class="structured-collection__header">
		<div>
			<h4>{title || spec.title}</h4>
			{#if description}<p>{description}</p>{/if}
		</div>
		<button type="button" class="builder-shell-button builder-shell-button--ghost" onclick={addItem}>
			Add {spec.itemLabel}
		</button>
	</div>

	{#if items.length}
		<div class="structured-collection__items">
			{#each items as item, index (getRowKey( item, index ))}
				<StructuredCollectionFieldEditorRow
					kind={kind}
					spec={spec}
					item={item}
					index={index}
					totalItems={items.length}
					itemKey={getRowKey( item, index )}
					sortableGroup={collectionInstanceId}
					onDuplicate={() => duplicateItem( index )}
					onRemove={() => removeItem( index )}
					onUpdateField={(field, nextValue) => updateItemField( index, field, nextValue )}
				>
					{#if canShowMenuChildren()}
						<div class="structured-collection__nested">
							<svelte:self
								kind="menu"
								title="Nested links"
								description="Child links are edited here instead of raw JSON."
								value={nestedChildren( item )}
								onChange={(nextChildren) => updateItem( index, { children: nextChildren as JsonValue } )}
								depth={depth + 1}
							/>
						</div>
					{/if}

					{#if canShowFormOptions( item )}
						<div class="structured-collection__nested">
							<svelte:self
								kind="form-options"
								title="Options"
								description="Select and radio fields expose their option groups here."
								value={nestedOptions( item )}
								onChange={(nextOptions) => updateItem( index, { options: nextOptions as JsonValue } )}
								depth={depth + 1}
							/>
						</div>
					{/if}
				</StructuredCollectionFieldEditorRow>
			{/each}
		</div>
	{:else}
		<div class="structured-collection__empty builder-shell-card builder-shell-card--subtle">
			<p>{spec.emptyLabel}</p>
			<button type="button" class="builder-shell-button builder-shell-button--ghost" onclick={addItem}>Add {spec.itemLabel}</button>
		</div>
	{/if}
</section>
</DragDropProvider>

<style>
	.structured-collection {
		display: grid;
		gap: var(--builder-shell-space-10);
		inline-size: 100%;
		padding: var(--builder-shell-space-12);
		border: 1px solid var(--builder-shell-border-color-bold);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-bg-surface);
		min-inline-size: 0;
	}

	.structured-collection--nested {
		padding: var(--builder-shell-space-10);
		background: var(--builder-shell-bg-subtle);
	}

	.structured-collection__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--builder-shell-space-12);
		min-inline-size: 0;
	}

	.structured-collection__header h4,
	.structured-collection__empty p {
		margin: 0;
	}

	.structured-collection__header p {
		color: var(--builder-shell-text-muted);
	}

	.structured-collection__items {
		display: grid;
		gap: var(--builder-shell-space-10);
	}

	.structured-collection__nested {
		display: grid;
		gap: var(--builder-shell-space-8);
		padding-top: var(--builder-shell-space-10);
		border-top: 1px solid var(--builder-shell-border-color-subtle);
		min-inline-size: 0;
	}

	.structured-collection__empty {
		display: grid;
		gap: var(--builder-shell-space-10);
		padding: var(--builder-shell-space-12);
	}

	@media (max-width: 900px) {
		.structured-collection__header {
			flex-direction: column;
		}
	}
</style>
