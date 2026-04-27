import { expect, type Locator, type Page } from '@playwright/test';

export type StudioFixture = 'default' | 'dense-200' | 'dense-500';

export const previewSelector = '[data-builder-preview-surface="true"]';
export const panelBodySelector = '.builder-shell__panel-body';
export const navigatorRowSelector = '.navigator__row';
export const navigatorHandleSelector = '.navigator__row-handle';
export const navigatorFloatingSelector = '.builder-shell__navigator-floating';
export const navigatorDockedSelector = '.builder-shell__navigator-docked:not(.builder-shell__navigator-docked--collapsed)';
export const navigatorPanelSelector = `${ navigatorDockedSelector }:visible, ${ navigatorFloatingSelector }:visible`;
export const contextMenuSelector = '.builder-shell__context-menu';
export const inspectorTabSelector = '.builder-panel-tab-switcher__tab';
export const inlineRichTextEditorRootSelector = '[data-inline-rich-text-root="true"]';
export const inlineRichTextEditorSelector = '.inline-rich-text__editor [data-inline-rich-text="true"]';
export const inlineRichTextShellSelector = '.builder-preview__inline-editor-shell';
const visibleNavigatorRowSelector = `${ navigatorDockedSelector }:visible ${ navigatorRowSelector }, ${ navigatorFloatingSelector }:visible ${ navigatorRowSelector }`;
const visibleNavigatorHandleSelector = `${ navigatorDockedSelector }:visible ${ navigatorHandleSelector }, ${ navigatorFloatingSelector }:visible ${ navigatorHandleSelector }`;

export interface LoadBuilderShellOptions {
	fixture?: StudioFixture;
}

export function buildStudioFixturePath( fixture: StudioFixture = 'default' ) {
	return fixture === 'default' ? '/' : `/?fixture=${ encodeURIComponent( fixture ) }`;
}

export async function loadBuilderShell( page: Page, options: LoadBuilderShellOptions = {} ) {
	const fixture = options.fixture ?? 'default';
	await page.goto( buildStudioFixturePath( fixture ) );
	await page.waitForLoadState( 'networkidle' );

	await expect( page.getByRole( 'button', { name: 'Responsive', exact: true } ) ).toBeVisible();
	await expect( page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Elements' } ) ).toBeVisible();
	await expect( page.getByRole( 'banner' ).getByRole( 'button', { name: 'Menu', exact: true } ).first() ).toBeVisible();
	await expect( page.getByRole( 'button', { name: 'Hide Structure' } ) ).toBeVisible();
	await expect( page.locator( previewSelector ) ).toBeVisible();
	await expect( previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ) ).toBeVisible();
	await page.waitForTimeout( 150 );
}

export async function readStudioShellFlags( page: Page ): Promise<{
	canvasInteractionV2: boolean;
	interactionCoreV3: boolean;
	navigatorVirtualization: boolean;
	shellVariant: string;
}> {
	return page.locator( '.studio-host' ).evaluate( ( element ) => ( {
		canvasInteractionV2: element.getAttribute( 'data-canvas-interaction-v2' ) === 'true',
		interactionCoreV3: element.getAttribute( 'data-interaction-core-v3' ) === 'true',
		navigatorVirtualization: element.getAttribute( 'data-navigator-virtualization' ) === 'true',
		shellVariant: element.getAttribute( 'data-shell-variant' ) ?? '',
	} ) );
}

export function previewFrame( page: Page ): Locator {
	return page.locator( previewSelector );
}

export function panelBody( page: Page ): Locator {
	return page.locator( panelBodySelector );
}

export function panelContainer( page: Page ): Locator {
	return page.locator( '.builder-shell__panel' );
}

export function elementsPanel( page: Page ): Locator {
	return page.locator( '.elements-panel' );
}

export function navigatorRows( page: Page ): Locator {
	return page.locator( visibleNavigatorRowSelector );
}

