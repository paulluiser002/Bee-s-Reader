'use client';
import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useLocal } from './local-provider';
import { Button } from './ui/button';
export function BookmarkButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const local = useLocal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saved = local.state.bookmarks.some((b) => b.mangaId === id);
  return (
    <>
      <Button
        variant="outline"
        size={compact ? 'icon' : 'default'}
        disabled={!local.ready || busy}
        aria-label={saved ? 'Remove from library' : 'Save to library'}
        aria-pressed={saved}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await local.bookmark(id, !saved);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save bookmark.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{' '}
        {!compact && (saved ? 'Saved' : 'Save')}
      </Button>
      {error && (
        <span role="alert" className="small">
          {error}
        </span>
      )}
    </>
  );
}
