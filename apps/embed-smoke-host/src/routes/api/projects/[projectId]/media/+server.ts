import { json, type RequestHandler } from '@sveltejs/kit';

import { deleteHostMedia, listHostMedia, updateHostMedia, uploadHostMedia } from '$lib/server/host-store';

export const GET: RequestHandler = ( { params } ) => {
	return json( {
		assets: listHostMedia( params.projectId ?? 'embed-smoke' ),
	} );
};

export const POST: RequestHandler = async ( { params, request } ) => {
	const form = await request.formData();
	const file = form.get( 'file' );
	if ( !( file instanceof File ) ) {
		return json( { error: 'Upload a file.' }, { status: 400 } );
	}
	if ( !file.type.startsWith( 'image/' ) ) {
		return json( { error: 'Only image uploads are allowed in the smoke host.' }, { status: 415 } );
	}
	return json( {
		asset: await uploadHostMedia( params.projectId ?? 'embed-smoke', file ),
	} );
};

export const PATCH: RequestHandler = async ( { params, request } ) => {
	const payload = await request.json();
	if ( typeof payload.assetId !== 'string' ) {
		return json( { error: 'assetId is required.' }, { status: 400 } );
	}
	const asset = updateHostMedia( params.projectId ?? 'embed-smoke', payload.assetId, payload.patch ?? {} );
	if ( !asset ) {
		return json( { error: 'Asset not found.' }, { status: 404 } );
	}
	return json( { asset } );
};

export const DELETE: RequestHandler = async ( { params, request } ) => {
	const payload = await request.json();
	if ( typeof payload.assetId !== 'string' ) {
		return json( { error: 'assetId is required.' }, { status: 400 } );
	}
	deleteHostMedia( params.projectId ?? 'embed-smoke', payload.assetId );
	return json( { ok: true } );
};
