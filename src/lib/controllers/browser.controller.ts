import type { Browser } from '$lib/types/profile';
import { web } from '$lib/utility/utils';

export function browserController(): Browser {
	const get = async (key: string): Promise<{ [key: string]: unknown }> => {
		try {
			const result = await web?.storage?.local?.get(key);
			return result;
		} catch (err) {
			return Promise.reject(err);
		}
	};
	const set = async (items: { [key: string]: unknown }): Promise<void> => {
		try {
			const result = await web?.storage?.local?.set(items);
			return result;
		} catch (err) {
			return Promise.reject(err);
		}
	};

	return { get, set };
}
