import { selectField, styleSection, textField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';

export function createIconBoxPanelSections() {
	return [
		styleSection( 'icon_box_box', 'Box', [
			compactChoiceField( 'position', 'Icon Position', 'props.iconPosition', [
				compactChoiceOption( 'Start', 'inline-start', 'align-left' ),
				compactChoiceOption( 'End', 'inline-end', 'align-right' ),
				compactChoiceOption( 'Top', 'block-start', 'arrow-up' ),
				compactChoiceOption( 'Bottom', 'block-end', 'arrow-down' ),
			] ),
			compactChoiceField( 'content_vertical_alignment', 'Vertical Alignment', 'style.contentVerticalAlignment', [
				compactChoiceOption( 'Top', 'top', 'arrow-up' ),
				compactChoiceOption( 'Middle', 'middle', 'block' ),
				compactChoiceOption( 'Bottom', 'bottom', 'arrow-down' ),
			] ),
			compactChoiceField( 'text_align', 'Alignment', 'style.textAlign', [
				compactChoiceOption( 'Start', 'start', 'align-left' ),
				compactChoiceOption( 'Center', 'center', 'align-center' ),
				compactChoiceOption( 'End', 'end', 'align-right' ),
				compactChoiceOption( 'Justified', 'justify', 'align-justify' ),
			] ),
			textField( 'icon_space', 'Icon Spacing', 'style.iconSpace', { placeholder: '15px' } ),
			textField( 'title_bottom_space', 'Content Spacing', 'style.titleBottomSpace', { placeholder: '1rem' } ),
		] ),
		styleSection( 'icon_box_icon', 'Icon', [
			compactChoiceField( 'view', 'View', 'style.iconView', [
				compactChoiceOption( 'Default', 'default', 'block' ),
				compactChoiceOption( 'Stacked', 'stacked', 'flex-column' ),
				compactChoiceOption( 'Framed', 'framed', 'grid' ),
			] ),
			textField( 'primary_color', 'Primary Color', 'style.primaryColor' ),
			textField( 'secondary_color', 'Secondary Color', 'style.secondaryColor' ),
			textField( 'hover_primary_color', 'Hover Primary Color', 'style.hoverPrimaryColor' ),
			textField( 'hover_secondary_color', 'Hover Secondary Color', 'style.hoverSecondaryColor' ),
			textField( 'hover_icon_colors_transition_duration', 'Transition Duration', 'style.hoverTransition' ),
			selectField( 'hover_animation', 'Hover Animation', 'style.hoverAnimation', [
				{ label: 'None', value: 'none' },
				{ label: 'Grow', value: 'grow' },
				{ label: 'Shrink', value: 'shrink' },
				{ label: 'Pulse', value: 'pulse' },
			] ),
			textField( 'icon_size', 'Size', 'style.iconSize' ),
			textField( 'icon_padding', 'Padding', 'style.iconPadding' ),
			textField( 'rotate', 'Rotate', 'style.rotate' ),
			textField( 'border_width', 'Border Width', 'style.borderWidth' ),
			textField( 'border_radius', 'Border Radius', 'style.borderRadius' ),
		] ),
		styleSection( 'icon_box_content', 'Content', [
			textField( 'title_typography', 'Title Typography', 'style.titleTypography' ),
			textField( 'text_stroke', 'Text Stroke', 'style.textStroke' ),
			textField( 'title_shadow', 'Title Shadow', 'style.titleShadow' ),
			textField( 'title_color', 'Title Color', 'style.titleColor' ),
			textField( 'hover_title_color', 'Hover Title Color', 'style.hoverTitleColor' ),
			textField( 'hover_title_color_transition_duration', 'Transition Duration', 'style.hoverTitleTransition' ),
			textField( 'description_typography', 'Description Typography', 'style.descriptionTypography' ),
			textField( 'description_shadow', 'Description Shadow', 'style.descriptionShadow' ),
			textField( 'description_color', 'Description Color', 'style.descriptionColor' ),
		] ),
	];
}
