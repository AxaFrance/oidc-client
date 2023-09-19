import * as base64 from 'base64-js';

const cryptoInfo = () => {
  const hasCrypto = typeof window !== 'undefined' && !!(window.crypto as any);
  const hasSubtleCrypto = hasCrypto && !!(window.crypto.subtle as any);
  return { hasCrypto, hasSubtleCrypto };
};
const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const bufferToString = (buffer: Uint8Array) => {
  const state = [];
  for (let i = 0; i < buffer.byteLength; i += 1) {
    const index = buffer[i] % charset.length;
    state.push(charset[index]);
  }
  return state.join('');
};

const urlSafe = (buffer: Uint8Array): string => {
  const encoded = base64.fromByteArray(new Uint8Array(buffer));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const generateRandom = (size: number) => {
    const buffer = new Uint8Array(size);
    const { hasCrypto } = cryptoInfo();
    if (hasCrypto) {
      window.crypto.getRandomValues(buffer);
    } else {
      // fall back to Math.random() if nothing else is available
      for (let i = 0; i < size; i += 1) {
        buffer[i] = (Math.random() * charset.length) | 0;
      }
    }
    return bufferToString(buffer);
  };

export function textEncodeLite(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);

  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export function base64urlOfHashOfASCIIEncodingAsync(code: string):Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.subtle.digest('SHA-256', textEncodeLite(code)).then(buffer => {
      return resolve(urlSafe(new Uint8Array(buffer)));
    }, error => reject(error));
  });
}

export const deriveChallengeAsync = (code: string): Promise<string> => {
    if (code.length < 43 || code.length > 128) {
      return Promise.reject(new Error('Invalid code length.'));
    }
    const { hasSubtleCrypto } = cryptoInfo();
    if (!hasSubtleCrypto) {
      return Promise.reject(new Error('window.crypto.subtle is unavailable.'));
    }

    return base64urlOfHashOfASCIIEncodingAsync(code);
};
