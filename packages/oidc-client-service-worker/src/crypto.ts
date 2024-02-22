import {uint8ToUrlBase64} from "./jwt";


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
      return resolve(uint8ToUrlBase64(new Uint8Array(buffer)));
    }, error => reject(error));
  });
}
