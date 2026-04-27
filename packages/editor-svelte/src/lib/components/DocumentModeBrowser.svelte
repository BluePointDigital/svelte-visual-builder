<script lang="ts">
	import type { BuilderDocument, EditorMode } from '@builder/schema';
	import EditorShellIcon from './EditorShellIcon.svelte';
	import EditorShellTokens from './EditorShellTokens.svelte';

	export let documents: BuilderDocument[] = [];
	export let activeDocumentId = '';
	export let activeMode: EditorMode = 'page';
	export let onOpenDocument: ( documentId: string, mode?: EditorMode ) => void = () => {};

	type DocumentBucket = {
		kind: BuilderDocument['kind'];
		label: string;
		description: string;
		modeLabel: string;
		documents: BuilderDocument[];
	};

	$: groupedDocuments = buildDocumentBuckets( documents );

	function buildDocumentBuckets( source: BuilderDocument[] ): DocumentBucket[] {
		const buckets = new Map<BuilderDocument['kind'], DocumentBucket>();

		for ( const document of source ) {
			if ( !buckets.has( document.kind ) ) {
				buckets.set( document.kind, {
					kind: document.kind,
					label: formatKindLabel( document.kind ),
					description: describeDocumentKind( document.kind ),
					modeLabel: describeOpenAction( document ),
					documents: [],
				} );
			}

			buckets.get( document.kind )?.documents.push( document );
		}

		return [ ...buckets.values() ];
	}

	function formatKindLabel( kind: BuilderDocument['kind'] ) {
		switch ( kind ) {
			case 'library-item':
				return 'Library';
			case 'kit':
				return 'Kit';
			default:
				return `${ kind.charAt( 0 ).toUpperCase() }${ kind.slice( 1 ) }s`;
		}
	}

	function describeDocumentKind( kind: BuilderDocument['kind'] ) {
		switch ( kind ) {
			case 'layout':
				return 'Shared site parts and global structure';
			case 'template':
				return 'Conditional route-based templates';
			case 'component':
				return 'Reusable masters with instance overrides';
			case 'popup':
				return 'Overlay and modal experiences';
			case 'library-item':
				return 'Saved reusable snippets';
			case 'kit':
				return 'Global design system and theme defaults';
			default:
				return 'Primary authored content documents';
		}
	}

	function inferDocumentMode( document: BuilderDocument ): EditorMode {
		if ( containsLegacyCompat( document.root ) ) {
			return 'legacy-compat';
		}

		switch ( document.kind ) {
			case 'layout':
				return 'layout';
			case 'template':
				return 'template';
			case 'component':
				return 'component-master';
			case 'popup':
				return 'popup';
			default:
				return 'page';
		}
	}

	function containsLegacyCompat( nodes: BuilderDocument['root'] ): boolean {
		for ( const node of nodes ) {
			if ( node.legacy ) {
				return true;
			}

			if ( node.children.length && containsLegacyCompat( node.children ) ) {
				return true;
			}

			for ( const slotNodes of Object.values( node.slots ) as BuilderDocument['root'][] ) {
				if ( containsLegacyCompat( slotNodes ) ) {
					return true;
				}
			}
		}

		return false;
	}

	function describeOpenAction( document: BuilderDocument ) {
		switch ( inferDocumentMode( document ) ) {
			case 'layout':
				return 'Open layout';
			case 'template':
				return 'Open template';
			case 'component-master':
				return 'Open master';
			case 'popup':
				return 'Open popup';
			case 'legacy-compat':
				return 'Open compat';
			default:
				return 'Open page';
		}
	}

	function openDocument( document: BuilderDocument ) {
		onOpenDocument( document.id, inferDocumentMode( document ) );
	}
</script>

