# Changelog

## Unreleased (2026-09-21 — 2026-11-21)

### Positioning, repository & validation (November 21–22)
- Locked Fibre's outward thesis (**AI for AI — persistent digital individuals living symbiotically with humans and integrating into the economy**, covering Worker-Threads and Sponsored Tribute-Threads) in `docs/vision/ai-for-ai.md`, `README.md`, and refreshed `docs/state/public-progress.json` + `.md`.
- Restored the four active foundational validation contracts (`docs/validation/persistent-thread-round-trip.md` — thematically renamed from `m1-persistent-thread-round-trip.md`, `docs/validation/dignity-request-scenarios.md`, `docs/validation/interiority-expression-scenarios.md`, and `docs/validation/fibre-invariants.yaml`), unified Wrangler across CI/scripts to `4.151.0` matching `tools/deployment/cloudflare-operator.mjs`, and restored a repo-wide portable-domain boundary test (`services/asset-generator/test/cloudflare-runtime-boundary.test.mjs`).
- **ADR-0016 explicit document retirement ledger (last full version at Git commit `690b3f0`):**
  - `docs/state/future-capability-map.md`, `docs/state/unresolved-decisions.md` → superseded by `docs/state/current-state.md`, `docs/state/current-priorities.md`, `docs/validation/prototype-roadmap.md`, and `docs/decisions/`.
  - `docs/state/infra-pure.md`, `docs/state/thread-preservation-and-migration.md` → completed/superseded by `docs/architecture/infrastructure-driver.md`, `docs/architecture/production-persistence.md`, and `docs/architecture/thread-lifecycle.md`.
  - `docs/validation/acceptance-tests.md`, `docs/validation/canonical-scenario-tests.md` → superseded by executable semantic tests (`npm run slice:validate`), `docs/validation/thread-differential-gate.md`, and `docs/validation/drift-scorecard.md`.
  - `docs/validation/m2-meeting-runbook.md`, `docs/validation/meet-encounter-run-path-audit.md`, `docs/validation/n5-encounter-slices.md` → closed/superseded by `docs/validation/n6-public-lived-encounter-slices.md` and `docs/validation/n7-live-encounter-slices.md`.
  - `docs/validation/developmental-exploration-slices.md`, `docs/validation/developmental-exploration-x0-baseline.md`, `docs/validation/interior-cognition-baseline.md`, `docs/validation/interior-cognition-evaluation.md`, `docs/validation/identity-context-projection.md`, `docs/validation/life-observatory-slices.md`, `docs/validation/generative-diagnostic-methodology.md`, `docs/validation/thread-conditions-experiment-plan.md` → closed slice baselines/work orders superseded by `docs/architecture/developmental-exploration.md`, `docs/architecture/interior-cognition.md`, `docs/architecture/life-observatory.md`, `docs/architecture/social-life.md`, and `docs/state/current-state.md`.
  - `docs/validation/physical-appearance-calibration-plan.md`, `docs/validation/east-asian-facial-calibration.md`, `docs/validation/polynesian-facial-calibration.md` → Tranche A closed; durable appearance architecture lives in `docs/architecture/human-appearance.md`, `docs/architecture/human-physical-inheritance.md`, and `docs/operations/appearance.md`.
- Streamlined `docs/state/`, `docs/validation/`, `docs/index.md`, and `docs/ai-context-manifest.json`, and added a single-page walkthrough (`docs/architecture/how-fibre-works.md`).

### Model efficiency, captures & quality certification (November 4–21)
- Cut active staging OpenAI spend from $109.00/day (88 living Threads, Nov 4) to **$2.12/day** (6–8 living Threads, Nov 21) via Thread rest (ADR-0034), single-call live turns, versioned prompt files (`services/world-kernel/prompts/`), explicit prompt caching, deferred `flex` tier with immediate fallback, memory gists, and memory availability decay.
- Added per-job model routing with Cloudflare Workers AI (`cloudflare.yaml`), provider circuit reopening and failure backoff, full staging captures (`model:captures`), blind multi-family judging (`model:quality`), and certification tooling (`model:options`, `docs/validation/model-certifications.json`).
- Tested Workers AI Gemma 4 (`@cf/google/gemma-4-26b-a4b-it`) on staging (Nov 16–19); it failed `encounter.attention` (`35%` vs `90%` bar) and is preserved as a failed experiment while World reverted to `gpt-5.6-sol`.

### Social Body, standing, books & relationships (October 28 – November 20)
- Added family-keyed inherited urges (18 families, library v6) and late expression for existing Threads (ADR-0030, ADR-0036, ADR-0037).
- Built the unified pure **Body level** component (`core/src/body-level.mjs`, ADR-0038 B1–B2): social battery, familiarity/knowing, trust with wounds and scars (R1), bond and longing (R2), perceived regard (C2), held vs. treated standing with inherited stubbornness (C3/C3b), frustration, and weariness measured by multilingual embeddings (`@cf/baai/bge-m3`, S5b repaired Nov 20).
- Added arrival glances and reading real Project Gutenberg public-domain books from where a Thread left off (ADR-0035).
- Added relationship doors, append-only relational ledger, private stances, interests, useful/learning moments, appointments (time door), going over to someone in the same place, and the Social Life Scorecard (`world-social:quality`).

