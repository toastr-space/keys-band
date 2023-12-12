<script lang="ts">
	import type { Profile } from '$lib/types/profile';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	import Icon from '@iconify/svelte';

	import { Page } from '$lib/types/page';
	import { popup, Avatar } from '@skeletonlabs/skeleton';
	import { profileControlleur } from '$lib/stores/key-store';
	import { userProfile, theme, profiles, currentPage } from '../stores/data';
	import { tick } from 'svelte';

	let accountDropdownMenuOpen = false;

	const accountDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'accountDropdownMenu',
		placement: 'bottom',
		state: async () => {
			accountDropdownMenuOpen = false;
		}
	};

	const load = (profile: Profile) => profileControlleur.loadProfile(profile);
</script>

<div class="flex flex-row w-full justify-between gap-2">
	{#if $currentPage === Page.Home}
		<div
			class="bg-surface-400 dark:bg-black bg-opacity-50 flex flex-col p-4 pb-2 rounded-2xl flex-grow gap-1"
		>
			<div
				class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
			>
				ACCOUNT
			</div>
			<button
				class="btn background-surface-700 pl-0 items-center"
				use:popup={accountDropdownMenu}
				on:click={() => (accountDropdownMenuOpen = !accountDropdownMenuOpen)}
			>
				<span class="flex flex-row gap-2 items-center justify-between w-[250px]">
					<img
						src={$userProfile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
						alt="Avatar"
						class="rounded-full avatar w-10"
					/>
					<div
						class="text-black dark:text-white text-xl font-semibold leading-7 text-ellipsis overflow-hidden flex-grow my-auto"
					>
						{$userProfile?.metadata?.name || $userProfile?.name || 'Loading...'}
					</div>
					<Icon
						icon={accountDropdownMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
						width={28}
						class="ml-2 mt-1"
					/>
				</span>
			</button>
		</div>
		<div class="flex flex-col h-full justify-between gap-3 w-36 items-center">
			<button
				class="justify-center bg-surface-400 dark:bg-black bg-opacity-50 flex flex-col py-1.5 rounded-3xl 2xl h-11 w-16"
				on:click={() => {
					$theme = $theme === 'dark' ? 'light' : 'dark';
					profileControlleur.switchTheme($theme);
				}}
			>
				<div
					class="justify-center bg-surface-500 dark:bg-[#333333A8] bg-opacity-70 flex flex-col px-2 py-1.5 rounded-full h-8 w-8 transition-all"
					class:ml-1={$theme === 'dark'}
					class:ml-7={$theme === 'light'}
				>
					<Icon icon={$theme === 'dark' ? 'bi:moon-fill' : 'bi:sun-fill'} rotate={32} />
				</div>
			</button>
			<button
				class="justify-center bg-surface-400 dark:bg-black bg-opacity-50 flex items-center flex-col py-1.5 rounded-3xl h-11 w-16 pressed:bg-surface-900 aria-pressed:scale-95"
				on:click={() => {
					$currentPage = Page.Settings;
				}}
			>
				<Icon icon="mdi:cog-outline" width={22} />
			</button>
		</div>
		<div
			class="card w-72 shadow-xl backdrop-blur-xl bg-zinc-400 dark:bg-zinc-800 bg-opacity-70 pt-3 rounded-2xl border-[0.33px] border-solid border-white border-opacity-30"
			data-popup="accountDropdownMenu"
		>
			<nav class="list-nav">
				<ul>
					{#each $profiles as profile}
						<li class="justify-center items-stretch self-stretch flex w-full flex-col">
							<div class="justify-between items-stretch flex w-full gap-5">
								<div class="items-stretch flex justify-between gap-3">
									<button on:click={() => load(profile)}>
										<Avatar
											src={profile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
											width="w-10"
											rounded="rounded-full"
										/>

										<div
											class="text-black dark:text-black dark:text-white text-base self-center my-auto"
										>
											{profile?.name}
										</div>
										<Icon icon="mdi:check" width={22} class="text-pink-400 dark:text-teal-400" />
									</button>
								</div>
								<button
									class="btn bg-transparent"
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
						class="justify-center items-stretch self-stretch flex w-full flex-col py-3 border-t-[0.33px] border-t-white border-t-opacity-30 border-solid"
					>
						<button
							on:click={() => {
								currentPage.set(Page.AddProfile);
							}}
							class="mx-2"
						>
							<span class="badge"><Icon icon="mdi:plus" width={22} /></span>
							<span class="flex-auto">Add Account</span>
						</button>
					</li>
				</ul>
			</nav>
		</div>
	{:else}
		<div class="items-stretch self-stretch flex w-full justify-between gap-3">
			<button
				type="button"
				class="btn-icon bg-surface-400 dark:bg-black pl-0"
				on:click={() => {
					$currentPage = Page.Home;
				}}
			>
				<Icon icon="carbon:chevron-left" class="text-black dark:text-white" width={28} />
			</button>
			<div class="text-white text-2xl font-bold leading-7 self-center grow my-auto">
				{$currentPage.slice(0, 1).toUpperCase() +
					$currentPage.slice(1, $currentPage.length).replaceAll('-', ' ')}
			</div>
		</div>
	{/if}
</div>
