import type { Binding, ConditionGroup, JsonValue, ThemeAssignment } from '@builder/schema';
import type {
	BindingProviderContext,
	BuilderHostAdapter,
	BuilderHostMediaAdapter,
	BuilderHostPermissionAdapter,
	BuilderHostPersistenceAdapter,
	BuilderRoutePreviewContextAdapter,
	TemplateConditionContext,
} from '@builder/plugin-api';

export interface SvelteKitBuilderAdapterOptions {
	id?: string;
	label?: string;
}

export interface SvelteKitBuilderIntegrationOptions {
	id?: string;
	label?: string;
	persistence?: BuilderHostPersistenceAdapter;
	media?: BuilderHostMediaAdapter;
	permissions?: BuilderHostPermissionAdapter;
	aiSettings?: {
		loadSettings: () => Promise<Record<string, unknown> | undefined>;
		saveSettings: ( settings: Record<string, unknown> ) => Promise<void>;
	};
	defaultAiSettings?: Record<string, unknown>;
	previewContext?: BindingProviderContext;
	routePreview?: BuilderRoutePreviewContextAdapter;
}

export interface SvelteKitBuilderIntegration {
	adapter: BuilderHostAdapter;
	editor: {
		adapter: {
			host: BuilderHostAdapter;
			route?: BuilderRoutePreviewContextAdapter;
			previewContext?: BindingProviderContext;
		};
		persistence: {
			host?: BuilderHostPersistenceAdapter;
		};
		media: {
			adapter?: BuilderHostMediaAdapter;
		};
		permissions?: BuilderHostPermissionAdapter;
		ai: {
			settings?: SvelteKitBuilderIntegrationOptions['aiSettings'];
			defaultSettings?: Record<string, unknown>;
		};
		initialState: {
			bindingContext?: BindingProviderContext;
		};
	};
	runtime: {
		adapter: BuilderHostAdapter;
		bindingContext?: BindingProviderContext;
		media?: BuilderHostMediaAdapter;
	};
}

export function createSvelteKitBuilderAdapter( options: SvelteKitBuilderAdapterOptions = {} ): BuilderHostAdapter {
	return {
		id: options.id ?? 'sveltekit',
		label: options.label ?? 'SvelteKit',
		resolveBinding( binding, context ) {
			return resolveSvelteKitBinding( binding, context );
		},
		resolveDynamicProvider( providerId, context, settings = {} ) {
			return resolveSvelteKitDynamicProvider( providerId, context, settings );
		},
		matchesConditionGroup( group, context ) {
			return matchesSvelteKitConditionGroup( group, context );
		},
		matchesAssignment( assignment, context ) {
			return matchesSvelteKitAssignment( assignment, context );
		},
		resolveCollection( source, context, query = {} ) {
			return resolveSvelteKitCollection( source, context, query );
		},
	};
}

export function createSvelteKitBuilderIntegration( options: SvelteKitBuilderIntegrationOptions = {} ): SvelteKitBuilderIntegration {
	const adapter = createSvelteKitBuilderAdapter( {
		id: options.id,
		label: options.label,
	} );
	return {
		adapter,
		editor: {
			adapter: {
				host: adapter,
				route: options.routePreview,
				previewContext: options.previewContext,
			},
			persistence: {
				host: options.persistence,
			},
			media: {
				adapter: options.media,
			},
			permissions: options.permissions,
			ai: {
				settings: options.aiSettings,
				defaultSettings: options.defaultAiSettings,
			},
			initialState: {
				bindingContext: options.previewContext,
			},
		},
		runtime: {
			adapter,
			bindingContext: options.previewContext,
			media: options.media,
		},
	};
}

export function resolveSvelteKitBinding( binding: Binding, context: BindingProviderContext ): unknown {
	switch ( binding.source ) {
		case 'route':
			return getByPath( context.routeParams ?? {}, binding.path ) ?? binding.fallback;
		case 'load':
			return getByPath( context.loadData ?? {}, binding.path ) ?? binding.fallback;
		case 'site':
			return getByPath( context.siteData ?? {}, binding.path ) ?? binding.fallback;
		case 'query':
			return context.query?.get( binding.path ) ?? binding.fallback;
		case 'request':
			return context.request ? getByPath( requestToObject( context.request ), binding.path ) ?? binding.fallback : binding.fallback;
		case 'collection':
			return getByPath( context.record ?? {}, binding.path ) ?? binding.fallback;
		case 'session':
			return getByPath( context.session ?? {}, binding.path ) ?? binding.fallback;
		case 'component-prop':
			return getByPath( context.componentProps ?? {}, binding.path ) ?? binding.fallback;
		case 'document':
			return context.document ? getByPath( context.document as unknown as Record<string, unknown>, binding.path ) ?? binding.fallback : binding.fallback;
		case 'dynamic':
			return resolveSvelteKitDynamicProvider( binding.path, context, binding.args ) ?? binding.fallback;
	}
}

