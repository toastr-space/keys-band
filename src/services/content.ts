function getBrowser() {
  // @ts-ignore
  if (typeof window.browser !== "undefined") {
    // @ts-ignore
    return window.browser;
    // @ts-ignore
  } else if (typeof window.chrome !== "undefined") {
    // @ts-ignore
    return window.chrome;
  }

  return null;
}

let web = getBrowser();

if (window["nostr"] === undefined) {
  let script = document.createElement("script");
  script.setAttribute("async", "false");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", web.runtime.getURL("build/nostr-provider.js"));
  document.head.appendChild(script);
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data) return;
  if (event.data.ext !== "nos2x") return;
  if (event.data.response === undefined || event.data.response === null) {
    const data = event.data || {};
    data["url"] = event.origin;
    web.runtime.sendMessage(
      {
        ...data,
      },
      (response) => {
        if (response.response !== undefined && response.response !== null) {
          window.postMessage(response, "*");
        }
      }
    );
  }
});
