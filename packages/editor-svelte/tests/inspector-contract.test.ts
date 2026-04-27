import { describe, expect, it } from 'vitest';

import { createDefaultBuilderRegistry } from '@builder/plugin-api';
import { defaultBreakpoints, pseudoStates, styleStateTargets } from '@builder/schema';
import { getAuthoringBreakpointDefinitions } from '../src/lib/responsive-authoring';

describe( 'inspector contract', () => {
	it( 'keeps the inspector style state targets in exact UI order', () => {
		expect( styleStateTargets ).toEqual( [ 'base', ...pseudoStates ] );
		expect( styleStateTargets ).toEqual( [ 'base', 'hover', 'focus', 'active', 'visited', 'disabled', 'success', 'error' ] );
	} );

	it( 'limits editor authoring breakpoints to desktop, tablet, and mobile', () => {
		const breakpoints = getAuthoringBreakpointDefinitions( [ ...defaultBreakpoints ] );
		expect( breakpoints.map( ( breakpoint ) => breakpoint.id ) ).toEqual( [ 'desktop', 'tablet', 'mobile' ] );
	} );

	it( 'keeps representative style and advanced stacks in Elementor order', () => {
		const registry = createDefaultBuilderRegistry();
		const contentStack = ( type: string ) => registry.elements.get( type )?.contentSections.map( ( section ) => section.label );
		const styleStack = ( type: string ) => registry.elements.get( type )?.styleSections.map( ( section ) => section.label );
		const advancedStack = ( type: string ) => registry.elements.get( type )?.advancedSections.map( ( section ) => section.label );

		expect( contentStack( 'container' ) ).toEqual( [ 'Layout', 'Sizing & Overflow' ] );
		expect( styleStack( 'container' ) ).toEqual( [
			'Background',
			'Border',
		] );
		expect( styleStack( 'icon-box' ) ).toEqual( [
			'Box',
			'Icon',
			'Content',
			'Title',
			'Description',
		] );
		expect( styleStack( 'tabs' ) ).toEqual( [ 'Title', 'Icon', 'Content' ] );
		expect( advancedStack( 'container' ) ).toEqual( [
			'Layout',
			'Position & Layer',
			'Motion & Animation',
			'Transform',
			'Background',
			'Border',
			'Responsive Visibility',
			'HTML Attributes',
			'Custom CSS',
		] );
		expect( advancedStack( 'menu' ) ).toEqual( [
			'Layout',
			'Position & Layer',
			'Motion & Animation',
			'Transform',
			'Border',
			'Responsive Visibility',
			'HTML Attributes',
			'Custom CSS',
		] );
	} );

	it( 'exposes CSS id/class and custom CSS controls for every registered element', () => {
		const registry = createDefaultBuilderRegistry();

		for ( const definition of registry.elements.values() ) {
			expect(
				definition.advancedSections.some( ( section ) => section.family === 'attributes' ),
				`${ definition.type } is missing HTML attribute controls`,
			).toBe( true );
			expect(
				definition.advancedSections.some( ( section ) => section.family === 'custom-css' ),
				`${ definition.type } is missing custom CSS controls`,
			).toBe( true );
		}
	} );
} );
