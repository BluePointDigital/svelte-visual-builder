import type { JsonValue } from '@builder/schema';
import type {
	BuilderControlFieldDefinition,
	BuilderControlOption,
	BuilderControlPrimitive,
	BuilderControlPrimitiveKind,
	BuilderControlSectionPrimitive,
	BuilderControlSliderUnit,
	BuilderControlStateTab,
	BuilderControlTabsItem,
	BuilderFieldDefinition,
	BuilderFieldType,
	BuilderStylePropertyDefinition,
} from '@builder/plugin-api';

export type PrimitiveControlKind = BuilderControlPrimitiveKind;
export type PrimitiveControlInput =
	| BuilderControlPrimitive
	| BuilderControlFieldDefinition
	| BuilderStylePropertyDefinition
	| BuilderFieldDefinition
	| null
	| undefined;

export interface PrimitiveControlState {
	activeStateTab?: BuilderControlStateTab;
	breakpoint?: string;
	breakpointLabel?: string;
	collapsed?: boolean;
	compact?: boolean;
	disabled?: boolean;
	hasOverride?: boolean;
	inherited?: boolean;
	invalid?: boolean;
	loading?: boolean;
	readOnly?: boolean;
	responsive?: boolean;
	canReset?: boolean;
	showPreview?: boolean;
}

export interface PrimitiveControlResolved {
	kind: PrimitiveControlKind | 'generic' | 'text' | 'textarea' | 'number' | 'json';
	label: string;
	description?: string;
	placeholder?: string;
	fieldType?: BuilderFieldType;
	primitive?: PrimitiveControlInput;
	stateTabs: BuilderControlStateTab[];
	responsive: boolean;
	stateful: boolean;
	tokenAware: boolean;
	options: BuilderControlOption[];
	tabs: BuilderControlTabsItem[];
	units: BuilderControlSliderUnit[];
	multiple?: boolean;
	showInput?: boolean;
	showUnit?: boolean;
	showRange?: boolean;
	showReset?: boolean;
	allowCustomUnit?: boolean;
	linked?: boolean;
	range?: boolean;
	handles?: 'single' | 'range';
	assetType?: 'image' | 'video' | 'file';
	allowDynamic?: boolean;
	showUpload?: boolean;
	showReplace?: boolean;
	showRemove?: boolean;
	showLibrary?: boolean;
	showNewTab?: boolean;
	showNoFollow?: boolean;
	showDownload?: boolean;
	showCustomAttributes?: boolean;
	showLinkIcon?: boolean;
	allowClear?: boolean;
	searchable?: boolean;
	size?: 'small' | 'medium' | 'large';
	orientation?: 'horizontal' | 'vertical';
	layout?: 'inline' | 'grid' | 'stack';
	iconPosition?: 'start' | 'top' | 'end';
	presentation?: 'icon-label' | 'icon-only' | 'label-only';
	columns?: number;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	density?: 'compact' | 'default';
	section?: BuilderControlSectionPrimitive;
}

export interface PrimitiveDimensionsValue {
	top?: string;
	right?: string;
	bottom?: string;
	left?: string;
	unit?: string;
	linked?: boolean;
}

export interface PrimitiveSliderValue {
	value?: number | string;
	unit?: string;
	start?: number | string;
	end?: number | string;
}

export interface PrimitiveUrlValue {
	url?: string;
	newTab?: boolean;
	noFollow?: boolean;
	download?: boolean;
	customAttributes?: string;
	linkIcon?: string;
}

export interface PrimitiveMediaValue {
	src?: string;
	alt?: string;
	id?: string | number;
	title?: string;
}

interface ParsedMeasurementToken {
	raw: string;
	value: string;
	unit: string | undefined;
}

