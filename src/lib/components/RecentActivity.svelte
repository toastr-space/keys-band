<script lang="ts">
	import { userProfile } from '$lib/stores/data';
	import { reverseArray, timeAgo, tr } from '$lib/stores/utils';
	import type { WebSiteHistory } from '$lib/types';
	import Icon from '@iconify/svelte';
	export let domain: string = '';

	let history_list: WebSiteHistory[] = [];
	let history_count: number = 0;

	$: if ($userProfile.data?.webSites) {
		const histories = $userProfile.data?.webSites[domain]?.history || [];
		history_count = histories.length;
		history_list = reverseArray(histories).slice(0, 10) as WebSiteHistory[];
	}
</script>

<div
	class="bg-surface-400 dark:bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 flex-grow rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[3px]"
	>
		RECENT ACTIVITY
	</div>
	{#each history_list as siteHistory}
		<div class="justify-between flex gap-5 mt-2">
			<div class="text-black dark:text-white text-base leading-5 flex flex-row items-center gap-2">
				{#if siteHistory.accepted}
					<Icon icon="bx:check" class="text-success-600" />
				{:else}
					<Icon icon="mdi:close" class="text-error-600" />
				{/if}
				<span class="text-sm dark:text-white opacity-30">
					{tr(siteHistory.type)}
				</span>
			</div>
			<div
				class="text-black dark:text-white text-xs leading-4 self-center whitespace-nowrap my-auto"
			>
				{timeAgo(new Date(siteHistory.created_at))}
			</div>
		</div>
	{/each}
	<span class="divider" />
	<span class="text-right dark:text-white font-medium text-sm mt-2">
		Total {history_count} activities
	</span>
</div>
