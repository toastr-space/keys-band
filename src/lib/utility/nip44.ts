import { chacha20 } from '@noble/ciphers/chacha';
import { secp256k1 } from '@noble/curves/secp256k1';
import { equalBytes } from '@noble/ciphers/utils';
import { extract as hkdfExtract, expand as hkdfExpand } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils';
import { base64 } from '@scure/base';

/**
 * NIP-44 version 2 encryption, as published in the NIP.
 *
 * nostr-tools 1.x ships an earlier draft of NIP-44 v2 whose payloads other
 * clients cannot read, so the final version lives here until the dependency
 * moves to nostr-tools 2.x.
 */

const MIN_PLAINTEXT_SIZE = 1;
const MAX_PLAINTEXT_SIZE = 65535;
const SALT = utf8ToBytes('nip44-v2');

export function getConversationKey(privateKey: string, publicKey: string): Uint8Array {
	const sharedX = secp256k1.getSharedSecret(privateKey, '02' + publicKey).subarray(1, 33);
	return hkdfExtract(sha256, sharedX, SALT);
}

export function getMessageKeys(conversationKey: Uint8Array, nonce: Uint8Array) {
	const keys = hkdfExpand(sha256, conversationKey, nonce, 76);
	return {
		chachaKey: keys.subarray(0, 32),
		chachaNonce: keys.subarray(32, 44),
		hmacKey: keys.subarray(44, 76)
	};
}

export function calcPaddedLen(len: number): number {
	if (!Number.isSafeInteger(len) || len < 1) throw new Error('expected positive integer');
	if (len <= 32) return 32;
	const nextPower = 1 << (Math.floor(Math.log2(len - 1)) + 1);
	const chunk = nextPower <= 256 ? 32 : nextPower / 8;
	return chunk * (Math.floor((len - 1) / chunk) + 1);
}

function pad(plaintext: string): Uint8Array {
	const unpadded = utf8ToBytes(plaintext);
	const len = unpadded.length;
	if (len < MIN_PLAINTEXT_SIZE || len > MAX_PLAINTEXT_SIZE) {
		throw new Error('invalid plaintext size: must be between 1 and 65535 bytes');
	}
	const prefix = new Uint8Array(2);
	new DataView(prefix.buffer).setUint16(0, len);
	const suffix = new Uint8Array(calcPaddedLen(len) - len);
	return concatBytes(prefix, unpadded, suffix);
}

function unpad(padded: Uint8Array): string {
	const len = new DataView(padded.buffer, padded.byteOffset).getUint16(0);
	const unpadded = padded.subarray(2, 2 + len);
	if (
		len < MIN_PLAINTEXT_SIZE ||
		len > MAX_PLAINTEXT_SIZE ||
		unpadded.length !== len ||
		padded.length !== 2 + calcPaddedLen(len)
	) {
		throw new Error('invalid padding');
	}
	return new TextDecoder().decode(unpadded);
}

function hmacAad(key: Uint8Array, message: Uint8Array, aad: Uint8Array): Uint8Array {
	if (aad.length !== 32) throw new Error('AAD associated data must be 32 bytes');
	return hmac(sha256, key, concatBytes(aad, message));
}

function decodePayload(payload: string) {
	if (typeof payload !== 'string') throw new Error('payload must be a valid string');
	const plen = payload.length;
	if (plen < 132 || plen > 87472) throw new Error('invalid payload length: ' + plen);
	if (payload[0] === '#') throw new Error('unknown encryption version');
	let data: Uint8Array;
	try {
		data = base64.decode(payload);
	} catch (error) {
		throw new Error('invalid base64: ' + (error as Error).message);
	}
	const dlen = data.length;
	if (dlen < 99 || dlen > 65603) throw new Error('invalid data length: ' + dlen);
	const version = data[0];
	if (version !== 2) throw new Error('unknown encryption version ' + version);
	return {
		nonce: data.subarray(1, 33),
		ciphertext: data.subarray(33, -32),
		mac: data.subarray(-32)
	};
}

export function encrypt(
	plaintext: string,
	conversationKey: Uint8Array,
	nonce: Uint8Array = randomBytes(32)
): string {
	const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(conversationKey, nonce);
	const ciphertext = chacha20(chachaKey, chachaNonce, pad(plaintext));
	const mac = hmacAad(hmacKey, ciphertext, nonce);
	return base64.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac));
}

export function decrypt(payload: string, conversationKey: Uint8Array): string {
	const { nonce, ciphertext, mac } = decodePayload(payload);
	const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(conversationKey, nonce);
	if (!equalBytes(hmacAad(hmacKey, ciphertext, nonce), mac)) throw new Error('invalid MAC');
	return unpad(chacha20(chachaKey, chachaNonce, ciphertext));
}
