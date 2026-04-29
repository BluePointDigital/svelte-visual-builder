# Svelte Visual Builder Documentation

This guide documents the Builder end to end: the project model, editor shell, host SDK, runtime renderer, imports, AI, media, dynamic data, persistence, permissions, SvelteKit integration, extension APIs, and validation workflow.

## What The Builder Is

Svelte Visual Builder is a Svelte 5/SvelteKit visual page builder that is designed to run inside a host Svelte app. The builder provides the editor and runtime rendering primitives, while the host app owns persistence, media storage, auth, dynamic data, routes, and AI credentials.

Use it when you need:

- an Elementor-style editor embedded in a Svelte app,
- a runtime renderer for published pages,
- a typed JSON project model,
- host-owned saves, drafts, publishing, revisions, and media,
- import flows for Builder JSON, Elementor JSON, and HTML/CSS,
- dynamic bindings against route, load, site, session, request, collection, document, component, or host dynamic data,
- custom elements and runtime Svelte components,
- OpenAI-compatible AI create/edit flows.

## Repository Layout

```text
apps/
  reference-studio     Full demo and development studio.
  embed-smoke-host     Minimal production-style host integration fixture.

packages/
  schema               Zod schemas, project model, migrations, constructors.
  core                 Editor engine, commands, history, selection, canvas state.
  plugin-api           Element registry, controls, host adapters, defaults.
  runtime-svelte       Published renderer, CSS compiler, dynamic resolution.
  editor-svelte        Svelte editor UI, SDK, imports, media, AI.
  elementor-import     Elementor JSON conversion.
  adapter-sveltekit    SvelteKit binding, condition, and integration helpers.
```

