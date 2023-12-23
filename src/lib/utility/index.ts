import {
	getCurrentTab,
	injectJsinAllTabs,
	createWindow,
	sendAuthorizationResponse
} from './browser-utils';
import {
	checkNSEC,
	defaultWebNotificationSettings,
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
	getCurrentTab,
	injectJsinAllTabs,
	createWindow,
	sendAuthorizationResponse
};
export const NostrUtil = {
	checkNSEC,
	defaultWebNotificationSettings,
	getMetadata,
	publish,
	getRelays,
	pushRelays,
	getRelaysList,
	createProfileMetadata,
	prepareRelayPool
};
export const ProfileUtil = { getWebSiteOrCreate, getNewWebSitePermission };

export * from './utils'