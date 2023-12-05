<script lang="ts">
	import Icon from '@iconify/svelte';
	import Duration from './Duration.svelte';
	import { tr } from '$lib/stores/utils';

	let durationChoice: number = 0;

	export let domain: string;
	export let parameter;
	export let isPopup = false;

	function handleDurationChange(event: { detail: { value: number } }) {
		durationChoice = event.detail.value;
		console.log('durationChoice', durationChoice);
	}
</script>

<div
	class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		AUTHORIZATION
	</div>
	<div class="text-black dark:text-white text-2xl font-semibold leading-7 whitespace-nowrap mt-2">
		{domain}
	</div>
	<div class="text-black dark:text-white text-base leading-5 whitespace-nowrap mt-2">
		would like to:
	</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-black dark:text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			{#if isPopup}
				{tr(parameter?.get('type'))}
			{:else}
				{tr('permission')}
			{/if}
		</div>
	</div>
</div>

<Duration on:durationChange={handleDurationChange} />

<div class="items-stretch flex w-full gap-3 mt-3">
	<button
		class="btn text-black dark:text-white bg-surface-400 font-medium leading-5 whitespace-nowrap justify-center bg-opacity-20 px-8 py-3 rounded-full"
	>
		Reject
	</button>
	<button
		class="btn bg-pink-400 dark:bg-teal-400 flex gap-2 px-20 py-3 rounded-full w-full place-content-center max-md:px-5"
	>
		<div class="text-black text-base font-medium leading-5">Confirm</div>
		<Icon icon="mdi:check" width={20} class="text-black" />
	</button>
</div>
