<script lang="ts">
	import { getPublicKey, nip19 } from 'nostr-tools';
	import { keyStore, relays, userProfile, webNotifications, webSites } from '$lib/stores/data';

	import { profileControlleur } from '$lib/stores/key-store';
	import { urlToDomain, reverseArray, timeAgo, tr, web } from '$lib/stores/utils';

	const hexPubKey = getPublicKey($keyStore);
	const nPubKey = nip19.npubEncode(hexPubKey);

	const updateNotification = profileControlleur.updateNotification;

	enum EchoMode {
		Password,
		Normal
	}

	let _currentTab: any = { url: '' };
	web.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		var activeTab = tabs[0];
		_currentTab = activeTab;
	});

	let relayInput: string = '';

	let secretEchoMode: EchoMode = EchoMode.Password;
	let currentTab = 0;

	$: currentSite = $userProfile.data?.webSites
		? $userProfile.data.webSites[urlToDomain(_currentTab.url || '')]
		: [];
</script>

<!-- tabs -->

<div class="tabs w-full">
	<button
		class="tab tab-bordered w-1/3"
		class:tab-active={currentTab === 0}
		on:click={() => (currentTab = 0)}>General</button
	>
	<button
		class="tab tab-bordered w-1/3"
		class:tab-active={currentTab === 1}
		on:click={() => (currentTab = 1)}>History</button
	>
	<button
		class="tab tab-bordered w-1/3"
		class:tab-active={currentTab === 2}
		on:click={() => (currentTab = 2)}>Account</button
	>
</div>

