declare global {
	namespace App {
		interface PageData {
			project: import('@builder/schema').BuilderPackage;
			bindingContext: import('@builder/plugin-api').BindingProviderContext;
			importWarnings: import('@builder/elementor-import').ElementorImportWarning[];
		}
	}
}

export {};

