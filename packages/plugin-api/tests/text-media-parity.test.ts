import { describe, expect, it } from 'vitest';

import { createDefaultBuilderRegistry } from '../src/index';

describe( 'text/media parity metadata', () => {
	it( 'registers near 1:1 style and advanced stacks for text and media elements', () => {
		const registry = createDefaultBuilderRegistry();

		const expectations = {
			heading: {
				style: [ 'Alignment', 'Typography', 'Text Stroke', 'Text Shadow', 'Blend Mode', 'Color & Links' ],
				advanced: [ 'Layout', 'Position & Layer', 'Motion & Animation', 'Transform', 'Border', 'Responsive Visibility', 'HTML Attributes', 'Custom CSS' ],
			},
			paragraph: {
				style: [ 'Alignment', 'Typography', 'Paragraph Spacing', 'Drop Cap', 'Links', 'Text Shadow' ],
				advanced: [ 'Layout', 'Position & Layer', 'Motion & Animation', 'Transform', 'Border', 'Responsive Visibility', 'HTML Attributes', 'Custom CSS' ],
			},
			'text-editor': {
				style: [ 'Alignment', 'Typography', 'Paragraph Spacing', 'Drop Cap', 'Links', 'Text Shadow' ],
				advanced: [ 'Layout', 'Position & Layer', 'Motion & Animation', 'Transform', 'Border', 'Responsive Visibility', 'HTML Attributes', 'Custom CSS' ],
			},
			button: {
				style: [ 'Alignment', 'Typography', 'Text Shadow', 'Surface', 'Border', 'Border Radius', 'Padding & Spacing', 'Interaction' ],
				advanced: [ 'Layout', 'Position & Layer', 'Motion & Animation', 'Transform', 'Border', 'Responsive Visibility', 'HTML Attributes', 'Custom CSS' ],
			},
			image: {
				style: [ 'Image', 'Effects & Filters', 'Border', 'Border Radius', 'Box Shadow', 'Caption' ],
				advanced: [ 'Layout', 'Position & Layer', 'Motion & Animation', 'Transform', 'Border', 'Responsive Visibility', 'HTML Attributes', 'Custom CSS' ],
			},
		} as const;

		for ( const [ type, expected ] of Object.entries( expectations ) ) {
			const definition = registry.elements.get( type );

			expect( definition, `missing ${ type } definition` ).toBeTruthy();
			expect( definition?.styleSections.map( ( section ) => section.label ) ).toEqual( expected.style );
			expect( definition?.advancedSections.map( ( section ) => section.label ) ).toEqual( expected.advanced );
		}
	} );

	it( 'attaches local state tabs only to sections that need Elementor-like interaction states', () => {
		const registry = createDefaultBuilderRegistry();
		const heading = registry.elements.get( 'heading' );
		const button = registry.elements.get( 'button' );

		expect( heading?.styleSections.find( ( section ) => section.label === 'Color & Links' )?.enabledStates ).toEqual( [ 'normal', 'hover' ] );
		expect( button?.styleSections.find( ( section ) => section.label === 'Surface' )?.enabledStates ).toEqual( [ 'normal', 'hover' ] );
		expect( button?.styleSections.find( ( section ) => section.label === 'Typography' )?.enabledStates ).toBeUndefined();
	} );
} );
