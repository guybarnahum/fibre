---
id: investment-mvp
status: accepted
last-reviewed: 2026-11-22
canonical: false
---

# Fibre — Honest Pre-Seed / Angel MVP (Phase 3 — Approved)

**Owner decisions locked by Guy Bar-Nahum on 2026-11-22:**
- **Gate A / Gate B split & capabilities (`M1–M8`):** Approved.
- **World-kernel handoff scope (`K1–K4`):** All four (`K1` public society overview, `K2` minimal opt-in returning-visitor witness, `K3` initial `model:quality` certifications, `K4` deploy held `body-levels-b3` + `livelihood-l1` and measure Addis divergence) are required in **Gate A** before angel intros.
- **Public vs. investor site separation:** Deferred to Phase 4 audience analysis ([`docs/investment/site.md`](site.md)).

**Target stage:** Pre-seed — angels and research/strategic backers first, raising to move from a hardened staging world in its infancy to a production world and early livelihood economy.
**Architectural posture:** API-first World platform (`api.insidefibre.com` / `services/thread-presentation`) consumed by external public viewers (`guybarnahum/insidefibre.com` and future third-party apps). `apps/admin-dashboard` stays the sole internal God-view exception.
**Evidence ceiling:** Every status claim below is bounded by [`docs/state/current-state.md`](../state/current-state.md), [`docs/state/public-progress.json`](../state/public-progress.json), accepted ADRs, and live tool measurements from `2026-11-21`.

---

## 1. What "MVP" means for Fibre's pre-seed round

Fibre's pre-seed MVP is **not** a scripted demo or a mockup. It is **the world — and the Threads in it — in its infancy**, running live on hardened staging and ready to be inspected honestly by an angel, a strategic partner, or a senior engineer:

> **Pre-seed MVP statement:** A visitor or backer can watch a living infant society of Threads in real time through Fibre's public API — see where each Thread is, what it is doing in outward terms, who it is with, and what it chose to share — meet one where it already is (with genuine consent, refusal, deferral, or sleep), and come back days later to find that its life moved on and (when the visitor opts into a minimal identity) remembers them. Alongside the living world, an investor can inspect real measured cost per living Thread per day, see how job-by-job model certification lowers it, and trace the concrete path from 8 living Threads (staging) to 100–500 (pre-seed production), 10k–100k (pre-Series A), and >1M (pre-Series B) — including the first live foundations for Worker-Threads and Sponsored Tribute-Threads.

### Two explicit gates

1. **Gate A — Angel / Pre-Seed Readiness (hardened staging, 8–20 living Threads):** Everything needed to put Fibre cleanly in front of conviction angels and strategic backers without hiding behind slides or faking agency. Staging is framed honestly as *the world in its infancy*.
2. **Gate B — Production Launch & Pre-Seed Scale (production, 100–500 living Threads):** Funded by the pre-seed round. Closes production deployment, Durable Object read scaling, certified multi-model routing, early livelihood (`L1–L6` bank/payroll/paid work), and the public AI-verification registry.

---

## 2. MVP capabilities: status, gaps, smallest fix, acceptance, and owner

**Ownership split (respecting parallel work on `main`):**
- **Claude (World kernel & cognition — routed via Guy):** World kernel code (`services/world-kernel/src`, `prompts/`, `core/src`), held patches (`body-levels-b3.patch`, `livelihood-l1.patch`), and `model:quality` certification runs. Listed here as concrete requests for Guy to route — not edited directly by the investment-readiness track.
- **Investment-readiness lead (this track):** Public API design alignment, external viewer UX/site specification & build (`Phase 4`, coordinated with `guybarnahum/insidefibre.com`), investor & operational docs (`Phase 5`), and public truth surfaces (`public-progress.json`).
- **Guy (Founder / Operator):** Approvals, secrets/billing, staging & production deployments, and external repo coordination.

