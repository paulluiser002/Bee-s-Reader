import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
vi.mock('next/navigation', () => ({ usePathname: () => '/discover' }));
import { Shell } from '@/components/shell';
describe('mobile app shell', () => {
  it('offers all four primary destinations and accessible settings', () => {
    render(
      <Shell>
        <h1>Discover</h1>
      </Shell>,
    );
    expect(screen.getByRole('heading', { name: 'Discover' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0);
    for (const name of ['Discover', 'Library', 'History', 'Settings'])
      expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Discover' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
