'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Search,
  SlidersHorizontal,
  Leaf,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Manga } from '@/lib/providers/mangadex';
import { useResource } from '@/lib/client';
import { Button } from './ui/button';
import { PersonalShelves } from './personal-shelves';
import { useLocal } from './local-provider';
export type MangaResults = { data: Manga[]; total: number; limit: number; offset: number };
export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty-state">
      <BookOpen size={32} />
      <h2>{title}</h2>
      <p>{children}</p>
      <Button asChild>
        <Link href="/discover">
          Explore stories
          <ArrowRight size={16} />
        </Link>
      </Button>
    </div>
  );
}
export function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <h2>Couldn’t reach this shelf.</h2>
      <p>{message}</p>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
export function Cover({ manga }: { manga: Manga }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="cover-art">
      {manga.cover && !failed ? (
        <img
          src={manga.cover}
          alt=""
          loading="lazy"
          width={256}
          height={384}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-placeholder">
          <BookOpen size={32} />
          <span>Cover unavailable</span>
        </div>
      )}
      <span className="cover-kind">{manga.kind}</span>
    </div>
  );
}
export function MangaCard({ manga }: { manga: Manga }) {
  return (
    <Link href={`/manga/${manga.id}`} className="manga-card">
      <Cover manga={manga} />
      <h3>{manga.title}</h3>
      <p>
        <span className={`status-dot ${manga.status === 'ongoing' ? 'ongoing' : ''}`} />
        {manga.status.charAt(0).toUpperCase() + manga.status.slice(1)}
        {manga.tags[0] && <span className="card-tag">{manga.tags[0].name}</span>}
      </p>
    </Link>
  );
}
export function MangaGrid({
  data,
  loading,
  error,
  reload,
}: {
  data?: Manga[];
  loading?: boolean;
  error?: string;
  reload: () => void;
}) {
  if (error) return <Failure message={error} retry={reload} />;
  if (loading)
    return (
      <div className="manga-grid" role="status" aria-label="Loading stories">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <div className="skeleton skeleton-cover" />
            <div className="skeleton skeleton-line" />
          </div>
        ))}
      </div>
    );
  if (!data?.length)
    return (
      <div className="empty-state">
        <Search size={30} />
        <h2>No stories found.</h2>
        <p>Try another title, language, or filter. Availability comes from MangaDex.</p>
      </div>
    );
  return (
    <div className="manga-grid">
      {data.map((m) => (
        <MangaCard key={m.id} manga={m} />
      ))}
    </div>
  );
}
const genres = [
  ['All stories', ''],
  ['Adventure', '87cc87cd-a395-47af-b27a-93258283bbc6'],
  ['Fantasy', 'cdc58593-87dd-415e-bbc0-2ec27bf404cc'],
  ['Romance', '423e2eae-a7a2-4a8b-ac03-a8351462d71d'],
  ['Slice of life', 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9'],
  ['Action', '391b0423-d847-456f-aff0-8b0cfc03066b'],
];
export function HomeCatalog() {
  const { state } = useLocal();
  const popular = useResource<MangaResults>(
    `/api/manga?sort=popular&limit=6&language=${state.preferences.language}`,
  );
  const recent = useResource<MangaResults>(
    `/api/manga?sort=recent&limit=12&language=${state.preferences.language}`,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Make room for a good story.</h1>
          <p>Your next little obsession is just a chapter away.</p>
        </div>
        <Link href="/discover" className="icon-button desktop-search" aria-label="Search stories">
          <Search size={23} />
        </Link>
      </div>
      <section className="welcome-panel">
        <div>
          <h2>
            A world to get lost in.
            <br />A nook to call your own.
          </h2>
          <p>
            Manga, manhwa, and manhua.
            <br />
            Just you and the next chapter.
          </p>
          <Button asChild>
            <Link href="/discover">
              Find your next read
              <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="welcome-symbol" aria-hidden="true">
          <BookOpen />
          <span className="symbol-spark">
            <Sparkles />
          </span>
        </div>
      </section>
      <div className="chips home-chips">
        {genres.map(([name, id]) => (
          <Link className="chip" key={name} href={`/discover${id ? '?tag=' + id : ''}`}>
            {name === 'All stories' && <Leaf size={15} />} {name}
          </Link>
        ))}
      </div>
      <PersonalShelves />
      <div className="section-heading">
        <h2>Reader favorites</h2>
        <Link href="/discover?sort=popular">
          Browse all
          <ArrowRight size={16} />
        </Link>
      </div>
      <MangaGrid {...popular} data={popular.data?.data} />
      <div className="section-heading">
        <h2>Fresh off the press</h2>
        <Link href="/discover?sort=recent">
          See updates
          <ArrowRight size={16} />
        </Link>
      </div>
      <MangaGrid {...recent} data={recent.data?.data} />
      <p className="catalog-credit">
        Catalog & chapters from{' '}
        <a href="https://mangadex.org" target="_blank" rel="noreferrer">
          MangaDex
          <ArrowRight size={12} />
        </a>
        . Availability varies by language and title.
      </p>
    </>
  );
}
export function DiscoverCatalog({
  initialTag = '',
  initialSort = 'popular',
}: {
  initialTag?: string;
  initialSort?: string;
}) {
  const { state } = useLocal();
  const [title, setTitle] = useState('');
  const [debounced, setDebounced] = useState('');
  const [origin, setOrigin] = useState('all');
  const [status, setStatus] = useState('all');
  const [languageOverride, setLanguage] = useState<string | null>(null);
  const language = languageOverride || state.preferences.language;
  const [sort, setSort] = useState(initialSort);
  const [tag, setTag] = useState(initialTag);
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(title), 350);
    return () => clearTimeout(timer);
  }, [title]);
  const query = new URLSearchParams({
    title: debounced,
    origin,
    status,
    language,
    sort,
    offset: String(offset),
    limit: '18',
    ...(tag ? { tag } : {}),
  });
  const result = useResource<MangaResults>(`/api/manga?${query}`);
  function update(setter: (s: string) => void, value: string) {
    setter(value);
    setOffset(0);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Find your next favorite.</h1>
          <p>A whole world of stories, at your fingertips.</p>
        </div>
      </div>
      <form className="search-row" onSubmit={(e) => e.preventDefault()}>
        <label className="search-field">
          <Search size={20} />
          <input
            type="search"
            aria-label="Search titles"
            placeholder="Search for a story…"
            value={title}
            onChange={(e) => update(setTitle, e.target.value)}
          />
        </label>
        <Button
          type="button"
          aria-label="Filters"
          variant="outline"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={18} />
          <span>Filters</span>
        </Button>
      </form>
      <div className="chips">
        {[
          ['all', 'All stories'],
          ['manga', 'Manga'],
          ['manhwa', 'Manhwa'],
          ['manhua', 'Manhua'],
        ].map(([value, label]) => (
          <button
            className={`chip ${origin === value ? 'active' : ''}`}
            key={value}
            onClick={() => update(setOrigin, value)}
            aria-pressed={origin === value}
          >
            {label}
          </button>
        ))}
      </div>
      {showFilters && (
        <div className="filter-panel">
          <label>
            Language
            <select
              aria-label="Reading language"
              value={language}
              onChange={(e) => update(setLanguage, e.target.value)}
            >
              {[
                ['en', 'English'],
                ['es', 'Spanish'],
                ['es-la', 'Spanish (LATAM)'],
                ['fr', 'French'],
                ['pt-br', 'Portuguese (BR)'],
                ['id', 'Indonesian'],
                ['ja', 'Japanese'],
                ['ko', 'Korean'],
                ['zh', 'Chinese'],
                ['de', 'German'],
              ].map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => update(setStatus, e.target.value)}>
              {['all', 'ongoing', 'completed', 'hiatus', 'cancelled'].map((v) => (
                <option key={v} value={v}>
                  {v === 'all' ? 'Any status' : v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Genre
            <select value={tag} onChange={(e) => update(setTag, e.target.value)}>
              {genres.map(([name, id]) => (
                <option value={id} key={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="results-heading">
        <span className="muted small" aria-live="polite">
          {result.loading
            ? 'Looking for stories…'
            : result.data
              ? `${result.data.total.toLocaleString()} stories on MangaDex`
              : 'MangaDex catalog'}
        </span>
        <label className="sort-label">
          Sort
          <select
            aria-label="Sort stories"
            value={sort}
            onChange={(e) => update(setSort, e.target.value)}
          >
            <option value="popular">Popular</option>
            <option value="recent">Recently updated</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>
      <MangaGrid
        data={result.data?.data}
        loading={result.loading}
        error={result.error}
        reload={result.reload}
      />
      {result.data && result.data.total > 18 && (
        <div className="pagination">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => {
              setOffset((n) => Math.max(0, n - 18));
              window.scrollTo(0, 0);
            }}
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          <span className="small">Page {Math.floor(offset / 18) + 1}</span>
          <Button
            variant="outline"
            disabled={offset + 18 >= Math.min(result.data.total, 10000)}
            onClick={() => {
              setOffset((n) => n + 18);
              window.scrollTo(0, 0);
            }}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
      <p className="catalog-credit">
        Reading availability and origin labels reflect MangaDex metadata.
      </p>
    </>
  );
}
