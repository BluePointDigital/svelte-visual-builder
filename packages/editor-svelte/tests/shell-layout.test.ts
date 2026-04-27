import { describe, expect, it } from 'vitest';

import type { BuilderShellUiState } from '@builder/core';

import {
	DEFAULT_DOCKED_NAVIGATOR_SIZE,
	DEFAULT_LEFT_PANEL_SIZE,
	MIN_DOCKED_NAVIGATOR_SIZE,
	MIN_LEFT_PANEL_SIZE,
	createBuilderShellLayoutState,
	createPersistedShellLayoutPreferences,
} from '../src/lib/shell-layout';

const baseShell: BuilderShellUiState = {
	leftPanelPage: 'elements',
	panelCollapsed: false,
	navigatorMode: 'docked',
	navigatorOpen: true,
	responsiveBarVisible: false,
	appBarMenuOpen: false,
};

describe( 'shell layout', () => {
	it( 'derives pane visibility from shell state and compact viewport overrides', () => {
		const layout = createBuilderShellLayoutState( baseShell, false, {
			leftPanelSize: 22,
			navigatorDockedSize: 19,
			panelCollapsed: false,
			navigatorOpen: true,
			navigatorMode: 'docked',
		} );

		expect( layout.leftPanel.visible ).toBe( true );
		expect( layout.leftPanel.collapsed ).toBe( false );
		expect( layout.leftPanel.size ).toBe( 22 );
		expect( layout.navigator.dockedVisible ).toBe( true );
		expect( layout.navigator.floatingVisible ).toBe( false );
		expect( layout.navigator.dockedSize ).toBe( 19 );

		const compactLayout = createBuilderShellLayoutState( baseShell, true, {
			leftPanelSize: 22,
			navigatorDockedSize: 19,
			panelCollapsed: false,
			navigatorOpen: true,
			navigatorMode: 'docked',
		} );

		expect( compactLayout.leftPanel.visible ).toBe( false );
		expect( compactLayout.leftPanel.collapsed ).toBe( true );
		expect( compactLayout.navigator.dockedVisible ).toBe( false );
		expect( compactLayout.navigator.floatingVisible ).toBe( true );
	} );

	it( 'normalizes persisted pane sizes and shell chrome state', () => {
		const persisted = createPersistedShellLayoutPreferences(
			{
				...baseShell,
			panelCollapsed: true,
			navigatorMode: 'floating',
			navigatorOpen: false,
			},
			{
				leftPanelSize: 4,
				navigatorDockedSize: 100,
				panelCollapsed: false,
				navigatorOpen: true,
				navigatorMode: 'docked',
			},
		);

		expect( persisted ).toEqual( {
			leftPanelSize: MIN_LEFT_PANEL_SIZE,
			navigatorDockedSize: 40,
			panelCollapsed: true,
			navigatorOpen: false,
			navigatorMode: 'docked',
		} );

		const defaults = createBuilderShellLayoutState( baseShell, false, {
			leftPanelSize: Number.NaN,
			navigatorDockedSize: Number.NaN,
			panelCollapsed: false,
			navigatorOpen: true,
			navigatorMode: 'docked',
		} );

		expect( defaults.leftPanel.size ).toBe( DEFAULT_LEFT_PANEL_SIZE );
		expect( defaults.navigator.dockedSize ).toBe( DEFAULT_DOCKED_NAVIGATOR_SIZE );
		expect( defaults.leftPanel.minSize ).toBe( MIN_LEFT_PANEL_SIZE );
		expect( defaults.navigator.minDockedSize ).toBe( MIN_DOCKED_NAVIGATOR_SIZE );
	} );
} );
