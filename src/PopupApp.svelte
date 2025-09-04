<script lang="ts">
	import { ProgressRadial, storePopup, popup, Avatar } from '@skeletonlabs/skeleton';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import Icon from '@iconify/svelte';
	
	import { AppPage } from '$lib/components/App';
	import { profileController } from '$lib/controllers/profile.controller';
	import { PageSettings, PageHome, PageAddProfile } from '$lib/Pages';
	import Authorization from '$lib/components/Authorization.svelte';
	import AccountDropdownMenu from '$lib/components/AccountDropdownMenu.svelte';
	import { browserController } from '$lib/controllers';
	import { urlToDomain, NostrUtil } from '$lib/utility';
	import { sessionData, userProfile } from '$lib/stores/data';
	
	import type { PopupParams } from '$lib/types';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	// Initialize Floating UI for Skeleton Labs components
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

	let parameter: PopupParams | null = null;
	let isAuthorizationRequest = false;
	let accountDropdownMenuOpen = false;

	const accountDropdownMenu: PopupSettings = {
		event: 'click',
		target: 'accountDropdownMenu',
		placement: 'bottom',
		state: async () => {
			accountDropdownMenuOpen = false;
		}
	};

	const displayName = derived(userProfile, ($userProfile) => {
		const name = $userProfile?.metadata?.name || $userProfile?.name || 'Click to select account';
		return name.length > 12 ? name.slice(0, 12) + '...' : name;
	});

	async function handleData() {
		console.log('[Popup] Starting handleData');
		
		// Load theme first to ensure proper styling
		await profileController.loadTheme();
		
		// Load other essential settings
		await profileController.loadDuration();
		
		// Initialize Nostr relay pool
		NostrUtil.prepareRelayPool();
		
		await profileController.loadProfiles();
		const urlParams = new URLSearchParams(document.location.search);
		const queryParam = urlParams?.get('query');
		
		console.log('[Popup] Query param:', queryParam);
		
		if (queryParam) {
			try {
				const dataId = atob(queryParam);
				console.log('[Popup] Decoded dataId:', dataId);
				
				parameter = (await sessionData.getById(dataId)) || null;
				console.log('[Popup] Session data retrieved:', parameter);
				
				isAuthorizationRequest = !!parameter;
				console.log('[Popup] Is authorization request:', isAuthorizationRequest);
				
				if (isAuthorizationRequest) {
					document.body.style.width = '383px';
					document.body.style.height = '460px';
					document.title = 'Keys.Band - Authorization';
					console.log('[Popup] Set authorization popup dimensions');
				}
			} catch (e) {
				console.error('[Popup] Error parsing query param:', e);
				parameter = null;
				isAuthorizationRequest = false;
			}
		} else {
			console.log('[Popup] No query param - normal popup mode');
			isAuthorizationRequest = false;
		}
	}

	const promise = handleData();

	onMount(() => {
		// Set default popup dimensions if not authorization request
		if (!isAuthorizationRequest) {
			document.body.style.width = '400px';
			document.body.style.height = '500px';
		}
	});
</script>

{#await promise}
	<div class="w-full h-full flex flex-col gap-10 p-12 items-center dark:bg-[#222222] bg-white">
		<span class="loading text-lg">loading...</span>
		<ProgressRadial stroke={20} width="w-16 mx-auto" value={undefined} />
	</div>
{:then}
	{#if isAuthorizationRequest && parameter}
		<!-- Authorization popup -->
		<div class="w-full h-full flex flex-col p-4 mx-auto items-center dark:bg-[#222222] bg-white">
			{#if 'previousProfile' in parameter && parameter.previousProfile.id !== $userProfile.id}
				<span
					class="alert alert-warning bg-yellow-300 text-black mb-2 flex flex-row items-center text-sm p-2 gap-2"
				>
					<Icon icon="pixelarticons:alert" width={56} />
					<span>
						You are using another account for this request <br />
						Previous profile: {parameter.previousProfile.name}
					</span>
				</span>
			{/if}
			<div class="w-full kb-surface rounded-lg h-[72px]">
				<div
					class="text-gray-800 dark:text-gray-400 text-opacity-70 font-semibold leading-4 tracking-[3px] flex flex-row items-center gap-2 p-2"
				>
					<button
						class="w-full inline-flex items-center gap-2 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-white px-3 py-2 justify-start rounded-2xl transition-colors"
						use:popup={accountDropdownMenu}
						onclick={() => (accountDropdownMenuOpen = !accountDropdownMenuOpen)}
					>
						<span class="flex flex-row gap-2 items-center justify-between w-full">
							<span class="rounded-full bg-zinc-700 ring-1 ring-zinc-600 p-0.5">
								<Avatar
									src={$userProfile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
									width="w-10"
									rounded="rounded-full"
								/>
							</span>
							<div
								class="text-black dark:text-white text-left text-xl font-semibold leading-7 text-ellipsis overflow-hidden flex-grow my-auto"
							>
								{$displayName}
							</div>
							<Icon
								icon={accountDropdownMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								width={28}
								class="text-gray-500 ml-0 mt-1"
							/>
						</span>
					</button>
				</div>
				<AccountDropdownMenu {accountDropdownMenuOpen} canEdit={false} />
			</div>
			<Authorization
				popupType={parameter.type}
				isPopup={true}
				domain={urlToDomain(parameter.url || '')}
				oncancel={(event) =>
					browserController.sendAuthorizationResponse(
						false,
						event.detail.duration,
						parameter?.url,
						parameter?.requestId || ''
					)}
				onaccepted={(event) => {
					console.log('Accepted event received in PopupApp:', event.detail);
					browserController.sendAuthorizationResponse(
						true,
						event.detail.duration,
						parameter?.url,
						parameter?.requestId || ''
					);
				}}
			/>
		</div>
	{:else}
		<!-- Normal popup -->
		<div class="w-full h-full flex-grow flex-wrap gap-2 dark:bg-[#222222] bg-white">
			<div class="w-full h-full flex-grow p-3">
				<AppPage>
					<PageHome />
					<PageSettings />
					<PageAddProfile />
				</AppPage>
			</div>
		</div>
	{/if}
{/await}
