
import * as base64 from 'base64-js';

const hasCrypto = typeof window !== 'undefined' && !!(window.crypto as any);
const hasSubtleCrypto = hasCrypto && !!(window.crypto.subtle as any);
const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function bufferToString(buffer: Uint8Array) {
  const state = [];
  for (let i = 0; i < buffer.byteLength; i += 1) {
    const index = buffer[i] % charset.length;
    state.push(charset[index]);
  }
  return state.join('');
}

export function urlSafe(buffer: Uint8Array): string {
  const encoded = base64.fromByteArray(new Uint8Array(buffer));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// adapted from source: http://stackoverflow.com/a/11058858
// this is used in place of TextEncode as the api is not yet
// well supported: https://caniuse.com/#search=TextEncoder
export function textEncodeLite(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);

  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

/**
 * The default implementation of the `Crypto` interface.
 * This uses the capabilities of the browser.
 */
export class DefaultCrypto {
  generateRandom(size: number) {
    const buffer = new Uint8Array(size);
    if (hasCrypto) {
      window.crypto.getRandomValues(buffer);
    } else {
      // fall back to Math.random() if nothing else is available
      for (let i = 0; i < size; i += 1) {
        buffer[i] = (Math.random() * charset.length) | 0;
      }
    }
    return bufferToString(buffer);
  }

  deriveChallenge(code: string): Promise<string> {
    if (code.length < 43 || code.length > 128) {
      return Promise.reject(new Error('Invalid code length.'));
    }
    if (!hasSubtleCrypto) {
      return Promise.reject(new Error('window.crypto.subtle is unavailable.'));
    }

    return new Promise((resolve, reject) => {
      crypto.subtle.digest('SHA-256', textEncodeLite(code)).then(buffer => {
        return resolve(urlSafe(new Uint8Array(buffer)));
      }, error => reject(error));
    });
  }
}
