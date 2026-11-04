<script lang="ts">
	import { ProgressRadial, storePopup, popup, Avatar } from '@skeletonlabs/skeleton';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import Icon from '$lib/components/Icon.svelte';
	
	import { AppPage } from '$lib/components/App';
	import { profileController } from '$lib/controllers/profile.controller';
	import { PageSettings, PageHome, PageAddProfile } from '$lib/Pages';
	import Authorization from '$lib/components/Authorization.svelte';
	import VaultGate from '$lib/components/VaultGate.svelte';
	import { vaultController, type VaultStatus } from '$lib/controllers/vault.controller';
	import AccountDropdownMenu from '$lib/components/AccountDropdownMenu.svelte';
	import { browserController } from '$lib/controllers';
	import { NostrUtil, web } from '$lib/utility';
	import { userProfile } from '$lib/stores/data';
	import { pendingRequests } from '$lib/controllers/session.controller';
	
	import type { PopupParams } from '$lib/types';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	// Initialize Floating UI for Skeleton Labs components
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

	let parameter: PopupParams | null = null;
	let vaultStatus: VaultStatus = 'locked';
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

		// Nothing else is shown, not even what a site is asking for, until the vault is unlocked
		vaultStatus = await vaultController.status();
		if (vaultStatus !== 'unlocked') return;
		await vaultController.markActivity();
		// opened by the background only to unlock for a pending request
		if (urlParams.get('unlock')) {
			window.close();
			return;
		}

		const requestId = urlParams.get('request');
		if (requestId && /^[0-9a-f-]{36}$/.test(requestId)) {
			// the background removes the request once it has been answered
			parameter = await pendingRequests.get(requestId);
			isAuthorizationRequest = !!parameter;
			if (isAuthorizationRequest) {
				document.body.style.minWidth = '383px';
				document.body.style.minHeight = '460px';
				document.body.style.width = '100%';
				document.body.style.height = '100%';
				document.title = 'Keys.Band - Authorization';
			}
		} else {
			isAuthorizationRequest = false;
			// update names, pictures and relay lists while the user looks at the popup
			profileController.refreshProfiles();
		}
	}

	let promise = handleData();

	// Show the lock screen as soon as the vault locks elsewhere ("Lock now" in another window, or
	// auto-lock), so an open popup or side panel never keeps showing or using an unlocked vault
	const recheck = async () => {
		if ((await vaultController.status()) !== vaultStatus) promise = handleData();
	};

	onMount(() => {
		const onStorageChanged = (changes: Record<string, unknown>, area: string) => {
			if (area === 'session' && 'vaultSession' in changes) recheck();
		};
		web.storage.onChanged.addListener(onStorageChanged);
		// auto-lock takes effect the next time the vault is checked
		const timer = setInterval(recheck, 15_000);
		return () => {
			web.storage.onChanged.removeListener(onStorageChanged);
			clearInterval(timer);
		};
	});

	onMount(() => {
		// Check if we're in a side panel (not a popup)
		const isSidePanel = document.getElementById('sidepanel') !== null;

		// Set default popup dimensions only if not authorization request and not side panel
		if (!isAuthorizationRequest && !isSidePanel) {
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
	{#if vaultStatus !== 'unlocked'}
		<VaultGate status={vaultStatus} onunlocked={() => (promise = handleData())} />
	{:else if isAuthorizationRequest && parameter}
		<!-- Authorization popup -->
		<div class="w-full h-screen flex flex-col p-4 mx-auto items-center dark:bg-[#222222] bg-white overflow-hidden">
			{#if 'previousProfile' in parameter && parameter.previousProfile.id !== $userProfile.id}
				<span
					class="alert alert-warning bg-yellow-300 text-black mb-2 flex flex-row items-center text-sm p-2 gap-2 flex-shrink-0"
				>
					<Icon icon="pixelarticons:alert" width={56} />
					<span>
						You are using another account for this request <br />
						Previous profile: {parameter.previousProfile.name}
					</span>
				</span>
			{/if}
			<div class="w-full kb-surface rounded-lg h-[72px] flex-shrink-0">
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
									src={$userProfile?.metadata?.picture || 'assets/logo-on-64.png'}
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
			<div class="w-full flex-grow min-h-0 flex flex-col">
				<Authorization
					popupType={parameter.type}
					eventData={parameter.data}
					domain={parameter.url || ''}
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
