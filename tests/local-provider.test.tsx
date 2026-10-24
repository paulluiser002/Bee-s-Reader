import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { LocalProvider, useLocal } from '@/components/local-provider';

it('updates current history immediately after a saved progress response', async () => {
  localStorage.clear();
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  function Consumer() {
    const local = useLocal();
    return (
      <>
        <span>{local.ready ? 'Ready' : 'Loading'}</span>
        <button
          onClick={() =>
            local.saveProgress({
              mangaId: '00000000-0000-4000-8000-000000000001',
              chapterId: '00000000-0000-4000-8000-000000000002',
              pageIndex: 3,
              scrollFraction: 0.5,
              completed: false,
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
  expect(fetcher).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
