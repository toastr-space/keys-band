
export interface Profile {
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
        webSites?: object;
        relays?: Relay[];
    };
}

interface UserProfile {
    name?: string;
    picture?: string;
    nip05?: string;
}

export interface Authorization {
    always: boolean;
    accept: boolean;
    reject: boolean;
    authorizationStop?: Date;
}

export interface WebSite {
    auth: boolean;
    permission?: Authorization;
    history?: {
        type: string;
        data?: unknown;
        created_at: string;
        accepted: boolean;
    }[];
}


interface ProfileSetting {
    profile: string,
    privateKey: string,
    profileName: string,
    webSites: object,
    pubkey: string,
    relays: Relay[]
}

export interface Relay {
    url: string;
    enabled: boolean;
    created_at: Date;
}

export interface NotificationSetting {
    name: string;
    description: string;
    state: boolean;
}

export enum ProfileDeleteMethod {
    DEFAULT,
    BY_NAME,
    BY_PRIVATE_KEY
}
