import { vi } from 'vitest';
import { beforeEach } from 'vitest';

beforeEach(() => {
	vi.clearAllMocks();
});

vi.mock('webextension-polyfill', () => ({
	default: {
		runtime: {
			getURL: vi.fn((path: string) => `moz-extension://test/${path}`),
			onMessage: {
				addListener: vi.fn(),
				removeListener: vi.fn()
			},
			sendMessage: vi.fn()
		},
		scripting: {
			executeScript: vi.fn().mockResolvedValue(undefined)
		},
		tabs: {
			query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
			create: vi.fn(),
			get: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
			onActivated: {
				addListener: vi.fn(),
				removeListener: vi.fn()
			},
			onUpdated: {
				addListener: vi.fn(),
				removeListener: vi.fn()
			}
		},
		windows: {
			create: vi.fn(),
			remove: vi.fn(),
			getAll: vi.fn().mockResolvedValue([])
		},
		sidebarAction: {
			setPanel: vi.fn(),
			open: vi.fn()
		},
		storage: {
			local: {
				get: vi.fn().mockResolvedValue({}),
				set: vi.fn().mockResolvedValue(undefined)
			}
		}
	}
}));
