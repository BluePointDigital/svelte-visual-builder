import {
	borderStyleOptions,
	createControlField,
	createControlSection,
	displayOptions,
	positionOptions,
	type BuilderControlFieldDefinition,
	type BuilderControlSectionDefinition,
} from './control-family-helpers.ts';

export interface FormDataPopupParitySectionStack {
	styleSections: BuilderControlSectionDefinition[];
	advancedSections: BuilderControlSectionDefinition[];
}

export interface FormDataPopupParityFamilyDefinition {
	id: string;
	label: string;
	stack: FormDataPopupParitySectionStack;
}

const animationOptions = [
	{ label: 'None', value: 'none' },
	{ label: 'Fade In', value: 'fade-in' },
	{ label: 'Fade In Up', value: 'fade-in-up' },
	{ label: 'Fade In Down', value: 'fade-in-down' },
	{ label: 'Fade In Left', value: 'fade-in-left' },
	{ label: 'Fade In Right', value: 'fade-in-right' },
	{ label: 'Zoom In', value: 'zoom-in' },
	{ label: 'Slide In Up', value: 'slide-in-up' },
	{ label: 'Slide In Down', value: 'slide-in-down' },
	{ label: 'Bounce In', value: 'bounce-in' },
];

const backgroundTypeOptions = [
	{ label: 'Classic', value: 'classic' },
	{ label: 'Gradient', value: 'gradient' },
	{ label: 'Video', value: 'video' },
	{ label: 'Slideshow', value: 'slideshow' },
];

const blendModeOptions = [
	{ label: 'Normal', value: 'normal' },
	{ label: 'Multiply', value: 'multiply' },
	{ label: 'Screen', value: 'screen' },
	{ label: 'Overlay', value: 'overlay' },
	{ label: 'Darken', value: 'darken' },
	{ label: 'Lighten', value: 'lighten' },
];

const responsiveVisibilityFields = [
	createControlField( 'hideDesktop', 'Hide on Desktop', 'toggle', 'visibility.breakpointHidden.desktop' ),
	createControlField( 'hideLaptop', 'Hide on Laptop', 'toggle', 'visibility.breakpointHidden.laptop' ),
	createControlField( 'hideTablet', 'Hide on Tablet', 'toggle', 'visibility.breakpointHidden.tablet' ),
	createControlField( 'hideMobile', 'Hide on Mobile', 'toggle', 'visibility.breakpointHidden.mobile' ),
];

function field(
	id: string,
	label: string,
	type: BuilderControlFieldDefinition['type'],
	path: string,
	overrides: Partial<Omit<BuilderControlFieldDefinition, 'id' | 'label' | 'type' | 'path'>> = {},
): BuilderControlFieldDefinition {
	return createControlField( id, label, type, path, overrides );
}

function section(
	id: string,
	label: string,
	tab: 'style' | 'advanced',
	fields: BuilderControlFieldDefinition[],
	order: number,
	familyId: string,
	groupId: string,
	description?: string,
): BuilderControlSectionDefinition {
	return createControlSection( id, label, tab, fields, {
		familyId,
		groupId,
		order,
		description,
		collapsible: true,
		defaultCollapsed: false,
	} );
}

