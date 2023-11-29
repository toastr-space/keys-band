<script>
	import Icon from '@iconify/svelte';
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';

	let theme = 'dark';
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
				<img
					loading="lazy"
					alt=""
					src="https://i.pravatar.cc/150?img=1"
					class="aspect-square object-contain object-center w-[38px] avatar rounded-full items-center overflow-hidden shrink-0 max-w-full"
				/>
				<div
					class="text-white text-2xl font-semibold leading-7 self-center grow whitespace-nowrap my-auto"
				>
					Elisa Keys
				</div>
			</div>
			<Icon icon="mdi:chevron-down" width={28} class="mt-2" />
		</div>
	</div>
	<div class="flex flex-col h-full justify-between space-y-3 w-14 items-center">
		<button
			class="justify-center bg-black bg-opacity-50 flex flex-col py-1.5 rounded-3xl 2xl h-11 w-16"
			on:click={() => {
				theme = theme === 'dark' ? 'light' : 'dark';
			}}
		>
			<div
				class="justify-center bg-[#333333A8] bg-opacity-70 flex flex-col px-2 py-1.5 rounded-full h-8 w-8 transition-all"
				class:ml-1={theme === 'dark'}
				class:ml-7={theme === 'light'}
			>
				<Icon icon={theme === 'dark' ? 'bi:moon-fill' : 'bi:sun-fill'} rotate={32} />
			</div>
		</button>
		<button
			class="justify-center bg-black bg-opacity-50
      flex items-center flex-col py-1.5 rounded-3xl h-11 w-16 hover:bg-surface-800
      pressed:bg-surface-900
      aria-pressed:scale-95
      "
		>
			<img
				loading="lazy"
				alt=""
				src="https://cdn.builder.io/api/v1/image/assets/TEMP/4136c0ff-1332-4582-81f7-a9e6ec97c08e?"
				class="aspect-[1.04] object-contain object-center w-6 stroke-[1.4px] stroke-white stroke-opacity-30 overflow-hidden"
			/>
		</button>
	</div>
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
