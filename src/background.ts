import type { Message, MessageSender, Responders } from '$lib/types';
import type { Profile, WebSite } from '$lib/types/profile';
import type { PermissionDuration } from '$lib/types/background';

import { finishEvent, getPublicKey, nip04 } from 'nostr-tools';
import { web, BrowserUtil, ProfileUtil, urlToOrigin, capabilityFor, getAllowKind } from '$lib/utility';
import { userProfile } from '$lib/stores/data';
import { AllowKind } from '$lib/types';
import { get } from 'svelte/store';
import { profileController } from '$lib/controllers/profile.controller';
import { sessionController } from '$lib/controllers/session.controller';
import { backgroundController } from '$lib/controllers/background.controller';
import { browserController } from '$lib/controllers';
import { vaultController } from '$lib/controllers/vault.controller';

const background = backgroundController();
const session = sessionController();



web.runtime.onInstalled.addListener(() => {
	BrowserUtil.injectJsinAllTabs('content.js');
	// Configure side panel behavior - allow opening via action click when popup is not shown
	if (typeof chrome !== 'undefined' && chrome.sidePanel) {
		chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
	}
});
web.runtime.onStartup.addListener(() => BrowserUtil.injectJsinAllTabs('content.js'));
web.tabs.onActivated.addListener(async (activeInfo) => browserController.switchIcon(activeInfo));
BrowserUtil.getCurrentTab().then((tab) => browserController.switchIcon({ tabId: tab.id as number }));

const responders: Responders = {};
const requestQueue: any[] = [];

const hasWebSiteAlreadyLogged = async (origin: string): Promise<Profile> => {
	const allUsers = get(await profileController.loadProfiles()) as Profile[];
	let lastDate = new Date(0);
	let currentProfile: Profile | undefined;
	for (const user of allUsers) {
		const webSites = user.data?.webSites as { [key: string]: WebSite };
		if (webSites !== undefined && origin in webSites) {
			const history = webSites[origin].history || [];
			for (const h of history) {
				if (h.type === 'getPublicKey') {
					const date = new Date(h.created_at);
					if (date > lastDate) {
						currentProfile = user as Profile;
						lastDate = date;
					}
				}
			}
		}
	}

	return currentProfile || (await background.getUserProfile());
};

const makeResponse = async (type: string, data: any) => {
	await vaultController.markActivity();
	await profileController.loadProfiles();
	const user = get(userProfile);
	const privateKey: string = user.data?.privateKey || '';
	let res: any;

	switch (type) {
		case 'getPublicKey':
			res = getPublicKey(privateKey);
			break;
		case 'getRelays':
			// NIP-07 format: { "wss://relay.url": { read: true, write: true } }
			res = {};
			user.data?.relays?.forEach((relay) => {
				if (relay?.url) {
					const access = relay.access ?? 2; // Default to READ_WRITE (2)
					res[relay.url] = {
						read: access === 0 || access === 2,  // READ (0) or READ_WRITE (2)
						write: access === 1 || access === 2  // WRITE (1) or READ_WRITE (2)
					};
				}
			});
			break;
		case 'signEvent':
			res = data;
			if (res?.pubkey == null || res?.pubkey === undefined || res?.pubkey === '') {
				const pk = getPublicKey(privateKey);
				res.pubkey = pk;
			}
			res = finishEvent(res, privateKey);
			break;
		case 'nip04.decrypt':
			try {
				res = await nip04.decrypt(privateKey, data.peer, data.ciphertext);
			} catch (e) {
				res = {
					error: {
						message: 'Error while decrypting data',
						stack: e
					}
				};
			}
			break;
		case 'nip04.encrypt':
			try {
				res = await nip04.encrypt(privateKey, data.peer, data.plaintext);
			} catch (e) {
				res = {
					error: {
						message: 'Error while encrypting data',
						stack: e
					}
				};
			}
			break;
		default:
			res = null;
	}
	return res;
};

const REJECTED = {
	error: {
		message: 'User rejected the request',
		stack: 'User rejected the request'
	}
};

const buildResponseMessage = (pageRequestId: string, type: string, response: any): any => {
	return {
		id: pageRequestId,
		type,
		ext: 'keys.band',
		response: response || REJECTED
	};
};

