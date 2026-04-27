import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig( {
	plugins: [ svelte() ],
	test: {
		environment: 'jsdom',
		include: [
			'packages/**/tests/**/*.test.ts',
			'packages/**/tests/**/*.test.tsx',
			'packages/**/tests/**/*.test.svelte.ts',
			'apps/**/tests/**/*.test.ts',
		],
		setupFiles: [ './vitest.setup.ts' ],
	},
} );
