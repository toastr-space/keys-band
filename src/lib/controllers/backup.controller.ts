import { get } from 'svelte/store';
import { getPublicKey } from 'nostr-tools';

import type { Authorization, Profile, Relay, WebSite } from '$lib/types';
import { browser, profiles } from '$lib/stores/data';
import { activeGrants, urlToOrigin } from '$lib/utility/permissions';
import { mutateProfiles, withoutKeys } from './profile.controller';
import { vaultController } from './vault.controller';

/** A full backup. Keys are only included inside the encrypted vault. */
export const createBackup = async () => ({
	version: 2,
	exportDate: new Date().toISOString(),
	profiles: withoutKeys(get(profiles)),
	vault: await vaultController.exportEncrypted(),
	vaultSettings: await vaultController.getSettings(),
	currentProfile: (await browser.get('currentProfile'))?.currentProfile,
	theme: (await browser.get('theme'))?.theme,
	duration: (await browser.get('duration'))?.duration
});

// Lock settings a backup may bring back. The weaker ones ("when the browser closes", "never")
// can only be chosen in Settings, where their warnings are shown.
const RESTORABLE_LOCK_MINUTES = [5, 15, 60, 240];

const HEX64 = /^[0-9a-f]{64}$/;
const CAPABILITY = /^(getPublicKey|getRelays|nip04\.encrypt|nip04\.decrypt|signEvent:\d{1,5}(:[!-~]{1,300})?)$/;

/** What a backup file would restore, checked and reduced to known fields. */
export interface RestorePlan {
	profiles: Profile[];
	// remembered permissions per account and site; restored only if the user asks for them
	permissions: Record<string, Record<string, WebSite>>;
	sitesWithPermissions: string[];
	// keys from version 1 backups, which stored them unencrypted
	legacyKeys: Record<string, string>;
	vault?: unknown;
	lockAfterMinutes?: number;
	ignoredLockSetting: boolean;
	currentProfile?: string;
	theme?: 'dark' | 'light';
}

const text = (value: unknown, max: number): string | undefined =>
	typeof value === 'string' ? value.slice(0, max) : undefined;

const sanitizeRelays = (relays: unknown): Relay[] =>
	(Array.isArray(relays) ? relays : [])
		.filter((r) => typeof r?.url === 'string' && /^wss?:\/\/[^\s]+$/.test(r.url))
		.map((r) => ({
			url: r.url,
			enabled: r.enabled !== false,
			created_at: r.created_at ?? new Date(),
			access: [0, 1, 2].includes(r.access) ? r.access : 2
		}));

/** Only well-formed, still active permissions for http(s) origins. */
const sanitizePermissions = (webSites: unknown): Record<string, WebSite> => {
	const result: Record<string, WebSite> = {};
	if (!webSites || typeof webSites !== 'object') return result;
	for (const [origin, site] of Object.entries(webSites as Record<string, any>)) {
		if (urlToOrigin(origin) !== origin || !site?.permissions || typeof site.permissions !== 'object') continue;
		const permissions: Record<string, Authorization> = {};
		for (const [capability, auth] of Object.entries(site.permissions as Record<string, any>)) {
			if (!CAPABILITY.test(capability) || typeof auth !== 'object' || !auth) continue;
			permissions[capability] = {
				always: auth.always === true,
				accept: auth.accept === true,
				reject: auth.reject === true,
				authorizationStop: text(auth.authorizationStop, 100)
			};
		}
		const active = activeGrants({ auth: false, permissions });
		if (active.length > 0)
			result[origin] = {
				auth: false,
				permissions: Object.fromEntries(active.map((g) => [g.capability, g.permission])),
				history: []
			};
	}
	return result;
};

const validVault = (vault: any): boolean =>
	vault?.version === 1 &&
	vault.kdf?.name === 'scrypt' &&
	[vault.salt, vault.iv, vault.ciphertext].every((v) => typeof v === 'string' && /^[0-9a-f]+$/.test(v));

