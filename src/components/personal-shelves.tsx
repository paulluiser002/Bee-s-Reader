'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen, Bookmark, History } from 'lucide-react';
import { useLocal } from './local-provider';
import { useResource } from '@/lib/client';
import { latestPerManga } from '@/lib/progress';
import { Cover, Empty, Failure, MangaGrid, type MangaResults } from './catalog';
import { BookmarkButton } from './bookmark-button';
export function PersonalShelves() {
  const local = useLocal();
  const resumes = latestPerManga(local.state.history)
    .filter((p) => !p.completed)
    .slice(0, 3);
  const ids = [
    ...new Set([
      ...resumes.map((p) => p.mangaId),
      ...local.state.bookmarks.slice(0, 6).map((b) => b.mangaId),
    ]),
  ];
  const titles = useResource<MangaResults>(
    ids.length ? `/api/manga?ids=${ids.join(',')}&limit=100` : null,
  );
  if (!local.ready || !ids.length) return null;
  return (
    <>
      {resumes.length > 0 && (
        <>
          <div className="section-heading">
            <h2>Right where you left off</h2>
            <Link href="/history">
              Your history
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="continue-grid">
            {resumes.map((p) => {
              const m = titles.data?.data.find((m) => m.id === p.mangaId);
              return m ? (
                <Link key={p.chapterId} href={`/read/${p.chapterId}`} className="continue-card">
                  <Cover manga={m} />
                  <div>
                    <span className="small muted">Continue reading</span>
                    <h3>{m.title}</h3>
                    <p>
                      Page {p.pageIndex + 1}
                      <ArrowRight size={15} />
                    </p>
                  </div>
                </Link>
              ) : null;
            })}
          </div>
        </>
      )}
      {local.state.bookmarks.length > 0 && (
        <>
          <div className="section-heading">
            <h2>A shelf of your own</h2>
            <Link href="/library">
              Your library
              <ArrowRight size={16} />
            </Link>
          </div>
          <MangaGrid
            data={titles.data?.data
              .filter((m) => local.state.bookmarks.some((b) => b.mangaId === m.id))
              .slice(0, 6)}
            loading={titles.loading}
            error={titles.error}
            reload={titles.reload}
          />
        </>
      )}
    </>
  );
}
export function LibraryPage() {
  const local = useLocal();
  const [sort, setSort] = useState('saved');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const resumes = latestPerManga(local.state.history);
  const saved = [...local.state.bookmarks].sort((a, b) =>
    sort === 'saved'
      ? b.createdAt.localeCompare(a.createdAt)
      : (resumes.find((p) => p.mangaId === b.mangaId)?.updatedAt || '').localeCompare(
          resumes.find((p) => p.mangaId === a.mangaId)?.updatedAt || '',
        ),
  );
  const slice = saved.slice(page * 48, page * 48 + 48);
  const result = useResource<MangaResults>(
    slice.length ? `/api/manga?ids=${slice.map((b) => b.mangaId).join(',')}&limit=100` : null,
  );
  const filtered = slice
    .map((b) => result.data?.data.find((m) => m.id === b.mangaId))
    .filter((m) => m && (filter === 'all' || m.kind.toLowerCase() === filter));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your library.</h1>
          <p>All your favorites, in one cozy corner.</p>
        </div>
        <Bookmark size={27} className="muted" />
      </div>
      {local.error ? (
        <Failure message={local.error} retry={local.reload} />
      ) : !local.ready ? (
        <p role="status">Opening your library…</p>
      ) : !saved.length ? (
        <Empty title="Every good library starts with one story.">
          Save a title while browsing. It’ll be waiting here whenever you’re ready.
        </Empty>
      ) : (
        <>
          <div className="results-heading">
            <select
              aria-label="Filter library"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All stories</option>
              <option value="manga">Manga</option>
              <option value="manhwa">Manhwa</option>
              <option value="manhua">Manhua</option>
            </select>
            <select
              aria-label="Sort library"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="saved">Recently saved</option>
              <option value="read">Recently read</option>
            </select>
          </div>
          <MangaGrid
            data={filtered.filter((m): m is NonNullable<typeof m> => !!m)}
            loading={result.loading}
            error={result.error}
            reload={result.reload}
          />
          {result.data && slice.length > result.data.data.length && (
            <p className="notice">
              Some saved titles are no longer available on MangaDex. Your bookmarks are retained.
            </p>
          )}
          <div className="pagination">
            <button
              className="button button-outline"
              disabled={page === 0}
              onClick={() => setPage((n) => n - 1)}
            >
              Previous
            </button>
            <span>{page + 1}</span>
            <button
              className="button button-outline"
              disabled={(page + 1) * 48 >= saved.length}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
export function HistoryPage() {
  const local = useLocal();
  const [page, setPage] = useState(0);
  const rows = local.state.history.slice(page * 30, page * 30 + 30);
  const ids = [...new Set(rows.map((p) => p.mangaId))];
  const result = useResource<MangaResults>(
    ids.length ? `/api/manga?ids=${ids.join(',')}&limit=100` : null,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Stories you’ve spent time with.</h1>
          <p>Pick up a chapter right where you left it.</p>
        </div>
        <History size={27} className="muted" />
      </div>
      {local.error ? (
        <Failure message={local.error} retry={local.reload} />
      ) : !local.ready ? (
        <p role="status">Opening your history…</p>
      ) : !rows.length ? (
        <Empty title="Your reading journey starts here.">
          Open a chapter and we’ll remember your place. No account needed.
        </Empty>
      ) : result.error ? (
        <Failure message={result.error} retry={result.reload} />
      ) : (
        <div className="history-list">
          {rows.map((p) => {
            const m = result.data?.data.find((m) => m.id === p.mangaId);
            return (
              <div className="history-row" key={p.chapterId}>
                <Link href={`/read/${p.chapterId}`} className="history-main">
                  {m ? <Cover manga={m} /> : <BookOpen size={36} />}
                  <div>
                    <h3>{m?.title || 'Saved title'}</h3>
                    <p>
                      Page {p.pageIndex + 1}
                      {p.completed ? ' · Finished' : ''}
                    </p>
                    <time dateTime={p.updatedAt}>
                      {new Date(p.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                </Link>
                {m && <BookmarkButton id={m.id} compact />}
              </div>
            );
          })}
          <div className="pagination">
            <button
              className="button button-outline"
              disabled={!page}
              onClick={() => setPage((n) => n - 1)}
            >
              Previous
            </button>
            <span>{page + 1}</span>
            <button
              className="button button-outline"
              disabled={(page + 1) * 30 >= local.state.history.length}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
