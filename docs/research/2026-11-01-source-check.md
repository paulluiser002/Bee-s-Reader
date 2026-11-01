# English source recheck — November 1, 2026

The [October provider research](2026-10-24-english-providers.md) recorded Comick returning image metadata for a limited English sample. On November 1, anonymous HTTPS requests to its chapter image-metadata endpoint for the two previously sampled Solo Leveling releases and the previously successful English control returned HTTP 403, non-JSON. This observation does not establish that the underlying content has been removed. No challenge or access control was bypassed and no credentials were used.

[Comick's public developer page](https://comick.dev/docs) describes catalog and reader-image metadata. Its [terms](https://comick.dev/terms) state that it is not a reading platform and do not set out permission for third-party display of returned chapter images. An earlier one-page technical success does not resolve current access or image-use conditions. Its OAuth library integration is unrelated to Bee's Reader's browser-local profile.

Direct access to the [MangaPDF API documentation](https://docs.mangapdf.org/guide/api/index.html) returned HTTP 521 during this recheck; the two documented API hosts had returned HTTP 521 in the October probes. No assumption is made about permanent availability.

The new [MangaDex English sample](2026-11-01-english-coverage.json) contains six title searches and up to one 100-release feed page per exact matched title; a positive result identifies eligible hosted chapter metadata, not complete English coverage or a successful image download. No provider besides MangaDex was enabled in production. The existing October probe script and records are historical evidence and should not be represented as the November recheck.
