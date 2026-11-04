import { vi, describe, it, expect, beforeEach } from 'vitest';
import { wordlist } from '@scure/bip39/wordlists/english';

const { local, sessionArea, area } = vi.hoisted(() => ({
	local: {} as Record<string, any>,
	sessionArea: {} as Record<string, any>,
	area: (data: Record<string, any>) => ({
		get: async (k: string) => (k in data ? { [k]: structuredClone(data[k]) } : {}),
		set: async (o: any) => Object.assign(data, structuredClone(o))
	})
}));

vi.mock('webextension-polyfill', () => ({
	default: { storage: { local: area(local), session: area(sessionArea) } }
}));

import {
	createVaultController,
	generatePassphrase,
	validatePassphrase,
	validatePin,
	MAX_PIN_ATTEMPTS,
	LOCK_NEVER,
	LOCK_ON_BROWSER_CLOSE
} from './vault.controller';

const PASS = 'correct horse battery staple';
const PIN = '482916';
const SK = 'a'.repeat(63) + '1';
let clock = 1_000_000;
// cheap KDF settings keep the tests fast; production uses N=2^17 / 2^15
const vault = createVaultController({
	vaultKdf: { N: 2 ** 10, r: 8, p: 1 },
	pinKdf: { N: 2 ** 8, r: 8, p: 1 },
	now: () => clock
});

const clear = (o: Record<string, any>) => Object.keys(o).forEach((k) => delete o[k]);
const restartBrowser = () => clear(sessionArea);

beforeEach(async () => {
	clear(local);
	clear(sessionArea);
	clock = 1_000_000;
	await vault.setup(PASS, PIN, { profile1: SK });
});

describe('vault setup and storage', () => {
	it('never writes the key, PIN or passphrase to disk in plaintext', async () => {
		expect(await vault.status()).toBe('unlocked');
		expect(await vault.getKeys()).toEqual({ profile1: SK });
		const disk = JSON.stringify(local);
		expect(disk).not.toContain(SK);
		expect(disk).not.toContain(PIN);
		expect(disk).not.toContain(PASS);
		expect(local.vault.kdf).toEqual({ name: 'scrypt', N: 1024, r: 8, p: 1 });
	});

	it('refuses weak passphrases and PINs, and a second setup', async () => {
		clear(local);
		await expect(vault.setup('short', PIN)).rejects.toThrow('at least 12');
		await expect(vault.setup('123456789012345', PIN)).rejects.toThrow('only digits');
		await expect(vault.setup(PASS, '123')).rejects.toThrow('4 to 8 digits');
		await expect(vault.setup(PASS, '123456789')).rejects.toThrow('4 to 8 digits');
		await vault.setup(PASS, PIN);
		await expect(vault.setup(PASS, PIN)).rejects.toThrow('already exists');
	});
});

describe('locking and unlocking', () => {
	it('locks and unlocks with the PIN', async () => {
		await vault.lock();
		expect(await vault.status()).toBe('locked');
		expect(await vault.getKeys()).toBeNull();
		await vault.unlockWithPin(PIN);
		expect(await vault.getKeys()).toEqual({ profile1: SK });
	});

	it(`wipes the PIN copy after ${MAX_PIN_ATTEMPTS} wrong PINs`, async () => {
		await vault.lock();
		for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
			await expect(vault.unlockWithPin('000000')).rejects.toThrow(
				`${MAX_PIN_ATTEMPTS - i} attempt(s) left`
			);
		}
		await expect(vault.unlockWithPin('000000')).rejects.toThrow('Too many wrong PINs');
		expect(await vault.canUnlockWithPin()).toBe(false);
		// even the right PIN no longer works
		await expect(vault.unlockWithPin(PIN)).rejects.toThrow('passphrase');

		await vault.unlockWithPassphrase(PASS);
		await vault.lock();
		await vault.unlockWithPin(PIN);
		expect(await vault.status()).toBe('unlocked');
	});

	it('resets the attempt counter after a correct PIN', async () => {
		await vault.lock();
		await expect(vault.unlockWithPin('000000')).rejects.toThrow();
		await vault.unlockWithPin(PIN);
		await vault.lock();
		await expect(vault.unlockWithPin('000000')).rejects.toThrow(
			`${MAX_PIN_ATTEMPTS - 1} attempt(s) left`
		);
	});

	it('requires the passphrase after a browser restart', async () => {
		restartBrowser();
		expect(await vault.status()).toBe('locked');
		expect(await vault.canUnlockWithPin()).toBe(false);
		await expect(vault.unlockWithPassphrase('wrong passphrase!!')).rejects.toThrow(
			'Wrong passphrase'
		);
		await vault.unlockWithPassphrase(PASS);
		expect(await vault.getKeys()).toEqual({ profile1: SK });
		// the PIN works again for the rest of the session
		await vault.lock();
		await vault.unlockWithPin(PIN);
	});

	it('locks automatically after the idle limit, and only real use keeps it open', async () => {
		await vault.setSettings({ lockAfterMinutes: 15 });
		clock += 14 * 60_000;
		await vault.markActivity();
		clock += 14 * 60_000;
		// checking status or reading keys is not activity
		expect(await vault.status()).toBe('unlocked');
		expect(await vault.getKeys()).not.toBeNull();
		clock += 2 * 60_000;
		expect(await vault.getKeys()).toBeNull();
		expect(await vault.status()).toBe('locked');
		expect(await vault.canUnlockWithPin()).toBe(true);
	});

	it('can stay unlocked until the browser closes', async () => {
		await vault.setSettings({ lockAfterMinutes: 0 }, PASS);
		clock += 1000 * 60_000;
		expect(await vault.status()).toBe('unlocked');
	});

	it('detects a tampered vault', async () => {
		restartBrowser();
		const ct: string = local.vault.ciphertext;
		local.vault.ciphertext = (ct[0] === '0' ? '1' : '0') + ct.slice(1);
		await expect(vault.unlockWithPassphrase(PASS)).rejects.toThrow('Wrong passphrase');
	});
});

