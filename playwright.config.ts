import { defineConfig } from '@playwright/test';

export default defineConfig( {
	testDir: './apps/reference-studio/tests',
	testMatch: /.*\.spec\.ts/,
	timeout: 30000,
	use: {
		baseURL: 'http://127.0.0.1:4173',
		headless: true,
	},
	webServer: {
		command: 'pnpm --filter @builder/reference-studio build && pnpm --filter @builder/reference-studio preview --host 127.0.0.1 --port 4173',
		env: {
			VITE_BUILDER_DISABLE_PERSISTENCE: 'true',
		},
		port: 4173,
		reuseExistingServer: false,
		timeout: 120000,
	},
} );
