// Prevent multiple injections
if ((window as any).__KEYS_BAND_CONTENT_LOADED__) {
  // Already loaded, skip
} else {
  (window as any).__KEYS_BAND_CONTENT_LOADED__ = true;

  // Inline browser API getter to avoid imports
  function getBrowser(): typeof chrome | null {
    // @ts-ignore
    if (typeof browser !== "undefined") {
      // @ts-ignore
      return browser;
      // @ts-ignore
    } else if (typeof chrome !== "undefined") {
      // @ts-ignore
      return chrome;
    }
    return null;
  }

  const web = getBrowser()!;

  if (window.nostr === undefined) {
    const script = document.createElement("script");
    script.setAttribute("async", "false");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", web.runtime.getURL("assets/nostr-provider.js"));
    document.head.appendChild(script);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.ext !== "keys.band") {
      return;
    }
    if (event.data.response === undefined || event.data.response === null) {
      // Forward only the NIP-07 request fields; anything else the page adds (e.g. prompt,
      // requestId, response) must never reach the background script
      const { id, type, params } = event.data;
      if (typeof id !== 'string' || typeof type !== 'string') return;
      const data = { id, type, params, ext: 'keys.band' };

      web.runtime.sendMessage(data, (response: unknown) => {
        // Check for runtime errors
        if (web.runtime.lastError) {
          console.error('[Content] Runtime error:', web.runtime.lastError);
          return;
        }

        if (response && typeof response === 'object' && 'response' in response && (response as Record<string, unknown>).response !== undefined && (response as Record<string, unknown>).response !== null) {

          try {
            window.postMessage(response, "*");
          } catch (error) {
            console.error('[Content] Error posting message back to page:', error);
          }
        }
      });
    }
  });
}