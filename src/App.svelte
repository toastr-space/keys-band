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
    profiles,
    type Profile,
    verifyKey,
    loadProfiles,
    saveProfiles,
    settingProfile,
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
    Profile,
    About,
  }
  let currentPage: Page = Page.Home;
  let _keyStore = "";
  let _name = "";
  let creationMode = false;

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

  async function addProfile(name, key) {
    let decodedValue;
    try {
      decodedValue = await verifyKey(key);
      let profile: Profile = {
        name: name,
        data: {
          privateKey: decodedValue,
          webSites: {},
          relays: [],
        },
      };
      profiles.update((profiles) => [...profiles, profile]);
      saveProfiles();
      _name = "";
      _keyStore = "";
      creationMode = false;
    } catch (error) {
      alert(error);
    }
  }

  async function removeProfileByName(name) {
    profiles.update((profiles) =>
      profiles.filter((profile) => profile.name !== name)
    );
    saveProfiles();
  }

  async function openProfile(profile) {
    keyStore.set(profile.data.privateKey);
    // store website and relays

    await settingProfile(profile);

    loadPrivateKey();
    currentPage = Page.Home;
  }

  loadPrivateKey();
  loadTheme();
  loadProfiles();
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
  <div
    class="w-full flex flex-row flex-wrap space-x-4 space-y-4 p-6 px-2 overflow-y-auto"
  >
    <button
      class="btn btn-ghost btn-circle absolute top-3 right-3"
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
    <div class="w-full">
      <img src="/assets/logo.png" width="80" class="mx-auto" alt="" />
    </div>

    <span class="text-lg text-center w-full">Your profiles</span>

    {#if creationMode == false}
      <div class="w-full pr-4">
        <table class="table">
          <!-- head -->
          <thead>
            <tr>
              <th />
              <th style="max-width: 60px;" />
            </tr>
          </thead>
          <tbody>
            {#each $profiles as profile}
              <tr>
                <td class="flex-grow text-lg">{profile.name}</td>
                <td style="max-width: 60px;">
                  <div class="flex space-x-2 pr-8">
                    <!-- align right -->
                    <button
                      class="btn btn-outline btn-sm btn-info mb-2"
                      on:click={() => {
                        openProfile(profile);
                      }}>OPEN</button
                    >
                    <button
                      class="btn btn-outline btn-square btn-sm btn-error"
                      on:click={() => {
                        removeProfileByName(profile.name);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        ><path
                          fill="currentColor"
                          d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
                        /></svg
                      >
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="w-full flex justify-end pr-8">
        <center>
          <button
            class="link link-hover mx-auto text-lg"
            on:click={() => {
              creationMode = true;
            }}
          >
            + add profile
          </button>
        </center>
      </div>
    {:else}
      <hr />
      <div class="w-full flex justify-start pr-8">
        <div class="flex flex-row space-x-8">
          <button
            class="link link-hover mx-auto text-lg flex flex-row space-x-8"
            on:click={() => {
              creationMode = false;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              class="mt-1"
              viewBox="0 0 1024 1024"
              ><path
                fill="currentColor"
                d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
              /><path
                fill="currentColor"
                d="m237.248 512l265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
              /></svg
            >
            &nbsp; &nbsp; Back
          </button>
        </div>
      </div>
      <span class="font-semibold w-full">Create new profile</span>

      <div class="form-control w-11/12 flex">
        <div class="flex w-11/12 flex-row pr-16 space-x-4">
          <div class="w-5/12 flex flex-col">
            <span class="label-text">Name</span>

            <input
              type="text"
              class="input input-bordered mt-2"
              bind:value={_name}
              placeholder="name"
              on:keydown={(e) => {}}
            />
          </div>
          <div class="flex-grow flex flex-col">
            <span class="label-text">Private Key</span>

            <input
              type="password"
              class="input input-bordered mt-2"
              bind:value={_keyStore}
              placeholder="nsec"
              on:keydown={(e) => {}}
            />
          </div>
        </div>
        <button
          class="btn btn-primary w-full mt-4"
          on:click={() => {
            addProfile(_name, _keyStore);
          }}
        >
          Create
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .fixed-width {
    width: 400px;
    max-width: 400px;
  }
</style>
