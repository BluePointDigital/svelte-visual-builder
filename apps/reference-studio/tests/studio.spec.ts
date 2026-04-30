import { expect, test, type Locator, type Page } from '@playwright/test';

import {
	openCanvasContextMenu,
	openNavigatorContextMenu,
	dragElementTileIntoPreview,
	dragElementTileIntoTarget,
	dragPaletteTileByNameIntoPreview,
	dragSelectedNodeGrabToTarget,
	beginElementTileDragToTarget,
	beginNavigatorHandleDragToTarget,
	beginSelectedNodeGrabDragToTarget,
	contextMenuSurface,
	loadBuilderShell,
	inlineRichTextEditor,
	inlineRichTextEditorRoot,
	inlineRichTextShell,
	inspectorTabs,
	measureInlineEditorAlignment,
	measurePreviewOverlayAlignment,
	measureCanvasScrollBehavior,
	measurePageHeight,
	readBuilderPerf,
	readPreviewRootChildCount,
	readPreviewRootChildIds,
	readStudioShellFlags,
	panelContainer,
	elementsPanel,
	navigatorRows,
	panelBody,
	navigatorFloatingPanel,
	previewSelector,
	previewFrame,
	scrollPreviewFrameWindow,
	switchResponsiveViewport,
	switchToGlobalsPanel,
	switchToHistoryPanel,
	switchToEditorPanel,
	switchToElementsPanel,
	switchToMenuPanel,
	switchToPageSettingsPanel,
} from './studio-helpers';

async function selectPrimaryContainerForInspector( page: Page ) {
	const containerRow = navigatorRows( page ).first();
	await containerRow.click();
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Container/i );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 0 ).click();
}

async function readDirectChildNodeIds( container: Locator ): Promise<string[]> {
	return container.evaluate( ( element ) => [ ...( element.querySelectorAll( ':scope > [data-builder-node]' ) as NodeListOf<HTMLElement> ) ]
		.map( ( child ) => child.getAttribute( 'data-builder-node' ) ?? '' )
		.filter( Boolean ) );
}

async function readPreviewContainerIds( page: Page ): Promise<string[]> {
	return previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).evaluateAll( ( elements ) => elements
		.map( ( element ) => element.getAttribute( 'data-builder-node' ) ?? '' )
		.filter( Boolean ) );
}

async function dragNewContainerIntoPreviewAndReadId( page: Page, tile: Locator, offset: { x: number; y: number } = { x: 20, y: 220 } ): Promise<string> {
	const beforeIds = new Set( await readPreviewContainerIds( page ) );
	await dragElementTileIntoPreview( page, tile, offset );
	await expect.poll( async () => {
		const afterIds = await readPreviewContainerIds( page );
		return afterIds.find( ( id ) => !beforeIds.has( id ) ) ?? '';
	} ).not.toBe( '' );
	const afterIds = await readPreviewContainerIds( page );
	return afterIds.find( ( id ) => !beforeIds.has( id ) ) ?? '';
}

async function dragNewContainerIntoTargetAndReadId(
	page: Page,
	tile: Locator,
	target: Locator,
	relativePosition: { x?: number; y?: number } = { x: 0.55, y: 0.55 },
): Promise<string> {
	const beforeIds = new Set( await readPreviewContainerIds( page ) );
	await dragElementTileIntoTarget( page, tile, target, relativePosition );
	await expect.poll( async () => {
		const afterIds = await readPreviewContainerIds( page );
		return afterIds.find( ( id ) => !beforeIds.has( id ) ) ?? '';
	} ).not.toBe( '' );
	const afterIds = await readPreviewContainerIds( page );
	return afterIds.find( ( id ) => !beforeIds.has( id ) ) ?? '';
}

async function selectNodeById( page: Page, nodeId: string ) {
	await page.evaluate( ( selectedNodeId ) => {
		( window as Window & { __builderEditor?: { engine?: { dispatch: ( command: unknown ) => void } } } ).__builderEditor?.engine?.dispatch( {
			type: 'document/ui/select-node',
			nodeId: selectedNodeId,
		} );
	}, nodeId );
}

test( 'the studio shell boundary resolves production to the V3 shell by default', async ( { page } ) => {
	await loadBuilderShell( page );

	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-shell-variant', 'v3' );
	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-interaction-core-v3', 'true' );
	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-canvas-interaction-v2', 'true' );
	await expect( page.locator( '.studio-host' ) ).toHaveAttribute( 'data-navigator-virtualization', 'true' );
	const shellFlags = await readStudioShellFlags( page );
	expect( shellFlags ).toMatchObject( {
		canvasInteractionV2: true,
		interactionCoreV3: true,
		navigatorVirtualization: true,
		shellVariant: 'v3',
	} );
} );

test( 'reference studio renders the builder shell and editor chrome', async ( { page } ) => {
	await loadBuilderShell( page );

	await expect( page.getByRole( 'button', { name: 'Responsive', exact: true } ) ).toBeVisible();
	await expect( page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Elements' } ) ).toBeVisible();
	await expect( page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Editor' } ) ).toBeVisible();
	await expect( page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Page Settings' } ) ).toBeVisible();
	await expect( page.getByRole( 'button', { name: 'Hide Structure' } ) ).toBeVisible();
	await expect( page.getByTitle( 'Builder preview' ) ).toBeVisible();
	await expect( navigatorFloatingPanel( page ) ).toBeVisible();
} );

test( 'reference persistence can save drafts, publish, and list revisions', async ( { page } ) => {
	await loadBuilderShell( page );

	await page.getByRole( 'banner' ).getByRole( 'button', { name: 'Save Draft' } ).click();
	await expect( page.locator( '.builder-shell__save-state--saved' ).first() ).toBeVisible();

	await switchToHistoryPanel( page );
	await expect( panelBody( page ) ).toContainText( /Saved draft/i );
	await panelBody( page ).getByRole( 'button', { name: 'Publish' } ).click();
	await expect( panelBody( page ).locator( '.revision-panel__save-state--published' ) ).toBeVisible();
	await expect( panelBody( page ) ).toContainText( /Published/i );
} );

test( 'editor panel polish keeps chrome scannable without horizontal overflow', async ( { page } ) => {
	await loadBuilderShell( page );

	const panelMetrics = await page.locator( '.builder-shell__panel-surface' ).evaluate( ( element ) => ( {
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
		background: getComputedStyle( element ).backgroundColor,
	} ) );
	expect( panelMetrics.scrollWidth ).toBeLessThanOrEqual( panelMetrics.clientWidth + 1 );
	expect( panelMetrics.background ).not.toBe( 'rgba(0, 0, 0, 0)' );

	await navigatorRows( page ).first().click();
	const editorTab = page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Editor' } );
	await expect( editorTab ).toHaveClass( /active/ );
	const tabStyles = await editorTab.evaluate( ( element ) => {
		const active = getComputedStyle( element );
		const inactiveElement = element.parentElement?.querySelector( 'button:not(.active)' );
		const inactive = inactiveElement ? getComputedStyle( inactiveElement ) : active;
		return {
			activeBackground: active.backgroundColor,
			activeShadow: active.boxShadow,
			inactiveBackground: inactive.backgroundColor,
		};
	} );
	expect( tabStyles.activeBackground ).not.toBe( tabStyles.inactiveBackground );
	expect( tabStyles.activeShadow ).toContain( 'rgb' );

	const firstRow = navigatorRows( page ).first();
	await firstRow.hover();
	const actionMetrics = await navigatorFloatingPanel( page ).locator( '.navigator__actions' ).first().evaluate( ( element ) => ( {
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
		display: getComputedStyle( element ).display,
	} ) );
	expect( actionMetrics.display ).toBe( 'flex' );
	expect( actionMetrics.scrollWidth ).toBeLessThanOrEqual( actionMetrics.clientWidth + 1 );
} );

test( 'AI dropdown saves settings and creates builder nodes from streamed tool calls', async ( { page } ) => {
	let aiCallCount = 0;
	await page.route( 'https://mock-ai.test/v1/chat/completions', async ( route ) => {
		aiCallCount += 1;
		const body = aiCallCount === 1
			? aiSseBody( {
				choices: [ {
					delta: {
						tool_calls: [ {
							index: 0,
							id: 'call_1',
							type: 'function',
							function: {
								name: 'add_section_from_html',
								arguments: JSON.stringify( {
									summary: 'AI: Create e2e hero',
									title: 'AI E2E Hero',
									css: '.ai-e2e-hero { background: orange; padding: 3rem; }',
									html: '<section class="ai-e2e-hero"><h1>AI E2E Hero</h1><p>Created by the assistant with editable copy.</p><a href="#">Start now</a></section>',
								} ),
							},
						} ],
					},
					finish_reason: 'tool_calls',
				} ],
			} )
			: aiSseBody( {
				choices: [ {
					delta: { content: 'Done.' },
					finish_reason: 'stop',
				} ],
			} );
		await route.fulfill( {
			status: 200,
			contentType: 'text/event-stream',
			body,
		} );
	} );
	await loadBuilderShell( page );

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: 'Settings' } ).click();
	await page.getByLabel( 'API endpoint' ).fill( 'https://mock-ai.test/v1' );
	await page.getByLabel( 'Model name' ).fill( 'mock-model' );
	await page.getByLabel( 'API key' ).fill( 'test-key' );
	await page.getByRole( 'button', { name: 'Save Settings' } ).click();

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: '+ Create with AI' } ).click();
	await page.getByLabel( 'What would you like to create?' ).fill( 'Create a small hero section for the AI E2E test.' );
	await page.getByRole( 'button', { name: 'Generate' } ).click();

	await expect( previewFrame( page ).getByRole( 'heading', { name: 'AI E2E Hero' } ) ).toBeVisible();
	await expect( previewFrame( page ).getByText( 'Created by the assistant with editable copy.' ) ).toBeVisible();
	expect( aiCallCount ).toBeGreaterThanOrEqual( 2 );
} );

test( 'Edit with AI applies semantic visual style tools with debug output', async ( { page } ) => {
	let aiCallCount = 0;
	let targetNodeId = '';
	await page.route( 'https://mock-ai.test/v1/chat/completions', async ( route ) => {
		aiCallCount += 1;
		const requestBody = route.request().postDataJSON() as { messages?: Array<{ content?: string }> } | null;
		const systemContext = requestBody?.messages?.find( ( message ) => typeof message.content === 'string' && message.content.includes( 'Nearby editable structure' ) )?.content ?? '';
		targetNodeId ||= /\\"id\\":\\"([^"]+)\\",\\"type\\":\\"container\\"/.exec( systemContext )?.[ 1 ] ?? '';
		const body = aiCallCount === 1
			? aiSseBody( {
				choices: [ {
					delta: {
						tool_calls: [ {
							index: 0,
							id: 'call_semantic_style',
							type: 'function',
							function: {
								name: 'improve_section_visual_style',
								arguments: JSON.stringify( {
									targetNodeId,
									backgroundColor: '#fff7ed',
									primaryColor: '#f97316',
									textColor: '#111827',
									style: 'premium',
								} ),
							},
						} ],
					},
					finish_reason: 'tool_calls',
				} ],
			} )
			: aiSseBody( {
				choices: [ {
					delta: { content: 'Updated the selected section.' },
					finish_reason: 'stop',
				} ],
			} );
		await route.fulfill( { status: 200, contentType: 'text/event-stream', body } );
	} );
	await loadBuilderShell( page );
	await saveMockAiSettings( page, true );
	targetNodeId = await page.evaluate( () => {
		const editor = ( window as Window & { __builderEditor?: { engine: { getState: () => { activeDocumentId: string; project: { documents: Array<{ id: string; root: Array<{ id: string }> }> } } } } } ).__builderEditor;
		const state = editor?.engine.getState();
		return state?.project.documents.find( ( document ) => document.id === state.activeDocumentId )?.root[ 0 ]?.id ?? '';
	} );
	await page.evaluate( ( nodeId ) => {
		( window as Window & { __builderEditor?: { engine: { dispatch: ( command: unknown ) => void } } } ).__builderEditor?.engine.dispatch( {
			type: 'document/ui/select-node',
			nodeId,
		} );
	}, targetNodeId );

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: 'Edit with AI' } ).click();
	await page.getByLabel( 'Edit with AI chat' ).getByPlaceholder( 'Describe the changes you want to make...' ).fill( 'Make this section more beautiful.' );
	await page.getByRole( 'button', { name: 'Send' } ).click();

	await expect.poll( () => aiCallCount ).toBeGreaterThanOrEqual( 2 );
	await expect.poll( async () => page.evaluate( ( nodeId ) => {
		const editor = ( window as Window & { __builderEditor?: { engine: { getState: () => { activeDocumentId: string; project: { documents: Array<{ id: string; root: Array<{ id: string; styles?: { base?: Record<string, unknown> }; children?: unknown[] }> }> } } } } } ).__builderEditor;
		const findNode = ( nodes: Array<{ id: string; styles?: { base?: Record<string, unknown> }; children?: unknown[] }> ): Record<string, unknown> | undefined => {
			for ( const node of nodes ) {
				if ( node.id === nodeId ) return node.styles?.base;
				const childResult = findNode( ( node.children ?? [] ) as Array<{ id: string; styles?: { base?: Record<string, unknown> }; children?: unknown[] }> );
				if ( childResult ) return childResult;
			}
			return undefined;
		};
		const state = editor?.engine.getState();
		const document = state?.project.documents.find( ( entry ) => entry.id === state.activeDocumentId );
		return document ? findNode( document.root )?.backgroundColor : undefined;
	}, targetNodeId ) ).toBe( '#fff7ed' );
	await expect( page.locator( '.builder-shell__ai-message' ).filter( { hasText: 'Sent to model' } ).first() ).toBeVisible();
	await expect( page.locator( '.builder-shell__ai-message' ).filter( { hasText: 'Builder parsed/applied improve_section_visual_style' } ).first() ).toBeVisible();
} );

