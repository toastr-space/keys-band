
import { getDuration, web } from "$lib/stores/utils"

const getCurrentTab = async (): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve) => {
        web.tabs.query({ active: true, currentWindow: true }, function (tabs: chrome.tabs.Tab[]) {
            resolve(tabs[0])
        });
    });
}

const injectJsInTab = async (tab: chrome.tabs.Tab, jsFileName: string): Promise<void> => {
    try {
        await web.scripting.executeScript({
            target: { tabId: tab.id as number },
            files: [jsFileName],
        });
        return Promise.resolve()
    } catch (e) {
        console.log("Error injecting Nostr Provider", e);
        return Promise.reject(e)
    }
}

const injectJsinAllTabs = async (jsFileName: string): Promise<void> => {
    return new Promise((resolve) => {
        web.tabs.query({}, function (tabs: chrome.tabs.Tab[]) {
            tabs.forEach(async tab => {
                try {
                    await injectJsInTab(tab, jsFileName)
                } catch (e) {
                    console.log("Error injecting Nostr Provider", e);
                }
            })
            resolve()
        });
    });
}


// web.runtime.sendMessage({
// 				prompt: true,
// 				response: {
// 					status: 'error',
// 					error: true,
// 					permission: {
// 						always: event.detail.duration === 1,
// 						duration: getDuration(event.detail.duration),
// 						accept: false,
// 						reject: true
// 					}
// 				},
// 				ext: 'keys.band',
// 				url: parameter.url,
// 				requestId: parameter.requestId
// 			});

const createWindow = async (url: string): Promise<chrome.windows.Window> => {
    return web.windows.create({
        url: web.runtime.getURL(url),
        width: 400,
        height: 500,
        type: "popup",
    });
}

const sendAuthorizationResponse = (yes: boolean, choice: number, url: string | undefined, requestedId: string | number | undefined) => {
    console.log("sendAuthorizationResponse", yes, choice, url, requestedId)
    return web.runtime.sendMessage({
        prompt: true,
        response: {
            status: yes ? "success" : "error",
            error: !yes,
            permission: {
                always: choice === 1,
                duration: getDuration(choice),
                accept: yes,
                reject: !yes,
            }
        },
        ext: "keys.band",
        url,
        requestedId
    });
}

export { getCurrentTab, injectJsinAllTabs, createWindow, sendAuthorizationResponse }