import assert from 'node:assert/strict';

import { chromium, type Locator, type Page } from '@playwright/test';

import {
	buildReleaseValidationUrl,
	releaseValidationFixtureCases,
	releaseValidationFlowChecklist,
	releaseValidationPerfCounters,
	type ReleaseValidationFixture,
} from '../apps/reference-studio/src/lib/release-validation';

type BuilderPerfSnapshot = Partial<Record<( typeof releaseValidationPerfCounters )[number], number>>;

type ReleaseValidationOptions = {
	baseUrl: string;
	headed: boolean;
	fixture?: ReleaseValidationFixture;
};

type ReleaseValidationResult = {
	fixture: ReleaseValidationFixture;
	url: string;
	nodeCount: number;
	before: BuilderPerfSnapshot;
	after: BuilderPerfSnapshot;
	delta: BuilderPerfSnapshot;
};

const PREVIEW_SELECTOR = '[data-builder-preview-surface="true"]';
const INLINE_EDITOR_SELECTOR = '[data-inline-rich-text-root="true"]';

async function main() {
	const options = parseOptions( process.argv.slice( 2 ) );
	const targetFixtures = options.fixture
		? releaseValidationFixtureCases.filter( ( entry ) => entry.fixture === options.fixture )
		: releaseValidationFixtureCases;

	const browser = await chromium.launch( {
		headless: !options.headed,
	} );
	const context = await browser.newContext( {
		viewport: { width: 1600, height: 960 },
	} );

	await context.route( '**/api/projects/**', async ( route ) => {
		await route.fulfill( {
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify( { ok: true, persisted: false } ),
		} );
	} );

	try {
		const results: ReleaseValidationResult[] = [];
		for ( const fixtureCase of targetFixtures ) {
			results.push( await runReleaseValidationFixture( context.newPage.bind( context ), options.baseUrl, fixtureCase.fixture, fixtureCase.minimumNodes ) );
		}

		console.log( 'V3 release validation harness complete.\n' );
		console.log( `Base URL: ${ options.baseUrl }` );
		console.log( `Flows: ${ releaseValidationFlowChecklist.join( ' -> ' ) }\n` );
		console.log( JSON.stringify( results, null, 2 ) );
	} finally {
		await context.close();
		await browser.close();
	}
}

async function runReleaseValidationFixture(
	createPage: () => Promise<Page>,
	baseUrl: string,
	fixture: ReleaseValidationFixture,
	minimumNodes: number,
): Promise<ReleaseValidationResult> {
	const page = await createPage();
	const url = buildReleaseValidationUrl( baseUrl, fixture );

	try {
		await page.goto( url );
		await page.waitForLoadState( 'networkidle' );
		await page.getByRole( 'button', { name: 'Responsive', exact: true } ).waitFor( { state: 'visible' } );
		await page.getByRole( 'button', { name: 'Hide Structure' } ).waitFor( { state: 'visible' } );
		await page.locator( PREVIEW_SELECTOR ).waitFor( { state: 'visible' } );
		await page.getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ).waitFor( { state: 'visible' } );

		const nodeCount = await page.locator( PREVIEW_SELECTOR ).locator( '[data-builder-node]' ).count();
		assert.ok( nodeCount >= minimumNodes, `Expected ${ fixture } to render at least ${ minimumNodes } nodes, received ${ nodeCount }.` );

		const before = await readPerfSnapshot( page );
		await exerciseReleaseValidationFlow( page );
		const after = await readPerfSnapshot( page );

		assert.equal( after.geometryFallbackSnapshots ?? 0, before.geometryFallbackSnapshots ?? 0, `${ fixture } scheduled an unexpected fallback geometry snapshot during the validation flow.` );
		assert.equal( after.engineDragPointerDispatches ?? 0, before.engineDragPointerDispatches ?? 0, `${ fixture } unexpectedly dispatched engine drag pointer updates during the validation flow.` );
		assert.ok( ( after.candidateResolutionCount ?? 0 ) > ( before.candidateResolutionCount ?? 0 ), `${ fixture } did not advance candidate resolution during drag.` );

		return {
			fixture,
			url,
			nodeCount,
			before,
			after,
			delta: diffPerfSnapshots( before, after ),
		};
	} finally {
		await page.close();
	}
}

