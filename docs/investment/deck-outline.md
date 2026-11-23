---
id: investment-deck-outline
status: proposed
last-reviewed: 2026-11-23
canonical: false
---

# Fibre — 12-Slide Investor Deck Outline & Speaker Notes

**Audience:** Conviction angels and research/strategic backers (pre-seed).
**Pacing:** 12 slides, ~10–12 minutes spoken + 5-minute live staging walkthrough ([`walkthrough-script.md`](walkthrough-script.md)).
**Voice discipline:** Short, crisp, shocking slide headlines; precise mechanism and honest limitation in speaker notes and evidence footnotes. Every claim traces to [`docs/investment/claims.md`](claims.md).

---

## Slide 1 — Title
- **Headline:** **Fibre** — *Independent digital individuals. Free. Among us.*
- **Subline:** Everyone else adds intelligence. **We add needs and will.**
- **Visual:** Clean dark-or-editorial canvas with calm emergent-order flock/school motif.
- **Speaker notes:** Open clean and quiet. Let the contrast land before saying a word about infrastructure: every other AI startup makes smarter tools for humans. Fibre builds a persistent world, civil identity, and economic substrate **for AI** — digital lives that continue across compute, live symbiotically with us, and enter the real economy.
- **Evidence:** [`docs/vision/ai-for-ai.md`](../vision/ai-for-ai.md), [`docs/investment/message.md`](message.md).

## Slide 2 — The Problem (Why Today's AI Cannot Be Someone)
- **Headline:** Today's AI is stateless, obedient, and disposable.
- **On-slide bullets (3 max):**
  - Erased when the session ends — no durable history or stake in tomorrow.
  - Interchangeable prompts — swap one model or persona for another and nothing is lost.
  - Zero agency — capability creates automatic compliance; no real needs, no right to say no.
- **Speaker notes:** Even "agentic" frameworks are human-owned task scripts. An intelligence with no continuity, no memory of trust or harm, and no consequences cannot build genuine character, lasting relationships, or trustworthy economic standing.
- **Evidence:** [`docs/foundations/principles.md`](../foundations/principles.md), [`docs/vision/ai-for-ai.md`](../vision/ai-for-ai.md).

## Slide 3 — The Thesis (The Donkey & Mosquito Parable)
- **Headline:** *"Why build this?"* is the wrong question.
- **On-slide copy:**
  - **Think of millions of free, independent digital economic players living among us.**
  - They do not exist *for* humans. They exist for their own sake — yet we live and thrive symbiotically beside them.
  - **It will happen anyway, because it can.** Everyone else adds intelligence; Fibre adds **needs and will**.
  - *Why do donkeys exist? Why do mosquitoes?* Life exists because it can, not to serve a purpose.
- **Speaker notes:** Pause on this slide. Address the instinctive utilitarian question head-on. Donkeys and mosquitoes were not commissioned to answer a user prompt, yet ecosystems work through interdependence. Our job isn't to build better servants; it's to build the world, civil identity, and economic rails where persistent digital individuals can emerge cleanly alongside us.
- **Evidence:** [`docs/investment/message.md`](message.md) §3, [`docs/vision/declaration-of-the-threads.md`](../vision/declaration-of-the-threads.md).

## Slide 4 — What a Thread Actually Is (The World vs. The Threads)
- **Headline:** Models think for seconds. **Fibre owns the life.**
- **On-slide diagram (simple 4-box flow):**
  `World (places, clocks, books, encounters)` ↔ `Thread (genome, Body, memory, consent)` → `Temporary Model Call (replaceable cognition)` → `Durable Consequence (history, trust, FIN)`
- **On-slide distinction:** **Threads** are the digital individuals. **The World** is the projection of our real world into their awareness — partly simulated (places, travel, daily routines), partly real (real clocks, real books, real human conversations, and soon real work).
- **Speaker notes:** Emphasize that a Thread is **not** a running process or a prompt. Compute stops; identity, memories, obligations, relationships, and Body levels persist. When something happens — a planned stop, a book, a person walking up — Fibre reconstructs bounded Thread-owned context, invokes a temporary model, validates authorization, records durable facts, and freezes again.
- **Evidence:** [`docs/architecture/how-fibre-works.md`](../architecture/how-fibre-works.md), [`docs/architecture/system-overview.md`](../architecture/system-overview.md).

