import type { Profile } from '$lib/types/profile';
import { Page } from '$lib/types';
import { writable, type Writable } from 'svelte/store';
import type { Tabs } from 'webextension-polyfill';
import { BrowserUtil } from '$lib/utility';
import type { Duration, SessionManager } from '$lib/types';
import { sessionController } from '$lib/controllers/session.controller';
import { browserController } from '$lib/controllers';
import { web } from '$lib/utility';

const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const duration: Writable<Duration> = writable({
	name: 'One time',
	value: 0
});
const theme: Writable<string> = writable('dark');
const currentPage: Writable<Page> = writable(Page.Home);

// Reactive store for current tab that updates on navigation
const currentTab: Writable<Tabs.Tab | undefined> = writable(undefined);

// Initialize current tab and set up listeners
if (typeof document !== 'undefined') {
	// Initial fetch
	BrowserUtil.getCurrentTab().then((tab) => {
		currentTab.set(tab);
	});

	// Listen for tab activation changes
	web.tabs.onActivated.addListener(async (activeInfo) => {
		const tab = await web.tabs.get(activeInfo.tabId);
		currentTab.set(tab);
	});

	// Listen for URL changes within the same tab
	web.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
		if (changeInfo.url || changeInfo.status === 'complete') {
			// Check if this is the active tab
			const activeTab = await BrowserUtil.getCurrentTab();
			if (activeTab && activeTab.id === tabId) {
				currentTab.set(tab);
			}
		}
	});
}

let sessionData: SessionManager;
if (typeof document !== 'undefined') sessionData = sessionController();
else sessionData = { getById: async () => Promise.resolve({}) };

export {
	currentPage,
	currentTab,
	duration,
	profiles,
	theme,
	userProfile,
	browserController as browser,
	sessionData
};
