<script lang="ts">
	import Icon from '@iconify/svelte';
	import ToggleSwitch from '../components/ToggleSwitch.svelte';
	import { AppPageItem } from '$lib/components/App';
	import { showNotification, userProfile } from '$lib/stores/data';
	import type { Relay } from '$lib/types';
	import { profileController } from '$lib/controllers/profile.controller';

	$: relays = $userProfile.data?.relays || [];
	let relayInput: string = '';

	const addRelay = () => {
		profileController.addRelayToProfile(relayInput).then(() => {
			relayInput = '';
		});
	};
	const removeRelay = (relay: Relay) => {
		profileController.removeRelayFromProfile(relay);
	};

	function handleToggleNotification(event: CustomEvent) {
		showNotification.set(event.detail);
	}
</script>

<AppPageItem name="settings">
	<div
		class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
	>
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			RELAYS
		</div>
		{#each relays as relay}
			<div class="justify-between items-stretch flex gap-5 mt-2">
				<div class="text-black dark:text-white text-base leading-5 my-auto">{relay?.url}</div>
				<div class="justify-center items-stretch">
					<button
						class="btn-icon btn-icon-sm bg-pink-400 dark:bg-teal-400"
						on:click={() => removeRelay(relay)}
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
					class="btn bg-pink-400 dark:bg-teal-400 text-black"
					on:click={addRelay}
				>
					<Icon icon="mdi:plus" class="text-black" width={20} />
					Add
				</button>
			</div>
		</div>
	</div>

	<!-- Section 2 -->
	<div
		class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
	>
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			General settings
		</div>
		<div class="justify-between items-stretch flex gap-5 mt-2">
			<div class="text-black dark:text-white text-base leading-5 my-auto">Enable Notification</div>
			<ToggleSwitch bind:isToggled={$showNotification} on:change={handleToggleNotification} />
		</div>
	</div>

	<div class="justify-center items-stretch self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl">
		<div class="text-teal-400 text-center text-base whitespace-nowrap">
			<span class="text-black dark:text-white">Made by the</span>
			<a href="https://toastr.space" target="_blank" class="text-pink-600 dark:text-teal-400"
				>toastr.space</a
			>
			<span class="text-black dark:text-white">team</span>
		</div>

		<button
			type="button"
			class="btn btn-lg bg-surface-400 dark:bg-surface-600 mt-4 text-black dark:text-white"
			><Icon icon="mdi:lightning-bolt" class="text-pink-600 dark:text-teal-500" />
			Support</button
		>
	</div>

	<style>
		.custom-placeholder::placeholder {
			padding-left: 4px;
		}
	</style>
</AppPageItem>
