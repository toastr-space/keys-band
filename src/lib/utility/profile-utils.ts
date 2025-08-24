import type { PermissionDuration, Profile, WebSite } from "$lib/types";

const createNewWebSite = (): WebSite => {
    return {
        auth: false,
        permission: {
            always: false,
            accept: false,
            reject: false,
            authorizationStop: new Date().toString()
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

const getNewWebSitePermission = (duration: PermissionDuration, site: WebSite): WebSite => {
    const newSite = { ...site };
    newSite.permission = {
        always: duration.always,
        accept: duration.accept,
        reject: duration.reject,
        authorizationStop: duration.duration.toString()
    }
    return newSite;
}

export { getWebSiteOrCreate, getNewWebSitePermission }
