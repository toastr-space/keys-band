# keys.band

### Based on [Nos2x](https://raw.githubusercontent.com/fiatjaf/nos2x/)

## Multi-key Nostr Signing Extension

Use this to sign [Nostr](https://github.com/nostr-protocol/nostr) events on web-apps without having to give them your keys.

It implements [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md), i.e. provides a `window.nostr` object which has the following methods:

```
async window.nostr.getPublicKey(): string // returns your public key as hex
async window.nostr.signEvent(event): Event // returns the full event object signed
async window.nostr.getRelays(): { [url: string]: RelayPolicy } // returns a map of relays
async window.nostr.nip04.encrypt(pubkey, plaintext): string // returns ciphertext+iv as specified in nip04
async window.nostr.nip04.decrypt(pubkey, ciphertext): string // takes ciphertext+iv as specified in nip04
```

This extension is Chromium-only.

## Install

- Load the folder `public/` on your browser in developer mode

## Develop

To run the plugin from this code:

```
git clone https://github.com/toastr-space/keys-band
cd keys-band
pnpm install
pnpm run build || pnpm run dev # for development mode
```

then

1. go to `chrome://extensions`;
2. ensure "developer mode" is enabled on the top right;
3. click on "Load unpackaged";
4. select the `extension/` folder of this repository.

---

LICENSE: [MIT](docs/mit-license.md).
