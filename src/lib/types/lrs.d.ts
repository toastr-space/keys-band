declare module 'lrs' {
    // Based on the Node.js example provided by the user
    
    export interface Party {
        publicKey: string;
        privateKey: string;
    }
    
    /**
     * Generates a new keypair for use in ring signatures
     * @returns A new party object with public and private keys
     */
    export function gen(): Party;
    
    /**
     * Creates a ring signature
     * @param group - Array of public keys forming the anonymity set
     * @param signer - Party object containing the signer's keypair
     * @param message - Message to sign
     * @returns Signature string (format appears to be underscore-separated values)
     */
    export function sign(group: string[], signer: Party, message: string): string;
    
    /**
     * Verifies a ring signature
     * @param group - Array of public keys forming the anonymity set
     * @param signature - Signature string returned by sign()
     * @param message - The original message that was signed
     * @returns Boolean indicating if the signature is valid
     */
    export function verify(group: string[], signature: string, message: string): boolean;
    
    /**
     * Checks if two signatures were created by the same signer
     * @param signatureA - First signature string
     * @param signatureB - Second signature string
     * @returns Boolean indicating if signatures were created by the same party
     */
    export function link(signatureA: string, signatureB: string): boolean;
}
