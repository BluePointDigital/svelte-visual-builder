import { styleStateTargets } from '@builder/schema';

import type {
	BuilderFieldDefinition,
	BuilderPanelSectionDefinition,
	BuilderStyleContract,
	BuilderStylePropertyDefinition,
} from './index.ts';

export interface TextMediaParityMetadata {
	styleContract: BuilderStyleContract;
	styleSections?: BuilderPanelSectionDefinition[];
	advancedSections: BuilderPanelSectionDefinition[];
}

function createStyleContract( properties: BuilderStylePropertyDefinition[] ): BuilderStyleContract {
	return {
		editableTargets: [ ...styleStateTargets ],
		supportsBreakpoints: true,
		supportsStates: true,
		supportsTokens: true,
		supportsLogicalProperties: true,
		properties,
	};
}

function createSection(
	id: string,
	label: string,
	fields: BuilderFieldDefinition[],
	tab: BuilderPanelSectionDefinition['tab'] = 'advanced',
): BuilderPanelSectionDefinition {
	return {
		id,
		label,
		fields,
		tab,
	};
}

function createStyleSection(
	id: string,
	label: string,
	fields: BuilderFieldDefinition[],
): BuilderPanelSectionDefinition {
	return createSection( id, label, fields, 'style' );
}

function styleProperty(
	key: string,
	label: string,
	controlType: BuilderStylePropertyDefinition['controlType'],
	options: Partial<Omit<BuilderStylePropertyDefinition, 'key' | 'label' | 'controlType'>> = {},
): BuilderStylePropertyDefinition {
	return { key, label, controlType, ...options };
}

function textField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'text', ...options };
}

function numberField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'number', ...options };
}

function selectField( id: string, label: string, path: string, values: string[], options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type' | 'options'>> = {} ): BuilderFieldDefinition {
	return {
		id,
		label,
		path,
		type: 'select',
		options: values.map( ( value ) => ( {
			label: sentenceCase( value ),
			value,
		} ) ),
		...options,
	};
}

function toggleField( id: string, label: string, path: string, options: Partial<Omit<BuilderFieldDefinition, 'id' | 'label' | 'path' | 'type'>> = {} ): BuilderFieldDefinition {
	return { id, label, path, type: 'toggle', ...options };
}

function sentenceCase( value: string ): string {
	return value
		.split( /[-_ ]/g )
		.filter( Boolean )
		.map( ( word ) => word.slice( 0, 1 ).toUpperCase() + word.slice( 1 ) )
		.join( ' ' );
}

