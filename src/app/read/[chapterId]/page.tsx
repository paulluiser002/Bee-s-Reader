import { notFound } from 'next/navigation';
import { uuid } from '@/lib/schemas';
import { Reader } from '@/components/reader';
export default async function Read({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  if (!uuid.safeParse(chapterId).success) notFound();
  return <Reader id={chapterId} />;
}
