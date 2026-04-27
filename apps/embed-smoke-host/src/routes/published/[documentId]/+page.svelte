<script lang="ts">
	import { createSvelteKitBuilderAdapter } from '@builder/adapter-sveltekit';
	import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';
	import type { BuilderPackage } from '@builder/schema';
	import type { BindingProviderContext } from '@builder/plugin-api';

	type PageData = {
		documentId: string;
		project: BuilderPackage;
		bindingContext?: BindingProviderContext;
	};

	export let data: PageData;
	const adapter = createSvelteKitBuilderAdapter();

	const model = renderPublishedDocument( {
		project: data.project,
		documentId: data.documentId,
		adapter,
		dynamicContext: data.bindingContext,
		media: {
			resolveAssetUrl: ( asset ) => typeof asset === 'object' && asset && 'url' in asset ? String( asset.url ) : undefined,
		},
		cssIsolation: {
			rootSelector: '.published-host',
		},
	} );
</script>

<svelte:head>
	<title>Published Builder Runtime</title>
</svelte:head>

<main class="published-host" data-testid="published-runtime">
	<BuilderRenderer project={model.project} activeDocumentId={data.documentId} adapter={model.adapter} bindingContext={model.bindingContext} media={model.media} />
</main>

<style>
	:global(body) {
		margin: 0;
		background: #fff;
		font-family: Inter, system-ui, sans-serif;
	}

	.published-host {
		min-height: 100vh;
		padding: 24px;
	}
</style>
