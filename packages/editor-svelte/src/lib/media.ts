import type { BuilderPackage, JsonValue, MediaAsset } from '@builder/schema';

export type BuilderMediaAssetSource = 'upload' | 'external' | 'import' | 'manual';

export interface BuilderMediaAssetMetadata {
	id: string;
	url: string;
	alt?: string;
	title?: string;
	caption?: string;
	mimeType?: string;
	size?: number;
	width?: number;
	height?: number;
	createdAt?: string;
	source?: BuilderMediaAssetSource | string;
}

export interface BuilderMediaUploadInput {
	file: File;
	project: BuilderPackage;
}

export interface BuilderMediaAdapter {
	listAssets?: ( project: BuilderPackage ) => Promise<BuilderMediaAssetMetadata[]> | BuilderMediaAssetMetadata[];
	uploadAsset?: ( input: BuilderMediaUploadInput ) => Promise<BuilderMediaAssetMetadata>;
	deleteAsset?: ( assetId: string, project: BuilderPackage ) => Promise<void>;
	updateAsset?: ( assetId: string, patch: Partial<BuilderMediaAssetMetadata>, project: BuilderPackage ) => Promise<BuilderMediaAssetMetadata>;
	resolveAssetUrl?: ( asset: BuilderMediaAssetMetadata, project: BuilderPackage ) => string;
}

export interface BuilderMediaOptions {
	adapter?: BuilderMediaAdapter;
	maxUploadSize?: number;
	allowedMimeTypes?: string[];
	allowSvg?: boolean;
}

export interface BuilderMediaDiagnostic {
	code: 'missing-url' | 'unsupported-mime' | 'external-url' | 'missing-alt';
	message: string;
	severity: 'info' | 'warning' | 'unsupported';
	assetId?: string;
	url?: string;
}

export const DEFAULT_MEDIA_MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
export const DEFAULT_MEDIA_MIME_TYPES = [ 'image/png', 'image/jpeg', 'image/webp', 'image/gif' ];
export const SVG_MEDIA_MIME_TYPE = 'image/svg+xml';

export function resolveAllowedMediaMimeTypes( options: BuilderMediaOptions = {} ): string[] {
	const base = options.allowedMimeTypes?.length ? options.allowedMimeTypes : DEFAULT_MEDIA_MIME_TYPES;
	const next = new Set( base );
	if ( options.allowSvg ) {
		next.add( SVG_MEDIA_MIME_TYPE );
	}
	return [ ...next ];
}

export function validateMediaUpload( file: File, options: BuilderMediaOptions = {} ): void {
	const maxUploadSize = options.maxUploadSize ?? DEFAULT_MEDIA_MAX_UPLOAD_SIZE;
	const allowedMimeTypes = resolveAllowedMediaMimeTypes( options );
	if ( file.size > maxUploadSize ) {
		throw new Error( `Media upload is too large. Maximum size is ${ formatBytes( maxUploadSize ) }.` );
	}
	if ( !allowedMimeTypes.includes( file.type ) ) {
		throw new Error( 'Unsupported media type. Upload a PNG, JPEG, WebP, GIF, or enabled SVG file.' );
	}
}

export function normalizeMediaAsset( asset: Partial<BuilderMediaAssetMetadata> & Pick<BuilderMediaAssetMetadata, 'url'> ): MediaAsset {
	const kind = asset.mimeType === SVG_MEDIA_MIME_TYPE || /\.svg($|\?)/i.test( asset.url ) ? 'svg' : asset.mimeType?.startsWith( 'image/' ) || isImageUrl( asset.url ) ? 'image' : 'file';
	return {
		id: asset.id || crypto.randomUUID(),
		kind,
		url: asset.url,
		alt: asset.alt,
		width: asset.width,
		height: asset.height,
		meta: compactRecord( {
			title: asset.title,
			caption: asset.caption,
			mimeType: asset.mimeType,
			size: asset.size,
			createdAt: asset.createdAt,
			source: asset.source,
		} ),
	};
}

export function toMediaAssetMetadata( asset: MediaAsset ): BuilderMediaAssetMetadata {
	return {
		id: asset.id,
		url: asset.url,
		alt: asset.alt,
		title: typeof asset.meta.title === 'string' ? asset.meta.title : undefined,
		caption: typeof asset.meta.caption === 'string' ? asset.meta.caption : undefined,
		mimeType: typeof asset.meta.mimeType === 'string' ? asset.meta.mimeType : undefined,
		size: typeof asset.meta.size === 'number' ? asset.meta.size : undefined,
		width: asset.width,
		height: asset.height,
		createdAt: typeof asset.meta.createdAt === 'string' ? asset.meta.createdAt : undefined,
		source: typeof asset.meta.source === 'string' ? asset.meta.source : undefined,
	};
}

