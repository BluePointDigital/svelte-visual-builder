import type { JsonValue } from '@builder/schema';

export type BuilderAiProviderPreset = 'custom' | 'openrouter' | 'gemini-openai' | 'local';

export interface BuilderAiSettings {
	provider: BuilderAiProviderPreset;
	baseUrl: string;
	model: string;
	apiKey: string;
	headers: Record<string, string>;
	temperature: number;
	maxOutputTokens: number;
	maxToolIterations: number;
	systemInstructions: string;
	debugMode: boolean;
}

export interface BuilderAiSettingsAdapter {
	loadSettings: () => Promise<Partial<BuilderAiSettings> | undefined>;
	saveSettings: ( settings: BuilderAiSettings ) => Promise<void>;
}

export interface BuilderAiRequestOptions {
	settings: BuilderAiSettings;
	messages: BuilderAiApiMessage[];
	tools: BuilderAiToolDefinition[];
	signal?: AbortSignal;
}

export interface BuilderAiCreateRequest {
	prompt: string;
	targetParentId?: string;
	targetSlot?: string;
	designStyle?: string;
	overwriteThemeSettings?: boolean;
	contextNotes?: string;
}

export interface BuilderAiTranscriptMessage {
	id: string;
	role: 'user' | 'assistant' | 'tool' | 'system' | 'error';
	content: string;
	createdAt: string;
	toolName?: string;
}

export interface BuilderAiSessionState {
	mode: 'idle' | 'create' | 'edit';
	status: 'idle' | 'streaming' | 'applying' | 'error';
	messages: BuilderAiTranscriptMessage[];
	error?: string;
	activeRunId?: string;
	lastToolSummary?: string;
	createPreview?: {
		html: string;
		css?: string;
		title?: string;
	};
}

export type BuilderAiApiMessage =
	| { role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: BuilderAiToolCall[] }
	| { role: 'tool'; content: string; tool_call_id: string };

export interface BuilderAiToolDefinition {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, JsonValue>;
	};
}

export interface BuilderAiToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface BuilderAiToolExecutionResult {
	ok: boolean;
	summary: string;
	data?: JsonValue;
	terminal?: boolean;
	assistantMessage?: string;
}

export interface BuilderAiRunOptions {
	settings: BuilderAiSettings;
	systemPrompt: string;
	userPrompt: string;
	tools: BuilderAiToolDefinition[];
	executeTool: ( call: BuilderAiToolCall ) => Promise<BuilderAiToolExecutionResult>;
	onAssistantMessage?: ( content: string ) => void;
	onAssistantDelta?: ( content: string ) => void;
	onToolCallDelta?: ( call: BuilderAiToolCall ) => void;
	onToolResult?: ( call: BuilderAiToolCall, result: BuilderAiToolExecutionResult ) => void;
	onDebugMessage?: ( label: string, payload: JsonValue ) => void;
	signal?: AbortSignal;
	maxIterations?: number;
}

export const builderAiProviderPresets: Record<BuilderAiProviderPreset, { label: string; baseUrl: string; model: string }> = {
	custom: {
		label: 'OpenAI-compatible custom',
		baseUrl: 'https://api.openai.com/v1',
		model: 'gpt-4.1-mini',
	},
	openrouter: {
		label: 'OpenRouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		model: 'openai/gpt-4.1-mini',
	},
	'gemini-openai': {
		label: 'Gemini OpenAI-compatible',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		model: 'gemini-2.0-flash',
	},
	local: {
		label: 'Local/custom',
		baseUrl: 'http://localhost:1234/v1',
		model: 'local-model',
	},
};

const aiSettingsStorageKey = 'svelte-builder.ai-settings.v1';
const defaultMaxToolIterations = 6;
const minMaxToolIterations = 1;
const maxMaxToolIterations = 20;

export function createDefaultAiSettings( overrides: Partial<BuilderAiSettings> = {} ): BuilderAiSettings {
	const preset = builderAiProviderPresets[ overrides.provider ?? 'custom' ];
	return {
		provider: overrides.provider ?? 'custom',
		baseUrl: overrides.baseUrl ?? preset.baseUrl,
		model: overrides.model ?? preset.model,
		apiKey: overrides.apiKey ?? '',
		headers: overrides.headers ?? {},
		temperature: overrides.temperature ?? 0.4,
		maxOutputTokens: overrides.maxOutputTokens ?? 4096,
		maxToolIterations: normalizeMaxToolIterations( overrides.maxToolIterations ),
		systemInstructions: overrides.systemInstructions ?? '',
		debugMode: overrides.debugMode ?? false,
	};
}

