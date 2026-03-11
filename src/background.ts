import type { Message, MessageSender, Responders } from '$lib/types';
import type { WebSite, Authorization, Profile } from '$lib/types/profile';

import { finishEvent, getPublicKey, nip04 } from 'nostr-tools';
import { urlToDomain, web, BrowserUtil, ProfileUtil } from '$lib/utility';
import { userProfile } from '$lib/stores/data';
import { AllowKind } from '$lib/types';
import { get } from 'svelte/store';
import { profileController } from '$lib/controllers/profile.controller';
import { sessionController } from '$lib/controllers/session.controller';
import { backgroundController } from '$lib/controllers/background.controller';
import { browserController } from '$lib/controllers';

const background = backgroundController();
const session = sessionController();
const AUTHORIZATION_POLL_INTERVAL = 100;

type QueuedRequest = {
	message: Message;
	resolver: (value?: any) => void;
	sender?: MessageSender;
};

const configureActionPanelBehavior = () => {
	if (typeof chrome !== 'undefined' && chrome.sidePanel) {
		chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
	}
};

web.runtime.onInstalled.addListener(() => {
	BrowserUtil.injectJsinAllTabs('content.js');
	configureActionPanelBehavior();
});
web.runtime.onStartup.addListener(() => {
	BrowserUtil.injectJsinAllTabs('content.js');
	configureActionPanelBehavior();
});
web.tabs.onActivated.addListener(async (activeInfo) => browserController.switchIcon(activeInfo));
BrowserUtil.getCurrentTab().then((tab) =>
	browserController.switchIcon({ tabId: tab.id as number })
);

if (__BROWSER__ === 'firefox' && web.browserAction?.onClicked && web.sidebarAction?.open) {
	web.browserAction.onClicked.addListener(async () => {
		try {
			await web.sidebarAction.open();
		} catch (error) {
			console.error('Error opening Firefox sidebar from toolbar click:', error);
		}
	});
}

const responders: Responders = {};
const requestQueue: QueuedRequest[] = [];

const getPendingRequestsCount = () => Object.keys(responders).length + requestQueue.length;

const hasPendingAuthorizationRequest = () => getPendingRequestsCount() > 0;

const updatePendingRequestsBadge = async () => {
	await browserController.setPendingRequestsBadge(getPendingRequestsCount());
};

const buildRejectedResponse = (message: Message) =>
	buildResponseMessage(message, {
		error: {
			message: 'User rejected the request',
			stack: 'User rejected the request'
		}
	});

