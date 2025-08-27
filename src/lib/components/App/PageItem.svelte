<script lang="ts">
	import { currentPage } from '$lib/stores/data';

	let { name = '' }: { name?: string } = $props();
</script>

{#if $currentPage.toString() === name}
	<div class="w-full h-full flex flex-col flex-grow">
		<slot />
	</div>
{/if}
