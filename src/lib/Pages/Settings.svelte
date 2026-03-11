<script lang="ts">
	import Icon from '@iconify/svelte';
	import ToggleSwitch from '../components/ToggleSwitch.svelte';
	import { AppPageItem } from '$lib/components/App';
	import { userProfile, profiles, browser, theme, duration } from '$lib/stores/data';
	import type { Relay, Profile, Duration } from '$lib/types';
	import { profileController } from '$lib/controllers/profile.controller';
	import { nip19 } from 'nostr-tools';
	import { web } from '$lib/utility';

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
	let restoreStatus = $state<'idle' | 'success' | 'error'>('idle');
	let restoreMessage = $state('');
	let fileInput: HTMLInputElement;
	let showRestoreTextarea = $state(false);
	let restoreJsonText = $state('');

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

	// Backup all settings
	const backupSettings = async () => {
		try {
			const currentProfileId = (await browser.get('currentProfile'))?.currentProfile;
			const currentTheme = (await browser.get('theme'))?.theme;
			const currentDuration = (await browser.get('duration'))?.duration;

			const backupData = {
				version: 1,
				exportDate: new Date().toISOString(),
				profiles: $profiles,
				currentProfile: currentProfileId,
				theme: currentTheme,
				duration: currentDuration
			};

			const blob = new Blob([JSON.stringify(backupData, null, 2)], {
				type: 'application/json'
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			const date = new Date().toISOString().split('T')[0];
			link.download = `keys-band-backup-${date}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Backup failed:', error);
			alert('Failed to create backup');
		}
	};

	// Restore settings from backup file
	const restoreSettings = async (event: Event) => {
		console.log('[Restore] Event triggered:', event.type);
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		console.log('[Restore] File selected:', file?.name, file?.size);

		if (!file) {
			console.log('[Restore] No file selected');
			return;
		}

		try {
			console.log('[Restore] Reading file...');
			const text = await file.text();
			console.log('[Restore] File content length:', text.length);
			const backupData = JSON.parse(text);
			console.log('[Restore] Parsed data:', Object.keys(backupData));

			// Validate backup format
			if (!backupData.version || !backupData.profiles) {
				throw new Error('Invalid backup file format');
			}

			console.log('[Restore] Restoring', backupData.profiles.length, 'profiles...');

			// Restore profiles
			if (Array.isArray(backupData.profiles)) {
				await browser.set({ profiles: backupData.profiles });
				profiles.set(backupData.profiles);
			}

			// Restore current profile
			if (backupData.currentProfile) {
				await browser.set({ currentProfile: backupData.currentProfile });
				const restoredProfile = backupData.profiles.find(
					(p: Profile) => p.id === backupData.currentProfile
				);
				if (restoredProfile) {
					userProfile.set(restoredProfile);
				}
			}

			// Restore theme
			if (backupData.theme) {
				await browser.set({ theme: backupData.theme });
				theme.set(backupData.theme);
				if (backupData.theme === 'dark') {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}

			// Restore duration
			if (backupData.duration) {
				await browser.set({ duration: backupData.duration });
				duration.set(backupData.duration as Duration);
			}

			console.log('[Restore] Success!');
			restoreStatus = 'success';
			restoreMessage = `Restored ${backupData.profiles.length} profile(s) successfully!`;

			// Reset file input
			input.value = '';

			// Clear status after 3 seconds
			setTimeout(() => {
				restoreStatus = 'idle';
				restoreMessage = '';
			}, 3000);

		} catch (error) {
			console.error('[Restore] Failed:', error);
			restoreStatus = 'error';
			restoreMessage = error instanceof Error ? error.message : 'Failed to restore backup';

			// Reset file input
			input.value = '';

			// Clear status after 3 seconds
			setTimeout(() => {
				restoreStatus = 'idle';
				restoreMessage = '';
			}, 3000);
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
						onclick={() => removeRelay(relay)}
					>
						<Icon icon="mdi:delete" class="text-black" />
					</button>
				</div>
			</div>
		{/each}
		<div class="justify-between items-stretch flex gap-5 mt-6">
			<div class="flex flex-grow">
				<div class="relative w-full">
					<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-mono text-sm pointer-events-none">wss://</span>
					<input
						type="text"
						class="w-full h-12 pl-16 pr-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:focus:ring-teal-400 focus:border-transparent transition-all"
						id="value"
						bind:value={relayInput}
						placeholder="relay.example.com"
					/>
				</div>
			</div>
			<div class="justify-center items-stretch">
				<button
					type="button"
					class="btn bg-pink-400 dark:bg-teal-400 text-black h-12 px-6 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
					onclick={addRelay}
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
				onclick={() => copyToClipboard($userProfile.data?.pubkey || '', 'pubkey')}
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
				onclick={() => copyToClipboard(nip19.npubEncode($userProfile.data?.pubkey || ''), 'npub')}
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
					onclick={() => showPrivateKey = !showPrivateKey}
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
					onclick={() => copyToClipboard($userProfile.data?.privateKey || '', 'privateKey')}
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
					onclick={() => showNsec = !showNsec}
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
					onclick={() => copyToClipboard(nip19.nsecEncode($userProfile.data?.privateKey || ''), 'nsec')}
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
				onclick={exportKeys}
			>
				<Icon icon="mdi:download" class="mr-2" width={20} />
				Export All Keys (keys.json)
			</button>
		</div>
	</div>

	<!-- Backup & Restore Section -->
	<div
		class="justify-center items-stretch kb-surface self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
	>
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			BACKUP & RESTORE
		</div>
		<p class="text-gray-500 dark:text-gray-400 text-sm mt-2">
			Create a complete backup of all your profiles, permissions, and settings.
		</p>

		<!-- Backup Button -->
		<div class="mt-4">
			<button
				type="button"
				class="btn w-full bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 px-4 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
				onclick={backupSettings}
			>
				<Icon icon="mdi:backup-restore" class="mr-2" width={20} />
				Create Full Backup
			</button>
		</div>

		<!-- Restore Button -->
		<div class="mt-3">
			<input
				type="file"
				accept=".json"
				class="hidden"
				bind:this={fileInput}
				onchange={restoreSettings}
			/>
			<button
				type="button"
				class="btn w-full bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white font-medium py-3 px-4 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
				onclick={() => {
					// Firefox: open dedicated restore page (popup closes when file picker opens)
					// Chrome: use inline file picker
					// @ts-ignore
					const isFirefox = typeof __BROWSER__ !== 'undefined' && __BROWSER__ === 'firefox';
					if (isFirefox) {
						// Firefox detected - open restore page in new tab
						web.tabs.create({ url: web.runtime.getURL('restore.html') });
					} else {
						fileInput.click();
					}
				}}
			>
				<Icon icon="mdi:upload" class="mr-2" width={20} />
				Restore from Backup
			</button>
		</div>

		<!-- Status Message -->
		{#if restoreStatus !== 'idle'}
			<div
				class="mt-3 p-3 rounded-lg text-sm {restoreStatus === 'success'
					? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
					: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}"
			>
				<div class="flex items-center gap-2">
					<Icon
						icon={restoreStatus === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'}
						width={20}
					/>
					{restoreMessage}
				</div>
			</div>
		{/if}
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
