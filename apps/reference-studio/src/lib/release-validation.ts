import type { DemoStudioFixture } from './server/demo-data';

export type ReleaseValidationFixture = Exclude<DemoStudioFixture, 'default'>;

export const releaseValidationFixtureCases = [
	{ fixture: 'dense-200', minimumNodes: 200 },
	{ fixture: 'dense-500', minimumNodes: 500 },
] as const satisfies readonly { fixture: ReleaseValidationFixture; minimumNodes: number }[];

export const releaseValidationPerfCounters = [
	'geometrySnapshotsPosted',
	'geometryFallbackSnapshots',
	'geometryInvalidations',
	'dragTargetUpdates',
	'overlayOnlyUpdates',
	'engineDragPointerDispatches',
	'candidateResolutionCount',
] as const;

export const releaseValidationFlowChecklist = [
	'Load the dense fixture in a fresh tab.',
	'Perform one real drag across a valid drop target.',
	'Open inline edit on a supported text node.',
	'Scroll the preview with the node selected or being edited.',
	'Change the responsive viewport once.',
	'Dock and float the structure pane once.',
	'Inspect the perf counters before finishing the run.',
] as const;

export function buildReleaseValidationPath( fixture: ReleaseValidationFixture ): string {
	return `/?fixture=${ encodeURIComponent( fixture ) }`;
}

export function buildReleaseValidationUrl( baseUrl: string, fixture: ReleaseValidationFixture ): string {
	return new URL( buildReleaseValidationPath( fixture ), ensureTrailingSlash( baseUrl ) ).toString();
}

function ensureTrailingSlash( value: string ): string {
	return value.endsWith( '/' ) ? value : `${ value }/`;
}
