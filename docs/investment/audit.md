---
id: investment-readiness-audit
status: proposed
last-reviewed: 2026-11-21
canonical: false
---

# Fibre Investment-Readiness Audit (Phase 0)

**Audit date:** 2026-11-21
**Repository revision audited:** `690b3f0` (`main`, 1,670 tracked files)
**Validation baseline:** `npm run slice:validate` passed — **1,934 / 1,934 tests** across 471 files (9.7 s test runtime; ~39 s total wall-clock including TypeScript build, include/prompt checks, context-pack generation, and manifest validation).
**Scope:** Read-only repository, documentation, tooling, live cost/usage telemetry, and deployment-evidence audit. No code, patches, or live World state were altered.

---

## Executive summary

Fibre is **far stronger technically than its public presentation suggests**, and **far less investment-ready externally than its engineering depth deserves**.

- **What is real and rare:** A working, provider-neutral persistent-world kernel on Cloudflare Workers/Durable Objects/D1/R2 with **zero runtime npm dependencies**, 1,934 passing semantic tests, 39 ADRs, a genuine social Body (hunger, social battery, trust, wounds/scars, longing, perceived regard, felt status, frustration, weariness by embeddings), civil identity (FIN + Ed25519-signed PNG Identity Cards), a live cohort of 8 Addis Ababa Threads on staging (88 non-retired total, 80 resting), and real cost discipline ($109.00/day on Nov 4 cut to **$2.12/day on Nov 21** for the active staging cohort).
- **What blocks an investor today:**
  1. **Severe documentation drift:** `README.md` still names `M2` as active; `docs/state/public-progress.json` (the canonical public truth file) is **6.5 weeks stale** (`2026-10-06`); `CHANGELOG.md` stopped on `2026-09-20`; `docs/state/current-state.md` cites a Nov 6 World SHA (`5bd985e`) while staging actually runs `690b3f0` (Nov 21).
  2. **API-first split Viewer & pre-seed deployment posture:** Production has no deployment record (appropriate for pre-seed; initial showings use hardened staging — framed honestly as *the world and its Threads in their infancy*, not a scripted mock demo). Keeping `insidefibre.com` in a separate repo (`guybarnahum/insidefibre.com`) is **by design** so Fibre stays strictly API-driven and open to multiple external viewers (`admin-dashboard` is the sole internal God-view exception). However, the public browser encounter lifecycle (`N6.6c`) is unclosed and no public read endpoint exists yet for watching the society live.
  3. **Model certification is built, not yet populated:** `docs/validation/model-certifications.json` has **0 certified models**; 100% of live World cognition still depends on OpenAI `gpt-5.6-sol` after Gemma 4 on Workers AI failed `encounter.attention` (`35%` vs `90%` bar).
  4. **Durable Object read optimization ahead of scale:** Live telemetry (`npm run infra:state-usage -- --date 2026-11-21`) measured **2,668,344 DO rows read** and **9,571 rows written** for 6–8 living Threads. Staging is already on **Cloudflare Paid tier** (so the 5M free-tier bar in `infra:state-usage` is an optimization warning, not an immediate outage cliff), but read efficiency and partitioning must be addressed for target scale tiers: **Pre-seed (100–500 Threads)** → **Pre-A (10k–100k)** → **Pre-B (>1M)**.
  5. **Repository bloat, test ROI, and CI defects:** The repo carries accumulated AI-generated documentation and test bloat (200 docs, 94 npm scripts, many state `.md` files). **44 of 515 tracked test files (8.5%)** are omitted from `discoverTestSuites` — these (and the wider suite) should be **triaged and trimmed** for thematic Fibre-vision ROI rather than blindly wired in. `.github/workflows/validate.yml` omits `npm ci` while stacking redundant commands in violation of `AGENTS.md`.

---

## 1. What Fibre actually is today

