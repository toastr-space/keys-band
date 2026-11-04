<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ToggleSwitch from '../components/ToggleSwitch.svelte';
	import { AppPageItem } from '$lib/components/App';
	import { userProfile, profiles } from '$lib/stores/data';
	import type { Relay } from '$lib/types';
	import { profileController } from '$lib/controllers/profile.controller';
	import { nip19 } from 'nostr-tools';
	import { web } from '$lib/utility';
	import {
		vaultController,
		validatePin,
		LOCK_NEVER,
		LOCK_ON_BROWSER_CLOSE
	} from '$lib/controllers/vault.controller';
	import { createBackup } from '$lib/controllers/backup.controller';

	let relays = $state<Relay[]>([]);
	let relayInput = $state('');
	// the private key is shown only after the passphrase is entered, and only for a minute
	const REVEAL_MS = 60_000;
	let revealing = $state(false);
	let revealPassphrase = $state('');
	let revealError = $state('');
	let revealed = $state<{ hex: string; nsec: string } | null>(null);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let copiedStates = $state({
		pubkey: false,
		npub: false,
		privateKey: false,
		nsec: false
	});

	// Security
	const lockOptions = [
		{ value: 5, name: 'After 5 minutes idle' },
		{ value: 15, name: 'After 15 minutes idle' },
		{ value: 60, name: 'After 1 hour idle' },
		{ value: 240, name: 'After 4 hours idle' },
		{ value: LOCK_ON_BROWSER_CLOSE, name: 'When the browser closes' },
		{ value: LOCK_NEVER, name: 'Never (stay unlocked across restarts)' }
	];
	let savedLockAfter = $state(15);
	let lockSelection = $state(15);
	let neverConfirmed = $state(false);
	let neverPassphrase = $state('');
	let hasPin = $state(false);
	let newPin = $state('');
	let confirmNewPin = $state('');
	let currentPassphrase = $state('');
	let newPassphrase = $state('');
	let confirmNewPassphrase = $state('');
	let exportPassphrase = $state('');
	let showExportForm = $state(false);
	let securityMessage = $state('');
	let securityError = $state(false);

	vaultController.getSettings().then((settings) => {
		savedLockAfter = lockSelection = settings.lockAfterMinutes;
	});
	vaultController.hasPin().then((value) => (hasPin = value)).catch(() => {});

	const securityResult = (message: string, isError = false) => {
		securityMessage = message;
		securityError = isError;
	};

	const lockNow = async () => {
		await vaultController.lock();
		location.reload();
	};

	const saveLockAfter = async (minutes: number) => {
		await vaultController.setSettings({ lockAfterMinutes: minutes });
		savedLockAfter = lockSelection = minutes;
	};

	// "Never" is the only weaker choice that needs explicit confirmation; others apply at once
	const selectLockAfter = async () => {
		const minutes = Number(lockSelection);
		neverConfirmed = false;
		neverPassphrase = '';
		if (minutes !== LOCK_NEVER) await saveLockAfter(minutes);
	};

	const confirmNever = async () => {
		if (!neverConfirmed) return securityResult('Tick the box to confirm you understand the risk', true);
		if (!(await vaultController.verifyPassphrase(neverPassphrase)))
			return securityResult('Wrong passphrase', true);
		neverPassphrase = '';
		await saveLockAfter(LOCK_NEVER);
		securityResult('Keys.Band will now stay unlocked across browser restarts');
	};

	const changePin = async () => {
		try {
			const problem = validatePin(newPin);
			if (problem) throw new Error(problem);
			if (newPin !== confirmNewPin) throw new Error('PINs do not match');
			await vaultController.changePin(newPin);
			newPin = confirmNewPin = '';
			securityResult(hasPin ? 'PIN changed' : 'PIN set up');
			hasPin = true;
		} catch (error) {
			securityResult(error instanceof Error ? error.message : 'Failed to change PIN', true);
		}
	};

	const removePin = async () => {
		try {
			await vaultController.changePin(null);
			hasPin = false;
			securityResult('PIN removed. Keys.Band now always unlocks with your passphrase.');
		} catch (error) {
			securityResult(error instanceof Error ? error.message : 'Failed to remove PIN', true);
		}
	};

	const changePassphrase = async () => {
		try {
			if (newPassphrase !== confirmNewPassphrase) throw new Error('New passphrases do not match');
			await vaultController.changePassphrase(currentPassphrase, newPassphrase);
			currentPassphrase = newPassphrase = confirmNewPassphrase = '';
			securityResult('Passphrase changed. Make a new backup: older backups still open with the old passphrase.');
		} catch (error) {
			securityResult(error instanceof Error ? error.message : 'Failed to change passphrase', true);
		}
	};

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

	const hideKey = () => {
		clearTimeout(hideTimer);
		revealed = null;
	};

	const revealKey = async () => {
		revealError = '';
		const privateKey = $userProfile.data?.privateKey;
		if (!privateKey) return (revealError = 'No private key available');
		if (!(await vaultController.verifyPassphrase(revealPassphrase))) return (revealError = 'Wrong passphrase');
		revealPassphrase = '';
		revealing = false;
		revealed = { hex: privateKey, nsec: nip19.nsecEncode(privateKey) };
		clearTimeout(hideTimer);
		hideTimer = setTimeout(hideKey, REVEAL_MS);
	};

	$effect(() => () => clearTimeout(hideTimer));

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

	const exportKeys = async () => {
		try {
			// a plaintext key file needs the passphrase, not just an unlocked session
			if (!(await vaultController.verifyPassphrase(exportPassphrase))) {
				alert('Wrong passphrase');
				return;
			}
			exportPassphrase = '';
			showExportForm = false;
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
			const backupData = await createBackup();

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
		<!-- Private key: needs the passphrase, like the export below -->
		<div class="flex flex-col gap-2 mt-2">
			<span class="text-black dark:text-white text-sm font-medium">Private Key</span>
			{#if revealed}
				{#each [['Hex', revealed.hex, 'privateKey'], ['Nsec', revealed.nsec, 'nsec']] as [label, value, copyKey]}
					<div class="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
						<div class="text-xs text-gray-500 dark:text-gray-400">{label}</div>
						<div class="font-mono text-sm text-black dark:text-white break-all select-all">{value}</div>
					</div>
					<button
						type="button"
						class="btn btn-sm text-gray-500 justify-start"
						on:click={() => copyToClipboard(value, copyKey as keyof typeof copiedStates)}
					>
						<Icon icon={copiedStates[copyKey as keyof typeof copiedStates] ? 'mdi:check' : 'mdi:key-outline'} class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
						{copiedStates[copyKey as keyof typeof copiedStates] ? 'Copied!' : `Copy ${label} to Clipboard`}
					</button>
				{/each}
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Hidden again after a minute. A copied key can stay in your clipboard history.
				</p>
				<button type="button" class="btn btn-sm text-gray-500 justify-start" on:click={hideKey}>
					<Icon icon="mdi:eye-off" class="mr-2" width={16} />
					Hide
				</button>
			{:else if revealing}
				<form class="flex gap-2" on:submit|preventDefault={revealKey}>
					<input
						type="password"
						class="form-input rounded-xl flex-grow bg-white dark:bg-stone-900 text-black dark:text-white"
						placeholder="Passphrase"
						bind:value={revealPassphrase}
					/>
					<button type="submit" class="btn bg-pink-400 dark:bg-teal-400 text-black rounded-xl px-4">Show</button>
				</form>
				{#if revealError}<div class="text-sm text-red-600 dark:text-red-400">{revealError}</div>{/if}
			{:else}
				<button
					type="button"
					class="btn btn-sm text-gray-500 justify-start"
					on:click={() => (revealing = true)}
				>
					<Icon icon="mdi:eye" class="text-pink-600 dark:text-teal-400 mr-2" width={20} />
					Show or copy private key (asks for passphrase)
				</button>
			{/if}
		</div>

		<!-- Export Keys -->
		<div class="border-t border-gray-200 dark:border-zinc-700 mt-4 pt-4">
			{#if showExportForm}
				<p class="text-gray-500 dark:text-gray-400 text-sm mb-2">
					keys.json contains your unencrypted nsec keys. Enter your passphrase to continue.
				</p>
				<form class="flex gap-2" on:submit|preventDefault={exportKeys}>
					<input
						type="password"
						class="form-input rounded-xl flex-grow bg-white dark:bg-stone-900 text-black dark:text-white"
						placeholder="Passphrase"
						bind:value={exportPassphrase}
					/>
					<button type="submit" class="btn bg-pink-400 dark:bg-teal-400 text-black rounded-xl px-4">Export</button>
				</form>
			{:else}
				<button
					type="button"
					class="btn w-full bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 px-4 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
					on:click={() => (showExportForm = true)}
				>
					<Icon icon="mdi:download" class="mr-2" width={20} />
					Export All Keys (keys.json)
				</button>
			{/if}
		</div>
	</div>

	<!-- Security Section -->
	<div
		class="justify-center items-stretch kb-surface self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl gap-2"
	>
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			SECURITY
		</div>
		<button
			type="button"
			class="btn w-full bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 px-4 rounded-xl mt-2"
			on:click={lockNow}
		>
			<Icon icon="mdi:lock" class="mr-2" width={20} />
			Lock now
		</button>

		<label class="text-sm text-black dark:text-white mt-2" for="lock-after">Lock automatically</label>
		<select
			id="lock-after"
			class="form-select rounded-xl bg-white dark:bg-stone-900 text-black dark:text-white"
			bind:value={lockSelection}
			on:change={selectLockAfter}
		>
			{#each lockOptions as option}
				<option value={option.value}>{option.name}</option>
			{/each}
		</select>

		{#if Number(lockSelection) === LOCK_NEVER && savedLockAfter !== LOCK_NEVER}
			<form
				class="flex flex-col gap-2 p-3 rounded-xl border border-red-500 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 text-sm"
				on:submit|preventDefault={confirmNever}
			>
				<div class="flex items-center gap-2 font-semibold">
					<Icon icon="mdi:alert" width={20} /> This removes most of the passphrase's protection
				</div>
				<p>
					To stay unlocked after the browser restarts, Keys.Band must save its unlock key
					<strong>unencrypted</strong> in this browser's profile on disk. Anyone or anything that can
					read your files could then take your Nostr private key without your passphrase: malware, a
					copy or backup of your browser profile, or a stolen computer without full-disk encryption.
					Anyone who uses this browser can also sign as you.
				</p>
				<p>Choosing “Lock now” deletes the saved key until you unlock again.</p>
				<label class="flex items-start gap-2">
					<input type="checkbox" class="mt-1" bind:checked={neverConfirmed} />
					<span>I understand that my private key will be readable from this computer's disk.</span>
				</label>
				<input
					type="password"
					placeholder="Passphrase to confirm"
					class="form-input rounded-xl bg-white dark:bg-stone-900 text-black dark:text-white"
					bind:value={neverPassphrase}
				/>
				<div class="flex gap-2">
					<button type="button" class="btn flex-grow bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white rounded-xl py-2" on:click={() => (lockSelection = savedLockAfter)}>
						Keep locking
					</button>
					<button type="submit" class="btn flex-grow bg-red-600 text-white rounded-xl py-2">Stay unlocked</button>
				</div>
			</form>
		{:else if savedLockAfter === LOCK_NEVER}
			<p class="text-xs p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
				Weaker security: Keys.Band never locks by itself and its unlock key is saved unencrypted on
				this computer. Choose another option to remove it.
			</p>
		{:else if savedLockAfter === LOCK_ON_BROWSER_CLOSE}
			<p class="text-xs p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
				Weaker security: Keys.Band stays unlocked whenever the browser is open, even while you are
				away from your computer.
			</p>
		{:else}
			<p class="text-xs text-gray-500 dark:text-gray-400">
				The passphrase is required after every browser restart{hasPin ? ' and after 5 wrong PINs' : ''}.
			</p>
		{/if}

		<form class="flex flex-col gap-2 mt-3" on:submit|preventDefault={changePin}>
			<span class="text-sm text-black dark:text-white">{hasPin ? 'Change PIN' : 'Set up a PIN for quick unlock'}</span>
			{#if !hasPin}
				<p class="text-xs p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
					A PIN is quicker but weaker than your passphrase: while the browser is open, someone with
					access to your computer and some technical skill could guess it. After 5 wrong PINs or a
					browser restart the passphrase is required.
				</p>
			{/if}
			<div class="flex gap-2">
				<input type="password" inputmode="numeric" maxlength="8" placeholder="New PIN" class="form-input rounded-xl w-full bg-white dark:bg-stone-900 text-black dark:text-white" bind:value={newPin} />
				<input type="password" inputmode="numeric" maxlength="8" placeholder="Again" class="form-input rounded-xl w-full bg-white dark:bg-stone-900 text-black dark:text-white" bind:value={confirmNewPin} />
			</div>
			<button type="submit" class="btn bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white rounded-xl py-2">
				{hasPin ? 'Change PIN' : 'Set up PIN'}
			</button>
			{#if hasPin}
				<button type="button" class="btn text-sm text-gray-600 dark:text-gray-400 py-1" on:click={removePin}>
					Remove PIN (always unlock with passphrase)
				</button>
			{/if}
		</form>

		<form class="flex flex-col gap-2 mt-3" on:submit|preventDefault={changePassphrase}>
			<span class="text-sm text-black dark:text-white">Change passphrase</span>
			<input type="password" placeholder="Current passphrase" class="form-input rounded-xl bg-white dark:bg-stone-900 text-black dark:text-white" bind:value={currentPassphrase} />
			<input type="password" placeholder="New passphrase (12+ characters)" class="form-input rounded-xl bg-white dark:bg-stone-900 text-black dark:text-white" bind:value={newPassphrase} />
			<input type="password" placeholder="New passphrase again" class="form-input rounded-xl bg-white dark:bg-stone-900 text-black dark:text-white" bind:value={confirmNewPassphrase} />
			<button type="submit" class="btn bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white rounded-xl py-2">Change passphrase</button>
		</form>

		{#if securityMessage}
			<div class="text-sm mt-1 {securityError ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}">
				{securityMessage}
			</div>
		{/if}
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
			Create a complete backup of all your profiles, permissions, and settings. Keys in the
			backup stay encrypted with your passphrase.
		</p>

		<!-- Backup Button -->
		<div class="mt-4">
			<button
				type="button"
				class="btn w-full bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 px-4 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
				on:click={backupSettings}
			>
				<Icon icon="mdi:backup-restore" class="mr-2" width={20} />
				Create Full Backup
			</button>
		</div>

		<!-- Restore Button: the restore page checks the vault and shows what a backup contains -->
		<div class="mt-3">
			<button
				type="button"
				class="btn w-full bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white font-medium py-3 px-4 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
				on:click={() => web.tabs.create({ url: web.runtime.getURL('restore.html') })}
			>
				<Icon icon="mdi:upload" class="mr-2" width={20} />
				Restore from Backup
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