export function resolvePrimitiveControl( input: PrimitiveControlInput, label = '', description = '' ): PrimitiveControlResolved {
	const source = getSource( input );
	const kind = resolveKind( source );
	const options = readOptions( source );
	const tabs = readTabs( source );
	const units = readUnits( source );
	const section = isSectionPrimitive( source ) ? source : undefined;
	const stateTabs = Array.isArray( source?.stateTabs ) ? [ ...source.stateTabs ] : [];

	return {
		kind,
		label: label || readString( source, 'label' ) || '',
		description: description || readString( source, 'description' ),
		placeholder: readString( source, 'placeholder' ),
		fieldType: readFieldType( source ),
		primitive: input ?? undefined,
		stateTabs,
		responsive: readBoolean( source, 'responsive' ),
		stateful: readBoolean( source, 'stateful' ),
		tokenAware: readBoolean( source, 'tokenAware' ),
		options,
		tabs,
		units,
		multiple: readBoolean( source, 'multiple' ),
		showInput: readBoolean( source, 'showInput', true ),
		showUnit: readBoolean( source, 'showUnit', true ),
		showRange: readBoolean( source, 'showRange', true ),
		showReset: readBoolean( source, 'showReset', true ),
		allowCustomUnit: readBoolean( source, 'allowCustomUnit' ),
		linked: readBoolean( source, 'linked' ),
		range: readBoolean( source, 'range' ),
		handles: readValue( source, 'handles' ) as 'single' | 'range' | undefined,
		assetType: readValue( source, 'assetType' ) as 'image' | 'video' | 'file' | undefined,
		allowDynamic: readBoolean( source, 'allowDynamic' ),
		showUpload: readBoolean( source, 'showUpload', true ),
		showReplace: readBoolean( source, 'showReplace', true ),
		showRemove: readBoolean( source, 'showRemove', true ),
		showLibrary: readBoolean( source, 'showLibrary', true ),
		showNewTab: readBoolean( source, 'showNewTab', true ),
		showNoFollow: readBoolean( source, 'showNoFollow', true ),
		showDownload: readBoolean( source, 'showDownload' ),
		showCustomAttributes: readBoolean( source, 'showCustomAttributes', true ),
		showLinkIcon: readBoolean( source, 'showLinkIcon', true ),
		allowClear: readBoolean( source, 'allowClear', true ),
		searchable: readBoolean( source, 'searchable' ),
		size: readValue( source, 'size' ) as 'small' | 'medium' | 'large' | undefined,
		orientation: readValue( source, 'orientation' ) as 'horizontal' | 'vertical' | undefined,
		layout: readValue( source, 'layout' ) as 'inline' | 'grid' | 'stack' | undefined,
		iconPosition: readValue( source, 'iconPosition' ) as 'start' | 'top' | 'end' | undefined,
		presentation: readValue( source, 'presentation' ) as 'icon-label' | 'icon-only' | 'label-only' | undefined,
		columns: readValue( source, 'columns' ) as number | undefined,
		collapsible: readBoolean( section, 'collapsible' ),
		defaultCollapsed: readBoolean( section, 'defaultCollapsed' ),
		density: ( readValue( section, 'density' ) as 'compact' | 'default' | undefined ) ?? 'compact',
		section,
	};
}

export function isTokenLikeValue( value: unknown ): boolean {
	return typeof value === 'string' && ( value.startsWith( 'var(' ) || value.startsWith( 'token:' ) || value.startsWith( 'theme:' ) || value.startsWith( 'global:' ) );
}

export function stringifyPrimitiveValue( value: unknown ): string {
	if ( value === null || value === undefined ) {
		return '';
	}

	if ( typeof value === 'string' ) {
		return value;
	}

	if ( typeof value === 'number' || typeof value === 'boolean' ) {
		return String( value );
	}

	try {
		return JSON.stringify( value, null, 2 );
	} catch {
		return String( value );
	}
}

export function parseJsonLikeValue( value: string ): JsonValue {
	const trimmed = value.trim();
	if ( !trimmed ) {
		return '';
	}

	if ( trimmed === 'true' ) {
		return true;
	}

	if ( trimmed === 'false' ) {
		return false;
	}

	if ( trimmed === 'null' ) {
		return null;
	}

	if ( /^-?\d+(\.\d+)?$/.test( trimmed ) ) {
		return Number( trimmed );
	}

	try {
		return JSON.parse( trimmed ) as JsonValue;
	} catch {
		return trimmed;
	}
}