export function navigatorHandles( page: Page ): Locator {
	return page.locator( visibleNavigatorHandleSelector );
}

export function navigatorFloatingPanel( page: Page ): Locator {
	return page.locator( navigatorPanelSelector ).first();
}

export function contextMenuSurface( page: Page ): Locator {
	return page.locator( `${ contextMenuSelector }[role="menu"]` );
}

export function inlineRichTextEditorRoot( page: Page ): Locator {
	return page.locator( inlineRichTextEditorRootSelector );
}

export function inlineRichTextEditor( page: Page ): Locator {
	return page.locator( '[data-inline-rich-text="true"]' );
}

export function inlineRichTextShell( page: Page ): Locator {
	return page.locator( inlineRichTextShellSelector );
}

export function inspectorTabs( page: Page ): Locator {
	return panelBody( page ).locator( inspectorTabSelector );
}

export function responsiveDeviceButton( page: Page, device: 'desktop' | 'tablet' | 'mobile' ): Locator {
	return page.locator( '.builder-preview__responsive-bar .builder-preview__device-strip' )
		.getByRole( 'button', { name: new RegExp( device, 'i' ) } )
		.first();
}

export async function switchResponsiveViewport( page: Page, device: 'desktop' | 'tablet' | 'mobile' ) {
	const responsiveBar = page.locator( '.builder-preview__responsive-bar' );
	const deviceButton = responsiveDeviceButton( page, device );
	if ( !( await responsiveBar.evaluate( ( element ) => element.classList.contains( 'expanded' ) ) ) ) {
		await page.getByRole( 'button', { name: 'Responsive', exact: true } ).click();
		await expect( responsiveBar ).toHaveClass( /expanded/ );
	}
	await expect( deviceButton ).toBeVisible();
	await deviceButton.click();
	await expect( deviceButton ).toHaveClass( /active/ );
	await expect( page.locator( '.builder-preview-shell' ) ).toHaveAttribute( 'data-builder-preview-device', device );
}

export function elementPalette( page: Page ): Locator {
	return page.getByLabel( 'Element palette' );
}

export async function dragPaletteTileByNameIntoPreview(
	page: Page,
	name: string,
	offset: { x: number; y: number } = { x: 240, y: 220 },
) {
	const palette = elementPalette( page );
	const tile = palette.getByText( name, { exact: true } ).locator( 'xpath=ancestor::button[1]' ).first();
	await expect( tile ).toBeVisible();
	await dragElementTileIntoPreview( page, tile, offset );
}

export async function measurePageHeight( page: Page ): Promise<{
	bodyScrollHeight: number;
	scrollHeight: number;
	viewportHeight: number;
}> {
	return page.evaluate( () => ( {
		bodyScrollHeight: document.body.scrollHeight,
		scrollHeight: document.documentElement.scrollHeight,
		viewportHeight: window.innerHeight,
	} ) );
}

export async function measureCanvasScrollBehavior( page: Page ): Promise<{
	bodyScrollHeight: number;
	previewOverflowY: string;
	viewportHeight: number;
	pageScrollHeight: number;
	stageClientHeight: number;
	stageScrollHeight: number;
	previewClientHeight: number;
	previewScrollHeight: number;
}> {
	return page.evaluate( () => {
		const stage = document.querySelector( '.builder-preview__stage' ) as HTMLElement | null;
		const previewSurface = document.querySelector( '[data-builder-preview-surface="true"]' ) as HTMLElement | null;
		const previewScrollContainer = previewSurface?.shadowRoot?.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;

		return {
			bodyScrollHeight: document.body.scrollHeight,
			previewOverflowY: previewScrollContainer ? getComputedStyle( previewScrollContainer ).overflowY : '',
			viewportHeight: window.innerHeight,
			pageScrollHeight: document.documentElement.scrollHeight,
			stageClientHeight: stage?.clientHeight ?? 0,
			stageScrollHeight: stage?.scrollHeight ?? 0,
			previewClientHeight: previewScrollContainer?.clientHeight ?? 0,
			previewScrollHeight: previewScrollContainer?.scrollHeight ?? 0,
		};
	} );
}