function createCommonAdvancedSections(): BuilderPanelSectionDefinition[] {
	return [
		createSection( 'layout', 'Layout', [
			textField( 'margin', 'Margin', 'styles.base.margin' ),
			textField( 'padding', 'Padding', 'styles.base.padding' ),
			textField( 'width', 'Width', 'styles.base.width' ),
			textField( 'maxWidth', 'Max Width', 'styles.base.maxWidth' ),
		] ),
		createSection( 'motion-effects', 'Motion & Animation', [
			selectField( 'entranceAnimation', 'Entrance Animation', 'meta.motionEffects.entranceAnimation', [
				'none',
				'fade-in',
				'fade-in-up',
				'fade-in-down',
				'fade-in-left',
				'fade-in-right',
				'zoom-in',
				'zoom-in-up',
				'slide-in-up',
				'slide-in-down',
				'bounce-in',
			] ),
			selectField( 'animationDuration', 'Animation Duration', 'meta.motionEffects.animationDuration', [ 'slow', 'normal', 'fast' ] ),
			numberField( 'animationDelay', 'Animation Delay', 'meta.motionEffects.animationDelay' ),
		] ),
		createSection( 'transform', 'Transform', [
			numberField( 'rotate', 'Rotate', 'styles.base.rotate' ),
			numberField( 'scale', 'Scale', 'styles.base.scale' ),
			textField( 'translateX', 'Translate X', 'styles.base.translateX' ),
			textField( 'translateY', 'Translate Y', 'styles.base.translateY' ),
			textField( 'transformOrigin', 'Transform Origin', 'styles.base.transformOrigin' ),
		] ),
		createSection( 'background', 'Background', [
			textField( 'background', 'Background', 'styles.base.background' ),
		] ),
		createSection( 'border', 'Border', [
			textField( 'border', 'Border', 'styles.base.border' ),
			textField( 'borderRadius', 'Border Radius', 'styles.base.borderRadius' ),
			textField( 'boxShadow', 'Box Shadow', 'styles.base.boxShadow' ),
		] ),
		createSection( 'mask', 'Mask & Overlay', [
			toggleField( 'enabled', 'Enabled', 'meta.mask.enabled' ),
			selectField( 'shape', 'Shape', 'meta.mask.shape', [ 'circle', 'square', 'blob', 'hexagon', 'diamond' ] ),
			selectField( 'size', 'Size', 'meta.mask.size', [ 'cover', 'contain', 'custom' ] ),
			selectField( 'position', 'Position', 'meta.mask.position', [
				'center center',
				'center left',
				'center right',
				'top center',
				'top left',
				'top right',
				'bottom center',
				'bottom left',
				'bottom right',
			] ),
			selectField( 'repeat', 'Repeat', 'meta.mask.repeat', [ 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' ] ),
		] ),
		createSection( 'responsive', 'Responsive Visibility', [
			toggleField( 'hideDesktop', 'Hide on Desktop', 'visibility.breakpointHidden.desktop' ),
			toggleField( 'hideLaptop', 'Hide on Laptop', 'visibility.breakpointHidden.laptop' ),
			toggleField( 'hideTablet', 'Hide on Tablet', 'visibility.breakpointHidden.tablet' ),
			toggleField( 'hideMobile', 'Hide on Mobile', 'visibility.breakpointHidden.mobile' ),
		] ),
	];
}

function createHeadingStyleSections(): BuilderPanelSectionDefinition[] {
	return [
		createStyleSection( 'alignment', 'Alignment', [
			selectField( 'align', 'Alignment', 'styles.base.align', [ 'left', 'center', 'right', 'justify' ] ),
		] ),
		createStyleSection( 'typography', 'Typography', [
			textField( 'fontFamily', 'Font Family', 'styles.base.typography.fontFamily' ),
			textField( 'fontSize', 'Font Size', 'styles.base.typography.fontSize' ),
			numberField( 'fontWeight', 'Font Weight', 'styles.base.typography.fontWeight' ),
			textField( 'lineHeight', 'Line Height', 'styles.base.typography.lineHeight' ),
			textField( 'letterSpacing', 'Letter Spacing', 'styles.base.typography.letterSpacing' ),
			selectField( 'textTransform', 'Transform', 'styles.base.typography.textTransform', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ),
		] ),
		createStyleSection( 'text-stroke', 'Text Stroke', [
			textField( 'textStrokeWidth', 'Stroke Width', 'styles.base.textStrokeWidth' ),
			textField( 'textStrokeColor', 'Stroke Color', 'styles.base.textStrokeColor' ),
		] ),
		createStyleSection( 'text-shadow', 'Text Shadow', [
			textField( 'textShadow', 'Text Shadow', 'styles.base.textShadow' ),
		] ),
		createStyleSection( 'blend-mode', 'Blend Mode', [
			selectField( 'blendMode', 'Blend Mode', 'styles.base.blendMode', [ 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'saturation', 'color', 'difference', 'exclusion', 'hue', 'luminosity' ] ),
		] ),
		createStyleSection( 'text', 'Color & Links', [
			textField( 'textColor', 'Text Color', 'styles.base.textColor' ),
			textField( 'linkColor', 'Link Color', 'styles.base.linkColor' ),
			numberField( 'transitionDuration', 'Transition Duration', 'styles.base.transitionDuration' ),
		] ),
	];
}

function createParagraphStyleSections(): BuilderPanelSectionDefinition[] {
	return [
		createStyleSection( 'alignment', 'Alignment', [
			selectField( 'align', 'Alignment', 'styles.base.align', [ 'left', 'center', 'right', 'justify' ] ),
		] ),
		createStyleSection( 'typography', 'Typography', [
			textField( 'fontFamily', 'Font Family', 'styles.base.typography.fontFamily' ),
			textField( 'fontSize', 'Font Size', 'styles.base.typography.fontSize' ),
			numberField( 'fontWeight', 'Font Weight', 'styles.base.typography.fontWeight' ),
			textField( 'lineHeight', 'Line Height', 'styles.base.typography.lineHeight' ),
			textField( 'letterSpacing', 'Letter Spacing', 'styles.base.typography.letterSpacing' ),
			textField( 'wordSpacing', 'Word Spacing', 'styles.base.typography.wordSpacing' ),
			selectField( 'textTransform', 'Transform', 'styles.base.typography.textTransform', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ),
		] ),
		createStyleSection( 'text-layout', 'Paragraph Spacing', [
			textField( 'paragraphSpacing', 'Paragraph Spacing', 'styles.base.paragraphSpacing' ),
		] ),
		createStyleSection( 'text-shadow', 'Text Shadow', [
			textField( 'textShadow', 'Text Shadow', 'styles.base.textShadow' ),
		] ),
		createStyleSection( 'text', 'Text', [
			textField( 'textColor', 'Text Color', 'styles.base.textColor' ),
			textField( 'linkColor', 'Link Color', 'styles.base.linkColor' ),
			numberField( 'transitionDuration', 'Transition Duration', 'styles.base.transitionDuration' ),
		] ),
	];
}

function createTextEditorStyleSections(): BuilderPanelSectionDefinition[] {
	return [
		createStyleSection( 'alignment', 'Alignment', [
			selectField( 'align', 'Alignment', 'styles.base.align', [ 'left', 'center', 'right', 'justify' ] ),
		] ),
		createStyleSection( 'typography', 'Typography', [
			textField( 'fontFamily', 'Font Family', 'styles.base.typography.fontFamily' ),
			textField( 'fontSize', 'Font Size', 'styles.base.typography.fontSize' ),
			numberField( 'fontWeight', 'Font Weight', 'styles.base.typography.fontWeight' ),
			textField( 'lineHeight', 'Line Height', 'styles.base.typography.lineHeight' ),
			textField( 'letterSpacing', 'Letter Spacing', 'styles.base.typography.letterSpacing' ),
			textField( 'wordSpacing', 'Word Spacing', 'styles.base.typography.wordSpacing' ),
			selectField( 'textTransform', 'Transform', 'styles.base.typography.textTransform', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ),
		] ),
		createStyleSection( 'text-layout', 'Paragraph Spacing', [
			textField( 'paragraphSpacing', 'Paragraph Spacing', 'styles.base.paragraphSpacing' ),
		] ),
		createStyleSection( 'drop-cap', 'Drop Cap', [
			selectField( 'dropCapView', 'Drop Cap View', 'styles.base.dropCapView', [ 'default', 'stacked', 'framed' ] ),
			textField( 'dropCapPrimaryColor', 'Primary Color', 'styles.base.dropCapPrimaryColor' ),
			textField( 'dropCapSecondaryColor', 'Secondary Color', 'styles.base.dropCapSecondaryColor' ),
			textField( 'dropCapShadow', 'Shadow', 'styles.base.dropCapShadow' ),
			numberField( 'dropCapSize', 'Size', 'styles.base.dropCapSize' ),
			numberField( 'dropCapSpace', 'Space', 'styles.base.dropCapSpace' ),
			textField( 'dropCapBorderRadius', 'Border Radius', 'styles.base.dropCapBorderRadius' ),
			textField( 'dropCapBorderWidth', 'Border Width', 'styles.base.dropCapBorderWidth' ),
			textField( 'dropCapTypography', 'Typography', 'styles.base.dropCapTypography' ),
		] ),
		createStyleSection( 'text-shadow', 'Text Shadow', [
			textField( 'textShadow', 'Text Shadow', 'styles.base.textShadow' ),
		] ),
		createStyleSection( 'text', 'Text', [
			textField( 'textColor', 'Text Color', 'styles.base.textColor' ),
			textField( 'linkColor', 'Link Color', 'styles.base.linkColor' ),
			numberField( 'transitionDuration', 'Transition Duration', 'styles.base.transitionDuration' ),
		] ),
	];
}

function createButtonStyleSections(): BuilderPanelSectionDefinition[] {
	return [
		createStyleSection( 'alignment', 'Alignment', [
			selectField( 'justifyContent', 'Justify', 'styles.base.justifyContent', [ 'flex-start', 'center', 'flex-end', 'space-between' ] ),
			selectField( 'alignItems', 'Alignment', 'styles.base.alignItems', [ 'flex-start', 'center', 'flex-end', 'stretch' ] ),
		] ),
		createStyleSection( 'typography', 'Typography', [
			textField( 'fontFamily', 'Font Family', 'styles.base.typography.fontFamily' ),
			textField( 'fontSize', 'Font Size', 'styles.base.typography.fontSize' ),
			numberField( 'fontWeight', 'Font Weight', 'styles.base.typography.fontWeight' ),
			textField( 'lineHeight', 'Line Height', 'styles.base.typography.lineHeight' ),
			textField( 'letterSpacing', 'Letter Spacing', 'styles.base.typography.letterSpacing' ),
			selectField( 'textTransform', 'Transform', 'styles.base.typography.textTransform', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ),
		] ),
		createStyleSection( 'text-shadow', 'Text Shadow', [
			textField( 'textShadow', 'Text Shadow', 'styles.base.textShadow' ),
		] ),
		createStyleSection( 'button', 'Surface', [
			textField( 'textColor', 'Text Color', 'styles.base.textColor' ),
			textField( 'backgroundColor', 'Background Color', 'styles.base.backgroundColor' ),
			textField( 'borderColor', 'Border Color', 'styles.base.borderColor' ),
			textField( 'boxShadow', 'Box Shadow', 'styles.base.boxShadow' ),
		] ),
		createStyleSection( 'border', 'Border', [
			selectField( 'borderStyle', 'Style', 'styles.base.borderStyle', [ 'none', 'solid', 'double', 'dotted', 'dashed' ] ),
			textField( 'borderWidth', 'Width', 'styles.base.borderWidth' ),
			textField( 'borderColor', 'Color', 'styles.base.borderColor' ),
		] ),
		createStyleSection( 'border-radius', 'Border Radius', [
			textField( 'borderRadius', 'Border Radius', 'styles.base.borderRadius' ),
		] ),
		createStyleSection( 'spacing', 'Padding & Spacing', [
			textField( 'padding', 'Padding', 'styles.base.padding' ),
			textField( 'iconSpacing', 'Icon Spacing', 'styles.base.iconSpacing' ),
		] ),
		createStyleSection( 'hover-animation', 'Interaction', [
			numberField( 'transitionDuration', 'Transition Duration', 'styles.base.transitionDuration' ),
			selectField( 'hoverAnimation', 'Hover Animation', 'styles.base.hoverAnimation', [ 'none', 'grow', 'shrink', 'pulse', 'float' ] ),
		] ),
	];
}

function createImageStyleSections(): BuilderPanelSectionDefinition[] {
	return [
		createStyleSection( 'alignment', 'Alignment', [
			selectField( 'align', 'Alignment', 'styles.base.align', [ 'start', 'center', 'end' ] ),
		] ),
		createStyleSection( 'image', 'Image', [
			textField( 'width', 'Width', 'styles.base.width' ),
			textField( 'maxWidth', 'Max Width', 'styles.base.maxWidth' ),
			textField( 'height', 'Height', 'styles.base.height' ),
			selectField( 'objectFit', 'Object Fit', 'styles.base.objectFit', [ 'default', 'fill', 'cover', 'contain', 'scale-down' ] ),
			textField( 'objectPosition', 'Object Position', 'styles.base.objectPosition' ),
		] ),
		createStyleSection( 'effects', 'Effects & Filters', [
			numberField( 'opacity', 'Opacity', 'styles.base.opacity' ),
			textField( 'cssFilter', 'CSS Filters', 'styles.base.cssFilter' ),
		] ),
		createStyleSection( 'border', 'Border', [
			textField( 'border', 'Border', 'styles.base.border' ),
		] ),
		createStyleSection( 'border-radius', 'Border Radius', [
			textField( 'borderRadius', 'Border Radius', 'styles.base.borderRadius' ),
		] ),
		createStyleSection( 'box-shadow', 'Box Shadow', [
			textField( 'boxShadow', 'Box Shadow', 'styles.base.boxShadow' ),
		] ),
		createStyleSection( 'caption', 'Caption', [
			selectField( 'captionAlign', 'Caption Alignment', 'styles.base.captionAlign', [ 'start', 'center', 'end', 'justify' ] ),
			textField( 'captionColor', 'Caption Color', 'styles.base.captionColor' ),
			textField( 'captionBackgroundColor', 'Caption Background Color', 'styles.base.captionBackgroundColor' ),
			textField( 'captionTypography', 'Caption Typography', 'styles.base.captionTypography' ),
			textField( 'captionTextShadow', 'Caption Text Shadow', 'styles.base.captionTextShadow' ),
			numberField( 'captionSpacing', 'Caption Spacing', 'styles.base.captionSpacing' ),
		] ),
		createStyleSection( 'hover-animation', 'Interaction', [
			numberField( 'transitionDuration', 'Transition Duration', 'styles.base.transitionDuration' ),
			selectField( 'hoverAnimation', 'Hover Animation', 'styles.base.hoverAnimation', [ 'none', 'grow', 'shrink', 'float', 'tilt' ] ),
		] ),
	];
}

function createHeadingStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'align', 'Alignment', 'select', {
			options: [ 'left', 'center', 'right', 'justify' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Alignment',
		} ),
		styleProperty( 'typography', 'Typography', 'text', { groupLabel: 'Typography' } ),
		styleProperty( 'textStroke', 'Text Stroke', 'text', { groupLabel: 'Text Stroke' } ),
		styleProperty( 'textShadow', 'Text Shadow', 'text', { groupLabel: 'Text Shadow' } ),
		styleProperty( 'blendMode', 'Blend Mode', 'select', {
			options: [ 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'saturation', 'color', 'difference', 'exclusion', 'hue', 'luminosity' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Blend Mode',
		} ),
		styleProperty( 'textColor', 'Text Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Color & Links' } ),
		styleProperty( 'linkColor', 'Link Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Color & Links' } ),
		styleProperty( 'transitionDuration', 'Transition Duration', 'number', { stateful: true, groupLabel: 'Color & Links' } ),
	] );
}

function createParagraphStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'align', 'Alignment', 'select', {
			options: [ 'left', 'center', 'right', 'justify' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Alignment',
		} ),
		styleProperty( 'typography', 'Typography', 'text', { groupLabel: 'Typography' } ),
		styleProperty( 'textShadow', 'Text Shadow', 'text', { groupLabel: 'Text Shadow' } ),
		styleProperty( 'paragraphSpacing', 'Paragraph Spacing', 'text', { groupLabel: 'Paragraph Spacing' } ),
		styleProperty( 'textColor', 'Text Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Text' } ),
		styleProperty( 'linkColor', 'Link Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Text' } ),
		styleProperty( 'transitionDuration', 'Transition Duration', 'number', { stateful: true, groupLabel: 'Text' } ),
	] );
}

function createTextEditorStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'align', 'Alignment', 'select', {
			options: [ 'left', 'center', 'right', 'justify' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Alignment',
		} ),
		styleProperty( 'typography', 'Typography', 'text', { groupLabel: 'Typography' } ),
		styleProperty( 'textShadow', 'Text Shadow', 'text', { groupLabel: 'Text Shadow' } ),
		styleProperty( 'paragraphSpacing', 'Paragraph Spacing', 'text', { groupLabel: 'Paragraph Spacing' } ),
		styleProperty( 'textColor', 'Text Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Text' } ),
		styleProperty( 'linkColor', 'Link Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Text' } ),
		styleProperty( 'transitionDuration', 'Transition Duration', 'number', { stateful: true, groupLabel: 'Text' } ),
		styleProperty( 'dropCapView', 'Drop Cap View', 'select', {
			options: [ 'default', 'stacked', 'framed' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Drop Cap',
		} ),
		styleProperty( 'dropCapPrimaryColor', 'Drop Cap Primary Color', 'text', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapSecondaryColor', 'Drop Cap Secondary Color', 'text', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapShadow', 'Drop Cap Shadow', 'text', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapSize', 'Drop Cap Size', 'number', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapSpace', 'Drop Cap Space', 'number', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapBorderRadius', 'Drop Cap Border Radius', 'text', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapBorderWidth', 'Drop Cap Border Width', 'text', { groupLabel: 'Drop Cap' } ),
		styleProperty( 'dropCapTypography', 'Drop Cap Typography', 'text', { groupLabel: 'Drop Cap' } ),
	] );
}

function createButtonStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'typography', 'Typography', 'text', { groupLabel: 'Typography' } ),
		styleProperty( 'textShadow', 'Text Shadow', 'text', { groupLabel: 'Text Shadow' } ),
		styleProperty( 'textColor', 'Text Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Surface' } ),
		styleProperty( 'backgroundColor', 'Background Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Surface' } ),
		styleProperty( 'border', 'Border', 'text', { stateful: true, groupLabel: 'Surface' } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', { tokenAware: true, groupLabel: 'Border Radius' } ),
		styleProperty( 'boxShadow', 'Box Shadow', 'text', { stateful: true, tokenAware: true, groupLabel: 'Surface' } ),
		styleProperty( 'padding', 'Padding', 'text', { responsive: true, groupLabel: 'Padding & Spacing' } ),
		styleProperty( 'iconSpacing', 'Icon Spacing', 'text', { responsive: true, groupLabel: 'Padding & Spacing' } ),
		styleProperty( 'transitionDuration', 'Transition Duration', 'number', { stateful: true, groupLabel: 'Interaction' } ),
		styleProperty( 'hoverAnimation', 'Hover Animation', 'select', {
			options: [
			'none',
			'grow',
			'shrink',
			'pulse',
			'float',
			].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Interaction',
		} ),
	] );
}

