import type { BuilderNavigatorMode, BuilderShellUiState } from '@builder/core';

const SHELL_LAYOUT_STORAGE_KEY = 'builder-shell-layout-v3';

export interface BuilderShellLayoutPreferences {
	leftPanelSize: number;
	navigatorDockedSize: number;
	panelCollapsed: boolean;
	navigatorOpen: boolean;
	navigatorMode: BuilderNavigatorMode;
}

export interface BuilderShellLayoutState {
	compactViewport: boolean;
	leftPanel: {
		size: number;
		minSize: number;
		defaultSize: number;
		collapsed: boolean;
		visible: boolean;
	};
	navigator: {
		open: boolean;
		mode: BuilderNavigatorMode;
		dockedSize: number;
		minDockedSize: number;
		defaultDockedSize: number;
		dockedVisible: boolean;
		floatingVisible: boolean;
	};
}

export const DEFAULT_LEFT_PANEL_SIZE = 18;
export const MIN_LEFT_PANEL_SIZE = 16;
export const DEFAULT_DOCKED_NAVIGATOR_SIZE = 18;
export const MIN_DOCKED_NAVIGATOR_SIZE = 14;

const DEFAULT_PREFERENCES: BuilderShellLayoutPreferences = {
	leftPanelSize: DEFAULT_LEFT_PANEL_SIZE,
	navigatorDockedSize: DEFAULT_DOCKED_NAVIGATOR_SIZE,
	panelCollapsed: false,
	navigatorOpen: true,
	navigatorMode: 'docked',
};

export function readBuilderShellLayoutPreferences(): BuilderShellLayoutPreferences {
	if ( typeof window === 'undefined' ) {
		return { ...DEFAULT_PREFERENCES };
	}

	try {
		const raw = window.localStorage.getItem( SHELL_LAYOUT_STORAGE_KEY );
		if ( !raw ) {
			return { ...DEFAULT_PREFERENCES };
		}

		const parsed = JSON.parse( raw ) as Partial<BuilderShellLayoutPreferences> | null;
		if ( !parsed || typeof parsed !== 'object' ) {
			return { ...DEFAULT_PREFERENCES };
		}

		return {
			leftPanelSize: normalizePaneSize( parsed.leftPanelSize, DEFAULT_LEFT_PANEL_SIZE, MIN_LEFT_PANEL_SIZE ),
			navigatorDockedSize: normalizePaneSize( parsed.navigatorDockedSize, DEFAULT_DOCKED_NAVIGATOR_SIZE, MIN_DOCKED_NAVIGATOR_SIZE ),
			panelCollapsed: typeof parsed.panelCollapsed === 'boolean' ? parsed.panelCollapsed : DEFAULT_PREFERENCES.panelCollapsed,
			navigatorOpen: typeof parsed.navigatorOpen === 'boolean' ? parsed.navigatorOpen : DEFAULT_PREFERENCES.navigatorOpen,
			navigatorMode: 'docked',
		};
	} catch {
		return { ...DEFAULT_PREFERENCES };
	}
}

export function writeBuilderShellLayoutPreferences(
	preferences: BuilderShellLayoutPreferences,
): void {
	if ( typeof window === 'undefined' ) {
		return;
	}

	try {
		window.localStorage.setItem( SHELL_LAYOUT_STORAGE_KEY, JSON.stringify( preferences ) );
	} catch {
		// Ignore persistence failures in embedded/sandboxed environments.
	}
}

export function createBuilderShellLayoutState(
	shell: BuilderShellUiState,
	compactViewport: boolean,
	preferences: BuilderShellLayoutPreferences,
): BuilderShellLayoutState {
	const panelCollapsed = compactViewport || shell.panelCollapsed;
	const navigatorOpen = shell.navigatorOpen;
	const navigatorMode: BuilderNavigatorMode = 'docked';
	return {
		compactViewport,
		leftPanel: {
			size: normalizePaneSize( preferences.leftPanelSize, DEFAULT_LEFT_PANEL_SIZE, MIN_LEFT_PANEL_SIZE ),
			minSize: MIN_LEFT_PANEL_SIZE,
			defaultSize: DEFAULT_LEFT_PANEL_SIZE,
			collapsed: panelCollapsed,
			visible: !panelCollapsed,
		},
		navigator: {
			open: navigatorOpen,
			mode: navigatorMode,
			dockedSize: normalizePaneSize( preferences.navigatorDockedSize, DEFAULT_DOCKED_NAVIGATOR_SIZE, MIN_DOCKED_NAVIGATOR_SIZE ),
			minDockedSize: MIN_DOCKED_NAVIGATOR_SIZE,
			defaultDockedSize: DEFAULT_DOCKED_NAVIGATOR_SIZE,
			dockedVisible: !compactViewport && navigatorOpen,
			floatingVisible: compactViewport && navigatorOpen,
		},
	};
}

export function createPersistedShellLayoutPreferences(
	shell: BuilderShellUiState,
	preferences: BuilderShellLayoutPreferences,
): BuilderShellLayoutPreferences {
	return {
		leftPanelSize: normalizePaneSize( preferences.leftPanelSize, DEFAULT_LEFT_PANEL_SIZE, MIN_LEFT_PANEL_SIZE ),
		navigatorDockedSize: normalizePaneSize( preferences.navigatorDockedSize, DEFAULT_DOCKED_NAVIGATOR_SIZE, MIN_DOCKED_NAVIGATOR_SIZE ),
		panelCollapsed: shell.panelCollapsed,
		navigatorOpen: shell.navigatorOpen,
		navigatorMode: 'docked',
	};
}

function normalizePaneSize(
	value: unknown,
	fallback: number,
	minimum: number,
): number {
	if ( typeof value !== 'number' || Number.isNaN( value ) ) {
		return fallback;
	}

	return Math.max( minimum, Math.min( 40, value ) );
}