function sharedStyleBaselineSections( familyId: string ): BuilderControlSectionDefinition[] {
	return [
		section(
			`${ familyId }-layout`,
			'Layout',
			'style',
			[
				field( 'width', 'Width', 'text', 'styles.base.width' ),
				field( 'maxWidth', 'Max Width', 'text', 'styles.base.maxWidth' ),
				field( 'minHeight', 'Min Height', 'text', 'styles.base.minHeight' ),
				field( 'margin', 'Margin', 'text', 'styles.base.margin' ),
				field( 'padding', 'Padding', 'text', 'styles.base.padding' ),
			],
			10,
			familyId,
			'layout',
			'Shared shell sizing and spacing controls.',
		),
		section(
			`${ familyId }-background`,
			'Background',
			'style',
			[
				field( 'backgroundType', 'Type', 'select', 'styles.base.background.type', { options: backgroundTypeOptions } ),
				field( 'backgroundColor', 'Color', 'text', 'styles.base.background.color', { responsive: true, stateful: true, tokenAware: true } ),
				field( 'backgroundImage', 'Image', 'text', 'styles.base.background.image', { responsive: true } ),
				field( 'backgroundPosition', 'Position', 'text', 'styles.base.background.position', { responsive: true } ),
				field( 'backgroundSize', 'Size', 'text', 'styles.base.background.size', { responsive: true } ),
				field( 'backgroundRepeat', 'Repeat', 'select', 'styles.base.background.repeat', {
					options: [
						{ label: 'No Repeat', value: 'no-repeat' },
						{ label: 'Repeat', value: 'repeat' },
						{ label: 'Repeat X', value: 'repeat-x' },
						{ label: 'Repeat Y', value: 'repeat-y' },
					],
				} ),
				field( 'backgroundOverlayColor', 'Overlay', 'text', 'styles.base.background.overlayColor', { responsive: true, stateful: true, tokenAware: true } ),
				field( 'backgroundOverlayBlendMode', 'Blend Mode', 'select', 'styles.base.background.overlayBlendMode', { options: blendModeOptions, responsive: true } ),
			],
			20,
			familyId,
			'background',
			'Background paint and overlay controls.',
		),
		section(
			`${ familyId }-border`,
			'Border',
			'style',
			[
				field( 'borderStyle', 'Style', 'select', 'styles.base.border.style', { options: borderStyleOptions, responsive: true } ),
				field( 'borderWidth', 'Width', 'text', 'styles.base.border.width', { responsive: true } ),
				field( 'borderColor', 'Color', 'text', 'styles.base.border.color', { responsive: true, stateful: true, tokenAware: true } ),
				field( 'borderRadius', 'Radius', 'text', 'styles.base.border.radius', { responsive: true, tokenAware: true } ),
			],
			30,
			familyId,
			'border',
			'Border surface and radius controls.',
		),
		section(
			`${ familyId }-shadow`,
			'Shadow',
			'style',
			[
				field( 'boxShadow', 'Box Shadow', 'text', 'styles.base.boxShadow', { responsive: true, stateful: true, tokenAware: true } ),
				field( 'textShadow', 'Text Shadow', 'text', 'styles.base.textShadow', { responsive: true, stateful: true, tokenAware: true } ),
				field( 'opacity', 'Opacity', 'number', 'styles.base.opacity', { responsive: true, stateful: true } ),
				field( 'blendMode', 'Blend Mode', 'select', 'styles.base.blendMode', { options: blendModeOptions, responsive: true } ),
			],
			40,
			familyId,
			'shadow',
			'Shadow, opacity, and blending controls.',
		),
	];
}

