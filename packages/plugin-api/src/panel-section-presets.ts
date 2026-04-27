type PanelSectionTab = 'style' | 'advanced';

type PanelFieldType = 'text' | 'textarea' | 'select' | 'toggle' | 'number' | 'json';

type PanelFieldDefinition = {
	id: string;
	label: string;
	type: PanelFieldType;
	path: string;
	description?: string;
	placeholder?: string;
	options?: Array<{ label: string; value: string }>;
};

type PanelSectionDefinition = {
	id: string;
	label: string;
	fields: PanelFieldDefinition[];
	tab: PanelSectionTab;
};

function field(
	id: string,
	label: string,
	type: PanelFieldType,
	path: string,
	options: Partial<Omit<PanelFieldDefinition, 'id' | 'label' | 'type' | 'path'>> = {},
): PanelFieldDefinition {
	return { id, label, type, path, ...options };
}

function section(
	id: string,
	label: string,
	tab: PanelSectionTab,
	fields: PanelFieldDefinition[],
): PanelSectionDefinition {
	return { id, label, tab, fields };
}

function sharedAdvancedSections(): PanelSectionDefinition[] {
	return [
		section(
			'advanced-attributes',
			'Attributes',
			'advanced',
			[
				field( 'attributes', 'HTML Attributes', 'json', 'meta.attributes', {
					description: 'Arbitrary HTML attributes stored with the node metadata.',
					placeholder: '{\n  "data-id": "hero"\n}',
				} ),
				field( 'customCss', 'Custom CSS', 'textarea', 'meta.customCss', {
					description: 'Element-scoped CSS for advanced styling overrides.',
					placeholder: '.selector {\n  /* custom css */\n}',
				} ),
			],
		),
		section(
			'advanced-visibility',
			'Visibility',
			'advanced',
			[
				field( 'hidden', 'Hidden', 'toggle', 'visibility.hidden' ),
				field( 'display', 'Display', 'select', 'visibility.display', {
					options: [
						{ label: 'Show', value: 'show' },
						{ label: 'Hide when matched', value: 'hide-when-matched' },
					],
				} ),
			],
		),
		section(
			'advanced-accessibility',
			'Accessibility',
			'advanced',
			[
				field( 'role', 'Role', 'text', 'accessibility.role' ),
				field( 'label', 'Label', 'text', 'accessibility.label' ),
				field( 'labelledBy', 'Labelled By', 'text', 'accessibility.labelledBy' ),
				field( 'describedBy', 'Described By', 'text', 'accessibility.describedBy' ),
				field( 'decorative', 'Decorative', 'toggle', 'accessibility.decorative' ),
				field( 'tabIndex', 'Tab Index', 'number', 'accessibility.tabIndex', {
					placeholder: '0',
				} ),
			],
		),
	];
}

export function createFormParityPanelSections(): PanelSectionDefinition[] {
	return [
		section(
			'style-layout',
			'Layout',
			'style',
			[
				field( 'gap', 'Gap', 'text', 'styles.base.gap', {
					description: 'Overall spacing between the form and its fields.',
				} ),
				field( 'fieldGap', 'Field Gap', 'text', 'styles.base.fieldGap' ),
				field( 'labelSpacing', 'Label Spacing', 'text', 'styles.base.labelSpacing' ),
			],
		),
		section(
			'style-fields',
			'Fields',
			'style',
			[
				field( 'inputPadding', 'Input Padding', 'text', 'styles.base.inputPadding' ),
				field( 'inputBackground', 'Input Background', 'text', 'styles.base.inputBackground' ),
				field( 'inputBorder', 'Input Border', 'text', 'styles.base.inputBorder' ),
				field( 'inputBorderRadius', 'Input Radius', 'text', 'styles.base.inputBorderRadius' ),
			],
		),
		section(
			'style-button',
			'Submit Button',
			'style',
			[
				field( 'submitPadding', 'Submit Padding', 'text', 'styles.base.submitPadding' ),
			],
		),
		...sharedAdvancedSections(),
	];
}

export function createFormFieldParityPanelSections(): PanelSectionDefinition[] {
	return [
		section(
			'style-surface',
			'Style',
			'style',
			[
				field( 'padding', 'Padding', 'text', 'styles.base.padding' ),
				field( 'margin', 'Margin', 'text', 'styles.base.margin' ),
				field( 'background', 'Background', 'text', 'styles.base.background' ),
				field( 'borderRadius', 'Border Radius', 'text', 'styles.base.borderRadius' ),
				field( 'opacity', 'Opacity', 'number', 'styles.base.opacity' ),
			],
		),
		...sharedAdvancedSections(),
	];
}

export function createLoopParityPanelSections(): PanelSectionDefinition[] {
	return [
		section(
			'style-layout',
			'Layout',
			'style',
			[
				field( 'gap', 'Gap', 'text', 'styles.base.gap' ),
				field( 'columns', 'Columns', 'number', 'styles.base.columns' ),
			],
		),
		section(
			'style-spacing',
			'Spacing',
			'style',
			[
				field( 'rowGap', 'Row Gap', 'text', 'styles.base.rowGap' ),
				field( 'columnGap', 'Column Gap', 'text', 'styles.base.columnGap' ),
				field( 'itemPadding', 'Item Padding', 'text', 'styles.base.itemPadding' ),
				field( 'emptyStatePadding', 'Empty State Padding', 'text', 'styles.base.emptyStatePadding' ),
			],
		),
		...sharedAdvancedSections(),
	];
}

export function createPopupRootParityPanelSections(): PanelSectionDefinition[] {
	return [
		section(
			'style-popup',
			'Popup Layout',
			'style',
			[
				field( 'width', 'Width', 'text', 'styles.base.width' ),
				field( 'maxWidth', 'Max Width', 'text', 'styles.base.maxWidth' ),
				field( 'padding', 'Padding', 'text', 'styles.base.padding' ),
			],
		),
		section(
			'style-surface',
			'Surface',
			'style',
			[
				field( 'background', 'Background', 'text', 'styles.base.background' ),
				field( 'borderRadius', 'Border Radius', 'text', 'styles.base.borderRadius' ),
				field( 'boxShadow', 'Shadow', 'text', 'styles.base.boxShadow' ),
			],
		),
		section(
			'style-overlay',
			'Overlay',
			'style',
			[
				field( 'overlayColor', 'Overlay Color', 'text', 'styles.base.overlayColor' ),
			],
		),
		...sharedAdvancedSections(),
	];
}

export function createCompatParityPanelSections(): PanelSectionDefinition[] {
	return [
		section(
			'style-surface',
			'Style',
			'style',
			[
				field( 'padding', 'Padding', 'text', 'styles.base.padding' ),
				field( 'margin', 'Margin', 'text', 'styles.base.margin' ),
				field( 'background', 'Background', 'text', 'styles.base.background' ),
				field( 'borderRadius', 'Border Radius', 'text', 'styles.base.borderRadius' ),
				field( 'opacity', 'Opacity', 'number', 'styles.base.opacity' ),
			],
		),
		...sharedAdvancedSections(),
	];
}