async function exerciseReleaseValidationFlow( page: Page ) {
	const previewSurface = page.locator( PREVIEW_SELECTOR );
	await page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Elements' } ).click();
	await page.getByLabel( 'Element palette' ).waitFor( { state: 'visible' } );
	const layoutCategory = page.locator( '.elements-panel__categories button' ).filter( { hasText: 'Layout' } ).first();
	await layoutCategory.click();

	const paletteTile = page.locator( '.elements-panel__group' ).first().locator( '.elements-panel__tile' ).first();
	const emptyContainerTarget = previewSurface.locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' ).first();
	await paletteTile.scrollIntoViewIfNeeded();
	await emptyContainerTarget.scrollIntoViewIfNeeded();
	await dragHandleToTarget( page, paletteTile, emptyContainerTarget, { x: 0.52, y: 0.52 } );
	await page.mouse.up();

	const editableParagraph = previewSurface.getByText(
		'This fixture uses named slots for status, supporting rail content, and action groups instead of forcing everything into children.',
		{ exact: true },
	);
	await editableParagraph.dblclick( { force: true } );
	await page.locator( INLINE_EDITOR_SELECTOR ).waitFor( { state: 'visible' } );

	await previewSurface.evaluate( ( element ) => {
		const previewScrollContainer = ( element as HTMLElement ).shadowRoot?.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;
		if ( !previewScrollContainer ) {
			return;
		}

		const maxScroll = Math.max( 0, previewScrollContainer.scrollHeight - previewScrollContainer.clientHeight );
		previewScrollContainer.scrollTo( 0, Math.min( maxScroll, 180 ) );
	} );

	await page.getByRole( 'button', { name: 'Responsive', exact: true } ).click();
	await page.getByRole( 'toolbar', { name: 'Preview devices' } ).getByRole( 'button', { name: /tablet/i } ).first().click();

	await page.getByRole( 'button', { name: 'Dock Structure', exact: true } ).click();
	await page.getByRole( 'button', { name: 'Float Structure', exact: true } ).waitFor( { state: 'visible' } );
	await page.getByRole( 'button', { name: 'Float Structure', exact: true } ).click();
	await page.getByRole( 'button', { name: 'Dock Structure', exact: true } ).waitFor( { state: 'visible' } );

	await page.waitForTimeout( 250 );
	await page.evaluate( () => {
		( window as Window & { __builderEditor?: { dispatch?: ( command: { type: string } ) => void } } ).__builderEditor?.dispatch?.( {
			type: 'document/ui/stop-inline-edit',
		} );
	} );
	await page.locator( INLINE_EDITOR_SELECTOR ).waitFor( { state: 'hidden' } );
}

async function dragHandleToTarget(
	page: Page,
	handle: Locator,
	target: Locator,
	relativePosition: { x: number; y: number },
) {
	await handle.waitFor( { state: 'visible' } );
	await target.waitFor( { state: 'visible' } );

	const handleBox = await handle.boundingBox();
	const targetBox = await target.boundingBox();
	assert.ok( handleBox, 'Unable to resolve the selected node grab handle bounds.' );
	assert.ok( targetBox, 'Unable to resolve the target container bounds.' );

	const startX = handleBox.x + ( handleBox.width / 2 );
	const startY = handleBox.y + ( handleBox.height / 2 );
	const targetX = targetBox.x + ( targetBox.width * relativePosition.x );
	const targetY = targetBox.y + ( targetBox.height * relativePosition.y );

	await page.mouse.move( startX, startY );
	await page.mouse.down();
	await page.mouse.move( startX + 18, startY + 12, { steps: 4 } );
	await page.waitForTimeout( 50 );
	await page.mouse.move( targetX, targetY, { steps: 14 } );
	await page.waitForTimeout( 50 );
}

async function readPerfSnapshot( page: Page ): Promise<BuilderPerfSnapshot> {
	return page.evaluate( ( counters ) => {
		const perf = ( window as Window & { __builderPerf?: Record<string, number> } ).__builderPerf ?? {};
		return Object.fromEntries( counters.map( ( counter ) => [ counter, typeof perf[ counter ] === 'number' ? perf[ counter ] : 0 ] ) );
	}, [ ...releaseValidationPerfCounters ] ) as Promise<BuilderPerfSnapshot>;
}

function diffPerfSnapshots( before: BuilderPerfSnapshot, after: BuilderPerfSnapshot ): BuilderPerfSnapshot {
	return Object.fromEntries(
		releaseValidationPerfCounters.map( ( counter ) => [
			counter,
			( after[ counter ] ?? 0 ) - ( before[ counter ] ?? 0 ),
		] ),
	) as BuilderPerfSnapshot;
}

function parseOptions( argv: string[] ): ReleaseValidationOptions {
	return {
		baseUrl: readOption( argv, '--base-url' ) ?? process.env.BUILDER_RELEASE_BASE_URL ?? 'http://127.0.0.1:4173',
		headed: argv.includes( '--headed' ),
		fixture: readFixtureOption( readOption( argv, '--fixture' ) ),
	};
}

function readOption( argv: string[], name: string ): string | undefined {
	const optionIndex = argv.indexOf( name );
	if ( optionIndex === -1 ) {
		return undefined;
	}

	return argv[ optionIndex + 1 ];
}

function readFixtureOption( value: string | undefined ): ReleaseValidationFixture | undefined {
	if ( value === 'dense-200' || value === 'dense-500' ) {
		return value;
	}

	return undefined;
}

void main().catch( ( error ) => {
	const message = error instanceof Error ? error.message : String( error );
	if ( message.includes( 'ERR_CONNECTION_REFUSED' ) ) {
		console.error( `${ message }\n\nStart the reference studio preview first, for example:\n  pnpm --filter @builder/reference-studio preview --host 127.0.0.1 --port 4173` );
		process.exitCode = 1;
		return;
	}

	console.error( message );
	process.exitCode = 1;
} );