function sharedAdvancedBaselineSections( familyId: string ): BuilderControlSectionDefinition[] {
	return [
		section(
			`${ familyId }-layout`,
			'Layout',
			'advanced',
			[
				field( 'display', 'Display', 'select', 'meta.layout.display', { options: displayOptions, responsive: true } ),
				field( 'position', 'Position', 'select', 'meta.layout.position', { options: positionOptions, responsive: true } ),
				field( 'zIndex', 'Z-Index', 'number', 'meta.layout.zIndex', { responsive: true } ),
				field( 'width', 'Width', 'text', 'meta.layout.width', { responsive: true } ),
				field( 'maxWidth', 'Max Width', 'text', 'meta.layout.maxWidth', { responsive: true } ),
				field( 'minHeight', 'Min Height', 'text', 'meta.layout.minHeight', { responsive: true } ),
			],
			10,
			familyId,
			'layout',
			'Advanced layout and positioning behavior.',
		),
		section(
			`${ familyId }-motion-effects`,
			'Motion Effects',
			'advanced',
			[
				field( 'entranceAnimation', 'Entrance Animation', 'select', 'meta.motionEffects.entranceAnimation', { options: animationOptions } ),
				field( 'animationDuration', 'Animation Duration', 'select', 'meta.motionEffects.animationDuration', {
					options: [
						{ label: 'Slow', value: 'slow' },
						{ label: 'Normal', value: 'normal' },
						{ label: 'Fast', value: 'fast' },
					],
				} ),
				field( 'animationDelay', 'Animation Delay', 'number', 'meta.motionEffects.animationDelay' ),
			],
			20,
			familyId,
			'motion-effects',
			'Entrance and transition timing controls.',
		),
		section(
			`${ familyId }-transform`,
			'Transform',
			'advanced',
			[
				field( 'rotate', 'Rotate', 'number', 'styles.base.rotate' ),
				field( 'scale', 'Scale', 'number', 'styles.base.scale' ),
				field( 'translateX', 'Translate X', 'text', 'styles.base.translateX' ),
				field( 'translateY', 'Translate Y', 'text', 'styles.base.translateY' ),
				field( 'transformOrigin', 'Transform Origin', 'text', 'styles.base.transformOrigin' ),
			],
			30,
			familyId,
			'transform',
			'Transform origin and movement controls.',
		),
		section(
			`${ familyId }-responsive`,
			'Responsive',
			'advanced',
			responsiveVisibilityFields,
			40,
			familyId,
			'responsive',
			'Viewport-specific visibility controls.',
		),
		section(
			`${ familyId }-visibility`,
			'Visibility',
			'advanced',
			[
				field( 'hidden', 'Hidden', 'toggle', 'visibility.hidden' ),
				field( 'display', 'Display', 'select', 'visibility.display', {
					options: [
						{ label: 'Show', value: 'show' },
						{ label: 'Hide When Matched', value: 'hide-when-matched' },
					],
				} ),
			],
			50,
			familyId,
			'visibility',
			'Visibility and conditional display controls.',
		),
		section(
			`${ familyId }-attributes`,
			'Attributes',
			'advanced',
			[
				field( 'attributes', 'HTML Attributes', 'json', 'meta.attributes', {
					description: 'Arbitrary HTML attributes stored with the node metadata.',
					placeholder: '{\n  "data-id": "hero"\n}',
				} ),
				field( 'customCss', 'Custom CSS', 'textarea', 'meta.customCss', {
					description: 'Element-scoped CSS for advanced overrides.',
					placeholder: '.selector {\n  /* custom css */\n}',
				} ),
			],
			60,
			familyId,
			'attributes',
			'Advanced HTML attributes and scoped CSS.',
		),
		section(
			`${ familyId }-accessibility`,
			'Accessibility',
			'advanced',
			[
				field( 'role', 'Role', 'text', 'accessibility.role' ),
				field( 'label', 'Label', 'text', 'accessibility.label' ),
				field( 'labelledBy', 'Labelled By', 'text', 'accessibility.labelledBy' ),
				field( 'describedBy', 'Described By', 'text', 'accessibility.describedBy' ),
				field( 'decorative', 'Decorative', 'toggle', 'accessibility.decorative' ),
				field( 'tabIndex', 'Tab Index', 'number', 'accessibility.tabIndex', { placeholder: '0' } ),
			],
			70,
			familyId,
			'accessibility',
			'Accessibility metadata and keyboard focus controls.',
		),
	];
}

function buildParitySectionStack(
	familyId: string,
	styleSections: BuilderControlSectionDefinition[],
): FormDataPopupParitySectionStack {
	return {
		styleSections,
		advancedSections: sharedAdvancedBaselineSections( familyId ),
	};
}

