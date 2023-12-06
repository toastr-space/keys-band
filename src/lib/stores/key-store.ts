/*eslint no-async-promise-executor: 0*/

import { ProfileDeleteMethod } from '$lib/types/profile.d';
import { get, type Writable } from 'svelte/store';
import { defaultWebNotificationSettings, web } from './utils';
import { getPublicKey, nip19, SimplePool } from 'nostr-tools';
import type { NotificationSetting, Profile, ProfileSetting, Relay } from '$lib/types/profile.d';
import { profiles, webNotifications, keyStore, relays, webSites, userProfile, theme } from './data';

const _relays = ['wss://relay.damus.io', 'wss://nos.lol'];
const pool = new SimplePool();

function browserControlleur() {
	const get = async (key: string): Promise<{ [key: string]: unknown }> => {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await web?.storage?.local?.get(key);
				resolve(result);
			} catch (err) {
				reject(err);
			}
		});
	};
	const set = async (items: { [key: string]: unknown }): Promise<void> => {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await web?.storage?.local?.set(items);
				resolve(result);
			} catch (err) {
				reject(err);
			}
		});
	};

	return { get, set };
}

const browser: {
	get: (key: string) => Promise<{ [key: string]: unknown }>;
	set: (items: { [key: string]: unknown }) => Promise<void>;
} = browserControlleur();



export async function loadNotifications(): Promise<void> {
	return new Promise((resolve) => {
		web.storage.local.get('notificationsSettings', (value) => {
			if (value?.notificationsSettings) {
				webNotifications.set(value?.notificationsSettings);
			} else {
				browser.set({
					notificationsSettings: defaultWebNotificationSettings
				});
				webNotifications.set(defaultWebNotificationSettings);
			}
			resolve();
		});
	});
}

export async function updateNotification(name: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = await browser.get('notificationsSettings');
			let notifications = value.notificationsSettings as NotificationSetting[];
			notifications = notifications.map((notification) => {
				if (notification.name === name) notification.state = !notification.state;
				return notification;
			});
			await browser.set({ notificationsSettings: notifications });
			webNotifications.set(notifications);
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

export async function switchTheme(themeName: string): Promise<void> {
	return new Promise((resolve) => {
		browser.set({ theme: themeName });
		theme.set(themeName);
		if (typeof document === 'undefined') return;
		if (themeName === 'dark') document.documentElement.classList.add('dark');
		else document.documentElement.classList.remove('dark');
		resolve();
	});
}

function loadKeyInfo(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			await Promise.all([loadWebSites(), loadRelays()]);
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

function registerPrivateKey(value: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			await browser.set({ privateKey: value });
			keyStore.set(value);
			await loadKeyInfo();
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

export async function loadRelays(): Promise<Relay[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = (await browser.get('relays')) as { relays: Relay[] };
			relays.set(value?.relays || []);
			resolve(value?.relays);
		} catch (err) {
			reject(err);
		}
	});
}

export async function loadPrivateKey(): Promise<string> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = (await browser.get('privateKey')) as { privateKey: string };
			keyStore.set(value?.privateKey || '');
			resolve(value?.privateKey || '');
			loadKeyInfo();
		} catch (err) {
			reject(err);
		}
	});
}

export async function loadWebSites(): Promise<unknown> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = (await browser.get('webSites')) as { webSites: unknown };
			webSites.set(value?.webSites);
			resolve(value?.webSites);
		} catch (err) {
			reject(err);
		}
	});
}

// TODO: Enable this when the web extension is ready
// if (typeof document !== 'undefined')
//  webSites.subscribe((value) => {
//    browser.set({ webSites: value });
//  });



export async function verifyKey(value: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		if (value?.length < 63) {
			reject('Invalid key');
			return;
		}

		let decodedValue;

		if (value?.toString().startsWith('nsec')) {
			try {
				decodedValue = nip19.decode(value).data;
			} catch (e) {
				reject('Invalid key');
				return;
			}
		} else if (value?.length === 64) {
			decodedValue = value;
		} else {
			reject('Invalid key');
			return;
		}

		resolve(decodedValue as string);
	});
}

export async function addKey(value: string): Promise<void> {
	if (!value) return;

	return new Promise(async (resolve, reject) => {
		try {
			const decodedValue = await verifyKey(value);

			await registerPrivateKey(decodedValue);
			resolve();
		} catch (e) {
			reject(e);
		}
	});
}

