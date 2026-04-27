import { styleSection, textField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';

export function createTabsPanelSections() {
	return [
		styleSection( 'tabs', 'Tabs', [
			textField( 'navigation_width', 'Navigation Width', 'style.navigationWidth', { placeholder: '25%' } ),
			textField( 'border_width', 'Border Width', 'style.borderWidth', { placeholder: '1px' } ),
			textField( 'border_color', 'Border Color', 'style.borderColor' ),
			textField( 'background_color', 'Background Color', 'style.backgroundColor' ),
			textField( 'tab_color', 'Color', 'style.tabColor' ),
			textField( 'tab_active_color', 'Active Color', 'style.tabActiveColor' ),
			textField( 'tab_typography', 'Typography', 'style.tabTypography' ),
			textField( 'text_stroke', 'Text Stroke', 'style.textStroke' ),
			textField( 'title_shadow', 'Text Shadow', 'style.titleShadow' ),
			compactChoiceField( 'title_align', 'Alignment', 'style.titleAlign', [
				compactChoiceOption( 'Start', 'start', 'align-left' ),
				compactChoiceOption( 'Center', 'center', 'align-center' ),
				compactChoiceOption( 'End', 'end', 'align-right' ),
			] ),
			textField( 'content_color', 'Content Color', 'style.contentColor' ),
			textField( 'content_typography', 'Content Typography', 'style.contentTypography' ),
			textField( 'content_shadow', 'Content Shadow', 'style.contentShadow' ),
		] ),
	];
}
