<script lang="ts">
  import { web, domainToUrl, remainingTime } from "src/stores/utils";
  import { loadWebSites, webSites } from "src/stores/key-store";
  import Authorization from "./Authorization.svelte";

  let currentTab = { url: "" };
  web.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    currentTab = activeTab;
  });
  let webSite = {
    auth: false,
    history: [],
    permission: {
      always: false,
      accept: true,
      reject: false,
      authorizationStop: new Date(),
    },
  };

  let showAuthorization = false;

  loadWebSites().then((_webSites) => {
    if (_webSites === null || _webSites === undefined) {
      _webSites = {};
    }
    if (Object.keys(_webSites).indexOf(domainToUrl(currentTab.url)) !== -1)
      webSite = _webSites[domainToUrl(currentTab.url)];
  });
</script>

{#if showAuthorization}
  <Authorization
    domain={domainToUrl(currentTab.url)}
    isPopup={false}
    parameter={null}
    on:cancel={() => {
      loadWebSites().then(() => {
        if (Object.keys($webSites).indexOf(domainToUrl(currentTab.url)) !== -1)
          webSite = $webSites[domainToUrl(currentTab.url)];
      });
      showAuthorization = false;
    }}
  />
{:else}
  <div class="w-full h-full flex flex-row flex-col p-10 pt-5 space-y-6">
    <h1 class="text-center text-2xl text-primary font-bold font-sans">
      {domainToUrl(currentTab.url)}
    </h1>
    {#if webSite.auth === true}
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-title">Total Request</div>
          <div class="stat-value">
            {webSite.history.length.toLocaleString()}
          </div>
        </div>
      </div>
      {#if webSite.permission.always === true && webSite.permission.accept === true}
        <div class="alert alert-success shadow-xl">
          <span class="text-lg text-white font-sans">Always authorized. </span>
          <div>
            <button
              class="btn btn-sm px-4"
              on:click={() => {
                showAuthorization = true;
              }}>Update</button
            >
          </div>
        </div>
      {:else if webSite.permission.always === true && webSite.permission.reject === true}
        <div class="alert alert-error shadow-xl">
          <span class="text-lg text-white font-sans">Always rejected. </span>
          <div>
            <button
              class="btn btn-sm px-4"
              on:click={() => {
                showAuthorization = true;
              }}>Update</button
            >
          </div>
        </div>
      {:else if new Date(webSite.permission.authorizationStop) < new Date()}
        <div class="alert alert-error">
          <span>Authorization expired.</span>
          <div>
            <button
              class="btn btn-sm"
              on:click={() => {
                showAuthorization = true;
              }}>Update</button
            >
          </div>
        </div>
      {:else if new Date(webSite.permission.authorizationStop) > new Date() && webSite.permission.accept === true}
        <div class="alert alert-warning">
          <span
            >Authorization expire in {remainingTime(
              new Date(webSite.permission.authorizationStop)
            )}</span
          >
          <div>
            <button
              class="btn btn-sm"
              on:click={() => {
                showAuthorization = true;
              }}>Update</button
            >
          </div>
        </div>
      {:else if new Date(webSite.permission.authorizationStop) > new Date() && webSite.permission.reject === true}
        <div class="alert alert-error">
          <span
            >Authorization rejected (time remaining {remainingTime(
              new Date(webSite.permission.authorizationStop)
            )}).</span
          >
          <div>
            <button
              class="btn btn-sm"
              on:click={() => {
                showAuthorization = true;
              }}>Update</button
            >
          </div>
        </div>
      {:else if new Date(webSite.permission.authorizationStop) < new Date() && webSite.permission.accept === true}
        <div class="alert alert-warning">
          <span>Authorization expired.</span>
          <div>
            <button
              class="btn btn-sm"
              on:click={() => {
                showAuthorization = true;
              }}>Update</button
            >
          </div>
        </div>
      {:else}
        <div class="alert alert-error">
          <span>No authorization</span>
          <div>
            <button
              class="btn btn-sm"
              on:click={() => (showAuthorization = true)}>Authorize now</button
            >
          </div>
        </div>
      {/if}
    {:else}
      <button
        class="btn rounded-full ml-20 text-center align-center justify-center item-center badge border-1 border-gray-300 px-5 py-3"
        on:click={() => {
          showAuthorization = true;
        }}
      >
        Authorize now
      </button>
    {/if}
    <!-- {JSON.stringify($webSites)} -->
  </div>
{/if}
