<script lang="ts">
  import {
    keyStore,
    loadPrivateKey,
    userProfile,
    addKey,
  } from "./stores/key-store";

  import Settings from "./components/Settings.svelte";
  import Home from "./components/Home.svelte";

  enum Page {
    Home,
    Settings,
  }
  let currentPage = Page.Home;
  let _keyStore = "";

  loadPrivateKey();
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
              src={$userProfile.picture || "https://picsum.photos/200"}
              alt=""
            />
          </div>
        </div>
      </div>
      <div class="w-8/12 p-4 pl-2 pt-2">
        <!-- profile name and subtitle (nip05) -->
        <div class="text-2xl font-bold">
          {$userProfile.name || ""}
        </div>
        <div class="text-sm text-secondary text-gray-500">
          {$userProfile.nip05 || "-"}
        </div>
      </div>
      <div class="w-2/12 p-4 pt-2">
        <!-- cog icon button -->
        <button
          class="btn btn-ghost btn-circle"
          on:click={() => {
            if (currentPage === Page.Home) {
              currentPage = Page.Settings;
            } else {
              currentPage = Page.Home;
            }
          }}
        >
          {#if currentPage === Page.Home}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              ><g fill="none" stroke="currentColor" stroke-width="1.5"
                ><circle cx="12" cy="12" r="3" /><path
                  stroke-linecap="round"
                  d="M3.661 10.64c.473.296.777.802.777 1.36s-.304 1.064-.777 1.36c-.321.203-.529.364-.676.556a2 2 0 0 0-.396 1.479c.052.394.285.798.75 1.605c.467.807.7 1.21 1.015 1.453a2 2 0 0 0 1.479.396c.24-.032.483-.13.819-.308a1.617 1.617 0 0 1 1.567.008c.483.28.77.795.79 1.353c.014.38.05.64.143.863a2 2 0 0 0 1.083 1.083C10.602 22 11.068 22 12 22c.932 0 1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083c.092-.223.129-.483.143-.863c.02-.558.307-1.074.79-1.353a1.617 1.617 0 0 1 1.567-.008c.336.178.58.276.82.308a2 2 0 0 0 1.478-.396c.315-.242.548-.646 1.014-1.453c.208-.36.369-.639.489-.873m-.81-2.766a1.617 1.617 0 0 1-.777-1.36c0-.559.304-1.065.777-1.362c.321-.202.528-.363.676-.555a2 2 0 0 0 .396-1.479c-.052-.394-.285-.798-.75-1.605c-.467-.807-.7-1.21-1.015-1.453a2 2 0 0 0-1.479-.396c-.24.032-.483.13-.82.308a1.617 1.617 0 0 1-1.566-.008a1.617 1.617 0 0 1-.79-1.353c-.014-.38-.05-.64-.143-.863a2 2 0 0 0-1.083-1.083C13.398 2 12.932 2 12 2c-.932 0-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083c-.092.223-.129.483-.143.863a1.617 1.617 0 0 1-.79 1.353a1.617 1.617 0 0 1-1.567.008c-.336-.178-.58-.276-.82-.308a2 2 0 0 0-1.478.396C4.04 5.79 3.806 6.193 3.34 7c-.208.36-.369.639-.489.873"
                /></g
              ></svg
            >
          {:else}
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
          {/if}
        </button>
      </div>
    </div>
    <div class="w-full h-full pt-2">
      {#if currentPage === Page.Home}
        <Home />
      {:else}
        <Settings />
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
          addKey(_keyStore);
        }}
      >
        Login
      </button>
    </div>
  </div>
{/if}

<style>
  /* .center-btn {
    position: absolute;
    top: 50%;
    left: 30%;
    right: 30%;
    transform: translate(0%, -50%);
  } */
  .fixed-width {
    width: 400px;
    max-width: 400px;
  }
</style>
