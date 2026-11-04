import type { Runtime, Tabs } from 'webextension-polyfill';

enum MessageType {
	GET_PUBLIC_KEY = 'getPublicKey',
	GET_RELAYS = 'getRelays',
	SIGN_EVENT = 'signEvent',
	NIP04_DECRYPT = 'nip04.decrypt',
	NIP04_ENCRYPT = 'nip04.encrypt'
}

interface Message {
	id: string;
	requestId?: string | number | undefined;
	prompt?: boolean | undefined; // popup message
	response?: boolean | undefined | any; // only when its reply
	type: MessageType | string;
	params: any | undefined;
	url: string | undefined;
}

interface MessageSender extends Runtime.MessageSender {
	id?: string | undefined;
	origin?: string | undefined;
	url?: string | undefined;
	tab?: Tabs.Tab | undefined;
}

interface PopupParams {
	action?: string;
	type: string;
	data?: any;
	url?: string | undefined;
	requestId?: string | undefined;
	origin?: string;
	permissions?: string[];
	previousProfile?: Profile;
}

interface PermissionDuration {
	always: boolean;
	accept: boolean;
	reject: boolean;
	duration: Date;
}

interface BackgroundController {
	updatePermisison: (
		profileId: string,
		origin: string,
		capability: string,
		duration: PermissionDuration
	) => Promise<void>;
	getUserProfile: () => Promise<Profile>;
	addHistory: (
		profileId: string,
		origin: string,
		info: { acceptance: boolean; type: string }
	) => Promise<void>;
}

enum AllowKind {
	AlWaysAllow,
	AlwaysReject,
	AllowForSession,
	RejectForSession,
	Nothing
}

export {
	Message,
	MessageSender,
	MessageType,
	PopupParams,
	AllowKind,
	BackgroundController,
	PermissionDuration
};