## Installation And Scripts

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm test:e2e
pnpm embed:validate
pnpm release:validate
```

`pnpm dev` runs `apps/reference-studio`. `pnpm embed:validate` runs the normal gates plus the production-style embed fixture build and Playwright checks.

## Public Package Imports

Host applications should import only from package roots. Internal source paths are not a stable API.

```ts
import { BuilderCanvas, createBuilderHostSdk } from '@builder/editor-svelte';
import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';
import { createBuilderPackage, createDocument, createNode, parseBuilderPackage } from '@builder/schema';
import { createDefaultBuilderRegistry, defineBuilderElement, defineBuilderHostExtension } from '@builder/plugin-api';
import { createSvelteKitBuilderIntegration } from '@builder/adapter-sveltekit';
```

## Architecture

The builder has four main layers:

- **Schema:** typed project JSON. It validates, migrates, and constructs documents, nodes, styles, media, assignments, revisions, classes, variables, and collections.
- **Core engine:** framework-agnostic editor state. It applies mutation and UI commands, tracks selection, drag/drop, history, clipboard, document sessions, save state, and canvas geometry.
- **Editor SDK/UI:** Svelte editor components and a controller that wires the engine to host adapters, persistence, media, dynamic data, permissions, AI, import review, and lifecycle hooks.
- **Runtime renderer:** Svelte runtime components that render published documents without importing editor-only code.

The host app supplies project loading, persistence endpoints, media storage and URL resolution, user permissions, route/load/session/site/collection data, AI settings storage, and custom elements/components when needed.

## Project Model

The root project type is `BuilderPackage`.

```ts
interface BuilderPackage {
	packageVersion: string;
	name: string;
	documents: BuilderDocument[];
	themeAssignments: ThemeAssignment[];
	designSystem: DesignSystem;
	collections: CollectionDefinition[];
	revisions: DocumentRevision[];
	media: MediaAsset[];
	meta: Record<string, JsonValue>;
}
```

Use `parseBuilderPackage(value)` when loading untrusted or stored JSON. It migrates older fields such as `content`, `elements`, `classRefs`, `localStyles`, legacy route/layout fields, and older design class shapes before validating with Zod.

### Documents

Supported document kinds are `page`, `layout`, `template`, `component`, `popup`, `kit`, and `library-item`. Supported statuses are `draft`, `published`, and `archived`.

```ts
interface BuilderDocument {
	id: string;
	schemaVersion: string;
	kind: DocumentKind;
	title: string;
	slug: string;
	status: 'draft' | 'published' | 'archived';
	createdAt: string;
	updatedAt: string;
	root: BuilderNode[];
	component?: ComponentWorkflow;
	meta: Record<string, JsonValue>;
}
```

Document helpers:

- `createDocument(kind, title, slug?)`
- `createEmptyDocument(kind, title, slug?)`
- `getDocumentComponentWorkflow(document)`
- `patchDocumentComponentWorkflow(document, patch)`
- `slugify(value)`

### Nodes

Every visual element is a `BuilderNode`.

```ts
interface BuilderNode {
	id: string;
	type: string;
	name?: string;
	props: Record<string, JsonValue>;
	layout: Record<string, JsonValue>;
	styleRefs: string[];
	styles: StyleSet;
	bindings: Binding[];
	attributes: HtmlAttribute[];
	interactions: Interaction[];
	visibility: VisibilityRule;
	accessibility: Accessibility;
	children: BuilderNode[];
	slots: Record<string, BuilderNode[]>;
	legacy?: LegacyCompat;
	meta: Record<string, JsonValue>;
}
```

Use `createNode({ type, ...overrides })` to create a valid node and `normalizeNode(value)` to migrate older node shapes.

### Styles And Design System

Styles are stored as a `StyleSet` with `base`, `states`, `breakpoints`, `stateBreakpoints`, and `customCss`. Use `createStyleSet(input?)`. Token values may be stored as `{ token: string, fallback?: JsonValue }` and compile to CSS custom properties.

Default breakpoints are `desktop` at 1280, `laptop` at 1024, `tablet` at 768, and `mobile` at 0.

`DesignSystem` stores variables, reusable classes, breakpoints, theme styles, project custom CSS, and experiment flags.

### Assignments And Revisions

Theme assignment slots are `page`, `header`, `footer`, `sidebar`, `popup`, `modal`, `loop-item`, and `empty`. Use `createThemeAssignment({ documentId, slot, pathname, priority, status })`.

Conditions can read `route`, `query`, `site`, `request`, `load`, `collection`, `session`, and `document` sources with `equals`, `contains`, `matches`, `startsWith`, `exists`, `not-exists`, `truthy`, and `in` operators.

Revision kinds are `draft`, `autosave`, and `published`. The core engine stores document snapshots in `revision.meta.documentSnapshot`; use `getDocumentSnapshotFromRevision(revision)` to read them safely.

## Default Elements

`createDefaultBuilderRegistry()` registers the built-in element catalog.

| Type | Category | Runtime family | Purpose |
| --- | --- | --- | --- |
| `container` | layout | container | Flex container and general section wrapper. |
| `grid-container` | layout | container | Grid container with column controls. |
| `heading` | content | text | H1-H6 heading with inline text editing. |
| `paragraph` | content | text | Paragraph text. |
| `text-editor` | content | text | Rich text content. |
| `blockquote` | content | text | Quote/citation content. |
| `spacer` | layout | container | Empty spacing block. |
| `image` | media | image | Image with alt, caption, object fit, link, lazy loading. |
| `button` | interactive | button | Link button with variants and accessibility label. |
| `divider` | content | divider | Horizontal divider. |
| `video` | media | video | Video/embed source. |
| `html` | content | html | Raw/safe HTML markup node. |
| `shortcode` | content | html | Shortcode-like HTML placeholder. |
| `svg` | media | html | SVG markup node. |
| `icon` | content | icon | Symbol/icon element. |
| `icon-box` | content | icon-box | Icon plus title/text/link. |
| `social-icons` | interactive | menu | Social links. |
| `list` | content | list | List content. |
| `toggle` | interactive | accordion | Toggle/accordion style content. |
| `tabs` | interactive | tabs | Tabbed content. |
| `accordion` | interactive | accordion | Accordion content. |
| `menu` | interactive | menu | Navigation menu. |
| `gallery` | media | gallery | Image gallery. |
| `carousel` | interactive | carousel | Slides/carousel content. |
| `form` | form | form | Form wrapper and generated fields. |
| `form-field-text` | form | html | Text input field. |
| `form-field-email` | form | html | Email input field. |
| `form-field-textarea` | form | html | Textarea field. |
| `form-field-select` | form | html | Select field. |
| `form-field-checkbox` | form | html | Checkbox field. |
| `form-field-radio` | form | html | Radio field. |
| `form-field-hidden` | form | html | Hidden input field. |
| `form-submit` | form | html | Submit button. |
| `loop` | data | loop | Collection loop with loop-item/empty templates. |
| `popup-root` | interactive | popup | Popup/modal document root. |
| `compat-widget` | legacy | compat | Editable compatibility fallback for imported widgets. |

Each element definition includes schemas, defaults, content/style/advanced panel sections, runtime metadata, optional legacy widget mappings, and `createDefaultNode()`.

## Editor Engine

Use `createBuilderEngine(project, activeDocumentId?)` directly for framework-agnostic tests or custom editor surfaces.

```ts
import { createBuilderEngine } from '@builder/core';

