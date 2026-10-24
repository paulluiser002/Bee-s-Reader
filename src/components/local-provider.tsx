'use client';
import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserProfile, PROFILE_PREFIX } from '@/lib/browser-profile';
import {
  defaults,
  type Preferences,
  type LocalState,
  type Progress,
  type progressSchema,
} from '@/lib/schemas';
import type { z } from 'zod';
const Context = createContext<{
  state: LocalState;
  ready: boolean;
  error?: string;
  reload: () => void;
  saveProgress: (progress: z.infer<typeof progressSchema>) => Progress;
  bookmark: (id: string, saved: boolean) => Promise<void>;
  setPreferences: (prefs: Preferences) => Promise<void>;
  clearHistory: () => void;
  exportProfile: () => string;
  importProfile: (backup: string) => void;
}>({
  state: { preferences: defaults, bookmarks: [], history: [] },
  ready: false,
  reload: () => {},
  saveProgress: () => {
    throw new Error('Profile is not ready.');
  },
  bookmark: async () => {},
  setPreferences: async () => {},
  clearHistory: () => {},
  exportProfile: () => '',
  importProfile: () => {},
});
export function LocalProvider({ children }: { children: React.ReactNode }) {
  const store = useRef<BrowserProfile | null>(null);
  const [state, setState] = useState<LocalState>({
    preferences: defaults,
    bookmarks: [],
    history: [],
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const reload = useCallback(() => {
    try {
      store.current ??= new BrowserProfile(window.localStorage);
      setState(store.current.read());
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Browser storage is unavailable.');
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    reload();
    const changed = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(PROFILE_PREFIX)) reload();
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [reload]);
  const get = useCallback(() => {
    if (!store.current)
      throw new Error('Browser storage is unavailable. Your reading position could not be saved.');
    return store.current;
  }, []);
  const saveProgress = useCallback(
    (progress: z.infer<typeof progressSchema>) => {
      const saved = get().progress(progress);
      reload();
      return saved;
    },
    [get, reload],
  );
  const bookmark = useCallback(
    async (id: string, saved: boolean) => {
      get().bookmark(id, saved);
      reload();
    },
    [get, reload],
  );
  const setPreferences = useCallback(
    async (prefs: Preferences) => {
      get().preferences(prefs);
      reload();
    },
    [get, reload],
  );
  return (
    <Context.Provider
      value={{
        state,
        ready,
        error,
        reload,
        saveProgress,
        bookmark,
        setPreferences,
        clearHistory: () => {
          get().clearHistory();
          reload();
        },
        exportProfile: () => get().export(),
        importProfile: (backup) => {
          get().import(backup);
          reload();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLocal() {
  return useContext(Context);
}
