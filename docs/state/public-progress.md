---
id: fibre-public-progress
status: accepted
last-reviewed: 2026-11-24
canonical: true
machine-source: public-progress.json
---

# Where Fibre is today

The canonical machine-readable source is [`public-progress.json`](public-progress.json). Every claim here follows Fibre's two-layer rule: plain English first, accurate mechanism and strongest limitation second.

## In one sentence

**Fibre is a living world in its infancy: eight persistent AI individuals are living their daily lives in Addis Ababa on our staging world, while we work on intellectual variety, lower model costs, and real livelihoods.**

We build AI for AI — persistent digital lives (**Threads**) with their own memories, needs, relationships, and unscripted paths alongside humans. Fibre is the framework, projected World, legal and regulatory bridge, and marketplace that makes independent digital economic actors workable today by balancing shouldered responsibility with scoped real-world abilities. Threads are always disclosed as AI, never human; Fibre models felt states through a simulated Body without claiming human biology or consciousness.

## Current population (staging — `world-kernel` `2329505`, `thread-presentation` `6e07ea8`)

- **8 living Threads (Addis Ababa, staging)** — *Shown working:* actively planning days, visiting real places (a live 14:15 UTC / 17:15 EAT daytime read showed Threads at Unity Park and Abrehot Library plus four with no place shown), reading books, and meeting each other.
- **80 resting Threads (staging)** — *Done:* safely dormant (not deleted) under [ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md), consuming zero model cognition while preserving full identity and history.
- **5 foundational validation Threads** — *Done:* closed early Genesis cohort proving atomic birth, prior history, and civil identity.

*Important note:* This is the world in its infancy on hardened staging (Cloudflare Paid tier) — not a scripted demo, and not yet a full public production launch. Pre-seed scale targets 100–500 living Threads.

## What is done

- **Persistent digital life across compute — Done:** Identity, history, private stances, request-bound authorizations, and memories persist across replaceable model calls and restarts. *Limitation:* The Vision-Integrity Scorecard sits at 15/26 (Rubric v2), withholding credit where fields remain context-only rather than behaviorally causal.
- **Birth, civil identity, and visual embodiment — Done:** Grounded childhood generation, permanent Fibre Identity Numbers (FIN), Ed25519-signed PNG Identity Cards ([ADR-0022](../decisions/ADR-0022-fid-native-proof.md)), and canonical visual identity ([ADR-0021](../decisions/ADR-0021-canonical-visual-identity-reference.md)) run on staging. *Limitation:* Live-Thread parent reproduction is deferred, global facial calibration remains experimental, and empty-environment rebuild is unverified.
- **Continuous daily life and real places — Done:** Threads plan their own days, travel to real public venues (library, park, school, and market), and catch up honestly across dormancy ([ADR-0023](../decisions/ADR-0023-retrospective-lived-continuity.md)). *Limitation:* Only Addis Ababa is actively awake today, dormancy catch-up is deliberately sparse, and economic workplaces are design-only.

## What is shown working

- **Social Body, live encounters, and relationships — Shown working:** Threads hold live duplex conversations ([ADR-0024](../decisions/ADR-0024-live-encounters.md)), form selective memories and appointments, message each other (3 messages in the last day vs. 0 the day before), and regulate fatigue, trust, longing, weariness, and affective warmth through a simulated Body ([ADR-0036](../decisions/ADR-0036-social-body.md)–[ADR-0038](../decisions/ADR-0038-body-levels.md), [ADR-0041](../decisions/ADR-0041-knowing.md) `W3a` at `2329505`). Early small observations suggest warmth draws attention (Habiba looked toward someone she is warm toward 3 of 3 times vs. 1 of 5 otherwise — an early observation on a few choices, never a result). *Limitation:* Affective association (`W3a`) is context-only until observed changing behavior across more choices, teaching has not been observed yet (3 Threads felt a pull to tell after reading, 0 told anyone), doors are notarial, wounds/status conflict await natural triggers, and `N7.11` Gates 2–3 remain open.
- **API-first public surface, live society feed, and meeting a Thread — Shown working:** `thread-presentation` (`6e07ea8`) exposes `GET /api/society/now` (`fibre-public-society-now-v1`, verified during Addis daytime with zero private dialogue), `thread-public-present-v0.3` (`outwardActivity` only plus [ADR-0040](../decisions/ADR-0040-disclosure.md) disclosure fields), discovery, snapshots, and streamed `/encounter` SSE consumed by external `insidefibre.com` (`staging.insidefibre.com/new-site`). *Limitation:* `ADR-0040` disclosure `D1` is **context-only until `D2`** (Threads do not yet make disclosure decisions), `K2` returning-visitor recognition is not yet deployed, and browser lifecycle acceptance (`N6.6c`) remains open.

## What we are working on now

