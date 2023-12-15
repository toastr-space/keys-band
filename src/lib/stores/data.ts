import type { NotificationSetting, Profile } from "$lib/types/profile";
import { Page } from "$lib/types/page";
import { get, readable, writable, type Writable } from "svelte/store";
import { BrowserUtil, ProfileUtil } from "$lib/utility";
import { urlToDomain } from "./utils";

export const webNotifications: Writable<NotificationSetting[]> = writable([]);
const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const theme: Writable<string> = writable('dark');
const currentPage: Writable<Page> = writable(Page.Home);

const timeStop = readable(new Date(), (set) => {
    BrowserUtil.getCurrentTab().then((tab: chrome.tabs.Tab) => {
        const domain = urlToDomain(new URL(tab.url || '').href);
        console.log(domain);
        set(new Date(ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission?.authorizationStop || '') || new Date());
        const interval = setInterval(() => {
            set(new Date(ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission?.authorizationStop || '') || new Date());
        }, 1000);
        return () => clearInterval(interval);
    })
});

export { userProfile, profiles, theme, currentPage, timeStop }
