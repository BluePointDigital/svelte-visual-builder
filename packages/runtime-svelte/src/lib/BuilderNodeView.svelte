<script lang="ts">
	import { getContext } from 'svelte';

	import type { BuilderInlineEditingMode } from '@builder/core';
	import { resolveBuilderInlineEditingMode } from '@builder/core';
	import BuilderNodeView from './BuilderNodeView.svelte';
	import type { BuilderNode, JsonValue } from '@builder/schema';
	import type {
		BuilderRenderModel,
		RuntimeAccordionItem,
		RuntimeCarouselSlide,
		RuntimeFormFieldShell,
		RuntimeGalleryImage,
		RuntimeMenuItem,
		RuntimePopupBehavior,
		RuntimeTabItem,
	} from './runtime';
	import {
		expandComponentInstance,
		getElementDefinition,
		getNodeClassNames,
		getNodeStyle,
		isNativeFormFieldNode,
		isNodeVisible,
		mergeNodeClassAttribute,
		resolveAccordionItems,
		resolveCarouselSlides,
		resolveCollectionRecords,
		resolveFormFieldShell,
		resolveGalleryImages,
		resolveGeneratedFormFieldShells,
		resolveInitialAccordionIndexes,
		resolveInitialTabIndex,
		resolveMenuItems,
		resolveNodeAttributes,
		resolveNodeProps,
		resolvePopupBehavior,
		resolveTabItems,
	} from './runtime';
	import type {
		BuilderCanvasGeometryEmitter,
		BuilderGeometryNodeMeta,
		BuilderGeometrySlotMeta,
	} from './geometry';
	import { BUILDER_GEOMETRY_CONTEXT } from './geometry';

	let {
		node,
		model,
		documentId,
		parentId = undefined,
		slot = undefined,
		index = 0,
		rootSlot = undefined,
		bridgeEvents = false,
		overlayIsTopmost = true,
		record = undefined,
	}: {
		node: BuilderNode;
		model: BuilderRenderModel;
		documentId: string;
		parentId?: string;
		slot?: string;
		index?: number;
		rootSlot?: string;
		bridgeEvents?: boolean;
		overlayIsTopmost?: boolean;
		record?: Record<string, unknown>;
	} = $props();

	const geometryEmitter = getContext<BuilderCanvasGeometryEmitter | undefined>( BUILDER_GEOMETRY_CONTEXT );

	const definition = $derived( getElementDefinition( node, model ) );
	const resolvedProps = $derived( resolveNodeProps( node, model, record ) );
	const resolvedAttributes = $derived( resolveNodeAttributes( node, model, record ) );
	const nodeStyle = $derived( getNodeStyle( node, model, record ) );
	const nodeClasses = $derived( getNodeClassNames( node, model ) );
	const visible = $derived( isNodeVisible( node, model, record ) );
	const slotDefinitions = $derived( definition?.runtime.slots ?? [] );
	const slotIds = $derived( slotDefinitions.map( ( entry ) => entry.id ) );
	const acceptsChildren = $derived( ( definition?.runtime.acceptsChildren ?? false ) || node.children.length > 0 || slotIds.length > 0 );
	const isContainerSurface = $derived( node.type === 'container' || node.type === 'grid-container' );
	const hasInlineTextContent = $derived( typeof resolvedProps.text === 'string' && resolvedProps.text.trim().length > 0 );
	const hasCustomContainerPadding = $derived( isContainerSurface && Boolean( node.styles.base?.padding ) );
	const defaultContainerPadding = 'padding: 20px;';
	const containerStyle = $derived(
		hasCustomContainerPadding
			? nodeStyle
			: isContainerSurface
				? [ nodeStyle, defaultContainerPadding ].filter( Boolean ).join( ' ' )
				: nodeStyle,
	);
	const shouldShowContainerDropPlaceholder = $derived( isContainerSurface && !node.children.length && !slotDefinitions.length && !hasInlineTextContent );
	const inlineEditingMode = $derived<BuilderInlineEditingMode | undefined>(
		resolveBuilderInlineEditingMode( node.type, definition?.runtime.supportsInlineEditing ),
	);
	const inlineEditable = $derived( Boolean( inlineEditingMode ) );
	const expandedComponentRoots = $derived( node.type === 'component-instance' ? expandComponentInstance( node, model ) : [] );
	const expandedComponentDocumentId = $derived(
		node.type === 'component-instance'
			? String( node.props.componentId ?? '' ) || documentId
			: documentId,
	);
	const tabItems = $derived( resolveTabItems( node, resolvedProps ) );
	const accordionItems = $derived( resolveAccordionItems( node, resolvedProps ) );
	const menuItems = $derived( resolveMenuItems( resolvedProps ) );
	const galleryImages = $derived( resolveGalleryImages( resolvedProps ) );
	const carouselSlides = $derived( resolveCarouselSlides( resolvedProps ) );
	const popupBehavior = $derived( resolvePopupBehavior( resolvedProps ) );
	const collectionRecords = $derived( node.type === 'loop' ? resolveCollectionRecords( node, model ) : [] );
	const generatedFormFields = $derived( resolveGeneratedFormFieldShells( resolvedProps ) );
	const directFormFieldShell = $derived( isNativeFormFieldNode( node ) ? resolveFormFieldShell( node, resolvedProps ) : undefined );
	const childFieldNodes = $derived( node.type === 'form' ? node.children.filter( ( child: BuilderNode ) => isNativeFormFieldNode( child ) ) : [] );
	const nodeGeometry = $derived( {
		nodeId: node.id,
		documentId,
		nodeType: node.type,
		parentId,
		slot,
		index,
		acceptsChildren,
		slotIds,
		editable: inlineEditable,
	} satisfies BuilderGeometryNodeMeta );

	let activeTabIndex = $state( 0 );
	let openAccordionIndexes = $state<number[]>( [] );
	let carouselIndex = $state( 0 );
	let popupOpen = $state( true );
	let formStatus = $state<'idle' | 'success'>( 'idle' );

	$effect( () => {
		activeTabIndex = resolveInitialTabIndex( node, resolvedProps );
	} );

	$effect( () => {
		openAccordionIndexes = resolveInitialAccordionIndexes( node, resolvedProps );
	} );

	$effect( () => {
		carouselIndex = 0;
	} );

	$effect( () => {
		popupOpen = true;
		formStatus = 'idle';
	} );

	function handleSelect( event: MouseEvent ) {
		void event;
	}

	function handleHoverEnter( event: PointerEvent ) {
		void event;
	}

	function handleHoverLeave() {
		return;
	}

	function getAttributeBag( extra: Record<string, string | undefined> = {} ) {
		const { class: extraClass, ...extraAttributes } = extra;
		const className = compactClassName( [
			'builder-node',
			`builder-node--${ node.type }`,
			nodeClasses,
			extraClass,
		] );

		return compactAttributes( {
			...mergeNodeClassAttribute( resolvedAttributes, className ),
			...extraAttributes,
			style: extraAttributes.style ?? nodeStyle,
			'data-builder-node': node.id,
			'data-builder-type': node.type,
			'data-builder-document': documentId,
			'data-builder-parent': parentId,
			'data-builder-slot': slot,
			'data-builder-root-slot': rootSlot,
			'data-builder-index': String( index ),
			'data-builder-accepts-children': String( acceptsChildren ),
			'data-builder-empty-container': String( shouldShowContainerDropPlaceholder ),
			'data-builder-slot-ids': slotIds.join( ',' ),
			'data-builder-editable': String( inlineEditable ),
			'data-builder-inline-mode': inlineEditingMode,
		} );
	}

	function renderPlainText( value: JsonValue | undefined ): string {
		return typeof value === 'string' ? value : String( value ?? '' );
	}

	function toggleAccordionIndex( nextIndex: number ) {
		if ( node.type === 'toggle' ) {
			openAccordionIndexes = openAccordionIndexes.includes( nextIndex )
				? openAccordionIndexes.filter( ( value ) => value !== nextIndex )
				: [ ...openAccordionIndexes, nextIndex ];
			return;
		}

		openAccordionIndexes = openAccordionIndexes.includes( nextIndex ) ? [] : [ nextIndex ];
	}

	function cycleCarousel( direction: -1 | 1 ) {
		if ( !carouselSlides.length ) {
			carouselIndex = 0;
			return;
		}

		carouselIndex = ( carouselIndex + direction + carouselSlides.length ) % carouselSlides.length;
	}

	function submitForm( event: SubmitEvent ) {
		event.preventDefault();
		formStatus = 'success';
	}

	function dismissPopup() {
		popupOpen = false;
	}

	function handlePopupOverlayClick() {
		if ( popupBehavior.closeOnOverlay ) {
			dismissPopup();
		}
	}

	function compactAttributes( attributes: Record<string, string | undefined> ): Record<string, string> {
		return Object.fromEntries(
			Object.entries( attributes ).filter( ( [ , value ] ) => value !== undefined && value !== '' ),
		) as Record<string, string>;
	}

	function compactClassName(values: Array<string | undefined>): string {
		return values.filter( Boolean ).join( ' ' );
	}

	function isAccordionItemOpen(indexToCheck: number): boolean {
		return openAccordionIndexes.includes( indexToCheck );
	}

	function getPopupDialogStyle(): string {
		const overlayColor = renderPlainText( resolvedProps.overlayBackdrop ) || 'rgba(15, 23, 42, 0.45)';
		const width = renderPlainText( popupBehavior.width ) || '720px';
		return [
			`--builder-popup-prop-width:${ width };`,
			`--builder-popup-overlay:${ overlayColor };`,
		].join( ' ' );
	}

	function getCollectionRecordKey(recordValue: Record<string, unknown>, recordIndex: number): string {
		const candidate = recordValue.id ?? recordValue.slug ?? recordValue.title;
		return typeof candidate === 'string' || typeof candidate === 'number'
			? `${ node.id }-${ candidate }`
			: `${ node.id }-record-${ recordIndex }`;
	}

	function bindNodeGeometry( element: HTMLElement, meta: BuilderGeometryNodeMeta ) {
		return geometryEmitter?.registerNode( element, meta );
	}

	function bindSlotGeometry( element: HTMLElement, meta: BuilderGeometrySlotMeta ) {
		return geometryEmitter?.registerSlot( element, meta );
	}

	function createSlotGeometryMeta( slotId: string | undefined, acceptsMultiple = true, childNodeIds: string[] = [] ): BuilderGeometrySlotMeta {
		return {
			documentId,
			ownerId: node.id,
			slot: slotId,
			acceptsMultiple,
			isRoot: false,
			childNodeIds,
		};
	}

	function resolveHeadingTag( value: JsonValue ) {
		const candidate = renderPlainText( value );
		return [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ].includes( candidate ) ? candidate : 'h2';
	}
