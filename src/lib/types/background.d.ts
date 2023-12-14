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
    prompt?: boolean | undefined;
    response?: boolean | undefined | any;
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
    requestId?: string | number | undefined;
    origin?: string;
    permissions?: string[];
}

export { Message, MessageSender, MessageType, PopupParams }