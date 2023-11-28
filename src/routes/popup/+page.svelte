<script lang="ts">
	import { domainToUrl } from '$lib/stores/utils';
	import { loadTheme } from '$lib/stores/key-store';
	import Authorization from '$lib/components/Authorization.svelte';
	let parameter: any;
	if (typeof window !== 'undefined') {
		parameter = new URLSearchParams(document.location.search);
		loadTheme();
	}
</script>

<Authorization
	{parameter}
	isPopup={true}
	domain={domainToUrl(parameter?.get('url'))}
	on:cancel={() => {}}
/>

<h1>Hello</h1>