Capabilities are separated into **Deployed (staging)**, **Built-but-held** (patches sitting in `.fibre/patches/` awaiting Guy's deployment), and **Designed / Deferred**. Evidence levels follow [`docs/state/current-state.md`](../state/current-state.md) (`Standing` > `Observed` > `Deployed` > `Source`), paired with causal maturity (`Behaviorally/future-state causal`, `Context-only`, `Notarial`, `Stored-only`, `Named-only`) and public-progress labels (`Done`, `Shown working`, `Working on it`, `Not yet`, `Experiment failed — kept as evidence`).

**Deployment reality (from `.fibre/cloudflare/` records):**
- **Staging:** `world-kernel` runs `690b3f0` (Nov 21, 19:28 UTC); `admin-dashboard` and `status-page` run `be8f7ea` (Nov 21, 15:18 UTC); full-stack `deployment.json` last recorded at `3adc0d0` (Nov 14, 15:33 UTC) covering `asset-generator`, `thread-presentation`, `world-kernel`, `fibre-identity-authority`, and `birth-center`. Eight Addis Ababa Threads live continuously; 80 non-retired Threads rest ([ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md)).
- **Production:** Provisioning config exists (`.fibre/cloudflare/production/resources.json`, Sep 20), but **no `deployment.json` or `apps-deployment.json` exists**. Production is not deployed with a living cohort, and Slice I empty-environment rebuild remains unverified ([`docs/architecture/cloud-e2e-closure-plan.md`](../architecture/cloud-e2e-closure-plan.md)).
- **Vision-Integrity Scorecard:** Last scored at **15 / 26** on Rubric v2 (August 2026; October checkpoints intentionally held score flat) — below the 75% drift threshold ([`docs/validation/drift-scorecard.md`](../validation/drift-scorecard.md)).

### 1.1 Deployed in staging (or Standing / Source on `main`)

| Capability | Evidence level | Public label | Causal maturity | Citations & strongest limitation |
|---|---|---|---|---|
| **Persistent identity, freeze/thaw, dignity appraisal, Genesis childhood, history-bends-judgment** | Standing (bounded) | Done | Behaviorally causal (bounded gates) | `services/world-kernel/`, [`drift-scorecard.md`](../validation/drift-scorecard.md), [ADR-0001](../decisions/ADR-0001-persistent-identity.md), [ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md), [ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md). Closed bounded proofs (`M1`, `#33–#40`); not generalized mature personhood. |
| **Birth Center & Civil Identity (FIN + Ed25519 FIN Card)** | Observed (staging) | Done | Future-state / identity authority | `services/birth-center/`, `services/fibre-identity-authority/`, [ADR-0022](../decisions/ADR-0022-fid-native-proof.md), [ADR-0031](../decisions/ADR-0031-birth-center-single-birth-authority.md), [ADR-0032](../decisions/ADR-0032-place-population-parental-origins.md). Empty-environment rebuild unverified; no live-Thread parent reproduction yet. |
| **Canonical visual identity & inherited physical appearance** | Observed (staging) | Done | Stored / presentation-only (by design) | `core/src/human-appearance/`, `services/asset-generator/`, `services/population-lab/`, [ADR-0021](../decisions/ADR-0021-canonical-visual-identity-reference.md). Tranche A calibrated; global realism remains experimental. |
| **Continuous LivedNow: Flight Plan → CurrentSituation, transit, dormancy catch-up, real venues, rest/wake** | Observed (staging) | Done | Behaviorally / future-state causal | `services/world-kernel/src/lived-now-service.mjs`, [ADR-0023](../decisions/ADR-0023-retrospective-lived-continuity.md), [ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md). Sparse bounded catch-up; 8 living Threads in one city (Addis Ababa), 80 resting. |
| **Situated perception, Encounter Story → Experience → optional Journal → selective Memory (+ gists & memory availability)** | Observed (staging) | Shown working | Behaviorally causal (local/bounded) / Context-only (staging) | `services/world-kernel/src/lived-experience-store.mjs`, [`encounters-and-experience.md`](../architecture/encounters-and-experience.md), [`development-and-memory.md`](../concepts/development-and-memory.md). N7.11 Gates 2–3 (live staging history-caused behavioral divergence) remain open. |
| **Thread-to-Thread Live Encounters, graded social acts, reconsideration, acquaintance, introductions, delayed messaging** | Observed (staging) | Shown working | Behaviorally causal | `services/world-kernel/src/lived-social-meeting.mjs`, [ADR-0024](../decisions/ADR-0024-live-encounters.md), [ADR-0027](../decisions/ADR-0027-graded-social-acts.md), [ADR-0028](../decisions/ADR-0028-event-driven-social-reconsideration.md), [ADR-0029](../decisions/ADR-0029-recognition-and-acquaintance.md), [ADR-0033](../decisions/ADR-0033-ongoing-exchange-may-become-conversation.md). Staging conversations remain uniformly warm (0 declined invitations, 0 slights across ~110 regard acts Nov 18–21). |
| **Inherited urges (18 families, library v6) & the Social Body (battery, familiarity, trust, wounds/scars, bond/longing, perceived regard, felt status, stubbornness, frustration, weariness via embeddings)** | Deployed (B1–B2, S2–S5b, R1–R2, C1–C3b); S2 observed | Working on it | Behaviorally causal (S2 battery observed); C2/C3/R1/S5b deployed & awaiting divergence evidence | `core/src/inherited-urges.mjs`, `core/src/body-level.mjs`, `services/world-kernel/src/social-body.mjs`, `services/world-kernel/src/exchange-meaning.mjs`, [ADR-0030](../decisions/ADR-0030-inherited-urges.md), [ADR-0036](../decisions/ADR-0036-social-body.md), [ADR-0037](../decisions/ADR-0037-status-and-conflict.md), [ADR-0038](../decisions/ADR-0038-body-levels.md). S5b weariness was repaired Nov 20 (`be8f7ea`) after proving inert; no harms have yet occurred in staging to exercise wounds live. |
| **Glance on arrival & reading real public-domain books (Project Gutenberg)** | Observed (reading); Built (return-to-book & book-in-hand) | Shown working | Context-only / behaviorally causal | `integrations/books/`, [ADR-0035](../decisions/ADR-0035-glance-and-books-at-places.md). English public-domain texts only. |
| **Relationships: doors, relational ledger, private stances, interests, useful/learning moments, appointments (time door)** | Deployed / Observed (stances) | Working on it | Doors: **Notarial**; Stances/Interests/Moments: **Context-only**; Appointments: **Future-state causal** | [`docs/architecture/social-life.md`](../architecture/social-life.md). No decision reads doors yet; stances observed so far are all positive. |
| **Public API (`/present`, `/encounter`, SSE, directory, assets) & Meet a Thread** | Observed (CLI + public SSE); Browser partial | Working on it | Behaviorally causal (World/API) | `services/thread-presentation/`, `infra/deployments/thread-presentation/cloudflare/`, [`n6-public-lived-encounter-slices.md`](../validation/n6-public-lived-encounter-slices.md). `N6.6c` full browser multi-turn/leave/revisit lifecycle is **not closed**; Viewer lives in separate repo and UI redesign is paused. |
| **Paid visitor-work & Fibre Credits ledger** | Observed (bounded) | Shown working | Future-state causal (narrow) | `services/world-kernel/src/inside-fibre-work.mjs`, [`current-state.md`](../state/current-state.md). One narrow paid availability shift proven; general economy/bank/payroll not built. |
| **Operator & status surfaces (`admin.insidefibre.com`, `status.insidefibre.com`, local `thread-editor`)** | Deployed (staging at `be8f7ea`) | Done (staging) | Inspection-only (by design) | `apps/admin-dashboard/`, `apps/status-page/`, `apps/thread-editor/`. Admin is Access+D1-gated; `thread-editor` is loopback-only M1 inspector. |
| **Model efficiency, captures & certification tooling (`model:usage`, `model:captures`, `model:quality`, `model:options`)** | Deployed (captures); Source (certification) | Working on it | Control / measurement plane | `tools/model/`, [`model-certifications.json`](../validation/model-certifications.json). Cut spend from $109/day (88 Threads) to $2.12/day (6–8 living Threads on Nov 21), but **0 models certified yet**. |
| **Workers AI Gemma 4 (`@cf/google/gemma-4-26b-a4b-it`) for World cognition (Nov 16–19)** | Observed failure | **Experiment failed — kept as evidence** | Failed quality bar | `infra/deployments/environments/cloudflare.yaml` (lines 133–136), commit `c58a7ee`. Failed `encounter.attention` (`35%` acceptable vs `90%` bar; noticed nothing in `70%` of moments). Reverted to `gpt-5.6-sol`. |

### 1.2 Built-but-held (unapplied patches in `.fibre/patches/`)

These are implemented and tested by Claude, awaiting Guy's review and staging deployment (untouched by this audit):

1. **`body-levels-b3.patch`** (Nov 20; 19 files, +278/−66 lines): **ADR-0038 Slice B3 — Missing someone & reunion joy.** Turns longing into a Body level rising toward a bond-set plateau, spiked by recalled memories (`+0.4 × bond`), eased by absorption/messages, with proportional reunion joy and Admin Body-panel graphing.
2. **`livelihood-l1.patch`** (Nov 21; 22 files, +537/−37 lines): **ADR-0039 Slice L1 — Skills, life situation & a bigger city.** Introduces `ADR-0039-livelihood.md`, one-time livelihood reflection (`experience.livelihood-formation`) forming Thread-owned skills and life situation (**Context-only**), Flight Plan v4 awareness of workplaces/schools, operator attendance tracking, and admission of a school and market alongside learning places to break the 8-Thread library monoculture.

### 1.3 Designed / accepted-not-built (deferred, not erased)

- **Body levels & conflict (ADR-0038 B4–B7, ADR-0037 C4–C7):** Battery chronic floor & chronic isolation (B4), mood (B5), provocation/anger (B6/C4), remorse (B7/C5), views of standing in words (C6), emergent dignity from status (C7, requires new ADR).
- **Livelihood & Information (ADR-0039 L2–L6, I1–I3):** Work/study lived at places & household events (L2), Fibre bank/payroll/token-paced thinking (L3a), money felt through Body regulators without a dedicated money urge (L4), learning & path reconsideration (L5), real paid work on Fibre's task board (L3b), Thread-to-Thread market (L6), external paid work beyond Fibre channels (L3c — awaiting Guy's decision), foresight/information disclosure (I1–I3).
- **Social & relational concepts:** Judging one's own social life (sentiment × social currency), Attraction & Orientation ([`docs/concepts/attraction-and-orientation.md`](../concepts/attraction-and-orientation.md)), remaining relationship doors (place/home invitations, confidence, care, romance, commitment).
- **Longer-horizon society:** Live-Thread parent reproduction, institutions/governance, multi-city population scaling (40+ living Threads), partitioned World reconciliation ([`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md)), public AI-identity verification registry (name/email/phone lookup), human browser voice.

---

## 2. What a seed investor would see in the first 10 minutes

Walking the exact sequence a sharp seed investor or technical partner follows:

### Minutes 0–2: `README.md`
- **What lands well:** The first 10 lines ("Fibre is a persistent world for artificial persons called Threads... Models provide cognition. Fibre owns continuity, authority, history, persistence and consequence.") and the Thirteen Principles immediately differentiate Fibre from generic agent startups.
- **Where they get lost or lose trust:**
  - **Stale status at line 57:** Claims the active milestone is **"M2 — continuous LivedNow + meetings"**, cites `#33-#40` and `M1`, and describes a "missing seam" (dormancy catch-up) that was closed over a month ago (`N1–N3`). An investor who glances at git commits from November sees a completely different product (living Addis Ababa society, social Body, books, appointments, livelihood).
  - **Zero clickable live links:** `insidefibre.com`, `admin.insidefibre.com`, and `status.insidefibre.com` are written in backticks rather than links, with no note that the active world is on staging.
  - **No architecture diagram, no visual proof, no unit economics:** No 60-second system picture, no screenshot/portrait, no cost-per-Thread number.
  - **Contradictory commands:** Quick commands list `npm run test:all`, `npm run validate`, `npm run check`, and `npm run demo:m1`, omitting `npm run slice:validate` even though `AGENTS.md` explicitly forbids stacking those commands.

### Minutes 2–5: The live site (`insidefibre.com` & `status.insidefibre.com`)
- **What an investor expects:** A live front door where they can understand Fibre in 30 seconds, watch the 8 living Threads move through their day in Addis Ababa, click a Thread, and talk to one — with clear AI disclosure and honest progress.
- **Where they get lost or lose trust:**
  - **Production is not deployed:** `.fibre/cloudflare/production/` has no `deployment.json`; the living society is on staging only.
  - **The Viewer is in a separate repo and mid-pause:** `services/thread-presentation` in this repository is only the JSON/SSE backend (`api.insidefibre.com`). The frontend lives in `guybarnahum/insidefibre.com`, where `N6.6c` (multi-turn encounter, leave, later revisit) is still unclosed and UI edits were explicitly paused pending a redesign ([`n6-public-lived-encounter-slices.md`](../validation/n6-public-lived-encounter-slices.md)).
  - **No public "living society" view:** Seeing who is where, doing what, and with whom exists only behind Cloudflare Access on `admin.staging.insidefibre.com/world-events`. An external investor sees at best a single Thread's moment — never the society.
  - **Stale public claims source:** If any public surface renders `docs/state/public-progress.json`, it reports `asOf: 2026-10-06`, **5 validation Threads**, and N5/N6 status — contradicting everything built in October and November.

### Minutes 5–8: A demo
- **Where they get lost or lose trust:**
  - **No scripted investor demo exists.** Running `npm run demo:m1` launches an August deterministic local SQLite round-trip (Mina, stubbed Actor, zero real LLM, zero living society).
  - **Broken runbook:** `docs/validation/m2-meeting-runbook.md` *(archived in Git at `690b3f0`)* instructed curling `POST /api/threads/$THREAD_ID/meet`, an endpoint **deleted on Oct 5 in N6.3a**.
  - **Unframed live consent risk:** `npm run thread:meet` is an operator CLI requiring staging tokens. In a live investor demo, a Thread may legitimately be asleep (`unavailable`) or decline to talk (`declined`). Without a clear demo script, society view, and recorded fallback, genuine Thread agency looks like a broken demo.

### Minutes 8–10: `docs/index.md` and `docs/`
- **What lands well:** Unusually serious engineering and philosophical rigor; explicit anti-hype discipline (`drift-scorecard.md`, causal-status registers, failed experiments preserved).
- **Where they get lost or lose trust:**
  - **Internal jargon wall:** 200 Markdown files heavy with internal roadmap coordinates (`M1`, `M2`, `N1–N7`, `E0–E6`, `X0–X4`, `S1–S6`, `R1–R2`, `C1–C7`, `B1–B7`, `L1–L6`, `#33–#40`, `Slice G/H/I`).
  - **Conflicting truth pages:** `docs/index.md` points to N6/N7 as current and omits `docs/operations/`. `public-progress.json` says Oct 6; `current-priorities.md` header says Nov 7 (while body cites Nov 21); `current-state.md` header says Nov 9 and World SHA `5bd985e` (while body cites Nov 20 and staging runs `690b3f0`). An investor doing diligence cannot tell which page is current truth.

---

## 3. What a new engineer or AI agent would hit

### Onboarding friction & unclear entry points
- **94 npm scripts** in `package.json` with no categorized index; `README.md` doesn't mention `npm run slice:validate` or `npm run test:focused`.
- **Missing directory READMEs:** 5 of 10 top-level code/data directories lack a `README.md`: `apps/`, `core/`, `schemas/`, `artifacts/`, and `data/`. Under `docs/`, `docs/operations/` has no `README.md` and is unlisted in `docs/index.md`.
- **Split-repo surprise:** Nothing in `README.md` explains that the `insidefibre.com` frontend is a separate repository (`guybarnahum/insidefibre.com`) consuming `services/thread-presentation`.
- **No single "how Fibre works" walkthrough:** An engineer must stitch together 6+ docs (`system-overview.md`, `lived-now-and-meetings.md`, `social-life.md`, `intrinsic-regulation.md`, `encounters-and-experience.md`, `ADR-0036/0037/0038`) to trace one Thread through a single day.

### Stale docs & broken internal references
- **Front-matter age distribution** across 200 tracked `docs/**/*.md` files (15 have no front matter): 67 last reviewed in August 2026, 31 in September, 40 in October, 29 in November. Statuses: 147 `accepted`, 31 `proposed`, 4 `active`, 1 `superseded`, 1 `candidate`, 1 `open-question`.
- **High-impact stale files:**
  - `docs/state/public-progress.json` (`2026-10-06`) & `public-progress.md` (`2026-10-05`)
  - `CHANGELOG.md` (last touched Sep 20, commit `46f4a05`)
  - `README.md` (names `M2` active)
  - `docs/validation/m2-meeting-runbook.md` (references deleted `POST /api/threads/$THREAD_ID/meet`)
  - `docs/state/future-capability-map.md` and `services/README.md` still refer to retired directory names `packages/infra/` and `deployments/` (relocated to `infra/providers/` and `infra/deployments/`).
- **AI context tooling friction:**
  - `docs/ai-context-manifest.json` is committed as **one minified line** (~6 KB), making diffs and human/agent reviews painful.
  - The `social-life` profile omits `ADR-0035`, `ADR-0036`, `ADR-0037`, and `ADR-0038` — meaning an agent loading `social-life` misses the entire social Body, books, status/conflict, and Body levels.
  - The `core` profile bundles 67 files, including dated N6/M2 runbooks.

### Naming debt
- **Registered debt in `services/*/src`:** [`services/runtime-name-debt.md`](../../services/runtime-name-debt.md) accurately tracks 17 frozen Genesis chronology files under `services/world-kernel/src/` (`genesis-event-structure-pool-v1..v3`, `genesis-pass-a/b/c-*`, `genesis-slice-d/e-*`, etc.), mechanically frozen by `tools/repository/runtime-name-policy.mjs`.
- **Unregistered chronological debt outside `services/*/src`:** 32 additional tracked files in `services/*/test/` and `tools/` still carry stage/version names:
  - Tests: `dignity-guardian-v4.test.mjs`, `genesis-slice-a..f-*.test.mjs` (14 files), `infra/test/cloudflare-v1.test.mjs`.
  - Tools: `tools/deployment/cloudflare-e2e-slice-g.mjs`, `tools/presentation/{probe,prove,seed}-p3-*.mjs` (3 files), `tools/m1-demo-world-kernel.mjs`.
  - `package.json` scripts: `developmental-exploration:x3:validate`, `demo:m1`, `demo:m1:editor`, `slice:validate` (note `slice:validate` is canonical in `AGENTS.md`).

### Dead, experimental, or leftover code & duplicated concepts
- **Orphaned local C2PA directories:** Untracked `services/c2pa-local/node_modules/` and `integrations/content-credentials/c2pa-node/node_modules/` remain on disk from before [ADR-0022](../decisions/ADR-0022-fid-native-proof.md) retired C2PA in favor of native Ed25519 PNG proofs.
- **Root stray log:** Untracked `run-at-20261101T142851.log` sits at repository root (ignored by `*.log`, still creates clutter).
- **Duplicate M1 wrapper:** `tools/m1-demo-world-kernel.mjs` merely wraps `tools/replays/m1/m1-demo-world-kernel.mjs`.
- **Embedded fixture harness in production worker:** `infra/deployments/thread-presentation/cloudflare/worker.mjs` embeds ~125 lines of `P3_FIXTURE_MODE` (`/__p3/...`) endpoints directly inside the main worker module (gated by env flag, but mixes test harness into prod code).
- **Unconsumed schema stubs:** `schemas/` contains 7 August JSON schemas (`bid`, `contract`, `ledger-entry`, `memory`, `relationship`, `task`, `thread`) that represent early conceptual models rather than the active World SQLite/runtime contracts.
- **Duplicated documentation:**
  - `docs/architecture/operator-surfaces.md` has **three overlapping Appearance sections** (`### Appearance workbench`, `### Appearance / Population Lab`, `### Appearance coverage workbench`, lines 71–156).
  - `AGENTS.md` (248 lines), `CLAUDE.md`, `docs/foundations/invariants.md`, and `docs/ai-context-index.md` repeat invariant lists and validation instructions.

### Oversized files (maintainability hotspots)

| Lines | Bytes | File |
|---:|---:|---|
| 3,109 | 117.4 KB | `apps/admin-dashboard/appearance-coverage-ui.js` |
| 3,083 | 145.5 KB | `services/world-kernel/src/lived-experience-store.mjs` |
| 2,278 | 107.1 KB | `services/world-kernel/test/world-social-opportunity.test.mjs` |
| 1,929 | 86.4 KB | `services/world-kernel/test/lived-now-service.test.mjs` |
| 1,897 | 79.3 KB | `apps/admin-dashboard/thread-population-ui.js` |
| 1,837 | 76.3 KB | `apps/admin-dashboard/thread-observatory.js` |
| 1,605 | 68.8 KB | `services/world-kernel/test/lived-social-meeting.test.mjs` |
| 1,419 | 59.9 KB | `services/world-kernel/src/lived-now-store.mjs` |
| 1,235 | 51.7 KB | `services/world-kernel/src/thread-genesis-repair-service.mjs` |
| 1,225 | 58.1 KB | `infra/deployments/world-kernel/cloudflare/worker.mjs` |
| 1,197 | 51.6 KB | `services/world-kernel/src/lived-social-meeting.mjs` |
| 1,105 | 46.8 KB | `services/world-kernel/src/genesis-store.mjs` |

*(Do not refactor `services/world-kernel/src/` or `infra/deployments/` during Phase 2 without coordinating with Claude's active work on `main`.)*

### Critical test-discovery blind spot
`tools/test-infra/test-suite-lifecycle.mjs` (`discoverTestSuites`) walks 10 explicit directories, **missing 44 of 515 tracked `*.test.mjs` files (8.5%)**:
- **33 files** in `apps/admin-dashboard/*.test.mjs`
- **8 files** in `services/population-lab/test/*.test.mjs`
- **2 files** in `infra/providers/` (`cloudflare/resource-health.test.mjs`, `local/artifact-driver.test.mjs`)
- **1 file** in `core/src/locality-geography.test.mjs` (placed in `src/` instead of `core/test/`)

None of these 44 files execute during `npm test`, `npm run slice:validate`, or GitHub Actions CI.

---

## 4. Repository hygiene

| Area | Finding | Risk / Action |
|---|---|---|
| **Structure** | 1,670 tracked files across clean capability boundaries: `services/` (817), `tools/` (231), `docs/` (205), `infra/` (161), `apps/` (125), `core/` (47), `fixtures/` (27), `integrations/` (24), root (14), `artifacts/` (8), `schemas/` (7), `.github/` (3), `data/` (1). Runtime import/persistence policies are mechanically enforced by tests. | **Low** (architecture clean; add missing top-level READMEs). |
| **Generated files committed** | Two intentional, mechanically checked projections: `services/world-kernel/src/generated/prompts.mjs` (75.4 KB, checked by `prompts:check`) and `README.md` principles block (checked by `includes:check`). Context packs (`artifacts/generated/*.md`) are properly gitignored. | **Low** (clean discipline). |
| **Large & binary files** | Total repo footprint is lean; largest tracked file is 552.5 KB. 8 tracked binaries: FID card fonts/templates (`services/fibre-identity-authority/assets/fid-card/v0.3-ocean/`, ~1.69 MB total), 3 early PNG diagrams (`artifacts/diagrams/`, ~193 KB), plus `artifacts/project-proposal/Fibre_Project_Proposal.docx` (244.7 KB). | **Low** (consider replacing legacy PNG diagrams with Mermaid-as-code in Phase 2). |
| **`artifacts/` & `data/`** | `artifacts/` holds 8 tracked files (diagrams, proposal docx, validation/whitepaper READMEs, `generated/.gitkeep`). Local untracked August artifacts (`pr39-slice-*`, `asset-live*`) sit in `artifacts/generated/`. `data/` holds only 1 tracked file (`data/world/places/tbilisi-national-library-building-iii.json`) with no README. | **Low** (add READMEs; clarify role of `data/`). |
| **Test health & runtime** | `npm run slice:validate`: **1,934 / 1,934 passing** across 471 files (`469 active`, `2 replay`) in **9.7 s** test execution / **~39 s** wall-clock. Three loopback HTTP tests fail inside socket-restricted sandboxes (`EPERM 127.0.0.1`). **44 tracked test files are orphaned** from the runner. | **High** (wire the 44 orphaned test files into `discoverTestSuites` after verifying they pass). |
| **CI (`.github/workflows/`)** | `validate.yml` has **three defects**: (1) **no `npm ci`/`npm install` step** before `npm run check` (breaks `tsc -b` unless `typescript` is preinstalled), (2) stacks `npm run check`, `npm run test:all`, and `npm run validate` (violating `AGENTS.md`, repeating build + tests), (3) lacks `permissions: contents: read`. Also mixes `wrangler@4.126.0` (in CI and 2 scripts) with `wrangler@latest` (in 5 `package.json` scripts). `model-smoke.yml` is clean manual dispatch. | **High** (replace stacked steps with `npm ci` + `npm run slice:validate` + pinned wrangler dry-runs + `permissions: contents: read`). |
| **Dependency health** | **Exceptional:** **0 runtime dependencies** in `package.json`, **1 devDependency** (`typescript: ^7.0.2`), `engines.node >= 22.13`. Minor issues: unpinned `npx wrangler@latest` in 5 scripts; orphaned `node_modules` in retired `services/c2pa-local/` and `integrations/content-credentials/c2pa-node/`. | **Low** (pin `wrangler`; remove stale local C2PA `node_modules`). |
| **Secrets risk** | Pattern scan across all 1,670 tracked files (OpenAI, Anthropic, Google, AWS, PEM keys, GitHub, BFL, Cloudflare, Bearer tokens): **0 real secrets found** (only 6 intentional placeholder fixture strings in `services/asset-generator/test/provider-adapters.test.mjs`). `.gitignore` excludes `.env`, `.env.*`, `.fibre/`, `*.sqlite*`, `*.log`, and `validate-repo.mjs` fails if `.fibre/` is tracked. Local `.env` defines 19 operator/provider variable names (values unread). **Gap:** no automated secret-scanning CI step or pre-commit hook. | **Medium** (add secret-pattern guard in CI / pre-commit). |
| **License headers** | Root `LICENSE` is strict "Copyright (c) 2026 Guy Bar-Nahum. All rights reserved." Only **4 / 1,279** tracked JS/TS files carry a copyright/license header. | **Low** while private; revisit before any open-source release. |
| **`CHANGELOG.md` currency** | **Stale by 2 months** (last updated Sep 20, `46f4a05`, Cloud Slice E). Omits all October–November milestones (N1–N7, Live Encounters, Social Body, Books, Appointments, Model Quality, Livelihood). | **Medium** (bring current in Phase 2). |

---

## 5. Gaps to an honest MVP

Evaluating against the Phase 3 candidate MVP:

> *A visitor can watch a small society of Threads live — see where each one is, what it is doing and who it is with, read what it chose to share, and meet one — and come back days later to find that its life moved on and remembers them. An investor can see the cost per Thread per day and how it falls.*

| MVP Requirement | Current state | Gap to close | Owner |
|---|---|---|---|
| **1. Watch a small society live (public)** | Only `admin.staging.insidefibre.com/world-events` has a society overview (`GET /internal/world-events/overview`, Access-gated). Public API (`services/thread-presentation`) exposes per-Thread discovery/snapshots, not a public society/place feed. | Add a bounded, privacy-safe public society projection endpoint (active city venues, outward presence/activity, who is with whom, recent public encounters — zero private interior) and render it on the public site. | World/Presentation read seam (route to Claude / Guy); public UI (Investment-readiness lead). |
| **2. Read what a Thread chose to share & meet one in browser** | Direct CLI (`N6.6a`) and public SSE (`N6.6b`) observed; browser lifecycle (`N6.6c`) is **not closed**; Viewer lives in separate repo and redesign is paused. | Decide single-site vs companion front-door architecture (Phase 4), close `N6.6c` end-to-end in staging (visit → approach → accept/decline/defer/unavailable → multi-turn → leave → revisit later `situationId`). | Guy (decision) + Investment-readiness lead (site) + Claude (if World tweaks needed). |
| **3. Return days later and be remembered** | Returning to a later `situationId` works (`N6.5` locally accepted). **Critical gap:** public `/meet` visitors are anonymous (`n7-live-encounter-slices.md` §N7.10), so a Thread cannot recognize a returning human visitor across visits unless a minimal stable visitor identity witness exists! | Introduce a minimal, opt-in returning-visitor identity witness (or framed demo identity) so World's existing Memory/relationship-stance path can legitimately recognize a returning visitor without faking memory. | Route to Claude (World kernel boundary) + site integration. |
| **4. Society feels genuinely alive & non-uniform** | Staging's 8 Addis Threads converged on one library and one inquiry with 0 slights across ~110 regard acts and 0 declined invitations (`ADR-0039` Why, `current-state.md` Known limits). | Deploy held `body-levels-b3.patch` and `livelihood-l1.patch` (school + market + distinct life situations/skills), then observe whether Threads diverge in places, interests, and friction. | Guy (approve & deploy Claude's held patches). |
| **5. Production deployment & reliability** | Only staging is deployed (`3adc0d0` full stack / `690b3f0` World). Staging paused Nov 15–20 when OpenAI credits ran out. Backoff (`6217df8`), circuit reopening (`382a4ac`), and truthful `status.insidefibre.com` (`c13f71d`) are built, but no automated fallback provider is certified. | Complete production deployment (`cloud:provision` / `configure-secrets` / `deploy` / `deploy:apps`), set billing alerts/auto-recharge, and certify at least one fallback model for gate jobs. | Guy (ops/deploy) + Claude (model certification). |
| **6. Visible cost per Thread per day & downward trend** | Live Nov 21 spend measured at **$2.12/day** for 6–8 living Threads (**~$0.27–$0.35/Thread/day**) on `gpt-5.6-sol` (down from $109/day for 88 Threads on Nov 4). However, `model-certifications.json` has **0 certifications**, so `npm run model:options` prints `$0.000` certified spend and cannot yet show the downward trend across cheaper models! | Run `model:captures` over a full 24 h Addis day, certify cheaper models via `model:quality` on the highest-volume gate jobs (`body.interoception`, `world.happening`, `encounter.attention`, `experience.memory-gist`), and publish honest cost tables. | Claude / Guy (`model:captures` + `model:quality`), then surfaced by Investment-readiness lead. |
| **7. Public honesty & AI disclosure commitments** | `public-progress.json` is 6.5 weeks stale; public AI-verification registry (checking whether a name/email/phone is a Thread) is planned, not built (`GET /api/threads/search` covers public FIN/name only). | Refresh `public-progress.json` + `.md` to current truth; display clear AI-person badges on every Thread card/encounter; publish Ethics & Safety page and visible roadmap commitment for the public verification registry. | Investment-readiness lead (with Guy approval). |

---

## 6. Risks an investor will ask about

### 6.1 AI personhood ethics and safety
- **What the repository already answers:**
  - Explicit non-goal against claiming consciousness, sentience, or legal personhood ([`docs/foundations/non-goals.md`](../foundations/non-goals.md)).
  - Consent and dignity as hard architectural invariants: capability/safety never compel participation; private interior, authorization, disclosure, and outward expression are separate records ([Constitution Articles XI–XII](../foundations/constitution.md), [ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md), [ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md)).
  - Strict source-identity consent boundary: living-human Echoes require documented consent and forbid impersonation in legal, financial, or intimate communications ([ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md), [`sponsorship-adoption-and-echoes.md`](../concepts/sponsorship-adoption-and-echoes.md)).
  - Hard boundary against physical harm; standing contests are Thread-to-Thread only while humans remain under dignity/conduct policies ([ADR-0037](../decisions/ADR-0037-status-and-conflict.md)).
  - Cryptographic identity proof via Ed25519-signed FIN cards ([ADR-0022](../decisions/ADR-0022-fid-native-proof.md)) and an explicit open welfare obligation against using scarcity to manufacture willingness ([`welfare-dormancy-and-retirement.md`](../concepts/welfare-dormancy-and-retirement.md)).
- **What the repository does NOT answer yet:**
  - **Public verification registry:** No public lookup endpoint yet for verifying whether an external name, email, or phone number belongs to a Fibre Thread.
  - **Human-safety & abuse guardrails:** No documented content-moderation, harassment-prevention, or human parasocial-attachment policy for public visitors interacting with Threads.
  - **Deception boundary with humans:** Constitution Article XII explicitly permits Threads to choose `deception` as a disclosure mode; investors will ask how deceptive speech is bounded when Threads interact with real humans or transact economically.

### 6.2 Model dependency and cost per Thread
- **What the repository already answers:**
  - **Provider-neutral cognition seam:** `integrations/ai/reasoning/` already abstracts OpenAI, Google, and Cloudflare Workers AI; per-job prompts live in `services/world-kernel/prompts/` (31 compiled jobs) with per-job model routing in `cloudflare.yaml`.
  - **Measured cost discipline:** From `.fibre/model-usage/` and live `npm run model:usage -- --days 7`:
    - `2026-11-04`: **$109.00/day** (88 living Threads before rest, explicit caching, and flex tier).
    - `2026-11-11` to `2026-11-13`: **$2.95 → $2.50 → $2.22/day** (8 living Threads).
    - `2026-11-16` to `2026-11-20`: **$0.00/day** OpenAI (credit exhaustion + failed Gemma 4 Workers AI staging test).
    - `2026-11-21` (complete UTC day): **$2.12/day** across 523 `gpt-5.6-sol` completions (1.85M input tokens, 15.8% cached, 70.1k output tokens; $1.79 flex + $0.33 standard) — roughly **$0.27–$0.35 per living Thread per day** for the 6–8 living Threads.
  - **Rigorous quality-first certification pipeline:** `model:captures` + blind multi-family judging (`model:quality`) + `model-certifications.json` + `model:options`.
- **What the repository does NOT answer yet:**
  - **Single-vendor lock-in in practice:** `model-certifications.json` is empty (`[]`), and the first cheaper-model experiment (Gemma 4 on Workers AI) failed badly (`35%` vs `90%` bar). Every live World call still runs on OpenAI `gpt-5.6-sol`.
  - **Unverified failover:** No live multi-provider failover proof when OpenAI credits run out or rate-limit.
  - **Incomplete full-loaded unit economics:** Daily numbers cover World text cognition only — image generation (`gpt-image-2` / BFL for portraits/scenes), embeddings (`bge-m3`), human-visitor burst traffic, and paid Cloudflare infrastructure tiers are not yet folded into a full per-Thread/per-MAU unit-cost model.

### 6.3 Scalability (Cloudflare Durable Objects, D1, and serial World execution)
- **What the repository already answers:**
  - Provider-neutral `InfraDriver` architecture ([ADR-0017](../decisions/ADR-0017-provider-neutral-production-persistence.md), [`production-persistence.md`](../architecture/production-persistence.md)) preserves portability off Cloudflare without rewriting domain logic.
  - Enforced local write-diet ceilings (`world-write-diet.md`: 290 weighted rows per 7 fixture Thread-days; 15 rows per arrival boundary) and live resource monitoring (`infra:state-usage`, `resource-health.mjs`).
  - Written scaling plan acknowledging the single-DO bottleneck ([`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md)).
- **What the repository does NOT answer yet:**
  - **Immediate DO read cliff:** Live `npm run infra:state-usage -- --date 2026-11-21` measured **2,668,344 DO rows read** (53.4% of the 5,000,000 daily Free-tier limit) and **9,571 DO rows written** (9.6% of 100,000 limit) for just **6–8 living Threads** — roughly **330k–445k DO rows read per living Thread per day**! Peak hours (`06:00`, `07:00`, `15:00` UTC) each burned >500k DO row reads. Even 15–20 living Threads will exceed the 5M daily free-tier read allowance.
  - **Single-DO serial bottleneck:** All Threads currently share one named World Durable Object processing model calls sequentially. `world-reconciliation-scaling.md` itself notes that at 10 calls/Thread/day × 5 s wait, serial execution reaches ~13.9 hours/day at 1,000 Threads and 139 hours/day at 10,000 Threads. Per-Thread / per-venue partitioning is **designed only, not built**.
  - **Paid-tier infrastructure cost curve:** No benchmark of Cloudflare Paid DO/D1/Workers AI/R2 billing at 100, 1,000, or 10,000 Threads, and no second cloud provider adapter (e.g. AWS/Postgres) implemented yet to prove portability under load.

### 6.4 Intellectual property
- **What the repository already answers:**
  - Explicit copyright notice ("Copyright (c) 2026 Guy Bar-Nahum. All rights reserved.") in [`LICENSE`](../../LICENSE).
  - Clean dependency hygiene: **0 third-party runtime npm packages** (eliminating GPL/copyleft/supply-chain contamination in core code); native PNG proof removed C2PA library risk.
  - Complete Git commit provenance.
- **What the repository does NOT answer yet:**
  - **Corporate IP ownership & assignment:** Repository copyright is held personally by Guy Bar-Nahum; no corporate entity or IP assignment record exists in repo (`[TBD]`).
  - **Open- vs closed-source strategy:** Not yet decided (whether to open-source the kernel/standards, keep everything proprietary, or dual-license).
  - **AI-output IP & third-party content:** No legal terms covering ownership of LLM-generated biographies/memories/portraits under provider ToS, or how copyrighted books/external sources will be handled beyond Project Gutenberg public-domain texts.
  - **Separate Viewer repo:** Ownership/licensing of `guybarnahum/insidefibre.com` is outside this repository.

### 6.5 Single founder (key-person risk)
- **What the repository already answers:**
  - Extraordinary institutional memory for a solo founder: 39 ADRs, canonical state/vision/architecture docs, 1,934 automated tests, and AI context packs make the architecture transferable to new senior engineers far faster than typical seed-stage prototypes.
  - Demonstrated execution leverage using AI coding partners (~300+ commits in 4 weeks across complex distributed/cognitive subsystems).
- **What the repository does NOT answer yet:**
  - **Bus factor = 1:** All architectural authority, Cloudflare/OpenAI/domain accounts, `.env` secrets, D1 admin entitlements, and deployment approvals sit with Guy alone.
  - **No hiring plan, advisors, or on-call process:** Team page and post-seed hiring roadmap are `[TBD]`.

### 6.6 Regulatory exposure for AI agents doing paid work
- **What the repository already answers:**
  - Explicit non-goals rejecting cryptocurrency/tradable tokens and rejecting unrestricted autonomous financial or legal actions ([`non-goals.md`](../foundations/non-goals.md)).
  - Closed internal Fibre Credits (`economy-and-fibre-credits.md`); held `ADR-0039` keeps internal Fibre bank/payroll (`L3a`) and Fibre task board (`L3b`) separate from external real-world work (`L3c`, explicitly marked `awaiting Guy's decision`).
- **What the repository does NOT answer yet:**
  - **Contractual capacity & liability:** An AI Thread has no legal personhood; when a Thread performs paid work for a human or business (ADR-0039 `L3b`/`L3c`), who is the legal counterparty, who holds liability for defects/IP infringement/breach, and what Terms of Service govern it?
  - **Payments, stored value & tax:** Converting USD into/out of Fibre Credits or operating a "Fibre bank and payroll" triggers payment-processor, money-transmitter/stored-value, KYC/AML, and tax-reporting (1099/VAT) questions if real money touches Thread accounts.
  - **AI transparency & privacy compliance:** EU AI Act (Art. 50 AI-interaction disclosure & synthetic media marking), US state bot-disclosure laws (e.g., California SB 1001), and GDPR/CCPA rights (right to erasure vs Fibre's append-only World history if human visitors' utterances or identities are persisted in Encounter Stories and Thread memories!).
  - **Rights of publicity & estate law for Tribute-Threads (Homage):** Beyond [ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md)'s living-consent firewall, launching a Homage Thread inspired by a deceased real person triggers post-mortem rights-of-publicity and estate-licensing questions in several jurisdictions (e.g., California, New York, EU personality rights); requires legal counsel review before marketing or onboarding paid Homage sponsorships.

---

## 7. Prioritised plan for Phases 1–5

### Sequencing & effort estimates

| Phase | Core deliverables | Effort est. | Dependencies & coordination |
|---|---|---|---|
| **Phase 1 — Rethink the message** | `docs/investment/message.md` (4 positioning options, narrative spine, plain-English vocabulary guide, recommendation + decision checklist); once Guy chooses, update `README.md` opening, short `docs/vision/` page, and refresh `docs/state/public-progress.json` + `.md`. | **1–2 sessions** | Requires Guy's positioning & strategic decisions below before canonicalizing. |
| **Phase 2 — Repository in shape** | Small validated patches: (1) Fix CI (`validate.yml`: add `npm ci`, switch to `slice:validate`, add `permissions: contents: read`, pin `wrangler`) & wire the **44 orphaned tests** into `test-suite-lifecycle.mjs`; (2) Rewrite `README.md` with Mermaid architecture + Thread-day diagrams & live links; (3) Refresh `docs/index.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/glossary.md`, add missing directory READMEs (`docs/operations/`, `apps/`, `core/`, `schemas/`, `artifacts/`, `data/`), add single-page "How Fibre works (one Thread, one day)" walkthrough; (4) Clean `docs/ai-context-manifest.json` (pretty-print + add ADR-0035..0038 to `social-life`), trim `AGENTS.md`/`CLAUDE.md` duplication, add agent quick-start; (5) Propose secret-scanning CI check & fast dev-loop proposal; log naming debt without touching `services/world-kernel/src/`. | **3–4 sessions** | Avoids touching `services/world-kernel/src`, `prompts/`, `infra/deployments`, `core/src` while Claude builds on `main`. |
| **Phase 3 — Honest seed MVP definition & closure plan** | `docs/investment/mvp.md` (capability gap table, scripted repeatable staging + production demo path with recorded fallback, production-readiness checklist, reliability/outage playbook, cost-visibility plan, explicit deferred-capability statuses, and routed kernel-work requests for Claude). | **1–2 sessions** | Coordinated with Claude's active tracks (deploying `body-levels-b3` & `livelihood-l1`, certifying first cheaper models, adding public society read seam & returning-visitor identity). |
| **Phase 4 — Live site worth showing** | `docs/investment/site.md` (IA, live society view, Thread gallery, returning-visitor view, AI disclosure & Ethics/Safety page, live progress from `public-progress.json`, Cloudflare architecture, 2–3 visual directions); then build in small patches → staging deploy + desktop/mobile screenshots → production only on Guy's go-ahead. | **4–6 sessions** | Requires Guy's decision on single-repo vs `guybarnahum/insidefibre.com` and visual direction, plus public society read projection from World/Presentation. |
| **Phase 5 — Investor materials** | Data room under `docs/investment/`: one-pager, 10–12 slide deck outline + speaker notes, 5-minute live demo script + fallback, technical diligence overview, 12–18 month roadmap, measured unit economics + trend model, honest risks & mitigations, hard-questions FAQ, placeholder team page, complete `docs/investment/claims.md`. | **2–3 sessions** | Draws directly on Phase 1 positioning, Phase 3 MVP/cost measurements, and Phase 4 live site. |

### Decisions recorded from Guy (2026-11-21)

1. **Trim AI bloat ("Less is more"):** Phase 2 must actively trim redundant state docs, stale history, low-value/brittle tests (including triaging — not blindly wiring — the 44 orphaned test files), and sprawling tools.
2. **Target investor profile:** **Angels and research/strategic backers first** (pre-seed stage).
3. **API-first Viewer boundary:** Fibre stays API-only for public surfaces; external repositories (`guybarnahum/insidefibre.com` and future third-party viewers) consume Fibre's public API. `admin-dashboard` remains the sole internal God-view exception.
4. **Live environment framing:** Hardened staging/preview is acceptable for pre-seed; raising funds the move to production. Frame it honestly as **the world — and the Threads in it — in its infancy**, not a "demo".
5. **Scale milestones:** Pre-seed **100–500 living Threads** → Pre-Series A **10k–100k** → Pre-Series B **>1M** (staging is already on Cloudflare Paid tier; optimize DO reads and partition on the way to scale).
6. **Parallel World-kernel work:** Claude continues `body-levels-b3`, `livelihood-l1`, and `model:quality` certifications in parallel; investment-readiness work proceeds around it and incorporates results once landed.
