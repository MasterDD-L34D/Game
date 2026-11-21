import { describe, expect, it, vi } from 'vitest';

import {
  createStorageService,
  STORAGE_KEYS,
} from '../../../docs/evo-tactics-pack/services/storage.ts';

type MockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  store: Map<string, string>;
};

function createMockStorage(): MockStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe('storage service', () => {
  it('serialises and restores filter profiles using the provided driver', () => {
    const mockStorage = createMockStorage();
    const service = createStorageService({ storage: mockStorage });

    const payload = [
      {
        name: 'Profilo A',
        filters: { flags: ['alpha'], roles: ['support'], tags: [] },
        updatedAt: '2024-10-01T10:00:00.000Z',
      },
      null,
    ];

    service.saveFilterProfiles(payload);

    const saved = mockStorage.store.get(STORAGE_KEYS.filterProfiles);
    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved ?? '[]');
    expect(parsed[0]).toMatchObject(payload[0]);

    const restored = service.loadFilterProfiles();
    expect(restored).toStrictEqual(parsed);
  });

  it('falls back to in-memory storage when the driver fails', () => {
    const failingStorage = {
      getItem: vi.fn(() => {
        throw new Error('unavailable');
      }),
      setItem: vi.fn(() => {
        throw new Error('unavailable');
      }),
      removeItem: vi.fn(() => {
        throw new Error('unavailable');
      }),
    };
    const logger = { warn: vi.fn() };
    const service = createStorageService({ storage: failingStorage, logger });

    const payload = [{ id: 'evt', message: 'ok', timestamp: new Date().toISOString() }];
    service.saveActivityLog(payload);

    expect(service.isPersistent()).toBe(false);
    expect(logger.warn).toHaveBeenCalled();

    const restored = service.loadActivityLog();
    expect(restored).toStrictEqual(payload);
  });
});