describe('changing keys and secrets', () => {
	it('adds and removes keys only while unlocked', async () => {
		await vault.addKey('profile2', 'b'.repeat(64));
		await vault.removeKey('profile1');
		expect(await vault.getKeys()).toEqual({ profile2: 'b'.repeat(64) });
		expect(JSON.stringify(local)).not.toContain('b'.repeat(64));

		await vault.lock();
		await expect(vault.addKey('profile3', 'c'.repeat(64))).rejects.toThrow('locked');
	});

	it('changes the PIN', async () => {
		await vault.changePin('1234', PASS);
		await vault.lock();
		await expect(vault.unlockWithPin(PIN)).rejects.toThrow('Wrong PIN');
		await vault.unlockWithPin('1234');
		// the new PIN also survives a restart + passphrase unlock
		restartBrowser();
		await vault.unlockWithPassphrase(PASS);
		await vault.lock();
		await vault.unlockWithPin('1234');
	});

	it('changes the passphrase', async () => {
		await expect(vault.changePassphrase('not the passphrase', 'another long passphrase')).rejects.toThrow(
			'Current passphrase is wrong'
		);
		await vault.changePassphrase(PASS, 'another long passphrase');
		restartBrowser();
		await expect(vault.unlockWithPassphrase(PASS)).rejects.toThrow('Wrong passphrase');
		await vault.unlockWithPassphrase('another long passphrase');
		expect(await vault.getKeys()).toEqual({ profile1: SK });
	});

	it('verifies the passphrase for sensitive actions', async () => {
		expect(await vault.verifyPassphrase(PASS)).toBe(true);
		expect(await vault.verifyPassphrase(PIN)).toBe(false);
	});

	it('imports an encrypted backup locked, opening with the backup passphrase', async () => {
		const backup = await vault.exportEncrypted();
		clear(local);
		await vault.setup('a different passphrase', '9999', {});
		await vault.importEncrypted(backup as any);
		expect(await vault.status()).toBe('locked');
		expect(await vault.canUnlockWithPin()).toBe(false);
		await vault.unlockWithPassphrase(PASS);
		expect(await vault.getKeys()).toEqual({ profile1: SK });
		await expect(vault.importEncrypted({ version: 9 } as any)).rejects.toThrow('Invalid vault');
	});
});

describe('changes that weaken protection need the passphrase', () => {
	it('setting or changing a PIN needs the passphrase; removing it does not', async () => {
		await expect(vault.changePin('1111')).rejects.toThrow('passphrase');
		await expect(vault.changePin('1111', 'not the passphrase')).rejects.toThrow('passphrase');
		await vault.lock();
		await vault.unlockWithPin(PIN); // still the old PIN
		await vault.changePin(null);
		expect(await vault.hasPin()).toBe(false);
	});

	it('a weaker lock setting needs the passphrase; a stricter one does not', async () => {
		await expect(vault.setSettings({ lockAfterMinutes: 60 })).rejects.toThrow('passphrase');
		await expect(vault.setSettings({ lockAfterMinutes: LOCK_ON_BROWSER_CLOSE })).rejects.toThrow('passphrase');
		await expect(vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, 'wrong')).rejects.toThrow('passphrase');
		expect(local.persistedVaultKey ?? null).toBeNull();

		await vault.setSettings({ lockAfterMinutes: 60 }, PASS);
		await vault.setSettings({ lockAfterMinutes: 5 });
		expect((await vault.getSettings()).lockAfterMinutes).toBe(5);
	});

	it('rejects unknown lock settings', async () => {
		await expect(vault.setSettings({ lockAfterMinutes: 7 }, PASS)).rejects.toThrow('Unknown lock setting');
		await expect(vault.setSettings({ lockAfterMinutes: NaN }, PASS)).rejects.toThrow('Unknown lock setting');
	});
});

