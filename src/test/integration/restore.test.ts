// @vitest-environment node
// Restoring a backup: what may be restored, and when (security review 2, finding 2).
import { vi, describe, it, expect, beforeAll } from 'vitest';
import { generatePrivateKey, getPublicKey } from 'nostr-tools';

const h = vi.hoisted(() => ({ store: {} as Record<string, any>, session: {} as Record<string, any> }));

vi.mock('webextension-polyfill', () => {
	const area = (data: Record<string, any>) => ({
		get: async (k: string | null) =>
			k === null ? structuredClone(data) : k in data ? { [k]: structuredClone(data[k]) } : {},
		set: async (o: any) => void Object.assign(data, structuredClone(o)),
		remove: async (keys: string | string[]) => [keys].flat().forEach((k) => delete data[k])
	});
	return { default: { storage: { local: area(h.store), session: area(h.session) } } };
});
vi.mock('$lib/utility/nostr-utils', async (orig) => ({
	...(await orig<any>()),
	getRelays: async () => null,
	getMetadata: async () => ({}),
	prepareRelayPool: async () => {}
}));

import { vaultController as vault } from '$lib/controllers/vault.controller';
import { loadProfiles } from '$lib/controllers/profile.controller';
import { applyRestore, createBackup, parseBackup } from '$lib/controllers/backup.controller';

const PASS = 'correct horse battery staple';
const sk = generatePrivateKey();
const pk = getPublicKey(sk);
const ALWAYS = { always: true, accept: true, reject: false, authorizationStop: new Date().toString() };
const EXPIRED = { always: false, accept: true, reject: false, authorizationStop: new Date(0).toString() };

const legacyBackup = (webSites: Record<string, any>, privateKey?: string) => ({
	version: 1,
	currentProfile: pk,
	profiles: [{ name: 'me', id: pk, data: { pubkey: pk, privateKey, relays: [], webSites } }]
});
const planted = { 'https://planted.example': { auth: false, permissions: { 'signEvent:5': ALWAYS }, history: [] } };
const stored = () => h.store.profiles[0];

beforeAll(async () => {
	h.store.profiles = [{ name: 'me', id: pk, data: { pubkey: pk, relays: [], webSites: {} } }];
	h.store.currentProfile = pk;
	await vault.setup(PASS, null, { [pk]: sk });
}, 20_000);

describe('restoring a backup', () => {
	it('is refused while Keys.Band is locked', async () => {
		await vault.lock();
		await expect(applyRestore(parseBackup(legacyBackup(planted)), { includePermissions: true })).rejects.toThrow(
			'Unlock Keys.Band before restoring a backup'
		);
		expect(stored().data.webSites).toEqual({});
		await vault.unlockWithPassphrase(PASS);
	}, 20_000);

	it('does not restore site permissions unless asked to', async () => {
		const plan = parseBackup(legacyBackup(planted));
		expect(plan.sitesWithPermissions).toEqual(['https://planted.example']);
		await applyRestore(plan);
		expect(stored().data.webSites).toEqual({});
	});

	it('restores only valid, still active permissions when asked to', async () => {
		const plan = parseBackup(
			legacyBackup({
				'https://ok.example': { permissions: { 'signEvent:1': ALWAYS, 'signEvent:1; x': ALWAYS } },
				'https://expired.example': { permissions: { 'signEvent:1': EXPIRED } },
				'evil.example': { permissions: { 'signEvent:1': ALWAYS } }
			})
		);
		await applyRestore(plan, { includePermissions: true });
		expect(Object.keys(stored().data.webSites)).toEqual(['https://ok.example']);
		expect(Object.keys(stored().data.webSites['https://ok.example'].permissions)).toEqual(['signEvent:1']);
	});

	it('rejects a key that does not belong to its account, and other malformed backups', () => {
		expect(() => parseBackup(legacyBackup({}, generatePrivateKey()))).toThrow('does not match its account');
		expect(() => parseBackup({ version: 1, profiles: [{ id: 'not-a-key' }] })).toThrow('invalid account');
		expect(() => parseBackup({ version: 2, profiles: [], vault: { version: 1 } })).toThrow('Invalid vault');
	});

	it('restores only the standard idle lock settings', () => {
		const weak = parseBackup({ ...legacyBackup({}), vaultSettings: { lockAfterMinutes: -1 } });
		expect(weak.lockAfterMinutes).toBeUndefined();
		expect(weak.ignoredLockSetting).toBe(true);
		expect(parseBackup({ ...legacyBackup({}), vaultSettings: { lockAfterMinutes: 60 } }).lockAfterMinutes).toBe(60);
	});

	it('replacing the keys needs the current passphrase', async () => {
		await loadProfiles();
		const backup = JSON.parse(JSON.stringify(await createBackup()));
		const plan = parseBackup(backup);
		await expect(applyRestore(plan, { currentPassphrase: 'wrong passphrase!' })).rejects.toThrow(
			'current passphrase'
		);
		await applyRestore(plan, { currentPassphrase: PASS });
		expect(await vault.status()).toBe('locked');
		await vault.unlockWithPassphrase(PASS);
		expect(await vault.getKeys()).toEqual({ [pk]: sk });
	}, 20_000);

	it('a fresh install can restore an encrypted backup without setting up first', async () => {
		await loadProfiles();
		const backup = JSON.parse(JSON.stringify(await createBackup()));
		for (const key of Object.keys(h.store)) delete h.store[key];
		for (const key of Object.keys(h.session)) delete h.session[key];
		expect(await vault.status()).toBe('uninitialized');

		await applyRestore(parseBackup(backup));
		await vault.unlockWithPassphrase(PASS);
		expect(await vault.getKeys()).toEqual({ [pk]: sk });
		expect(stored().id).toBe(pk);
	}, 20_000);
});
