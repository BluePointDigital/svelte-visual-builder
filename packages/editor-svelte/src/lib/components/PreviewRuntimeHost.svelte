<script lang="ts">
	import type { Readable } from 'svelte/store';

	import type { CanvasGeometrySnapshot } from '@builder/core';
	import { BuilderRenderer, type BuilderRuntimeOptions } from '@builder/runtime-svelte';

	type PreviewRuntimeOptions = BuilderRuntimeOptions & {
		bridgeEvents?: boolean;
		bridgeRenderVersion?: number;
		onGeometrySnapshot?: ( snapshot: CanvasGeometrySnapshot ) => void;
		onGeometryInvalidated?: ( reason: string, renderVersion: number ) => void;
	};

	export let options: Readable<PreviewRuntimeOptions | undefined>;
</script>

{#if $options}
	<BuilderRenderer {...$options} />
{/if}