describe('optional PIN', () => {
	it('works without a PIN: only the passphrase unlocks', async () => {
		clear(local);
		clear(sessionArea);
		await vault.setup(PASS, null, { profile1: SK });
		expect(await vault.hasPin()).toBe(false);
		await vault.lock();
		expect(await vault.canUnlockWithPin()).toBe(false);
		await expect(vault.unlockWithPin(PIN)).rejects.toThrow('passphrase');
		await vault.unlockWithPassphrase(PASS);
		expect(await vault.getKeys()).toEqual({ profile1: SK });
	});

	it('can add and remove a PIN later', async () => {
		await vault.changePin(null);
		expect(await vault.hasPin()).toBe(false);
		await vault.lock();
		expect(await vault.canUnlockWithPin()).toBe(false);
		await vault.unlockWithPassphrase(PASS);
		// still no PIN after a passphrase unlock
		await vault.lock();
		expect(await vault.canUnlockWithPin()).toBe(false);

		await vault.unlockWithPassphrase(PASS);
		await vault.changePin('2468', PASS);
		await vault.lock();
		await vault.unlockWithPin('2468');
	});
});

describe('stay unlocked across restarts (LOCK_NEVER)', () => {
	it('is off by default: nothing that unlocks the vault is on disk', async () => {
		expect(local.persistedVaultKey ?? null).toBeNull();
		restartBrowser();
		expect(await vault.status()).toBe('locked');
	});

	it('survives a browser restart, with the PIN still working afterwards', async () => {
		await vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, PASS);
		expect(local.persistedVaultKey).toMatch(/^[0-9a-f]{64}$/);
		restartBrowser();
		clock += 30 * 24 * 60 * 60_000;
		expect(await vault.status()).toBe('unlocked');
		expect(await vault.getKeys()).toEqual({ profile1: SK });
		expect(await vault.canUnlockWithPin()).toBe(true);
	});

	it('locking deletes the saved key until the next unlock', async () => {
		await vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, PASS);
		await vault.lock();
		expect(local.persistedVaultKey).toBeNull();
		restartBrowser();
		expect(await vault.status()).toBe('locked');

		await vault.unlockWithPassphrase(PASS);
		expect(local.persistedVaultKey).toMatch(/^[0-9a-f]{64}$/);
		await vault.lock();
		await vault.unlockWithPin(PIN);
		expect(local.persistedVaultKey).toMatch(/^[0-9a-f]{64}$/);
	});

	it('choosing any other option deletes the saved key', async () => {
		await vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, PASS);
		await vault.setSettings({ lockAfterMinutes: LOCK_ON_BROWSER_CLOSE });
		expect(local.persistedVaultKey).toBeNull();
		restartBrowser();
		expect(await vault.status()).toBe('locked');
	});

	it('ignores a saved key when the setting is off or the key is wrong', async () => {
		await vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, PASS);
		const saved = local.persistedVaultKey;
		await vault.setSettings({ lockAfterMinutes: 15 });
		local.persistedVaultKey = saved;
		restartBrowser();
		expect(await vault.status()).toBe('locked');

		await vault.unlockWithPassphrase(PASS);
		await vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, PASS);
		local.persistedVaultKey = 'f'.repeat(64);
		restartBrowser();
		expect(await vault.status()).toBe('locked');
		expect(local.persistedVaultKey).toBeNull();
	});

	it('a restored backup never stays unlocked from the old key', async () => {
		await vault.setSettings({ lockAfterMinutes: LOCK_NEVER }, PASS);
		await vault.importEncrypted((await vault.exportEncrypted()) as any);
		expect(local.persistedVaultKey).toBeNull();
		expect(await vault.status()).toBe('locked');
	});
});

describe('helpers', () => {
	it('generates six-word passphrases from the BIP-39 list', () => {
		const words = generatePassphrase().split(' ');
		expect(words).toHaveLength(6);
		words.forEach((w) => expect(wordlist).toContain(w));
		expect(generatePassphrase()).not.toBe(generatePassphrase());
		expect(validatePassphrase(generatePassphrase())).toBeNull();
	});

	it('validates PINs', () => {
		expect(validatePin('1234')).toBeNull();
		expect(validatePin('12345678')).toBeNull();
		expect(validatePin('12a4')).not.toBeNull();
	});
});