test( 'Create with AI sparse response shows diagnostic without mutating', async ( { page } ) => {
	let aiCallCount = 0;
	await page.route( 'https://mock-ai.test/v1/chat/completions', async ( route ) => {
		aiCallCount += 1;
		const body = aiCallCount === 1
			? aiSseBody( {
				choices: [ {
					delta: {
						tool_calls: [ {
							index: 0,
							id: 'call_sparse_html',
							type: 'function',
							function: {
								name: 'add_section_from_html',
								arguments: JSON.stringify( { html: '<h1>Nice</h1>' } ),
							},
						} ],
					},
					finish_reason: 'tool_calls',
				} ],
			} )
			: aiSseBody( { choices: [ { delta: { content: 'I need a richer section.' }, finish_reason: 'stop' } ] } );
		await route.fulfill( { status: 200, contentType: 'text/event-stream', body } );
	} );
	await loadBuilderShell( page );
	await saveMockAiSettings( page );
	const beforeRootCount = await readPreviewRootChildCount( page );

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: '+ Create with AI' } ).click();
	await page.getByLabel( 'What would you like to create?' ).fill( 'Create a premium restaurant hero.' );
	await page.getByRole( 'button', { name: 'Generate' } ).click();

	await expect.poll( () => aiCallCount ).toBeGreaterThanOrEqual( 2 );
	await expect.poll( async () => readPreviewRootChildCount( page ) ).toBe( beforeRootCount );
	await expect( page.locator( '.builder-shell__html-import-status--error' ) ).toContainText( 'Low detail generation' );
} );

test( 'AI bad Builder JSON does not crash the preview or mutate the page', async ( { page } ) => {
	let aiCallCount = 0;
	await page.route( 'https://mock-ai.test/v1/chat/completions', async ( route ) => {
		aiCallCount += 1;
		const body = aiCallCount === 1
			? aiSseBody( {
				choices: [ {
					delta: {
						tool_calls: [ {
							index: 0,
							id: 'call_bad_heading',
							type: 'function',
							function: {
								name: 'create_node_batch',
								arguments: JSON.stringify( {
									nodes: [ { type: 'heading', props: { text: 'Bad Heading', level: 'h' } } ],
								} ),
							},
						} ],
					},
					finish_reason: 'tool_calls',
				} ],
			} )
			: aiSseBody( {
				choices: [ {
					delta: { content: 'I could not apply that invalid heading.' },
					finish_reason: 'stop',
				} ],
			} );
		await route.fulfill( {
			status: 200,
			contentType: 'text/event-stream',
			body,
		} );
	} );
	await loadBuilderShell( page );
	const beforeRootCount = await readPreviewRootChildCount( page );

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: 'Settings' } ).click();
	await page.getByLabel( 'API endpoint' ).fill( 'https://mock-ai.test/v1' );
	await page.getByLabel( 'Model name' ).fill( 'mock-model' );
	await page.getByLabel( 'API key' ).fill( 'test-key' );
	await page.getByRole( 'button', { name: 'Save Settings' } ).click();

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: '+ Create with AI' } ).click();
	await page.getByLabel( 'What would you like to create?' ).fill( 'Create a heading with invalid level.' );
	await page.getByRole( 'button', { name: 'Generate' } ).click();

	await expect.poll( () => aiCallCount ).toBeGreaterThanOrEqual( 2 );
	await expect( previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ) ).toBeVisible();
	await expect.poll( async () => readPreviewRootChildCount( page ) ).toBe( beforeRootCount );
} );

test( 'Edit with AI mode can return to the normal builder panel', async ( { page } ) => {
	await loadBuilderShell( page );

	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: 'Edit with AI' } ).click();

	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( 'Edit with AI' );
	await expect( page.getByLabel( 'Edit with AI chat' ) ).toBeVisible();
	await expect.poll( async () => {
		return page.locator( '.builder-shell__panel' ).boundingBox()
			.then( async ( panelBox ) => {
				const dockBox = await page.getByLabel( 'Edit with AI chat' ).boundingBox();
				return panelBox && dockBox ? dockBox.x >= panelBox.x + panelBox.width - 1 : false;
			} );
	} ).toBe( true );

	await page.getByRole( 'button', { name: 'Exit AI', exact: true } ).click();

	await expect( page.getByLabel( 'Edit with AI chat' ) ).toHaveCount( 0 );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).not.toHaveText( 'Edit with AI' );
	await expect( page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Editor' } ) ).toBeVisible();
} );

test( 'clicking a preview heading draws a selection overlay and action rail', async ( { page } ) => {
	await loadBuilderShell( page );

	await previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ).click( { force: true } );

	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Heading/i );
	await expect( page.locator( '.builder-preview__action-rail' ) ).toBeVisible();
	await expect( page.locator( '.builder-preview__action-label' ) ).toContainText( 'Heading' );
	await expect( page.locator( '.builder-preview__action-rail' ).getByRole( 'button', { name: 'Edit' } ) ).toBeVisible();
	await expect( page.locator( '.builder-preview__action-rail' ).getByRole( 'button', { name: 'Grab' } ) ).toBeVisible();
	await expect( page.locator( '.builder-preview__action-rail' ).getByRole( 'button', { name: 'Duplicate' } ) ).toBeVisible();
	await expect( page.locator( '.builder-preview__action-rail' ).getByRole( 'button', { name: 'Delete' } ) ).toBeVisible();
} );

test( 'selected containers expose layout overlays and a direct gap handle', async ( { page } ) => {
	await loadBuilderShell( page );
	await navigatorRows( page ).first().click();

	const overlay = page.locator( '.builder-preview__layout-overlay' );
	await expect( overlay ).toBeVisible();
	await expect( overlay.locator( '.builder-preview__layout-label' ) ).toContainText( /Row|Column|Grid/ );
	await expect( overlay.locator( '.builder-preview__layout-label' ) ).toContainText( /Gap/ );

	const handle = page.locator( '[data-layout-gap-handle="true"]' );
	const box = await handle.boundingBox();
	if ( !box ) {
		throw new Error( 'Unable to locate the layout gap handle.' );
	}

	await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2 );
	await page.mouse.down();
	await page.mouse.move( box.x + box.width / 2 + 48, box.y + box.height / 2 + 48, { steps: 6 } );
	await page.mouse.up();

	await expect( overlay.locator( '.builder-preview__layout-label' ) ).toContainText( /Gap (?!0px)/ );
} );

test( 'inspector direction changes are reflected in the selected layout overlay', async ( { page } ) => {
	await loadBuilderShell( page );
	await navigatorRows( page ).first().click();
	await switchToEditorPanel( page );

	await page.locator( '.primitive-control' ).filter( { hasText: 'Direction' } ).getByRole( 'button', { name: 'Column', exact: true } ).click();
	await expect( page.locator( '.builder-preview__layout-label' ) ).toContainText( 'Column' );

	await page.locator( '.primitive-control' ).filter( { hasText: 'Direction' } ).getByRole( 'button', { name: 'Row', exact: true } ).click();
	await expect( page.locator( '.builder-preview__layout-label' ) ).toContainText( 'Row' );
} );

test( 'grid containers show grid layout overlay without blocking action rail controls', async ( { page } ) => {
	await loadBuilderShell( page );
	await navigatorRows( page ).first().click();
	await switchToEditorPanel( page );
	await page.locator( '.primitive-control' ).filter( { hasText: 'Container Layout' } ).getByRole( 'combobox' ).selectOption( 'grid' );

	await expect( page.locator( '.builder-preview__layout-overlay[data-layout-display="grid"]' ) ).toBeVisible();
	await expect( page.locator( '.builder-preview__layout-grid-lines' ) ).toBeVisible();
	await expect( page.getByRole( 'button', { name: 'Grab selected node' } ) ).toBeVisible();

	await page.locator( '.builder-preview__action-rail' ).getByRole( 'button', { name: 'Edit' } ).click();
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Container/i );
} );

