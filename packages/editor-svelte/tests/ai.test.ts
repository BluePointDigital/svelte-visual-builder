import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createBuilderPackage, createEmptyDocument, createNode } from '@builder/schema';
import { buildOpenAiCompatibleRequest, createBrowserAiSettingsAdapter, createDefaultAiSettings, normalizeAiChatCompletionsUrl, parseSseFrame, redactAiSettings } from '../src/lib/ai';
import { analyzeGeneratedHtmlQuality, getModelFacingAiTools } from '../src/lib/ai-tools';
import { createBuilderEditor } from '../src/lib/editor';

describe( 'AI builder assistant', () => {
	const originalFetch = globalThis.fetch;

	beforeEach( () => {
		vi.restoreAllMocks();
	} );

	afterEach( () => {
		globalThis.fetch = originalFetch;
	} );

	it( 'loads and saves browser settings and redacts secrets', async () => {
		const store = new Map<string, string>();
		Object.defineProperty( globalThis, 'localStorage', {
			value: {
				getItem: ( key: string ) => store.get( key ) ?? null,
				setItem: ( key: string, value: string ) => store.set( key, value ),
			},
			configurable: true,
		} );
		const adapter = createBrowserAiSettingsAdapter();
		const settings = createDefaultAiSettings( {
			provider: 'openrouter',
			baseUrl: 'https://openrouter.ai/api/v1',
			model: 'openai/gpt-4.1-mini',
			apiKey: 'secret-key',
			headers: { Authorization: 'Bearer hidden', 'X-App': 'Builder' },
		} );

		await adapter.saveSettings( settings );

		await expect( adapter.loadSettings() ).resolves.toMatchObject( {
			provider: 'openrouter',
			apiKey: 'secret-key',
		} );
		expect( redactAiSettings( settings ) ).toMatchObject( {
			apiKey: '[redacted]',
			headers: {
				Authorization: '[redacted]',
				'X-App': 'Builder',
			},
		} );
	} );

	it( 'formats OpenAI-compatible requests and SSE frames', () => {
		const settings = createDefaultAiSettings( {
			baseUrl: 'https://api.example.com/v1/',
			model: 'builder-model',
			apiKey: 'abc',
			headers: { 'X-Test': 'yes' },
		} );
		const request = buildOpenAiCompatibleRequest( {
			settings,
			messages: [ { role: 'user', content: 'Hello' } ],
			tools: [],
		} );

		expect( request.url ).toBe( 'https://api.example.com/v1/chat/completions' );
		expect( request.headers ).toMatchObject( {
			Authorization: 'Bearer abc',
			'X-Test': 'yes',
		} );
		expect( JSON.parse( request.body as string ) ).toMatchObject( {
			model: 'builder-model',
			stream: true,
			tool_choice: 'auto',
		} );
		expect( parseSseFrame( 'event: message\ndata: {"ok":true}\n\ndata: [DONE]\n\n' ) ).toEqual( [ '{"ok":true}', '[DONE]' ] );
		expect( normalizeAiChatCompletionsUrl( 'https://api.openai.com' ) ).toBe( 'https://api.openai.com/v1/chat/completions' );
		expect( normalizeAiChatCompletionsUrl( 'https://api.openai.com/v1' ) ).toBe( 'https://api.openai.com/v1/chat/completions' );
	} );

	it( 'exposes semantic edit tools while keeping raw mutations off the model-facing list', () => {
		const editToolNames = getModelFacingAiTools( 'edit' ).map( ( tool ) => tool.function.name );
		expect( editToolNames ).toEqual( expect.arrayContaining( [
			'improve_section_visual_style',
			'match_style_from_node',
			'rewrite_text_content',
			'make_section_responsive',
			'apply_brand_palette',
			'convert_selection_to_pricing',
			'convert_selection_to_hero',
			'add_cta_block',
		] ) );
		expect( editToolNames ).not.toContain( 'update_node' );
		expect( editToolNames ).not.toContain( 'create_node_batch' );

		const createToolNames = getModelFacingAiTools( 'create' ).map( ( tool ) => tool.function.name );
		expect( createToolNames ).toContain( 'add_section_from_html' );
		expect( createToolNames ).not.toContain( 'update_node' );
	} );

	it( 'detects low-detail generated HTML before mutation', () => {
		expect( analyzeGeneratedHtmlQuality( '<h1>Hi</h1>' ).ok ).toBe( false );
		expect( analyzeGeneratedHtmlQuality(
			'<section class="hero"><h1>Premium restaurant</h1><p>Reserve a memorable table with seasonal dishes and warm service.</p><a href="#">Book now</a></section>',
			'.hero { padding: 4rem; background: #111827; color: white; }',
		) ).toMatchObject( { ok: true } );
	} );

	it( 'startAiCreate streams HTML into editable Builder nodes', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		const toolArgs = {
			summary: 'AI: Create hero',
			title: 'AI Hero',
			css: '.ai-hero { background: orange; padding: 4rem; }',
			html: '<section class="ai-hero"><h1>AI Hero</h1><p>Generated copy</p><a class="btn" href="#">Start</a></section>',
		};
		const toolChunk = {
			choices: [ {
				delta: {
					tool_calls: [ {
						index: 0,
						id: 'call_1',
						type: 'function',
						function: {
							name: 'add_section_from_html',
							arguments: JSON.stringify( toolArgs ),
						},
					} ],
				},
				finish_reason: 'tool_calls',
			} ],
		};
		const finalChunk = {
			choices: [ {
				delta: { content: 'Done.' },
				finish_reason: 'stop',
			} ],
		};
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolChunk ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk ] ) ) as typeof fetch;

		await editor.startAiCreate( { prompt: 'Create a hero section' } );

		const root = editor.engine.getState().project.documents[ 0 ].root;
		expect( root ).toHaveLength( 1 );
		expect( root[ 0 ].type ).toBe( 'container' );
		expect( root[ 0 ].children[ 0 ].children.map( ( node ) => node.type ) ).toEqual( [ 'heading', 'paragraph', 'button' ] );
		expect( root[ 0 ].children[ 0 ].children[ 0 ].props.text ).toBe( 'AI Hero' );
		expect( editor.getAiSession().messages.some( ( message ) => message.role === 'tool' && message.content.includes( 'imported HTML' ) ) ).toBe( true );
	} );

	it( 'debug mode records sent prompts, returned tool args, and parsed HTML nodes', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
						debugMode: true,
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'add_section_from_html', {
				title: 'Debug Hero',
				css: '.debug-hero { color: orange; }',
				html: '<section class="debug-hero"><h1>Debug Hero</h1><p>Generated copy with enough context to import safely.</p><a href="#">Start</a></section>',
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.startAiCreate( { prompt: 'Create a debug hero' } );

		const debugMessages = editor.getAiSession().messages.filter( ( message ) => message.toolName === 'debug' );
		expect( debugMessages.map( ( message ) => message.content ) ).toEqual( expect.arrayContaining( [
			expect.stringContaining( 'Sent to model' ),
			expect.stringContaining( 'Model returned' ),
			expect.stringContaining( 'Builder parsed/applied add_section_from_html' ),
		] ) );
		const parsedDebug = debugMessages.find( ( message ) => message.content.includes( 'Builder parsed/applied add_section_from_html' ) );
		expect( parsedDebug?.content ).toContain( 'parsedNodes' );
		expect( parsedDebug?.content ).toContain( 'Debug Hero' );
	} );

	it( 'semantic style edits mutate through a single undoable transaction', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( {
			id: 'hero',
			type: 'container',
			children: [
				createNode( { id: 'title', type: 'heading', props: { text: 'Old title' } } ),
				createNode( { id: 'cta', type: 'button', props: { text: 'Click' } } ),
			],
		} ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		editor.engine.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'improve_section_visual_style', {
				backgroundColor: '#fff7ed',
				primaryColor: '#f97316',
				textColor: '#111827',
				style: 'premium',
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.sendAiMessage( 'Make this section more beautiful' );

		let hero = editor.engine.getState().project.documents[ 0 ].root[ 0 ];
		expect( hero.styles.base.backgroundColor ).toBe( '#fff7ed' );
		expect( hero.styles.base.padding ).toContain( 'clamp' );
		expect( editor.engine.getState().history.past.at( -1 )?.label ).toBe( 'AI: Improve section visual style' );

		editor.undo();
		hero = editor.engine.getState().project.documents[ 0 ].root[ 0 ];
		expect( hero.styles.base.backgroundColor ).toBeUndefined();
	} );

	it( 'semantic match style copies visual styles from source to selected target', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [
			createNode( { id: 'source', type: 'button', props: { text: 'Source' }, styles: { base: { backgroundColor: '#111827', color: '#ffffff', borderRadius: '20px' }, states: {}, breakpoints: {}, stateBreakpoints: {}, customCss: '' } } ),
			createNode( { id: 'target', type: 'button', props: { text: 'Target' } } ),
		];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		editor.engine.dispatch( { type: 'document/ui/select-node', nodeId: 'target' } );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'match_style_from_node', {
				sourceNodeId: 'source',
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.sendAiMessage( 'Match the target button style to the source' );

		const target = editor.engine.getState().project.documents[ 0 ].root[ 1 ];
		expect( target.styles.base ).toMatchObject( {
			backgroundColor: '#111827',
			color: '#ffffff',
			borderRadius: '20px',
		} );
	} );

	it( 'semantic tools reject missing targets without mutating', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'improve_section_visual_style', {
				backgroundColor: '#fff7ed',
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.sendAiMessage( 'Make this section better' );

		expect( editor.engine.getState().project.documents[ 0 ].root ).toHaveLength( 0 );
		expect( editor.getAiSession().messages.some( ( message ) => message.role === 'tool' && message.content.includes( 'needs a selected target node' ) ) ).toBe( true );
	} );

	it( 'sparse AI create output returns a repairable diagnostic and does not mutate', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'add_section_from_html', {
				html: '<h1>Nice</h1>',
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.startAiCreate( { prompt: 'Create a premium restaurant hero' } );

		expect( editor.engine.getState().project.documents[ 0 ].root ).toHaveLength( 0 );
		expect( editor.getAiSession().messages.some( ( message ) => message.role === 'tool' && message.content.includes( 'Low detail generation' ) ) ).toBe( true );
	} );

	it( 'normalizes numeric heading levels in direct Builder node tool calls', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'create_node_batch', {
				nodes: [ { type: 'heading', props: { text: 'Safe heading', level: '1' } } ],
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.startAiCreate( { prompt: 'Create a heading' } );

		const heading = editor.engine.getState().project.documents[ 0 ].root[ 0 ];
		expect( heading.type ).toBe( 'heading' );
		expect( heading.props.level ).toBe( 'h1' );
	} );

	it( 'rejects invalid AI node props without mutating state', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'create_node_batch', {
				nodes: [ { type: 'heading', props: { text: 'Bad heading', level: 'h' } } ],
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.startAiCreate( { prompt: 'Create a bad heading' } );

		expect( editor.engine.getState().project.documents[ 0 ].root ).toHaveLength( 0 );
		expect( editor.getAiSession().messages.some( ( message ) => message.role === 'tool' && message.content.includes( 'Invalid heading level' ) ) ).toBe( true );
	} );

	it( 'set_node_background updates only background style state', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'container', styles: { base: { padding: '20px' }, states: {}, breakpoints: {}, stateBreakpoints: {}, customCss: '' } } ) ];
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
						apiKey: 'test',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce( sseResponse( [ toolCallChunk( 'set_node_background', {
				nodeId: 'hero',
				color: 'orange',
			} ) ] ) )
			.mockResolvedValueOnce( sseResponse( [ finalChunk() ] ) ) as typeof fetch;

		await editor.sendAiMessage( 'Change the hero background to orange' );

		const hero = editor.engine.getState().project.documents[ 0 ].root[ 0 ];
		expect( hero.styles.base.padding ).toBe( '20px' );
		expect( hero.styles.base.backgroundColor ).toBe( 'orange' );
	} );

	it( 'reports provider errors without mutating the document', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const editor = createBuilderEditor( createBuilderPackage( 'Demo', [ document ] ), {
			ai: {
				settings: {
					loadSettings: async () => createDefaultAiSettings( {
						baseUrl: 'https://mock-ai.test/v1',
						model: 'mock-model',
					} ),
					saveSettings: async () => {},
				},
			},
		} );
		globalThis.fetch = vi.fn().mockResolvedValue( new Response( JSON.stringify( { error: { message: 'Model not found' } } ), { status: 404 } ) ) as typeof fetch;

		await editor.startAiCreate( { prompt: 'Create a hero section' } );

		expect( editor.engine.getState().project.documents[ 0 ].root ).toHaveLength( 0 );
		expect( editor.getAiSession().status ).toBe( 'error' );
		expect( editor.getAiSession().error ).toContain( '404' );
		expect( editor.getAiSession().error ).toContain( 'Model not found' );
		expect( editor.getAiSession().error ).toContain( 'https://mock-ai.test/v1/chat/completions' );
	} );
} );

function toolCallChunk( name: string, args: Record<string, unknown> ) {
	return {
		choices: [ {
			delta: {
				tool_calls: [ {
					index: 0,
					id: `call_${ name }`,
					type: 'function',
					function: {
						name,
						arguments: JSON.stringify( args ),
					},
				} ],
			},
			finish_reason: 'tool_calls',
		} ],
	};
}

function finalChunk() {
	return {
		choices: [ {
			delta: { content: 'Done.' },
			finish_reason: 'stop',
		} ],
	};
}

function sseResponse( chunks: Array<Record<string, unknown>> ): Response {
	const body = chunks.map( ( chunk ) => `data: ${ JSON.stringify( chunk ) }\n\n` ).join( '' ) + 'data: [DONE]\n\n';
	return new Response( body, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	} );
}
