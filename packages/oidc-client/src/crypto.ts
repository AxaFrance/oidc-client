import { uint8ToUrlBase64 } from './jwt';

const getWebCrypto = () => (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined);

const cryptoInfo = () => {
  const webCrypto = getWebCrypto();
  const hasCrypto = !!webCrypto;
  const hasSubtleCrypto = !!webCrypto?.subtle;
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

export const generateRandom = (size: number) => {
  const buffer = new Uint8Array(size);
  const webCrypto = getWebCrypto();
  if (!webCrypto?.getRandomValues) {
    throw new Error('Web Crypto API is unavailable; secure random values cannot be generated.');
  }
  webCrypto.getRandomValues(buffer);
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

export function base64urlOfHashOfASCIIEncodingAsync(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.subtle.digest('SHA-256', textEncodeLite(code)).then(
      buffer => {
        return resolve(uint8ToUrlBase64(new Uint8Array(buffer)));
      },
      error => reject(error),
    );
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
