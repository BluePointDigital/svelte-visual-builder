import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { createBuilderManualChunks } from '../reference-studio/build-chunks';

function builderChunkEnvironmentPlugin() {
	const clientManualChunks = createBuilderManualChunks( false );
	return {
		name: 'embed-smoke-builder-chunks',
		configEnvironment( name: string ) {
			if ( name !== 'client' || !clientManualChunks ) {
				return;
			}
			return {
				build: {
					rollupOptions: {
						output: {
							manualChunks: clientManualChunks,
						},
					},
				},
			};
		},
	};
}

export default defineConfig( {
	plugins: [ builderChunkEnvironmentPlugin(), sveltekit() ],
	server: {
		port: 5175,
	},
} );
