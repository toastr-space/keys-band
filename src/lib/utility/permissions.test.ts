import { describe, it, expect } from 'vitest';
import {
	urlToOrigin,
	capabilityFor,
	describeCapability,
	loginDetails,
	getAllowKind,
	setPermission,
	revokePermission,
	activeGrants
} from './permissions';
import { AllowKind } from '$lib/types';
import type { WebSite } from '$lib/types';

const event = (kind: number) => ({ kind, content: 'hi', tags: [['p', 'abc']], created_at: 1 });
const emptySite = (): WebSite => ({ auth: false, permissions: {}, history: [] });
const inOneHour = () => new Date(Date.now() + 3600_000);

describe('urlToOrigin', () => {
	it('keeps scheme and port so http and https never share a grant', () => {
		expect(urlToOrigin('https://example.com/path?q=1')).toBe('https://example.com');
		expect(urlToOrigin('http://example.com/')).toBe('http://example.com');
		expect(urlToOrigin('https://example.com:8443/')).toBe('https://example.com:8443');
	});

	it('rejects non-http(s) and invalid URLs', () => {
		expect(urlToOrigin('file:///etc/passwd')).toBe('');
		expect(urlToOrigin('chrome-extension://abc/popup.html')).toBe('');
		expect(urlToOrigin('null')).toBe('');
		expect(urlToOrigin('')).toBe('');
	});
});

describe('capabilityFor', () => {
	it('scopes signing per event kind', () => {
		expect(capabilityFor('signEvent', event(1))).toBe('signEvent:1');
		expect(capabilityFor('signEvent', event(5))).toBe('signEvent:5');
	});

	it('rejects malformed events', () => {
		expect(capabilityFor('signEvent', undefined)).toBeNull();
		expect(capabilityFor('signEvent', { ...event(1), kind: '1' })).toBeNull();
		expect(capabilityFor('signEvent', { ...event(1), kind: 1.5 })).toBeNull();
		expect(capabilityFor('signEvent', { ...event(1), kind: 70000 })).toBeNull();
		expect(capabilityFor('signEvent', { ...event(1), tags: [[1]] })).toBeNull();
		expect(capabilityFor('signEvent', { ...event(1), content: undefined })).toBeNull();
	});

	it('validates nip04 params and rejects unknown methods', () => {
		expect(capabilityFor('nip04.decrypt', { peer: 'a', ciphertext: 'b' })).toBe('nip04.decrypt');
		expect(capabilityFor('nip04.encrypt', { peer: 'a', plaintext: 'b' })).toBe('nip04.encrypt');
		expect(capabilityFor('nip04.decrypt', { peer: 'a' })).toBeNull();
		expect(capabilityFor('getPublicKey', {})).toBe('getPublicKey');
		expect(capabilityFor('replaceURL', {})).toBeNull();
		expect(capabilityFor('__proto__', {})).toBeNull();
	});
});

describe('login-style events', () => {
	const login = (kind: number, tags: string[][]) => ({ kind, content: '', tags, created_at: 1 });

	it('scope a relay login to that relay', () => {
		const event = login(22242, [['relay', 'wss://Relay.Example/'], ['challenge', 'c']]);
		expect(capabilityFor('signEvent', event)).toBe('signEvent:22242:wss://relay.example');
		expect(capabilityFor('signEvent', login(22242, [['relay', 'wss://relay.example/nostr/']]))).toBe(
			'signEvent:22242:wss://relay.example/nostr'
		);
	});

	it('scope an HTTP login to the server it is for', () => {
		const event = login(27235, [['u', 'https://nostr.build/api/v2/upload?x=1'], ['method', 'POST']]);
		expect(capabilityFor('signEvent', event)).toBe('signEvent:27235:https://nostr.build');
		expect(loginDetails(event)).toEqual(['Method: POST', 'URL: https://nostr.build/api/v2/upload?x=1']);
	});

	it('scope a Blossom authorization to its action', () => {
		expect(capabilityFor('signEvent', login(24242, [['t', 'delete']]))).toBe('signEvent:24242:delete');
	});

	it('reject login events without a valid target', () => {
		expect(capabilityFor('signEvent', login(22242, []))).toBeNull();
		expect(capabilityFor('signEvent', login(22242, [['relay', 'https://relay.example']]))).toBeNull();
		expect(capabilityFor('signEvent', login(27235, [['u', 'javascript:alert(1)']]))).toBeNull();
		expect(capabilityFor('signEvent', login(24242, [['t', 'DROP TABLE']]))).toBeNull();
	});

	it('are described with their target', () => {
		expect(describeCapability('signEvent:22242:wss://relay.example')).toBe('Log in to relay wss://relay.example');
		expect(describeCapability('signEvent:27235:https://nostr.build')).toBe('Log in to https://nostr.build (HTTP auth)');
		expect(describeCapability('signEvent:24242:delete')).toBe('Media server (Blossom): delete');
	});
});

