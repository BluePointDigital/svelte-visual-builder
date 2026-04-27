import type { BuilderNode, BuilderPackage, HtmlAttribute, JsonValue, MediaAsset, StyleSet } from '@builder/schema';
import { createBuilderPackage, createDocument, createNode, createStyleSet, slugify } from '@builder/schema';
import type { TemplateImportDiagnostic } from './template-import';
import { mergeMediaCatalog, normalizeMediaAsset } from './media';

export interface HtmlImportPayload {
	html: string;
	sourceName?: string;
}

export interface HtmlImportResult {
	project: BuilderPackage;
	warnings: TemplateImportDiagnostic[];
	parityGaps: TemplateImportDiagnostic[];
}

const CONTAINER_TAGS = new Set( [ 'main', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'div' ] );
const RICH_HTML_TAGS = new Set( [ 'ul', 'ol', 'table', 'dl', 'pre', 'blockquote' ] );
const FALLBACK_HTML_TAGS = new Set( [ 'iframe', 'video', 'audio', 'canvas', 'svg', 'picture', 'form', 'input', 'textarea', 'select', 'button' ] );
const DROPPED_TAGS = new Set( [ 'script', 'noscript', 'template', 'style', 'link', 'meta', 'title' ] );

export function importHtmlPackage( payload: HtmlImportPayload ): HtmlImportResult {
	const sourceName = payload.sourceName?.trim() || 'Imported HTML';
	const html = payload.html.trim();
	if ( !html ) {
		throw new Error( 'Paste HTML before importing.' );
	}
	if ( typeof DOMParser === 'undefined' ) {
		throw new Error( 'HTML import requires a browser DOM parser.' );
	}

	const parser = new DOMParser();
	const parsed = parser.parseFromString( html, 'text/html' );
	const parserError = parsed.querySelector( 'parsererror' );
	if ( parserError ) {
		throw new Error( 'The pasted HTML could not be parsed.' );
	}

	const warnings: TemplateImportDiagnostic[] = [];
	const parityGaps: TemplateImportDiagnostic[] = [];
	const styles = [ ...parsed.querySelectorAll( 'style' ) ].map( ( element ) => element.textContent ?? '' ).filter( Boolean );
	const bodyChildren = [ ...parsed.body.childNodes ];
	const roots = importChildNodes( bodyChildren, warnings, parityGaps );
	if ( !roots.length ) {
		throw new Error( 'The pasted HTML did not contain importable body content.' );
	}

	const title = resolveDocumentTitle( parsed, roots, sourceName );
	const document = createDocument( 'library-item', title, slugify( title ) || 'imported-html' );
	const rootId = crypto.randomUUID();
	document.root = [
		createNode( {
			id: rootId,
			type: 'container',
			props: {
				sourceName,
			},
			layout: {
				display: 'flex',
				direction: 'column',
				width: '100%',
			},
			styles: createStyleSet( {
				base: {
					width: '100%',
				},
				customCss: scopeImportedCss( styles.join( '\n\n' ), warnings, parityGaps ),
			} ),
			children: roots,
			meta: {
				imported: true,
				importSource: 'html',
				importSourceName: sourceName,
			},
		} ),
	];
	document.meta = {
		importSource: 'html',
		importSourceName: sourceName,
		originalDocumentKind: 'html',
	};

	const project = createBuilderPackage( sourceName, [ document ] );
	project.media = collectHtmlMediaAssets( parsed, roots, styles.join( '\n\n' ) );

	return {
		project,
		warnings,
		parityGaps,
	};
}

function importChildNodes( nodes: Node[], warnings: TemplateImportDiagnostic[], parityGaps: TemplateImportDiagnostic[] ): BuilderNode[] {
	const output: BuilderNode[] = [];
	for ( const node of nodes ) {
		if ( node.nodeType === Node.TEXT_NODE ) {
			const text = node.textContent?.trim();
			if ( text ) {
				output.push( createTextNode( text, 'paragraph' ) );
			}
			continue;
		}
		if ( node.nodeType !== Node.ELEMENT_NODE ) {
			continue;
		}
		const imported = importElementNode( node as Element, warnings, parityGaps );
		if ( imported ) {
			output.push( imported );
		}
	}
	return output;
}

