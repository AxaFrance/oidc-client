const fetchFromIssuerCache: Record<string, InternalCacheItem<any>> = {};

type InternalCacheItem<T> = {
  result: T;
  timestamp: number;
};

const getResultOrNullIfExpired = <T extends object>(
  cachedItem: InternalCacheItem<T> | undefined,
  timeCacheSecond: number,
): T | null => {
  if (!cachedItem) {
    return null;
  }

  const oneHourMinisecond = 1000 * timeCacheSecond;
  if (cachedItem.timestamp + oneHourMinisecond > Date.now()) {
    return cachedItem.result as T;
  }

  return null;
};

export const getFromCache = <T extends object>(
  localStorageKey: string,
  storage: Storage = window.sessionStorage,
  timeCacheSecond: number,
): T => {
  const fromStorage =
    storage &&
    storage.getItem(localStorageKey) &&
    (JSON.parse(storage.getItem(localStorageKey)) as InternalCacheItem<T> | undefined);

  const fromLocalStorage = fetchFromIssuerCache[localStorageKey];

  return (
    getResultOrNullIfExpired<T>(fromStorage, timeCacheSecond) ||
    getResultOrNullIfExpired<T>(fromLocalStorage, timeCacheSecond) ||
    null
  );
};

export const setCache = <T extends object>(
  localStorageKey: string,
  result: T,
  storage: Storage = window.sessionStorage,
): void => {
  const timestamp = Date.now();
  fetchFromIssuerCache[localStorageKey] = { result, timestamp };

  if (storage) {
    storage.setItem(localStorageKey, JSON.stringify({ result, timestamp }));
  }
};

export const clearCache = (
  localStorageKey?: string,
  storage: Storage = window.sessionStorage,
): void => {
  if (!localStorageKey) {
    for (const key in fetchFromIssuerCache) {
      storage.removeItem(key);
      delete fetchFromIssuerCache[localStorageKey];
    }
  }
  delete fetchFromIssuerCache[localStorageKey];
  storage.removeItem(localStorageKey);
};

// // TODO: refactor this function to be less side-effecty
// // getFromCache has a secrec internal side-effect, which keeps fetchFromIssuer inside internal object
// // which leads to case when cache is never retrieved from storage, but just returned from internal object
// // and even more, if object is expired, but exists in internal object, function will return symple null for ever.
// // only way to get actual data - setCache with same key to override timestamp
// export const getFromCache = (localStorageKey, storage = window.sessionStorage, timeCacheSecond) => {
//   if (!fetchFromIssuerCache[localStorageKey]) {
//     if (storage) {
//       const cacheJson = storage.getItem(localStorageKey);
//       if (cacheJson) {
//         fetchFromIssuerCache[localStorageKey] = JSON.parse(cacheJson);
//       }
//     }
//   }
//   const oneHourMinisecond = 1000 * timeCacheSecond;
//   // @ts-ignore
//   if (
//     fetchFromIssuerCache[localStorageKey] &&
//     fetchFromIssuerCache[localStorageKey].timestamp + oneHourMinisecond > Date.now()
//   ) {
//     return fetchFromIssuerCache[localStorageKey].result;
//   }
//   return null;
// };

// // what is the point of setting value into storage if it is never accessed later in getFromCache?
// // fetchFromIssuerCache existence prevents access to chached data in storage
// export const setCache = (localStorageKey, result, storage = window.sessionStorage) => {
//   const timestamp = Date.now();
//   fetchFromIssuerCache[localStorageKey] = { result, timestamp };
//   if (storage) {
//     storage.setItem(localStorageKey, JSON.stringify({ result, timestamp }));
//   }
// };