const engine = createBuilderEngine(project, 'home');
const unsubscribe = engine.subscribe((state) => {
	console.log(state.activeDocumentId, state.ui.selectedNodeIds);
});
```

`BuilderEngineState` contains the current project, active document id, UI state, history stacks, clipboard, and document sessions.

Mutation commands change project data and participate in undo/redo:

- `project/import`
- `document/create`
- `document/delete`
- `document/update`
- `document/elements/create`
- `document/elements/update`
- `document/elements/delete`
- `document/elements/move`
- `document/component/update-instance-overrides`
- `document/component/detach-instance`
- `document/component/relink-instance`
- `design/classes/upsert`
- `design/classes/delete`
- `design/variables/upsert`
- `design/variables/delete`
- `project/assignment/upsert`
- `project/assignment/delete`

UI commands cover document/node selection, hover, focus, editor mode, panels, shell UI, context menus, save state, revision browser, managers, viewport, preview path/query/context, inline editing, drag/drop, canvas measurements, undo/redo, copy/paste, duplicate, draft/autosave/publish, and restore revision.

Use `beginTransaction(label)` and `commitTransaction()` to group multiple mutations into one history entry.

## Editor SDK

The easiest production entry point is `createBuilderHostSdk()`.

```ts
import { createBuilderHostSdk, BuilderCanvas } from '@builder/editor-svelte';

const sdk = createBuilderHostSdk({
	adapter,
	persistence,
	media,
	permissions,
	aiSettings,
	previewContext,
	hooks: {
		onProjectChange(project) {},
		onSaveStateChange(saveState) {},
		onPublish(event) {},
		onError(error, context) {},
	},
});

