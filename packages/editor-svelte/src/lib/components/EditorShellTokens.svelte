<div class="builder-shell-tokens">
	<slot />
</div>

<style>
	:global(:root),
	:global(.builder-shell-tokens) {
		--builder-shell-top-bar-height: 48px;
		--builder-shell-responsive-bar-height: 40px;
		--builder-shell-panel-width: 280px;
		--builder-shell-panel-width-xl: 300px;
		--builder-shell-navigator-width: 240px;
		--builder-shell-panel-header-height: 48px;
		--builder-shell-panel-footer-height: 40px;
		--builder-shell-navigator-floating-height: 50vh;
		--builder-shell-control-height: 27px;
		--builder-shell-control-height-sm: 22px;
		--builder-shell-font-family: Roboto, Arial, Helvetica, sans-serif;
		--builder-shell-font-size: 13px;
		--builder-shell-line-height: 1.4;
		--builder-shell-space-5: 5px;
		--builder-shell-space-6: 6px;
		--builder-shell-space-8: 8px;
		--builder-shell-space-10: 10px;
		--builder-shell-space-12: 12px;
		--builder-shell-space-16: 16px;
		--builder-shell-radius: 3px;
		--builder-shell-radius-lg: 5px;
		--builder-shell-radius-pill: 999px;
		--builder-shell-focus-ring: 0 0 0 1px var(--builder-shell-accent), 0 0 0 3px rgba(208, 4, 212, 0.2);
		--builder-shell-gray-25: #f9fafa;
		--builder-shell-gray-50: #f1f2f3;
		--builder-shell-gray-75: #e6e8ea;
		--builder-shell-gray-100: #d5d8dc;
		--builder-shell-gray-200: #babfc5;
		--builder-shell-gray-300: #9da5ae;
		--builder-shell-gray-400: #818a96;
		--builder-shell-gray-500: #69727d;
		--builder-shell-gray-600: #515962;
		--builder-shell-gray-700: #3f444b;
		--builder-shell-gray-725: #333438;
		--builder-shell-gray-750: #2b2c31;
		--builder-shell-gray-800: #1f2124;
		--builder-shell-gray-900: #0c0d0e;
		--builder-shell-pink-200: #f3bafd;
		--builder-shell-pink-800: #d004d4;
		--builder-shell-pink-900: #c00bb9;
		--builder-shell-rose-800: #93003f;
		--builder-shell-indigo-600: #524cff;
		--builder-shell-teal-600: #0a875a;
		--builder-shell-warning: #f59e0b;
		--builder-shell-danger: #dc2626;
		--builder-shell-info: #2563eb;
		--builder-shell-bg: var(--builder-shell-gray-25);
		--builder-shell-panel-bg: #ffffff;
		--builder-shell-panel-bg-muted: var(--builder-shell-gray-50);
		--builder-shell-panel-surface: #ffffff;
		--builder-shell-stage-bg: var(--builder-shell-gray-750);
		--builder-shell-stage-bg-deep: var(--builder-shell-gray-800);
		--builder-shell-toolbar-bg: var(--builder-shell-gray-800);
		--builder-shell-toolbar-bg-subtle: var(--builder-shell-gray-725);
		--builder-shell-toolbar-text: var(--builder-shell-gray-25);
		--builder-shell-toolbar-text-muted: var(--builder-shell-gray-200);
		--builder-shell-text: var(--builder-shell-gray-600);
		--builder-shell-text-muted: var(--builder-shell-gray-400);
		--builder-shell-text-strong: var(--builder-shell-gray-900);
		--builder-shell-heading: var(--builder-shell-gray-800);
		--builder-shell-border: var(--builder-shell-gray-100);
		--builder-shell-border-strong: var(--builder-shell-gray-200);
		--builder-shell-border-dark: rgba(255, 255, 255, 0.08);
		--builder-shell-bg-surface: var(--builder-shell-panel-bg);
		--builder-shell-bg-surface-muted: var(--builder-shell-panel-bg-muted);
		--builder-shell-bg-hover: var(--builder-shell-gray-50);
		--builder-shell-bg-active: var(--builder-shell-gray-75);
		--builder-shell-bg-chip: var(--builder-shell-gray-50);
		--builder-shell-bg-dark: var(--builder-shell-gray-800);
		--builder-shell-bg-dark-alt: var(--builder-shell-gray-725);
		--builder-shell-dark-panel: #15171c;
		--builder-shell-dark-panel-raised: #1d2027;
		--builder-shell-dark-panel-muted: #242832;
		--builder-shell-dark-panel-subtle: #191c22;
		--builder-shell-dark-field: #111318;
		--builder-shell-dark-field-hover: #171a20;
		--builder-shell-dark-border: rgba(255, 255, 255, 0.1);
		--builder-shell-dark-border-strong: rgba(255, 255, 255, 0.18);
		--builder-shell-dark-text: #f1f2f3;
		--builder-shell-dark-text-muted: #babfc5;
		--builder-shell-dark-text-subtle: #818a96;
		--builder-shell-border-color: var(--builder-shell-border);
		--builder-shell-border-color-bold: var(--builder-shell-border-strong);
		--builder-shell-accent-soft: #f3bafd;
		--builder-shell-accent: #d004d4;
		--builder-shell-accent-strong: #524cff;
		--builder-shell-accent-surface: #fae8ff;
		--builder-shell-accent-text: var(--builder-shell-rose-800);
		--builder-shell-shadow-card: 0 0 5px rgba(0, 0, 0, 0.1);
		--builder-shell-shadow-popover: 0 14px 40px rgba(0, 0, 0, 0.34);
		--builder-shell-shadow-panel: 0 12px 36px rgba(0, 0, 0, 0.16);
		--builder-shell-transition-hover: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
	}

	:global(.builder-shell-tokens) {
		display: contents;
		font-family: var(--builder-shell-font-family);
		font-size: var(--builder-shell-font-size);
		line-height: var(--builder-shell-line-height);
		color: var(--builder-shell-text);
	}

	:global(.builder-shell-tokens *),
	:global(.builder-shell-tokens *::before),
	:global(.builder-shell-tokens *::after) {
		box-sizing: border-box;
	}

	:global(.builder-shell-tokens button),
	:global(.builder-shell-tokens input),
	:global(.builder-shell-tokens select),
	:global(.builder-shell-tokens textarea) {
		font: inherit;
	}

	:global(.builder-shell-toolbar-button),
	:global(.builder-shell-button),
	:global(.builder-shell-icon-button) {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: var(--builder-shell-control-height);
		padding: 0 0.7rem;
		border: 1px solid transparent;
		border-radius: var(--builder-shell-radius-lg);
		background: transparent;
		color: inherit;
		cursor: pointer;
		transition: var(--builder-shell-transition-hover);
		font-size: 12px;
		font-weight: 400;
		white-space: nowrap;
	}

	:global(.builder-shell-toolbar-button:hover),
	:global(.builder-shell-button:hover),
	:global(.builder-shell-icon-button:hover) {
		background: rgba(255, 255, 255, 0.07);
	}

	:global(.builder-shell-icon-button) {
		width: var(--builder-shell-control-height);
		padding: 0;
	}

	:global(.builder-shell-toolbar-button:focus-visible),
	:global(.builder-shell-button:focus-visible),
	:global(.builder-shell-icon-button:focus-visible) {
		outline: none;
		border-color: var(--builder-shell-accent);
		box-shadow: var(--builder-shell-focus-ring);
	}

	:global(.builder-shell-button--light) {
		border-color: var(--builder-shell-border);
		background: #ffffff;
		color: var(--builder-shell-text-strong);
	}

	:global(.builder-shell-button--light:hover) {
		background: var(--builder-shell-panel-bg-muted);
	}

	:global(.builder-shell-button--dark) {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.025);
		color: var(--builder-shell-toolbar-text-muted);
	}

	:global(.builder-shell-button--dark:hover) {
		border-color: rgba(255, 255, 255, 0.18);
		background: var(--builder-shell-gray-700);
		color: var(--builder-shell-toolbar-text);
	}

	:global(.builder-shell-button--publish) {
		border-color: var(--builder-shell-rose-800);
		background: var(--builder-shell-rose-800);
		color: #ffffff;
		font-weight: 500;
	}

	:global(.builder-shell-button--publish:hover) {
		border-color: var(--builder-shell-pink-900);
		background: var(--builder-shell-pink-900);
	}

	:global(.builder-shell-button--publish:focus-visible) {
		box-shadow: 0 0 0 1px var(--builder-shell-pink-200);
	}

	:global(.builder-shell-button--ghost) {
		border-color: transparent;
		background: transparent;
		color: var(--builder-shell-text-muted);
		padding-inline: 0.45rem;
	}

	:global(.builder-shell-button--ghost:hover) {
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-heading);
	}

	:global(.builder-panel-shell--dark .builder-shell-button--ghost) {
		color: var(--builder-shell-dark-text-muted);
	}

	:global(.builder-panel-shell--dark .builder-shell-button--ghost:hover) {
		background: rgba(255, 255, 255, 0.06);
		color: var(--builder-shell-dark-text);
	}

	:global(.builder-shell-button--primary),
	:global(.builder-shell-button--danger) {
		border-color: var(--builder-shell-border);
		background: #ffffff;
		color: var(--builder-shell-text-strong);
	}

	:global(.builder-shell-button--primary:hover) {
		border-color: var(--builder-shell-accent);
		background: var(--builder-shell-accent-surface);
		color: var(--builder-shell-accent-text);
	}

	:global(.builder-shell-button--danger:hover) {
		border-color: rgba(220, 38, 38, 0.36);
		background: rgba(220, 38, 38, 0.08);
		color: #991b1b;
	}

	:global(.builder-panel-shell--dark .builder-shell-button--primary),
	:global(.builder-panel-shell--dark .builder-shell-button--danger) {
		border-color: var(--builder-shell-dark-border);
		background: rgba(255, 255, 255, 0.055);
		color: var(--builder-shell-dark-text);
	}

	:global(.builder-panel-shell--dark .builder-shell-button--primary:hover) {
		border-color: rgba(243, 186, 253, 0.46);
		background: rgba(208, 4, 212, 0.18);
		color: #ffffff;
	}

	:global(.builder-panel-shell--dark .builder-shell-button--danger:hover) {
		border-color: rgba(248, 113, 113, 0.38);
		background: rgba(220, 38, 38, 0.18);
		color: #fecaca;
	}

	:global(.builder-shell-button:disabled),
	:global(.builder-shell-toolbar-button:disabled),
	:global(.builder-shell-icon-button:disabled) {
		opacity: 0.48;
		cursor: not-allowed;
	}

	:global(.builder-shell-input),
	:global(.builder-shell-select),
	:global(.builder-shell-field input),
	:global(.builder-shell-field select),
	:global(.builder-shell-field textarea) {
		width: 100%;
		min-height: var(--builder-shell-control-height);
		padding: 0 0.65rem;
		border: 1px solid var(--builder-shell-border-strong);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-panel-bg);
		color: var(--builder-shell-gray-800);
		box-shadow: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
	}

	:global(.builder-shell-input:hover),
	:global(.builder-shell-select:hover),
	:global(.builder-shell-field input:hover),
	:global(.builder-shell-field select:hover),
	:global(.builder-shell-field textarea:hover) {
		border-color: var(--builder-shell-gray-300);
	}

	:global(.builder-shell-input:focus-visible),
	:global(.builder-shell-select:focus-visible),
	:global(.builder-shell-field input:focus-visible),
	:global(.builder-shell-field select:focus-visible),
	:global(.builder-shell-field textarea:focus-visible) {
		outline: none;
		border-color: var(--builder-shell-accent);
		box-shadow: var(--builder-shell-focus-ring);
	}

	:global(.builder-panel-shell--dark .builder-shell-input),
	:global(.builder-panel-shell--dark .builder-shell-select),
	:global(.builder-panel-shell--dark .builder-shell-field input),
	:global(.builder-panel-shell--dark .builder-shell-field select),
	:global(.builder-panel-shell--dark .builder-shell-field textarea) {
		border-color: var(--builder-shell-dark-border);
		background-color: var(--builder-shell-dark-field);
		color: var(--builder-shell-dark-text);
		color-scheme: dark;
	}

	:global(.builder-panel-shell--dark .builder-shell-input::placeholder),
	:global(.builder-panel-shell--dark .builder-shell-field input::placeholder),
	:global(.builder-panel-shell--dark .builder-shell-field textarea::placeholder) {
		color: var(--builder-shell-dark-text-subtle);
	}

	:global(.builder-panel-shell--dark .builder-shell-input:hover),
	:global(.builder-panel-shell--dark .builder-shell-select:hover),
	:global(.builder-panel-shell--dark .builder-shell-field input:hover),
	:global(.builder-panel-shell--dark .builder-shell-field select:hover),
	:global(.builder-panel-shell--dark .builder-shell-field textarea:hover) {
		border-color: var(--builder-shell-dark-border-strong);
		background-color: var(--builder-shell-dark-field-hover);
	}

	:global(.builder-panel-shell--dark .builder-shell-input:focus-visible),
	:global(.builder-panel-shell--dark .builder-shell-select:focus-visible),
	:global(.builder-panel-shell--dark .builder-shell-field input:focus-visible),
	:global(.builder-panel-shell--dark .builder-shell-field select:focus-visible),
	:global(.builder-panel-shell--dark .builder-shell-field textarea:focus-visible) {
		border-color: var(--builder-shell-accent-soft);
	}

	:global(.builder-shell-select) {
		padding-inline-end: 1.75rem;
		background-image:
			linear-gradient(45deg, transparent 50%, var(--builder-shell-gray-500) 50%),
			linear-gradient(135deg, var(--builder-shell-gray-500) 50%, transparent 50%);
		background-position:
			calc(100% - 12px) calc(50% - 1px),
			calc(100% - 7px) calc(50% - 1px);
		background-size: 5px 5px, 5px 5px;
		background-repeat: no-repeat;
		appearance: none;
	}

	:global(.builder-panel-shell--dark .builder-shell-select),
	:global(.builder-panel-shell--dark .builder-shell-field select) {
		background-image:
			linear-gradient(45deg, transparent 50%, var(--builder-shell-dark-text-muted) 50%),
			linear-gradient(135deg, var(--builder-shell-dark-text-muted) 50%, transparent 50%);
	}

	:global(.builder-panel-shell--dark .builder-shell-select option),
	:global(.builder-panel-shell--dark .builder-shell-field select option) {
		background: var(--builder-shell-dark-field);
		color: var(--builder-shell-dark-text);
	}

	:global(.builder-shell-field) {
		display: grid;
		gap: 0.3rem;
	}

	:global(.builder-shell-field span) {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--builder-shell-text-muted);
	}

	:global(.builder-panel-shell--dark .builder-shell-field span) {
		color: var(--builder-shell-dark-text-subtle);
	}

	:global(.builder-shell-badge) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 18px;
		padding: 0 0.5rem;
		border-radius: var(--builder-shell-radius-pill);
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-gray-500);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	:global(.builder-shell-badge--accent) {
		background: var(--builder-shell-accent-surface);
		color: var(--builder-shell-accent-text);
	}

	:global(.builder-shell-badge--neutral) {
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-gray-500);
	}

	:global(.builder-shell-badge--dark) {
		background: rgba(255, 255, 255, 0.06);
		color: var(--builder-shell-toolbar-text);
	}

	:global(.builder-panel-shell--dark .builder-shell-badge) {
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.07);
		color: var(--builder-shell-dark-text-muted);
	}

	:global(.builder-panel-shell--dark .builder-shell-badge--accent) {
		border-color: rgba(243, 186, 253, 0.25);
		background: rgba(208, 4, 212, 0.18);
		color: #f5d0fe;
	}

	:global(.builder-panel-shell--dark .builder-shell-badge--neutral) {
		background: rgba(255, 255, 255, 0.055);
		color: var(--builder-shell-dark-text-muted);
	}

	:global(.builder-panel-shell--dark .builder-shell-badge--dark) {
		border-color: var(--builder-shell-dark-border-strong);
		background: rgba(255, 255, 255, 0.11);
		color: var(--builder-shell-dark-text);
	}

	:global(.builder-shell-card) {
		border: 1px solid var(--builder-shell-border);
		border-radius: var(--builder-shell-radius-lg);
		background: #ffffff;
		box-shadow: none;
		overflow: hidden;
	}

	:global(.builder-shell-card--subtle) {
		background: var(--builder-shell-panel-bg-muted);
	}

	:global(.builder-panel-shell--dark .builder-shell-card) {
		border-color: var(--builder-shell-dark-border);
		background: var(--builder-shell-dark-panel-raised);
		color: var(--builder-shell-dark-text);
	}

	:global(.builder-panel-shell--dark .builder-shell-card--subtle) {
		background: var(--builder-shell-dark-panel-subtle);
	}

	:global(.builder-panel-shell--dark .builder-shell-card.active),
	:global(.builder-panel-shell--dark .builder-shell-card[aria-selected='true']) {
		border-color: rgba(243, 186, 253, 0.38);
		background: #222532;
	}

	:global(.builder-shell-empty-state) {
		display: grid;
		place-items: center;
		gap: 0.45rem;
		min-block-size: 96px;
		padding: var(--builder-shell-space-16);
		border: 1px dashed var(--builder-shell-border-strong);
		border-radius: var(--builder-shell-radius-lg);
		background: var(--builder-shell-panel-bg-muted);
		color: var(--builder-shell-text-muted);
		text-align: center;
	}

	:global(.builder-panel-shell--dark .builder-shell-empty-state),
	:global(.builder-panel-shell--dark .builder-shell-card--subtle.builder-shell-lazy-panel__placeholder) {
		border-color: var(--builder-shell-dark-border);
		background: rgba(255, 255, 255, 0.035);
		color: var(--builder-shell-dark-text-muted);
	}

	:global(.builder-shell-action-row) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--builder-shell-space-6);
	}

	:global(.builder-shell-button--compact),
	:global(.builder-shell-action-row .builder-shell-button) {
		min-height: var(--builder-shell-control-height-sm);
		height: var(--builder-shell-control-height-sm);
		padding-inline: 0.5rem;
		font-size: 11px;
	}

	:global(.builder-shell-icon-badge) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: 1px solid var(--builder-shell-border);
		border-radius: var(--builder-shell-radius-lg);
		background: #ffffff;
		color: var(--builder-shell-gray-600);
		flex-shrink: 0;
	}

	:global(.builder-panel-shell--dark .builder-shell-icon-badge) {
		border-color: var(--builder-shell-dark-border);
		background: rgba(255, 255, 255, 0.055);
		color: var(--builder-shell-dark-text-muted);
	}

	:global(.builder-shell-scrollbar) {
		scrollbar-width: thin;
		scrollbar-color: var(--builder-shell-gray-300) transparent;
	}

	:global(.builder-shell-scrollbar::-webkit-scrollbar) {
		width: 10px;
		height: 10px;
	}

	:global(.builder-shell-scrollbar::-webkit-scrollbar-thumb) {
		border: 2px solid transparent;
		border-radius: 999px;
		background: var(--builder-shell-gray-300);
		background-clip: padding-box;
	}

	:global(.builder-shell-scrollbar::-webkit-scrollbar-track) {
		background: transparent;
	}
</style>
