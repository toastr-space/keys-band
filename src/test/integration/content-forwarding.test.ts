import { vi, describe, it, expect, beforeAll } from 'vitest';

const sendMessage = vi.fn();

beforeAll(async () => {
	(globalThis as any).chrome = {
		runtime: { getURL: (p: string) => `chrome-extension://test/${p}`, sendMessage, lastError: undefined }
	};
	// @ts-expect-error content.ts is a classic script, not a module
	await import('../../content');
});

const post = (data: any) =>
	window.dispatchEvent(new MessageEvent('message', { data, source: window, origin: 'https://site.example' }));

describe('content script forwarding (finding 4)', () => {
	it('forwards only id, type and params of a page request', () => {
		post({
			id: 'r1',
			ext: 'keys.band',
			type: 'signEvent',
			params: { event: { kind: 1 } },
			prompt: true,
			requestId: 'stolen',
			url: 'https://trusted.example'
		});
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage.mock.calls[0][0]).toEqual({
			id: 'r1',
			type: 'signEvent',
			params: { event: { kind: 1 } },
			ext: 'keys.band'
		});
	});

	it('drops malformed messages and page-sent responses', () => {
		sendMessage.mockClear();
		post({ id: 5, ext: 'keys.band', type: 'signEvent' });
		post({ id: 'r2', ext: 'keys.band', type: 'signEvent', response: { ok: true } });
		post({ id: 'r3', ext: 'other', type: 'signEvent' });
		expect(sendMessage).not.toHaveBeenCalled();
	});
});
