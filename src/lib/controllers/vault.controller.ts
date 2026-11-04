import { scryptAsync } from '@noble/hashes/scrypt';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils';
import { wordlist } from '@scure/bip39/wordlists/english';
import { web } from '$lib/utility/utils';

/*
 * Private keys never touch disk in plaintext.
 *
 * storage.local (disk)     vault: { keys, pin } encrypted with AES-256-GCM under a key derived
 *                          from the passphrase with scrypt.
 * storage.session (memory) the derived vault key while unlocked, and (if the user set a PIN) a
 *                          copy of it encrypted with the PIN. Session storage is cleared when the
 *                          browser closes, so by default the passphrase is required after a restart.
 *
 * The PIN only protects the in-memory copy, which is why wrong PIN attempts are limited and
 * exhausting them wipes that copy.
 *
 * Opting into LOCK_NEVER saves the vault key unencrypted in storage.local so Keys.Band stays
 * unlocked across browser restarts. That removes the at-rest protection; the UI warns about it.
 */

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';

interface KdfParams {
	N: number;
	r: number;
	p: number;
}

interface EncryptedBlob {
	salt: string;
	iv: string;
	ciphertext: string;
}

interface StoredVault extends EncryptedBlob {
	version: 1;
	kdf: { name: 'scrypt' } & KdfParams;
}

interface VaultContents {
	keys: { [profileId: string]: string };
	pin: string | null;
}

interface VaultSession {
	vaultKey?: string;
	lastActivity?: number;
	pinWrap?: EncryptedBlob;
	pinAttemptsLeft?: number;
}

export interface VaultSettings {
	// minutes idle; LOCK_ON_BROWSER_CLOSE or LOCK_NEVER for the special cases
	lockAfterMinutes: number;
}

export const LOCK_ON_BROWSER_CLOSE = 0;
// stays unlocked across browser restarts: the vault key is saved unencrypted on disk
export const LOCK_NEVER = -1;

export const MIN_PASSPHRASE_LENGTH = 12;
export const MAX_PIN_ATTEMPTS = 5;
export const DEFAULT_VAULT_SETTINGS: VaultSettings = { lockAfterMinutes: 15 };

const VAULT_AAD = utf8ToBytes('keys.band-vault-v1');
const PIN_AAD = utf8ToBytes('keys.band-pin-v1');

export function validatePassphrase(passphrase: string): string | null {
	if (typeof passphrase !== 'string' || passphrase.trim().length < MIN_PASSPHRASE_LENGTH)
		return `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`;
	if (/^\d+$/.test(passphrase)) return 'Passphrase must not be only digits';
	return null;
}

export function validatePin(pin: string): string | null {
	return /^\d{4,8}$/.test(pin) ? null : 'PIN must be 4 to 8 digits';
}

/** Six random words from the BIP-39 English list (66 bits of entropy). */
export function generatePassphrase(words = 6): string {
	const out: string[] = [];
	const buf = new Uint16Array(words);
	crypto.getRandomValues(buf);
	// 2048 words = 11 bits; masking a uniform 16-bit value keeps the choice uniform
	buf.forEach((n) => out.push(wordlist[n & 2047]));
	return out.join(' ');
}

// WebCrypto's types want ArrayBuffer-backed views; noble's are ArrayBufferLike
const bs = (bytes: Uint8Array) => bytes as Uint8Array<ArrayBuffer>;

const normalize = (secret: string) => utf8ToBytes(secret.normalize('NFKC'));

async function deriveKey(secret: string, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
	return scryptAsync(normalize(secret), salt, { ...params, dkLen: 32 });
}

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', bs(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(raw: Uint8Array, plaintext: Uint8Array, aad: Uint8Array) {
	const iv = randomBytes(12);
	const ct = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: bs(iv), additionalData: bs(aad) },
		await aesKey(raw),
		bs(plaintext)
	);
	return { iv: bytesToHex(iv), ciphertext: bytesToHex(new Uint8Array(ct)) };
}

