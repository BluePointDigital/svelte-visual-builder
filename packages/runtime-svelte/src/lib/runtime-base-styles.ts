export const BUILDER_RUNTIME_BASE_STYLES = `
	@keyframes builder-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes builder-fade-up {
		from { opacity: 0; transform: translate3d(0, 24px, 0); }
		to { opacity: 1; transform: translate3d(0, 0, 0); }
	}

	@keyframes builder-fade-down {
		from { opacity: 0; transform: translate3d(0, -24px, 0); }
		to { opacity: 1; transform: translate3d(0, 0, 0); }
	}

	@keyframes builder-slide-in-up {
		from { transform: translate3d(0, 32px, 0); }
		to { transform: translate3d(0, 0, 0); }
	}

	@keyframes builder-slide-in-down {
		from { transform: translate3d(0, -32px, 0); }
		to { transform: translate3d(0, 0, 0); }
	}

	@keyframes builder-slide-in-left {
		from { transform: translate3d(-32px, 0, 0); }
		to { transform: translate3d(0, 0, 0); }
	}

	@keyframes builder-slide-in-right {
		from { transform: translate3d(32px, 0, 0); }
		to { transform: translate3d(0, 0, 0); }
	}

	@keyframes builder-zoom-in {
		from { opacity: 0; transform: scale(0.94); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes builder-zoom-out {
		from { opacity: 0; transform: scale(1.06); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes builder-pop-in {
		0% { opacity: 0; transform: scale(0.92); }
		70% { opacity: 1; transform: scale(1.025); }
		100% { opacity: 1; transform: scale(1); }
	}

	.builder-runtime {
		display: grid;
		gap: 0;
		position: relative;
	}

	.builder-runtime,
	.builder-runtime *,
	.builder-runtime *::before,
	.builder-runtime *::after {
		box-sizing: border-box;
	}

	.builder-runtime__slot {
		display: grid;
		gap: 0;
	}

	.builder-runtime__slot--popup,
	.builder-runtime__slot--modal {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 30;
	}

	.builder-node {
		position: relative;
		min-width: 0;
	}

	.builder-node--authoring-hidden {
		opacity: 0.42;
		filter: grayscale(1);
		outline: 1px dashed rgba(148, 163, 184, 0.85);
		outline-offset: -1px;
	}

	.builder-node--authoring-hidden::after {
		content: "Hidden";
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		min-height: 32px;
		background: rgba(15, 23, 42, 0.14);
		color: rgba(255, 255, 255, 0.9);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		pointer-events: none;
		z-index: 2;
	}

	.builder-node__slot,
	.builder-loop__items,
	.builder-tabs__triggers,
	.builder-tabs__panels {
		display: grid;
		min-width: 0;
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

	.builder-node--image {
		display: block;
		min-width: 0;
		min-height: 0;
		width: 100%;
		max-width: 100%;
		max-height: 100%;
		height: auto;
		box-sizing: border-box;
		flex-shrink: 1;
	}

	.builder-node--video {
		display: grid;
		min-width: 0;
		gap: 0.75rem;
	}

	.builder-node--video > video {
		display: block;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		height: auto;
		box-sizing: border-box;
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
		min-width: 0;
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
		font-size: var(--builder-caption-font-size, inherit);
	}

	.builder-carousel__viewport {
		display: grid;
		min-width: 0;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: center;
	}

	.builder-carousel__slide {
		display: grid;
		min-width: 0;
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

	.builder-carousel__copy strong,
	.builder-carousel__copy p {
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
		min-width: 0;
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
		min-width: 0;
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

	.builder-node--form,
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

	.builder-form__fields,
	.builder-node--form,
	.builder-node--form-field-text,
	.builder-node--form-field-email,
	.builder-node--form-field-textarea,
	.builder-node--form-field-select,
	.builder-node--form-field-checkbox,
	.builder-node--form-field-submit {
		min-width: 0;
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
`;
