import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { LocalProvider, useLocal } from '@/components/local-provider';
import { defaults } from '@/lib/schemas';
it('updates current history immediately after a saved progress response', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json({ preferences: defaults, bookmarks: [], history: [] }),
  );
  function Consumer() {
    const local = useLocal();
    return (
      <>
        <span>{local.ready ? 'Ready' : 'Loading'}</span>
        <button
          onClick={() =>
            local.recordProgress({
              mangaId: 'm',
              chapterId: 'c',
              pageIndex: 3,
              scrollFraction: 0.5,
              completed: false,
              updatedAt: '2026-01-01',
            })
          }
        >
          Record progress
        </button>
        <span>History: {local.state.history.length}</span>
      </>
    );
  }
  render(
    <LocalProvider>
      <Consumer />
    </LocalProvider>,
  );
  await screen.findByText('Ready');
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('History: 1')).toBeVisible();
  vi.unstubAllGlobals();
});
