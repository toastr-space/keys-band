<script lang="ts">
  import { keyStore } from "./stores/key-store";

  function addKey() {
    const value = document.getElementById("value") as HTMLInputElement;
    keyStore.set(value.value);
    alert("Key added");
  }
</script>

<div class="w-full h-full flex flex-wrap">
  <div class="w-full h-24 bg-primary">
    <p class="p-7 text-4xl text-center text-white">Nos2x Svelte</p>
  </div>
  <div class="w-full h-full p-4">
    <p class="text-center text-lg font-sans">
      Add new private key to your nos2x key manager, this will allow you to auth
      and sign event on different nostr platform.
      <br />
      <input
        type="text"
        class="input input-bordered border-gray-400 w-full"
        id="value"
        placeholder="Enter key"
      />
    </p>
    <p>
      {$keyStore}
    </p>
  </div>

  {#if !$keyStore}
    <button class="btn btn-info center-btn" on:click={addKey}>
      Add private key
    </button>
  {/if}
</div>

<style>
  .center-btn {
    position: absolute;
    top: 50%;
    left: 30%;
    right: 30%;
    transform: translate(0%, -50%);
  }
</style>
