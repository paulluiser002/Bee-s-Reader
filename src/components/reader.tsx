'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Settings2, X, RotateCw, Eye } from 'lucide-react';
import { useResource } from '@/lib/client';
import { canAutoAdvance, type ReaderData } from '@/lib/reader';
import { useLocal } from './local-provider';
import { BookmarkButton } from './bookmark-button';
import { useReadingProgress } from './use-reading-progress';
import { Failure } from './catalog';
import { Button } from './ui/button';
export function Reader({ id }: { id: string }) {
  const local = useLocal();
  const data = useResource<ReaderData>(`/api/reader/${id}`);
  if (data.error)
    return (
      <div className="reader-message">
        <Failure message={data.error} retry={data.reload} />
        <Link href="/discover" className="button button-outline">
          Back to Discover
        </Link>
      </div>
    );
  if (local.error)
    return (
      <div className="reader-message">
        <Failure message={local.error} retry={local.reload} />
      </div>
    );
  if (!data.data || !local.ready)
    return (
      <div className="reader-message" role="status">
        <div className="skeleton" style={{ height: 300 }} />
        <p>Opening your chapter…</p>
      </div>
    );
  return <ChapterReader key={id} data={data.data} />;
}
function ChapterReader({ data }: { data: ReaderData }) {
  const { chapter, manga, pageCount, sequence, previous, next } = data;
  const router = useRouter();
  const local = useLocal();
  const prefs = local.state.preferences;
  const [resume] = useState(() => local.state.history.find((p) => p.chapterId === chapter.id));
  const [quality, setQuality] = useState<'data-saver' | 'original'>(prefs.quality);
  const [width, setWidth] = useState(prefs.pageWidthPercent);
  const [chrome, setChrome] = useState(true);
  const [appearance, setAppearance] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const stream = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);
  const [autoNext, setAutoNext] = useState(prefs.autoNext);
  const [transition, setTransition] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const visited = useRef(new Set<string>());
  const reading = useReadingProgress({
    stream,
    end,
    chapterId: chapter.id,
    mangaId: manga.id,
    pageCount,
    loaded,
    resume,
  });
  const { page } = reading;
  const saveProgress = reading.save;
  const navigate = useCallback(
    async (id: string) => {
      await saveProgress();
      router.push(`/read/${id}`);
    },
    [saveProgress, router],
  );
  const preferenceWrite = useRef(Promise.resolve());
  const preferenceRef = useRef(prefs);
  useEffect(() => {
    preferenceRef.current = prefs;
  }, [prefs]);
  function savePreferences(patch: Partial<typeof prefs>) {
    const value = { ...preferenceRef.current, ...patch };
    preferenceRef.current = value;
    preferenceWrite.current = preferenceWrite.current.then(async () => {
      try {
        await local.setPreferences(value);
        setPreferenceError('');
      } catch {
        setPreferenceError('This preference could not be saved. Try again in Settings.');
      }
    });
  }
  useEffect(() => {
    let previousIds: unknown = [];
    try {
      previousIds = JSON.parse(sessionStorage.getItem('bee-reader-path') || '[]');
    } catch {}
    if (Array.isArray(previousIds))
      visited.current = new Set(previousIds.filter((v) => typeof v === 'string'));
    visited.current.add(chapter.id);
    sessionStorage.setItem('bee-reader-path', JSON.stringify([...visited.current].slice(-100)));
  }, [chapter.id]);
  useEffect(() => {
    const allowed = canAutoAdvance({
      enabled: autoNext,
      intentional: reading.intentional,
      restored: reading.restored,
      allLoaded: reading.allLoaded,
      atEnd: reading.atEnd,
      currentId: chapter.id,
      nextId: next?.id || null,
      visited: visited.current,
    });
    if (!allowed) return;
    const show = setTimeout(() => setTransition(true), 0);
    const timer = setTimeout(() => {
      void navigate(next!.id);
    }, 4000);
    return () => {
      clearTimeout(show);
      clearTimeout(timer);
    };
  }, [
    autoNext,
    reading.intentional,
    reading.restored,
    reading.allLoaded,
    reading.atEnd,
    chapter.id,
    next,
    navigate,
  ]);
  const onLoaded = useCallback((index: number) => setLoaded((s) => new Set([...s, index])), []);
  useEffect(() => {
    function scroll() {
      const y = window.scrollY;
      if (!appearance && Math.abs(y - lastY.current) > 8) setChrome(y < lastY.current || y < 80);
      lastY.current = y;
    }
    window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, [appearance]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)
      )
        return;
      if (event.key === 'ArrowRight' && next) void navigate(next.id);
      if (event.key === 'ArrowLeft' && previous) void navigate(previous.id);
      if (event.key === 'Escape') {
        lastY.current = window.scrollY;
        setAppearance(false);
        setChrome(true);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [next, previous, navigate]);
  return (
    <div className="reader">
      <header className={`reader-toolbar ${chrome ? '' : 'chrome-hidden'}`}>
        <Link
          href={`/manga/${manga.id}`}
          className="icon-button"
          aria-label="Back to title"
          onClick={async (e) => {
            e.preventDefault();
            await saveProgress();
            router.push(`/manga/${manga.id}`);
          }}
        >
          <ArrowLeft size={21} />
        </Link>
        <div className="reader-title">
          <strong>{manga.title}</strong>
          <span>
            Chapter {chapter.number || 'extra'}
            {chapter.title ? ` · ${chapter.title}` : ''}
          </span>
        </div>
        <BookmarkButton id={manga.id} compact />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Reader appearance"
          onClick={() => setAppearance((v) => !v)}
          aria-expanded={appearance}
        >
          <Settings2 size={21} />
        </Button>
      </header>
      <div
        className="reader-top-progress"
        style={{ width: `${((page + 1) / pageCount) * 100}%` }}
      />
      {appearance && (
        <aside className="appearance-panel">
          <div className="row">
            <h2>Make yourself comfortable</h2>
            <span className="spacer" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close appearance"
              onClick={() => setAppearance(false)}
            >
              <X size={20} />
            </Button>
          </div>
          <label>
            Image quality
            <select
              aria-label="Image quality"
              value={quality}
              onChange={(e) => {
                setLoaded(new Set());
                setQuality(e.target.value as typeof quality);
                savePreferences({ quality: e.target.value as typeof quality });
              }}
            >
              <option value="data-saver">Data saver</option>
              <option value="original">Original</option>
            </select>
          </label>
          <label>
            Page width <span>{width}%</span>
            <input
              aria-label="Page width"
              type="range"
              min="50"
              max="100"
              step="5"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              onPointerUp={(e) =>
                savePreferences({ pageWidthPercent: Number(e.currentTarget.value) })
              }
              onKeyUp={(e) => savePreferences({ pageWidthPercent: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            Auto-next chapter
            <input
              type="checkbox"
              role="switch"
              aria-label="Reader auto-next chapter"
              className="switch"
              checked={autoNext}
              onChange={(e) => {
                setAutoNext(e.target.checked);
                savePreferences({ autoNext: e.target.checked });
              }}
            />
          </label>
          {preferenceError && (
            <p role="alert" className="small">
              {preferenceError}
            </p>
          )}
          <p className="small muted">
            Continuous vertical reading. Images keep their original proportions.
          </p>
          <Link href="/settings" className="source-link">
            All reading preferences
            <ChevronRight size={15} />
          </Link>
        </aside>
      )}
      <div className="reader-chapter-credit">
        <Link href={`/manga/${manga.id}`}>{manga.title}</Link>
        <h1>Chapter {chapter.number || 'extra'}</h1>
        <p>
          Translation:{' '}
          {chapter.groups.length
            ? chapter.groups.map((g, i) => (
                <span key={g.id}>
                  {i > 0 ? ', ' : ''}
                  <a href={`https://mangadex.org/group/${g.id}`} target="_blank" rel="noreferrer">
                    {g.name}
                  </a>
                </span>
              ))
            : 'Uploader on MangaDex'}
          <br />
          <a href={`https://mangadex.org/chapter/${chapter.id}`} target="_blank" rel="noreferrer">
            Read on MangaDex
          </a>
        </p>
      </div>
      <div
        ref={stream}
        className="reader-stream"
        style={{ width: `${width}%` }}
        onClick={() => setChrome((v) => !v)}
      >
        {Array.from({ length: pageCount }, (_, i) => (
          <ReaderPage
            key={`${quality}-${i}`}
            id={chapter.id}
            index={i}
            quality={quality}
            eager={i === reading.resumeIndex}
            onLoaded={onLoaded}
          />
        ))}
      </div>
      <div ref={end} className="reader-end-sentinel" aria-hidden="true" />
      <div className="reader-end">
        <h2>{reading.allLoaded ? 'A chapter well spent.' : 'You’ve reached the end.'}</h2>
        <p>
          {reading.allLoaded
            ? 'Take a breath. There’s more to the story.'
            : 'Some pages are still loading or need a retry.'}
        </p>
        <label className="reader-auto-next">
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(e) => {
              setAutoNext(e.target.checked);
              savePreferences({ autoNext: e.target.checked });
            }}
          />
          Continue to the next chapter automatically
        </label>
        <div className="row">
          {next ? (
            <Button asChild>
              <Link
                href={`/read/${next.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  void navigate(next.id);
                }}
              >
                Next chapter
                <ChevronRight size={17} />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/manga/${manga.id}`}>Back to title</Link>
            </Button>
          )}
        </div>
        {data.truncated && (
          <p className="small muted">
            This title exceeds MangaDex’s 10,000-chapter feed limit. Some chapters may be
            unavailable in the selector.
          </p>
        )}
      </div>
      {reading.saveError && (
        <div role="alert" className="reader-save-error">
          {reading.saveError} <button onClick={() => reading.save()}>Retry save</button>
        </div>
      )}
      {transition && autoNext && reading.atEnd && (
        <div className="next-transition" role="status">
          <div>
            <strong>Next: chapter {next?.number || 'extra'}</strong>
            <span>Continuing your story…</span>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setAutoNext(false);
              setTransition(false);
              savePreferences({ autoNext: false });
            }}
          >
            Cancel auto-next
          </Button>
        </div>
      )}
      <footer className={`reader-bottom ${chrome ? '' : 'chrome-hidden'}`}>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous chapter"
          disabled={!previous}
          onClick={() => previous && void navigate(previous.id)}
        >
          <ChevronLeft size={22} />
        </Button>
        <select
          aria-label="Choose chapter"
          value={chapter.id}
          onChange={(e) => void navigate(e.target.value)}
        >
          {sequence.map((c) => (
            <option value={c.id} key={c.id}>
              {c.volume ? `Vol. ${c.volume} · ` : ''}Ch. {c.number || 'extra'}
              {c.title ? ` — ${c.title}` : ''}
            </option>
          ))}
        </select>
        <span className="reader-page-count">
          {page + 1}/{pageCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next chapter"
          disabled={!next}
          onClick={() => next && void navigate(next.id)}
        >
          <ChevronRight size={22} />
        </Button>
      </footer>
      {!chrome && (
        <button
          className="show-controls icon-button"
          aria-label="Show reader controls"
          onClick={() => {
            lastY.current = window.scrollY;
            setChrome(true);
          }}
        >
          <Eye size={18} />
        </button>
      )}
    </div>
  );
}
function ReaderPage({
  id,
  index,
  quality,
  eager,
  onLoaded,
}: {
  id: string;
  index: number;
  quality: string;
  eager: boolean;
  onLoaded: (i: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 2 || eager);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return (
    <div ref={root} data-page={index} className={`reader-page ${loaded ? 'page-loaded' : ''}`}>
      {visible && !failed && (
        <img
          src={`/api/reader/${id}/images/${index}?quality=${quality}${retry ? '&retry=' + retry : ''}`}
          alt={`Page ${index + 1}`}
          onLoad={() => {
            setLoaded(true);
            onLoaded(index);
          }}
          onError={() => setFailed(true)}
          decoding="async"
        />
      )}
      {!loaded && !failed && (
        <span className="page-loading" role="status">
          Loading page {index + 1}…
        </span>
      )}
      {failed && (
        <div className="page-failure" onClick={(e) => e.stopPropagation()}>
          <p>Page {index + 1} couldn’t load.</p>
          <Button
            variant="outline"
            disabled={retry >= 20}
            onClick={() => {
              setFailed(false);
              setRetry((n) => n + 1);
            }}
          >
            <RotateCw size={16} />
            Retry page
          </Button>
          <Button
            variant="ghost"
            onClick={() => document.querySelector(`[data-page="${index + 1}"]`)?.scrollIntoView()}
          >
            Go to next page
          </Button>
        </div>
      )}
    </div>
  );
}
