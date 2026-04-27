import type { JsonValue } from '@builder/schema';

export type StructuredCollectionKind =
	| 'tabs'
	| 'accordion'
	| 'toggle'
	| 'menu'
	| 'gallery'
	| 'carousel'
	| 'form-fields'
	| 'form-options';

export interface StructuredCollectionFieldSpec {
	key: string;
	label: string;
	type: 'text' | 'textarea' | 'toggle' | 'number' | 'select';
	placeholder?: string;
	options?: Array<{ label: string; value: string }>;
}

export interface StructuredCollectionSpec {
	kind: StructuredCollectionKind;
	title: string;
	itemLabel: string;
	emptyLabel: string;
	fields: StructuredCollectionFieldSpec[];
}

export function resolveStructuredCollectionKind(
	nodeType: string | undefined,
	path: string,
): StructuredCollectionKind | undefined {
	if ( path !== 'props.items' && path !== 'props.images' && path !== 'props.slides' && path !== 'props.fields' ) {
		return undefined;
	}

	switch ( nodeType ) {
		case 'tabs':
			return path === 'props.items' ? 'tabs' : undefined;
		case 'accordion':
		case 'toggle':
			return path === 'props.items' ? nodeType : undefined;
		case 'menu':
		case 'social-icons':
			return path === 'props.items' ? 'menu' : undefined;
		case 'gallery':
			return path === 'props.images' ? 'gallery' : undefined;
		case 'carousel':
			return path === 'props.slides' ? 'carousel' : undefined;
		case 'form':
			return path === 'props.fields' ? 'form-fields' : undefined;
		default:
			return undefined;
	}
}

export function isStructuredCollectionField( nodeType: string | undefined, path: string ): boolean {
	return Boolean( resolveStructuredCollectionKind( nodeType, path ) );
}

export function getStructuredCollectionSpec( kind: StructuredCollectionKind ): StructuredCollectionSpec {
	switch ( kind ) {
		case 'tabs':
			return {
				kind,
				title: 'Tabs items',
				itemLabel: 'Tab',
				emptyLabel: 'No tabs yet',
				fields: [
					{ key: 'label', label: 'Label', type: 'text', placeholder: 'Tab label' },
					{ key: 'content', label: 'Content', type: 'textarea', placeholder: 'Tab content' },
				],
			};
		case 'accordion':
		case 'toggle':
			return {
				kind,
				title: `${kind === 'toggle' ? 'Toggle' : 'Accordion'} items`,
				itemLabel: 'Item',
				emptyLabel: `No ${kind} items yet`,
				fields: [
					{ key: 'title', label: 'Title', type: 'text', placeholder: 'Item title' },
					{ key: 'body', label: 'Body', type: 'textarea', placeholder: 'Item body' },
					{ key: 'open', label: 'Open', type: 'toggle' },
				],
			};
		case 'menu':
			return {
				kind,
				title: 'Menu items',
				itemLabel: 'Link',
				emptyLabel: 'No links yet',
				fields: [
					{ key: 'label', label: 'Label', type: 'text', placeholder: 'Link label' },
					{ key: 'href', label: 'Href', type: 'text', placeholder: '# or /path' },
					{ key: 'target', label: 'Target', type: 'select', options: [ { label: 'Default', value: '' }, { label: '_blank', value: '_blank' } ] },
					{ key: 'rel', label: 'Rel', type: 'text', placeholder: 'nofollow noopener' },
					{ key: 'icon', label: 'Icon', type: 'text', placeholder: 'Optional icon name' },
				],
			};
		case 'gallery':
			return {
				kind,
				title: 'Gallery images',
				itemLabel: 'Image',
				emptyLabel: 'No images yet',
				fields: [
					{ key: 'src', label: 'Source', type: 'text', placeholder: 'https://...' },
					{ key: 'alt', label: 'Alt text', type: 'text', placeholder: 'Alt text' },
					{ key: 'caption', label: 'Caption', type: 'text', placeholder: 'Optional caption' },
					{ key: 'href', label: 'Link', type: 'text', placeholder: 'Optional link' },
				],
			};
		case 'carousel':
			return {
				kind,
				title: 'Carousel slides',
				itemLabel: 'Slide',
				emptyLabel: 'No slides yet',
				fields: [
					{ key: 'title', label: 'Title', type: 'text', placeholder: 'Slide title' },
					{ key: 'text', label: 'Text', type: 'textarea', placeholder: 'Slide text' },
					{ key: 'src', label: 'Image', type: 'text', placeholder: 'https://...' },
					{ key: 'alt', label: 'Alt text', type: 'text', placeholder: 'Optional alt text' },
					{ key: 'ctaLabel', label: 'CTA label', type: 'text', placeholder: 'Call to action' },
					{ key: 'ctaHref', label: 'CTA href', type: 'text', placeholder: '/link' },
				],
			};
		case 'form-fields':
			return {
				kind,
				title: 'Form fields',
				itemLabel: 'Field',
				emptyLabel: 'No form fields yet',
				fields: [
					{
						key: 'kind',
						label: 'Kind',
						type: 'select',
						options: [
							{ label: 'Text', value: 'text' },
							{ label: 'Email', value: 'email' },
							{ label: 'Textarea', value: 'textarea' },
							{ label: 'Select', value: 'select' },
							{ label: 'Checkbox', value: 'checkbox' },
							{ label: 'Radio', value: 'radio' },
							{ label: 'Hidden', value: 'hidden' },
							{ label: 'Number', value: 'number' },
							{ label: 'URL', value: 'url' },
						],
					},
					{ key: 'label', label: 'Label', type: 'text', placeholder: 'Field label' },
					{ key: 'name', label: 'Name', type: 'text', placeholder: 'Field name' },
					{ key: 'placeholder', label: 'Placeholder', type: 'text', placeholder: 'Optional placeholder' },
					{ key: 'value', label: 'Value', type: 'text', placeholder: 'Default value' },
					{ key: 'legend', label: 'Legend', type: 'text', placeholder: 'Optional legend' },
					{ key: 'rows', label: 'Rows', type: 'number', placeholder: '5' },
					{ key: 'checked', label: 'Checked', type: 'toggle' },
				],
			};
		case 'form-options':
			return {
				kind,
				title: 'Select options',
				itemLabel: 'Option',
				emptyLabel: 'No options yet',
				fields: [
					{ key: 'label', label: 'Label', type: 'text', placeholder: 'Option label' },
					{ key: 'value', label: 'Value', type: 'text', placeholder: 'Option value' },
				],
			};
	}
}