test( 'the selected overlay stays aligned while the preview surface scrolls', async ( { page } ) => {
	await loadBuilderShell( page );

	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	await heading.click( { force: true } );

	const nodeId = await heading.evaluate( ( element ) => element.closest( '[data-builder-node]' )?.getAttribute( 'data-builder-node' ) );
	if ( !nodeId ) {
		throw new Error( 'Unable to resolve the selected preview node id.' );
	}

	await expect.poll( async () => ( await measurePreviewOverlayAlignment( page, nodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1 );
	const targetScrollTop = await page.locator( '[data-builder-preview-surface="true"]' ).evaluate( ( element, targetNodeId ) => {
		const previewSurface = element as HTMLElement;
		const previewScrollContainer = previewSurface.shadowRoot?.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;
		const target = previewSurface.shadowRoot?.querySelector( `[data-builder-node="${ targetNodeId }"]` ) as HTMLElement | null;
		if ( !previewScrollContainer || !target ) {
			return 0;
		}

		const maxScroll = Math.max( 0, previewScrollContainer.scrollHeight - previewScrollContainer.clientHeight );
		const targetTop = target.offsetTop;
		return Math.min( maxScroll, Math.max( 40, targetTop - 80 ) );
	}, nodeId );

	await scrollPreviewFrameWindow( page, targetScrollTop );
	await expect.poll( async () => ( await measurePreviewOverlayAlignment( page, nodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );
} );

test( 'heading inline editing commits plain text and closes on blur outside the editor', async ( { page } ) => {
	await loadBuilderShell( page );

	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	await heading.dblclick( { force: true } );

	const inlineEditorRoot = inlineRichTextEditorRoot( page );
	const editor = inlineRichTextEditor( page );
	await expect( inlineEditorRoot ).toBeVisible();

	await editor.click();
	await page.keyboard.press( 'Control+A' );
	await page.keyboard.type( 'Heading inline edit updated' );
	await page.locator( '.builder-shell__panel-header' ).click();

	await expect.poll( async () => inlineEditorRoot.count() ).toBe( 0 );
	const updatedHeading = previewFrame( page ).locator( '[data-builder-node][data-builder-type="heading"]' ).filter( { hasText: 'Heading inline edit updated' } ).first();
	await expect.poll( async () => updatedHeading.count() ).toBeGreaterThan( 0 );
	await expect( updatedHeading ).toBeVisible();
	await expect( updatedHeading ).toHaveText( 'Heading inline edit updated' );
	const headingHtml = await updatedHeading.evaluate( ( element ) => element.innerHTML );
	expect( headingHtml ).not.toContain( '<strong>' );
} );

test( 'paragraph inline editing stays aligned through scroll and dock changes and keeps rich formatting on commit', async ( { page } ) => {
	await loadBuilderShell( page );

	const paragraph = previewFrame( page ).getByText( 'This fixture uses named slots for status, supporting rail content, and action groups instead of forcing everything into children.' );
	await paragraph.dblclick( { force: true } );

	const paragraphNodeId = await paragraph.evaluate( ( element ) => element.closest( '[data-builder-node]' )?.getAttribute( 'data-builder-node' ) );
	if ( !paragraphNodeId ) {
		throw new Error( 'Unable to resolve the paragraph node id for inline editing.' );
	}

	const inlineEditorRoot = inlineRichTextEditorRoot( page );
	const editor = inlineRichTextEditor( page );
	const toolbar = inlineEditorRoot.locator( '.inline-rich-text__toolbar' );
	await expect( inlineEditorRoot ).toBeVisible();
	await expect.poll( async () => ( await measureInlineEditorAlignment( page, paragraphNodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );

	const targetScrollTop = await page.locator( '[data-builder-preview-surface="true"]' ).evaluate( ( element, targetNodeId ) => {
		const previewSurface = element as HTMLElement;
		const previewScrollContainer = previewSurface.shadowRoot?.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;
		const target = previewSurface.shadowRoot?.querySelector( `[data-builder-node="${ targetNodeId }"]` ) as HTMLElement | null;
		if ( !previewScrollContainer || !target ) {
			return 0;
		}

		const maxScroll = Math.max( 0, previewScrollContainer.scrollHeight - previewScrollContainer.clientHeight );
		return Math.min( maxScroll, Math.max( 48, target.offsetTop - 72 ) );
	}, paragraphNodeId );

	await scrollPreviewFrameWindow( page, targetScrollTop );
	await expect.poll( async () => ( await measureInlineEditorAlignment( page, paragraphNodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );

	await page.getByRole( 'button', { name: 'Hide Structure', exact: true } ).click();
	await expect( inlineRichTextShell( page ) ).toBeVisible();
	await expect.poll( async () => ( await measureInlineEditorAlignment( page, paragraphNodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );

	await page.getByRole( 'button', { name: 'Show Structure', exact: true } ).click();
	await expect.poll( async () => ( await measureInlineEditorAlignment( page, paragraphNodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );

	await editor.click();
	await page.keyboard.press( 'Control+A' );
	await page.keyboard.type( 'Paragraph inline edit updated' );
	await page.keyboard.press( 'Control+A' );
	await toolbar.getByRole( 'button', { name: 'Bold' } ).first().click();
	await page.locator( '.builder-shell__panel-header' ).click();

	await expect.poll( async () => inlineEditorRoot.count() ).toBe( 0 );
	const updatedParagraph = previewFrame( page ).locator( '[data-builder-node][data-builder-type="paragraph"]' ).filter( { hasText: 'Paragraph inline edit updated' } ).first();
	await expect.poll( async () => updatedParagraph.count() ).toBeGreaterThan( 0 );
	await expect( updatedParagraph ).toBeVisible();
	const paragraphHtml = await updatedParagraph.evaluate( ( element ) => element.innerHTML );
	expect( paragraphHtml ).toContain( '<strong>Paragraph inline edit updated</strong>' );
} );

test( 'text editor inline editing commits rich text after inserting a new blockquote node', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	await dragPaletteTileByNameIntoPreview( page, 'Text Editor' );

	const textEditorNode = previewFrame( page ).getByText( 'Editable text', { exact: true } );
	await expect( textEditorNode ).toBeVisible();
	await textEditorNode.dblclick( { force: true } );

	const inlineEditorRoot = inlineRichTextEditorRoot( page );
	const editor = inlineRichTextEditor( page );
	const toolbar = inlineEditorRoot.locator( '.inline-rich-text__toolbar' );
	await expect( inlineEditorRoot ).toBeVisible();

	await editor.click();
	await page.keyboard.press( 'Control+A' );
	await page.keyboard.type( 'Text editor inline edit updated' );
	await page.keyboard.press( 'Control+A' );
	await toolbar.getByRole( 'button', { name: 'Bold' } ).first().click();
	await page.locator( '.builder-shell__panel-header' ).click();

	await expect( inlineEditorRoot ).toHaveCount( 0 );
	const updatedTextEditor = previewFrame( page ).locator( '[data-builder-node][data-builder-type="text-editor"]' ).filter( { hasText: 'Text editor inline edit updated' } ).first();
	await expect( updatedTextEditor ).toBeVisible();
	const textEditorHtml = await updatedTextEditor.evaluate( ( element ) => element.innerHTML );
	expect( textEditorHtml ).toContain( '<strong>Text editor inline edit updated</strong>' );
} );

test( 'blockquote inline editing keeps the cite untouched while persisting rich text changes', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	await dragPaletteTileByNameIntoPreview( page, 'Blockquote' );

	const blockquoteNode = previewFrame( page ).getByText( 'Quote text', { exact: true } );
	await expect( blockquoteNode ).toBeVisible();
	await blockquoteNode.dblclick( { force: true } );

	const inlineEditorRoot = inlineRichTextEditorRoot( page );
	const editor = inlineRichTextEditor( page );
	const toolbar = inlineEditorRoot.locator( '.inline-rich-text__toolbar' );
	await expect( inlineEditorRoot ).toBeVisible();

	await editor.click();
	await page.keyboard.press( 'Control+A' );
	await page.keyboard.type( 'Blockquote inline edit updated' );
	await page.keyboard.press( 'Control+A' );
	await toolbar.getByRole( 'button', { name: 'Bold' } ).first().click();
	await page.locator( '.builder-shell__panel-header' ).click();

	await expect( inlineEditorRoot ).toHaveCount( 0 );
	const updatedBlockquote = previewFrame( page ).locator( '[data-builder-node][data-builder-type="blockquote"]' ).filter( { hasText: 'Blockquote inline edit updated' } ).first();
	await expect( updatedBlockquote ).toBeVisible();
	const blockquoteHtml = await updatedBlockquote.evaluate( ( element ) => element.innerHTML );
	expect( blockquoteHtml ).toContain( '<strong>Blockquote inline edit updated</strong>' );
	expect( blockquoteHtml ).toContain( '<cite>Author</cite>' );
} );

test( 'hovering a preview node shows the hover overlay', async ( { page } ) => {
	await loadBuilderShell( page );

	await previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } ).hover();

	await expect( page.locator( '.builder-preview__hover' ) ).toBeVisible();
} );

test( 'the structure panel fills the docked rail with compact row density', async ( { page } ) => {
	await loadBuilderShell( page );

	const navigator = page.locator( '.builder-shell__navigator-docked:not(.builder-shell__navigator-docked--collapsed)' ).first();
	await expect( navigator ).toBeVisible();
	await expect( page.locator( '.builder-shell__navigator-floating' ) ).toHaveCount( 0 );

	const frameBox = await navigator.boundingBox();
	expect( frameBox?.width ?? 0 ).toBeGreaterThanOrEqual( 220 );
	expect( frameBox?.height ?? 0 ).toBeGreaterThan( 600 );

	await expect( navigatorFloatingPanel( page ).locator( '.navigator__header' ) ).toBeVisible();
	await expect( navigatorFloatingPanel( page ).locator( '.navigator__header h2' ) ).toHaveText( 'Structure' );
	await expect( navigatorFloatingPanel( page ).locator( '#elementor-navigator__toggle-all' ) ).toBeVisible();
	await expect( navigatorFloatingPanel( page ).locator( '#elementor-navigator__close' ) ).toBeVisible();
	await expect( navigatorFloatingPanel( page ).locator( '.navigator__footer' ) ).toBeHidden();
	await expect( navigatorFloatingPanel( page ).locator( '.navigator__resize-bar' ) ).toBeHidden();

	const firstRow = navigatorFloatingPanel( page ).locator( '.navigator__row' ).first();
	await expect( firstRow ).toHaveCSS( 'min-height', '30px' );
	await expect( firstRow.locator( '.navigator__row-icon' ) ).toBeVisible();
	expect( await navigatorFloatingPanel( page ).locator( '.navigator__row-status' ).count() ).toBeGreaterThan( 0 );

	await firstRow.hover();
	const actionMetrics = await navigatorFloatingPanel( page ).locator( '.navigator__row-shell' ).first().evaluate( ( shell ) => {
		const actions = shell.querySelector( '.navigator__actions' );
		const panel = shell.closest( '.builder-shell__navigator-docked' );
		if ( !( actions instanceof HTMLElement ) || !( panel instanceof HTMLElement ) ) {
			return null;
		}

		const actionsBox = actions.getBoundingClientRect();
		const panelBox = panel.getBoundingClientRect();
		return {
			actionBottom: actionsBox.bottom,
			actionRight: actionsBox.right,
			panelRight: panelBox.right,
			rowBottom: shell.getBoundingClientRect().bottom,
		};
	} );
	expect( actionMetrics ).not.toBeNull();
	expect( actionMetrics?.actionRight ?? 999 ).toBeLessThanOrEqual( ( actionMetrics?.panelRight ?? 0 ) + 1 );
	expect( actionMetrics?.actionBottom ?? 999 ).toBeLessThanOrEqual( ( actionMetrics?.rowBottom ?? 0 ) + 1 );
} );

test( 'the left panel stays scrollable while the docked structure panel is open', async ( { page } ) => {
	await page.setViewportSize( { width: 1919, height: 903 } );
	await loadBuilderShell( page );

	const panelScroll = page.locator( '.builder-shell__panel-scroll' ).first();
	await expect( panelScroll ).toBeVisible();

	const metrics = await page.evaluate( () => {
		const panel = document.querySelector( '.builder-shell__panel' ) as HTMLElement | null;
		const scrollSurface = document.querySelector( '.builder-shell__panel-scroll' ) as HTMLElement | null;
		return {
			panelWidth: panel?.getBoundingClientRect().width ?? 0,
			viewportWidth: window.innerWidth,
			scrollHeight: scrollSurface?.scrollHeight ?? 0,
			clientHeight: scrollSurface?.clientHeight ?? 0,
		};
	} );

	expect( metrics.panelWidth ).toBeLessThan( metrics.viewportWidth * 0.3 );
	expect( metrics.scrollHeight ).toBeGreaterThan( metrics.clientHeight );

	await panelScroll.evaluate( ( element ) => {
		( element as HTMLElement ).scrollTop = 0;
	} );
	await panelScroll.hover();
	await page.mouse.wheel( 0, 900 );

	await expect.poll( async () => panelScroll.evaluate( ( element ) => ( element as HTMLElement ).scrollTop ) ).toBeGreaterThan( 0 );
} );

test( 'the Elements panel keeps Layout first and places Container and Grid Container at the top', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const elements = elementsPanel( page );
	const categoryButtons = elements.locator( '.elements-panel__categories button' );

	await expect( categoryButtons.nth( 0 ) ).toContainText( 'All' );
	await expect( categoryButtons.nth( 1 ) ).toContainText( 'Layout' );
	await categoryButtons.nth( 1 ).click();

	const groups = elements.locator( '.elements-panel__group' );
	const firstGroup = groups.first();
	const tiles = firstGroup.locator( '.elements-panel__tile' );
	const tileTitles = firstGroup.locator( '.elements-panel__tile-title strong' );

	await expect( firstGroup.locator( '.elements-panel__group-header h3' ) ).toHaveText( 'Layout' );
	await expect( tiles.first() ).toBeVisible();
	await expect( tileTitles.nth( 0 ) ).toHaveText( 'Container' );
	await expect( tileTitles.nth( 1 ) ).toHaveText( 'Grid Container' );
} );

test( 'the Elements panel keeps icons and element affordances discoverable', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const elements = elementsPanel( page );

	await expect( panelContainer( page ).locator( '.builder-shell__panel-header-button' ).first() ).toBeVisible();
	await expect( page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Elements' } ) ).toBeVisible();
	await expect( elements.getByPlaceholder( 'Search elements' ) ).toBeVisible();
	await expect( elements.locator( '.elements-panel__category' ).first() ).toBeVisible();
	await expect( elements.locator( '.elements-panel__tile-icon' ).first() ).toBeVisible();
	await expect( elements.locator( '.elements-panel__tile-title strong' ).first() ).toBeVisible();
	await expect( elements.locator( '.builder-shell-badge' ).first() ).toBeVisible();
} );

test( 'empty containers should show the + Drop Items affordance', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const elements = elementsPanel( page );
	const layoutCategory = elements.locator( '.elements-panel__categories button' ).filter( { hasText: 'Layout' } ).first();
	await layoutCategory.click();

	const containerTile = elements.locator( '.elements-panel__group' ).first().locator( '.elements-panel__tile' ).first();
	const beforeCount = await previewFrame( page ).locator( '[data-builder-node]' ).count();

	await dragElementTileIntoPreview( page, containerTile, { x: 20, y: 220 } );
	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node]' ).count() ).toBeGreaterThan( beforeCount );
	await expect( previewFrame( page ).getByText( '+ Drop Items', { exact: true } ) ).toBeVisible();
} );

test( 'dragging a container into the canvas creates a visible container node', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const containerTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Container' } ).first();
	const containerCountBeforeInsert = await previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count();

	await dragElementTileIntoPreview( page, containerTile, { x: 20, y: 220 } );

	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count() ).toBeGreaterThan( containerCountBeforeInsert );
} );

test( 'dragging a container into an existing container should nest it instead of dropping at the root', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const containerTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Container' } ).first();
	const beforeContainerCount = await previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count();

	await dragElementTileIntoPreview( page, containerTile );
	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count() ).toBeGreaterThan( beforeContainerCount );

	const targetContainer = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' ).first();
	const rootChildCountBeforeNestedDrop = await readPreviewRootChildCount( page );
	const afterFirstInsertCount = await previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count();

	await dragElementTileIntoTarget( page, containerTile, targetContainer, { x: 0.55, y: 0.8 } );

	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count() ).toBeGreaterThan( afterFirstInsertCount );
	await expect.poll( async () => readPreviewRootChildCount( page ) ).toBe( rootChildCountBeforeNestedDrop );
} );

test( 'dragging a new container into the middle of a filled canvas container nests instead of inserting above', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const containerTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Container' } ).first();
	const filledContainer = previewFrame( page )
		.getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } )
		.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type="container"][1]' );
	await expect( filledContainer ).toBeVisible();
	const filledContainerId = await filledContainer.evaluate( ( element ) => element.getAttribute( 'data-builder-node' ) );
	if ( !filledContainerId ) {
		throw new Error( 'Unable to resolve filled container id.' );
	}
	const stableFilledContainer = previewFrame( page ).locator( `[data-builder-node="${ filledContainerId }"]` );
	const rootChildCountBeforeDrop = await readPreviewRootChildCount( page );
	const totalContainerCountBeforeDrop = await previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count();

	await beginElementTileDragToTarget( page, containerTile, stableFilledContainer, { x: 0.55, y: 0.55 } );
	await expect( page.locator( '.builder-preview__drop-target[data-drop-placement="into"]' ) ).toBeVisible();
	await expect.poll( async () => page.evaluate( () => {
		const editor = ( window as Window & {
			__builderEditor?: {
				engine?: {
					getState: () => {
						ui?: {
							dropTarget?: {
								parentId?: string;
								placement?: string;
							};
						};
					};
				};
			};
		} ).__builderEditor;
		const dropTarget = editor?.engine?.getState().ui?.dropTarget;
		return {
			parentId: dropTarget?.parentId,
			placement: dropTarget?.placement,
			targetNodeId: dropTarget?.targetNodeId,
			slot: dropTarget?.slot,
			index: dropTarget?.index,
		};
	} ) ).toMatchObject( {
		placement: 'into',
	} );
	await page.mouse.up();

	await expect.poll( async () => readPreviewRootChildCount( page ) ).toBe( rootChildCountBeforeDrop );
	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).count() ).toBeGreaterThan( totalContainerCountBeforeDrop );
} );

test( 'palette drag shows dnd overlay and coarse droppable feedback while preserving click insert', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const palette = page.getByLabel( 'Element palette' );
	const containerTile = palette.getByRole( 'button', { name: 'Container' } ).first();
	const buttonTile = palette.getByRole( 'button', { name: 'Button' } ).first();
	const beforeClickCount = await readPreviewRootChildCount( page );

	await buttonTile.click();
	await expect.poll( async () => readPreviewRootChildCount( page ) ).toBeGreaterThan( beforeClickCount );
	await switchToElementsPanel( page );

	await dragElementTileIntoPreview( page, containerTile );
	const targetContainer = previewFrame( page )
		.locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' )
		.first();
	await expect( targetContainer ).toBeVisible();
	const targetContainerId = await targetContainer.evaluate( ( element ) => element.getAttribute( 'data-builder-node' ) );
	if ( !targetContainerId ) {
		throw new Error( 'Unable to resolve target container for palette drag feedback test.' );
	}
	const stableTargetContainer = previewFrame( page ).locator( `[data-builder-node="${ targetContainerId }"]` );

	await beginElementTileDragToTarget( page, buttonTile, stableTargetContainer, { x: 0.52, y: 0.52 } );
	await expect( page.locator( '.builder-shell__drag-overlay' ) ).toBeVisible();
	await expect( page.locator( '[data-builder-coarse-drop-active="true"]' ).first() ).toBeVisible();
	await expect( page.locator( '.builder-preview__drag-ghost' ) ).toHaveCount( 0 );
	await page.mouse.up();

	await expect.poll( async () => stableTargetContainer.locator( '[data-builder-node][data-builder-type="button"]' ).count() ).toBeGreaterThan( 0 );
} );

test( 'before drop targets render a prominent insertion band and highlight for container stacks', async ( { page } ) => {
	await loadBuilderShell( page );
	const targetContainer = previewFrame( page )
		.getByRole( 'heading', { name: 'Named slot orchestration' } )
		.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type=\"container\"][1]' );
	await expect( targetContainer ).toBeVisible();
	const targetDropPayload = await targetContainer.evaluate( ( element ) => {
		const rect = element.getBoundingClientRect();
		const parentNode = element.parentElement?.closest( '[data-builder-node]' ) as HTMLElement | null;
		const editor = ( window as Window & { __builderEditor?: { engine?: { getState: () => { activeDocumentId: string } } } } ).__builderEditor;
		return {
			documentId: editor?.engine?.getState().activeDocumentId ?? '',
			parentId: parentNode?.getAttribute( 'data-builder-node' ) ?? undefined,
			rect: {
				top: rect.top,
				left: rect.left,
				right: rect.right,
				bottom: rect.bottom,
				width: rect.width,
				height: rect.height,
			},
			targetNodeId: element.getAttribute( 'data-builder-node' ) ?? '',
		};
	} );
	await page.evaluate( ( target ) => {
		( window as Window & { __builderEditor?: { engine?: { dispatch: ( command: {
			type: 'document/ui/set-drop-target';
			target?: {
				documentId: string;
				parentId?: string;
				index: number;
				placement: 'before' | 'after' | 'into' | 'root';
				targetNodeId: string;
				rect: {
					top: number;
					left: number;
					right: number;
					bottom: number;
					width: number;
					height: number;
				};
			};
		} ) => void } } } ).__builderEditor?.engine?.dispatch( {
			type: 'document/ui/set-drop-target',
			target: {
				...target,
				index: 0,
				placement: 'before',
			},
		} );
	}, targetDropPayload );

	const beforeBand = page.locator( '.builder-preview__drop-target.band[data-drop-placement="before"]' );
	await expect( beforeBand ).toBeVisible();
	await expect( page.locator( '.builder-preview__drop-target-highlight[data-drop-placement="before"]' ) ).toBeVisible();
	await expect.poll( async () => ( await beforeBand.boundingBox() )?.height ?? 0 ).toBeGreaterThanOrEqual( 10 );
	await expect( beforeBand ).toHaveAttribute( 'data-drop-axis', 'y' );
	await page.evaluate( () => {
		( window as Window & { __builderEditor?: { engine?: { dispatch: ( command: { type: 'document/ui/set-drop-target'; target?: undefined } ) => void } } } ).__builderEditor?.engine?.dispatch( {
			type: 'document/ui/set-drop-target',
			target: undefined,
		} );
	} );
} );

