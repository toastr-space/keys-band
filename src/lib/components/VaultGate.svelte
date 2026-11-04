<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { profiles } from '$lib/stores/data';
	import { web } from '$lib/utility';
	import { profileController } from '$lib/controllers/profile.controller';
	import {
		vaultController,
		generatePassphrase,
		validatePassphrase,
		validatePin,
		type VaultStatus
	} from '$lib/controllers/vault.controller';

	let { status, onunlocked }: { status: VaultStatus; onunlocked: () => void } = $props();

	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let pin = $state('');
	let confirmPin = $state('');
	let usePin = $state(false);
	let setupPin = $state(true);
	let busy = $state(false);
	let error = $state('');

	const legacyCount = get(profiles).filter((p) => p.data?.privateKey).length;

	onMount(async () => {
		if (status === 'locked') usePin = await vaultController.canUnlockWithPin();
	});

	const inputClass =
		'form-input rounded-full focus:border-gray-400 focus:ring-gray-400 text-stone-900 focus:text-black bg-white dark:text-gray-300 dark:focus:text-white dark:bg-stone-900 py-3 px-4 w-full';

	async function run(action: () => Promise<void>) {
		error = '';
		busy = true;
		try {
			await action();
			onunlocked();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			pin = '';
		} finally {
			busy = false;
		}
	}

	const setup = () =>
		run(async () => {
			const problem = validatePassphrase(passphrase) || (setupPin ? validatePin(pin) : null);
			if (problem) throw new Error(problem);
			if (passphrase !== confirmPassphrase) throw new Error('Passphrases do not match');
			if (setupPin && pin !== confirmPin) throw new Error('PINs do not match');

			// move keys saved by earlier versions into the vault, then rewrite profiles without them
			const legacyKeys = Object.fromEntries(
				get(profiles)
					.filter((p) => p.id && p.data?.privateKey)
					.map((p) => [p.id as string, p.data?.privateKey as string])
			);
			await vaultController.setup(passphrase, setupPin ? pin : null, legacyKeys);
			// only now that the vault holds the keys, rewrite the stored profiles without them
			await profileController.migrateStoredProfiles();
			// popup request data written by earlier versions could contain a key copy
			await web.storage.local.remove('sessionData');
		});

	const unlock = () =>
		run(async () => {
			if (usePin) {
				try {
					await vaultController.unlockWithPin(pin);
				} catch (e) {
					usePin = await vaultController.canUnlockWithPin();
					throw e;
				}
			} else await vaultController.unlockWithPassphrase(passphrase);
		});
</script>

<div class="w-full h-full flex flex-col gap-3 p-4 dark:bg-[#222222] bg-white overflow-auto">
	<div class="flex flex-col items-center gap-2 mt-2">
		<Icon icon={status === 'uninitialized' ? 'mdi:shield-key' : 'mdi:lock'} width={40} class="text-pink-600 dark:text-teal-400" />
		<div class="text-black dark:text-white text-xl font-semibold">
			{status === 'uninitialized' ? 'Protect your keys' : 'Keys.Band is locked'}
		</div>
	</div>

	{#if status === 'uninitialized'}
		<form class="kb-surface rounded-2xl p-4 flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); setup(); }}>
			<p class="text-sm text-black dark:text-white opacity-80">
				Your keys are encrypted with a passphrase. You need it to unlock Keys.Band, and always
				after a browser restart.
				{#if legacyCount > 0}
					Your {legacyCount} existing key(s) will be moved into the encrypted vault.
				{/if}
			</p>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-[2px] text-gray-800 dark:text-gray-400">PASSPHRASE</span>
				<button
					type="button"
					class="text-xs text-pink-600 dark:text-teal-400"
					onclick={() => {
						passphrase = generatePassphrase();
						confirmPassphrase = '';
					}}
				>
					Generate one
				</button>
			</div>
			<input class={inputClass} type="text" autocomplete="off" spellcheck="false" placeholder="At least 12 characters" bind:value={passphrase} />
			<input class={inputClass} type="password" autocomplete="new-password" placeholder="Type it again" bind:value={confirmPassphrase} />
			<p class="text-xs text-black dark:text-white opacity-60">
				Write it down and keep it safe. It cannot be recovered; without it your keys are only
				available from your own nsec backup.
			</p>
			<span class="text-xs font-semibold tracking-[2px] text-gray-800 dark:text-gray-400">
				PIN FOR QUICK UNLOCK (RECOMMENDED)
			</span>
			{#if setupPin}
				<div class="flex gap-2">
					<input class={inputClass} type="password" inputmode="numeric" maxlength="8" placeholder="4–8 digits" bind:value={pin} />
					<input class={inputClass} type="password" inputmode="numeric" maxlength="8" placeholder="Again" bind:value={confirmPin} />
				</div>
				<p class="text-xs text-black dark:text-white opacity-60">
					Unlocks Keys.Band until the browser closes. A PIN is quicker but weaker than your
					passphrase: someone using your computer while the browser is open, with some technical
					skill, could guess it. After 5 wrong PINs or a browser restart the passphrase is required.
				</p>
				<button type="button" class="text-xs text-gray-600 dark:text-gray-400 self-start" onclick={() => { setupPin = false; pin = confirmPin = ''; }}>
					Skip, always use my passphrase
				</button>
			{:else}
				<p class="text-xs text-black dark:text-white opacity-60">
					You'll unlock with your passphrase every time. You can add a PIN later in Settings.
				</p>
				<button type="button" class="text-xs text-pink-600 dark:text-teal-400 self-start" onclick={() => (setupPin = true)}>
					Set up a PIN
				</button>
			{/if}
			{#if error}<div class="text-sm text-red-600 dark:text-red-400">{error}</div>{/if}
			<button type="submit" class="btn bg-pink-400 dark:bg-teal-400 text-black rounded-full py-3" disabled={busy}>
				{busy ? 'Encrypting…' : 'Encrypt my keys'}
			</button>
		</form>
	{:else}
		<form class="kb-surface rounded-2xl p-4 flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); unlock(); }}>
			{#if usePin}
				<input class={inputClass} type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autofocus bind:value={pin} />
			{:else}
				<input class={inputClass} type="password" autocomplete="current-password" placeholder="Passphrase" autofocus bind:value={passphrase} />
			{/if}
			{#if error}<div class="text-sm text-red-600 dark:text-red-400">{error}</div>{/if}
			<button type="submit" class="btn bg-pink-400 dark:bg-teal-400 text-black rounded-full py-3" disabled={busy}>
				{busy ? 'Unlocking…' : 'Unlock'}
			</button>
			{#if usePin}
				<button type="button" class="text-xs text-gray-600 dark:text-gray-400" onclick={() => { usePin = false; error = ''; }}>
					Use passphrase instead
				</button>
			{/if}
		</form>
	{/if}
</div>