export function createFormParitySectionStack(): FormDataPopupParitySectionStack {
	return buildParitySectionStack( 'form', [
		section(
			'form-layout',
			'Layout',
			'style',
			[
				field( 'gap', 'Gap', 'text', 'styles.base.gap', { description: 'Overall spacing between the form and its fields.' } ),
				field( 'fieldGap', 'Field Gap', 'text', 'styles.base.fieldGap' ),
				field( 'labelSpacing', 'Label Spacing', 'text', 'styles.base.labelSpacing' ),
				field( 'inlineLabelWidth', 'Inline Label Width', 'text', 'styles.base.inlineLabelWidth' ),
			],
			10,
			'form',
			'layout',
			'Form spacing and field layout.',
		),
		section(
			'form-fields',
			'Fields',
			'style',
			[
				field( 'inputPadding', 'Input Padding', 'text', 'styles.base.inputPadding' ),
				field( 'inputBackground', 'Input Background', 'text', 'styles.base.inputBackground' ),
				field( 'inputBorder', 'Input Border', 'text', 'styles.base.inputBorder' ),
				field( 'inputBorderRadius', 'Input Radius', 'text', 'styles.base.inputBorderRadius' ),
				field( 'inputTextColor', 'Input Text Color', 'text', 'styles.base.inputTextColor', { stateful: true, tokenAware: true } ),
				field( 'inputPlaceholderColor', 'Placeholder Color', 'text', 'styles.base.inputPlaceholderColor', { stateful: true, tokenAware: true } ),
				field( 'inputFocusColor', 'Focus Color', 'text', 'styles.base.inputFocusColor', { stateful: true, tokenAware: true } ),
			],
			20,
			'form',
			'fields',
			'Field surface and validation presentation.',
		),
		section(
			'form-labels',
			'Labels',
			'style',
			[
				field( 'labelTypography', 'Label Typography', 'text', 'styles.base.labelTypography' ),
				field( 'labelColor', 'Label Color', 'text', 'styles.base.labelColor', { stateful: true, tokenAware: true } ),
				field( 'requiredColor', 'Required Mark Color', 'text', 'styles.base.requiredColor', { stateful: true, tokenAware: true } ),
				field( 'requiredSpacing', 'Required Mark Spacing', 'text', 'styles.base.requiredSpacing' ),
			],
			30,
			'form',
			'labels',
			'Form label appearance and required mark spacing.',
		),
		section(
			'form-submit-button',
			'Submit Button',
			'style',
			[
				field( 'submitPadding', 'Submit Padding', 'text', 'styles.base.submitPadding' ),
				field( 'submitWidth', 'Submit Width', 'text', 'styles.base.submitWidth' ),
				field( 'submitAlignment', 'Submit Alignment', 'select', 'styles.base.submitAlignment', {
					options: [
						{ label: 'Start', value: 'start' },
						{ label: 'Center', value: 'center' },
						{ label: 'End', value: 'end' },
						{ label: 'Stretch', value: 'stretch' },
					],
				} ),
				field( 'submitBorderRadius', 'Submit Radius', 'text', 'styles.base.submitBorderRadius' ),
				field( 'submitBackground', 'Submit Background', 'text', 'styles.base.submitBackground', { stateful: true, tokenAware: true } ),
				field( 'submitTextColor', 'Submit Text Color', 'text', 'styles.base.submitTextColor', { stateful: true, tokenAware: true } ),
			],
			40,
			'form',
			'button',
			'Submit button spacing and emphasis.',
		),
		section(
			'form-messages',
			'Messages',
			'style',
			[
				field( 'messageTypography', 'Message Typography', 'text', 'styles.base.messageTypography' ),
				field( 'successTextColor', 'Success Text Color', 'text', 'styles.base.successTextColor', { stateful: true, tokenAware: true } ),
				field( 'successBackground', 'Success Background', 'text', 'styles.base.successBackground', { stateful: true, tokenAware: true } ),
				field( 'errorTextColor', 'Error Text Color', 'text', 'styles.base.errorTextColor', { stateful: true, tokenAware: true } ),
				field( 'errorBackground', 'Error Background', 'text', 'styles.base.errorBackground', { stateful: true, tokenAware: true } ),
			],
			50,
			'form',
			'messages',
			'Submission feedback and validation messaging.',
		),
		...sharedStyleBaselineSections( 'form' ).slice( 1 ),
	] );
}

