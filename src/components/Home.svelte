<script lang="ts">
  import { web, domainToUrl, remainingTime } from "src/stores/utils";
  import { loadWebSites, webSites } from "src/stores/key-store";
  import Authorization from "./Authorization.svelte";
  import AuthAlert from "./AuthAlert.svelte";
  import Footer from "./Footer.svelte";

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
    <h1 class="text-center text-2xl font-bold font-sans">
      {domainToUrl(currentTab.url)}
    </h1>
    {#if webSite.auth === true}
      <div class="stats shadow-sm bg-base-200">
        <div class="stat">
          <div class="stat-title text-center">Total Requests</div>
          <div class="stat-value">
            <center>
              <span class="countdown font-mono text-6xl">
                <span
                  style="--value: {webSite.history.length.toLocaleString()};"
                />
              </span>
            </center>
          </div>
        </div>
      </div>

      {#if webSite.permission.always === true && webSite.permission.accept === true}
        <AuthAlert
          alertColor="accent"
          message="Always authorized"
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
      {:else if webSite.permission.always === true && webSite.permission.reject === true}
        <AuthAlert
          alertColor="secondary"
          message="Always rejected"
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
      {:else if new Date(webSite.permission.authorizationStop) < new Date()}
        <AuthAlert
          alertColor="secondary"
          message="Authorization expired"
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
      {:else if new Date(webSite.permission.authorizationStop) > new Date() && webSite.permission.accept === true}
        <AuthAlert
          alertColor="accent"
          message={`Authorization expires in ${remainingTime(
            new Date(webSite.permission.authorizationStop)
          )}`}
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
      {:else if new Date(webSite.permission.authorizationStop) > new Date() && webSite.permission.reject === true}
        <AuthAlert
          alertColor="secondary"
          message={`Authorization rejected (time remaining ${remainingTime(
            new Date(webSite.permission.authorizationStop)
          )})`}
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
      {:else if new Date(webSite.permission.authorizationStop) < new Date() && webSite.permission.accept === true}
        <AuthAlert
          alertColor="secondary"
          message="Authorization expired"
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
      {:else}
        <AuthAlert
          alertColor="secondary"
          message="Not authorized"
          onButtonClick={() => {
            showAuthorization = true;
          }}
        />
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
  </div>
{/if}

<Footer />
