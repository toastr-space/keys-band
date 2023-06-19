import { writable, type Writable } from "svelte/store";

export const keyStore: Writable<string> = writable("");

keyStore.subscribe((value: string) => {
  localStorage.privateKey = value;
});

if (localStorage.privateKey) {
  keyStore.set(localStorage.privateKey);
}
