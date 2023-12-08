<script lang="ts">
	import { Page } from '$lib/types';
	import { currentPage } from '$lib/stores/data';
	import { AppPageItem } from '$lib/components/App';
	import { profileControlleur } from '$lib/stores/key-store';
	import { generatePrivateKey, nip19 } from 'nostr-tools';
	import Icon from '@iconify/svelte';

	let name = '';
	let newKey = false;
	let key = '';
	let busy = false;

	const save = async () => {
		busy = true;
		try {
			const ok = await profileControlleur.createProfile(name, key);
			if (ok) {
				name = '';
				key = '';
				busy = false;
				newKey = false;
				currentPage.set(Page.Home);
			}
		} catch (err) {
			busy = false;
			if (typeof document !== 'undefined') {
				alert(err);
			}
		}
	};
</script>

<AppPageItem name="add-account">
	<div
		class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
	>
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			CREDENTIALS
		</div>
		<div class="grid grid-flow-row auto-rows-max">
			<div class="col-span-6 mt-4">
				<input
					type="text"
					class="input input-bordered h-10 custom-placeholder px-4"
					id="value"
					bind:value={key}
					placeholder="Enter private key (nSec)"
				/>
			</div>
			{#if newKey}
				<div class="col-span-6 mt-4">
					<input
						type="text"
						class="input input-bordered h-10 custom-placeholder px-4"
						id="value"
						bind:value={name}
						placeholder="Enter username"
					/>
				</div>
			{/if}
			<div class="col-span-2 mt-6">
				<button
					type="button"
					class="btn bg-tertiary-400 text-black"
					on:click={() => {
						let sk = generatePrivateKey();
						key = nip19.nsecEncode(sk);
						newKey = true;
					}}
				>
					Generate Key
				</button>
			</div>
			<div class="col-start-6 col-span-1 mt-6 justify-self-end">
				<button
					type="button"
					class="btn bg-pink-400 dark:bg-teal-400 text-black"
					disabled={busy}
					on:click={save}
				>
					<Icon icon="mdi:plus" class="text-black" width={20} />
					Add Account
				</button>
			</div>
		</div>
	</div>
</AppPageItem>
