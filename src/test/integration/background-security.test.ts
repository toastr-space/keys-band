// @vitest-environment node
// Drives the real background.ts message handler through the attacks fixed in the security reviews.
import { vi, describe, it, expect, beforeAll } from 'vitest';
import { generatePrivateKey, getPublicKey, verifySignature } from 'nostr-tools';

const EXT_ID = 'keys-band-test';
const POPUP_URL = `chrome-extension://${EXT_ID}/popup.html`;
const PASS = 'correct horse battery staple';
const PIN = '482916';

const sk = generatePrivateKey();
const pk = getPublicKey(sk);

// Shared by every module instance (including the "popup" copy loaded after vi.resetModules), like
// the storage and windows of a real browser
const h = vi.hoisted(() => {
	const state = {
		store: {} as Record<string, any>,
		session: {} as Record<string, any>,
		storageListeners: new Set<any>(),
		windowRemovedListeners: new Set<any>(),
		windows: [] as { id: number; url: string }[],
		nextWindowId: 100,
		metadataDelay: 0,
		onMessage: null as any
	};
	const closeWindow = (id: number) => {
		const index = state.windows.findIndex((w) => w.id === id);
		if (index === -1) return;
		state.windows.splice(index, 1);
		state.windowRemovedListeners.forEach((fn) => fn(id));
	};
	const windowsCreate = vi.fn(async (opts: { url: string }) => {
		const win = { id: state.nextWindowId++, url: opts.url };
		state.windows.push(win);
		return { id: win.id };
	});
	return { state, closeWindow, windowsCreate };
});
const { state, closeWindow, windowsCreate } = h;

vi.mock('webextension-polyfill', () => {
	const ev = () => ({ addListener: vi.fn() });
	const area = (data: Record<string, any>, name: string) => ({
		get: async (k: string | null) =>
			k === null ? structuredClone(data) : k in data ? { [k]: structuredClone(data[k]) } : {},
		set: async (o: any) => {
			Object.assign(data, structuredClone(o));
			h.state.storageListeners.forEach((fn) => fn(o, name));
		},
		remove: async (keys: string | string[]) => {
			for (const k of [keys].flat()) delete data[k];
		}
	});
	return {
		default: {
			runtime: {
				id: 'keys-band-test',
				onInstalled: ev(),
				onStartup: ev(),
				onMessage: { addListener: (fn: any) => (h.state.onMessage = fn) },
				getURL: (p: string) => `chrome-extension://keys-band-test/${p}`
			},
			tabs: {
				query: async () => [{ id: 1, url: 'https://x.example' }],
				get: async () => ({ id: 1, url: 'https://x.example' }),
				onActivated: ev(),
				onUpdated: ev()
			},
			windows: {
				create: (opts: any) => h.windowsCreate(opts),
				remove: async (id: number) => h.closeWindow(id),
				getAll: async () => h.state.windows.map(({ id }) => ({ id, type: 'popup' })),
				onRemoved: {
					addListener: (fn: any) => h.state.windowRemovedListeners.add(fn),
					removeListener: (fn: any) => h.state.windowRemovedListeners.delete(fn)
				}
			},
			storage: {
				local: area(h.state.store, 'local'),
				session: area(h.state.session, 'session'),
				onChanged: {
					addListener: (fn: any) => h.state.storageListeners.add(fn),
					removeListener: (fn: any) => h.state.storageListeners.delete(fn)
				}
			}
		}
	};
});
// relays answer profile lookups after a configurable delay, and never actually connect
vi.mock('$lib/utility/nostr-utils', async (orig) => ({
	...(await orig<any>()),
	getRelays: async () => null,
	getMetadata: async () => {
		await new Promise((r) => setTimeout(r, h.state.metadataDelay));
		return { name: 'me from relays' };
	},
	prepareRelayPool: async () => {}
}));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tabSender = (url: string, windowId = 1) => ({ id: EXT_ID, url, tab: { id: windowId, windowId } });
const popupSender = (windowId: number) => ({
	id: EXT_ID,
	url: `${POPUP_URL}?request=abc`,
	tab: { id: windowId, windowId }
});

