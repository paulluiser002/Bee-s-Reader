# English reading availability and provider plan

Goal: make in-reader English chapter availability truthful and expand sources only where tested page delivery and applicable usage conditions support it. Preserve MangaDex, Vercel, local browser profiles, existing reading progress and data-saver behavior.

1. ✅ Recheck candidate APIs and relevant primary documentation; record a bounded, timestamped sample of English titles, real chapter-image results, access constraints, and the production deployment linkage. Do not equate catalog entries with readable pages.
2. ✅ Add a validated, rate-aware MangaDex availability route. Return readable only after finding an eligible hosted chapter; unavailable only when the inspected result covers the whole filtered feed; otherwise return unknown. Provider failures remain errors. Cover empty, filtered, paginated and invalid inputs.
3. ✅ Surface language-specific checks on Discover without automatically issuing a request for every title. Keep checking and error states honest, provide keyboard/mobile accessible controls, and clarify title-page empty/pagination states. Test real browser interactions and responses.
4. ⏸ Add and enable another provider only if current evidence establishes applicable image-use conditions and actual suitable English page delivery. If no candidate meets those conditions, preserve the current stable provider and document exactly what remains to qualify a source. Do not change local profile schema speculatively.
5. ▶ Verify unit, browser, typecheck, lint, production build, and live permitted chapter images; review changes, push main, and inspect the actual Vercel deployment if discoverable. Report production status and any incomplete source-coverage goals honestly.

Source expansion remains conditional: the current Comick image endpoint returns 403 and the relevant display conditions are unverified; MangaPDF is unavailable. No second adapter is enabled. The original user request to expand English availability is therefore only partially fulfilled until an acceptable source is identified.
