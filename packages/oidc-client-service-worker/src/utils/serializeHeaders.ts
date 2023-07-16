import { FetchHeaders } from '../types';

function serializeHeaders(headers: Headers) {
  const headersObj: Record<string, string> = {};
  for (const key of (headers as FetchHeaders).keys()) {
    if (headers.has(key)) {
      headersObj[key] = headers.get(key) as string;
    }
  }
  return headersObj;
}
export {serializeHeaders};