<script lang="ts">
	import type { BuilderRuntimeComponentProps } from '../src/lib/runtime';

	let {
		props,
		attributes,
		style,
		className,
		children,
	}: BuilderRuntimeComponentProps = $props();
</script>

<article
	data-testid="custom-runtime-card"
	data-builder-type-forwarded={attributes['data-builder-type']}
	data-builder-class-forwarded={className}
	style={style}
>
	<h2>{props.title}</h2>
	{@render children?.()}
</article>
