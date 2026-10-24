import { z } from 'zod';
import {
  defaults,
  preferencesSchema,
  progressSchema,
  uuid,
  type LocalState,
  type Preferences,
  type Progress,
} from './schemas';
export const PROFILE_PREFIX = 'bees-reader:v2:';
const bookmarkSchema = z.object({
  mangaId: uuid,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const savedProgressSchema = progressSchema.extend({ updatedAt: z.iso.datetime() });
export const backupSchema = z.object({
  format: z.literal('bees-reader-profile'),
  version: z.literal(2),
  exportedAt: z.iso.datetime(),
  preferences: preferencesSchema,
  bookmarks: z.array(bookmarkSchema).max(10000),
  history: z.array(savedProgressSchema).max(1000),
});
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
export class BrowserProfile {
  // A writer owns its own chapter slot, so concurrent tabs never replace each other's records.
  private readonly writer = crypto.randomUUID();
  private history(chapterId?: string): Progress[] {
    const merged = new Map<string, Progress>();
    for (const key of this.keys()) {
      if (
        !key.startsWith('progress:') ||
        (chapterId &&
          key !== 'progress:' + chapterId &&
          !key.startsWith('progress:' + chapterId + ':'))
      )
        continue;
      const row = this.readValue(key, savedProgressSchema);
      if (!row) continue;
      const old = merged.get(row.chapterId);
      const newer =
        !old ||
        (row.recordedAt ?? Date.parse(row.updatedAt)) >
          (old.recordedAt ?? Date.parse(old.updatedAt)) ||
        ((row.recordedAt ?? Date.parse(row.updatedAt)) ===
          (old.recordedAt ?? Date.parse(old.updatedAt)) &&
          JSON.stringify(row) > JSON.stringify(old));
      merged.set(row.chapterId, {
        ...(newer ? row : old!),
        completed: row.completed || !!old?.completed,
      });
    }
    return [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  constructor(private storage: ProfileStorage) {}
  private readValue<T>(key: string, schema: z.ZodType<T>): T | null {
    try {
      const raw = this.storage.getItem(PROFILE_PREFIX + key);
      return raw === null ? null : schema.parse(JSON.parse(raw));
    } catch {
      throw new Error(
        'Saved profile data could not be read. Your browser data has been kept; restore a backup or check browser storage permissions.',
      );
    }
  }
  private write(key: string, value: unknown) {
    try {
      this.storage.setItem(PROFILE_PREFIX + key, JSON.stringify(value));
    } catch {
      throw new Error(
        'Could not save to browser storage. Check available space and storage permissions.',
      );
    }
  }
  private keys() {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(PROFILE_PREFIX)) keys.push(key.slice(PROFILE_PREFIX.length));
    }
    return keys;
  }
  read(): LocalState {
    const bookmarks: LocalState['bookmarks'] = [];
    for (const key of this.keys()) {
      if (key.startsWith('bookmark:')) {
        const row = this.readValue(key, bookmarkSchema);
        if (row) bookmarks.push(row);
      }
    }
    return {
      preferences: this.readValue('preferences', preferencesSchema) || {
        ...defaults,
        theme: ['light', 'dark', 'system'].includes(this.storage.getItem('theme') || '')
          ? (this.storage.getItem('theme') as Preferences['theme'])
          : defaults.theme,
      },
      bookmarks: bookmarks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      history: this.history().slice(0, 1000),
    };
  }
  preferences(value: Preferences) {
    const parsed = preferencesSchema.parse(value);
    this.write('preferences', parsed);
    return parsed;
  }
  bookmark(id: string, saved: boolean) {
    uuid.parse(id);
    const key = 'bookmark:' + id;
    if (!saved) {
      try {
        this.storage.removeItem(PROFILE_PREFIX + key);
      } catch {
        throw new Error('Could not update browser storage.');
      }
      return;
    }
    const old = this.readValue(key, bookmarkSchema);
    const now = new Date().toISOString();
    this.write(key, { mangaId: id, createdAt: old?.createdAt || now, updatedAt: now });
  }
  progress(value: z.infer<typeof progressSchema>): Progress {
    const input = progressSchema.parse(value);
    const key = 'progress:' + input.chapterId + ':' + this.writer;
    const old = this.history(input.chapterId)[0];
    const recordedAt = input.recordedAt ?? Date.now();
    if (old && (old.recordedAt ?? Date.parse(old.updatedAt)) > recordedAt) {
      if (input.completed && !old.completed) {
        const completed = { ...old, completed: true };
        this.write(key, completed);
        return completed;
      }
      return old;
    }
    const row = {
      ...input,
      recordedAt,
      completed: input.completed || !!old?.completed,
      updatedAt: new Date(recordedAt).toISOString(),
    };
    this.write(key, row);
    return row;
  }
  clearHistory() {
    try {
      for (const key of this.keys())
        if (key.startsWith('progress:')) this.storage.removeItem(PROFILE_PREFIX + key);
    } catch {
      throw new Error('Could not clear reading history from browser storage.');
    }
  }
  export() {
    return JSON.stringify(
      {
        format: 'bees-reader-profile',
        version: 2,
        exportedAt: new Date().toISOString(),
        ...this.read(),
      },
      null,
      2,
    );
  }
  import(text: string) {
    if (text.length > 2 * 1024 * 1024)
      throw new Error('Profile backups must be smaller than 2 MB.');
    let backup: z.infer<typeof backupSchema>;
    try {
      backup = backupSchema.parse(JSON.parse(text));
    } catch {
      throw new Error('This is not a valid Bee’s Reader profile backup. No data was changed.');
    }
    for (const b of backup.bookmarks) {
      const key = 'bookmark:' + b.mangaId;
      const old = this.readValue(key, bookmarkSchema);
      if (!old || old.updatedAt < b.updatedAt) this.write(key, b);
    }
    for (const { updatedAt, ...progress } of backup.history) {
      this.progress({ ...progress, recordedAt: progress.recordedAt ?? Date.parse(updatedAt) });
    }
    this.preferences(backup.preferences);
  }
}
