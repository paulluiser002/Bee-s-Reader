import { DiscoverCatalog } from '@/components/catalog';
export const metadata = { title: 'Discover' };
export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}) {
  const p = await searchParams;
  return (
    <DiscoverCatalog
      initialTag={p.tag}
      initialSort={['popular', 'recent', 'title'].includes(p.sort || '') ? p.sort : 'popular'}
    />
  );
}
