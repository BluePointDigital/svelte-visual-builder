import type {
	BuilderFieldDefinition,
	BuilderFieldType,
	BuilderPanelSectionDefinition,
	BuilderPanelSectionTab,
} from './index.ts';
import {
	createChooseField,
	createChoosePrimitive,
	createColorField,
	createColorPrimitive,
	createDimensionsField,
	createDimensionsPrimitive,
	createFieldWithPrimitive,
	createFilterField,
	createFilterPrimitive,
	createMediaField,
	createMediaPrimitive,
	createSelectField,
	createSelectPrimitive,
	createSectionPrimitive,
	createShadowField,
	createShadowPrimitive,
	createSliderField,
	createSliderPrimitive,
	createSwitcherField,
	createSwitcherPrimitive,
	createTabsField,
	createTabsPrimitive,
	createUrlField,
	createUrlPrimitive,
	type BuilderChooseControlPrimitive,
	type BuilderColorControlPrimitive,
	type BuilderControlDimensionSide,
	type BuilderControlOption,
	type BuilderControlPrimitive,
	type BuilderControlPrimitiveKind,
	type BuilderControlSectionPrimitive,
	type BuilderControlSliderUnit,
	type BuilderControlStateTab,
	type BuilderControlTabsItem,
	type BuilderDimensionsControlPrimitive,
	type BuilderFilterControlItem,
	type BuilderFilterControlPrimitive,
	type BuilderMediaControlPrimitive,
	type BuilderSelectControlPrimitive,
	type BuilderShadowControlPrimitive,
	type BuilderSliderControlPrimitive,
	type BuilderSwitcherControlPrimitive,
	type BuilderTabsControlPrimitive,
	type BuilderUrlControlPrimitive,
} from './control-primitives.ts';

export type BuilderControlFamilyTab = Extract<BuilderPanelSectionTab, 'style' | 'advanced'>;

export type BuilderControlFieldDefinition = BuilderFieldDefinition & {
	primitive?: BuilderControlPrimitive;
	responsive?: boolean;
	stateful?: boolean;
	tokenAware?: boolean;
	family?: string;
	group?: string;
	stateTabs?: BuilderControlStateTab[];
};

export interface BuilderControlSectionDefinition {
	id: string;
	label: string;
	tab: BuilderControlFamilyTab;
	fields: BuilderControlFieldDefinition[];
	description?: string;
	familyId: string;
	groupId?: string;
	order?: number;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	primitive: BuilderControlSectionPrimitive;
}

export interface BuilderControlFamilyDefinition {
	id: string;
	label: string;
	tab: BuilderControlFamilyTab;
	description?: string;
	sections: BuilderControlSectionDefinition[];
}

export interface BuilderControlFieldOptions extends Partial<Omit<BuilderControlFieldDefinition, 'id' | 'label' | 'type' | 'path' | 'options'>> {
	options?: Array<{ label: string; value: string }>;
	primitive?: BuilderControlPrimitive;
}

export interface BuilderControlSectionOptions {
	description?: string;
	groupId?: string;
	order?: number;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	primitive?: BuilderControlSectionPrimitive;
}

export interface BuilderControlFamilyOptions {
	description?: string;
}

export const displayOptions = [
	{ label: 'Block', value: 'block' },
	{ label: 'Inline', value: 'inline' },
	{ label: 'Inline Block', value: 'inline-block' },
	{ label: 'Flex', value: 'flex' },
	{ label: 'Grid', value: 'grid' },
	{ label: 'None', value: 'none' },
];

export const positionOptions = [
	{ label: 'Static', value: 'static' },
	{ label: 'Relative', value: 'relative' },
	{ label: 'Absolute', value: 'absolute' },
	{ label: 'Fixed', value: 'fixed' },
	{ label: 'Sticky', value: 'sticky' },
];

export const directionOptions = [
	{ label: 'Row', value: 'row' },
	{ label: 'Column', value: 'column' },
];

export const visibilityOptions = [
	{ label: 'Shown', value: 'show' },
	{ label: 'Hidden', value: 'hide' },
];

export const borderStyleOptions = [
	{ label: 'None', value: 'none' },
	{ label: 'Solid', value: 'solid' },
	{ label: 'Dashed', value: 'dashed' },
	{ label: 'Dotted', value: 'dotted' },
	{ label: 'Double', value: 'double' },
];

export const typographyTransformOptions = [
	{ label: 'None', value: 'none' },
	{ label: 'Uppercase', value: 'uppercase' },
	{ label: 'Lowercase', value: 'lowercase' },
	{ label: 'Capitalize', value: 'capitalize' },
];

export const textAlignOptions = [
	{ label: 'Start', value: 'start' },
	{ label: 'Center', value: 'center' },
	{ label: 'End', value: 'end' },
	{ label: 'Justify', value: 'justify' },
];

export const blendModeOptions = [
	{ label: 'Normal', value: 'normal' },
	{ label: 'Multiply', value: 'multiply' },
	{ label: 'Screen', value: 'screen' },
	{ label: 'Overlay', value: 'overlay' },
	{ label: 'Darken', value: 'darken' },
	{ label: 'Lighten', value: 'lighten' },
];

