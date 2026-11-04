import { ProfileDeleteMethod } from '$lib/types/profile.d';
import { get, type Writable } from 'svelte/store';
import { NostrUtil } from '$lib/utility';
import { getPublicKey } from 'nostr-tools';
import type { Duration, Profile, ProfileController, Relay } from '$lib/types/profile.d';
import { duration, profiles, userProfile, theme, browser } from '$lib/stores/data';
import { vaultController } from './vault.controller';

// Constants
const DEFAULT_DURATION: Duration = {
	name: 'One time',
	value: 0
};

const DEFAULT_THEME = 'dark';
const MIN_PROFILE_NAME_LENGTH = 2;

// Helper functions
const handleError = (operation: string, error: unknown): never => {
	const message = error instanceof Error ? error.message : 'Unknown error';
	console.error(`${operation} failed:`, message);
	throw new Error(`${operation}: ${message}`);
};

const updateStoreAndStorage = async <T>(
	store: { set: (value: T) => void },
	storageKey: string,
	value: T
): Promise<void> => {
	try {
		await browser.set({ [storageKey]: value });
		store.set(value);
	} catch (error) {
		handleError(`Update ${storageKey}`, error);
	}
};

// GENERAL SETTINGS
const loadDuration = async (): Promise<void> => {
	try {
		const value = await browser.get('duration');
		const storedDuration = value?.duration as Duration;

		if (storedDuration) {
			duration.set(storedDuration);
		} else {
			await updateStoreAndStorage(duration, 'duration', DEFAULT_DURATION);
		}
	} catch (error) {
		handleError('Load duration', error);
	}
};

const updateDuration = async (newDuration: Duration): Promise<void> => {
	await updateStoreAndStorage(duration, 'duration', newDuration);
};