// The data a request operates on: the event for signEvent, the params object otherwise
const requestData = (message: Message): any =>
	message.type === 'signEvent' ? message.params?.event : message.params;

async function manageResult(message: Message, sender: MessageSender) {
	const requestId = message.requestId as string;
	const responderData = responders[requestId];
	// Only the popup window opened for this exact request may answer it
	if (
		!responderData ||
		responderData.windowId === undefined ||
		sender.tab?.windowId !== responderData.windowId
	)
		return;
	delete responders[requestId];

	const response = message.response;
	const accepted = response?.error === false && response?.permission?.accept === true;
	const { pageRequestId, type, origin, capability, windowId } = responderData;

	try {
		if (response?.permission) {
			const duration: PermissionDuration = {
				always: response.permission.always === true,
				accept: accepted,
				reject: !accepted,
				duration: new Date(response.permission.duration)
			};
			await background.updatePermisison(duration, origin, capability);
		}

		responderData.resolve(
			buildResponseMessage(
				pageRequestId,
				type,
				accepted ? await makeResponse(type, responderData.data) : REJECTED
			)
		);
	} catch (e) {
		console.error(e);
		responderData.resolve(buildResponseMessage(pageRequestId, type, REJECTED));
	}

	web.windows.remove(windowId).catch(() => {
		// Window was already closed, nothing to do
	});
}

// Closing the authorization popup without answering rejects the request instead of leaving it hanging
web.windows.onRemoved.addListener((windowId: number) => {
	for (const [requestId, responderData] of Object.entries(responders)) {
		if (responderData.windowId !== windowId) continue;
		delete responders[requestId];
		responderData.resolve(
			buildResponseMessage(responderData.pageRequestId, responderData.type, REJECTED)
		);
	}
});

// While locked (or before the vault is set up) requests wait for the user to unlock in a popup.
// Concurrent requests share one unlock popup.
let unlockWaiter: Promise<boolean> | null = null;

const waitForUnlock = () =>
	new Promise<boolean>((resolve) => {
		let popupId: number | undefined;
		const done = (unlocked: boolean) => {
			web.storage.onChanged.removeListener(onStorageChanged);
			web.windows.onRemoved.removeListener(onWindowRemoved);
			resolve(unlocked);
		};
		const onStorageChanged = async (_changes: unknown, area: string) => {
			if (area === 'session' && (await vaultController.status()) === 'unlocked') done(true);
		};
		const onWindowRemoved = async (windowId: number) => {
			if (windowId === popupId) done((await vaultController.status()) === 'unlocked');
		};
		web.storage.onChanged.addListener(onStorageChanged);
		web.windows.onRemoved.addListener(onWindowRemoved);
		BrowserUtil.createWindow('popup.html?unlock=1').then(
			(popup) => (popupId = popup.id),
			() => done(false)
		);
	});

const ensureUnlocked = async (): Promise<boolean> => {
	if ((await vaultController.status()) === 'unlocked') return true;
	if (!unlockWaiter) unlockWaiter = waitForUnlock().finally(() => (unlockWaiter = null));
	return unlockWaiter;
};

const pushHistory = async (yes: boolean, origin: string, capability: string) => {
	await background.addHistory(
		{
			acceptance: yes,
			type: capability
		},
		origin
	);
};

