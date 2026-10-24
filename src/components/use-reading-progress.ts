'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Progress } from '@/lib/schemas';
import { positionInPage } from '@/lib/reader';
import { clientJSON } from '@/lib/client';
import { useLocal } from './local-provider';
type Position = {
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  scrollFraction: number;
  completed: boolean;
};
export function useReadingProgress({
  stream,
  end,
  chapterId,
  mangaId,
  pageCount,
  loaded,
  resume,
}: {
  stream: RefObject<HTMLDivElement | null>;
  end: RefObject<HTMLDivElement | null>;
  chapterId: string;
  mangaId: string;
  pageCount: number;
  loaded: Set<number>;
  resume?: Progress;
}) {
  const { recordProgress } = useLocal();
  const [initial] = useState(() =>
    resume && !resume.completed
      ? { ...resume, pageIndex: Math.min(resume.pageIndex, pageCount - 1) }
      : undefined,
  );
  const [restored, setRestored] = useState(!initial);
  const restoredRef = useRef(!initial);
  const [atEnd, setAtEnd] = useState(false);
  const [intentional, setIntentional] = useState(false);
  const [page, setPage] = useState(initial?.pageIndex || 0);
  const [saveError, setSaveError] = useState('');
  const userInput = useRef(false);
  const intentionalRef = useRef(false);
  const lastY = useRef(0);
  const lastWrite = useRef('');
  const timestamp = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const snapshot = useRef<Position | null>(null);
  const allLoaded = Array.from({ length: pageCount }, (_, i) => i).every(
    (i) => i < (initial?.pageIndex || 0) || loaded.has(i),
  );
  const readyState = useRef({ allLoaded, atEnd });
  useEffect(() => {
    readyState.current = { allLoaded, atEnd };
  }, [allLoaded, atEnd]);
  useEffect(() => {
    if (!initial || restoredRef.current) return;
    const target = stream.current?.querySelector<HTMLElement>(`[data-page="${initial.pageIndex}"]`);
    if (!target) return;
    // Load only the resume neighborhood; earlier offscreen pages stay as placeholders.
    target.scrollIntoView({ block: 'start' });
    if (!loaded.has(initial.pageIndex)) return;
    let timeout: ReturnType<typeof setTimeout>;
    const position = () => {
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + target.offsetHeight * initial.scrollFraction,
        behavior: 'instant',
      });
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        restoredRef.current = true;
        setRestored(true);
        observer.disconnect();
      }, 500);
    };
    const observer = new ResizeObserver(position);
    if (stream.current) observer.observe(stream.current);
    position();
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [initial, loaded, stream]);
  const capture = useCallback(() => {
    if (!restoredRef.current || !stream.current) return;
    const pages = [...stream.current.querySelectorAll<HTMLElement>('[data-page]')];
    let current = pages[0];
    for (const el of pages)
      if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) current = el;
    if (!current) return;
    const pageIndex = Number(current.dataset.page);
    setPage(pageIndex);
    const completed =
      readyState.current.allLoaded && readyState.current.atEnd && intentionalRef.current;
    snapshot.current = {
      mangaId,
      chapterId,
      pageIndex: completed ? pageCount - 1 : pageIndex,
      scrollFraction: completed
        ? 1
        : positionInPage(-current.getBoundingClientRect().top, current.offsetHeight),
      completed,
    };
  }, [chapterId, mangaId, pageCount, stream]);
  const save = useCallback(
    async (keepalive = false, measure = true) => {
      if (measure) capture();
      const position = snapshot.current;
      if (!position) return;
      const signature = JSON.stringify(position);
      if (lastWrite.current === signature) return;
      const recordedAt = Math.max(Date.now(), timestamp.current + 1);
      timestamp.current = recordedAt;
      const serialized = JSON.stringify({ ...position, recordedAt });
      const send = async () => {
        try {
          const saved = await clientJSON<Progress>('/api/local/progress', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: serialized,
            keepalive,
          });
          recordProgress(saved);
          lastWrite.current = signature;
          setSaveError('');
        } catch (e) {
          setSaveError(
            e instanceof Error ? e.message : 'Your reading position could not be saved.',
          );
        }
      };
      // Lifecycle requests must dispatch now; the database rejects older recordedAt values.
      if (keepalive) return send();
      pending.current = pending.current.then(send, send);
      await pending.current;
    },
    [capture, recordProgress],
  );
  useEffect(() => {
    const node = end.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => setAtEnd(entries.some((e) => e.isIntersecting)),
      { threshold: 1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [end]);
  useEffect(() => {
    const mark = () => {
      userInput.current = true;
    };
    const keyboard = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'End', ' '].includes(e.key)) mark();
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (restoredRef.current && userInput.current && y > lastY.current + 2) {
        intentionalRef.current = true;
        setIntentional(true);
      }
      lastY.current = y;
      capture();
      if (!saveTimer.current)
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          void save();
        }, 1500);
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') void save(true);
    };
    const leaving = () => {
      void save(true);
    };
    window.addEventListener('wheel', mark, { passive: true });
    window.addEventListener('touchmove', mark, { passive: true });
    window.addEventListener('keydown', keyboard);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', leaving);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchmove', mark);
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', leaving);
      document.removeEventListener('visibilitychange', visibility);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void save(true, false);
    };
  }, [capture, save]);
  useEffect(() => {
    if (restored) void save();
  }, [restored, atEnd, allLoaded, intentional, save]);
  return {
    page,
    restored,
    atEnd,
    intentional,
    allLoaded,
    save,
    saveError,
    resumeIndex: initial?.pageIndex || 0,
  };
}
