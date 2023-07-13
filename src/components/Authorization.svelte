<script lang="ts">
  import { domainToUrl, web } from "../stores/utils";
  import { loadPrivateKey, loadWebSites, webSites } from "../stores/key-store";
  import { createEventDispatcher } from "svelte";
  let login = false;
  export let parameter;
  export let isPopup = false;
  export let domain: string;
  if (isPopup) {
    domain = domainToUrl(parameter.get("url"));
    if (parameter.get("action") === "login") {
      login = true;
    } else {
      parameter.set("action", "register");
    }
  } else {
    login = true;
  }

  const dispatch = createEventDispatcher();
  function cancel() {
    dispatch("cancel", {});
  }

  let choice: number = 0;

  function getDuration() {
    let duration = new Date();
    switch (choice) {
      case 0:
        return new Date();
      case 1:
        return new Date(duration.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      case 2:
        return new Date(duration.getTime() + 5 * 60 * 1000);
      case 3:
        return new Date(duration.getTime() + 60 * 60 * 1000);
      case 4:
        return new Date(duration.getTime() + 5 * 60 * 60 * 1000);
      case 5:
        return new Date(duration.getTime() + 5 * 24 * 60 * 60 * 1000);
    }
  }

  function accept(accept: boolean, duration: Date = new Date()) {
    if (isPopup) {
      loadPrivateKey().then(() => {
        web.runtime.sendMessage({
          prompt: true,
          response: {
            status: "success",
            error: accept ? false : true,
            permission: {
              always: choice === 1,
              duration: getDuration(),
              accept: accept,
              reject: !accept,
            },
          },
          ext: "nos2x",
          url: parameter.get("url"),
          requestId: parameter.get("requestId"),
        });
      });
    } else {
      loadPrivateKey().then(async () => {
        let _webSites = await loadWebSites();
        if (_webSites === undefined || _webSites === null) {
          _webSites = {};
        }
        if (Object.keys(_webSites).indexOf(domain) !== -1) {
          let site = $webSites;
          if (site === undefined || site === null) {
            site = {};
          }
          let st = site[domain];
          st.permission = {
            always: choice === 1,
            authorizationStop: getDuration().toString(),
            accept: accept,
            reject: !accept,
          };
          let array = st.history || [];
          array.push({
            accepted: accept,
            type: "permission",
            created_at: new Date().toString(),
            data: undefined,
          });
          st["history"] = array;
          site[domain] = st;
          webSites.set(site);
          await web.storage.local.set({ webSites: site });
        } else {
          let site = $webSites;
          if (site === undefined || site === null) {
            site = {};
          }
          let st = {
            auth: true,
            history: [
              {
                accepted: accept,
                type: "permission",
                created_at: new Date().toString(),
                data: undefined,
              },
            ],
            permission: {
              always: choice === 1,
              authorizationStop: getDuration().toString(),
              accept: accept,
              reject: !accept,
            },
          };

          site[domain] = st;
          await web.storage.local.set({ webSites: site });
        }

        cancel();
      });
    }
  }
</script>

<div class="w-full h-full flex flex-wrap fixed-width">
  {#if login}
    <p class="w-full text-center p-10 pt-4 pb-6">
      <span class="text-center text-xl prose prose-lg">
        <span class="text-blue-400 font-sans font-italic italic"
          >"{domain}"
        </span>
        <br />
        <span class="badge p-4 mt-2 badge-secondary">
          {#if isPopup}
            {parameter.get("type")}
          {:else}
            getPermission
          {/if}
        </span>
      </span>
    </p>
    <div
      class="w-full p-4 pt-2 flex flex-row flex-wrap justify-center space-x-2"
    >
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text mr-2">One Time</span>
          <input type="radio" bind:group={choice} class="radio" value={0} />
        </label>
      </div>
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text mr-2">Always</span>
          <input type="radio" bind:group={choice} class="radio" value={1} />
        </label>
      </div>
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text mr-2">Next 5 minutes</span>
          <input type="radio" bind:group={choice} class="radio" value={2} />
        </label>
      </div>
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text mr-2">Next hour</span>
          <input type="radio" bind:group={choice} class="radio" value={3} />
        </label>
      </div>

      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text mr-2">Next 5 hours</span>
          <input type="radio" bind:group={choice} class="radio" value={4} />
        </label>
      </div>

      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text mr-2">Next 5 days</span>
          <input type="radio" bind:group={choice} class="radio" value={5} />
        </label>
      </div>
    </div>
    <div class="w-full flex flex-col justify-center items-center p-10 pt-0">
      <button
        class="w-full btn btn-success bg-green-100 border border-2 border-gray-700"
        on:click={() => accept(true, new Date())}
      >
        Accept
      </button>
      <button
        class="w-full btn btn-error bg-red-200 border border-2 border-gray-700 mt-2"
        on:click={() => accept(false, new Date())}
      >
        Reject
      </button>

      {#if !isPopup}
        <button
          class="w-full btn btn-error bg-gray-400 border border-2 border-gray-700 mt-2"
          on:click={() => cancel()}
        >
          Cancel
        </button>
      {/if}

      {#if isPopup}
        <div class="mockup-code justify-center mt-4 w-11/12 mx-2">
          <code class="prose break-words p-4"
            >{unescape(parameter.get("data"))}</code
          >
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
</style>
