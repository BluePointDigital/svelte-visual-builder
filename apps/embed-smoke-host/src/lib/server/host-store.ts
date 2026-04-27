import { Buffer } from 'node:buffer';

import { BuilderPackageSchema } from '@builder/schema';
import type { BuilderPackage, DocumentRevision, MediaAsset } from '@builder/schema';

import { createEmbedSmokeProject, embedSmokeProjectId } from '$lib/sample-project';

type StoredRevision = DocumentRevision & {
	project: BuilderPackage;
};

type StoredMedia = MediaAsset & {
	bytes?: Uint8Array;
	mimeType?: string;
	size?: number;
	createdAt?: string;
};

type StoredProject = {
	project: BuilderPackage;
	versionToken: string;
	updatedAt: string;
	revisions: StoredRevision[];
	media: StoredMedia[];
};

const stores = new Map<string, StoredProject>();

export function getHostProjectStore( projectId = embedSmokeProjectId ): StoredProject {
	const existing = stores.get( projectId );
	if ( existing ) {
		return existing;
	}
	const project = createEmbedSmokeProject();
	const now = new Date().toISOString();
	const store: StoredProject = {
		project,
		versionToken: '1',
		updatedAt: now,
		revisions: [
			{
				id: 'published-initial',
				documentId: project.documents[ 0 ]?.id ?? 'embed-home',
				kind: 'published',
				label: 'Initial publish',
				createdAt: now,
				meta: {},
				project,
			},
		],
		media: project.media.map( ( asset ) => ( {
			...asset,
			mimeType: typeof asset.meta.mimeType === 'string' ? asset.meta.mimeType : undefined,
			createdAt: now,
		} ) ),
	};
	stores.set( projectId, store );
	return store;
}

export function readHostProject( projectId?: string ) {
	const store = getHostProjectStore( projectId );
	return {
		project: store.project,
		status: {
			state: 'saved',
			versionToken: store.versionToken,
			updatedAt: store.updatedAt,
		},
	};
}

export function saveHostProject( projectId: string, input: {
	project: BuilderPackage;
	expectedVersionToken?: string;
	force?: boolean;
	reason?: string;
	revisionKind?: DocumentRevision['kind'];
	revisionId?: string;
} ) {
	const store = getHostProjectStore( projectId );
	if ( input.expectedVersionToken && input.expectedVersionToken !== store.versionToken && !input.force ) {
		return {
			conflict: true,
			project: store.project,
			versionToken: store.versionToken,
			updatedAt: store.updatedAt,
			message: 'The host project changed on the server.',
		};
	}

	const project = BuilderPackageSchema.parse( input.project );
	store.project = project;
	store.versionToken = String( Number( store.versionToken ) + 1 );
	store.updatedAt = new Date().toISOString();

	const kind = input.revisionKind ?? ( input.reason === 'publish' ? 'published' : input.reason === 'autosave' ? 'autosave' : 'draft' );
	store.revisions.unshift( {
		id: input.revisionId ?? `${ kind }-${ store.versionToken }`,
		documentId: project.documents[ 0 ]?.id ?? 'embed-home',
		kind,
		label: `${ sentenceCase( kind ) } ${ store.versionToken }`,
		createdAt: store.updatedAt,
		meta: {},
		project,
	} );

	return {
		ok: true,
		project,
		versionToken: store.versionToken,
		updatedAt: store.updatedAt,
	};
}

export function listHostRevisions( projectId: string, documentId?: string ): DocumentRevision[] {
	return getHostProjectStore( projectId ).revisions
		.filter( ( revision ) => !documentId || revision.documentId === documentId )
		.map( ( { project: _project, ...revision } ) => revision );
}

export function restoreHostRevision( projectId: string, revisionId: string ) {
	const store = getHostProjectStore( projectId );
	const revision = store.revisions.find( ( entry ) => entry.id === revisionId );
	if ( !revision ) {
		return undefined;
	}
	store.project = revision.project;
	store.versionToken = String( Number( store.versionToken ) + 1 );
	store.updatedAt = new Date().toISOString();
	return readHostProject( projectId );
}

export function listHostMedia( projectId: string ) {
	return getHostProjectStore( projectId ).media;
}

export async function uploadHostMedia( projectId: string, file: File ) {
	const store = getHostProjectStore( projectId );
	const bytes = new Uint8Array( await file.arrayBuffer() );
	const id = `upload-${ crypto.randomUUID() }`;
	const asset: StoredMedia = {
		id,
		kind: file.type === 'image/svg+xml' ? 'svg' : 'image',
		url: `/api/media/${ id }`,
		alt: file.name.replace( /\.[^.]+$/, '' ),
		title: file.name,
		bytes,
		mimeType: file.type,
		size: file.size,
		createdAt: new Date().toISOString(),
		meta: {
			mimeType: file.type,
			size: file.size,
			source: 'upload',
		},
	};
	store.media.unshift( asset );
	store.project.media = [
		...store.project.media.filter( ( entry ) => entry.id !== asset.id ),
		asset,
	];
	return asset;
}

export function updateHostMedia( projectId: string, assetId: string, patch: Partial<StoredMedia> ) {
	const store = getHostProjectStore( projectId );
	const existing = store.media.find( ( asset ) => asset.id === assetId );
	if ( !existing ) {
		return undefined;
	}
	Object.assign( existing, patch, {
		id: assetId,
		meta: {
			...existing.meta,
			title: patch.title ?? existing.title,
			caption: patch.meta?.caption ?? existing.meta.caption,
		},
	} );
	store.project.media = store.project.media.map( ( asset ) => asset.id === assetId ? existing : asset );
	return existing;
}

export function deleteHostMedia( projectId: string, assetId: string ) {
	const store = getHostProjectStore( projectId );
	store.media = store.media.filter( ( asset ) => asset.id !== assetId );
	store.project.media = store.project.media.filter( ( asset ) => asset.id !== assetId );
}

export function readHostMediaAsset( assetId: string ) {
	for ( const store of stores.values() ) {
		const asset = store.media.find( ( entry ) => entry.id === assetId );
		if ( asset ) {
			return asset;
		}
	}
	if ( assetId === 'embed-logo' ) {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" rx="20" fill="#0f172a"/><circle cx="86" cy="90" r="42" fill="#d946ef"/><path d="M142 68h112v18H142zm0 34h84v18h-84z" fill="#f8fafc"/></svg>`;
		return {
			id: 'embed-logo',
			kind: 'svg',
			url: '/api/media/embed-logo',
			bytes: Buffer.from( svg ),
			mimeType: 'image/svg+xml',
			meta: {},
		} satisfies StoredMedia;
	}
	return undefined;
}

function sentenceCase( value: string ) {
	return value.charAt( 0 ).toUpperCase() + value.slice( 1 );
}
