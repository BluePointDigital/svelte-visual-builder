import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const shellTokensPath = path.resolve( process.cwd(), 'packages/editor-svelte/src/lib/components/EditorShellTokens.svelte' );
const shellIconPath = path.resolve( process.cwd(), 'packages/editor-svelte/src/lib/components/EditorShellIcon.svelte' );
const workflowPanelPaths = [
	path.resolve( process.cwd(), 'packages/editor-svelte/src/lib/components/DocumentModeBrowser.svelte' ),
	path.resolve( process.cwd(), 'packages/editor-svelte/src/lib/components/AssignmentWorkflowPanel.svelte' ),
	path.resolve( process.cwd(), 'packages/editor-svelte/src/lib/components/ComponentWorkflowPanel.svelte' ),
	path.resolve( process.cwd(), 'packages/editor-svelte/src/lib/components/RevisionWorkflowPanel.svelte' ),
];

describe( 'editor shell tokens', () => {
	it( 'defines the shared Elementor-like shell variables and icon bridge', async () => {
		const [ shellTokensSource, shellIconSource ] = await Promise.all( [
			readFile( shellTokensPath, 'utf8' ),
			readFile( shellIconPath, 'utf8' ),
		] );

		expect( shellTokensSource ).toContain( '--builder-shell-top-bar-height: 48px;' );
		expect( shellTokensSource ).toContain( '--builder-shell-responsive-bar-height: 40px;' );
		expect( shellTokensSource ).toContain( '--builder-shell-panel-width: 280px;' );
		expect( shellTokensSource ).toContain( '--builder-shell-panel-width-xl: 300px;' );
		expect( shellTokensSource ).toContain( '--builder-shell-navigator-width: 240px;' );
		expect( shellTokensSource ).toContain( '--builder-shell-font-size: 13px;' );
		expect( shellTokensSource ).toContain( '--builder-shell-accent: #d004d4;' );
		expect( shellTokensSource ).toContain( '--builder-shell-accent-strong: #524cff;' );
		expect( shellTokensSource ).toContain( '--builder-shell-bg-dark: var(--builder-shell-gray-800);' );
		expect( shellIconSource ).toContain( 'assignment:' );
		expect( shellIconSource ).toContain( 'component:' );
		expect( shellIconSource ).toContain( 'revision:' );
	} );

	it( 'wires the workflow panels to the shared shell token provider', async () => {
		const panelSources = await Promise.all( workflowPanelPaths.map( async ( path ) => readFile( path, 'utf8' ) ) );

		for ( const source of panelSources ) {
			expect( source ).toContain( "import EditorShellTokens from './EditorShellTokens.svelte';" );
			expect( source ).toContain( '<EditorShellTokens>' );
			expect( source ).toContain( 'builder-shell-button' );
			expect( source ).toContain( 'builder-shell-card' );
		}
	} );
} );
