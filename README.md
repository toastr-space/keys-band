# keys.band

## Multi-key Nostr Signing Extension

Use this Chrome extension to sign Nostr events on web-apps without having to give them your keys.

It implements NIP-07, i.e. provides a window.nostr object which has the following methods:

```
async window.nostr.getPublicKey()
string // returns your public key as hex
```

```
async window.nostr.signEvent(event)
Event // returns the full event object signed
```

```
async window.nostr.getRelays()
{ [url: string]: RelayPolicy } // returns a map of relays
```

```
async window.nostr.nip04.encrypt(pubkey, plaintext)
string // returns ciphertext+iv as specified in nip04
```

```
async window.nostr.nip04.decrypt(pubkey, ciphertext)
string // takes ciphertext+iv as specified in nip04
```

This extension is Chromium-only.

https://keys.band

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
pnpm run nodemon
```

## Building

To create a production version of your app:

```bash
pnpm run build
```
