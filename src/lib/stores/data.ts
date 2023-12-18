import type { NotificationSetting, Profile } from '$lib/types/profile';
import { Page } from '$lib/types/page';
import { get, readable, writable, type Writable } from 'svelte/store';
import { BrowserUtil, ProfileUtil } from '$lib/utility';
import { urlToDomain } from './utils';

export const webNotifications: Writable<NotificationSetting[]> = writable([]);
const showNotification: Writable<boolean> = writable(false);
const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const theme: Writable<string> = writable('dark');
const currentPage: Writable<Page> = writable(Page.Home);

const isAlways: Writable<boolean> = writable(false);
const isAccepted: Writable<boolean> = writable(false);

const timeStop = readable(new Date(), (set) => {
	BrowserUtil.getCurrentTab().then((tab: chrome.tabs.Tab) => {
		const domain = urlToDomain(new URL(tab.url || '').href);
		const permission = ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission;
		isAccepted.set(permission?.accept || false);
		isAlways.set(permission?.always || false);
		set(new Date(permission?.authorizationStop || new Date()));
		const interval = setInterval(() => {
			const permission = ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission;
			isAccepted.set(permission?.accept || false);
			if (permission?.always) {
				isAlways.set(true);
				set(new Date());
				return;
			} else {
				isAlways.set(false);
				set(
					new Date(
						ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission
							?.authorizationStop || ''
					) || new Date()
				);
			}
		}, 500);
		return () => clearInterval(interval);
	});
});

export {
	userProfile,
	profiles,
	theme,
	currentPage,
	timeStop,
	isAlways,
	isAccepted,
	showNotification
};
