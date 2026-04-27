import { describe, expect, it, vi } from 'vitest';

import { resolveStudioRollout } from '../src/lib/studio-rollout';

describe( 'reference studio rollout defaults', () => {
	it.each( [ 'development', 'staging', 'production' ] )( 'defaults %s to the V3 shell after cutover', ( mode ) => {
		expect( resolveStudioRollout( { MODE: mode } ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: true,
			shellVariant: 'v3',
		} );
	} );

	it( 'keeps the production shell on V3 even when legacy overrides are present', () => {
		expect( resolveStudioRollout( {
			MODE: 'production',
			VITE_BUILDER_SHELL_VARIANT: 'legacy',
			VITE_BUILDER_SHELL_V3: 'false',
			VITE_BUILDER_INTERACTION_CORE_V3: 'false',
		} ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: true,
			shellVariant: 'v3',
		} );
	} );

	it( 'coerces deprecated legacy overrides back to the V3 shell during the cleanup release', () => {
		const warnSpy = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );

		expect( resolveStudioRollout( {
			MODE: 'production',
			VITE_BUILDER_SHELL_VARIANT: 'legacy',
		} ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: true,
			shellVariant: 'v3',
		} );

		expect( resolveStudioRollout( {
			MODE: 'production',
			VITE_BUILDER_SHELL_V3: 'false',
		} ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: true,
			shellVariant: 'v3',
		} );

		expect( resolveStudioRollout( {
			MODE: 'production',
			VITE_BUILDER_INTERACTION_CORE_V3: 'false',
		} ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: true,
			shellVariant: 'v3',
		} );

		expect( warnSpy ).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	} );

	it( 'keeps navigator virtualization independently configurable while canvasInteractionV2 stays a compatibility alias', () => {
		expect( resolveStudioRollout( {
			MODE: 'production',
			VITE_BUILDER_NAVIGATOR_VIRTUALIZATION: 'false',
		} ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: false,
			shellVariant: 'v3',
		} );

		expect( resolveStudioRollout( {
			MODE: 'production',
			VITE_BUILDER_SHELL_VARIANT: 'legacy',
			VITE_BUILDER_NAVIGATOR_VIRTUALIZATION: 'true',
		} ) ).toMatchObject( {
			interactionCoreV3Enabled: true,
			canvasInteractionV2Enabled: true,
			navigatorVirtualizationEnabled: true,
			shellVariant: 'v3',
		} );
	} );

	it( 'emits deprecation warnings for ignored legacy overrides in non-production-like environments', () => {
		const warnSpy = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );

		resolveStudioRollout( {
			MODE: 'development',
			VITE_BUILDER_SHELL_VARIANT: 'legacy',
			VITE_BUILDER_SHELL_V3: 'false',
			VITE_BUILDER_INTERACTION_CORE_V3: 'false',
		} );

		expect( warnSpy ).toHaveBeenCalled();
		warnSpy.mockRestore();
	} );
} );