export {
	createChooseField,
	createChoosePrimitive,
	createColorField,
	createColorPrimitive,
	createDimensionsField,
	createDimensionsPrimitive,
	createFieldWithPrimitive,
	createFilterField,
	createFilterPrimitive,
	createMediaField,
	createMediaPrimitive,
	createSelectField,
	createSelectPrimitive,
	createSectionPrimitive,
	createShadowField,
	createShadowPrimitive,
	createSliderField,
	createSliderPrimitive,
	createSwitcherField,
	createSwitcherPrimitive,
	createTabsField,
	createTabsPrimitive,
	createUrlField,
	createUrlPrimitive,
};

export type {
	BuilderChooseControlPrimitive,
	BuilderColorControlPrimitive,
	BuilderControlDimensionSide,
	BuilderControlOption,
	BuilderControlPrimitive,
	BuilderControlPrimitiveKind,
	BuilderControlSectionPrimitive,
	BuilderControlSliderUnit,
	BuilderControlStateTab,
	BuilderControlTabsItem,
	BuilderDimensionsControlPrimitive,
	BuilderFilterControlItem,
	BuilderFilterControlPrimitive,
	BuilderMediaControlPrimitive,
	BuilderSelectControlPrimitive,
	BuilderShadowControlPrimitive,
	BuilderSliderControlPrimitive,
	BuilderSwitcherControlPrimitive,
	BuilderTabsControlPrimitive,
	BuilderUrlControlPrimitive,
};

export function createControlField(
	id: string,
	label: string,
	type: BuilderFieldType,
	path: string,
	options: BuilderControlFieldOptions = {},
): BuilderControlFieldDefinition {
	const primitive = options.primitive ?? inferControlPrimitive( type, options );

	return {
		id,
		label,
		type,
		path,
		...options,
		primitive,
	};
}

export function createControlSection(
	id: string,
	label: string,
	tab: BuilderControlFamilyTab,
	fields: BuilderControlFieldDefinition[],
	options: BuilderControlSectionOptions & { familyId: string },
): BuilderControlSectionDefinition {
	return {
		id,
		label,
		tab,
		fields,
		familyId: options.familyId,
		description: options.description,
		groupId: options.groupId,
		order: options.order,
		collapsible: options.collapsible ?? true,
		defaultCollapsed: options.defaultCollapsed ?? false,
		primitive: options.primitive ?? createSectionPrimitive( {
			collapsible: options.collapsible ?? true,
			defaultCollapsed: options.defaultCollapsed ?? false,
		} ),
	};
}

export function createControlFamily(
	id: string,
	label: string,
	tab: BuilderControlFamilyTab,
	sections: BuilderControlSectionDefinition[],
	options: BuilderControlFamilyOptions = {},
): BuilderControlFamilyDefinition {
	return {
		id,
		label,
		tab,
		description: options.description,
		sections,
	};
}

export function toPanelSections( family: BuilderControlFamilyDefinition ): BuilderPanelSectionDefinition[] {
	return family.sections.map( ( section ) => ( {
		id: section.id,
		label: section.label,
		description: section.description,
		fields: section.fields,
		tab: section.tab,
	} ) );
}

export function flattenControlFamilies( families: readonly BuilderControlFamilyDefinition[] ): BuilderControlSectionDefinition[] {
	return families.flatMap( ( family ) => family.sections );
}

export function indexControlFamilies( families: readonly BuilderControlFamilyDefinition[] ): Map<string, BuilderControlFamilyDefinition> {
	return new Map( families.map( ( family ) => [ family.id, family ] ) );
}

export function filterControlFamiliesByTab(
	families: readonly BuilderControlFamilyDefinition[],
	tab: BuilderControlFamilyTab,
): BuilderControlFamilyDefinition[] {
	return families.filter( ( family ) => family.tab === tab );
}

export function collectControlFieldPaths( family: BuilderControlFamilyDefinition ): string[] {
	return family.sections.flatMap( ( section ) => section.fields.map( ( field ) => field.path ) );
}

function inferControlPrimitive( type: BuilderFieldType, options: BuilderControlFieldOptions ): BuilderControlPrimitive | undefined {
	switch ( type ) {
		case 'select':
			return options.options ? createSelectPrimitive( options.options, options ) : undefined;
		case 'toggle':
			return createSwitcherPrimitive( {
				onLabel: 'On',
				offLabel: 'Off',
				defaultValue: false,
				placeholder: options.placeholder,
				description: options.description,
				responsive: options.responsive,
				stateful: options.stateful,
				tokenAware: options.tokenAware,
				stateTabs: options.stateTabs,
			} );
		case 'image':
			return createMediaPrimitive( {
				assetType: 'image',
				placeholder: options.placeholder,
				description: options.description,
				responsive: options.responsive,
				stateful: options.stateful,
				tokenAware: options.tokenAware,
				stateTabs: options.stateTabs,
			} );
		case 'url':
			return createUrlPrimitive( {
				placeholder: options.placeholder,
				description: options.description,
				responsive: options.responsive,
				stateful: options.stateful,
				tokenAware: options.tokenAware,
				stateTabs: options.stateTabs,
			} );
		case 'token':
			return createColorPrimitive( {
				placeholder: options.placeholder,
				description: options.description,
				responsive: options.responsive,
				stateful: options.stateful,
				tokenAware: true,
				stateTabs: options.stateTabs,
			} );
		default:
			return undefined;
	}
}