/*eslint no-async-promise-executor: 0*/
async function manageRequest(
	message: Message,
	capability: string,
	resolver: any = null,
	next: boolean = false
): Promise<any> {
	return new Promise(async (res) => {
		const resolve: Promise<any> | any = resolver || res;

		try {
			let user = await background.getUserProfile();
			const origin = message.url as string;

			if (next === false) {
				// Check if we already have a request for this origin+capability queued OR pending via popup
				const existingInQueue = requestQueue.find(
					(item) => item.message.url === origin && item.capability === capability
				);
				const existingPending = Object.values(responders).some(
					(r) => r.origin === origin && r.capability === capability
				);
				if (existingInQueue || existingPending) {
					return;
				}
				requestQueue.push({ message, capability, resolver: resolve });
				return;
			}

			if (!user.id || !(await ensureUnlocked())) {
				return resolve(buildResponseMessage(message.id, message.type, REJECTED));
			}
			// reload so the profile carries its key from the now unlocked vault
			user = await background.getUserProfile();
			if (!user.data?.privateKey) {
				return resolve(buildResponseMessage(message.id, message.type, REJECTED));
			}

			const previousProfile = await hasWebSiteAlreadyLogged(origin);

			const site = ProfileUtil.getWebSiteOrCreate(origin, user);
			let access: AllowKind = getAllowKind(site, capability);

			if (message.type === 'getPublicKey')
				if (previousProfile.id !== user.id) access = AllowKind.Nothing;

			switch (access) {
				case AllowKind.AlWaysAllow:
				case AllowKind.AllowForSession:
					await pushHistory(true, origin, capability);
					return resolve(
						buildResponseMessage(
							message.id,
							message.type,
							await makeResponse(message.type, requestData(message))
						)
					);
				case AllowKind.AlwaysReject:
				case AllowKind.RejectForSession:
					await pushHistory(false, origin, capability);
					return resolve(buildResponseMessage(message.id, message.type, REJECTED));
				case AllowKind.Nothing:
					break;
			}

			const requestId = crypto.randomUUID();
			responders[requestId] = {
				resolve,
				origin,
				capability,
				pageRequestId: message.id,
				type: message.type,
				data: requestData(message)
			};

			const dataId = await session.add({
				action: 'login',
				url: origin,
				requestId,
				type: message.type,
				data: requestData(message) || {},
				// only what the popup displays; never copy the previous profile's keys
				previousProfile: { id: previousProfile.id, name: previousProfile.name }
			});

			const popup = await BrowserUtil.createWindow('popup.html?query=' + btoa(dataId));
			if (responders[requestId]) responders[requestId].windowId = popup.id;
		} catch (error) {
			console.error('[Background] Error in manageRequest:', error);
			throw error;
		}
	});
}

const proceedNextRequest = async () => {
	const allWindows = await web.windows.getAll();
	const popupWindows = allWindows.filter((win) => win.type === 'popup');

	// Check if any popup has authorization query parameter
	let authorizationPopupExists = false;
	for (const popup of popupWindows) {
		if (popup.tabs && popup.tabs.length > 0) {
			const url = popup.tabs[0].url || '';
			if (url.includes('popup.html?query=')) {
				authorizationPopupExists = true;
				break;
			}
		}
	}

	if (!authorizationPopupExists && requestQueue.length > 0) {
		const { message, capability, resolver } = requestQueue.shift();
		manageRequest(message, capability, resolver, true);
	}
};

setInterval(async () => proceedNextRequest(), 100);

web.runtime.onMessage.addListener((message: any, sender: MessageSender, sendResponse: (response?: unknown) => void) => {
	if (sender.id !== web.runtime.id || !message || typeof message !== 'object') return;

	if (message.prompt) {
		// Approval replies are only accepted from the extension's own authorization popup, never from a web page
		if (!sender.tab || !sender.url?.startsWith(web.runtime.getURL('popup.html'))) return;
		manageResult(message, sender);
		sendResponse({ message: true });
		return true;
	}

	// NIP-07 requests come from the content script in a tab; the origin is taken from the
	// browser-supplied sender, never from the message contents
	if (!sender.tab) return;

	const request: Message = {
		id: String(message.id),
		type: String(message.type),
		params: message.params ?? {},
		url: urlToOrigin(sender.url || '')
	};
	const capability = request.url ? capabilityFor(request.type, requestData(request)) : null;

	if (!capability) {
		sendResponse(buildResponseMessage(request.id, request.type, REJECTED));
		return;
	}

	manageRequest(request, capability)
		.then(async (data) => {
			sendResponse(data);
		})
		.catch((err) => {
			console.error('[Background] Error in manageRequest:', err);
			sendResponse(
				buildResponseMessage(request.id, request.type, {
					error: {
						message: 'Internal error',
						stack: err.toString()
					}
				})
			);
		})
		.finally(() => {
			proceedNextRequest();
		});

	return true;
});
