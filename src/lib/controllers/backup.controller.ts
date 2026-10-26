import { get } from 'svelte/store';

import type { Profile } from '$lib/types';
import { browser, profiles } from '$lib/stores/data';
import { withoutKeys } from './profile.controller';
import { vaultController } from './vault.controller';

/** A full backup. Keys are only included inside the encrypted vault. */
export const createBackup = async () => ({
	version: 2,
	exportDate: new Date().toISOString(),
	profiles: withoutKeys(get(profiles)),
	vault: await vaultController.exportEncrypted(),
	vaultSettings: await vaultController.getSettings(),
	currentProfile: (await browser.get('currentProfile'))?.currentProfile,
	theme: (await browser.get('theme'))?.theme,
	duration: (await browser.get('duration'))?.duration
});

/**
 * Restores a backup and returns the number of profiles restored.
 * Version 2 backups replace the vault, which then opens with the passphrase in use when the
 * backup was made. Version 1 backups contain plaintext keys, which are moved into the current
 * (unlocked) vault.
 */
export const restoreBackup = async (backupData: any): Promise<number> => {
	if (!backupData?.version || !Array.isArray(backupData.profiles)) {
		throw new Error('Invalid backup file format');
	}
	const incoming = backupData.profiles as Profile[];

	if (backupData.vault) {
		await vaultController.importEncrypted(backupData.vault);
		if (backupData.vaultSettings) await vaultController.setSettings(backupData.vaultSettings);
	} else {
		const legacy = incoming.filter((p) => p.id && p.data?.privateKey);
		if (legacy.length > 0 && (await vaultController.status()) !== 'unlocked') {
			throw new Error('Unlock Keys.Band before restoring this older backup');
		}
		for (const profile of legacy) {
			await vaultController.addKey(profile.id as string, profile.data?.privateKey as string);
		}
	}

	await browser.set({ profiles: withoutKeys(incoming) });
	if (backupData.currentProfile) await browser.set({ currentProfile: backupData.currentProfile });
	if (backupData.theme) await browser.set({ theme: backupData.theme });
	if (backupData.duration) await browser.set({ duration: backupData.duration });

	return incoming.length;
};
