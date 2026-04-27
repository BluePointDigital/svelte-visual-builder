import { describe, expect, it } from 'vitest';

import {
	buildReleaseValidationPath,
	buildReleaseValidationUrl,
	releaseValidationFixtureCases,
	releaseValidationFlowChecklist,
	releaseValidationPerfCounters,
} from '../src/lib/release-validation';

describe( 'reference studio release validation metadata', () => {
	it( 'keeps the dense profiling fixtures aligned with the documented 200 and 500 node routes', () => {
		expect( releaseValidationFixtureCases ).toEqual( [
			{ fixture: 'dense-200', minimumNodes: 200 },
			{ fixture: 'dense-500', minimumNodes: 500 },
		] );
		expect( buildReleaseValidationPath( 'dense-200' ) ).toBe( '/?fixture=dense-200' );
		expect( buildReleaseValidationUrl( 'http://127.0.0.1:4173', 'dense-500' ) ).toBe( 'http://127.0.0.1:4173/?fixture=dense-500' );
	} );

	it( 'tracks the bake-facing perf counters required by the runbook and harness', () => {
		expect( releaseValidationPerfCounters ).toEqual( [
			'geometrySnapshotsPosted',
			'geometryFallbackSnapshots',
			'geometryInvalidations',
			'dragTargetUpdates',
			'overlayOnlyUpdates',
			'engineDragPointerDispatches',
			'candidateResolutionCount',
		] );
		expect( releaseValidationFlowChecklist ).toContain( 'Open inline edit on a supported text node.' );
		expect( releaseValidationFlowChecklist ).toContain( 'Dock and float the structure pane once.' );
	} );
} );