const editor = sdk.createEditor(project, {
	initialState: { activeDocumentId: 'home' },
});
```

Render the complete shell with `<BuilderCanvas {editor} />`. `BuilderInspector`, `BuilderNavigator`, and `BuilderPreview` are exported for custom shells.

### `createBuilderHostSdk` Options

```ts
interface BuilderHostSdkDefinition {
	extension?: BuilderHostExtensionDefinition;
	adapter?: BuilderHostAdapter;
	registry?: BuilderRegistry;
	elements?: BuilderElementDefinition[];
	dynamicProviders?: BuilderDynamicProviderDefinition[];
	persistence?: BuilderHostPersistenceAdapter<BuilderPackage>;
	media?: BuilderHostMediaAdapter;
	permissions?: BuilderHostPermissionAdapter;
	aiSettings?: BuilderAiSettingsAdapter;
	routePreview?: BuilderRoutePreviewContextAdapter;
	previewContext?: BindingProviderContext;
	runtimeComponents?: BuilderRuntimeComponentMap;
	features?: BuilderEditorFeatures;
	defaultAiSettings?: Partial<BuilderAiSettings>;
	hooks?: BuilderEditorLifecycleHooks;
}
```

`createEditorOptions(overrides?)` returns resolved options for `createBuilderEditor()`. `createEditor(project, overrides?)` creates a `BuilderEditorController`.

### Editor Controller API

The controller exposes subscriptions, permissions, dynamic data binding, document caches, command dispatch, shell UI controls, document navigation, persistence, revision browser, preview/site editing, component instance workflow, document/library workflow, import review/commit, media management, AI runs, drag/drop, and context menus.

Key methods include:

- `subscribe`, `subscribeSelector`, `subscribeAiSession`
- `dispatch`, `beginTransaction`, `commitTransaction`, `undo`, `redo`
- `setPanel`, `setShellPage`, `toggleShellPanel`, `setNavigatorMode`, `toggleNavigator`
- `focusDocument`, `openDocument`, `focusBreadcrumb`
- `saveDraft`, `publish`, `restoreRevision`, `listRevisions`, `resolveSaveConflict`
- `setPreviewContext`, `setSiteEditorEntry`, `togglePreviewPopups`
- `createDocument`, `deleteDocument`, `createLibraryItemFromSelection`
- `reviewTemplatesFromJson`, `reviewHtmlTemplate`, `commitTemplateImportReview`
- `listMediaAssets`, `uploadMediaAsset`, `updateMediaAsset`, `deleteMediaAsset`
- `getAiSettings`, `saveAiSettings`, `startAiCreate`, `startAiEdit`, `sendAiMessage`, `cancelAiRun`
- `startNodeDrag`, `startElementDrag`, `updateDrag`, `setDropTarget`, `commitDrag`, `cancelDrag`

Feature flags are `canvasInteractionV2`, `interactionCoreV3`, `navigatorVirtualization`, and `shellVariant` (`legacy` or `v3`).

Lifecycle hooks are `onProjectChange`, `onDocumentChange`, `onSelectionChange`, `onSaveStateChange`, `onPublish`, and `onError`.

## Persistence

Host persistence adapter:

```ts
interface BuilderHostPersistenceAdapter<Project = unknown> {
	loadProject?: (projectId: string) => Promise<Project>;
	saveAutosave?: (project: Project, context?: Record<string, JsonValue>) => Promise<unknown>;
	saveDraft?: (project: Project, context?: Record<string, JsonValue>) => Promise<unknown>;
	publish?: (project: Project, context?: Record<string, JsonValue>) => Promise<unknown>;
	restoreRevision?: (revisionId: string, context?: Record<string, JsonValue>) => Promise<Project>;
	listRevisions?: (context?: Record<string, JsonValue>) => Promise<unknown[]>;
	getSaveStatus?: (context?: Record<string, JsonValue>) => Promise<unknown>;
}
```

The editor-level adapter receives `BuilderPersistenceEvent` with the project, document id, revision metadata, reason, expected version token, and force flag. Save states are `idle`, `saved`, `dirty`, `autosaving`, `saving`, `publishing`, `published`, `error`, and `conflict`. Conflict strategies are `overwrite`, `reload`, and `keep-local`.

Production hosts should enforce permissions server-side for draft, autosave, publish, restore, and media endpoints.

## Media

Host media adapter:

```ts
interface BuilderHostMediaAdapter {
	listAssets?: () => Promise<BuilderMediaAssetDefinition[]>;
	uploadAsset?: (file: File, options?: Record<string, JsonValue>) => Promise<BuilderMediaAssetDefinition>;
	deleteAsset?: (assetId: string) => Promise<void>;
	updateAsset?: (assetId: string, patch: Partial<BuilderMediaAssetDefinition>) => Promise<BuilderMediaAssetDefinition>;
	resolveAssetUrl?: (asset: string | BuilderMediaAssetDefinition, context?: BindingProviderContext) => string | undefined;
}
```

Editor media utilities include `validateMediaUpload`, `normalizeMediaAsset`, `toMediaAssetMetadata`, `mergeMediaCatalog`, `updateMediaCatalogAsset`, `deleteMediaCatalogAsset`, `createMediaDiagnostics`, and `createBrowserLocalMediaAdapter`.

The runtime renderer can also resolve media through `BuilderRuntimeMediaAdapter.resolveAssetUrl(asset, context)`.

## Permissions

Permission keys are `editProject`, `publish`, `uploadMedia`, `deleteMedia`, `useAi`, and `accessDynamicData`.

Permission values may be `true`, `false`, a string denial reason, `{ allowed, reason }`, or a function `(permission) => value | undefined`. Missing permissions are treated as allowed for backward compatibility.

## Dynamic Data And Bindings

Bindings can target props, attributes, content, and styles.

```ts
interface Binding {
	id: string;
	targetKind: 'prop' | 'attribute' | 'content' | 'style';
	target: string;
	source: 'route' | 'load' | 'site' | 'query' | 'request' | 'collection' | 'session' | 'component-prop' | 'document' | 'dynamic';
	path: string;
	category?: 'text' | 'richText' | 'url' | 'color' | 'image' | 'media' | 'gallery' | 'number' | 'boolean' | 'object' | 'postMeta';
	fallback?: JsonValue;
	before?: string;
	after?: string;
	transform?: string;
	args: Record<string, JsonValue>;
}
```

`BindingProviderContext` can include route params, query, request, load data, site data, active record, session, component props, document, and collections.

Define a dynamic provider:

```ts
defineBuilderDynamicProvider({
	id: 'post-title',
	label: 'Post Title',
	group: 'Post',
	categories: ['text'],
	resolve: (context, settings) => context.record?.[String(settings?.path ?? 'title')],
	preview: (context) => context.record?.title ?? 'Preview title',
});
```

The SvelteKit adapter has built-in resolution for route, load, site, query, request, collection, session, component-prop, document, and dynamic sources. Built-in dynamic provider ids include `post-title`, `page-title`, `post-url`, `site-title`, `site-tagline`, `request-parameter`, and `custom-path`.

## Runtime Rendering

Use runtime APIs on published routes. Published routes should not import editor packages.

```ts
import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';

