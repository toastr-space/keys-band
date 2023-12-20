/*eslint no-async-promise-executor: 0*/

import { ProfileDeleteMethod } from '$lib/types/profile.d';
import { get, type Writable } from 'svelte/store';
import { defaultWebNotificationSettings, web } from '../utility/utils';
import { getPublicKey, nip19 } from 'nostr-tools';
import type { NotificationSetting, Profile, Relay, WebSite, WebSiteHistory } from '$lib/types/profile.d';
import { duration, profiles, webNotifications, userProfile, theme, browser } from './data';
import { NostrUtil, ProfileUtil } from '$lib/utility';
import type { Duration } from '$lib/types/duration';
import type { BackgroundControlleur, PermissionDuration, PopupParams } from '$lib/types';


const sessionControlleur = () => {
	const loadData = async (): Promise<{ [key: string]: any }> => {
		const datas = await browser.get('sessionData')
		if (datas?.sessionData)
			return datas?.sessionData;
		return {};
	}

	const popAtIndex = async (index: string): Promise<any> => {
		const data = await loadData();
		const value = data[index];
		delete data[index];
		browser.set({ sessionData: data });
		return value;
	}

	const add = async (event: PopupParams): Promise<string> => {
		const randomId = Math.random().toString(36).substring(7);
		const data = await loadData();
		data[randomId] = event;
		browser.set({ sessionData: data });
		return randomId;
	};

	const remove = async (id: string): Promise<void | any> => (popAtIndex(id))
	const getById = async (id: string): Promise<any> => (await popAtIndex(id))

	return {
		add,
		remove,
		getById
	}
}

