// @vitest-environment node
// Drives the real background.ts message handler through the attacks fixed in the security review.
import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { generatePrivateKey, getPublicKey, verifySignature } from 'nostr-tools';

const EXT_ID = 'keys-band-test';
const POPUP_URL = `chrome-extension://${EXT_ID}/popup.html`;

const sk = generatePrivateKey();
const pk = getPublicKey(sk);
const store: Record<string, any> = {};
const sessionStore: Record<string, any> = {};
const storageListeners = new Set<any>();
const windowRemovedListeners = new Set<any>();
let onMessage: any;
const PASS = 'correct horse battery staple';
const PIN = '482916';
let vault: typeof import('$lib/controllers/vault.controller').vaultController;
let nextWindowId = 100;
const windowsCreate = vi.fn(async () => ({ id: nextWindowId++ }));
const windowsRemove = vi.fn(async () => {});

vi.mock('webextension-polyfill', () => {
	const ev = () => ({ addListener: vi.fn() });
	const area = (data: Record<string, any>, name: string) => ({
		get: async (k: string) => (k in data ? { [k]: structuredClone(data[k]) } : {}),
		set: async (o: any) => {
			Object.assign(data, structuredClone(o));
			storageListeners.forEach((fn) => fn(o, name));
		}
	});
	return {
		default: {
			runtime: {
				id: EXT_ID,
				onInstalled: ev(),
				onStartup: ev(),
				onMessage: { addListener: (fn: any) => (onMessage = fn) },
				getURL: (p: string) => `chrome-extension://${EXT_ID}/${p}`
			},
			tabs: {
				query: async () => [{ id: 1, url: 'https://x.example' }],
				get: async () => ({ id: 1, url: 'https://x.example' }),
				onActivated: ev(),
				onUpdated: ev()
			},
			windows: {
				create: windowsCreate,
				remove: windowsRemove,
				getAll: async () => [],
				onRemoved: {
					addListener: (fn: any) => windowRemovedListeners.add(fn),
					removeListener: (fn: any) => windowRemovedListeners.delete(fn)
				}
			},
			storage: {
				local: area(store, 'local'),
				session: area(sessionStore, 'session'),
				onChanged: {
					addListener: (fn: any) => storageListeners.add(fn),
					removeListener: (fn: any) => storageListeners.delete(fn)
				}
			}
		}
	};
});
// keep tests offline
vi.mock('$lib/utility/nostr-utils', async (orig) => ({
	...(await orig<any>()),
	getRelays: async () => null,
	getMetadata: async () => ({}),
	prepareRelayPool: async () => {}
}));

const tabSender = (url: string, windowId = 1) => ({ id: EXT_ID, url, tab: { id: windowId, windowId } });
const popupSender = (windowId: number) => ({ id: EXT_ID, url: `${POPUP_URL}?query=abc`, tab: { id: windowId, windowId } });

/** Sends a message to the background; resolves with its reply, or 'pending' if none within `ms`. */
const send = (msg: any, sender: any, ms = 1500) =>
	new Promise<any>((res) => {
		const timer = setTimeout(() => res('pending'), ms);
		onMessage(msg, sender, (reply: any) => {
			clearTimeout(timer);
			res(reply);
		});
	});

const signRequest = (id: string, kind: number) => ({
	id,
	ext: 'keys.band',
	type: 'signEvent',
	params: { event: { kind, content: 'hello', tags: [], created_at: 1 } }
});

const site = (permissions: Record<string, any>) => ({
	auth: false,
	permissions,
	history: [{ type: 'getPublicKey', accepted: true, created_at: new Date().toString() }]
});
const ALWAYS = { always: true, accept: true, reject: false, authorizationStop: new Date().toString() };

/** The request id the background handed to the most recent popup. */
const closeWindow = (id: number) => windowRemovedListeners.forEach((fn) => fn(id));

/** Id of the most recent window opened for the given popup URL fragment. */
const openedWindow = async (fragment: string) => {
	await vi.waitFor(() =>
		expect(windowsCreate.mock.calls.some((c: any) => c[0].url.includes(fragment))).toBe(true)
	);
	const index = windowsCreate.mock.calls.findIndex((c: any) => c[0].url.includes(fragment));
	return (await windowsCreate.mock.results[index].value).id;
};

const lastPopupRequestId = () => {
	const sessions = Object.values(store.sessionData || {}) as any[];
	return sessions[sessions.length - 1].requestId;
};

beforeAll(async () => {
	// profile saved by an earlier version: plaintext key in storage.local, no vault yet
	store.profiles = [
		{
			name: 'me',
			id: pk,
			data: {
				pubkey: pk,
				privateKey: sk,
				relays: [],
				webSites: {
					'https://notes.example': site({ getPublicKey: ALWAYS, 'signEvent:1': ALWAYS }),
					// data saved by the previous version: one domain-wide permission
					'legacy.example': { auth: false, permission: ALWAYS, history: [] },
					'https://legacy.example': { auth: false, permission: ALWAYS, history: [] }
				}
			}
		}
	];
	store.currentProfile = pk;
	await import('../../background');
	vault = (await import('$lib/controllers/vault.controller')).vaultController;
});

beforeEach(() => {
	windowsCreate.mockClear();
	windowsRemove.mockClear();
	store.sessionData = {};
});

