import { readHostProject } from '$lib/server/host-store';

export function load( { params } ) {
	const { project } = readHostProject();
	return {
		documentId: params.documentId,
		project,
		bindingContext: {
			siteData: { title: 'Embed Smoke Host' },
			record: {
				title: 'Runtime title from host context',
			},
		},
	};
}
