import { browserController } from '$lib/controllers/browser.controller';
import {
	checkNSEC,
	getMetadata,
	publish,
	getRelays,
	pushRelays,
	getRelaysList,
	createProfileMetadata,
	prepareRelayPool
} from './nostr-utils';
import { getWebSiteOrCreate } from './profile-utils';

export const BrowserUtil = {
	...browserController
};
export const NostrUtil = {
	checkNSEC,
	getMetadata,
	publish,
	getRelays,
	pushRelays,
	getRelaysList,
	createProfileMetadata,
	prepareRelayPool
};
export const ProfileUtil = { getWebSiteOrCreate };

export * from '$lib/utility/utils';
export * from '$lib/utility/permissions';