/** Checks a parsed backup file; throws if it is not a usable Keys.Band backup. */
export const parseBackup = (data: any): RestorePlan => {
	if (!data || typeof data !== 'object' || !data.version || !Array.isArray(data.profiles))
		throw new Error('Invalid backup file format');
	if (data.vault !== undefined && !validVault(data.vault)) throw new Error('Invalid vault in backup');

	const plan: RestorePlan = {
		profiles: [],
		permissions: {},
		sitesWithPermissions: [],
		legacyKeys: {},
		vault: data.vault,
		ignoredLockSetting: false
	};
	const sites = new Set<string>();

	for (const raw of data.profiles) {
		const id = raw?.id;
		if (typeof id !== 'string' || !HEX64.test(id) || (raw.data?.pubkey ?? id) !== id)
			throw new Error('Backup contains an invalid account');
		if (plan.profiles.some((p) => p.id === id)) continue;

		const key = raw.data?.privateKey;
		if (!data.vault && key !== undefined) {
			if (typeof key !== 'string' || !HEX64.test(key) || getPublicKey(key) !== id)
				throw new Error('A key in the backup does not match its account');
			plan.legacyKeys[id] = key;
		}

		const name = text(raw.name, 100);
		plan.profiles.push({
			id,
			name: name && name.length >= 2 ? name : `Account ${id.slice(0, 8)}`,
			metadata: {
				name: text(raw.metadata?.name, 100),
				picture: text(raw.metadata?.picture, 2000),
				nip05: text(raw.metadata?.nip05, 200)
			},
			data: { pubkey: id, relays: sanitizeRelays(raw.data?.relays), webSites: {} }
		});

		const permissions = sanitizePermissions(raw.data?.webSites);
		plan.permissions[id] = permissions;
		Object.keys(permissions).forEach((origin) => sites.add(origin));
	}
	if (plan.profiles.length === 0) throw new Error('The backup contains no accounts');

	plan.sitesWithPermissions = [...sites].sort();
	if (plan.profiles.some((p) => p.id === data.currentProfile)) plan.currentProfile = data.currentProfile;
	if (data.theme === 'dark' || data.theme === 'light') plan.theme = data.theme;
	const minutes = data.vaultSettings?.lockAfterMinutes;
	if (RESTORABLE_LOCK_MINUTES.includes(minutes)) plan.lockAfterMinutes = minutes;
	else plan.ignoredLockSetting = minutes !== undefined;
	return plan;
};

/**
 * Restores a checked backup and returns the number of accounts restored. Requires an unlocked
 * vault, or a fresh install with nothing stored. Replacing existing keys with the backup's vault
 * also requires the current passphrase. Site permissions are only restored if asked for.
 */
export const applyRestore = async (
	plan: RestorePlan,
	options: { includePermissions?: boolean; currentPassphrase?: string } = {}
): Promise<number> => {
	const status = await vaultController.status();
	const stored = ((await browser.get('profiles'))?.profiles as Profile[]) || [];
	const freshInstall = status === 'uninitialized' && stored.length === 0;
	if (status !== 'unlocked' && !freshInstall) throw new Error('Unlock Keys.Band before restoring a backup');

	if (plan.vault) {
		if (status === 'unlocked' && !(await vaultController.verifyPassphrase(options.currentPassphrase ?? '')))
			throw new Error('Enter your current passphrase to replace your keys');
		await vaultController.importEncrypted(plan.vault as any);
	} else if (Object.keys(plan.legacyKeys).length > 0) {
		if (status !== 'unlocked') throw new Error('Set up Keys.Band first, then restore this older backup');
		for (const [id, key] of Object.entries(plan.legacyKeys)) await vaultController.addKey(id, key);
	}

	const restored = plan.profiles.map((profile) => ({
		...profile,
		data: {
			...profile.data,
			webSites: options.includePermissions ? plan.permissions[profile.id as string] ?? {} : {}
		}
	}));
	await mutateProfiles(() => restored);
	await browser.set({ currentProfile: plan.currentProfile ?? restored[0].id });
	if (plan.theme) await browser.set({ theme: plan.theme });
	if (plan.lockAfterMinutes) await vaultController.setSettings({ lockAfterMinutes: plan.lockAfterMinutes });
	return restored.length;
};
