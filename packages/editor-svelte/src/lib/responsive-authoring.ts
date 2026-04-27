import type { BreakpointDefinition, JsonValue, StyleSet } from '@builder/schema';
import { defaultBreakpoints, styleStateTargets } from '@builder/schema';

export const AUTHORING_BREAKPOINT_IDS = [ 'desktop', 'tablet', 'mobile' ] as const;
const RESPONSIVE_CASCADE_BREAKPOINT_IDS = [ 'desktop', 'laptop', 'tablet', 'mobile' ] as const;

export type AuthoringBreakpointId = ( typeof AUTHORING_BREAKPOINT_IDS )[ number ];
export type ResponsiveStyleTarget = ( typeof styleStateTargets )[ number ];
type ResponsiveCascadeBreakpointId = ( typeof RESPONSIVE_CASCADE_BREAKPOINT_IDS )[ number ];

export interface ResponsiveStyleResolution {
	value: JsonValue | undefined;
	inheritedValue: JsonValue | undefined;
	overrideValue: JsonValue | undefined;
	hasOverride: boolean;
	canReset: boolean;
}

export function isAuthoringBreakpointId( value: string | undefined | null ): value is AuthoringBreakpointId {
	return Boolean( value && AUTHORING_BREAKPOINT_IDS.includes( value as AuthoringBreakpointId ) );
}

export function resolveAuthoringViewportId( value: string | undefined | null ): AuthoringBreakpointId {
	if ( value === 'tablet' || value === 'mobile' ) {
		return value;
	}

	return 'desktop';
}

function resolveResponsiveCascadeViewportId( value: string | undefined | null ): ResponsiveCascadeBreakpointId {
	if ( value === 'laptop' || value === 'tablet' || value === 'mobile' ) {
		return value;
	}

	return 'desktop';
}

function getResponsiveBreakpointCascade( viewport: string | undefined | null ): ResponsiveCascadeBreakpointId[] {
	const resolvedViewport = resolveResponsiveCascadeViewportId( viewport );
	const viewportIndex = RESPONSIVE_CASCADE_BREAKPOINT_IDS.indexOf( resolvedViewport );
	return RESPONSIVE_CASCADE_BREAKPOINT_IDS.slice( 0, viewportIndex + 1 );
}

export function getAuthoringBreakpointDefinitions( breakpoints: BreakpointDefinition[] ): BreakpointDefinition[] {
	const provided = new Map<string, BreakpointDefinition>(
		breakpoints.map( ( breakpoint ) => [ breakpoint.id, breakpoint ] ),
	);
	const fallback = new Map<string, BreakpointDefinition>(
		[ ...defaultBreakpoints ].map( ( breakpoint ) => [ breakpoint.id, breakpoint ] ),
	);

	return AUTHORING_BREAKPOINT_IDS
		.map( ( breakpointId ) => provided.get( breakpointId ) ?? fallback.get( breakpointId ) )
		.filter( Boolean ) as BreakpointDefinition[];
}

export function normalizeStylePropertyName( property: string ): string {
	if ( property.startsWith( '--' ) ) {
		return property;
	}

	return property.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();
}

export function legacyStylePropertyName( property: string ): string {
	if ( property.startsWith( '--' ) || !property.includes( '-' ) ) {
		return property;
	}

	return property.replace( /-([a-z])/g, ( _, character: string ) => character.toUpperCase() );
}

export function readStyleRecordValue( record: Record<string, JsonValue | undefined>, property: string ): JsonValue | undefined {
	const normalized = normalizeStylePropertyName( property );
	const legacy = legacyStylePropertyName( normalized );
	return record[ normalized ] ?? ( legacy !== normalized ? record[ legacy ] : undefined );
}

export function hasStyleRecordValue( record: Record<string, JsonValue | undefined>, property: string ): boolean {
	const normalized = normalizeStylePropertyName( property );
	const legacy = legacyStylePropertyName( normalized );
	return normalized in record || ( legacy !== normalized && legacy in record );
}

export function setStyleRecordValue( record: Record<string, JsonValue>, property: string, value: JsonValue ): Record<string, JsonValue> {
	const normalized = normalizeStylePropertyName( property );
	const legacy = legacyStylePropertyName( normalized );
	const next = { ...record };
	delete next[ normalized ];
	if ( legacy !== normalized ) {
		delete next[ legacy ];
	}
	next[ normalized ] = value;
	return next;
}

export function deleteStyleRecordValue( record: Record<string, JsonValue>, property: string ): Record<string, JsonValue> {
	const normalized = normalizeStylePropertyName( property );
	const legacy = legacyStylePropertyName( normalized );
	const next = { ...record };
	delete next[ normalized ];
	if ( legacy !== normalized ) {
		delete next[ legacy ];
	}
	return next;
}

