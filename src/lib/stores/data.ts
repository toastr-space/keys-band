import type { Profile } from '$lib/types/profile';
import { Page } from '$lib/types';
import { get, readable, writable, type Writable } from 'svelte/store';
import type { Tabs } from 'webextension-polyfill';
import { BrowserUtil, ProfileUtil } from '$lib/utility';
import type { Duration, SessionManager } from '$lib/types';
import { urlToDomain } from '../utility/utils';
import { sessionController } from '$lib/controllers/session.controller';
import { browserController } from '$lib/controllers';

const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const duration: Writable<Duration> = writable({
	name: 'One time',
	value: 0
});
const theme: Writable<string> = writable('dark');
const currentPage: Writable<Page> = writable(Page.Home);

const isAlways: Writable<boolean> = writable(false);
const isAccepted: Writable<boolean> = writable(false);

const timeStop = readable(new Date(), (set) => {
	BrowserUtil.getCurrentTab().then((tab: Tabs.Tab) => {
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

let sessionData: SessionManager;
if (typeof document !== 'undefined') sessionData = sessionController();
else sessionData = { getById: async () => Promise.resolve({}) };

export {
	currentPage,
	duration,
	isAccepted,
	isAlways,
	profiles,
	timeStop,
	theme,
	userProfile,
	browserController as browser,
	sessionData
};
