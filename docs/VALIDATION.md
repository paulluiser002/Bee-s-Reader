# Validation record

Date: October 24, 2026 (Asia/Manila).

## Vercel transition — current release

The user approved browser-local profiles without login or a server database. This supersedes the original SQLite/local-only architecture. The previous database file is ignored and untouched; it contained no bookmarks/history at migration.

| Check                                | Result                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                           | 55 passed in 12 suites                                                                                                                                 |
| `npm run test:e2e`                   | 32 passed, including 8 light/dark accessibility checks and all routes at 320–1280px                                                                    |
| `npm run test:pwa`                   | Production build and PWA test passed: manifest/icons, offline fallback/icon, cache boundary, persisted profile                                         |
| Typecheck / ESLint / diff whitespace | Passed                                                                                                                                                 |
| `npm audit --omit=dev`               | 0 vulnerabilities                                                                                                                                      |
| Real MangaDex                        | Search/details/feed and first image in both data-saver (98,969 bytes JPEG) and Original (283,217 bytes PNG) passed                                     |
| Production API smoke                 | Real 52-page chapter metadata and first data-saver image returned 200 through `next start`; image is no-store; former personal API returns 404         |
| Real AniList                         | Public metadata probe passed; application integration stays permission-gated                                                                           |
| Real Jikan                           | Connection timed out; optional adapter does not block primary reading                                                                                  |
| Independent review                   | Same-chapter concurrent writes, timing metrics and history-backup import findings fixed and regression tested; no remaining blockers in reviewed scope |

Browser tests use fixture provider responses/artwork but **real browser storage**, checking isolated browser contexts, tab reopening, multi-tab bookmark updates, backup transfer including history/completion/theme, fullscreen and focus-mode fallback. Unit tests reproduce interleaved same-chapter writes and merge collision-preserving writer records; successful completion remains sticky. Streaming tests cover a 6MB page with backpressure, size limits, cancellation, cleanup and full elapsed-time reports. Shared-cache tests cover independent function clients, cooldowns, expiry without renewal on reads, invalidation and fallback on cache outage. No deterministic test is represented as a successful live upstream response. Browser/PWA artifact directories are isolated after parallel runs exposed a trace-file cleanup collision; the complete browser suite and PWA suite passed afterward.

Live requests were rerun after the deployment changes. An initial MangaDex timeout cleared on the diagnostic follow-up; the final probes succeeded. Jikan remains unreachable from this machine and MangaDex@Home health report delivery can time out (logged without delaying pages). Records: `live-integration-results.json` and `vercel-production-smoke.json`.

Mobile light/dark Settings and fullscreen were visually inspected; captures are `screenshots/vercel-*.png` and contain explicit fixture artwork where applicable. The rendered design detector caught existing 10px labels, raised to 11px; the final rendered Settings scan reported no findings. Chapter binaries are neither persisted nor bulk downloaded. PWA cache contains only the static offline page and three icon files, never provider/API responses or reading images.

**Not yet deployed to Vercel.** Actual Vercel network access, Runtime Cache availability, streaming transport and service-worker update lifecycle need a deployed-origin smoke test. Runtime Cache is ephemeral and region-scoped; shared cooldowns plus per-process pacing do not constitute an atomic distributed limiter. Public traffic may need stronger rate control. Profiles are per browser profile/origin; no automatic cross-device sync, shared-browser separation or account recovery. These limits and deployment steps are in README.

## Initial local-only release — historical record

The following entries describe the original implementation before the Vercel transition; SQLite and localhost-only restrictions no longer apply.

## Phase progression

- Phase 0: empty workspace initialized with Next.js/TypeScript/Tailwind, Radix/shadcn button configuration, semantic themes, mobile shell, Prisma/SQLite migrations, formatter/linter and test tooling. Shell test passed; Prisma schema and migration verified.
- Phase 1: server MangaDex adapter, live search/details/feeds/covers and optional AniList/Jikan adapters. Initial 29 unit/component/security tests passed. Live MangaDex and AniList contract probes passed; Jikan timed out and is recorded as unavailable, with independent error handling. AniList production route is permission-gated.
- Phase 2: metadata-driven image authorization, public-IP DNS pinning, redirect refusal, dynamic assignments, reporting, page retry, vertical reader, deterministic chapter selection and quality controls. 34 tests passed at this stage; real MangaDex data-saver JPEG returned HTTP 200 (1075×1301) through the local image route.
- Phase 3: SQLite bookmarks, per-chapter history/resume, preferences, progress and guarded auto-next. Initial 43 tests passed, including real temporary SQLite route tests. An independent code reviewer found stale in-memory history, missing final SPA progress, out-of-order lifecycle writes, out-of-range resume after page removal and an image-slot DNS race; all five were addressed with regression coverage.
- Phase 4: responsive E2E, hydration checks, contrast correction, visual review, production build and local setup documentation. Final results: 47 Vitest tests and 27 Playwright tests passed, including eight light/dark WCAG accessibility scans. Typecheck, ESLint, and production build passed.

## Test boundaries

Vitest provider payloads are representative fixtures. SQLite tests use a real temporary database and real route handlers; upstream chapter lookup is mocked. Playwright mocks same-origin provider/persistence responses for deterministic UI flows; its image-proxy rejection check uses the actual local server. Live integration checks are separate and never silently replaced with mocks.

The live catalog screenshots contain actual MangaDex data. Test-only SVG artwork is used only inside Playwright fixtures.

## Decisions and remaining limits

- AniList adapter is disabled by default because its API terms restrict competing list/tracker services; enable only with permitted use/permission. A single public contract probe succeeded.
- Jikan successful live validation is outstanding because the official host consistently timed out from this network; integration failures do not block primary reading.
- @Home health reports are attempted, but report-server connection failures can occur and are logged.
- Feed size, image size/page count and history display bounds are documented in README. No public deployment, bulk image mirror, or offline reader is provided.
- The light primary shade was darkened to #8C5E0E to provide AA contrast for small links against the supplied paper surfaces; honey button fills retain the requested warmth.

## Final verification

| Check                  | Result                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm test`             | 47 passed across 10 files; includes real temporary SQLite route integration                                   |
| `npm run test:e2e`     | 27 passed; all eight routes checked at 320, 375, 390, 430, 768, 1280px                                        |
| `npm run lint`         | Passed without warnings                                                                                       |
| `npm run typecheck`    | Passed                                                                                                        |
| `npm run build`        | Passed; all application/API routes compiled                                                                   |
| `npm audit --omit=dev` | 0 vulnerabilities                                                                                             |
| Live MangaDex          | Catalog/details/feed and first page in data-saver (98,969 bytes JPEG) and Original (283,217 bytes PNG) passed |
| Live AniList           | Public metadata contract passed; app remains disabled by policy default                                       |
| Live Jikan             | Failed with connection timeout; recorded in live-integration-results.json                                     |
| Production smoke       | Real MangaDex search and SQLite defaults returned correctly from `next start` on localhost                    |
| Design detector        | No findings                                                                                                   |

Visual inspection covered actual MangaDex artwork in mobile light/dark and desktop light/dark. All 18 Home covers loaded in the final capture. Browser runtime errors: zero. A local, unthrottled development-server observation measured CLS 0 and LCP 768ms; this is **not** a Lighthouse score or a production performance guarantee (details in performance-observation.json).

The image handler was additionally verified to return a real page in about 0.89 seconds while health reporting ran after the response, avoiding the report host’s five-second timeout on the reading path. Only individual permitted page probes were used; no bulk chapter image download was performed.