export function createFormFieldParitySectionStack(): FormDataPopupParitySectionStack {
	return buildParitySectionStack( 'form-field', [
		section(
			'form-field-layout',
			'Layout',
			'style',
			[
				field( 'width', 'Width', 'text', 'styles.base.width' ),
				field( 'maxWidth', 'Max Width', 'text', 'styles.base.maxWidth' ),
				field( 'margin', 'Margin', 'text', 'styles.base.margin' ),
				field( 'padding', 'Padding', 'text', 'styles.base.padding' ),
			],
			10,
			'form-field',
			'layout',
			'Field sizing and spacing.',
		),
		section(
			'form-field-input',
			'Field',
			'style',
			[
				field( 'inputPadding', 'Input Padding', 'text', 'styles.base.inputPadding' ),
				field( 'inputBackground', 'Input Background', 'text', 'styles.base.inputBackground' ),
				field( 'inputBorder', 'Input Border', 'text', 'styles.base.inputBorder' ),
				field( 'inputBorderRadius', 'Input Radius', 'text', 'styles.base.inputBorderRadius' ),
				field( 'inputTextColor', 'Input Text Color', 'text', 'styles.base.inputTextColor', { stateful: true, tokenAware: true } ),
				field( 'placeholderColor', 'Placeholder Color', 'text', 'styles.base.placeholderColor', { stateful: true, tokenAware: true } ),
				field( 'focusColor', 'Focus Color', 'text', 'styles.base.focusColor', { stateful: true, tokenAware: true } ),
			],
			20,
			'form-field',
			'field',
			'Core input surface and focus states.',
		),
		section(
			'form-field-label',
			'Label',
			'style',
			[
				field( 'labelTypography', 'Label Typography', 'text', 'styles.base.labelTypography' ),
				field( 'labelColor', 'Label Color', 'text', 'styles.base.labelColor', { stateful: true, tokenAware: true } ),
				field( 'labelSpacing', 'Label Spacing', 'text', 'styles.base.labelSpacing' ),
				field( 'requiredColor', 'Required Mark Color', 'text', 'styles.base.requiredColor', { stateful: true, tokenAware: true } ),
			],
			30,
			'form-field',
			'label',
			'Label alignment and required indicator.',
		),
		section(
			'form-field-icon',
			'Icon',
			'style',
			[
				field( 'iconSize', 'Icon Size', 'text', 'styles.base.iconSize' ),
				field( 'iconColor', 'Icon Color', 'text', 'styles.base.iconColor', { stateful: true, tokenAware: true } ),
				field( 'iconSpacing', 'Icon Spacing', 'text', 'styles.base.iconSpacing' ),
				field( 'iconPosition', 'Icon Position', 'select', 'styles.base.iconPosition', {
					options: [
						{ label: 'Before', value: 'before' },
						{ label: 'After', value: 'after' },
						{ label: 'Inside', value: 'inside' },
					],
				} ),
			],
			40,
			'form-field',
			'icon',
			'Optional leading or trailing icon treatment.',
		),
		section(
			'form-field-state',
			'State',
			'style',
			[
				field( 'hoverBackground', 'Hover Background', 'text', 'styles.base.hoverBackground', { stateful: true, tokenAware: true } ),
				field( 'hoverBorderColor', 'Hover Border Color', 'text', 'styles.base.hoverBorderColor', { stateful: true, tokenAware: true } ),
				field( 'activeBackground', 'Active Background', 'text', 'styles.base.activeBackground', { stateful: true, tokenAware: true } ),
				field( 'disabledOpacity', 'Disabled Opacity', 'number', 'styles.base.disabledOpacity', { stateful: true } ),
			],
			50,
			'form-field',
			'state',
			'Hover, active, and disabled state styling.',
		),
		...sharedStyleBaselineSections( 'form-field' ).slice( 1 ),
	] );
}

