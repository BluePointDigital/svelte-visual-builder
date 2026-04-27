import { describe, expect, it } from 'vitest';

import { createStyleSet, defaultBreakpoints } from '@builder/schema';

import {
	AUTHORING_BREAKPOINT_IDS,
	buildResponsiveStylePatch,
	buildResponsiveStyleReset,
	getAuthoringBreakpointDefinitions,
	resolveResponsiveStyleValue,
} from '../src/lib/responsive-authoring';

describe( 'responsive authoring helpers', () => {
	it( 'limits authoring breakpoints to desktop, tablet, and mobile', () => {
		expect( AUTHORING_BREAKPOINT_IDS ).toEqual( [ 'desktop', 'tablet', 'mobile' ] );
		expect( getAuthoringBreakpointDefinitions( [ ...defaultBreakpoints ] ).map( ( breakpoint ) => breakpoint.id ) ).toEqual( [ 'desktop', 'tablet', 'mobile' ] );
	} );

	it( 'reads responsive style values through the desktop → laptop → tablet → mobile cascade', () => {
		const styles = createStyleSet( {
			base: { width: '100%', fontSize: '48px' },
			breakpoints: {
				laptop: { width: '92%', maxWidth: '1200px' },
				tablet: { width: '80%' },
				mobile: { fontSize: '32px' },
			},
			states: {
				hover: { color: '#111111' },
			},
			stateBreakpoints: {
				laptop: {
					hover: { color: '#222222' },
				},
				tablet: {
					hover: { color: '#333333' },
				},
				mobile: {
					hover: { backgroundColor: '#ff3366' },
				},
			},
		} );

		expect( resolveResponsiveStyleValue( styles, 'width', 'desktop' ) ).toMatchObject( {
			value: '100%',
			hasOverride: true,
			canReset: false,
		} );
		expect( resolveResponsiveStyleValue( styles, 'width', 'tablet' ) ).toMatchObject( {
			value: '80%',
			inheritedValue: '92%',
			hasOverride: true,
			canReset: true,
		} );
		expect( resolveResponsiveStyleValue( styles, 'width', 'mobile' ) ).toMatchObject( {
			value: '80%',
			inheritedValue: '80%',
			hasOverride: false,
			canReset: false,
		} );
		expect( resolveResponsiveStyleValue( styles, 'max-width', 'mobile' ) ).toMatchObject( {
			value: '1200px',
			inheritedValue: '1200px',
			hasOverride: false,
			canReset: false,
		} );
		expect( resolveResponsiveStyleValue( styles, 'font-size', 'mobile' ) ).toMatchObject( {
			value: '32px',
			inheritedValue: '48px',
			hasOverride: true,
			canReset: true,
		} );
		expect( resolveResponsiveStyleValue( styles, 'color', 'mobile', 'hover' ) ).toMatchObject( {
			value: '#333333',
			inheritedValue: '#333333',
			hasOverride: false,
			canReset: false,
		} );
		expect( resolveResponsiveStyleValue( styles, 'background-color', 'mobile', 'hover' ) ).toMatchObject( {
			value: '#ff3366',
			inheritedValue: undefined,
			hasOverride: true,
			canReset: true,
		} );
	} );

	it( 'writes to desktop base and tablet/mobile breakpoint layers without changing the persistence model', () => {
		const styles = createStyleSet();

		expect( buildResponsiveStylePatch( styles, 'width', '90%', 'desktop' ) ).toEqual( {
			base: { width: '90%' },
		} );
		expect( buildResponsiveStylePatch( styles, 'width', '80%', 'tablet' ) ).toEqual( {
			breakpoints: {
				tablet: { width: '80%' },
			},
		} );
		expect( buildResponsiveStylePatch( styles, 'font-size', '28px', 'mobile', 'hover' ) ).toEqual( {
			stateBreakpoints: {
				mobile: {
					hover: { 'font-size': '28px' },
				},
			},
		} );
	} );

	it( 'resets only the current breakpoint override and falls back to the next larger authored value', () => {
		const styles = createStyleSet( {
			base: { width: '100%', fontSize: '40px' },
			breakpoints: {
				laptop: { width: '92%' },
				tablet: { width: '80%' },
				mobile: { width: '60%' },
			},
			states: {
				hover: { color: '#111111' },
			},
			stateBreakpoints: {
				tablet: {
					hover: { color: '#333333' },
				},
				mobile: {
					hover: { color: '#ff3366' },
				},
			},
		} );

		const resetMobile = buildResponsiveStyleReset( styles, 'width', 'mobile' );
		expect( resetMobile ).toMatchObject( {
			base: { width: '100%', fontSize: '40px' },
			breakpoints: {
				laptop: { width: '92%' },
				tablet: { width: '80%' },
			},
		} );
		expect( resolveResponsiveStyleValue( resetMobile, 'width', 'mobile' ) ).toMatchObject( {
			value: '80%',
			inheritedValue: '80%',
			hasOverride: false,
			canReset: false,
		} );

		const resetTablet = buildResponsiveStyleReset( styles, 'width', 'tablet' );
		expect( resetTablet ).toMatchObject( {
			base: { width: '100%', fontSize: '40px' },
			breakpoints: {
				laptop: { width: '92%' },
				mobile: { width: '60%' },
			},
		} );
		expect( resolveResponsiveStyleValue( resetTablet, 'width', 'tablet' ) ).toMatchObject( {
			value: '92%',
			inheritedValue: '92%',
			hasOverride: false,
			canReset: false,
		} );

		const resetHover = buildResponsiveStyleReset( styles, 'color', 'mobile', 'hover' );
		expect( resetHover ).toMatchObject( {
			states: {
				hover: { color: '#111111' },
			},
			stateBreakpoints: {
				tablet: {
					hover: { color: '#333333' },
				},
			},
		} );
		expect( resolveResponsiveStyleValue( resetHover, 'color', 'mobile', 'hover' ) ).toMatchObject( {
			value: '#333333',
			inheritedValue: '#333333',
			hasOverride: false,
			canReset: false,
		} );
	} );
} );