</script>

{#if visible}
	{#if node.type === 'component-instance'}
		<div
			{...getAttributeBag( { class: compactClassName( [ 'builder-node', 'builder-node--component-instance', nodeClasses ] ) } )}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<div class="builder-component-instance__inner">
				{#each expandedComponentRoots as componentRoot, componentIndex (componentRoot.id)}
					<BuilderNodeView
						node={componentRoot}
						{model}
						documentId={expandedComponentDocumentId}
						parentId={node.id}
						index={componentIndex}
						rootSlot={rootSlot}
						bridgeEvents={false}
						record={record}
					/>
				{/each}
			</div>
		</div>
	{:else if node.type === 'heading'}
		<svelte:element
			this={resolveHeadingTag( resolvedProps.level )}
			{...getAttributeBag( { 'data-builder-inline-content': inlineEditable ? 'true' : undefined } )}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>{@html renderPlainText( resolvedProps.text )}</svelte:element>
	{:else if node.type === 'paragraph'}
		<p
			{...getAttributeBag( { 'data-builder-inline-content': inlineEditable ? 'true' : undefined } )}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>{@html renderPlainText( resolvedProps.text )}</p>
	{:else if node.type === 'text-editor'}
		<div
			{...getAttributeBag( { 'data-builder-inline-content': inlineEditable ? 'true' : undefined } )}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>{@html renderPlainText( resolvedProps.text )}</div>
	{:else if node.type === 'blockquote'}
		<blockquote
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<p
				data-builder-inline-content={inlineEditable ? 'true' : undefined}
			>{@html renderPlainText( resolvedProps.text )}</p>
			{#if renderPlainText( resolvedProps.cite )}
				<cite>{renderPlainText( resolvedProps.cite )}</cite>
			{/if}
		</blockquote>
	{:else if node.type === 'image'}
		<img
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			src={renderPlainText( resolvedProps.src )}
			alt={renderPlainText( resolvedProps.alt )}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		/>
	{:else if node.type === 'button'}
		<a
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			href={renderPlainText( resolvedProps.href ) || '#'}
			role="button"
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>{renderPlainText( resolvedProps.text ) || 'Button'}</a>
	{:else if node.type === 'divider'}
		<hr
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		/>
	{:else if node.type === 'video'}
		<div
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<video controls src={renderPlainText( resolvedProps.src )}>
				<track kind="captions" />
			</video>
		</div>
	{:else if node.type === 'html' || node.type === 'shortcode' || node.type === 'svg'}
		<div
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>{@html renderPlainText( resolvedProps.markup )}</div>
	{:else if node.type === 'icon'}
		<div
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<span class="builder-icon__symbol">{renderPlainText( resolvedProps.symbol ) || 'star'}</span>
		</div>
	{:else if node.type === 'icon-box'}
		<article
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<div class="builder-icon-box__icon">{renderPlainText( resolvedProps.symbol ) || 'spark'}</div>
			<div class="builder-icon-box__copy">
				<strong>{renderPlainText( resolvedProps.title )}</strong>
				<p>{@html renderPlainText( resolvedProps.text )}</p>
			</div>
		</article>
	{:else if node.type === 'list'}
		<ul
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			{#each Array.isArray( resolvedProps.items ) ? resolvedProps.items : [] as item, itemIndex (`${node.id}-item-${itemIndex}`)}
				<li>{renderPlainText( item )}</li>
			{/each}
		</ul>
	{:else if node.type === 'tabs'}
		<section
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<div
				class="builder-tabs__triggers"
				data-builder-slot-owner={node.id}
				data-builder-slot="triggers"
				data-builder-document={documentId}
				data-builder-multiple="true"
				use:bindSlotGeometry={createSlotGeometryMeta( 'triggers', true, ( node.slots.triggers ?? [] ).map( ( child ) => child.id ) )}
			>
				{#each tabItems as item, tabIndex (item.id)}
					<button
						type="button"
						class:active={tabIndex === activeTabIndex}
						onclick={(event) => {
							event.stopPropagation();
							activeTabIndex = tabIndex;
						}}
					>
						{#if item.triggerNodes.length}
							{#each item.triggerNodes as triggerNode, triggerIndex (triggerNode.id)}
								<BuilderNodeView
									node={triggerNode}
									{model}
									documentId={documentId}
									parentId={node.id}
									slot="triggers"
									index={triggerIndex}
									bridgeEvents={bridgeEvents}
									record={record}
								/>
							{/each}
						{:else}
							<span>{item.label}</span>
						{/if}
					</button>
				{/each}
			</div>
		<div
			class="builder-tabs__panels"
			data-builder-slot-owner={node.id}
			data-builder-slot="panels"
			data-builder-document={documentId}
			data-builder-multiple="true"
			use:bindSlotGeometry={createSlotGeometryMeta( 'panels', true, ( node.slots.panels ?? [] ).map( ( child ) => child.id ) )}
			>
				{#each tabItems as item, tabIndex (item.id)}
					<div class:hidden={tabIndex !== activeTabIndex} class="builder-tabs__panel">
						{#if item.panelNodes.length}
							{#each item.panelNodes as panelNode, panelIndex (panelNode.id)}
								<BuilderNodeView
									node={panelNode}
									{model}
									documentId={documentId}
									parentId={node.id}
									slot="panels"
									index={panelIndex}
									bridgeEvents={bridgeEvents}
									record={record}
								/>
							{/each}
						{:else if item.content}
							<div class="builder-tabs__panel-copy">{@html item.content}</div>
						{:else}
							<div class="builder-empty-view builder-empty-view--slot" aria-hidden="true">
								<span class="builder-empty-view__label">+ Drop Items</span>
								<span class="builder-empty-view__context">Add tab panel content</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{:else if node.type === 'accordion' || node.type === 'toggle'}
		<section
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			{#each accordionItems as item, itemIndex (item.id)}
				<article class="builder-accordion__item">
					<button type="button" onclick={() => toggleAccordionIndex( itemIndex )}>
						<span>{item.title}</span>
						<span>{isAccordionItemOpen( itemIndex ) ? '−' : '+'}</span>
					</button>
					{#if isAccordionItemOpen( itemIndex )}
						<div class="builder-accordion__body">{@html item.body}</div>
					{/if}
				</article>
			{/each}
		</section>
	{:else if node.type === 'menu' || node.type === 'social-icons'}
		<nav
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<ul class="builder-menu__list">
				{#each menuItems as item (item.id)}
					<li>
						<a href={item.href} target={item.target} rel={item.rel}>{item.label}</a>
						{#if item.children.length}
							<ul>
								{#each item.children as child (child.id)}
									<li><a href={child.href} target={child.target} rel={child.rel}>{child.label}</a></li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>
	{:else if node.type === 'gallery'}
		<section
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<div class="builder-gallery">
				{#each galleryImages as image (image.id)}
					<figure>
						<img src={image.src} alt={image.alt} />
						{#if image.caption}
							<figcaption>{image.caption}</figcaption>
						{/if}
					</figure>
				{/each}
			</div>
		</section>
	{:else if node.type === 'carousel'}
		<section
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			{#if carouselSlides.length}
				<div class="builder-carousel__viewport">
					<button type="button" class="builder-carousel__nav" onclick={() => cycleCarousel( -1 )}>Prev</button>
					{#each carouselSlides as slide, slideIndex (slide.id)}
						<article class:hidden={slideIndex !== carouselIndex} class="builder-carousel__slide">
							{#if slide.src}
								<img src={slide.src} alt={slide.alt ?? slide.title} />
							{/if}
							<div class="builder-carousel__copy">
								<strong>{slide.title}</strong>
								{#if slide.text}
									<p>{slide.text}</p>
								{/if}
								{#if slide.ctaHref && slide.ctaLabel}
									<a href={slide.ctaHref}>{slide.ctaLabel}</a>
								{/if}
							</div>
						</article>
					{/each}
					<button type="button" class="builder-carousel__nav" onclick={() => cycleCarousel( 1 )}>Next</button>
				</div>
			{/if}
		</section>
	{:else if node.type === 'loop'}
		<section
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			<div
				class="builder-loop__items"
				data-builder-slot-owner={node.id}
				data-builder-slot="item"
				data-builder-document={documentId}
				data-builder-multiple="true"
				use:bindSlotGeometry={createSlotGeometryMeta( 'item', true, ( node.slots.item ?? [] ).map( ( child ) => child.id ) )}
			>
				{#if collectionRecords.length}
					{#each collectionRecords as collectionRecord, recordIndex (getCollectionRecordKey( collectionRecord, recordIndex ))}
						<div class="builder-loop__record">
							{#each node.slots.item ?? [] as itemNode, itemIndex (itemNode.id)}
								<BuilderNodeView
									node={itemNode}
									{model}
									documentId={documentId}
									parentId={node.id}
									slot="item"
									index={itemIndex}
									bridgeEvents={bridgeEvents}
									record={collectionRecord}
								/>
							{/each}
						</div>
					{/each}
				{:else}
					<div
						class="builder-loop__empty"
						data-builder-slot-owner={node.id}
						data-builder-slot="empty"
						data-builder-document={documentId}
						data-builder-multiple="true"
						use:bindSlotGeometry={createSlotGeometryMeta( 'empty', true, ( node.slots.empty ?? [] ).map( ( child ) => child.id ) )}
					>
						{#if ( node.slots.empty ?? [] ).length}
							{#each node.slots.empty ?? [] as emptyNode, emptyIndex (emptyNode.id)}
								<BuilderNodeView
									node={emptyNode}
									{model}
									documentId={documentId}
									parentId={node.id}
									slot="empty"
									index={emptyIndex}
									bridgeEvents={bridgeEvents}
									record={record}
								/>
							{/each}
						{:else}
							<p>{renderPlainText( resolvedProps.emptyText ) || 'No content found'}</p>
						{/if}
					</div>
				{/if}
			</div>
		</section>
	{:else if node.type === 'popup-root'}
		{#if popupOpen}
			<div
				{...getAttributeBag( {
					class: compactClassName( [ 'builder-node', 'builder-node--popup-root', nodeClasses, overlayIsTopmost ? 'is-topmost' : 'is-stacked' ] ),
					style: `${ nodeStyle } ${ getPopupDialogStyle() }`,
				} )}
				use:bindNodeGeometry={nodeGeometry}
				onclick={handleSelect}
				onpointerenter={handleHoverEnter}
				onpointerleave={handleHoverLeave}
			>
				<button type="button" class="builder-popup__overlay" aria-label="Close popup" onclick={handlePopupOverlayClick}></button>
				<div class="builder-popup__dialog">
					<header class="builder-popup__header">
						<strong>{popupBehavior.title}</strong>
						{#if popupBehavior.showCloseButton}
							<button type="button" onclick={dismissPopup}>Close</button>
						{/if}
					</header>
					<div class="builder-popup__body">
						{#each node.children as child, childIndex (child.id)}
							<BuilderNodeView
								node={child}
								{model}
								documentId={documentId}
								parentId={node.id}
								index={childIndex}
								bridgeEvents={bridgeEvents}
								record={record}
							/>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{:else if node.type === 'form'}
		<form
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
			onsubmit={submitForm}
		>
			<div class="builder-form__fields">
				{#if childFieldNodes.length}
					{#each node.children as child, childIndex (child.id)}
						<BuilderNodeView
							node={child}
							{model}
							documentId={documentId}
							parentId={node.id}
							index={childIndex}
							bridgeEvents={bridgeEvents}
							record={record}
						/>
						{/each}
				{:else}
					{#each generatedFormFields as field (field.id)}
						<div class="builder-form__generated">
							{#if field.kind === 'textarea'}
								<label><span>{field.label}</span><textarea name={field.name} placeholder={field.placeholder} rows={field.rows ?? 4}></textarea></label>
							{:else if field.kind === 'select'}
								<label><span>{field.label}</span><select name={field.name}>{#each field.options as option (option.value)}<option value={option.value}>{option.label}</option>{/each}</select></label>
							{:else if field.kind === 'checkbox'}
								<label class="builder-form__choice"><input type="checkbox" name={field.name} checked={field.checked} /><span>{field.label}</span></label>
							{:else if field.kind === 'radio'}
								<fieldset><legend>{field.legend ?? field.label}</legend>{#each field.options as option (option.value)}<label class="builder-form__choice"><input type="radio" name={field.name} value={option.value} /><span>{option.label}</span></label>{/each}</fieldset>
							{:else if field.kind === 'hidden'}
								<input type="hidden" name={field.name} value={field.value} />
							{:else if field.kind === 'submit'}
								<button type="submit">{field.text ?? field.label ?? 'Submit'}</button>
							{:else}
								<label><span>{field.label}</span><input type={field.kind} name={field.name} placeholder={field.placeholder} value={field.value} /></label>
							{/if}
						</div>
						{/each}
					{#if !generatedFormFields.length}
						<div class="builder-empty-view builder-empty-view--slot" aria-hidden="true">
							<span class="builder-empty-view__label">+ Drop Items</span>
							<span class="builder-empty-view__context">Add form fields</span>
						</div>
					{/if}
				{/if}
			</div>
			{#if formStatus === 'success'}
				<p class="builder-form__status">{renderPlainText( resolvedProps.successMessage ) || 'Form submitted in preview mode.'}</p>
			{/if}
		</form>
	{:else if directFormFieldShell}
		<div
			{...getAttributeBag()}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			{#if directFormFieldShell.kind === 'textarea'}
				<label><span>{directFormFieldShell.label}</span><textarea name={directFormFieldShell.name} placeholder={directFormFieldShell.placeholder} rows={directFormFieldShell.rows ?? 4}></textarea></label>
			{:else if directFormFieldShell.kind === 'select'}
				<label><span>{directFormFieldShell.label}</span><select name={directFormFieldShell.name}>{#each directFormFieldShell.options as option (option.value)}<option value={option.value}>{option.label}</option>{/each}</select></label>
			{:else if directFormFieldShell.kind === 'checkbox'}
				<label class="builder-form__choice"><input type="checkbox" name={directFormFieldShell.name} checked={directFormFieldShell.checked} /><span>{directFormFieldShell.label}</span></label>
			{:else if directFormFieldShell.kind === 'radio'}
				<fieldset><legend>{directFormFieldShell.legend ?? directFormFieldShell.label}</legend>{#each directFormFieldShell.options as option (option.value)}<label class="builder-form__choice"><input type="radio" name={directFormFieldShell.name} value={option.value} /><span>{option.label}</span></label>{/each}</fieldset>
			{:else if directFormFieldShell.kind === 'hidden'}
				<input type="hidden" name={directFormFieldShell.name} value={directFormFieldShell.value} />
			{:else if directFormFieldShell.kind === 'submit'}
				<button type="button">{directFormFieldShell.text ?? directFormFieldShell.label ?? 'Submit'}</button>
			{:else}
				<label><span>{directFormFieldShell.label}</span><input type={directFormFieldShell.kind} name={directFormFieldShell.name} placeholder={directFormFieldShell.placeholder} value={directFormFieldShell.value} /></label>
			{/if}
		</div>
	{:else}
		<svelte:element
			this={definition?.runtime.tag ?? 'div'}
			{...getAttributeBag( { style: containerStyle } )}
			use:bindNodeGeometry={nodeGeometry}
			onclick={handleSelect}
			onpointerenter={handleHoverEnter}
			onpointerleave={handleHoverLeave}
		>
			{#if renderPlainText( resolvedProps.text ) && !node.children.length && !slotDefinitions.length}
				<span class="builder-node__text">{renderPlainText( resolvedProps.text )}</span>
			{/if}

			{#each node.children as child, childIndex (child.id)}
				<BuilderNodeView
					node={child}
					{model}
					documentId={documentId}
					parentId={node.id}
					index={childIndex}
					rootSlot={rootSlot}
					bridgeEvents={bridgeEvents}
					record={record}
				/>
			{/each}

			{#each slotDefinitions as slotDefinition (slotDefinition.id)}
				<div
					class="builder-node__slot"
					data-builder-slot-owner={node.id}
					data-builder-slot={slotDefinition.id}
					data-builder-document={documentId}
					data-builder-multiple={String( slotDefinition.multiple ?? true )}
					use:bindSlotGeometry={createSlotGeometryMeta( slotDefinition.id, slotDefinition.multiple ?? true, ( node.slots[ slotDefinition.id ] ?? [] ).map( ( child ) => child.id ) )}
				>
					{#if ( node.slots[ slotDefinition.id ] ?? [] ).length}
						{#each node.slots[ slotDefinition.id ] ?? [] as slotNode, slotIndex (slotNode.id)}
							<BuilderNodeView
								node={slotNode}
								{model}
								documentId={documentId}
								parentId={node.id}
								slot={slotDefinition.id}
								index={slotIndex}
								rootSlot={rootSlot}
								bridgeEvents={bridgeEvents}
								record={record}
							/>
						{/each}
					{:else}
						<div class="builder-empty-view builder-empty-view--slot" aria-hidden="true">
							<span class="builder-empty-view__label">+ Drop Items</span>
							<span class="builder-empty-view__context">Drop into {slotDefinition.label}</span>
						</div>
					{/if}
				</div>
			{/each}

			{#if shouldShowContainerDropPlaceholder}
				<div class="builder-empty-view builder-empty-view--container" aria-hidden="true">
					<span class="builder-empty-view__label">+ Drop Items</span>
				</div>
			{/if}
		</svelte:element>
	{/if}
{/if}

<style>
	.builder-node {
		position: relative;
	}

	.builder-node__slot,
	.builder-loop__items,
	.builder-tabs__triggers,
	.builder-tabs__panels {
		display: grid;
		gap: 0.75rem;
	}

	.builder-empty-view {
		display: grid;
		place-items: center;
		gap: 0.35rem;
		width: 100%;
		min-height: 100px;
		padding: 20px;
		border: 1px dashed rgba(148, 163, 184, 0.78);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.86));
		color: #64748b;
		text-align: center;
		pointer-events: none;
		box-sizing: border-box;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.62);
	}

	.builder-empty-view--slot {
		min-height: 72px;
		padding: 14px 16px;
	}

	.builder-empty-view--container {
		min-height: 84px;
		border-radius: 0;
		border-color: rgba(148, 163, 184, 0.7);
		background: rgba(148, 163, 184, 0.22);
		box-shadow: none;
	}

	.builder-empty-view__label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.92rem;
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-style: italic;
		color: rgba(255, 255, 255, 0.92);
	}

	.builder-empty-view__context {
		font-size: 0.81rem;
		line-height: 1.3;
		color: #64748b;
	}

	.builder-component-instance__inner,
	.builder-icon-box__copy,
	.builder-popup__body,
	.builder-form__fields {
		display: grid;
		gap: 1rem;
	}

	.builder-node--button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
	}

	.builder-node--icon-box {
		display: flex;
		flex-direction: var(--builder-icon-box-direction, column);
		align-items: flex-start;
	}

	.builder-icon-box__icon,
	.builder-icon__symbol {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		min-height: 2.5rem;
		padding: 0.65rem;
		border-radius: 999px;
		background: #eff6ff;
		color: #1d4ed8;
		font-weight: 700;
	}

	.builder-node--icon-box .builder-icon-box__icon {
		order: var(--builder-icon-box-icon-order, 0);
		font-size: var(--builder-icon-size, inherit);
		color: var(--builder-icon-color, #1d4ed8);
		background: var(--builder-icon-background, #eff6ff);
		padding: var(--builder-icon-padding, 0.65rem);
	}

	.builder-node--icon-box .builder-icon-box__copy {
		text-align: inherit;
	}

	.builder-node--icon-box .builder-icon-box__copy > strong {
		color: var(--builder-icon-box-title-color, inherit);
		font-size: var(--builder-icon-box-title-font-size, inherit);
		font-weight: var(--builder-icon-box-title-font-weight, inherit);
		line-height: var(--builder-icon-box-title-line-height, inherit);
		letter-spacing: var(--builder-icon-box-title-letter-spacing, inherit);
		text-transform: var(--builder-icon-box-title-text-transform, none);
		text-decoration: var(--builder-icon-box-title-text-decoration, inherit);
		text-decoration-color: var(--builder-icon-box-title-text-decoration-color, currentColor);
	}

	.builder-node--icon-box .builder-icon-box__copy > p {
		color: var(--builder-icon-box-description-color, inherit);
		font-size: var(--builder-icon-box-description-font-size, inherit);
		font-weight: var(--builder-icon-box-description-font-weight, inherit);
		line-height: var(--builder-icon-box-description-line-height, inherit);
		letter-spacing: var(--builder-icon-box-description-letter-spacing, inherit);
		text-transform: var(--builder-icon-box-description-text-transform, none);
		text-decoration: var(--builder-icon-box-description-text-decoration, inherit);
		text-decoration-color: var(--builder-icon-box-description-text-decoration-color, currentColor);
	}

	.builder-tabs__triggers {
		display: flex;
		flex-wrap: wrap;
	}

	.builder-tabs__triggers button,
	.builder-accordion__item button,
	.builder-carousel__nav,
	.builder-popup__header button,
	.builder-form button {
		cursor: pointer;
	}

	.builder-tabs__triggers button {
		color: var(--builder-tabs-title-color, inherit);
		padding: 0.7rem 0.9rem;
		padding: var(--builder-tabs-title-padding, 0.7rem 0.9rem);
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		background: var(--builder-tabs-title-background-color, white);
	}

	.builder-tabs__triggers button.active {
		border-color: #2563eb;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.builder-tabs__panel.hidden,
	.builder-carousel__slide.hidden {
		display: none;
	}

	.builder-accordion__item {
		border: 1px solid #dbe3f0;
		border-radius: 1rem;
		overflow: hidden;
	}

	.builder-accordion__item button {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		color: var(--builder-accordion-title-color, inherit);
		padding: var(--builder-accordion-title-padding, 0.95rem 1rem);
		border: 0;
		background: var(--builder-accordion-title-background-color, #f8fafc);
	}

	.builder-accordion__body,
	.builder-tabs__panel-copy {
		padding: 1rem;
	}

	.builder-tabs__panel,
	.builder-tabs__panel-copy {
		color: var(--builder-tabs-content-color, inherit);
		background: var(--builder-tabs-content-background-color, transparent);
		padding: var(--builder-tabs-content-padding, 1rem);
		border: 1px solid var(--builder-tabs-content-border-color, transparent);
	}

	.builder-accordion__item button > :last-child {
		color: var(--builder-accordion-icon-color, inherit);
		font-size: var(--builder-accordion-icon-font-size, inherit);
		margin-left: var(--builder-accordion-icon-gap, 0.5rem);
	}

	.builder-accordion__body {
		color: var(--builder-accordion-content-color, inherit);
		background: var(--builder-accordion-content-background-color, transparent);
		padding: var(--builder-accordion-content-padding, 1rem);
		border: 1px solid var(--builder-accordion-content-border-color, transparent);
	}

	.builder-menu__list {
		display: flex;
		flex-wrap: wrap;
		flex-direction: var(--builder-menu-direction, row);
		justify-content: var(--builder-menu-justify, flex-start);
		gap: var(--builder-menu-gap, 1rem);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.builder-menu__list a {
		display: inline-flex;
		align-items: center;
		color: var(--builder-menu-item-color, inherit);
		background: var(--builder-menu-item-background, transparent);
		padding: var(--builder-menu-item-padding, 0);
		border-radius: var(--builder-menu-item-radius, 0);
		text-decoration: none;
	}

	.builder-menu__list ul {
		margin-top: 0.5rem;
		padding-left: 1rem;
		list-style: none;
		background: var(--builder-menu-dropdown-background, transparent);
		border: 1px solid var(--builder-menu-dropdown-border-color, transparent);
		box-shadow: var(--builder-menu-dropdown-box-shadow, none);
	}

	.builder-gallery {
		display: grid;
		grid-template-columns: var(--builder-gallery-columns, repeat(auto-fit, minmax(180px, 1fr)));
		gap: var(--builder-gallery-gap, 1rem);
	}

	.builder-gallery figure {
		margin: 0;
		display: grid;
		gap: var(--builder-caption-spacing, 0.45rem);
	}

	.builder-gallery img,
	.builder-carousel__slide img,
	video {
		display: block;
		width: 100%;
		max-width: 100%;
		border-radius: 1rem;
	}

	.builder-gallery img {
		aspect-ratio: var(--builder-gallery-aspect-ratio, auto);
		object-fit: var(--builder-gallery-image-object-fit, fill);
		filter: var(--builder-gallery-image-filter, none);
		opacity: var(--builder-gallery-image-opacity, 1);
	}

	.builder-gallery figcaption {
		color: var(--builder-caption-color, inherit);
		background: var(--builder-caption-background, transparent);
		padding: var(--builder-caption-padding, 0);
		text-align: var(--builder-caption-align, inherit);
	}

	.builder-carousel__viewport {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: center;
	}

	.builder-carousel__slide {
		display: grid;
		min-height: var(--builder-carousel-slide-min-height, auto);
		gap: var(--builder-carousel-slide-gap, 0.75rem);
		padding: var(--builder-carousel-slide-padding, 0);
	}

	.builder-carousel__copy {
		color: var(--builder-carousel-content-color, inherit);
		background: var(--builder-carousel-content-background-color, transparent);
		padding: var(--builder-carousel-content-padding, 0);
		border: 1px solid var(--builder-carousel-content-border-color, transparent);
		font-family: var(--builder-carousel-content-font-family, inherit);
		font-size: var(--builder-carousel-content-font-size, inherit);
		font-weight: var(--builder-carousel-content-font-weight, inherit);
		line-height: var(--builder-carousel-content-line-height, inherit);
		letter-spacing: var(--builder-carousel-content-letter-spacing, inherit);
		text-transform: var(--builder-carousel-content-text-transform, none);
		text-decoration: var(--builder-carousel-content-text-decoration, inherit);
		text-decoration-color: var(--builder-carousel-content-text-decoration-color, currentColor);
		text-shadow: var(--builder-carousel-content-text-shadow, none);
	}

	.builder-carousel__copy :global(strong),
	.builder-carousel__copy :global(p) {
		font-family: var(--builder-carousel-content-font-family, inherit);
		font-size: var(--builder-carousel-content-font-size, inherit);
		font-weight: var(--builder-carousel-content-font-weight, inherit);
		line-height: var(--builder-carousel-content-line-height, inherit);
		letter-spacing: var(--builder-carousel-content-letter-spacing, inherit);
		text-transform: var(--builder-carousel-content-text-transform, none);
		text-decoration: var(--builder-carousel-content-text-decoration, inherit);
		text-decoration-color: var(--builder-carousel-content-text-decoration-color, currentColor);
		text-shadow: var(--builder-carousel-content-text-shadow, none);
	}

	.builder-carousel__nav {
		color: var(--builder-carousel-nav-color, inherit);
		background: var(--builder-carousel-nav-background-color, transparent);
		border-radius: var(--builder-carousel-nav-border-radius, 0.75rem);
	}

	.builder-loop__record {
		display: grid;
		gap: 0.75rem;
		padding: var(--builder-loop-item-padding, 0.75rem);
		border-radius: var(--builder-loop-item-border-radius, 1rem);
		background: var(--builder-loop-item-background-color, rgba(248, 250, 252, 0.8));
	}

	.builder-loop__items {
		display: grid;
		grid-template-columns: var(--builder-loop-columns, 1fr);
		row-gap: var(--builder-loop-row-gap, 0.75rem);
		column-gap: var(--builder-loop-column-gap, 0.75rem);
	}

	.builder-loop__empty {
		padding: var(--builder-loop-empty-padding, 0);
		text-align: var(--builder-loop-empty-text-align, inherit);
		color: var(--builder-loop-empty-color, inherit);
	}

	.builder-node--popup-root {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	.builder-node--popup-root.is-stacked {
		opacity: 0.92;
	}

	.builder-popup__overlay {
		position: absolute;
		inset: 0;
		background: var(--builder-overlay-color, var(--builder-popup-overlay, rgba(15, 23, 42, 0.45)));
		opacity: var(--builder-overlay-opacity, 1);
		pointer-events: none;
	}

	.builder-popup__dialog {
		position: relative;
		z-index: 1;
		width: min(100%, var(--builder-popup-width, var(--builder-popup-prop-width, 720px)));
		max-width: min(calc(100vw - 2rem), var(--builder-popup-max-width, calc(100vw - 2rem)));
		padding: var(--builder-popup-padding, 1.25rem);
		border-radius: 1.5rem;
		background: var(--builder-popup-background, white);
		box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
		pointer-events: auto;
	}

	.builder-popup__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.builder-form__fields label,
	.builder-form__fields fieldset,
	.builder-node--form-field-text label,
	.builder-node--form-field-email label,
	.builder-node--form-field-textarea label,
	.builder-node--form-field-select label,
	.builder-node--form-field-checkbox fieldset,
	.builder-node--form-field-submit label {
		display: grid;
		gap: var(--builder-form-label-gap, 0.4rem);
	}

	.builder-form__choice {
		display: flex;
		gap: 0.55rem;
		align-items: center;
	}

	.builder-form__status {
		margin: 1rem 0 0;
		padding: 0.8rem 1rem;
		border-radius: 0.9rem;
		background: #ecfdf5;
		color: #047857;
	}

	.builder-node--form {
		padding: var(--builder-form-padding, 0);
	}

	.builder-node--form-field-text,
	.builder-node--form-field-email,
	.builder-node--form-field-textarea,
	.builder-node--form-field-select,
	.builder-node--form-field-checkbox,
	.builder-node--form-field-submit {
		padding: var(--builder-form-padding, 0);
	}

	.builder-form__fields {
		gap: var(--builder-form-gap, 1rem);
	}

	.builder-node--form label > span,
	.builder-node--form fieldset > legend,
	.builder-node--form-field-text label > span,
	.builder-node--form-field-email label > span,
	.builder-node--form-field-textarea label > span,
	.builder-node--form-field-select label > span,
	.builder-node--form-field-checkbox label > span,
	.builder-node--form-field-submit label > span,
	.builder-node--form-field-checkbox fieldset > legend {
		color: var(--builder-form-label-color, inherit);
		font-size: var(--builder-form-label-font-size, inherit);
		font-weight: var(--builder-form-label-font-weight, inherit);
	}

	.builder-node--form input:not([type='checkbox']):not([type='radio']):not([type='hidden']),
	.builder-node--form textarea,
	.builder-node--form select,
	.builder-node--form-field-text input,
	.builder-node--form-field-email input,
	.builder-node--form-field-textarea textarea,
	.builder-node--form-field-select select {
		background: var(--builder-form-field-background-color, white);
		color: var(--builder-form-field-color, inherit);
		border-color: var(--builder-form-field-border-color, #cbd5e1);
		border-radius: var(--builder-form-field-border-radius, 0.85rem);
		padding: var(--builder-form-field-padding, 0.7rem 0.8rem);
	}

	.builder-node--form button[type='submit'],
	.builder-node--form-field-submit button {
		color: var(--builder-form-submit-color, inherit);
		background: var(--builder-form-submit-background-color, transparent);
		box-shadow: var(--builder-form-submit-box-shadow, none);
		padding: var(--builder-form-submit-padding, 0.7rem 0.9rem);
	}

	.builder-popup__header button {
		color: var(--builder-popup-close-color, inherit);
		background: var(--builder-popup-close-background-color, transparent);
	}

	input,
	textarea,
	select,
	button {
		font: inherit;
	}

	input,
	textarea,
	select {
		padding: 0.7rem 0.8rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.85rem;
	}
</style>
