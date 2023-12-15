<script lang="ts">
	import { userProfile } from '$lib/stores/data';
	import { reverseArray, timeAgo } from '$lib/stores/utils';
	import Icon from '@iconify/svelte';
	export let domain: string = '';
	let history: any[] = [];

	$: {
		if ($userProfile.data?.webSites) {
			history = $userProfile.data?.webSites[domain]?.history || [];
		}
	}
</script>

<div
	class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 flex-grow rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[3px]"
	>
		RECENT ACTIVITY
	</div>
	{#each reverseArray(history).slice(0, 10) as site, i}
		<div class="justify-between items-stretch flex gap-5 mt-2">
			<div class="text-black dark:text-white text-base leading-5 flex flex-row items-center gap-2">
				{#if site?.accepted}
					<Icon icon="bx:check" class="text-success-600" />
				{:else}
					<Icon icon="mdi:close" class="text-error-600" />
				{/if}
				<span>
					{site.type}
				</span>
			</div>
			<div
				class="text-black dark:text-white text-opacity-40 text-xs leading-4 self-center whitespace-nowrap my-auto"
			>
				{timeAgo(new Date(site.created_at))}
			</div>
		</div>
	{/each}
</div>
