// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { createBuilderPackage, createDocument, createNode } from '@builder/schema';
import {
	commitTemplateImportReview,
	importHtmlIntoProject,
	reviewHtmlImportPayload,
	reviewTemplateImportPayload,
} from '../src/lib/template-import';

vi.mock( '@builder/elementor-import', () => ( {
	importElementorPackage: () => ( {
		project: createBuilderPackage( 'Elementor Fixture', [
			{
				...createDocument( 'page', 'Elementor Landing', 'elementor-landing' ),
				root: [
					createNode( {
						type: 'container',
						children: [
							createNode( {
								type: 'heading',
								props: { text: 'Elementor Hero', level: 'h1' },
							} ),
						],
					} ),
				],
			},
		] ),
		warnings: [ { code: 'elementor-note', message: 'Elementor setting was normalized.', sourceKey: 'settings.flex_direction' } ],
		parityGaps: {
			motion: { code: 'unsupported-motion', message: 'Motion effects are not imported.', sourceKey: 'settings.motion_fx' },
		},
	} ),
} ) );

describe( 'template import review pipeline', () => {
	it( 'reviews HTML without mutating a project', () => {
		const review = reviewHtmlImportPayload( {
			sourceName: 'review.html',
			html: `
				<html>
					<head>
						<title>Review Landing</title>
						<style>.hero { background-image: url("https://example.com/hero.jpg"); }</style>
					</head>
					<body><section class="hero"><h1>Hello</h1><custom-card>Fallback</custom-card></section></body>
				</html>
			`,
		} );

		expect( review.source ).toBe( 'html' );
		expect( review.summary.documentCount ).toBe( 1 );
		expect( review.summary.nodeCount ).toBeGreaterThan( 2 );
		expect( review.assets ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { kind: 'image', value: 'https://example.com/hero.jpg' } ),
		] ) );
		expect( review.cssBlocks[ 0 ]?.css ).toContain( 'selector .hero' );
		expect( review.structure.some( ( node ) => JSON.stringify( node ).includes( 'html' ) ) ).toBe( true );
		expect( review.parityGaps ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { severity: 'unsupported', sourceKey: 'custom-card' } ),
		] ) );
	} );

	it( 'reviews Elementor JSON with normalized diagnostics', async () => {
		const review = await reviewTemplateImportPayload( {
			content: [
				{ elType: 'section', elements: [] },
			],
		}, { sourceName: 'elementor.json' } );

		expect( review.source ).toBe( 'elementor' );
		expect( review.summary.documentCount ).toBe( 1 );
		expect( review.structure[ 0 ]?.label ).toContain( 'container' );
		expect( review.warnings ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { severity: 'warning', sourceKey: 'settings.flex_direction' } ),
		] ) );
		expect( review.parityGaps ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { severity: 'unsupported', sourceKey: 'settings.motion_fx' } ),
		] ) );
	} );

	it( 'rejects unsupported JSON during review without producing output', async () => {
		await expect( reviewTemplateImportPayload( { nope: true }, { sourceName: 'bad.json' } ) )
			.rejects.toThrow( /Unsupported template JSON/ );
	} );

	it( 'commits reviewed HTML to library, active page, or a new page', () => {
		const activeDocument = createDocument( 'page', 'Home', 'home' );
		const currentProject = createBuilderPackage( 'Current', [ activeDocument ] );
		const review = reviewHtmlImportPayload( {
			sourceName: 'destinations.html',
			html: '<main><h1>Imported</h1><p>Copy</p></main>',
		} );

		const libraryResult = commitTemplateImportReview( currentProject, review, { destination: 'library' } );
		expect( libraryResult.project.documents.filter( ( document ) => document.kind === 'library-item' ) ).toHaveLength( 1 );

		const activeResult = commitTemplateImportReview( currentProject, review, {
			destination: 'active-page',
			activeDocumentId: activeDocument.id,
		} );
		const updatedActive = activeResult.project.documents.find( ( document ) => document.id === activeDocument.id );
		expect( updatedActive?.root ).toHaveLength( 1 );
		expect( activeResult.summary.libraryItemCount ).toBe( 0 );

		const pageResult = commitTemplateImportReview( currentProject, review, { destination: 'new-page' } );
		expect( pageResult.project.documents.filter( ( document ) => document.kind === 'page' ) ).toHaveLength( 2 );
	} );

	it( 'keeps the existing HTML import API defaulting to library items', async () => {
		const currentProject = createBuilderPackage( 'Current', [ createDocument( 'page', 'Home', 'home' ) ] );
		const result = await importHtmlIntoProject( currentProject, {
			html: '<section><h1>Simple</h1></section>',
			sourceName: 'simple.html',
		} );

		expect( result.summary.libraryItemCount ).toBe( 1 );
		expect( result.project.documents.some( ( document ) => document.kind === 'library-item' ) ).toBe( true );
	} );
} );
