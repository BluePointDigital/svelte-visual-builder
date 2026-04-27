import type { BuilderFieldDefinition, BuilderFieldType } from './index.ts';

export type BuilderControlStateTab = 'normal' | 'hover' | 'active' | 'focus' | 'disabled';
export type BuilderControlPrimitiveKind =
	| 'section'
	| 'select'
	| 'choose'
	| 'tabs'
	| 'slider'
	| 'dimensions'
	| 'switcher'
	| 'color'
	| 'shadow'
	| 'filter'
	| 'media'
	| 'url';
export type BuilderControlSelectKind = 'select' | 'choose' | 'tabs';
export type BuilderControlSliderUnit = {
	label: string;
	value: string;
	shortLabel?: string;
};
export type BuilderControlDimensionSide = 'top' | 'right' | 'bottom' | 'left';

export interface BuilderControlOption {
	label: string;
	value: string;
	icon?: string;
	description?: string;
	badge?: string | number;
	disabled?: boolean;
}

export interface BuilderControlTabsItem {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	badge?: string | number;
	disabled?: boolean;
}

export interface BuilderControlSectionPrimitive {
	kind: 'section';
	collapsible: boolean;
	defaultCollapsed: boolean;
	density: 'compact' | 'default';
	separator?: 'before' | 'after';
	headerTone?: 'default' | 'accent' | 'muted';
	icon?: string;
	badge?: string | number;
	stateTabs?: BuilderControlStateTab[];
}

export interface BuilderControlPrimitiveBase {
	kind: BuilderControlPrimitiveKind;
	fieldType: BuilderFieldType;
	placeholder?: string;
	description?: string;
	responsive?: boolean;
	stateful?: boolean;
	tokenAware?: boolean;
	stateTabs?: BuilderControlStateTab[];
	placeholderMode?: 'ghost' | 'option' | 'value';
}

export interface BuilderSelectControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'select';
	options: BuilderControlOption[];
	allowClear?: boolean;
	searchable?: boolean;
	size?: 'small' | 'medium' | 'large';
}

export interface BuilderChooseControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'choose';
	options: BuilderControlOption[];
	layout?: 'inline' | 'grid' | 'stack';
	iconPosition?: 'start' | 'top' | 'end';
	presentation?: 'icon-label' | 'icon-only' | 'label-only';
	columns?: number;
	multiple?: boolean;
}

export interface BuilderTabsControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'tabs';
	items: BuilderControlTabsItem[];
	orientation?: 'horizontal' | 'vertical';
	fullWidth?: boolean;
	activeTabId?: string;
}

export interface BuilderSliderControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'slider';
	min: number;
	max: number;
	step?: number;
	units?: BuilderControlSliderUnit[];
	defaultUnit?: string;
	showUnit?: boolean;
	showInput?: boolean;
	showRange?: boolean;
	showReset?: boolean;
	allowCustomUnit?: boolean;
	linked?: boolean;
	range?: boolean;
	handles?: 'single' | 'range';
	labels?: Array<{ label: string; value: number }>;
	placeholder?: string;
}

export interface BuilderDimensionsControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'dimensions';
	sides?: BuilderControlDimensionSide[];
	units?: BuilderControlSliderUnit[];
	defaultUnit?: string;
	allowCustomUnit?: boolean;
	linked?: boolean;
	showLinkedToggle?: boolean;
	allowNegative?: boolean;
	placeholders?: Partial<Record<BuilderControlDimensionSide, string>>;
}

export interface BuilderSwitcherControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'switcher';
	onLabel: string;
	offLabel: string;
	onIcon?: string;
	offIcon?: string;
	labelsInline?: boolean;
	defaultValue?: boolean;
}

export interface BuilderColorControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'color';
	allowGlobal?: boolean;
	allowGradient?: boolean;
	allowOpacity?: boolean;
	allowTransparent?: boolean;
	allowClear?: boolean;
	palette?: string[];
	tokenScope?: 'global' | 'design-system' | 'theme' | 'instance';
}

export interface BuilderShadowControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'shadow';
	allowInset?: boolean;
	allowSpread?: boolean;
	allowColor?: boolean;
	allowGlobal?: boolean;
	preset?: 'box' | 'text';
	controls?: Array<'x' | 'y' | 'blur' | 'spread' | 'color' | 'inset'>;
}

