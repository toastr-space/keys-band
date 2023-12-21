<script lang="ts">
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	import Icon from '@iconify/svelte';

	import { Page } from '$lib/types';
	import { popup, Avatar } from '@skeletonlabs/skeleton';
	import { userProfile, theme, currentPage } from '$lib/stores/data';
	import AccountDropdownMenu from './AccountDropdownMenu.svelte';
	import { derived } from 'svelte/store';
	import { profileController } from '$lib/controllers/profile.controller';

	let accountDropdownMenuOpen = false;

	const accountDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'accountDropdownMenu',
		placement: 'bottom',
		state: async () => {
			accountDropdownMenuOpen = false;
		}
	};

	const displayName = derived(userProfile, ($userProfile) => {
		const name = $userProfile?.metadata?.name || $userProfile?.name || 'Click to select account';
		return name.length > 12 ? name.slice(0, 12) + '...' : name;
	});
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
					<Avatar
						src={$userProfile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
						width="w-10"
						rounded="rounded-full"
					/>
					<div
						class="text-black dark:text-white text-xl font-semibold leading-7 text-ellipsis overflow-hidden flex-grow my-auto"
					>
						{$displayName}
					</div>
					<Icon
						icon={accountDropdownMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
						width={28}
						class="text-gray-500 ml-2 mt-1"
					/>
				</span>
			</button>
		</div>
		<div class="flex flex-col h-full justify-between gap-3 w-36 items-center">
			<button
				class="justify-center bg-surface-400 dark:bg-black bg-opacity-50 flex flex-col py-1.5 rounded-3xl 2xl h-11 w-16"
				on:click={() => {
					$theme = $theme === 'dark' ? 'light' : 'dark';
					profileController.switchTheme($theme);
				}}
			>
				<div
					class="justify-center bg-zinc-400 dark:bg-zinc-800 flex flex-col px-2 py-1.5 rounded-full h-8 w-8 transition-all"
					class:ml-1={$theme === 'dark'}
					class:ml-7={$theme === 'light'}
				>
					<Icon
						class="text-white dark:text-gray-400"
						icon={$theme === 'dark' ? 'bi:moon-fill' : 'bi:sun-fill'}
						rotate={32}
					/>
				</div>
			</button>
			<div
				class="justify-center bg-surface-400 dark:bg-black bg-opacity-50 flex items-center flex-col py-1.5 rounded-3xl h-11 w-16"
			>
				<button
					class="btn btn-sm text-gray-500 px-0 py-0"
					on:click={() => {
						$currentPage = Page.Settings;
					}}
				>
					<Icon icon="mdi:cog-outline" width={22} />
				</button>
			</div>
		</div>
		<AccountDropdownMenu {accountDropdownMenuOpen} />
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
