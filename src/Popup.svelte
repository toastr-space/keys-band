<script lang="ts">
  import { domainToUrl } from "./stores/utils";
  import { loadTheme } from "./stores/key-store";
  import Authorization from "./components/Authorization.svelte";

  let parameter = new URLSearchParams(document.location.search);
  loadTheme();
</script>

<Authorization
  {parameter}
  isPopup={true}
  domain={domainToUrl(parameter.get("url"))}
  on:cancel={() => {}}
/>
