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

// add minute or hours or days to a date and
export function updateDate(days: number, hours: number, minute: number) {
  let now = new Date();
  now.setDate(now.getDate() + days);
  now.setHours(now.getHours() + hours);
  now.setMinutes(now.getMinutes() + minute);
  return now;
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
