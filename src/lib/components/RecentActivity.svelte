<script>
	import { reverseArray, timeAgo } from '$lib/stores/utils';

	let currentSite = {
		history: [
			{ type: 'Note', created_at: new Date() },
			{ type: 'Reply', created_at: new Date() },
			{ type: 'Reaction', created_at: new Date() },
			{ type: 'Note', created_at: new Date() },
			{ type: 'Highlight', created_at: new Date() }
		]
	};
</script>

<div
	class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		RECENT ACTIVITY
	</div>
	{#each reverseArray(currentSite.history) as site, i}
		<div class="justify-between items-stretch flex gap-5 mt-2">
			<div class="text-black dark:text-white text-base leading-5">{site.type}</div>
			<div
				class="text-black dark:text-white text-opacity-40 text-xs leading-4 self-center whitespace-nowrap my-auto"
			>
				{timeAgo(new Date(site.created_at))}
			</div>
		</div>
	{/each}
</div>
