import { ProfileDeleteMethod } from '$lib/types/profile.d';
import { get, type Writable } from 'svelte/store';
import { NostrUtil } from '$lib/utility';
import { getPublicKey } from 'nostr-tools';
import type { Duration, Profile, ProfileController, Relay } from '$lib/types/profile.d';
import { duration, profiles, userProfile, theme, browser } from '$lib/stores/data';

// Constants
const DEFAULT_DURATION: Duration = {
	name: 'One time',
	value: 0
};

const DEFAULT_THEME = 'dark';
const MIN_PROFILE_NAME_LENGTH = 4;

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

// PROFILE MANAGEMENT
const validateProfile = (profile: Profile): void => {
	if (!profile.id || !profile.data?.privateKey) {
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
				privateKey,
				webSites: {},
				relays: relays || []
			}
		};

		validateProfile(profile);

		// Update profiles array
		const currentProfiles = get(profiles);
		const updatedProfiles = [...currentProfiles, profile];

		profiles.set(updatedProfiles);
		await saveProfiles();

		return true;
	} catch (error) {
		handleError('Create profile', error);
	}
};

const loadProfile = async (profile: Profile): Promise<boolean | Profile | undefined> => {
	try {
		if (profile.data !== undefined) {
			if (profile.data?.pubkey === undefined || profile.id === undefined) {
				profile.data.pubkey = getPublicKey(profile.data.privateKey as string);
				profile.id = profile.data.pubkey;
			}
			await browser.set({ currentProfile: profile.id });
			userProfile.set(profile);
			if (profile.data?.relays?.length || 1 > 0) {
				NostrUtil.getRelays(profile.data?.pubkey as string, true).then((event) => {
					if (event?.tags) {
						const networkRelays: Relay[] = [];
						if (event.tags.length > 0)
							event.tags.forEach((relay) => {
								networkRelays.push({
									url: relay[1],
									enabled: true,
									created_at: new Date(),
									access:
										relay.length > 2 ? (relay[2] === 'read' ? 0 : relay[2] === 'write' ? 1 : 2) : 2
								});
							});
						
						// Merge network relays with existing local relays, avoiding duplicates
						if (profile.data) {
							const existingRelays = profile.data.relays || [];
							const existingUrls = new Set(existingRelays.map(r => r.url));
							
							// Only add network relays that don't already exist locally
							const newRelays = networkRelays.filter(relay => !existingUrls.has(relay.url));
							
							profile.data.relays = [...existingRelays, ...newRelays];
						}
						
						if (profile.id === get(userProfile).id) userProfile.set(profile);
						saveProfile(profile);
					}
				});
			}
			NostrUtil.getMetadata(profile.data.pubkey as string).then((metaData) => {
				profile.metadata = metaData;
				saveProfile(profile);
				if (profile.id === get(userProfile).id) userProfile.set(profile);
			});
			return profile;
		}
	} catch (err) {
		console.error(JSON.stringify(err));
		return false;
	}
};

const loadProfiles = async (): Promise<Writable<Profile[]>> => {
	const value = await browser.get('profiles');
	if (value?.profiles) profiles.set((value?.profiles as Profile[]) || []);
	else {
		browser.set({ profiles: [] });
		profiles.set([]);
	}

	const data = await browser.get('currentProfile');

	for (const profile of get(profiles)) {
		if (
			profile.data !== undefined &&
			(profile.data?.pubkey === undefined || profile.id === undefined)
		) {
			profile.data.pubkey = getPublicKey(profile.data.privateKey as string);
			profile.id = profile.data.pubkey;
		}
		if (profile.id === data?.currentProfile) {
			userProfile.set(profile);
			await NostrUtil.prepareRelayPool();
			await loadProfile(profile);
		}

		NostrUtil.getMetadata(profile?.data?.pubkey as string).then((metaData) => {
			if ((profile.id as string) !== (data.currentProfile as string)) {
				profile.metadata = metaData;
				saveProfile(profile);
			}
		});
	}
	return profiles;
};

const saveProfile = async (profile: Profile): Promise<void> => {
	try {
		validateProfile(profile);

		const currentProfiles = get(profiles);
		const updatedProfiles = currentProfiles.map((p) => (p.id === profile.id ? profile : p));

		profiles.set(updatedProfiles);
		await saveProfiles();

		console.log(`Profile saved: ${profile.name}`);
	} catch (error) {
		handleError('Save profile', error);
	}
};

const saveProfiles = async (): Promise<void> => {
	try {
		await browser.set({ profiles: get(profiles) });
	} catch (error) {
		handleError('Save profiles', error);
	}
};

const deleteProfile = async (profile: Profile, method?: ProfileDeleteMethod): Promise<void> => {
	try {
		const currentProfiles = get(profiles);
		const filteredProfiles = currentProfiles.filter((p) => p.id !== profile.id);

		profiles.set(filteredProfiles);
		await saveProfiles();

		// If deleted profile was current, clear it
		const currentProfile = get(userProfile);
		if (currentProfile.id === profile.id) {
			userProfile.set({} as Profile);
			await browser.set({ currentProfile: null });
		}

		console.log(`Profile deleted: ${profile.name} (method: ${method})`);
	} catch (error) {
		handleError('Delete profile', error);
	}
};

const settingProfile = async (profile: Profile): Promise<void> => {
	try {
		validateProfile(profile);

		await Promise.all([saveProfile(profile), loadProfile(profile)]);
	} catch (error) {
		handleError('Setting profile', error);
	}
};

// RELAY MANAGEMENT
const addRelayToProfile = async (relayUrl: string): Promise<void> => {
	try {
		if (!relayUrl || typeof relayUrl !== 'string') {
			throw new Error('Invalid relay URL');
		}

		const relay: Relay = {
			url: relayUrl.trim(),
			enabled: true,
			created_at: new Date()
		};

		userProfile.update((profile) => {
			if (!profile.data) {
				profile.data = { relays: [relay], webSites: {}, pubkey: '', privateKey: '' };
			} else if (!profile.data.relays) {
				profile.data.relays = [relay];
			} else {
				profile.data.relays.push(relay);
			}
			return profile;
		});

		const updatedProfile = get(userProfile);
		await saveProfile(updatedProfile);
		NostrUtil.pushRelays(updatedProfile);

		console.log(`Relay added: ${relayUrl}`);
	} catch (error) {
		handleError('Add relay to profile', error);
	}
};

const removeRelayFromProfile = async (relay: Relay): Promise<void> => {
	try {
		userProfile.update((profile) => {
			if (profile.data?.relays) {
				profile.data.relays = profile.data.relays.filter((r) => r.url !== relay.url);
			}
			return profile;
		});

		const updatedProfile = get(userProfile);
		await saveProfile(updatedProfile);
		NostrUtil.pushRelays(updatedProfile);

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
	saveProfile,
	saveProfiles,
	deleteProfile,
	settingProfile,
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
	saveProfile,
	saveProfiles,
	deleteProfile,
	settingProfile,
	isExistingProfile,

	// Relay management
	addRelayToProfile,
	removeRelayFromProfile,

	// Utilities
	validateProfile,
	generateProfileId
};