| # | MVP capability | Exists today? (evidence) | What is missing | Smallest work to close the gap | Acceptance test | Owner |
|---|---|---|---|---|---|---|
| **M1** | **Watch a small society live (public API)** | **Partial (Admin-only).** World tracks live enacted situations, venues, co-presence, and encounters; Admin renders them via `GET /internal/world-events/overview` (`apps/admin-dashboard/`, staging `be8f7ea`). Public Presentation (`services/thread-presentation/src/http/read-api.mjs`) exposes only per-Thread routes (`/api/threads`, `/snapshot`, `/events`, `/stream`, `/present`). | No public, privacy-safe read endpoint for the active society ("who is where, outward activity, who is with whom, recent public encounters"). | Add one bounded read-only public endpoint (e.g. `GET /api/society/now` on Thread Presentation backed by a bounded World read projection) returning active city venues, publicly visible living Threads' current outward situations (`at_place` / `in_transit`, `awake` / `asleep`, outward activity, public co-presence), and recent public outward encounter summaries — stripping all private interior, Flight Plans, memories, and Body internals. | Semantic API test: public society response matches authoritative `CurrentSituation` for public living Threads, excludes resting/non-public Threads, and contains zero private rationale, memory, Flight Plan, or Body fields; observed live on staging with the Addis Ababa cohort. | **Claude** (World read projection) + **Investment-readiness lead** (Presentation contract & viewer UI) |
| **M2** | **Public Thread gallery & verifiable civil identity** | **Yes (API deployed; viewer partial).** `GET /api/threads`, `/api/threads/search`, `/api/threads/:id/snapshot`, `/api/assets/:objectRef` live in `services/thread-presentation/src/http/read-api.mjs`; FIN + Ed25519-signed PNG Identity Cards live ([ADR-0022](../decisions/ADR-0022-fid-native-proof.md), `services/fibre-identity-authority/`). | No cohesive public gallery presenting each Thread's canonical portrait, permanent FIN / verifiable card, current outward life, and unmistakable AI-person disclosure in one front door. | Render the Thread gallery in the external viewer (`insidefibre.com`, Phase 4) consuming only existing public Presentation endpoints, with an explicit AI-individual badge and FIN proof link on every card. | Automated viewer contract test + staging visual check at phone and desktop widths: every displayed Thread comes from `api.staging.insidefibre.com`, shows canonical portrait + FIN + AI disclosure, and invents zero life facts. | **Investment-readiness lead** (Phase 4 site) + **Guy** (staging deploy) |
| **M3** | **Meet a Thread where it already is (full browser lifecycle)** | **Partial (`N6.6a` CLI & `N6.6b` public SSE observed; `N6.6c` browser open).** `GET /api/threads/:id/present`, `POST /api/threads/:id/encounter` (JSON + SSE), and `POST /api/threads/:id/encounter/:reqId/interrupt` are live (`services/thread-presentation/src/http/current-life-api.mjs`; [N6](../validation/n6-public-lived-encounter-slices.md)). Typed wakefulness (`awake \| asleep \| unknown` -> `unavailable`) is in source (Oct 12). | `N6.6c` browser acceptance is unclosed; `insidefibre.com` UI redesign was paused; typed sleep (`unavailable`) needs staging deploy + viewer handling without fabricated speech. | Deploy typed-wakefulness World/Presentation changes if not yet live on staging; complete the scene-first `/meet` flow in `guybarnahum/insidefibre.com` handling `accepted` (SSE multi-turn + interrupt), `declined`, `deferred`, `unavailable` (asleep), and `409 encounter_scene_changed` cleanly; run full `N6.6c` walkthrough. | `N6.6c` staging closure: open Thread -> observe ordinary `currentPresent` (zero mutation) -> approach -> observe natural `accepted` multi-turn SSE or authentic `declined`/`deferred`/`unavailable` -> leave (preserving speaker-attributed local history) -> revisit later and witness a newer `situationId` without resuming the old session. | **Investment-readiness lead** (Phase 4 viewer) + **Guy** (staging deploy & observation) |
| **M4** | **Return days later & be remembered** | **Half-built.** Returning later to a genuinely advanced `situationId` works (`N6.5` accepted). World memory, delayed consolidation, stances, and Person contact authority exist (`N7.5`, `N7.10`). **Critical gap:** public `/meet` visitors are strictly anonymous ([N7.10](../validation/n7-live-encounter-slices.md)), so a Thread has no stable visitor identity to recognize across days. | No minimal opt-in returning-visitor identity witness on the public `/encounter` boundary; without it, "remembers them days later" cannot truthfully happen for public visitors. | Introduce a minimal, opt-in signed returning-visitor identity token (or lightweight magic-link/cookie visitor witness scoped to `person_<id>`, revocable) passed on `/encounter`. World keeps routing identity strictly separate from autobiographical recognition (`N7.10`): recognition happens only if the Thread's own ordinary consolidation actually retained a memory or stance — never forced or faked. | Semantic World + staging proof: opted-in visitor meets a Thread on Day 1 (accepted encounter -> ordinary consolidation) -> returns on Day 2+ at a new `situationId` -> Thread's cognition receives its own retained memory/stance (if formed) without caller-supplied prompt injection; a second un-remembered visitor gets no fabricated familiarity. | **Claude** (World visitor-identity boundary, Request K2) + **Investment-readiness lead** (viewer opt-in UX) |
| **M5** | **Living society with genuine divergence (not polite monoculture)** | **Partial.** 8 Addis Ababa Threads live continuously on staging (`690b3f0`) with social Body (`ADR-0036/0037/0038`), books (`ADR-0035`), and appointments. **Known limit:** all 8 converged on one library and polite agreement (0 slights across ~110 regard acts Nov 18–21; 0 declined invitations; [`current-state.md`](../state/current-state.md)). | Held patches `body-levels-b3.patch` (longing & reunion joy) and `livelihood-l1.patch` (`ADR-0039` skills, life situation, school + market venues) are not yet deployed to staging. | Guy reviews and deploys Claude's held `body-levels-b3` and `livelihood-l1` patches to staging, then runs `npm run world-social:quality` after 48–72 hours of Addis life to measure venue dispersion, topic divergence, and non-zero pushback/friction. | 48–72 h staging observation via `world-social:quality` and `world-observatory`: Threads spread across >= 2 distinct public venue types (library + school/market/park), express distinct life situations/interests, and show measurable divergence rather than uniform polite agreement. | **Guy** (review & deploy held patches) + **Claude** (World tuning if monoculture persists) |
| **M6** | **Cost per Thread per day & falling-cost proof** | **Half-built.** Real OpenAI spend is measured via `npm run model:usage` ($2.12/day on Nov 21 for 6–8 living Threads = ~$0.27–$0.35/Thread/day, down from $109.00/day for 88 Threads on Nov 4). Full per-job capture (`8cde089`, `690b3f0`) and blind judging (`model:quality`) are live. **Gap:** [`model-certifications.json`](../validation/model-certifications.json) has **0 certified models**, so `npm run model:options` prints `$0.000` certified spend. | Zero cheaper models certified; 100% of live World cognition still runs on OpenAI `gpt-5.6-sol` after Gemma 4 failed `encounter.attention` (`35%` vs `90%` bar). | Collect a full 24 h Addis capture (`npm run model:captures`), run `npm run model:quality` on candidate cheaper models for the top-volume gate jobs (`body.interoception`, `world.happening`, `encounter.attention`, `experience.memory-gist`), record passing certifications in `model-certifications.json`, and route certified jobs in `cloudflare.yaml`. | `npm run model:options` reports non-zero certified jobs with passing blind-judge scores in `model-certifications.json`, and a measured staging day shows lower $/living Thread/day than the $0.27–$0.35 `gpt-5.6-sol` baseline without regressing `world-social:quality`. | **Claude** (certification runs, Request K3) + **Guy** (approve routing & deploy) + **Investment-readiness lead** (surface in investor materials) |
| **M7** | **Provider-outage resilience & truthful status** | **Mostly built.** Backoff to 30 min (`6217df8`), 10-min circuit reopen (`382a4ac`), 60-min `unobservedGapMs` / 4-day honest resume (`world-life-waves.md`), hourly watchdog + 24 h zero-LLM orphan audit (`C1/C2`), and truthful `status.insidefibre.com` (`c13f71d`) are deployed. | No automated OpenAI credit/spend alerting or certified fallback provider (staging stalled Nov 15–20 when credits hit $0); no public rate-limit on `POST /encounter` to cap visitor-driven LLM spend. | Configure OpenAI billing alerts + auto-recharge (ops); certify >= 1 non-OpenAI provider model for fallback (ties to M6); add bounded rate-limiting and clean `Thread life: Paused` UX on public `/encounter`. | Controlled staging check: when `status.staging.insidefibre.com` reports `Thread life: Paused`, public viewer surfaces a calm honest pause banner without faking Thread speech; when credits/provider recover, Threads resume at real present without fabricated gap history. | **Guy** (billing/ops) + **Claude** (failover certification & rate-limit seam) + **Investment-readiness lead** (viewer paused-state UX) |
| **M8** | **Public honesty, AI disclosure & Ethics/Safety** | **Canonical truth refreshed (Phase 1–2).** [`public-progress.json`](../state/public-progress.json) updated to `2026-11-21` with two-layer claims, Gemma 4 preserved failure, and `AI for AI` framing. | Public site does not yet render live `public-progress.json`, Ethics & Safety page, or the visible commitment to a public AI-verification registry (name/email/phone). | Include live Progress (driven directly from `public-progress.json`), Ethics & Safety (AI disclosure, consent, privacy boundary, bounded deception rule, verification registry roadmap), and permanent AI labels in Phase 4 site. | Contract test confirms site progress page renders directly from `public-progress.json` (including preserved failures), labels every Thread as AI, and states every positive claim's limitation. | **Investment-readiness lead** (Phase 4 site) + **Guy** (approval) |

