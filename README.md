# Bee’s Reader

A private, ad-free, mobile-first manga, manhwa, and manhua reader. Next.js App Router, TypeScript, Tailwind, shadcn-style Radix buttons, Lucide, next-themes, and browser-local profiles.

## Local setup

Requires **Node.js 22.x (22.17 or later)** and npm. No paid services, accounts, or API keys are needed.

```sh
cd "/Users/paulluiser/Documents/Bee's Reader"
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Local scripts bind to loopback. No database, migrations, login, or API keys are required. Copy `.env.example` to `.env` only if changing optional provider settings.

For a production build on your computer:

```sh
npm run build
npm start
```

## Deploy to Vercel

1. Import [Bee-s-Reader](https://github.com/paulluiser002/Bee-s-Reader) into Vercel and use the **Next.js** preset with the repository root as the project root.
2. Use **Node.js 22.x**, install command `npm ci`, build command `npm run build`, and the default Next.js output setting. No database or auth integration is needed.
3. Leave environment variables unset unless using the optional settings below. Keep AniList disabled unless its terms permit your use.
4. Deploy over HTTPS. `vercel.json` selects the Singapore (`sin1`) function region. Vercel handles the server; the local `npm start` hostname does not restrict deployment.
5. After deployment, check Discover search, a permitted title/chapter, data-saver images and retry, fullscreen, profile persistence after closing/reopening, Settings export/import, and PWA installation. Test once from the deployed origin: successful local tests cannot prove provider access from Vercel's network.

Public metadata and provider cooldowns use [Vercel Runtime Cache](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#getcache), with no service credentials or personal-data database to maintain. The cache is ephemeral, shared within a region and scoped to the project/environment. Local pacing plus shared cooldowns are **best effort**, not an atomic global rate limiter across scaled function instances. Upstream 429 responses are surfaced; sustained public traffic may need a dedicated distributed limiter. Keep one region and inspect Vercel usage/logs if traffic grows. Streaming page/cover responses use Vercel's [streaming function support](https://vercel.com/docs/functions/streaming-functions); image proxy bandwidth and function usage still count toward hosting limits.

Every browser profile and site origin owns a separate local library. Changing from localhost to Vercel, between preview deployments, or to a custom domain does not move data automatically: export from the old site and import on the new one. People using the same browser profile on the same site share its data. There is no cross-device sync or account recovery; clearing site data, private browsing expiry, or browser storage eviction can remove saved data. Keep private JSON backups using Settings.

### Installation and fullscreen

Settings offers **Install Bee’s Reader** with browser-specific instructions when a native prompt is unavailable. The manifest supports an app window and Home Screen shortcut. On iPhone/iPad use Safari's Share → Add to Home Screen (and Open as Web App when offered). Fullscreen in the reader uses the native Fullscreen API where supported; otherwise it offers focus mode and installation guidance. Browser/platform rules determine whether browser chrome can be hidden.

The service worker is enabled in production only. It caches a static offline help screen and icons; it does not cache API responses, catalogs, chapter images, or an offline reading library. Updates activate after old app windows close, without forcing a reload during reading. An installed PWA normally uses its browser's origin storage; platform-specific isolated containers can require an import.

### Environment

| Variable                   | Default | Purpose                                                                                                             |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `MANGADEX_BLOCKED_GROUPS`  | empty   | Comma-separated MangaDex scanlation-group UUIDs whose removal requests must be honored. Restart after changing.     |
| `ANILIST_METADATA_ENABLED` | `false` | Enable only after establishing permitted use or obtaining AniList permission under its API terms. Server-side only. |

Do not put private keys in `NEXT_PUBLIC_*` variables. None of these integrations requires a private key. `.env`, old SQLite files, and named profile backups are ignored by Git.

## What works

- Home with real popular/recent MangaDex catalog data and personal continue-reading/saved shelves.
- Debounced Discover search; language, publication status, origin, genre and sort filters; pagination and real loading/empty/error states.
- Title details, covers, creators, tags, source links, credited chapter feeds, bookmarks, and resume links.
- Continuous vertical reading, data-saver by default, Original quality switch, page width controls, per-image retry, chapter selector, previous/next, and keyboard navigation.
- Local bookmarks, per-chapter history, latest-per-title resume, persisted preferences, and confirmed history clearing.
- Light, Dark, and System modes with a pre-paint theme script, semantic honey/ivory/charcoal tokens, reduced motion, safe areas, bottom navigation, and 320px layouts.
- Optional supplementary metadata, matched **only by provider IDs linked by MangaDex**, with independent source attribution/errors. No speculative title matching or fabricated availability.

### Reader controls and progress

Tap a page or scroll upward to reveal controls. Use Left/Right arrows for previous/next chapters and Escape to reveal the toolbar/close appearance controls. Normal browser Page Down, Space and arrow scrolling work.

Default preferences: English, long-strip mode, 100% reader-column width, data-saver, auto-next enabled. The column is capped at 1000px on desktop; image width is 100% of that column. Page images use `display:block; width:100%; height:auto` with no crop or gaps. Only the initial/resume neighborhood and pages approaching the viewport receive image URLs.

Progress is unique by **provider + chapter ID**. `pageIndex` is zero-based; `scrollFraction` is the offset **within that page**, from 0 to 1. History retains individual chapter rows; the most recently updated row for a manga is its resume point. Completion remains true once achieved, even when rereading. Scroll writes are throttled to 1.5 seconds and also saved on navigation, visibility changes, and page lifecycle events. Each open profile writer has its own chapter slot; merged records select the newest client timestamp and retain completion across tabs. Synchronous lifecycle saves survive page teardown. Writer records stay until history is cleared; quota errors are surfaced. Earlier pages before a saved resume point are treated as previously read; unfetched pages are never bulk downloaded to restore a position.

Auto-next requires loaded pages (or previously read pages before the resume point), finished restoration, an intentional downward input/scroll, and an end-of-stream intersection. A four-second transition offers **Cancel auto-next**, which disables the preference. It only targets a confirmed readable chapter in the same title/translation language and prevents revisiting chapters in the current tab’s automatic path. The selector remains available for deliberate rereading. Numbered duplicate releases prefer the current scanlation group; volume resets and unnumbered extras are handled deterministically.

## Integrations and policies

**MangaDex is the primary source.** All catalog, chapter, cover and page requests go through server-side API routes. Public APIs supply metadata; MangaDex@Home supplies authorized page assignments. Browser requests never contain arbitrary upstream URLs. The app does not add advertisements, sell access, store chapter image binaries, mirror entire catalogs, or bypass external/removed/unpublished chapters.

**Jikan** is the unofficial read-only MyAnimeList metadata API. Its title, score, genre and publication details are optional; failure never prevents reading. Jikan is not affiliated with MyAnimeList.

**AniList’s adapter is implemented but disabled in the app by default.** Its [terms prohibit competing, non-complementary list/tracker services](https://docs.anilist.co/guide/terms-of-use). Because Bee’s Reader contains local bookmarks/history, operator permission must be established before enabling this integration. A single live public metadata contract probe was tested; no AniList account/list synchronization or bulk ingestion is implemented.

MangaDex and scanlation-group source links are visible on title/reader screens. Honor a group leader’s written removal request by adding its UUID to `MANGADEX_BLOCKED_GROUPS` and restarting. The filter applies to feed, chapter metadata, and image authorization. Users should address copyright/removal concerns through the site operator and MangaDex’s source channels.

### Server protections

- Zod validates request inputs and upstream payloads. Metadata providers live behind `server-only` imports.
- Per-process request pacing: MangaDex metadata 300ms; MangaDex@Home 1600ms (below its 40/minute limit); AniList 2100ms (below its currently degraded 30/minute limit); Jikan 1100ms (below 60/minute). Provider 429 cooldowns honor numeric/date `Retry-After` and reset headers. Requests are not automatically hammered or retried in a loop.
- Deduplicated in-flight requests; Vercel shared public metadata cache and bounded in-process caches: 256 entries per client, 30s catalog / 15s chapter feeds / 60s image assignments / 5min supplementary metadata. Cover filenames are reused from expanded catalog responses to avoid one API lookup per cover.
- The page route accepts only a chapter UUID, zero-based page number, quality and bounded retry counter. It obtains filenames and server assignments from validated MangaDex metadata. It rejects arbitrary URL/host parameters and path traversal.
- MangaDex documents **dynamic arbitrary @Home hosts**, not a permanent CDN hostname allowlist. Images require HTTPS, no credentials/query/fragment, public DNS answers, and a connection pinned to a validated public IP. Loopback/private/link-local/reserved addresses and redirects are rejected. TLS hostname verification remains enabled. A bounded six-slot image queue reserves slots before DNS; each image is limited to 25MB. Backpressure and cancellation keep the full image out of function memory; transfer reports run when streaming finishes.
- Expired 403 assignments are resolved once more through MangaDex. @Home image success/failure health reports include actual byte count and full retrieval duration; reports run after image responses so a slow report server does not delay reading. Reporting failures are logged, with no image-report retry storm.
- Personal data is written only to browser storage; there are no server bookmark/history/preferences mutation routes. Backup files are validated before merging, limited to 2MB, and never uploaded. Security headers block framing and restrict browser images/connections to this origin.

Official references checked during implementation: [MangaDex usage policy](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md), [request limits](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/2-limitations.md), [image retrieval/reporting](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/04-chapter/retrieving-chapter.md), [AniList limits](https://docs.anilist.co/guide/rate-limiting), and [Jikan documentation](https://docs.api.jikan.moe/).

## Tests and validation

```sh
npm test
npm run typecheck
npm run lint
npx playwright install chromium
npm run test:e2e
npm run test:pwa
npm run test:live
```

Playwright starts the local dev server if necessary. Provider responses and page artwork are explicit fixtures for deterministic UI tests, while browser profiles use real localStorage. Tests cover separate browser contexts, reopening tabs, multi-tab changes, export/import, native fullscreen, unsupported fullscreen fallback, reader progress and accessibility. `test:pwa` builds and runs a separate production server on port 3001 to test manifest/icons, service-worker cache boundaries, offline navigation, and saved profile retention. Vitest covers validation, storage errors/stale writes, public-IP pinning/SSRF guards, streaming/cancellation including a 6MB response, provider cache/cooldowns and sequencing.

`npm run test:live` makes real network requests and writes a concise status record to `docs/live-integration-results.json`. It resolves a real readable MangaDex chapter, verifies its ordered image metadata, fetches only its first page in data-saver and Original quality, discards the binaries, and probes one public AniList/Jikan metadata record each. It exits nonzero if any provider is unavailable; this is intentional, separate from deterministic tests. Do not run it repeatedly as a monitor.

**Known live limitation, October 24, 2026:** MangaDex metadata and authorized page images and the AniList metadata probe responded successfully. `api.jikan.moe:443` repeatedly timed out from this network (Node, curl, and independent web fetch). Its adapter has schema/error/rate-limit coverage, but successful live Jikan response validation remains pending upstream/network availability. MangaDex@Home health-report delivery may also time out; failures are logged.

See `docs/VALIDATION.md` for the final test results and `docs/screenshots/` for local visual captures. Source requirements are preserved in `docs/SPECIFICATION.md`.

## Data, limits and troubleshooting

- Back up and transfer your profile from Settings. Import merges bookmarks/history, keeps newer chapter positions and applies imported preferences. A storage failure is reported; a valid import that runs out of storage can partially merge, so retain the backup and free space before retrying. Settings can clear only history while retaining the library/preferences.
- Previous local installations: Prisma and the server database are no longer used. The old ignored `prisma/dev.db` is left untouched. This workspace's database contained no bookmarks/history at transition; it is not automatically uploaded or migrated.
- No offline reading or image downloads. Saved positions remain in browser storage; failed saves appear in the reader. The PWA offline screen explains that a connection is required.
- MangaDex collections have a 10,000-item cap. The reader paginates chapter metadata up to that limit and displays a notice if truncated; it does not claim unsupported coverage. Images are capped at 2000 pages/chapter and 25MB/page for bounded transfers. History displays the latest 1000 chapter records.
- Upstream metadata does not include image dimensions. Unloaded pages reserve placeholders; loaded pages use their actual intrinsic proportions. Initial layout shifts cannot trigger auto-next.
- A 429 response asks you to wait; **Try again** does not bypass the provider cooldown. External, future, empty, and removed chapters intentionally remain unavailable.
- A missing supplementary provider ID is shown explicitly. Optional scores/counts describe source catalogs, not the chapters readable here.
- Font: self-hosted Nunito Sans, with its license in `public/fonts/OFL.txt`.