### Living world, Live Encounters, Birth Center & operator surfaces (September 21 – October 30)
- Closed continuous `LivedNow` across dormancy (ADR-0023), duplex Live Encounters with interruption and audible-prefix truth (ADR-0024), graded small social acts (ADR-0027), event-driven social reconsideration (ADR-0028), recognition/acquaintance (ADR-0029), ongoing exchange becoming conversation (ADR-0033), delayed GC-style consolidation, and Thread-initiated later contact.
- Established Birth Center as single birth authority with place/era population context (ADR-0031, ADR-0032), native Ed25519 FIN-card PNG proofs replacing C2PA (ADR-0022), canonical visual identity and calibrated Human Appearance (ADR-0021).
- Built Admin World Events, Life & Causes Observatory (ADR-0026), Body panel, World write-diet ceilings (`world-write-diet.md`), `infra:state-usage`, and visitor-experience public status (`status.insidefibre.com`).

## Earlier Unreleased (August — September 20, 2026)
- Added cloud Slice E operator preparation: idempotent Cloudflare D1/R2/Queue provisioning, environment-resolved Wrangler configs with concrete D1 IDs, explicit secret-file validation/upload, and corrected separation of runtime configuration from credentials.

- Closed cloud Slice D: migrated Birth Center provisional/provider-call durability to `InfraDriver.state`, added matching local/Cloudflare `state + scheduler` runtime composition, added restart-safe Cloudflare Birth publication, and made exact World birth replay idempotent while divergent replay still fails closed.
- Added provider-neutral World scheduling with identical local/Cloudflare `InfraDriver.scheduler` shape, moved local World reconciliation off semantic `setInterval` timers, added the Cloudflare World Durable Object runtime with service-binding handoffs, and proved durable wake recovery without duplicate canonical Embodiment admission.
- Migrated authoritative World/Genesis persistence from raw database paths to the provider-neutral `InfraDriver.state` boundary, converted load-bearing store transactions to `session.transaction(...)`, added a no-direct-SQLite production guard, and proved the same real `WorldStore` migration/commit/reopen/rollback/integrity contract against local SQLite and Cloudflare SQLite-backed Durable Object state.
- Added Thread Passport & Identity Provenance v1: a closed identity-domain registry, append-only claim histories with provenance/authorship/evidence classification, deterministic current/`asOf` views, a derived Passport, read-only inspection, and schema-v6 migration of legacy flat identity without claiming new causal or endogenous Development credit.
- Added the memory-visual companion invariant: every Thread memory reference receives an append-only visual lineage; new freeze-created memories get the initial pending synthetic slot atomically, and synthetic reconstructions can never masquerade as captured historical photographic evidence.
- Fully closed the deterministic M1 Persistent Thread Round Trip: Mina now proves persistent private dignity/stance, Participation Authorization, restricted disclosure strategy, audience-visible participation response, temporary cognition, Goal Guardian, freeze/abandon/timeout, restart/replay, and credentialed human/database inspection.
- Extended `npm run demo:m1` with three durable expression branches: willing `accept -> accept`, low-dignity `refuse -> refuse` with no runtime, and obligation-mediated `refuse -> accept` preserving `obligation_override`; all three responses are recorded before work and explicitly claim neither delivery, performed action, nor completion.
- Added append-only disclosure strategies and audience participation responses, plus durable non-execution authorization for `clarify`, `negotiate`, `delegate`, and `refuse` while keeping execution-capable `accept` exclusive to the thaw/runtime boundary.
- Hardened the two legitimate participation-authorization writers against both collision orderings, pinned domain/store non-execution-accept prohibitions independently, preserved exact-retry idempotency, and translated storage collisions to stable domain conflicts.
- Made outward posture symmetric with authority: accepted participation must communicate `accept`; non-accept authority may communicate the same action or `noncommittal`; a future compelled-but-outwardly-withheld capability requires its own record rather than a false refusal.
- Preserved compelled versus willing acceptance in outward wording while keeping the private obligation reference restricted; full candor may disclose that participation is obligation-mediated without converting compulsion into consent.
- Extended the Thread Editor with a credentialed, GET-only Expression Boundary view separating private stance, kernel authority, disclosure intent, exact outward response, and delivery/performed/completion status, with exact JSON retained as the technical authority.
- Extended the database inspector to verify expression tables, triggers, indexes, authorizations, strategies, responses, and complete chains through the Fibre stores; source read-only status now derives from SQLite `query_only` rather than a report literal.
- Added structural audience-response integrity reporting for response presence, delivery-not-sent, performed-action-not-recorded, completion-not-claimed, and the bounded combination; the older store `audienceSafe` boolean remains compatibility-only.
- Added `npm run demo:m1` as a reviewed proof command: after the HTTP process scenario, it independently pins historical obligation discharge, service-level consumed-authorization rejection before storage, direct abandonment non-consumption, exactly one obligation-consumption row, expression restart equality, and zero active session and lease rows.
- Replaced the fixture-only Thread Editor with a loopback-only, API-backed inspection surface over the independently running world kernel.
- Added live public/private views for Thread state, event history, integrity, request/appraisal/stance traces, expression boundary, runtime, authorization, Actor, Goal Guardian, freeze, abandonment, timeout, and raw inspection data.
- Added a per-run editor API credential, kept `FIBRE_PRIVATE_TOKEN` server-side, rejected non-loopback upstreams and Host authorities, enabled no CORS, and exposed no generic reverse proxy.
- Made timeout display compare `expiresAt` against kernel-published time, including the truthful `Timed out — not yet reclaimed` state before lazy lease reclamation.
- Hardened the editor proxy and static server against encoded suffix traversal, encoded static traversal, symlinked files/directories, filesystem escape, oversized upstream JSON, content-type CSRF, unknown preview fields, and request-body overflow.
- Limited editor simulation to deterministic `UPDATE_SELF_MODEL` preview, used kernel-owned preview time, and redacted the raw preview ID from browser responses.
- Required administrative authority for live world-kernel command acceptance while leaving preview public and non-mutating.
- Added editor and command-authority properties covering editor authentication, two-token non-disclosure, private-disabled drill-down, route allowlists, filesystem containment, exact preview envelopes, admin-gated acceptance, expression inspection, and lazy-timeout truthfulness.
- Added schema-versioned, append-only activation-request, Request Appraisal Capsule, and restricted private-participation-stance records to the M1 world kernel.
- Matched the portable SHA-256 request binding, persisted historical Thread state-hash witnesses, and revalidated copied private state plus complete, disjoint included/excluded memory, relationship, and obligation partitions through event replay.
- Added lifetime-idempotent request/appraisal retry, exact private-stance retry, explicit conflicting reuse, direct appraisal insertion-race rejection, transactional schema v1-to-v2 migration, and coherent private-record tamper detection.
- Made private stances durable opinions about immutable historical appraisals, so unrelated later Thread changes do not strand a stable request ID; future authorization still must revalidate live governing state.
- Replaced content-addressed private record IDs with opaque random 256-bit identifiers, retained separate SHA-256 content digests, added schema-level ID checks, and added a stance state-hash witness.
- Added token-gated restricted participation routes with authentication before private subpath dispatch, exact transport envelopes, lifecycle-specific appraisal rejection, and no private-capability advertisement on unauthenticated health.
- Added named adversarial tests for low-dignity acceptance, clarification/delegation preconditions, stance and requester binding, evidence requirements, context partitions, copied private state, selection semantics, malformed IDs, lifecycle handling, coherent private-record rewriting, expression authority layering, and text-only expression rendering.
- Kept appraisal capsules, private rationale, stance feelings, motives, uncertainties, relationship effects, disclosure intent, withheld reasons, and governing obligation references out of audience/public responses unless explicitly disclosed by the appropriate record.
- Hardened the M1 world-kernel API after adversarial review: `.fibre/` is ignored and validated as world-state-only storage, loopback binding is enforced by the exported listener, non-JSON mutation traffic and hostile request-target authorities fail closed, and response security headers cannot be overridden.
- Made `POST /threads` idempotent against the immutable seed event for the Thread's lifetime, kept event history inspectable during projection corruption, added service-layer preview-envelope validation, bounded local transport resources, and documented the one-command M1 causation/correlation convention.
- Expanded API evidence with direct negative tests for bind safety, media-type enforcement, no-CORS preflight, every post-apply preview witness, preview/idempotency error distinctions, projection-corrupt event access, request-target authority rejection, and lifetime seed retry.
- Added an independently running, loopback-only M1 world-kernel HTTP process over the SQLite persistence contract.
- Added deterministic SHA-256 command previews that bind exact command content, expected version, current state hash, proposed event ID, and resulting state hash without mutating world state.
- Added preview-bound command acceptance, post-write agreement checks, restart-safe idempotent receipt reconstruction, stable HTTP error codes, bounded JSON bodies, loopback Host enforcement, and redacted integrity responses.
- Added explicit token-protected projection repair plus API-specific tests, including an external-process stop/restart round trip against the same database.
- Hardened the M1 persistence spine against identity substitution, unreadable seed projections, retired-Thread resurrection, coherent event rewrites, stale command-result caches, and unversioned immutable storage.
- Added mandatory last-event projection witnesses, command-digest and derived-event-ID replay checks, accepted-command witnesses, projection repair from event history, lifecycle-preserving self-model updates, exact command payload contracts, and bounded payload size.
- Added SQLite schema version 1, status and JSON checks, causation/correlation/payload-schema/provenance event fields, a five-second busy timeout, typed stored-data integrity failures, and Node 22.13 as the minimum runtime.
- Expanded the persistence suite with adversarial tests covering identity, seed normalization, lifecycle, schema versioning, projection witnesses, event/command append-only enforcement, coherent tampering, repair, malformed data, and replay metadata.
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
- Expanded the portable suite with targeted domain and context-publication tests covering policy boundaries, every material request field, requester binding, recorded obligations, disclosure pairing, relationship-driven dignity, runtime validation, freeze retry behavior, and symlink safety.
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
