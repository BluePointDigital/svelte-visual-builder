<script lang="ts">
	import { onMount } from 'svelte';
	import { createSvelteKitBuilderAdapter } from '@builder/adapter-sveltekit';
	import type { DemoStudioData } from '$lib/server/demo-data';
	import { resolveStudioRollout } from '$lib/studio-rollout';

	type SiteEditorEntry = {
		id: string;
		label: string;
		route: string;
		templateType: string;
		documentId: string;
		slot: string;
	};

	type PreviewPreset = {
		id: string;
		label: string;
		pathname: string;
		query: string;
	};

	export let data: DemoStudioData & { projectId: string };

	const siteEditorEntries = readMetaArray<SiteEditorEntry>( ( ( data.project.meta as Record<string, unknown> ).siteEditor as Record<string, unknown> | undefined )?.entries );
	const previewPresets = readMetaArray<PreviewPreset>( ( data.project.meta as Record<string, unknown> ).previewPresets );
	const importWarningMessages = data.importWarnings.map( ( warning ) => warning.message );
	const initialPreviewPreset = previewPresets[ 0 ];
	const rollout = resolveStudioRollout( import.meta.env );
	const { interactionCoreV3Enabled, canvasInteractionV2Enabled, navigatorVirtualizationEnabled, shellVariant } = rollout;
	const persistenceEnabled = import.meta.env.VITE_BUILDER_DISABLE_PERSISTENCE !== 'true';
	let builderCanvas: any = null;
	let editor: any = null;
	let shellReady = false;

	onMount( async () => {
		const editorModule = await import( '@builder/editor-svelte' );

		builderCanvas = editorModule.BuilderCanvas;
		editor = editorModule.createBuilderEditor( data.project, {
			activeDocumentId: data.project.documents.find( ( document ) => document.slug === 'marketing-landing' )?.id ?? data.project.documents[ 0 ]?.id,
			adapter: createSvelteKitBuilderAdapter(),
			bindingContext: data.bindingContext,
			persistence: persistenceEnabled
				? {
					autoSaveDelayMs: 1600,
					loadProject: async () => {
						const response = await fetch( `/api/projects/${ data.projectId }` );
						if ( !response.ok ) {
							throw new Error( 'Failed to load studio project.' );
						}
						const payload = await response.json();
						return {
							project: payload.project,
							versionToken: payload.status?.versionToken,
							updatedAt: payload.status?.updatedAt,
						};
					},
					saveAutosave: ( event ) => saveProjectSnapshot( event ),
					saveDraft: ( event ) => saveProjectSnapshot( event ),
					publish: ( event ) => saveProjectSnapshot( event ),
					restoreRevision: ( event ) => saveProjectSnapshot( event ),
					listRevisions: async ( documentId ) => {
						const query = new URLSearchParams( { include: 'revisions' } );
						if ( documentId ) {
							query.set( 'documentId', documentId );
						}
						const response = await fetch( `/api/projects/${ data.projectId }?${ query.toString() }` );
						if ( !response.ok ) {
							throw new Error( 'Failed to load revisions.' );
						}
						const payload = await response.json();
						return payload.revisions ?? [];
					},
					getSaveStatus: async () => {
						const response = await fetch( `/api/projects/${ data.projectId }` );
						if ( !response.ok ) {
							return { state: 'error' };
						}
						const payload = await response.json();
						return {
							state: 'saved',
							versionToken: payload.status?.versionToken,
							updatedAt: payload.status?.updatedAt,
						};
					},
					saveProject: async ( event ) => {
						await saveProjectSnapshot( event );
					},
				}
				: undefined,
			media: {
				allowSvg: true,
				adapter: {
					listAssets: async () => {
						const response = await fetch( `/api/projects/${ data.projectId }/media` );
						if ( !response.ok ) {
							throw new Error( 'Failed to load media library.' );
						}
						const payload = await response.json();
						return payload.assets ?? [];
					},
					uploadAsset: async ( { file }: { file: File } ) => {
						const form = new FormData();
						form.set( 'file', file );
						const response = await fetch( `/api/projects/${ data.projectId }/media`, {
							method: 'POST',
							body: form,
						} );
						const payload = await response.json();
						if ( !response.ok ) {
							throw new Error( payload.error ?? 'Failed to upload media.' );
						}
						return payload.asset;
					},
					updateAsset: async ( assetId: string, patch: Record<string, unknown> ) => {
						const response = await fetch( `/api/projects/${ data.projectId }/media`, {
							method: 'PATCH',
							headers: {
								'content-type': 'application/json',
							},
							body: JSON.stringify( { assetId, patch } ),
						} );
						const payload = await response.json();
						if ( !response.ok ) {
							throw new Error( payload.error ?? 'Failed to update media.' );
						}
						return payload.asset;
					},
					deleteAsset: async ( assetId: string ) => {
						const response = await fetch( `/api/projects/${ data.projectId }/media`, {
							method: 'DELETE',
							headers: {
								'content-type': 'application/json',
							},
							body: JSON.stringify( { assetId } ),
						} );
						if ( !response.ok ) {
							const payload = await response.json();
							throw new Error( payload.error ?? 'Failed to delete media.' );
						}
					},
					resolveAssetUrl: ( asset: { url?: string } | string ) => typeof asset === 'string' ? asset : asset.url,
				},
			},
			features: {
				canvasInteractionV2: canvasInteractionV2Enabled,
				interactionCoreV3: interactionCoreV3Enabled,
				navigatorVirtualization: navigatorVirtualizationEnabled,
				shellVariant,
			},
		} );

		async function saveProjectSnapshot( event: any ) {
			const response = await fetch( `/api/projects/${ data.projectId }`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify( {
					project: event.project,
					expectedVersionToken: event.expectedVersionToken,
					force: event.force === true,
					revisionId: event.revisionId,
					revisionKind: event.revisionKind,
					reason: event.reason,
				} ),
			} );

			const payload = await response.json().catch( () => ( {} ) );
			if ( response.status === 409 ) {
				return {
					conflict: true,
					project: payload.project,
					versionToken: payload.versionToken,
					updatedAt: payload.updatedAt,
					message: payload.message,
				};
			}

			if ( !response.ok ) {
				throw new Error( 'Failed to persist studio project.' );
			}

			return {
				ok: true,
				versionToken: payload.versionToken,
				updatedAt: payload.updatedAt,
			};
		}

		if ( initialPreviewPreset ) {
			editor.setPreviewContext( {
				pathname: initialPreviewPreset.pathname,
				query: initialPreviewPreset.query,
				source: 'manual',
			} );
		}

		shellReady = true;
	} );

	function readMetaArray<T>( value: unknown ): T[] {
		return Array.isArray( value ) ? ( value as T[] ) : [];
	}