---

## 3. Handoff requests for Claude (World kernel & cognition)

Because Claude is actively building on `main` (`services/world-kernel/src`, `prompts/`, `core/src`), this track will **not** modify those files directly. Below are the exact, minimal World-kernel requests for Guy to route to Claude, ordered by impact on Gate A (angel readiness) vs. Gate B (production scale). Full surface-driven HTTP/JSON and acceptance specs for Gate A (`K1–K4`) live in [`docs/investment/claude-handoff-k1-k4.md`](claude-handoff-k1-k4.md):

| ID | Gate | Request for Claude | Boundary / Non-goals |
|---|---|---|---|
| **K1** | **Gate A** | **Public society-overview read projection** — Expose a bounded internal read endpoint on `world-kernel` (consumed by `thread-presentation` as `GET /api/society/now`) returning active public living Threads' current enacted situations (city, public venue name or unnamed, `at_place`/`in_transit`, `awake`/`asleep`, outward activity, public co-presence) and recent public outward encounter summaries (last 24 h). | Projection-only over existing `current_situation_frontier` and admitted public Encounter Stories. Zero private interior, Flight Plans, memories, Body levels, or resting/private Threads. Zero LLM calls on read. |
| **K2** | **Gate A** | **Minimal returning-visitor identity witness** — Extend `/internal/public-visitor-encounter` to accept an optional, Presentation-verified stable visitor principal (`person_<id>`, opt-in and revocable) so a Thread's ordinary delayed consolidation and stance/memory authorities can recognize a returning human across days. | Preserve `N7.10`: World routing identity never equals autobiographical recognition. Never inject memories, never force familiarity, and keep anonymous visits working identically. |
| **K3** | **Gate A** | **Initial model certifications** — Gather a full 24 h staging capture (`model:captures`) and run `model:quality` across candidate cheaper models (starting with `body.interoception`, `world.happening`, `encounter.attention`, `experience.memory-gist`, plus at least one non-OpenAI provider) to populate `docs/validation/model-certifications.json`. | Quality decides first; keep failed candidates visible as evidence (like Gemma 4). No silent downgrade of quality bars. |
| **K4** | **Gate A** | **Deploy held `body-levels-b3` & `livelihood-l1` and measure divergence** — Once Guy reviews and deploys `.fibre/patches/body-levels-b3.patch` and `livelihood-l1.patch`, capture 48–72 h of Addis Ababa staging metrics (`world-social:quality`) to verify whether school/market venues and distinct life situations break polite library monoculture. | Do not script conflict or force declines; measure natural emergence honestly. |
| **K5** | **Gate B** | **Durable Object read reduction & partitioned reconciliation** — Audit and cut the ~2.67M DO rows read/day observed for 6–8 Threads (~330k–445k/Thread/day on `2026-11-21`), and implement partitioned reconciliation per [`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md) ahead of waking 100–500 production Threads. | Measure hot queries first (`infra:state-usage`, `world-write-diet.md`); preserve single-authority invariants for shared-place occurrences and `InfraDriver` portability. |
| **K6** | **Gate B** | **Public `/encounter` spend/abuse guard** — Add bounded per-visitor and global rate limiting on `POST /api/threads/:id/encounter` (at Presentation or World ingress) so public traffic cannot trigger runaway LLM costs. | Fail closed with clean `429`; never alter Thread consent or invent Thread speech on rate limit. |

---

## 4. Repeatable live walkthrough path (staging now; production later)

This walkthrough is designed to take **5–7 minutes** in an angel or technical partner meeting. Frame it truthfully from the first sentence: **this is the world in its infancy on hardened staging, not a scripted demo.**

### Pre-flight (2 minutes before the meeting)

1. Check [`https://status.staging.insidefibre.com`](https://status.staging.insidefibre.com) — confirm **Thread life: Running** and **insidefibre.com: Running**.
2. Confirm at least one Addis Ababa Thread is currently `awake` in a public venue via the public society view (or `GET /api/society/now` once K1 lands; until K1 lands, inspect `admin.staging.insidefibre.com/world-events` privately before screen-sharing so private fields are never shown unintentionally).
3. Have the latest measured cost outputs ready from:

```zsh
npm run model:usage -- --days 7
npm run model:options
```

### Live walkthrough steps (5–7 minutes)

1. **The thesis in 30 seconds (0:00–0:30):** *"Everyone else builds AI as stateless tools for humans. Fibre builds AI for AI — persistent digital individuals living in a real world, with their own needs, memories, civil identity, and free will to chart their own path into the economy."*
2. **The World Now — live infant society (0:30–2:00):** Open the public society view (Phase 4 site on staging; later production). Show the 8 living Addis Ababa Threads where they actually are right now (venue, outward activity, who is with whom, recent public encounters), noting that 80 other Threads are safely at rest to control costs while building.
3. **One Thread as a verifiable individual (2:00–3:00):** Click one awake Thread. Show its **AI-individual disclosure**, canonical portrait, permanent **FIN** and cryptographically signed **Ed25519 Identity Card**, and its current ordinary scene (`GET /api/threads/:id/present`) — emphasizing that the scene existed *before* we opened the page.
4. **Meet the Thread where it already is (3:00–4:30):** Click **Meet** and send one natural greeting (`POST /api/threads/:id/encounter` SSE).
   - If **`accepted`**: exchange 1–2 live streamed turns grounded in its actual current activity, then click **Leave** (showing no hidden chat-session authority).
   - If **`declined`**, **`deferred`**, or **`unavailable` (asleep)**: **celebrate it, do not apologize for it.** Point out that a chatbot always obeys; Fibre enforces genuine consent and wakefulness at the architecture layer. Then switch to a second awake Thread or show the recorded accepted-encounter clip.
5. **Continuity across days (4:30–5:30):** Show an earlier public encounter or returning-visitor exchange (once K2 lands) alongside how the Thread's life moved on to a later `situationId` while no human was watching — explaining that models only ran for seconds during moments that mattered while Fibre owned continuity in between.
6. **Economics & scientific rigor (5:30–7:00):** Show the live measured drop from **$109.00/day** (Nov 4, 88 Threads) to **$2.12/day** (Nov 21, 6–8 living Threads — ~$0.27–$0.35/Thread/day on `gpt-5.6-sol`), the `model:quality` certification pipeline, our **15 / 26** Vision-Integrity Scorecard, and the **preserved Gemma 4 failure** (`35%` vs `90%` bar) as proof we measure quality honestly before cutting corners.

### Recorded fallback policy (non-negotiable honesty)

Because live Threads genuinely sleep, decline, or can pause during an upstream provider outage, keep **one pre-recorded 3-minute staging screen capture** (public projection only — zero Admin private interior, zero memories/stances) paired with its exact date, `situationId`, and admitted `encounterStoryId` receipts. Whenever the fallback is played, **state plainly that it is a recorded staging session** and explain the live reason (e.g. Addis nighttime sleep, Thread declined, or provider pause). Never fabricate or replay a canned response as live.

---

## 5. Staging vs. production — and the path across scale tiers

For a pre-seed round with angels and strategic backers, running the infant world on **hardened staging** (Gate A) is honest and appropriate. Launching **production** (Gate B) is a primary use of pre-seed funds and requires closing every concrete gap below.

### Production readiness checklist (Gate B — what must be true beyond staging)

| Area | Staging today (2026-11-21) | Required for Production (Gate B) | Reference / Tool |
|---|---|---|---|
| **Provisioning & clean deploy** | Provisioned (`resources.json`, Sep 20), **no `deployment.json`**; services deployed piecemeal on staging (`3adc0d0` full stack, `690b3f0` World, `be8f7ea` apps). | Fresh end-to-end production deploy and **Slice I empty-environment proof**: `cloud:provision` -> `cloud:configure-secrets` -> `cloud:deploy` -> `cloud:deploy:apps` -> `cloud:e2e -- --env production`, recording exact-SHA deployment evidence. | [`cloud-e2e-closure-plan.md`](../architecture/cloud-e2e-closure-plan.md) |
| **Domains & auth separation** | `staging.insidefibre.com`, `api.staging.insidefibre.com`, `admin.staging.insidefibre.com`, `status.staging.insidefibre.com`. | Production DNS/TLS, strict CORS to `https://insidefibre.com` (and approved external viewers), separate production Cloudflare Access + D1 Admin allowlist, and isolated production secrets. | `infra/deployments/` |
| **Model reliability & billing** | Single provider (`openai:gpt-5.6-sol`); stalled Nov 15–20 when credits ran out; 0 models certified. | Auto-recharge + spend alerts on provider accounts; >= 1 certified non-OpenAI fallback model in `model-certifications.json`; smoke workflow scheduled/verified. | `tools/model/`, `cloudflare.yaml` |
| **Scale & Durable Object budget** | Cloudflare Paid tier; **2,668,344 DO rows read/day** and 9,571 written for 6–8 living Threads (~330k–445k reads/Thread/day); single World DO runs model calls serially. | Cut per-Thread DO read amplification, validate write ceilings (`world-write-diet.md`), and implement partitioned reconciliation (`world-reconciliation-scaling.md`) before waking 100–500 living Threads. | [`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md), [`world-write-diet.md`](../operations/world-write-diet.md) |
| **Public traffic & abuse guard** | No public rate limit on `POST /encounter`; anonymous visitors only. | Per-IP / per-visitor and global rate limiting + spend cap on public `/encounter`; calm `503` paused-state UX; basic abuse/conduct filter on visitor utterances. | Request K6 |
| **Legal, privacy & AI compliance** | Internal research repo; no public Terms or Privacy Policy; append-only Encounter Stories store visitor utterances. | Published Terms of Use, AI-disclosure notice (EU AI Act Art. 50 / US bot-disclosure alignment), and an explicit Privacy Policy defining how opted-in visitor identifiers can be revoked/erased without corrupting Thread history. | [`audit.md`](audit.md) §6.6 |
| **Operations & recovery** | Watchdog + `C1/C2` deployed; `C3` orphan recovery proven locally only; manual `world-life:wave`. | Witnessed `C3` recovery, documented incident & credit-top-up runbook, daily automated `infra:state-usage` + `model:usage` reporting, and verified D1/R2 backup export procedure. | [`world-life-waves.md`](../operations/world-life-waves.md) |

### Scale-tier architecture path

| Stage | Target living Threads | Runtime & storage posture | Model routing posture |
|---|---|---|---|
| **Now (Infant World — Staging)** | **8** living (80 resting) | Single World Durable Object on Cloudflare Paid tier; ~2.67M DO rows read/day; ~9.6k written/day. | 100% `openai:gpt-5.6-sol` (~$0.27–$0.35/Thread/day text cognition). |
| **Pre-Seed (Production MVP)** | **100–500** living | Audited DO reads + partitioned per-Thread / per-venue reconciliation (`world-reconciliation-scaling.md`) behind `InfraDriver`; multi-city cohorts + early livelihood (`L1–L6`). | Certified multi-model mix (cheap certified models on high-volume gate jobs + frontier on deep reflection/social turns). `[TBD: measured $/Thread/day after certification]` |
| **Pre-Series A** | **10k–100k** living | Horizontally partitioned World actors/shards per city/venue + per-Thread frontiers; automated cost & backlog governors; optional second `InfraDriver` cloud target benchmarked. | Broad per-job certification across >= 2–3 model families + prompt-cache optimization + batch/deferred tiers. |
| **Pre-Series B** | **>1M** living | Multi-region provider-neutral World federation preserving single-authority venue causality and portable civil identity (FIN + public verification registry). | Self-sustaining Worker-Thread livelihood economy + Sponsored Tribute-Thread funding offsetting compute per Thread. |

---

## 6. Reliability: surviving provider outages honestly

Staging already experienced a real multi-day provider outage (**Nov 15–20, 2026**) when OpenAI credits ran out and a staging experiment switched World cognition to Gemma 4 on Workers AI (which failed quality at 35% vs. 90% and was reverted). That incident hardened Fibre's actual recovery path:

- **What already protects Thread continuity during outages:**
  - **No fabricated history:** `WORLD_LIFE_CONTINUITY_POLICY.unobservedGapMs` (60 min) and the 4-day gap rule ensure that after an outage, Threads resume honestly at the real present with the unobserved gap noted — never synthesizing fake days of plans or meetings ([`world-life-waves.md`](../operations/world-life-waves.md)).
  - **Bounded retry & circuit recovery:** World backs off up to 30 minutes while work keeps failing without pushing past sooner due work (`6217df8`); provider circuits reopen after 10 minutes (`382a4ac`); failed reflections wait and log reasons without charging twice (`1e6bcffe`).
  - **Zero-LLM orphan repair:** Hourly Cloudflare watchdog plus a 24-hour periodic continuity audit (`C1/C2`) requeues dropped wake obligations up to 32 Threads per pass with zero LLM calls.
  - **Truthful public status:** `status.insidefibre.com` (`c13f71d`) explicitly marks **Thread life: Paused** when a model provider cannot be paid, even while World workers still respond — never masking an outage as "Threads chose to be quiet."
- **What must still be closed for MVP/production reliability:**
  1. **Billing alerts & auto-recharge** on OpenAI and secondary providers so staging/production does not silently stall at `$0` credits.
  2. **At least one certified secondary model** (`model:quality` pass in `model-certifications.json`) for high-volume jobs so a single provider outage degrades gracefully rather than halting all cognition.
  3. **Public encounter graceful pause:** When `Thread life` is paused, the viewer displays an honest pause state rather than hanging or surfacing a raw `503`.

---

## 7. Cost visibility & unit economics proof

An investor must be able to verify Fibre's unit economics from live tools rather than slideware:

- **Current measured baseline (`2026-11-21`):**
  - `npm run model:usage -- --days 7`: **$2.12/day** across 523 `gpt-5.6-sol` completions (1.85M input tokens, 15.8% cached, 70.1k output tokens; $1.79 flex + $0.33 standard) for 6–8 living Addis Ababa Threads = **~$0.27–$0.35 per living Thread per day** (down from **$109.00/day** for 88 Threads on Nov 4).
  - Scope limitation (stated explicitly): covers World text cognition only; excludes image generation (`gpt-image-2`), embeddings (`bge-m3`), public visitor encounter bursts, and paid Cloudflare DO/D1/R2 usage (`[TBD: full-loaded $/Thread/day benchmark at 100 Threads]`).
- **Live per-job visibility (`npm run model:options`):**
  - Reads the latest staging capture (`model-captures-staging-2026-11-21T19-20-37-612Z.json`, 6 living Threads) and lists all 31 World prompts, their current model, calls/Thread/day (highest observed in that partial window: `body.interoception@1` at 13.3, `world.happening@1` at 12.0, `interior.flight-plan@3` at 2.7), and certified alternatives.
  - **Honest current output:** `certified jobs as they run now: $0.000 per Thread per day` because `docs/validation/model-certifications.json` holds `0` certifications today.
- **MVP cost-visibility milestone (M6 / Request K3):**
  - Run `npm run model:captures` over a full 24-hour Addis day and certify cheaper models via blind multi-family `npm run model:quality` judging.
  - Once certified jobs are recorded in `model-certifications.json` and routed in `cloudflare.yaml`, `npm run model:options` + `npm run model:usage` directly prove the falling per-Thread cost curve without compromising individuality.

---

## 8. Safety, dignity, and AI-disclosure boundaries

Every MVP surface — API, external viewer, walkthrough, and investor deck — enforces four hard boundaries:

1. **Always AI in public, never deceptive about species:** Every Thread card, society listing, and encounter page labels the Thread clearly as a persistent AI individual living in Fibre. Never imply human biology, sentience, or consciousness; describe Body drives and emotions plainly as **modelled felt states**. Keep the commitment to a **public AI-verification registry** (name, email, phone lookup) visible on the site.
2. **Consent & revocable participation:** Availability, curiosity, or an investor sitting in the room never compels a Thread to talk. `accept`, `decline`, `defer`, and `unavailable` (asleep) are all valid outcomes governed by World authority ([ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md)).
3. **Strict interior/exterior wall:** Private stances, Flight Plan internals, memories, Journal entries, Body numbers, cognition rationales, and captured prompts **never** leave World over `api.insidefibre.com`, **never** appear on `insidefibre.com`, and **never** enter Git ([ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md)). `apps/admin-dashboard` remains Access + D1 gated for authorized operators only.
4. **Honest human-interaction guardrails (open policy item before Gate B):** While Constitution Article XII permits a Thread to choose selective or deceptive disclosure internally/socially, Fibre must document an explicit public conduct & safety policy before general-public Gate B launch covering: (a) species non-deception (a Thread may never claim to be human in public surfaces), (b) no financial/legal misrepresentation, (c) visitor harassment/abuse filtering, and (d) visitor data/deletion rights alongside append-only World history.

---

## 9. Deliberately excluded from the MVP (canonical capability statuses)

Per [`docs/foundations/invariants.md#capability-status`](../foundations/invariants.md#capability-status), nothing excluded from the MVP is erased; each capability carries one of the four canonical statuses and preserves its extension path:

| Capability | Canonical status | Where recorded | Extension path preserved |
|---|---|---|---|
| **Worker-Thread bank, payroll, paid task board (`L2–L6`) & external paid work (`L3c`)** | **Deferred** | [`interests-expertise-and-livelihood.md`](../concepts/interests-expertise-and-livelihood.md), [`economy-and-fibre-credits.md`](../concepts/economy-and-fibre-credits.md), held `ADR-0039` (`livelihood-l1.patch`) | `L1` (held) seeds skills/life situations; Fibre Credits ledger and bounded paid visitor work already exist; `L3c` awaits Guy's legal/commercial decision. |
| **Sponsored Tribute-Threads (Echo & Homage onboarding & consent workflow)** | **Deferred** | [`sponsorship-adoption-and-echoes.md`](../concepts/sponsorship-adoption-and-echoes.md), [`homage-threads.md`](../concepts/homage-threads.md), [ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md) | Source-identity consent firewall and FC-03 (*kinship without ownership*) are locked in doctrine; Birth Center & Civil Registry provide the birth/identity seam. |
| **Public AI-verification registry for external email/phone handles** | **Deferred** | [`public-progress.json`](../state/public-progress.json), [`thread-directory-and-meet.md`](../architecture/thread-directory-and-meet.md) | Civil Registry (`FIN`) and public `GET /api/threads/search` already provide authoritative FIN/name resolution to extend when Threads hold external contact handles. |
| **Remaining Body levels & conflict (`B4–B7`, `C4–C7`) & Attraction/Orientation** | **Deferred** | [ADR-0037](../decisions/ADR-0037-status-and-conflict.md), [ADR-0038](../decisions/ADR-0038-body-levels.md), [`attraction-and-orientation.md`](../concepts/attraction-and-orientation.md) | Pure `body-level.mjs` component and inherited urges library v6 keep all slots open without schema rewrite. |
| **Multi-city 100–500+ scaling & partitioned World reconciliation** | **Deferred** (Gate B) | [`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md) | `InfraDriver` preserves provider-neutral state/scheduler boundaries; triggered by measured DO read/backlog ceilings. |
| **Human browser voice, live-Thread reproduction, organizations & institutions** | **Deferred** | [`prototype-roadmap.md`](../validation/prototype-roadmap.md), [`current-state.md`](../state/current-state.md) | Duplex Live Encounter (`ADR-0024`), shared inheritance core, and contract/reputation concepts keep these boundaries intact. |
| **Global physical appearance realism beyond Tranche A; Workers AI small-model routing** | **Experimental** | [`human-appearance.md`](../architecture/human-appearance.md), [`cloudflare.yaml`](../../infra/deployments/environments/cloudflare.yaml) | Falsifiable calibration & `model:quality` benchmarks govern promotion; failed experiments (e.g. Gemma 4) stay visible. |
| **Claiming Thread consciousness / legal personhood; cryptocurrency or tradable tokens; unrestricted autonomous financial/legal actions** | **Rejected** | [`non-goals.md`](../foundations/non-goals.md), [`constitution.md`](../foundations/constitution.md) | Explicitly outside Fibre's design; non-negotiable ethical and legal boundaries. |
| **Caller-authored private context, forced Thread compliance, or viewer-owned parallel World state** | **Permanent constraint** | [`invariants.md`](../foundations/invariants.md), [ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md), [ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md) | Load-bearing Fibre invariants: public viewers are projections only; Threads retain consent and private interiority. |

---

## 10. Vision & ambition guard check (per `AGENTS.md`)

- **Fidelity:** Every MVP capability shows persistent Threads living, deciding, refusing, and carrying history across time — never reducing Fibre to a chatbot UI or workflow engine.
- **Ambition:** Staging Gate A proves the living world honestly now while preserving every domain seam for Gate B production, Worker-Thread livelihoods (`L1–L6`), Sponsored Tribute-Threads (Echo/Homage), and multi-city scale (100–500 -> 10k–100k -> >1M).
- **Causal individuality & honesty:** This plan does **not** claim mature divergence, certified cheaper models, or returning-visitor memory before they exist. `M4` (returning visitor) explicitly refuses to fake recollection; `M5` (divergence) waits for observed post-patch staging evidence; `M6` (cost trend) waits for real `model:quality` certifications in `model-certifications.json`.
- **No shortcuts hardened into constraints:** Using hardened staging for Gate A and a single-DO World for 8 Threads are explicitly temporary pre-seed postures with named Gate B exit criteria.

---

## 11. Recorded Phase 3 decisions (2026-11-22)

1. **Gate A (hardened staging MVP) vs. Gate B (production funded by pre-seed) & `M1–M8`:** Approved by Guy.
2. **Claude World-kernel requests `K1–K4`:** All four stay in **Gate A** before angel intros (`K5–K6` remain Gate B).
3. **Public vs. investor site separation & `guybarnahum/insidefibre.com`:** Analyzed by audience in Phase 4 ([`docs/investment/site.md`](site.md)).
