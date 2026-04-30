import type { BuilderPackage } from '@builder/schema';
import type {
	BindingProviderContext,
	BuilderDynamicProviderDefinition,
	BuilderElementDefinition,
	BuilderHostAdapter,
	BuilderHostExtensionDefinition,
	BuilderHostMediaAdapter,
	BuilderHostPermissionAdapter,
	BuilderHostPersistenceAdapter,
	BuilderRegistry,
	BuilderRoutePreviewContextAdapter,
} from '@builder/plugin-api';
import { applyBuilderHostExtension, createDefaultBuilderRegistry } from '@builder/plugin-api';
import type { BuilderRuntimeComponentMap } from '@builder/runtime-svelte';
import type { BuilderAiSettings, BuilderAiSettingsAdapter } from './ai-core';
import { createBuilderEditor, type BuilderEditorController, type BuilderEditorFeatures, type BuilderEditorLifecycleHooks, type CreateBuilderEditorOptions } from './editor';

export interface BuilderHostSdkDefinition {
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

export interface BuilderHostSdk {
	registry: BuilderRegistry;
	createEditorOptions: ( overrides?: CreateBuilderEditorOptions ) => CreateBuilderEditorOptions;
	createEditor: ( project: BuilderPackage, overrides?: CreateBuilderEditorOptions ) => BuilderEditorController;
}

export function createBuilderHostSdk( definition: BuilderHostSdkDefinition = {} ): BuilderHostSdk {
	const extension = definition.extension;
	const adapter = definition.adapter ?? extension?.adapter;
	const dynamicProviders = definition.dynamicProviders ?? extension?.dynamicProviders;
	const persistence = definition.persistence ?? extension?.persistence as BuilderHostPersistenceAdapter<BuilderPackage> | undefined;
	const media = definition.media ?? extension?.media;
	const permissions = definition.permissions ?? extension?.permissions;
	const aiSettings = definition.aiSettings ?? extension?.aiSettings as BuilderAiSettingsAdapter | undefined;
	const routePreview = definition.routePreview ?? extension?.routePreview;
	const registry = applyBuilderHostExtension( definition.registry ?? createDefaultBuilderRegistry(), extension );
	applyBuilderHostExtension( registry, {
		adapter,
		elements: definition.elements,
		dynamicProviders,
		routePreview,
	} );

	const createEditorOptions = ( overrides: CreateBuilderEditorOptions = {} ): CreateBuilderEditorOptions => ( {
		...overrides,
		extension,
		runtimeComponents: overrides.runtimeComponents ?? definition.runtimeComponents,
		adapter: {
			host: adapter,
			registry,
			route: routePreview,
			previewContext: definition.previewContext,
			...( typeof overrides.adapter === 'object' && overrides.adapter && !('resolveBinding' in overrides.adapter) ? overrides.adapter : {} ),
		},
		registry: overrides.registry ?? registry,
		dynamic: {
			providers: dynamicProviders,
			previewContext: definition.previewContext,
			...overrides.dynamic,
		},
		persistence: {
			host: persistence,
			...overrides.persistence,
		},
		media: {
			adapter: media,
			...overrides.media,
		},
		permissions: overrides.permissions ?? permissions,
		ai: {
			settings: aiSettings,
			defaultSettings: definition.defaultAiSettings,
			...overrides.ai,
		},
		features: {
			...definition.features,
			...overrides.features,
		},
		hooks: {
			...definition.hooks,
			...overrides.hooks,
		},
	} );

	return {
		registry,
		createEditorOptions,
		createEditor: ( project, overrides ) => createBuilderEditor( project, createEditorOptions( overrides ) ),
	};
}
