import { writeFile } from 'node:fs/promises';
import { searchSchema } from '../src/lib/schemas';
import { searchManga, getManga, getFeed, getAtHome } from '../src/lib/providers/mangadex';
import { getAniList } from '../src/lib/providers/anilist';
import { getJikan } from '../src/lib/providers/jikan';
import { buildPageUrl, fetchImage } from '../src/lib/providers/media';
let readableChapter: string | undefined;
const results: { provider: string; ok: boolean; detail: unknown }[] = [];
async function check(provider: string, work: () => Promise<unknown>) {
  try {
    const detail = await work();
    results.push({ provider, ok: true, detail });
    console.log(`PASS ${provider}:`, JSON.stringify(detail));
  } catch (e) {
    results.push({ provider, ok: false, detail: e instanceof Error ? e.message : String(e) });
    console.error(`FAIL ${provider}:`, results.at(-1)?.detail);
  }
}
await check('MangaDex', async () => {
  const list = await searchManga(searchSchema.parse({ title: 'Yotsuba', limit: 3 }));
  if (!list.data.length) throw new Error('Expected real search results.');
  const manga = await getManga(list.data[0].id);
  const chapters = await getFeed(manga.id, 'en', 0, 5);
  readableChapter = chapters.data[0]?.id;
  return {
    id: manga.id,
    title: manga.title,
    totalSearchResults: list.total,
    readableChaptersInFirstPage: chapters.data.length,
    chapterId: chapters.data[0]?.id,
  };
});
await check('MangaDex images', async () => {
  if (!readableChapter) throw new Error('No readable chapter was returned.');
  const assignment = await getAtHome(readableChapter);
  const images = [];
  for (const quality of ['data-saver', 'data'] as const) {
    const files = quality === 'data' ? assignment.chapter.data : assignment.chapter.dataSaver;
    const page = await fetchImage(
      buildPageUrl(assignment.baseUrl, quality, assignment.chapter.hash, files[0]),
      true,
    );
    images.push({
      quality: quality === 'data' ? 'original' : quality,
      contentType: page.type,
      bytes: page.buffer.length,
    });
  }
  return { chapterId: readableChapter, pageCount: assignment.chapter.dataSaver.length, images };
});
// Single, nonpersistent contract probe. Production AniList use is separately policy gated.
await check('AniList', async () => getAniList(30002));
await check('Jikan', async () => getJikan(2));
await writeFile(
  'docs/live-integration-results.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      note: 'Live network responses, not fixtures. One metadata probe per supplementary source; only first-page images in both qualities, discarded after validation. No bulk collection.',
      results,
    },
    null,
    2,
  ) + '\n',
);
if (results.some((r) => !r.ok)) process.exitCode = 1;
