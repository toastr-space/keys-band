<script lang="ts">
	import { domainToUrl } from '$lib/stores/utils';
	import Authorization from '$lib/components/Authorization.svelte';
	let parameter: any;
	if (typeof window !== 'undefined') {
		parameter = new URLSearchParams(document.location.search);
	}
</script>

<Authorization
	{parameter}
	isPopup={true}
	domain={domainToUrl(parameter?.get('url'))}
	on:cancel={() => {}}
/>

<h1>Hello</h1>
