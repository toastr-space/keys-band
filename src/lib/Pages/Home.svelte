<script lang="ts">
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizationNew from '$lib/components/Authorization.svelte';

	import { onMount } from 'svelte';
	import { userProfile } from '$lib/stores/data';
	import { domainToUrl } from '$lib/stores/utils';
	import { AppPageItem } from '$lib/components/App';
	import { BrowserUtil, ProfileUtil } from '$lib/utility';

	import type { WebSite } from '$lib/types';

	let currentTab: chrome.tabs.Tab;
	let site: WebSite;

	let showAuthorization = false;
	onMount(() => {
		BrowserUtil.getCurrentTab().then((tab) => {
			currentTab = tab;
			site = ProfileUtil.getWebSiteOrCreate(domainToUrl(currentTab?.url || ''), $userProfile);
		});
	});
</script>

<AppPageItem name="home">
	<div class="w-full">
		<AuthorizedApp
			{site}
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
				popupType={'permission'}
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