/** Sends a message to the background; resolves with its reply, or 'pending' if none within `ms`. */
const send = (msg: any, sender: any, ms = 3000) =>
	new Promise<any>((res) => {
		const timer = setTimeout(() => res('pending'), ms);
		state.onMessage(msg, sender, (reply: any) => {
			clearTimeout(timer);
			res(reply);
		});
	});

const signRequest = (id: string, kind: number, tags: string[][] = []) => ({
	id,
	ext: 'keys.band',
	type: 'signEvent',
	params: { event: { kind, content: 'hello', tags, created_at: 1 } }
});

const ALWAYS = { always: true, accept: true, reject: false, authorizationStop: new Date().toString() };
const ALWAYS_REJECT = { always: true, accept: false, reject: true, authorizationStop: new Date().toString() };
const site = (permissions: Record<string, any>) => ({ auth: false, permissions, history: [] });
const webSites = () => state.store.profiles[0].data.webSites;
const grant = (origin: string, permissions: Record<string, any>) => (webSites()[origin] = site(permissions));

const approvalWindows = () => state.windows.filter((w) => w.url.includes('popup.html?request='));

/** The open approval window for `origin`, with the request id the background gave it. */
const approvalFor = async (origin: string) => {
	let found: { windowId: number; requestId: string } | undefined;
	await vi.waitFor(() => {
		const win = approvalWindows().find(
			(w) => state.session[`pending:${new URL(w.url).searchParams.get('request')}`]?.url === origin
		);
		expect(win).toBeDefined();
		found = { windowId: win!.id, requestId: new URL(win!.url).searchParams.get('request')! };
	});
	return found!;
};

/** What the approval popup sends when the user answers ("Always" when always is true). */
const answer = (windowId: number, requestId: string, accept: boolean, always = false) =>
	send(
		{
			prompt: true,
			requestId,
			response: {
				status: accept ? 'success' : 'error',
				error: !accept,
				permission: { always, duration: new Date(), accept, reject: !accept }
			}
		},
		popupSender(windowId),
		100
	);

const closeAll = () => [...state.windows].forEach((w) => closeWindow(w.id));

let vault: typeof import('$lib/controllers/vault.controller').vaultController;
let profileController: typeof import('$lib/controllers/profile.controller');

beforeAll(async () => {
	// profile saved by an earlier version: plaintext key in storage.local, no vault yet
	state.store.profiles = [
		{
			name: 'me',
			id: pk,
			data: {
				pubkey: pk,
				privateKey: sk,
				relays: [],
				webSites: {
					'https://notes.example': {
						...site({ getPublicKey: ALWAYS, 'signEvent:1': ALWAYS }),
						history: [{ type: 'getPublicKey', accepted: true, created_at: new Date().toString() }]
					},
					// data saved by the first version: one domain-wide permission
					'legacy.example': { auth: false, permission: ALWAYS, history: [] },
					'https://legacy.example': { auth: false, permission: ALWAYS, history: [] }
				}
			}
		}
	];
	state.store.currentProfile = pk;
	// approval data an earlier version left on disk
	state.store.sessionData = { abc: { data: { content: 'old draft' } } };
	await import('../../background');
	vault = (await import('$lib/controllers/vault.controller')).vaultController;
	profileController = await import('$lib/controllers/profile.controller');
});

