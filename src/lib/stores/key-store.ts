import { ProfileDeleteMethod } from "$lib/types/profile.d";
import { get, writable, type Writable } from "svelte/store";
import { defaultWebNotificationSettings, web } from "./utils";
import { getPublicKey, nip19, SimplePool, type Relay } from "nostr-tools";
import type { NotificationSetting, Profile, UserProfile } from "$lib/types/profile.d";

const _relays = ["wss://relay.damus.io", "wss://nos.lol"];
const pool = new SimplePool();

export const keyStore: Writable<string> = writable("");
export const userProfile: Writable<UserProfile> = writable({});
export let profiles: Writable<Profile[]> = writable([]);
export const webSites: Writable<any> = writable();
export let relays: Writable<Relay[]> = writable([]);
export let theme: Writable<string> = writable("light");
export let webNotifications: Writable<NotificationSetting[]> = writable([]);

export async function loadProfiles(): Promise<void> {
  return new Promise(async (resolve) => {
    const value = await web.storage.local.get("profiles")
    console.log(JSON.stringify(value));
    if (value.profiles) {
      profiles.set(value.profiles);
    } else {
      web.storage.local.set({ profiles: [] });
      profiles.set([]);
    }
    resolve();
  });
}

export async function saveProfiles(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.set({ profiles: get(profiles) });
    resolve();
  });
}


export async function loadNotifications(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("notificationsSettings", (value) => {
      if (value.notificationsSettings) {
        webNotifications.set(value.notificationsSettings);
      } else {
        web.storage.local.set({
          notificationsSettings: defaultWebNotificationSettings,
        });
        webNotifications.set(defaultWebNotificationSettings);
      }
      resolve();
    });
  });
}

export async function updateNotification(name): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("notificationsSettings", (value) => {
      let notifications = value.notificationsSettings;
      notifications.forEach((notification) => {
        if (notification.name === name) {
          notification.state = !notification.state;
        }
      });
      web.storage.local.set({ notificationsSettings: notifications });
      webNotifications.set(notifications);
      resolve();
    });
  });
}

export async function switchTheme(themeName: string): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.set({ theme: themeName });
    theme.set(themeName);
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", themeName);
    resolve();
  });
}

export async function loadTheme(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("theme", (value) => {
      if (value.theme) {
        theme.set(value.theme);
        if (typeof document === "undefined") return;
        document.documentElement.setAttribute("data-theme", value.theme);
      } else {
        web.storage.local.set({ theme: "cupcake" });
        theme.set("cupcake");
        if (typeof document === "undefined") return;
        document.documentElement.setAttribute("data-theme", "cupcake");
      }
      resolve();
    });
  });
}

function loadKeyInfo(): Promise<void> {
  return new Promise(async (resolve) => {
    await Promise.all([getProfile(), loadWebSites(), loadRelays()]);
    resolve();
  });
}

function registerPrivateKey(value: string): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.set({ privateKey: value }, async () => {
      keyStore.set(value);
      await loadKeyInfo();
      resolve();
    });
  });
}

export async function loadRelays(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("relays", (value) => {
      relays.set(value.relays || []);
      resolve(value.relays);
    });
  });
}

export async function loadPrivateKey(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("privateKey", (value) => {
      keyStore.set(value.privateKey);
      resolve(value.privateKey);
      loadKeyInfo();
    });
  });
}

export async function loadWebSites(): Promise<{}> {
  return new Promise((resolve) => {
    web.storage.local.get("webSites", (value) => {
      webSites.set(value.webSites);
      resolve(value.webSites);
    });
  });
}

if (typeof document !== "undefined")
  webSites.subscribe((value) => {
    web.storage.local.set({ webSites: value });
  });

export async function getProfile(): Promise<void> {
  if (!get(keyStore)) return;
  try {
    pool
      .get(_relays, {
        authors: [getPublicKey(get(keyStore))],
        kinds: [0],
      })
      .then((event) => {
        const profile = JSON.parse(event?.content || "{}");
        userProfile.set(profile);
        web.storage.local.set({ profile: profile });
      });
  } catch (error) {
    alert(error.message);
  }

  return new Promise((resolve) => {
    web.storage.local.get("profile", (value) => {
      userProfile.set(value.profile);
      resolve(value.profile);
    });
  });
}

export async function verifyKey(value: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (value.length < 63) {
      reject("Invalid key");
      return;
    }

    let decodedValue;

    if (value.toString().startsWith("nsec")) {
      try {
        decodedValue = nip19.decode(value).data;
      } catch (e) {
        reject("Invalid key");
        return;
      }
    } else if (value.length === 64) {
      decodedValue = value;
    } else {
      reject("Invalid key");
      return;
    }

    resolve(decodedValue);
  });
}

