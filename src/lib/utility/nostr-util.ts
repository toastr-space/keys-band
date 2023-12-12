import type { Profile } from "$lib/types/profile";
import { SimplePool } from "nostr-tools";

const _relays = ['wss://nos.lol'];
const pool = new SimplePool();

const getMetadata = async (pubkey: string): Promise<Profile> => {
    try {
        const event = await pool
            .get(_relays, {
                authors: [pubkey],
                kinds: [0]
            })
        const metaData = JSON.parse(event?.content || '{}');
        return metaData;
    } catch (error: any) {
        return {}
    }
}

const publish = async (event: any): Promise<void> => {
    return new Promise((resolve) => {
        pool.publish(_relays, event)
        resolve();
    })
}

export { getMetadata, publish }