describe('encrypted key storage (review 1, finding 1)', () => {
	it('never signs with a plaintext key from before the vault existed, and continues after setup', async () => {
		const pending = send(signRequest('v1', 1), tabSender('https://notes.example/'), 10_000);
		await vi.waitFor(() => expect(state.windows.some((w) => w.url.includes('unlock=1'))).toBe(true));
		expect(await Promise.race([pending, sleep(300).then(() => 'pending')])).toBe('pending');

		// what the setup screen does: keys into the vault first, then profiles stored without them
		await vault.setup(PASS, PIN, { [pk]: sk });
		await profileController.migrateStoredProfiles();

		const reply = await pending;
		expect(verifySignature(reply.response)).toBe(true);
		closeAll();
	}, 20_000);

	it('keeps the private key and old approval data out of storage.local', () => {
		expect(state.store.vault).toBeDefined();
		expect(JSON.stringify(state.store)).not.toContain(sk);
		expect(state.store.sessionData).toBeUndefined();
	});

	it('waits for the PIN while locked and continues after unlock', async () => {
		await vault.lock();
		const pending = send(signRequest('v2', 1), tabSender('https://notes.example/'), 10_000);
		await vi.waitFor(() => expect(state.windows.some((w) => w.url.includes('unlock=1'))).toBe(true));
		await vault.unlockWithPin(PIN);
		expect(verifySignature((await pending).response)).toBe(true);
		closeAll();
	}, 20_000);

	it('rejects the request when the unlock popup is closed while still locked', async () => {
		await vault.lock();
		const pending = send(signRequest('v3', 1), tabSender('https://notes.example/'), 10_000);
		await vi.waitFor(() => expect(state.windows.some((w) => w.url.includes('unlock=1'))).toBe(true));
		closeAll();
		expect((await pending).response.error.message).toBe('User rejected the request');
		await vault.unlockWithPin(PIN);
	}, 20_000);
});

describe('per-capability permissions (review 1, finding 2)', () => {
	it('signs the granted kind without a prompt', async () => {
		windowsCreate.mockClear();
		const reply = await send(signRequest('a1', 1), tabSender('https://notes.example/feed'));
		expect(reply.id).toBe('a1');
		expect(verifySignature(reply.response)).toBe(true);
		expect(windowsCreate).not.toHaveBeenCalled();
	});

	it('does not extend a kind-1 / getPublicKey grant to deletions, profile edits or DM decryption', async () => {
		const replies = [
			signRequest('a2', 5),
			signRequest('a3', 0),
			{ id: 'a4', ext: 'keys.band', type: 'nip04.decrypt', params: { peer: pk, ciphertext: 'x?iv=y' } }
		].map((request) => send(request, tabSender('https://notes.example/'), 10_000));

		for (let i = 0; i < 3; i++) {
			const { windowId } = await approvalFor('https://notes.example');
			closeWindow(windowId);
		}
		for (const reply of await Promise.all(replies)) expect(reply.response.error).toBeDefined();
	}, 20_000);

	it('ignores the old domain-wide permission format', async () => {
		const pending = send(signRequest('a5', 1), tabSender('https://legacy.example/'), 10_000);
		closeWindow((await approvalFor('https://legacy.example')).windowId);
		expect((await pending).response.error).toBeDefined();
	});

	it('rejects malformed and unknown requests without opening a popup', async () => {
		windowsCreate.mockClear();
		const bad = await send({ ...signRequest('a6', 1), params: { event: { kind: 'x' } } }, tabSender('https://notes.example/'));
		const unknown = await send({ id: 'a7', ext: 'keys.band', type: 'replaceURL', params: {} }, tabSender('https://notes.example/'));
		expect(bad.response.error).toBeDefined();
		expect(unknown.response.error).toBeDefined();
		expect(windowsCreate).not.toHaveBeenCalled();
	});
});