describe('describeCapability', () => {
	it('names the kind being signed', () => {
		expect(describeCapability('signEvent:5')).toBe('Sign: Deletion request (kind 5)');
		expect(describeCapability('signEvent:31337')).toBe('Sign: Kind 31337 event');
		expect(describeCapability('nip04.decrypt')).toBe('Decrypt your direct messages');
	});
});

describe('getAllowKind / setPermission', () => {
	it('a grant covers only its own capability', () => {
		const site = setPermission(emptySite(), 'signEvent:1', {
			always: true,
			accept: true,
			reject: false,
			duration: new Date()
		});
		expect(getAllowKind(site, 'signEvent:1')).toBe(AllowKind.AlWaysAllow);
		expect(getAllowKind(site, 'signEvent:5')).toBe(AllowKind.Nothing);
		expect(getAllowKind(site, 'nip04.decrypt')).toBe(AllowKind.Nothing);
		expect(getAllowKind(site, 'getPublicKey')).toBe(AllowKind.Nothing);
	});

	it('time-limited grants expire and one-time grants are never remembered', () => {
		const timed = setPermission(emptySite(), 'getPublicKey', {
			always: false,
			accept: true,
			reject: false,
			duration: inOneHour()
		});
		expect(getAllowKind(timed, 'getPublicKey')).toBe(AllowKind.AllowForSession);
		expect(getAllowKind(timed, 'getPublicKey', new Date(Date.now() + 7200_000))).toBe(
			AllowKind.Nothing
		);

		const oneTime = setPermission(emptySite(), 'getPublicKey', {
			always: false,
			accept: true,
			reject: false,
			duration: new Date()
		});
		expect(getAllowKind(oneTime, 'getPublicKey')).toBe(AllowKind.Nothing);
	});

	it('fails closed on an invalid expiry and ignores the legacy domain-wide permission', () => {
		const invalid = setPermission(emptySite(), 'getPublicKey', {
			always: false,
			accept: true,
			reject: false,
			duration: new Date('nonsense')
		});
		expect(getAllowKind(invalid, 'getPublicKey')).toBe(AllowKind.Nothing);

		const legacy = {
			...emptySite(),
			permission: { always: true, accept: true, reject: false }
		} as WebSite;
		expect(getAllowKind(legacy, 'signEvent:1')).toBe(AllowKind.Nothing);
	});

	it('remembers rejections', () => {
		const site = setPermission(emptySite(), 'nip04.decrypt', {
			always: true,
			accept: false,
			reject: true,
			duration: new Date()
		});
		expect(getAllowKind(site, 'nip04.decrypt')).toBe(AllowKind.AlwaysReject);
	});
});

describe('revokePermission / activeGrants', () => {
	it('lists only active decisions and revokes one or all', () => {
		let site = emptySite();
		const always = { always: true, accept: true, reject: false, duration: new Date() };
		site = setPermission(site, 'getPublicKey', always);
		site = setPermission(site, 'signEvent:1', always);
		site = setPermission(site, 'signEvent:7', { ...always, always: false });

		expect(activeGrants(site).map((g) => g.capability)).toEqual(['getPublicKey', 'signEvent:1']);
		expect(activeGrants(revokePermission(site, 'signEvent:1')).map((g) => g.capability)).toEqual([
			'getPublicKey'
		]);
		expect(activeGrants(revokePermission(site))).toEqual([]);
	});
});