export interface BuilderFilterControlItem {
	id: 'blur' | 'brightness' | 'contrast' | 'saturate' | 'hue';
	label: string;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	defaultValue?: number;
	preview?: 'blur' | 'contrast' | 'gradient' | 'solid';
}

export interface BuilderFilterControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'filter';
	filters: BuilderFilterControlItem[];
	compositeMode?: 'stack' | 'single';
	showPreview?: boolean;
}

export interface BuilderMediaControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'media';
	assetType: 'image' | 'video' | 'file';
	aspectRatio?: string;
	showUpload?: boolean;
	showReplace?: boolean;
	showRemove?: boolean;
	showLibrary?: boolean;
	allowDynamic?: boolean;
	emptyLabel?: string;
	emptyDescription?: string;
}

export interface BuilderUrlControlPrimitive extends BuilderControlPrimitiveBase {
	kind: 'url';
	placeholder?: string;
	allowDynamic?: boolean;
	showNewTab?: boolean;
	showNoFollow?: boolean;
	showDownload?: boolean;
	showCustomAttributes?: boolean;
	showLinkIcon?: boolean;
}

export type BuilderControlPrimitive =
	| BuilderControlSectionPrimitive
	| BuilderSelectControlPrimitive
	| BuilderChooseControlPrimitive
	| BuilderTabsControlPrimitive
	| BuilderSliderControlPrimitive
	| BuilderDimensionsControlPrimitive
	| BuilderSwitcherControlPrimitive
	| BuilderColorControlPrimitive
	| BuilderShadowControlPrimitive
	| BuilderFilterControlPrimitive
	| BuilderMediaControlPrimitive
	| BuilderUrlControlPrimitive;

export type BuilderControlFieldPrimitive =
	| BuilderSelectControlPrimitive
	| BuilderChooseControlPrimitive
	| BuilderTabsControlPrimitive
	| BuilderSliderControlPrimitive
	| BuilderDimensionsControlPrimitive
	| BuilderSwitcherControlPrimitive
	| BuilderColorControlPrimitive
	| BuilderShadowControlPrimitive
	| BuilderFilterControlPrimitive
	| BuilderMediaControlPrimitive
	| BuilderUrlControlPrimitive;

export interface BuilderControlFieldDefinition extends BuilderFieldDefinition {
	primitive: BuilderControlFieldPrimitive;
	responsive?: boolean;
	stateful?: boolean;
	tokenAware?: boolean;
	stateTabs?: BuilderControlStateTab[];
}

export interface BuilderSectionPrimitiveOptions {
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	density?: 'compact' | 'default';
	separator?: 'before' | 'after';
	headerTone?: 'default' | 'accent' | 'muted';
	icon?: string;
	badge?: string | number;
	stateTabs?: BuilderControlStateTab[];
}

export function createSectionPrimitive( options: BuilderSectionPrimitiveOptions = {} ): BuilderControlSectionPrimitive {
	return {
		kind: 'section',
		collapsible: options.collapsible ?? true,
		defaultCollapsed: options.defaultCollapsed ?? false,
		density: options.density ?? 'default',
		separator: options.separator,
		headerTone: options.headerTone ?? 'default',
		icon: options.icon,
		badge: options.badge,
		stateTabs: options.stateTabs,
	};
}

function createPrimitiveField(
	id: string,
	label: string,
	fieldType: BuilderFieldType,
	path: string,
	primitive: BuilderControlFieldPrimitive,
	options: Partial<Omit<BuilderControlFieldDefinition, 'id' | 'label' | 'type' | 'path' | 'primitive'>> = {},
): BuilderControlFieldDefinition {
	return {
		id,
		label,
		type: fieldType,
		path,
		primitive,
		...options,
	};
}

export function createSelectPrimitive(
	options: BuilderControlOption[],
	config: Omit<BuilderSelectControlPrimitive, 'kind' | 'fieldType' | 'options'> & { fieldType?: BuilderFieldType } = {},
): BuilderSelectControlPrimitive {
	return {
		kind: 'select',
		fieldType: config.fieldType ?? 'select',
		options,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
		allowClear: config.allowClear,
		searchable: config.searchable,
		size: config.size,
	};
}

