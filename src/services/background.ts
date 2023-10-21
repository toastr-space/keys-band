import { getEventHash, getPublicKey, getSignature, nip04 } from "nostr-tools";
import { domainToUrl, web } from "src/stores/utils";
import {
  loadPrivateKey,
  webSites,
  type WebSite,
  keyStore,
  loadWebSites,
  loadRelays,
  loadNotifications,
  webNotifications,
} from "src/stores/key-store";
import { get } from "svelte/store";
import { escape } from "svelte/internal";

function injectInTab() {
  loadPrivateKey();
  web.tabs.query({}, async (tabs) => {
    for (let tab of tabs) {
      try {
        console.log(tab.id);
        await web.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["build/content.js"],
        });
        console.log("Injected Nostr Provider");
      } catch (e) {
        console.log("Error injecting Nostr Provider", e);
      }
    }
  });
}

web.runtime.onInstalled.addListener(function (details) {
  injectInTab();
});

web.runtime.onStartup.addListener(() => {
  injectInTab();
});

let responders = {};

function createWindow(options) {
  return new Promise((resolve, reject) => {
    web.windows.create({
      url: web.runtime.getURL(options.action),
      width: 400,
      height: 500,
      type: "popup",
    });
  });
}

async function updatePermission(
  duration: {
    always: boolean;
    accept: boolean;
    reject: boolean;
    duration: Date;
  },
  site: WebSite,
  domain: string,
  type: string,
  data?: {}
) {
  let _webSites = get(webSites);
  if (!_webSites) {
    _webSites = {};
  }
  if (duration.always === true) {
    site.auth = true;
    site.permission = {
      always: true,
      accept: duration.accept,
      reject: duration.reject,
    };

    _webSites[domain] = site;

    await web.storage.local.set({ webSites: _webSites });
    return true;
  } else {
    site.auth = true;
    site.permission = {
      always: false,
      accept: duration.accept,
      reject: duration.reject,
      authorizationStop: duration.duration,
    };

    _webSites[domain] = site;

    await web.storage.local.set({ webSites: _webSites });

    await addHistory(
      {
        acceptance: duration.accept,
        type: type,
      },
      domain
    );

    return true;
  }
}

async function makeResponse(type: string, data: any, domain: string) {
  await loadPrivateKey();
  let res;
  switch (type) {
    case "getPublicKey":
      res = getPublicKey(get(keyStore));
      break;
    case "getRelays":
      res = await loadRelays();
      res = res.map((relay) => {
        return { url: relay.url };
      });
      break;
    case "signEvent":
      res = data;
      if (res.pubkey == null) {
        const pk = getPublicKey(get(keyStore));
        res.pubkey = pk;
      }
      res.id = getEventHash(res);
      res.sig = getSignature(res, get(keyStore));
      break;
    case "nip04.decrypt":
      try {
        res = await nip04.decrypt(get(keyStore), data.peer, data.ciphertext);
      } catch (e) {
        res = {
          error: {
            message: "Error while decrypting data",
            stack: e,
          },
        };
      }
      break;
    case "nip04.encrypt":
      try {
        res = await nip04.encrypt(get(keyStore), data.peer, data.plaintext);
      } catch (e) {
        res = {
          error: {
            message: "Error while encrypting data",
            stack: e,
          },
        };
      }
      break;
    default:
      res = null;
  }
  return res;
}

async function showNotification(type: string, accepted) {
  await loadNotifications();
  let _notifications = get(webNotifications);
  _notifications.forEach((notification) => {
    if (type.indexOf(notification.name) !== -1 && notification.state === true) {
      web.notifications.create({
        type: "basic",
        iconUrl: "https://toastr.space/images/toastr/body.png",
        title: type + " permission requested",
        message:
          "Permission " + (accepted ? "accepted" : "rejected") + " for " + type,
        priority: 0,
      });
    }
  });
}

async function addHistory(
  info: { acceptance: boolean; type: string },
  domain: string
) {
  await showNotification(info.type, info.acceptance);
  let _webSites = await loadWebSites();
  if (_webSites === undefined || _webSites === null) {
    _webSites = {};
  }
  if (Object.keys(_webSites).indexOf(domain) !== -1) {
    let site = _webSites[domain];
    if (site === undefined || site === null) {
      site = {};
    }
    let array = site.history || [];
    array.push({
      accepted: info.acceptance,
      type: info.type,
      created_at: new Date().toString(),
      data: undefined,
    });
    site["history"] = array;
    _webSites[domain] = site;
    await web.storage.local.set({ webSites: _webSites });
  } else {
    let site = {
      auth: false,
      permission: {
        always: false,
        accept: true,
        reject: false,
      },
      history: [
        {
          accepted: info.acceptance,
          type: info.type,
          created_at: new Date().toString(),
        },
      ],
    };

    _webSites[domain] = site;
    await web.storage.local.set({ webSites: _webSites });
  }
}

