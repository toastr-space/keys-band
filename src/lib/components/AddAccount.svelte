<script lang="ts">
	import Icon from '@iconify/svelte';

	let username = '';
	let privKey = '';
</script>

<!-- Header -->
<div class="items-stretch self-stretch flex w-full justify-between gap-3">
	<button type="button" class="btn-icon bg-surface-400 dark:bg-black pl-0">
		<Icon icon="mdi:chevron-left" class="text-black dark:text-white" width={36} />
	</button>
	<div
		class="text-white text-2xl font-semibold leading-7 self-center grow whitespace-nowrap my-auto"
	>
		Add Account
	</div>
</div>

<!-- Credentials -->
<div
	class="justify-center items-stretch bg-surface-400 dark:bg-black bg-opacity-50 self-stretch flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		CREDENTIALS
	</div>
	<div class="grid grid-flow-row auto-rows-max">
		<div class="col-span-6 mt-6">
			<input
				type="text"
				class="input input-bordered h-10 custom-placeholder px-4"
				id="value"
				bind:value={username}
				placeholder="Enter username"
			/>
		</div>
		<div class="col-span-6 mt-4">
			<input
				type="text"
				class="input input-bordered h-10 custom-placeholder px-4"
				id="value"
				bind:value={privKey}
				placeholder="Enter private key (nSec)"
			/>
		</div>
		<div class="col-span-2 mt-6">
			<button
				type="button"
				class="btn bg-tertiary-400 text-black"
				on:click={() => {
					console.log('add account');
				}}
			>
				Generate Key
			</button>
		</div>
		<div class="col-start-6 col-span-1 mt-6 justify-self-end">
			<button
				type="button"
				class="btn bg-pink-400 dark:bg-teal-400 text-black"
				on:click={() => {
					console.log('add account');
				}}
			>
				<Icon icon="mdi:plus" class="text-black" width={20} />
				Add Account
			</button>
		</div>
	</div>
</div>
