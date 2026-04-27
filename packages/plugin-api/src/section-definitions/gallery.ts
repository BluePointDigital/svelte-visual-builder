import { styleSection, selectField, textField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';

export function createGalleryPanelSections() {
	return [
		styleSection( 'gallery_images', 'Images', [
			selectField( 'image_spacing', 'Gap', 'style.imageSpacing', [
				{ label: 'Default', value: '' },
				{ label: 'Custom', value: 'custom' },
			] ),
			textField( 'image_spacing_custom', 'Custom Gap', 'style.imageSpacingCustom', { placeholder: '15px' } ),
			textField( 'image_border', 'Border', 'style.imageBorder' ),
			textField( 'image_border_radius', 'Border Radius', 'style.imageBorderRadius' ),
		] ),
		styleSection( 'gallery_caption', 'Caption', [
			compactChoiceField( 'align', 'Alignment', 'style.captionAlign', [
				compactChoiceOption( 'Start', 'start', 'align-left' ),
				compactChoiceOption( 'Center', 'center', 'align-center' ),
				compactChoiceOption( 'End', 'end', 'align-right' ),
				compactChoiceOption( 'Justified', 'justify', 'align-justify' ),
			] ),
			textField( 'text_color', 'Text Color', 'style.captionColor' ),
			textField( 'typography', 'Typography', 'style.captionTypography' ),
			textField( 'caption_shadow', 'Text Shadow', 'style.captionShadow' ),
			textField( 'caption_space', 'Spacing', 'style.captionSpace', { placeholder: '0.5rem' } ),
		] ),
	];
}
