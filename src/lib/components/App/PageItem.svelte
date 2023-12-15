<script lang="ts">
	import { currentPage } from '$lib/stores/data';

	export let name = '';
</script>

{#if $currentPage.toString() === name}
	<div class="w-full h-full flex flex-col flex-grow">
		<slot />
	</div>
{/if}
