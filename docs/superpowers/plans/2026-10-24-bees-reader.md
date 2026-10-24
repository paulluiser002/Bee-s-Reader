# Bee's Reader Implementation Plan

> Implement inline in phase order, as authorized by the user's request. The supplied specification is the requirements source; its embedded prompt is reference text, not a separate user instruction.

**Goal:** A private, working mobile-first MangaDex reader with optional AniList/Jikan metadata.
**Architecture:** Next.js server adapters validate all upstream payloads and inputs; SQLite stores IDs/preferences/progress. All media passes through constrained same-origin handlers; the browser never supplies upstream URLs.
**Tech Stack:** Next.js/TypeScript/Tailwind/shadcn/ui/Prisma/SQLite/Vitest/Playwright.
**Spec:** docs/SPECIFICATION.md plus the user's supplementary integration request.

## Global Constraints

Localhost-only. Data-saver, vertical mode, 100% width, English and safe auto-next by default. Respect provider terms, credits, rate limits and removal requests. No image binaries in the database. Never expose API keys. Mobile sizes: 320,375,390,430,768,1280.

## Review Focus

- Dynamic image servers with malicious DNS/redirects: pinned public-address lookup, no redirects or caller URLs.
- Duplicate/unnumbered chapters: deterministic sequence, prefer same group, no loop or skipped number.
- Failed/delayed images: no completion or auto-next before all visible pages load and intentional end scroll.
- Unavailable external metadata: optional sources fail independently and never determine chapter availability.
- Database reload/resume: per-chapter history, per-manga latest resume, progress not overwritten before restoration.

## Phase 0 — Foundations

- [x] Configure Next, tokens, theme provider, Prisma schema, lint/format/test commands.
- [x] Write shell/component tests, confirm failing state, build routes and navigation, pass tests.
      Files: src/app/{layout,page,globals}, src/components/{shell,theme-provider}, prisma/schema.prisma, tests/shell.test.tsx.

## Phase 1 — Browsing and integrations

- [x] Test validated MangaDex search/detail/feed contracts, request deduplication/cooldown and supplementary metadata shapes.
- [x] Implement src/lib/providers/{http,mangadex,anilist,jikan}.ts; API endpoints under src/app/api; input schemas in src/lib/schemas.ts.
- [x] Implement Home/Discover/Details with query filters, pagination, tags, loading/errors and real covers.
- [x] Run unit suite and scripts/check-integrations.ts against real providers, record failures honestly.

## Phase 2 — Reader

- [x] Write SSRF/page-order/quality/sequence tests; verify failure before implementation.
- [x] Implement src/lib/providers/media.ts and /api/reader/[id]/{route,images/[page]/route}; chapter/feed validation.
- [x] Implement vertical reader with bounded IntersectionObserver loading, per-image retry, quality switch, keyboard navigation and group credits.
- [x] Run tests and real metadata + single-image smoke test (no bulk retrieval).

## Phase 3 — Persistence

- [x] Write database API/preferences/sequence/progress tests, then implement local mutation routes with same-origin enforcement.
- [x] Implement Library/History/Settings, bookmarks/resume, throttled lifecycle saves and guarded auto-next.
- [x] Confirm SQLite persistence and refresh behavior via integration/E2E tests.

## Phase 4 — QA and documentation

- [x] E2E with explicitly mocked upstreams: responsive widths, theme persistence, search/error/empty, bookmark, reader/quality/progress/auto-next, SSRF rejection.
- [x] Run unit tests, typecheck, lint, production build and Playwright; visually inspect light/dark mobile and desktop screenshots.
- [x] Write exact README setup and provider/security/testing notes; record real API test results and limitations.

## Final status

Implemented all local phases. Live Jikan success remains unverified due repeated official-host connection timeouts; AniList production use remains permission-gated. These are reported limitations, not substituted fixtures or invented successes. See docs/VALIDATION.md.