export async function addKey(value: string): Promise<void> {
  if (!value) return;

  return new Promise(async (resolve, reject) => {
    try {
      let decodedValue = await verifyKey(value);

      await registerPrivateKey(decodedValue);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export async function logout(): Promise<void> {
  return new Promise(async (resolve) => {
    let value = await web.storage.local.get("profileName");
    await loadPrivateKey();
    await loadKeyInfo();

    let _webSites = await web.storage.local.get("webSites");
    let _relays = await web.storage.local.get("relays");

    console.log(get(webSites), get(relays), _webSites, _relays);
    const _profiles = get(profiles);
    const profile = {
      name: value.profileName,
      data: {
        privateKey: get(keyStore),
        webSites: get(webSites),
        relays: get(relays),
      },
    };

    console.log(profile);
    const index = _profiles.findIndex((p) => p.name === value.profileName);
    _profiles[index] = profile;
    await web.storage.local.set({ profiles: _profiles });

    relays.set([]);
    keyStore.set("");
    userProfile.set({});
    webSites.set({});
    return new Promise(async (resolve) => {
      await web.storage.local.set({ privateKey: "" }, async () => {
        await web.storage.local.set({ profile: "" }, () => {
          resolve();
        });
      });
    });
  });
}

export async function isProfileExist(name: string, key: string): Promise<string> {
  const _profiles = get(profiles);
  const pkey = await verifyKey(key);
  return _profiles.findIndex((p: Profile) => p.name === name || p?.data?.privateKey === pkey) !== -1 ? "" : pkey;
}

export async function createProfile(name: string, key: string): Promise<boolean> {
  return new Promise(async function (resolve, reject) {
    if (name.length < 4) {
      reject('Name must be at least 4 characters')
      return;
    }

    try {
      const privateKey: string = await isProfileExist(name, key)
      if (privateKey === "") {
        reject('Name or key already exist')
        alert('Name or key already exist');
        return;
      }

      let profile: Profile = {
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
  })
}


export async function deleteProfile(profile: Profile, method: ProfileDeleteMethod = ProfileDeleteMethod.DEFAULT): Promise<void> {
  return new Promise(async (resolve) => {
    if (method === ProfileDeleteMethod.DEFAULT) {
      const _profiles = get(profiles);
      const index = _profiles.findIndex((p) => p.name === profile.name);
      _profiles.splice(index, 1);
      profiles.set(_profiles);
      saveProfiles();
      resolve()
    }
  })
}

export async function settingProfile(profile: Profile): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.set({ profile: "" });
    web.storage.local.set({ privateKey: profile.data.privateKey });
    web.storage.local.set({ profileName: profile.name });
    web.storage.local.set({ webSites: profile.data.webSites });
    web.storage.local.set({ relays: profile.data.relays });
    resolve();
  });
}

export async function loadProfile(profile: Profile): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    if (profile.data === undefined || profile.data.privateKey === undefined) reject(false);
    else {
      keyStore.set(profile.data.privateKey);
      await settingProfile(profile);
      await loadPrivateKey();
      alert('loaded from here')
      resolve(true)
    }
  })
}

export const profileControlleur: {
  createProfile: (name: string, key: string) => Promise<boolean> | any;
  deleteProfile: (profile: Profile, method?: ProfileDeleteMethod) => Promise<void> | any;
  logout: () => Promise<void> | any;
  addKey: (value: string) => Promise<void> | any;
  verifyKey: (value: string) => Promise<string> | any;
  loadKeyInfo: () => Promise<void> | any;
  loadPrivateKey: () => Promise<void> | any;
  loadWebSites: () => Promise<{}> | any;
  getProfile: () => Promise<void> | any;
  loadRelays: () => Promise<void> | any;
  loadTheme: () => Promise<void> | any;
  switchTheme: (themeName: string) => Promise<void> | any;
  updateNotification: (name: string) => Promise<void> | any;
  loadNotifications: () => Promise<void> | any;
  saveProfiles: () => Promise<void> | any;
  loadProfiles: () => Promise<void> | any;
  loadProfile: (profile: Profile) => Promise<boolean> | any;
  settingProfile: (profile: Profile) => Promise<void> | any;
} = {
  createProfile: typeof window === "undefined" ? () => { } : createProfile,
  deleteProfile: typeof window === "undefined" ? () => { } : deleteProfile,
  logout: typeof window === "undefined" ? () => { } : logout,
  addKey: typeof window === "undefined" ? () => { } : addKey,
  verifyKey: typeof window === "undefined" ? () => { } : verifyKey,
  loadKeyInfo: typeof window === "undefined" ? () => { } : loadKeyInfo,
  loadPrivateKey: typeof window === "undefined" ? () => { } : loadPrivateKey,
  loadWebSites: typeof window === "undefined" ? () => { } : loadWebSites,
  getProfile: typeof window === "undefined" ? () => { } : getProfile,
  loadRelays: typeof window === "undefined" ? () => { } : loadRelays,
  loadTheme: typeof window === "undefined" ? () => { } : loadTheme,
  switchTheme: typeof window === "undefined" ? () => { } : switchTheme,
  updateNotification: typeof window === "undefined" ? () => { } : updateNotification,
  loadNotifications: typeof window === "undefined" ? () => { } : loadNotifications,
  saveProfiles: typeof window === "undefined" ? () => { } : saveProfiles,
  loadProfiles: typeof window === "undefined" ? () => { } : loadProfiles,
  loadProfile: typeof window === "undefined" ? () => { } : loadProfile,
  settingProfile: typeof window === "undefined" ? () => { } : settingProfile,
}