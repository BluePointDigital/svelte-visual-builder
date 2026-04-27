<script lang="ts">
	import { onMount } from 'svelte';

	let LoadedInlineRichTextEditor: any = null;
	let loadError: Error | null = null;

	onMount( () => {
		let cancelled = false;

		void import( './InlineRichTextEditor.svelte' )
			.then( ( module ) => {
				if ( !cancelled ) {
					LoadedInlineRichTextEditor = module.default;
				}
			} )
			.catch( ( error ) => {
				if ( !cancelled ) {
					loadError = error as Error;
				}
			} );

		return () => {
			cancelled = true;
		};
	} );

	export let value: string | null | undefined = '';
	export let valueMode: 'auto' | 'html' | 'text' = 'auto';
	export let minHeight = '120px';
	export let showBubbleMenu = true;
	export let showToolbar = true;
	export let autofocus = false;
	export let onChange: ( detail: { mode: 'html' | 'text'; value: string; html: string; text: string } ) => void = () => {};
	export let onBlur: () => void = () => {};
	export let onFocus: () => void = () => {};
</script>

{#if LoadedInlineRichTextEditor}
	<svelte:component
		this={LoadedInlineRichTextEditor}
		{value}
		{valueMode}
		{minHeight}
		{showBubbleMenu}
		{showToolbar}
		{autofocus}
		{onChange}
		{onBlur}
		{onFocus}
	/>
{:else}
	<div class="inline-rich-text-lazy" data-inline-rich-text-root="true">
		{loadError ? 'Rich text editor failed to load.' : 'Loading editor...'}
	</div>
{/if}

<style>
	.inline-rich-text-lazy {
		box-sizing: border-box;
		display: grid;
		min-height: 48px;
		place-items: center;
		padding: 0.75rem;
		border: 1px solid rgba(82, 76, 255, 0.2);
		background: rgba(255, 255, 255, 0.92);
		color: #4b5563;
		font-size: 0.8125rem;
	}
</style>
