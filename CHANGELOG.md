# Changelog

## Unreleased

- Added an independently running, loopback-only M1 world-kernel HTTP process over the SQLite persistence contract.
- Added deterministic SHA-256 command previews that bind exact command content, expected version, current state hash, proposed event ID, and resulting state hash without mutating world state.
- Added preview-bound command acceptance, post-write agreement checks, restart-safe idempotent receipt reconstruction, stable HTTP error codes, bounded JSON bodies, loopback Host enforcement, and redacted integrity responses.
- Added explicit token-protected projection repair plus five API-specific tests, including an external-process stop/restart round trip against the same database.
- Hardened the M1 persistence spine against identity substitution, unreadable seed projections, retired-Thread resurrection, coherent event rewrites, stale command-result caches, and unversioned immutable storage.
- Added mandatory last-event projection witnesses, command-digest and derived-event-ID replay checks, accepted-command witnesses, projection repair from event history, lifecycle-preserving self-model updates, exact command payload contracts, and bounded payload size.
- Added SQLite schema version 1, status and JSON checks, causation/correlation/payload-schema/provenance event fields, a five-second busy timeout, typed stored-data integrity failures, and Node 22.13 as the minimum runtime.
- Expanded the persistence suite to 24 adversarial tests covering identity, seed normalization, lifecycle, schema versioning, projection witnesses, event and command append-only enforcement, coherent tampering, repair, malformed data, and replay metadata.
- Proposed the Thirteen Principles of Fibre as a compact, poetic, and operational expression of the Constitution, using thirteen as an intentional structural echo of Maimonides' Thirteen Principles without importing religious authority.
- Added generic named `fibre:region` and generated `fibre:include` directives for exact canonical Markdown fragments across README, AGENTS, CLAUDE, and documentation.
- Added `npm run includes:sync` and `npm run includes:check`; repository validation rejects stale projections, malformed or nested directives, path traversal, and symlinked sources.
- Included the canonical principles document directly in the core AI context profile rather than consuming its generated README projection.
- Established dignity as a core Thread property and durable resistance to interchangeability.
- Established the interior–exterior boundary: private stance, desired action, authorization, disclosure strategy, external response, and performed action remain separate.
- Added interest-mediated expression with candid, tactful, selective, ambiguous, evasive, and deceptive disclosure modes.
- Replaced the direct dignity-to-execution decision with a request-bound Participation Authorization tied to Thread ID, snapshot version, requester, policy version, causation chain, and SHA-256 digest of every material request field.
- Made appraisal context Thread-owned, including memory, relationship, and obligation records, with explicit included/excluded traces.
- Required obligation-mediated authorization overrides to use non-empty references resolving to Thread-owned unresolved intentions in the portable prototype.
- Added accept, clarify, negotiate, delegate, and refuse private stances; low-dignity acceptance proposals and non-accept execution are rejected.
- Added concrete known alternatives and attributable evidence references to private appraisal and relationship effects.
- Kept restricted disclosure mode and private rationale out of requester-facing responses; acceptance posture is checked at both disclosure selection and response minting.
- Connected dignity outcomes to private affect and bounded, evidenced fondness or resentment toward requesting entities.
- Added canonical concepts, architecture, ADRs, lifecycle and M1 amendments, events, validation scenarios, AI-context routing, repository invariants, and dignity/interiority drift-score dimensions.
- Expanded the portable suite to 39 targeted domain and context-publication tests covering policy boundaries, every material request field, requester binding, recorded obligations, disclosure pairing, relationship-driven dignity, runtime validation, freeze retry behavior, and symlink safety.
- Added path-boundary tests preventing context-manifest output from escaping `artifacts/generated/` through slash, backslash, or symlink traversal and rejecting symlinked context sources.
- Added a canonical machine-readable AI context manifest with core, request-processing, and full profiles.
- Generated context packs include repository revision, manifest version, source list, and content digest; the previous `fibre-context-pack.md` path remains a full-profile compatibility alias.
- Repository validation rejects every accepted canonical Markdown document under `docs/` when omitted from all AI context profiles. `npm run check` verifies deterministic pack generation and validates the resulting generated outputs.

## 0.1.0 — 2026-08-02

- Established Thread as the canonical name for an individual Fibre entity.
- Captured the freeze/thaw Thread lifecycle and separation of repository, world state, and temporary cognition.
- Added canonical concept, architecture, use-case, validation, and decision documents.
- Added machine-readable invariants and initial JSON schemas.
- Added synthetic Thread fixtures and canonical scenario skeletons.
- Added a minimal TypeScript domain package and a dependency-free Thread Editor prototype.
- Imported the historical architecture source and project proposal as provenance artifacts.