export function createChoosePrimitive(
	options: BuilderControlOption[],
	config: Omit<BuilderChooseControlPrimitive, 'kind' | 'fieldType' | 'options'> & { fieldType?: BuilderFieldType } = {},
): BuilderChooseControlPrimitive {
	return {
		kind: 'choose',
		fieldType: config.fieldType ?? 'select',
		options,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
		layout: config.layout ?? 'inline',
		iconPosition: config.iconPosition ?? 'top',
		presentation: config.presentation ?? 'icon-label',
		columns: config.columns,
		multiple: config.multiple,
	};
}

export function createTabsPrimitive(
	items: BuilderControlTabsItem[],
	config: Omit<BuilderTabsControlPrimitive, 'kind' | 'fieldType' | 'items'> & { fieldType?: BuilderFieldType } = {},
): BuilderTabsControlPrimitive {
	return {
		kind: 'tabs',
		fieldType: config.fieldType ?? 'select',
		items,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
		orientation: config.orientation ?? 'horizontal',
		fullWidth: config.fullWidth ?? true,
		activeTabId: config.activeTabId,
	};
}

export function createSliderPrimitive(
	config: Omit<BuilderSliderControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderSliderControlPrimitive {
	return {
		kind: 'slider',
		fieldType: config.fieldType ?? 'text',
		min: config.min,
		max: config.max,
		step: config.step ?? 1,
		units: config.units,
		defaultUnit: config.defaultUnit,
		showUnit: config.showUnit ?? true,
		showInput: config.showInput ?? true,
		showRange: config.showRange ?? true,
		showReset: config.showReset ?? true,
		allowCustomUnit: config.allowCustomUnit,
		linked: config.linked,
		range: config.range,
		handles: config.handles ?? 'single',
		labels: config.labels,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
	};
}

export function createDimensionsPrimitive(
	config: Omit<BuilderDimensionsControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderDimensionsControlPrimitive {
	return {
		kind: 'dimensions',
		fieldType: config.fieldType ?? 'json',
		sides: config.sides ?? [ 'top', 'right', 'bottom', 'left' ],
		units: config.units,
		defaultUnit: config.defaultUnit,
		allowCustomUnit: config.allowCustomUnit,
		linked: config.linked ?? false,
		showLinkedToggle: config.showLinkedToggle ?? true,
		allowNegative: config.allowNegative,
		placeholders: config.placeholders,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
	};
}

export function createSwitcherPrimitive(
	config: Omit<BuilderSwitcherControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderSwitcherControlPrimitive {
	return {
		kind: 'switcher',
		fieldType: config.fieldType ?? 'toggle',
		onLabel: config.onLabel,
		offLabel: config.offLabel,
		onIcon: config.onIcon,
		offIcon: config.offIcon,
		labelsInline: config.labelsInline ?? false,
		defaultValue: config.defaultValue ?? false,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
	};
}

export function createColorPrimitive(
	config: Omit<BuilderColorControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderColorControlPrimitive {
	return {
		kind: 'color',
		fieldType: config.fieldType ?? ( config.tokenAware ? 'token' : 'text' ),
		allowGlobal: config.allowGlobal ?? true,
		allowGradient: config.allowGradient ?? false,
		allowOpacity: config.allowOpacity ?? true,
		allowTransparent: config.allowTransparent ?? true,
		allowClear: config.allowClear ?? true,
		palette: config.palette,
		tokenScope: config.tokenScope ?? 'design-system',
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware ?? true,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode ?? 'ghost',
	};
}

export function createShadowPrimitive(
	config: Omit<BuilderShadowControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderShadowControlPrimitive {
	return {
		kind: 'shadow',
		fieldType: config.fieldType ?? 'json',
		allowInset: config.allowInset ?? true,
		allowSpread: config.allowSpread ?? true,
		allowColor: config.allowColor ?? true,
		allowGlobal: config.allowGlobal ?? true,
		preset: config.preset ?? 'box',
		controls: config.controls ?? [ 'x', 'y', 'blur', 'spread', 'color', 'inset' ],
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware ?? true,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
	};
}

export function createFilterPrimitive(
	config: Omit<BuilderFilterControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderFilterControlPrimitive {
	return {
		kind: 'filter',
		fieldType: config.fieldType ?? 'json',
		filters: config.filters,
		compositeMode: config.compositeMode ?? 'stack',
		showPreview: config.showPreview ?? true,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
	};
}

export function createMediaPrimitive(
	config: Omit<BuilderMediaControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderMediaControlPrimitive {
	return {
		kind: 'media',
		fieldType: config.fieldType ?? 'image',
		assetType: config.assetType,
		aspectRatio: config.aspectRatio,
		showUpload: config.showUpload ?? true,
		showReplace: config.showReplace ?? true,
		showRemove: config.showRemove ?? true,
		showLibrary: config.showLibrary ?? true,
		allowDynamic: config.allowDynamic ?? true,
		emptyLabel: config.emptyLabel,
		emptyDescription: config.emptyDescription,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
	};
}

export function createUrlPrimitive(
	config: Omit<BuilderUrlControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderUrlControlPrimitive {
	return {
		kind: 'url',
		fieldType: config.fieldType ?? 'url',
		placeholder: config.placeholder,
		allowDynamic: config.allowDynamic ?? true,
		showNewTab: config.showNewTab ?? true,
		showNoFollow: config.showNoFollow ?? true,
		showDownload: config.showDownload ?? false,
		showCustomAttributes: config.showCustomAttributes ?? true,
		showLinkIcon: config.showLinkIcon ?? true,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode ?? 'ghost',
	};
}

export function createControlField(
	id: string,
	label: string,
	path: string,
	primitive: BuilderControlFieldPrimitive,
	options: Partial<Omit<BuilderControlFieldDefinition, 'id' | 'label' | 'type' | 'path' | 'primitive'>> = {},
): BuilderControlFieldDefinition {
	return createPrimitiveField( id, label, primitive.fieldType, path, primitive, options );
}

export function createSelectField(
	id: string,
	label: string,
	path: string,
	options: BuilderControlOption[],
	config: Omit<BuilderSelectControlPrimitive, 'kind' | 'fieldType' | 'options'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createSelectPrimitive( options, config ), {
		...fieldOptions,
	} );
}

export function createChooseField(
	id: string,
	label: string,
	path: string,
	options: BuilderControlOption[],
	config: Omit<BuilderChooseControlPrimitive, 'kind' | 'fieldType' | 'options'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createChoosePrimitive( options, config ), {
		...fieldOptions,
	} );
}

export function createTabsField(
	id: string,
	label: string,
	path: string,
	items: BuilderControlTabsItem[],
	config: Omit<BuilderTabsControlPrimitive, 'kind' | 'fieldType' | 'items'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createTabsPrimitive( items, config ), {
		...fieldOptions,
	} );
}

export function createSliderField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderSliderControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createSliderPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createDimensionsField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderDimensionsControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createDimensionsPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createSwitcherField(
	id: string,
	label: string,
	path: string,
	config: Partial<Omit<BuilderSwitcherControlPrimitive, 'kind' | 'fieldType'>> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const primitive = createSwitcherPrimitive( {
		onLabel: config.onLabel ?? 'On',
		offLabel: config.offLabel ?? 'Off',
		onIcon: config.onIcon,
		offIcon: config.offIcon,
		labelsInline: config.labelsInline,
		defaultValue: config.defaultValue,
		placeholder: config.placeholder,
		description: config.description,
		responsive: config.responsive,
		stateful: config.stateful,
		tokenAware: config.tokenAware,
		stateTabs: config.stateTabs,
		placeholderMode: config.placeholderMode,
		fieldType: config.fieldType,
	} );
	const { fieldType, onLabel, offLabel, onIcon, offIcon, labelsInline, defaultValue, ...fieldOptions } = config;

	return createControlField( id, label, path, primitive, {
		...fieldOptions,
	} );
}

export function createColorField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderColorControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createColorPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createShadowField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderShadowControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createShadowPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createFilterField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderFilterControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createFilterPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createMediaField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderMediaControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType },
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createMediaPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createUrlField(
	id: string,
	label: string,
	path: string,
	config: Omit<BuilderUrlControlPrimitive, 'kind' | 'fieldType'> & { fieldType?: BuilderFieldType } = {},
): BuilderControlFieldDefinition {
	const { fieldType, ...fieldOptions } = config;
	return createControlField( id, label, path, createUrlPrimitive( config ), {
		...fieldOptions,
	} );
}

export function createFieldWithPrimitive(
	id: string,
	label: string,
	type: BuilderFieldType,
	path: string,
	primitive: BuilderControlFieldPrimitive,
	options: Partial<Omit<BuilderControlFieldDefinition, 'id' | 'label' | 'type' | 'path' | 'primitive'>> = {},
): BuilderControlFieldDefinition {
	return createPrimitiveField( id, label, type, path, primitive, options );
}
