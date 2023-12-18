<script lang="ts">
	import { profileControlleur } from '$lib/stores/key-store';

	import { AppPage } from '$lib/components/App';
	import { PageSettings, PageHome, PageAddProfile } from '$lib/Pages/';

	// Set theme based on local storage
	// profileControlleur.loadTheme();

	const promise = profileControlleur.loadProfiles();
</script>

{#await promise}
	<span class="loading">loading...</span>
{:then}
	<div class="w-full h-full flex-grow flex-wrap gap-2 dark:bg-[#222222] bg-white">
		<div class="w-full h-full flex-grow p-3">
			<AppPage>
				<PageHome />
				<PageSettings />
				<PageAddProfile />
			</AppPage>
		</div>
	</div>
{/await}
