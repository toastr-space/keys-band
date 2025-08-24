<script lang="ts">
	import Icon from '@iconify/svelte';
	import { popup } from '@skeletonlabs/skeleton';
	import type { PopupSettings } from '@skeletonlabs/skeleton';
	import { createEventDispatcher, onMount } from 'svelte';

	import { duration } from '$lib/stores/data';
	import { profileController } from '$lib/controllers/profile.controller';

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

	let durationDropdownMenuOpen = false;

	const durationDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'durationDropdownMenu',
		placement: 'bottom',
		state: () => (durationDropdownMenuOpen = false)
	};

	const selectDuration = (selectedDuration: Duration) => {
		profileController.updateDuration(selectedDuration);
		durationDropdownMenuOpen = false;
		dispatch('durationChange', { value: selectedDuration.value });
	};

	onMount(() => {
		selectDuration($duration);
	});
</script>

<div
	class="justify-center items-stretch kb-surface flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		DURATION
	</div>
	<div class="items-center flex gap-3 mt-2 pr-20 max-md:pr-5">
		<div class="text-black dark:text-white text-base leading-5 my-auto">Allow</div>
		<button
			class="btn text-black dark:text-white kb-button rounded-2xl transition-colors"
			use:popup={durationDropdownMenu}
			on:click={() => (durationDropdownMenuOpen = !durationDropdownMenuOpen)}
		>
			{$duration.name}
			<Icon
				icon={durationDropdownMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
				width={28}
				class="text-black dark:text-white ml-2 mt-1"
			/>
		</button>
	</div>
</div>

	<div data-popup="durationDropdownMenu">
		<div
			class="card w-42 shadow-xl backdrop-blur-xl kb-surface-strong rounded-2xl border-[0.33px] border-solid border-black/10 dark:border-white/10"
		>
		<nav class="list-nav">
			<ul>
				{#each durationOptions as option, i}
					<li
						class="justify-center items-stretch self-stretch flex w-full flex-col mt-3 border-t-black dark:border-t-white border-t-opacity-30 border-solid"
						class:border-t-[0.33px]={i !== 0}
					>
						<div class="justify-between items-stretch flex w-full gap-5">
							<div class="items-stretch flex justify-between gap-3">
								<button on:click={() => selectDuration(option)}>
									<div
										class="text-black dark:text-white dark:text-white text-base self-center my-auto"
									>
										{option.name}
									</div>
									{#if $duration.name === option.name}
										<Icon icon="mdi:check" width={22} class="text-pink-600 dark:text-teal-400" />
									{/if}
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</div>
