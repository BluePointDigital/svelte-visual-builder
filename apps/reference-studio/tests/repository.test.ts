import { describe, expect, it } from 'vitest';

import { persistStudioProject, loadStudioProject, STUDIO_PROJECT_ID } from '../src/lib/server/studio-project';

describe( 'reference studio repository', () => {
	it( 'persists project snapshots through the studio repository bridge', async () => {
		const initial = await loadStudioProject();
		const nextProject = structuredClone( initial.project );
		nextProject.documents[ 0 ].title = 'Persisted Studio Title';

		await persistStudioProject( STUDIO_PROJECT_ID, nextProject );

		const reloaded = await loadStudioProject();
		expect( reloaded.project.documents[ 0 ].title ).toBe( 'Persisted Studio Title' );
		expect( reloaded.projectId ).toBe( STUDIO_PROJECT_ID );
	} );
} );
