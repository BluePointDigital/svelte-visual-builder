export type PanelTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export type PanelTabItem = {
	id: string;
	label: string;
	icon?: string;
	badge?: string | number;
	disabled?: boolean;
	title?: string;
	dirty?: boolean;
};

export type PanelRailTool = {
	id: string;
	label: string;
	icon?: string;
	title?: string;
	active?: boolean;
	disabled?: boolean;
	badge?: string | number;
	tone?: PanelTone;
};

export type PanelTileItem = {
	id: string;
	label: string;
	title?: string;
	description?: string;
	icon?: string;
	badge?: string | number;
	tone?: PanelTone;
	disabled?: boolean;
	draggable?: boolean;
	dirty?: boolean;
	shortcut?: string;
};

export type PanelTileGroup = {
	id: string;
	label: string;
	description?: string;
	badge?: string | number;
	actionLabel?: string;
	items: PanelTileItem[];
};
