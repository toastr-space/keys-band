// Prevent duplicate injection with an IIFE (Immediately Invoked Function Expression)
(function() {
  // If the script has already been injected, don't re-initialize
  if (window.__keysband_initialized) {
    console.log("Keys.band provider already initialized, skipping");
    return;
  }
  
  // Mark as initialized to prevent double initialization
  window.__keysband_initialized = true;
  
  // Setup extension status tracker in window scope
  // This will persist even if content script is reloaded
  window.__keysband_status = window.__keysband_status || {
    contextInvalidated: false,
    lastError: null,
    errorCount: 0,
    timeoutIds: {},
    maxErrorsBeforeBlock: 5,
    resetTime: 10000,
    lastReset: Date.now()
  };
  
  // Get reference to the tracker
  var statusTracker = window.__keysband_status;
  
  // Auto-reset error count periodically 
  if (Date.now() - statusTracker.lastReset > statusTracker.resetTime) {
    statusTracker.errorCount = 0;
    statusTracker.lastReset = Date.now();
  }
  
  // If we hit too many errors in a short period, block extension for a while
  if (statusTracker.errorCount >= statusTracker.maxErrorsBeforeBlock) {
    if (!statusTracker.blockUntil || Date.now() > statusTracker.blockUntil) {
      console.warn('Keys.band: Too many errors, blocking extension calls for 30 seconds');
      statusTracker.blockUntil = Date.now() + 30000;
    }
  }

window.nostr = {
  _requests: {},
  _pubkey: null,
  _pubkeyTimestamp: 0,  // Track when the pubkey was last fetched
  _cacheTimeout: 2000,  // Cache timeout in milliseconds (2 seconds)
  _extensionError: statusTracker.contextInvalidated, // Use the shared tracker
  _errorRetryTimeout: 5000, // Wait 5 seconds before retrying after an error

  async getPublicKey() {
    const now = Date.now();
    
    // If we've detected an extension error, don't make repeated requests
    if (this._extensionError) {
      console.warn("Keys.band extension is currently unavailable. Retry in a few seconds.");
      return this._pubkey || "extension_unavailable";
    }
    
    // Use cached pubkey if it exists and hasn't expired
    // This reduces requests while still allowing account switching to be detected
    if (this._pubkey && (now - this._pubkeyTimestamp < this._cacheTimeout)) {
      return this._pubkey;
    }
    
    try {
      this._pubkeyTimestamp = now;
      // Get fresh pubkey from extension
      this._pubkey = await this._call("getPublicKey", {});
      return this._pubkey;
    } catch (error) {
      console.error("Error getting public key:", error);
      // If we get an "Extension context invalidated" error, set the error flag
      if (error.message && error.message.includes("Extension context invalidated")) {
        this._setExtensionError();
      }
      return this._pubkey || "error_getting_pubkey";
    }
  },
  
  // Handle extension errors with a timeout before allowing retries
  _setExtensionError() {
    this._extensionError = true;
    statusTracker.contextInvalidated = true;
    statusTracker.errorCount++;
    statusTracker.lastError = new Date().toISOString();
    
    console.warn("Keys.band extension context invalidated. Will retry in 5 seconds.");
    console.warn(`Error count: ${statusTracker.errorCount}/${statusTracker.maxErrorsBeforeBlock}`);
    
    // Clear any previous retry timer
    if (statusTracker.timeoutIds.retry) {
      clearTimeout(statusTracker.timeoutIds.retry);
    }
    
    // After the timeout, allow retrying again
    statusTracker.timeoutIds.retry = setTimeout(() => {
      this._extensionError = false;
      statusTracker.contextInvalidated = false;
      console.log("Keys.band extension ready to reconnect.");
    }, this._errorRetryTimeout);
  },

  async signEvent(event) {
    return this._call("signEvent", { event });
  },

  async signEventAsGroupMember(event) {
    // The group members are expected to be in the tags array as:
    // ["group-member-proof", null, <pubkey_1>, <pubkey_2>, ..., <pubkey_n>]
    return this._call("signEventAsGroupMember", { event });
  },

  async verifyGroupMemberProof(event) {
    return this._call("verifyGroupMemberProof", { event });
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
    // Check for global block due to excessive errors
    if (statusTracker.blockUntil && Date.now() < statusTracker.blockUntil) {
      const remainingSeconds = Math.ceil((statusTracker.blockUntil - Date.now()) / 1000);
      return Promise.reject(
        new Error(`keys.band: Extension calls temporarily blocked due to excessive errors. Try again in ${remainingSeconds} seconds.`)
      );
    }
    
    // Don't make calls if we've detected an extension error
    if (this._extensionError || statusTracker.contextInvalidated) {
      return Promise.reject(new Error("keys.band: Extension context is currently unavailable. Please try again in a few seconds."));
    }
    
    let id = Math.random().toString().slice(-4);
    console.log(
      "%c[keys.band:%c" +
      id +
      "%c]%c calling %c" +
      type +
      "%c with %c" +
      JSON.stringify(params || {}),
      "background-color:#f1b912;font-weight:bold;color:white",
      "background-color:#f1b912;font-weight:bold;color:#a92727",
      "background-color:#f1b912;color:white;font-weight:bold",
      "color:auto",
      "font-weight:bold;color:#08589d;font-family:monospace",
      "color:auto",
      "font-weight:bold;color:#90b12d;font-family:monospace"
    );
    
    return new Promise((resolve, reject) => {
      // Create a timeout to detect if extension is unresponsive
      const timeoutId = setTimeout(() => {
        // If we haven't received a response in 5 seconds, assume extension context error
        if (this._requests[id]) {
          delete this._requests[id];
          this._setExtensionError();
          reject(new Error("keys.band: Extension did not respond within timeout period. Extension may need to be reloaded."));
        }
      }, 5000);
      
      this._requests[id] = { 
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        }, 
        reject: (error) => {
          clearTimeout(timeoutId);
          
          // Check if this is an extension context error
          if (error && error.message && error.message.includes("Extension context invalidated")) {
            this._setExtensionError();
          }
          
          reject(error);
        }
      };
      
      try {
        window.postMessage(
          {
            id,
            ext: "keys.band",
            type,
            params,
          },
          "*"
        );
      } catch (error) {
        clearTimeout(timeoutId);
        delete this._requests[id];
        console.error("Error posting message to extension:", error);
        reject(new Error("keys.band: Failed to communicate with extension: " + error.message));
      }
    });
  },
};

window.addEventListener("message", (message) => {
  if (
    !message.data ||
    message.data.response === null ||
    message.data.response === undefined ||
    message.data.ext !== "keys.band"
  )
    return;
  
  // Check if this is a message for which we're expecting a response
  if (!window.nostr._requests[message.data.id]) {
    // This could be a response to a request from a previous page load
    // or a duplicate response. Just log it and ignore.
    console.log("Received response for unknown request", message.data.id);
    return;
  }

  try {
    if (message.data.response.error) {
      let error = new Error("keys.band: " + message.data.response.error.message);
      error.stack = message.data.response.error.stack;
      
      // Check for extension context invalidation errors
      if (error.message && (
          error.message.includes("Extension context invalidated") ||
          error.message.includes("Extension error") ||
          error.message.includes("Request timed out"))
      ) {
        window.nostr._setExtensionError();
      }
      
      window.nostr._requests[message.data.id].reject(error);
    } else {
      // Reset error count on successful response
      if (statusTracker.errorCount > 0) {
        statusTracker.errorCount = Math.max(0, statusTracker.errorCount - 1);
      }
      
      window.nostr._requests[message.data.id].resolve(message.data.response);
    }
  } catch (error) {
    console.error("Error handling message response:", error);
    // If there's an error in handling the response, reject the promise
    if (window.nostr._requests[message.data.id]) {
      window.nostr._requests[message.data.id].reject(
        new Error("keys.band: Error handling response: " + error.message)
      );
    }
  }

  console.log(
    "%c[keys.band:%c" +
    message.data.id +
    "%c]%c result: %c" +
    JSON.stringify(
      message?.data?.response || message?.data?.response?.error?.message || {}
    ),
    "background-color:#f1b912;font-weight:bold;color:white",
    "background-color:#f1b912;font-weight:bold;color:#a92727",
    "background-color:#f1b912;color:white;font-weight:bold",
    "color:auto",
    "font-weight:bold;color:#08589d"
  );

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

// Close the IIFE that wraps the entire script
})();
