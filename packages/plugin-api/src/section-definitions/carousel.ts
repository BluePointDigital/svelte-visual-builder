import { advancedSection, selectField, styleSection, textField, numberField, toggleField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';

export function createCarouselPanelSections() {
	return [
		styleSection( 'carousel_navigation', 'Navigation', [
			textField( 'arrows_position', 'Arrow Position', 'style.arrowsPosition' ),
			textField( 'arrows_size', 'Arrow Size', 'style.arrowsSize' ),
			textField( 'arrows_color', 'Arrow Color', 'style.arrowsColor' ),
			textField( 'dots_gap', 'Dots Gap', 'style.dotsGap' ),
			textField( 'dots_size', 'Dots Size', 'style.dotsSize' ),
			textField( 'dots_inactive_color', 'Inactive Dot Color', 'style.dotsInactiveColor' ),
			textField( 'dots_color', 'Active Dot Color', 'style.dotsColor' ),
		] ),
		styleSection( 'carousel_image', 'Image', [
			compactChoiceField( 'gallery_vertical_align', 'Vertical Align', 'style.verticalAlign', [
				compactChoiceOption( 'Start', 'flex-start', 'arrow-up' ),
				compactChoiceOption( 'Center', 'center', 'block' ),
				compactChoiceOption( 'End', 'flex-end', 'arrow-down' ),
			] ),
			selectField( 'image_spacing', 'Spacing', 'style.imageSpacing', [
				{ label: 'Default', value: '' },
				{ label: 'Custom', value: 'custom' },
			] ),
			textField( 'image_spacing_custom', 'Image Spacing', 'style.imageSpacingCustom', { placeholder: '20px' } ),
			textField( 'image_border', 'Border', 'style.imageBorder' ),
			textField( 'image_border_radius', 'Border Radius', 'style.imageBorderRadius' ),
		] ),
		styleSection( 'carousel_caption', 'Caption', [
			compactChoiceField( 'caption_align', 'Alignment', 'style.captionAlign', [
				compactChoiceOption( 'Start', 'start', 'align-left' ),
				compactChoiceOption( 'Center', 'center', 'align-center' ),
				compactChoiceOption( 'End', 'end', 'align-right' ),
				compactChoiceOption( 'Justified', 'justify', 'align-justify' ),
			] ),
			textField( 'caption_text_color', 'Text Color', 'style.captionColor' ),
			textField( 'caption_typography', 'Typography', 'style.captionTypography' ),
			textField( 'caption_shadow', 'Text Shadow', 'style.captionShadow' ),
			textField( 'caption_space', 'Spacing', 'style.captionSpace' ),
		] ),
		advancedSection( 'carousel_additional_options', 'Additional Options', [
			toggleField( 'lazyload', 'Lazyload', 'props.lazyload' ),
			toggleField( 'autoplay', 'Autoplay', 'props.autoplay' ),
			toggleField( 'pause_on_hover', 'Pause on Hover', 'props.pauseOnHover' ),
			toggleField( 'pause_on_interaction', 'Pause on Interaction', 'props.pauseOnInteraction' ),
			numberField( 'autoplay_speed', 'Autoplay Speed', 'props.autoplaySpeed' ),
			toggleField( 'infinite', 'Infinite Loop', 'props.infinite' ),
			compactChoiceField( 'effect', 'Effect', 'props.effect', [
				compactChoiceOption( 'Slide', 'slide', 'flex-row' ),
				compactChoiceOption( 'Fade', 'fade', 'block' ),
			] ),
			numberField( 'speed', 'Animation Speed', 'props.speed' ),
			compactChoiceField( 'direction', 'Direction', 'props.direction', [
				compactChoiceOption( 'Left', 'ltr', 'align-left' ),
				compactChoiceOption( 'Right', 'rtl', 'align-right' ),
			] ),
		] ),
	];
}
