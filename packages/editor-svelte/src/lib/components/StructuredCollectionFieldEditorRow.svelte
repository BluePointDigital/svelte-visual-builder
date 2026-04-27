<script lang="ts">
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import type { JsonValue } from '@builder/schema';

	import type { StructuredCollectionFieldSpec, StructuredCollectionSpec } from '../structured-content';

	export let kind: StructuredCollectionSpec['kind'];
	export let spec: StructuredCollectionSpec;
	export let item: Record<string, JsonValue>;
	export let index = 0;
	export let totalItems = 0;
	export let itemKey = '';
	export let sortableGroup = '';
	export let onDuplicate: () => void = () => {};
	export let onRemove: () => void = () => {};
	export let onUpdateField: ( field: StructuredCollectionFieldSpec, nextValue: string | boolean | number ) => void = () => {};

	const sortable = createSortable( {
		id: itemKey,
		group: sortableGroup,
		index,
	} );

	function fieldValue( field: StructuredCollectionFieldSpec ): string {
		const rawValue = item[ field.key ];
		if ( field.type === 'toggle' ) {
			return rawValue === true || rawValue === 'true' ? 'true' : 'false';
		}

		if ( field.type === 'number' ) {
			return typeof rawValue === 'number' ? String( rawValue ) : typeof rawValue === 'string' ? rawValue : '';
		}

		return typeof rawValue === 'string' ? rawValue : String( rawValue ?? '' );
	}

	function fieldChecked( field: StructuredCollectionFieldSpec ): boolean {
		const rawValue = item[ field.key ];
		return rawValue === true || rawValue === 'true';
	}
</script>

<article
	class="structured-collection__item builder-shell-card builder-shell-card--subtle"
	class:structured-collection__item--dragging={sortable.isDragging}
	class:structured-collection__item--droptarget={sortable.isDropTarget}
	data-collection-kind={kind}
	data-total-items={totalItems}
	{@attach sortable.attach}
>
	<div class="structured-collection__item-header">
		<div class="structured-collection__item-meta">
			<strong>{spec.itemLabel} {index + 1}</strong>
			<small>{String( item.label ?? item.title ?? item.src ?? item.id ?? spec.itemLabel )}</small>
		</div>
		<div class="structured-collection__item-actions">
			<button
				type="button"
				class="builder-shell-button builder-shell-button--ghost structured-collection__drag-handle"
				title="Drag to reorder"
				aria-label="Drag to reorder"
				{@attach sortable.attachHandle}
			>
				Drag
			</button>
			<button type="button" class="builder-shell-button builder-shell-button--ghost" onclick={onDuplicate}>
				Duplicate
			</button>
			<button type="button" class="builder-shell-button builder-shell-button--ghost" onclick={onRemove}>
				Remove
			</button>
		</div>
	</div>

	<div class="structured-collection__fields">
		{#each spec.fields as field (field.key)}
			<label class="structured-collection__field">
				<span>{field.label}</span>
				{#if field.type === 'textarea'}
					<textarea
						rows="3"
						placeholder={field.placeholder}
						value={fieldValue( field )}
						oninput={( event ) => onUpdateField( field, ( event.currentTarget as HTMLTextAreaElement ).value )}
					></textarea>
				{:else if field.type === 'toggle'}
					<input
						type="checkbox"
						checked={fieldChecked( field )}
						onchange={( event ) => onUpdateField( field, ( event.currentTarget as HTMLInputElement ).checked )}
					/>
				{:else if field.type === 'number'}
					<input
						type="number"
						placeholder={field.placeholder}
						value={fieldValue( field )}
						oninput={( event ) => onUpdateField( field, ( event.currentTarget as HTMLInputElement ).valueAsNumber || 0 )}
					/>
				{:else if field.type === 'select'}
					<select
						value={fieldValue( field )}
						onchange={( event ) => onUpdateField( field, ( event.currentTarget as HTMLSelectElement ).value )}
					>
						{#each field.options ?? [] as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				{:else}
					<input
						type="text"
						placeholder={field.placeholder}
						value={fieldValue( field )}
						oninput={( event ) => onUpdateField( field, ( event.currentTarget as HTMLInputElement ).value )}
					/>
				{/if}
			</label>
		{/each}
	</div>

	<slot />
</article>

<style>
	.structured-collection__item {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-12);
		min-inline-size: 0;
		overflow: hidden;
	}

	.structured-collection__item--dragging {
		opacity: 0.8;
		box-shadow: 0 0 0 1px var(--builder-shell-accent), 0 14px 30px rgba( 0, 0, 0, 0.18 );
	}

	.structured-collection__item--droptarget {
		box-shadow: inset 0 0 0 1px var(--builder-shell-accent);
	}

	.structured-collection__item-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--builder-shell-space-12);
		min-inline-size: 0;
	}

	.structured-collection__item-meta {
		display: grid;
		gap: 2px;
		min-inline-size: 0;
	}

	.structured-collection__item strong,
	.structured-collection__item small {
		margin: 0;
	}

	.structured-collection__item small {
		color: var(--builder-shell-text-muted);
	}

	.structured-collection__item-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--builder-shell-space-8);
		min-inline-size: 0;
	}

	.structured-collection__drag-handle {
		cursor: grab;
	}

	.structured-collection__drag-handle:active {
		cursor: grabbing;
	}

	.structured-collection__fields {
		display: grid;
		gap: var(--builder-shell-space-10);
		min-inline-size: 0;
	}

	.structured-collection__field {
		display: grid;
		gap: var(--builder-shell-space-6);
		min-inline-size: 0;
	}

	.structured-collection__field span {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--builder-shell-text-muted);
	}

	.structured-collection__field input,
	.structured-collection__field select,
	.structured-collection__field textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid var(--builder-shell-border-color-bold);
		border-radius: var(--builder-shell-radius);
		padding: 0.6rem 0.7rem;
		background: var(--builder-shell-bg-base);
		color: var(--builder-shell-text);
		min-inline-size: 0;
	}

	@media (max-width: 900px) {
		.structured-collection__item-header {
			flex-direction: column;
		}
	}
</style>
