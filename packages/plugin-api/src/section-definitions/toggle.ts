import { styleSection, textField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';

export function createTogglePanelSections() {
	return [
		styleSection( 'toggle', 'Toggle', [
			textField( 'border_width', 'Border Width', 'style.borderWidth' ),
			textField( 'border_color', 'Border Color', 'style.borderColor' ),
			textField( 'space_between', 'Space Between', 'style.spaceBetween' ),
			textField( 'box_shadow', 'Shadow', 'style.boxShadow' ),
		] ),
		styleSection( 'toggle_title', 'Title', [
			textField( 'title_background', 'Background', 'style.titleBackground' ),
			textField( 'title_color', 'Color', 'style.titleColor' ),
			textField( 'tab_active_color', 'Active Color', 'style.titleActiveColor' ),
			textField( 'title_typography', 'Typography', 'style.titleTypography' ),
			textField( 'title_shadow', 'Text Shadow', 'style.titleShadow' ),
			textField( 'title_padding', 'Padding', 'style.titlePadding' ),
		] ),
		styleSection( 'toggle_icon', 'Icon', [
			compactChoiceField( 'icon_align', 'Alignment', 'style.iconAlign', [
				compactChoiceOption( 'Start', 'left', 'align-left' ),
				compactChoiceOption( 'End', 'right', 'align-right' ),
			] ),
			textField( 'icon_color', 'Color', 'style.iconColor' ),
			textField( 'icon_active_color', 'Active Color', 'style.iconActiveColor' ),
			textField( 'icon_space', 'Spacing', 'style.iconSpace' ),
		] ),
		styleSection( 'toggle_content', 'Content', [
			textField( 'content_background_color', 'Background', 'style.contentBackgroundColor' ),
			textField( 'content_color', 'Color', 'style.contentColor' ),
			textField( 'content_typography', 'Typography', 'style.contentTypography' ),
			textField( 'content_shadow', 'Text Shadow', 'style.contentShadow' ),
			textField( 'content_padding', 'Padding', 'style.contentPadding' ),
		] ),
	];
}
