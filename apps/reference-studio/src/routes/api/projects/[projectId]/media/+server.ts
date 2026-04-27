import { json } from '@sveltejs/kit';

import { parseBuilderPackage } from '@builder/schema';

import { deleteReferenceMediaObject, putReferenceMediaObject } from '$lib/server/media-store';
import { getStudioRepositoryProject, persistStudioProject, STUDIO_PROJECT_ID } from '$lib/server/studio-project';

import type { RequestHandler } from './$types';

const allowedMimeTypes = new Set( [ 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml' ] );
const maxUploadSize = 5 * 1024 * 1024;

export const GET: RequestHandler = async ( { params } ) => {
	if ( params.projectId !== STUDIO_PROJECT_ID ) {
		return json( { error: 'Unknown project.' }, { status: 404 } );
	}

	const project = await getStudioRepositoryProject( params.projectId );
	if ( !project ) {
		return json( { error: 'Project not found.' }, { status: 404 } );
	}

	return json( { assets: project.media } );
};

export const POST: RequestHandler = async ( { params, request } ) => {
	if ( params.projectId !== STUDIO_PROJECT_ID ) {
		return json( { error: 'Unknown project.' }, { status: 404 } );
	}

	const project = await getStudioRepositoryProject( params.projectId );
	if ( !project ) {
		return json( { error: 'Project not found.' }, { status: 404 } );
	}

	const form = await request.formData();
	const file = form.get( 'file' );
	if ( !( file instanceof File ) ) {
		return json( { error: 'Choose a media file to upload.' }, { status: 400 } );
	}
	if ( file.size > maxUploadSize ) {
		return json( { error: 'Media upload is too large.' }, { status: 400 } );
	}
	if ( !allowedMimeTypes.has( file.type ) ) {
		return json( { error: 'Unsupported media type.' }, { status: 400 } );
	}

	const extension = file.name.includes( '.' ) ? file.name.split( '.' ).pop() : undefined;
	const key = `${ crypto.randomUUID() }${ extension ? `.${ extension }` : '' }`;
	const stored = await putReferenceMediaObject( key, new Uint8Array( await file.arrayBuffer() ), file.type );
	const asset = {
		id: crypto.randomUUID(),
		kind: file.type === 'image/svg+xml' ? 'svg' : 'image',
		url: stored.url,
		alt: file.name.replace( /\.[^.]+$/, '' ),
		title: file.name,
		mimeType: file.type,
		size: stored.size,
		createdAt: new Date().toISOString(),
		source: 'upload',
		meta: {
			storageKey: stored.key,
			bucket: 'reference-studio-demo',
		},
	};
	const nextProject = parseBuilderPackage( {
		...project,
		media: [ ...project.media.filter( ( entry ) => entry.url !== asset.url ), asset ],
	} );
	await persistStudioProject( params.projectId, nextProject );

	return json( { asset } );
};

export const PATCH: RequestHandler = async ( { params, request } ) => {
	if ( params.projectId !== STUDIO_PROJECT_ID ) {
		return json( { error: 'Unknown project.' }, { status: 404 } );
	}

	const project = await getStudioRepositoryProject( params.projectId );
	if ( !project ) {
		return json( { error: 'Project not found.' }, { status: 404 } );
	}

	const payload = await request.json();
	const assetId = String( payload?.assetId ?? '' );
	const patch = payload?.patch && typeof payload.patch === 'object' ? payload.patch as Record<string, unknown> : {};
	const nextMedia = project.media.map( ( asset ) => asset.id === assetId
		? {
			...asset,
			alt: typeof patch.alt === 'string' ? patch.alt : asset.alt,
			title: typeof patch.title === 'string' ? patch.title : asset.title,
			caption: typeof patch.caption === 'string' ? patch.caption : asset.caption,
			meta: {
				...asset.meta,
				title: typeof patch.title === 'string' ? patch.title : asset.meta.title,
				caption: typeof patch.caption === 'string' ? patch.caption : asset.meta.caption,
			},
		}
		: asset );
	const updated = nextMedia.find( ( asset ) => asset.id === assetId );
	if ( !updated ) {
		return json( { error: 'Media asset not found.' }, { status: 404 } );
	}

	await persistStudioProject( params.projectId, parseBuilderPackage( { ...project, media: nextMedia } ) );
	return json( { asset: updated } );
};

export const DELETE: RequestHandler = async ( { params, request } ) => {
	if ( params.projectId !== STUDIO_PROJECT_ID ) {
		return json( { error: 'Unknown project.' }, { status: 404 } );
	}

	const project = await getStudioRepositoryProject( params.projectId );
	if ( !project ) {
		return json( { error: 'Project not found.' }, { status: 404 } );
	}

	const payload = await request.json();
	const assetId = String( payload?.assetId ?? '' );
	const asset = project.media.find( ( entry ) => entry.id === assetId );
	if ( asset?.meta.storageKey && typeof asset.meta.storageKey === 'string' ) {
		deleteReferenceMediaObject( asset.meta.storageKey );
	}
	await persistStudioProject( params.projectId, parseBuilderPackage( {
		...project,
		media: project.media.filter( ( entry ) => entry.id !== assetId ),
	} ) );

	return json( { ok: true } );
};
