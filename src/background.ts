import type { Message, MessageSender, PopupParams } from '$lib/types';
import type { Profile } from '$lib/types/profile';

import { finishEvent, getPublicKey, nip04 } from 'nostr-tools';
import { web, BrowserUtil, ProfileUtil, urlToOrigin, capabilityFor, getAllowKind } from '$lib/utility';
import { profiles } from '$lib/stores/data';
import { AllowKind } from '$lib/types';
import { get } from 'svelte/store';
import { pendingRequests } from '$lib/controllers/session.controller';
import { backgroundController } from '$lib/controllers/background.controller';
import { browserController } from '$lib/controllers';
import { vaultController } from '$lib/controllers/vault.controller';

const background = backgroundController();

web.runtime.onInstalled.addListener(() => {
	BrowserUtil.injectJsinAllTabs();
	// Configure side panel behavior - allow opening via action click when popup is not shown
	if (typeof chrome !== 'undefined' && chrome.sidePanel) {
		chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
	}
});
web.tabs.onActivated.addListener(async (activeInfo) => browserController.switchIcon(activeInfo));
BrowserUtil.getCurrentTab().then((tab) => browserController.switchIcon({ tabId: tab.id as number }));

// Earlier versions kept approval requests in storage.local, and prompts from an earlier run of the
// background can no longer be answered
web.storage.local.remove('sessionData').catch(() => {});
pendingRequests.clear().catch(() => {});

// At most this many requests per site, and in total, wait for an approval window
const MAX_QUEUED_PER_ORIGIN = 5;
const MAX_QUEUED = 50;

interface Pending {
	request: Message;
	capability: string;
	origin: string;
}

interface Queued extends Pending {
	resolve: (response: any) => void;
}

interface Decision {
	decision: 'allow' | 'reject' | 'ask';
	user: Profile;
	previousProfile: Profile;
}

/** The account that last gave this site its public key, or the current account. */
const lastLoggedInProfile = (origin: string, current: Profile): Profile => {
	let lastDate = new Date(0);
	let found: Profile | undefined;
	for (const user of get(profiles)) {
		for (const h of user.data?.webSites?.[origin]?.history || []) {
			const date = new Date(h.created_at);
			if (h.type === 'getPublicKey' && date > lastDate) {
				found = user;
				lastDate = date;
			}
		}
	}
	return found || current;
};

