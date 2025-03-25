/**
 * Polyfills for Node.js built-ins used by esbuild bundling
 * 
 * This file is specifically for esbuild's --inject option to provide necessary
 * polyfills for Node.js modules like 'util' that are used by dependencies
 * but not available in the browser environment.
 */

// Create a minimal 'util' polyfill with commonly used functions from Node.js util module
const util = {
  // Most commonly used util functions
  inherits: function(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
    }
  },
  
  deprecate: function(fn, msg) {
    return function() {
      console.warn('DEPRECATED: ' + msg);
      return fn.apply(this, arguments);
    };
  },
  
  format: function format(f) {
    if (typeof f !== 'string') {
      const objects = [];
      for (let i = 0; i < arguments.length; i++) {
        objects.push(arguments[i]);
      }
      return objects.join(' ');
    }
    
    let i = 1;
    const args = arguments;
    return f.replace(/%[sdj%]/g, function(x) {
      if (x === '%%') return '%';
      if (i >= args.length) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++]);
        default: return x;
      }
    });
  },
  
  inspect: function(obj) {
    return JSON.stringify(obj, null, 2);
  },
  
  types: {
    isArray: Array.isArray,
    isBoolean: function(arg) { return typeof arg === 'boolean'; },
    isNull: function(arg) { return arg === null; },
    isNullOrUndefined: function(arg) { return arg == null; },
    isNumber: function(arg) { return typeof arg === 'number'; },
    isString: function(arg) { return typeof arg === 'string'; },
    isSymbol: function(arg) { return typeof arg === 'symbol'; },
    isUndefined: function(arg) { return arg === void 0; },
    isRegExp: function(arg) { return arg instanceof RegExp; },
    isObject: function(arg) { 
      return typeof arg === 'object' && arg !== null;
    },
    isDate: function(arg) { return arg instanceof Date; },
    isError: function(arg) { return arg instanceof Error; },
    isFunction: function(arg) { return typeof arg === 'function'; }
  },
  
  promisify: function(original) {
    return function() {
      const args = Array.prototype.slice.call(arguments);
      return new Promise((resolve, reject) => {
        args.push((err, ...values) => {
          if (err) {
            return reject(err);
          }
          if (values.length === 1) {
            resolve(values[0]);
          } else {
            resolve(values);
          }
        });
        original.apply(this, args);
      });
    };
  }
};

// Export the util module so esbuild can use it to replace the Node.js util module
export { util as default };

// Create a dummy process object that might be needed by some dependencies
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: {},
    nextTick: function(callback) {
      setTimeout(callback, 0);
    },
    browser: true
  };
}

// Make Buffer available globally if it isn't already
if (typeof globalThis.Buffer === 'undefined') {
  // Use the same Buffer polyfill logic as in polyfills.ts
  class BufferPolyfill {
    constructor(input) {
      if (typeof input === 'number') {
        this.data = new Uint8Array(input);
      } else if (typeof input === 'string') {
        const encoder = new TextEncoder();
        this.data = encoder.encode(input);
      } else if (input instanceof ArrayBuffer) {
        this.data = new Uint8Array(input);
      } else if (input instanceof Uint8Array) {
        this.data = input;
      } else {
        this.data = new Uint8Array(0);
      }
      
      for (let i = 0; i < this.data.length; i++) {
        this[i] = this.data[i];
      }
    }
    
    fill(value, start = 0, end = this.data.length) {
      for (let i = start; i < end; i++) {
        this.data[i] = value;
        this[i] = value;
      }
      return this;
    }
    
    slice(start = 0, end = this.data.length) {
      return new BufferPolyfill(this.data.slice(start, end));
    }
    
    readUInt32BE(offset = 0) {
      return (this.data[offset] << 24) |
             (this.data[offset + 1] << 16) |
             (this.data[offset + 2] << 8) |
             this.data[offset + 3];
    }
    
    get length() {
      return this.data.length;
    }
    
    toString(encoding) {
      if (encoding === 'hex') {
        return Array.from(this.data)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }
      
      const decoder = new TextDecoder();
      return decoder.decode(this.data);
    }
    
    static from(input) {
      return new BufferPolyfill(input);
    }
    
    static alloc(size) {
      return new BufferPolyfill(size);
    }
    
    static allocUnsafe(size) {
      return new BufferPolyfill(size);
    }
  }
  
  // Make BufferPolyfill iterable
  BufferPolyfill.prototype[Symbol.iterator] = function*() {
    for (let i = 0; i < this.length; i++) {
      yield this.data[i];
    }
  };
  
  globalThis.Buffer = BufferPolyfill;
}

// We also need to update the "nodemon" script to use the new esbuild flags
console.log('esbuild polyfills loaded for browser compatibility');
