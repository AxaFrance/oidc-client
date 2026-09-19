const fetchFromIssuerCache = {};

export const getFromCache = (localStorageKey, storage = window.sessionStorage, timeCacheSecond) => {
  if (!fetchFromIssuerCache[localStorageKey] && storage) {
    const cacheJson = storage.getItem(localStorageKey);
    if (cacheJson) {
      fetchFromIssuerCache[localStorageKey] = JSON.parse(cacheJson);
    }
  }
  const cachedEntry = fetchFromIssuerCache[localStorageKey];
  const cacheDurationMilliseconds = 1000 * timeCacheSecond;
  if (cachedEntry && cachedEntry.timestamp + cacheDurationMilliseconds > Date.now()) {
    return cachedEntry.result;
  }
  return null;
};

export const setCache = (localStorageKey, result, storage = window.sessionStorage) => {
  const cachedEntry = { result, timestamp: Date.now() };
  fetchFromIssuerCache[localStorageKey] = cachedEntry;
  if (storage) {
    storage.setItem(localStorageKey, JSON.stringify(cachedEntry));
  }
};
