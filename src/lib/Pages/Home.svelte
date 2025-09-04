<script lang="ts">
	import Authorization from '$lib/components/Authorization.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';

	import { AppPageItem } from '$lib/components/App';
	import { urlToDomain } from '$lib/utility/utils';
	import { BrowserUtil } from '$lib/utility';
	import { browserController } from '$lib/controllers';
	import { onMount } from 'svelte';

	import type { Tabs } from 'webextension-polyfill';
	let currentTab = $state<Tabs.Tab>();

	let showAuthorization = $state(false);
	onMount(() =>
		BrowserUtil.getCurrentTab().then((tab) => {
			currentTab = tab;
		})
	);
</script>

<AppPageItem name="home">
	<div class="w-full h-full flex flex-col">
		{#if !showAuthorization}
			<AuthorizedApp
				domain={urlToDomain(currentTab?.url || '')}
				on:showAuthorization={() => {
					showAuthorization = !showAuthorization;
				}}
			/>
			<RecentActivity domain={urlToDomain(currentTab?.url || '')} />
		{:else}
			<Authorization
				domain={urlToDomain(currentTab?.url || '')}
				isPopup={false}
				popupType={'permission'}
				oncancel={async (event) => {
					console.log('Cancel callback called in Home');
					try {
						await browserController.sendAuthorizationResponse(
							false,
							event.detail.duration,
							currentTab?.url,
							undefined
						);
						await browserController.switchIcon({ tabId: currentTab?.id as number });
					} catch (error) {
						console.error('Error processing cancel:', error);
					}
					showAuthorization = false;
				}}
				onaccepted={async (event) => {
					console.log('Accept callback called in Home');
					try {
						await browserController.sendAuthorizationResponse(
							true,
							event.detail.duration,
							currentTab?.url,
							undefined
						);
						await browserController.switchIcon({ tabId: currentTab?.id as number });
					} catch (error) {
						console.error('Error processing accept:', error);
					}
					showAuthorization = false;
				}}
			/>
		{/if}
	</div>
</AppPageItem>
