
const fetchFromIssuerCache = {};

export const getFromCache = (localStorageKey, storage = window.sessionStorage, timeCacheSecond) => {
    if (!fetchFromIssuerCache[localStorageKey]) {
        if (storage) {
            const cacheJson = storage.getItem(localStorageKey);
            if (cacheJson) {
                fetchFromIssuerCache[localStorageKey] = JSON.parse(cacheJson);
            }
        }
    }
    const oneHourMinisecond = 1000 * timeCacheSecond;
    // @ts-ignore
    if (fetchFromIssuerCache[localStorageKey] && (fetchFromIssuerCache[localStorageKey].timestamp + oneHourMinisecond) > Date.now()) {
        return fetchFromIssuerCache[localStorageKey].result;
    }
    return null;
};

export const setCache = (localStorageKey, result, storage = window.sessionStorage) => {
    const timestamp = Date.now();
    fetchFromIssuerCache[localStorageKey] = { result, timestamp };
    if (storage) {
        storage.setItem(localStorageKey, JSON.stringify({ result, timestamp }));
    }
};
