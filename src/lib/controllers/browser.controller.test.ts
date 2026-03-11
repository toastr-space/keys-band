import { beforeEach, describe, expect, it, vi } from 'vitest';
import browser from 'webextension-polyfill';
import type { Tabs } from 'webextension-polyfill';

vi.mock('./background.controller', () => ({
	backgroundController: () => ({
		getUserProfile: vi.fn().mockResolvedValue({
			data: {
				webSites: {}
			}
		})
	})
}));

import { browserController } from './browser.controller';

describe('browserController.openAuthorizationPrompt', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete (globalThis as { chrome?: unknown }).chrome;
	});

	it('opens the Chrome side panel for authorization requests', async () => {
		(globalThis as { __BROWSER__?: string }).__BROWSER__ = 'chrome';

		const setOptions = vi.fn().mockResolvedValue(undefined);
		const open = vi.fn().mockResolvedValue(undefined);
		(globalThis as { chrome?: unknown }).chrome = {
			sidePanel: {
				setOptions,
				open
			}
		};

		const result = await browserController.openAuthorizationPrompt('popup.html?query=test', {
			tab: { id: 12, windowId: 7 } as Tabs.Tab
		});

		expect(result).toBe('sidepanel');
		expect(setOptions).toHaveBeenCalledWith({
			tabId: 12,
			path: 'sidepanel.html?query=test',
			enabled: true
		});
		expect(open).toHaveBeenCalledWith({ tabId: 12, windowId: 7 });
	});

	it('opens the Firefox sidebar for authorization requests', async () => {
		(globalThis as { __BROWSER__?: string }).__BROWSER__ = 'firefox';

		const web = browser as typeof browser & {
			runtime: { getURL: ReturnType<typeof vi.fn> };
			sidebarAction: {
				setPanel: ReturnType<typeof vi.fn>;
				open: ReturnType<typeof vi.fn>;
			};
		};

		web.runtime.getURL.mockImplementation((path: string) => `moz-extension://test/${path}`);

		const result = await browserController.openAuthorizationPrompt('popup.html?query=test', {
			tab: { id: 4 } as Tabs.Tab
		});

		expect(result).toBe('sidebar');
		expect(web.sidebarAction.setPanel).toHaveBeenCalledWith({
			tabId: 4,
			panel: 'moz-extension://test/sidepanel.html?query=test'
		});
		expect(web.sidebarAction.open).toHaveBeenCalled();
	});

	it('keeps Chrome on the side panel flow when it cannot auto-open', async () => {
		(globalThis as { __BROWSER__?: string }).__BROWSER__ = 'chrome';

		const web = browser as typeof browser & {
			windows: { create: ReturnType<typeof vi.fn> };
		};

		const result = await browserController.openAuthorizationPrompt('popup.html?query=test');

		expect(result).toBe('sidepanel');
		expect(web.windows.create).not.toHaveBeenCalled();
	});
});
