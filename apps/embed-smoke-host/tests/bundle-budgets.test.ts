import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

type ManifestEntry = {
	file?: string;
	name?: string;
	isDynamicEntry?: boolean;
};

const clientOutputPath = path.resolve( process.cwd(), 'apps/embed-smoke-host/.svelte-kit/output/client' );
const manifestPath = path.join( clientOutputPath, '.vite/manifest.json' );
const describeBuiltManifest = existsSync( manifestPath ) ? describe : describe.skip;

const budgets = {
	hostInitial: { raw: 38_000, gzip: 13_000 },
	runtimeInitial: { raw: 120_000, gzip: 36_000 },
	deferredEditor: { raw: 460_000, gzip: 130_000 },
	richText: { raw: 430_000, gzip: 145_000 },
} as const;

describeBuiltManifest( 'embed host bundle budgets', () => {
	it( 'keeps host and runtime routes under explicit budgets', () => {
		const manifest = readManifest();
		if ( !manifest ) return;
		expectFileWithinBudget( findRouteChunk( manifest, 'nodes/2' ), budgets.hostInitial );
		expectFileWithinBudget( findRouteChunk( manifest, 'nodes/3' ), budgets.runtimeInitial );
	} );

	it( 'keeps deferred editor and rich text chunks out of the runtime route', () => {
		const manifest = readManifest();
		if ( !manifest ) return;
		expectFileWithinBudget( findChunkByName( manifest, 'builder-editor' ), budgets.deferredEditor );
		expectFileWithinBudget( findChunkByName( manifest, 'vendor-richtext' ), budgets.richText );
		const runtimeChunk = findRouteChunk( manifest, 'nodes/3' );
		expect( runtimeChunk ).not.toContain( 'builder-editor' );
	} );
} );

function readManifest(): Record<string, ManifestEntry> | undefined {
	return existsSync( manifestPath )
		? JSON.parse( readFileSync( manifestPath, 'utf8' ) ) as Record<string, ManifestEntry>
		: undefined;
}

function findRouteChunk( manifest: Record<string, ManifestEntry>, routePath: string ): string {
	const entry = Object.values( manifest ).find( ( candidate ) => candidate.name === routePath )
		?? Object.entries( manifest ).find( ( [ key ] ) => key.includes( routePath ) )?.[ 1 ];
	expect( entry?.file, `Missing route chunk for ${ routePath }.` ).toBeTruthy();
	return entry!.file!;
}

function findChunkByName( manifest: Record<string, ManifestEntry>, name: string ): string {
	const entry = Object.values( manifest ).find( ( candidate ) => candidate.name === name );
	expect( entry?.file, `Missing "${ name }" chunk.` ).toBeTruthy();
	return entry!.file!;
}

function expectFileWithinBudget( relativeFile: string, budget: { raw: number; gzip: number } ) {
	const filePath = path.join( clientOutputPath, relativeFile );
	const source = readFileSync( filePath );
	expect( source.byteLength, `${ relativeFile } raw bytes` ).toBeLessThanOrEqual( budget.raw );
	expect( gzipSync( source ).byteLength, `${ relativeFile } gzip bytes` ).toBeLessThanOrEqual( budget.gzip );
}
