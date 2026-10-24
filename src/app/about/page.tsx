import Link from 'next/link';
export const metadata = { title: 'Sources & privacy' };
export default function About() {
  return (
    <article className="content-prose">
      <div className="page-heading">
        <div>
          <h1>A small space for stories.</h1>
          <p>Private, ad-free, and made for reading.</p>
        </div>
      </div>
      <h2>Made possible by MangaDex</h2>
      <p>
        <a href="https://mangadex.org" target="_blank" rel="noreferrer">
          MangaDex
        </a>{' '}
        supplies title information, chapters, cover artwork, and permitted page images. Bee’s Reader
        is an independent local reader, unaffiliated with MangaDex. Availability varies by title and
        translation language; removed, external, future, and empty chapters are not made readable
        here.
      </p>
      <h2>Credit where it belongs</h2>
      <p>
        Manga and artwork belong to their respective creators and rights holders. Each chapter
        credits its scanlation groups and links to its source on MangaDex. If no group is listed,
        its MangaDex uploader is credited. Group leaders’ removal requests must be honored; the
        local operator can block group IDs with MANGADEX_BLOCKED_GROUPS. Bee’s Reader has no
        advertisements, paywalls, or paid content access.
      </p>
      <h2>A little extra context</h2>
      <p>
        <a href="https://jikan.moe" target="_blank" rel="noreferrer">
          Jikan
        </a>
        , an unofficial read-only API for{' '}
        <a href="https://myanimelist.net" target="_blank" rel="noreferrer">
          MyAnimeList
        </a>
        , can supply supplementary catalog metadata on request. Scores are attributed to their
        source. Jikan is not affiliated with MyAnimeList.
      </p>
      <p>
        The{' '}
        <a href="https://anilist.co" target="_blank" rel="noreferrer">
          AniList
        </a>{' '}
        adapter is disabled by default. AniList restricts competing manga list and tracker services;
        operators must establish that their use is permitted, or obtain permission, before enabling
        it. Supplementary providers never supply reading pages or determine chapter availability.
      </p>
      <h2>Your data stays close</h2>
      <p>
        Bookmarks, per-chapter reading positions, and preferences live in a SQLite database on the
        computer running this app. Theme preference also lives in browser local storage to prevent a
        theme flash. No accounts, analytics, external authentication, or private API keys are used.
      </p>
      <p>
        Requests for the stories you open are sent from the local server to MangaDex. Metadata is
        cached briefly in server memory; chapter images are not persisted by the app. The
        MangaDex@Home network receives required image health reports, including the image URL,
        success, size, cache status, and transfer time. Optional metadata requests contact Jikan
        and, when enabled, AniList. Those services have their own privacy policies.
      </p>
      <h2>Built for local reading</h2>
      <p>
        This MVP binds to localhost and has no public-user authentication. Run it privately on your
        own computer. Your library and history can be managed from{' '}
        <Link href="/settings">Settings</Link>.
      </p>
      <p>
        <a
          href="https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md"
          target="_blank"
          rel="noreferrer"
        >
          MangaDex acceptable usage policy
        </a>{' '}
        ·{' '}
        <a href="https://docs.anilist.co/guide/terms-of-use" target="_blank" rel="noreferrer">
          AniList terms
        </a>{' '}
        ·{' '}
        <a href="https://docs.api.jikan.moe" target="_blank" rel="noreferrer">
          Jikan API documentation
        </a>
      </p>
    </article>
  );
}
