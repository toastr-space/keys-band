import type { NotificationSetting, Profile, Relay } from "$lib/types/profile";
import { Page } from "$lib/types/page";
import { writable, type Writable } from "svelte/store";

// export const keyStore: Writable<string> = writable('');
const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const webSites: Writable<unknown> = writable();
const relays: Writable<Relay[]> = writable([]);
const theme: Writable<string> = writable('dark');
export const webNotifications: Writable<NotificationSetting[]> = writable([]);

const currentPage: Writable<Page> = writable(Page.Home);

export { userProfile, profiles, theme, currentPage, relays, webSites }