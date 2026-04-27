import { describe, expect, it } from 'vitest';

import {
	normalizeDimensionsValue,
	normalizeUrlValue,
	normalizeSliderValue,
	serializeDimensionsValue,
	serializeMediaValue,
	serializeSliderValue,
	serializeUrlValue,
} from '../src/lib/components/PrimitiveControl.helpers';

describe( 'primitive control helpers', () => {
	it( 'normalizes slider strings with CSS units into editable numeric values', () => {
		expect( normalizeSliderValue( '16px', 'px' ) ).toEqual( {
			value: '16',
			unit: 'px',
		} );
		expect( normalizeSliderValue( '75%', 'px' ) ).toEqual( {
			value: '75',
			unit: '%',
		} );
	} );

	it( 'serializes slider values back into CSS values', () => {
		expect( serializeSliderValue( { value: '16', unit: 'px' }, 'px' ) ).toBe( '16px' );
		expect( serializeSliderValue( { value: 75, unit: '%' }, 'px' ) ).toBe( '75%' );
		expect( serializeSliderValue( { value: '1.5rem', unit: 'px' }, 'px' ) ).toBe( '1.5rem' );
	} );

	it( 'normalizes CSS box shorthands into four editable sides', () => {
		expect( normalizeDimensionsValue( '16px 24px', 'px' ) ).toEqual( {
			top: '16',
			right: '24',
			bottom: '16',
			left: '24',
			unit: 'px',
			linked: false,
		} );
		expect( normalizeDimensionsValue( '2rem', 'px' ) ).toEqual( {
			top: '2',
			right: '2',
			bottom: '2',
			left: '2',
			unit: 'rem',
			linked: true,
		} );
	} );

	it( 'recovers slider and dimensions values from legacy JSON string payloads', () => {
		expect( normalizeSliderValue( '{"value":"16px","unit":"px"}', 'px' ) ).toEqual( {
			value: '16',
			unit: 'px',
			start: undefined,
			end: undefined,
		} );

		expect( normalizeDimensionsValue( '{"top":"40px","right":"24px","bottom":"40px","left":"24px","unit":"px","linked":false}', 'px' ) ).toEqual( {
			top: '40',
			right: '24',
			bottom: '40',
			left: '24',
			unit: 'px',
			linked: false,
		} );
	} );

	it( 'serializes dimensions values back into CSS shorthands', () => {
		expect( serializeDimensionsValue( {
			top: '40',
			right: '40',
			bottom: '40',
			left: '40',
			unit: 'px',
			linked: true,
		}, 'px' ) ).toBe( '40px' );

		expect( serializeDimensionsValue( {
			top: '16',
			right: '24',
			bottom: '16',
			left: '24',
			unit: 'px',
			linked: false,
		}, 'px' ) ).toBe( '16px 24px' );

		expect( serializeDimensionsValue( {
			top: 'calc(100% - 10px)',
			right: '24',
			bottom: 'calc(100% - 10px)',
			left: '24',
			unit: 'px',
			linked: false,
		}, 'px' ) ).toBe( 'calc(100% - 10px) 24px' );
	} );

	it( 'normalizes CSS url() values for url primitives and serializes url/media primitives back to strings', () => {
		expect( normalizeUrlValue( 'url("https://example.com/hero.jpg")' ) ).toEqual( {
			url: 'https://example.com/hero.jpg',
		} );

		expect( serializeUrlValue( {
			url: 'https://example.com/contact',
			newTab: true,
			noFollow: true,
		} ) ).toBe( 'https://example.com/contact' );

		expect( serializeMediaValue( {
			src: 'https://example.com/video.mp4',
			alt: 'Preview',
		} ) ).toBe( 'https://example.com/video.mp4' );
	} );
} );
