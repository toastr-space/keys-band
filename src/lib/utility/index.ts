import { getMetadata, publish } from "./nostr-util";
import { getCurrentTab, injectJsinAllTabs, createWindow, sendAuthorizationResponse } from "./browser-utils";
import { getWebSiteOrCreate } from "./profile-utils";

export const NostrUtil = { getMetadata, publish }
export const BrowserUtil = { getCurrentTab, injectJsinAllTabs, createWindow, sendAuthorizationResponse }
export const ProfileUtil = { getWebSiteOrCreate }