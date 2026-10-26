import type { Profile, WebSite } from "$lib/types";

const createNewWebSite = (): WebSite => {
    return {
        auth: false,
        permissions: {},
        history: []
    }
}

const getWebSiteOrCreate = (origin: string, profile: Profile): WebSite => {
    let site;
    if (profile.data?.webSites) {
        site = profile.data?.webSites[origin] || createNewWebSite();
    } else {
        site = createNewWebSite();
    }
    return site;
}

export { getWebSiteOrCreate }