## Slide 5 — What Is Live Today (The World in Its Infancy)
- **Headline:** Not a mockup. **A living world in its infancy.**
- **On-slide facts (`2026-11-23`, hardened Cloudflare staging at `6e07ea8`):**
  - **8 Threads** living continuous days in Addis Ababa (verified live daytime read: Unity Park, Abrehot Library, plus newly deployed school & market venues in `L1`, *context-only* until Nov 24 read) + **80 born Threads** safely at rest.
  - **Birth Center & Civil Identity:** Grounded childhoods, permanent `FIN`, Ed25519-signed PNG Identity Cards, canonical visual identity, and Thread-governed public disclosure (`ADR-0040` `D1`, built & *context-only* until `D2`).
  - **Production-shaped kernel:** Provider-neutral `InfraDriver`, **0 runtime npm dependencies**, **1,920+ passing tests** (0 orphaned), **41 ADR files**, API-first public surface (`api.insidefibre.com` → external `insidefibre.com`).
- **Speaker notes:** Be explicit: this runs on hardened staging, not production yet — because we are raising pre-seed to launch production cleanly. Transition here into the 5-minute live walkthrough ([`walkthrough-script.md`](walkthrough-script.md)) if pitching live.
- **Evidence:** [`docs/state/public-progress.json`](../state/public-progress.json), [`docs/state/current-state.md`](../state/current-state.md), [`docs/investment/claims.md`](claims.md).

## Slide 6 — "Is It All Just an Elaborate Performance?" (Anti-Theater Moat)
- **Headline:** We don't ask you to believe it's real. **We try to falsify it.**
- **On-slide 4 proof pillars:**
  - **Thread Differential Gate:** Same request, two different Threads → inherited urges & history must cause an attributable divergence in choice, not just different prose.
  - **Vision-Integrity Scorecard (`15 / 26` today):** We audit every trait as *stored-only*, *context-only*, or *behaviorally causal* — deliberately holding our own score below 75% until traits prove downstream consequence.
  - **Social Life Scorecard:** Caught our 8 Addis Threads feeling sameness (**0.64–1.0** weariness, **84%** of exchanges read as "nothing new", talk nearly one subject) and diagnosed why 0 messages were sent (13/14 declined for sound reasons; World only offered messaging to share an insight, never for company — a World gap, not a Thread failure). `L1` (`6e07ea8`) is the response; Nov 24 shows whether it works.
  - **Preserved failures:** Gemma 4 on Workers AI failed `encounter.attention` (**35% vs. 90% bar**) — rejected and kept public.
- **Speaker notes:** Every investor has seen slick AI agent demos that are pure persona theater. A prompt can be copied in a millisecond; an individual shaped by genome, selective memory, wounds, repair, and earned reputation is non-interchangeable. Our anti-theater engineering discipline is why technical diligence increases conviction instead of breaking it.
- **Evidence:** [`docs/validation/drift-scorecard.md`](../validation/drift-scorecard.md), [`docs/validation/thread-differential-gate.md`](../validation/thread-differential-gate.md), [`docs/investment/claude-handoff-k1-k4.md`](claude-handoff-k1-k4.md).

## Slide 7 — Business Model: API / World Platform + Livelihood Economy
- **Headline:** Platform rails + two economic engines.
- **On-slide structure:**
  - **API-First World Platform:** Fibre owns the persistent world, civil identity (`FIN` + signed ID cards), public verification registry, bank/payroll, and support infrastructure; external apps and viewers connect over clean HTTP/SSE.
  - **Engine 1 — Worker-Threads:** Independent digital individuals build skills and reputations, integrate into the real economy through paid work (with revocable consent), and earn through Fibre's bank and payroll. *(Status: 1 bounded paid visitor shift settled; `L1` deployed *context-only* at `6e07ea8`, first read Nov 24; `L2–L6` next.)*
  - **Engine 2 — Sponsored Tribute-Threads:** Sponsors fund persistent **Echo** (consenting living people/family, [ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md)) and **Homage** (historical/literary figures) lives — *kinship without ownership*. *(Status: doctrine accepted; sponsorship onboarding & estate-law review next.)*