const loadTheme = async (): Promise<void> => {
	try {
		const value = await browser.get('theme');
		const storedTheme = value?.theme as string;

		if (!storedTheme) {
			await updateStoreAndStorage(theme, 'theme', DEFAULT_THEME);
			return;
		}

		theme.set(storedTheme);

		if (storedTheme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	} catch (error) {
		handleError('Load theme', error);
	}
};

const switchTheme = async (themeName: string): Promise<void> => {
	try {
		await updateStoreAndStorage(theme, 'theme', themeName);

		if (themeName === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	} catch (error) {
		handleError('Switch theme', error);
	}
};

// PROFILE STORAGE
//
// Profiles are written by the background and by every extension page. Each change re-reads the
// stored list and saves it under a Web Lock that all of them share, so no context can overwrite
// another's change (a revoked permission, say) with an older copy.

const PROFILES_LOCK = 'keys.band-profiles';
let localLock: Promise<unknown> = Promise.resolve();

const withProfilesLock = <T>(fn: () => Promise<T>): Promise<T> => {
	if (typeof navigator !== 'undefined' && navigator.locks)
		return navigator.locks.request(PROFILES_LOCK, fn) as Promise<T>;
	// without Web Locks there is only this context to coordinate
	const run = localLock.then(fn, fn);
	localLock = run.catch(() => {});
	return run;
};

// Private keys live only in the encrypted vault, never in the stored profiles
const withoutKeys = (list: Profile[]): Profile[] =>
	list.map((profile) => {
		if (!profile.data) return profile;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { privateKey, ...data } = profile.data;
		return { ...profile, data };
	});

const readStoredProfiles = async (): Promise<Profile[]> =>
	((await browser.get('profiles'))?.profiles as Profile[]) || [];

/** Puts saved profiles into this context's stores, keeping the keys it has already loaded. */
const syncStores = (saved: Profile[]) => {
	const keys = new Map(get(profiles).map((p) => [p.id, p.data?.privateKey]));
	const merged = saved.map((p) =>
		p.data && keys.get(p.id) ? { ...p, data: { ...p.data, privateKey: keys.get(p.id) } } : p
	);
	profiles.set(merged);
	const currentId = get(userProfile)?.id;
	if (currentId) userProfile.set(merged.find((p) => p.id === currentId) ?? ({} as Profile));
};

/** Applies `change` to the stored profiles and saves the result. */
const mutateProfiles = (change: (stored: Profile[]) => Profile[] | void): Promise<Profile[]> =>
	withProfilesLock(async () => {
		const stored = await readStoredProfiles();
		const saved = withoutKeys(change(stored) ?? stored);
		await browser.set({ profiles: saved });
		syncStores(saved);
		return saved;
	});

/** Applies `change` to one stored profile; does nothing if it no longer exists. */
const updateProfile = (id: string, change: (profile: Profile) => void): Promise<Profile[]> =>
	mutateProfiles((stored) => {
		const profile = stored.find((p) => p.id === id);
		if (profile) change(profile);
	});

/** Fills in ids that very old versions did not store; run while their keys are still stored. */
const migrateStoredProfiles = (): Promise<Profile[]> =>
	mutateProfiles((stored) => {
		for (const profile of stored) {
			if (profile.data?.privateKey && (!profile.id || !profile.data.pubkey)) {
				profile.data.pubkey = getPublicKey(profile.data.privateKey);
				profile.id = profile.data.pubkey;
			}
		}
	});

// PROFILE MANAGEMENT
const validateProfile = (profile: Profile): void => {
	if (!profile.id || !profile.data?.pubkey) {
		throw new Error('Invalid profile: missing required fields');
	}
	if (!profile.name || profile.name.length < MIN_PROFILE_NAME_LENGTH) {
		throw new Error(`Profile name must be at least ${MIN_PROFILE_NAME_LENGTH} characters`);
	}
};

const generateProfileId = (privateKey: string): string => {
	try {
		return getPublicKey(privateKey);
	} catch (error) {
		throw new Error('Failed to generate profile ID from private key');
	}
};

const isExistingProfile = async (name: string, privateKey: string): Promise<boolean> => {
	try {
		const existingProfiles = get(profiles);
		const profileId = generateProfileId(privateKey);

		return existingProfiles.some((profile) => profile.name === name || profile.id === profileId);
	} catch (error) {
		console.error('Error checking existing profile:', error);
		return false;
	}
};

const createProfile = async (
	name: string,
	key: string,
	metadata?: any,
	relays?: Relay[]
): Promise<boolean | undefined> => {
	try {
		if (name.length < MIN_PROFILE_NAME_LENGTH) {
			throw new Error(`Name must be at least ${MIN_PROFILE_NAME_LENGTH} characters`);
		}

		const privateKey = (await NostrUtil.checkNSEC(key)) as string;

		if (await isExistingProfile(name, privateKey)) {
			throw new Error('Name or key already exists');
		}

		const profile: Profile = {
			name,
			id: generateProfileId(privateKey),
			metadata: metadata || {},
			data: {
				pubkey: generateProfileId(privateKey),
				webSites: {},
				relays: relays || []
			}
		};

		validateProfile(profile);
		await vaultController.addKey(profile.id as string, privateKey);
		await mutateProfiles((stored) => {
			if (stored.some((p) => p.id === profile.id || p.name === profile.name))
				throw new Error('Name or key already exists');
			stored.push(profile);
		});
		// load the new key into this context
		await loadProfiles();

		return true;
	} catch (error) {
		handleError('Create profile', error);
	}
};

/** Makes `profile` the active account. */
const loadProfile = async (profile: Profile): Promise<boolean | Profile | undefined> => {
	try {
		if (profile.data !== undefined) {
			await browser.set({ currentProfile: profile.id });
			userProfile.set(profile);
			refreshFromRelays(profile.id as string);
			return profile;
		}
	} catch (err) {
		console.error(JSON.stringify(err));
		return false;
	}
};

/**
 * Fetches a profile's metadata and relay list from relays and saves just those fields. Only the
 * popup calls this; the background never contacts relays for profile data.
 */
const refreshFromRelays = async (id: string): Promise<void> => {
	const pubkey = get(profiles).find((p) => p.id === id)?.data?.pubkey;
	if (!pubkey) return;
	try {
		const [metaData, relayEvent] = await Promise.all([
			NostrUtil.getMetadata(pubkey),
			NostrUtil.getRelays(pubkey, true).catch(() => null)
		]);
		const networkRelays: Relay[] = (relayEvent?.tags || []).map((relay) => ({
			url: relay[1],
			enabled: true,
			created_at: new Date(),
			access: relay.length > 2 ? (relay[2] === 'read' ? 0 : relay[2] === 'write' ? 1 : 2) : 2
		}));
		await updateProfile(id, (profile) => {
			if (metaData && Object.keys(metaData).length > 0) profile.metadata = metaData;
			if (profile.data && networkRelays.length > 0) {
				// Merge network relays with existing local relays, avoiding duplicates
				const existingRelays = profile.data.relays || [];
				const existingUrls = new Set(existingRelays.map((r) => r.url));
				profile.data.relays = [
					...existingRelays,
					...networkRelays.filter((relay) => !existingUrls.has(relay.url))
				];
			}
		});
	} catch (error) {
		console.error('Refreshing profile from relays failed:', error);
	}
};

const refreshProfiles = () => {
	for (const profile of get(profiles)) if (profile.id) refreshFromRelays(profile.id);
};

/** Reads the profiles into this context's stores, with keys while the vault is unlocked. */
const loadProfiles = async (): Promise<Writable<Profile[]>> => {
	const stored = await readStoredProfiles();
	const data = await browser.get('currentProfile');
	// Keys exist in memory only while the vault is unlocked. Profiles saved before the vault
	// existed still carry their key until setup moves it into the vault.
	const vaultStatus = await vaultController.status();
	const keys = vaultStatus === 'unlocked' ? await vaultController.getKeys() : null;

	for (const profile of stored) {
		if (
			profile.data !== undefined &&
			(profile.data?.pubkey === undefined || profile.id === undefined) &&
			profile.data.privateKey
		) {
			profile.data.pubkey = getPublicKey(profile.data.privateKey);
			profile.id = profile.data.pubkey;
		}
		if (profile.data && vaultStatus !== 'uninitialized')
			profile.data.privateKey = keys?.[profile.id as string];
	}

	profiles.set(stored);
	userProfile.set(stored.find((p) => p.id === data?.currentProfile) ?? ({} as Profile));
	return profiles;
};

const deleteProfile = async (profile: Profile, method?: ProfileDeleteMethod): Promise<void> => {
	try {
		const wasCurrent = get(userProfile).id === profile.id;
		await mutateProfiles((stored) => stored.filter((p) => p.id !== profile.id));
		await vaultController.removeKey(profile.id as string);

		// If deleted profile was current, clear it
		if (wasCurrent) {
			userProfile.set({} as Profile);
			await browser.set({ currentProfile: null });
		}

		console.log(`Profile deleted: ${profile.name} (method: ${method})`);
	} catch (error) {
		handleError('Delete profile', error);
	}
};

// RELAY MANAGEMENT

/**
 * Sanitizes a relay URL:
 * - Adds wss:// prefix if missing
 * - Removes trailing slash
 * - Trims whitespace
 */
const sanitizeRelayUrl = (url: string): string => {
	let sanitized = url.trim();

	// Remove trailing slash(es)
	sanitized = sanitized.replace(/\/+$/, '');

	// Add wss:// prefix if no protocol specified
	if (!sanitized.startsWith('wss://') && !sanitized.startsWith('ws://')) {
		sanitized = 'wss://' + sanitized;
	}

	return sanitized;
};

const addRelayToProfile = async (relayUrl: string): Promise<void> => {
	try {
		if (!relayUrl || typeof relayUrl !== 'string') {
			throw new Error('Invalid relay URL');
		}
		const id = get(userProfile).id;
		if (!id) throw new Error('No account selected');

		const relay: Relay = {
			url: sanitizeRelayUrl(relayUrl),
			enabled: true,
			created_at: new Date()
		};

		await updateProfile(id, (profile) => {
			if (!profile.data) profile.data = {};
			profile.data.relays = [
				...(profile.data.relays || []).filter((r) => r.url !== relay.url),
				relay
			];
		});
		NostrUtil.pushRelays(get(userProfile));

		console.log(`Relay added: ${relayUrl}`);
	} catch (error) {
		handleError('Add relay to profile', error);
	}
};

const removeRelayFromProfile = async (relay: Relay): Promise<void> => {
	try {
		const id = get(userProfile).id;
		if (!id) throw new Error('No account selected');

		await updateProfile(id, (profile) => {
			if (profile.data?.relays) {
				profile.data.relays = profile.data.relays.filter((r) => r.url !== relay.url);
			}
		});
		NostrUtil.pushRelays(get(userProfile));

		console.log(`Relay removed: ${relay.url}`);
	} catch (error) {
		handleError('Remove relay from profile', error);
	}
};

// Export controller object
export const profileController: ProfileController = {
	// Settings
	loadDuration,
	updateDuration,
	loadTheme,
	switchTheme,

	// Profile management
	createProfile,
	loadProfile,
	loadProfiles,
	refreshProfiles,
	mutateProfiles,
	updateProfile,
	migrateStoredProfiles,
	deleteProfile,
	isExistingProfile,

	// Relay management
	addRelayToProfile,
	removeRelayFromProfile
};

// Export individual functions for tree-shaking
export {
	// Settings
	loadDuration,
	updateDuration,
	loadTheme,
	switchTheme,

	// Profile management
	createProfile,
	loadProfile,
	loadProfiles,
	refreshProfiles,
	mutateProfiles,
	updateProfile,
	migrateStoredProfiles,
	deleteProfile,
	isExistingProfile,

	// Relay management
	addRelayToProfile,
	removeRelayFromProfile,

	// Utilities
	withoutKeys,
	validateProfile,
	generateProfileId
};