export async function readBuilderPerf( page: Page ): Promise<{
	previewMounts?: number;
	fullPreviewSyncs?: number;
	canvasMetricsDispatches?: number;
	geometrySnapshotsPosted?: number;
	geometryFallbackSnapshots?: number;
	geometryInvalidations?: number;
	overlayOnlyUpdates?: number;
	dragTargetUpdates?: number;
	engineDragPointerDispatches?: number;
	candidateResolutionCount?: number;
	selectorEmissions?: Record<string, number>;
}> {
	return page.evaluate( () => ( window as Window & { __builderPerf?: {
		previewMounts?: number;
		fullPreviewSyncs?: number;
		canvasMetricsDispatches?: number;
		geometrySnapshotsPosted?: number;
		geometryFallbackSnapshots?: number;
		geometryInvalidations?: number;
		overlayOnlyUpdates?: number;
		dragTargetUpdates?: number;
		engineDragPointerDispatches?: number;
		candidateResolutionCount?: number;
		selectorEmissions?: Record<string, number>;
	} } ).__builderPerf ?? {} );
}

export async function scrollPreviewFrameWindow( page: Page, top: number ) {
	await page.locator( previewSelector ).evaluate( ( element, nextTop ) => {
		const previewScrollContainer = ( element as HTMLElement ).shadowRoot?.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;
		previewScrollContainer?.scrollTo( 0, nextTop as number );
	}, top );
}

export async function readPreviewRootChildCount( page: Page ): Promise<number> {
	return page.locator( previewSelector ).evaluate( ( element ) => {
		const rootDocuments = [ ...( ( element as HTMLElement ).shadowRoot?.querySelectorAll( '[data-builder-root-document]' ) ?? [] ) ] as HTMLElement[];
		if ( !rootDocuments.length ) {
			return -1;
		}

		return rootDocuments.reduce( ( total, rootDocument ) => total + rootDocument.querySelectorAll( ':scope > [data-builder-node]' ).length, 0 );
	} );
}

export async function readPreviewRootChildIds( page: Page ): Promise<string[]> {
	return page.locator( previewSelector ).evaluate( ( element ) => {
		const rootDocuments = [ ...( ( element as HTMLElement ).shadowRoot?.querySelectorAll( '[data-builder-root-document]' ) ?? [] ) ] as HTMLElement[];
		return rootDocuments.flatMap( ( rootDocument ) => [ ...( rootDocument.querySelectorAll( ':scope > [data-builder-node]' ) as NodeListOf<HTMLElement> ) ] )
			.map( ( node ) => node.getAttribute( 'data-builder-node' ) ?? '' )
			.filter( Boolean );
	} );
}

