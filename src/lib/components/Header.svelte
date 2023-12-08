<script lang="ts">
	import type { Profile } from '$lib/types/profile';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	import Icon from '@iconify/svelte';

	import { Page } from '$lib/types/page';
	import { popup, Avatar } from '@skeletonlabs/skeleton';
	import { profileControlleur } from '$lib/stores/key-store';
	import { userProfile, theme, profiles, currentPage } from '../stores/data';

	let accountDropdownMenuOpen = false;

	const accountDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'accountDropdownMenu',
		placement: 'bottom',
		state: () => (accountDropdownMenuOpen = false)
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
									on:click={() => profileControlleur.deleteProfile(profile)}
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
								currentPage.set(Page.CreateProfile);
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

<!-- <div class="w-2/12 p-2">
  <div class="avatar">
    <div class="w-12 rounded-full bordered border-2 border-blue-200 shadow-lg">
      <img
        loading="lazy"
        src={$userProfile?.picture || 'https://toastr.space/images/toastr.png'}
        alt=""
      />
    </div>
  </div>
</div>
<div class="w-6/12 p-4 pl-2 pt-2">
  <div class="text-xl font-bold {$userProfile.name && $userProfile.nip05 ? '' : 'mt-2'}">
    {#if $userProfile?.name}
      {$userProfile?.name?.length > 12
        ? $userProfile?.name.substr(0, 12) + '...'
        : $userProfile?.name || getPublicKey($keyStore).substr(0, 16)}
    {:else}
      {getPublicKey($keyStore).substr(0, 10)}
    {/if}
  </div>
  <div class="text-sm text-secondary text-gray-500">
    {$userProfile?.nip05 || ''}
  </div>
</div>
<div class="w-6/12 py-4 pt-2 pl-7 flex hidden">
  {#if currentPage !== Page.Home}
    <button
      class="btn btn-ghost btn-circle"
      on:click={() => {
        currentPage = Page.Home;
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        ><path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 12L7 7m5 5l5 5m-5-5l5-5m-5 5l-5 5"
        /></svg
      >
    </button>
  {:else if currentPage === Page.Home}
    <div class="dropdown dropdown-end">
      <button tabindex="-1" class="btn btn-ghost btn-circle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
          ><path
            fill="currentColor"
            d="M12 20q-.825 0-1.413-.588T10 18q0-.825.588-1.413T12 16q.825 0 1.413.588T14 18q0 .825-.588 1.413T12 20Zm0-6q-.825 0-1.413-.588T10 12q0-.825.588-1.413T12 10q.825 0 1.413.588T14 12q0 .825-.588 1.413T12 14Zm0-6q-.825 0-1.413-.588T10 6q0-.825.588-1.413T12 4q.825 0 1.413.588T14 6q0 .825-.588 1.413T12 8Z"
          /></svg
        >
      </button>
      <ul
        tabindex="-1"
        class="dropdown-content shadow-xl bg-base-200 z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
      >
        <li>
          <button
            on:click={() => {
              currentPage = Page.Settings;
            }}>Settings</button
          >
        </li>
        <li>
          <button
            on:click={() => {
              currentPage = Page.QrCode;
            }}>QR Code</button
          >
        </li>
        <li>
          <button
            on:click={() => {
              currentPage = Page.About;
            }}>About</button
          >
        </li>
        <li>
          <button
            on:click={async () => {
              await profileControlleur.logout();
            }}>Logout</button
          >
        </li>
      </ul>
    </div>
  {/if}
</div> -->