export async function logout(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = await browser.get('profileName');
			await loadPrivateKey();
			await loadKeyInfo();

			const _webSites = await browser.get('webSites');
			const _relays = await browser.get('relays');

			console.log(get(webSites), get(relays), _webSites, _relays);
			const _profiles = get(profiles);
			const profile = {
				name: value.profileName,
				data: {
					privateKey: get(keyStore),
					webSites: get(webSites),
					relays: get(relays)
				}
			};

			console.log(profile);
			const index = _profiles.findIndex((p) => p.name === value.profileName);
			_profiles[index] = profile;
			await browser.set({ profiles: _profiles });

			relays.set([]);
			keyStore.set('');
			userProfile.set({});
			webSites.set({});
			return new Promise(async () => {
				await browser.set({ privateKey: '' });
				await browser.set({ profile: '' });
				resolve();
			});
		} catch (err) {
			reject(err);
		}
	});
}

export async function isProfileExist(name: string, key: string): Promise<string> {
	try {
		const _profiles = get(profiles);
		const pkey = await verifyKey(key);
		return _profiles.findIndex(
			(p: Profile) => p.name === name || p?.data?.privateKey || '' === pkey
		) !== -1
			? ''
			: pkey;
	} catch (err) {
		alert(err);
	}
	return new Promise(() => { });
}

export async function settingProfile(profile: Profile): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const data: ProfileSetting = {
			profile: '',
			pubkey: getPublicKey(profile.data?.privateKey || '') as string,
			privateKey: profile.data?.privateKey as string,
			profileName: profile.name as string,
			webSites: profile.data?.webSites as object,
			relays: profile.data?.relays as Relay[]
		};
		try {
			await browser.set(data as unknown as { [key: string]: unknown });
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

// PROFILE MANAGEMENT

export async function loadProfile(profile: Profile): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		try {
			if (profile.data === undefined || profile?.data?.privateKey === undefined) reject(false);
			else {
				if (profile.data.pubkey === undefined || profile.data.pubkey === '') {
					profile.data.pubkey = getPublicKey(profile.data.privateKey);
				}
				profile = await fetchProfileInformation(profile)
				alert(JSON.stringify(profile))
				keyStore.set(profile?.data?.privateKey || '');
				await settingProfile(profile);
				await loadPrivateKey();
				resolve(true);
			}
		} catch (err) {
			reject(err);
		}
	});
}

export async function deleteProfile(
	profile: Profile,
	method: ProfileDeleteMethod = ProfileDeleteMethod.DEFAULT
): Promise<void> {
	return new Promise((resolve) => {
		if (method === ProfileDeleteMethod.DEFAULT) {
			const _profiles = get(profiles);
			const index = _profiles.findIndex((p) => p.name === profile.name);
			_profiles.splice(index, 1);
			profiles.set(_profiles);
			saveProfiles();
			resolve();
		}
	});
}

export async function createProfile(name: string, key: string): Promise<boolean> {
	return new Promise(async function (resolve, reject) {
		if (name.length < 4) {
			reject('Name must be at least 4 characters');
			return;
		}

		try {
			const privateKey: string = await isProfileExist(name, key);
			if (privateKey === '') {
				reject('Name or key already exist');
				alert('Name or key already exist');
				return;
			}

			const profile: Profile = {
				name: name,
				data: {
					privateKey: privateKey,
					webSites: {},
					relays: []
				}
			};
			profiles.update((profiles) => [...profiles, profile]);
			saveProfiles();
			resolve(true);
		} catch (error) {
			reject(error);
		}
	});
}

export async function fetchProfileInformation(profile: Profile): Promise<Profile> {
	return new Promise(async function (resolve, reject) {
		if (!profile.data?.pubkey) return reject();
		try {
			pool
				.get(_relays, {
					authors: [profile.data?.pubkey || (getPublicKey(profile.data?.privateKey || ""))],
					kinds: [0]
				})
				.then((event) => {
					const profile = JSON.parse(event?.content || '{}');
					profile.picture = profile.picture || '';
					profile.name = profile.name || '';
					resolve(profile);
				})
				.catch((err) => {
					reject(err)
				});
		} catch (error: any) {
			reject(error)
		}
	})

}

export async function loadProfiles(): Promise<Writable<Profile[]>> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = await browser.get('profiles');
			if (value?.profiles) {
				profiles.set((value?.profiles as Profile[]) || []);
			} else {
				browser.set({ profiles: [] });
				profiles.set([]);
			}
			resolve(profiles);
		} catch (err) {
			reject(err);
		}
	});
}

export async function saveProfiles(): Promise<void> {
	return new Promise((resolve) => {
		browser.set({ profiles: get(profiles) });
		resolve();
	});
}

