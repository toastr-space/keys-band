<script lang="ts">
	import AuthorizationNew from '$lib/components/AuthorizationNew.svelte';

	import { profileControlleur } from '$lib/stores/key-store';
	import { domainToUrl, getDuration } from '$lib/stores/utils';
	import { web } from '$lib/stores/utils';
	import { onMount } from 'svelte';

	let parameter: any;
	if (typeof window !== 'undefined') {
		parameter = new URLSearchParams(document.location.search);
	}

	onMount(() => {
		document.body.style.width = '383px';
		document.body.style.height = '460px';
		document.title = 'Keys.Band - Authorization';
		profileControlleur.loadProfiles();
	});
</script>

<div class="w-full h-full flex flex-col p-4 mx-auto items-center bg-[#222222]">
	<AuthorizationNew
		{parameter}
		isPopup={true}
		domain={domainToUrl(parameter?.get('url'))}
		on:cancel={(event) => {
			web.runtime.sendMessage({
				prompt: true,
				response: {
					status: 'error',
					error: true,
					permission: {
						always: event.detail.duration === 1,
						duration: getDuration(event.detail.duration),
						accept: false,
						reject: true
					}
				},
				ext: 'keys.band',
				url: parameter?.get('url'),
				requestId: parameter?.get('requestId')
			});
		}}
		on:accepted={(event) => {
			web.runtime.sendMessage({
				prompt: true,
				response: {
					status: 'success',
					error: false,
					permission: {
						always: event.detail.duration === 1,
						duration: getDuration(event.detail.duration),
						accept: true,
						reject: false
					}
				},
				ext: 'keys.band',
				url: parameter?.get('url'),
				requestId: parameter?.get('requestId')
			});
		}}
	/>
</div>
