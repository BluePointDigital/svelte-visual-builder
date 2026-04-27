import { expect, test } from '@playwright/test';

import {
	dragElementTileIntoTarget,
	elementsPanel,
	loadBuilderShell,
	navigatorFloatingPanel,
	previewFrame,
	readBuilderPerf,
	switchToElementsPanel,
} from './studio-helpers';
import { denseFixtureCases } from './dense-fixtures';

for ( const { fixture, minimumNodes } of denseFixtureCases ) {
	test( `${ fixture } smoke loads the dense fixture without legacy drag artifacts`, async ( { page } ) => {
		await loadBuilderShell( page, { fixture } );
		await switchToElementsPanel( page );

		await expect( navigatorFloatingPanel( page ) ).toBeVisible();
		await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node]' ).count() ).toBeGreaterThanOrEqual( minimumNodes );
		await expect( page.locator( '.builder-preview__drag-ghost' ) ).toHaveCount( 0 );
		const perf = await readBuilderPerf( page );
		expect( perf.geometryFallbackSnapshots ?? 0 ).toBe( 0 );
		expect( perf.engineDragPointerDispatches ?? 0 ).toBe( 0 );
	} );
}

for ( const { fixture, minimumNodes } of denseFixtureCases ) {
	test( `${ fixture } keeps V3 drag steady-state while candidate resolution advances`, async ( { page } ) => {
		await loadBuilderShell( page, { fixture } );
		await switchToElementsPanel( page );

		await expect( navigatorFloatingPanel( page ) ).toBeVisible();
		await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node]' ).count() ).toBeGreaterThanOrEqual( minimumNodes );

		const elements = elementsPanel( page );
		const layoutCategory = elements.locator( '.elements-panel__categories button' ).filter( { hasText: 'Layout' } ).first();
		await layoutCategory.click();

		const targetContainer = previewFrame( page )
			.locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' )
			.first();
		await expect( targetContainer ).toBeVisible();

		const paletteTile = elements.locator( '.elements-panel__group' ).first().locator( '.elements-panel__tile' ).first();
		const before = await readBuilderPerf( page );
		await dragElementTileIntoTarget( page, paletteTile, targetContainer, { x: 0.55, y: 0.55 } );
		await page.waitForTimeout( 120 );

		const during = await readBuilderPerf( page );
		expect( during.geometryFallbackSnapshots ?? 0 ).toBe( before.geometryFallbackSnapshots ?? 0 );
		expect( during.engineDragPointerDispatches ?? 0 ).toBe( before.engineDragPointerDispatches ?? 0 );
		expect( during.candidateResolutionCount ?? 0 ).toBeGreaterThan( before.candidateResolutionCount ?? 0 );

		await page.mouse.up();
	} );
}
