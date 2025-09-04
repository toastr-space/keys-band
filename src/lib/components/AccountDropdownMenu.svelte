<script lang="ts">
	import type { Profile } from '$lib/types/profile';
	import Icon from '@iconify/svelte';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { tick } from 'svelte';

	import { userProfile, profiles, currentPage } from '../stores/data';
	import { Page } from '$lib/types';
	import { profileController } from '$lib/controllers/profile.controller';

	let { 
		accountDropdownMenuOpen,
		canEdit = true
	}: {
		accountDropdownMenuOpen: boolean;
		canEdit?: boolean;
	} = $props();

	const load = (profile: Profile) => profileController.loadProfile(profile);
</script>

<div data-popup="accountDropdownMenu">
	<div
		class="menu-modal card w-72 shadow-xl backdrop-blur-xl kb-surface-strong pt-3 rounded-2xl border-[0.33px] border-solid border-black/10 dark:border-white/10 pl-1"
	>
		<nav class="list-nav w-full" class:pb-3={canEdit}>
			<ul class="w-full pr-1 gap-1">
				{#each $profiles as profile}
					<li
						class="flex w-full gap-0 px-1 py-1 hover:bg-white/80 dark:hover:bg-white/10 transition-colors rounded-lg"
					>
						<div class="flex-grow min-w-0">
							<button
								class="w-full flex items-center gap-0 pl-0 mx-0 py-2 text-left bg-transparent hover:bg-white/60 dark:hover:bg-white/5 text-black dark:text-white transition-colors rounded-md cursor-pointer"
								on:click={() => load(profile)}
							>
								<span class="rounded-full bg-zinc-700 ring-1 ring-zinc-600">
									<Avatar
										src={profile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
										width="w-8"
										rounded="rounded-full"
									/>
								</span>

								<div
									class="text-black dark:text-white text-base text-left flex-grow min-w-0 truncate"
								>
									{#if profile.name}
										{profile.name.length > 10 ? profile.name.slice(0, 10) + '...' : profile.name}
									{/if}
								</div>
								{#if $userProfile?.name === profile?.name}
									<Icon icon="mdi:check" width={22} class="text-pink-600 dark:text-teal-400" />
								{/if}
							</button>
						</div>

						{#if canEdit}
							<div class="flex items-center pr-2 max-w-12">
								<button
									class="bg-transparent btn-xs hover:bg-white/60 dark:hover:bg-white/10 rounded-lg flex items-center justify-center transition-all delete-btn-visible"
									on:click={async () => {
										await profileController.deleteProfile(profile);
										await tick();
										accountDropdownMenuOpen = true;
									}}
									title="Delete profile"
								>
									<Icon
										icon="mdi:trash-can-outline"
										width={16}
										class="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
									/>
								</button>
							</div>
						{/if}
					</li>
				{/each}
				{#if canEdit}
					<li
						class="justify-center items-stretch self-stretch border-t-[1px] flex w-full mb-2 flex-col py-1 mt-1 px-3   dark:border-t-white/10 border-solid hover:bg-white/80 dark:hover:bg-white/10 transition-colors rounded-lg"
					> 
						<button
							on:click={() => {
								currentPage.set(Page.AddProfile);
							}}
							class="w-full flex items-center gap-3 px-3 py-2 text-left bg-transparent hover:bg-white/60 dark:hover:bg-white/5 text-black dark:text-white transition-colors rounded-md cursor-pointer"
						>
							<span class="text-gray-600 dark:text-gray-400 mr-2"
								><Icon icon="mdi:plus" width={20} /></span
							>
							<span class="text-black dark:text-white text-left">Add Account</span>
						</button>
					</li>
				{:else}
					<li class="h-4 w-2"></li>
				{/if}
			</ul>
		</nav>
	</div>
</div>

<style>
	.menu-modal {
		position: absolute;
		left: -8.5rem;
		z-index: 1000;
		margin-top: 0.25rem;
	}

	.delete-btn-visible {
		/* Ensure the delete button is always visible */
		opacity: 1 !important;
		visibility: visible !important;
	}
</style>
