/**
 * Browser polyfills for Node.js built-ins that might be used by the 'lrs' package
 * 
 * This handles both browser content script environments (with window) and
 * service worker environments (without window, but with self)
 */

// TypeScript declarations for Node.js globals
declare const global: typeof globalThis;

// Helper to determine the global object in any JavaScript environment
const getGlobalObject = (): any => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof self !== 'undefined') return self; // Service worker context
    if (typeof window !== 'undefined') return window; // Browser context
    
    // Node.js context - only include this in environments where it exists
    // to avoid runtime errors
    try {
        if (typeof global !== 'undefined') return global;
    } catch (e) {
        // global is not defined in this environment
    }
    
    // Fallback
    return Function('return this')();
};

// Our global object (works in any environment)
const globalObj = getGlobalObject();

/**
 * Create and install all necessary polyfills for the 'lrs' package
 */
export function installPolyfills(): void {
    // Enhanced Buffer implementation that works in any environment
    class BufferPolyfill {
        // Use public data for simplicity in this polyfill context
        public data: Uint8Array;
        
        constructor(input?: string | ArrayBuffer | Uint8Array | number) {
            if (typeof input === 'number') {
                // Create buffer of specified size
                this.data = new Uint8Array(input);
            } else if (typeof input === 'string') {
                // Basic string to bytes conversion
                const encoder = new TextEncoder();
                this.data = encoder.encode(input);
            } else if (input instanceof ArrayBuffer) {
                this.data = new Uint8Array(input);
            } else if (input instanceof Uint8Array) {
                this.data = input;
            } else {
                this.data = new Uint8Array(0);
            }
            
            // Make array-like access work directly
            // This adds direct indexing capabilities to the Buffer instances
            for (let i = 0; i < this.data.length; i++) {
                // @ts-ignore: Dynamic property assignment
                this[i] = this.data[i];
            }
        }
        
        // Add 'fill' method needed by crypto libraries
        fill(value: number, start = 0, end = this.data.length): BufferPolyfill {
            for (let i = start; i < end; i++) {
                this.data[i] = value;
                // @ts-ignore: Dynamic property assignment
                this[i] = value;
            }
            return this;
        }
        
        // Add 'slice' method to create a new Buffer from part of this one
        slice(start = 0, end = this.data.length): BufferPolyfill {
            return new BufferPolyfill(this.data.slice(start, end));
        }
        
        // Add 'readUInt32BE' for big-endian 32-bit integer reading
        readUInt32BE(offset = 0): number {
            return (this.data[offset] << 24) |
                   (this.data[offset + 1] << 16) |
                   (this.data[offset + 2] << 8) |
                   this.data[offset + 3];
        }
        
        // Add common property to get length
        get length(): number {
            return this.data.length;
        }
        
        // Allow array-like access to the buffer
        [index: number]: number;
        
        toString(encoding?: string): string {
            if (encoding === 'hex') {
                return Array.from(this.data)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            }
            
            // Default to UTF-8
            const decoder = new TextDecoder();
            return decoder.decode(this.data);
        }
        
        static from(input: string | ArrayBuffer | Uint8Array): BufferPolyfill {
            return new BufferPolyfill(input);
        }
        
        // Add common static methods
        static alloc(size: number): BufferPolyfill {
            return new BufferPolyfill(size);
        }
        
        static allocUnsafe(size: number): BufferPolyfill {
            return new BufferPolyfill(size);
        }
    }
    
    // Make BufferPolyfill iterable
    Object.defineProperty(BufferPolyfill.prototype, Symbol.iterator, {
        value: function*() {
            for (let i = 0; i < this.length; i++) {
                yield this.data[i];
            }
        },
        writable: false,
        configurable: true
    });
    
    // Buffer polyfill for any environment (browser or service worker)
    if (typeof globalObj.Buffer === 'undefined') {
        globalObj.Buffer = BufferPolyfill;
        console.log('Buffer polyfill installed in', 
            typeof window !== 'undefined' 
                ? 'browser context' 
                : 'service worker context'
        );
    }

    // Stream polyfill (minimal stub)
    if (typeof globalObj.Stream === 'undefined') {
        globalObj.Stream = class StreamStub {};
        console.log('Stream polyfill installed');
    }
}

// Automatically install polyfills when this module is imported
installPolyfills();
