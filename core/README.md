# Fibre core domain

Provider-neutral, zero-dependency domain primitives shared across Fibre services (`#core/*`). No cloud SDKs, no network I/O, no SQL.

Key modules in `src/`:
- **Identity & Civil Registry:** `fibre-civil-identity.mjs` (FIN syntax and checksums), `thread.mjs`
- **Genetics, Urges & Physical Appearance:** `human-appearance/` (inherited physical genomes, founder populations, phenotype expression), `inherited-urges.mjs` (18 urge families, library v6)
- **Simulated Body:** `body-level.mjs` (pure baseline + fading spikes/reservoir component, [ADR-0038](../docs/decisions/ADR-0038-body-levels.md)), `intrinsic-regulation.mjs`
- **Participation, Dignity & Expression:** request digests, dignity policy bands, disclosure boundaries

Tests live in `test/`.
