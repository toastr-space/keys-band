<script lang="ts">
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizationNew from '$lib/components/AuthorizationNew.svelte';

	import { onMount } from 'svelte';
	import { BrowserUtil } from '$lib/utility';
	import { userProfile } from '$lib/stores/data';
	import { AppPageItem } from '$lib/components/App';
	import { domainToUrl } from '$lib/stores/utils';
	import type { WebSite } from '$lib/types';

	let currentTab: chrome.tabs.Tab;
	let webSite: WebSite;

	let showAuthorization = false;
	onMount(() => {
		BrowserUtil.getCurrentTab().then((tab) => {
			currentTab = tab;
			let webSites = $userProfile?.data?.webSites || {};
			webSite = webSites[domainToUrl(currentTab?.url || '')] || webSite;
		});
	});
</script>

<AppPageItem name="home">
	<div class="w-full">
		<AuthorizedApp
			site={webSite}
			domain={domainToUrl(currentTab?.url || '')}
			on:showAuthorization={() => {
				showAuthorization = !showAuthorization;
			}}
		/>

		{#if showAuthorization}
			<br />
			<AuthorizationNew
				domain={domainToUrl(currentTab?.url || '')}
				isPopup={false}
				parameter={null}
				on:cancel={() => {
					showAuthorization = false;
				}}
				on:accepted={() => {
					showAuthorization = false;
				}}
			/>
		{:else}
			<RecentActivity domain={domainToUrl(currentTab?.url || '')} />
		{/if}
	</div>
</AppPageItem>
