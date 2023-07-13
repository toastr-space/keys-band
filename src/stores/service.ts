// import { db } from "./utils";

export function installService() {
  var script = document.createElement("script");
  script.textContent = "console.log(window);";
  (document.head || document.documentElement).appendChild(script);
}