test( 'after drop targets render a prominent insertion band and highlight for container stacks', async ( { page } ) => {
	await loadBuilderShell( page );
	const targetContainer = previewFrame( page )
		.getByRole( 'heading', { name: 'Named slot orchestration' } )
		.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type=\"container\"][1]' );
	await expect( targetContainer ).toBeVisible();
	const targetDropPayload = await targetContainer.evaluate( ( element ) => {
		const rect = element.getBoundingClientRect();
		const parentNode = element.parentElement?.closest( '[data-builder-node]' ) as HTMLElement | null;
		const editor = ( window as Window & { __builderEditor?: { engine?: { getState: () => { activeDocumentId: string } } } } ).__builderEditor;
		return {
			documentId: editor?.engine?.getState().activeDocumentId ?? '',
			parentId: parentNode?.getAttribute( 'data-builder-node' ) ?? undefined,
			rect: {
				top: rect.top,
				left: rect.left,
				right: rect.right,
				bottom: rect.bottom,
				width: rect.width,
				height: rect.height,
			},
			targetNodeId: element.getAttribute( 'data-builder-node' ) ?? '',
		};
	} );
	await page.evaluate( ( target ) => {
		( window as Window & { __builderEditor?: { engine?: { dispatch: ( command: {
			type: 'document/ui/set-drop-target';
			target?: {
				documentId: string;
				parentId?: string;
				index: number;
				placement: 'before' | 'after' | 'into' | 'root';
				targetNodeId: string;
				rect: {
					top: number;
					left: number;
					right: number;
					bottom: number;
					width: number;
					height: number;
				};
			};
		} ) => void } } } ).__builderEditor?.engine?.dispatch( {
			type: 'document/ui/set-drop-target',
			target: {
				...target,
				index: 1,
				placement: 'after',
			},
		} );
	}, targetDropPayload );

	const afterBand = page.locator( '.builder-preview__drop-target.band[data-drop-placement="after"]' );
	await expect( afterBand ).toBeVisible();
	await expect( page.locator( '.builder-preview__drop-target-highlight[data-drop-placement="after"]' ) ).toBeVisible();
	await expect.poll( async () => ( await afterBand.boundingBox() )?.height ?? 0 ).toBeGreaterThanOrEqual( 10 );
	await expect( afterBand ).toHaveAttribute( 'data-drop-axis', 'y' );
	await page.evaluate( () => {
		( window as Window & { __builderEditor?: { engine?: { dispatch: ( command: { type: 'document/ui/set-drop-target'; target?: undefined } ) => void } } } ).__builderEditor?.engine?.dispatch( {
			type: 'document/ui/set-drop-target',
			target: undefined,
		} );
	} );
} );

test( 'dragging an existing element from one container into another should reliably reparent it', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const palette = page.getByLabel( 'Element palette' );
	const containerTile = palette.getByRole( 'button', { name: 'Container' } ).first();
	const filledContainer = previewFrame( page )
		.getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } )
		.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type="container"][1]' );
	await expect( filledContainer ).toBeVisible();

	const targetContainerId = await dragNewContainerIntoTargetAndReadId( page, containerTile, filledContainer );

	const containers = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' );
	await expect.poll( async () => containers.count() ).toBeGreaterThanOrEqual( 2 );

	const targetContainer = previewFrame( page ).locator( `[data-builder-node="${ targetContainerId }"]` );
	await expect( targetContainer ).toBeVisible();

	const sourceHeading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	const sourceHeadingNode = sourceHeading.locator( 'xpath=ancestor-or-self::*[@data-builder-node and @data-builder-type="heading"][1]' );
	await expect( sourceHeadingNode ).toBeVisible();
	const sourceHeadingId = await sourceHeadingNode.evaluate( ( element ) => element.getAttribute( 'data-builder-node' ) );
	if ( !sourceHeadingId ) {
		throw new Error( 'Unable to resolve the source heading id.' );
	}
	const sourceContainerId = await sourceHeading.evaluate( ( element ) => element.closest( '[data-builder-node][data-builder-type="container"]' )?.getAttribute( 'data-builder-node' ) );
	if ( !sourceContainerId ) {
		throw new Error( 'Unable to resolve the source container for the existing heading.' );
	}

	const sourceContainer = previewFrame( page ).locator( `[data-builder-node="${ sourceContainerId }"]` );
	await sourceHeading.click( { force: true } );

	await dragSelectedNodeGrabToTarget( page, targetContainer, { x: 0.52, y: 0.52 } );

	await expect.poll( async () => sourceContainer.getByRole( 'heading', { name: 'Named slot orchestration' } ).count() ).toBe( 0 );
	await expect.poll( async () => targetContainer.getByRole( 'heading', { name: 'Named slot orchestration' } ).count() ).toBe( 1 );
} );

test( 'dragging within a container uses forgiving before and after insertion zones', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const palette = page.getByLabel( 'Element palette' );
	const containerTile = palette.getByRole( 'button', { name: 'Container' } ).first();
	const headingTile = palette.getByRole( 'button', { name: 'Heading' } ).first();
	const paragraphTile = palette.getByRole( 'button', { name: 'Paragraph' } ).first();

	const sourceContainerId = await dragNewContainerIntoPreviewAndReadId( page, containerTile );
	const sourceContainer = previewFrame( page )
		.locator( `[data-builder-node="${ sourceContainerId }"]` );
	await expect( sourceContainer ).toBeVisible();
	const stableSourceContainer = previewFrame( page ).locator( `[data-builder-node="${ sourceContainerId }"]` );

	await dragElementTileIntoTarget( page, headingTile, stableSourceContainer, { x: 0.5, y: 0.5 } );
	await expect( stableSourceContainer ).not.toHaveAttribute( 'data-builder-empty-container', 'true' );
	let initialChildIds = await readDirectChildNodeIds( stableSourceContainer );
	const firstChild = stableSourceContainer.locator( `xpath=./*[@data-builder-node="${ initialChildIds[ 0 ] }"]` );
	await dragElementTileIntoTarget( page, paragraphTile, firstChild, { x: 0.5, y: 0.95 } );
	initialChildIds = await readDirectChildNodeIds( stableSourceContainer );
	expect( initialChildIds.length ).toBeGreaterThanOrEqual( 2 );

	const sourceId = initialChildIds[ 0 ];
	const sourceHeading = stableSourceContainer.locator( `xpath=./*[@data-builder-node="${ sourceId }"]` );
	const secondChild = stableSourceContainer.locator( `xpath=./*[@data-builder-node="${ initialChildIds[ 1 ] }"]` );
	await sourceHeading.click( { force: true } );

	await dragSelectedNodeGrabToTarget( page, secondChild, { x: 0.5, y: 0.95 } );
	await expect.poll( async () => readDirectChildNodeIds( stableSourceContainer ) ).toEqual( [
		initialChildIds[ 1 ],
		sourceId,
		...initialChildIds.slice( 2 ),
	] );

	const currentFirstChild = stableSourceContainer.locator( `xpath=./*[@data-builder-node="${ initialChildIds[ 1 ] }"]` );
	await sourceHeading.click( { force: true } );
	await dragSelectedNodeGrabToTarget( page, currentFirstChild, { x: 0.5, y: 0.05 } );
	await expect.poll( async () => readDirectChildNodeIds( stableSourceContainer ) ).toEqual( initialChildIds );
} );

test( 'palette items can be inserted between tight siblings inside a container', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const sourceHeading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	const sourceContainer = sourceHeading.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type="container"][1]' );
	await expect( sourceContainer ).toBeVisible();
	const initialChildIds = await readDirectChildNodeIds( sourceContainer );
	expect( initialChildIds.length ).toBeGreaterThanOrEqual( 2 );

	const buttonTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Button' } ).first();
	const secondChild = sourceContainer.locator( `xpath=./*[@data-builder-node="${ initialChildIds[ 1 ] }"]` );
	await dragElementTileIntoTarget( page, buttonTile, secondChild, { x: 0.5, y: 0.05 } );

	await expect.poll( async () => readDirectChildNodeIds( sourceContainer ) ).toHaveLength( initialChildIds.length + 1 );
	const nextChildIds = await readDirectChildNodeIds( sourceContainer );
	expect( nextChildIds[ 0 ] ).toBe( initialChildIds[ 0 ] );
	expect( nextChildIds[ 2 ] ).toBe( initialChildIds[ 1 ] );
	await expect( sourceContainer.locator( `xpath=./*[@data-builder-node="${ nextChildIds[ 1 ] }"]` ) ).toHaveAttribute( 'data-builder-type', 'button' );
} );

test( 'container palette items use before and after insertion bands inside containers', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const sourceHeading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	const sourceContainer = sourceHeading.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type="container"][1]' );
	await expect( sourceContainer ).toBeVisible();
	const initialChildIds = await readDirectChildNodeIds( sourceContainer );
	expect( initialChildIds.length ).toBeGreaterThanOrEqual( 2 );

	const containerTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Container' } ).first();
	const secondChild = sourceContainer.locator( `xpath=./*[@data-builder-node="${ initialChildIds[ 1 ] }"]` );
	await beginElementTileDragToTarget( page, containerTile, secondChild, { x: 0.05, y: 0.05 } );
	await expect.poll( async () => page.evaluate( () => {
		const editor = ( window as Window & {
			__builderEditor?: {
				engine?: {
					getState: () => {
						ui?: {
							dropTarget?: {
								placement?: string;
								parentId?: string;
								targetNodeId?: string;
								index?: number;
							};
						};
					};
				};
			};
		} ).__builderEditor;
		const placement = editor?.engine?.getState().ui?.dropTarget?.placement ?? '';
		return placement === 'before' || placement === 'after';
	} ) ).toBe( true );
	await expect( page.locator( '.builder-preview__drop-target.band' ) ).toBeVisible();
	await page.mouse.up();

	await expect.poll( async () => readDirectChildNodeIds( sourceContainer ) ).toHaveLength( initialChildIds.length + 1 );
	const nextChildIds = await readDirectChildNodeIds( sourceContainer );
	expect( nextChildIds[ 0 ] ).toBe( initialChildIds[ 0 ] );
	expect( nextChildIds[ 2 ] ).toBe( initialChildIds[ 1 ] );
	await expect( sourceContainer.locator( `xpath=./*[@data-builder-node="${ nextChildIds[ 1 ] }"]` ) ).toHaveAttribute( 'data-builder-type', 'container' );
} );

test( 'navigator drags reuse the preview drop target semantics and reparent into canvas containers', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const palette = page.getByLabel( 'Element palette' );
	const containerTile = palette.getByRole( 'button', { name: 'Container' } ).first();

	await containerTile.click();

	const containers = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' );
	await expect.poll( async () => containers.count() ).toBeGreaterThanOrEqual( 2 );

	const dropPlaceholder = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' ).first();
	await expect( dropPlaceholder ).toBeVisible();
	const targetContainerId = await dropPlaceholder.evaluate( ( element ) => element.getAttribute( 'data-builder-node' ) );
	if ( !targetContainerId ) {
		throw new Error( 'Unable to resolve the target container for navigator reparenting.' );
	}

	const targetContainer = previewFrame( page ).locator( `[data-builder-node="${ targetContainerId }"]` );
	const sourceHeading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	const sourceContainerId = await sourceHeading.evaluate( ( element ) => element.closest( '[data-builder-node][data-builder-type="container"]' )?.getAttribute( 'data-builder-node' ) );
	if ( !sourceContainerId ) {
		throw new Error( 'Unable to resolve the source container for the navigator drag test.' );
	}

	const sourceContainer = previewFrame( page ).locator( `[data-builder-node="${ sourceContainerId }"]` );
	const sourceRowShell = navigatorFloatingPanel( page ).getByRole( 'group', { name: /Named slot orchestration structure row/i } ).first();
	const sourceRow = sourceRowShell.locator( '.navigator__row' );
	await sourceRow.hover();
	const sourceHandle = sourceRowShell.getByRole( 'button', { name: /Drag Named slot orchestration/i } );

	await beginNavigatorHandleDragToTarget( page, sourceHandle, targetContainer, { x: 0.52, y: 0.52 } );
	await page.waitForTimeout( 120 );
	await page.mouse.up();

	await expect.poll( async () => sourceContainer.getByRole( 'heading', { name: 'Named slot orchestration' } ).count() ).toBe( 0 );
	await expect.poll( async () => targetContainer.getByRole( 'heading', { name: 'Named slot orchestration' } ).count() ).toBe( 1 );
} );

test( 'the left panel content stays within the panel width without horizontal overflow', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const metrics = await panelContainer( page ).evaluate( ( element ) => ( {
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
	} ) );

	expect( metrics.scrollWidth ).toBeLessThanOrEqual( metrics.clientWidth + 1 );
} );

test( 'selected structure rows surface a stronger active hierarchy', async ( { page } ) => {
	await loadBuilderShell( page );

	const row = navigatorRows( page ).nth( 2 );
	await row.click();

	await expect( row ).toHaveClass( /selected/ );

	const styles = await row.evaluate( ( element ) => {
		const computed = getComputedStyle( element );
		return {
			borderLeftWidth: computed.borderLeftWidth,
			borderLeftColor: computed.borderLeftColor,
			boxShadow: computed.boxShadow,
		};
	} );

	expect( styles.borderLeftWidth ).toBe( '3px' );
	expect( styles.borderLeftColor ).not.toBe( 'rgba(0, 0, 0, 0)' );
	expect( styles.boxShadow ).not.toBe( 'none' );
} );

