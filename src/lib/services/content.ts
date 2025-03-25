// Import polyfills first to ensure they're loaded before any dependencies
import '../utility/polyfills';
// All imports must be at the top level
import { web } from "$lib/utility";

// Wrap all content script logic in a try/catch to prevent unhandled errors
try {
  // Global context flag to track extension status
  let extensionContextValid = true;
  
  // Set up listener for extension context issues
  const checkExtensionContext = () => {
    try {
      // Just accessing chrome.runtime.id will throw if context is invalid
      const id = chrome.runtime.id;
      if (id) {
        extensionContextValid = true;
      }
    } catch (e) {
      extensionContextValid = false;
      console.warn("Extension context invalid. Some features may not work.");
    }
  };
  
  // Check context on script load
  checkExtensionContext();
  
  // Check context periodically
  setInterval(checkExtensionContext, 5000);
  
  if (window.nostr === undefined) {
    try {
      const script = document.createElement("script");
      script.setAttribute("async", "false");
      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", web.runtime.getURL("assets/nostr-provider.js"));
      document.head.appendChild(script);
    } catch (error) {
      console.error("Failed to inject nostr provider:", error);
    }
  }
  
  // Main message handler with robust error handling
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.ext !== "keys.band") return;
    if (event.data.response === undefined || event.data.response === null) {
      try {
        // Check extension context before attempting to send message
        if (!extensionContextValid) {
          // Return error immediately if extension context is invalid
          window.postMessage({
            id: event.data.id,
            ext: "keys.band",
            response: {
              error: {
                message: "Extension context invalidated",
                stack: "The extension context is invalid. Try reloading the page."
              }
            }
          }, "*");
          return;
        }
        
        const data = event.data || {};
        data["url"] = event.origin;
        
        // Add safety timeout
        const timeoutId = setTimeout(() => {
          // If we haven't received a response, send an error
          window.postMessage({
            id: data.id,
            ext: "keys.band",
            response: {
              error: {
                message: "Request timed out",
                stack: "The extension did not respond within the timeout period."
              }
            }
          }, "*");
        }, 10000);
        
        web.runtime.sendMessage({ ...data }, (response) => {
          clearTimeout(timeoutId);
          
          try {
            // Check if the extension context is still valid
            if (chrome.runtime.lastError) {
              console.error("Extension error:", chrome.runtime.lastError);
              
              // Send error response back to the page
              window.postMessage({
                id: data.id,
                ext: "keys.band",
                response: {
                  error: {
                    message: "Extension error",
                    stack: chrome.runtime.lastError.message || "Unknown runtime error"
                  }
                }
              }, "*");
              
              return;
            }
            
            if (response && response.response !== undefined && response.response !== null) {
              window.postMessage(response, "*");
            }
          } catch (error: unknown) {
            console.error("Error posting message back to page:", error);
            
            // Send error response back to the page
            window.postMessage({
              id: data.id,
              ext: "keys.band",
              response: {
                error: {
                  message: "Error posting message",
                  stack: error instanceof Error ? error.message : "Unknown error"
                }
              }
            }, "*");
          }
        });
      } catch (error: unknown) {
        console.error("Error sending message to background script:", error);
        
        // Send error response back to the page
        if (event.data && event.data.id) {
          window.postMessage({
            id: event.data.id,
            ext: "keys.band",
            response: {
              error: {
                message: "Failed to send message to extension",
                stack: error instanceof Error ? error.message : "Unknown error"
              }
            }
          }, "*");
        }
      }
    }
  });
  
  // Catch-all extension error handler
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Handle any messages from the background script
      sendResponse({ received: true });
      return true;
    });
  } catch (error) {
    console.error("Failed to set up chrome.runtime.onMessage listener:", error);
    extensionContextValid = false;
  }
  
} catch (globalError) {
  // Last resort error handler
  console.error("Fatal content script error:", globalError);
}