/** Throws if the key is wrong or the data was tampered with. */
async function decrypt(raw: Uint8Array, blob: { iv: string; ciphertext: string }, aad: Uint8Array) {
	const pt = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: bs(hexToBytes(blob.iv)), additionalData: bs(aad) },
		await aesKey(raw),
		bs(hexToBytes(blob.ciphertext))
	);
	return new Uint8Array(pt);
}

export const createVaultController = (
	options: { vaultKdf?: KdfParams; pinKdf?: KdfParams; now?: () => number } = {}
) => {
	const vaultKdf = options.vaultKdf ?? { N: 2 ** 17, r: 8, p: 1 };
	const pinKdf = options.pinKdf ?? { N: 2 ** 15, r: 8, p: 1 };
	const now = options.now ?? (() => Date.now());

	// storage.session is memory-only; the fallback exists only for environments without it
	let memorySession: VaultSession = {};
	const session = {
		get: async (): Promise<VaultSession> => {
			if (!web.storage.session) return { ...memorySession };
			return ((await web.storage.session.get('vaultSession')) as any)?.vaultSession || {};
		},
		set: async (value: VaultSession) => {
			if (!web.storage.session) memorySession = { ...value };
			else await web.storage.session.set({ vaultSession: value });
		}
	};

	const getStoredVault = async (): Promise<StoredVault | undefined> =>
		((await web.storage.local.get('vault')) as any)?.vault;

	const getSettings = async (): Promise<VaultSettings> => ({
		...DEFAULT_VAULT_SETTINGS,
		...(((await web.storage.local.get('vaultSettings')) as any)?.vaultSettings || {})
	});

	const persistedVaultKey = async (): Promise<string | null> =>
		((await web.storage.local.get('persistedVaultKey')) as any)?.persistedVaultKey || null;

	const setPersistedVaultKey = async (vaultKey: Uint8Array | null) => {
		await web.storage.local.set({ persistedVaultKey: vaultKey ? bytesToHex(vaultKey) : null });
	};

	const readContents = async (vaultKey: Uint8Array, stored: StoredVault): Promise<VaultContents> =>
		JSON.parse(new TextDecoder().decode(await decrypt(vaultKey, stored, VAULT_AAD)));

	const writeContents = async (
		vaultKey: Uint8Array,
		salt: string,
		kdf: StoredVault['kdf'],
		contents: VaultContents
	) => {
		const blob = await encrypt(vaultKey, utf8ToBytes(JSON.stringify(contents)), VAULT_AAD);
		const stored: StoredVault = { version: 1, kdf, salt, ...blob };
		await web.storage.local.set({ vault: stored });
	};

	const wrapForPin = async (pin: string, vaultKey: Uint8Array): Promise<EncryptedBlob> => {
		const salt = randomBytes(16);
		const blob = await encrypt(await deriveKey(pin, salt, pinKdf), vaultKey, PIN_AAD);
		return { salt: bytesToHex(salt), ...blob };
	};

	/** Marks the vault unlocked with this key and (re)creates the PIN copy if a PIN is set. */
	const startSession = async (vaultKey: Uint8Array, pin: string | null) => {
		await session.set({
			vaultKey: bytesToHex(vaultKey),
			lastActivity: now(),
			...(pin ? { pinWrap: await wrapForPin(pin, vaultKey), pinAttemptsLeft: MAX_PIN_ATTEMPTS } : {})
		});
		if ((await getSettings()).lockAfterMinutes === LOCK_NEVER) await setPersistedVaultKey(vaultKey);
	};

	// Locking always removes the key saved for LOCK_NEVER, so a locked vault stays locked
	// across restarts until it is unlocked again.
	const lock = async () => {
		const current = await session.get();
		delete current.vaultKey;
		delete current.lastActivity;
		await session.set(current);
		await setPersistedVaultKey(null);
	};

	/** After a browser restart with LOCK_NEVER, resumes the session from the saved vault key. */
	const resumePersisted = async (): Promise<Uint8Array | null> => {
		const saved = await persistedVaultKey();
		const stored = await getStoredVault();
		if (!saved || !stored || (await getSettings()).lockAfterMinutes !== LOCK_NEVER) return null;
		const vaultKey = hexToBytes(saved);
		try {
			await startSession(vaultKey, (await readContents(vaultKey, stored)).pin);
			return vaultKey;
		} catch {
			await setPersistedVaultKey(null);
			return null;
		}
	};

	/**
	 * The vault key if unlocked and not idle past the auto-lock limit. Only `touch` (real use:
	 * signing, decrypting, opening the popup) restarts the idle timer, so background
	 * bookkeeping such as tab switches never keeps the vault open.
	 */
	const activeVaultKey = async (touch = false): Promise<Uint8Array | null> => {
		const current = await session.get();
		if (!current.vaultKey) return resumePersisted();
		const { lockAfterMinutes } = await getSettings();
		if (lockAfterMinutes > 0 && now() - (current.lastActivity ?? 0) > lockAfterMinutes * 60_000) {
			await lock();
			return null;
		}
		if (touch) await session.set({ ...current, lastActivity: now() });
		return hexToBytes(current.vaultKey);
	};

	const unlocked = async (): Promise<{ vaultKey: Uint8Array; stored: StoredVault; contents: VaultContents }> => {
		const stored = await getStoredVault();
		const vaultKey = await activeVaultKey();
		if (!stored || !vaultKey) throw new Error('Keys.Band is locked');
		return { vaultKey, stored, contents: await readContents(vaultKey, stored) };
	};

	const markActivity = async () => {
		await activeVaultKey(true);
	};

	const status = async (): Promise<VaultStatus> => {
		if (!(await getStoredVault())) return 'uninitialized';
		return (await activeVaultKey()) ? 'unlocked' : 'locked';
	};

	const canUnlockWithPin = async (): Promise<boolean> => !!(await session.get()).pinWrap;

	const setSettings = async (settings: VaultSettings) => {
		await web.storage.local.set({ vaultSettings: settings });
		if (settings.lockAfterMinutes !== LOCK_NEVER) await setPersistedVaultKey(null);
		else {
			const vaultKey = await activeVaultKey();
			if (vaultKey) await setPersistedVaultKey(vaultKey);
		}
	};

	/** pin may be null: the vault then always unlocks with the passphrase. */
	const setup = async (passphrase: string, pin: string | null, keys: VaultContents['keys'] = {}) => {
		if (await getStoredVault()) throw new Error('Vault already exists');
		const problem = validatePassphrase(passphrase) || (pin === null ? null : validatePin(pin));
		if (problem) throw new Error(problem);

		const salt = randomBytes(16);
		const vaultKey = await deriveKey(passphrase, salt, vaultKdf);
		await writeContents(vaultKey, bytesToHex(salt), { name: 'scrypt', ...vaultKdf }, { keys, pin });
		await startSession(vaultKey, pin);
	};

	const unlockWithPassphrase = async (passphrase: string) => {
		const stored = await getStoredVault();
		if (!stored) throw new Error('No vault to unlock');
		const vaultKey = await deriveKey(passphrase, hexToBytes(stored.salt), stored.kdf);
		let contents: VaultContents;
		try {
			contents = await readContents(vaultKey, stored);
		} catch {
			throw new Error('Wrong passphrase');
		}
		await startSession(vaultKey, contents.pin);
	};

	const unlockWithPin = async (pin: string) => {
		const current = await session.get();
		const stored = await getStoredVault();
		if (!current.pinWrap || !stored) throw new Error('Enter your passphrase to unlock');

		// count the attempt before trying it, so an interrupted attempt is never free
		const attemptsLeft = (current.pinAttemptsLeft ?? MAX_PIN_ATTEMPTS) - 1;
		await session.set({ ...current, pinAttemptsLeft: attemptsLeft });

		try {
			const pinKey = await deriveKey(pin, hexToBytes(current.pinWrap.salt), pinKdf);
			const vaultKey = await decrypt(pinKey, current.pinWrap, PIN_AAD);
			await readContents(vaultKey, stored);
			await session.set({
				...current,
				vaultKey: bytesToHex(vaultKey),
				lastActivity: now(),
				pinAttemptsLeft: MAX_PIN_ATTEMPTS
			});
			if ((await getSettings()).lockAfterMinutes === LOCK_NEVER) await setPersistedVaultKey(vaultKey);
		} catch {
			if (attemptsLeft <= 0) {
				await session.set({});
				throw new Error('Too many wrong PINs. Enter your passphrase to unlock');
			}
			throw new Error(`Wrong PIN. ${attemptsLeft} attempt(s) left`);
		}
	};

	const verifyPassphrase = async (passphrase: string): Promise<boolean> => {
		const stored = await getStoredVault();
		if (!stored) return false;
		try {
			await readContents(await deriveKey(passphrase, hexToBytes(stored.salt), stored.kdf), stored);
			return true;
		} catch {
			return false;
		}
	};

	const getKeys = async (): Promise<VaultContents['keys'] | null> => {
		try {
			return (await unlocked()).contents.keys;
		} catch {
			return null;
		}
	};

	const updateKeys = async (change: (keys: VaultContents['keys']) => void) => {
		const { vaultKey, stored, contents } = await unlocked();
		change(contents.keys);
		await writeContents(vaultKey, stored.salt, stored.kdf, contents);
	};

	const addKey = (profileId: string, privateKey: string) =>
		updateKeys((keys) => {
			keys[profileId] = privateKey;
		});

	const removeKey = (profileId: string) =>
		updateKeys((keys) => {
			delete keys[profileId];
		});

	const hasPin = async (): Promise<boolean> => !!(await unlocked()).contents.pin;

	/** Sets, changes or (with null) removes the PIN. */
	const changePin = async (pin: string | null) => {
		const problem = pin === null ? null : validatePin(pin);
		if (problem) throw new Error(problem);
		const { vaultKey, stored, contents } = await unlocked();
		await writeContents(vaultKey, stored.salt, stored.kdf, { ...contents, pin });
		await session.set({});
		await startSession(vaultKey, pin);
	};

	const changePassphrase = async (current: string, next: string) => {
		const problem = validatePassphrase(next);
		if (problem) throw new Error(problem);
		if (!(await verifyPassphrase(current))) throw new Error('Current passphrase is wrong');
		const { contents } = await unlocked();
		const salt = randomBytes(16);
		const vaultKey = await deriveKey(next, salt, vaultKdf);
		await writeContents(vaultKey, bytesToHex(salt), { name: 'scrypt', ...vaultKdf }, contents);
		await startSession(vaultKey, contents.pin);
	};

	/** The encrypted vault as stored on disk, for backups. */
	const exportEncrypted = getStoredVault;

	/** Replaces the vault with one from a backup and locks; it then opens with that backup's passphrase. */
	const importEncrypted = async (stored: StoredVault) => {
		const kdf = stored?.kdf;
		// bounded scrypt parameters, so a crafted file cannot exhaust memory when unlocking
		const validKdf =
			kdf?.name === 'scrypt' &&
			[kdf.N, kdf.r, kdf.p].every(Number.isInteger) &&
			kdf.N >= 2 &&
			kdf.N <= 2 ** 20 &&
			(kdf.N & (kdf.N - 1)) === 0 &&
			kdf.r >= 1 &&
			kdf.r <= 16 &&
			kdf.p >= 1 &&
			kdf.p <= 4;
		if (
			stored?.version !== 1 ||
			!validKdf ||
			![stored.salt, stored.iv, stored.ciphertext].every((v) => typeof v === 'string' && /^[0-9a-f]+$/.test(v))
		)
			throw new Error('Invalid vault in backup');
		await web.storage.local.set({ vault: stored });
		await session.set({});
		await setPersistedVaultKey(null);
	};

	return {
		status,
		canUnlockWithPin,
		setup,
		unlockWithPassphrase,
		unlockWithPin,
		verifyPassphrase,
		lock,
		markActivity,
		hasPin,
		getKeys,
		addKey,
		removeKey,
		changePin,
		changePassphrase,
		getSettings,
		setSettings,
		exportEncrypted,
		importEncrypted
	};
};

export const vaultController = createVaultController();
