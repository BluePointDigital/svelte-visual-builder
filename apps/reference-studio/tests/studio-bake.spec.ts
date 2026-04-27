import { expect, test } from '@playwright/test';

import {
	buildStudioFixturePath,
	loadBuilderShell,
	previewFrame,
	readBuilderPerf,
	readStudioShellFlags,
	switchToElementsPanel,
} from './studio-helpers';

test( 'dense-500 bake smoke uses the profiling route and stays on the V3 shell boundary', async ( { page } ) => {
	const fixture = 'dense-500';

	await loadBuilderShell( page, { fixture } );
	await expect( page ).toHaveURL( buildStudioFixturePath( fixture ) );
	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-shell-variant', 'v3' );
	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-interaction-core-v3', 'true' );
	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-navigator-virtualization', 'true' );

	const shellFlags = await readStudioShellFlags( page );
	expect( shellFlags ).toMatchObject( {
		canvasInteractionV2: true,
		interactionCoreV3: true,
		navigatorVirtualization: true,
		shellVariant: 'v3',
	} );

	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node]' ).count() ).toBeGreaterThanOrEqual( 500 );
	await switchToElementsPanel( page );

	const perf = await readBuilderPerf( page );
	expect( perf.previewMounts ?? 0 ).toBeGreaterThanOrEqual( 1 );
	expect( perf.geometrySnapshotsPosted ?? 0 ).toBeGreaterThan( 0 );
	expect( perf.geometryFallbackSnapshots ?? 0 ).toBe( 0 );
	expect( perf.engineDragPointerDispatches ?? 0 ).toBe( 0 );
} );
