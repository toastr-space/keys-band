enum MessageType {
    GET_PUBLIC_KEY = "getPublicKey",
    GET_RELAYS = "getRelays",
    SIGN_EVENT = "signEvent",
    NIP04_DECRYPT = "nip04.decrypt",
    NIP04_ENCRYPT = "nip04.encrypt"
}

interface Message {
    id: string;
    requestId?: string | number | undefined;
    prompt?: boolean | undefined;  // popup message
    response?: boolean | undefined | any; // only when its reply
    type: MessageType | string;
    params: any | undefined;
    url: string | undefined;
}

interface MessageSender extends chrome.runtime.MessageSender {
    id?: string | undefined;
    origin?: string | undefined;
    url?: string | undefined;
    tab?: chrome.tabs.Tab | undefined;
}

interface PopupParams {
    action?: string;
    type: string;
    data?: any;
    url?: string | undefined;
    requestId?: string | undefined;
    origin?: string;
    permissions?: string[];
}

interface SessionManager {
    add?: (data: any) => Promise<string>;
    remove?: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
}

enum AllowKind {
    AlWaysAllow,
    AlwaysReject,
    AllowForSession,
    RejectForSession,
    Nothing
}

export { Message, MessageSender, MessageType, PopupParams, AllowKind, SessionManager }