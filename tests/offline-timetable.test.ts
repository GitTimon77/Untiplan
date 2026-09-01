import test from "node:test";
import assert from "node:assert/strict";
import {
  offlineTimetableCacheKey,
  offlineTimetablePreferenceKey,
  readOfflineTimetable,
  saveOfflineTimetable,
} from "../src/lib/offline-timetable";
import type { TimetablePayload } from "../src/lib/types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

function memoryIndexedDb() {
  const values = new Map<IDBValidKey, CryptoKey>();
  return {
    open() {
      const request = {} as IDBOpenDBRequest;
      const db = {
        createObjectStore() { return {} as IDBObjectStore; },
        close() {},
        transaction() {
          const transaction = {
            objectStore() {
              return {
                get(key: IDBValidKey) {
                  const getRequest = {} as IDBRequest<CryptoKey | undefined>;
                  queueMicrotask(() => {
                    Object.defineProperty(getRequest, "result", { configurable: true, value: values.get(key) });
                    getRequest.onsuccess?.(new Event("success"));
                  });
                  return getRequest;
                },
                put(value: CryptoKey, key: IDBValidKey) {
                  values.set(key, value);
                  queueMicrotask(() => transaction.oncomplete?.(new Event("complete")));
                  return {} as IDBRequest;
                },
              } as IDBObjectStore;
            },
            oncomplete: null,
            onerror: null,
            error: null,
          } as unknown as IDBTransaction;
          return transaction;
        },
      } as unknown as IDBDatabase;
      Object.defineProperty(request, "result", { configurable: true, value: db });
      queueMicrotask(() => {
        request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        request.onsuccess?.(new Event("success"));
      });
      return request;
    },
  } as unknown as IDBFactory;
}

test("offline timetable keys are isolated by account, week and timetable", () => {
  assert.equal(offlineTimetablePreferenceKey("account"),"untiplan.offline-enabled.v1.account");
  assert.notEqual(offlineTimetableCacheKey("one","2026-01-12",{type:1,id:10}),offlineTimetableCacheKey("two","2026-01-12",{type:1,id:10}));
  assert.notEqual(offlineTimetableCacheKey("one","2026-01-12",{type:1,id:10}),offlineTimetableCacheKey("one","2026-01-19",{type:1,id:10}));
  assert.notEqual(offlineTimetableCacheKey("one","2026-01-12",{type:1,id:10}),offlineTimetableCacheKey("one","2026-01-12",{type:1,id:11}));
  assert.notEqual(offlineTimetableCacheKey("one","2026-01-12",{type:1,id:10}),offlineTimetableCacheKey("one","2026-01-12",{type:2,id:10}));
});

test("offline timetables are encrypted, readable and reject tampering", async () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const originalIndexedDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: memoryIndexedDb() });
  const selection = { type: 1 as const, id: 10 };
  const data: TimetablePayload = {
    lessons: [{ id: 1, date: 20260112, startTime: 800, endTime: 845, su: [{ id: 1, name: "MAT" }] }],
    courses: [],
    holidays: [],
    timeGrid: [],
    range: { startDate: 20260112, endDate: 20260116 },
  };

  try {
    await saveOfflineTimetable("account", "2026-01-12", selection, data);
    const key = offlineTimetableCacheKey("account", "2026-01-12", selection);
    const encrypted = storage.getItem(key);
    assert.ok(encrypted);
    assert.doesNotMatch(encrypted, /MAT|20260112/);

    const restored = await readOfflineTimetable("account", "2026-01-12", selection);
    assert.deepEqual(restored?.data, data);
    assert.ok(Number.isFinite(restored?.savedAt));

    const envelope = JSON.parse(encrypted) as { iv: string; data: string };
    envelope.data = `${envelope.data[0] === "A" ? "B" : "A"}${envelope.data.slice(1)}`;
    storage.setItem(key, JSON.stringify(envelope));
    assert.equal(await readOfflineTimetable("account", "2026-01-12", selection), null);
  } finally {
    if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (originalIndexedDb) Object.defineProperty(globalThis, "indexedDB", originalIndexedDb);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});