export function normalizeDimensionsValue( value: unknown, fallbackUnit = 'px' ): PrimitiveDimensionsValue {
	const structuredRecord = parseStructuredValueRecord( value );
	if ( structuredRecord ) {
		return normalizeDimensionsValue( structuredRecord, fallbackUnit );
	}

	if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
		const record = value as Record<string, unknown>;
		const explicitSides = [ record.top, record.right, record.bottom, record.left ]
			.map( ( entry ) => parseMeasurementToken( stringifyPrimitiveValue( entry ) ) )
			.filter( ( entry ) => entry.raw );
		const sharedUnit = explicitSides.length > 0 && explicitSides.every( ( entry ) => entry.unit === explicitSides[ 0 ]?.unit )
			? explicitSides[ 0 ]?.unit
			: undefined;
		const resolvedUnit = typeof record.unit === 'string' && record.unit
			? record.unit
			: sharedUnit ?? fallbackUnit;

		return {
			top: normalizeMeasurementInput( record.top, resolvedUnit ),
			right: normalizeMeasurementInput( record.right, resolvedUnit ),
			bottom: normalizeMeasurementInput( record.bottom, resolvedUnit ),
			left: normalizeMeasurementInput( record.left, resolvedUnit ),
			unit: resolvedUnit,
			linked: Boolean( record.linked ),
		};
	}

	const scalar = stringifyPrimitiveValue( value ).trim();
	if ( !scalar ) {
		return {
			top: '',
			right: '',
			bottom: '',
			left: '',
			unit: fallbackUnit,
			linked: true,
		};
	}

	const shorthandTokens = splitCssShorthand( scalar );
	const tokens = expandBoxTokens( shorthandTokens );
	const parsedTokens = tokens.map( parseMeasurementToken );
	const sharedUnit = parsedTokens.length > 0 && parsedTokens.every( ( entry ) => entry.unit === parsedTokens[ 0 ]?.unit )
		? parsedTokens[ 0 ]?.unit
		: undefined;
	const resolvedUnit = sharedUnit ?? fallbackUnit;
	return {
		top: normalizeMeasurementInput( parsedTokens[ 0 ]?.raw ?? '', resolvedUnit ),
		right: normalizeMeasurementInput( parsedTokens[ 1 ]?.raw ?? '', resolvedUnit ),
		bottom: normalizeMeasurementInput( parsedTokens[ 2 ]?.raw ?? '', resolvedUnit ),
		left: normalizeMeasurementInput( parsedTokens[ 3 ]?.raw ?? '', resolvedUnit ),
		unit: resolvedUnit,
		linked: shorthandTokens.length < 4 && areAllEqual( [
			normalizeMeasurementInput( parsedTokens[ 0 ]?.raw ?? '', resolvedUnit ),
			normalizeMeasurementInput( parsedTokens[ 1 ]?.raw ?? '', resolvedUnit ),
			normalizeMeasurementInput( parsedTokens[ 2 ]?.raw ?? '', resolvedUnit ),
			normalizeMeasurementInput( parsedTokens[ 3 ]?.raw ?? '', resolvedUnit ),
		] ),
	};
}

export function normalizeSliderValue( value: unknown, fallbackUnit = '' ): PrimitiveSliderValue {
	const structuredRecord = parseStructuredValueRecord( value );
	if ( structuredRecord ) {
		return normalizeSliderValue( structuredRecord, fallbackUnit );
	}

	if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
		const record = value as Record<string, unknown>;
		const resolvedUnit = typeof record.unit === 'string' && record.unit
			? record.unit
			: fallbackUnit || undefined;
		return {
			value: normalizeSliderScalar( record.value, resolvedUnit ),
			unit: resolvedUnit,
			start: record.start as number | string | undefined,
			end: record.end as number | string | undefined,
		};
	}

	const parsed = parseMeasurementToken( stringifyPrimitiveValue( value ) );
	const resolvedUnit = parsed.unit ?? ( fallbackUnit || undefined );
	return {
		value: normalizeSliderScalar( parsed.raw, resolvedUnit ),
		unit: resolvedUnit,
	};
}

export function normalizeUrlValue( value: unknown ): PrimitiveUrlValue {
	const structuredRecord = parseStructuredValueRecord( value );
	if ( structuredRecord ) {
		return normalizeUrlValue( structuredRecord );
	}

	if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
		const record = value as Record<string, unknown>;
		return {
			url: typeof record.url === 'string' ? record.url : typeof record.href === 'string' ? record.href : undefined,
			newTab: Boolean( record.newTab ?? record.openInNewTab ),
			noFollow: Boolean( record.noFollow ?? record.relNoFollow ),
			download: Boolean( record.download ),
			customAttributes: typeof record.customAttributes === 'string' ? record.customAttributes : undefined,
			linkIcon: typeof record.linkIcon === 'string' ? record.linkIcon : undefined,
		};
	}

	return {
		url: typeof value === 'string' ? unwrapCssUrlValue( value ) : undefined,
	};
}

