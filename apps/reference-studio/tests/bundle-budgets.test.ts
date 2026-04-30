import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

type ViteManifestEntry = {
	file?: string;
	name?: string;
	src?: string;
	css?: string[];
};

const clientOutputPath = path.resolve( process.cwd(), 'apps/reference-studio/.svelte-kit/output/client' );
const manifestPath = path.join( clientOutputPath, '.vite/manifest.json' );
const describeBuiltManifest = existsSync( manifestPath ) ? describe : describe.skip;

const budgets = {
	initialRoute: { raw: 24_000, gzip: 8_000 },
	editor: { raw: 460_000, gzip: 130_000 },
	richText: { raw: 430_000, gzip: 145_000 },
	editorCss: { raw: 138_000, gzip: 22_500 },
	runtimeCss: { raw: 24_000, gzip: 6_000 },
} as const;

describeBuiltManifest( 'reference studio bundle budgets', () => {
	const manifest = JSON.parse( readFileSync( manifestPath, 'utf8' ) ) as Record<string, ViteManifestEntry>;

	it( 'keeps the hydrated route shell lightweight before the editor is mounted', () => {
		const routeEntry = manifest[ '.svelte-kit/generated/client-optimized/nodes/2.js' ];
		expect( routeEntry?.file ).toBeTruthy();
		expectFileWithinBudget( routeEntry!.file!, budgets.initialRoute );
	} );

	it( 'keeps deferred editor and rich text chunks inside explicit budgets', () => {
		expectFileWithinBudget( findChunkByName( manifest, 'builder-editor' ), budgets.editor );
		expectFileWithinBudget( findChunkByName( manifest, 'vendor-richtext' ), budgets.richText );
	} );

	it( 'keeps editor and runtime CSS inside explicit budgets', () => {
		expectFileWithinBudget( findAssetByFilePart( manifest, 'builder-editor.' ), budgets.editorCss );
		expectFileWithinBudget( findAssetByFilePart( manifest, 'builder-runtime.' ), budgets.runtimeCss );
	} );
} );

function findChunkByName( manifest: Record<string, ViteManifestEntry>, name: string ): string {
	const entry = Object.values( manifest ).find( ( candidate ) => candidate.name === name );
	expect( entry?.file, `Missing "${ name }" chunk in built manifest.` ).toBeTruthy();
	return entry!.file!;
}

function findAssetByFilePart( manifest: Record<string, ViteManifestEntry>, filePart: string ): string {
	const entry = Object.values( manifest ).find( ( candidate ) => candidate.file?.includes( filePart ) );
	expect( entry?.file, `Missing asset matching "${ filePart }" in built manifest.` ).toBeTruthy();
	return entry!.file!;
}

function expectFileWithinBudget( relativeFile: string, budget: { raw: number; gzip: number } ) {
	const filePath = path.join( clientOutputPath, relativeFile );
	const source = readFileSync( filePath );
	const gzipSize = gzipSync( source ).byteLength;

	expect( source.byteLength, `${ relativeFile } raw bytes` ).toBeLessThanOrEqual( budget.raw );
	expect( gzipSize, `${ relativeFile } gzip bytes` ).toBeLessThanOrEqual( budget.gzip );
}
