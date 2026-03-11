<script lang="ts">
	import { currentPage } from '$lib/stores/data';
 	import type { Snippet } from 'svelte';

	let { name = '', children }: { name?: string; children?: Snippet } = $props();
</script>

{#if $currentPage.toString() === name}
	<div class="w-full h-full flex flex-col flex-grow">
		{@render children?.()}
	</div>
{/if}
