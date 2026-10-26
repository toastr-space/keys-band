import { AllowKind } from '$lib/types';
import type { Authorization, PermissionDuration, WebSite } from '$lib/types';

// A capability is the unit a user grants to an origin. Signing is scoped per event kind so
// that approving e.g. a login (getPublicKey) or a note (kind 1) never covers deletions (kind 5),
// profile overwrites (kind 0) or DM decryption.
const STATIC_CAPABILITIES = ['getPublicKey', 'getRelays', 'nip04.encrypt', 'nip04.decrypt'];

const KIND_NAMES: { [kind: number]: string } = {
	0: 'Profile metadata',
	1: 'Short text note',
	3: 'Follow list',
	4: 'Encrypted direct message',
	5: 'Deletion request',
	6: 'Repost',
	7: 'Reaction',
	1984: 'Report',
	9734: 'Zap request',
	10000: 'Mute list',
	10002: 'Relay list',
	22242: 'Relay authentication',
	24133: 'Nostr Connect',
	27235: 'HTTP authentication',
	30023: 'Long-form article'
};

const CAPABILITY_NAMES: { [capability: string]: string } = {
	getPublicKey: 'Read your public key',
	getRelays: 'Read your relay list',
	'nip04.encrypt': 'Encrypt direct messages',
	'nip04.decrypt': 'Decrypt your direct messages'
};

/**
 * Returns the origin (scheme://host[:port]) of a URL, or '' when the URL is invalid or not http(s).
 * Permissions are keyed by origin so a grant for https://site never applies to http://site.
 */
export function urlToOrigin(url: string): string {
	if (!url || typeof url !== 'string') return '';
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
		return parsed.origin;
	} catch {
		return '';
	}
}

const isValidKind = (kind: unknown): kind is number =>
	typeof kind === 'number' && Number.isInteger(kind) && kind >= 0 && kind <= 65535;

const isValidEvent = (event: any): boolean =>
	event !== null &&
	typeof event === 'object' &&
	isValidKind(event.kind) &&
	typeof event.content === 'string' &&
	Number.isInteger(event.created_at) &&
	Array.isArray(event.tags) &&
	event.tags.every((tag: unknown) => Array.isArray(tag) && tag.every((v) => typeof v === 'string'));

/**
 * Maps a NIP-07 request to the capability it needs, or null when the request is unknown or malformed.
 */
export function capabilityFor(type: string, data: any): string | null {
	if (type === 'signEvent') return isValidEvent(data) ? `signEvent:${data.kind}` : null;
	if (type === 'nip04.encrypt' || type === 'nip04.decrypt') {
		const text = type === 'nip04.encrypt' ? data?.plaintext : data?.ciphertext;
		return typeof data?.peer === 'string' && typeof text === 'string' ? type : null;
	}
	return STATIC_CAPABILITIES.includes(type) ? type : null;
}

export function describeKind(kind: number): string {
	return KIND_NAMES[kind] ? `${KIND_NAMES[kind]} (kind ${kind})` : `Kind ${kind} event`;
}

/**
 * Human-readable description of a capability (also accepts legacy history types).
 */
export function describeCapability(capability: string): string {
	if (capability.startsWith('signEvent:')) {
		return 'Sign: ' + describeKind(Number(capability.slice('signEvent:'.length)));
	}
	if (capability === 'signEvent') return 'Sign Event';
	return CAPABILITY_NAMES[capability] ?? capability;
}

const isActive = (auth: Authorization | undefined, now: Date): boolean =>
	!!auth &&
	(auth.always || (!!auth.authorizationStop && new Date(auth.authorizationStop) > now));

export function getAllowKind(
	site: WebSite | undefined,
	capability: string,
	now: Date = new Date()
): AllowKind {
	const auth = site?.permissions?.[capability];
	if (!auth || !isActive(auth, now)) return AllowKind.Nothing;
	if (auth.accept) return auth.always ? AllowKind.AlWaysAllow : AllowKind.AllowForSession;
	if (auth.reject) return auth.always ? AllowKind.AlwaysReject : AllowKind.RejectForSession;
	return AllowKind.Nothing;
}

export function setPermission(
	site: WebSite,
	capability: string,
	duration: PermissionDuration
): WebSite {
	return {
		...site,
		permissions: {
			...(site.permissions || {}),
			[capability]: {
				always: duration.always,
				accept: duration.accept,
				reject: duration.reject,
				authorizationStop: new Date(duration.duration).toString()
			}
		}
	};
}

export function revokePermission(site: WebSite, capability?: string): WebSite {
	if (capability === undefined) return { ...site, permissions: {} };
	const permissions = { ...(site.permissions || {}) };
	delete permissions[capability];
	return { ...site, permissions };
}

/**
 * Remembered decisions (allow or reject) that are still in effect.
 */
export function activeGrants(
	site: WebSite | undefined,
	now: Date = new Date()
): { capability: string; permission: Authorization }[] {
	return Object.entries(site?.permissions || {})
		.filter(([, auth]) => isActive(auth, now))
		.map(([capability, permission]) => ({ capability, permission }));
}