export function normalizeStructuredCollectionValue(
	kind: StructuredCollectionKind,
	value: JsonValue,
): Record<string, JsonValue>[] {
	const items = Array.isArray( value ) ? value : [];

	return items.map( ( item, index ) => {
		if ( !item || typeof item !== 'object' || Array.isArray( item ) ) {
			return createStructuredCollectionItem( kind, index, item );
		}

		return {
			...createStructuredCollectionItem( kind, index ),
			...( item as Record<string, JsonValue> ),
		};
	} );
}

export function createStructuredCollectionItem(
	kind: StructuredCollectionKind,
	index = 0,
	seed?: JsonValue,
): Record<string, JsonValue> {
	const fallbackLabel = seed && typeof seed === 'string' ? seed : undefined;

	switch ( kind ) {
		case 'tabs':
			return {
				id: `tab-${ index + 1 }`,
				label: fallbackLabel ?? `Tab ${ index + 1 }`,
				content: '',
			};
		case 'accordion':
		case 'toggle':
			return {
				id: `item-${ index + 1 }`,
				title: fallbackLabel ?? `Item ${ index + 1 }`,
				body: '',
				open: false,
			};
		case 'menu':
			return {
				id: `link-${ index + 1 }`,
				label: fallbackLabel ?? 'Link',
				href: '#',
				target: '',
				rel: '',
				icon: '',
				children: [],
			};
		case 'gallery':
			return {
				id: `image-${ index + 1 }`,
				src: fallbackLabel ?? '',
				alt: '',
				caption: '',
				href: '',
			};
		case 'carousel':
			return {
				id: `slide-${ index + 1 }`,
				title: fallbackLabel ?? `Slide ${ index + 1 }`,
				text: '',
				src: '',
				alt: '',
				ctaLabel: '',
				ctaHref: '',
			};
		case 'form-fields':
			return {
				id: `field-${ index + 1 }`,
				kind: 'text',
				label: fallbackLabel ?? 'Field',
				name: '',
				placeholder: '',
				value: '',
				legend: '',
				rows: 5,
				checked: false,
				options: [],
			};
		case 'form-options':
			return {
				label: fallbackLabel ?? `Option ${ index + 1 }`,
				value: `option-${ index + 1 }`,
			};
	}
}

export function createNextStructuredCollectionValue(
	kind: StructuredCollectionKind,
	value: JsonValue,
): Record<string, JsonValue>[] {
	return normalizeStructuredCollectionValue( kind, value );
}