export async function loadDuration(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = await browser.get('duration');
			if (value?.duration) duration.set(value?.duration as Duration);
			else {
				browser.set({
					duration: {
						name: 'One time',
						value: 0
					}
				});
				duration.set({
					name: 'One time',
					value: 0
				});
			}
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

export async function changeDuration(newDuration: Duration): Promise<void> {
	return new Promise((resolve, reject) => {
		try {
			browser.set({ duration: newDuration });
			duration.set(newDuration);
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

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

export async function loadTheme(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			const value = await browser.get('theme');
			if (value?.theme !== 'dark') {
				theme.set(value?.theme as string);
				document.documentElement.classList.remove('dark');
			} else {
				browser.set({ theme: 'dark' });
				theme.set('dark');
				document.documentElement.classList.add('dark');
			}
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
		browser.set({ theme: themeName });
		resolve();
	});
}

export async function checkNSEC(value: string): Promise<string> {
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

export async function isExistingProfile(name: string, key: string): Promise<boolean> {
	try {
		const _profiles = get(profiles);
		const pkey = await checkNSEC(key);
		return _profiles.findIndex((p: Profile) => p.name === name || p?.data?.privateKey === pkey) !==
			-1
			? true
			: false;
	} catch (err) {
		alert(err);
	}
	return false;
}

export async function settingProfile(profile: Profile): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			await browser.set({ currentProfile: profile.id });
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

// PROFILE MANAGEMENT
const loadProfile = async (profile: Profile): Promise<boolean | Profile | undefined> => {
	try {
		if (profile.data !== undefined) {
			if (profile.data?.pubkey === undefined || profile.id === undefined) {
				profile.data.pubkey = getPublicKey(profile.data.privateKey as string);
				profile.id = profile.data.pubkey;
			}
			await settingProfile(profile);
			userProfile.set(profile);
			if (profile.data?.relays?.length || 1 > 0) {
				NostrUtil.getRelays(profile.data?.pubkey as string, true).then((event) => {
					if (event?.tags) {
						const relays_list: Relay[] = [];
						if (event.tags.length > 0)
							event.tags.forEach((relay) => {
								relays_list.push({
									url: relay[1],
									enabled: true,
									created_at: new Date(),
									access:
										relay.length > 2 ? (relay[2] === 'read' ? 0 : relay[2] === 'write' ? 1 : 2) : 2
								});
							});
						if (profile.data) profile.data.relays = relays_list;
						if (profile.id === get(userProfile).id) userProfile.set(profile);
						saveProfile(profile);
					}
					saveProfile(profile);
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
		alert(JSON.stringify(err));
		return false;
	}
};

const saveProfile = async (profile: Profile): Promise<void> => {
	try {
		const _profiles = get(profiles);
		let index;
		if (profile.id) {
			index = _profiles.findIndex((p) => p.id === profile.id);
			if (index === -1)
				index = _profiles.findIndex((p) => p.data?.privateKey === profile.data?.privateKey);
		} else index = _profiles.findIndex((p) => p.data?.privateKey === profile.data?.privateKey);
		_profiles[index] = profile;
		await browser.set({ profiles: _profiles });
		Promise.resolve();
	} catch (err) {
		Promise.reject(err);
	}
};

const deleteProfile = async (
	profile: Profile,
	method: ProfileDeleteMethod = ProfileDeleteMethod.DEFAULT
): Promise<void> => {
	return new Promise((resolve) => {
		if (method === ProfileDeleteMethod.DEFAULT) {
			const _profiles = get(profiles);

			const index = _profiles.findIndex((p) => p.name === profile.name);
			_profiles.splice(index, 1);
			profiles.set(_profiles);
			if (get(userProfile)?.id === profile.id) {
				loadProfile(_profiles[0] ?? {});
			}
			saveProfiles();
			resolve();
		}
	});
};

export async function createProfile(
	name: string,
	key: string,
	metadata?: any,
	relays?: any
): Promise<boolean> {
	return new Promise(async function (resolve, reject) {
		if (name.length < 4) {
			reject('Name must be at least 4 characters');
			return;
		}

		const privateKey = (await checkNSEC(key)) as string;

		try {
			if ((await isExistingProfile(name, privateKey)) === true) {
				reject('Name or key already exists');
				return;
			}

			const profile: Profile = {
				name: name,
				id: getPublicKey(privateKey),
				metadata: metadata,
				data: {
					pubkey: getPublicKey(privateKey),
					privateKey,
					webSites: {},
					relays
				}
			};
			profiles.update((profiles) => [...profiles, profile]);
			saveProfiles();
			const metaData = await NostrUtil.getMetadata(getPublicKey(privateKey));
			profile.metadata = metaData;
			await loadProfile(profile);

			resolve(true);
		} catch (error) {
			reject(error);
		}
	});
}

export async function loadProfiles(): Promise<Writable<Profile[]>> {
	return new Promise(async (resolve, reject) => {
		try {
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

const addRelayToProfile = async (relayUrl: string): Promise<void> => {
	return new Promise(async (resolve, reject) => {
		try {
			const relay: Relay = {
				url: relayUrl,
				enabled: true,
				created_at: new Date()
			};
			userProfile.update((profile) => {
				profile?.data?.relays?.push(relay);
				return profile;
			});
			await saveProfile(get(userProfile));
			NostrUtil.pushRelays(get(userProfile));
			resolve();
		} catch (err) {
			reject(err);
		}
	});
};

const removeRelayFromProfile = async (relay: Relay): Promise<void> => {
	return new Promise(async (resolve, reject) => {
		try {
			userProfile.update((profile) => {
				const index = profile?.data?.relays?.findIndex((r) => r.url === relay.url) as number;
				profile?.data?.relays?.splice(index, 1);
				return profile;
			});
			await saveProfile(get(userProfile));
			NostrUtil.pushRelays(get(userProfile));
			resolve();
		} catch (err) {
			reject(err);
		}
	});
};



// --------------------------------------------------------
//  
// Here if you want to use profile information, you need to load it first in any function
//
// BACKGROUND CONTROLLEUR

const backgroundControlleur = (): BackgroundControlleur => {

	const getUserProfile = async (): Promise<Profile> => {
		await profileControlleur.loadProfiles();
		const user = get(userProfile);
		return Promise.resolve(user);
	};

	const addHistory = async (info: { acceptance: boolean; type: string }, domain: string) => {
		const user = await getUserProfile();
		const webSites = user.data?.webSites || {};
		const site = ProfileUtil.getWebSiteOrCreate(domain, user);

		site.history = [...site.history as WebSiteHistory[], {
			accepted: info.acceptance,
			type: info.type,
			created_at: new Date().toString(),
			data: undefined
		}];

		if (user.data)
			user.data.webSites = { ...webSites, [domain]: site };
		else user.data = { webSites: { [domain]: site } };

		await profileControlleur.saveProfile(user);
	}

	const updatePermisison = async (
		duration: PermissionDuration,
		webSite: WebSite,
		domain: string,
		type: string
	) => {
		const user = await getUserProfile();
		const webSites: { [url: string]: WebSite } = user.data?.webSites || {};

		const site = ProfileUtil.getNewWebSitePermission(duration, webSite)
		if (user.data)
			user.data.webSites = { ...webSites, [domain]: site };
		else user.data = { webSites: { [domain]: site } };

		await profileControlleur.saveProfile(user);
		await addHistory({ acceptance: duration.accept, type }, domain);
	}

	return { updatePermisison, getUserProfile, addHistory }
}

// END OF BACKGROUND CONTROLLEUR

// --------------------------------------------------------


export const profileControlleur: {
	addRelayToProfile: (relayUrl: string) => Promise<void>;
	changeDuration: (newDuration: Duration) => Promise<void>;
	createProfile: (name: string, key: string, metaData?: any, relays?: any[]) => Promise<boolean>;
	deleteProfile: (profile: Profile, method?: ProfileDeleteMethod) => Promise<void>;
	loadDuration: () => Promise<void>;
	loadNotifications: () => Promise<void>;
	loadProfile: (profile: Profile) => Promise<boolean | Profile | undefined>;
	loadProfiles: () => Promise<Writable<Profile[]>>;
	loadTheme: () => Promise<void>;
	removeRelayFromProfile: (relay: Relay) => Promise<void>;
	saveProfile: (profile: Profile) => Promise<void>;
	saveProfiles: () => Promise<void>;
	settingProfile: (profile: Profile) => Promise<void>;
	switchTheme: (themeName: string) => Promise<void>;
	updateNotification: (name: string) => Promise<void>;
	checkNSEC: (value: string) => Promise<string>;
} = {
	addRelayToProfile: addRelayToProfile,
	changeDuration: changeDuration,
	createProfile: createProfile,
	deleteProfile: deleteProfile,
	loadDuration: loadDuration,
	loadNotifications: loadNotifications,
	loadProfile: loadProfile,
	loadProfiles: loadProfiles,
	loadTheme: loadTheme,
	removeRelayFromProfile: removeRelayFromProfile,
	saveProfile: saveProfile,
	saveProfiles: saveProfiles,
	settingProfile: settingProfile,
	switchTheme: switchTheme,
	updateNotification: updateNotification,
	checkNSEC: checkNSEC
};

export const controlleur = { sessionControlleur, backgroundControlleur };