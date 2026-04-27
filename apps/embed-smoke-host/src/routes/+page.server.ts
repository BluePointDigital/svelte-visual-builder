import { embedSmokeProjectId } from '$lib/sample-project';
import { readHostProject } from '$lib/server/host-store';

export function load() {
	return {
		projectId: embedSmokeProjectId,
		...readHostProject( embedSmokeProjectId ),
	};
}
