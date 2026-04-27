import { json, type RequestHandler } from '@sveltejs/kit';

import { listHostRevisions, readHostProject, restoreHostRevision, saveHostProject } from '$lib/server/host-store';

export const GET: RequestHandler = ( { params, url } ) => {
	const projectId = params.projectId ?? 'embed-smoke';
	const payload = readHostProject( projectId );
	const includeRevisions = url.searchParams.get( 'include' ) === 'revisions';
	return json( {
		...payload,
		revisions: includeRevisions ? listHostRevisions( projectId, url.searchParams.get( 'documentId' ) ?? undefined ) : undefined,
	} );
};

export const POST: RequestHandler = async ( { params, request } ) => {
	const projectId = params.projectId ?? 'embed-smoke';
	const payload = await request.json();
	if ( typeof payload.restoreRevisionId === 'string' ) {
		const restored = restoreHostRevision( projectId, payload.restoreRevisionId );
		if ( !restored ) {
			return json( { error: 'Revision not found.' }, { status: 404 } );
		}
		return json( restored );
	}

	const result = saveHostProject( projectId, {
		project: payload.project,
		expectedVersionToken: payload.expectedVersionToken,
		force: payload.force === true,
		reason: payload.reason,
		revisionId: payload.revisionId,
		revisionKind: payload.revisionKind,
	} );

	if ( result.conflict ) {
		return json( result, { status: 409 } );
	}

	return json( result );
};
