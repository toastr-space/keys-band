import { get } from 'svelte/store';

import type { BackgroundController, PermissionDuration } from '$lib/types/background';
import type { Profile, WebSite, WebSiteHistory } from '$lib/types/profile';

import { userProfile } from '$lib/stores/data';
import { profileController } from './profile.controller';
import { ProfileUtil } from '$lib/utility';

export const backgroundController = (): BackgroundController => {
	const getUserProfile = async (): Promise<Profile> => {
		await profileController.loadProfiles();
		const user = get(userProfile);
		return Promise.resolve(user);
	};

	const addHistory = async (info: { acceptance: boolean; type: string }, domain: string) => {
		const user = await getUserProfile();
		const webSites = user.data?.webSites || {};
		const site = ProfileUtil.getWebSiteOrCreate(domain, user);

		site.history = [
			...(site.history as WebSiteHistory[]),
			{
				accepted: info.acceptance,
				type: info.type,
				created_at: new Date().toString(),
				data: undefined
			}
		];

		if (user.data) user.data.webSites = { ...webSites, [domain]: site };
		else user.data = { webSites: { [domain]: site } };

		await profileController.saveProfile(user);
	};

	const updatePermisison = async (
		duration: PermissionDuration,
		webSite: WebSite,
		domain: string,
		type: string
	) => {
		const user = await getUserProfile();
		const webSites: { [url: string]: WebSite } = user.data?.webSites || {};

		const site = ProfileUtil.getNewWebSitePermission(duration, webSite);
		if (user.data) user.data.webSites = { ...webSites, [domain]: site };
		else user.data = { webSites: { [domain]: site } };

		await profileController.saveProfile(user);
		await addHistory({ acceptance: duration.accept, type }, domain);
	};

	return { updatePermisison, getUserProfile, addHistory };
};