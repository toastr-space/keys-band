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
	24242: 'Blossom authorization',
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

const tagValue = (event: any, name: string): string | undefined =>
	event.tags.find((tag: string[]) => tag[0] === name)?.[1];

/** scheme://host[:port][/path] of a URL with one of the given protocols, or null. */
const normalizeUrl = (url: string | undefined, protocols: string[], keepPath: boolean): string | null => {
	if (!url) return null;
	try {
		const parsed = new URL(url);
		if (!protocols.includes(parsed.protocol)) return null;
		const path = keepPath ? parsed.pathname.replace(/\/+$/, '') : '';
		return `${parsed.protocol}//${parsed.host}${path}`;
	} catch {
		return null;
	}
};

/**
 * Login-style events authenticate you to another service. Their capability names that service,
 * so a remembered "Always" never covers other relays, servers or actions. Returns undefined for
 * other kinds and null for a login event without a valid target.
 */
const loginScope = (event: any): string | null | undefined => {
	switch (event.kind) {
		case 22242: // NIP-42 relay authentication
			return normalizeUrl(tagValue(event, 'relay'), ['ws:', 'wss:'], true);
		case 27235: // NIP-98 HTTP authentication
			return normalizeUrl(tagValue(event, 'u'), ['http:', 'https:'], false);
		case 24242: {
			// Blossom authorization: the action (upload, delete, ...)
			const action = tagValue(event, 't');
			return action && /^[a-z]{1,32}$/.test(action) ? action : null;
		}
		default:
			return undefined;
	}
};

/**
 * Maps a NIP-07 request to the capability it needs, or null when the request is unknown or malformed.
 */
export function capabilityFor(type: string, data: any): string | null {
	if (type === 'signEvent') {
		if (!isValidEvent(data)) return null;
		const scope = loginScope(data);
		if (scope === null) return null;
		return scope === undefined ? `signEvent:${data.kind}` : `signEvent:${data.kind}:${scope}`;
	}
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
		const rest = capability.slice('signEvent:'.length);
		const separator = rest.indexOf(':');
		if (separator === -1) return 'Sign: ' + describeKind(Number(rest));
		const kind = Number(rest.slice(0, separator));
		const scope = rest.slice(separator + 1);
		if (kind === 22242) return `Log in to relay ${scope}`;
		if (kind === 27235) return `Log in to ${scope} (HTTP auth)`;
		if (kind === 24242) return `Media server (Blossom): ${scope}`;
		return `Sign: ${describeKind(kind)} (${scope})`;
	}
	if (capability === 'signEvent') return 'Sign Event';
	return CAPABILITY_NAMES[capability] ?? capability;
}

/** What a login-style event would authorize, for the approval prompt. */
export function loginDetails(event: any): string[] {
	if (!isValidEvent(event)) return [];
	const details: string[] = [];
	const add = (label: string, value: string | undefined) => value && details.push(`${label}: ${value}`);
	if (event.kind === 22242) add('Relay', tagValue(event, 'relay'));
	if (event.kind === 27235) {
		add('Method', tagValue(event, 'method'));
		add('URL', tagValue(event, 'u'));
	}
	if (event.kind === 24242) {
		add('Action', tagValue(event, 't'));
		add('Server', tagValue(event, 'server'));
		const expiration = Number(tagValue(event, 'expiration'));
		if (expiration) details.push(`Valid until: ${new Date(expiration * 1000).toLocaleString()}`);
	}
	return details;
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
