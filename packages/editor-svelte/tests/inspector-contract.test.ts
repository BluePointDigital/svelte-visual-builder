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
			'Border Radius',
		] );
		expect( styleStack( 'grid-container' ) ).toEqual( [
			'Background',
			'Border',
			'Border Radius',
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

	it( 'keeps container sizing controls compact without range sliders', () => {
		const registry = createDefaultBuilderRegistry();
		const sizingSection = registry.elements.get( 'container' )?.contentSections.find( ( section ) => section.id === 'sizing-overflow' );
		const sizingFields = sizingSection?.fields.filter( ( field ) => [ 'width', 'max_width', 'min_height' ].includes( field.id ) ) ?? [];

		expect( sizingFields ).toHaveLength( 3 );
		for ( const field of sizingFields ) {
			expect( field.primitive?.kind ).toBe( 'slider' );
			expect( field.primitive && 'showRange' in field.primitive ? field.primitive.showRange : undefined ).toBe( false );
		}
	} );

	it( 'keeps positioning offsets grouped and slider-free', () => {
		const registry = createDefaultBuilderRegistry();
		const positioningSection = registry.elements.get( 'container' )?.advancedSections.find( ( section ) => section.id === 'positioning' );
		const positioningControls = positioningSection?.controls ?? [];
		const controlKeys = positioningControls.map( ( control ) => control.key );

		expect( controlKeys ).toEqual( [ 'position', 'inset', 'z-index' ] );
		expect( positioningControls.find( ( control ) => control.key === 'inset' )?.primitive?.kind ).toBe( 'dimensions' );
		const zIndexPrimitive = positioningControls.find( ( control ) => control.key === 'z-index' )?.primitive;
		expect( zIndexPrimitive?.kind ).toBe( 'slider' );
		expect( zIndexPrimitive && 'showRange' in zIndexPrimitive ? zIndexPrimitive.showRange : undefined ).toBe( false );
	} );

	it( 'keeps common numeric inspector controls input-only', () => {
		const registry = createDefaultBuilderRegistry();
		const container = registry.elements.get( 'container' );
		const heading = registry.elements.get( 'heading' );
		const contentLayout = container?.contentSections.find( ( section ) => section.id === 'layout' );
		const advancedLayout = heading?.advancedSections.find( ( section ) => section.id === 'layout' );
		const motion = container?.advancedSections.find( ( section ) => section.id === 'motion-effects' );
		const transform = container?.advancedSections.find( ( section ) => section.id === 'transform' );
		const getContentPrimitive = ( key: string ) => contentLayout?.fields.find( ( field ) => field.id === key )?.primitive;
		const getAdvancedPrimitive = ( sectionControls: typeof advancedLayout.controls | undefined, key: string ) => sectionControls?.find( ( control ) => control.key === key )?.primitive;
		const expectInputOnlySlider = ( primitive: ReturnType<typeof getContentPrimitive> ) => {
			expect( primitive?.kind ).toBe( 'slider' );
			expect( primitive && 'showRange' in primitive ? primitive.showRange : undefined ).toBe( false );
		};

		expectInputOnlySlider( getContentPrimitive( 'gap' ) );
		for ( const key of [ 'width', 'max-width', 'min-height', 'order' ] ) {
			expectInputOnlySlider( getAdvancedPrimitive( advancedLayout?.controls, key ) );
		}
		for ( const key of [ 'transition-duration', 'animation-duration' ] ) {
			expectInputOnlySlider( getAdvancedPrimitive( motion?.controls, key ) );
		}
		expectInputOnlySlider( getAdvancedPrimitive( transform?.controls, 'perspective' ) );
	} );

	it( 'keeps layout gap relative CSS units available in the inspector', () => {
		const registry = createDefaultBuilderRegistry();
		const contentLayout = registry.elements.get( 'container' )?.contentSections.find( ( section ) => section.id === 'layout' );
		const gapPrimitive = contentLayout?.fields.find( ( field ) => field.id === 'gap' )?.primitive;

		expect( gapPrimitive?.kind ).toBe( 'slider' );
		expect( gapPrimitive && 'units' in gapPrimitive ? gapPrimitive.units?.map( ( unit ) => unit.value ) : [] ).toEqual( [
			'px',
			'rem',
			'em',
			'%',
			'vw',
		] );
	} );

	it( 'exposes motion animations as a curated select control', () => {
		const registry = createDefaultBuilderRegistry();
		const motion = registry.elements.get( 'container' )?.advancedSections.find( ( section ) => section.id === 'motion-effects' );
		const animation = motion?.controls.find( ( control ) => control.key === 'animation-name' );

		expect( animation?.controlType ).toBe( 'select' );
		expect( animation?.options?.map( ( option ) => option.value ) ).toEqual( [
			'none',
			'builder-fade-in',
			'builder-fade-up',
			'builder-fade-down',
			'builder-slide-in-up',
			'builder-slide-in-down',
			'builder-slide-in-left',
			'builder-slide-in-right',
			'builder-zoom-in',
			'builder-zoom-out',
			'builder-pop-in',
		] );
	} );

	it( 'exposes background position and size as curated select controls', () => {
		const registry = createDefaultBuilderRegistry();
		const background = registry.elements.get( 'container' )?.styleSections.find( ( section ) => section.id === 'background' );
		const position = background?.controls.find( ( control ) => control.key === 'background-position' );
		const size = background?.controls.find( ( control ) => control.key === 'background-size' );

		expect( position?.controlType ).toBe( 'select' );
		expect( position?.options?.map( ( option ) => option.value ) ).toEqual( [
			'center center',
			'center top',
			'center bottom',
			'left top',
			'left center',
			'left bottom',
			'right top',
			'right center',
			'right bottom',
		] );
		expect( size?.controlType ).toBe( 'select' );
		expect( size?.options?.map( ( option ) => option.value ) ).toEqual( [
			'cover',
			'contain',
			'auto',
			'100% auto',
			'auto 100%',
			'100% 100%',
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
