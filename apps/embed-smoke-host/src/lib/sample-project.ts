import { createBuilderPackage, createDocument, createNode, createThemeAssignment } from '@builder/schema';
import type { BuilderPackage } from '@builder/schema';

export const embedSmokeProjectId = 'embed-smoke';
export const embedSmokeDocumentId = 'embed-home';

export function createEmbedSmokeProject(): BuilderPackage {
	const page = createDocument( 'page', 'Embedded Home', 'embedded-home' );
	page.id = embedSmokeDocumentId;
	page.status = 'published';
	page.root = [
		createNode( {
			id: 'embed-hero',
			type: 'container',
			name: 'Host-owned hero',
			layout: { display: 'flex', direction: 'column', gap: '1rem', width: '100%' },
			styles: {
				base: {
					padding: '48px',
					backgroundColor: '#f8fafc',
					borderRadius: '12px',
				},
				states: {},
				breakpoints: {},
				stateBreakpoints: {},
				customCss: '',
			},
			children: [
				createNode( {
					type: 'heading',
					props: { text: 'Embedded Builder Host', level: 'h1', align: 'left' },
				} ),
				createNode( {
					type: 'paragraph',
					props: {
						text: 'This page is rendered from a separate SvelteKit host that only imports public builder packages.',
					},
				} ),
				createNode( {
					type: 'image',
					props: {
						src: '/api/media/embed-logo',
						alt: 'Embedded host media asset',
					},
					styles: {
						base: {
							width: '160px',
							height: '90px',
							objectFit: 'cover',
							borderRadius: '8px',
						},
						states: {},
						breakpoints: {},
						stateBreakpoints: {},
						customCss: '',
					},
				} ),
			],
		} ),
	];

	const project = createBuilderPackage( 'Embed Smoke Host', [ page ], [
		createThemeAssignment( {
			documentId: page.id,
			slot: 'page',
			status: 'published',
			pathname: '/published/embed-home',
			label: 'Embedded Home',
		} ),
	] );
	project.media = [
		{
			id: 'embed-logo',
			kind: 'image',
			url: '/api/media/embed-logo',
			alt: 'Embedded host sample image',
			title: 'Embedded sample',
			meta: {
				mimeType: 'image/svg+xml',
				source: 'host',
			},
		},
	];
	project.meta = {
		hostFixture: true,
	};
	return project;
}