function importElementNode( element: Element, warnings: TemplateImportDiagnostic[], parityGaps: TemplateImportDiagnostic[] ): BuilderNode | undefined {
	const tag = element.tagName.toLowerCase();
	if ( DROPPED_TAGS.has( tag ) ) {
		if ( tag === 'script' ) {
			addDiagnostic( warnings, parityGaps, 'unsupported-html-script', 'Script tags are not imported or executed.', 'unsupported', 'script' );
		}
		if ( tag === 'link' ) {
			const href = element.getAttribute( 'href' );
			if ( href ) {
				addDiagnostic( warnings, parityGaps, 'external-html-asset', `External HTML asset was preserved as a diagnostic only: ${ href }`, 'info', 'link[href]' );
			}
		}
		return undefined;
	}

	if ( /^h[1-6]$/.test( tag ) ) {
		return createNode( {
			id: crypto.randomUUID(),
			type: 'heading',
			props: {
				text: element.innerHTML.trim() || element.textContent?.trim() || 'Heading',
				level: tag,
			},
			attributes: extractAttributes( element ),
			styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
			meta: createHtmlNodeMeta( tag ),
		} );
	}

	if ( tag === 'p' ) {
		return createNode( {
			id: crypto.randomUUID(),
			type: 'paragraph',
			props: {
				text: element.innerHTML.trim() || element.textContent?.trim() || '',
			},
			attributes: extractAttributes( element ),
			styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
			meta: createHtmlNodeMeta( tag ),
		} );
	}

	if ( tag === 'img' ) {
		return createNode( {
			id: crypto.randomUUID(),
			type: 'image',
			props: {
				src: element.getAttribute( 'src' ) ?? '',
				alt: element.getAttribute( 'alt' ) ?? '',
			},
			attributes: extractAttributes( element, [ 'src', 'alt' ] ),
			styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
			meta: createHtmlNodeMeta( tag ),
		} );
	}

	if ( tag === 'a' && isButtonLikeAnchor( element ) ) {
		return createNode( {
			id: crypto.randomUUID(),
			type: 'button',
			props: {
				text: element.innerHTML.trim() || element.textContent?.trim() || 'Button',
				href: element.getAttribute( 'href' ) ?? '#',
			},
			attributes: extractAttributes( element, [ 'href' ] ),
			styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
			meta: createHtmlNodeMeta( tag ),
		} );
	}

	if ( CONTAINER_TAGS.has( tag ) ) {
		const children = importChildNodes( [ ...element.childNodes ], warnings, parityGaps );
		return createNode( {
			id: crypto.randomUUID(),
			type: 'container',
			layout: compactJsonObject( {
				display: 'flex',
				direction: 'column',
				width: tag === 'section' || tag === 'main' ? '100%' : undefined,
			} ),
			attributes: extractAttributes( element ),
			styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
			children,
			meta: createHtmlNodeMeta( tag ),
		} );
	}

	if ( RICH_HTML_TAGS.has( tag ) || FALLBACK_HTML_TAGS.has( tag ) || tag.includes( '-' ) ) {
		addDiagnostic( warnings, parityGaps, 'html-fallback-node', `HTML <${ tag }> was imported as an editable HTML node.`, 'unsupported', tag );
		return createHtmlFallbackNode( element, tag );
	}

	if ( hasOnlyInlineContent( element ) ) {
		return createNode( {
			id: crypto.randomUUID(),
			type: 'paragraph',
			props: {
				text: element.innerHTML.trim() || element.textContent?.trim() || '',
			},
			attributes: extractAttributes( element ),
			styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
			meta: createHtmlNodeMeta( tag ),
		} );
	}

	addDiagnostic( warnings, parityGaps, 'html-fallback-node', `HTML <${ tag }> was imported as an editable HTML node.`, 'unsupported', tag );
	return createHtmlFallbackNode( element, tag );
}

function createHtmlFallbackNode( element: Element, tag: string ): BuilderNode {
	return createNode( {
		id: crypto.randomUUID(),
		type: 'html',
		props: {
			markup: element.outerHTML,
		},
		styles: createStyleSet( { base: parseInlineStyle( element.getAttribute( 'style' ) ) } ),
		attributes: extractAttributes( element ),
		meta: createHtmlNodeMeta( tag, true ),
	} );
}

function createTextNode( text: string, type: 'paragraph' | 'heading' ): BuilderNode {
	return createNode( {
		id: crypto.randomUUID(),
		type,
		props: {
			text,
			...( type === 'heading' ? { level: 'h2' } : {} ),
		},
		meta: createHtmlNodeMeta( '#text' ),
	} );
}

function createHtmlNodeMeta( tag: string, fallback = false ): Record<string, JsonValue> {
	return {
		imported: true,
		importSource: 'html',
		htmlTag: tag,
		...( fallback ? { htmlFallback: true } : {} ),
	};
}

