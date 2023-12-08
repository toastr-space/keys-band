<script lang="ts">
	import { profiles, userProfile } from '$lib/stores/data';
	import { profileControlleur } from '$lib/stores/key-store';

	import { AppPage } from '$lib/components/App';
	import { PageSettings, PageHome, PageAddProfile } from '$lib/Pages/';

	let themeSelected = 'light';

	function updateTheme() {
		profileControlleur.switchTheme(themeSelected);
	}

	const promise = profileControlleur.loadProfiles();
</script>

{#await promise}
	<span class="loading">loading...</span>
{:then res}
	{#if $userProfile !== null}
		<div class="w-full h-full flex flex-wrap fixed-width gap-2 bg-[#222222]">
			<div class="w-full h-24 p-3">
				<AppPage>
					<PageHome />
					<PageSettings />
					<PageAddProfile />
				</AppPage>
			</div>
		</div>
	{:else}
		<div class="w-full flex flex-row flex-wrap space-x-4 space-y-4 p-6 px-2 overflow-y-auto">
			<div class="w-full">
				<!-- <img src="/assets/logo.png" width="70" class="mx-auto" alt="" /> -->
			</div>

			<span class="text-lg text-center w-full">keys.band</span>

			<div class="w-full pr-4">
				<table class="table">
					<!-- head -->
					<thead>
						<tr>
							<th />
							<th style="max-width: 60px;" />
						</tr>
					</thead>
					<tbody>
						{#each $profiles as profile}
							<tr>
								<td class="flex-grow text-lg">{profile.name}</td>
								<td style="max-width: 60px">
									<div class="flex space-x-2 float-right pt-2">
										<!-- align right -->
										<button
											class="btn btn-sm btn-accent mb-2"
											on:click={() => {
												profileControlleur.loadProfile(profile);
											}}>OPEN</button
										>
										<button
											class="btn btn-square btn-sm btn-secondary"
											on:click={() => {
												profileControlleur.deleteProfile(profile);
											}}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												><path
													fill="currentColor"
													d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
												/></svg
											>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="w-full flex justify-end pr-8">
				<center>
					<button class="link link-hover mx-auto text-lg"> + add profile </button>
				</center>
			</div>
		</div>
	{/if}
{/await}

<style>
	.fixed-width {
		width: 400px;
		max-width: 400px;
	}
</style>
