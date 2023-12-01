<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizationNew from '$lib/components/AuthorizationNew.svelte';
	import { domainToUrl } from '$lib/stores/utils';
	import SettingsNew from '$lib/components/SettingsNew.svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';

	let parameter: any;
	if (typeof window !== 'undefined') {
		parameter = new URLSearchParams(document.location.search);
	}
</script>

<div class="w-full">
	<div
		class="flex flex-col w-full m-16 bg-surface-900 rounded-3xl border border-surface-600 p-[12px]"
	>
		<Header />
		<AuthorizedApp />
		<RecentActivity />
	</div>
	<div
		class="flex flex-col w-full m-16 bg-surface-900 rounded-3xl border border-surface-600 p-[12px]"
	>
		<Header />
		<AuthorizationNew {parameter} isPopup={true} domain={domainToUrl(parameter?.get('url'))} />
	</div>
	<div
		class="flex flex-col w-full m-16 bg-surface-900 rounded-3xl border border-surface-600 p-[12px]"
	>
		<SettingsHeader />
		<SettingsNew />
	</div>
</div>
