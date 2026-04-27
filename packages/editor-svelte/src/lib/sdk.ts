import type { BuilderPackage } from '@builder/schema';
import type {
	BindingProviderContext,
	BuilderDynamicProviderDefinition,
	BuilderElementDefinition,
	BuilderHostAdapter,
	BuilderHostMediaAdapter,
	BuilderHostPermissionAdapter,
	BuilderHostPersistenceAdapter,
	BuilderRegistry,
	BuilderRoutePreviewContextAdapter,
} from '@builder/plugin-api';
import { applyBuilderHostExtension, createDefaultBuilderRegistry } from '@builder/plugin-api';
import type { BuilderAiSettings, BuilderAiSettingsAdapter } from './ai-core';
import { createBuilderEditor, type BuilderEditorController, type BuilderEditorFeatures, type BuilderEditorLifecycleHooks, type CreateBuilderEditorOptions } from './editor';

export interface BuilderHostSdkDefinition {
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
	const registry = applyBuilderHostExtension( definition.registry ?? createDefaultBuilderRegistry(), {
		adapter: definition.adapter,
		elements: definition.elements,
		dynamicProviders: definition.dynamicProviders,
		routePreview: definition.routePreview,
	} );

	const createEditorOptions = ( overrides: CreateBuilderEditorOptions = {} ): CreateBuilderEditorOptions => ( {
		...overrides,
		adapter: {
			host: definition.adapter,
			registry,
			route: definition.routePreview,
			previewContext: definition.previewContext,
			...( typeof overrides.adapter === 'object' && overrides.adapter && !('resolveBinding' in overrides.adapter) ? overrides.adapter : {} ),
		},
		registry: overrides.registry ?? registry,
		dynamic: {
			providers: definition.dynamicProviders,
			previewContext: definition.previewContext,
			...overrides.dynamic,
		},
		persistence: {
			host: definition.persistence,
			...overrides.persistence,
		},
		media: {
			adapter: definition.media,
			...overrides.media,
		},
		permissions: overrides.permissions ?? definition.permissions,
		ai: {
			settings: definition.aiSettings,
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
