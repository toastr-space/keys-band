<script lang="ts">
	import { profileControlleur } from '$lib/stores/key-store';

	import { AppPage } from '$lib/components/App';
	import { PageSettings, PageHome, PageAddProfile } from '$lib/Pages/';

	const promise = profileControlleur.loadProfiles();
</script>

{#await promise}
	<span class="loading">loading...</span>
{:then}
	<div class="w-full h-full flex-grow flex-wrap gap-2 bg-[#222222]">
		<div class="w-full h-full flex-grow p-3">
			<AppPage>
				<PageHome />
				<PageSettings />
				<PageAddProfile />
			</AppPage>
		</div>
	</div>
{/await}
