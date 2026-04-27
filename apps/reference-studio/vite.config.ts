import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { createBuilderManualChunks, INITIAL_CLIENT_CHUNK_BUDGET_BYTES } from './build-chunks';

function initialChunkBudgetPlugin() {
	return {
		name: 'builder-initial-chunk-budget',
		generateBundle( _: unknown, bundle: Record<string, { type: string; fileName: string; code?: string; isDynamicEntry?: boolean }> ) {
			if ( !Object.keys( bundle ).some( ( fileName ) => fileName.includes( '_app/immutable/' ) ) ) {
				return;
			}

			const oversized = Object.values( bundle )
				.filter( ( chunk ) => chunk.type === 'chunk' && chunk.fileName.endsWith( '.js' ) && !chunk.isDynamicEntry )
				.filter( ( chunk ) => ( chunk.code?.length ?? 0 ) > INITIAL_CLIENT_CHUNK_BUDGET_BYTES );

			if ( oversized.length ) {
				throw new Error(
					`Initial client chunk budget exceeded (${ INITIAL_CLIENT_CHUNK_BUDGET_BYTES } bytes): ${ oversized.map( ( chunk ) => `${ chunk.fileName }=${ chunk.code?.length ?? 0 }` ).join( ', ' ) }`,
				);
			}
		},
	};
}

function builderChunkEnvironmentPlugin() {
	const clientManualChunks = createBuilderManualChunks( false );

	return {
		name: 'builder-chunk-environment',
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
	plugins: [ builderChunkEnvironmentPlugin(), initialChunkBudgetPlugin(), sveltekit() ],
	server: {
		port: 5173,
	},
} );