/// END PROFILE MANAGEMENT



export const profileControlleur: {
	createProfile: (name: string, key: string) => Promise<boolean>;
	deleteProfile: (profile: Profile, method?: ProfileDeleteMethod) => Promise<void>;
	logout: () => Promise<void>;
	addKey: (value: string) => Promise<void>;
	verifyKey: (value: string) => Promise<string>;
	loadKeyInfo: () => Promise<void>;
	loadPrivateKey: () => Promise<string>;
	loadWebSites: () => Promise<unknown>;
	fetchProfileInformation: (profile: Profile) => Promise<void>;
	loadRelays: () => Promise<Relay[]>;
	switchTheme: (themeName: string) => Promise<void>;
	updateNotification: (name: string) => Promise<void>;
	loadNotifications: () => Promise<void>;
	saveProfiles: () => Promise<void>;
	loadProfiles: () => Promise<Writable<Profile[]>>;
	loadProfile: (profile: Profile) => Promise<boolean>;
	settingProfile: (profile: Profile) => Promise<void>;
} = {
	createProfile: createProfile,
	deleteProfile: deleteProfile,
	logout: logout,
	addKey: addKey,
	verifyKey: verifyKey,
	loadKeyInfo: loadKeyInfo,
	loadPrivateKey: loadPrivateKey,
	loadWebSites: loadWebSites,
	fetchProfileInformation: fetchProfileInformation,
	loadRelays: loadRelays,
	switchTheme: switchTheme,
	updateNotification: updateNotification,
	loadNotifications: loadNotifications,
	saveProfiles: saveProfiles,
	loadProfiles: loadProfiles,
	loadProfile: loadProfile,
	settingProfile: settingProfile
};

// [IMPORTANT] NEEDED ON TEST ------------->

// export const profileControlleur: {
// 	createProfile: (name: string, key: string) => Promise<boolean> | unknown;
// 	deleteProfile: (profile: Profile, method?: ProfileDeleteMethod) => Promise<void> | unknown;
// 	logout: () => Promise<void> | unknown;
// 	addKey: (value: string) => Promise<void> | unknown;
// 	verifyKey: (value: string) => Promise<string> | unknown;
// 	loadKeyInfo: () => Promise<void> | unknown;
// 	loadPrivateKey: () => Promise<void> | unknown;
// 	loadWebSites: () => Promise<unknown> | unknown;
// 	getProfile: () => Promise<void> | unknown;
// 	loadRelays: () => Promise<void> | unknown;
// 	switchTheme: (themeName: string) => Promise<void> | unknown;
// 	updateNotification: (name: string) => Promise<void> | unknown;
// 	loadNotifications: () => Promise<void> | unknown;
// 	saveProfiles: () => Promise<void> | unknown;
// 	loadProfiles: () => Promise<void> | unknown;
// 	loadProfile: (profile: Profile) => Promise<boolean> | unknown;
// 	settingProfile: (profile: Profile) => Promise<void> | unknown;
// } = {
// 	createProfile: typeof window === 'undefined' ? () => { } : createProfile,
// 	deleteProfile: typeof window === 'undefined' ? () => { } : deleteProfile,
// 	logout: typeof window === 'undefined' ? () => { } : logout,
// 	addKey: typeof window === 'undefined' ? () => { } : addKey,
// 	verifyKey: typeof window === 'undefined' ? () => { } : verifyKey,
// 	loadKeyInfo: typeof window === 'undefined' ? () => { } : loadKeyInfo,
// 	loadPrivateKey: typeof window === 'undefined' ? () => { } : loadPrivateKey,
// 	loadWebSites: typeof window === 'undefined' ? () => { } : loadWebSites,
// 	getProfile: typeof window === 'undefined' ? () => { } : getProfile,
// 	loadRelays: typeof window === 'undefined' ? () => { } : loadRelays,
// 	switchTheme: typeof window === 'undefined' ? () => { } : switchTheme,
// 	updateNotification: typeof window === 'undefined' ? () => { } : updateNotification,
// 	loadNotifications: typeof window === 'undefined' ? () => { } : loadNotifications,
// 	saveProfiles: typeof window === 'undefined' ? () => { } : saveProfiles,
// 	loadProfiles: typeof window === 'undefined' ? () => { } : loadProfiles,
// 	loadProfile: typeof window === 'undefined' ? () => { } : loadProfile,
// 	settingProfile: typeof window === 'undefined' ? () => { } : settingProfile
// };
