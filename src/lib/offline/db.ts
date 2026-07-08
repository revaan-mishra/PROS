import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface SyncAction {
  id: string; // client-generated uuid
  actionName: string; // e.g., 'saveWorkoutSession', 'logActivity'
  payload: any; // The serialized arguments for the server action
  timestamp: number;
}

interface ProsDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncAction;
    indexes: {
      "by-timestamp": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ProsDB>> | null = null;

export function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<ProsDB>("pros-offline-db", 1, {
      upgrade(db) {
        const store = db.createObjectStore("syncQueue", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      },
    });
  }
  return dbPromise;
}

export async function pushToSyncQueue(actionName: string, payload: any) {
  const db = await getDB();
  if (!db) return;
  const id = crypto.randomUUID();
  await db.add("syncQueue", {
    id,
    actionName,
    payload,
    timestamp: Date.now(),
  });
  return id;
}

export async function peekSyncQueue(): Promise<SyncAction[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex("syncQueue", "by-timestamp");
}

export async function removeFromSyncQueue(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete("syncQueue", id);
}

export async function clearSyncQueue() {
  const db = await getDB();
  if (!db) return;
  await db.clear("syncQueue");
}