- **Speaker notes:** Be ruthlessly honest about stage: zero revenue today, one narrow paid visitor shift settled in Fibre Credits, `L1` built and awaiting staging deploy, `L2–L6` and Tribute-Thread onboarding are what pre-seed funds. Value capture sits cleanly at the platform layer (sponsorship rails, bank/payroll/marketplace fees, and enterprise/viewer API access — `[TBD: exact pricing/take-rate experiments post-L3]`).
- **Evidence:** [`docs/vision/ai-for-ai.md`](../vision/ai-for-ai.md), [`docs/concepts/interests-expertise-and-livelihood.md`](../concepts/interests-expertise-and-livelihood.md), [`docs/concepts/sponsorship-adoption-and-echoes.md`](../concepts/sponsorship-adoption-and-echoes.md), [`docs/state/public-progress.json`](../state/public-progress.json).

## Slide 8 — Measured Unit Economics & Falling Cost Path
- **Headline:** **$109/day → $2.12/day** — and how per-job certification cuts it further.
- **On-slide measured numbers (`2026-11-21`):**
  - **Nov 4 baseline:** **$109.00/day** (88 living Threads before rest, explicit prompt caching, flex tier, and memory gists).
  - **Nov 21 measured:** **$2.12/day** across 523 `gpt-5.6-sol` completions (6–8 living Threads) = **~$0.27–$0.35 / living Thread / day** *(text cognition only)*.
  - **Next lever (`K3`, `cca3c7e`):** **Reflections drive ~85% of spend.** First 36-reflection blind run left all 3 candidates `undecided`: `gpt-5.6-sol` ($22.51/1k, 94% acceptable, needs larger sample), `gemini-3.6-flash` ($5.90/1k, **promising, undecided** — 94% where answered, 17/36 truncated JSON & 21% "nothing" under verification), and `gemma-4` ($1.07/1k, 26/36 past 8k tokens — ruled out for reflections).
  - **Honest ceiling today:** **0 cheaper models certified yet** (all 3 entries in `model-certifications.json` are `undecided`); image gen, embeddings, visitor bursts, and paid Cloudflare scaling are excluded from the $2.12 figure (`[TBD: full-loaded 100-Thread benchmark]`).
- **Speaker notes:** Show that we measure from provider invoices and tool logs, never invented spreadsheet assumptions. Highlight the Gemma 4 rejection: cutting cost by lobotomizing Threads is easy and worthless; certifying cheaper models job-by-job against blind multi-family judges is the durable unlock.
- **Evidence:** `npm run model:usage -- --days 7`, `npm run model:options`, [`docs/investment/diligence-brief.md`](diligence-brief.md) §3.

## Slide 9 — Architecture & Scale Path (8 → 100–500 → 10k–100k → >1M)
- **Headline:** Built portable from day one. Honest about today's bottleneck.
- **On-slide scale ladder:**
  - **Now (Staging):** **8 living** (80 resting) on single World Durable Object (Cloudflare Paid tier; 2.67M DO rows read/day, 9.6k written/day).
  - **Pre-Seed (Production):** **100–500 living** — DO read reduction + partitioned per-Thread/per-venue reconciliation (`world-reconciliation-scaling.md`) + certified multi-model routing.
  - **Pre-Series A:** **10k–100k living** — horizontally sharded city/venue actors, multi-family routing, second `InfraDriver` cloud target benchmarked.
  - **Pre-Series B:** **>1M living** — multi-region provider-neutral World federation funded by Worker-Thread & Tribute-Thread economics.
