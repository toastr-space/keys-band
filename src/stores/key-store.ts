import { web } from "./utils";
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
  history?: { type: string; data: {}; created_at: string; accepted: boolean }[];
}

export interface Relay {
  url: string;
  enabled: boolean;
  created_at: Date;
}

const _relays = ["wss://relay.damus.io"];

const pool = new SimplePool();

export const keyStore: Writable<string> = writable("");
export const userProfile: Writable<UserProfile> = writable({});
export let webSites: Writable<{}> = writable();
export let relays: Writable<Relay[]> = writable([]);

// ------------------ Key Manager ------------------ //

function registerPrivateKey(value: string): void {
  web.storage.local.set({ privateKey: value }, () => {
    keyStore.set(value);
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
      getProfile();
      loadWebSites();
      loadRelays();
    });
  });
}

export async function loadWebSites() {
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
  let event = pool
    .get(_relays, {
      authors: [getPublicKey(get(keyStore))],
      kinds: [0],
    })
    .then((event) => {
      const profile = JSON.parse(event.content);
      userProfile.set(profile);
      web.storage.local.set({ profile: profile });
    })
    .catch((err) => {
      //alert(err);
    });
  return new Promise((resolve) => {
    web.storage.local.get("profile", (value) => {
      userProfile.set(value.profile);
      resolve(value.profile);
    });
  });
}

export function addKey(value) {
  if (!value) return;

  if (value.length < 63) {
    alert("Invalid key");
    return;
  }

  let decodedValue;

  if (value.toString().startsWith("nsec")) {
    decodedValue = nip19.decode(value).data;
  } else if (value.length === 64) {
    decodedValue = value;
  } else {
    alert("Invalid key");
    return;
  }

  registerPrivateKey(decodedValue);
  loadPrivateKey();
}
