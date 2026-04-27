import { describe, expect, it } from 'vitest';

import { createThemeAssignment } from '@builder/schema';
import { createSvelteKitBuilderAdapter, createSvelteKitBuilderIntegration, matchesSvelteKitAssignment, resolveSvelteKitBinding, resolveSvelteKitCollection } from '../src/index';

describe( 'SvelteKit adapter', () => {
	it( 'resolves route and load bindings', () => {
		expect( resolveSvelteKitBinding( {
			id: 'binding-1',
			targetKind: 'prop',
			target: 'value',
			source: 'route',
			path: 'slug',
			args: {},
		}, {
			routeParams: { slug: 'hello-world' },
		} ) ).toBe( 'hello-world' );

		expect( resolveSvelteKitBinding( {
			id: 'binding-2',
			targetKind: 'prop',
			target: 'value',
			source: 'load',
			path: 'post.title',
			args: {},
		}, {
			loadData: { post: { title: 'Loaded title' } },
		} ) ).toBe( 'Loaded title' );
	} );

	it( 'matches documents against routes and conditions', () => {
		const adapter = createSvelteKitBuilderAdapter();
		const assignment = createThemeAssignment( {
			documentId: 'template-1',
			slot: 'page',
			pathname: '/blog/[slug]',
			conditionGroups: [
				{
					id: 'route-condition-group',
					operator: 'and',
					rules: [
						{
							id: 'route-condition',
							source: 'route',
							operator: 'startsWith',
							path: 'pathname',
							value: '/blog',
							values: [],
						},
					],
				},
			],
		} );

		expect( adapter.matchesAssignment( assignment, {
			pathname: '/blog/hello',
		} ) ).toBe( true );
		expect( matchesSvelteKitAssignment( assignment, {
			pathname: '/docs/hello',
		} ) ).toBe( false );
	} );

	it( 'filters and sorts collection records for loop queries', () => {
		expect( resolveSvelteKitCollection( 'posts', {
			collections: {
				posts: [
					{ title: 'Gamma', category: 'docs', order: 3 },
					{ title: 'Alpha', category: 'blog', order: 1 },
					{ title: 'Beta', category: 'blog', order: 2 },
				],
			},
		}, {
			filters: [ {
				path: 'category',
				operator: 'equals',
				value: 'blog',
			} ],
			orderBy: 'order',
			limit: 1,
		} ) ).toEqual( [
			{ title: 'Alpha', category: 'blog', order: 1 },
		] );
	} );

	it( 'creates editor and runtime integration options', () => {
		const media = {
			resolveAssetUrl: ( asset: string | { url: string } ) => typeof asset === 'string' ? `/media/${ asset }` : asset.url,
		};
		const integration = createSvelteKitBuilderIntegration( {
			previewContext: {
				siteData: { title: 'Site' },
			},
			media,
		} );

		expect( integration.adapter.id ).toBe( 'sveltekit' );
		expect( integration.editor.adapter ).toMatchObject( {
			host: integration.adapter,
			previewContext: {
				siteData: { title: 'Site' },
			},
		} );
		expect( integration.runtime ).toMatchObject( {
			adapter: integration.adapter,
			bindingContext: {
				siteData: { title: 'Site' },
			},
			media,
		} );
	} );
} );