export function mergeMediaCatalog( current: MediaAsset[], incoming: Array<MediaAsset | BuilderMediaAssetMetadata> ): MediaAsset[] {
	const byKey = new Map<string, MediaAsset>();
	for ( const asset of current ) {
		byKey.set( getMediaAssetKey( asset ), asset );
	}
	for ( const candidate of incoming ) {
		const normalized = isSchemaMediaAsset( candidate ) ? candidate : normalizeMediaAsset( candidate );
		const key = getMediaAssetKey( normalized );
		const existing = byKey.get( key );
		byKey.set( key, existing ? mergeMediaAsset( existing, normalized ) : normalized );
	}
	return [ ...byKey.values() ];
}

export function updateMediaCatalogAsset( assets: MediaAsset[], assetId: string, patch: Partial<BuilderMediaAssetMetadata> ): MediaAsset[] {
	return assets.map( ( asset ) => asset.id === assetId
		? normalizeMediaAsset( {
			...toMediaAssetMetadata( asset ),
			...patch,
			id: asset.id,
			url: patch.url ?? asset.url,
		} )
		: asset );
}

export function deleteMediaCatalogAsset( assets: MediaAsset[], assetId: string ): MediaAsset[] {
	return assets.filter( ( asset ) => asset.id !== assetId );
}

export function createMediaDiagnostics( assets: MediaAsset[], allowedMimeTypes = resolveAllowedMediaMimeTypes() ): BuilderMediaDiagnostic[] {
	const diagnostics: BuilderMediaDiagnostic[] = [];
	for ( const asset of assets ) {
		const metadata = toMediaAssetMetadata( asset );
		if ( !metadata.url.trim() ) {
			diagnostics.push( { code: 'missing-url', message: 'Media asset is missing a URL.', severity: 'warning', assetId: asset.id } );
		}
		if ( metadata.mimeType && !allowedMimeTypes.includes( metadata.mimeType ) ) {
			diagnostics.push( { code: 'unsupported-mime', message: `${ metadata.mimeType } may not be supported by this host.`, severity: 'unsupported', assetId: asset.id, url: asset.url } );
		}
		if ( isExternalUrl( metadata.url ) ) {
			diagnostics.push( { code: 'external-url', message: 'External media URL is referenced without being downloaded.', severity: 'info', assetId: asset.id, url: asset.url } );
		}
		if ( asset.kind === 'image' && !metadata.alt?.trim() ) {
			diagnostics.push( { code: 'missing-alt', message: 'Image asset is missing alt text.', severity: 'warning', assetId: asset.id, url: asset.url } );
		}
	}
	return diagnostics;
}

export function createBrowserLocalMediaAdapter(): BuilderMediaAdapter {
	return {
		listAssets: ( project ) => project.media.map( toMediaAssetMetadata ),
		async uploadAsset( { file } ) {
			validateMediaUpload( file );
			return {
				id: crypto.randomUUID(),
				url: URL.createObjectURL( file ),
				title: file.name,
				alt: file.name.replace( /\.[^.]+$/, '' ),
				mimeType: file.type,
				size: file.size,
				createdAt: new Date().toISOString(),
				source: 'upload',
			};
		},
		async updateAsset( assetId, patch, project ) {
			const existing = project.media.find( ( asset ) => asset.id === assetId );
			return {
				...( existing ? toMediaAssetMetadata( existing ) : { id: assetId, url: patch.url ?? '' } ),
				...patch,
				id: assetId,
			};
		},
		resolveAssetUrl: ( asset ) => asset.url,
	};
}

function mergeMediaAsset( existing: MediaAsset, incoming: MediaAsset ): MediaAsset {
	return {
		...existing,
		...incoming,
		id: existing.id,
		alt: incoming.alt || existing.alt,
		meta: {
			...existing.meta,
			...incoming.meta,
		},
	};
}

function getMediaAssetKey( asset: MediaAsset ): string {
	return asset.url.trim().toLowerCase() || asset.id;
}

function isImageUrl( url: string ): boolean {
	return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test( url );
}

function isSchemaMediaAsset( asset: MediaAsset | BuilderMediaAssetMetadata ): asset is MediaAsset {
	return 'kind' in asset && typeof asset.kind === 'string';
}

function isExternalUrl( url: string ): boolean {
	return /^https?:\/\//i.test( url );
}

function formatBytes( value: number ): string {
	if ( value < 1024 * 1024 ) {
		return `${ Math.ceil( value / 1024 ) } KB`;
	}
	return `${ ( value / ( 1024 * 1024 ) ).toFixed( 1 ) } MB`;
}

function compactRecord( value: Record<string, JsonValue | undefined> ): Record<string, JsonValue> {
	return Object.fromEntries( Object.entries( value ).filter( ( [ , entry ] ) => entry !== undefined && entry !== '' ) ) as Record<string, JsonValue>;
}