export function normalizeMaxToolIterations( value: unknown ): number {
	const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number( value ) : Number.NaN;
	if ( !Number.isFinite( numeric ) ) {
		return defaultMaxToolIterations;
	}
	return Math.min( maxMaxToolIterations, Math.max( minMaxToolIterations, Math.trunc( numeric ) ) );
}

export function createDefaultAiSessionState(): BuilderAiSessionState {
	return {
		mode: 'idle',
		status: 'idle',
		messages: [],
	};
}

export function createBrowserAiSettingsAdapter( defaults: Partial<BuilderAiSettings> = {} ): BuilderAiSettingsAdapter {
	return {
		async loadSettings() {
			if ( typeof globalThis.localStorage === 'undefined' ) {
				return defaults;
			}
			const raw = globalThis.localStorage.getItem( aiSettingsStorageKey );
			if ( !raw ) {
				return defaults;
			}
			try {
				return { ...defaults, ...JSON.parse( raw ) as Partial<BuilderAiSettings> };
			} catch {
				return defaults;
			}
		},
		async saveSettings( settings ) {
			if ( typeof globalThis.localStorage === 'undefined' ) {
				return;
			}
			globalThis.localStorage.setItem( aiSettingsStorageKey, JSON.stringify( settings ) );
		},
	};
}

export function redactAiSettings( settings: Partial<BuilderAiSettings> ): Partial<BuilderAiSettings> {
	return {
		...settings,
		apiKey: settings.apiKey ? '[redacted]' : '',
		headers: Object.fromEntries(
			Object.entries( settings.headers ?? {} ).map( ( [ key, value ] ) => [
				key,
				/key|token|authorization/i.test( key ) || /bearer\s+/i.test( value ) ? '[redacted]' : value,
			] ),
		),
	};
}

export function normalizeAiChatCompletionsUrl( baseUrl: string ): string {
	const trimmed = baseUrl.trim().replace( /\/+$/, '' );
	if ( !trimmed ) {
		throw new Error( 'AI endpoint is required.' );
	}
	if ( /\/chat\/completions$/i.test( trimmed ) ) {
		return trimmed;
	}
	try {
		const url = new URL( trimmed );
		if ( /^api\.openai\.com$/i.test( url.hostname ) && ( url.pathname === '' || url.pathname === '/' ) ) {
			url.pathname = '/v1/chat/completions';
			return url.toString();
		}
	} catch {
		// Keep non-URL local/proxy values working by falling back to string concatenation.
	}
	return `${ trimmed }/chat/completions`;
}

export function buildOpenAiCompatibleRequest( { settings, messages, tools, signal }: BuilderAiRequestOptions ): RequestInit & { url: string } {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...settings.headers,
	};
	if ( settings.apiKey.trim() ) {
		headers.Authorization = `Bearer ${ settings.apiKey.trim() }`;
	}
	return {
		url: normalizeAiChatCompletionsUrl( settings.baseUrl ),
		method: 'POST',
		headers,
		signal,
		body: JSON.stringify( {
			model: settings.model,
			messages,
			tools,
			tool_choice: 'auto',
			stream: true,
			temperature: settings.temperature,
			max_tokens: settings.maxOutputTokens,
		} ),
	};
}

