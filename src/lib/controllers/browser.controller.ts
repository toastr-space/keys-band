import { getDuration, urlToDomain, web } from '$lib/utility/utils';
import type { Tabs, Windows } from 'webextension-polyfill';

import type { Browser, Profile, WebSite } from '$lib/types';
import type { AuthorizationPromptKind } from '$lib/types/background';
import { backgroundController } from './background.controller';

const RESTRICTED_URL_PREFIXES = ['chrome://', 'chrome-extension://', 'moz-extension://', 'about:'];

const isRestrictedUrl = (url: string): boolean =>
	RESTRICTED_URL_PREFIXES.some((prefix) => url.includes(prefix)) ||
	url.includes('extensions gallery cannot be scripted') ||
	url.includes('showing error page') ||
	url.includes('Cannot access') ||
	url.includes('restricted');

const getActionApi = () => web.action || web.browserAction;

const getFallbackAuthorizationPromptKind = (): AuthorizationPromptKind => {
	if (__BROWSER__ === 'chrome') {
		return 'sidepanel';
	}

	if (__BROWSER__ === 'firefox') {
		return 'sidebar';
	}

	return 'popup';
};

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

	const getCurrentTab = async (): Promise<Tabs.Tab> => {
		const tabs = await web.tabs.query({ active: true, currentWindow: true });
		return tabs[0];
	};
	const injectJsInTab = async (tab: Tabs.Tab, jsFileName: string): Promise<void> => {
		try {
			// Use scripting API for Chrome (MV3) or tabs.executeScript for Firefox (MV2)
			if (web.scripting) {
				await web.scripting.executeScript({
					target: { tabId: tab.id as number },
					files: [jsFileName]
				});
			} else if (web.tabs.executeScript) {
				await web.tabs.executeScript(tab.id as number, {
					file: jsFileName
				});
			}
			return;
		} catch (e) {
			// Check if this is a "No tab with id" error - which can happen if tab was closed
			if (e instanceof Error && e.message && e.message.includes('No tab with id')) {
				// Tab was closed, we can safely ignore this error
				return;
			}

			// Check if this is an extensions gallery error or other restricted page
			if (e instanceof Error && e.message && isRestrictedUrl(e.message)) {
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
				if (
					!tab.url ||
					tab.url.startsWith('edge-extension://') ||
					tab.url.startsWith('file://') ||
					tab.url === 'about:blank' ||
					isRestrictedUrl(tab.url)
				) {
					continue;
				}

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

			// Use browserAction for Firefox (MV2) or action for Chrome (MV3)
			const actionApi = getActionApi();
			if (!actionApi) return;

			if (webSites !== undefined && domain in webSites) {
				actionApi.setIcon({
					tabId: tab.id,
					path: 'assets/logo-on.png'
				});
			} else {
				actionApi.setIcon({
					tabId: tab.id,
					path: 'assets/logo-off.png'
				});
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('No tab with id')) {
				return;
			}
			// Silently ignore action API errors on Firefox
			if (error instanceof Error && error.message.includes('action is undefined')) {
				return;
			}
			throw error;
		}
	};
	const setPendingRequestsBadge = async (count: number): Promise<void> => {
		const actionApi = getActionApi();
		if (!actionApi) return;

		const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
		const title =
			count > 0 ? `Keys.Band - ${count} pending request${count === 1 ? '' : 's'}` : 'Keys.Band';

		await Promise.all([
			actionApi.setBadgeBackgroundColor?.({ color: '#ef4444' }),
			actionApi.setBadgeTextColor?.({ color: '#ffffff' }),
			actionApi.setBadgeText?.({ text }),
			actionApi.setTitle?.({ title })
		]);
	};
	const createWindow = async (url: string): Promise<Windows.Window> => {
		return web.windows.create({
			url: web.runtime.getURL(url),
			width: 400,
			height: 580,
			type: 'popup'
		});
	};
	const openAuthorizationPrompt = async (
		url: string,
		sender?: { tab?: Tabs.Tab | undefined }
	): Promise<AuthorizationPromptKind> => {
		const sidePanelUrl = url.replace(/^popup\.html/, 'sidepanel.html');

		try {
			if (
				__BROWSER__ === 'chrome' &&
				typeof chrome !== 'undefined' &&
				chrome.sidePanel &&
				sender?.tab?.id !== undefined &&
				sender.tab.windowId !== undefined
			) {
				await chrome.sidePanel.setOptions({
					tabId: sender.tab.id,
					path: sidePanelUrl,
					enabled: true
				});
				try {
					await chrome.sidePanel.open({
						tabId: sender.tab.id,
						windowId: sender.tab.windowId
					});
				} catch (error) {
					console.warn('Unable to auto-open Chrome side panel, waiting for toolbar click:', error);
				}
				return 'sidepanel';
			}

			if (__BROWSER__ === 'firefox' && web.sidebarAction) {
				const sidebarUrl = web.runtime.getURL(sidePanelUrl);
				if (sender?.tab?.id !== undefined && web.sidebarAction.setPanel) {
					await web.sidebarAction.setPanel({
						tabId: sender.tab.id,
						panel: sidebarUrl
					});
				} else if (web.sidebarAction.setPanel) {
					await web.sidebarAction.setPanel({ panel: sidebarUrl });
				}

				if ('open' in web.sidebarAction && typeof web.sidebarAction.open === 'function') {
					try {
						await web.sidebarAction.open();
					} catch (error) {
						console.warn(
							'Unable to auto-open Firefox sidebar, waiting for user to open it:',
							error
						);
					}
				}

				return 'sidebar';
			}
		} catch (error) {
			console.error('Error opening authorization panel:', error);
		}

		const fallbackPromptKind = getFallbackAuthorizationPromptKind();
		if (fallbackPromptKind !== 'popup') {
			return fallbackPromptKind;
		}

		await createWindow(url);
		return 'popup';
	};

	const sendAuthorizationResponse = (
		yes: boolean,
		choice: number,
		url: string | undefined,
		requestId: string | undefined,
		promptContext?: AuthorizationPromptKind
	) => {
		console.log('[Popup] Sending authorization response:', {
			yes,
			choice,
			url,
			requestId,
			promptContext
		});

		getCurrentTab().then((tab) => switchIcon({ tabId: tab.id as number }));

		const message = {
			prompt: true,
			promptContext,
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
		openAuthorizationPrompt,
		setPendingRequestsBadge,
		sendAuthorizationResponse,
		switchIcon
	};
};

export const browserController: Browser = createBrowserController();
