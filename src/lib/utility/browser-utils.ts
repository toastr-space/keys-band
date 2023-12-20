
import { getDuration, web } from "$lib/utility/utils"
import type { Browser } from "$lib/types";

function browserControlleur(): Browser {
    const get = async (key: string): Promise<{ [key: string]: unknown }> => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await web?.storage?.local?.get(key);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    };
    const set = async (items: { [key: string]: unknown }): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await web?.storage?.local?.set(items);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    };

    return { get, set };
}

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
        console.error("Error injecting Nostr Provider", e);
        return Promise.reject(e)
    }
}

const injectJsinAllTabs = async (jsFileName: string): Promise<void> => {
    return new Promise((resolve) => {
        web.tabs.query({}, function (tabs: chrome.tabs.Tab[]) {
            tabs.forEach(async tab => {
                try {
                    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) return
                    await injectJsInTab(tab, jsFileName)
                } catch (e) {
                    console.log("Error injecting Nostr Provider", e);
                }
            })
            resolve()
        });
    });
}

const createWindow = async (url: string): Promise<chrome.windows.Window> => {
    return web.windows.create({
        url: web.runtime.getURL(url),
        width: 400,
        height: 500,
        type: "popup",
    });
}

const sendAuthorizationResponse = (yes: boolean, choice: number, url: string | undefined, requestId: string | undefined) => {
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
        requestId
    });
}

export { getCurrentTab, injectJsinAllTabs, createWindow, sendAuthorizationResponse, browserControlleur }