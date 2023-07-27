<script lang="ts">
  import { domainToUrl, getDuration, web } from "../stores/utils";
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
              duration: getDuration(choice),
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
            authorizationStop: getDuration(choice).toString(),
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
          _webSites[domain] = st;
          await web.storage.local.set({ webSites: _webSites });
          await loadWebSites();
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
              authorizationStop: getDuration(choice).toString(),
              accept: accept,
              reject: !accept,
            },
          };

          site[domain] = st;
          await web.storage.local.set({ webSites: site });
          await loadWebSites();
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
        <span class="text-primary-content font-sans font-italic italic"
          >{domain}
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
        class="w-full btn btn-accent mb-2"
        on:click={() => accept(true, new Date())}
      >
        Accept
      </button>
      <button
        class="w-full btn btn-secondary mb-2"
        on:click={() => accept(false, new Date())}
      >
        Reject
      </button>

      {#if !isPopup}
        <button class="w-full btn btn-neutral" on:click={() => cancel()}>
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