async function manageResult(message, sender) {
  if (message.response !== undefined && message.response !== null) {
    if (responders[message.requestId]) {
      let responderData = responders[message.requestId];
      const domain = responderData.domain;
      let _webSites = get(webSites);
      let site: WebSite;
      if (_webSites === undefined || _webSites === null) {
        site = {
          auth: false,
          permission: {
            always: false,
            accept: true,
            reject: false,
          },
          history: [],
        };

        _webSites = {
          [domain]: site,
        };
      }

      if (Object.keys(_webSites).indexOf(domain) === -1) {
        site = {
          auth: false,
          permission: {
            always: false,
            accept: true,
            reject: false,
          },
          history: [],
        };
      } else {
        site = _webSites[domain];
      }

      await updatePermission(
        message.response.permission,
        site,
        responderData.domain,
        responderData.type
      );

      if (message.response.error) {
        responderData.resolve({
          id: message.requestId,
          type: responderData.type,
          ext: "keys.band",
          response: {
            error: {
              message: "User rejected the request",
              stack: "User rejected the request",
            },
          },
        });
        web.windows.remove(sender.tab.windowId);
        delete responders[message.requestId];
        return;
      }

      let res = await makeResponse(
        responderData.type,
        responderData.data,
        domain
      );

      responderData.resolve({
        id: message.requestId,
        type: responderData.type,
        ext: "keys.band",
        response: res,
      });
      web.windows.remove(sender.tab.windowId);
      delete responders[message.requestId];
    }
    return;
  }
}

async function manageRequest(message, sendResponse) {
  return new Promise(async (resolve, reject) => {
    await loadWebSites();
    let site;
    let resolved: boolean = false;
    await loadPrivateKey();
    if (get(keyStore) === "" || get(keyStore) === undefined) {
      resolved = true;
      resolve({
        id: message.id,
        type: message.type,
        ext: "keys.band",
        response: {
          error: {
            message: "No private key found",
            stack: "No private key found",
          },
        },
      });
      return;
    }

    try {
      site = get(webSites)[domainToUrl(message.url)];
    } catch (e) {
      site = undefined;
    }

    if (site) {
      if (
        site.auth &&
        (site.permission.accept !== undefined ||
          site.permission.always !== undefined)
      ) {
        if (site.permission.accept && site.permission.always) {
          let res = await makeResponse(
            message.type,
            message.params.event || message.params,
            domainToUrl(message.url)
          );

          addHistory(
            {
              acceptance: true,
              type: message.type,
            },
            domainToUrl(message.url)
          );

          resolved = true;
          resolve({
            id: message.id,
            type: message.type,
            ext: "keys.band",
            response: res,
          });
          return;
        } else if (site.permission.accept && !site.permission.always) {
          if (new Date(site.permission.authorizationStop) > new Date()) {
            let res = await makeResponse(
              message.type,
              message.params.event || message.params,
              domainToUrl(message.url)
            );

            addHistory(
              {
                acceptance: true,
                type: message.type,
              },
              domainToUrl(message.url)
            );

            resolved = true;
            resolve({
              id: message.id,
              type: message.type,
              ext: "keys.band",
              response: res,
            });
            return;
          }
        } else {
          if (site.permission.reject) {
            if (
              new Date(site.permission.authorizationStop) < new Date() &&
              !site.permission.always
            ) {
              site.permission.reject = false;
              site.permission.accept = true;
              site.permission.always = false;
            } else {
              resolved = true;

              addHistory(
                {
                  acceptance: false,
                  type: message.type,
                },
                domainToUrl(message.url)
              );

              resolve({
                id: message.id,
                type: message.type,
                ext: "keys.band",
                response: {
                  error: {
                    message: "User rejected the request",
                    stack: "User rejected the request",
                  },
                },
              });
              return;
            }
          }
        }
      }
    }
    if (resolved) return;

    responders[message.id] = {
      resolve: resolve,
      type: message.type,
      data: message.params.event || message.params,
      domain: domainToUrl(message.url),
    };

    let accept = await new Promise(async () => {
      let options = {
        action:
          "popup.html?action=login&url=" +
          message.url +
          "&requestId=" +
          message.id +
          "&type=" +
          message.type +
          "&data=" +
          escape(JSON.stringify(message.params.event || message.params) || ""),
        id: message.id,
      };
      try {
        let res = await createWindow(options);
      } catch (e) {}
    });
  });
}

web.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.prompt) {
    manageResult(message, sender);
    sendResponse({ message: true }); // Assumant que manageResult n'est pas asynchrone.
  } else {
    manageRequest(message, sendResponse).then((data) => {
      sendResponse(data);
    });
  }
  return true; // Renvoie true pour indiquer une réponse asynchrone.
});