function collectHtmlMediaAssets( parsed: Document, roots: BuilderNode[], css: string ): MediaAsset[] {
	const fromNodes = collectNodeMediaAssets( roots );
	const fromMarkup = [ ...parsed.querySelectorAll( 'img' ) ].map( ( image ) => image.getAttribute( 'src' ) ?? '' );
	const fromCss = [ ...css.matchAll( /url\(\s*["']?([^"')]+)["']?\s*\)/gi ) ].map( ( match ) => match[ 1 ] ?? '' );
	const assets = [
		...fromNodes,
		...fromMarkup.filter( Boolean ).map( ( url ) => normalizeMediaAsset( { url, source: 'external' } ) ),
		...fromCss.filter( isImportableMediaUrl ).map( ( url ) => normalizeMediaAsset( { url, source: 'external' } ) ),
	];
	return mergeMediaCatalog( [], assets );
}

function collectNodeMediaAssets( nodes: BuilderNode[] ): MediaAsset[] {
	return nodes.flatMap( ( node ) => {
		const assets: MediaAsset[] = [];
		if ( node.type === 'image' && typeof node.props.src === 'string' && node.props.src ) {
			assets.push( normalizeMediaAsset( {
				url: node.props.src,
				alt: typeof node.props.alt === 'string' ? node.props.alt : undefined,
				source: 'external',
			} ) );
		}
		for ( const child of node.children ) {
			assets.push( ...collectNodeMediaAssets( [ child ] ) );
		}
		for ( const children of Object.values( node.slots as Record<string, BuilderNode[]> ) ) {
			assets.push( ...collectNodeMediaAssets( children ) );
		}
		return assets;
	} );
}

function isImportableMediaUrl( url: string ): boolean {
	return /^(https?:|data:image\/|\/|\.\/|\.\.\/)/i.test( url ) && /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test( url );
}

function extractAttributes( element: Element, omit: string[] = [] ): HtmlAttribute[] {
	const omitted = new Set( [ 'style', ...omit ].map( ( entry ) => entry.toLowerCase() ) );
	return [ ...element.attributes ]
		.filter( ( attribute ) => !omitted.has( attribute.name.toLowerCase() ) )
		.map( ( attribute ) => ( {
			id: crypto.randomUUID(),
			name: attribute.name,
			value: attribute.value,
			kind: 'static' as const,
		} ) );
}

function parseInlineStyle( value: string | null ): Record<string, JsonValue> {
	if ( !value ) {
		return {};
	}
	const styles: Record<string, JsonValue> = {};
	for ( const declaration of value.split( ';' ) ) {
		const separatorIndex = declaration.indexOf( ':' );
		if ( separatorIndex === -1 ) {
			continue;
		}
		const property = declaration.slice( 0, separatorIndex ).trim();
		const propertyValue = declaration.slice( separatorIndex + 1 ).trim();
		if ( !property || !propertyValue || /[;{}]/.test( property ) ) {
			continue;
		}
		styles[ normalizeCssPropertyName( property ) ] = propertyValue;
	}
	return styles;
}

function compactJsonObject( value: Record<string, JsonValue | undefined> ): Record<string, JsonValue> {
	return Object.fromEntries(
		Object.entries( value ).filter( ( _entry ): _entry is [ string, JsonValue ] => _entry[ 1 ] !== undefined ),
	);
}

function scopeImportedCss( css: string, warnings: TemplateImportDiagnostic[], parityGaps: TemplateImportDiagnostic[] ): string {
	const withoutImports = css.replaceAll( /@import[^;]+;/gi, ( match ) => {
		addDiagnostic( warnings, parityGaps, 'unsupported-css-import', `Skipped external CSS import: ${ match.trim() }`, 'unsupported', '@import' );
		return '';
	} ).trim();
	if ( !withoutImports ) {
		return '';
	}
	return scopeCssBlock( withoutImports, warnings, parityGaps );
}

function scopeCssBlock( css: string, warnings: TemplateImportDiagnostic[], parityGaps: TemplateImportDiagnostic[] ): string {
	let output = '';
	let index = 0;
	while ( index < css.length ) {
		const open = css.indexOf( '{', index );
		if ( open === -1 ) {
			break;
		}
		const selector = css.slice( index, open ).trim();
		const close = findMatchingBrace( css, open );
		if ( close === -1 ) {
			break;
		}
		const body = css.slice( open + 1, close ).trim();
		if ( selector.startsWith( '@media' ) || selector.startsWith( '@supports' ) ) {
			const scopedBody = scopeCssBlock( body, warnings, parityGaps );
			if ( scopedBody ) {
				output += `${ selector } { ${ scopedBody } }\n`;
			}
		} else if ( selector.startsWith( '@' ) ) {
			addDiagnostic( warnings, parityGaps, 'unsupported-css-rule', `Skipped unsupported CSS rule "${ selector }".`, 'unsupported', selector );
		} else {
			const scopedSelector = scopeSelectorList( selector, warnings, parityGaps );
			if ( scopedSelector && body ) {
				output += `${ scopedSelector } { ${ body } }\n`;
			}
		}
		index = close + 1;
	}
	return output.trim();
}