export async function* parseOpenAiSseStream( response: Response ): AsyncGenerator<Record<string, unknown>> {
	if ( !response.body ) {
		const payload = await response.json() as Record<string, unknown>;
		yield payload;
		return;
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while ( true ) {
		const { value, done } = await reader.read();
		buffer += decoder.decode( value, { stream: !done } );
		const frames = buffer.split( /\r?\n\r?\n/ );
		buffer = frames.pop() ?? '';
		for ( const frame of frames ) {
			for ( const payload of parseSseFrame( frame ) ) {
				if ( payload === '[DONE]' ) {
					return;
				}
				yield JSON.parse( payload ) as Record<string, unknown>;
			}
		}
		if ( done ) {
			break;
		}
	}

	for ( const payload of parseSseFrame( buffer ) ) {
		if ( payload !== '[DONE]' ) {
			yield JSON.parse( payload ) as Record<string, unknown>;
		}
	}
}

export function parseSseFrame( frame: string ): string[] {
	return frame
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( ( line ) => line.startsWith( 'data:' ) )
		.map( ( line ) => line.slice( 5 ).trim() )
		.filter( Boolean );
}

export async function runBuilderAiAgent( options: BuilderAiRunOptions ): Promise<void> {
	const messages: BuilderAiApiMessage[] = [
		{ role: 'system', content: options.systemPrompt },
		{ role: 'user', content: options.userPrompt },
	];
	const maxIterations = normalizeMaxToolIterations( options.maxIterations ?? options.settings.maxToolIterations );
	const toolSignatures = new Map<string, BuilderAiToolExecutionResult>();

	for ( let iteration = 0; iteration < maxIterations; iteration += 1 ) {
		options.signal?.throwIfAborted();
		const request = buildOpenAiCompatibleRequest( {
			settings: options.settings,
			messages,
			tools: options.tools,
			signal: options.signal,
		} );
		if ( options.settings.debugMode ) {
			options.onDebugMessage?.( `Sent to model (iteration ${ iteration + 1 })`, toDebugPayload( {
				endpoint: request.url,
				model: options.settings.model,
				messages,
				tools: toolsForDebug( options.tools ),
				temperature: options.settings.temperature,
				max_tokens: options.settings.maxOutputTokens,
			} ) );
		}
		const response = await fetch( request.url, request );
		if ( !response.ok ) {
			throw new Error( await formatAiHttpError( response, request.url ) );
		}

		const assistantContent: string[] = [];
		const toolCalls = new Map<number, BuilderAiToolCall>();
		for await ( const chunk of parseOpenAiSseStream( response ) ) {
			const choice = readFirstChoice( chunk );
			if ( !choice ) {
				continue;
			}
			const delta = choice.delta as Record<string, unknown> | undefined;
			const message = choice.message as Record<string, unknown> | undefined;
			const content = typeof delta?.content === 'string' ? delta.content : typeof message?.content === 'string' ? message.content : '';
			if ( content ) {
				assistantContent.push( content );
				options.onAssistantDelta?.( assistantContent.join( '' ) );
			}
			mergeToolCalls( toolCalls, delta?.tool_calls ?? message?.tool_calls );
			for ( const call of toolCalls.values() ) {
				options.onToolCallDelta?.( call );
			}
		}

		const orderedToolCalls = [ ...toolCalls.entries() ]
			.sort( ( [ left ], [ right ] ) => left - right )
			.map( ( [ , call ] ) => call )
			.filter( ( call ) => call.function.name && call.function.arguments.trim() );

		const content = assistantContent.join( '' ).trim();
		if ( options.settings.debugMode ) {
			options.onDebugMessage?.( `Model returned (iteration ${ iteration + 1 })`, toDebugPayload( {
				content,
				toolCalls: orderedToolCalls.map( ( call ) => ( {
					id: call.id,
					name: call.function.name,
					arguments: parseDebugJson( call.function.arguments ),
				} ) ),
			} ) );
		}
		if ( orderedToolCalls.length === 0 ) {
			if ( content ) {
				options.onAssistantMessage?.( content );
			}
			return;
		}

		messages.push( {
			role: 'assistant',
			content,
			tool_calls: orderedToolCalls,
		} );
		let hasToolFailure = false;
		let terminalResult: BuilderAiToolExecutionResult | undefined;
		for ( const call of orderedToolCalls ) {
			options.signal?.throwIfAborted();
			const signature = createToolCallSignature( call );
			const previousResult = toolSignatures.get( signature );
			if ( previousResult ) {
				if ( previousResult.ok && previousResult.terminal ) {
					const summary = `AI repeated an already applied ${ call.function.name } tool call, so the run was stopped to avoid duplicate changes.`;
					const repeatedResult: BuilderAiToolExecutionResult = {
						ok: true,
						summary,
						terminal: true,
						assistantMessage: previousResult.assistantMessage ?? previousResult.summary ?? summary,
					};
					options.onToolResult?.( call, repeatedResult );
					options.onDebugMessage?.( 'AI stopped repeated successful tool call', toDebugPayload( {
						tool: call.function.name,
						arguments: parseDebugJson( call.function.arguments ),
						previousSummary: previousResult.summary,
					} ) );
					options.onAssistantMessage?.( repeatedResult.assistantMessage ?? repeatedResult.summary );
					return;
				}
				if ( !previousResult.ok ) {
					const message = `AI repeated the same failing tool call without changing arguments: ${ call.function.name }. ${ previousResult.summary }`;
					options.onDebugMessage?.( 'AI stopped repeated failing tool call', toDebugPayload( {
						tool: call.function.name,
						arguments: parseDebugJson( call.function.arguments ),
						previousSummary: previousResult.summary,
					} ) );
					throw new Error( message );
				}
			}
			let result: BuilderAiToolExecutionResult;
			try {
				result = await options.executeTool( call );
			} catch ( error ) {
				result = {
					ok: false,
					summary: error instanceof Error ? error.message : `Tool ${ call.function.name } failed.`,
				};
			}
			toolSignatures.set( signature, result );
			hasToolFailure ||= !result.ok;
			if ( result.ok && result.terminal ) {
				terminalResult = result;
			}
			options.onToolResult?.( call, result );
			if ( options.settings.debugMode ) {
				options.onDebugMessage?.( `Builder parsed/applied ${ call.function.name }`, toDebugPayload( {
					ok: result.ok,
					summary: result.summary,
					data: result.data,
					terminal: result.terminal,
				} ) );
			}
			messages.push( {
				role: 'tool',
				tool_call_id: call.id,
				content: JSON.stringify( createModelFacingToolResult( result ) ),
			} );
		}
		if ( terminalResult && !hasToolFailure ) {
			options.onAssistantMessage?.( terminalResult.assistantMessage ?? terminalResult.summary );
			return;
		}
	}

	throw new Error( 'AI reached the maximum tool-iteration limit before finishing.' );
}

function createModelFacingToolResult( result: BuilderAiToolExecutionResult ): BuilderAiToolExecutionResult & { instruction?: string } {
	if ( result.ok && result.terminal ) {
		return {
			...result,
			instruction: 'The requested builder change has been applied. Respond concisely and do not call another tool unless more user-requested work remains.',
		};
	}
	if ( !result.ok ) {
		return {
			...result,
			instruction: 'Repair the arguments before retrying. Do not repeat the same call unchanged.',
		};
	}
	return result;
}

function createToolCallSignature( call: BuilderAiToolCall ): string {
	return JSON.stringify( {
		name: call.function.name,
		arguments: normalizeToolCallArgumentsForSignature( call.function.arguments ),
	} );
}

function normalizeToolCallArgumentsForSignature( value: string ): JsonValue {
	try {
		return sortJsonValue( JSON.parse( value ) as JsonValue );
	} catch {
		return value.trim();
	}
}

function sortJsonValue( value: JsonValue ): JsonValue {
	if ( Array.isArray( value ) ) {
		return value.map( sortJsonValue );
	}
	if ( value && typeof value === 'object' ) {
		return Object.fromEntries(
			Object.entries( value )
				.sort( ( [ left ], [ right ] ) => left.localeCompare( right ) )
				.map( ( [ key, entry ] ) => [ key, sortJsonValue( entry ) ] ),
		);
	}
	return value;
}

function toolsForDebug( tools: BuilderAiToolDefinition[] ): JsonValue {
	return tools.map( ( tool ) => ( {
		name: tool.function.name,
		description: tool.function.description,
		required: Array.isArray( tool.function.parameters.required ) ? tool.function.parameters.required : [],
	} ) ) as JsonValue;
}

function parseDebugJson( value: string ): JsonValue {
	try {
		return JSON.parse( value ) as JsonValue;
	} catch {
		return value;
	}
}

function toDebugPayload( value: unknown ): JsonValue {
	return JSON.parse( JSON.stringify( value ) ) as JsonValue;
}

async function formatAiHttpError( response: Response, url: string ): Promise<string> {
	let detail = '';
	try {
		const body = await response.text();
		if ( body.trim() ) {
			detail = extractProviderErrorMessage( body );
		}
	} catch {
		detail = '';
	}
	const statusText = response.statusText ? ` ${ response.statusText }` : '';
	const endpointHint = safeEndpointHint( url );
	return [
		`AI request failed with ${ response.status }${ statusText }.`,
		detail ? `Provider said: ${ detail }` : '',
		endpointHint ? `Endpoint: ${ endpointHint}` : '',
	].filter( Boolean ).join( ' ' );
}

function extractProviderErrorMessage( body: string ): string {
	try {
		const parsed = JSON.parse( body ) as unknown;
		if ( parsed && typeof parsed === 'object' ) {
			const record = parsed as Record<string, unknown>;
			const error = record.error;
			if ( typeof error === 'string' ) {
				return error;
			}
			if ( error && typeof error === 'object' ) {
				const errorRecord = error as Record<string, unknown>;
				if ( typeof errorRecord.message === 'string' ) {
					return errorRecord.message;
				}
				if ( typeof errorRecord.code === 'string' ) {
					return errorRecord.code;
				}
			}
			if ( typeof record.message === 'string' ) {
				return record.message;
			}
		}
	} catch {
		// Plain text error bodies are common on proxies and local model servers.
	}
	return body.trim().slice( 0, 500 );
}

function safeEndpointHint( url: string ): string {
	try {
		const parsed = new URL( url );
		return `${ parsed.origin }${ parsed.pathname }`;
	} catch {
		return url;
	}
}

function readFirstChoice( chunk: Record<string, unknown> ): Record<string, unknown> | undefined {
	const choices = chunk.choices;
	if ( !Array.isArray( choices ) || !choices.length ) {
		return undefined;
	}
	const first = choices[ 0 ];
	return first && typeof first === 'object' ? first as Record<string, unknown> : undefined;
}

function mergeToolCalls( calls: Map<number, BuilderAiToolCall>, value: unknown ) {
	if ( !Array.isArray( value ) ) {
		return;
	}
	for ( const entry of value ) {
		if ( !entry || typeof entry !== 'object' ) {
			continue;
		}
		const record = entry as Record<string, unknown>;
		const index = typeof record.index === 'number' ? record.index : calls.size;
		const current = calls.get( index ) ?? {
			id: '',
			type: 'function' as const,
			function: {
				name: '',
				arguments: '',
			},
		};
		const fn = record.function && typeof record.function === 'object' ? record.function as Record<string, unknown> : {};
		calls.set( index, {
			id: typeof record.id === 'string' && record.id ? record.id : current.id || `call_${ index }`,
			type: 'function',
			function: {
				name: current.function.name + ( typeof fn.name === 'string' ? fn.name : '' ),
				arguments: current.function.arguments + ( typeof fn.arguments === 'string' ? fn.arguments : '' ),
			},
		} );
	}
}

export function createAiSystemPrompt( extraInstructions = '' ): string {
	return [
		'You are an AI assistant embedded in a Svelte visual page builder.',
		'Use the available builder tools to inspect and mutate the project. Do not describe edits instead of applying them.',
		'For new content, use add_section_from_html with complete semantic HTML and CSS. The editor will convert it into valid editable Builder nodes.',
		'Generated HTML must include useful structure: section/container markup, heading, body copy, CTA or media when appropriate, and visual CSS.',
		'For edits, prefer semantic tools such as improve_section_visual_style, match_style_from_node, rewrite_text_content, make_section_responsive, apply_brand_palette, convert_selection_to_pricing, convert_selection_to_hero, and add_cta_block.',
		'Use the provided full page context plus inspect/search tools before editing when the target is ambiguous. If no target is selected and the request is broad, choose the most relevant existing page section from context instead of asking for selection.',
		'Do not rely on arbitrary raw Builder JSON. Heading levels must be h1, h2, h3, h4, h5, or h6.',
		'If a tool returns ok:false, repair the arguments and retry instead of repeating the same invalid call.',
		'When a create or edit mutation tool succeeds, the requested builder change is complete; respond concisely instead of calling more tools unless more user-requested work remains.',
		extraInstructions,
	].filter( Boolean ).join( '\n' );
}

export function makeAiTranscriptMessage( role: BuilderAiTranscriptMessage['role'], content: string, extra: Partial<BuilderAiTranscriptMessage> = {} ): BuilderAiTranscriptMessage {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		createdAt: new Date().toISOString(),
		...extra,
	};
}
