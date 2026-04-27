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
	systemInstructions: string;
	debugMode: boolean;
}

export interface BuilderAiSettingsAdapter {
	loadSettings: () => Promise<Partial<BuilderAiSettings> | undefined>;
	saveSettings: ( settings: BuilderAiSettings ) => Promise<void>;
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
		systemInstructions: overrides.systemInstructions ?? '',
		debugMode: overrides.debugMode ?? false,
	};
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

export function makeAiTranscriptMessage( role: BuilderAiTranscriptMessage['role'], content: string, extra: Partial<BuilderAiTranscriptMessage> = {} ): BuilderAiTranscriptMessage {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		createdAt: new Date().toISOString(),
		...extra,
	};
}
