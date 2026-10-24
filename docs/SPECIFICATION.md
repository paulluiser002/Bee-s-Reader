# Bee's Reader — Codex Implementation Plan

## Objective

Build a **private, ad-free, mobile-first** website for reading manga, manhwa, and manhua, with **MangaDex** as the first supported content provider. This is a working application, not a static mockup. Maintain a legitimate, terms-compliant content integration.

## Product defaults

- Site name: **Bee's Reader**
- Design: warm honey accent; polished rounded cards; compact mobile-first visual hierarchy
- Themes: Light, Dark, and System; persist preference, prevent hydration flash
- Default reading mode: **long-strip / continuous vertical scrolling**
- Default page width: **100% of reader content column** (fit to screen; preserve aspect ratio)
- Default image quality: **data-saver**
- Default auto-next chapter: **enabled**, but avoid unrequested bulk chapter downloads; allow users to disable, show clear transition and prevent loops
- Reading language: English default; user-configurable
- Content types: manga, manhwa, manhua, filtered where MangaDex metadata supports it
- Ads/paywalls: none
- User access: local/private single-user MVP; do not expose development service publicly without authentication

## Technical stack

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui, Lucide icons, next-themes
- Prisma + SQLite for single-user local persistence
- Vitest + React Testing Library for unit/component tests; Playwright for responsive E2E
- Zod for validating incoming query parameters and upstream payload shapes
- No extra paid dependencies or services required for local MVP

## App structure and routes

- `/` Home: continue reading, recently updated manga, saved titles, quick genre/category chips
- `/discover` Search and browse: title search, debounced queries, language, status, origin and tags where supported; loading/error/empty states
- `/manga/[id]` Details: cover, description, tags, creators, available chapter feed, scanlation groups, bookmark, continue reading
- `/read/[chapterId]` Reading interface: full-width vertical image stream, loading, scroll progress, chapter selector, previous/next, auto-next
- `/library` Bookmarked/favorite titles; filters, sorted by recently read or bookmarked
- `/history` Recently read chapters with resume position
- `/settings` Theme (light/dark/system), reading mode, page width, quality, auto-next, language, clear-history confirmation
- `/about` MangaDex attribution, scanlation credits policy, source disclosure, user-facing data/privacy notes

## Mobile-first UX (priority)

- Design for 320–430px viewports FIRST, expand to tablet and desktop afterward
- Bottom navigation: Home, Discover, Library, History; Settings from profile/toolbar
- At least 44x44 CSS-pixel tap targets where practical; thumb-friendly placement
- Reader: edge-to-edge images where feasible; hide nonessential chrome while scrolling down and show on scroll up or tap; respect safe-area insets
- Never cause horizontal overflow at 320px; avoid layout shift with known image ratios/placeholders
- Reader must preserve exact image aspect ratio, no cropping or distortion, no gaps in long-strip mode by default
- Touch gestures only where helpful; page-by-page/RTL are optional future alternatives, not prerequisites for MVP
- Keyboard controls and screen reader labels must be available on desktop too
- Smooth chapter-to-chapter continuation without inadvertently skipping or repeating chapters

## Visual design tokens

