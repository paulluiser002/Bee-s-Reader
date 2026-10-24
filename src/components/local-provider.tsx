'use client';
import { createContext, useContext, useCallback, useState } from 'react';
import { useResource, clientJSON } from '@/lib/client';
import { defaults, type Preferences, type LocalState, type Progress } from '@/lib/schemas';
const Context = createContext<{
  state: LocalState;
  ready: boolean;
  error?: string;
  reload: () => void;
  recordProgress: (progress: Progress) => void;
  bookmark: (id: string, saved: boolean) => Promise<void>;
  setPreferences: (prefs: Preferences) => Promise<void>;
}>({
  state: { preferences: defaults, bookmarks: [], history: [] },
  ready: false,
  reload: () => {},
  recordProgress: () => {},
  bookmark: async () => {},
  setPreferences: async () => {},
});
export function LocalProvider({ children }: { children: React.ReactNode }) {
  const result = useResource<LocalState>('/api/local');
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [historyChanges, setHistoryChanges] = useState<Progress[]>([]);
  const recordProgress = useCallback(
    (row: Progress) =>
      setHistoryChanges((rows) => {
        const old = rows.find((p) => p.chapterId === row.chapterId);
        if (old && old.updatedAt > row.updatedAt) return rows;
        return [row, ...rows.filter((p) => p.chapterId !== row.chapterId)].slice(0, 1000);
      }),
    [],
  );
  const history = [
    ...historyChanges,
    ...(result.data?.history || []).filter(
      (p) => !historyChanges.some((row) => row.chapterId === p.chapterId),
    ),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const bookmark = useCallback(
    async (mangaId: string, saved: boolean) => {
      await clientJSON('/api/local/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mangaId, saved }),
      });
      result.reload();
    },
    [result],
  );
  const setPreferences = async (value: Preferences) => {
    const data = await clientJSON<Preferences>('/api/local/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    setPrefs(data);
    result.reload();
  };
  return (
    <Context.Provider
      value={{
        state: {
          preferences: prefs || result.data?.preferences || defaults,
          bookmarks: result.data?.bookmarks || [],
          history,
        },
        ready: !!result.data,
        error: result.error,
        reload: () => {
          setHistoryChanges([]);
          result.reload();
        },
        recordProgress,
        bookmark,
        setPreferences,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLocal() {
  return useContext(Context);
}