test( 'compact container controls stay within the 280px panel without horizontal overflow', async ( { page } ) => {
	await loadBuilderShell( page );

	await selectPrimaryContainerForInspector( page );

	const metrics = await panelBody( page ).evaluate( ( element ) => ( {
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
	} ) );

	expect( metrics.scrollWidth ).toBeLessThanOrEqual( metrics.clientWidth + 1 );

	const iconChoiceButton = panelBody( page ).locator( '.primitive-control__choice--icon-only' ).first();
	const choiceMetrics = await iconChoiceButton.evaluate( ( element ) => {
		const rect = element.getBoundingClientRect();
		return {
			width: rect.width,
			height: rect.height,
		};
	} );

	expect( choiceMetrics.height ).toBeLessThanOrEqual( 40 );
	expect( choiceMetrics.width ).toBeLessThanOrEqual( 72 );
} );

test( 'container layout switches between flex-only and grid-only controls', async ( { page } ) => {
	await loadBuilderShell( page );

	await selectPrimaryContainerForInspector( page );

	const layoutSection = panelBody( page ).locator( '.inspector__content-section[data-content-section="layout"]' );
	const layoutModeControl = layoutSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Container Layout', { exact: true } ) } )
		.first();

	await expect( layoutModeControl.locator( 'select' ) ).toBeVisible();
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Direction', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Wrap', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Columns', { exact: true } ) } ) ).toHaveCount( 0 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Rows', { exact: true } ) } ) ).toHaveCount( 0 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Auto Flow', { exact: true } ) } ) ).toHaveCount( 0 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Justify Items', { exact: true } ) } ) ).toHaveCount( 0 );

	await layoutModeControl.locator( 'select' ).selectOption( 'grid' );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Direction', { exact: true } ) } ) ).toHaveCount( 0 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Wrap', { exact: true } ) } ) ).toHaveCount( 0 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Columns', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Rows', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Auto Flow', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Justify Items', { exact: true } ) } ) ).toHaveCount( 1 );

	await layoutModeControl.locator( 'select' ).selectOption( 'flex' );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Direction', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Wrap', { exact: true } ) } ) ).toHaveCount( 1 );
	await expect( layoutSection.locator( '.primitive-control' ).filter( { has: page.getByText( 'Columns', { exact: true } ) } ) ).toHaveCount( 0 );
} );

test( 'container style tab stays visual-only and omits layout and sizing controls', async ( { page } ) => {
	await loadBuilderShell( page );
	await selectPrimaryContainerForInspector( page );

	const inspector = panelBody( page );
	await inspectorTabs( page ).nth( 1 ).click();

	await expect( inspector.locator( '.inspector__style-section h4' ) ).toHaveText( [ 'Background', 'Border' ] );
	for ( const label of [
		'Container Layout',
		'Direction',
		'Wrap',
		'Columns',
		'Rows',
		'Auto Flow',
		'Justify Items',
		'Max Width',
		'Min Height',
		'Overflow',
		'Aspect Ratio',
	] ) {
		await expect( inspector.locator( '.primitive-control' ).filter( { has: page.getByText( label, { exact: true } ) } ) ).toHaveCount( 0 );
	}
} );

test( 'container layout icons visibly differentiate direction, justify content, and align items', async ( { page } ) => {
	await loadBuilderShell( page );

	await selectPrimaryContainerForInspector( page );

	const layoutSection = panelBody( page ).locator( '.inspector__content-section[data-content-section="layout"]' );
	const directionControl = layoutSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Direction', { exact: true } ) } )
		.first();
	const justifyControl = layoutSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Justify Content', { exact: true } ) } )
		.first();
	const alignItemsControl = layoutSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Align Items', { exact: true } ) } )
		.first();

	const rowMarkup = await directionControl.getByRole( 'button', { name: 'Row', exact: true } ).locator( 'svg' ).innerHTML();
	const rowReverseMarkup = await directionControl.getByRole( 'button', { name: 'Row Reverse', exact: true } ).locator( 'svg' ).innerHTML();
	const columnMarkup = await directionControl.getByRole( 'button', { name: 'Column', exact: true } ).locator( 'svg' ).innerHTML();
	const columnReverseMarkup = await directionControl.getByRole( 'button', { name: 'Column Reverse', exact: true } ).locator( 'svg' ).innerHTML();
	expect( rowMarkup ).not.toBe( columnMarkup );
	expect( rowMarkup ).not.toBe( rowReverseMarkup );
	expect( columnMarkup ).not.toBe( columnReverseMarkup );
	expect( new Set( [ rowMarkup, rowReverseMarkup, columnMarkup, columnReverseMarkup ] ).size ).toBe( 4 );

	const justifyMarkups = await Promise.all( [
		'Start',
		'Center',
		'End',
		'Space Between',
		'Space Around',
		'Space Evenly',
	].map( async ( label ) => justifyControl.getByRole( 'button', { name: label } ).locator( 'svg' ).innerHTML() ) );
	expect( new Set( justifyMarkups ).size ).toBe( 6 );

	const alignMarkups = await Promise.all( [
		'Start',
		'Center',
		'End',
		'Stretch',
	].map( async ( label ) => alignItemsControl.getByRole( 'button', { name: label } ).locator( 'svg' ).innerHTML() ) );
	expect( new Set( alignMarkups ).size ).toBe( 4 );
} );

test( 'clicking a preview heading should surface heading inspector content and the exact inspector tab order', async ( { page } ) => {
	await loadBuilderShell( page );
	await previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ).click( { force: true } );
	await switchToEditorPanel( page );

	const inspector = panelBody( page );
	const tabButtons = inspectorTabs( page );
	const panelHeader = page.locator( '.builder-shell__panel-header h2' );

	await expect( inspector ).toContainText( 'Desktop' );
	await expect( panelHeader ).toHaveText( /Edit Heading/i );
	await expect( inspector ).toContainText( 'Text' );
	await expect( tabButtons ).toHaveCount( 3 );
	await expect( tabButtons.nth( 0 ) ).toHaveAttribute( 'aria-label', 'Content' );
	await expect( tabButtons.nth( 1 ) ).toHaveAttribute( 'aria-label', 'Style' );
	await expect( tabButtons.nth( 2 ) ).toHaveAttribute( 'aria-label', 'Advanced' );
} );

test( 'switching Content, Style, and Advanced should change the rendered controls', async ( { page } ) => {
	await loadBuilderShell( page );
	await previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ).click( { force: true } );
	await switchToEditorPanel( page );

	const inspector = panelBody( page );
	const tabs = inspectorTabs( page );

	await expect( tabs ).toHaveCount( 3 );
	await expect( tabs.nth( 0 ) ).toHaveAttribute( 'aria-label', 'Content' );
	await expect( tabs.nth( 1 ) ).toHaveAttribute( 'aria-label', 'Style' );
	await expect( tabs.nth( 2 ) ).toHaveAttribute( 'aria-label', 'Advanced' );

	await tabs.nth( 0 ).click();
	await expect( page.locator( '.builder-panel-tab-switcher__tab[data-state="active"]' ) ).toHaveCount( 1 );
	await expect( page.locator( '.builder-panel-tab-switcher__tab[data-state="active"]' ) ).toContainText( 'Content' );
	await expect( inspector ).toContainText( 'Text' );
	await expect( inspector ).toContainText( 'Level' );
	await expect( inspector.locator( '.inspector__style-section' ) ).toHaveCount( 0 );

	await tabs.nth( 1 ).click();
	await expect( page.locator( '.builder-panel-tab-switcher__tab[data-state="active"]' ) ).toHaveCount( 1 );
	await expect( page.locator( '.builder-panel-tab-switcher__tab[data-state="active"]' ) ).toContainText( 'Style' );
	await expect( inspector.locator( '.inspector__style-section h4' ) ).toHaveText( [
		'Alignment',
		'Typography',
		'Text Stroke',
		'Text Shadow',
		'Blend Mode',
		'Color & Links',
	] );
	await expect( inspector.locator( '.inspector__style-section[data-style-section="text"] .inspector__state-tabs button' ) ).toHaveText( [ 'Normal', 'Hover' ] );
	await expect( inspector ).not.toContainText( 'Attributes' );

	await tabs.nth( 2 ).click();
	await expect( page.locator( '.builder-panel-tab-switcher__tab[data-state="active"]' ) ).toHaveCount( 1 );
	await expect( page.locator( '.builder-panel-tab-switcher__tab[data-state="active"]' ) ).toContainText( 'Advanced' );
	await expect( inspector.locator( '.inspector__advanced-section h4' ) ).toHaveText( [
		'Layout',
		'Position & Layer',
		'Motion & Animation',
		'Transform',
		'Border',
		'Responsive Visibility',
		'HTML Attributes',
		'Custom CSS',
	] );
	await expect( inspector ).toContainText( 'Visibility' );
	await expect( inspector ).toContainText( 'Attributes' );
	await expect( inspector ).toContainText( 'Bindings' );
} );

test( 'live style updates flow from the inspector into the preview frame', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );

	await heading.click( { force: true } );
	await switchToEditorPanel( page );

	const inspector = panelBody( page );
	const tabs = inspectorTabs( page );
	await tabs.nth( 1 ).click();

	const beforeColor = await heading.evaluate( ( element ) => getComputedStyle( element ).color );
	const typographySection = inspector.locator( '.inspector__style-section[data-style-section="typography"]' );
	await expect( typographySection.locator( '.inspector__summary-action' ) ).toBeVisible();
	await expect( typographySection.locator( '.inspector__summary-placeholder' ) ).toContainText( 'Open typography settings' );

	await typographySection.locator( '.inspector__summary-action' ).click();
	const typographyPopover = page.locator( '.inspector__popover-surface' );
	await expect( typographyPopover ).toBeVisible();
	await typographyPopover.locator( 'input' ).first().fill( '#ff3366' );

	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).color ) ).not.toBe( beforeColor );
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).color ) ).toContain( '255, 51, 102' );
} );

test( 'rapid color picker input commits the final color without preview mount spikes', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );

	await heading.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const typographySection = panelBody( page ).locator( '.inspector__style-section[data-style-section="typography"]' );
	await typographySection.locator( '.inspector__summary-action' ).click();
	const typographyPopover = page.locator( '.inspector__popover-surface' );
	await expect( typographyPopover ).toBeVisible();

	const colorInput = typographyPopover.locator( 'input[type="color"]' ).first();
	await expect( colorInput ).toBeVisible();
	const beforePerf = await readBuilderPerf( page );

	await colorInput.evaluate( ( input ) => {
		const control = input as HTMLInputElement;
		for ( const color of [ '#220000', '#552200', '#884400', '#bb5500', '#ff6600' ] ) {
			control.value = color;
			control.dispatchEvent( new Event( 'input', { bubbles: true, cancelable: true } ) );
		}
	} );

	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).color ) ).toContain( '255, 102, 0' );
	const afterPerf = await readBuilderPerf( page );
	expect( afterPerf.previewMounts ?? 0 ).toBeLessThanOrEqual( ( beforePerf.previewMounts ?? 0 ) + 1 );
} );

test( 'hover state tabs author separate button surface styles', async ( { page } ) => {
	await loadBuilderShell( page );
	const button = previewFrame( page ).getByRole( 'button', { name: 'Explore the system' } );

	await button.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const surfaceSection = panelBody( page ).locator( '.inspector__style-section[data-style-section="button"]' );
	await expect( surfaceSection ).toBeVisible();

	const backgroundControl = surfaceSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Background Color', { exact: true } ) } )
		.first();
	await backgroundControl.locator( 'input[type="color"]' ).evaluate( ( input ) => {
		const control = input as HTMLInputElement;
		control.value = '#2255cc';
		control.dispatchEvent( new Event( 'input', { bubbles: true, cancelable: true } ) );
		control.dispatchEvent( new Event( 'change', { bubbles: true, cancelable: true } ) );
	} );

	await surfaceSection.getByRole( 'button', { name: 'Hover' } ).click();
	await expect( surfaceSection.getByRole( 'button', { name: 'Hover' } ) ).toHaveClass( /inspector__state-tab--active/ );
	await backgroundControl.locator( 'input[type="color"]' ).evaluate( ( input ) => {
		const control = input as HTMLInputElement;
		control.value = '#ff6600';
		control.dispatchEvent( new Event( 'input', { bubbles: true, cancelable: true } ) );
		control.dispatchEvent( new Event( 'change', { bubbles: true, cancelable: true } ) );
	} );

	await expect.poll( async () => button.evaluate( ( element ) => getComputedStyle( element ).backgroundColor ) ).toContain( '34, 85, 204' );
	await expect.poll( async () => page.locator( previewSelector ).evaluate( ( element ) => {
		const styles = [ ...( ( element as HTMLElement ).shadowRoot?.querySelectorAll( 'style' ) ?? [] ) ];
		return styles.map( ( style ) => style.textContent ?? '' ).join( '\n' );
	} ) ).toContain( 'background-color: #ff6600 !important' );
	await button.hover();
	await expect.poll( async () => button.evaluate( ( element ) => element.matches( ':hover' ) ) ).toBe( true );
	await expect.poll( async () => button.evaluate( ( element ) => getComputedStyle( element ).backgroundColor ) ).toContain( '255, 102, 0' );
} );

test( 'typography sections use a compact pencil popover and font weight dropdown', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );

	await heading.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const inspector = panelBody( page );
	const typographySection = inspector.locator( '.inspector__style-section[data-style-section="typography"]' );
	await expect( typographySection.locator( '.primitive-control' ) ).toHaveCount( 0 );
	await expect( typographySection.locator( '.inspector__summary-action' ) ).toBeVisible();

	await typographySection.locator( '.inspector__summary-action' ).click();
	const popover = page.locator( '.inspector__popover-surface' );
	await expect( popover ).toBeVisible();

	const fontWeightControl = popover.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Font Weight', { exact: true } ) } )
		.first();
	await expect( fontWeightControl.locator( 'select' ).first() ).toBeVisible();
	await fontWeightControl.locator( 'select' ).first().selectOption( '700' );

	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontWeight ) ).toBe( '700' );
} );

test( 'alignment controls update both content and style-driven text alignment in the preview', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );
	await heading.click( { force: true } );
	await switchToEditorPanel( page );

	const inspector = panelBody( page );
	const tabs = inspectorTabs( page );
	await tabs.nth( 0 ).click();

	const contentAlignmentControl = inspector.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Alignment', { exact: true } ) } )
		.first();
	await contentAlignmentControl.getByRole( 'button', { name: /center/i } ).click();
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).textAlign ) ).toBe( 'center' );

	const paragraph = previewFrame( page ).getByText( 'This fixture uses named slots for status, supporting rail content, and action groups instead of forcing everything into children.' ).first();
	await paragraph.click( { force: true } );
	await tabs.nth( 1 ).click();

	const styleAlignmentControl = inspector.locator( '.inspector__style-section[data-style-section="alignment"] .primitive-control' )
		.filter( { has: page.getByText( 'Alignment', { exact: true } ) } )
		.first();
	await styleAlignmentControl.getByRole( 'button', { name: /right/i } ).click();
	await expect.poll( async () => paragraph.evaluate( ( element ) => getComputedStyle( element ).textAlign ) ).toBe( 'right' );
} );

