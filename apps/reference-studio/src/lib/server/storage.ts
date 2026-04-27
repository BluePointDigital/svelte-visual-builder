export interface StoredMediaAsset {
	key: string;
	url: string;
	contentType: string;
	size: number;
}

export interface MediaStorage {
	putObject: ( key: string, body: Uint8Array, contentType: string ) => Promise<StoredMediaAsset>;
	deleteObject: ( key: string ) => Promise<void>;
	getPublicUrl: ( key: string ) => string;
}

export function createInMemoryMediaStorage( publicBaseUrl = '/api/media/assets' ): MediaStorage {
	const objects = new Map<string, StoredMediaAsset & { body: Uint8Array }>();
	return {
		async putObject( key, body, contentType ) {
			const asset = {
				key,
				url: `${ publicBaseUrl.replace( /\/$/, '' ) }/${ encodeURIComponent( key ) }`,
				contentType,
				size: body.byteLength,
				body,
			};
			objects.set( key, asset );
			return {
				key: asset.key,
				url: asset.url,
				contentType: asset.contentType,
				size: asset.size,
			};
		},
		async deleteObject( key ) {
			objects.delete( key );
		},
		getPublicUrl( key ) {
			return objects.get( key )?.url ?? `${ publicBaseUrl.replace( /\/$/, '' ) }/${ encodeURIComponent( key ) }`;
		},
	};
}

export interface S3CompatibleMediaStorageConfig {
	bucket: string;
	publicBaseUrl: string;
}

export function createS3CompatibleMediaStorage( config: S3CompatibleMediaStorageConfig ): MediaStorage {
	return {
		async putObject( key, body, contentType ) {
			return {
				key,
				url: `${ config.publicBaseUrl.replace( /\/$/, '' ) }/${ key }`,
				contentType,
				size: body.byteLength,
			};
		},
		async deleteObject() {
			return;
		},
		getPublicUrl( key ) {
			return `${ config.publicBaseUrl.replace( /\/$/, '' ) }/${ key }`;
		},
	};
}
