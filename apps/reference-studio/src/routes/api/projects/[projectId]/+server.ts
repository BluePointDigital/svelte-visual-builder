import { json } from '@sveltejs/kit';

import { parseBuilderPackage } from '@builder/schema';

import {
	getStudioProjectStatus,
	getStudioRepositoryProject,
	listStudioProjectRevisions,
	persistStudioProjectSnapshot,
	STUDIO_PROJECT_ID,
} from '$lib/server/studio-project';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ( { params, request } ) => {
	if ( params.projectId !== STUDIO_PROJECT_ID ) {
		return json( { error: 'Unknown project.' }, { status: 404 } );
	}

	const payload = await request.json();
	const project = parseBuilderPackage( payload?.project );
	const result = await persistStudioProjectSnapshot( params.projectId, project, {
		expectedVersionToken: typeof payload?.expectedVersionToken === 'string' ? payload.expectedVersionToken : undefined,
		force: payload?.force === true,
	} );

	if ( result.conflict ) {
		return json( {
			ok: false,
			conflict: true,
			project: result.project,
			versionToken: result.versionToken,
			updatedAt: result.updatedAt,
			message: 'The project changed on the server before this save completed.',
		}, { status: 409 } );
	}

	return json( {
		ok: true,
		projectId: params.projectId,
		versionToken: result.versionToken,
		updatedAt: result.updatedAt,
		revisionCount: result.project.revisions.length,
		documentCount: result.project.documents.length,
	} );
};

export const GET: RequestHandler = async ( { params, url } ) => {
	if ( params.projectId !== STUDIO_PROJECT_ID ) {
		return json( { error: 'Unknown project.' }, { status: 404 } );
	}

	const project = await getStudioRepositoryProject( params.projectId );
	if ( !project ) {
		return json( { error: 'Project not found.' }, { status: 404 } );
	}

	const status = await getStudioProjectStatus( params.projectId );
	const documentId = url.searchParams.get( 'documentId' ) ?? undefined;
	const include = url.searchParams.get( 'include' );
	if ( include === 'revisions' ) {
		return json( {
			project,
			status,
			revisions: await listStudioProjectRevisions( params.projectId, documentId ),
		} );
	}

	return json( { project, status } );
};
