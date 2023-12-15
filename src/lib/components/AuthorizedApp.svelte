<script lang="ts">
	import Icon from '@iconify/svelte';
	import TimeAgo from 'javascript-time-ago';
	import en from 'javascript-time-ago/locale/en';

	import { createEventDispatcher } from 'svelte';
	import { timeStop } from '$lib/stores/data';

	export let domain = '';

	TimeAgo.addDefaultLocale(en);

	const dispatcher = createEventDispatcher();
	const timeAgo = new TimeAgo('en-US');
</script>

<div
	class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div class="justify-between items-stretch flex gap-0">
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px] w-[252px]"
		>
			AUTHORIZED APP
		</div>
		<div class="text-pink-600 dark:text-teal-400 text-xs leading-4 whitespace-nowrap">
			{timeAgo.format($timeStop).replace('in ', 'Expire in ')}
		</div>
	</div>
	<div class="justify-between items-stretch flex gap-5 mt-2">
		<div class="text-black dark:text-white text-2xl font-semibold leading-7">{domain}</div>
		<button
			class="btn btn-sm btn-ghost px-0 py-0"
			on:click={() => {
				dispatcher('showAuthorization', true);
			}}
		>
			<Icon icon="mingcute:settings-2-line" width={26} class="opacity-40" />
		</button>
	</div>
</div>
