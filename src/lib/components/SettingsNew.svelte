<script lang="ts">
	import Icon from '@iconify/svelte';
	import { writable, type Writable } from 'svelte/store';
	import type { Relay } from '$lib/types/profile';
	import ToggleSwitch from './ToggleSwitch.svelte';

	export let relays: Writable<Relay[]> = writable([
		{
			url: 'https://relay1.nostr.space',
			enabled: true,
			created_at: new Date()
		},
		{
			url: 'https://relay2.nostr.space',
			enabled: true,
			created_at: new Date()
		}
	]);
	let notifications: any[] = [];
	let relayInput: string = '';
	let preferenceOne = true;
	let preferenceTwo = false;

	function handleTogglePreferenceOne(event: CustomEvent) {
		preferenceOne = event.detail;
		// Additional logic based on the new state
	}

	function handleTogglePreferenceTwo(event: CustomEvent) {
		preferenceTwo = event.detail;
		// Additional logic based on the new state
	}

	function showNotification(message: string) {
		notifications = [
			...notifications,
			{
				message
			}
		];
		setTimeout(() => {
			notifications = notifications.slice(1);
		}, 3000);
	}
</script>

<!-- Section 1 -->
<div
	class="justify-center items-stretch bg-black bg-opacity-30 self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		RELAYS
	</div>
	{#each $relays as relay}
		<div class="justify-between items-stretch flex gap-5 mt-2">
			<div class="text-white text-base leading-5 my-auto">{relay.url}</div>
			<div class="justify-center items-stretch">
				<button
					class="btn-icon btn-icon-sm bg-teal-400"
					on:click={() => {
						// remove
						// relays.set($relays.filter((r) => r.url !== relay.url));
						// web?.storage?.local?.set({
						// 	relays: $relays
						// });
						//showNotification('relay removed');
					}}
				>
					<Icon icon="mdi:delete" class="text-black" />
				</button>
			</div>
		</div>
	{/each}
	<div class="justify-between items-stretch flex gap-5 mt-6">
		<div class="flex flex-grow">
			<input
				type="text"
				class="input input-bordered w-9/12 h-10 custom-placeholder px-4"
				id="value"
				bind:value={relayInput}
				placeholder="Enter relay url"
			/>
		</div>
		<div class="justify-center items-stretch">
			<button
				type="button"
				class="btn bg-teal-400 text-black"
				on:click={() => {
					// relays.set([
					// 	...$relays,
					// 	{
					// 		url: relayInput,
					// 		enabled: true,
					// 		created_at: new Date()
					// 	}
					// ]);
					// // web?.storage?.local?.set({
					// // 	relays: $relays
					// // });
					// relayInput = '';
					// showNotification('relay added');
				}}
			>
				<Icon icon="mdi:plus" class="text-black" width={20} />
				Add
			</button>
		</div>
	</div>
</div>

<!-- Section 2 -->
<div
	class="justify-center items-stretch bg-black bg-opacity-30 self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		CATEGORY 2
	</div>
	<div class="justify-between items-stretch flex gap-5 mt-2">
		<div class="text-white text-base leading-5 my-auto">A certain preference</div>
		<ToggleSwitch bind:isToggled={preferenceOne} on:change={handleTogglePreferenceOne} />
	</div>
	<div class="justify-between items-stretch flex gap-5 mt-2">
		<div class="text-white text-base leading-5 my-auto">Disabled something</div>
		<ToggleSwitch bind:isToggled={preferenceTwo} on:change={handleTogglePreferenceTwo} />
	</div>
</div>

<div class="justify-center items-stretch self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl">
	<div class="text-teal-400 text-center text-base whitespace-nowrap">
		<span class="text-white">Made by the</span>
		<a href="https://toastr.space" target="_blank" class="text-teal-400">toastr.space</a>
		<span class="text-white">team</span>
	</div>

	<button type="button" class="btn btn-lg bg-surface-700 mt-4"
		><Icon icon="mdi:lightning-bolt" class="text-teal-500" />
		Support</button
	>
</div>

<style>
	.custom-placeholder::placeholder {
		padding-left: 4px;
	}
</style>
