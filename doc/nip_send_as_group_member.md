NIP-XX
======

Send As Group Member
---------------------------------

`draft` `optional`

This NIP defines a standardized method for proving membership in a group without revealing the specific member identity. It allows users to anonymously publish events as a verified member of a defined group using ring signatures, while maintaining compatibility with relays that are not aware of this feature.

Motivation
----------

There are scenarios where a user wants to prove they belong to a specific group (e.g., wallet providers, developers of a specific project) while keeping their exact identity within that group private. This enables:

- Anonymous criticism between competitors
- Whistleblowing from inside organizations
- Group attestations without individual attribution
- Private voting/polling within known groups

Event Structure
---------------

A group membership event uses the standard Nostr event structure, without any modifications to the base fields:

```json
{
  "id": <event_id>,
  "pubkey": <ephemeral_pubkey>,
  "created_at": <timestamp>,
  "kind": <kind>,
  "tags": [
    ["g", <group_identifier>],
    ["group-member-proof", <ring_signature_hex>, <pubkey_1>, <pubkey_2>, ..., <pubkey_n>],
    ["p", <mentioned_pubkey_1>],
    ["p", <mentioned_pubkey_2>],
    ...
  ],
  "content": <encrypted_or_plaintext_content>,
  "sig": <signature>
}
```

Where:
- `pubkey` is an ephemeral single-use public key generated specifically for this event
- `tags` contains:
  - "group-member-proof" tag containing:
    - The ring signature as a hexadecimal string (position 1)
    - The complete anonymity set as public keys (positions 2 to n+1)
  - "g" tag with an optional group identifier
  - Any other standard tags (like "p" tags for mentions)
- `content` is the regular content field (encrypted or plaintext)
- `sig` is the standard Nostr signature using the ephemeral key

Ring Signature Specification
----------------------------

The ring signature in the "group-member-proof" tag proves the author knows the private key corresponding to one of the public keys listed in the same tag.

The ring signature commits to:
- The ephemeral public key (`pubkey`)
- The event content (`content`)
- All tags except the "group-member-proof" tag itself

This commitment ensures the integrity of the entire event and prevents tampering attacks.

1. **Algorithm**: Linkable ring signatures (using the 'lrs' package, compatible with secp256k1)
2. **Format**: JSON string encoded to hexadecimal or Base64, with the following structure:
```json
{
  "ringSize": number,        // Number of public keys in the ring
  "keyImage": string,        // Unique identifier derived from signer's private key
  "signature": [             // Array of signature components, one per group member
    {
      "c": string,           // Hex-encoded challenge value
      "r": string            // Hex-encoded response value
    },
    {
      "c": string,
      "r": string
    },
    ...
  ]
}
```

The commitment data for the ring signature should be a SHA-256 hash of:
```
pubkey + created_at + kind + JSON.stringify(filtered_tags) + content
```
Where `filtered_tags` is the event's tags array with any "group-member-proof" tags removed.

Creation Process
---------------

1. Author selects group members and collects their public keys
2. Author prepares the event with a placeholder "group-member-proof" tag:
   ```
   ["group-member-proof", null, <pubkey_1>, <pubkey_2>, ..., <pubkey_n>]
   ```
   Where `null` is a placeholder for the ring signature
3. Author sends the event to a NIP-07 provider supporting this NIP, using:
   ```javascript
   window.nostr.signEventAsGroupMember(event)
   ```
4. The provider:
   - Generates an ephemeral keypair for this specific event
   - Sets the event's `pubkey` to the ephemeral public key 
   - Removes the placeholder tag and calculates the commitment hash
   - Creates a ring signature using the user's private key and all group public keys
   - Adds a new "group-member-proof" tag with the ring signature and public keys
   - Signs the event with the ephemeral private key
   - Stores the ephemeral keys securely for potential future use
5. The signed event is returned to the client to be published to relays

For implementations that need to store the association between users and their anonymous posts, the provider may store the ephemeral private keys securely, without exposing them directly to the user.

Verification Process
--------------------

1. Client verifies the standard Nostr signature using the ephemeral public key
2. Client extracts the "group-member-proof" tag
3. Client extracts the ring signature from position 1 of the tag
4. Client extracts the group public keys from positions 2 onwards of the tag
5. Client verifies the ring signature against the set of public keys:
   ```javascript
   // For NIP-07 providers that support this NIP:
   const isValidGroupMember = await window.nostr.verifyGroupMemberProof(event);
   // Or using manual verification:
   const isValidGroupMember = verifyRingSignature(ringSignature, groupMembers, commitment);
   ```
6. If both verifications pass, the event is confirmed as authored by a group member

The verification of an event with group membership proof must validate:
1. The standard event signature created with the ephemeral key
2. The ring signature that proves the signer owns one of the group member keys
3. That the ring signature commits to the event data (excluding the proof tag itself)

Cryptographic Libraries
-----------------------

Implementations should use established libraries for ring signature operations:

- JavaScript: lrs (recommended), ringct-js, borromean-js
- Rust: dalek-cryptography/ring-signatures
- Go: go-crypto-ring

This NIP's reference implementation uses the 'lrs' npm package, which provides a JavaScript implementation of linkable ring signatures compatible with secp256k1.

Implementation Options
----------------------

To accommodate varying client capabilities, this NIP supports two verification strategies:

### 1. Full Verification
Clients with cryptographic capabilities verify both:
- Standard signature (using ephemeral public key)
- Ring signature (proving group membership)

### 2. Relay-Assisted Verification
Lightweight clients can:
- Verify only the standard signature
- Trust relays that advertise group proof verification capabilities
- Accept a relay-provided verification status

Performance Considerations
--------------------------

To keep the protocol lightweight and scalable:

1. Limit group size to 100 members (larger groups increase verification time)
2. Consider caching validation results for frequently accessed groups
3. Relays may choose whether to validate group proofs or simply pass them through

Efficiency Optimization
-----------------------

For large groups (50-100 members), clients may implement:
1. Batch verification techniques
2. Precomputed validation for known groups
3. Progressive rendering while verification completes

Privacy Considerations
----------------------

1. The ring signature provides k-anonymity where k is the number of group members
2. To prevent correlation attacks, use a new ephemeral key for each event
3. Avoid including identifying information in the content

Compatibility
-------------

This NIP uses the standard Nostr event structure and is fully backward compatible. Relays that don't support this NIP will process and store these events normally, because no non-standard root-level fields are used. Clients that don't support this NIP will display the events normally but won't verify group membership.

Clients supporting this NIP should:
1. Check for the presence of a "group-member-proof" tag
2. Perform ring signature verification if the tag is found
3. Indicate to users when an event has been verified as authored by a group member

Implementation Recommendations
------------------------------

1. Clients should clearly indicate when an event has a verified group membership proof
2. UIs should represent these posts distinctly (e.g., "Posted by a verified wallet provider")
3. Relays may implement optional filtering based on group membership

Future Extensions
-----------------

1. **Group Management**: A mechanism for defining canonical groups with controlled membership
2. **Hierarchical Groups**: Supporting nested group structures
3. **Reputation Systems**: Allowing anonymous but consistent identity across multiple posts
