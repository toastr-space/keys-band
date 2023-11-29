<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import AuthorizationNew from '$lib/components/AuthorizationNew.svelte';
	import Duration from '$lib/components/Duration.svelte';
	import ActionButtons from '$lib/components/ActionButtons.svelte';
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
		<AuthorizationNew />
		<Duration />
		<ActionButtons />
	</div>
</div>
