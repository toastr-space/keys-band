<script lang="ts">
	import Icon from '@iconify/svelte';

	let name = '';
	let key = '';
</script>

<div class="w-full flex justify-start pr-8">
	<div class="flex flex-row space-x-8">
		<button class="link link-hover mx-auto text-lg flex flex-row space-x-8">
			<Icon icon="mdi:arrow-left" class="w-6 h-6" />
			&nbsp; &nbsp; Back
		</button>
	</div>
</div>
<!-- <span class="font-semibold w-full">Create new profile</span> -->

<div class="form-control w-11/12 flex">
	<div class="flex w-12/12 flex-col space-y-0 pr-2 space-x-4">
		<div class="w-full flex flex-col">
			<span class="label-text">Profile name</span>

			<input
				type="text"
				class="input input-bordered mt-2"
				bind:value={name}
				placeholder="name"
				on:keydown={(e) => {}}
			/>
		</div>
		<br />
		<div class="w-full flex max-w-lg flex-col" style="margin-left: 0px;">
			<span class="label-text">Private Key</span>

			<div class="flex flex-row w-full">
				<div class="w-full relative">
					<input
						type="text"
						class="input input-bordered mt-2 w-full"
						style="padding-right: 103px;"
						bind:value={key}
						placeholder="nsec"
						on:keydown={(e) => {}}
					/>
					<button
						class="btn btn-outline bg-base-100 btn-primary text-xs absolute top-0 right-0 mt-2 mr-0"
						on:click={() => {
							let sk = generatePrivateKey();
							_keyStore = nip19.nsecEncode(sk);
						}}
					>
						Generate</button
					>
				</div>
			</div>
		</div>
	</div>
	<button
		class="btn btn-primary w-full mt-4"
		on:click={() => {
			addProfile(_name, _keyStore);
		}}
	>
		Load profile
	</button>
</div>
