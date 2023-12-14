<script lang="ts">
	import AuthorizationNew from '$lib/components/AuthorizationNew.svelte';

	import type { PopupParams } from '$lib/types';

	import { sendAuthorizationResponse } from '$lib/utility/browser-utils';
	import { profileControlleur } from '$lib/stores/key-store';
	import { domainToUrl } from '$lib/stores/utils';
	import { onMount } from 'svelte';

	let parameter: PopupParams;

	onMount(() => {
		document.body.style.width = '383px';
		document.body.style.height = '460px';
		document.title = 'Keys.Band - Authorization';
		profileControlleur.loadProfiles();

		const urlParams = new URLSearchParams(document.location.search);
		parameter = JSON.parse(atob(urlParams?.get('query') as string)) || {};
	});
</script>

<div class="w-full h-full flex flex-col p-4 mx-auto items-center bg-[#222222]">
	{#if parameter?.url}
		<AuthorizationNew
			popupType={parameter.type}
			isPopup={true}
			domain={domainToUrl(parameter.url || '')}
			on:cancel={(event) =>
				sendAuthorizationResponse(false, event.detail.duration, parameter.url, parameter.requestId)}
			on:accepted={(event) =>
				sendAuthorizationResponse(true, event.detail.duration, parameter.url, parameter.requestId)}
		/>
	{/if}
</div>
