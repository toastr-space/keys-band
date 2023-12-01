<script lang="ts">
	import Icon from '@iconify/svelte';
	import { popup, Avatar } from '@skeletonlabs/skeleton';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	import { userProfile, theme } from '../stores/key-store';

	let accountDropdownMenuOpen = false;

	const accountDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'accountDropdownMenu',
		placement: 'bottom',
		state: () => (accountDropdownMenuOpen = false)
	};
</script>

<div class="items-stretch flex w-full justify-between gap-3">
	<div
		class="justify-center items-stretch bg-black bg-opacity-50 flex grow basis-[0%] flex-col p-4 rounded-2xl"
	>
		<div
			class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
		>
			ACCOUNT
		</div>
		<div class="flex flex-row gap-3 mt-2 pr-0.5 items-center">
			<div class="items-stretch flex justify-between gap-3">
				<button
					class="btn background-surface-900 pl-0 justify-between items-center flex gap-1"
					use:popup={accountDropdownMenu}
					on:click={() => (accountDropdownMenuOpen = !accountDropdownMenuOpen)}
				>
					<Avatar
						src={$userProfile?.picture || 'https://toastr.space/images/toastr.png'}
						width="w-10"
						rounded="rounded-full"
					/>
					<div
						class="text-white text-2xl font-semibold leading-7 self-center grow whitespace-nowrap my-auto"
					>
						Elisa Keys
						<!-- {#if $userProfile?.name}
						{$userProfile?.name?.length > 12
							? $userProfile?.name.substr(0, 12) + '...'
							: $userProfile?.name || getPublicKey($keyStore).substr(0, 16)}
					{:else}
						{getPublicKey($keyStore).substr(0, 10)}
					{/if} -->
					</div>
					<Icon
						icon={accountDropdownMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
						width={28}
						class="ml-2 mt-1"
					/>
				</button>
			</div>
		</div>
	</div>
	<div class="flex flex-col h-full justify-between space-y-3 w-14 items-center">
		<button
			class="justify-center bg-black bg-opacity-50 flex flex-col py-1.5 rounded-3xl 2xl h-11 w-16"
			on:click={() => {
				$theme = $theme === 'dark' ? 'light' : 'dark';
			}}
		>
			<div
				class="justify-center bg-[#333333A8] bg-opacity-70 flex flex-col px-2 py-1.5 rounded-full h-8 w-8 transition-all"
				class:ml-1={$theme === 'dark'}
				class:ml-7={$theme === 'light'}
			>
				<Icon icon={$theme === 'dark' ? 'bi:moon-fill' : 'bi:sun-fill'} rotate={32} />
			</div>
		</button>
		<button
			class="justify-center bg-black bg-opacity-50
      flex items-center flex-col py-1.5 rounded-3xl h-11 w-16 hover:bg-surface-800
      pressed:bg-surface-900
      aria-pressed:scale-95
      "
		>
			<Icon icon="mdi:cog-outline" width={22} />
		</button>
	</div>
</div>

<div
	class="card w-72 shadow-xl backdrop-blur-xl bg-zinc-800 bg-opacity-70 pt-3 rounded-2xl border-[0.33px] border-solid border-white border-opacity-30"
	data-popup="accountDropdownMenu"
>
	<nav class="list-nav">
		<ul>
			<li class="justify-center items-stretch self-stretch flex w-full flex-col">
				<div class="justify-between items-stretch flex w-full gap-5">
					<div class="items-stretch flex justify-between gap-3">
						<a href="/elements/lists">
							<Avatar
								src={$userProfile?.picture || 'https://toastr.space/images/toastr.png'}
								width="w-10"
								rounded="rounded-full"
							/>

							<div class="text-white text-base self-center my-auto">Elisa Keys</div>
							<Icon icon="mdi:check" width={22} class="text-teal-400" />
						</a>
					</div>
					<button class="btn background-surface-900" on:click={() => console.log('delete account')}>
						<Icon icon="mdi:trash-can-outline" width={22} />
					</button>
				</div>
			</li>
			<li
				class="justify-center items-stretch self-stretch flex w-full flex-col mt-3 border-t-[0.33px] border-t-white border-t-opacity-30 border-solid"
			>
				<div class="justify-between items-stretch flex w-full gap-5">
					<div class="items-stretch flex justify-between gap-3">
						<a href="/elements/lists">
							<Avatar
								src={$userProfile?.picture || 'https://toastr.space/images/toastr.png'}
								width="w-10"
								rounded="rounded-full"
							/>

							<div class="text-white text-base self-center my-auto">Business account</div>
						</a>
					</div>
					<button class="btn background-surface-900" on:click={() => console.log('delete account')}>
						<Icon icon="mdi:trash-can-outline" width={22} />
					</button>
				</div>
			</li>
			<li
				class="justify-center items-stretch self-stretch flex w-full flex-col mt-3 border-t-[0.33px] border-t-white border-t-opacity-30 border-solid"
			>
				<div class="items-stretch flex justify-between gap-3">
					<a href="/elements/lists">
						<Avatar
							src={$userProfile?.picture || 'https://toastr.space/images/toastr.png'}
							width="w-10"
							rounded="rounded-full"
						/>

						<div class="text-white text-base self-center my-auto">Nym account</div>
					</a>
					<button class="btn background-surface-900" on:click={() => console.log('delete account')}>
						<Icon icon="mdi:trash-can-outline" width={22} />
					</button>
				</div>
			</li>
			<li
				class="justify-center items-stretch self-stretch flex w-full flex-col py-3 border-t-[0.33px] border-t-white border-t-opacity-30 border-solid"
			>
				<a href="/elements/lists">
					<span class="badge"><Icon icon="mdi:plus" width={22} /></span>
					<span class="flex-auto">Add Account</span>
				</a>
			</li>
		</ul>
	</nav>
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