test( 'typing 400px into padding keeps the selected container stable and applies the spacing in preview', async ( { page } ) => {
	await loadBuilderShell( page );
	const firstNavigatorRow = navigatorRows( page ).first();
	const selectedContainerId = await firstNavigatorRow.locator( 'xpath=ancestor::*[contains(@class,"navigator__row-shell")][1]' ).getAttribute( 'data-navigator-node' );
	if ( !selectedContainerId ) {
		throw new Error( 'Unable to resolve the selected container node id from the structure panel.' );
	}

	await firstNavigatorRow.click();
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Container/i );
	await expect.poll( async () => page.evaluate( () => ( window as Window & { __builderEditor?: { engine?: { getState: () => { ui?: { selectedNodeIds?: string[] } } } } } ).__builderEditor?.engine?.getState().ui?.selectedNodeIds?.[ 0 ] ?? '' ) ).toBe( selectedContainerId );

	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 2 ).click();

	const layoutSection = page.locator( '.inspector__advanced-section[data-advanced-section="layout"]' ).first();
	const paddingControl = layoutSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Padding', { exact: true } ) } )
		.first();
	const topInput = paddingControl.locator( '.primitive-control__dimensions-grid input' ).first();
	const unitSelect = paddingControl.locator( '.primitive-control__dimensions-meta select' ).first();
	const previewContainer = previewFrame( page ).locator( `[data-builder-node="${ selectedContainerId }"]` );
	await unitSelect.selectOption( 'px' );
	await topInput.fill( '400' );

	await expect.poll( async () => topInput.inputValue() ).toBe( '400' );
	await expect( paddingControl.locator( '.primitive-control__dimensions-grid input' ).nth( 1 ) ).toHaveValue( '400' );
	await expect( paddingControl.locator( '.primitive-control__dimensions-grid input' ).nth( 2 ) ).toHaveValue( '400' );
	await expect( paddingControl.locator( '.primitive-control__dimensions-grid input' ).nth( 3 ) ).toHaveValue( '400' );

	await expect.poll( async () => topInput.inputValue() ).toBe( '400' );
	await expect( paddingControl.locator( '.primitive-control__dimensions-grid input' ).nth( 1 ) ).toHaveValue( '400' );
	await expect( paddingControl.locator( '.primitive-control__dimensions-grid input' ).nth( 2 ) ).toHaveValue( '400' );
	await expect( paddingControl.locator( '.primitive-control__dimensions-grid input' ).nth( 3 ) ).toHaveValue( '400' );
	await expect.poll( async () => previewContainer.evaluate( ( element ) => getComputedStyle( element ).paddingTop ) ).toBe( '400px' );
	await expect.poll( async () => previewContainer.evaluate( ( element ) => getComputedStyle( element ).paddingRight ) ).toBe( '400px' );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Container/i );
} );

test( 'unit-bearing dimension controls keep their unit selector and numeric value stable on the shadow-root preview', async ( { page } ) => {
	await loadBuilderShell( page );

	await switchToElementsPanel( page );
	const containerTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Container' } ).first();
	await dragElementTileIntoPreview( page, containerTile, { x: 280, y: 320 } );

	const previewContainer = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' ).last();
	await previewContainer.click( { force: true } );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Container/i );

	await page.getByRole( 'button', { name: 'Responsive', exact: true } ).click();
	await page.getByRole( 'toolbar', { name: 'Preview devices' } ).getByRole( 'button', { name: /mobile/i } ).first().click();

	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 0 ).click();

	const sizingSection = page.locator( '.inspector__content-section[data-content-section="sizing-overflow"]' ).first();
	const widthControl = sizingSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Width', { exact: true } ) } )
		.first();
	const widthInput = widthControl.locator( 'input' ).first();
	const widthUnitSelect = widthControl.locator( 'select' ).first();

	await expect.poll( async () => widthInput.inputValue() ).toBe( '100' );
	await expect( widthUnitSelect ).toHaveValue( '%' );

	await widthInput.fill( '40' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '40' );

	await widthUnitSelect.selectOption( '%' );
	await expect( widthUnitSelect ).toHaveValue( '%' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '40' );
	await expect.poll( async () => previewContainer.evaluate( ( element ) => element.getAttribute( 'style' ) ?? '' ) ).toContain( 'width: 40%;' );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Container/i );
} );

test( 'responsive container content controls preserve independent desktop, tablet, and mobile overrides', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const containerTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Container' } ).first();
	await dragElementTileIntoPreview( page, containerTile, { x: 280, y: 320 } );

	const previewContainer = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"][data-builder-empty-container="true"]' ).last();
	await previewContainer.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 0 ).click();

	const sizingSection = page.locator( '.inspector__content-section[data-content-section="sizing-overflow"]' ).first();
	const widthControl = sizingSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Width', { exact: true } ) } )
		.first();
	const widthInput = widthControl.locator( 'input' ).first();
	const widthUnitSelect = widthControl.locator( 'select' ).first();

	await expect( widthUnitSelect ).toHaveValue( '%' );
	await widthInput.fill( '92' );
	await widthInput.press( 'Enter' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '92' );

	await switchResponsiveViewport( page, 'tablet' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '92' );
	await widthInput.fill( '78' );
	await widthInput.press( 'Enter' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '78' );
	await expect.poll( async () => previewContainer.evaluate( ( element ) => element.getAttribute( 'style' ) ?? '' ) ).toContain( 'width: 78%;' );

	await switchResponsiveViewport( page, 'mobile' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '78' );
	await widthInput.fill( '61' );
	await widthInput.press( 'Enter' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '61' );
	await expect.poll( async () => previewContainer.evaluate( ( element ) => element.getAttribute( 'style' ) ?? '' ) ).toContain( 'width: 61%;' );

	await switchResponsiveViewport( page, 'tablet' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '78' );

	await switchResponsiveViewport( page, 'desktop' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '92' );

	await switchResponsiveViewport( page, 'mobile' );
	await expect.poll( async () => widthInput.inputValue() ).toBe( '61' );
} );

test( 'responsive style overrides can be reset per device without changing desktop styles', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).locator( '[data-builder-node][data-builder-type="heading"]' ).first();

	await heading.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const desktopFontSize = await heading.evaluate( ( element ) => getComputedStyle( element ).fontSize );
	const typographySection = panelBody( page ).locator( '.inspector__style-section[data-style-section="typography"]' ).first();
	await typographySection.locator( '.inspector__summary-action' ).click();

	const typographyPopover = page.locator( '.inspector__popover-surface' );
	const fontSizeControl = typographyPopover.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Font Size', { exact: true } ) } )
		.first();
	const fontSizeInput = fontSizeControl.locator( 'input' ).first();

	await switchResponsiveViewport( page, 'tablet' );
	await expect( fontSizeInput ).toBeVisible();
	await fontSizeInput.fill( '22px' );
	await fontSizeInput.press( 'Enter' );
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( '22px' );
	await expect( fontSizeControl.getByText( 'tablet', { exact: false } ) ).toBeVisible();
	await expect( fontSizeControl.getByText( 'override', { exact: false } ) ).toBeVisible();

	await switchResponsiveViewport( page, 'mobile' );
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( '22px' );
	await expect( fontSizeControl.getByText( 'mobile', { exact: false } ) ).toBeVisible();
	await expect( fontSizeControl.getByText( 'inherited', { exact: false } ) ).toBeVisible();
	await fontSizeInput.fill( '28px' );
	await fontSizeInput.press( 'Enter' );
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( '28px' );
	await expect( fontSizeControl.getByText( 'mobile', { exact: false } ) ).toBeVisible();
	await expect( fontSizeControl.getByText( 'override', { exact: false } ) ).toBeVisible();

	await switchResponsiveViewport( page, 'desktop' );
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( desktopFontSize );

	await switchResponsiveViewport( page, 'mobile' );
	await page.getByRole( 'button', { name: /Reset mobile override for Font Size/i } ).click();
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( '22px' );

	await switchResponsiveViewport( page, 'tablet' );
	await page.getByRole( 'button', { name: /Reset tablet override for Font Size/i } ).click();
	await expect.poll( async () => heading.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( desktopFontSize );
} );

test( 'semantic content fields remain shared across responsive devices', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).locator( '[data-builder-node][data-builder-type="heading"]' ).first();

	await heading.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 0 ).click();

	const textControl = panelBody( page ).locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Text', { exact: true } ) } )
		.first();
	const textInput = textControl.locator( 'input' ).first();

	await switchResponsiveViewport( page, 'mobile' );
	await textInput.fill( 'Shared responsive heading' );
	await textInput.press( 'Enter' );
	await expect.poll( async () => heading.textContent() ).toContain( 'Shared responsive heading' );

	await switchResponsiveViewport( page, 'desktop' );
	await expect.poll( async () => heading.textContent() ).toContain( 'Shared responsive heading' );
	await expect.poll( async () => textInput.inputValue() ).toBe( 'Shared responsive heading' );
} );

test( 'responsive visibility settings only expose desktop, tablet, and mobile', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).locator( '[data-builder-node][data-builder-type="heading"]' ).first();

	await heading.click( { force: true } );
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 2 ).click();

	const advancedSection = panelBody( page ).locator( '.inspector__advanced-section' )
		.filter( { has: page.getByText( 'Responsive Visibility', { exact: true } ) } )
		.first();
	await expect( advancedSection ).toContainText( 'Desktop' );
	await expect( advancedSection ).toContainText( 'Tablet' );
	await expect( advancedSection ).toContainText( 'Mobile' );
	await expect( advancedSection ).not.toContainText( 'Laptop' );
} );

test( 'carousel content typography controls style the visible slide copy', async ( { page } ) => {
	await loadBuilderShell( page );
	const carousel = previewFrame( page ).locator( '[data-builder-type="carousel"]' ).first();
	await carousel.click( { force: true } );
	await switchToEditorPanel( page );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Carousel/i );

	const inspector = panelBody( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const contentSection = inspector.locator( '.inspector__style-section[data-style-section="content"]' );
	await contentSection.locator( '.inspector__summary-action' ).click();
	const typographyPopover = page.locator( '.inspector__popover-surface' );
	const fontSizeControl = typographyPopover.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Font Size', { exact: true } ) } )
		.first();
	const fontSizeInput = fontSizeControl.locator( 'input' ).first();
	const copyTitle = previewFrame( page ).locator( '.builder-carousel__copy strong' ).first();

	await fontSizeInput.fill( '36px' );
	await fontSizeInput.press( 'Enter' );

	await expect.poll( async () => copyTitle.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( '36px' );
} );

test( 'menu layout alignment controls justify the rendered navigation list', async ( { page } ) => {
	await loadBuilderShell( page );
	const menu = previewFrame( page ).locator( '[data-builder-type="menu"]' ).first();
	await menu.click( { force: true } );
	await switchToEditorPanel( page );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Menu/i );

	const inspector = panelBody( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const menuSection = inspector.locator( '.inspector__style-section[data-style-section="menu"]' );
	const alignControl = menuSection.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Align', { exact: true } ) } )
		.first();
	await alignControl.getByRole( 'button', { name: /center/i } ).click();

	const menuList = previewFrame( page ).locator( '.builder-menu__list' ).first();
	await expect.poll( async () => menuList.evaluate( ( element ) => getComputedStyle( element ).justifyContent ) ).toBe( 'center' );
} );

test( 'form label typography controls style the rendered preview labels', async ( { page } ) => {
	await loadBuilderShell( page );
	const form = previewFrame( page ).locator( '[data-builder-type="form"]' ).first();
	await form.click( { force: true } );
	await switchToEditorPanel( page );
	await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Form/i );

	const inspector = panelBody( page );
	await inspectorTabs( page ).nth( 1 ).click();

	const labelsSection = inspector.locator( '.inspector__style-section[data-style-section="labels"]' );
	await labelsSection.locator( '.inspector__summary-action' ).click();
	const typographyPopover = page.locator( '.inspector__popover-surface' );
	const fontSizeControl = typographyPopover.locator( '.primitive-control' )
		.filter( { has: page.getByText( 'Font Size', { exact: true } ) } )
		.first();
	const fontSizeInput = fontSizeControl.locator( 'input' ).first();
	await fontSizeInput.fill( '18px' );
	await fontSizeInput.press( 'Enter' );

	const formLabel = previewFrame( page ).locator( '.builder-form__fields label > span' ).first();
	await expect.poll( async () => formLabel.evaluate( ( element ) => getComputedStyle( element ).fontSize ) ).toBe( '18px' );
} );

test( 'new container and grid container nodes render full-width by default', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const palette = page.getByLabel( 'Element palette' );
	const containerTile = palette.getByRole( 'button', { name: 'Container' } ).first();
	const gridContainerTile = palette.getByRole( 'button', { name: 'Grid Container' } ).first();

	await dragElementTileIntoPreview( page, containerTile, { x: 260, y: 240 } );
	await dragElementTileIntoPreview( page, gridContainerTile, { x: 260, y: 420 } );

	const container = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).last();
	const gridContainer = previewFrame( page ).locator( '[data-builder-node][data-builder-type="grid-container"]' ).last();

	await expect.poll( async () => container.getAttribute( 'style' ) ).toContain( 'width: 100%;' );
	await expect.poll( async () => gridContainer.getAttribute( 'style' ) ).toContain( 'width: 100%;' );
	await expect.poll( async () => gridContainer.getAttribute( 'style' ) ).toContain( 'display: grid;' );
} );

test( 'standalone images stay inside the authored mobile viewport without overflowing', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const imageTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Image' } ).first();
	await dragElementTileIntoPreview( page, imageTile, { x: 280, y: 320 } );

	await page.getByRole( 'button', { name: 'Responsive', exact: true } ).click();
	await page.getByRole( 'toolbar', { name: 'Preview devices' } ).getByRole( 'button', { name: /mobile/i } ).first().click();

	const image = previewFrame( page ).locator( '[data-builder-node][data-builder-type="image"]' ).last();
	await expect( image ).toBeVisible();
	await expect.poll( async () => image.evaluate( ( element ) => {
		const root = element.getRootNode();
		if ( !( root instanceof ShadowRoot ) ) {
			return 999;
		}
		const mount = root.querySelector( '[data-builder-preview-host-mount]' ) as HTMLElement | null;
		if ( !mount ) {
			return 999;
		}
		const imageRect = element.getBoundingClientRect();
		const mountRect = mount.getBoundingClientRect();
		return Math.max( 0, imageRect.right - mountRect.right, mountRect.left - imageRect.left );
	} ) ).toBeLessThanOrEqual( 1 );
} );

