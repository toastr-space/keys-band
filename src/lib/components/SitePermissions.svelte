<script lang="ts">
	import Icon from '@iconify/svelte';
	import { get } from 'svelte/store';

	import { userProfile } from '$lib/stores/data';
	import { profileController } from '$lib/controllers/profile.controller';
	import { ProfileUtil, activeGrants, describeCapability, revokePermission, timeAgo } from '$lib/utility';

	let { origin, onclose }: { origin: string; onclose?: () => void } = $props();

	const grants = $derived(activeGrants($userProfile.data?.webSites?.[origin]));

	async function revoke(capability?: string) {
		// reload first so grants the background saved while this popup was open are not overwritten
		await profileController.loadProfiles();
		const user = get(userProfile);
		if (!user.data) return;
		const site = ProfileUtil.getWebSiteOrCreate(origin, user);
		user.data.webSites = { ...(user.data.webSites || {}), [origin]: revokePermission(site, capability) };
		await profileController.saveProfile(user);
		userProfile.set(user);
	}
</script>

<div class="justify-center kb-surface flex w-full flex-col mt-3 p-4 rounded-2xl">
	<div class="flex justify-between items-center">
		<div
			class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[3px]"
		>
			REMEMBERED DECISIONS
		</div>
		<button class="btn btn-sm text-gray-500 px-0 py-0" onclick={() => onclose?.()}>
			<Icon icon="mdi:close" width={22} />
		</button>
	</div>
	<div class="text-black dark:text-white text-lg font-semibold leading-7 truncate mt-2">
		{origin || 'No website'}
	</div>

	{#each grants as { capability, permission }}
		<div class="flex justify-between items-center gap-3 mt-2">
			<div class="flex flex-col min-w-0">
				<span class="text-sm text-black dark:text-white truncate">
					{permission.accept ? 'Allow' : 'Reject'}: {describeCapability(capability)}
				</span>
				<span class="text-xs text-black dark:text-white opacity-50">
					{permission.always
						? 'Always'
						: timeAgo.format(new Date(permission.authorizationStop || '')).replace('in ', 'Expires in ')}
				</span>
			</div>
			<button
				class="btn btn-sm text-xs text-black dark:text-white bg-surface-400 bg-opacity-20 rounded-full px-3"
				onclick={() => revoke(capability)}
			>
				Revoke
			</button>
		</div>
	{:else}
		<div class="text-sm text-black dark:text-white opacity-60 mt-2">
			Nothing remembered. This site has to ask each time.
		</div>
	{/each}

	{#if grants.length > 1}
		<button
			class="btn mt-4 text-black bg-pink-400 dark:bg-teal-400 rounded-full py-2"
			onclick={() => revoke()}
		>
			Revoke all
		</button>
	{/if}
</div>
