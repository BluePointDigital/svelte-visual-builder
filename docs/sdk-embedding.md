# Builder SDK Embedding

The production embedding surface is host-first: a Svelte app owns persistence, media, auth, dynamic data, and AI settings, then passes those capabilities into the builder through public package exports.

## Public Imports

Host apps should import from package roots only:

```ts
import { BuilderCanvas, createBuilderHostSdk } from '@builder/editor-svelte';
import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';
import { createSvelteKitBuilderIntegration } from '@builder/adapter-sveltekit';
import { createBuilderHostAdapter } from '@builder/plugin-api';
```

Do not import internal paths such as `@builder/editor-svelte/src/lib/...`. Internal paths can change without a compatibility guarantee.

## Editor Mount

```ts
import { createSvelteKitBuilderIntegration } from '@builder/adapter-sveltekit';
import { createBuilderHostSdk } from '@builder/editor-svelte';

const integration = createSvelteKitBuilderIntegration({
	previewContext: {
		siteData: { title: 'Acme' },
		session: { role: 'admin' },
	},
	persistence,
	media,
	permissions: {
		editProject: true,
		publish: true,
		uploadMedia: true,
		deleteMedia: true,
		useAi: true,
		accessDynamicData: true,
	},
	aiSettings,
});

const sdk = createBuilderHostSdk({
	adapter: integration.adapter,
	persistence: integration.editor.persistence.host,
	media: integration.editor.media.adapter,
	permissions: integration.editor.permissions,
	aiSettings: integration.editor.ai.settings,
	previewContext: integration.editor.adapter.previewContext,
	hooks: {
		onProjectChange: (project) => console.log(project.name),
		onSaveStateChange: (state) => console.log(state),
		onPublish: () => console.log('published'),
		onError: (error) => console.error(error),
	},
});

const editor = sdk.createEditor(project, {
	initialState: { activeDocumentId: 'home' },
});
```

Render `<BuilderCanvas {editor} />` in the route component. For best route performance, dynamically import `@builder/editor-svelte` before mounting the editor.

## Host-Owned Adapters

Persistence should be backed by the host app:

- `loadProject`
- `saveAutosave`
- `saveDraft`
- `publish`
- `restoreRevision`
- `listRevisions`
- `getSaveStatus`

Media should also be host-owned:

- `listAssets`
- `uploadAsset`
- `updateAsset`
- `deleteAsset`
- `resolveAssetUrl`

The builder stores serialized project/media metadata, but credentials, database records, object storage keys, and authorization rules remain host concerns.

## Host Extension

Use a host extension when an app needs to register builder elements, dynamic data, adapters, and permissions as one reusable module.

```ts
import {
	createBuilderRegistry,
	applyBuilderHostExtension,
	defineBuilderHostExtension,
	defineBuilderElement,
	defineBuilderDynamicProvider,
	defineBuilderBindingProvider,
} from '@builder/plugin-api';
import { createRuntimeComponentMap } from '@builder/runtime-svelte';
import BookingWidget from './components/BookingWidget.svelte';
import ServiceList from './components/ServiceList.svelte';

export function createCmsBuilderExtension() {
	return defineBuilderHostExtension({
		elements: [
			defineBuilderElement({
				type: 'booking-widget',
				label: 'Booking Widget',
				category: 'interactive',
				propSchema: bookingWidgetProps,
				styleSchema: bookingWidgetStyles,
				styleContract: bookingWidgetStyleContract,
				defaults: { props: { title: 'Book an appointment' } },
				panelSections: bookingWidgetPanels,
				contentSections: bookingWidgetPanels,
				styleSections: [],
				advancedSections: [],
				runtime: { family: 'html', tag: 'section', acceptsChildren: false },
				createDefaultNode: () => createBookingWidgetNode(),
			}),
		],
		bindingProviders: [
			defineBuilderBindingProvider({
				id: 'site',
				label: 'CMS Site',
				resolve: (binding, context) => context.siteData?.[binding.path],
			}),
		],
		dynamicProviders: [
			defineBuilderDynamicProvider({
				id: 'service-list',
				label: 'Services',
				group: 'CMS',
				categories: ['object'],
				resolve: (context) => context.collections?.services ?? [],
			}),
		],
		media,
		persistence,
		permissions: {
			publish: user.canPublish || 'Only publishers can publish.',
			uploadMedia: user.canUploadMedia,
		},
	});
}

const registry = applyBuilderHostExtension(
	createBuilderRegistry(),
	createCmsBuilderExtension()
);

const runtimeComponents = createRuntimeComponentMap({
	'booking-widget': BookingWidget,
	'service-list': ServiceList,
});
```

Pass the same extension to `createBuilderHostSdk({ extension, runtimeComponents })` for editor preview, and pass `runtimeComponents` to `<BuilderRenderer />` or `renderPublishedDocument()` for published routes. Runtime component props receive resolved `props`, builder `attributes`, `style`, `className`, `node`, `model`, `record`, and rendered child content.

## Auth And Permissions

Use the `permissions` option to hide or block restricted actions in the editor:

```ts
permissions: {
	publish: user.canPublish || 'Only reviewers can publish.',
	useAi: user.plan.includes('ai') || 'AI is not enabled for this workspace.',
}
```

The UI treats missing permissions as allowed for backward compatibility. Production hosts must also enforce the same rules server-side on persistence and media endpoints.

## Runtime Render

Published routes should use runtime APIs only:

```ts
import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';

const model = renderPublishedDocument({
	project,
	documentId: 'home',
	adapter,
	dynamicContext: {
		record: { title: 'Runtime title' },
		session,
	},
	media: {
		resolveAssetUrl: (asset) => typeof asset === 'object' && asset && 'url' in asset ? String(asset.url) : undefined,
	},
	cssIsolation: {
		rootSelector: '#published-page',
	},
});
```

Render `<BuilderRenderer project={model.project} activeDocumentId="home" adapter={model.adapter} bindingContext={model.bindingContext} media={model.media} />`.

## Smoke Fixture

`apps/embed-smoke-host` is the production confidence fixture. It:

- consumes only package-root exports,
- wires host-owned persistence, media, permissions, dynamic context, AI settings, and lifecycle hooks,
- exposes an editor route at `/`,
- exposes a runtime-only route at `/published/embed-home`,
- includes Playwright coverage for editor boot, denied permissions, and runtime isolation.

## Validation

Use:

```bash
pnpm embed:validate
```

This runs the normal project gates plus the embed fixture check/build/E2E pass. Before embedding in a real app, also run that host app's production build and inspect its route chunks to confirm editor-only code is deferred from runtime-only pages.

## Complete Reference

For the full feature and API reference, including schema, engine commands, runtime helpers, imports, media, AI, custom elements, and troubleshooting, see [builder-documentation.md](builder-documentation.md).

## Deployment Checklist

- Use workspace package imports from public package roots.
- Implement host persistence and media endpoints.
- Enforce auth in both UI permissions and server endpoints.
- Keep API keys and storage credentials outside project JSON.
- Verify runtime pages do not import editor packages.
- Verify media URLs resolve through the host CDN/storage layer.
- Verify dynamic data receives route/session/load context.
- Run `pnpm embed:validate` before upgrading consuming apps.
