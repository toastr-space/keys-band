<script lang="ts">
	import Icon from '@iconify/svelte';
	import Duration from './Duration.svelte';

	let durationChoice: number = 0;

	function handleDurationChange(event: { detail: { value: number } }) {
		durationChoice = event.detail.value;
		console.log('durationChoice', durationChoice);
	}
</script>

<div
	class="justify-center items-stretch bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		AUTHORISATION
	</div>
	<div class="text-white text-2xl font-semibold leading-7 whitespace-nowrap mt-2">
		coracle.social
	</div>
	<div class="text-white text-base leading-5 whitespace-nowrap mt-2">would like to:</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			read your public key
		</div>
	</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			sign some events
		</div>
	</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			do some other stuff
		</div>
	</div>
</div>

<Duration on:durationChange={handleDurationChange} />

<div class="items-stretch flex w-full gap-3 mt-3">
	<button
		class="text-white hover:bg-surface-800 text-base font-medium leading-5 whitespace-nowrap justify-center bg-white bg-opacity-20 px-8 py-3 rounded-full"
	>
		Reject
	</button>
	<button
		class="bg-teal-400 hover:bg-teal-300 flex gap-2 px-20 py-3 rounded-full w-full place-content-center max-md:px-5"
	>
		<div class="text-black text-base font-medium leading-5">Confirm</div>
		<Icon icon="mdi:check" width={20} class="text-black" />
	</button>
</div>
