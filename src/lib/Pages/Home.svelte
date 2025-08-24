<script lang="ts">
	import Authorization from '$lib/components/Authorization.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';

	import { AppPageItem } from '$lib/components/App';
	import { urlToDomain } from '$lib/utility/utils';
	import { BrowserUtil } from '$lib/utility';
	import { onMount } from 'svelte';

	let currentTab: browser.Tabs.Tab;

	let showAuthorization = false;
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
				on:cancel={() => {
					showAuthorization = false;
				}}
				on:accepted={() => {
					showAuthorization = false;
				}}
			/>
		{/if}
	</div>
</AppPageItem>
