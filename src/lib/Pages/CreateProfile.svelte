<script lang="ts">
	import { Page } from '$lib/types';
	import { currentPage } from '$lib/stores/data';
	import { AppPageItem } from '$lib/components/App';
	import { profileControlleur } from '$lib/stores/key-store';
	import { generatePrivateKey, nip19 } from 'nostr-tools';

	let name = '';
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
			<div class="w-full flex flex-col">
				<span class="label-text">Profile name</span>

				<input
					type="text"
					class="input input-bordered mt-2 p-2 w-full"
					bind:value={name}
					placeholder="name"
					on:keydown={(e) => {}}
				/>
			</div>
			<div class="w-full flex flex-col">
				<span class="label-text">Private Key</span>
				<div class="w-full relative">
					<input
						type="text"
						class="input input-bordered mt-2 p-2 w-full"
						style="padding-right: 103px;"
						bind:value={key}
						placeholder="nsec"
						on:keydown={(e) => {}}
					/>
					<button
						class="btn btn-outline bg-base-100 btn-primary text-xs absolute top-[3px] right-0 mt-2 mr-0"
						on:click={() => {
							let sk = generatePrivateKey();
							key = nip19.nsecEncode(sk);
						}}
					>
						Generate</button
					>
				</div>
			</div>
			<button class="mt-4 btn w-32 bg-primary-700 rounded-lg" disabled={busy} on:click={save}>
				Save profile
			</button>
		</div>
	</div>
</AppPageItem>
