import { vi } from 'vitest';
import type { Browser, Tabs, Windows } from 'webextension-polyfill';
import type { Browser as CustomBrowser } from '$lib/types/profile';

export const mockBrowser: CustomBrowser = {
	get: vi.fn().mockResolvedValue({}),
	set: vi.fn().mockResolvedValue(undefined),
	getCurrentTab: vi.fn().mockResolvedValue({
		id: 1,
		url: 'https://example.com',
		title: 'Example'
	} as Tabs.Tab),
	injectJsInTab: vi.fn().mockResolvedValue(undefined),
	injectJsinAllTabs: vi.fn().mockResolvedValue(undefined),
	createWindow: vi.fn().mockResolvedValue({
		id: 1,
		tabs: [],
		focused: false,
		incognito: false,
		alwaysOnTop: false
	} as Windows.Window),
	openAuthorizationPrompt: vi.fn().mockResolvedValue('popup'),
	setPendingRequestsBadge: vi.fn().mockResolvedValue(undefined),
	switchIcon: vi.fn().mockResolvedValue(undefined),
	sendAuthorizationResponse: vi.fn().mockResolvedValue(undefined)
};

export const mockWebExtensionPolyfill = {
	runtime: {
		onInstalled: {
			addListener: vi.fn()
		},
		onStartup: {
			addListener: vi.fn()
		}
	},
	tabs: {
		onActivated: {
			addListener: vi.fn()
		}
	}
};
