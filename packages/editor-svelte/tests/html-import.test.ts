// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { importHtmlPackage } from '../src/lib/html-import';

describe( 'HTML importer', () => {
	it( 'imports a full HTML document as an editable library item package', () => {
		const result = importHtmlPackage( {
			sourceName: 'landing.html',
			html: `
				<!doctype html>
				<html>
					<head>
						<title>Imported Landing</title>
						<style>
							body { margin: 0; }
							.hero { background: #101827; display: flex; }
							@media (max-width: 640px) { .hero h1 { color: #0c9488; } }
							@import url("https://example.com/site.css");
						</style>
					</head>
					<body>
						<main id="hero" class="hero" style="padding: 32px; gap: 18px;">
							<h1 style="color: #fff;">Hello <span>HTML</span></h1>
							<p>Rich <strong>copy</strong></p>
							<img src="https://example.com/hero.jpg" alt="Hero image" />
							<a class="button primary" href="/start" style="background-color: #2563eb; color: #fff;">Start</a>
							<my-widget data-id="42">Custom</my-widget>
							<script>window.bad = true;</script>
						</main>
					</body>
				</html>
			`,
		} );

		const document = result.project.documents[ 0 ];
		const root = document.root[ 0 ];
		const hero = root.children[ 0 ];
		const [ heading, paragraph, image, button, custom ] = hero.children;

		expect( document.kind ).toBe( 'library-item' );
		expect( document.title ).toBe( 'Imported Landing' );
		expect( root.type ).toBe( 'container' );
		expect( root.styles.customCss ).toContain( 'selector' );
		expect( root.styles.customCss ).toContain( 'selector .hero' );
		expect( root.styles.customCss ).toContain( 'background: #101827' );
		expect( root.styles.customCss ).toContain( 'color: #0c9488' );
		expect( root.styles.customCss ).toContain( '@media' );
		expect( root.styles.customCss ).not.toContain( '@import' );
		expect( hero.type ).toBe( 'container' );
		expect( hero.layout ).toMatchObject( {
			display: 'flex',
			width: '100%',
		} );
		expect( hero.layout.direction ).toBeUndefined();
		expect( hero.attributes ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { name: 'id', value: 'hero' } ),
			expect.objectContaining( { name: 'class', value: 'hero' } ),
		] ) );
		expect( hero.styles.base ).toMatchObject( {
			padding: '32px',
			gap: '18px',
		} );
		expect( heading.styles.base ).toMatchObject( {
			color: '#fff',
		} );
		expect( heading ).toMatchObject( {
			type: 'heading',
			props: {
				text: 'Hello <span>HTML</span>',
				level: 'h1',
			},
		} );
		expect( paragraph ).toMatchObject( {
			type: 'paragraph',
			props: {
				text: 'Rich <strong>copy</strong>',
			},
		} );
		expect( image ).toMatchObject( {
			type: 'image',
			props: {
				src: 'https://example.com/hero.jpg',
				alt: 'Hero image',
			},
		} );
		expect( button ).toMatchObject( {
			type: 'button',
			props: {
				text: 'Start',
				href: '/start',
			},
			styles: {
				base: {
					backgroundColor: '#2563eb',
					color: '#fff',
				},
			},
		} );
		expect( custom.type ).toBe( 'html' );
		expect( result.warnings ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { code: 'unsupported-css-import' } ),
			expect.objectContaining( { code: 'html-fallback-node' } ),
			expect.objectContaining( { code: 'unsupported-html-script' } ),
		] ) );
	} );

	it( 'rejects empty HTML', () => {
		expect( () => importHtmlPackage( { html: '   ' } ) ).toThrow( /Paste HTML/ );
	} );

	it( 'keeps HTML flex rows from being overridden by imported column defaults', () => {
		const result = importHtmlPackage( {
			sourceName: 'row.html',
			html: `
				<style>
					.hero .actions { display: flex; justify-content: center; gap: 1rem; }
					.explicit-column { display: flex; flex-direction: column; }
				</style>
				<section class="hero"><div class="actions"><a class="button" href="#">One</a><a class="button" href="#">Two</a></div></section>
				<section style="display: flex;"><a class="button" href="#">Inline One</a><a class="button" href="#">Inline Two</a></section>
				<section class="explicit-column"><h2>Stacked</h2><p>Copy</p></section>
			`,
		} );
		const root = result.project.documents[ 0 ].root[ 0 ];
		const hero = root.children[ 0 ];
		const row = hero.children[ 0 ];
		const inlineRow = root.children[ 1 ];
		const column = root.children[ 2 ];

		expect( row.layout ).toMatchObject( {
			display: 'flex',
		} );
		expect( row.layout.direction ).toBeUndefined();
		expect( inlineRow.layout.direction ).toBeUndefined();
		expect( column.layout.direction ).toBe( 'column' );
	} );

	it( 'omits undefined layout values from nested non-section containers', () => {
		const result = importHtmlPackage( {
			sourceName: 'tappy.html',
			html: `
				<!doctype html>
				<html>
					<head>
						<title>Tappy.Link - Tap into something better</title>
						<style>
							:root { --primary: #F3662B; }
							header { position: sticky; top: 0; }
							.container { max-width: 1200px; margin: 0 auto; }
						</style>
					</head>
					<body>
						<header>
							<div class="container header-wrap">
								<div class="logo"><a href="#"><img src="https://example.com/logo.png" alt="Tappy"></a></div>
								<nav class="nav-links"><a href="#" class="btn btn-primary">Get Started</a></nav>
							</div>
						</header>
						<main>
							<section class="hero"><div class="container"><h1><span>Tap</span> the real world.</h1></div></section>
						</main>
					</body>
				</html>
			`,
		} );

		const allNodes = collectNodes( result.project.documents[ 0 ].root );
		for ( const node of allNodes ) {
			expect( Object.values( node.layout ) ).not.toContain( undefined );
		}
		expect( result.project.documents[ 0 ].title ).toBe( 'Tappy.Link - Tap into something better' );
		expect( allNodes.some( ( node ) => node.type === 'container' && node.attributes.some( ( attribute ) => attribute.name === 'class' && attribute.value === 'container header-wrap' ) ) ).toBe( true );
	} );
} );

function collectNodes( nodes: ReturnType<typeof importHtmlPackage>[ 'project' ][ 'documents' ][ number ][ 'root' ] ) {
	return nodes.flatMap( ( node ): typeof nodes => [
		node,
		...collectNodes( node.children ),
		...Object.values( node.slots as Record<string, typeof nodes> ).flatMap( collectNodes ),
	] );
}