export async function measurePreviewOverlayAlignment(
	page: Page,
	nodeId: string,
	overlaySelector = '.builder-preview__selection',
): Promise<{
	targetRect: { top: number; left: number; width: number; height: number };
	overlayRect: { top: number; left: number; width: number; height: number };
	delta: { top: number; left: number; width: number; height: number };
	maxDelta: number;
} | undefined> {
	return page.evaluate( ( { targetNodeId, selector, previewCssSelector } ) => {
		const previewSurface = document.querySelector( previewCssSelector ) as HTMLElement | null;
		const previewScrollContainer = previewSurface?.shadowRoot?.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;
		const overlay = document.querySelector( selector ) as HTMLElement | null;
		const target = previewSurface?.shadowRoot?.querySelector( `[data-builder-node="${ targetNodeId }"]` ) as HTMLElement | null;
		if ( !previewSurface || !previewScrollContainer || !overlay || !target ) {
			return undefined;
		}

		const targetRect = target.getBoundingClientRect();
		const overlayBounds = overlay.getBoundingClientRect();
		const overlayRect = {
			top: overlayBounds.top,
			left: overlayBounds.left,
			width: overlayBounds.width,
			height: overlayBounds.height,
		};
		const expectedRect = {
			top: targetRect.top,
			left: targetRect.left,
			width: targetRect.width,
			height: targetRect.height,
		};
		const delta = {
			top: Math.abs( overlayRect.top - expectedRect.top ),
			left: Math.abs( overlayRect.left - expectedRect.left ),
			width: Math.abs( overlayRect.width - expectedRect.width ),
			height: Math.abs( overlayRect.height - expectedRect.height ),
		};

		return {
			targetRect: expectedRect,
			overlayRect,
			delta,
			maxDelta: Math.max( delta.top, delta.left, delta.width, delta.height ),
		};
	}, {
		targetNodeId: nodeId,
		selector: overlaySelector,
		previewCssSelector: previewSelector,
	} );
}

export async function measureInlineEditorAlignment(
	page: Page,
	nodeId: string,
): Promise<{
	targetRect: { top: number; left: number; width: number; height: number };
	editorRect: { top: number; left: number; width: number; height: number };
	delta: { top: number; left: number };
	maxDelta: number;
} | undefined> {
	return page.evaluate( ( { targetNodeId, previewCssSelector, editorSelector } ) => {
		const previewSurface = document.querySelector( previewCssSelector ) as HTMLElement | null;
		const inlineEditor = document.querySelector( editorSelector ) as HTMLElement | null;
		const target = previewSurface?.shadowRoot?.querySelector( `[data-builder-node="${ targetNodeId }"]` ) as HTMLElement | null;
		if ( !previewSurface || !inlineEditor || !target ) {
			return undefined;
		}

		const targetRect = target.getBoundingClientRect();
		const editorRect = inlineEditor.getBoundingClientRect();
		const delta = {
			top: Math.abs( editorRect.top - targetRect.top ),
			left: Math.abs( editorRect.left - targetRect.left ),
		};

		return {
			targetRect: {
				top: targetRect.top,
				left: targetRect.left,
				width: targetRect.width,
				height: targetRect.height,
			},
			editorRect: {
				top: editorRect.top,
				left: editorRect.left,
				width: editorRect.width,
				height: editorRect.height,
			},
			delta,
			maxDelta: Math.max( delta.top, delta.left ),
		};
	}, {
		targetNodeId: nodeId,
		previewCssSelector: previewSelector,
		editorSelector: inlineRichTextShellSelector,
	} );
}

export async function switchToEditorPanel( page: Page ) {
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Editor' } ).click();
	await expect( panelBody( page ) ).toContainText( /(Edit|Content|Style|Advanced)/i );
}

export async function switchToElementsPanel( page: Page ) {
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Elements' } ).click();
	await expect( panelBody( page ) ).toContainText( /Elements|Search widgets/i );
}

export async function switchToPageSettingsPanel( page: Page ) {
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Page Settings' } ).click();
	await expect( panelBody( page ) ).toContainText( 'Assignments' );
}

export async function switchToHistoryPanel( page: Page ) {
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'History' } ).click();
	await expect( panelBody( page ) ).toContainText( /revisions/i );
}

export async function switchToGlobalsPanel( page: Page ) {
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Globals' } ).click();
	await expect( panelBody( page ) ).toContainText( /classes/i );
}

export async function switchToMenuPanel( page: Page ) {
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Menu' } ).click();
	await expect( panelBody( page ) ).toContainText( 'Documents' );
}

export async function openCanvasContextMenu( target: Locator ) {
	await expect( target ).toBeVisible();
	await target.scrollIntoViewIfNeeded();
	await target.click( { button: 'right' } );
}