function createImageStyleContract(): BuilderStyleContract {
	return createStyleContract( [
		styleProperty( 'align', 'Alignment', 'select', {
			options: [ 'start', 'center', 'end' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Alignment',
		} ),
		styleProperty( 'width', 'Width', 'text', { groupLabel: 'Image' } ),
		styleProperty( 'maxWidth', 'Max Width', 'text', { groupLabel: 'Image' } ),
		styleProperty( 'height', 'Height', 'text', { groupLabel: 'Image' } ),
		styleProperty( 'objectFit', 'Object Fit', 'select', {
			options: [ 'default', 'fill', 'cover', 'contain', 'scale-down' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Image',
		} ),
		styleProperty( 'objectPosition', 'Object Position', 'text', { groupLabel: 'Image' } ),
		styleProperty( 'opacity', 'Opacity', 'number', { stateful: true, groupLabel: 'Effects & Filters' } ),
		styleProperty( 'cssFilter', 'CSS Filter', 'text', { stateful: true, groupLabel: 'Effects & Filters' } ),
		styleProperty( 'border', 'Border', 'text', { groupLabel: 'Border' } ),
		styleProperty( 'borderRadius', 'Border Radius', 'text', { tokenAware: true, groupLabel: 'Border Radius' } ),
		styleProperty( 'boxShadow', 'Box Shadow', 'text', { stateful: true, tokenAware: true, groupLabel: 'Box Shadow' } ),
		styleProperty( 'captionAlign', 'Caption Alignment', 'select', {
			options: [ 'start', 'center', 'end', 'justify' ].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Caption',
		} ),
		styleProperty( 'captionColor', 'Caption Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Caption' } ),
		styleProperty( 'captionBackgroundColor', 'Caption Background Color', 'text', { stateful: true, tokenAware: true, groupLabel: 'Caption' } ),
		styleProperty( 'captionTypography', 'Caption Typography', 'text', { groupLabel: 'Caption' } ),
		styleProperty( 'captionTextShadow', 'Caption Text Shadow', 'text', { groupLabel: 'Caption' } ),
		styleProperty( 'captionSpacing', 'Caption Spacing', 'number', { groupLabel: 'Caption' } ),
		styleProperty( 'transitionDuration', 'Transition Duration', 'number', { stateful: true, groupLabel: 'Interaction' } ),
		styleProperty( 'hoverAnimation', 'Hover Animation', 'select', {
			options: [
			'none',
			'grow',
			'shrink',
			'float',
			'tilt',
			].map( ( value ) => ( { label: sentenceCase( value ), value } ) ),
			groupLabel: 'Interaction',
		} ),
	] );
}

export function createHeadingParityMetadata(): TextMediaParityMetadata {
	return {
		styleContract: createHeadingStyleContract(),
		styleSections: createHeadingStyleSections(),
		advancedSections: createCommonAdvancedSections(),
	};
}

export function createParagraphParityMetadata(): TextMediaParityMetadata {
	return {
		styleContract: createParagraphStyleContract(),
		styleSections: createParagraphStyleSections(),
		advancedSections: createCommonAdvancedSections(),
	};
}

export function createTextEditorParityMetadata(): TextMediaParityMetadata {
	return {
		styleContract: createTextEditorStyleContract(),
		styleSections: createTextEditorStyleSections(),
		advancedSections: createCommonAdvancedSections(),
	};
}

export function createButtonParityMetadata(): TextMediaParityMetadata {
	return {
		styleContract: createButtonStyleContract(),
		styleSections: createButtonStyleSections(),
		advancedSections: createCommonAdvancedSections(),
	};
}

export function createImageParityMetadata(): TextMediaParityMetadata {
	return {
		styleContract: createImageStyleContract(),
		styleSections: createImageStyleSections(),
		advancedSections: createCommonAdvancedSections(),
	};
}
