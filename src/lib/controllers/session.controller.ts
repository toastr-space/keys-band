import { browser } from '$lib/stores/data';
import type { PopupParams } from '$lib/types';

export const sessionController = () => {
	const loadData = async (): Promise<{ [key: string]: any }> => {
		const datas = await browser.get('sessionData');
		if (datas?.sessionData) return datas?.sessionData;
		return {};
	};

	const popAtIndex = async (index: string): Promise<any> => {
		const data = await loadData();
		const value = data[index];
		delete data[index];
		browser.set({ sessionData: data });
		return value;
	};

	const add = async (event: PopupParams): Promise<string> => {
		const randomId = Math.random().toString(36).substring(7);
		const data = await loadData();
		data[randomId] = event;
		browser.set({ sessionData: data });
		return randomId;
	};

	const remove = async (id: string): Promise<void | any> => popAtIndex(id);
	const getById = async (id: string): Promise<any> => await popAtIndex(id);

	return {
		add,
		remove,
		getById
	};
};