function scopeSelectorList( selector: string, warnings: TemplateImportDiagnostic[], parityGaps: TemplateImportDiagnostic[] ): string {
	const scoped = selector.split( ',' )
		.map( ( entry ) => entry.trim() )
		.filter( Boolean )
		.map( ( entry ) => scopeSingleSelector( entry, warnings, parityGaps ) )
		.filter( Boolean );
	return scoped.join( ', ' );
}

function scopeSingleSelector( selector: string, warnings: TemplateImportDiagnostic[], parityGaps: TemplateImportDiagnostic[] ): string {
	const normalized = selector.trim();
	if ( !normalized ) {
		return '';
	}
	if ( /(^|[\s>+~])(html|body)(?=$|[\s.#:[>+~])/i.test( normalized ) ) {
		addDiagnostic( warnings, parityGaps, 'global-css-selector', `Scoped global selector "${ normalized }" to the imported root.`, 'info', normalized );
		return 'selector';
	}
	if ( normalized === ':root' ) {
		addDiagnostic( warnings, parityGaps, 'global-css-selector', 'Scoped :root styles to the imported root.', 'info', ':root' );
		return 'selector';
	}
	if ( normalized.startsWith( 'selector' ) ) {
		return normalized;
	}
	return `selector ${ normalized }`;
}

function findMatchingBrace( value: string, openIndex: number ): number {
	let depth = 0;
	for ( let index = openIndex; index < value.length; index += 1 ) {
		if ( value[ index ] === '{' ) {
			depth += 1;
		}
		if ( value[ index ] === '}' ) {
			depth -= 1;
			if ( depth === 0 ) {
				return index;
			}
		}
	}
	return -1;
}

function normalizeCssPropertyName( property: string ): string {
	if ( property.startsWith( '--' ) ) {
		return property;
	}
	return property.replaceAll( /-([a-z])/g, ( _match, character: string ) => character.toUpperCase() );
}

function isButtonLikeAnchor( element: Element ): boolean {
	const className = element.getAttribute( 'class' ) ?? '';
	const role = element.getAttribute( 'role' ) ?? '';
	return role.toLowerCase() === 'button' || /\b(btn|button|cta|primary|secondary)\b/i.test( className );
}

function hasOnlyInlineContent( element: Element ): boolean {
	return [ ...element.children ].every( ( child ) => {
		const tag = child.tagName.toLowerCase();
		return [ 'a', 'span', 'strong', 'em', 'b', 'i', 'u', 'small', 'mark', 'br', 'sup', 'sub' ].includes( tag );
	} );
}

function resolveDocumentTitle( parsed: Document, roots: BuilderNode[], sourceName: string ): string {
	const title = parsed.title.trim();
	if ( title ) {
		return title;
	}
	const firstHeading = roots.flatMap( flattenBuilderNodes ).find( ( node ) => node.type === 'heading' );
	const headingText = typeof firstHeading?.props.text === 'string'
		? firstHeading.props.text.replaceAll( /<[^>]+>/g, '' ).trim()
		: '';
	return headingText || sourceName || 'Imported HTML';
}

function flattenBuilderNodes( node: BuilderNode ): BuilderNode[] {
	const slots = node.slots as Record<string, BuilderNode[]>;
	return [
		node,
		...node.children.flatMap( flattenBuilderNodes ),
		...Object.values( slots ).flatMap( ( children ) => children.flatMap( flattenBuilderNodes ) ),
	];
}

function addDiagnostic(
	warnings: TemplateImportDiagnostic[],
	parityGaps: TemplateImportDiagnostic[],
	code: string,
	message: string,
	severity: TemplateImportDiagnostic['severity'] = 'warning',
	sourceKey?: string,
): void {
	const diagnostic = { code, message, severity, sourceKey };
	if ( !warnings.some( ( entry ) => entry.code === code && entry.message === message ) ) {
		warnings.push( diagnostic );
	}
	if ( !parityGaps.some( ( entry ) => entry.code === code && entry.message === message ) ) {
		parityGaps.push( diagnostic );
	}
}
