import { advancedSection, numberField, selectField, styleSection, textField, toggleField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';
import { createSelectPrimitive } from '../control-family-helpers.ts';

const flexDirectionOptions = [
	compactChoiceOption( 'Row', 'row', 'flex-row' ),
	compactChoiceOption( 'Row Reverse', 'row-reverse', 'flex-row-reverse' ),
	compactChoiceOption( 'Column', 'column', 'flex-column' ),
	compactChoiceOption( 'Column Reverse', 'column-reverse', 'flex-column-reverse' ),
];

const gridAutoFlowOptions = [
	compactChoiceOption( 'Row', 'row', 'flex-row' ),
	compactChoiceOption( 'Column', 'column', 'flex-column' ),
];

const wrapOptions = [
	compactChoiceOption( 'No Wrap', 'nowrap', 'block' ),
	compactChoiceOption( 'Wrap', 'wrap', 'flex' ),
	compactChoiceOption( 'Wrap Reverse', 'wrap-reverse', 'arrow-down' ),
];

const justificationOptions = [
	compactChoiceOption( 'Start', 'start', 'justify-start' ),
	compactChoiceOption( 'Center', 'center', 'justify-center' ),
	compactChoiceOption( 'End', 'end', 'justify-end' ),
	compactChoiceOption( 'Space Between', 'space-between', 'space-between' ),
	compactChoiceOption( 'Space Around', 'space-around', 'space-around' ),
	compactChoiceOption( 'Space Evenly', 'space-evenly', 'space-evenly' ),
];

const alignmentOptions = [
	compactChoiceOption( 'Start', 'start', 'items-start' ),
	compactChoiceOption( 'Center', 'center', 'items-center' ),
	compactChoiceOption( 'End', 'end', 'items-end' ),
	compactChoiceOption( 'Stretch', 'stretch', 'items-stretch' ),
];

export function createContainerPanelSections() {
	return [
		styleSection( 'container', 'Container', [
			selectField( 'container_type', 'Container Layout', 'layout.display', [
				{ label: 'Flexbox', value: 'flex' },
				{ label: 'Grid', value: 'grid' },
			], {
				primitive: createSelectPrimitive( [
					{ label: 'Flexbox', value: 'flex' },
					{ label: 'Grid', value: 'grid' },
				] ),
			} ),
			textField( 'width', 'Width', 'layout.width', { placeholder: '100%' } ),
			textField( 'max_width', 'Max Width', 'layout.maxWidth', { placeholder: '1200px' } ),
			textField( 'min_height', 'Min Height', 'layout.minHeight', { placeholder: '40px' } ),
		] ),
		styleSection( 'container_items', 'Items', [
			compactChoiceField( 'direction', 'Direction', 'layout.direction', flexDirectionOptions, {
				presentation: 'icon-only',
				columns: 4,
				condition: { path: 'layout.display', equals: 'flex' },
			} ),
			compactChoiceField( 'wrap', 'Wrap', 'layout.wrap', wrapOptions, {
				presentation: 'icon-only',
				columns: 4,
				condition: { path: 'layout.display', equals: 'flex' },
			} ),
			textField( 'flex_gap', 'Gap', 'layout.gap', { placeholder: '1rem' } ),
			compactChoiceField( 'align_items', 'Align Items', 'layout.alignItems', alignmentOptions, { presentation: 'icon-only', columns: 4 } ),
			compactChoiceField( 'justify_content', 'Justify Content', 'layout.justifyContent', justificationOptions, { presentation: 'icon-only', columns: 4 } ),
			compactChoiceField( 'align_content', 'Align Content', 'layout.alignContent', [
				compactChoiceOption( 'Start', 'start', 'items-start' ),
				compactChoiceOption( 'Center', 'center', 'items-center' ),
				compactChoiceOption( 'End', 'end', 'items-end' ),
				compactChoiceOption( 'Stretch', 'stretch', 'items-stretch' ),
				compactChoiceOption( 'Space Between', 'space-between', 'space-between' ),
				compactChoiceOption( 'Space Around', 'space-around', 'space-around' ),
				compactChoiceOption( 'Space Evenly', 'space-evenly', 'space-evenly' ),
			], { presentation: 'icon-only', columns: 4 } ),
			textField( 'columns', 'Columns', 'layout.columns', {
				placeholder: 'repeat(2, minmax(0, 1fr))',
				condition: { path: 'layout.display', equals: 'grid' },
			} ),
			textField( 'rows', 'Rows', 'layout.rows', {
				placeholder: 'auto',
				condition: { path: 'layout.display', equals: 'grid' },
			} ),
			compactChoiceField( 'auto_flow', 'Auto Flow', 'layout.autoFlow', gridAutoFlowOptions, {
				presentation: 'icon-only',
				columns: 4,
				condition: { path: 'layout.display', equals: 'grid' },
			} ),
			compactChoiceField( 'justify_items', 'Justify Items', 'layout.justifyItems', alignmentOptions, {
				presentation: 'icon-only',
				columns: 4,
				condition: { path: 'layout.display', equals: 'grid' },
			} ),
		] ),
		advancedSection( 'container_additional_options', 'Additional Options', [
			selectField( 'overflow', 'Overflow', 'layout.overflow', [
				{ label: 'Default', value: '' },
				{ label: 'Hidden', value: 'hidden' },
				{ label: 'Auto', value: 'auto' },
			] ),
			selectField( 'html_tag', 'HTML Tag', 'props.htmlTag', [
				{ label: 'Default', value: '' },
				{ label: 'Div', value: 'div' },
				{ label: 'Header', value: 'header' },
				{ label: 'Footer', value: 'footer' },
				{ label: 'Main', value: 'main' },
				{ label: 'Article', value: 'article' },
				{ label: 'Section', value: 'section' },
				{ label: 'Aside', value: 'aside' },
				{ label: 'Nav', value: 'nav' },
				{ label: 'Link', value: 'a' },
			] ),
			textField( 'link', 'Link', 'props.link', { placeholder: 'https://example.com' } ),
		] ),
		styleSection( 'container_background', 'Background', [
			textField( 'background', 'Background', 'styles.base.background', { placeholder: 'Color, gradient, or image' } ),
			textField( 'background_hover', 'Hover Background', 'styles.hover.background' ),
			textField( 'background_transition', 'Transition', 'styles.transitions.background', { placeholder: '0.3s' } ),
		] ),
		styleSection( 'container_background_overlay', 'Background Overlay', [
			textField( 'overlay_background', 'Overlay Background', 'styles.overlay.background' ),
			numberField( 'overlay_opacity', 'Overlay Opacity', 'styles.overlay.opacity' ),
			textField( 'overlay_blend_mode', 'Blend Mode', 'styles.overlay.blendMode' ),
		] ),
		styleSection( 'container_border', 'Border', [
			textField( 'border', 'Border', 'styles.base.border' ),
			textField( 'border_radius', 'Border Radius', 'styles.base.borderRadius' ),
			textField( 'box_shadow', 'Box Shadow', 'styles.base.boxShadow' ),
			textField( 'border_hover', 'Hover Border', 'styles.hover.border' ),
			textField( 'border_radius_hover', 'Hover Border Radius', 'styles.hover.borderRadius' ),
			textField( 'box_shadow_hover', 'Hover Shadow', 'styles.hover.boxShadow' ),
		] ),
		styleSection( 'container_shape_divider', 'Shape Divider', [
			selectField( 'shape_divider_top', 'Top Divider', 'styles.shapeDivider.top.type', [
				{ label: 'None', value: 'none' },
				{ label: 'Curve', value: 'curve' },
				{ label: 'Tilt', value: 'tilt' },
				{ label: 'Wave', value: 'wave' },
			] ),
			textField( 'shape_divider_top_color', 'Top Color', 'styles.shapeDivider.top.color' ),
			selectField( 'shape_divider_bottom', 'Bottom Divider', 'styles.shapeDivider.bottom.type', [
				{ label: 'None', value: 'none' },
				{ label: 'Curve', value: 'curve' },
				{ label: 'Tilt', value: 'tilt' },
				{ label: 'Wave', value: 'wave' },
			] ),
			textField( 'shape_divider_bottom_color', 'Bottom Color', 'styles.shapeDivider.bottom.color' ),
		] ),
		advancedSection( 'container_layout', 'Layout', [
			textField( 'margin', 'Margin', 'styles.base.margin' ),
			textField( 'padding', 'Padding', 'styles.base.padding' ),
			numberField( 'grid_column', 'Column Span', 'layout.gridColumn' ),
			numberField( 'grid_row', 'Row Span', 'layout.gridRow' ),
			selectField( 'position', 'Position', 'layout.position', [
				{ label: 'Default', value: '' },
				{ label: 'Absolute', value: 'absolute' },
				{ label: 'Fixed', value: 'fixed' },
			] ),
			textField( 'css_id', 'CSS ID', 'attributes.id' ),
			textField( 'css_classes', 'CSS Classes', 'attributes.className' ),
		] ),
		advancedSection( 'container_motion_effects', 'Motion Effects', [
			selectField( 'animation', 'Entrance Animation', 'interactions.animation', [
				{ label: 'None', value: '' },
				{ label: 'Fade In', value: 'fade-in' },
				{ label: 'Slide In Up', value: 'slide-in-up' },
				{ label: 'Slide In Down', value: 'slide-in-down' },
				{ label: 'Zoom In', value: 'zoom-in' },
			] ),
			selectField( 'animation_duration', 'Animation Duration', 'interactions.animationDuration', [
				{ label: 'Slow', value: 'slow' },
				{ label: 'Normal', value: 'normal' },
				{ label: 'Fast', value: 'fast' },
			] ),
			numberField( 'animation_delay', 'Animation Delay', 'interactions.animationDelay' ),
		] ),
		advancedSection( 'container_responsive', 'Responsive', [
			toggleField( 'hide_desktop', 'Hide on Desktop', 'visibility.breakpointHidden.desktop' ),
			toggleField( 'hide_tablet', 'Hide on Tablet', 'visibility.breakpointHidden.tablet' ),
			toggleField( 'hide_mobile', 'Hide on Mobile', 'visibility.breakpointHidden.mobile' ),
		] ),
	];
}

export function createGridContainerPanelSections() {
	return [
		styleSection( 'grid_container', 'Grid', [
			numberField( 'columns', 'Columns', 'layout.columns' ),
			numberField( 'rows', 'Rows', 'layout.rows' ),
			textField( 'gaps', 'Gaps', 'layout.gap', { placeholder: '1rem 1rem' } ),
			compactChoiceField( 'auto_flow', 'Auto Flow', 'layout.autoFlow', gridAutoFlowOptions, { presentation: 'icon-only', columns: 4 } ),
			compactChoiceField( 'justify_items', 'Justify Items', 'layout.justifyItems', [
				compactChoiceOption( 'Start', 'start', 'items-start' ),
				compactChoiceOption( 'Center', 'center', 'items-center' ),
				compactChoiceOption( 'End', 'end', 'items-end' ),
				compactChoiceOption( 'Stretch', 'stretch', 'items-stretch' ),
			], { presentation: 'icon-only', columns: 4 } ),
			compactChoiceField( 'align_items', 'Align Items', 'layout.alignItems', [
				compactChoiceOption( 'Start', 'start', 'items-start' ),
				compactChoiceOption( 'Center', 'center', 'items-center' ),
				compactChoiceOption( 'End', 'end', 'items-end' ),
				compactChoiceOption( 'Stretch', 'stretch', 'items-stretch' ),
			], { presentation: 'icon-only', columns: 4 } ),
			compactChoiceField( 'justify_content', 'Justify Content', 'layout.justifyContent', justificationOptions, { presentation: 'icon-only', columns: 4 } ),
			compactChoiceField( 'align_content', 'Align Content', 'layout.alignContent', [
				compactChoiceOption( 'Start', 'start', 'items-start' ),
				compactChoiceOption( 'Center', 'center', 'items-center' ),
				compactChoiceOption( 'End', 'end', 'items-end' ),
				compactChoiceOption( 'Stretch', 'stretch', 'items-stretch' ),
				compactChoiceOption( 'Space Between', 'space-between', 'space-between' ),
				compactChoiceOption( 'Space Around', 'space-around', 'space-around' ),
				compactChoiceOption( 'Space Evenly', 'space-evenly', 'space-evenly' ),
			], { presentation: 'icon-only', columns: 4 } ),
		] ),
		advancedSection( 'grid_container_item', 'Grid Item', [
			selectField( 'grid_column', 'Column Span', 'layout.gridColumn', [
				{ label: 'Default', value: '' },
				{ label: '1', value: '1' },
				{ label: '2', value: '2' },
				{ label: '3', value: '3' },
				{ label: '4', value: '4' },
				{ label: '5', value: '5' },
				{ label: '6', value: '6' },
				{ label: 'Custom', value: 'custom' },
			] ),
			textField( 'grid_column_custom', 'Custom Column', 'layout.gridColumnCustom' ),
			selectField( 'grid_row', 'Row Span', 'layout.gridRow', [
				{ label: 'Default', value: '' },
				{ label: '1', value: '1' },
				{ label: '2', value: '2' },
				{ label: '3', value: '3' },
				{ label: '4', value: '4' },
				{ label: '5', value: '5' },
				{ label: '6', value: '6' },
				{ label: 'Custom', value: 'custom' },
			] ),
			textField( 'grid_row_custom', 'Custom Row', 'layout.gridRowCustom' ),
			selectField( 'position', 'Position', 'styles.position', [
				{ label: 'Default', value: '' },
				{ label: 'Absolute', value: 'absolute' },
				{ label: 'Fixed', value: 'fixed' },
			] ),
			textField( 'z_index', 'Z-Index', 'styles.zIndex' ),
			textField( 'css_id', 'CSS ID', 'attributes.id' ),
			textField( 'css_classes', 'CSS Classes', 'attributes.className' ),
		] ),
	];
}
