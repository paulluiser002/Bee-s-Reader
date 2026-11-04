import { notFound } from 'next/navigation';
import { language, uuid } from '@/lib/schemas';
import { MangaDetail } from '@/components/manga-detail';
export default async function MangaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ language?: string | string[] }>;
}) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const selected = language.safeParse((await searchParams).language);
  return <MangaDetail id={id} initialLanguage={selected.data} />;
}
