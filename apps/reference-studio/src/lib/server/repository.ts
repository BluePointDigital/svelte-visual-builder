import type { BuilderDocument, BuilderPackage, DesignSystem, DocumentRevision } from '@builder/schema';

export interface BuilderDocumentRepository {
	getProject( projectId: string ): Promise<BuilderPackage | null>;
	saveProject( projectId: string, project: BuilderPackage ): Promise<void>;
	saveProjectSnapshot?( projectId: string, project: BuilderPackage, options: ProjectSnapshotSaveOptions ): Promise<ProjectSnapshotSaveResult>;
	getProjectStatus?( projectId: string ): Promise<ProjectSnapshotStatus | null>;
	listRevisions?( projectId: string, documentId?: string ): Promise<DocumentRevision[]>;
	restoreRevision?( projectId: string, revisionId: string, documentId?: string ): Promise<ProjectSnapshotSaveResult | null>;
	saveDocument( projectId: string, document: BuilderDocument ): Promise<void>;
	saveDesignSystem( projectId: string, designSystem: DesignSystem ): Promise<void>;
}

export interface ProjectSnapshotStatus {
	versionToken: string;
	updatedAt: string;
}

export interface ProjectSnapshotSaveOptions {
	expectedVersionToken?: string;
	force?: boolean;
}

export interface ProjectSnapshotSaveResult extends ProjectSnapshotStatus {
	project: BuilderPackage;
	conflict?: boolean;
}

export class InMemoryBuilderDocumentRepository implements BuilderDocumentRepository {
	#projects = new Map<string, BuilderPackage>();
	#statuses = new Map<string, ProjectSnapshotStatus>();

	constructor( initialProjects: Array<{ id: string; project: BuilderPackage }> = [] ) {
		for ( const entry of initialProjects ) {
			this.#projects.set( entry.id, entry.project );
			this.#statuses.set( entry.id, createProjectSnapshotStatus() );
		}
	}

