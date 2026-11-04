<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import Icon from '$lib/components/Icon.svelte';
	import VaultGate from '$lib/components/VaultGate.svelte';
	import { profileController } from '$lib/controllers/profile.controller';
	import { vaultController, type VaultStatus } from '$lib/controllers/vault.controller';
	import { applyRestore, parseBackup, type RestorePlan } from '$lib/controllers/backup.controller';
	import { profiles } from '$lib/stores/data';

	let loading = $state(true);
	let vaultStatus = $state<VaultStatus>('locked');
	let canRestore = $state(false);
	let plan = $state<RestorePlan | null>(null);
	let includePermissions = $state(false);
	let currentPassphrase = $state('');
	let busy = $state(false);
	let restoreStatus = $state<'idle' | 'success' | 'error'>('idle');
	let restoreMessage = $state('');
	let fileInput: HTMLInputElement;

	// A locked Keys.Band must be unlocked first, so nobody can restore permissions or replace keys
	// without the PIN or passphrase. A fresh install has nothing to protect yet.
	const check = async () => {
		await profileController.loadTheme();
		await profileController.loadProfiles();
		vaultStatus = await vaultController.status();
		canRestore = vaultStatus === 'unlocked' || (vaultStatus === 'uninitialized' && get(profiles).length === 0);
		loading = false;
	};

	onMount(check);

	const fail = (error: unknown) => {
		restoreStatus = 'error';
		restoreMessage = error instanceof Error ? error.message : 'Failed to restore backup';
	};

	const selectFile = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			plan = parseBackup(JSON.parse(await file.text()));
			includePermissions = false;
			currentPassphrase = '';
			restoreStatus = 'idle';
		} catch (error) {
			plan = null;
			fail(error);
		}
	};

	const restore = async () => {
		if (!plan) return;
		busy = true;
		try {
			const count = await applyRestore(plan, { includePermissions, currentPassphrase });
			restoreStatus = 'success';
			restoreMessage = plan.vault
				? `Restored ${count} account(s). Open Keys.Band and unlock it with the passphrase that was in use when this backup was made.`
				: `Restored ${count} account(s). You can close this tab.`;
			plan = null;
		} catch (error) {
			fail(error);
		} finally {
			currentPassphrase = '';
			busy = false;
		}
	};
</script>

{#if loading}
	<div class="min-h-screen bg-white dark:bg-[#222222]"></div>
{:else if !canRestore}
	<div class="min-h-screen bg-white dark:bg-[#222222] flex items-center justify-center p-8">
		<div class="max-w-md w-full">
			<p class="text-center text-gray-500 dark:text-gray-400 mb-4">Unlock Keys.Band to restore a backup.</p>
			<VaultGate status={vaultStatus} onunlocked={check} />
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-white dark:bg-[#222222] flex items-center justify-center p-8">
		<div class="max-w-md w-full">
			<div class="text-center mb-8">
				<img src="assets/logo-on-64.png" alt="Keys.Band" class="w-16 h-16 mx-auto mb-4" />
				<h1 class="text-2xl font-bold text-black dark:text-white">Restore Backup</h1>
				<p class="text-gray-500 dark:text-gray-400 mt-2">
					Select a backup file. You'll see what it contains before anything changes.
				</p>
			</div>

			<div class="kb-surface p-6 rounded-2xl flex flex-col gap-4">
				<input type="file" accept=".json" class="hidden" bind:this={fileInput} onchange={selectFile} />

				{#if plan}
					<div class="text-black dark:text-white">
						<div class="font-medium">This backup contains {plan.profiles.length} account(s):</div>
						<ul class="text-sm mt-1 list-disc pl-5 break-all">
							{#each plan.profiles as profile}
								<li>{profile.name}</li>
							{/each}
						</ul>
					</div>

					{#if plan.vault}
						<div class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm flex flex-col gap-2">
							<div class="flex items-center gap-2 font-medium">
								<Icon icon="mdi:alert" width={20} /> Replaces your keys
							</div>
							<p>
								The keys in Keys.Band are replaced by the ones in this backup. Any account that is not in
								the backup is lost unless you have its nsec elsewhere. Afterwards, unlock with the passphrase
								that was in use when the backup was made.
							</p>
							{#if vaultStatus === 'unlocked'}
								<input
									type="password"
									class="form-input rounded-xl bg-white dark:bg-stone-900 text-black dark:text-white"
									placeholder="Your current passphrase"
									bind:value={currentPassphrase}
								/>
							{/if}
						</div>
					{:else if Object.keys(plan.legacyKeys).length > 0}
						<p class="text-sm p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
							This older backup contains {Object.keys(plan.legacyKeys).length} unencrypted key(s). They will
							be added to your encrypted vault. Delete the backup file afterwards.
						</p>
					{/if}

					{#if plan.sitesWithPermissions.length > 0}
						<label class="flex items-start gap-2 text-sm text-black dark:text-white">
							<input type="checkbox" class="mt-1" bind:checked={includePermissions} />
							<span>
								Also restore remembered permissions for these sites. Leave this off unless you made this
								backup yourself.
								<ul class="mt-1 list-disc pl-5 break-all text-gray-600 dark:text-gray-400">
									{#each plan.sitesWithPermissions as site}
										<li>{site}</li>
									{/each}
								</ul>
							</span>
						</label>
					{/if}

					{#if plan.ignoredLockSetting}
						<p class="text-xs text-gray-500 dark:text-gray-400">
							The backup's lock setting is weaker than the default and is not restored. You can choose it
							in Settings.
						</p>
					{/if}

					<div class="flex gap-2">
						<button
							type="button"
							class="btn flex-grow bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white py-3 rounded-xl"
							onclick={() => (plan = null)}
						>
							Cancel
						</button>
						<button
							type="button"
							class="btn flex-grow bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 rounded-xl"
							disabled={busy}
							onclick={restore}
						>
							{busy ? 'Restoring…' : 'Restore'}
						</button>
					</div>
				{:else if restoreStatus !== 'success'}
					<button
						type="button"
						class="btn w-full bg-pink-400 dark:bg-teal-400 text-black font-medium py-4 px-6 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors text-lg"
						onclick={() => fileInput.click()}
					>
						<Icon icon="mdi:folder-open" class="mr-2" width={24} />
						Select Backup File
					</button>
				{/if}

				{#if restoreStatus === 'success'}
					<div class="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
						<div class="flex items-center gap-3">
							<Icon icon="mdi:check-circle" width={32} />
							<div class="text-sm">{restoreMessage}</div>
						</div>
					</div>
					<button
						type="button"
						class="btn w-full bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white font-medium py-3 px-4 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
						onclick={() => window.close()}
					>
						Close Tab
					</button>
				{/if}

				{#if restoreStatus === 'error'}
					<div class="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
						<div class="flex items-center gap-3">
							<Icon icon="mdi:alert-circle" width={32} />
							<div class="text-sm">{restoreMessage}</div>
						</div>
					</div>
				{/if}
			</div>

			<p class="text-center text-gray-400 dark:text-gray-500 text-sm mt-6">
				Backup files are JSON files exported from Keys.Band
			</p>
		</div>
	</div>
{/if}

<style>
	.kb-surface {
		background-color: #f4f4f5;
	}
	:global(.dark) .kb-surface {
		background-color: #3f3f46;
	}
	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: none;
	}
</style>
