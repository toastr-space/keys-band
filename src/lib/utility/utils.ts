import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import browser from 'webextension-polyfill';

// Initialize TimeAgo
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

// Web extension browser instance
export const web = browser;

// Duration constants (in milliseconds)
const DURATION_CONSTANTS = {
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
	YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// Duration choices mapping
const DURATION_MAP = {
	0: 0, // One time
	1: null, // Forever
	2: 5 * DURATION_CONSTANTS.MINUTE, // 5 minutes
	3: DURATION_CONSTANTS.HOUR, // 1 hour
	4: 5 * DURATION_CONSTANTS.HOUR, // 5 hours
	5: 5 * DURATION_CONSTANTS.DAY, // 5 days
} as const;

// Translation mapping
const TRANSLATIONS = {
	signEvent: "Sign Event",
	permission: "All Access",
	nip04: "Message Encryption/Decryption",
	"nip04.encrypt": "Message Encryption",
	"nip04.decrypt": "Message Decryption",
	getPublicKey: "Get Public Key",
	getRelays: "Get Relays",
} as const;

/**
 * Extracts domain from URL
 * @param url - Full URL string
 * @returns Domain name or empty string if invalid
 */
export function urlToDomain(url: string): string {
	if (!url || typeof url !== 'string') {
		return '';
	}
	
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch {
		// Fallback to simple split for relative URLs
		const parts = url.split('/');
		return parts.length > 2 ? parts[2] : '';
	}
}

/**
 * Gets expiration date based on duration choice
 * @param choice - Duration choice number (0-5)
 * @returns Date object representing expiration time
 */
export function getDuration(choice: number): Date {
	const now = new Date();
	const offset = DURATION_MAP[choice as keyof typeof DURATION_MAP] ?? 0;
	
	return new Date(now.getTime() + offset);
}

/**
 * Gets human-readable duration name
 * @param choice - Duration choice number (0-5)
 * @returns Human-readable duration string
 */
export function getDurationName(choice: number): string {
	const names = {
		0: 'One time',
		1: 'Forever',
		2: '5 minutes',
		3: '1 hour',
		4: '5 hours',
		5: '5 days',
	} as const;
	
	return names[choice as keyof typeof names] ?? 'Unknown';
}

/**
 * Translates action names to human-readable strings
 * @param name - Action name to translate
 * @returns Translated string or original name if no translation found
 */
export function tr(name: string): string {
	return TRANSLATIONS[name as keyof typeof TRANSLATIONS] ?? name;
}

/**
 * Validates if a string is a valid URL
 * @param url - String to validate
 * @returns True if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Formats a date using TimeAgo
 * @param date - Date to format
 * @returns Formatted time string (e.g., "2 hours ago")
 */
export function formatTimeAgo(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return timeAgo.format(dateObj);
}

/**
 * Safely parses JSON with error handling
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

// Export TimeAgo instance
export { timeAgo };

// Export types
export type DurationChoice = keyof typeof DURATION_MAP;
export type TranslationKey = keyof typeof TRANSLATIONS;