	async getProject( projectId: string ): Promise<BuilderPackage | null> {
		const project = structuredClone( this.#projects.get( projectId ) ?? null );
		return project ? attachPersistenceMeta( project, this.#statuses.get( projectId ) ) : null;
	}

	async saveProject( projectId: string, project: BuilderPackage ): Promise<void> {
		const result = await this.saveProjectSnapshot( projectId, project, { force: true } );
		this.#statuses.set( projectId, { versionToken: result.versionToken, updatedAt: result.updatedAt } );
	}

	async saveProjectSnapshot( projectId: string, project: BuilderPackage, options: ProjectSnapshotSaveOptions = {} ): Promise<ProjectSnapshotSaveResult> {
		const currentStatus = this.#statuses.get( projectId ) ?? createProjectSnapshotStatus();
		const currentProject = this.#projects.get( projectId );
		if ( !options.force && options.expectedVersionToken && options.expectedVersionToken !== currentStatus.versionToken ) {
			return {
				...currentStatus,
				project: attachPersistenceMeta( structuredClone( currentProject ?? project ), currentStatus ),
				conflict: true,
			};
		}

		const nextStatus = createProjectSnapshotStatus();
		const nextProject = attachPersistenceMeta( structuredClone( project ), nextStatus );
		this.#projects.set( projectId, nextProject );
		this.#statuses.set( projectId, nextStatus );
		return {
			...nextStatus,
			project: structuredClone( nextProject ),
		};
	}

	async getProjectStatus( projectId: string ): Promise<ProjectSnapshotStatus | null> {
		return this.#statuses.get( projectId ) ?? null;
	}

	async listRevisions( projectId: string, documentId?: string ): Promise<DocumentRevision[]> {
		const project = this.#projects.get( projectId );
		const revisions = project?.revisions ?? [];
		return structuredClone(
			( documentId ? revisions.filter( ( revision ) => revision.documentId === documentId ) : revisions )
				.sort( ( left, right ) => right.createdAt.localeCompare( left.createdAt ) ),
		);
	}

	async restoreRevision( projectId: string, revisionId: string, documentId?: string ): Promise<ProjectSnapshotSaveResult | null> {
		const project = structuredClone( this.#projects.get( projectId ) ?? null );
		if ( !project ) {
			return null;
		}

		const revision = project.revisions.find( ( entry ) => entry.id === revisionId && ( !documentId || entry.documentId === documentId ) );
		const snapshot = revision?.meta.documentSnapshot;
		if ( !revision || !snapshot || typeof snapshot !== 'object' || Array.isArray( snapshot ) ) {
			return null;
		}

		project.documents = project.documents.map( ( document ) => document.id === revision.documentId
			? structuredClone( snapshot as BuilderDocument )
			: document );
		return this.saveProjectSnapshot( projectId, project, { force: true } );
	}

	async saveDocument( projectId: string, document: BuilderDocument ): Promise<void> {
		const project = this.#projects.get( projectId );
		if ( ! project ) {
			return;
		}

		project.documents = project.documents.map( ( entry ) => entry.id === document.id ? document : entry );
	}

	async saveDesignSystem( projectId: string, designSystem: DesignSystem ): Promise<void> {
		const project = this.#projects.get( projectId );
		if ( ! project ) {
			return;
		}

		project.designSystem = designSystem;
	}
}

export interface PrismaProjectRecord {
	id: string;
	name: string;
	projectJson: BuilderPackage;
	versionToken?: string;
	updatedAt?: string | Date;
}

export interface PrismaLikeClient {
	project: {
		findUnique: ( args: { where: { id: string } } ) => Promise<PrismaProjectRecord | null>;
		update: ( args: { where: { id: string }; data: { projectJson: BuilderPackage; versionToken?: string; updatedAt?: Date } } ) => Promise<PrismaProjectRecord>;
	};
}

export class PrismaBuilderDocumentRepository implements BuilderDocumentRepository {
	constructor( private readonly prisma: PrismaLikeClient ) {}

	async getProject( projectId: string ): Promise<BuilderPackage | null> {
		const record = await this.prisma.project.findUnique( { where: { id: projectId } } );
		return record?.projectJson ?? null;
	}

	async saveProject( projectId: string, project: BuilderPackage ): Promise<void> {
		await this.saveProjectSnapshot( projectId, project, { force: true } );
	}

	async saveProjectSnapshot( projectId: string, project: BuilderPackage, options: ProjectSnapshotSaveOptions = {} ): Promise<ProjectSnapshotSaveResult> {
		const current = await this.prisma.project.findUnique( { where: { id: projectId } } );
		const currentToken = current?.versionToken ?? readPersistenceVersionToken( current?.projectJson ) ?? '';
		if ( !options.force && options.expectedVersionToken && options.expectedVersionToken !== currentToken ) {
			const currentStatus = {
				versionToken: currentToken,
				updatedAt: normalizeUpdatedAt( current?.updatedAt ) ?? new Date().toISOString(),
			};
			return {
				...currentStatus,
				project: attachPersistenceMeta( current?.projectJson ?? project, currentStatus ),
				conflict: true,
			};
		}

		const nextStatus = createProjectSnapshotStatus();
		const record = await this.prisma.project.update( {
			where: { id: projectId },
			data: { projectJson: attachPersistenceMeta( project, nextStatus ), versionToken: nextStatus.versionToken, updatedAt: new Date( nextStatus.updatedAt ) },
		} );
		return {
			versionToken: record.versionToken ?? nextStatus.versionToken,
			updatedAt: normalizeUpdatedAt( record.updatedAt ) ?? nextStatus.updatedAt,
			project: record.projectJson,
		};
	}

	async getProjectStatus( projectId: string ): Promise<ProjectSnapshotStatus | null> {
		const record = await this.prisma.project.findUnique( { where: { id: projectId } } );
		if ( !record ) {
			return null;
		}

		return {
			versionToken: record.versionToken ?? readPersistenceVersionToken( record.projectJson ) ?? '',
			updatedAt: normalizeUpdatedAt( record.updatedAt ) ?? new Date().toISOString(),
		};
	}

	async listRevisions( projectId: string, documentId?: string ): Promise<DocumentRevision[]> {
		const project = await this.getProject( projectId );
		const revisions = project?.revisions ?? [];
		return ( documentId ? revisions.filter( ( revision ) => revision.documentId === documentId ) : revisions )
			.sort( ( left, right ) => right.createdAt.localeCompare( left.createdAt ) );
	}

	async saveDocument( projectId: string, document: BuilderDocument ): Promise<void> {
		const project = await this.getProject( projectId );
		if ( ! project ) {
			return;
		}

		project.documents = project.documents.map( ( entry ) => entry.id === document.id ? document : entry );
		await this.saveProject( projectId, project );
	}

	async saveDesignSystem( projectId: string, designSystem: DesignSystem ): Promise<void> {
		const project = await this.getProject( projectId );
		if ( ! project ) {
			return;
		}

		project.designSystem = designSystem;
		await this.saveProject( projectId, project );
	}
}

function createProjectSnapshotStatus(): ProjectSnapshotStatus {
	return {
		versionToken: crypto.randomUUID(),
		updatedAt: new Date().toISOString(),
	};
}

function attachPersistenceMeta<T extends BuilderPackage>( project: T, status: ProjectSnapshotStatus | undefined ): T {
	if ( !status ) {
		return project;
	}

	return {
		...project,
		meta: {
			...project.meta,
			persistence: {
				...( typeof project.meta.persistence === 'object' && project.meta.persistence && !Array.isArray( project.meta.persistence ) ? project.meta.persistence : {} ),
				versionToken: status.versionToken,
				updatedAt: status.updatedAt,
			},
		},
	};
}

function readPersistenceVersionToken( project: BuilderPackage | undefined ): string | undefined {
	const persistence = project?.meta.persistence;
	return typeof persistence === 'object' && persistence && !Array.isArray( persistence ) && typeof persistence.versionToken === 'string'
		? persistence.versionToken
		: undefined;
}

function normalizeUpdatedAt( value: string | Date | undefined ): string | undefined {
	if ( value instanceof Date ) {
		return value.toISOString();
	}

	return value;
}
