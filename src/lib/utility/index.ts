import { getCurrentTab, injectJsinAllTabs, createWindow, sendAuthorizationResponse } from "./browser-utils";
import { getMetadata, publish, getRelays, pushRelays, getRelaysList, createProfileMetadata, prepareRelayPool } from "./nostr-util";
import { getWebSiteOrCreate, getNewWebSitePermission } from "./profile-utils";

export const BrowserUtil = { getCurrentTab, injectJsinAllTabs, createWindow, sendAuthorizationResponse }
export const NostrUtil = { getMetadata, publish, getRelays, pushRelays, getRelaysList, createProfileMetadata, prepareRelayPool }
export const ProfileUtil = { getWebSiteOrCreate, getNewWebSitePermission }