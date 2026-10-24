'use client';
import { useEffect, useState } from 'react';
export async function clientJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The request failed. Please try again.');
  return body;
}
export function useResource<T>(url: string | null) {
  const [revision, setRevision] = useState(0);
  const key = url ? `${url}|${revision}` : null;
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!url || !key) return;
    let alive = true;
    const controller = new AbortController();
    clientJSON<T>(url, { signal: controller.signal })
      .then((data) => {
        if (alive) setResult({ key, data });
      })
      .catch((e) => {
        if (alive && e.name !== 'AbortError') setResult({ key, error: e.message });
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [url, key]);
  return {
    data:
      result?.key === key || (url && result?.key.startsWith(url + '|')) ? result?.data : undefined,
    error: result?.key === key ? result?.error : undefined,
    loading: !!url && result?.key !== key,
    reload: () => setRevision((n) => n + 1),
  };
}
