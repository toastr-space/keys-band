<script lang="ts">
  import {
    keyStore,
    loadPrivateKey,
    loadTheme,
    userProfile,
    addKey,
    theme,
    switchTheme,
    logout,
  } from "./stores/key-store";

  import Settings from "./components/Settings.svelte";
  import Home from "./components/Home.svelte";
  import { getPublicKey } from "nostr-tools";
  import QrCode from "./components/QrCode.svelte";
  import About from "./components/About.svelte";

  enum Page {
    Home,
    Settings,
    QrCode,
    About,
  }
  let currentPage: Page = Page.Home;
  let _keyStore = "";

  function registerKeyStore(value: string): void {
    addKey(value)
      .then((_) => {
        loadPrivateKey();
        const i = setInterval(() => {
          if ($userProfile?.name !== "") {
            clearInterval(i);
            currentPage = Page.Home;
          } else {
            loadPrivateKey();
          }
        }, 100);
      })
      .catch((err) => {
        alert(err);
      });
  }

  loadPrivateKey();
  loadTheme();
</script>

{#if $keyStore !== "" && $keyStore !== undefined}
  <div class="w-full h-full flex flex-wrap fixed-width">
    <div class="w-full h-16 bg-base-100 flex shadow-sm">
      <div class="w-2/12 p-2">
        <div class="avatar">
          <div
            class="w-12 rounded-full bordered border-2 border-blue-200 shadow-lg"
          >
            <img
              loading="lazy"
              src={$userProfile?.picture ||
                "https://toastr.space/images/toastr.png"}
              alt=""
            />
          </div>
        </div>
      </div>
      <div class="w-6/12 p-4 pl-2 pt-2">
        <!-- profile name and subtitle (nip05) -->
        <div class="text-2xl font-bold">
          <!-- manage long name -->
          {$userProfile?.name?.length > 12
            ? $userProfile?.name.substr(0, 12) + "..."
            : $userProfile?.name || getPublicKey($keyStore).substr(0, 16)}
        </div>
        <div class="text-sm text-secondary text-gray-500">
          {$userProfile?.nip05 || ""}
        </div>
      </div>
      <div class="w-4/12 py-4 pt-2 pl-7">
        <!-- cog icon button -->
        <button
          class="btn btn-ghost btn-circle"
          on:click={() => {
            switchTheme();
          }}
        >
          {#if $theme !== "dark"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 256 256"
              ><path
                fill="currentColor"
                d="M235.54 150.21a104.84 104.84 0 0 1-37 52.91A104 104 0 0 1 32 120a103.09 103.09 0 0 1 20.88-62.52a104.84 104.84 0 0 1 52.91-37a8 8 0 0 1 10 10a88.08 88.08 0 0 0 109.8 109.8a8 8 0 0 1 10 10Z"
              /></svg
            >
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              ><path
                fill="currentColor"
                d="M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0Zm72 88a64 64 0 1 1-64-64a64.07 64.07 0 0 1 64 64Zm-16 0a48 48 0 1 0-48 48a48.05 48.05 0 0 0 48-48ZM58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0 0-11.32 11.32Zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0 0-11.32-11.32ZM192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16 16A8 8 0 0 0 192 72Zm5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0 8-8Zm80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8Zm112-88h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16Z"
              /></svg
            >
          {/if}
        </button>
        {#if currentPage !== Page.Home}
          <button
            class="btn btn-ghost btn-circle"
            on:click={() => {
              currentPage = Page.Home;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
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
                  }}>QrCode</button
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
                    await logout();
                  }}>Logout</button
                >
              </li>
            </ul>
          </div>
        {/if}
      </div>
    </div>
    <div class="w-full h-full pt-2">
      {#if currentPage === Page.Home}
        <Home />
      {:else if currentPage === Page.Settings}
        <Settings />
      {:else if currentPage === Page.QrCode}
        <QrCode />
      {:else if currentPage === Page.About}
        <About />
      {/if}
    </div>
  </div>
{:else}
  <!-- private key input for login -->

  <div class="w-full flex flex-row flex-wrap space-x-4 space-y-4 p-6 px-2">
    <span class="text-xl text-center w-full">Login</span>

    <div class="form-control w-11/12">
      <span class="label-text">Private Key</span>

      <input
        type="password"
        class="input input-bordered mt-2"
        bind:value={_keyStore}
        placeholder="nsec"
        on:keydown={(e) => {}}
      />
      <button
        class="btn btn-primary w-full mt-4"
        on:click={() => {
          registerKeyStore(_keyStore);
        }}
      >
        Login
      </button>
    </div>
  </div>
{/if}

<style>
  .fixed-width {
    width: 400px;
    max-width: 400px;
  }
</style>
