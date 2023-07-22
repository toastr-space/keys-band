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
export let web = getBrowser();

export function domainToUrl(url) {
  return url.split("/")[2];
}

// function that return remaining time from data display day only if it's more than 1 day and minute, complete with zero if one character
export function remainingTime(datetime) {
  let now = new Date();
  let diff = datetime.getTime() - now.getTime();
  let days = Math.floor(diff / (1000 * 60 * 60 * 24));
  let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let _hours = hours.toString();
  let _minutes = minutes.toString();
  let _seconds = seconds.toString();

  if (seconds < 10) {
    _seconds = "0" + seconds;
  }

  if (minutes < 10) {
    _minutes = "0" + minutes;
  }

  if (hours < 10) {
    _hours = "0" + hours;
  }

  if (days > 0) {
    return days + " days" + " " + _hours + " hours";
  }
  return _hours + ":" + _minutes + ":" + _seconds + "";
}

export function getDuration(choice: number): Date {
  let duration = new Date();
  switch (choice) {
    case 0:
      return new Date();
    case 1:
      return new Date(duration.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
    case 2:
      return new Date(duration.getTime() + 5 * 60 * 1000);
    case 3:
      return new Date(duration.getTime() + 60 * 60 * 1000);
    case 4:
      return new Date(duration.getTime() + 5 * 60 * 60 * 1000);
    case 5:
      return new Date(duration.getTime() + 5 * 24 * 60 * 60 * 1000);
  }
}

export function reverseArray(arr) {
  var newArray = [];
  for (var i = arr.length - 1; i >= 0; i--) {
    newArray.push(arr[i]);
  }
  return newArray;
}

export function timeAgo(date) {
  let now = new Date();
  let diff = now.getTime() - date.getTime();
  let days = Math.floor(diff / (1000 * 60 * 60 * 24));
  let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return days + " days ago";
  } else if (hours > 0) {
    return hours + " hours ago";
  } else if (minutes > 0) {
    return minutes + " minutes ago";
  } else if (seconds > 0) {
    return seconds + " seconds ago";
  }
  return "now";
}

export const defaultWebNotificationSettings = [
  {
    name: "signEvent",
    description: "Sign Event",
    state: false,
  },
  {
    name: "permission",
    description: "Authentifcation",
    state: false,
  },
  {
    name: "nip04",
    description: "Message",
    state: false,
  },
  {
    name: "getPublicKey",
    description: "Get Public Key",
    state: false,
  },
  {
    name: "getRelays",
    description: "Get Relays",
    state: false,
  },
];

export function tr(name: string) {
  switch (name) {
    case "signEvent":
      return "Sign Event";
    case "permission":
      return "Get Permission";
    case "nip04":
      return "Message Encryption/Decription";
    case "getPublicKey":
      return "Get Public Key";
    case "getRelays":
      return "Get Relays";
    default:
      return name;
  }
}