export function resolveResponsiveStyleValue(
	styles: StyleSet,
	property: string,
	viewport: string,
	target: ResponsiveStyleTarget = 'base',
): ResponsiveStyleResolution {
	const responsiveViewport = resolveResponsiveCascadeViewportId( viewport );
	const cascade = getResponsiveBreakpointCascade( viewport );
	if ( target === 'base' ) {
		const baseRecord = styles.base as Record<string, JsonValue | undefined>;
		const inheritedValue = cascade
			.slice( 1, -1 )
			.reduce<JsonValue | undefined>(
				( resolvedValue, breakpointId ) => {
					const nextValue = readStyleRecordValue(
						styles.breakpoints[ breakpointId ] as Record<string, JsonValue | undefined> ?? {},
						property,
					);
					return nextValue === undefined ? resolvedValue : nextValue;
				},
				readStyleRecordValue( baseRecord, property ),
			);
		if ( responsiveViewport === 'desktop' ) {
			return {
				value: inheritedValue,
				inheritedValue,
				overrideValue: undefined,
				hasOverride: hasStyleRecordValue( baseRecord, property ),
				canReset: false,
			};
		}

		const breakpointRecord = styles.breakpoints[ responsiveViewport ] as Record<string, JsonValue | undefined> ?? {};
		const overrideValue = readStyleRecordValue( breakpointRecord, property );
		return {
			value: overrideValue ?? inheritedValue,
			inheritedValue,
			overrideValue,
			hasOverride: hasStyleRecordValue( breakpointRecord, property ),
			canReset: hasStyleRecordValue( breakpointRecord, property ),
		};
	}

	const stateRecord = styles.states[ target ] as Record<string, JsonValue | undefined> ?? {};
	const inheritedValue = cascade
		.slice( 1, -1 )
		.reduce<JsonValue | undefined>(
			( resolvedValue, breakpointId ) => {
				const nextValue = readStyleRecordValue(
					styles.stateBreakpoints[ breakpointId ]?.[ target ] as Record<string, JsonValue | undefined> ?? {},
					property,
				);
				return nextValue === undefined ? resolvedValue : nextValue;
			},
			readStyleRecordValue( stateRecord, property ),
		);
	if ( responsiveViewport === 'desktop' ) {
		return {
			value: inheritedValue,
			inheritedValue,
			overrideValue: undefined,
			hasOverride: hasStyleRecordValue( stateRecord, property ),
			canReset: false,
		};
	}

	const breakpointRecord = styles.stateBreakpoints[ responsiveViewport ]?.[ target ] as Record<string, JsonValue | undefined> ?? {};
	const overrideValue = readStyleRecordValue( breakpointRecord, property );
	return {
		value: overrideValue ?? inheritedValue,
		inheritedValue,
		overrideValue,
		hasOverride: hasStyleRecordValue( breakpointRecord, property ),
		canReset: hasStyleRecordValue( breakpointRecord, property ),
	};
}

export function buildResponsiveStylePatch(
	styles: StyleSet,
	property: string,
	value: JsonValue,
	viewport: string,
	target: ResponsiveStyleTarget = 'base',
): Partial<StyleSet> {
	const authoringViewport = resolveAuthoringViewportId( viewport );
	const normalizedProperty = normalizeStylePropertyName( property );
	if ( target === 'base' ) {
		if ( authoringViewport === 'desktop' ) {
			return {
				base: setStyleRecordValue( structuredClone( styles.base ) as Record<string, JsonValue>, normalizedProperty, value ),
			};
		}

		return {
			breakpoints: {
				...styles.breakpoints,
				[ authoringViewport ]: setStyleRecordValue(
					structuredClone( styles.breakpoints[ authoringViewport ] ?? {} ) as Record<string, JsonValue>,
					normalizedProperty,
					value,
				),
			},
		};
	}

	if ( authoringViewport === 'desktop' ) {
		return {
			states: {
				...styles.states,
				[ target ]: setStyleRecordValue(
					structuredClone( styles.states[ target ] ?? {} ) as Record<string, JsonValue>,
					normalizedProperty,
					value,
				),
			},
		};
	}

	return {
		stateBreakpoints: {
			...styles.stateBreakpoints,
			[ authoringViewport ]: {
				...( styles.stateBreakpoints[ authoringViewport ] ?? {} ),
				[ target ]: setStyleRecordValue(
					structuredClone( styles.stateBreakpoints[ authoringViewport ]?.[ target ] ?? {} ) as Record<string, JsonValue>,
					normalizedProperty,
					value,
				),
			},
		},
	};
}

export function buildResponsiveStyleReset(
	styles: StyleSet,
	property: string,
	viewport: string,
	target: ResponsiveStyleTarget = 'base',
): StyleSet {
	const authoringViewport = resolveAuthoringViewportId( viewport );
	if ( authoringViewport === 'desktop' ) {
		return styles;
	}

	if ( target === 'base' ) {
		const nextBreakpoints = { ...styles.breakpoints };
		const currentRecord = styles.breakpoints[ authoringViewport ];
		if ( !currentRecord ) {
			return styles;
		}
		const nextRecord = deleteStyleRecordValue( structuredClone( currentRecord ) as Record<string, JsonValue>, property );
		if ( Object.keys( nextRecord ).length > 0 ) {
			nextBreakpoints[ authoringViewport ] = nextRecord;
		} else {
			delete nextBreakpoints[ authoringViewport ];
		}

		return {
			...styles,
			breakpoints: nextBreakpoints,
		};
	}

	const nextStateBreakpoints = { ...styles.stateBreakpoints };
	const currentViewportBreakpoints = styles.stateBreakpoints[ authoringViewport ];
	const currentRecord = currentViewportBreakpoints?.[ target ];
	if ( !currentViewportBreakpoints || !currentRecord ) {
		return styles;
	}

	const nextRecord = deleteStyleRecordValue( structuredClone( currentRecord ) as Record<string, JsonValue>, property );
	const nextViewportBreakpoints = { ...currentViewportBreakpoints };
	if ( Object.keys( nextRecord ).length > 0 ) {
		nextViewportBreakpoints[ target ] = nextRecord;
	} else {
		delete nextViewportBreakpoints[ target ];
	}

	if ( Object.keys( nextViewportBreakpoints ).length > 0 ) {
		nextStateBreakpoints[ authoringViewport ] = nextViewportBreakpoints;
	} else {
		delete nextStateBreakpoints[ authoringViewport ];
	}

	return {
		...styles,
		stateBreakpoints: nextStateBreakpoints,
	};
}
