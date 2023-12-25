<script lang="ts">
	import Authorization from '$lib/components/Authorization.svelte';

	import type { PopupParams } from '$lib/types';

	import { browserController } from '$lib/controllers';
	import { urlToDomain } from '$lib/utility/utils';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	import AccountDropdownMenu from '$lib/components/AccountDropdownMenu.svelte';
	import { profileController } from '$lib/controllers/profile.controller';
	import { sessionData, userProfile } from '$lib/stores/data';
	import { popup, Avatar } from '@skeletonlabs/skeleton';
	import { derived } from 'svelte/store';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	let parameter: PopupParams;

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

	async function handleData() {
		profileController.loadProfiles();
		const urlParams = new URLSearchParams(document.location.search);
		const dataId = atob(urlParams?.get('query') as string);
		parameter = (await sessionData.getById(dataId)) || {};
	}

	onMount(() => {
		document.body.style.width = '383px';
		document.body.style.height = '460px';
		document.title = 'Keys.Band - Authorization';
		handleData();
	});
</script>

<div class="w-full h-full flex flex-col p-4 mx-auto items-center dark:bg-[#222222] bg-white">
	{#if parameter?.url}
		<div class="w-full bg-surface-400 rounded-lg dark:bg-black bg-opacity-50 h-[72px]">
			<div
				class="text-gray-800 dark:text-gray-400 text-opacity-70 font-semibold leading-4 tracking-[3px] flex flex-row items-center gap-2 p-2"
			>
				<!-- <span class="avatar">
					<img
						src={$userProfile.metadata?.picture || 'https://toastr.space/images/toastr.png'}
						class="rounded-full h-10 w-10"
						alt=""
					/>
				</span>
				<span
					>{$userProfile?.metadata?.name || $userProfile?.name || 'Click to select account'}</span
				>
				<span class="text-xs font-normal tracking-normal text-green-600">(active)</span> -->
				<button
					class="btn background-surface-700 pl-0 items-center"
					use:popup={accountDropdownMenu}
					on:click={() => (accountDropdownMenuOpen = !accountDropdownMenuOpen)}
				>
					<span class="flex flex-row gap-1 items-center justify-between w-[250px]">
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
			<AccountDropdownMenu {accountDropdownMenuOpen} canEdit={false} />
		</div>
		<Authorization
			popupType={parameter.type}
			isPopup={true}
			domain={urlToDomain(parameter.url || '')}
			on:cancel={(event) =>
				browserController.sendAuthorizationResponse(
					false,
					event.detail.duration,
					parameter.url,
					parameter.requestId
				)}
			on:accepted={(event) =>
				browserController.sendAuthorizationResponse(
					true,
					event.detail.duration,
					parameter.url,
					parameter.requestId
				)}
		/>
	{/if}
</div>
