import { error, type RequestHandler } from '@sveltejs/kit';

import { readHostMediaAsset } from '$lib/server/host-store';

export const GET: RequestHandler = ( { params } ) => {
	const asset = readHostMediaAsset( params.assetId ?? '' );
	if ( !asset?.bytes ) {
		throw error( 404, 'Media asset not found.' );
	}
	return new Response( new Uint8Array( asset.bytes ), {
		headers: {
			'content-type': asset.mimeType ?? 'application/octet-stream',
			'cache-control': 'public, max-age=60',
		},
	} );
};