test( 'media library upload and selection updates image controls', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const imageTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Image' } ).first();
	await dragElementTileIntoPreview( page, imageTile, { x: 280, y: 320 } );
	await previewFrame( page ).locator( '[data-builder-node][data-builder-type="image"]' ).last().click();
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 0 ).click();

	await page.getByRole( 'button', { name: 'Media Library' } ).click();
	await panelBody( page ).locator( 'input[type="file"]' ).first().setInputFiles( {
		name: 'media-e2e.png',
		mimeType: 'image/png',
		buffer: Buffer.from( [
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
			0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
			0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
			0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
			0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
			0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
			0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
			0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
			0x42, 0x60, 0x82,
		] ),
	} );

	await expect.poll( async () => panelBody( page ).locator( '.primitive-control__media input[type="text"]' ).first().inputValue() ).toContain( '/media/reference-studio/' );
	await page.getByRole( 'button', { name: 'Media Library' } ).click();
	await expect( panelBody( page ).getByText( 'media-e2e.png' ) ).toBeVisible();
} );

test( 'page settings stay document-level and do not duplicate element advanced controls', async ( { page } ) => {
	await loadBuilderShell( page );

	await switchToPageSettingsPanel( page );
	const pageSettings = panelBody( page );
	await expect( pageSettings ).toContainText( 'Assignments' );
	await expect( pageSettings ).toContainText( 'Preview source' );
	await expect( pageSettings ).toContainText( 'Latest draft' );
	await expect( pageSettings ).not.toContainText( 'Visibility' );
	await expect( pageSettings ).not.toContainText( 'Attributes' );
	await expect( pageSettings ).not.toContainText( 'Bindings' );

	await previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } ).click( { force: true } );
	await switchToEditorPanel( page );

	const inspector = panelBody( page );
	const tabs = inspectorTabs( page );
	await tabs.nth( 2 ).click();

	await expect( inspector ).toContainText( 'Visibility' );
	await expect( inspector ).toContainText( 'Attributes' );
	await expect( inspector ).toContainText( 'Bindings' );
} );

test( 'selecting a preview node from non-editor pages returns the left pane to the editor surface', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );
	const editorButton = page.getByLabel( 'Panel pages' ).getByRole( 'button', { name: 'Editor' } );

	for ( const openPanel of [ switchToPageSettingsPanel, switchToHistoryPanel, switchToGlobalsPanel, switchToMenuPanel ] ) {
		await openPanel( page );
		await heading.click( { force: true } );

		await expect( editorButton ).toHaveClass( /active/ );
		await expect( page.locator( '.builder-shell__panel-header h2' ) ).toHaveText( /Edit Heading/i );
		await expect( panelBody( page ) ).toContainText( 'Text' );
	}
} );

test( 'dragging a Button tile into the canvas inserts a node', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToElementsPanel( page );

	const buttonTile = page.getByLabel( 'Element palette' ).getByRole( 'button', { name: 'Button' } ).first();
	const beforeCount = await previewFrame( page ).locator( '[data-builder-node]' ).count();

	await dragElementTileIntoPreview( page, buttonTile );
	await page.waitForTimeout( 500 );

	const afterCount = await previewFrame( page ).locator( '[data-builder-node]' ).count();
	expect( afterCount ).toBeGreaterThan( beforeCount );
} );

test( 'moving an existing navigator row from the structure panel reorders the tree', async ( { page } ) => {
	await loadBuilderShell( page );
	const rows = navigatorRows( page );
	const beforeOrder = await rows.evaluateAll( ( elements ) => elements.slice( 2, 6 ).map( ( element ) => ( element.textContent ?? '' ).trim() ) );

	await rows.nth( 2 ).click();
	await page.keyboard.down( 'Alt' );
	await page.keyboard.press( 'ArrowDown' );
	await page.keyboard.up( 'Alt' );
	await page.waitForTimeout( 500 );

	const afterOrder = await rows.evaluateAll( ( elements ) => elements.slice( 2, 6 ).map( ( element ) => ( element.textContent ?? '' ).trim() ) );
	expect( afterOrder ).not.toEqual( beforeOrder );
} );

test( 'Library panel imports Elementor JSON templates and inserts them into the preview', async ( { page } ) => {
	await loadBuilderShell( page );
	await switchToGlobalsPanel( page );
	await panelBody( page ).getByRole( 'tab', { name: 'Library', exact: true } ).click();
	await expect( panelBody( page ) ).toContainText( 'Import Template' );

	await panelBody( page ).locator( '.inspector__file-input' ).setInputFiles( {
		name: 'elementor-library-template.json',
		mimeType: 'application/json',
		buffer: Buffer.from( JSON.stringify( {
			title: 'Elementor Import Smoke',
			content: [
				{
					id: 'elementor-heading',
					elType: 'container',
					settings: {
						html_id: 'imported-hero',
						css_classes: 'imported-hero-section',
						padding: { top: 32, right: 28, bottom: 32, left: 28, unit: 'px' },
						gap: { size: 18, unit: 'px' },
						background_color: '#101827',
						background_image: { url: 'https://example.com/imported-hero.jpg' },
						background_position: 'center center',
						background_size: 'cover',
						background_repeat: 'no-repeat',
						background_overlay_color: 'rgba(0,0,0,0.45)',
						background_overlay_opacity: { size: 50 },
					},
					elements: [
						{
							id: 'elementor-heading-child',
							elType: 'widget',
							widgetType: 'heading',
							settings: {
								title: 'Imported Library Heading<br><span style="color: #0c9488;">With HTML</span>',
								align: 'center',
							},
						},
						{
							id: 'elementor-button-child',
							elType: 'widget',
							widgetType: 'button',
							settings: {
								html_id: 'imported-button',
								text: 'Imported CTA',
								background_color: '#2563eb',
								background_color_hover: '#1d4ed8',
								text_color: '#ffffff',
								padding: { top: 12, right: 18, bottom: 12, left: 18, unit: 'px' },
							},
						},
					],
				},
			],
		} ) ),
	} );

	await expect( panelBody( page ) ).toContainText( 'Import complete' );
	await expect( panelBody( page ) ).toContainText( 'Elementor Import Smoke' );
	await panelBody( page ).locator( '.inspector__library-card' )
		.filter( { hasText: 'Elementor Import Smoke' } )
		.getByRole( 'button', { name: 'Insert' } )
		.click();

	await expect( previewFrame( page ).getByRole( 'heading', { name: /Imported Library Heading\s*With HTML/ } ) ).toBeVisible();
	await expect( previewFrame( page ).getByText( 'Imported CTA' ) ).toBeVisible();
	const importedStyles = await page.locator( previewSelector ).evaluate( ( element ) => {
		const root = ( element as HTMLElement ).shadowRoot;
		const hero = root?.querySelector( '#imported-hero' ) as HTMLElement | null;
		const button = root?.querySelector( '#imported-button' ) as HTMLElement | null;
		const heading = hero?.querySelector( 'h1, h2, h3, h4, h5, h6' ) as HTMLElement | null;
		const headingSpan = heading?.querySelector( 'span' ) as HTMLElement | null;
		if ( !hero || !button || !heading || !headingSpan ) {
			return null;
		}
		const heroStyle = getComputedStyle( hero );
		const buttonStyle = getComputedStyle( button );
		const headingSpanStyle = getComputedStyle( headingSpan );
		return {
			heroBackgroundColor: heroStyle.backgroundColor,
			heroBackgroundImage: heroStyle.backgroundImage,
			heroBackgroundSize: heroStyle.backgroundSize,
			heroPaddingTop: heroStyle.paddingTop,
			heroGap: heroStyle.gap,
			headingBreakCount: heading.querySelectorAll( 'br' ).length,
			headingSpanText: headingSpan.textContent,
			headingSpanColor: headingSpanStyle.color,
			buttonBackgroundColor: buttonStyle.backgroundColor,
			buttonColor: buttonStyle.color,
			buttonPaddingTop: buttonStyle.paddingTop,
		};
	} );
	expect( importedStyles ).toMatchObject( {
		heroBackgroundColor: 'rgb(16, 24, 39)',
		heroBackgroundSize: 'cover',
		heroPaddingTop: '32px',
		heroGap: '18px',
		headingBreakCount: 1,
		headingSpanText: 'With HTML',
		headingSpanColor: 'rgb(12, 148, 136)',
		buttonBackgroundColor: 'rgb(37, 99, 235)',
		buttonColor: 'rgb(255, 255, 255)',
		buttonPaddingTop: '12px',
	} );
	expect( importedStyles?.heroBackgroundImage ).toContain( 'imported-hero.jpg' );

	const documentCountBeforeInvalid = await page.evaluate( () => ( window as Window & { __builderEditor?: { engine: { getState: () => { project: { documents: unknown[] } } } } } ).__builderEditor?.engine.getState().project.documents.length ?? 0 );
	await panelBody( page ).locator( '.inspector__file-input' ).setInputFiles( {
		name: 'invalid-template.json',
		mimeType: 'application/json',
		buffer: Buffer.from( JSON.stringify( { unsupported: true } ) ),
	} );

	await expect( panelBody( page ) ).toContainText( 'Unsupported template JSON' );
	await expect.poll( async () => page.evaluate( () => ( window as Window & { __builderEditor?: { engine: { getState: () => { project: { documents: unknown[] } } } } } ).__builderEditor?.engine.getState().project.documents.length ?? 0 ) ).toBe( documentCountBeforeInvalid );
} );

test( 'top bar imports pasted HTML into the Library and inserts styled content', async ( { page } ) => {
	await loadBuilderShell( page );
	const documentCountBeforeInvalid = await page.evaluate( () => ( window as Window & { __builderEditor?: { engine: { getState: () => { project: { documents: unknown[] } } } } } ).__builderEditor?.engine.getState().project.documents.length ?? 0 );

	await page.getByRole( 'button', { name: 'Import HTML' } ).click();
	await expect( page.getByRole( 'dialog', { name: 'Review Import' } ) ).toBeVisible();
	await page.getByLabel( 'Source name' ).fill( 'html-landing.html' );
	await page.getByLabel( 'HTML and CSS' ).fill( `
		<html>
			<head>
				<title>HTML Landing</title>
				<style>
					body { margin: 0; }
					.html-hero { background-color: #101827; }
					.html-hero h1 { color: #ffffff; }
				</style>
			</head>
			<body>
				<section id="html-hero" class="html-hero" style="padding: 30px; gap: 14px;">
					<h1>Imported <span style="color: #0c9488;">HTML</span></h1>
					<p>HTML <strong>copy</strong></p>
					<img src="https://example.com/html-hero.jpg" alt="HTML hero" />
					<a class="button" href="/start" style="background-color: #2563eb; color: #ffffff; padding: 12px 18px;">Start now</a>
				</section>
			</body>
		</html>
	` );
	await page.getByRole( 'dialog', { name: 'Review Import' } ).getByRole( 'button', { name: 'Review', exact: true } ).click();
	await expect( page.getByRole( 'dialog', { name: 'Review Import' } ) ).toContainText( 'HTML Landing' );
	await expect( page.getByRole( 'dialog', { name: 'Review Import' } ) ).toContainText( 'CSS blocks' );
	await page.getByRole( 'dialog', { name: 'Review Import' } ).getByRole( 'button', { name: 'Import', exact: true } ).click();

	await expect( page.getByRole( 'dialog', { name: 'Review Import' } ) ).toBeHidden();
	await expect( panelBody( page ) ).toContainText( 'Imported 1 library item from html-landing.html' );
	await expect( panelBody( page ) ).toContainText( 'HTML Landing' );
	await panelBody( page ).locator( '.inspector__library-card' )
		.filter( { hasText: 'HTML Landing' } )
		.getByRole( 'button', { name: 'Insert' } )
		.click();

	await expect( previewFrame( page ).getByRole( 'heading', { name: /Imported HTML/ } ) ).toBeVisible();
	await expect( previewFrame( page ).getByText( 'Start now' ) ).toBeVisible();
	const importedStyles = await page.locator( previewSelector ).evaluate( ( element ) => {
		const root = ( element as HTMLElement ).shadowRoot;
		const hero = root?.querySelector( '#html-hero' ) as HTMLElement | null;
		const headingSpan = hero?.querySelector( 'h1 span' ) as HTMLElement | null;
		const image = hero?.querySelector( 'img' ) as HTMLImageElement | null;
		const button = hero?.querySelector( 'a' ) as HTMLElement | null;
		if ( !hero || !headingSpan || !image || !button ) {
			return null;
		}
		const heroStyle = getComputedStyle( hero );
		const headingSpanStyle = getComputedStyle( headingSpan );
		const buttonStyle = getComputedStyle( button );
		return {
			heroBackgroundColor: heroStyle.backgroundColor,
			heroPaddingTop: heroStyle.paddingTop,
			heroGap: heroStyle.gap,
			headingSpanColor: headingSpanStyle.color,
			imageSrc: image.getAttribute( 'src' ),
			buttonBackgroundColor: buttonStyle.backgroundColor,
			buttonColor: buttonStyle.color,
			buttonPaddingTop: buttonStyle.paddingTop,
		};
	} );
	expect( importedStyles ).toMatchObject( {
		heroBackgroundColor: 'rgb(16, 24, 39)',
		heroPaddingTop: '30px',
		heroGap: '14px',
		headingSpanColor: 'rgb(12, 148, 136)',
		imageSrc: 'https://example.com/html-hero.jpg',
		buttonBackgroundColor: 'rgb(37, 99, 235)',
		buttonColor: 'rgb(255, 255, 255)',
		buttonPaddingTop: '12px',
	} );

	await page.getByRole( 'button', { name: 'Import HTML' } ).click();
	await page.getByRole( 'dialog', { name: 'Review Import' } ).getByRole( 'button', { name: 'Review', exact: true } ).click();
	await expect( page.getByRole( 'dialog', { name: 'Review Import' } ) ).toContainText( 'Paste HTML before importing' );
	await expect.poll( async () => page.evaluate( () => ( window as Window & { __builderEditor?: { engine: { getState: () => { project: { documents: unknown[] } } } } } ).__builderEditor?.engine.getState().project.documents.length ?? 0 ) ).toBe( documentCountBeforeInvalid + 1 );
} );

