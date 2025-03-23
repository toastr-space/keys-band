import { userProfile } from '$lib/stores/data';
import { RelayAccess, type Profile, type Relay } from '$lib/types/profile.d';
import {
	SimplePool,
	type Event,
	type UnsignedEvent,
	finishEvent,
	getPublicKey,
	nip19
} from 'nostr-tools';
import { get, writable, type Writable } from 'svelte/store';

const default_relays = ['wss://nos.lol', 'wss://relay.damus.io', 'wss://nostr.wine'];

const available_default_relays: Writable<string[]> = writable([]);
const available_profile_relays: Writable<string[]> = writable([]);

const pool = new SimplePool();

// Track failed relays with timestamps to avoid repeated connection attempts
const failedRelays: Record<string, number> = {};
// Track last error log time to throttle console messages
let lastRelayErrorLog = 0;

/**
 * Attempts to connect to a relay and adds it to available relays if successful
 * - Skips relays that failed recently (within last minute)
 * - Throttles error logging to reduce console spam
 */
const checkRelays = async (url: string, isProfile: boolean = false) => {
	if (!url) return;
	
	// Skip reconnection attempts for relays that failed in the last minute
	const now = Date.now();
	if (failedRelays[url] && now - failedRelays[url] < 60000) {
		return;
	}
	
	try {
		await pool.ensureRelay(url);
		const available_relays = isProfile ? available_profile_relays : available_default_relays;
		if (!get(available_relays).includes(url))
			isProfile
				? available_profile_relays.set([...get(available_profile_relays), url])
				: available_default_relays.set([...get(available_default_relays), url]);
		
		// Clear from failed relays cache if connection is now successful
		if (failedRelays[url]) {
			delete failedRelays[url];
		}
	} catch (error: any) {
		// Mark as failed with current timestamp
		failedRelays[url] = now;
		
		// Throttle console logs to at most one per second to reduce spam
		if (now - lastRelayErrorLog > 1000) {
			console.log('Relay not available', url);
			lastRelayErrorLog = now;
		}
	}
};

const prepareRelayPool = async () => {
	default_relays.forEach((relay) => checkRelays(relay));
	if (get(userProfile)) {
		userProfile.subscribe(async (profile) => {
			if (!profile.data) return;
			const relays = profile.data?.relays as Relay[];
			for (const relay of relays) {
				checkRelays(relay?.url, true);
			}
		});
	}
};

const getRelaysList = (all: boolean = false): string[] => {
	let relays: string[] = [];
	if (all) relays = default_relays.concat(get(available_profile_relays));
	const user = get(userProfile);
	if (!user) relays = default_relays;
	else if (!user.data?.relays) relays = default_relays;
	else {
		const profile_relays = user.data?.relays as Relay[];
		if (profile_relays) relays = relays.concat(profile_relays.map((relay) => relay.url));
	}

	if (relays.length === 0) relays = default_relays;
	return relays;
};

const getMetadata = async (pubkey: string): Promise<Profile> => {
	const relays = getRelaysList();
	try {
		const event = await pool.get(relays, {
			authors: [pubkey],
			kinds: [0]
		});
		const metaData = JSON.parse(event?.content || '{}');
		return metaData;
	} catch (error: any) {
		return {};
	}
};

const getRelays = async (pubkey: string, all = false): Promise<Event | null> => {
	try {
		const event = await pool.get(getRelaysList(all), {
			kinds: [10002],
			authors: [pubkey]
		});
		return Promise.resolve(event);
	} catch (error: any) {
		return Promise.reject(error);
	}
};

const pushRelays = async (profile: Profile): Promise<void> => {
	const relays = profile.data?.relays as Relay[];
	const event: UnsignedEvent = {
		kind: 10002,
		content: '',
		pubkey: profile.data?.pubkey as string,
		tags: [],
		created_at: Math.floor(Date.now() / 1000)
	};
	const rlays = [];
	for (const relay of relays) {
		const new_relay = ['r', relay.url];
		if (relay.access === RelayAccess.READ) new_relay.push('read');
		else if (relay.access === RelayAccess.WRITE) new_relay.push('write');
		rlays.push(['r', relay.url]);
	}
	event['tags'] = rlays;
	return new Promise((resolve) => {
		const eventFinished = finishEvent(event, profile.data?.privateKey as string);
		pool.publish(getRelaysList(), eventFinished);
		console.log('pushed relays');
		resolve();
	});
};

const createProfileMetadata = async (name: string, key: string): Promise<boolean> => {
	const pk = await checkNSEC(key);
	const event: UnsignedEvent = {
		kind: 0,
		created_at: Math.floor(Date.now() / 1000),
		tags: [],
		content: JSON.stringify({
			name: name
		}),
		pubkey: getPublicKey(pk)
	};
	const signedEvent = finishEvent(event, pk);
	await publish(signedEvent);
	return Promise.resolve(true);
};

const publish = async (event: any): Promise<void> => {
	return new Promise((resolve) => {
		pool.publish(getRelaysList(), event);
		resolve();
	});
};

const checkNSEC = async (value: string): Promise<string> => {
	// eslint-disable-next-line no-async-promise-executor
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
};

export {
	checkNSEC,
	getMetadata,
	publish,
	getRelays,
	pushRelays,
	getRelaysList,
	createProfileMetadata,
	prepareRelayPool
};
