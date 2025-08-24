import { getDuration, urlToDomain } from '$lib/utility';
import { web } from '$lib/utility';

import type { Browser, Profile, WebSite } from '$lib/types';
import { backgroundController } from './background.controller';

const createBrowserController = (): Browser => {
	const get = async (key: string): Promise<{ [key: string]: unknown }> => {
		try {
			const result = await web?.storage?.local?.get(key);
			return result;
		} catch (err) {
			return Promise.reject(err);
		}
	};
	const set = async (items: { [key: string]: unknown }): Promise<void> => {
		try {
			const result = await web?.storage?.local?.set(items);
			return result;
		} catch (err) {
			return Promise.reject(err);
		}
	};

	const getCurrentTab = async (): Promise<browser.Tabs.Tab> => {
		const tabs = await web.tabs.query({ active: true, currentWindow: true });
		return tabs[0];
	};
	const injectJsInTab = async (tab: browser.Tabs.Tab, jsFileName: string): Promise<void> => {
		try {
			await web.scripting.executeScript({
				target: { tabId: tab.id as number },
				files: [jsFileName]
			});
			return;
		} catch (e) {
			// Check if this is a "No tab with id" error - which can happen if tab was closed
			if (e instanceof Error && e.message && e.message.includes('No tab with id')) {
				// Tab was closed, we can safely ignore this error
				return;
			}
			
			// Check if this is an extensions gallery error or other restricted page
			if (e instanceof Error && e.message && 
				(e.message.includes('extensions gallery cannot be scripted') || 
				 e.message.includes('Cannot access') ||
				 e.message.includes('restricted') ||
				 e.message.includes('chrome://') ||
				 e.message.includes('chrome-extension://'))) {
				// These are expected errors for restricted pages, ignore silently
				return;
			}
			
			// Log other unexpected errors for debugging
			console.error(tab.id, tab.url);
			console.error('Error injecting Nostr Provider', e);
			return Promise.reject(e);
		}
	};
	const injectJsinAllTabs = async (jsFileName: string): Promise<void> => {
		const tabs = await web.tabs.query({});
		for (const tab of tabs) {
			try {
				// Skip Chrome internal pages, extensions, and other special URLs
				if (!tab.url || 
					tab.url.startsWith('chrome://') || 
					tab.url.startsWith('chrome-extension://') ||
					tab.url.startsWith('moz-extension://') ||
					tab.url.startsWith('edge-extension://') ||
					tab.url.startsWith('about:') ||
					tab.url.startsWith('file://') ||
					tab.url === 'about:blank')
					continue;
				await injectJsInTab(tab, jsFileName);
			} catch (e) {
				console.log('Error injecting Nostr Provider', e);
			}
		}
	};
	const switchIcon = async (activeInfo: { tabId: number }) => {
		try {
			// Attempt to get the tab - this will fail if the tab no longer exists
			const tab = await web.tabs.get(activeInfo.tabId);
			const user: Profile = await backgroundController().getUserProfile();
			const domain = urlToDomain(tab.url || '');
			const webSites = user.data?.webSites as { [key: string]: WebSite };
			if (webSites !== undefined && domain in webSites) {
				web.action.setIcon({
					tabId: tab.id,
					path: 'assets/logo-on.png'
				});
			} else {
				web.action.setIcon({
					tabId: tab.id,
					path: 'assets/logo-off.png'
				});
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('No tab with id')) {
				return;
			}
			throw error;
		}
	};
	const createWindow = async (url: string): Promise<browser.Windows.Window> => {
		return web.windows.create({
			url: web.runtime.getURL(url),
			width: 400,
			height: 580,
			type: 'popup'
		});
	};

	const sendAuthorizationResponse = (
		yes: boolean,
		choice: number,
		url: string | undefined,
		requestId: string | undefined
	) => {
		console.log('[Popup] Sending authorization response:', { yes, choice, url, requestId });
		
		getCurrentTab().then((tab) => switchIcon({ tabId: tab.id as number }));
		
		const message = {
			prompt: true,
			response: {
				status: yes ? 'success' : 'error',
				error: !yes,
				permission: {
					always: choice === 1,
					duration: getDuration(choice),
					accept: yes,
					reject: !yes
				}
			},
			ext: 'keys.band',
			url,
			requestId
		};
		
		console.log('[Popup] Sending message:', message);
		
		return web.runtime.sendMessage(message);
	};

	return {
		get,
		set,
		getCurrentTab,
		injectJsInTab,
		injectJsinAllTabs,
		createWindow,
		sendAuthorizationResponse,
		switchIcon
	};
};

export const browserController: Browser = createBrowserController();