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
  import { generatePrivateKey, getPublicKey, nip19 } from "nostr-tools";
  import QrCode from "./components/QrCode.svelte";
  import About from "./components/About.svelte";
  import Header from "./components/Header.svelte";
  import AuthorizationNew from "./components/AuthorizationNew.svelte";
  import Duration from "./components/Duration.svelte";
  import ActionButtons from "./components/ActionButtons.svelte";
  import AuthorizedApp from "./components/AuthorizedApp.svelte";
  import RecentActivity from "./components/RecentActivity.svelte";
  import SettingsHeader from "./components/SettingsHeader.svelte";
  import SettingsNew from "./components/SettingsNew.svelte";

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
    // check if name already exist in profile or key
    if (name.length < 4) {
      alert("Name must be at least 4 characters");
      return;
    }

    try {
      decodedValue = await verifyKey(key);
      let prs = $profiles.filter(
        (pr) => pr.name === name || pr.data.privateKey === decodedValue
      );
      if (prs.length > 0) {
        alert("Name or key already exist");
        return;
      }
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
  <div class="flex flex-col justify-center gap-3 w-full items-start p-3">
    <Header />
    <AuthorizationNew />
    <Duration />
    <ActionButtons />
    <AuthorizedApp />
    <RecentActivity />
    <SettingsHeader />
    <SettingsNew />
  </div>

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
        <div
          class="text-xl font-bold {$userProfile.name && $userProfile.nip05
            ? ''
            : 'mt-2'}"
        >
          <!-- manage long name -->
          {#if $userProfile?.name}
            {$userProfile?.name?.length > 12
              ? $userProfile?.name.substr(0, 12) + "..."
              : $userProfile?.name || getPublicKey($keyStore).substr(0, 16)}
          {:else}
            {getPublicKey($keyStore).substr(0, 10)}
          {/if}
        </div>
        <div class="text-sm text-secondary text-gray-500">
          {$userProfile?.nip05 || ""}
        </div>
      </div>
      <div class="w-6/12 py-4 pt-2 pl-7 flex">
        <!-- cog icon button -->
        <select
          class="select select-bordered select-xs w-7/12 h-8 mt-2 max-w-xs pl-2 pr-0"
          on:change={(e) => {
            switchTheme(e.target.value);
          }}
        >
          <option value="light" selected={$theme == "light"}>Light</option>
          <option value="dark" selected={$theme == "dark"}>Dark</option>

          <option value="cupcake" selected={$theme == "cupcake"}>Cupcake</option
          >
          <option value="lofi" selected={$theme == "lofi"}>Lofi</option>
          <option value="autumn" selected={$theme == "autumn"}>Autumn</option>
        </select>

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
    <select
      class="select select-bordered select-xs h-8 mt-2 pl-2 pr-2 absolute top-3 right-3"
      on:change={(e) => {
        switchTheme(e.target.value || "dark");
      }}
    >
      <option value="light" selected={$theme == "light"}>Light</option>
      <option value="dark" selected={$theme == "dark"}>Dark</option>
      <option value="cupcake" selected={$theme == "cupcake"}>Cupcake</option>
      <option value="lofi" selected={$theme == "lofi"}>Lofi</option>
      <option value="autumn" selected={$theme == "autumn"}>Autumn</option>
    </select>
    <div class="w-full">
      <img src="/assets/logo.png" width="70" class="mx-auto" alt="" />
    </div>

    <span class="text-lg text-center w-full">keys.band</span>

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
                <td style="max-width: 60px">
                  <div class="flex space-x-2 float-right pt-2">
                    <!-- align right -->
                    <button
                      class="btn btn-sm btn-accent mb-2"
                      on:click={() => {
                        openProfile(profile);
                      }}>OPEN</button
                    >
                    <button
                      class="btn btn-square btn-sm btn-secondary"
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
      <!-- <span class="font-semibold w-full">Create new profile</span> -->

      <div class="form-control w-11/12 flex">
        <div class="flex w-12/12 flex-col space-y-0 pr-2 space-x-4">
          <div class="w-full flex flex-col">
            <span class="label-text">Profile name</span>

            <input
              type="text"
              class="input input-bordered mt-2"
              bind:value={_name}
              placeholder="name"
              on:keydown={(e) => {}}
            />
          </div>
          <br />
          <div class="w-full flex max-w-lg flex-col" style="margin-left: 0px;">
            <span class="label-text">Private Key</span>

            <div class="flex flex-row w-full">
              <div class="w-full relative">
                <input
                  type="text"
                  class="input input-bordered mt-2 w-full"
                  style="padding-right: 103px;"
                  bind:value={_keyStore}
                  placeholder="nsec"
                  on:keydown={(e) => {}}
                />
                <button
                  class="btn btn-outline bg-base-100 btn-primary text-xs absolute top-0 right-0 mt-2 mr-0"
                  on:click={() => {
                    let sk = generatePrivateKey();
                    _keyStore = nip19.nsecEncode(sk);
                  }}
                >
                  Generate</button
                >
              </div>
            </div>
          </div>
        </div>
        <button
          class="btn btn-primary w-full mt-4"
          on:click={() => {
            addProfile(_name, _keyStore);
          }}
        >
          Load profile
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
  .select {
    background-image: none;
  }
</style>
