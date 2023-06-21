// Note: Storage API wrapper
// Date: 06/21/2023
//..............................................................................
console.log("Mounting stores/utils...");

function getLocalStorageDb() {
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
export const db = getLocalStorageDb();
