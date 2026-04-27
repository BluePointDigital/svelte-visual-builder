import type { BuilderEngineState, BuilderRect, DropTarget } from '@builder/core';
import type { BreakpointDefinition } from '@builder/schema';

import { resolveInteractionCoreDropTarget } from './interaction-core';

const previewViewportWidths = {
	desktop: 1280,
	laptop: 1140,
	tablet: 820,
	mobile: 430,
} as const;

export type PreviewViewportKind = keyof typeof previewViewportWidths;

export function resolveCanvasDropTarget( state: BuilderEngineState, pointer: { x: number; y: number } ): DropTarget | undefined {
	return resolveInteractionCoreDropTarget( state, pointer );
}

export function pointInRect( rect: BuilderRect, x: number, y: number ): boolean {
	return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function rectToStyle( rect: BuilderRect ): string {
	return `left:${ rect.left }px;top:${ rect.top }px;width:${ rect.width }px;height:${ rect.height }px;`;
}

export function resolvePreviewViewportKind(
	viewportId: string,
	breakpoints: BreakpointDefinition[],
): PreviewViewportKind {
	const viewport = breakpoints.find( ( entry ) => entry.id === viewportId );
	const identity = `${ viewportId } ${ viewport?.label ?? '' }`.toLowerCase();

	if ( identity.includes( 'mobile' ) || identity.includes( 'phone' ) ) {
		return 'mobile';
	}

	if ( identity.includes( 'tablet' ) || identity.includes( 'ipad' ) ) {
		return 'tablet';
	}

	if ( identity.includes( 'laptop' ) || identity.includes( 'notebook' ) ) {
		return 'laptop';
	}

	const minWidth = viewport?.minWidth ?? 0;
	if ( minWidth <= 480 ) {
		return 'mobile';
	}
	if ( minWidth <= 900 ) {
		return 'tablet';
	}
	if ( minWidth <= 1200 ) {
		return 'laptop';
	}

	return 'desktop';
}

export function resolvePreviewViewportWidth(
	viewportId: string,
	breakpoints: BreakpointDefinition[],
): number {
	const viewport = breakpoints.find( ( entry ) => entry.id === viewportId );
	const kind = resolvePreviewViewportKind( viewportId, breakpoints );
	const baselineWidth = previewViewportWidths[ kind ];
	const configuredMinWidth = viewport?.minWidth ?? baselineWidth;

	if ( kind === 'mobile' ) {
		return Math.max( baselineWidth, Math.min( 520, configuredMinWidth || baselineWidth ) );
	}

	return Math.max( baselineWidth, configuredMinWidth );
}
