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

This runs the normal project gates plus the embed fixture check/build/E2E pass. Before embedding in a real app, also run that host app’s production build and inspect its route chunks to confirm editor-only code is deferred from runtime-only pages.

## Deployment Checklist

- Use workspace package imports from public package roots.
- Implement host persistence and media endpoints.
- Enforce auth in both UI permissions and server endpoints.
- Keep API keys and storage credentials outside project JSON.
- Verify runtime pages do not import editor packages.
- Verify media URLs resolve through the host CDN/storage layer.
- Verify dynamic data receives route/session/load context.
- Run `pnpm embed:validate` before upgrading consuming apps.
