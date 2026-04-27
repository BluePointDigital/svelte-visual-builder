import { describe, expect, it } from 'vitest';

import { createBuilderPackage, createDocument } from '@builder/schema';
import { createBuilderEditor } from '../src/lib/editor';
import {
	createMediaDiagnostics,
	deleteMediaCatalogAsset,
	mergeMediaCatalog,
	normalizeMediaAsset,
	updateMediaCatalogAsset,
	validateMediaUpload,
} from '../src/lib/media';
import { reviewHtmlImportPayload } from '../src/lib/template-import';

describe( 'media helpers', () => {
	it( 'validates upload mime type and size with safe errors', () => {
		const image = new File( [ 'tiny' ], 'hero.png', { type: 'image/png' } );
		expect( () => validateMediaUpload( image, { maxUploadSize: 64 } ) ).not.toThrow();
		expect( () => validateMediaUpload( image, { maxUploadSize: 2 } ) ).toThrow( /too large/i );
		expect( () => validateMediaUpload( new File( [ 'x' ], 'hero.txt', { type: 'text/plain' } ) ) ).toThrow( /unsupported media type/i );
	} );

	it( 'adds updates and deletes catalog assets without duplicating URLs', () => {
		const first = normalizeMediaAsset( { id: 'asset-a', url: 'https://example.com/hero.jpg', alt: 'Hero', source: 'external' } );
		const duplicate = normalizeMediaAsset( { id: 'asset-b', url: 'https://example.com/hero.jpg', title: 'Imported hero', source: 'import' } );
		const merged = mergeMediaCatalog( [], [ first, duplicate ] );
		expect( merged ).toHaveLength( 1 );
		expect( merged[ 0 ].alt ).toBe( 'Hero' );

		const updated = updateMediaCatalogAsset( merged, 'asset-a', { alt: 'Updated hero', title: 'Hero image' } );
		expect( updated[ 0 ].alt ).toBe( 'Updated hero' );
		expect( updated[ 0 ].meta.title ).toBe( 'Hero image' );

		expect( deleteMediaCatalogAsset( updated, 'asset-a' ) ).toHaveLength( 0 );
	} );

	it( 'reports external and missing-alt diagnostics', () => {
		const diagnostics = createMediaDiagnostics( [
			normalizeMediaAsset( { id: 'asset-a', url: 'https://example.com/hero.jpg', source: 'external' } ),
		] );
		expect( diagnostics.map( ( diagnostic ) => diagnostic.code ) ).toEqual( expect.arrayContaining( [ 'external-url', 'missing-alt' ] ) );
	} );

	it( 'keeps imported HTML image URLs in the serialized media catalog', () => {
		const review = reviewHtmlImportPayload( {
			sourceName: 'Media HTML',
			html: '<main><img src="https://example.com/imported.jpg" alt="Imported hero"></main>',
		} );
		expect( review.project.media ).toEqual( [
			expect.objectContaining( {
				url: 'https://example.com/imported.jpg',
				alt: 'Imported hero',
			} ),
		] );
	} );

	it( 'preserves project media as the serialized media catalog', () => {
		const project = createBuilderPackage( 'Media project' );
		project.media = [ normalizeMediaAsset( { url: 'https://example.com/a.webp', alt: 'A' } ) ];
		expect( project.media[ 0 ].url ).toBe( 'https://example.com/a.webp' );
	} );

	it( 'lets hosts list upload update and delete media through the editor controller', async () => {
		const project = createBuilderPackage( 'Controller media project', [ createDocument( 'page', 'Home' ) ] );
		const editor = createBuilderEditor( project, {
			media: {
				adapter: {
					listAssets: ( currentProject ) => currentProject.media.map( ( asset ) => ( {
						id: asset.id,
						url: asset.url,
						alt: asset.alt,
						title: typeof asset.meta.title === 'string' ? asset.meta.title : undefined,
					} ) ),
					uploadAsset: async ( { file } ) => ( {
						id: 'uploaded-asset',
						url: `https://cdn.example.com/${ file.name }`,
						alt: 'Uploaded asset',
						title: file.name,
						mimeType: file.type,
						size: file.size,
						source: 'upload',
					} ),
				},
			},
		} );

		const uploaded = await editor.uploadMediaAsset( new File( [ 'image' ], 'hero.png', { type: 'image/png' } ) );
		expect( uploaded.url ).toBe( 'https://cdn.example.com/hero.png' );
		expect( await editor.listMediaAssets() ).toEqual( [
			expect.objectContaining( {
				id: 'uploaded-asset',
				alt: 'Uploaded asset',
			} ),
		] );

		await editor.updateMediaAsset( 'uploaded-asset', { alt: 'Updated alt', title: 'Hero title' } );
		expect( editor.engine.getState().project.media[ 0 ].alt ).toBe( 'Updated alt' );
		await editor.deleteMediaAsset( 'uploaded-asset' );
		expect( editor.engine.getState().project.media ).toHaveLength( 0 );
	} );
} );
