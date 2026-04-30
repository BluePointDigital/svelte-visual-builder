import { describe, expect, it, vi } from 'vitest';

import { createBuilderHostAdapter, defineBuilderHostExtension } from '@builder/plugin-api';
import { createBuilderPackage, createEmptyDocument, createNode } from '@builder/schema';
import { createBuilderEditor, type CreateBuilderEditorOptions } from '../src/lib/editor';
import { createBuilderHostSdk } from '../src/lib/sdk';

describe( 'editor public SDK', () => {
	it( 'accepts grouped editor options and preserves compatibility aliases', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		document.root = [ createNode( { id: 'hero', type: 'heading', props: { text: 'Hello' } } ) ];
		const project = createBuilderPackage( 'Demo', [ document ] );
		const hook = vi.fn();
		const oldOptions: CreateBuilderEditorOptions = {
			activeDocumentId: document.id,
			bindingContext: { record: { title: 'Old alias' } },
			persistence: {
				saveProject: async () => undefined,
			},
		};
		const editor = createBuilderEditor( project, {
			...oldOptions,
			initialState: {
				activeDocumentId: document.id,
				bindingContext: { record: { title: 'Grouped' } },
			},
			hooks: {
				onSelectionChange: hook,
			},
		} );

		editor.dispatch( { type: 'document/ui/select-node', nodeId: 'hero' } );

		expect( editor.engine.getState().activeDocumentId ).toBe( document.id );
		expect( editor.bindingContext?.record ).toEqual( { title: 'Grouped' } );
		expect( hook ).toHaveBeenCalledWith( [ 'hero' ], expect.any( Object ) );
	} );

	it( 'creates a host SDK with adapter, dynamic, media, persistence, and hooks', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const project = createBuilderPackage( 'Demo', [ document ] );
		const adapter = createBuilderHostAdapter( {
			id: 'custom',
			label: 'Custom host',
			resolveBinding: ( binding, context ) => context.record?.[ binding.path ],
			resolveDynamicProvider: ( providerId, context ) => context.record?.[ providerId ],
			matchesConditionGroup: () => true,
			matchesAssignment: () => true,
			resolveCollection: () => [],
		} );
		const media = {
			resolveAssetUrl: ( asset: string | { url: string } ) => typeof asset === 'string' ? `/cdn/${ asset }` : asset.url,
		};
		const saveDraft = vi.fn( async () => ( { ok: true } ) );
		const sdk = createBuilderHostSdk( {
			adapter,
			media,
			persistence: {
				saveDraft,
			},
			dynamicProviders: [
				{
					id: 'title',
					label: 'Title',
					group: 'Host',
					categories: [ 'text' ],
					resolve: ( context ) => context.record?.title,
				},
			],
			previewContext: {
				record: { title: 'Preview' },
			},
			permissions: {
				publish: 'Publishing is limited to reviewers.',
			},
		} );
		const editor = sdk.createEditor( project );

		expect( editor.adapter?.id ).toBe( 'custom' );
		expect( editor.listDynamicProviders( 'text' ).some( ( provider ) => provider.id === 'title' ) ).toBe( true );
		expect( sdk.createEditorOptions().media?.adapter ).toBe( media );
		expect( editor.can( 'publish' ) ).toBe( false );
		expect( editor.getPermission( 'publish' ).reason ).toBe( 'Publishing is limited to reviewers.' );
	} );

	it( 'creates a host SDK from a first-class extension while preserving explicit overrides', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const project = createBuilderPackage( 'Demo', [ document ] );
		const extensionAdapter = createBuilderHostAdapter( {
			id: 'extension',
			label: 'Extension host',
			resolveBinding: ( binding, context ) => context.record?.[ binding.path ],
			resolveDynamicProvider: ( providerId, context ) => context.record?.[ providerId ],
			matchesConditionGroup: () => true,
			matchesAssignment: () => true,
			resolveCollection: () => [],
		} );
		const explicitAdapter = createBuilderHostAdapter( {
			...extensionAdapter,
			id: 'explicit',
			label: 'Explicit host',
		} );
		const saveDraft = vi.fn( async () => ( { ok: true } ) );
		const extension = defineBuilderHostExtension( {
			adapter: extensionAdapter,
			persistence: {
				saveDraft,
			},
			media: {
				resolveAssetUrl: ( asset ) => typeof asset === 'string' ? `/extension-cdn/${ asset }` : asset.url,
			},
			permissions: {
				publish: 'Publishing is controlled by the extension.',
			},
			dynamicProviders: [
				{
					id: 'extension-title',
					label: 'Extension Title',
					group: 'Extension',
					categories: [ 'text' ],
					resolve: ( context ) => context.record?.title,
				},
			],
		} );
		const sdk = createBuilderHostSdk( {
			extension,
			adapter: explicitAdapter,
			previewContext: {
				record: { title: 'Preview title' },
			},
		} );
		const editor = sdk.createEditor( project );

		expect( editor.adapter?.id ).toBe( 'explicit' );
		expect( editor.listDynamicProviders( 'text' ).some( ( provider ) => provider.id === 'extension-title' ) ).toBe( true );
		expect( sdk.createEditorOptions().persistence?.host ).toBe( extension.persistence );
		expect( sdk.createEditorOptions().media?.adapter ).toBe( extension.media );
		expect( editor.can( 'publish' ) ).toBe( false );
		expect( editor.getPermission( 'publish' ).reason ).toBe( 'Publishing is controlled by the extension.' );
	} );

	it( 'blocks restricted host actions without mutating state', async () => {
		const document = createEmptyDocument( 'page', 'Home', 'home' );
		const project = createBuilderPackage( 'Demo', [ document ] );
		const editor = createBuilderEditor( project, {
			permissions: {
				publish: false,
				useAi: 'AI is disabled by this host.',
			},
		} );

		await expect( editor.publish() ).rejects.toThrow( /publish/i );
		await expect( editor.startAiCreate( { prompt: 'Create a hero' } ) ).rejects.toThrow( 'AI is disabled by this host.' );
		expect( editor.engine.getState().project.documents[ 0 ].status ).toBe( 'draft' );
	} );
} );
