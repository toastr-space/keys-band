<script lang="ts">
	import Icon from '@iconify/svelte';
	import { restoreBackup } from '$lib/controllers/backup.controller';

	let restoreStatus = $state<'idle' | 'success' | 'error'>('idle');
	let restoreMessage = $state('');
	let fileInput: HTMLInputElement;

	const restoreSettings = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const text = await file.text();
			const backupData = JSON.parse(text);
			const count = await restoreBackup(backupData);

			if (backupData.theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else if (backupData.theme) {
				document.documentElement.classList.remove('dark');
			}

			restoreStatus = 'success';
			restoreMessage = `Restored ${count} profile(s) successfully! You can close this tab.`;

			// Reset file input
			input.value = '';

		} catch (error) {
			console.error('Restore failed:', error);
			restoreStatus = 'error';
			restoreMessage = error instanceof Error ? error.message : 'Failed to restore backup';

			// Reset file input
			input.value = '';
		}
	};
</script>

<div class="min-h-screen bg-white dark:bg-[#222222] flex items-center justify-center p-8">
	<div class="max-w-md w-full">
		<div class="text-center mb-8">
			<img src="assets/logo-on-64.png" alt="Keys.Band" class="w-16 h-16 mx-auto mb-4" />
			<h1 class="text-2xl font-bold text-black dark:text-white">Restore Backup</h1>
			<p class="text-gray-500 dark:text-gray-400 mt-2">
				Select your backup file to restore all profiles and settings.
			</p>
		</div>

		<div class="kb-surface p-6 rounded-2xl">
			<input
				type="file"
				accept=".json"
				class="hidden"
				bind:this={fileInput}
				onchange={restoreSettings}
			/>

			{#if restoreStatus === 'idle'}
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
						<div>
							<div class="font-medium">Success!</div>
							<div class="text-sm">{restoreMessage}</div>
						</div>
					</div>
				</div>
				<button
					type="button"
					class="btn w-full mt-4 bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white font-medium py-3 px-4 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
					onclick={() => window.close()}
				>
					Close Tab
				</button>
			{/if}

			{#if restoreStatus === 'error'}
				<div class="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
					<div class="flex items-center gap-3">
						<Icon icon="mdi:alert-circle" width={32} />
						<div>
							<div class="font-medium">Error</div>
							<div class="text-sm">{restoreMessage}</div>
						</div>
					</div>
				</div>
				<button
					type="button"
					class="btn w-full mt-4 bg-pink-400 dark:bg-teal-400 text-black font-medium py-3 px-4 rounded-xl hover:bg-pink-500 dark:hover:bg-teal-500 transition-colors"
					onclick={() => { restoreStatus = 'idle'; fileInput.click(); }}
				>
					Try Again
				</button>
			{/if}
		</div>

		<p class="text-center text-gray-400 dark:text-gray-500 text-sm mt-6">
			Backup files are JSON files exported from Keys.Band
		</p>
	</div>
</div>

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