describe('encrypted key storage (finding 1)', () => {
	it('never signs with a plaintext key from before the vault existed, and continues after setup', async () => {
		const pending = send(signRequest('v1', 1), tabSender('https://notes.example/'), 10_000);
		await openedWindow('popup.html?unlock=1');
		expect(await Promise.race([pending, new Promise((r) => setTimeout(() => r('pending'), 300))])).toBe(
			'pending'
		);

		// what the setup screen does: move the key into the vault, store profiles without it
		const { withoutKeys } = await import('$lib/controllers/profile.controller');
		store.profiles = withoutKeys(store.profiles);
		await vault.setup(PASS, PIN, { [pk]: sk });

		const reply = await pending;
		expect(verifySignature(reply.response)).toBe(true);
	});

	it('keeps the private key out of storage.local', () => {
		expect(store.vault).toBeDefined();
		expect(JSON.stringify(store)).not.toContain(sk);
	});

	it('waits for the PIN while locked and continues after unlock', async () => {
		await vault.lock();
		const pending = send(signRequest('v2', 1), tabSender('https://notes.example/'), 10_000);
		await openedWindow('popup.html?unlock=1');
		await vault.unlockWithPin(PIN);
		const reply = await pending;
		expect(verifySignature(reply.response)).toBe(true);
	});

	it('rejects the request when the unlock popup is closed while still locked', async () => {
		await vault.lock();
		const pending = send(signRequest('v3', 1), tabSender('https://notes.example/'), 10_000);
		closeWindow(await openedWindow('popup.html?unlock=1'));
		const reply = await pending;
		expect(reply.response.error.message).toBe('User rejected the request');
		await vault.unlockWithPin(PIN);
	});
});

describe('per-capability permissions (finding 2)', () => {
	it('signs the granted kind without a prompt', async () => {
		const reply = await send(signRequest('a1', 1), tabSender('https://notes.example/feed'));
		expect(reply.id).toBe('a1');
		expect(verifySignature(reply.response)).toBe(true);
		expect(windowsCreate).not.toHaveBeenCalled();
	});

	it('does not extend a kind-1 / getPublicKey grant to deletions, profile edits or DM decryption', async () => {
		for (const request of [
			signRequest('a2', 5),
			signRequest('a3', 0),
			{ id: 'a4', ext: 'keys.band', type: 'nip04.decrypt', params: { peer: pk, ciphertext: 'x?iv=y' } }
		]) {
			expect(await send(request, tabSender('https://notes.example/'), 400)).toBe('pending');
		}
		await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalledTimes(3));
	});

	it('ignores the old domain-wide permission format', async () => {
		expect(await send(signRequest('a5', 1), tabSender('https://legacy.example/'), 400)).toBe('pending');
	});

	it('rejects malformed and unknown requests without opening a popup', async () => {
		const bad = await send({ ...signRequest('a6', 1), params: { event: { kind: 'x' } } }, tabSender('https://notes.example/'));
		const unknown = await send({ id: 'a7', ext: 'keys.band', type: 'replaceURL', params: {} }, tabSender('https://notes.example/'));
		expect(bad.response.error).toBeDefined();
		expect(unknown.response.error).toBeDefined();
		expect(windowsCreate).not.toHaveBeenCalled();
	});
});

describe('origin keying (finding 3)', () => {
	it('an https grant does not apply to http on the same host', async () => {
		expect(await send(signRequest('b1', 1), tabSender('http://notes.example/'), 400)).toBe('pending');
		await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalled());
	});

	it('takes the origin from the browser sender, not from the message', async () => {
		const forged = { ...signRequest('b2', 1), url: 'https://notes.example' };
		expect(await send(forged, tabSender('https://evil.example/'), 400)).toBe('pending');
	});

	it('rejects non-http(s) pages', async () => {
		const reply = await send(signRequest('b3', 1), tabSender('file:///home/me/page.html'));
		expect(reply.response.error).toBeDefined();
	});
});

describe('approval channel (finding 4)', () => {
	it('ignores a forged approval sent from a web page and still accepts the real popup', async () => {
		const pending = send(signRequest('c1', 7), tabSender('https://chat.example/', 77), 5000);
		await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalled());
		const popupWindow = (await windowsCreate.mock.results[0].value).id;
		const requestId = lastPopupRequestId();

		const approval = {
			prompt: true,
			requestId,
			response: { error: false, permission: { always: true, accept: true, reject: false, duration: new Date() } }
		};
		// web page (content-script sender) and a different extension popup window both try to answer
		await send(approval, tabSender('https://chat.example/', 77), 50);
		await send(approval, popupSender(popupWindow + 1), 50);
		await send(approval, { ...popupSender(popupWindow), id: 'other-extension' }, 50);
		expect(windowsRemove).not.toHaveBeenCalled();

		// the popup opened for this request answers: only kind 7 is remembered
		await send(approval, popupSender(popupWindow), 50);
		const reply = await pending;
		expect(reply.id).toBe('c1');
		expect(verifySignature(reply.response)).toBe(true);
		expect(windowsRemove).toHaveBeenCalledWith(popupWindow);
		const saved = store.profiles[0].data.webSites['https://chat.example'].permissions;
		expect(Object.keys(saved)).toEqual(['signEvent:7']);
	});

	it('closing the popup rejects the request instead of leaving it hanging', async () => {
		const pending = send(signRequest('c2', 1), tabSender('https://other.example/'), 5000);
		await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalled());
		const popupWindow = (await windowsCreate.mock.results[0].value).id;
		closeWindow(popupWindow);
		const reply = await pending;
		expect(reply.id).toBe('c2');
		expect(reply.response.error.message).toBe('User rejected the request');
	});

	it('does not copy the previous profile private key into popup session data', async () => {
		send(signRequest('c3', 1), tabSender('https://keys.example/'), 50);
		await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalled());
		expect(JSON.stringify(store.sessionData)).not.toContain(sk);
	});
});
