import { describe, expect, it } from 'vitest';

import { createBuilderManualChunks, INITIAL_CLIENT_CHUNK_BUDGET_BYTES } from '../build-chunks';

describe( 'reference studio build chunking', () => {
	it( 'keeps manual chunk splitting disabled for SSR builds to avoid empty cleanup-only chunks', () => {
		expect( createBuilderManualChunks( true ) ).toBeUndefined();
	} );

	it( 'splits client modules into the expected builder and vendor chunk families', () => {
		const manualChunks = createBuilderManualChunks( false );
		expect( manualChunks ).toBeTypeOf( 'function' );
		expect( INITIAL_CLIENT_CHUNK_BUDGET_BYTES ).toBe( 350 * 1024 );

		expect( manualChunks?.( 'C:\\repo\\packages\\editor-svelte\\src\\lib\\BuilderCanvas.svelte' ) ).toBe( 'builder-editor' );
		expect( manualChunks?.( 'C:\\repo\\packages\\adapter-sveltekit\\src\\index.ts' ) ).toBeUndefined();
		expect( manualChunks?.( 'C:\\repo\\node_modules\\@tiptap\\core\\dist\\index.js' ) ).toBe( 'vendor-richtext' );
		expect( manualChunks?.( 'C:\\repo\\node_modules\\bits-ui\\dist\\index.js' ) ).toBe( 'vendor-shell' );
		expect( manualChunks?.( 'C:\\repo\\node_modules\\@dnd-kit\\core\\dist\\index.js' ) ).toBe( 'vendor-dnd' );
		expect( manualChunks?.( 'C:\\repo\\node_modules\\clsx\\dist\\clsx.js' ) ).toBe( 'vendor-base' );
	} );
} );