export function resolveSvelteKitDynamicProvider(
	providerId: string,
	context: BindingProviderContext,
	settings: Record<string, JsonValue> = {},
): unknown {
	const path = typeof settings.path === 'string' ? settings.path : typeof settings.key === 'string' ? settings.key : '';
	switch ( providerId ) {
		case 'post-title':
		case 'page-title':
			return getByPath( context.record ?? context.loadData ?? {}, path || 'title' ) ?? context.document?.title;
		case 'post-url':
			return getByPath( context.record ?? context.loadData ?? {}, path || 'url' );
		case 'site-title':
			return getByPath( context.siteData ?? {}, path || 'title' );
		case 'site-tagline':
			return getByPath( context.siteData ?? {}, path || 'tagline' );
		case 'request-parameter':
			return context.query?.get( path );
		case 'custom-path':
		default:
			return getByPath( context.record ?? context.loadData ?? context.siteData ?? {}, path || providerId );
	}
}

export function matchesSvelteKitConditionGroup( group: ConditionGroup, context: TemplateConditionContext ): boolean {
	const evaluate = ( rule: ConditionGroup['rules'][ number ] ) => compareValue( resolveConditionValue( rule.source, rule.path, context ), rule.operator, rule.value, rule.values );
	return group.operator === 'or' ? group.rules.some( evaluate ) : group.rules.every( evaluate );
}

export function matchesSvelteKitAssignment( assignment: ThemeAssignment, context: TemplateConditionContext ): boolean {
	if ( assignment.pathname && !routePatternToRegExp( assignment.pathname ).test( normalizePathname( context.pathname ) ) ) {
		return false;
	}

	if ( !assignment.conditionGroups.length ) {
		return true;
	}

	return assignment.conditionGroups.some( ( group ) => matchesSvelteKitConditionGroup( group, context ) );
}

export function resolveSvelteKitCollection(
	source: string,
	context: BindingProviderContext,
	query: Record<string, JsonValue> = {},
): Array<Record<string, unknown>> {
	const collections = context.collections ?? {};
	let records = normalizeCollectionRecords( collections[ source ] );
	for ( const filter of extractCollectionFilters( query ) ) {
		records = records.filter( ( record ) => compareValue(
			getByPath( record, filter.path ),
			filter.operator,
			filter.value,
			filter.values,
		) );
	}

	const orderBy = typeof query.orderBy === 'string' ? query.orderBy : undefined;
	if ( orderBy ) {
		const direction = query.direction === 'desc' ? -1 : 1;
		records = [ ...records ].sort( ( left, right ) => compareSortValues( getByPath( left, orderBy ), getByPath( right, orderBy ) ) * direction );
	}

	const limit = typeof query.limit === 'number'
		? query.limit
		: typeof query.limit === 'string' && query.limit.trim() !== '' && Number.isFinite( Number( query.limit ) )
			? Number( query.limit )
			: undefined;
	return limit ? records.slice( 0, limit ) : records;
}

function resolveConditionValue( source: ConditionGroup['rules'][ number ][ 'source' ], path: string, context: TemplateConditionContext ): unknown {
	switch ( source ) {
		case 'route':
			return path === 'pathname' ? normalizePathname( context.pathname ) : undefined;
		case 'query':
			return context.query?.get( path );
		case 'site':
			return getByPath( context.siteData ?? {}, path );
		case 'request':
			return context.request ? getByPath( requestToObject( context.request ), path ) : undefined;
		case 'load':
			return getByPath( context.data ?? {}, path );
		case 'collection':
			return getByPath( context.record ?? {}, path );
		case 'session':
			return getByPath( context.session ?? {}, path );
		case 'document':
			return context.document ? getByPath( context.document as unknown as Record<string, unknown>, path ) : undefined;
	}
}

