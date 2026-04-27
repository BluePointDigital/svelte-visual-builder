import { loadStudioProject, resolveStudioFixture } from '$lib/server/studio-project';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ( { url } ) => {
	return loadStudioProject( {
		fixture: resolveStudioFixture( url.searchParams.get( 'fixture' ) ),
	} );
};
