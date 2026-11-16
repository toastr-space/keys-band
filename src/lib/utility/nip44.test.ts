import { describe, it, expect } from 'vitest';
import { getPublicKey } from 'nostr-tools';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { calcPaddedLen, decrypt, encrypt, getConversationKey, getMessageKeys } from './nip44';
// The official vectors (github.com/paulmillr/nip44), sha256 269ed0f6…25040 as listed in NIP-44.
import vectors from './nip44.vectors.json';

const { valid, invalid } = vectors.v2;

describe('NIP-44 v2 - valid vectors', () => {
	it('derives conversation keys', () => {
		for (const v of valid.get_conversation_key) {
			expect(bytesToHex(getConversationKey(v.sec1, v.pub2))).toBe(v.conversation_key);
		}
	});

	it('derives message keys', () => {
		const ck = hexToBytes(valid.get_message_keys.conversation_key);
		for (const v of valid.get_message_keys.keys) {
			const keys = getMessageKeys(ck, hexToBytes(v.nonce));
			expect(bytesToHex(keys.chachaKey)).toBe(v.chacha_key);
			expect(bytesToHex(keys.chachaNonce)).toBe(v.chacha_nonce);
			expect(bytesToHex(keys.hmacKey)).toBe(v.hmac_key);
		}
	});

	it('pads lengths', () => {
		for (const [len, padded] of valid.calc_padded_len) expect(calcPaddedLen(len)).toBe(padded);
	});

	it('encrypts and decrypts, from either side', () => {
		for (const v of valid.encrypt_decrypt) {
			const ck = getConversationKey(v.sec1, getPublicKey(v.sec2));
			expect(bytesToHex(ck)).toBe(v.conversation_key);
			expect(bytesToHex(getConversationKey(v.sec2, getPublicKey(v.sec1)))).toBe(v.conversation_key);
			expect(encrypt(v.plaintext, ck, hexToBytes(v.nonce))).toBe(v.payload);
			expect(decrypt(v.payload, ck)).toBe(v.plaintext);
		}
	});

	it('encrypts and decrypts long messages', () => {
		for (const v of valid.encrypt_decrypt_long_msg) {
			const plaintext = v.pattern.repeat(v.repeat);
			expect(bytesToHex(sha256(utf8ToBytes(plaintext)))).toBe(v.plaintext_sha256);
			const ck = hexToBytes(v.conversation_key);
			const payload = encrypt(plaintext, ck, hexToBytes(v.nonce));
			expect(bytesToHex(sha256(utf8ToBytes(payload)))).toBe(v.payload_sha256);
			expect(decrypt(payload, ck)).toBe(plaintext);
		}
	});
});

describe('NIP-44 v2 - invalid vectors', () => {
	it('refuses plaintexts of a length outside 1..65535 bytes', () => {
		const ck = new Uint8Array(32).fill(1);
		for (const len of invalid.encrypt_msg_lengths)
			expect(() => encrypt('a'.repeat(len), ck)).toThrow();
	});

	it('refuses to decrypt malformed or forged payloads', () => {
		for (const v of invalid.decrypt) {
			expect(() => decrypt(v.payload, hexToBytes(v.conversation_key)), v.note).toThrow();
		}
	});

	it('refuses invalid keys', () => {
		for (const v of invalid.get_conversation_key) {
			expect(() => getConversationKey(v.sec1, v.pub2), v.note).toThrow();
		}
	});
});
