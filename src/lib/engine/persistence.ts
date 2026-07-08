import { PlayerState } from './types';
import { CURRENT_SCHEMA_VERSION } from './engine';

const DEFAULT_STORAGE_KEY = 'pros:player-state';

export interface PersistedEnvelope {
  schemaVersion: number;
  state: PlayerState;
  savedAt: string;
}

/**
 * The engine and any future UI only ever depend on this interface, never on
 * localStorage directly - so swapping in a cloud-backed adapter later is a
 * one-file change, not a rewrite.
 */
export interface StorageAdapter {
  load(): Promise<PersistedEnvelope | null>;
  save(envelope: PersistedEnvelope): Promise<void>;
  clear(): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key: string = DEFAULT_STORAGE_KEY) {}

  async load(): Promise<PersistedEnvelope | null> {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    return migrateEnvelope(JSON.parse(raw));
  }

  async save(envelope: PersistedEnvelope): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(envelope));
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key);
  }
}

/** In-memory adapter - used in tests, demos, and as a safe fallback outside a browser. */
export class InMemoryStorageAdapter implements StorageAdapter {
  private data: PersistedEnvelope | null = null;
  async load() {
    return this.data;
  }
  async save(envelope: PersistedEnvelope) {
    this.data = envelope;
  }
  async clear() {
    this.data = null;
  }
}

/**
 * Upgrades a raw parsed object from any past schema version to the current
 * shape. No migrations exist yet (this is schema v1) - this function is the
 * seam where they get added later, one `if (raw.schemaVersion === N)` block
 * at a time, so an old save never silently breaks after an update.
 */
export function migrateEnvelope(raw: any): PersistedEnvelope {
  if (raw?.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return raw as PersistedEnvelope;
  }
  throw new Error(`Unknown or unsupported schema version: ${raw?.schemaVersion}`);
}

export function wrapForSave(state: PlayerState, now: Date = new Date()): PersistedEnvelope {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, state, savedAt: now.toISOString() };
}

/** Manual backup/restore - works regardless of which StorageAdapter is active. */
export function exportStateAsJson(state: PlayerState): string {
  return JSON.stringify(wrapForSave(state), null, 2);
}

export function importStateFromJson(json: string): PlayerState {
  return migrateEnvelope(JSON.parse(json)).state;
}
