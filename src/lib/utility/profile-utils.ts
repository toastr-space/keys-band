import type { Profile, WebSite } from "$lib/types";

const createNewWebSite = (): WebSite => {
    return {
        auth: false,
        permission: {
            always: false,
            accept: false,
            reject: false
        },
        history: []
    }
}

const getWebSiteOrCreate = (domain: string, profile: Profile): WebSite => {
    let site;
    if (profile.data?.webSites) {
        site = profile.data?.webSites[domain] || createNewWebSite();
    } else {
        site = createNewWebSite();
    }
    return site;
}

export { getWebSiteOrCreate }