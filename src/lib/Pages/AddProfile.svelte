<script lang="ts">
	import { Page, type Relay } from '$lib/types';
	import { currentPage } from '$lib/stores/data';
	import { AppPageItem } from '$lib/components/App';
	import { profileControlleur } from '$lib/stores/key-store';
	import { generatePrivateKey, getPublicKey, nip19 } from 'nostr-tools';
	import Icon from '@iconify/svelte';
	import InputField from '$lib/components/InputField.svelte';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { NostrUtil } from '$lib/utility';

	let name = '';
	let key = '';
	let busy = false;
	let fetchingProfile = false;
	let error = false;
	let generated = false;
	let relays: any[] = [];
	let metadata: any;

	$: if (key) fetchProfile();

	const fetchProfile = async () => {
		if (key) {
			profileControlleur.verifyKey(key).then(async (ok) => {
				if (ok) {
					if (!generated) fetchingProfile = true;
					try {
						const pk = await profileControlleur.verifyKey(key);
						metadata = await NostrUtil.getMetadata(getPublicKey(pk));
						const _relays = await NostrUtil.getRelays(getPublicKey(pk), true);
						if (_relays) relays = _relays.tags;
						else relays = [];

						//console.log(relays);
						//return Promise.reject('Nostr account not found');
						if (metadata?.name !== undefined) {
							generated = false;
							metadata = metadata;
							name = metadata.name as string;
							fetchingProfile = false;
						}
						fetchingProfile = false;
					} catch (err) {
						metadata = undefined;
						fetchingProfile = false;
						error = true;
						relays = [];
					}
				}
			});
		}
	};

	const save = async () => {
		busy = true;
		try {
			let relays_list: Relay[] = [];
			if (relays.length > 0)
				relays.forEach((relay) => {
					relays_list.push({
						url: relay[1],
						enabled: true,
						created_at: new Date(),
						access: relay.length > 2 ? (relay[2] === 'read' ? 0 : relay[2] === 'write' ? 1 : 2) : 2
					});
				});

			await profileControlleur.createProfile(name, key, metadata, relays_list);
			if (generated === true) await NostrUtil.createProfileMetadata(name, key);

			name = '';
			key = '';
			metadata = undefined;
			fetchingProfile = false;
			error = false;
			generated = false;
			relays = [];
			currentPage.set(Page.Home);
		} catch (err) {
			if (typeof document !== 'undefined') alert(err);
		} finally {
			busy = false;
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
		<div class="grid grid-flow-row auto-rows-max gap-2">
			<div class="col-span-6 mt-4">
				<InputField placeholder="Enter private key (nSec)" bind:value={key} />
			</div>
			{#if fetchingProfile}
				<div class="col-span-6 flex w-full flex-col items-center gap-2 mt-2">
					<ProgressRadial stroke={20} width="w-16 mx-auto" value={undefined} />
					<p class="text-gray-400 font-light text-lg text-center">Loading account information</p>
				</div>
			{/if}
			{#if key.length > 62 && key.startsWith('nsec')}
				<div class="col-span-6 mt-4">
					<InputField placeholder="Enter your name" bind:value={name} />
				</div>
			{/if}
			{#if metadata !== undefined && metadata?.name !== undefined && key.length > 62 && key.startsWith('nsec') && metadata?.picture !== undefined}
				<div class="col-span-6 flex flex-col p-4 gap-3">
					<img
						src={metadata?.picture}
						alt={metadata?.name}
						class="avatar rounded-full w-28 mx-auto"
					/>
				</div>
			{/if}
		</div>
	</div>
	<div class="items-stretch flex w-full gap-3 mt-3">
		<button
			class="btn text-black dark:text-white bg-surface-400 font-medium leading-5 whitespace-nowrap justify-center bg-opacity-20 px-8 py-3 rounded-full"
			on:click={() => {
				let sk = generatePrivateKey();
				key = nip19.nsecEncode(sk);
				generated = true;
				name = '';
				metadata = undefined;
			}}
		>
			Generate Key
		</button>
		<button
			type="button"
			class="btn bg-pink-400 dark:bg-teal-400 text-black flex gap-2 px-20 py-3 rounded-full w-full place-content-center max-md:px-5"
			disabled={busy || !name || !key}
			on:click={save}
		>
			<Icon icon="carbon:save" width={20} />
			<span>
				{busy ? 'Adding...' : 'Add Account'}
			</span>
		</button>
	</div>
</AppPageItem>
