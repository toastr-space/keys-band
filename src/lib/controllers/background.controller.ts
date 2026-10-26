import { get } from 'svelte/store';

import type { BackgroundController, PermissionDuration } from '$lib/types/background';
import type { Profile, WebSite, WebSiteHistory } from '$lib/types/profile';

import { userProfile } from '$lib/stores/data';
import { profileController } from './profile.controller';
import { ProfileUtil, setPermission } from '$lib/utility';

export const backgroundController = (): BackgroundController => {
	const getUserProfile = async (): Promise<Profile> => {
		await profileController.loadProfiles();
		const user = get(userProfile);
		return Promise.resolve(user);
	};

	const addHistory = async (info: { acceptance: boolean; type: string }, origin: string) => {
		const user = await getUserProfile();
		const webSites = user.data?.webSites || {};
		const site = ProfileUtil.getWebSiteOrCreate(origin, user);

		site.history = [
			...(site.history as WebSiteHistory[]),
			{
				accepted: info.acceptance,
				type: info.type,
				created_at: new Date().toString(),
				data: undefined
			}
		];

		if (user.data) user.data.webSites = { ...webSites, [origin]: site };
		else user.data = { webSites: { [origin]: site } };

		await profileController.saveProfile(user);
	};

	const updatePermisison = async (
		duration: PermissionDuration,
		origin: string,
		capability: string
	) => {
		const user = await getUserProfile();
		const webSites: { [origin: string]: WebSite } = user.data?.webSites || {};

		const site = setPermission(ProfileUtil.getWebSiteOrCreate(origin, user), capability, duration);
		if (user.data) user.data.webSites = { ...webSites, [origin]: site };
		else user.data = { webSites: { [origin]: site } };

		await profileController.saveProfile(user);
		await addHistory({ acceptance: duration.accept, type: capability }, origin);
	};

	return { updatePermisison, getUserProfile, addHistory };
};