const model = renderPublishedDocument({
	project,
	documentId: 'home',
	adapter,
	dynamicContext: {
		routeParams: { slug: 'home' },
		siteData: { title: 'Acme' },
		session: { role: 'visitor' },
		record: { title: 'Runtime title' },
	},
	media: {
		resolveAssetUrl: (asset) => typeof asset === 'string' ? asset : undefined,
	},
	cssIsolation: {
		rootSelector: '#published-page',
	},
});
```

```svelte
<BuilderRenderer
	project={model.project}
	activeDocumentId="home"
	adapter={model.adapter}
	bindingContext={model.bindingContext}
	media={model.media}
/>
```

Runtime APIs include `renderDocument`, `renderPublishedDocument`, `renderResolvedDocument`, `resolveComposition`, `compileDocumentAssets`, `createRuntimeComponentMap`, `resolveNodeProps`, `resolveNodeAttributes`, `getNodeStyle`, `resolveBoundStyleMap`, `getNodeClassNames`, `getStyleOrigins`, `isNodeVisible`, `getRenderableRoots`, `resolveCollectionRecords`, and `expandComponentInstance`.

Composition resolves one active page, optional header/footer/sidebar, stacked popup/modal documents, loop item and empty state templates, preview documents, and published assignments filtered by route and condition matches.

## Custom Runtime Components

Register custom runtime components by node type.

```ts
import { createRuntimeComponentMap } from '@builder/runtime-svelte';
import BookingWidget from './BookingWidget.svelte';