export async function openNavigatorContextMenu( row: Locator ) {
	await expect( row ).toBeVisible();
	await row.scrollIntoViewIfNeeded();
	await row.click( { button: 'right' } );
}

export async function dragElementTileIntoPreview( page: Page, tile: Locator, offset: { x: number; y: number } = { x: 240, y: 220 } ) {
	await expect( tile ).toBeVisible();
	await tile.scrollIntoViewIfNeeded();
	const tileBox = await tile.boundingBox();
	const previewBox = await page.locator( previewSelector ).boundingBox();
	if ( !tileBox || !previewBox ) {
		throw new Error( 'Unable to resolve element tile or preview bounds.' );
	}

	await page.mouse.move( tileBox.x + ( tileBox.width / 2 ), tileBox.y + ( tileBox.height / 2 ) );
	await page.mouse.down();
	await page.mouse.move( tileBox.x + ( tileBox.width / 2 ) + 18, tileBox.y + ( tileBox.height / 2 ) + 14, { steps: 4 } );
	await page.waitForTimeout( 50 );
	await page.mouse.move( previewBox.x + offset.x, previewBox.y + offset.y, { steps: 12 } );
	await page.waitForTimeout( 50 );
	await page.mouse.up();
}

export async function dragElementTileIntoTarget(
	page: Page,
	tile: Locator,
	target: Locator,
	relativePosition: { x?: number; y?: number } = {},
) {
	await expect( tile ).toBeVisible();
	await expect( target ).toBeVisible();
	await tile.scrollIntoViewIfNeeded();
	await target.scrollIntoViewIfNeeded();
	const tileBox = await tile.boundingBox();
	const targetBox = await target.boundingBox();
	if ( !tileBox || !targetBox ) {
		throw new Error( 'Unable to resolve element tile or target bounds.' );
	}

	const targetX = targetBox.x + ( targetBox.width * ( relativePosition.x ?? 0.5 ) );
	const targetY = targetBox.y + ( targetBox.height * ( relativePosition.y ?? 0.5 ) );

	await page.mouse.move( tileBox.x + ( tileBox.width / 2 ), tileBox.y + ( tileBox.height / 2 ) );
	await page.mouse.down();
	await page.mouse.move( tileBox.x + ( tileBox.width / 2 ) + 18, tileBox.y + ( tileBox.height / 2 ) + 14, { steps: 4 } );
	await page.waitForTimeout( 50 );
	await page.mouse.move( targetX, targetY, { steps: 14 } );
	await page.waitForTimeout( 50 );
	await page.mouse.up();
}

export async function beginElementTileDragToTarget(
	page: Page,
	tile: Locator,
	target: Locator,
	relativePosition: { x?: number; y?: number } = {},
) {
	await expect( tile ).toBeVisible();
	await expect( target ).toBeVisible();
	await tile.scrollIntoViewIfNeeded();
	await target.scrollIntoViewIfNeeded();
	const tileBox = await tile.boundingBox();
	const targetBox = await target.boundingBox();
	if ( !tileBox || !targetBox ) {
		throw new Error( 'Unable to resolve element tile or target bounds.' );
	}

	const targetX = targetBox.x + ( targetBox.width * ( relativePosition.x ?? 0.5 ) );
	const targetY = targetBox.y + ( targetBox.height * ( relativePosition.y ?? 0.5 ) );

	await page.mouse.move( tileBox.x + ( tileBox.width / 2 ), tileBox.y + ( tileBox.height / 2 ) );
	await page.mouse.down();
	await page.mouse.move( tileBox.x + ( tileBox.width / 2 ) + 18, tileBox.y + ( tileBox.height / 2 ) + 14, { steps: 4 } );
	await page.waitForTimeout( 50 );
	await page.mouse.move( targetX, targetY, { steps: 14 } );
	await page.waitForTimeout( 50 );
}

