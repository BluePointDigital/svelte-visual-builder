<script lang="ts">
	export let surface: 'light' | 'dark' = 'light';
	export let width = '100%';
	export let bodyPadding = '0';
	export let bodyGap = '0';
	export let bodyScrollable = true;
</script>

<section
	class={`builder-panel-shell builder-panel-shell--${surface}`}
	style={`--builder-panel-shell-width:${width}; --builder-panel-shell-body-padding:${bodyPadding}; --builder-panel-shell-body-gap:${bodyGap};`}
>
	<div class="builder-panel-shell__appbar">
		<slot name="appbar" />
	</div>

	<div class="builder-panel-shell__header">
		<slot name="header" />
	</div>

	<div class="builder-panel-shell__tabs">
		<slot name="tabs" />
	</div>

	<div class:scrollable={bodyScrollable} class="builder-panel-shell__body">
		<slot />
	</div>

	<div class="builder-panel-shell__footer">
		<slot name="footer" />
	</div>
</section>

<style>
	.builder-panel-shell {
		--builder-panel-shell-border: var(--builder-shell-border);
		--builder-panel-shell-surface: var(--builder-shell-panel-bg);
		--builder-panel-shell-surface-muted: var(--builder-shell-panel-bg-muted);
		--builder-panel-shell-surface-strong: var(--builder-shell-gray-50);
		--builder-panel-shell-surface-dark: var(--builder-shell-toolbar-bg);
		--builder-panel-shell-surface-dark-alt: var(--builder-shell-toolbar-bg-subtle);
		--builder-panel-shell-text: var(--builder-shell-text-strong);
		--builder-panel-shell-muted: var(--builder-shell-text-muted);
		display: grid;
		grid-template-rows: auto auto auto minmax(0, 1fr) auto;
		inline-size: var(--builder-panel-shell-width);
		min-block-size: 0;
		block-size: 100%;
		background: var(--builder-panel-shell-surface);
		border-inline-end: 1px solid var(--builder-panel-shell-border);
		box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
		color: var(--builder-panel-shell-text);
		font-family: var(--builder-shell-font-family, inherit);
		font-size: var(--builder-shell-font-size);
		overflow: hidden;
	}

	.builder-panel-shell--dark {
		--builder-panel-shell-surface: var(--builder-shell-gray-800);
		--builder-panel-shell-surface-muted: var(--builder-shell-gray-750);
		--builder-panel-shell-surface-strong: var(--builder-shell-gray-725);
		--builder-panel-shell-surface-dark: var(--builder-shell-gray-900);
		--builder-panel-shell-surface-dark-alt: var(--builder-shell-gray-800);
		--builder-panel-shell-border: var(--builder-shell-border-dark);
		--builder-panel-shell-text: var(--builder-shell-toolbar-text);
		--builder-panel-shell-muted: var(--builder-shell-toolbar-text-muted);
	}

	.builder-panel-shell__appbar:empty,
	.builder-panel-shell__header:empty,
	.builder-panel-shell__tabs:empty,
	.builder-panel-shell__footer:empty {
		display: none;
	}

	.builder-panel-shell__appbar,
	.builder-panel-shell__header,
	.builder-panel-shell__tabs,
	.builder-panel-shell__footer {
		flex: 0 0 auto;
		min-block-size: 0;
	}

	.builder-panel-shell__appbar,
	.builder-panel-shell__header {
		background: var(--builder-panel-shell-surface-dark);
		color: var(--builder-shell-toolbar-text);
	}

	.builder-panel-shell__tabs {
		background: var(--builder-panel-shell-surface-strong);
		border-block-end: 1px solid var(--builder-panel-shell-border);
		position: sticky;
		top: 0;
		z-index: 3;
	}

	.builder-panel-shell__body {
		grid-row: 4;
		flex: 1 1 auto;
		min-block-size: 0;
		padding: var(--builder-panel-shell-body-padding);
		display: grid;
		align-content: start;
		gap: var(--builder-panel-shell-body-gap);
		background: var(--builder-panel-shell-surface);
	}

	.builder-panel-shell__body.scrollable {
		overflow: auto;
		scrollbar-width: thin;
	}

	.builder-panel-shell__body:not(.scrollable) {
		overflow: hidden;
	}

	.builder-panel-shell__footer {
		border-block-start: 1px solid var(--builder-panel-shell-border);
		background: var(--builder-panel-shell-surface-muted);
	}
</style>
