<script lang="ts">
	import Icon from '@iconify/svelte';
	import { popup } from '@skeletonlabs/skeleton';
	import type { PopupSettings } from '@skeletonlabs/skeleton';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	interface Duration {
		name: string;
		value: number;
	}

	const durationOptions: Duration[] = [
		{
			name: 'One time',
			value: 0
		},
		{
			name: 'Always',
			value: 1
		},
		{
			name: 'Next 5 minutes',
			value: 2
		},
		{
			name: 'Next hour',
			value: 3
		},
		{
			name: 'Next 5 hours',
			value: 4
		},
		{
			name: 'Next 5 days',
			value: 5
		}
	];

	let duration: Duration = durationOptions[0];

	let durationDropdownMenuOpen = false;

	const durationDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'durationDropdownMenu',
		placement: 'bottom',
		state: () => (durationDropdownMenuOpen = false)
	};

	const selectDuration = (selectedDuration: Duration) => {
		duration = selectedDuration;
		durationDropdownMenuOpen = false;
		dispatch('durationChange', { value: duration.value });
	};
</script>

<div
	class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		DURATION
	</div>
	<div class="items-center flex gap-3 mt-2 pr-20 max-md:pr-5">
		<div class="text-black dark:text-white text-base leading-5 my-auto">Allow</div>
		<button
			class="btn bg-surface-400 dark:bg-surface-900 bg-opacity-30"
			use:popup={durationDropdownMenu}
			on:click={() => (durationDropdownMenuOpen = !durationDropdownMenuOpen)}
		>
			{duration.name}
			<Icon
				icon={durationDropdownMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
				width={28}
				class="ml-2 mt-1"
			/>
		</button>
	</div>
</div>

<div
	class="card w-42 shadow-xl backdrop-blur-xl bg-zinc-400 dark:bg-zinc-800 bg-opacity-70 pt-3 rounded-2xl border-[0.33px] border-solid border-white border-opacity-30"
	data-popup="durationDropdownMenu"
>
	<nav class="list-nav">
		<ul>
			{#each durationOptions as option}
				<li
					class="justify-center items-stretch self-stretch flex w-full flex-col mt-3 border-t-[0.33px] border-t-white border-t-opacity-30 border-solid"
				>
					<div class="justify-between items-stretch flex w-full gap-5">
						<div class="items-stretch flex justify-between gap-3">
							<button on:click={() => selectDuration(option)}>
								<div class="text-white dark:text-white text-base self-center my-auto">
									{option.name}
								</div>
								{#if duration.name === option.name}
									<Icon icon="mdi:check" width={22} class="text-pink-400 dark:text-teal-400" />
								{/if}
							</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</nav>
</div>