describe('origin keying (review 1, finding 3)', () => {
	it('an https grant does not apply to http on the same host', async () => {
		const pending = send(signRequest('b1', 1), tabSender('http://notes.example/'), 10_000);
		closeWindow((await approvalFor('http://notes.example')).windowId);
		expect((await pending).response.error).toBeDefined();
	});

	it('takes the origin from the browser sender, not from the message', async () => {
		const forged = { ...signRequest('b2', 1), url: 'https://notes.example' };
		const pending = send(forged, tabSender('https://evil.example/'), 10_000);
		closeWindow((await approvalFor('https://evil.example')).windowId);
		expect((await pending).response.error).toBeDefined();
	});

	it('rejects non-http(s) pages', async () => {
		const reply = await send(signRequest('b3', 1), tabSender('file:///home/me/page.html'));
		expect(reply.response.error).toBeDefined();
	});
});

describe('approval channel (review 1, finding 4)', () => {
	it('ignores a forged approval from a web page or another window and accepts the real popup', async () => {
		const pending = send(signRequest('c1', 7), tabSender('https://chat.example/', 77), 10_000);
		const { windowId, requestId } = await approvalFor('https://chat.example');

		const forged = {
			prompt: true,
			requestId,
			response: { error: false, permission: { always: true, accept: true, reject: false, duration: new Date() } }
		};
		await send(forged, tabSender('https://chat.example/', 77), 50);
		await send(forged, popupSender(windowId + 1), 50);
		await send(forged, { ...popupSender(windowId), id: 'other-extension' }, 50);
		expect(state.windows.some((w) => w.id === windowId)).toBe(true);

		await answer(windowId, requestId, true, true);
		const reply = await pending;
		expect(reply.id).toBe('c1');
		expect(verifySignature(reply.response)).toBe(true);
		expect(state.windows.some((w) => w.id === windowId)).toBe(false);
		expect(Object.keys(webSites()['https://chat.example'].permissions)).toEqual(['signEvent:7']);
	});

	it('closing the popup rejects the request instead of leaving it hanging', async () => {
		const pending = send(signRequest('c2', 1), tabSender('https://other.example/'), 10_000);
		closeWindow((await approvalFor('https://other.example')).windowId);
		const reply = await pending;
		expect(reply.id).toBe('c2');
		expect(reply.response.error.message).toBe('User rejected the request');
	});
});

