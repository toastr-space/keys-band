import { db } from "./utils";
import { nip19 } from "nostr-tools";
import { writable, type Writable } from "svelte/store";

export const keyStore: Writable<string> = writable("");

export function addPrivateKey(value: string) {
  let key: string;
  if (value.startsWith("nsec")) {
    let { type, data } = nip19.decode(value);
    // TODO: check if not type is private key and return error
    // TODO: ...
  } else {
    // TODO: check if not type is private key and return error
    // TODO: ...
  }

  // TODO: store the key in the local storage
  // INIT: author profile fetching...
}

// ------------------ Key Manager ------------------ //

// Store the private key in the local storage
export function registerPrivateKey(value: string) {
  db.storage.local.set({ privateKey: value }, () => {
    keyStore.set(value);
  });
}

// Get the private key from the local storage
export async function getPublicKey(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.storage.local.get("privateKey", (value) => {
      keyStore.set(value.privateKey);
      resolve(value.privateKey);
    });
  });
}
