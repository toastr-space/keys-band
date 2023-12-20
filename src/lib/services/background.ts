import { finishEvent, getPublicKey, nip04 } from 'nostr-tools';
import { urlToDomain, web } from '../stores/utils';
import { controlleur, profileControlleur } from '../stores/controlleur';

import type { WebSite, Authorization } from '$lib/types/profile';

import { userProfile } from '$lib/stores/data';
import { get } from 'svelte/store';
import type { Message, MessageSender, PopupParams } from '$lib/types';
import { AllowKind } from '$lib/types';
import { BrowserUtil, ProfileUtil } from '$lib/utility';


const sessionManager = controlleur.sessionControlleur();
const bgControlleur = controlleur.backgroundControlleur();

web.runtime.onInstalled.addListener(() => BrowserUtil.injectJsinAllTabs('content.js'));
web.runtime.onStartup.addListener(() => BrowserUtil.injectJsinAllTabs('content.js'));

const responders: {
	[key: string]: {
		resolve: (value?: any) => void;
		type: string;
		data: any;
		domain: string;
	};
} = {};

async function makeResponse(type: string, data: any) {
	await profileControlleur.loadProfiles();
	const user = get(userProfile);
	const privateKey: string = user.data?.privateKey || '';
	let res;
	switch (type) {
		case 'getPublicKey':
			res = getPublicKey(privateKey);
			break;
		case 'getRelays':
			res = user.data?.relays?.map((relay) => {
				return { url: relay?.url };
			});
			break;
		case 'signEvent':
			res = data;
			if (res?.pubkey == null || res?.pubkey === undefined || res?.pubkey === '') {
				const pk = getPublicKey(privateKey);
				res.pubkey = pk;
			}
			res = finishEvent(res, privateKey);
			break;
		case 'nip04.decrypt':
			try {
				res = await nip04.decrypt(privateKey, data.peer, data.ciphertext);
			} catch (e) {
				res = {
					error: {
						message: 'Error while decrypting data',
						stack: e
					}
				};
			}
			break;
		case 'nip04.encrypt':
			try {
				res = await nip04.encrypt(privateKey, data.peer, data.plaintext);
			} catch (e) {
				res = {
					error: {
						message: 'Error while encrypting data',
						stack: e
					}
				};
			}
			break;
		default:
			res = null;
	}
	return res;
}

// async function showNotification(type: string, accepted: boolean) {
// 	await loadNotifications();
// 	const _notifications = get(webNotifications);
// 	_notifications.forEach((notification) => {
// 		if (type.indexOf(notification.name) !== -1 && notification.state === true) {
// 			web.notifications.create({
// 				type: 'basic',
// 				iconUrl: 'https://toastr.space/images/toastr/body.png',
// 				title: type + ' permission requested',
// 				message: 'Permission ' + (accepted ? 'accepted' : 'rejected') + ' for ' + type,
// 				priority: 0
// 			});
// 		}
// 	});
// }

async function manageResult(message: Message, sender: any) {
	try {
		if (message.response === undefined) return;
		const responderData = responders[message.requestId as string];
		if (!responderData) return;

		const domain = responderData.domain;
		const user = get(userProfile);
		const site: WebSite = ProfileUtil.getWebSiteOrCreate(domain, user);

		await bgControlleur.updatePermisison(
			message.response.permission,
			site,
			responderData.domain,
			responderData.type
		);

		if (message.response.error) responderData.resolve({
			id: message.requestId,
			type: responderData.type,
			ext: 'keys.band',
			response: {
				error: {
					message: 'User rejected the request',
					stack: 'User rejected the request'
				}
			}
		});
		else responderData.resolve({
			id: message.requestId,
			type: responderData.type,
			ext: 'keys.band',
			response: await makeResponse(responderData.type, responderData.data)
		});

	} catch (e) {
		console.error(e);
	}

	web.windows.remove(sender.tab.windowId);
	delete responders[message.requestId as string];
	return;
}

const pushHistory = async (yes: boolean, message: Message) => {
	const domain = urlToDomain(message.url || '');
	await bgControlleur.addHistory(
		{
			acceptance: yes,
			type: message.type
		},
		domain
	);
};

const isAllow = async (domain: string): Promise<AllowKind> => {
	const user = await bgControlleur.getUserProfile();
	const site: WebSite = ProfileUtil.getWebSiteOrCreate(domain, user);
	const permission: Authorization = site.permission as Authorization;

	if (permission.accept) {
		if (permission.always) return AllowKind.AlWaysAllow;
		else {
			if (new Date(permission.authorizationStop || '') > new Date()) {
				return AllowKind.AllowForSession;
			} else return AllowKind.Nothing;
		}
	} else if (permission.reject) {
		if (permission.always) return AllowKind.AlwaysReject;
		else {
			if (new Date(permission.authorizationStop || '') > new Date())
				return AllowKind.RejectForSession;
			else return AllowKind.Nothing;
		}
	} else return AllowKind.Nothing;
};

const buildResponseMessage = (message: Message, response: any): any => {
	return {
		id: message.id,
		type: message.type,
		ext: 'keys.band',
		response: response || {
			error: {
				message: 'User rejected the request',
				stack: 'User rejected the request'
			}
		},
		url: message.url
	};
};

/*eslint no-async-promise-executor: 0*/
async function manageRequest(message: Message): Promise<any> {
	return new Promise(async (resolve) => {
		await profileControlleur.loadProfiles();
		const user = get(userProfile);
		const domain = urlToDomain(message.url || '');

		if (user.data?.privateKey === undefined)
			return Promise.resolve(
				buildResponseMessage(message, {
					error: {
						message: 'User rejected the request',
						stack: 'User rejected the request'
					}
				})
			);

		const access: AllowKind = await isAllow(domain);

		switch (access) {
			case AllowKind.AlWaysAllow:
				pushHistory(true, message);
				return resolve(
					buildResponseMessage(
						message,
						await makeResponse(message.type, message.params.event || message.params)
					)
				);
			case AllowKind.AlwaysReject:
				pushHistory(false, message);
				return resolve(
					buildResponseMessage(message, {
						error: {
							message: 'User rejected the request',
							stack: 'User rejected the request'
						}
					})
				);
			case AllowKind.AllowForSession:
				pushHistory(true, message);
				return resolve(
					buildResponseMessage(
						message,
						await makeResponse(message.type, message.params?.event || message.params)
					)
				);
			case AllowKind.RejectForSession:
				pushHistory(false, message);
				return resolve(
					buildResponseMessage(message, {
						error: {
							message: 'User rejected the request',
							stack: 'User rejected the request'
						}
					})
				);
			case AllowKind.Nothing:
				break;
		}

		responders[message.id] = {
			resolve,
			domain,
			type: message.type,
			data: message.params.event || message.params
		};

		const dataId = await sessionManager.add({
			action: 'login',
			url: message.url,
			requestId: message.id,
			type: message.type,
			data: message.params.event || message.params || '{}' || ''
		})

		await BrowserUtil.createWindow('popup.html?query=' + btoa(dataId));
	});
}

web.runtime.onMessage.addListener((message: Message, sender: MessageSender, sendResponse) => {
	if (message.prompt) {
		manageResult(message, sender);
		sendResponse({ message: true });
	} else manageRequest(message)
		.then((data) => sendResponse(data))
		.catch((err) => alert(err));

	return true;
});
