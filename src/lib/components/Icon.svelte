<script lang="ts">
	// Renders icons bundled in $lib/icons; nothing is fetched at runtime.
	import { icons } from '$lib/icons';

	let {
		icon,
		width = '1em',
		class: className = ''
	}: { icon: string; width?: number | string; class?: string } = $props();

	const data = $derived(icons[icon]);
</script>

{#if data}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		{width}
		height={width}
		viewBox="0 0 {data.width} {data.height}"
		class={className}
		aria-hidden="true"
	>
		{@html data.body}
	</svg>
{/if}