export function createLoopParitySectionStack(): FormDataPopupParitySectionStack {
	return buildParitySectionStack( 'loop', [
		section(
			'loop-layout',
			'Layout',
			'style',
			[
				field( 'columns', 'Columns', 'number', 'styles.base.columns' ),
				field( 'gap', 'Gap', 'text', 'styles.base.gap' ),
				field( 'rowGap', 'Row Gap', 'text', 'styles.base.rowGap' ),
				field( 'columnGap', 'Column Gap', 'text', 'styles.base.columnGap' ),
				field( 'alignItems', 'Align Items', 'select', 'styles.base.alignItems', {
					options: [
						{ label: 'Start', value: 'start' },
						{ label: 'Center', value: 'center' },
						{ label: 'End', value: 'end' },
						{ label: 'Stretch', value: 'stretch' },
					],
				} ),
			],
			10,
			'loop',
			'layout',
			'Loop grid and item spacing.',
		),
		section(
			'loop-items',
			'Items',
			'style',
			[
				field( 'itemPadding', 'Item Padding', 'text', 'styles.base.itemPadding' ),
				field( 'itemMinHeight', 'Item Min Height', 'text', 'styles.base.itemMinHeight' ),
				field( 'itemBackground', 'Item Background', 'text', 'styles.base.itemBackground' ),
				field( 'itemBorderRadius', 'Item Radius', 'text', 'styles.base.itemBorderRadius' ),
				field( 'itemShadow', 'Item Shadow', 'text', 'styles.base.itemShadow', { stateful: true, tokenAware: true } ),
			],
			20,
			'loop',
			'items',
			'Individual repeated item presentation.',
		),
		section(
			'loop-empty-state',
			'Empty State',
			'style',
			[
				field( 'emptyStatePadding', 'Empty State Padding', 'text', 'styles.base.emptyStatePadding' ),
				field( 'emptyStateAlignment', 'Empty State Alignment', 'select', 'styles.base.emptyStateAlignment', {
					options: [
						{ label: 'Start', value: 'start' },
						{ label: 'Center', value: 'center' },
						{ label: 'End', value: 'end' },
						{ label: 'Stretch', value: 'stretch' },
					],
				} ),
				field( 'emptyStateTypography', 'Empty Typography', 'text', 'styles.base.emptyStateTypography' ),
				field( 'emptyStateColor', 'Empty Color', 'text', 'styles.base.emptyStateColor', { stateful: true, tokenAware: true } ),
			],
			30,
			'loop',
			'empty-state',
			'Empty collection presentation.',
		),
		...sharedStyleBaselineSections( 'loop' ).slice( 1 ),
	] );
}

