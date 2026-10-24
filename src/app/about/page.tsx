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
        is an independent reader, unaffiliated with MangaDex. Availability varies by title and
        translation language; removed, external, future, and empty chapters are not made readable
        here.
      </p>
      <h2>Credit where it belongs</h2>
      <p>
        Manga and artwork belong to their respective creators and rights holders. Each chapter
        credits its scanlation groups and links to its source on MangaDex. If no group is listed,
        its MangaDex uploader is credited. Group leaders’ removal requests must be honored; the site
        operator can block group IDs with MANGADEX_BLOCKED_GROUPS. Bee’s Reader has no
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
        Bookmarks, per-chapter reading positions, and preferences stay in this browser profile on
        this site. No login or server personal-data database is used. Other browser profiles and
        devices have separate libraries; people sharing one browser profile share its data. Clearing
        site data or using private browsing can remove saved data. Export a private backup from
        Settings to keep or move your library. No analytics, external authentication, or private API
        keys are used.
      </p>
      <p>
        Requests for the stories you open are sent through the server to MangaDex. Metadata is
        cached briefly in server memory and Vercel’s shared public metadata cache; chapter images
        are not persisted by the app. The MangaDex@Home network receives required image health
        reports, including the image URL, success, size, cache status, and transfer time. Optional
        metadata requests contact Jikan and, when enabled, AniList. Those services have their own
        privacy policies.
      </p>
      <h2>A home on your screen</h2>
      <p>
        Install Bee’s Reader from <Link href="/settings">Settings</Link> for an app window where
        supported. Fullscreen reading is available on supported browsers, with focus mode as a
        fallback. Installation caches only an offline help screen and icons; chapter reading
        requires a connection. The hosting service processes page and API requests and may retain
        operational logs under its own policies. Personal library backups are imported locally,
        never uploaded.
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
