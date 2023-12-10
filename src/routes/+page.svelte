<script lang="ts">
	import { profileControlleur } from '$lib/stores/key-store';

	import { AppPage } from '$lib/components/App';
	import { PageSettings, PageHome, PageCreateProfile } from '$lib/Pages/';
	import InputField from '$lib/components/InputField.svelte';
	import { ProgressRadial } from '@skeletonlabs/skeleton';

	const promise = profileControlleur.loadProfiles();
</script>

{#if typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id}
	{#await promise}
		<span class="loading">loading...</span>
	{:then}
		<div class="w-full h-full flex flex-wrap fixed-width gap-2 bg-[#222222]">
			<div class="w-full h-24 p-3">
				<AppPage>
					<PageHome />
					<PageSettings />
					<PageCreateProfile />
				</AppPage>
			</div>
		</div>
	{/await}
{:else}
	<div class="w-full flex flex-col p-12 bg-[#222222] h-full gap-4">
		<h1>We are in vite</h1>
		<br />
		<button class="btn bg-slate-800"> Button </button>
		<button class="mt-4 btn w-32 mx-auto bg-stone-900" disabled={false}> Save profile </button>

		<InputField placeholder="Enter your name" />

		<div class="flex flex-col items-center gap-2">
			<ProgressRadial stroke={20} width="w-16 mx-auto" value={undefined} />
			<p class="text-gray-400 font-light text-lg text-center">Loading account information</p>
			<button class="btn btn-md w-20 outline-yellow-500 text-yellow-500 outline outline-1">
				Cancel
			</button>
		</div>

		<div class="w-full flex flex-col">
			<span class="label-text">Private Key</span>
			<div class="w-full relative">
				<InputField placeholder="nsec" />
				<button
					class="btn btn-outline bg-stone-900 text-xs absolute top-[4px] right-[4px] h-10 mr-0"
				>
					Generate</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	.fixed-width {
		width: 400px;
		max-width: 400px;
	}
</style>