function compareValue( actual: unknown, operator: string, expected?: JsonValue, values: JsonValue[] = [] ): boolean {
	switch ( operator ) {
		case 'exists':
			return actual !== undefined && actual !== null && actual !== '';
		case 'not-exists':
			return actual === undefined || actual === null || actual === '';
		case 'contains':
			return String( actual ?? '' ).includes( String( expected ?? '' ) );
		case 'matches':
			return new RegExp( String( expected ?? '' ) ).test( String( actual ?? '' ) );
		case 'startsWith':
			return String( actual ?? '' ).startsWith( String( expected ?? '' ) );
		case 'truthy':
			return Boolean( actual );
		case 'in':
			return values.map( String ).includes( String( actual ?? '' ) );
		case 'equals':
		default:
			return String( actual ?? '' ) === String( expected ?? '' );
	}
}

function requestToObject( request: Request ) {
	return {
		url: request.url,
		method: request.method,
		headers: Object.fromEntries( request.headers.entries() ),
	};
}

function getByPath( value: unknown, path: string ): unknown {
	return path.split( '.' ).reduce<unknown>( ( current, segment ) => {
		if ( current && typeof current === 'object' && segment in ( current as Record<string, unknown> ) ) {
			return ( current as Record<string, unknown> )[ segment ];
		}
		return undefined;
	}, value );
}

function routePatternToRegExp( pattern: string ): RegExp {
	const normalizedPattern = normalizePathname( pattern );
	if ( normalizedPattern === '*' || normalizedPattern === '/*' || normalizedPattern === '/[...all]' || normalizedPattern === '/(.*)' ) {
		return /^\/(?:.*)?$/;
	}

	const segments = normalizedPattern.split( '/' ).filter( Boolean );
	if ( !segments.length ) {
		return /^\/$/;
	}

	const expression = segments
		.map( ( segment ) => {
			if ( segment === '*' || segment === '(.*)' ) {
				return '.*';
			}
			if ( /^\[\.\.\..+\]$/.test( segment ) ) {
				return '.*';
			}
			if ( /^\[.+\]$/.test( segment ) ) {
				return '[^/]+';
			}
			return segment.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
		} )
		.join( '/' );

	return new RegExp( `^/${ expression }/?$` );
}

function normalizePathname( pathname: string | undefined ): string {
	if ( !pathname ) {
		return '/';
	}

	const value = pathname.split( '?' )[ 0 ]?.split( '#' )[ 0 ] ?? pathname;
	const normalized = value.startsWith( '/' ) ? value : `/${ value }`;
	if ( normalized.length === 1 ) {
		return normalized;
	}

	return normalized.replace( /\/+$/, '' );
}

function normalizeCollectionRecords( value: unknown ): Array<Record<string, unknown>> {
	if ( !Array.isArray( value ) ) {
		return [];
	}

	return value.filter( ( entry ): entry is Record<string, unknown> => Boolean( entry ) && typeof entry === 'object' && !Array.isArray( entry ) );
}

function extractCollectionFilters( query: Record<string, JsonValue> ): Array<{
	path: string;
	operator: string;
	value?: JsonValue;
	values?: JsonValue[];
}> {
	if ( typeof query.path === 'string' && query.path ) {
		return [ {
			path: query.path,
			operator: typeof query.operator === 'string' ? query.operator : 'equals',
			value: query.value,
			values: Array.isArray( query.values ) ? query.values : [],
		} ];
	}

	if ( !Array.isArray( query.filters ) ) {
		return [];
	}

	return query.filters
		.map( ( filter ) => filter && typeof filter === 'object' && !Array.isArray( filter ) ? filter as Record<string, JsonValue> : undefined )
		.filter( Boolean )
		.map( ( filter ) => ( {
			path: typeof filter!.path === 'string' ? filter!.path : '',
			operator: typeof filter!.operator === 'string' ? filter!.operator : 'equals',
			value: filter!.value,
			values: Array.isArray( filter!.values ) ? filter!.values : [],
		} ) )
		.filter( ( filter ) => Boolean( filter.path ) );
}

function compareSortValues( left: unknown, right: unknown ): number {
	if ( typeof left === 'number' && typeof right === 'number' ) {
		return left - right;
	}

	return String( left ?? '' ).localeCompare( String( right ?? '' ) );
}
