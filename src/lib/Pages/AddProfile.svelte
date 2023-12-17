<script lang="ts">
	import { Page } from '$lib/types';
	import { currentPage } from '$lib/stores/data';
	import { AppPageItem } from '$lib/components/App';
	import { profileControlleur } from '$lib/stores/key-store';
	import {
		generatePrivateKey,
		getPublicKey,
		nip19,
		finishEvent,
		type UnsignedEvent
	} from 'nostr-tools';
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
					}
				}
			});
		}
	};

	const save = async () => {
		busy = true;
		try {
			await profileControlleur.createProfile(name, key, metadata);
			if (generated === true) {
				const pk = await profileControlleur.verifyKey(key);
				let event: UnsignedEvent = {
					kind: 0,
					created_at: Math.floor(Date.now() / 1000),
					tags: [],
					content: JSON.stringify({
						name: name
					}),
					pubkey: getPublicKey(pk)
				};
				const signedEvent = finishEvent(event, pk);
				await NostrUtil.publish(signedEvent);
			}
			name = '';
			key = '';
			metadata = undefined;
			busy = false;
			fetchingProfile = false;
			error = false;
			generated = false;
			currentPage.set(Page.Home);
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
			<div class="col-span-2 mt-6">
				<button
					type="button"
					class="btn bg-stone-400 text-white dark:bg-stone-600 dark:text-gray-2"
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
			</div>
			<div class="col-start-6 col-span-1 mt-6 justify-self-end">
				<button
					type="button"
					class="btn bg-pink-400 dark:bg-teal-400 text-black"
					disabled={busy || !name || !key}
					on:click={save}
				>
					<Icon icon="carbon:save" width={20} />
					<span>
						{busy ? 'Adding...' : 'Add Account'}
					</span>
				</button>
			</div>
		</div>
	</div>
</AppPageItem>
