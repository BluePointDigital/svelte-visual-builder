<script lang="ts">
	import { createDroppable } from '@dnd-kit/svelte';

	import type { DropTarget } from '@builder/core';
	import { createBuilderDroppableData, type BuilderDroppableData } from '../drag-drop';

	export let id: string;
	export let target: DropTarget;
	export let priority: BuilderDroppableData['priority'] = 'container';
	export let style = '';

	const droppable = createDroppable( {
		get id() {
			return id;
		},
		get data() {
			return createBuilderDroppableData( target, priority );
		},
	} );
</script>

<div
	class="builder-preview__coarse-droppable"
	class:active={droppable.isDropTarget}
	data-builder-coarse-droppable={priority}
	data-builder-coarse-drop-active={droppable.isDropTarget ? 'true' : 'false'}
	data-drop-placement={target.placement}
	style={style}
	{@attach droppable.attach}
></div>