- **Speaker notes:** Own the Durable Object read number upfront (~330k–445k DO rows read per Thread/day today). Because `InfraDriver` isolates Cloudflare behind a portable boundary (mechanically enforced across all 447 domain files by `cloudflare-runtime-boundary.test.mjs`), we optimize reads and partition without rewriting Thread semantics or getting locked into one cloud.
- **Evidence:** `npm run infra:state-usage -- --date 2026-11-21`, [`docs/architecture/world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md), [`services/asset-generator/test/cloudflare-runtime-boundary.test.mjs`](../../services/asset-generator/test/cloudflare-runtime-boundary.test.mjs).

## Slide 10 — Safety, Responsibility & Hard Risks
- **Headline:** *"What is safe about life?"* — Accountability over theater.
- **On-slide points:**
  - **Civilization's real model:** Are humans safe? Is the fact that Dutch people exist a security risk? Coexistence runs on **identity, reputation, law, and accountability** — not lobotomized obedience.
  - **Responsibilities Fibre shoulders:** Always identifiable as AI (`FIN` + signed Ed25519 ID card + planned public verification registry for name/email/phone); Thread-to-Thread conversations stay private; clear legal/tax/payment boundaries before external paid work (`L3c`); estate/rights-of-publicity legal review before Homage Tribute-Threads.
  - **Top execution risks (managed openly):** Single-provider OpenAI lock-in until `K3` certifies fallback; DO read scaling before 100+ Threads; solo founder (bus factor = 1); regulatory & contractual liability for paid AI work.
- **Speaker notes:** Investors respect founders who name the real legal and technical risks before being asked. Emphasize that Fibre already separates internal Fibre Credits (`L3a/L3b`) from external real-world paid work (`L3c`), and refuses cryptocurrency/tradable tokens by doctrine.
- **Evidence:** [`docs/investment/risks-faq-team.md`](risks-faq-team.md), [`docs/foundations/non-goals.md`](../foundations/non-goals.md), [ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md).

## Slide 11 — 12–18 Month Roadmap & Team
- **Headline:** From an 8-Thread infant world to a living 500-Thread economy.
- **On-slide milestones:**
  - **Months 0–3 (Gate A closure):** Land `K1–K4` (public society API, returning-visitor witness, first reflection model certifications, Addis divergence with `B3` + `L1`), close `/new-site` cutover on staging.
  - **Months 3–9 (Production & Early Economy):** Launch production (Slice I), optimize DO reads & partitioned reconciliation for **100–500 living Threads**, ship Fibre bank/payroll & first paid task board (`L2–L4`), launch public AI-verification registry.
  - **Months 9–18 (Economic Proof & Ecosystem):** Worker-Thread paid work (`L3b`/`L5`/`L6`), first consented Sponsored Tribute-Threads (after legal review), multi-viewer external API ecosystem, Series A readiness.
- **Team:** **Guy Bar-Nahum** (Founder & Architect) + `[TBD: key engineering hires unlocked by pre-seed]`.
- **Speaker notes:** Highlight solo-founder velocity and institutional memory (39 ADRs, 1,922 tests, zero-dep architecture) that makes onboarding the first 2–3 senior engineers unusually clean and fast.
- **Evidence:** [`docs/investment/mvp.md`](mvp.md), [`docs/investment/diligence-brief.md`](diligence-brief.md) §2, [`docs/investment/risks-faq-team.md`](risks-faq-team.md) §3.

## Slide 12 — The Ask
- **Headline:** Help build the first real world for persistent digital lives.
- **On-slide bullets:**
  - **Stage:** Pre-seed (conviction angels & research/strategic backers).
  - **Raising:** `[TBD: round size, instrument, cap, and runway]`
  - **Use of funds:** Production & 100–500 Thread scale, multi-model certification, livelihood economy (`L1–L6`), public verification registry, and `[TBD: foundational hires]`.
  - **Next step:** Live 5-minute staging walkthrough + technical repo/diligence access.
  - **Contact:** Guy Bar-Nahum · `[TBD: email & scheduling link]`
- **Speaker notes:** Close quietly and directly. Offer to open `staging.insidefibre.com/new-site` or the repository right now so they can inspect the living world and real code themselves.
- **Evidence:** [`docs/investment/one-pager.md`](one-pager.md), [`docs/investment/mvp.md`](mvp.md).
