import { get } from 'svelte/store';
import { getDuration } from '../utility/utils';
import { userProfile } from '$lib/stores/data';
import { ProfileUtil } from '$lib/utility';
import { profileController } from '$lib/controllers/profile.controller';
import { browserController } from '$lib/controllers';
import type { Profile, WebSite, WebSiteHistory } from '$lib/types';

interface AuthorizationResult {
	success: boolean;
	error?: string;
}

interface AuthorizationOptions {
	accept: boolean;
	domain: string; 
	choice?: number;
}

const createPermission = (accept: boolean, choice: number) => ({
	always: choice === 1,
	authorizationStop: getDuration(choice)?.toString(),
	accept,
	reject: !accept
});

const createHistoryEntry = (accept: boolean): WebSiteHistory => ({
	accepted: accept,
	type: 'permission',
	created_at: new Date().toString(),
	data: undefined
});

const updateProfileData = (profile: Profile, webSites: Record<string, WebSite>): Profile => {
	if (!profile.data) {
		profile.data = { webSites };
	} else {
		profile.data.webSites = webSites;
	}
	return profile;
};

const updateIconForCurrentTab = async (): Promise<void> => {
	try {
		const tab = await browserController.getCurrentTab();
		await browserController.switchIcon({ tabId: tab.id as number });
	} catch (error) {
		console.warn('Failed to update icon for current tab:', error);
	}
};

/**
 * Handles user authorization for a domain
 * @param options Authorization options
 * @returns Promise<AuthorizationResult>
 */
const accept = async ({ accept, domain, choice = 0 }: AuthorizationOptions): Promise<AuthorizationResult> => {
	console.log('Processing authorization:', { accept, domain, choice });
	
	try {
		const currentProfile = get(userProfile);
		const webSites = currentProfile?.data?.webSites || {};
		const site = ProfileUtil.getWebSiteOrCreate(domain, currentProfile);
		
		// Update site permission
		site.permission = createPermission(accept, choice);
		
		// Add history entry
		const historyEntry = createHistoryEntry(accept);
		site.history = [...(site.history || []), historyEntry];
		
		// Update websites
		webSites[domain] = site;
		
		// Update user profile
		userProfile.update(profile => updateProfileData(profile, webSites));
		
		// Update UI and save
		await Promise.all([
			updateIconForCurrentTab(),
			profileController.saveProfile(get(userProfile))
		]);
		
		console.log('Authorization processed successfully');
		return { success: true };
		
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		console.error('Authorization failed:', errorMessage);
		
		// Better error handling than alert()
		return { success: false, error: errorMessage };
	}
};

// Legacy function signature for backward compatibility
const acceptLegacy = async (acceptVal: boolean, domain: string, choice: number = 0): Promise<boolean> => {
	const result = await accept({ accept: acceptVal, domain, choice });
	if (!result.success && result.error) {
		alert(result.error); // Keep alert for now to maintain current behavior
	}
	return result.success;
};

export { acceptLegacy as accept };
export type { AuthorizationResult, AuthorizationOptions };