</script>

<svelte:head>
	<title>Svelte Visual Builder</title>
</svelte:head>

<div
	class="studio-host"
	data-shell-variant={shellVariant}
	data-canvas-interaction-v2={canvasInteractionV2Enabled}
	data-interaction-core-v3={interactionCoreV3Enabled}
	data-navigator-virtualization={navigatorVirtualizationEnabled}
>
	{#if shellReady && builderCanvas && editor}
		<svelte:component this={builderCanvas} {editor} {siteEditorEntries} {previewPresets} importWarnings={importWarningMessages} />
	{:else}
		<div class="studio-loading">
			<div class="studio-loading__card">
				<p>Loading builder shell...</p>
				<small>Heavy editor code is loaded on demand to keep the initial route lightweight.</small>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(html),
	:global(body) {
		height: 100%;
		margin: 0;
		overflow: hidden;
		background: #2b2c31;
		font-family: Roboto, Arial, Helvetica, sans-serif;
		color: #142033;
	}

	.studio-host {
		height: 100vh;
		overflow: hidden;
	}

	.studio-loading {
		height: 100%;
		display: grid;
		place-items: center;
		background: #2b2c31;
		color: #f5f7fb;
	}

	.studio-loading__card {
		display: grid;
		gap: 0.35rem;
		padding: 1rem 1.25rem;
		border-radius: 0.85rem;
		background: rgba( 19, 24, 37, 0.88 );
		border: 1px solid rgba( 255, 255, 255, 0.08 );
		box-shadow: 0 18px 50px rgba( 0, 0, 0, 0.28 );
		max-width: 28rem;
	}

	.studio-loading__card p,
	.studio-loading__card small {
		margin: 0;
	}

	.studio-loading__card small {
		color: rgba( 245, 247, 251, 0.68 );
	}
</style>