export function normalizeMediaValue( value: unknown ): PrimitiveMediaValue {
	const structuredRecord = parseStructuredValueRecord( value );
	if ( structuredRecord ) {
		return normalizeMediaValue( structuredRecord );
	}

	if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
		const record = value as Record<string, unknown>;
		return {
			src: typeof record.src === 'string' ? record.src : typeof record.url === 'string' ? record.url : undefined,
			alt: typeof record.alt === 'string' ? record.alt : undefined,
			id: record.id as string | number | undefined,
			title: typeof record.title === 'string' ? record.title : undefined,
		};
	}

	return {
		src: typeof value === 'string' ? value : undefined,
	};
}

export function serializeSliderValue( value: PrimitiveSliderValue, fallbackUnit = '' ): string {
	const resolvedUnit = value.unit ?? fallbackUnit;
	return serializeMeasurementInput( value.value, resolvedUnit );
}

export function serializeDimensionsValue( value: PrimitiveDimensionsValue, fallbackUnit = 'px' ): string {
	const resolvedUnit = value.unit ?? fallbackUnit;
	const top = serializeMeasurementInput( value.top, resolvedUnit );
	const right = serializeMeasurementInput( value.right ?? value.top, resolvedUnit );
	const bottom = serializeMeasurementInput( value.bottom ?? value.top, resolvedUnit );
	const left = serializeMeasurementInput( value.left ?? value.right ?? value.top, resolvedUnit );
	const tokens = [ top, right, bottom, left ].map( ( entry ) => entry.trim() );
	if ( tokens.every( ( entry ) => !entry ) ) {
		return '';
	}

	if ( tokens.every( ( entry ) => entry === tokens[ 0 ] ) ) {
		return value.linked === false ? tokens.join( ' ' ) : tokens[ 0 ] ?? '';
	}

	if ( tokens[ 0 ] === tokens[ 2 ] && tokens[ 1 ] === tokens[ 3 ] ) {
		return `${ tokens[ 0 ] ?? '' } ${ tokens[ 1 ] ?? '' }`.trim();
	}

	if ( tokens[ 1 ] === tokens[ 3 ] ) {
		return `${ tokens[ 0 ] ?? '' } ${ tokens[ 1 ] ?? '' } ${ tokens[ 2 ] ?? '' }`.trim();
	}

	return tokens.join( ' ' );
}

export function serializeUrlValue( value: PrimitiveUrlValue ): string {
	return String( value.url ?? '' ).trim();
}

export function serializeMediaValue( value: PrimitiveMediaValue ): string {
	return String( value.src ?? '' ).trim();
}

function getSource( input: PrimitiveControlInput ): Record<string, unknown> {
	if ( !input ) {
		return {};
	}

	if ( typeof input === 'object' && input && 'primitive' in input && input.primitive && typeof input.primitive === 'object' ) {
		const source = input as BuilderControlFieldDefinition & {
			primitive: Record<string, unknown>;
			label?: string;
			description?: string;
			placeholder?: string;
			responsive?: boolean;
			stateful?: boolean;
			tokenAware?: boolean;
			stateTabs?: BuilderControlStateTab[];
			controlType?: BuilderFieldType;
		};
		return {
			...source.primitive,
			label: source.label,
			description: source.description,
			placeholder: source.placeholder,
			responsive: source.responsive,
			stateful: source.stateful,
			tokenAware: source.tokenAware,
			stateTabs: source.stateTabs,
			controlType: source.controlType ?? readFieldType( source.primitive ),
		};
	}

	return input as unknown as Record<string, unknown>;
}

function splitCssShorthand( value: string ): string[] {
	const tokens: string[] = [];
	let current = '';
	let depth = 0;

	for ( const character of value.trim() ) {
		if ( character === '(' ) {
			depth += 1;
			current += character;
			continue;
		}

		if ( character === ')' ) {
			depth = Math.max( 0, depth - 1 );
			current += character;
			continue;
		}

		if ( /\s/.test( character ) && depth === 0 ) {
			if ( current.trim() ) {
				tokens.push( current.trim() );
				current = '';
			}
			continue;
		}

		current += character;
	}

	if ( current.trim() ) {
		tokens.push( current.trim() );
	}

	return tokens;
}