export function createPopupRootParitySectionStack(): FormDataPopupParitySectionStack {
	return buildParitySectionStack( 'popup-root', [
		section(
			'popup-layout',
			'Popup Layout',
			'style',
			[
				field( 'width', 'Width', 'text', 'styles.base.width' ),
				field( 'maxWidth', 'Max Width', 'text', 'styles.base.maxWidth' ),
				field( 'height', 'Height', 'text', 'styles.base.height' ),
				field( 'minHeight', 'Min Height', 'text', 'styles.base.minHeight' ),
				field( 'padding', 'Padding', 'text', 'styles.base.padding' ),
			],
			10,
			'popup-root',
			'layout',
			'Popup frame sizing and inner spacing.',
		),
		section(
			'popup-surface',
			'Surface',
			'style',
			[
				field( 'background', 'Background', 'text', 'styles.base.background' ),
				field( 'borderRadius', 'Border Radius', 'text', 'styles.base.borderRadius' ),
				field( 'boxShadow', 'Shadow', 'text', 'styles.base.boxShadow', { stateful: true, tokenAware: true } ),
				field( 'overflow', 'Overflow', 'select', 'styles.base.overflow', {
					options: [
						{ label: 'Visible', value: 'visible' },
						{ label: 'Hidden', value: 'hidden' },
						{ label: 'Auto', value: 'auto' },
					],
				} ),
			],
			20,
			'popup-root',
			'surface',
			'Popup surface, masking, and overflow behavior.',
		),
		section(
			'popup-overlay',
			'Overlay',
			'style',
			[
				field( 'overlayColor', 'Overlay Color', 'text', 'styles.base.overlayColor', { stateful: true, tokenAware: true } ),
				field( 'overlayOpacity', 'Overlay Opacity', 'number', 'styles.base.overlayOpacity', { stateful: true } ),
				field( 'backdropFilter', 'Backdrop Filter', 'text', 'styles.base.backdropFilter', { stateful: true } ),
				field( 'closeOnOverlayClick', 'Close On Overlay Click', 'toggle', 'meta.overlay.closeOnOverlayClick' ),
			],
			30,
			'popup-root',
			'overlay',
			'Overlay tint and dismissal behavior.',
		),
		section(
			'popup-close-button',
			'Close Button',
			'style',
			[
				field( 'closePosition', 'Position', 'select', 'styles.base.closeButton.position', {
					options: [
						{ label: 'Top Right', value: 'top-right' },
						{ label: 'Top Left', value: 'top-left' },
						{ label: 'Floating', value: 'floating' },
					],
				} ),
				field( 'closeSize', 'Size', 'text', 'styles.base.closeButton.size' ),
				field( 'closeColor', 'Color', 'text', 'styles.base.closeButton.color', { stateful: true, tokenAware: true } ),
				field( 'closeBackground', 'Background', 'text', 'styles.base.closeButton.background', { stateful: true, tokenAware: true } ),
				field( 'closeBorderRadius', 'Border Radius', 'text', 'styles.base.closeButton.borderRadius', { tokenAware: true } ),
			],
			40,
			'popup-root',
			'close-button',
			'Close affordance layout and emphasis.',
		),
		...sharedStyleBaselineSections( 'popup-root' ).slice( 1 ),
	] );
}

export function createCompatWidgetParitySectionStack(): FormDataPopupParitySectionStack {
	return {
		styleSections: sharedStyleBaselineSections( 'compat-widget' ),
		advancedSections: sharedAdvancedBaselineSections( 'compat-widget' ),
	};
}

export function createFormParityFamilyDefinition(): FormDataPopupParityFamilyDefinition {
	return {
		id: 'form',
		label: 'Form',
		stack: createFormParitySectionStack(),
	};
}

export function createFormFieldParityFamilyDefinition(): FormDataPopupParityFamilyDefinition {
	return {
		id: 'form-field',
		label: 'Form Field',
		stack: createFormFieldParitySectionStack(),
	};
}

export function createLoopParityFamilyDefinition(): FormDataPopupParityFamilyDefinition {
	return {
		id: 'loop',
		label: 'Loop',
		stack: createLoopParitySectionStack(),
	};
}

export function createPopupRootParityFamilyDefinition(): FormDataPopupParityFamilyDefinition {
	return {
		id: 'popup-root',
		label: 'Popup Root',
		stack: createPopupRootParitySectionStack(),
	};
}

export function createCompatWidgetParityFamilyDefinition(): FormDataPopupParityFamilyDefinition {
	return {
		id: 'compat-widget',
		label: 'Compat Widget',
		stack: createCompatWidgetParitySectionStack(),
	};
}

export const FORM_DATA_POPUP_PARITY_BUILDERS = {
	form: createFormParitySectionStack,
	formField: createFormFieldParitySectionStack,
	loop: createLoopParitySectionStack,
	popupRoot: createPopupRootParitySectionStack,
	compatWidget: createCompatWidgetParitySectionStack,
} as const;
