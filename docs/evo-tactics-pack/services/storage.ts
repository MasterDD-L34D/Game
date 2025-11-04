type StorageLike = {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

type WindowLike = {
  localStorage?: StorageLike | null;
};

type StorageLogger = {
  warn?: (...args: unknown[]) => void;
};

export const STORAGE_KEYS = {
  activityLog: 'evo-generator-activity-log',
  filterProfiles: 'evo-generator-filter-profiles',
  history: 'evo-generator-history',
  pinned: 'evo-generator-pinned',
  locks: 'evo-generator-locks',
  preferences: 'evo-generator-preferences',
} as const;

export type StoredPreferences = {
  audioMuted?: boolean;
  volume?: number;
} | null;

export type StoredLocks = {
  biomes: unknown[];
  species: unknown[];
};

export interface StorageService {
  isPersistent(): boolean;
  loadActivityLog(): unknown[];
  saveActivityLog(entries: unknown[]): void;
  loadFilterProfiles(): unknown[];
  saveFilterProfiles(profiles: unknown[]): void;
  loadPreferences(): StoredPreferences;
  savePreferences(preferences: StoredPreferences): void;
  loadPinnedState(): unknown[];
  savePinnedState(payload: unknown[]): void;
  loadLocks(): StoredLocks;
  saveLocks(payload: StoredLocks): void;
  loadHistory(): unknown[];
  saveHistory(entries: unknown[]): void;
}

export interface CreateStorageServiceOptions {
  windowRef?: WindowLike | null;
  storage?: StorageLike | null;
  logger?: StorageLogger;
}

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function detectLocalStorage(
  windowRef?: WindowLike | null,
  logger?: StorageLogger,
): StorageLike | null {
  const storage = windowRef?.localStorage ?? null;
  if (!storage) {
    return null;
  }
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem?.(testKey);
    return storage;
  } catch (error) {
    logger?.warn?.('LocalStorage non disponibile, verrà utilizzato il fallback in-memory', error);
    return null;
  }
}

export function createStorageService(options: CreateStorageServiceOptions = {}): StorageService {
  const { windowRef, storage: overrideStorage, logger } = options;
  const memoryStorage = createMemoryStorage();
  let activeStorage: StorageLike =
    overrideStorage ?? detectLocalStorage(windowRef, logger) ?? memoryStorage;
  let persistent = activeStorage !== memoryStorage;

  function withStorage<T>(action: (driver: StorageLike) => T, fallbackValue: T): T {
    try {
      return action(activeStorage);
    } catch (error) {
      if (activeStorage !== memoryStorage) {
        logger?.warn?.('Persistenza locale non disponibile, uso fallback in-memory', error);
        activeStorage = memoryStorage;
        persistent = false;
        try {
          return action(activeStorage);
        } catch (fallbackError) {
          logger?.warn?.(
            'Operazione storage non riuscita con il fallback in-memory',
            fallbackError,
          );
          return fallbackValue;
        }
      }
      logger?.warn?.('Operazione storage non riuscita', error);
      return fallbackValue;
    }
  }

  function readRaw(key: string): string | null {
    return withStorage<string | null>((driver) => driver.getItem(key) ?? null, null);
  }

  function writeRaw(key: string, value: string | null): void {
    if (value === null) {
      withStorage(
        (driver) => {
          driver.removeItem?.(key);
        },
        undefined as unknown as void,
      );
      return;
    }
    withStorage(
      (driver) => {
        driver.setItem(key, value);
      },
      undefined as unknown as void,
    );
  }

  function loadJson<T>(key: string, defaultValue: T): T {
    const raw = readRaw(key);
    if (!raw) {
      return defaultValue;
    }
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      logger?.warn?.(`Impossibile decodificare i dati salvati per la chiave ${key}`, error);
      return defaultValue;
    }
  }

  function saveJson<T>(key: string, value: T): void {
    let payload: string;
    try {
      payload = JSON.stringify(value);
    } catch (error) {
      logger?.warn?.(`Impossibile serializzare i dati per la chiave ${key}`, error);
      return;
    }
    writeRaw(key, payload);
  }

  return {
    isPersistent() {
      return persistent;
    },
    loadActivityLog() {
      const data = loadJson<unknown[]>(STORAGE_KEYS.activityLog, []);
      return Array.isArray(data) ? data : [];
    },
    saveActivityLog(entries: unknown[]) {
      saveJson(STORAGE_KEYS.activityLog, Array.isArray(entries) ? entries : []);
    },
    loadFilterProfiles() {
      const data = loadJson<unknown[]>(STORAGE_KEYS.filterProfiles, []);
      return Array.isArray(data) ? data : [];
    },
    saveFilterProfiles(profiles: unknown[]) {
      saveJson(STORAGE_KEYS.filterProfiles, Array.isArray(profiles) ? profiles : []);
    },
    loadPreferences() {
      const data = loadJson<StoredPreferences>(STORAGE_KEYS.preferences, null);
      if (!data || typeof data !== 'object') {
        return null;
      }
      const result: StoredPreferences = {
        audioMuted: typeof data.audioMuted === 'boolean' ? data.audioMuted : undefined,
        volume: typeof data.volume === 'number' ? data.volume : undefined,
      };
      if (result.audioMuted === undefined && result.volume === undefined) {
        return null;
      }
      return result;
    },
    savePreferences(preferences: StoredPreferences) {
      if (!preferences || typeof preferences !== 'object') {
        writeRaw(STORAGE_KEYS.preferences, null);
        return;
      }
      saveJson(STORAGE_KEYS.preferences, preferences);
    },
    loadPinnedState() {
      const data = loadJson<unknown[]>(STORAGE_KEYS.pinned, []);
      return Array.isArray(data) ? data : [];
    },
    savePinnedState(payload: unknown[]) {
      saveJson(STORAGE_KEYS.pinned, Array.isArray(payload) ? payload : []);
    },
    loadLocks() {
      const data = loadJson<StoredLocks>(STORAGE_KEYS.locks, { biomes: [], species: [] });
      const biomes = Array.isArray(data?.biomes) ? data.biomes : [];
      const species = Array.isArray(data?.species) ? data.species : [];
      return { biomes, species };
    },
    saveLocks(payload: StoredLocks) {
      const biomes = Array.isArray(payload?.biomes) ? payload.biomes : [];
      const species = Array.isArray(payload?.species) ? payload.species : [];
      saveJson(STORAGE_KEYS.locks, { biomes, species });
    },
    loadHistory() {
      const data = loadJson<unknown[]>(STORAGE_KEYS.history, []);
      return Array.isArray(data) ? data : [];
    },
    saveHistory(entries: unknown[]) {
      saveJson(STORAGE_KEYS.history, Array.isArray(entries) ? entries : []);
    },
  };
}
