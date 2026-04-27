import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

function readSource( relativePath: string ) {
	return readFileSync( fileURLToPath( new URL( relativePath, import.meta.url ) ), 'utf8' );
}

const currentDirectory = dirname( fileURLToPath( import.meta.url ) );

describe( 'legacy shell boundary', () => {
	it( 'keeps the active V3 shell surfaces free of direct legacy drag sensor imports', () => {
		for ( const relativePath of [
			'../src/lib/BuilderPreview.svelte',
			'../src/lib/BuilderCanvas.svelte',
			'../src/lib/BuilderNavigator.svelte',
		] ) {
			const source = readSource( relativePath );
			expect( source ).not.toContain( 'createPressToArmDragSensor' );
			expect( source ).not.toContain( './drag-sensors' );
			expect( source ).not.toContain( './preview-legacy-boundary' );
		}
	} );

	it( 'keeps canvasInteractionV2 out of the active V3 shell surfaces', () => {
		for ( const relativePath of [
			'../src/lib/BuilderPreview.svelte',
			'../src/lib/BuilderCanvas.svelte',
			'../src/lib/BuilderNavigator.svelte',
		] ) {
			expect( readSource( relativePath ) ).not.toContain( 'canvasInteractionV2' );
		}
	} );

	it( 'removes the legacy preview boundary and press-to-arm drag sensor from the cleanup release', () => {
		expect( existsSync( resolve( currentDirectory, '../src/lib/preview-legacy-boundary.ts' ) ) ).toBe( false );
		expect( existsSync( resolve( currentDirectory, '../src/lib/drag-sensors.ts' ) ) ).toBe( false );
	} );
} );
