# Keys.Band

### Based on [Nos2x](https://raw.githubusercontent.com/fiatjaf/nos2x/)

### notes and other stuff signed by an extension

## Nostr Signer Extension

Use this to sign [Nostr](https://github.com/nostr-protocol/nostr) events on web-apps without having to give them your keys.

It implements [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md), i.e. provides a `window.nostr` object which has the following methods:

```
async window.nostr.getPublicKey(): string // returns your public key as hex
async window.nostr.signEvent(event): Event // returns the full event object signed
async window.nostr.getRelays(): { [url: string]: RelayPolicy } // returns a map of relays
async window.nostr.nip04.encrypt(pubkey, plaintext): string // returns ciphertext+iv as specified in nip04
async window.nostr.nip04.decrypt(pubkey, ciphertext): string // takes ciphertext+iv as specified in nip04
```

This extension is Chromium-only. For a maintained Firefox fork, see [nos2x-fox](https://diegogurpegui.com/nos2x-fox/).

## Install

- Load the folder `public/` on your browser in developer mode

## Develop

To run the plugin from this code:

```
git clone https://github.com/toastr-space/nos2x-svelte
cd nos2x-svelte
pnpm install
pnpm run build || pnpm run dev # for developpement mode
```

then

1. go to `chrome://extensions`;
2. ensure "developer mode" is enabled on the top right;
3. click on "Load unpackaged";
4. select the `extension/` folder of this repository.

---

LICENSE: public domain.

Icon made by <a href="https://iconify.design/" title="Freepik">Iconify.design</a>.
