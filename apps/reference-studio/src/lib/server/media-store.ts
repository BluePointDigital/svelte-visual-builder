export interface ReferenceStoredMediaObject {
	key: string;
	body: Uint8Array;
	contentType: string;
	size: number;
}

const objects = new Map<string, ReferenceStoredMediaObject>();

export async function putReferenceMediaObject( key: string, body: Uint8Array, contentType: string ) {
	const object = {
		key,
		body,
		contentType,
		size: body.byteLength,
	};
	objects.set( key, object );
	return {
		key,
		url: `/api/media/reference-studio/${ encodeURIComponent( key ) }`,
		contentType,
		size: object.size,
	};
}

export function getReferenceMediaObject( key: string ) {
	return objects.get( key );
}

export function deleteReferenceMediaObject( key: string ) {
	objects.delete( key );
}
