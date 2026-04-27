const PREVIEW_HOST_STYLE = `
	:host {
		display: block;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}

	.builder-preview-host {
		display: block;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: auto;
		overflow-x: hidden;
		box-sizing: border-box;
		margin: 0;
		background: #ffffff;
		color: #0f172a;
		font-family: Roboto, Arial, Helvetica, sans-serif;
		position: relative;
	}

	.builder-preview-host,
	.builder-preview-host *,
	.builder-preview-host *::before,
	.builder-preview-host *::after {
		box-sizing: border-box;
	}
`;

export interface PreviewHostController {
	hostElement: HTMLElement;
	shadowRoot: ShadowRoot;
	mountTarget: HTMLElement;
	destroy: () => void;
}

function ensurePreviewHostStyle( shadowRoot: ShadowRoot ) {
	let style = shadowRoot.querySelector<HTMLStyleElement>( 'style[data-builder-preview-host-style]' );
	if ( style ) {
		return style;
	}

	style = document.createElement( 'style' );
	style.dataset.builderPreviewHostStyle = 'true';
	style.textContent = PREVIEW_HOST_STYLE;
	shadowRoot.append( style );
	return style;
}

function ensurePreviewHostMountTarget( shadowRoot: ShadowRoot ) {
	let mountTarget = shadowRoot.querySelector<HTMLElement>( '[data-builder-preview-host-mount]' );
	if ( mountTarget ) {
		return mountTarget;
	}

	mountTarget = document.createElement( 'div' );
	mountTarget.dataset.builderPreviewHostMount = 'true';
	mountTarget.className = 'builder-preview-host';
	shadowRoot.append( mountTarget );
	return mountTarget;
}

export function createPreviewHostController( hostElement: HTMLElement ): PreviewHostController {
	const shadowRoot = hostElement.shadowRoot ?? hostElement.attachShadow( { mode: 'open' } );
	ensurePreviewHostStyle( shadowRoot );
	const mountTarget = ensurePreviewHostMountTarget( shadowRoot );

	return {
		hostElement,
		shadowRoot,
		mountTarget,
		destroy: () => {
			shadowRoot.replaceChildren();
		},
	};
}
