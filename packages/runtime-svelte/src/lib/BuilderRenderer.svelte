<script lang="ts">
	import { onMount, setContext } from 'svelte';

	import type { CanvasGeometrySnapshot } from '@builder/core';
	import type { BuilderDocument } from '@builder/schema';
	import type { BuilderRuntimeOptions } from './runtime';

	import BuilderNodeView from './BuilderNodeView.svelte';
	import type { BuilderGeometrySlotMeta } from './geometry';
	import { BUILDER_GEOMETRY_CONTEXT, createCanvasGeometryEmitter } from './geometry';
	import { getRenderableRoots, renderResolvedDocument } from './runtime';

	let {
		project,
		activeDocumentId,
		registry,
		adapter,
		bindingContext,
		conditionContext,
		viewport = 'desktop',
		reducedMotion = false,
		showPopups = false,
		runtimeComponents,
		bridgeEvents = false,
		bridgeRenderVersion = 0,
		onGeometrySnapshot,
		onGeometryInvalidated,
	}: BuilderRuntimeOptions & {
		bridgeEvents?: boolean;
		bridgeRenderVersion?: number;
		onGeometrySnapshot?: ( snapshot: CanvasGeometrySnapshot ) => void;
		onGeometryInvalidated?: ( reason: string, renderVersion: number ) => void;
	} = $props();
	let geometryBridgeEnabled = false;
	let geometryBridgeRenderVersion = 0;
	let runtimeRoot: HTMLDivElement | undefined;

	const model = $derived( renderResolvedDocument( {
		project,
		activeDocumentId,
		registry,
		adapter,
		bindingContext,
		conditionContext,
		viewport,
		reducedMotion,
		showPopups,
		runtimeComponents,
	} ) );

	const renderableRoots = $derived( getRenderableRoots( model ) );
	const overlayRootKeys = $derived( renderableRoots
		.filter( ( rendered ) => rendered.slot === 'popup' || rendered.slot === 'modal' )
		.map( ( rendered ) => `${ rendered.slot }::${ rendered.document.id }` ) );

	function getOverlayKey( slot: string, documentId: string ) {
		return `${ slot }::${ documentId }`;
	}

	function isTopmostOverlay( slot: string, documentId: string ) {
		const key = getOverlayKey( slot, documentId );
		return overlayRootKeys.at( -1 ) === key;
	}

	const geometryEmitter = createCanvasGeometryEmitter( {
		enabled: geometryBridgeEnabled,
		renderVersion: geometryBridgeRenderVersion,
		postSnapshot: ( snapshot ) => {
			onGeometrySnapshot?.( snapshot );
		},
		postInvalidation: ( reason, renderVersion ) => {
			onGeometryInvalidated?.( reason, renderVersion );
		},
	} );
	setContext( BUILDER_GEOMETRY_CONTEXT, geometryEmitter );

	function bindRootSlotGeometry( element: HTMLElement, meta: BuilderGeometrySlotMeta ) {
		return geometryEmitter.registerSlot( element, meta );
	}

	function createRootSlotGeometryMeta( rendered: { slot: string; document: BuilderDocument } ): BuilderGeometrySlotMeta {
		return {
			documentId: rendered.document.id,
			ownerId: undefined,
			slot: rendered.slot,
			acceptsMultiple: true,
			isRoot: true,
			childNodeIds: rendered.document.root.map( ( node ) => node.id ),
		};
	}

	$effect( () => {
		geometryBridgeEnabled = bridgeEvents || Boolean( onGeometrySnapshot ) || Boolean( onGeometryInvalidated );
		geometryBridgeRenderVersion = bridgeRenderVersion;
		geometryEmitter.setEnabled( geometryBridgeEnabled );
		if ( geometryBridgeEnabled ) {
			geometryEmitter.setRenderVersion( geometryBridgeRenderVersion );
			geometryEmitter.schedule( 'bridge-effect' );
		}
	} );

	onMount( () => {
		if ( typeof window === 'undefined' ) {
			return;
		}

		const onResize = () => geometryEmitter.schedule( 'window-resize' );
		const onScroll = () => geometryEmitter.schedule( 'window-scroll' );
		const scrollContainer = runtimeRoot?.parentElement;
		window.addEventListener( 'resize', onResize );
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		document.addEventListener( 'scroll', onScroll, true );
		scrollContainer?.addEventListener( 'scroll', onScroll, { passive: true } );
		const resizeObserver = scrollContainer && typeof ResizeObserver !== 'undefined'
			? new ResizeObserver( () => geometryEmitter.schedule( 'resize-observer' ) )
			: undefined;
		if ( scrollContainer ) {
			resizeObserver?.observe( scrollContainer );
		}
		geometryEmitter.schedule( 'mount' );

		return () => {
			window.removeEventListener( 'resize', onResize );
			window.removeEventListener( 'scroll', onScroll );
			document.removeEventListener( 'scroll', onScroll, true );
			scrollContainer?.removeEventListener( 'scroll', onScroll );
			resizeObserver?.disconnect();
			geometryEmitter.destroy();
		};
	} );
</script>

<svelte:element this={'style'}>{model.stylesheet}</svelte:element>

<div bind:this={runtimeRoot} class="builder-runtime" data-builder-path={model.conditionContext.pathname}>
	{#each renderableRoots as rendered (rendered.document.id + rendered.slot)}
		<section
			class={`builder-runtime__slot builder-runtime__slot--${rendered.slot}`}
			data-builder-root-document={rendered.document.id}
			data-builder-root-slot={rendered.slot}
			use:bindRootSlotGeometry={createRootSlotGeometryMeta( rendered )}
		>
			{#each rendered.document.root as node, index (node.id)}
				<BuilderNodeView
					{node}
					{model}
					{bridgeEvents}
					documentId={rendered.document.id}
					{index}
					rootSlot={rendered.slot}
					overlayIsTopmost={isTopmostOverlay( rendered.slot, rendered.document.id )}
				/>
			{/each}
		</section>
	{/each}
</div>

<style>
	.builder-runtime {
		display: grid;
		gap: 1.5rem;
		position: relative;
	}

	.builder-runtime__slot {
		display: grid;
		gap: 1rem;
	}

	.builder-runtime__slot--popup,
	.builder-runtime__slot--modal {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 30;
	}
</style>
