import { createChooseField } from '../control-family-helpers.ts';
import type {
	BuilderChooseControlPrimitive,
	BuilderControlFieldDefinition,
	BuilderControlOption,
} from '../control-family-helpers.ts';

export type CompactChoiceConfig = Omit<BuilderChooseControlPrimitive, 'kind' | 'fieldType' | 'options'> & {
	fieldType?: BuilderChooseControlPrimitive['fieldType'];
	condition?: BuilderControlFieldDefinition['condition'];
};

export function compactChoiceOption( label: string, value: string, icon?: string ): BuilderControlOption {
	return { label, value, icon };
}

export function compactChoiceField(
	id: string,
	label: string,
	path: string,
	options: BuilderControlOption[],
	config: CompactChoiceConfig = {},
): BuilderControlFieldDefinition {
	const {
		layout = 'inline',
		iconPosition = 'start',
		presentation = 'icon-label',
		columns = Math.min( Math.max( options.length, 2 ), 4 ),
		...rest
	} = config;

	return createChooseField( id, label, path, options, {
		layout,
		iconPosition,
		presentation,
		columns,
		...rest,
	} ) as BuilderControlFieldDefinition;
}
