<script lang="ts">
	import { onMount } from 'svelte';
	import { createSvelteKitBuilderIntegration } from '@builder/adapter-sveltekit';
	import { createBuilderHostSdk, type BuilderCanvas } from '@builder/editor-svelte';
	import type { BuilderPackage } from '@builder/schema';

	type PageData = {
		projectId: string;
		project: BuilderPackage;
		status: {
			versionToken?: string;
			updatedAt?: string;
		};
	};

	export let data: PageData;

	let canvasComponent: typeof BuilderCanvas | undefined;
	let editor: ReturnType<ReturnType<typeof createBuilderHostSdk>['createEditor']> | undefined;
	let hookLog: string[] = [];
	let ready = false;

	const previewContext = {
		siteData: {
			title: 'Embed Smoke Host',
			tagline: 'Public SDK integration',
		},
		record: {
			title: 'Runtime title from host context',
			color: '#d946ef',
		},
		session: {
			userId: 'host-user-1',
			role: 'admin',
		},
	};

	onMount( async () => {
		const editorModule = await import( '@builder/editor-svelte' );
		canvasComponent = editorModule.BuilderCanvas;

		const integration = createSvelteKitBuilderIntegration( {
			previewContext,
			permissions: readPermissions(),
			persistence: {
				loadProject: async () => {
					const payload = await fetchJson( `/api/projects/${ data.projectId }` );
					return payload.project;
				},
				saveAutosave: async ( project, context ) => saveProjectSnapshot( project, context ),
				saveDraft: async ( project, context ) => saveProjectSnapshot( project, context ),
				publish: async ( project, context ) => saveProjectSnapshot( project, { ...context, reason: 'publish' } ),
				restoreRevision: async ( revisionId ) => {
					const payload = await fetchJson( `/api/projects/${ data.projectId }`, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify( { restoreRevisionId: revisionId } ),
					} );
					return payload.project;
				},
				listRevisions: async () => {
					const payload = await fetchJson( `/api/projects/${ data.projectId }?include=revisions` );
					return payload.revisions ?? [];
				},
				getSaveStatus: async () => {
					const payload = await fetchJson( `/api/projects/${ data.projectId }` );
					return payload.status;
				},
			},
			media: {
				listAssets: async () => {
					const payload = await fetchJson( `/api/projects/${ data.projectId }/media` );
					return payload.assets ?? [];
				},
				uploadAsset: async ( file ) => {
					const form = new FormData();
					form.set( 'file', file );
					const payload = await fetchJson( `/api/projects/${ data.projectId }/media`, {
						method: 'POST',
						body: form,
					} );
					return payload.asset;
				},
				updateAsset: async ( assetId, patch ) => {
					const payload = await fetchJson( `/api/projects/${ data.projectId }/media`, {
						method: 'PATCH',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify( { assetId, patch } ),
					} );
					return payload.asset;
				},
				deleteAsset: async ( assetId ) => {
					await fetchJson( `/api/projects/${ data.projectId }/media`, {
						method: 'DELETE',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify( { assetId } ),
					} );
				},
				resolveAssetUrl: ( asset ) => typeof asset === 'string' ? asset : asset.url,
			},
			aiSettings: {
				loadSettings: async () => ( { provider: 'custom', baseUrl: '/mock-ai/v1', model: 'mock-model' } ),
				saveSettings: async () => {},
			},
		} );

		const sdk = createBuilderHostSdk( {
			adapter: integration.adapter,
			persistence: integration.editor.persistence.host,
			media: integration.editor.media.adapter,
			permissions: integration.editor.permissions,
			aiSettings: integration.editor.ai.settings as unknown as Parameters<typeof createBuilderHostSdk>[0]['aiSettings'],
			previewContext,
			hooks: {
				onProjectChange: ( project ) => pushHook( `project:${ project.name }` ),
				onDocumentChange: ( document ) => pushHook( `document:${ document.title }` ),
				onSelectionChange: ( selected ) => pushHook( `selection:${ selected.length }` ),
				onSaveStateChange: ( state ) => pushHook( `save:${ state }` ),
				onPublish: () => pushHook( 'publish' ),
				onError: ( error ) => pushHook( `error:${ error.message }` ),
			},
		} );

		editor = sdk.createEditor( data.project, {
			initialState: {
				activeDocumentId: data.project.documents[ 0 ]?.id,
			},
			features: {
				shellVariant: 'v3',
			},
		} );
		ready = true;
	} );

	async function saveProjectSnapshot( project: BuilderPackage, context: Record<string, unknown> | undefined ) {
		const payload = await fetchJson( `/api/projects/${ data.projectId }`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify( {
				project,
				expectedVersionToken: context?.expectedVersionToken,
				force: context?.force === true,
				revisionId: context?.revisionId,
				revisionKind: context?.revisionKind,
				reason: context?.reason,
			} ),
		} );
		return payload;
	}

	async function fetchJson( url: string, init?: RequestInit ) {
		const response = await fetch( url, init );
		const payload = await response.json().catch( () => ( {} ) );
		if ( !response.ok ) {
			throw new Error( payload.error ?? payload.message ?? `Host request failed with ${ response.status }.` );
		}
		return payload;
	}

	function readPermissions() {
		const query = new URLSearchParams( window.location.search );
		const denied = query.getAll( 'deny' );
		return {
			editProject: !denied.includes( 'edit' ) || 'Host denied project editing.',
			publish: !denied.includes( 'publish' ) || 'Host denied publishing.',
			uploadMedia: !denied.includes( 'media' ) || 'Host denied media uploads.',
			deleteMedia: !denied.includes( 'media' ) || 'Host denied media deletion.',
			useAi: !denied.includes( 'ai' ) || 'Host denied AI usage.',
			accessDynamicData: true,
		};
	}

	function pushHook( message: string ) {
		hookLog = [ message, ...hookLog ].slice( 0, 8 );
	}
</script>

<svelte:head>
	<title>Builder Embed Smoke Host</title>
</svelte:head>

<div class="host-shell">
	<header class="host-shell__bar">
		<strong>Embed Smoke Host</strong>
		<a href="/published/embed-home" data-testid="runtime-link">Published runtime</a>
		<span data-testid="hook-log">{hookLog[ 0 ] ?? 'hooks idle'}</span>
	</header>
	{#if ready && canvasComponent && editor}
		<svelte:component this={canvasComponent} {editor} />
	{:else}
		<div class="host-shell__loading">Loading embedded editor...</div>
	{/if}
</div>

<style>
	:global(html),
	:global(body) {
		height: 100%;
		margin: 0;
		overflow: hidden;
		font-family: Inter, system-ui, sans-serif;
	}

	.host-shell {
		display: grid;
		grid-template-rows: 40px minmax( 0, 1fr );
		height: 100vh;
		background: #101218;
	}

	.host-shell__bar {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 0 16px;
		border-bottom: 1px solid rgba( 148, 163, 184, 0.24 );
		background: #0f172a;
		color: #e2e8f0;
		font-size: 13px;
	}

	.host-shell__bar a {
		color: #f0abfc;
	}

	.host-shell__bar span {
		margin-left: auto;
		color: #94a3b8;
	}

	.host-shell__loading {
		display: grid;
		place-items: center;
		color: #e2e8f0;
	}
</style>
