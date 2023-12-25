// See https://kit.svelte.dev/docs/types#app

import type { Event, UnsignedEvent } from 'nostr-tools';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	interface Window {
		nostr?: {
			getPublicKey: () => Promise<string>;
			signEvent: (event: UnsignedEvent) => Event;
			getRelays: () => Promise<{ [url: string]: { read: boolean; write: boolean } }>;
			nip04: {
				encrypt: (pubkey: string, plaintext: string) => Promise<string>;
				decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
			};
		};
	}
}

export {};