export const runtimeComponents = createRuntimeComponentMap({
	'booking-widget': BookingWidget,
});
```

Runtime component props include `node`, resolved `props`, `attributes`, inline `style`, `className`, the render `model`, optional collection `record`, and optional rendered `children` snippet.

Pass the same `runtimeComponents` to the editor SDK for editor preview and to the runtime renderer for published routes.

## SvelteKit Integration

Use `createSvelteKitBuilderIntegration()` to generate editor and runtime wiring from one option object.

```ts
const integration = createSvelteKitBuilderIntegration({
	previewContext: {
		siteData: { title: 'Acme' },
		session: { role: 'admin' },
	},
	persistence,
	media,
	permissions,
	aiSettings,
	defaultAiSettings,
	routePreview,
});
```

SvelteKit adapter functions:

- `createSvelteKitBuilderAdapter(options?)`
- `createSvelteKitBuilderIntegration(options?)`
- `resolveSvelteKitBinding(binding, context)`
- `resolveSvelteKitDynamicProvider(providerId, context, settings?)`
- `matchesSvelteKitConditionGroup(group, context)`
- `matchesSvelteKitAssignment(assignment, context)`
- `resolveSvelteKitCollection(source, context, query?)`

Route patterns support `/`, `*`, `/*`, `/[...all]`, `/(.*)`, `[param]`, and `[...rest]`-style segments.

## Host Extensions And Plugin API

Host extensions group custom elements, document types, binding/dynamic providers, template conditions, experiments, persistence, media, AI settings, permissions, and route preview.

```ts
export const extension = defineBuilderHostExtension({
	elements: [
		defineBuilderElement({
			type: 'booking-widget',
			label: 'Booking Widget',
			category: 'interactive',
			propSchema,
			styleSchema,
			styleContract,
			defaults: { props: { title: 'Book now' } },
			panelSections: [],
			contentSections: [],
			styleSections: [],
			advancedSections: [],
			runtime: { family: 'html', tag: 'section', acceptsChildren: false },
			createDefaultNode: () => createNode({ type: 'booking-widget' }),
		}),
	],
});
```

Registry functions:

- `createBuilderRegistry()`
- `createDefaultBuilderRegistry()`
- `createBuilderHostAdapter(definition)`
- `defineBuilderHostExtension(definition)`
- `defineBuilderElement(definition)`
- `defineBuilderDocumentType(definition)`
- `defineBuilderBindingProvider(definition)`
- `defineBuilderDynamicProvider(definition)`
- `defineBuilderTemplateCondition(definition)`
- `defineBuilderExperiment(definition)`
- `applyBuilderHostExtension(registry, extension)`

`BuilderRegistry` stores element definitions, document type definitions, binding providers, dynamic providers, template conditions, and experiments. It can create default element nodes with `registry.createElementNode(type, overrides?)`.

## Imports

The editor supports `builder-package`, `elementor`, and `html` import sources. Destinations are `library`, `new-page`, and `active-page`.

Review APIs let the UI show warnings, structure, assets, and CSS before committing:

```ts
const review = await editor.reviewTemplatesFromJson(payload, {
	sourceName: 'Landing Import',
});

const result = await editor.commitTemplateImportReview(review, {
	destination: 'library',
});
```

Direct APIs include `reviewTemplateImportPayload`, `reviewHtmlImportPayload`, `commitTemplateImportReview`, `importTemplatesIntoProject`, and `importHtmlIntoProject`.

### HTML Import

`importHtmlPackage({ html, sourceName? })` requires `DOMParser` and supports full HTML documents or fragments.

Editable conversions include containers, headings, paragraphs, images, button-like anchors, and inline-only unknown elements. Complex or unsupported markup becomes `html` fallback nodes. The importer extracts inline styles, resolves top-level CSS selectors, captures pseudo state styles, scopes CSS to imported roots, skips scripts with diagnostics, and collects media URLs.

### Elementor Import

`importElementorPackage(payload, name?)` accepts one Elementor document or an array. It maps common Elementor layout, content, media, form, menu, gallery, carousel, loop, popup, and kit settings into Builder documents. Unsupported widgets are preserved as `compat-widget` nodes with parity gap reports.

## AI Assistant

AI settings are OpenAI-compatible:

```ts
interface BuilderAiSettings {
	provider: 'custom' | 'openrouter' | 'gemini-openai' | 'local';
	baseUrl: string;
	model: string;
	apiKey: string;
	headers: Record<string, string>;
	temperature: number;
	maxOutputTokens: number;
	maxToolIterations: number;
	systemInstructions: string;
	debugMode: boolean;
}
```

Provider presets are `custom`, `openrouter`, `gemini-openai`, and `local`. Helpers include `createDefaultAiSettings`, `normalizeMaxToolIterations`, `createDefaultAiSessionState`, `createBrowserAiSettingsAdapter`, `redactAiSettings`, `makeAiTranscriptMessage`, `normalizeAiChatCompletionsUrl`, `buildOpenAiCompatibleRequest`, `parseSseFrame`, and `createAiSystemPrompt`.

`BuilderAiCreateRequest` accepts `prompt`, optional target parent/slot, design style, theme overwrite flag, and context notes. API keys should be stored through the host/browser settings adapter and never persisted in project JSON.

## Components, Library Items, And Site Editing

Component documents can expose editable properties through `ComponentExposure`. Instances store `props.componentId` and per-instance overrides.

Controller methods:

- `insertComponentInstance(componentId, targetParentId?, targetSlot?)`
- `updateComponentInstanceOverrides(nodeId, overrides, merge?)`
- `detachComponentInstance(nodeId?)`
- `relinkComponentInstance(nodeId?, componentId?, preserveOverrides?)`
- `createLibraryItemFromSelection(title)`
- `insertLibraryItem(libraryDocumentId, targetParentId?, targetSlot?)`

Site editing uses `ThemeAssignment` records plus preview state:

- `openDocument(documentId, { mode, pathname, query, slot, assignmentId, source })`
- `setPreviewContext({ pathname, query, showPopups, slot, assignmentId, documentId, source })`
- `setSiteEditorEntry(entryId?)`

## Reference Apps

`apps/reference-studio` is the full development app with the complete editor shell, demo repository, media endpoints, persistence endpoints, AI settings, and release validation helpers.

`apps/embed-smoke-host` is the production confidence fixture. It demonstrates package-root imports, host persistence/media APIs, permissions, dynamic preview context, AI settings, an editor route at `/`, a runtime-only route at `/published/[documentId]`, bundle budgets, and E2E validation.

## Production Checklist

- Import only from public package roots.
- Use `parseBuilderPackage` for stored project JSON.
- Keep editor packages out of runtime-only routes.
- Connect persistence to the host backend.
- Connect media to the host storage/CDN layer.
- Enforce auth in UI permissions and server endpoints.
- Keep AI keys and provider secrets outside project JSON.
- Provide dynamic context from route/load/session/site data.
- Register custom runtime components in editor preview and runtime.
- Run `pnpm embed:validate` before upgrading consuming apps.
- Inspect production chunks to confirm editor code is deferred away from published pages.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Editor opens with no document | Project must contain at least one document and `activeDocumentId` must exist. |
| Runtime route loads editor code | Published route imported from `@builder/editor-svelte`; use `@builder/runtime-svelte` only. |
| Dynamic values are blank | Confirm binding source/path, `bindingContext`, adapter, and fallback values. |
| Media URLs are broken | Implement `resolveAssetUrl` in editor/runtime media adapters. |
| Publish button hidden or blocked | Check `permissions.publish` and server endpoint authorization. |
| AI create fails | Check `useAi` permission, AI settings adapter, base URL, API key, model, and debug transcript. |
| HTML import rejects input | It needs non-empty HTML and browser `DOMParser`. |
| Elementor import has compatibility widgets | Unsupported widgets are intentionally preserved as `compat-widget` nodes with parity diagnostics. |
| Save conflict state appears | Use `resolveSaveConflict('reload' | 'overwrite' | 'keep-local')` based on host conflict policy. |
