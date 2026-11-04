import { get } from 'svelte/store';

import type { BackgroundController, PermissionDuration } from '$lib/types/background';
import type { Profile, WebSite, WebSiteHistory } from '$lib/types/profile';

import { userProfile } from '$lib/stores/data';
import { profileController } from './profile.controller';
import { ProfileUtil, setPermission } from '$lib/utility';

// Entries kept per site. Every remembered allow or reject adds one, so without a cap a site
// could grow storage without limit by repeating requests.
export const MAX_HISTORY = 100;

const withHistory = (site: WebSite, info: { acceptance: boolean; type: string }): WebSite => ({
	...site,
	history: [
		...((site.history as WebSiteHistory[]) || []),
		{
			accepted: info.acceptance,
			type: info.type,
			created_at: new Date().toString(),
			data: undefined
		}
	].slice(-MAX_HISTORY)
});

/** Replaces one site of a stored profile; runs inside profileController.updateProfile. */
const putSite = (profile: Profile, origin: string, site: WebSite) => {
	if (!profile.data) profile.data = {};
	profile.data.webSites = { ...(profile.data.webSites || {}), [origin]: site };
};

export const backgroundController = (): BackgroundController => {
	const getUserProfile = async (): Promise<Profile> => {
		await profileController.loadProfiles();
		const user = get(userProfile);
		return Promise.resolve(user);
	};

	const addHistory = async (
		profileId: string,
		origin: string,
		info: { acceptance: boolean; type: string }
	) => {
		await profileController.updateProfile(profileId, (profile) =>
			putSite(profile, origin, withHistory(ProfileUtil.getWebSiteOrCreate(origin, profile), info))
		);
	};

	const updatePermisison = async (
		profileId: string,
		origin: string,
		capability: string,
		duration: PermissionDuration
	) => {
		await profileController.updateProfile(profileId, (profile) => {
			const site = setPermission(ProfileUtil.getWebSiteOrCreate(origin, profile), capability, duration);
			putSite(profile, origin, withHistory(site, { acceptance: duration.accept, type: capability }));
		});
	};

	return { updatePermisison, getUserProfile, addHistory };
};
