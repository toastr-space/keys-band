import { defaultWebNotificationSettings, web } from "./utils";
import { getPublicKey, nip19, SimplePool } from "nostr-tools";
import { get, writable, type Writable } from "svelte/store";

interface UserProfile {
  name?: string;
  picture?: string;
  nip05?: string;
}

export interface Authorization {
  always: boolean;
  accept: boolean;
  reject: boolean;
  authorizationStop?: Date;
}

export interface WebSite {
  auth: boolean;
  permission?: Authorization;
  history?: {
    type: string;
    data?: {};
    created_at: string;
    accepted: boolean;
  }[];
}

export interface Relay {
  url: string;
  enabled: boolean;
  created_at: Date;
}

export interface NotificationSetting {
  name: string;
  description: string;
  state: boolean;
}

const _relays = ["wss://relay.damus.io"];

const pool = new SimplePool();

export const keyStore: Writable<string> = writable("");
export const userProfile: Writable<UserProfile> = writable({});
export let webSites: Writable<{}> = writable();
export let relays: Writable<Relay[]> = writable([]);
export let theme: Writable<string> = writable("light");
export let webNotifications: Writable<NotificationSetting[]> = writable([]);

// html theme change <html data-theme="cupcake"></html>

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

export async function switchTheme(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("theme", (value) => {
      if (value.theme === "light") {
        web.storage.local.set({ theme: "dark" });
        theme.set("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        web.storage.local.set({ theme: "light" });
        theme.set("light");
        document.documentElement.setAttribute("data-theme", "light");
      }
      resolve();
    });
  });
}

export async function loadTheme(): Promise<void> {
  return new Promise((resolve) => {
    web.storage.local.get("theme", (value) => {
      if (value.theme) {
        theme.set(value.theme);
        document.documentElement.setAttribute("data-theme", value.theme);
      } else {
        web.storage.local.set({ theme: "light" });
        theme.set("light");
        document.documentElement.setAttribute("data-theme", "light");
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

webSites.subscribe((value) => {
  web.storage.local.set({ webSites: value });
});

export async function getProfile(): Promise<void> {
  if (!get(keyStore)) return;
  pool
    .get(_relays, {
      authors: [getPublicKey(get(keyStore))],
      kinds: [0],
    })
    .then((event) => {
      const profile = JSON.parse(event.content);
      userProfile.set(profile);
      web.storage.local.set({ profile: profile });
    });

  return new Promise((resolve) => {
    web.storage.local.get("profile", (value) => {
      userProfile.set(value.profile);
      resolve(value.profile);
    });
  });
}

export async function addKey(value: string): Promise<void> {
  if (!value) return;

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

    await registerPrivateKey(decodedValue);
    resolve();
  });
}

export async function logout(): Promise<void> {
  relays.set([]);
  keyStore.set("");
  userProfile.set({});
  webSites.set({});
  return new Promise((resolve) => {
    web.storage.local.clear(() => {
      resolve();
    });
  });
}
