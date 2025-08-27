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
import { getWebSiteOrCreate, getNewWebSitePermission } from './profile-utils';

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
export const ProfileUtil = { getWebSiteOrCreate, getNewWebSitePermission };

export * from '$lib/utility/utils';