function unwrapCssUrlValue( value: string ): string {
	const trimmed = value.trim();
	const match = trimmed.match( /^url\((.*)\)$/i );
	if ( !match ) {
		return trimmed;
	}

	const inner = match[ 1 ]?.trim() ?? '';
	if ( ( inner.startsWith( '"' ) && inner.endsWith( '"' ) ) || ( inner.startsWith( '\'' ) && inner.endsWith( '\'' ) ) ) {
		return inner.slice( 1, -1 );
	}

	return inner;
}

function expandBoxTokens( tokens: string[] ): string[] {
	if ( tokens.length <= 1 ) {
		const token = tokens[ 0 ] ?? '';
		return [ token, token, token, token ];
	}

	if ( tokens.length === 2 ) {
		return [ tokens[ 0 ] ?? '', tokens[ 1 ] ?? '', tokens[ 0 ] ?? '', tokens[ 1 ] ?? '' ];
	}

	if ( tokens.length === 3 ) {
		return [ tokens[ 0 ] ?? '', tokens[ 1 ] ?? '', tokens[ 2 ] ?? '', tokens[ 1 ] ?? '' ];
	}

	return tokens.slice( 0, 4 );
}

function parseMeasurementToken( value: string ): ParsedMeasurementToken {
	const raw = value.trim();
	if ( !raw ) {
		return {
			raw: '',
			value: '',
			unit: undefined,
		};
	}

	const match = raw.match( /^(-?(?:\d+|\d*\.\d+))(?:([a-z%]+))$/i );
	if ( match ) {
		return {
			raw,
			value: match[ 1 ] ?? raw,
			unit: match[ 2 ] ? match[ 2 ].toLowerCase() : undefined,
		};
	}

	return {
		raw,
		value: raw,
		unit: undefined,
	};
}

function normalizeMeasurementInput( value: unknown, fallbackUnit = '' ): string {
	const parsed = parseMeasurementToken( stringifyPrimitiveValue( value ) );
	if ( parsed.unit && parsed.unit === fallbackUnit ) {
		return parsed.value;
	}

	return parsed.raw;
}

function normalizeSliderScalar( value: unknown, fallbackUnit?: string ): number | string | undefined {
	if ( typeof value === 'number' ) {
		return value;
	}

	const parsed = parseMeasurementToken( stringifyPrimitiveValue( value ) );
	if ( !parsed.raw ) {
		return undefined;
	}

	if ( parsed.unit && parsed.unit === fallbackUnit ) {
		return parsed.value;
	}

	if ( /^-?(?:\d+|\d*\.\d+)$/.test( parsed.raw ) ) {
		return Number( parsed.raw );
	}

	return parsed.raw;
}

function serializeMeasurementInput( value: unknown, fallbackUnit = '' ): string {
	const parsed = parseMeasurementToken( stringifyPrimitiveValue( value ) );
	if ( !parsed.raw ) {
		return '';
	}

	if ( parsed.unit ) {
		return parsed.raw;
	}

	if ( fallbackUnit && /^-?(?:\d+|\d*\.\d+)$/.test( parsed.raw ) ) {
		return `${ parsed.raw }${ fallbackUnit }`;
	}

	return parsed.raw;
}

function areAllEqual( values: string[] ): boolean {
	return values.every( ( entry ) => entry === ( values[ 0 ] ?? '' ) );
}

function parseStructuredValueRecord( value: unknown ): Record<string, unknown> | undefined {
	if ( typeof value !== 'string' ) {
		return undefined;
	}

	const trimmed = value.trim();
	if ( !trimmed.startsWith( '{' ) || !trimmed.endsWith( '}' ) ) {
		return undefined;
	}

	try {
		const parsed = JSON.parse( trimmed ) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray( parsed ) ? parsed as Record<string, unknown> : undefined;
	} catch {
		return undefined;
	}
}

function resolveKind( source: Record<string, unknown> | undefined ): PrimitiveControlResolved['kind'] {
	if ( !source ) {
		return 'generic';
	}

	if ( typeof source.kind === 'string' ) {
		return source.kind as PrimitiveControlResolved['kind'];
	}

	if ( typeof source.controlType === 'string' ) {
		return mapFieldTypeToKind( source.controlType as BuilderFieldType );
	}

	if ( typeof source.type === 'string' ) {
		return mapFieldTypeToKind( source.type as BuilderFieldType );
	}

	return 'generic';
}

