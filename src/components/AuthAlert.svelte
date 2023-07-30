<script lang="ts">
  import { webSites, type WebSite } from "src/stores/key-store";
  import { web, domainToUrl, remainingTime } from "src/stores/utils";
  let currentTab = { url: "" };
  web.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    currentTab = activeTab;
  });
  export let alertColor = "";
  export let message = "";
  export let countdown = false;
  export let hour = 0;
  export let minute = 0;
  export let second = 0;

  let timer;

  function startTimer() {
    timer = setInterval(() => {
      if (second > 0) {
        second--;
      } else if (minute > 0) {
        minute--;
        second = 59;
      } else if (hour > 0) {
        hour--;
        minute = 59;
        second = 59;
      }
    }, 1000);
  }

  startTimer();

  export let onButtonClick = () => {};
</script>

<div class="alert">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class={`stroke-${alertColor} shrink-0 w-6 h-6`}
    ><path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    /></svg
  >
  <span class="text-lg font-sans">{message}</span>
  {#if countdown}
    <span class="countdown font-mono text-2xl">
      <span style="--value:{hour};" />:
      <span style="--value:{minute};" />:
      <span style="--value:{second};" />
    </span>
  {/if}
  <div>
    <button class="btn btn-outline btn-sm px-4" on:click={onButtonClick}
      >Update</button
    >
  </div>
</div>
