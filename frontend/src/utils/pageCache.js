const DEFAULT_TTL_MS = 5 * 60 * 1000;

const CACHE_KEYS = {
  discover: 'discoverRecommendationsV2',
  library: 'libraryMoviesV1',
  watchlist: 'watchlistMoviesV1',
};

const COLLECTION_MUTATION_VERSION_KEY = 'collectionMutationVersionV1';

const safeSessionStorage = {
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // no-op
    }
  },
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // no-op
    }
  },
};

const parseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getCollectionMutationVersion = () => {
  const raw = safeSessionStorage.getItem(COLLECTION_MUTATION_VERSION_KEY);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const setCollectionMutationVersion = (version) => {
  safeSessionStorage.setItem(COLLECTION_MUTATION_VERSION_KEY, String(version));
};

export const bumpCollectionMutationVersion = () => {
  const nextVersion = getCollectionMutationVersion() + 1;
  setCollectionMutationVersion(nextVersion);

  safeSessionStorage.removeItem(CACHE_KEYS.library);
  safeSessionStorage.removeItem(CACHE_KEYS.watchlist);

  return nextVersion;
};

export const readPageCache = ({ key, ttlMs = DEFAULT_TTL_MS, mutationAware = false }) => {
  const cacheKey = CACHE_KEYS[key];
  if (!cacheKey) return null;

  const parsed = parseJson(safeSessionStorage.getItem(cacheKey));
  if (!parsed?.savedAt || !Array.isArray(parsed?.items)) {
    return null;
  }

  if ((Date.now() - Number(parsed.savedAt)) > ttlMs) {
    safeSessionStorage.removeItem(cacheKey);
    return null;
  }

  if (mutationAware) {
    const currentVersion = getCollectionMutationVersion();
    const cachedVersion = Number(parsed.collectionMutationVersion);
    if (!Number.isInteger(cachedVersion) || cachedVersion !== currentVersion) {
      safeSessionStorage.removeItem(cacheKey);
      return null;
    }
  }

  return parsed.items;
};

export const writePageCache = ({ key, items, mutationAware = false }) => {
  const cacheKey = CACHE_KEYS[key];
  if (!cacheKey) return;

  const payload = {
    savedAt: Date.now(),
    items: Array.isArray(items) ? items : [],
  };

  if (mutationAware) {
    payload.collectionMutationVersion = getCollectionMutationVersion();
  }

  safeSessionStorage.setItem(cacheKey, JSON.stringify(payload));
};

export const clearPageCache = (key) => {
  const cacheKey = CACHE_KEYS[key];
  if (!cacheKey) return;
  safeSessionStorage.removeItem(cacheKey);
};
