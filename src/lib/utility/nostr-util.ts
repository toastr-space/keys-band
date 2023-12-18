import type { Profile, Relay } from "$lib/types/profile";
import { SimplePool, type Event, type UnsignedEvent } from "nostr-tools";

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

const getRelays = async (pubkey: string): Promise<Event | null> => {
    try {
        const event = await pool
            .get(_relays, {
                kinds: [10002],
                authors: [pubkey]
            })
        return Promise.resolve(event);
    } catch (error: any) {
        return Promise.reject(error);
    }
}

const pushRelays = async (relays: Relay[], profile: Profile): Promise<void> => {
    const event: UnsignedEvent = {
        kind: 10002,
        content: "",
        pubkey: profile.data?.pubkey as string,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
    }

    const rlays = []
    for (const relay of relays) {
        rlays.push(["r", relay.url]);
    }
    event["tags"] = rlays;
}

const publish = async (event: any): Promise<void> => {
    return new Promise((resolve) => {
        pool.publish(_relays, event)
        resolve();
    })
}

export { getMetadata, publish, getRelays }