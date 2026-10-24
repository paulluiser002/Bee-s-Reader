import { notFound } from 'next/navigation';
import { uuid } from '@/lib/schemas';
import { MangaDetail } from '@/components/manga-detail';
export default async function MangaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  return <MangaDetail id={id} />;
}
