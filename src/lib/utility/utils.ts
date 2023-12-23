import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

export function getBrowser() {
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
export const web: typeof chrome = getBrowser();

export function urlToDomain(url: string) {
  return url?.split("/")[2];
}

export function getDuration(choice: number): Date {
  const duration = new Date();
  switch (choice) {
    case 0:
      return new Date();
    case 1:
      return new Date(duration.getTime() + 100 * 365 * 24 * 60 * 60 * 100);
    case 2:
      return new Date(duration.getTime() + 5 * 60 * 1000);
    case 3:
      return new Date(duration.getTime() + 60 * 60 * 1000);
    case 4:
      return new Date(duration.getTime() + 5 * 60 * 60 * 1000);
    case 5:
      return new Date(duration.getTime() + 5 * 24 * 60 * 60 * 1000);
  }
  return new Date();
}

export function tr(name: string) {
  switch (name) {
    case "signEvent":
      return "Sign Event";
    case "permission":
      return "All Access";
    case "nip04":
      return "Message Encryption/Decription";
    case "nip04.encrypt":
      return "Message Encryption";
    case "nip04.decrypt":
      return "Message Decription";
    case "getPublicKey":
      return "Get Public Key";
    case "getRelays":
      return "Get Relays";
    default:
      return name;
  }
}


export { timeAgo }