describe('review 2', () => {
	it('1: a revoked grant stays revoked while the site keeps sending requests', async () => {
		grant('https://spammy.example', { 'signEvent:1': ALWAYS });
		state.metadataDelay = 300;

		// the popup is a separate context: separate module instances, same storage and Web Lock
		vi.resetModules();
		const popup = await import('$lib/controllers/profile.controller');
		await popup.loadProfiles();
		popup.refreshProfiles(); // relay lookup in flight while the user revokes

		let signed = 0;
		let revoked = false;
		for (let i = 0; i < 20; i++) {
			if (i === 5) {
				await popup.updateProfile(pk, (profile) => {
					profile.data!.webSites!['https://spammy.example'].permissions = {};
				});
				revoked = true;
			}
			// after the revoke each request waits for a prompt, or is refused once 5 are queued
			const reply = await send(signRequest(`r${i}`, 1), tabSender('https://spammy.example/'), revoked ? 150 : 3000);
			if (reply !== 'pending' && reply.response?.sig && verifySignature(reply.response)) signed++;
		}
		await sleep(600); // let the relay lookup finish and save
		closeAll();
		await sleep(50);

		expect(signed).toBe(5);
		expect(webSites()['https://spammy.example'].permissions['signEvent:1']).toBeUndefined();
		expect(state.store.profiles[0].metadata.name).toBe('me from relays');
		state.metadataDelay = 0;
	}, 30_000);

	it('6: shows one approval window at a time and limits how many requests a site can queue', async () => {
		windowsCreate.mockClear();
		const replies = [2, 3, 4, 5, 6, 7, 8, 9].map((kind) =>
			send(signRequest(`f${kind}`, kind), tabSender('https://flood.example/'), 10_000)
		);
		await approvalFor('https://flood.example');
		await sleep(300);
		expect(approvalWindows()).toHaveLength(1);

		for (let i = 0; i < 5; i++) closeWindow((await approvalFor('https://flood.example')).windowId);
		const messages = (await Promise.all(replies)).map((r) => r.response.error.message);
		expect(messages.filter((m) => m === 'Too many pending requests')).toHaveLength(3);
		expect(messages.filter((m) => m === 'User rejected the request')).toHaveLength(5);
		expect(windowsCreate).toHaveBeenCalledTimes(5);
	}, 20_000);

	it('6: a repeated request is answered by the first answer instead of hanging', async () => {
		windowsCreate.mockClear();
		const first = send(signRequest('d1', 1), tabSender('https://dup.example/'), 10_000);
		const { windowId, requestId } = await approvalFor('https://dup.example');
		const second = send(signRequest('d2', 1), tabSender('https://dup.example/'), 10_000);
		await sleep(100);
		await answer(windowId, requestId, true, true); // "Always"
		expect(verifySignature((await first).response)).toBe(true);
		expect(verifySignature((await second).response)).toBe(true);
		expect(windowsCreate).toHaveBeenCalledTimes(1);

		const third = send(signRequest('d3', 3), tabSender('https://dup.example/'), 10_000);
		const prompt = await approvalFor('https://dup.example');
		const fourth = send(signRequest('d4', 3), tabSender('https://dup.example/'), 10_000);
		await sleep(100);
		await answer(prompt.windowId, prompt.requestId, false); // a one-time "Reject"
		expect((await third).response.error).toBeDefined();
		expect((await fourth).response.error).toBeDefined();
		expect(windowsCreate).toHaveBeenCalledTimes(2);
	}, 20_000);

	it('7: what a site asks to encrypt is kept in memory only, and removed once answered', async () => {
		const pending = send(
			{ id: 'm1', ext: 'keys.band', type: 'nip04.encrypt', params: { peer: pk, plaintext: 'meet me at 9pm' } },
			tabSender('https://chat2.example/'),
			10_000
		);
		const { windowId, requestId } = await approvalFor('https://chat2.example');
		expect(JSON.stringify(state.session[`pending:${requestId}`])).toContain('meet me at 9pm');
		expect(JSON.stringify(state.store)).not.toContain('meet me at 9pm');
		closeWindow(windowId);
		await pending;
		expect(state.session[`pending:${requestId}`]).toBeUndefined();
	});

	it('8: a remembered rejection cannot grow the stored history without limit', async () => {
		const { MAX_HISTORY } = await import('$lib/controllers/background.controller');
		grant('https://reject-spam.example', { 'signEvent:1': ALWAYS_REJECT });
		for (let i = 0; i < MAX_HISTORY + 30; i++) {
			const reply = await send(signRequest(`h${i}`, 1), tabSender('https://reject-spam.example/'));
			expect(reply.response.error).toBeDefined();
		}
		expect(webSites()['https://reject-spam.example'].history).toHaveLength(MAX_HISTORY);
	}, 60_000);

	it('5: an "Always" relay login covers only that relay', async () => {
		const auth = (id: string, relay: string) =>
			signRequest(id, 22242, [
				['relay', relay],
				['challenge', 'abc']
			]);
		grant('https://client.example', { 'signEvent:22242:wss://relay-a.example': ALWAYS });

		const allowed = await send(auth('l1', 'wss://relay-a.example/'), tabSender('https://client.example/'));
		expect(verifySignature(allowed.response)).toBe(true);

		const other = send(auth('l2', 'wss://relay-b.example'), tabSender('https://client.example/'), 10_000);
		const { windowId, requestId } = await approvalFor('https://client.example');
		expect(state.session[`pending:${requestId}`].data.tags[0]).toEqual(['relay', 'wss://relay-b.example']);
		closeWindow(windowId);
		expect((await other).response.error).toBeDefined();

		const missing = await send(signRequest('l3', 22242), tabSender('https://client.example/'));
		expect(missing.response.error).toBeDefined();
	}, 20_000);
});