/** Answers a request with `user`'s key: the account the decision was made for. */
const makeResponse = async (type: string, data: any, user: Profile) => {
	await vaultController.markActivity();
	const privateKey = user.data?.privateKey;
	if (!privateKey) throw new Error('No private key available');
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

const TOO_MANY = {
	error: {
		message: 'Too many pending requests',
		stack: 'Too many pending requests'
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

/** Applies a remembered decision, if there is one, and records it in the site's history. */
const decide = async ({ request, capability, origin }: Pending): Promise<Decision> => {
	const user = await background.getUserProfile();
	const previousProfile = lastLoggedInProfile(origin, user);
	if (!user.id || !user.data?.privateKey) return { decision: 'reject', user, previousProfile };

	let access: AllowKind = getAllowKind(ProfileUtil.getWebSiteOrCreate(origin, user), capability);
	// a site that knows another account must ask before it learns this one
	if (request.type === 'getPublicKey' && previousProfile.id !== user.id) access = AllowKind.Nothing;

	if (access === AllowKind.AlWaysAllow || access === AllowKind.AllowForSession) {
		await background.addHistory(user.id, origin, { acceptance: true, type: capability });
		return { decision: 'allow', user, previousProfile };
	}
	if (access === AllowKind.AlwaysReject || access === AllowKind.RejectForSession) {
		await background.addHistory(user.id, origin, { acceptance: false, type: capability });
		return { decision: 'reject', user, previousProfile };
	}
	return { decision: 'ask', user, previousProfile };
};

const respond = async ({ request }: Pending, { decision, user }: Decision) =>
	buildResponseMessage(
		request.id,
		request.type,
		decision === 'allow' ? await makeResponse(request.type, requestData(request), user) : REJECTED
	);

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

// Requests that need an answer from the user wait here and are shown one approval window at a time
const queue: Queued[] = [];
let active: (Queued & { requestId: string; windowId?: number; answered?: boolean }) | null = null;
let showing = false;

const askUser = (pending: Pending): Promise<any> => {
	const fromOrigin =
		queue.filter((q) => q.origin === pending.origin).length + (active?.origin === pending.origin ? 1 : 0);
	if (fromOrigin >= MAX_QUEUED_PER_ORIGIN || queue.length >= MAX_QUEUED)
		return Promise.resolve(buildResponseMessage(pending.request.id, pending.request.type, TOO_MANY));
	return new Promise((resolve) => {
		queue.push({ ...pending, resolve });
		showNextPrompt();
	});
};

/** Opens the approval window for the next queued request, unless one is already open. */
const showNextPrompt = async () => {
	if (showing) return;
	showing = true;
	try {
		while (!active && queue.length > 0) {
			const next = queue.shift() as Queued;
			const requestId = crypto.randomUUID();
			// counted as this site's open prompt from here on, so the queue limit stays exact
			active = { ...next, requestId };
			try {
				// an earlier answer may cover this request now ("Always"), or the vault may have locked
				const result = (await ensureUnlocked()) ? await decide(next) : null;
				if (!result || result.decision !== 'ask') {
					const response = result
						? await respond(next, result)
						: buildResponseMessage(next.request.id, next.request.type, REJECTED);
					active = null;
					next.resolve(response);
					continue;
				}

				const params: PopupParams = {
					url: next.origin,
					requestId,
					type: next.request.type,
					data: requestData(next.request) || {},
					// only what the popup displays; never copy the previous profile's keys
					previousProfile: { id: result.previousProfile.id, name: result.previousProfile.name }
				};
				await pendingRequests.set(requestId, params);
				const popup = await BrowserUtil.createWindow('popup.html?request=' + requestId);
				if (active?.requestId === requestId) active.windowId = popup.id;
			} catch (error) {
				console.error('[Background] Could not show the approval window:', error);
				if (active?.requestId === requestId) active = null;
				pendingRequests.remove(requestId).catch(() => {});
				next.resolve(buildResponseMessage(next.request.id, next.request.type, REJECTED));
			}
		}
	} finally {
		showing = false;
	}
};

/** Ends the open approval with `response` and moves on to the next request. */
const finishPrompt = (response: any, rejected: boolean) => {
	const current = active;
	if (!current) return;
	active = null;
	current.resolve(buildResponseMessage(current.request.id, current.request.type, response));
	// a "no" also answers this site's queued requests for the same permission
	if (rejected) {
		for (const queued of queue.filter((q) => q.origin === current.origin && q.capability === current.capability)) {
			queue.splice(queue.indexOf(queued), 1);
			queued.resolve(buildResponseMessage(queued.request.id, queued.request.type, REJECTED));
		}
	}
	pendingRequests.remove(current.requestId).catch(() => {});
	if (current.windowId !== undefined) web.windows.remove(current.windowId).catch(() => {});
	showNextPrompt();
};

async function manageResult(message: Message, sender: MessageSender) {
	const current = active;
	// Only the popup window opened for this exact request may answer it
	if (
		!current ||
		current.answered ||
		message.requestId !== current.requestId ||
		current.windowId === undefined ||
		sender.tab?.windowId !== current.windowId
	)
		return;
	current.answered = true;

	const response = message.response;
	const accepted = response?.error === false && response?.permission?.accept === true;
	let result: any = REJECTED;
	try {
		// the account selected in the popup when the user answered
		const user = await background.getUserProfile();
		if (response?.permission && user.id) {
			await background.updatePermisison(user.id, current.origin, current.capability, {
				always: response.permission.always === true,
				accept: accepted,
				reject: !accepted,
				duration: new Date(response.permission.duration)
			});
		}
		if (accepted) result = await makeResponse(current.request.type, requestData(current.request), user);
	} catch (e) {
		console.error(e);
		result = REJECTED;
	}
	finishPrompt(result, !accepted);
}

// Closing the approval window without answering rejects the request
web.windows.onRemoved.addListener((windowId: number) => {
	if (active && active.windowId === windowId && !active.answered) finishPrompt(REJECTED, true);
});

const handleRequest = async (request: Message, capability: string): Promise<any> => {
	const pending: Pending = { request, capability, origin: request.url as string };
	if (!(await ensureUnlocked())) return buildResponseMessage(request.id, request.type, REJECTED);
	const result = await decide(pending);
	return result.decision === 'ask' ? askUser(pending) : respond(pending, result);
};

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

	handleRequest(request, capability)
		.catch((err) => {
			console.error('[Background] Error handling request:', err);
			return buildResponseMessage(request.id, request.type, {
				error: {
					message: 'Internal error',
					stack: String(err)
				}
			});
		})
		.then(sendResponse);

	return true;
});
