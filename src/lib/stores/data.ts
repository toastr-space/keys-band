import type { NotificationSetting, Profile } from "$lib/types/profile";
import { Page } from "$lib/types/page";
import { get, readable, writable, type Writable } from "svelte/store";
import { BrowserUtil, ProfileUtil } from "$lib/utility";

export const webNotifications: Writable<NotificationSetting[]> = writable([]);
const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const theme: Writable<string> = writable('dark');
const currentPage: Writable<Page> = writable(Page.Home);

const timeStop = readable(new Date(), (set) => {
    BrowserUtil.getCurrentTab().then((tab: chrome.tabs.Tab) => {
        const domain = new URL(tab.url || '').hostname;
        set(new Date(ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission?.authorizationStop || '') || new Date());
        const interval = setInterval(() => {
            set(new Date(ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission?.authorizationStop || '') || new Date());
        }, 500);
        return () => clearInterval(interval);
    })
});

export { userProfile, profiles, theme, currentPage, timeStop }
