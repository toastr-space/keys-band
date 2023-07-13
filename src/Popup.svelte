<script lang="ts">
  import { domainToUrl } from "./stores/utils";
  import Authorization from "./components/Authorization.svelte";

  let parameter = new URLSearchParams(document.location.search);
</script>

<Authorization
  {parameter}
  isPopup={true}
  domain={domainToUrl(parameter.get("url"))}
  on:cancel={() => {}}
/>
