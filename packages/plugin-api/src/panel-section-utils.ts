import type { BuilderFieldDefinition, BuilderPanelSectionDefinition, BuilderPanelSectionTab } from './index.ts';

type SelectOption = string | { label: string; value: string };

export function sectionField(
	id: string,
	label: string,
	fields: BuilderFieldDefinition[],
	tab: BuilderPanelSectionTab = 'content',
): BuilderPanelSectionDefinition {
	return { id, label, fields, tab };
}

export function contentSection(
	id: string,
	label: string,
	fields: BuilderFieldDefinition[],
): BuilderPanelSectionDefinition {
	return sectionField( id, label, fields, 'content' );
}

export function styleSection(
	id: string,
	label: string,
	fields: BuilderFieldDefinition[],
): BuilderPanelSectionDefinition {
	return sectionField( id, label, fields, 'style' );
}

export function advancedSection(
	id: string,
	label: string,
	fields: BuilderFieldDefinition[],
): BuilderPanelSectionDefinition {
	return sectionField( id, label, fields, 'advanced' );
}

export function textField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'text', ...options };
}

export function richTextField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'rich-text', ...options };
}

export function textareaField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'textarea', ...options };
}

export function numberField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'number', ...options };
}

export function urlField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'url', ...options };
}

export function imageField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'image', ...options };
}

export function jsonField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'json', ...options };
}

export function selectField( id: string, label: string, path: string, values: SelectOption[], options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type' | 'options'>> = {} ): BuilderFieldDefinition {
	return {
		id,
		label,
		path,
		type: 'select',
		options: values.map( ( value ) => typeof value === 'string' ? { label: value.toUpperCase(), value } : value ),
		...options,
	};
}

export function toggleField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'toggle', ...options };
}
