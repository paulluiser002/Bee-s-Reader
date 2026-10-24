'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Languages,
} from 'lucide-react';
import type { Manga, Chapter } from '@/lib/providers/mangadex';
import { useResource } from '@/lib/client';
import { Cover, Failure } from './catalog';
import { Button } from './ui/button';
import { BookmarkButton } from './bookmark-button';
import { useLocal } from './local-provider';
import { latestPerManga } from '@/lib/progress';
export function MangaDetail({ id }: { id: string }) {
  const local = useLocal();
  const resume = latestPerManga(local.state.history).find((p) => p.mangaId === id);
  const [langOverride, setLang] = useState<string | null>(null);
  const lang = langOverride || local.state.preferences.language;
  const [offset, setOffset] = useState(0);
  const [metadata, setMetadata] = useState(false);
  const manga = useResource<Manga>(`/api/manga/${id}?language=${lang}`);
  const feed = useResource<{ data: Chapter[]; total: number }>(
    `/api/manga/${id}/chapters?language=${lang}&offset=${offset}`,
  );
  const extra = useResource<{
    sources: {
      provider: string;
      data: {
        title: string;
        score: string | null;
        genres: string[];
        status: string | null;
        chapters: number | null;
        volumes: number | null;
        url: string;
      } | null;
      error: string | null;
    }[];
  }>(metadata ? `/api/manga/${id}/metadata` : null);
  if (manga.error) return <Failure message={manga.error} retry={manga.reload} />;
  if (!manga.data)
    return (
      <div aria-label="Loading title" role="status" className="skeleton" style={{ height: 400 }} />
    );
  const m = manga.data;
  return (
    <>
      <Link href="/discover" className="back-link">
        <ArrowLeft size={18} />
        Discover
      </Link>
      <section className="detail-hero">
        <div className="detail-cover">
          <Cover manga={m} />
        </div>
        <div className="detail-info">
          <div className="row small muted">
            <span>{m.kind}</span>
            <span>{m.year}</span>
            <span className="badge">{m.status}</span>
          </div>
          <h1>{m.title}</h1>
          {m.creators.length > 0 && <p className="muted">{[...new Set(m.creators)].join(', ')}</p>}
          <div className="detail-actions">
            {feed.data?.data[0] && (
              <Button asChild>
                <Link href={`/read/${resume?.chapterId || feed.data.data[0].id}`}>
                  <BookOpen size={18} />
                  {resume ? 'Continue reading' : 'Start reading'}
                </Link>
              </Button>
            )}
            <BookmarkButton id={id} />
          </div>
          <div className="tag-list">
            {m.tags.map((t) => (
              <Link key={t.id} href={`/discover?tag=${t.id}`} className="tag">
                {t.name}
              </Link>
            ))}
          </div>
          <a
            className="source-link"
            href={`https://mangadex.org/title/${id}`}
            target="_blank"
            rel="noreferrer"
          >
            View title on MangaDex
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
      <section className="synopsis">
        <h2>The story</h2>
        <p>
          {m.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#]/g, '') ||
            'No description is available in this language.'}
        </p>
      </section>
      <section>
        <div className="section-heading">
          <h2>Chapters</h2>
          <label className="row small">
            <Languages size={17} />
            <select
              aria-label="Chapter language"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setOffset(0);
              }}
            >
              {[
                ['en', 'English'],
                ['es', 'Spanish'],
                ['es-la', 'Spanish (LATAM)'],
                ['fr', 'French'],
                ['pt-br', 'Portuguese (BR)'],
                ['id', 'Indonesian'],
                ['de', 'German'],
                ['ru', 'Russian'],
                ['vi', 'Vietnamese'],
              ].map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {feed.error ? (
          <Failure message={feed.error} retry={feed.reload} />
        ) : feed.loading ? (
          <div
            role="status"
            className="skeleton"
            style={{ height: 200 }}
            aria-label="Loading chapters"
          />
        ) : !feed.data?.data.length ? (
          <div className="notice">
            No readable chapters are available in this language. External and empty chapters are
            excluded. Try another language or check MangaDex.
          </div>
        ) : (
          <div className="chapter-list">
            {feed.data.data.map((c) => (
              <Link key={c.id} href={`/read/${c.id}`} className="chapter-row">
                <span className="chapter-number">{c.number || 'Extra'}</span>
                <span className="chapter-text">
                  <strong>{c.title || `Chapter ${c.number || 'extra'}`}</strong>
                  <small>
                    {c.groups.map((g) => g.name).join(', ') || 'Uploader on MangaDex'} ·{' '}
                    {new Date(c.publishedAt).toLocaleDateString()}
                  </small>
                </span>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        )}
        {feed.data && feed.data.total > 100 && (
          <div className="pagination">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset((n) => Math.max(0, n - 100))}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <span className="small">
              {offset + 1}–{Math.min(offset + 100, feed.data.total)}
            </span>
            <Button
              variant="outline"
              disabled={offset + 100 >= Math.min(feed.data.total, 10000)}
              onClick={() => setOffset((n) => n + 100)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </section>
      <section className="supplement">
        <div className="section-heading">
          <h2>A little more context</h2>
        </div>
        <p className="muted small">
          Optional catalog metadata, matched only through MangaDex’s linked provider IDs. Scores and
          chapter counts may differ from readable availability.
        </p>
        {!metadata ? (
          <Button variant="outline" onClick={() => setMetadata(true)}>
            Load supplementary metadata
          </Button>
        ) : extra.loading ? (
          <p role="status">Checking supplementary sources…</p>
        ) : extra.error ? (
          <Failure message={extra.error} retry={extra.reload} />
        ) : (
          <div className="metadata-grid">
            {extra.data?.sources.map((s) => (
              <div className="metadata-source" key={s.provider}>
                <h3>{s.provider}</h3>
                {s.data ? (
                  <>
                    <p>{s.data.title}</p>
                    <p className="muted small">
                      {s.data.score ? `Score ${s.data.score}` : 'No score'} ·{' '}
                      {s.data.status || 'Status unavailable'}
                    </p>
                    <p className="muted small">{s.data.genres.join(', ')}</p>
                    <a className="source-link" href={s.data.url} target="_blank" rel="noreferrer">
                      Source details
                      <ArrowUpRight size={14} />
                    </a>
                  </>
                ) : (
                  <p className="muted small">{s.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
