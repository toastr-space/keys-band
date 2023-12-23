<script lang="ts">
	import Authorization from '$lib/components/Authorization.svelte';

	import type { PopupParams } from '$lib/types';

	import { browserController } from '$lib/controllers';
	import { urlToDomain } from '$lib/utility/utils';
	import { onMount } from 'svelte';
	import { sessionData } from '$lib/stores/data';
	import { profileController } from '$lib/controllers/profile.controller';

	let parameter: PopupParams;

	async function handleData() {
		profileController.loadProfiles();
		const urlParams = new URLSearchParams(document.location.search);
		const dataId = atob(urlParams?.get('query') as string);
		parameter = (await sessionData.getById(dataId)) || {};
	}

	onMount(() => {
		document.body.style.width = '383px';
		document.body.style.height = '460px';
		document.title = 'Keys.Band - Authorization';
		handleData();
	});
</script>

<div class="w-full h-full flex flex-col p-4 mx-auto items-center bg-[#222222]">
	{#if parameter?.url}
		<Authorization
			popupType={parameter.type}
			isPopup={true}
			domain={urlToDomain(parameter.url || '')}
			on:cancel={(event) =>
				browserController.sendAuthorizationResponse(
					false,
					event.detail.duration,
					parameter.url,
					parameter.requestId
				)}
			on:accepted={(event) =>
				browserController.sendAuthorizationResponse(
					true,
					event.detail.duration,
					parameter.url,
					parameter.requestId
				)}
		/>
	{/if}
</div>
