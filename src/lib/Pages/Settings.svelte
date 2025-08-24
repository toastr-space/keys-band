<script lang="ts">
	import Icon from '@iconify/svelte';
	import ToggleSwitch from '../components/ToggleSwitch.svelte';
	import { AppPageItem } from '$lib/components/App';
	import { userProfile } from '$lib/stores/data';
	import type { Relay } from '$lib/types';
	import { profileController } from '$lib/controllers/profile.controller';
	import { nip19 } from 'nostr-tools';

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
</script>

<AppPageItem name="settings">
	<div
		class="justify-center items-stretch kb-surface self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
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
					class="w-full h-12 px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:focus:ring-teal-400 focus:border-transparent transition-all"
					id="value"
					bind:value={relayInput}
					placeholder="Enter relay URL"
				/>
			</div>
			<div class="justify-center items-stretch">
				<button
					type="button"
					class="btn bg-pink-400 dark:bg-teal-400 text-black h-12 px-6 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
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
		class="justify-center items-stretch kb-surface self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
	>
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			KEYS
		</div>
		<!-- Get pubkey -->
		<div class="justify-start items-stretch flex gap-5 mt-2">
			<button
				type="button"
				class="btn btn-sm text-gray-500"
				on:click={() => {
					// Copy pubkey to clipboard
					navigator.clipboard.writeText($userProfile.data?.pubkey || '');
				}}
			>
				<Icon icon="mdi:key" class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
				Copy Public Key to Clipboard
			</button>
		</div>
		<!-- Get npub -->
		<div class="justify-start items-stretch flex gap-5 mt-2">
			<button
				type="button"
				class="btn btn-sm text-gray-500"
				on:click={() => {
					// Copy pubkey to clipboard
					navigator.clipboard.writeText(nip19.npubEncode($userProfile.data?.pubkey || ''));
				}}
			>
				<Icon icon="mdi:key-plus" class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
				Copy Npub to Clipboard
			</button>
		</div>
		<!-- Get private key-->
		<div class="justify-start items-stretch flex gap-5 mt-2">
			<button
				type="button"
				class="btn btn-sm text-gray-500"
				on:click={() => {
					// Copy nsec to clipboard
					navigator.clipboard.writeText($userProfile.data?.privateKey || '');
				}}
			>
				<Icon icon="mdi:key-outline" class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
				Copy Private Key to Clipboard
			</button>
		</div>
		<!-- Get nsec -->
		<div class="justify-start items-stretch flex gap-5 mt-2">
			<button
				type="button"
				class="btn btn-sm text-gray-500"
				on:click={() => {
					// Copy nsec to clipboard
					navigator.clipboard.writeText(nip19.nsecEncode($userProfile.data?.privateKey || ''));
				}}
			>
				<Icon icon="mdi:key-star" class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
				Copy Nsec to Clipboard
			</button>
		</div>
	</div>

	<div class="justify-center items-stretch self-stretch flex w-full flex-col mt-2 p-4 rounded-2xl">
		<a
			type="button"
			class="btn btn-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white rounded-2xl"
			href="https://geyser.fund/project/keysdotband"
			target="_blank"
			><Icon icon="mdi:lightning-bolt" class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
			Support Development Work</a
		>
	</div>
</AppPageItem>
