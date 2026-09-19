function serializeHeaders(headers: Headers): Record<string, string> {
  const headersObj: Record<string, string> = {};
  for (const key of headers.keys()) {
    const value = headers.get(key);
    if (value !== null) {
      headersObj[key] = value;
    }
  }
  return headersObj;
}
export { serializeHeaders };