- Brand: Bee's Reader; honey yellow/gold accent, not excessive saturation
- Light surfaces: warm ivory (#FFFDF7), paper cards (#F5EFE2), deep warm text (#30291E), accent (#B27B18)
- Dark surfaces: charcoal (#111318), elevated cards (#22252A), primary text (#F7F4ED), accent (#F8D76D)
- Ensure WCAG AA text contrast by adjusting token shades if needed (especially smaller yellow text on light backgrounds)
- Semantically named tokens (`background`, `foreground`, `card`, `muted`, `primary`, `border`); do not hardcode colors across components
- Use reduced-motion preferences, accessible focus indicators, skeleton states, and tasteful transitions

## MangaDex API integration

Official docs: https://api.mangadex.org/docs/
Official usage policy: https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md
Base: https://api.mangadex.org

Read-only flows:

1. Search/list manga: `GET /manga` with filters, pagination, and includes such as `cover_art` as appropriate.
2. Details: `GET /manga/{id}`.
3. Chapters: `GET /manga/{id}/feed`; filter selected translation languages, paginate entire feed if needed, exclude unavailable/unreadable chapter types.
4. Chapter metadata: `GET /chapter/{id}`.
5. Chapter pages: `GET /at-home/server/{chapterId}` -> `baseUrl`, `chapter.hash`, `chapter.dataSaver` and `chapter.data`.
6. For data-saver, derive authorized upstream paths as `{baseUrl}/data-saver/{hash}/{filename}` based on returned metadata, without persisting or exposing arbitrary user-supplied URLs.

**Important constraints**:

- Browser requests to MangaDex lack cross-origin support; implement a **server-side API adapter** and same-origin image serving route after reviewing current official documentation.
- MangaDex image servers may vary and signed URL lifetimes can be short. Resolve dynamically, refresh expired server assignments, and do not hardcode CDN domains.
- Secure any image-serving endpoint against SSRF: accept ONLY a validated known chapter ID and page index / quality; construct upstream URLs solely from freshly obtained, validated MangaDex metadata. Reject arbitrary URLs, arbitrary hostnames, redirects to disallowed destinations, and path traversal. Verify allowed upstream image hosts per current official specification; do not create an open proxy.
- Honor rate limits and Retry-After/429, apply conservative bounded short-lived metadata caching and request deduplication. Do not bulk mirror chapters or bypass access restrictions.
- Observe current image server reporting/health requirements if applicable.
- Attribute MangaDex and each chapter's scanlation group conspicuously. Honor removal requests, avoid ads and paid services, follow MangaDex acceptable use policy and applicable copyright requirements.
- Be transparent when titles/chapters are unavailable: do not fabricate chapters or links.

## Database model (suggested)

- `Bookmark`: id, provider (`mangadex`), mangaId (unique with provider), createdAt, updatedAt
- `ReadingProgress`: id, provider, mangaId, chapterId, pageIndex, scrollFraction (0–1), completed, updatedAt; define uniqueness and resumption semantics explicitly
- `ReaderPreference`: one singleton profile: theme (`system|light|dark`), language, mode (`long`), pageWidthPercent default 100, quality (`data-saver|original`), autoNext true
- `RecentlyViewed` (optional): mangaId, lastViewedAt
- Persist no image binary data by default; store only IDs, preferences, and progress

## Reader behavior

- Render ordered pages in a vertical column using CSS `display:block; width:100%; height:auto;` to eliminate whitespace between strips, with no object-fit crop.
- Lazy-load offscreen images and preload a limited number of upcoming images via IntersectionObserver; avoid loading entire long chapters in parallel.
- Provide graceful per-image retry, clear failure message, and next-page recovery behavior.
- Save reading progress via throttled writes while scrolling, on navigation, and on page lifecycle visibility change. Restore near last visible page/offset after layout stabilizes.
- Compute progress from reader image stream and set completion on reaching the end; never mark a chapter complete merely because a page fetch fails.
- On chapter end, if auto-next enabled and a legitimate next readable chapter exists for the same manga and chosen translation language, show a transition bar/count-free prompt, then move to the next chapter automatically on intentional end-of-content intersection (avoid accidental advance from initial layout shifts). Always provide cancel/disable control.
- Chapter ordering: use API chapter number plus volume/publish metadata; handle missing numbers, duplicate numbers from different scanlation groups, and special chapters. Keep a stable deterministic sequence and prefer same language and scanlation group when available.
- Reader toolbar: back, manga title, chapter select, appearance/settings, bookmark, progress indicator; reachable on mobile.

## Implementation milestones

### Phase 0 — Repository / foundations

- Initialize Next.js TS project, formatter/linter, shadcn/ui, tests, Prisma+SQLite, `.env.example`.
- Implement responsive shell, semantic theme tokens and persistent Light/Dark/System.
- Deliver: page skeletons and navigation at 320px, 375px, 430px, tablet and desktop widths.

### Phase 1 — Manga browsing

- Create typed MangaDex API adapter on the server, HTTP error handling, filtering and pagination.
- Build Home, Discover, and Manga detail views with responsive cover cards.
- Deliver: search results and actual MangaDex title metadata visible via local dev server.

### Phase 2 — Vertical chapter reader

- Chapter-list selection, actual image metadata, secured same-origin image streaming.
- Continuous vertical reader with 100% width, no image distortion/gaps, data-saver default, progress bar.
- Deliver: complete permitted chapter can be read top to bottom on a phone screen.

### Phase 3 — Persistence / smart reading

- Bookmarks, history, resume position, preferences, auto-next chapter with safety checks.
- Deliver: refresh/browser reopen retains settings and bookmark/progress state.

### Phase 4 — Polish / QA

- Dark/light contrast, safe areas, loading states, offline/unavailable states, image retry, API throttling.
- Add test coverage and manual mobile usability review, performance audit, documentation.
- Deliver: release-ready _local_ MVP with setup instructions.

## Minimum tests and acceptance criteria

1. Layout works at 320, 375, 390, 430, 768 and 1280px without horizontal scrolling or obstructed controls.
2. Theme options Light, Dark and System work and persist after refresh; no wrong-theme flash on load.
3. Search returns real manga results through the server adapter and handles error, no-result, and loading states.
4. Manga/manhwa/manhua titles can be browsed when present in upstream catalog; no false claim of universal coverage.
5. Supported chapter renders image pages in upstream order at 100% reader-column width, with preserved proportions and continuous scroll.
6. Data-saver is default, with working Original quality switch.
7. Auto-next only advances to a confirmed readable next chapter, in the selected language, without looping or skipping.
8. Bookmarks and chapter progress survive reload and app restart.
9. Unauthorized external URL supplied to image route is rejected; no arbitrary proxy or SSRF exposure.
10. Relevant credits are visible; no advertisements, monetization, or prohibited bulk scraping.
11. Keyboard navigation, focus states, accessible labels and reduced-motion options are functional.
12. Vitest unit tests plus Playwright mobile E2E suite pass; document any API-dependent tests that are intentionally mocked.

## Suggested folder layout

```
src/
  app/
    (site)/page.tsx
    (site)/discover/page.tsx
    (site)/manga/[id]/page.tsx
    (site)/read/[chapterId]/page.tsx
    (site)/library/page.tsx
    (site)/history/page.tsx
    (site)/settings/page.tsx
    api/manga/...      # validated same-origin server routes
    api/reader/...     # validated chapter image endpoint
  components/
    app-shell/
    manga/
    reader/
    settings/
    ui/
  lib/
    mangadex/
    database/
    preferences/
    utils/
prisma/
  schema.prisma
/tests/
  e2e/
```

## Working instructions to Codex

- Implement milestones **sequentially**, completing working code and tests at each phase rather than only producing a plan or mock UI.
- Start with a mobile-first responsive shell and real API adapter; don't spend time building unnecessary abstractions.
- Check current MangaDex documentation before coding anything source-specific.
- Use actual API data when available and meaningful local fixtures in tests. Never invent real manga availability.
- Keep all keys and any future authentication secrets server-side; private local MVP has no external account integration by default.
- Do not claim hosting or public deployment; prepare local `README.md` with exact setup commands and environment variables.
- After every phase, state what changed, what works, test results, and outstanding limitations, then proceed to the next phase.
- If API policies or technical constraints block a feature, implement a compliant alternative and document it.

## Initial Codex task prompt

"Implement Phase 0 and Phase 1 of `BEE_S_READER_CODEX_PLAN.md` for Bee's Reader. Prioritize 320–430px mobile view, light/dark/system themes and accessible bottom navigation. Integrate MangaDex via safe Next.js server routes for live search, discover, and manga details. Use Prisma+SQLite setup and real empty/loading/error states. Run tests, check responsive layouts, and report how to start the site locally. Then follow the remaining phases in order, preserving all default reader preferences and provider compliance requirements."
