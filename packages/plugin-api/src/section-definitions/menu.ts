import { advancedSection, selectField, styleSection, textField } from '../panel-section-utils.ts';
import { compactChoiceField, compactChoiceOption } from './compact-controls.ts';

export function createMenuPanelSections() {
	return [
		styleSection( 'menu_layout', 'Menu', [
			compactChoiceField( 'orientation', 'Orientation', 'props.orientation', [
				compactChoiceOption( 'Horizontal', 'horizontal', 'flex-row' ),
				compactChoiceOption( 'Vertical', 'vertical', 'flex-column' ),
			] ),
			compactChoiceField( 'alignment', 'Alignment', 'props.alignment', [
				compactChoiceOption( 'Left', 'left', 'align-left' ),
				compactChoiceOption( 'Center', 'center', 'align-center' ),
				compactChoiceOption( 'Right', 'right', 'align-right' ),
				compactChoiceOption( 'Space Between', 'space-between', 'align-justify' ),
			] ),
			textField( 'gap', 'Gap', 'style.gap', { placeholder: '1rem' } ),
			textField( 'padding', 'Padding', 'style.padding', { placeholder: '0.5rem 1rem' } ),
		] ),
		styleSection( 'menu_items', 'Items', [
			textField( 'item_gap', 'Item Gap', 'style.itemGap', { placeholder: '0.5rem' } ),
			textField( 'item_padding', 'Item Padding', 'style.itemPadding', { placeholder: '0.5rem 0.75rem' } ),
			textField( 'item_background', 'Item Background', 'style.itemBackground' ),
			textField( 'item_color', 'Item Color', 'style.itemColor' ),
		] ),
		advancedSection( 'menu_responsive', 'Responsive', [
			selectField( 'collapse_breakpoint', 'Collapse Breakpoint', 'props.collapseBreakpoint', [
				{ label: 'Desktop', value: 'desktop' },
				{ label: 'Laptop', value: 'laptop' },
				{ label: 'Tablet', value: 'tablet' },
				{ label: 'Mobile', value: 'mobile' },
			] ),
		] ),
	];
}
