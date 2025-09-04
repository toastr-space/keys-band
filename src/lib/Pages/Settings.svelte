<script lang="ts">
	import Icon from '@iconify/svelte';
	import ToggleSwitch from '../components/ToggleSwitch.svelte';
	import { AppPageItem } from '$lib/components/App';
	import { userProfile, profiles } from '$lib/stores/data';
	import type { Relay } from '$lib/types';
	import { profileController } from '$lib/controllers/profile.controller';
	import { nip19 } from 'nostr-tools';

	let relays = $state<Relay[]>([]);
	let relayInput = $state('');
	let showPrivateKey = $state(false);
	let showNsec = $state(false);
	let copiedStates = $state({
		pubkey: false,
		npub: false,
		privateKey: false,
		nsec: false
	});

	// Watch for changes in userProfile and update relays
	$effect(() => {
		const newRelays = $userProfile.data?.relays || [];
		console.log('Settings: userProfile changed, updating relays:', newRelays);
		relays = newRelays;
	});

	const addRelay = () => {
		profileController.addRelayToProfile(relayInput).then(() => {
			relayInput = '';
		});
	};
	const removeRelay = (relay: Relay) => {
		profileController.removeRelayFromProfile(relay);
	};

	const copyToClipboard = async (text: string, key: keyof typeof copiedStates) => {
		try {
			await navigator.clipboard.writeText(text);
			copiedStates[key] = true;
			// Reset after 2 seconds
			setTimeout(() => {
				copiedStates[key] = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	};

	const exportKeys = () => {
		try {
			// Create export data
			const exportData = $profiles.map(profile => ({
				name: profile.name || 'Unknown',
				nsec: profile.data?.privateKey ? nip19.nsecEncode(profile.data.privateKey) : 'N/A'
			}));

			// Create blob and download
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
				type: 'application/json' 
			});
			
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'keys.json';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Export failed:', error);
			alert('Failed to export keys');
		}
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
		<div class="flex justify-start mt-2">
			<button
				type="button"
				class="btn btn-sm text-gray-500 justify-start"
				on:click={() => copyToClipboard($userProfile.data?.pubkey || '', 'pubkey')}
			>
				<Icon icon={copiedStates.pubkey ? "mdi:check" : "mdi:key"} class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
				{copiedStates.pubkey ? 'Copied!' : 'Copy Public Key to Clipboard'}
			</button>
		</div>
		<!-- Get npub -->
		<div class="flex justify-start mt-2">
			<button
				type="button"
				class="btn btn-sm text-gray-500 justify-start"
				on:click={() => copyToClipboard(nip19.npubEncode($userProfile.data?.pubkey || ''), 'npub')}
			>
				<Icon icon={copiedStates.npub ? "mdi:check" : "mdi:key-plus"} class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
				{copiedStates.npub ? 'Copied!' : 'Copy Npub to Clipboard'}
			</button>
		</div>
		<!-- Get private key-->
		<div class="flex flex-col gap-3 mt-2">
			<div class="flex items-center justify-between">
				<span class="text-black dark:text-white text-sm font-medium">Private Key</span>
				<button
					type="button"
					class="btn btn-sm text-gray-500 hover:text-pink-600 dark:hover:text-teal-400"
					on:click={() => showPrivateKey = !showPrivateKey}
				>
					<Icon icon={showPrivateKey ? "mdi:eye-off" : "mdi:eye"} class="mr-2" width={16} />
					{showPrivateKey ? 'Hide' : 'Show'}
				</button>
			</div>
			
			{#if showPrivateKey}
				<div class="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
					<div class="font-mono text-sm text-black dark:text-white break-all select-all">
						{$userProfile.data?.privateKey || 'No private key available'}
					</div>
				</div>
			{/if}
			
			<div class="flex justify-start">
				<button
					type="button"
					class="btn btn-sm text-gray-500 justify-start"
					on:click={() => copyToClipboard($userProfile.data?.privateKey || '', 'privateKey')}
				>
					<Icon icon={copiedStates.privateKey ? "mdi:check" : "mdi:key-outline"} class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
					{copiedStates.privateKey ? 'Copied!' : 'Copy Private Key to Clipboard'}
				</button>
			</div>
		</div>
		<!-- Get nsec -->
		<div class="flex flex-col gap-3 mt-2">
			<div class="flex items-center justify-between">
				<span class="text-black dark:text-white text-sm font-medium">Nsec Key</span>
				<button
					type="button"
					class="btn btn-sm text-gray-500 hover:text-pink-600 dark:hover:text-teal-400"
					on:click={() => showNsec = !showNsec}
				>
					<Icon icon={showNsec ? "mdi:eye-off" : "mdi:eye"} class="mr-2" width={16} />
					{showNsec ? 'Hide' : 'Show'}
				</button>
			</div>
			
			{#if showNsec}
				<div class="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
					<div class="font-mono text-sm text-black dark:text-white break-all select-all">
						{$userProfile.data?.privateKey ? nip19.nsecEncode($userProfile.data.privateKey) : 'No private key available'}
					</div>
				</div>
			{/if}
			
			<div class="flex justify-start">
				<button
					type="button"
					class="btn btn-sm text-gray-500 justify-start"
					on:click={() => copyToClipboard(nip19.nsecEncode($userProfile.data?.privateKey || ''), 'nsec')}
				>
					<Icon icon={copiedStates.nsec ? "mdi:check" : "mdi:key-star"} class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
					{copiedStates.nsec ? 'Copied!' : 'Copy Nsec to Clipboard'}
				</button>
			</div>
		</div>
		
		<!-- Export Keys -->
		<div class="border-t border-gray-200 dark:border-zinc-700 mt-4 pt-4">
			<button
				type="button"
				class="btn w-full bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 px-4 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
				on:click={exportKeys}
			>
				<Icon icon="mdi:download" class="mr-2" width={20} />
				Export All Keys (keys.json)
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
