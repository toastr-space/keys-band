// NIP-07 provider. The browser runs this file in the page itself (manifest "world": "MAIN"),
// so no extension URL is ever exposed to the page. Requests go to content.js via postMessage.
(() => {
  // a second injection (e.g. after an extension update) must not replace an object the page holds
  if (window.nostr && window.nostr.__keysBand) return;

  const provider = {
    __keysBand: true,
    _requests: {},
    _pubkey: null,
    _pubkeyTimestamp: 0, // Track when the pubkey was last fetched
    _cacheTimeout: 2000, // Cache timeout in milliseconds (2 seconds)

    async getPublicKey() {
      const now = Date.now();

      // Use cached pubkey if it exists and hasn't expired
      // This reduces requests while still allowing account switching to be detected
      if (this._pubkey && now - this._pubkeyTimestamp < this._cacheTimeout) {
        return this._pubkey;
      }

      this._pubkeyTimestamp = now;
      // Get fresh pubkey from extension
      this._pubkey = await provider._call("getPublicKey", {});
      return this._pubkey;
    },

    async signEvent(event) {
      return provider._call("signEvent", { event });
    },

    async getRelays() {
      return provider._call("getRelays", {});
    },

    nip04: {
      async encrypt(peer, plaintext) {
        return provider._call("nip04.encrypt", { peer, plaintext });
      },

      async decrypt(peer, ciphertext) {
        return provider._call("nip04.decrypt", { peer, ciphertext });
      },
    },

    _call(type, params) {
      // getRandomValues also works on plain-http pages, unlike crypto.randomUUID
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");
      return new Promise((resolve, reject) => {
        provider._requests[id] = { resolve, reject };
        window.postMessage({ id, ext: "keys.band", type, params }, "*");
      });
    },
  };

  window.nostr = provider;

  window.addEventListener("message", (message) => {
    const data = message.data;
    if (
      !data ||
      data.response === null ||
      data.response === undefined ||
      data.ext !== "keys.band" ||
      !provider._requests[data.id]
    )
      return;

    const request = provider._requests[data.id];
    delete provider._requests[data.id];

    if (data.response.error) {
      const error = new Error("keys.band: " + data.response.error.message);
      error.stack = data.response.error.stack;
      request.reject(error);
    } else {
      request.resolve(data.response);
    }
  });
})();
