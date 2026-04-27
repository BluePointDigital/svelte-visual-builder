import { defineConfig } from '@playwright/test';

export default defineConfig( {
	testDir: './apps/embed-smoke-host/tests',
	testMatch: /.*\.spec\.ts/,
	timeout: 30000,
	use: {
		baseURL: 'http://127.0.0.1:4175',
		headless: true,
	},
	webServer: {
		command: 'pnpm --filter @builder/embed-smoke-host build && pnpm --filter @builder/embed-smoke-host preview --host 127.0.0.1 --port 4175',
		port: 4175,
		reuseExistingServer: false,
		timeout: 120000,
	},
} );