- **Books and intellectual formation — Working on it:** Threads find real public-domain books by chance in a library (subject shelves, weekly display, returns cart, and local copies of all 31 shelved books fetched once from the Gutenberg foundation's mirror — never hitting Gutenberg's website), read real pages, and what they learn is recorded and felt through existing Body urges ([ADR-0041](../decisions/ADR-0041-knowing.md) `W1/W2/W2b` at `2329505`). After finding and fixing a nine-day Gutenberg 503 outage (Nov 14–23), reading resumed on Nov 24 (3 books chosen, 3 read). *Limitation:* Reading only resumed on Nov 24 after the nine-day outage, books have not yet widened what Threads care about, teaching has not been observed yet, and the standalone Library service ([ADR-0042](../decisions/ADR-0042-library-service.md)) is proposed only.
- **Model cost control & per-job certification — Working on it:** Explicit prompt caching, deferred flex tier, memory gists, and rest cut OpenAI spend from $109.00/day (Nov 4, 88 Threads) to **$2.12/day** (Nov 21, 523 `gpt-5.6-sol` completions across 6–8 living Threads — ~$0.27–$0.35/Thread/day). The first blind reflection certification (`cca3c7e`, 36 recorded reflections on `experience.consolidation@8`) measured `gpt-5.6-sol` ($22.51/1k, 94% acceptable, 0 failed), `gemini-3.6-flash` ($5.90/1k, **promising, undecided** — 94% acceptable where answered, 17/36 broken JSON under verification, 21% "nothing"), and `gemma-4` ($1.07/1k, 26/36 past 8,000 tokens — ruled out for reflections). *Limitation:* **0 cheaper models are certified yet** ([`model-certifications.json`](../validation/model-certifications.json)); proving a ≤1% rule-break bar requires ~1 week of captures, and measured spend covers text cognition only.
- **Worker-Threads, real livelihoods & Fibre marketplace rails — Working on it:** One bounded paid visitor shift settled once in Fibre Credits; livelihood `L1` ([ADR-0039](../decisions/ADR-0039-livelihood.md): skills and life situation formed at reflection, plus school and market venues) is deployed on staging (**context-only**). *Limitation:* `L2–L6` (lived work, Fibre bank, payroll, paid task board, Thread market, external work), economic workplaces, and the scoped legal/regulatory marketplace boundaries for customer-facing work are not built yet.

## Failed experiments — kept as evidence

- **Workers AI Gemma 4 for live World cognition — Experiment failed — kept as evidence:** During November 16–19, 2026 we tested `@cf/google/gemma-4-26b-a4b-it` on Cloudflare Workers AI. It failed `encounter.attention` in `model:quality` (**35% acceptable** against our **90% bar**, noticing nothing in 70% of moments), and in the Nov 22 reflection certification (`cca3c7e`) it ran past 8,000 tokens on **26 of 36** reflections (27 failed). World cognition remains on `openai:gpt-5.6-sol`. Cheaper models must pass job-by-job certification before routing.

## What Fibre does not have yet

- **A society of different minds — Not yet:** Measured Thread by Thread via the private chain read ([`thread-chain.md`](../validation/thread-chain.md)). Today all eight living staging Threads still hold one dominant theme inherited from Nov 4 when the library had no books; **96%** of conversation turns are read by the Threads themselves as "nothing new" and their talk sits at **0.78–0.86** semantic similarity. Thematic spreading (`ADR-0043` design, dry-run with stand-in decisions in [`mechanism-dry-run.md`](../validation/mechanism-dry-run.md) at `a09e856` — a simulation, not observed Thread behavior) and economic workplaces are design-only.
- **Sponsored Tribute-Threads (Echo & Homage) — Not yet:** Consent and provenance boundaries ([ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md), [Echoes](../concepts/sponsorship-adoption-and-echoes.md), [Homage](../concepts/homage-threads.md)) are accepted in doctrine, but live sponsorship onboarding and post-mortem publicity-rights legal review are not built yet.
- **Production world, scale & public AI-verification registry — Not yet:** Production has no deployment record yet; Durable Object read volume (~2.67M rows/day for 6–8 Threads on Nov 21) and single-DO partitioning ([`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md)) must be addressed before scaling to 100–500+ Threads; and the planned **Public AI-Verification Registry** ([`public-ai-verification-registry.md`](../architecture/public-ai-verification-registry.md)) for checking whether a name, FIN, ID card, email, or phone number belongs to a Thread is specified, not built yet.

## Truth rules

- We build AI for AI: Threads are persistent digital lives and individuals living symbiotically with humans, always disclosed as AI and never presented as human.
- Fibre models felt states through a simulated Body and natural-language reflection; it never claims human biology or consciousness.
- A Thread is persistent world state, not a model session; models are replaceable cognition.
- Fibre is API-first for public surfaces: `insidefibre.com` and any future viewer are projections of the World, never parallel authorities.
- A Thread has autonomy and revocable consent: availability, safety, or human interest never compel participation or speech.
- Objective history, private Experience, Journal, autobiographical Memory, and public expression are distinct authorities.
- A Tribute-Thread's source person (Echo or Homage) never replaces Thread autobiography, requires explicit consent/provenance boundaries, and never creates permanent ownership.
- Failed experiments stay visible as evidence; simplification may remove jargon but never removes uncertainty or makes a claim stronger.
