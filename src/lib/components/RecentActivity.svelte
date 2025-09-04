<script lang="ts">
	import { timeAgo, tr } from '$lib/utility';
	import { userProfile } from '$lib/stores/data';

	import type { WebSiteHistory } from '$lib/types';

	import Icon from '@iconify/svelte';

	export let domain: string = '';

	let history_list: WebSiteHistory[] = [];
	let history_count: number = 0;

	$: if ($userProfile.data?.webSites) {
		const histories = $userProfile.data?.webSites[domain]?.history || [];
		history_count = histories.length;
		history_list = histories.toReversed().slice(0, 9) as WebSiteHistory[];
	}
</script>

<div
	class="kb-surface flex w-full flex-col mt-3 p-4 flex-grow rounded-2xl"
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
					<Icon icon="bx:check" class="text-pink-600 dark:text-teal-400" />
				{:else}
					<Icon icon="mdi:close" class="text-gray-800 dark:text-gray-400" />
				{/if}
				<span class="text-sm text-black dark:text-white opacity-70">
					{tr(siteHistory.type)}
				</span>
			</div>
			<div
				class="text-black dark:text-white opacity-30 text-xs leading-4 self-center whitespace-nowrap my-auto"
			>
				{timeAgo.format(new Date(siteHistory.created_at))}
			</div>
		</div>
	{/each}
	<!-- Use a neutral divider to avoid theme blue tint -->
	<div class="my-2 h-px bg-gray-300 dark:bg-zinc-700 opacity-30"></div>
	<span class="text-right text-black dark:text-white opacity-50 font-medium text-sm mt-2">
		Total activities: {history_count}
	</span>
</div>
