import { userProfile } from '$lib/stores/data';
import { get } from 'svelte/store';
import { getDuration } from './utils';
import { profileControlleur } from './key-store';

const accept = async (accept: boolean, domain: string, choice: number = 0) => {
    try {
        const webSites = get(userProfile)?.data?.webSites || {};
        const site = webSites[domain] || {};
        site.permission = {
            always: choice === 1,
            authorizationStop: getDuration(choice),
            accept: accept,
            reject: !accept
        };

        const arr = site.history || [];
        arr.push({
            accepted: accept,
            type: 'permission',
            created_at: new Date().toString(),
            data: undefined
        });

        site['history'] = arr;
        webSites[domain] = site;
        userProfile.update((x: any) => {
            if (x.data !== undefined || x.data !== null) {
                x.data.webSites = webSites;
                return x;
            }
        });

        profileControlleur.saveProfile(get(userProfile));

        return true;
    } catch (err) {
        alert(err);
    }
}

export { accept }