const hasWebSiteAlreadyLogged = async (domain: string): Promise<Profile> => {
	const allUsers = get(await profileController.loadProfiles()) as Profile[];
	let lastDate = new Date(0);
	let currentProfile: Profile | undefined;
	for (const user of allUsers) {
		const webSites = user.data?.webSites as { [key: string]: WebSite };
		if (webSites !== undefined && domain in webSites) {
			const history = webSites[domain].history || [];
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
						read: access === 0 || access === 2, // READ (0) or READ_WRITE (2)
						write: access === 1 || access === 2 // WRITE (1) or READ_WRITE (2)
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

async function manageResult(message: Message, sender: any) {
	try {
		if (message.response === undefined) return;
		const responderData = responders[message.requestId as string];
		if (!responderData) return;

		const domain = responderData.domain;
		const user = get(userProfile);
		const site: WebSite = ProfileUtil.getWebSiteOrCreate(domain, user);

		await background.updatePermisison(
			message.response.permission,
			site,
			responderData.domain,
			responderData.type
		);

		if (message.response.error)
			responderData.resolve({
				id: message.requestId,
				type: responderData.type,
				ext: 'keys.band',
				response: {
					error: {
						message: 'User rejected the request',
						stack: 'User rejected the request'
					}
				}
			});
		else
			responderData.resolve({
				id: message.requestId,
				type: responderData.type,
				ext: 'keys.band',
				response: await makeResponse(responderData.type, responderData.data)
			});
	} catch (e) {
		console.error(e);
	}

	try {
		if (message.promptContext === 'popup' && sender?.tab?.windowId) {
			web.windows.remove(sender.tab.windowId);
		}
	} catch (error) {
		// Silently handle errors when removing windows that might no longer exist
		if (error instanceof Error && error.message.includes('No window with id')) {
			// Window was already closed, nothing to do
		} else {
			console.error('Error removing window:', error);
		}
	}

	delete responders[message.requestId as string];
	await updatePendingRequestsBadge();
	return;
}

const pushHistory = async (yes: boolean, message: Message) => {
	const domain = urlToDomain(message.url || '');
	await background.addHistory(
		{
			acceptance: yes,
			type: message.type
		},
		domain
	);
};

const isAllow = async (domain: string): Promise<AllowKind> => {
	const user = await background.getUserProfile();
	const site: WebSite = ProfileUtil.getWebSiteOrCreate(domain, user);
	const permission: Authorization = site.permission as Authorization;

	if (permission.accept) {
		if (permission.always) {
			return AllowKind.AlWaysAllow;
		}

		if (permission.authorizationStop && new Date(permission.authorizationStop) > new Date()) {
			return AllowKind.AllowForSession;
		}

		return AllowKind.Nothing;
	}

	if (permission.reject) {
		if (permission.always) {
			return AllowKind.AlwaysReject;
		}

		if (permission.authorizationStop && new Date(permission.authorizationStop) > new Date()) {
			return AllowKind.RejectForSession;
		}
	}

	return AllowKind.Nothing;
};

const buildResponseMessage = (message: Message, response: any): any => {
	return {
		id: message.id,
		type: message.type,
		ext: 'keys.band',
		response: response || {
			error: {
				message: 'User rejected the request',
				stack: 'User rejected the request'
			}
		},
		url: message.url
	};
};

/*eslint no-async-promise-executor: 0*/
async function manageRequest(
	message: Message,
	resolver: any = null,
	next: boolean = false,
	sender?: MessageSender
): Promise<any> {
	return new Promise(async (res: (value?: any) => void) => {
		const resolve: (value?: any) => void = resolver || res;

		try {
			const user = await background.getUserProfile();

			const domain = urlToDomain(message.url || '');

			if (!next) {
				// Check if we already have a request for this domain+type queued OR pending via popup
				let existingInQueue = false;
				for (const queuedRequest of requestQueue) {
					if (
						queuedRequest.message.url === message.url &&
						queuedRequest.message.type === message.type
					) {
						existingInQueue = true;
						break;
					}
				}

				let existingPending = false;
				for (const requestId in responders) {
					const responder = responders[requestId];
					if (responder.domain === domain && responder.type === message.type) {
						existingPending = true;
						break;
					}
				}

				if (existingInQueue || existingPending) {
					return;
				}

				if (!hasPendingAuthorizationRequest()) {
					next = true;
				} else {
					requestQueue.push({ message, resolver: resolve, sender });
					await updatePendingRequestsBadge();
					return;
				}
			}

			const previousProfile = await hasWebSiteAlreadyLogged(domain);

			if (user.data?.privateKey === undefined) {
				return resolve(buildRejectedResponse(message));
			}

			let access: AllowKind = await isAllow(domain);

			if (message.type === 'getPublicKey' && previousProfile.id !== user.id) {
				access = AllowKind.Nothing;
			}

			switch (access) {
				case AllowKind.AlWaysAllow:
					await pushHistory(true, message);
					return resolve(
						buildResponseMessage(
							message,
							await makeResponse(message.type, message.params.event || message.params)
						)
					);
				case AllowKind.AlwaysReject:
					await pushHistory(false, message);
					return resolve(buildRejectedResponse(message));
				case AllowKind.AllowForSession:
					await pushHistory(true, message);
					return resolve(
						buildResponseMessage(
							message,
							await makeResponse(message.type, message.params?.event || message.params)
						)
					);
				case AllowKind.RejectForSession:
					await pushHistory(false, message);
					return resolve(buildRejectedResponse(message));
				case AllowKind.Nothing:
					break;
			}

			responders[message.id] = {
				resolve,
				domain,
				type: message.type,
				data: message.params.event || message.params
			};
			await updatePendingRequestsBadge();

			const dataId = await session.add({
				action: 'login',
				url: message.url,
				requestId: message.id,
				type: message.type,
				data: message.params.event || message.params || '{}' || '',
				previousProfile
			});

			const promptUrl = 'popup.html?query=' + btoa(dataId);
			await BrowserUtil.openAuthorizationPrompt(promptUrl, sender);
		} catch (error) {
			console.error('[Background] Error in manageRequest:', error);
			throw error;
		}
	});
}

const proceedNextRequest = async () => {
	if (Object.keys(responders).length === 0 && requestQueue.length > 0) {
		const nextRequest = requestQueue.shift();
		if (!nextRequest) {
			return;
		}

		const { message, resolver, sender } = nextRequest;
		await updatePendingRequestsBadge();
		manageRequest(message, resolver, true, sender);
	}
};

setInterval(async () => proceedNextRequest(), AUTHORIZATION_POLL_INTERVAL);

web.runtime.onMessage.addListener(
	(message: Message, sender: MessageSender, sendResponse: (response?: unknown) => void) => {
		if (message.prompt) {
			manageResult(message, sender);
			sendResponse({ message: true });
		} else {
			// Call manageRequest immediately instead of using setInterval
			manageRequest(message, null, false, sender)
				.then(async (data) => {
					sendResponse(data);
				})
				.catch((err) => {
					console.error('[Background] Error in manageRequest:', err);
					sendResponse({
						id: message.id,
						type: message.type,
						ext: 'keys.band',
						response: {
							error: {
								message: 'Internal error',
								stack: err.toString()
							}
						}
					});
				})
				.finally(() => {
					proceedNextRequest();
				});
		}

		return true;
	}
);
