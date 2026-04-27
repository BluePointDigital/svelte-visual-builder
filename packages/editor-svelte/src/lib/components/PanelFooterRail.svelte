<script lang="ts">
	import type { PanelRailTool, PanelTone } from './panel-types';

	export let tools: PanelRailTool[] = [];
	export let saveState = '';
	export let saveStateTone: PanelTone = 'default';
	export let meta = '';
	export let primaryLabel = 'Publish';
	export let primaryBusy = false;
	export let primaryDisabled = false;
	export let optionsLabel = 'Options';
	export let optionsDisabled = false;
	export let showOptions = true;
	export let onToolAction: ( id: string ) => void = () => {};
	export let onPrimaryAction: () => void = () => {};
	export let onOptionsAction: () => void = () => {};

	function getToolToneClass( tool: PanelRailTool ) {
		return tool.tone ? `builder-panel-footer-rail__tool--${tool.tone}` : '';
	}
</script>

<footer class="builder-panel-footer-rail">
	<div class="builder-panel-footer-rail__tools">
		{#each tools as tool (tool.id)}
			<button
				type="button"
				class:active={tool.active}
				class={`builder-panel-footer-rail__tool ${getToolToneClass( tool )}`}
				title={tool.title ?? tool.label}
				aria-label={tool.label}
				disabled={tool.disabled}
				onclick={() => onToolAction( tool.id )}
			>
				{#if tool.icon}
					<span aria-hidden="true" class="builder-panel-footer-rail__icon">{tool.icon}</span>
				{:else}
					<span class="builder-panel-footer-rail__label">{tool.label}</span>
				{/if}
				{#if tool.badge !== undefined}
					<em>{tool.badge}</em>
				{/if}
			</button>
		{/each}
		<slot name="tools-extra" />
	</div>

	<div class="builder-panel-footer-rail__save">
		<div class="builder-panel-footer-rail__status">
			{#if saveState}
				<span class={`builder-panel-footer-rail__pill builder-panel-footer-rail__pill--${saveStateTone}`}>{saveState}</span>
			{/if}
			{#if meta}
				<small>{meta}</small>
			{/if}
			<slot name="status" />
		</div>

		<div class="builder-panel-footer-rail__actions">
			<button type="button" class="builder-panel-footer-rail__publish" disabled={primaryDisabled} onclick={onPrimaryAction}>
				{#if primaryBusy}
					<span aria-hidden="true">...</span>
				{/if}
				<span>{primaryBusy ? `${primaryLabel}...` : primaryLabel}</span>
			</button>
			{#if showOptions}
				<button type="button" class="builder-panel-footer-rail__options" disabled={optionsDisabled} title={optionsLabel} aria-label={optionsLabel} onclick={onOptionsAction}>
					<span aria-hidden="true">&gt;</span>
				</button>
			{/if}
			<slot name="actions-extra" />
		</div>
	</div>
</footer>

<style>
	.builder-panel-footer-rail {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		min-block-size: 40px;
		background: #22262d;
		border-block-start: 1px solid #2d333d;
		color: #c7d0dc;
	}

	.builder-panel-footer-rail__tools,
	.builder-panel-footer-rail__save,
	.builder-panel-footer-rail__actions {
		display: flex;
		align-items: stretch;
	}

	.builder-panel-footer-rail__tools {
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.builder-panel-footer-rail__tool {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		min-inline-size: 40px;
		padding: 0 0.65rem;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 12px;
	}

	.builder-panel-footer-rail__tool:hover:not(:disabled),
	.builder-panel-footer-rail__tool.active {
		background: rgba(255, 255, 255, 0.06);
		color: #ffffff;
	}

	.builder-panel-footer-rail__tool:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.builder-panel-footer-rail__tool em {
		position: absolute;
		inset-block-start: 5px;
		inset-inline-end: 5px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 14px;
		block-size: 14px;
		padding: 0 0.2rem;
		border-radius: 999px;
		background: #d63384;
		color: #ffffff;
		font-style: normal;
		font-size: 9px;
		line-height: 1;
	}

	.builder-panel-footer-rail__tool--accent {
		color: #f9a8d4;
	}

	.builder-panel-footer-rail__tool--success {
		color: #86efac;
	}

	.builder-panel-footer-rail__tool--warning {
		color: #fde68a;
	}

	.builder-panel-footer-rail__tool--danger {
		color: #fca5a5;
	}

	.builder-panel-footer-rail__save {
		flex: 0 0 auto;
		margin-inline-start: auto;
	}

	.builder-panel-footer-rail__status {
		display: grid;
		align-content: center;
		justify-items: end;
		gap: 0.1rem;
		padding: 0.35rem 0.65rem;
		border-inline-start: 1px solid #2d333d;
	}

	.builder-panel-footer-rail__status small {
		font-size: 10px;
		color: #98a2b3;
		white-space: nowrap;
	}

	.builder-panel-footer-rail__pill {
		display: inline-flex;
		align-items: center;
		min-block-size: 18px;
		padding: 0 0.45rem;
		border-radius: 999px;
		background: #344054;
		color: #f8fafc;
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.builder-panel-footer-rail__pill--accent {
		background: #7a1d4f;
	}

	.builder-panel-footer-rail__pill--success {
		background: #14532d;
	}

	.builder-panel-footer-rail__pill--warning {
		background: #854d0e;
	}

	.builder-panel-footer-rail__pill--danger {
		background: #7f1d1d;
	}

	.builder-panel-footer-rail__publish,
	.builder-panel-footer-rail__options {
		border: 0;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.builder-panel-footer-rail__publish {
		min-inline-size: 124px;
		padding: 0 0.95rem;
		background: #d63384;
		color: #ffffff;
	}

	.builder-panel-footer-rail__publish:hover:not(:disabled) {
		background: #c22574;
	}

	.builder-panel-footer-rail__publish:disabled {
		background: #3a404a;
		color: #98a2b3;
		cursor: not-allowed;
	}

	.builder-panel-footer-rail__options {
		inline-size: 40px;
		background: #be2d76;
		color: #ffffff;
		border-inline-start: 1px solid rgba(255, 255, 255, 0.18);
	}

	.builder-panel-footer-rail__options:hover:not(:disabled) {
		background: #a82767;
	}

	.builder-panel-footer-rail__options:disabled {
		background: #3a404a;
		color: #98a2b3;
		cursor: not-allowed;
	}
</style>
