import { web } from '$lib/utility/utils';
import type { PopupParams } from '$lib/types';

// Requests waiting in an approval popup. They are kept in storage.session, which is memory-only
// and not readable by content scripts, so an event or message text never reaches disk. Each
// request has its own key, so the background and the popup never overwrite each other.
const PREFIX = 'pending:';

export const pendingRequests = {
	set: async (id: string, params: PopupParams) => {
		await web.storage.session.set({ [PREFIX + id]: params });
	},

	get: async (id: string): Promise<PopupParams | null> =>
		((await web.storage.session.get(PREFIX + id)) as Record<string, PopupParams>)[PREFIX + id] ??
		null,

	remove: async (id: string) => {
		await web.storage.session.remove(PREFIX + id);
	},

	/** Drops requests whose popup belonged to an earlier run of the background. */
	clear: async () => {
		const keys = Object.keys(await web.storage.session.get(null)).filter((k) => k.startsWith(PREFIX));
		if (keys.length > 0) await web.storage.session.remove(keys);
	}
};
