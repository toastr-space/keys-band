<script lang="ts">
	import type { Profile } from '$lib/types/profile';
	import Icon from '@iconify/svelte';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { tick } from 'svelte';

	import { profileControlleur } from '$lib/stores/key-store';
	import { userProfile, profiles, currentPage } from '../stores/data';
	import { Page } from '$lib/types/page';

	export let accountDropdownMenuOpen: boolean;

	const load = (profile: Profile) => profileControlleur.loadProfile(profile);
</script>

<div data-popup="accountDropdownMenu">
	<div
		class="menu-modal card w-72 shadow-xl backdrop-blur-xl bg-zinc-400 dark:bg-zinc-800 pt-3 rounded-2xl border-[0.33px] border-solid border-white border-opacity-30"
	>
		<nav class="list-nav">
			<ul>
				{#each $profiles as profile}
					<li class="flex w-full items-stretch justify-between">
						<div class="flex-grow">
							<button class="btn px-0 py-0" on:click={() => load(profile)}>
								<Avatar
									src={profile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
									width="w-10"
									rounded="rounded-full"
								/>

								<div class="text-white text-base self-center my-auto">
									{#if profile.name}
										{profile.name.length > 10 ? profile.name.slice(0, 10) + '...' : profile.name}
									{/if}
								</div>
								{#if $userProfile?.name === profile?.name}
									<Icon icon="mdi:check" width={22} class="text-pink-600 dark:text-teal-400" />
								{/if}
							</button>
						</div>

						<div class="flex-shrink-0">
							<button
								class="btn btn-sm text-gray-500 px-0 py-0 mt-2"
								on:click={async () => {
									await profileControlleur.deleteProfile(profile);
									await tick();
									accountDropdownMenuOpen = true;
								}}
							>
								<Icon icon="mdi:trash-can-outline" width={22} />
							</button>
						</div>
					</li>
				{/each}
				<li
					class="justify-center items-stretch self-stretch flex w-full flex-col py-3 border-t-[0.33px] border-t-white border-solid"
				>
					<button
						on:click={() => {
							currentPage.set(Page.AddProfile);
						}}
						class="mx-2"
					>
						<span class="badge text-white"><Icon icon="mdi:plus" width={22} /></span>
						<span class="flex-auto text-white">Add Account</span>
					</button>
				</li>
			</ul>
		</nav>
	</div>
</div>

<style>
	.menu-modal {
		position: absolute;
		left: -9rem;
		z-index: 1000;
	}
</style>
