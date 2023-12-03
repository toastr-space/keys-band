import type { NotificationSetting, Profile, Relay, UserProfile } from "$lib/types/profile";
import { writable, type Writable } from "svelte/store";

export const keyStore: Writable<string> = writable('');
export const userProfile: Writable<UserProfile> = writable({});
export const profiles: Writable<Profile[]> = writable([]);
export const webSites: Writable<unknown> = writable();
export const relays: Writable<Relay[]> = writable([]);
export const theme: Writable<string> = writable('dark');
export const webNotifications: Writable<NotificationSetting[]> = writable([]);
