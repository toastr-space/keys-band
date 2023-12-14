import { getMetadata, publish } from "./nostr-util";
import { getCurrentTab } from "./browser-utils";

export const NostrUtil = { getMetadata, publish }
export const BrowserUtil = { getCurrentTab }