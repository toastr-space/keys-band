
import { web } from "$lib/stores/utils"

const getCurrentTab = async (): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve) => {
        web.tabs.query({ active: true, currentWindow: true }, function (tabs: chrome.tabs.Tab[]) {
            resolve(tabs[0])
        });
    });
}

export { getCurrentTab }