<EditorShellTokens>
	<section class="document-browser-card">
		<div class="document-browser-card__header">
			<div class="document-browser-card__heading">
				<span class="builder-shell-icon-badge">
					<EditorShellIcon name="document-browser" title="Document browser" />
				</span>
				<div>
					<h2>Document Browser</h2>
					<p>Open any document in its intended editing mode without leaving the builder shell.</p>
				</div>
			</div>
			<div class="document-browser-card__status">
				<span>Active mode</span>
				<strong>{activeMode}</strong>
			</div>
		</div>

		<div class="document-browser-card__groups">
			{#each groupedDocuments as bucket (bucket.kind)}
				<section class="document-browser-card__group builder-shell-card builder-shell-card--subtle">
					<header>
						<h3>{bucket.label}</h3>
						<p>{bucket.description}</p>
					</header>

					<div class="document-browser-card__list">
						{#each bucket.documents as document (document.id)}
							<article class:active={document.id === activeDocumentId} class="document-browser-card__item builder-shell-card">
								<div class="document-browser-card__meta">
									<span class="builder-shell-badge builder-shell-badge--neutral">{document.kind}</span>
									<strong>{document.title}</strong>
									<small>/{document.slug}</small>
								</div>
								<div class="document-browser-card__actions">
									<button class="builder-shell-button builder-shell-button--primary" type="button" onclick={() => openDocument( document )}>
										{describeOpenAction( document )}
									</button>
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</section>
</EditorShellTokens>

<style>
	.document-browser-card {
		display: grid;
		gap: var(--builder-shell-space-16);
	}

	.document-browser-card__header,
	.document-browser-card__heading,
	.document-browser-card__status,
	.document-browser-card__group header,
	.document-browser-card__item {
		display: flex;
		gap: var(--builder-shell-space-16);
		align-items: start;
	}

	.document-browser-card__header,
	.document-browser-card__group header,
	.document-browser-card__item {
		justify-content: space-between;
	}

	.document-browser-card__heading {
		flex: 1;
	}

	.document-browser-card__header h2,
	.document-browser-card__header p,
	.document-browser-card__group h3,
	.document-browser-card__group p,
	.document-browser-card__status span,
	.document-browser-card__status strong,
	.document-browser-card__meta strong,
	.document-browser-card__meta small,
	.document-browser-card__meta span {
		margin: 0;
	}

	.document-browser-card__header p,
	.document-browser-card__group p,
	.document-browser-card__meta small,
	.document-browser-card__meta span {
		color: var(--builder-shell-text-muted);
	}

	.document-browser-card__status {
		flex-direction: column;
		align-items: end;
		padding: var(--builder-shell-space-10) var(--builder-shell-space-12);
		border-radius: var(--builder-shell-radius);
		border: 1px solid var(--builder-shell-bg-dark-alt);
		background: var(--builder-shell-bg-dark);
		color: var(--builder-shell-bar-text);
		box-shadow: var(--builder-shell-shadow-card);
		min-width: 9rem;
	}

	.document-browser-card__status span {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--builder-shell-gray-200);
	}

	.document-browser-card__groups {
		display: grid;
		gap: var(--builder-shell-space-12);
	}

	.document-browser-card__group {
		display: grid;
		gap: var(--builder-shell-space-12);
		padding: var(--builder-shell-space-16);
	}

	.document-browser-card__list {
		display: grid;
		gap: var(--builder-shell-space-10);
	}

	.document-browser-card__item {
		padding: var(--builder-shell-space-12);
	}

	.document-browser-card__item.active {
		border-color: var(--builder-shell-accent);
		background: var(--builder-shell-accent-surface);
	}

	.document-browser-card__meta {
		display: grid;
		gap: var(--builder-shell-space-5);
	}

	.document-browser-card__meta span {
		width: fit-content;
	}

	.document-browser-card__actions {
		display: flex;
		align-items: center;
	}

	@media (max-width: 900px) {
		.document-browser-card__header,
		.document-browser-card__heading,
		.document-browser-card__group header,
		.document-browser-card__item {
			flex-direction: column;
		}

		.document-browser-card__status {
			align-items: start;
		}
	}
</style>
