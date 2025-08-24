window.nostr = {
  _requests: {},
  _pubkey: null,
  _pubkeyTimestamp: 0,  // Track when the pubkey was last fetched
  _cacheTimeout: 2000,  // Cache timeout in milliseconds (2 seconds)

  async getPublicKey() {
    const now = Date.now();
    
    // Use cached pubkey if it exists and hasn't expired
    // This reduces requests while still allowing account switching to be detected
    if (this._pubkey && (now - this._pubkeyTimestamp < this._cacheTimeout)) {
      return this._pubkey;
    }
    
    this._pubkeyTimestamp = now;
    // Get fresh pubkey from extension
    this._pubkey = await this._call("getPublicKey", {});
    return this._pubkey;
  },

  async signEvent(event) {
    return this._call("signEvent", { event });
  },

  async getRelays() {
    return this._call("getRelays", {});
  },

  nip04: {
    async encrypt(peer, plaintext) {
      return window.nostr._call("nip04.encrypt", { peer, plaintext });
    },

    async decrypt(peer, ciphertext) {
      return window.nostr._call("nip04.decrypt", { peer, ciphertext });
    },
  },

  _call(type, params) {
    let id = Math.random().toString().slice(-4);
    return new Promise((resolve, reject) => {
      this._requests[id] = { resolve, reject };
      window.postMessage(
        {
          id,
          ext: "keys.band",
          type,
          params,
        },
        "*"
      );
    });
  },
};

window.addEventListener("message", (message) => {
  if (
    !message.data ||
    message.data.response === null ||
    message.data.response === undefined ||
    message.data.ext !== "keys.band" ||
    !window.nostr._requests[message.data.id]
  )
    return;

  if (message.data.response.error) {
    let error = new Error("keys.band: " + message.data.response.error.message);
    error.stack = message.data.response.error.stack;
    window.nostr._requests[message.data.id].reject(error);
  } else {
    window.nostr._requests[message.data.id].resolve(message.data.response);
  }

  delete window.nostr._requests[message.data.id];
});

// hack to replace nostr:nprofile.../etc links with something else
if (typeof replacing !== "undefined") {
  document.addEventListener("mousedown", replaceNostrSchemeLink);
  async function replaceNostrSchemeLink(e) {
    if (e.target.tagName !== "A" || !e.target.href.startsWith("nostr:")) return;
    if (replacing === false) return;

    let response = await window.nostr._call("replaceURL", {
      url: e.target.href,
    });
    if (response === false) {
      replacing = false;
      return;
    }

    e.target.href = response;
  }
}
