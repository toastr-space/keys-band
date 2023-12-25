<script lang="ts">
	import { ProgressRadial } from '@skeletonlabs/skeleton';

	import { AppPage } from '$lib/components/App';
	import { profileController } from '$lib/controllers/profile.controller';
	import { PageHome, PageSettings, PageAddProfile } from '$lib/Pages';

	if (typeof document !== 'undefined') profileController.loadTheme();
	const promise = profileController.loadProfiles();
</script>

{#await promise}
	<div class="w-full h-full flex flex-col gap-10 p-12 items-center dark:bg-[#222222] bg-white">
		<span class="loading text-lg">loading...</span>
		<ProgressRadial stroke={20} width="w-16 mx-auto" value={undefined} />
	</div>
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
