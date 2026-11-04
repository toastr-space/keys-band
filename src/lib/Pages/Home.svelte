<script lang="ts">
	import SitePermissions from '$lib/components/SitePermissions.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';

	import { AppPageItem } from '$lib/components/App';
	import { urlToOrigin } from '$lib/utility/permissions';
	import { browserController } from '$lib/controllers';
	import { currentTab } from '$lib/stores/data';

	let showPermissions = $state(false);
	const origin = $derived(urlToOrigin($currentTab?.url || ''));
</script>

<AppPageItem name="home">
	<div class="w-full h-full flex flex-col">
		{#if !showPermissions}
			<AuthorizedApp
				domain={origin}
				on:showAuthorization={() => {
					showPermissions = !showPermissions;
				}}
			/>
			<RecentActivity domain={origin} />
		{:else}
			<SitePermissions
				{origin}
				onclose={async () => {
					showPermissions = false;
					await browserController.switchIcon({ tabId: $currentTab?.id as number });
				}}
			/>
		{/if}
	</div>
</AppPageItem>
