interface Profile {
    name?: string;
    id?: string;
    metadata?: {
        name?: string;
        picture?: string;
        nip05?: string;
    }
    data?: {
        pubkey?: string;
        privateKey?: string;
        webSites?: { [url: string]: WebSite };
        relays?: Relay[];
    };
}

interface UserProfile {
    name?: string;
    picture?: string;
    nip05?: string;
}

interface Authorization {
    always: boolean;
    accept: boolean;
    reject: boolean;
    authorizationStop?: string | undefined;
}

interface WebSiteHistory {
    type: string;
    data?: unknown;
    created_at: string;
    accepted: boolean;
}

interface WebSite {
    auth: boolean;
    permission?: Authorization;
    history?: WebSiteHistory[];
}

interface ProfileSetting {
    profile: string,
    privateKey: string,
    profileName: string,
    webSites: object,
    pubkey: string,
    relays: Relay[]
}

interface RelayMetadata {
    name: string,
    description: string,
    pubkey: string,
    contact?: string,
    supported_nips?: object,
    software?: string,
    version?: string
}

enum RelayAccess {
    READ = 0,
    WRITE = 1,
    READ_WRITE = 2
}

interface Relay {
    name?: string;
    metadata?: RelayMetadata;
    access?: RelayAccess;
    url: string;
    enabled: boolean;
    created_at: Date;
}

interface NotificationSetting {
    name: string;
    description: string;
    state: boolean;
}

interface Browser {
    get: (key: string) => Promise<{ [key: string]: unknown }>;
    set: (items: { [key: string]: unknown }) => Promise<void>;
}

enum ProfileDeleteMethod {
    DEFAULT,
    BY_NAME,
    BY_PRIVATE_KEY
}


export { Profile, UserProfile, WebSite, WebSiteHistory, ProfileSetting, Relay, RelayAccess, NotificationSetting, ProfileDeleteMethod, Authorization, Browser }