<div class="w-full">
	{#if currentTab === 0}
		<div class="w-full">
			<!-- logout button -->
			<div class="p-4 w-full flex flex-row flex-wrap space-x-2">
				<span class="w-full pb-1 pl-2 font-sans font-bold">Notifications</span>
				<div class="overflow-x-auto w-full">
					<table class="table table-zebra">
						<!-- head -->
						<thead>
							<tr>
								<th>Name</th>
								<th>State</th>
								<th class="text-center w-16">Actions</th>
							</tr>
						</thead>
						<tbody>
							<!-- row 1 -->
							{#each $webNotifications as notif}
								<tr>
									<td>{tr(notif.name || '')} </td>
									<td>
										<span
											class="badge badge-sm"
											class:badge-secondary={notif.state == false}
											class:badge-accent={notif.state == true}
											>{notif ? 'enabled' : 'disabled'}</span
										>
									</td>
									<td class="flex space-x-2">
										<button
											class="btn btn-xs h-8 rounded-2"
											class:btn-accent={notif.state == false}
											class:btn-secondary={notif.state == true}
											on:click={() => updateNotification(notif.name)}
										>
											{notif.state ? 'Disable' : 'Enable'}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			<hr />
			<center>
				<p class="pt-4 font-sans">
					keys.band <span class="text-primary">Vprocess.env.APP_VERSION</span>
				</p>
			</center>
		</div>
	{:else if currentTab === 1}
		<div class="w-full">
			<!-- table for history list -->
			<table class="table table-zebra w-full">
				<thead>
					<tr>
						<th class="fond-bold">Status</th>
						<th>Type</th>
						<th>Time</th>
					</tr>
				</thead>
				<tbody>
					{#each reverseArray(currentSite?.history) as site, i}
						<tr>
							<td
								class="text fond-bold"
								class:text-accent={site.accepted || false}
								class:text-secondary={!site.accepted || false}
								>{site.accepted || false ? 'Yes' : 'No'}</td
							>
							<td class="text fond-bold">{site.type}</td>
							<td>{timeAgo(new Date(site.created_at))}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if currentTab === 2}
		<div class="w-full">
			<button
				class="btn btn-base-100 bg-base-100 bordered border-2 border-base-200 my-8 ml-28"
				on:click={() => {
					web.tabs.create({
						url: 'https://toastr.space/p/' + getPublicKey($keyStore || '')
					});
				}}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zM7.35 18.5C8.66 17.56 10.26 17 12 17s3.34.56 4.65 1.5c-1.31.94-2.91 1.5-4.65 1.5s-3.34-.56-4.65-1.5zm10.79-1.38a9.947 9.947 0 0 0-12.28 0A7.957 7.957 0 0 1 4 12c0-4.42 3.58-8 8-8s8 3.58 8 8c0 1.95-.7 3.73-1.86 5.12z"
					/><path
						fill="currentColor"
						d="M12 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 13 12 13s3.5-1.57 3.5-3.5S13.93 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z"
					/></svg
				>
				show profile
			</button>
			<hr />
			<div class="p-4 w-full flex flex-row flex-wrap space-x-2">
				<span class="w-full pb-1 pl-2 font-sans font-bold">Private Key</span>
				<input
					type={secretEchoMode === EchoMode.Password ? 'password' : 'text'}
					value={nip19.nsecEncode($keyStore)}
					on:focus={() => (secretEchoMode = EchoMode.Normal)}
					on:blur={() => (secretEchoMode = EchoMode.Password)}
					placeholder="nsec"
					class="input input-bordered w-9/12"
				/>
				<button
					class="btn w-2/12 p-2"
					on:click={() => {
						navigator.clipboard.writeText(nip19.nsecEncode($keyStore));
						showNotification('nsec copied to clipboard');
					}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"
							><path
								d="M20.998 10c-.012-2.175-.108-3.353-.877-4.121C19.243 5 17.828 5 15 5h-3c-2.828 0-4.243 0-5.121.879C6 6.757 6 8.172 6 11v5c0 2.828 0 4.243.879 5.121C7.757 22 9.172 22 12 22h3c2.828 0 4.243 0 5.121-.879C21 20.243 21 18.828 21 16v-1"
							/><path
								d="M3 10v6a3 3 0 0 0 3 3M18 5a3 3 0 0 0-3-3h-4C7.229 2 5.343 2 4.172 3.172C3.518 3.825 3.229 4.7 3.102 6"
							/></g
						></svg
					>
				</button>
			</div>
			<div class="p-4 w-full flex flex-row flex-wrap space-x-2">
				<span class="w-full pb-1 pl-2 font-sans font-bold">Public Key (Hex)</span>
				<input type={'text'} value={hexPubKey} class="input input-bordered w-9/12" />
				<button
					class="btn w-2/12 p-2"
					on:click={() => {
						navigator.clipboard.writeText(hexPubKey);
						showNotification('hex public key copied to clipboard');
					}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"
							><path
								d="M20.998 10c-.012-2.175-.108-3.353-.877-4.121C19.243 5 17.828 5 15 5h-3c-2.828 0-4.243 0-5.121.879C6 6.757 6 8.172 6 11v5c0 2.828 0 4.243.879 5.121C7.757 22 9.172 22 12 22h3c2.828 0 4.243 0 5.121-.879C21 20.243 21 18.828 21 16v-1"
							/><path
								d="M3 10v6a3 3 0 0 0 3 3M18 5a3 3 0 0 0-3-3h-4C7.229 2 5.343 2 4.172 3.172C3.518 3.825 3.229 4.7 3.102 6"
							/></g
						></svg
					>
				</button>
			</div>
			<div class="p-4 w-full flex flex-row flex-wrap space-x-2">
				<span class="w-full pb-1 pl-2 font-sans font-bold">Public Key (npub)</span>
				<input type={'text'} value={nPubKey} class="input input-bordered w-9/12" />
				<button
					class="btn w-2/12 p-2"
					on:click={() => {
						navigator.clipboard.writeText(nPubKey);
						showNotification('npub copied to clipboard');
					}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"
							><path
								d="M20.998 10c-.012-2.175-.108-3.353-.877-4.121C19.243 5 17.828 5 15 5h-3c-2.828 0-4.243 0-5.121.879C6 6.757 6 8.172 6 11v5c0 2.828 0 4.243.879 5.121C7.757 22 9.172 22 12 22h3c2.828 0 4.243 0 5.121-.879C21 20.243 21 18.828 21 16v-1"
							/><path
								d="M3 10v6a3 3 0 0 0 3 3M18 5a3 3 0 0 0-3-3h-4C7.229 2 5.343 2 4.172 3.172C3.518 3.825 3.229 4.7 3.102 6"
							/></g
						></svg
					>
				</button>
			</div>
			<hr />
			<div class="p-4 w-full flex flex-row flex-wrap space-x-2">
				<span class="w-full pb-1 pl-2 font-sans font-bold">Relays</span>
				<div class="overflow-x-auto w-full">
					<table class="table table-zebra">
						<!-- head -->
						<thead>
							<tr>
								<th>Relay</th>
								<th class="text-center w-16">Actions</th>
							</tr>
						</thead>
						<tbody>
							<!-- row 1 -->
							{#each $relays as relay}
								<tr>
									<td>{relay?.url}</td>
									<td class="flex space-x-2">
										<button
											class="btn btn-xs h-8"
											on:click={() => {
												// copy
												navigator.clipboard.writeText(relay?.url);
												showNotification('copied to clipboard');
											}}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												><g
													fill="none"
													stroke="currentColor"
													stroke-linecap="round"
													stroke-width="1.5"
													><path
														d="M20.998 10c-.012-2.175-.108-3.353-.877-4.121C19.243 5 17.828 5 15 5h-3c-2.828 0-4.243 0-5.121.879C6 6.757 6 8.172 6 11v5c0 2.828 0 4.243.879 5.121C7.757 22 9.172 22 12 22h3c2.828 0 4.243 0 5.121-.879C21 20.243 21 18.828 21 16v-1"
													/><path
														d="M3 10v6a3 3 0 0 0 3 3M18 5a3 3 0 0 0-3-3h-4C7.229 2 5.343 2 4.172 3.172C3.518 3.825 3.229 4.7 3.102 6"
													/></g
												></svg
											>
										</button>
										<button
											class="btn btn-xs h-8"
											on:click={() => {
												// remove
												relays.set($relays.filter((r) => r?.url !== relay?.url));
												web?.storage?.local?.set({
													relays: $relays
												});
												showNotification('relay removed');
											}}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												><path
													fill="currentColor"
													d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59L7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12L5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"
												/></svg
											>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="w-full flex flex-row flex-wrap space-x-2 mt-4">
					<input
						type="text"
						class="input input-bordered w-9/12 h-10"
						id="value"
						bind:value={relayInput}
						placeholder="Enter relay url"
					/>
					<button
						class="btn btn-sm w-2/12 h-10"
						on:click={() => {
							relays.set([
								...$relays,
								{
									url: relayInput,
									enabled: true,
									created_at: new Date()
								}
							]);
							web?.storage?.local?.set({
								relays: $relays
							});

							relayInput = '';

							showNotification('relay added');
						}}
					>
						Add
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
<div class="toast toast-center opacity-50">
	{#each notifications as toast}
		<div class="alert alert-white bordered border-1 border-gray-300">
			<span class="flex flex-row space-x-4"> {toast.message} </span>
		</div>
	{/each}
</div>
