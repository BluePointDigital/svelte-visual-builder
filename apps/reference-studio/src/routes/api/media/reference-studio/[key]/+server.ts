import { error } from '@sveltejs/kit';

import { getReferenceMediaObject } from '$lib/server/media-store';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ( { params } ) => {
	const object = getReferenceMediaObject( decodeURIComponent( params.key ) );
	if ( !object ) {
		throw error( 404, 'Media object not found.' );
	}

	return new Response( object.body.slice().buffer, {
		headers: {
			'content-type': object.contentType,
			'cache-control': 'public, max-age=3600',
		},
	} );
};
