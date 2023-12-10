<script lang="ts">
	import { Page } from '$lib/types';
	import { currentPage } from '$lib/stores/data';
	import { AppPageItem } from '$lib/components/App';
	import { profileControlleur } from '$lib/stores/key-store';
	import { generatePrivateKey, getPublicKey, nip19 } from 'nostr-tools';
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
			if (!generated)
				profileControlleur.verifyKey(key).then(async (ok) => {
					if (ok) {
						fetchingProfile = true;
						try {
							const pk = await profileControlleur.verifyKey(key);
							metadata = await NostrUtil.getMetadata(getPublicKey(pk));
							console.log(metadata);
							metadata = metadata;
							name = metadata.name as string;
							fetchingProfile = false;
						} catch (err) {
							console.log(err);
							fetchingProfile = false;
							error = true;
						}
						// profileControlleur.fetchProfile(key).then((ok) => {
						// 	fetchingProfile = false;
						// 	error = !ok;
						// });
					}
				});
			generated = false;
		}
	};

	const save = async () => {
		busy = true;
		try {
			const ok = await profileControlleur.createProfile(name, key, metadata);
			if (ok) {
				name = '';
				key = '';
				metadata = undefined;
				busy = false;
				fetchingProfile = false;
				error = false;
				generated = false;
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

<AppPageItem name="create-profile">
	<div class="form-control w-full flex p-4">
		<div class="flex w-full flex-col gap-3">
			<div class="w-full flex flex-col gap-2">
				<span class="label-text">Private Key</span>
				<div class="w-full relative">
					<InputField placeholder="nsec" bind:value={key} />
					<button
						class="btn btn-outline bg-stone-900 text-xs absolute top-[4px] right-[4px] h-10 mr-0"
						on:click={() => {
							generated = true;
							key = nip19.nsecEncode(generatePrivateKey());
						}}
					>
						Generate</button
					>
				</div>
			</div>
			{#if fetchingProfile}
				<div class="flex flex-col items-center gap-2">
					<ProgressRadial stroke={20} width="w-16 mx-auto" value={undefined} />
					<p class="text-gray-400 font-light text-lg text-center">Loading account information</p>
					<button class="btn btn-md w-20 outline-yellow-500 text-yellow-500 outline outline-1">
						Cancel
					</button>
				</div>
			{:else}
				{#if error}
					<p>
						<span class="text-yellow-400"> Unable to fetch profile information </span>
					</p>
				{:else if metadata}
					<img
						src={metadata?.picture}
						alt={metadata?.name}
						class="avatar rounded-full w-32 mx-auto"
					/>
				{/if}
				<div class="w-full flex flex-col gap-2">
					<span class="label-text">Profile name</span>
					<InputField placeholder="Profile name" bind:value={name} />
				</div>
				<button
					class="mt-4 btn w-32 mx-auto bg-stone-900 outline outline-1 outline-success-400 text-success-400"
					disabled={busy || !name || !key}
					on:click={save}
				>
					Save profile
				</button>
			{/if}
		</div>
	</div>
</AppPageItem>
