export type StudioRolloutEnv = {
	MODE?: string;
	VITE_BUILDER_INTERACTION_CORE_V3?: string;
	VITE_BUILDER_NAVIGATOR_VIRTUALIZATION?: string;
	VITE_BUILDER_SHELL_VARIANT?: string;
	VITE_BUILDER_SHELL_V3?: string;
};

export type StudioShellVariant = 'legacy' | 'v3';

export type StudioResolvedRollout = {
	canvasInteractionV2Enabled: boolean;
	interactionCoreV3Enabled: boolean;
	navigatorVirtualizationEnabled: boolean;
	shellVariant: StudioShellVariant;
};

export function resolveStudioRollout( env: StudioRolloutEnv ): StudioResolvedRollout {
	warnOnDeprecatedLegacyOverrides( env );

	const interactionCoreV3Enabled = true;
	const shellVariant: StudioShellVariant = 'v3';
	const canvasInteractionV2Enabled = true;
	const navigatorVirtualizationEnabled = readBooleanEnvFlag( env.VITE_BUILDER_NAVIGATOR_VIRTUALIZATION ) ?? true;

	return {
		canvasInteractionV2Enabled,
		interactionCoreV3Enabled,
		navigatorVirtualizationEnabled,
		shellVariant,
	};
}

export function readBooleanEnvFlag( value: unknown ): boolean | undefined {
	if ( value === 'true' ) {
		return true;
	}

	if ( value === 'false' ) {
		return false;
	}

	return undefined;
}

export function readShellVariantEnvFlag( value: unknown ): StudioShellVariant | undefined {
	if ( value === 'legacy' || value === 'v3' ) {
		return value;
	}

	return undefined;
}

const emittedWarnings = new Set<string>();

function warnOnDeprecatedLegacyOverrides( env: StudioRolloutEnv ) {
	if ( !shouldWarnDeprecatedOverrides( env ) ) {
		return;
	}

	const interactionOverride = readBooleanEnvFlag( env.VITE_BUILDER_INTERACTION_CORE_V3 );
	const shellVariantOverride = readShellVariantEnvFlag( env.VITE_BUILDER_SHELL_VARIANT );
	const shellBooleanOverride = readBooleanEnvFlag( env.VITE_BUILDER_SHELL_V3 );

	if ( interactionOverride === false ) {
		warnOnce( 'interaction-core-v3', 'VITE_BUILDER_INTERACTION_CORE_V3=false is deprecated and is now ignored; the V3 shell always stays enabled.' );
	}

	if ( shellVariantOverride === 'legacy' ) {
		warnOnce( 'shell-variant-legacy', 'VITE_BUILDER_SHELL_VARIANT=legacy is deprecated and is now coerced to the V3 shell.' );
	}

	if ( shellBooleanOverride === false ) {
		warnOnce( 'shell-v3-false', 'VITE_BUILDER_SHELL_V3=false is deprecated and is now coerced to the V3 shell.' );
	}
}

function shouldWarnDeprecatedOverrides( env: StudioRolloutEnv ) {
	if ( env.MODE ) {
		return env.MODE !== 'production';
	}

	if ( typeof process !== 'undefined' && process.env?.NODE_ENV && process.env.NODE_ENV !== 'production' ) {
		return true;
	}

	if ( typeof window !== 'undefined' ) {
		return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
	}

	return false;
}

function warnOnce( key: string, message: string ) {
	if ( emittedWarnings.has( key ) || typeof console === 'undefined' ) {
		return;
	}

	emittedWarnings.add( key );
	console.warn( `[builder-rollout] ${ message }` );
}