export async function dragSelectedNodeGrabToTarget(
	page: Page,
	target: Locator,
	relativePosition: { x?: number; y?: number } = {},
) {
	await beginSelectedNodeGrabDragToTarget( page, target, relativePosition );
	await page.mouse.up();
}

export async function beginSelectedNodeGrabDragToTarget(
	page: Page,
	target: Locator,
	relativePosition: { x?: number; y?: number } = {},
) {
	const grabHandle = page.getByRole( 'button', { name: 'Grab selected node' } );
	await expect( grabHandle ).toBeVisible();
	await expect( target ).toBeVisible();
	await grabHandle.scrollIntoViewIfNeeded();
	await target.scrollIntoViewIfNeeded();

	const handleBox = await grabHandle.boundingBox();
	const targetBox = await target.boundingBox();
	if ( !handleBox || !targetBox ) {
		throw new Error( 'Unable to resolve selected node grab handle or target bounds.' );
	}

	const targetX = targetBox.x + ( targetBox.width * ( relativePosition.x ?? 0.5 ) );
	const targetY = targetBox.y + ( targetBox.height * ( relativePosition.y ?? 0.5 ) );

	await page.mouse.move( handleBox.x + ( handleBox.width / 2 ), handleBox.y + ( handleBox.height / 2 ) );
	await page.mouse.down();
	await page.mouse.move( handleBox.x + ( handleBox.width / 2 ) + 18, handleBox.y + ( handleBox.height / 2 ) + 12, { steps: 4 } );
	await page.waitForTimeout( 50 );
	await page.mouse.move( targetX, targetY, { steps: 14 } );
	await page.waitForTimeout( 50 );
}

export async function dragNavigatorHandleToRow( page: Page, handle: Locator, row: Locator, edge: 'before' | 'after' = 'after' ) {
	const handleBox = await handle.boundingBox();
	const rowBox = await row.boundingBox();
	if ( !handleBox || !rowBox ) {
		throw new Error( 'Unable to resolve navigator handle or row bounds.' );
	}

	const targetY = edge === 'before'
		? rowBox.y + Math.max( 6, rowBox.height * 0.25 )
		: rowBox.y + Math.max( rowBox.height - 6, rowBox.height * 0.75 );

	await page.mouse.move( handleBox.x + ( handleBox.width / 2 ), handleBox.y + ( handleBox.height / 2 ) );
	await page.mouse.down();
	await page.mouse.move( handleBox.x + ( handleBox.width / 2 ) + 18, handleBox.y + ( handleBox.height / 2 ) + 12, { steps: 4 } );
	await page.mouse.move( rowBox.x + 28, targetY, { steps: 12 } );
	await page.mouse.up();
}

export async function beginNavigatorHandleDragToTarget(
	page: Page,
	handle: Locator,
	target: Locator,
	relativePosition: { x?: number; y?: number } = {},
) {
	await expect( handle ).toBeVisible();
	await expect( target ).toBeVisible();
	await handle.scrollIntoViewIfNeeded();
	await target.scrollIntoViewIfNeeded();

	const handleBox = await handle.boundingBox();
	const targetBox = await target.boundingBox();
	if ( !handleBox || !targetBox ) {
		throw new Error( 'Unable to resolve navigator handle or preview target bounds.' );
	}

	const targetX = targetBox.x + ( targetBox.width * ( relativePosition.x ?? 0.5 ) );
	const targetY = targetBox.y + ( targetBox.height * ( relativePosition.y ?? 0.5 ) );

	await page.mouse.move( handleBox.x + ( handleBox.width / 2 ), handleBox.y + ( handleBox.height / 2 ) );
	await page.mouse.down();
	await page.mouse.move( handleBox.x + ( handleBox.width / 2 ) + 18, handleBox.y + ( handleBox.height / 2 ) + 12, { steps: 4 } );
	await page.waitForTimeout( 50 );
	await page.mouse.move( targetX, targetY, { steps: 14 } );
	await page.waitForTimeout( 50 );
}