function mapFieldTypeToKind( type: BuilderFieldType ): PrimitiveControlResolved['kind'] {
	switch ( type ) {
		case 'select':
			return 'select';
		case 'toggle':
			return 'switcher';
		case 'number':
			return 'slider';
		case 'image':
			return 'media';
		case 'token':
			return 'color';
		case 'url':
			return 'url';
		case 'textarea':
			return 'textarea';
		case 'json':
			return 'json';
		case 'rich-text':
		case 'text':
		default:
			return 'text';
	}
}

function readFieldType( source: Record<string, unknown> | undefined ): BuilderFieldType | undefined {
	if ( !source ) {
		return undefined;
	}

	return typeof source.fieldType === 'string' ? source.fieldType as BuilderFieldType : typeof source.controlType === 'string' ? source.controlType as BuilderFieldType : typeof source.type === 'string' ? source.type as BuilderFieldType : undefined;
}

function readString( source: Record<string, unknown> | undefined, key: string ): string | undefined {
	if ( !source ) {
		return undefined;
	}
	return typeof source[ key ] === 'string' ? source[ key ] as string : undefined;
}

function readBoolean( source: Record<string, unknown> | undefined, key: string, defaultValue = false ): boolean {
	if ( !source ) {
		return defaultValue;
	}
	if ( typeof source[ key ] === 'boolean' ) {
		return source[ key ] as boolean;
	}

	return defaultValue;
}

function readValue( source: Record<string, unknown> | undefined, key: string ): unknown {
	if ( !source ) {
		return undefined;
	}
	return source[ key ];
}

function readOptions( source: Record<string, unknown> | undefined ): BuilderControlOption[] {
	if ( !source ) {
		return [];
	}
	const options = source.options;
	if ( Array.isArray( options ) ) {
		return options.filter( ( option ): option is BuilderControlOption => Boolean( option && typeof option === 'object' && 'value' in option ) ).map( ( option ) => ( {
			label: String( ( option as BuilderControlOption ).label ?? ( option as { value?: string } ).value ?? '' ),
			value: String( ( option as BuilderControlOption ).value ?? '' ),
			icon: ( option as BuilderControlOption ).icon,
			description: ( option as BuilderControlOption ).description,
			badge: ( option as BuilderControlOption ).badge,
			disabled: ( option as BuilderControlOption ).disabled,
		} ) );
	}

	return [];
}

function readTabs( source: Record<string, unknown> | undefined ): BuilderControlTabsItem[] {
	if ( !source ) {
		return [];
	}
	const items = source.items;
	if ( Array.isArray( items ) ) {
		return items.filter( ( item ): item is BuilderControlTabsItem => Boolean( item && typeof item === 'object' && 'id' in item ) ).map( ( item ) => ( {
			id: String( ( item as BuilderControlTabsItem ).id ?? '' ),
			label: String( ( item as BuilderControlTabsItem ).label ?? '' ),
			icon: ( item as BuilderControlTabsItem ).icon,
			description: ( item as BuilderControlTabsItem ).description,
			badge: ( item as BuilderControlTabsItem ).badge,
			disabled: ( item as BuilderControlTabsItem ).disabled,
		} ) );
	}

	return [];
}

function readUnits( source: Record<string, unknown> | undefined ): BuilderControlSliderUnit[] {
	if ( !source ) {
		return [];
	}
	const units = source.units;
	if ( Array.isArray( units ) ) {
		return units.filter( ( unit ): unit is BuilderControlSliderUnit => Boolean( unit && typeof unit === 'object' && 'value' in unit ) ).map( ( unit ) => ( {
			label: String( ( unit as BuilderControlSliderUnit ).label ?? ( unit as { value?: string } ).value ?? '' ),
			value: String( ( unit as BuilderControlSliderUnit ).value ?? '' ),
			shortLabel: ( unit as BuilderControlSliderUnit ).shortLabel,
		} ) );
	}

	return [];
}

function isSectionPrimitive( source: Record<string, unknown> | undefined ): source is Record<string, unknown> & BuilderControlSectionPrimitive {
	if ( !source ) {
		return false;
	}

	return source.kind === 'section' || ( typeof source.collapsible === 'boolean' && typeof source.defaultCollapsed === 'boolean' && typeof source.density === 'string' );
}

function isControlFieldDefinition( input: PrimitiveControlInput ): input is BuilderControlFieldDefinition {
	return Boolean( input && typeof input === 'object' && 'primitive' in input && 'type' in input && 'path' in input );
}
