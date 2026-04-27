import { describe, expect, it } from 'vitest';

import {
	createBuilderPackage,
	createDocument,
	createNode,
	createThemeAssignment,
} from '@builder/schema';
import { InMemoryBuilderDocumentRepository } from '../src/lib/server/repository';

type SummaryProject = ReturnType<typeof createBuilderPackage>;

function inferMode( document: SummaryProject['documents'][ number ] ): string {
	if ( document.kind === 'component' ) {
		return 'component-master';
	}

	if ( document.kind === 'kit' ) {
		return 'site-settings';
	}

	if ( document.kind === 'library-item' ) {
		return 'library';
	}

	const containsCompat = ( nodes: SummaryProject['documents'][ number ]['root'] ): boolean => {
		for ( const node of nodes ) {
			if ( node.type === 'compat-widget' || node.legacy ) {
				return true;
			}
			if ( containsCompat( node.children ) ) {
				return true;
			}
			for ( const slotNodes of Object.values( node.slots ) ) {
				if ( containsCompat( slotNodes ) ) {
					return true;
				}
			}
		}

		return false;
	};

	return containsCompat( document.root ) ? 'legacy-compat' : document.kind;
}

describe( 'reference studio summary shell', () => {
	it( 'organizes documents, lifecycle state, assignments, and diagnostics for the shell', () => {
		const page = createDocument( 'page', 'Marketing Landing', 'marketing-landing' );
		page.root = [
			createNode( {
				type: 'container',
				children: [
					createNode( { type: 'heading', props: { text: 'Hero', level: 'h1' } } ),
					createNode( { type: 'compat-widget', legacy: { widgetType: 'testimonial', rawSettings: {}, editable: true }, props: { title: 'Legacy testimonial' } } ),
				],
			} ),
		];

		const layout = createDocument( 'layout', 'Global Header', 'global-header' );
		const template = createDocument( 'template', 'Single Post Template', 'single-post-template' );
		const component = createDocument( 'component', 'Hero Component', 'hero-component' );
		component.component = {
			lockedStructure: true,
			exposedProperties: [
				{ id: 'hero-title', nodeId: 'hero-title-node', label: 'Hero title', propPath: 'text', type: 'text' },
			],
		};
		const popup = createDocument( 'popup', 'Newsletter Popup', 'newsletter-popup' );
		const kit = createDocument( 'kit', 'Default Site Kit', 'default-site-kit' );
		const libraryItem = createDocument( 'library-item', 'FAQ Section Library Item', 'faq-section-library-item' );

		const project = createBuilderPackage( 'Reference Studio', [ page, layout, template, component, popup, kit, libraryItem ], [
			createThemeAssignment( { documentId: layout.id, slot: 'header', status: 'published', pathname: '/[...all]', label: 'Global header' } ),
			createThemeAssignment( { documentId: page.id, slot: 'page', status: 'draft', pathname: '/marketing-landing', label: 'Marketing landing' } ),
			createThemeAssignment( { documentId: popup.id, slot: 'popup', status: 'published', pathname: '/marketing-landing', label: 'Newsletter popup' } ),
			createThemeAssignment( { documentId: template.id, slot: 'page', status: 'draft', pathname: '/blog/[...slug]', label: 'Single post' } ),
			createThemeAssignment( { documentId: libraryItem.id, slot: 'loop-item', status: 'draft', label: 'FAQ section' } ),
		] );

		project.revisions = [
			{ id: 'rev-1', documentId: page.id, kind: 'draft', label: 'Draft page', createdAt: '2026-04-17T10:00:00.000Z', meta: {} },
			{ id: 'rev-2', documentId: page.id, kind: 'autosave', label: 'Autosave page', createdAt: '2026-04-17T10:05:00.000Z', meta: {} },
			{ id: 'rev-3', documentId: template.id, kind: 'published', label: 'Published template', createdAt: '2026-04-16T09:15:00.000Z', meta: {} },
		];

		const kindGroups = [ 'page', 'layout', 'template', 'component', 'popup', 'kit', 'library-item' ]
			.filter( ( kind ) => project.documents.some( ( document ) => document.kind === kind ) );
		const modeGroups = [ 'page', 'layout', 'template', 'component-master', 'popup', 'site-settings', 'library', 'legacy-compat' ]
			.filter( ( mode ) => project.documents.some( ( document ) => inferMode( document ) === mode ) );
		const revisionCounts = {
			draft: project.revisions.filter( ( revision ) => revision.kind === 'draft' ).length,
			autosave: project.revisions.filter( ( revision ) => revision.kind === 'autosave' ).length,
			published: project.revisions.filter( ( revision ) => revision.kind === 'published' ).length,
		};
		const assignmentSlots = project.themeAssignments.map( ( assignment ) => assignment.slot );

		expect( kindGroups ).toEqual( expect.arrayContaining( [ 'page', 'layout', 'template', 'component', 'popup', 'kit', 'library-item' ] ) );
		expect( modeGroups ).toEqual( expect.arrayContaining( [ 'layout', 'template', 'component-master', 'popup', 'site-settings', 'library', 'legacy-compat' ] ) );
		expect( revisionCounts ).toMatchObject( { draft: 1, autosave: 1, published: 1 } );
		expect( assignmentSlots ).toEqual( expect.arrayContaining( [ 'header', 'page', 'popup', 'loop-item' ] ) );
		expect( project.themeAssignments.some( ( assignment ) => assignment.status === 'published' ) ).toBe( true );
		expect( project.documents.some( ( document ) => document.kind === 'component' && document.component?.exposedProperties.length ) ).toBe( true );
		expect( project.documents.some( ( document ) => inferMode( document ) === 'legacy-compat' ) ).toBe( true );
	} );

	it( 'stores versioned snapshots and reports optimistic save conflicts', async () => {
		const page = createDocument( 'page', 'Home', 'home' );
		page.root = [ createNode( { id: 'heading', type: 'heading', props: { text: 'Version one' } } ) ];
		const project = createBuilderPackage( 'Reference Studio', [ page ] );
		const repository = new InMemoryBuilderDocumentRepository( [ { id: 'project', project } ] );
		const initial = await repository.getProjectStatus( 'project' );

		const draft = structuredClone( project );
		draft.revisions.push( {
			id: 'draft-revision',
			documentId: page.id,
			kind: 'draft',
			label: 'Draft',
			createdAt: '2026-04-25T12:00:00.000Z',
			meta: { documentSnapshot: draft.documents[ 0 ] },
		} );
		const saved = await repository.saveProjectSnapshot( 'project', draft, { expectedVersionToken: initial?.versionToken } );
		const conflict = await repository.saveProjectSnapshot( 'project', project, { expectedVersionToken: initial?.versionToken } );

		expect( saved.conflict ).toBeUndefined();
		expect( saved.versionToken ).not.toBe( initial?.versionToken );
		expect( conflict.conflict ).toBe( true );
		expect( ( await repository.listRevisions( 'project', page.id ) ) ).toHaveLength( 1 );
	} );
} );
