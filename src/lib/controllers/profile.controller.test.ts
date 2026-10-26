import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateProfileId, validateProfile, withoutKeys } from './profile.controller';
import type { Profile } from '$lib/types/profile';

vi.mock('$lib/stores/data', () => ({
	profiles: vi.fn(),
	userProfile: vi.fn(),
	duration: vi.fn(),
	theme: vi.fn(),
	browser: {
		get: vi.fn().mockResolvedValue({}),
		set: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('$lib/utility', () => ({
	ProfileUtil: {
		getWebSiteOrCreate: vi.fn(() => ({
			auth: false,
			permission: { always: false, accept: false, reject: false },
			history: []
		})),
		getNewWebSitePermission: vi.fn((duration, site) => ({
			...site,
			permission: {
				always: duration.always,
				accept: duration.accept,
				reject: duration.reject,
				authorizationStop: duration.duration.toString()
			}
		}))
	},
	NostrUtil: {
		checkNSEC: vi.fn().mockResolvedValue('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
		pushRelays: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('nostr-tools', () => ({
	getPublicKey: vi.fn().mockReturnValue('test-pubkey')
}));

describe('Profile Controller - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateProfile', () => {
		it('should validate a valid profile', () => {
			const validProfile: Profile = {
				id: 'test-id',
				name: 'Test Profile',
				data: {
					pubkey: 'test-pubkey',
					privateKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					webSites: {},
					relays: []
				}
			};

			expect(() => {
				validateProfile(validProfile);
			}).not.toThrow();
		});

		it('should reject profile without required fields', () => {
			const invalidProfile: Profile = {
				id: 'test-id',
				name: 'Test'
			};

			expect(() => {
				validateProfile(invalidProfile);
			}).toThrow('Invalid profile');
		});

		it('should reject profile with short name', () => {
			const invalidProfile: Profile = {
				id: 'test-id',
				name: 'X',
				data: {
					pubkey: 'test-pubkey',
					privateKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					webSites: {},
					relays: []
				}
			};

			expect(() => {
				validateProfile(invalidProfile);
			}).toThrow('Profile name must be at least 2 characters');
		});
	});

	describe('locked vault', () => {
		it('accepts a profile whose key is not loaded', () => {
			expect(() =>
				validateProfile({ id: 'test-id', name: 'Test', data: { pubkey: 'test-pubkey' } })
			).not.toThrow();
		});

		it('strips private keys before profiles are stored', () => {
			const stored = withoutKeys([
				{ id: 'a', name: 'A', data: { pubkey: 'pa', privateKey: 'secret', relays: [] } },
				{ id: 'b', name: 'B' }
			]);
			expect(JSON.stringify(stored)).not.toContain('secret');
			expect(stored[0].data).toEqual({ pubkey: 'pa', relays: [] });
			expect(stored[1]).toEqual({ id: 'b', name: 'B' });
		});
	});

	describe('generateProfileId', () => {
		it('should generate profile ID from private key', () => {
			const privateKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
			const profileId = generateProfileId(privateKey);
			expect(typeof profileId).toBe('string');
			expect(profileId.length).toBeGreaterThan(0);
		});
	});
});

describe('Profile Controller - Console Executable Functions', () => {
	it('generateProfileId can be executed in console', () => {
		const privateKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const profileId = generateProfileId(privateKey);
		expect(typeof profileId).toBe('string');
		expect(profileId.length).toBeGreaterThan(0);
	});
});