test( 'conversion studio can insert reviewed HTML directly into the active page', async ( { page } ) => {
	await loadBuilderShell( page );
	const documentCountBefore = await page.evaluate( () => ( window as Window & { __builderEditor?: { engine: { getState: () => { project: { documents: unknown[] } } } } } ).__builderEditor?.engine.getState().project.documents.length ?? 0 );

	await page.getByRole( 'button', { name: 'Import HTML' } ).click();
	await page.getByLabel( 'Source name' ).fill( 'direct-html.html' );
	await page.getByLabel( 'HTML and CSS' ).fill( '<section id="direct-html-section" style="background-color: #f97316; padding: 24px;"><h1>Direct HTML Import</h1><p>Inserted into page.</p></section>' );
	await page.getByRole( 'dialog', { name: 'Review Import' } ).getByRole( 'button', { name: 'Review', exact: true } ).click();
	await page.getByLabel( 'Destination' ).selectOption( 'active-page' );
	await page.getByRole( 'dialog', { name: 'Review Import' } ).getByRole( 'button', { name: 'Import', exact: true } ).click();

	await expect( previewFrame( page ).getByRole( 'heading', { name: 'Direct HTML Import' } ) ).toBeVisible();
	await expect.poll( async () => page.evaluate( () => ( window as Window & { __builderEditor?: { engine: { getState: () => { project: { documents: unknown[] } } } } } ).__builderEditor?.engine.getState().project.documents.length ?? 0 ) ).toBe( documentCountBefore );
} );

test( 'the builder keeps a single vertical scroll owner on desktop routes', async ( { page } ) => {
	await loadBuilderShell( page );

	const metrics = await measureCanvasScrollBehavior( page );

	expect( metrics.bodyScrollHeight ).toBeLessThanOrEqual( metrics.viewportHeight );
	expect( metrics.pageScrollHeight ).toBe( metrics.viewportHeight );
	expect( metrics.stageScrollHeight ).toBeLessThanOrEqual( metrics.stageClientHeight + 1 );
	expect( [ 'auto', 'scroll' ] ).toContain( metrics.previewOverflowY );
} );

test( 'preview mount counters stay stable across selection, hover, and panel switches', async ( { page } ) => {
	await loadBuilderShell( page );

	const before = await readBuilderPerf( page );
	await navigatorRows( page ).first().click();
	await previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } ).hover();
	await switchToEditorPanel( page );
	await inspectorTabs( page ).nth( 1 ).click();
	await inspectorTabs( page ).nth( 2 ).click();
	await switchToElementsPanel( page );

	const after = await readBuilderPerf( page );

	expect( after.previewMounts ?? 0 ).toBe( before.previewMounts ?? 0 );
	expect( after.fullPreviewSyncs ?? 0 ).toBe( before.fullPreviewSyncs ?? 0 );
	expect( after.canvasMetricsDispatches ?? 0 ).toBeGreaterThanOrEqual( before.canvasMetricsDispatches ?? 0 );
	expect( after.overlayOnlyUpdates ?? 0 ).toBeGreaterThanOrEqual( before.overlayOnlyUpdates ?? 0 );
} );

test( 'dense 200-node drag pointer movement does not remount the preview or dispatch engine pointer updates', async ( { page } ) => {
	await loadBuilderShell( page, { fixture: 'dense-200' } );
	await switchToElementsPanel( page );

	await expect.poll( async () => previewFrame( page ).locator( '[data-builder-node]' ).count() ).toBeGreaterThanOrEqual( 200 );

	const palette = page.getByLabel( 'Element palette' );
	const containerTile = palette.getByRole( 'button', { name: 'Container' } ).first();
	const filledContainer = previewFrame( page )
		.getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } )
		.locator( 'xpath=ancestor::*[@data-builder-node and @data-builder-type="container"][1]' );
	await expect( filledContainer ).toBeVisible();

	const targetContainerId = await dragNewContainerIntoTargetAndReadId( page, containerTile, filledContainer );

	const containers = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' );
	await expect.poll( async () => containers.count() ).toBeGreaterThanOrEqual( 2 );

	const targetContainer = previewFrame( page ).locator( `[data-builder-node="${ targetContainerId }"]` );
	await expect( targetContainer ).toBeVisible();
	const sourceHeading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	const sourceHeadingNode = sourceHeading.locator( 'xpath=ancestor-or-self::*[@data-builder-node and @data-builder-type="heading"][1]' );
	await expect( sourceHeadingNode ).toBeVisible();
	const sourceHeadingId = await sourceHeadingNode.evaluate( ( element ) => element.getAttribute( 'data-builder-node' ) );
	if ( !sourceHeadingId ) {
		throw new Error( 'Unable to resolve the dense drag source heading id.' );
	}
	await sourceHeading.click( { force: true } );

	const before = await readBuilderPerf( page );
	await beginSelectedNodeGrabDragToTarget( page, targetContainer, { x: 0.52, y: 0.52 } );
	await expect( page.locator( '.builder-preview__drop-target' ) ).toBeVisible();

	const duringDrag = await readBuilderPerf( page );
	expect( duringDrag.previewMounts ?? 0 ).toBe( before.previewMounts ?? 0 );
	expect( duringDrag.fullPreviewSyncs ?? 0 ).toBe( before.fullPreviewSyncs ?? 0 );
	expect( duringDrag.canvasMetricsDispatches ?? 0 ).toBe( before.canvasMetricsDispatches ?? 0 );
	expect( duringDrag.geometrySnapshotsPosted ?? 0 ).toBeLessThanOrEqual( ( before.geometrySnapshotsPosted ?? 0 ) + 4 );
	expect( duringDrag.geometryFallbackSnapshots ?? 0 ).toBe( before.geometryFallbackSnapshots ?? 0 );
	expect( duringDrag.engineDragPointerDispatches ?? 0 ).toBe( before.engineDragPointerDispatches ?? 0 );
	expect( duringDrag.candidateResolutionCount ?? 0 ).toBeGreaterThan( before.candidateResolutionCount ?? 0 );

	await page.mouse.up();
	await expect.poll( async () => targetContainer.getByRole( 'heading', { name: 'Named slot orchestration' } ).count() ).toBe( 1 );
} );

test( 'left-panel pages stay stable after their first open', async ( { page } ) => {
	await loadBuilderShell( page );

	await switchToElementsPanel( page );
	const firstOpen = await elementsPanel( page ).evaluate( ( element ) => ( {
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
		childCount: element.querySelectorAll( '*' ).length,
	} ) );

	await switchToPageSettingsPanel( page );
	await switchToHistoryPanel( page );
	await switchToGlobalsPanel( page );
	await switchToMenuPanel( page );
	await switchToElementsPanel( page );

	const afterReopen = await elementsPanel( page ).evaluate( ( element ) => ( {
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
		childCount: element.querySelectorAll( '*' ).length,
	} ) );

	expect( afterReopen.clientWidth ).toBe( firstOpen.clientWidth );
	expect( afterReopen.scrollWidth ).toBeLessThanOrEqual( afterReopen.clientWidth + 1 );
	expect( afterReopen.childCount ).toBe( firstOpen.childCount );
} );

test( 'showing and hiding the docked navigator does not materially change page height', async ( { page } ) => {
	await loadBuilderShell( page );

	const baseline = await measurePageHeight( page );
	await expect( page.locator( '.builder-shell__navigator-floating' ) ).toHaveCount( 0 );
	await expect( page.locator( '.builder-shell__navigator-docked' ) ).toBeVisible();
	const visible = await measurePageHeight( page );

	await page.getByRole( 'button', { name: 'Hide Structure', exact: true } ).click();
	await expect( page.getByRole( 'button', { name: 'Show Structure', exact: true } ) ).toBeVisible();
	await expect( page.locator( '.builder-shell__navigator-docked:not(.builder-shell__navigator-docked--collapsed)' ) ).toHaveCount( 0 );
	const hidden = await measurePageHeight( page );

	expect( Math.abs( visible.scrollHeight - baseline.scrollHeight ) ).toBeLessThanOrEqual( 4 );
	expect( Math.abs( hidden.scrollHeight - baseline.scrollHeight ) ).toBeLessThanOrEqual( 4 );
} );

test( 'the selected overlay stays aligned after viewport and navigator layout changes', async ( { page } ) => {
	await loadBuilderShell( page );

	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );
	await heading.click( { force: true } );

	const nodeId = await heading.evaluate( ( element ) => element.closest( '[data-builder-node]' )?.getAttribute( 'data-builder-node' ) );
	if ( !nodeId ) {
		throw new Error( 'Unable to resolve the selected node for alignment checks.' );
	}

	await expect.poll( async () => ( await measurePreviewOverlayAlignment( page, nodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1 );

	await page.getByRole( 'button', { name: 'Responsive', exact: true } ).click();
	await page.getByRole( 'toolbar', { name: 'Preview devices' } ).getByRole( 'button', { name: /tablet/i } ).first().click();
	await expect.poll( async () => ( await measurePreviewOverlayAlignment( page, nodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );

	await page.getByRole( 'button', { name: 'Hide Structure', exact: true } ).click();
	await expect.poll( async () => ( await measurePreviewOverlayAlignment( page, nodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );

	await page.getByRole( 'button', { name: 'Show Structure', exact: true } ).click();
	await expect.poll( async () => ( await measurePreviewOverlayAlignment( page, nodeId ) )?.maxDelta ?? 999 ).toBeLessThanOrEqual( 1.5 );
} );

test( 'right-clicking a canvas node should open the shared Elementor-style node menu', async ( { page } ) => {
	await loadBuilderShell( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );

	await openCanvasContextMenu( heading );

	const contextMenu = contextMenuSurface( page );
	await expect( contextMenu ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Edit' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Copy' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Paste', exact: true } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Paste Style' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Duplicate' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Delete' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Add Child' } ) ).toHaveCount( 0 );
} );

test( 'context menu can paste copied styles onto another element without replacing content', async ( { page } ) => {
	await loadBuilderShell( page );
	const sourceHeading = previewFrame( page ).getByRole( 'heading', { name: 'Parity-oriented Svelte page building' } );
	const targetHeading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );

	const sourceNodeRef = await sourceHeading.evaluate( ( element ) => {
		const node = element.closest( '[data-builder-node]' );
		return {
			nodeId: node?.getAttribute( 'data-builder-node' ) ?? '',
			documentId: node?.getAttribute( 'data-builder-document' ) ?? '',
		};
	} );
	await page.evaluate( ( source ) => {
		if ( !source.nodeId || !source.documentId ) throw new Error( 'Unable to locate source heading node.' );
		const editor = ( window as Window & { __builderEditor?: { engine: { dispatch: ( command: unknown ) => void } } } ).__builderEditor;
		editor?.engine.dispatch( {
			type: 'document/elements/update',
			documentId: source.documentId,
			nodeId: source.nodeId,
			layoutPatch: { width: '72%' },
			stylesPatch: { base: { color: '#0c9488', backgroundColor: '#fef3c7' }, states: {}, breakpoints: {}, stateBreakpoints: {}, customCss: '' },
			styleRefs: [],
		} );
	}, sourceNodeRef );

	await expect.poll( async () => sourceHeading.evaluate( ( element ) => {
		const node = element.closest( '[data-builder-node]' );
		return node ? getComputedStyle( node ).color : '';
	} ) ).toBe( 'rgb(12, 148, 136)' );
	const targetTextBefore = await targetHeading.textContent();

	await openCanvasContextMenu( sourceHeading );
	await contextMenuSurface( page ).getByRole( 'menuitem', { name: 'Copy' } ).click();
	await expect( contextMenuSurface( page ) ).toBeHidden();

	await openCanvasContextMenu( targetHeading );
	await contextMenuSurface( page ).getByRole( 'menuitem', { name: 'Paste Style' } ).click();

	await expect( targetHeading ).toHaveText( targetTextBefore ?? '' );
	await expect.poll( async () => targetHeading.evaluate( ( element ) => {
		const node = element.closest( '[data-builder-node]' );
		return node ? getComputedStyle( node ).color : '';
	} ) ).toBe( 'rgb(12, 148, 136)' );
	await expect.poll( async () => targetHeading.evaluate( ( element ) => {
		const node = element.closest( '[data-builder-node]' );
		return node ? getComputedStyle( node ).backgroundColor : '';
	} ) ).toBe( 'rgb(254, 243, 199)' );
} );

test( 'right-clicking a navigator row should open the structure context menu', async ( { page } ) => {
	await loadBuilderShell( page );
	const row = navigatorFloatingPanel( page )
		.getByRole( 'group', { name: /Container structure row/i } )
		.first()
		.locator( '.navigator__row' );

	await openNavigatorContextMenu( row );

	const contextMenu = contextMenuSurface( page );
	await expect( contextMenu ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Edit' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Copy' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Paste', exact: true } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Paste Style' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Duplicate' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Add Child' } ) ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Delete' } ) ).toBeVisible();
} );

test( 'the V3 shell keeps the legacy drag ghost and legacy context menu placement out of the live path', async ( { page } ) => {
	await loadBuilderShell( page );

	const before = await readBuilderPerf( page );
	const heading = previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } );
	await openCanvasContextMenu( heading );

	const contextMenu = contextMenuSurface( page );
	await expect( contextMenu ).toBeVisible();
	await expect( contextMenu.getByRole( 'menuitem', { name: 'Edit' } ) ).toBeVisible();

	await previewFrame( page ).getByRole( 'heading', { name: 'Named slot orchestration' } ).click( { force: true } );
	const target = previewFrame( page ).locator( '[data-builder-node][data-builder-type="container"]' ).first();
	await beginSelectedNodeGrabDragToTarget( page, target, { x: 0.52, y: 0.52 } );

	await expect( page.locator( '.builder-preview__drag-ghost' ) ).toHaveCount( 0 );
	const during = await readBuilderPerf( page );
	expect( during.geometryFallbackSnapshots ?? 0 ).toBe( before.geometryFallbackSnapshots ?? 0 );
	expect( during.engineDragPointerDispatches ?? 0 ).toBe( before.engineDragPointerDispatches ?? 0 );

	await page.mouse.up();
} );

async function saveMockAiSettings( page: Page, debugMode = false ) {
	await page.getByRole( 'button', { name: 'AI', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: 'Settings' } ).click();
	await page.getByLabel( 'API endpoint' ).fill( 'https://mock-ai.test/v1' );
	await page.getByLabel( 'Model name' ).fill( 'mock-model' );
	await page.getByLabel( 'API key' ).fill( 'test-key' );
	const debugToggle = page.getByLabel( 'Debug mode' );
	if ( debugMode && await debugToggle.count() ) {
		await debugToggle.check();
	}
	await page.getByRole( 'button', { name: 'Save Settings' } ).click();
}

function aiSseBody( chunk: Record<string, unknown> ) {
	return `data: ${ JSON.stringify( chunk ) }\n\ndata: [DONE]\n\n`;
}
