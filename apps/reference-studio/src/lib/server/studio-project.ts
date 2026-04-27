import type { BuilderPackage } from '@builder/schema';
import { parseBuilderPackage } from '@builder/schema';

import { createDemoStudioData, type DemoStudioData, type DemoStudioFixture } from './demo-data';
import { InMemoryBuilderDocumentRepository, type ProjectSnapshotSaveResult, type ProjectSnapshotStatus } from './repository';

export const STUDIO_PROJECT_ID = 'reference-studio';

export interface LoadStudioProjectOptions {
	fixture?: DemoStudioFixture;
}

const seedData = createDemoStudioData();
const repository = new InMemoryBuilderDocumentRepository( [
	{
		id: STUDIO_PROJECT_ID,
		project: seedData.project,
	},
] );

export function resolveStudioFixture( fixture: string | null | undefined ): DemoStudioFixture {
	return fixture === 'dense-200' || fixture === 'dense-500' ? fixture : 'default';
}

function createStudioDataForFixture( fixture: DemoStudioFixture ): DemoStudioData {
	return fixture === 'default'
		? seedData
		: createDemoStudioData( { fixture } );
}

export async function loadStudioProject( options: LoadStudioProjectOptions = {} ): Promise<DemoStudioData & { projectId: string; fixture: DemoStudioFixture }> {
	const fixture = options.fixture ?? 'default';
	const repositoryProject = fixture === 'default' ? await repository.getProject( STUDIO_PROJECT_ID ) : null;
	if ( fixture === 'default' && !repositoryProject ) {
		await repository.saveProject( STUDIO_PROJECT_ID, seedData.project );
	}

	const studioData = createStudioDataForFixture( fixture );
	return {
		...studioData,
		projectId: STUDIO_PROJECT_ID,
		fixture,
		project: parseBuilderPackage( toJsonSnapshot( fixture === 'default' ? ( repositoryProject ?? seedData.project ) : studioData.project ) ),
	};
}

export async function persistStudioProject( projectId: string, project: BuilderPackage ): Promise<void> {
	await repository.saveProject( projectId, parseBuilderPackage( toJsonSnapshot( project ) ) );
}

export interface PersistStudioProjectSnapshotOptions {
	expectedVersionToken?: string;
	force?: boolean;
}

export async function persistStudioProjectSnapshot( projectId: string, project: BuilderPackage, options: PersistStudioProjectSnapshotOptions = {} ): Promise<ProjectSnapshotSaveResult> {
	if ( repository.saveProjectSnapshot ) {
		return repository.saveProjectSnapshot( projectId, parseBuilderPackage( toJsonSnapshot( project ) ), options );
	}

	await repository.saveProject( projectId, parseBuilderPackage( toJsonSnapshot( project ) ) );
	const nextProject = await getStudioRepositoryProject( projectId );
	return {
		project: nextProject ?? project,
		versionToken: crypto.randomUUID(),
		updatedAt: new Date().toISOString(),
	};
}

export async function getStudioRepositoryProject( projectId: string ): Promise<BuilderPackage | null> {
	const project = await repository.getProject( projectId );
	return project ? parseBuilderPackage( toJsonSnapshot( project ) ) : null;
}

export async function getStudioProjectStatus( projectId: string ): Promise<ProjectSnapshotStatus | null> {
	return repository.getProjectStatus?.( projectId ) ?? null;
}

export async function listStudioProjectRevisions( projectId: string, documentId?: string ) {
	return repository.listRevisions?.( projectId, documentId ) ?? ( await getStudioRepositoryProject( projectId ) )?.revisions ?? [];
}

function toJsonSnapshot<T>( value: T ): T {
	return JSON.parse( JSON.stringify( value ) ) as T;
}
