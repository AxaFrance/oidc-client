export function normalizeUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch (error) {
    console.error(`Failed to normalize url: ${url}`, error);
    return url;
  }
}
