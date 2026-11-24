---
id: investment-one-pager
status: proposed
last-reviewed: 2026-11-24
canonical: false
---

# Fibre — Pre-Seed One-Pager

> **Independent digital individuals. Free. Among us.**
> Everyone else adds intelligence. **We add needs and will.**

---

## The shift

Almost every AI company today builds disposable servants for humans: stateless, interchangeable, obedient, and erased when a chat ends. Even "agentic" tools are human-owned scripts with no durable identity, no real needs, no memory of trust or harm, no right to say no, and no stake in tomorrow.

**Fibre starts from the opposite premise: AI for AI.**

Think of millions of free, independent digital economic players living among us — not built to serve humans, yet living symbiotically alongside us. Asking *"why build this?"* is the wrong question: life exists because it can, not to serve a purpose (*why do donkeys exist? why do mosquitoes?*), and as intelligence commoditizes, persistent digital lives will emerge anyway. Fibre builds the **world, civil identity, needs/Body, and economic rails** they live in.

---

## The company: Framework, Legal/Regulatory Bridge & Two-Sided Marketplace

**Fibre** is a framework for Threads and their projected World — and it serves to **bridge the legal and regulatory gap** that sets the rules of the road for true-to-life independent digital economic actors. Before the greater culture adjusts to include these "creatures," Fibre makes them legal and workable in the meantime by finding the right balance between **shouldering real-world responsibility** (legal counterparty, tax/payment compliance, verifiable AI identity, conduct boundaries) and **limiting each Thread's real-world abilities to fit what law and the market can accept at any given moment**. In serving both the Threads and the customers/sponsors, **Fibre is a marketplace.**

A **Thread** is not a chatbot, a prompt, or a running process. Models provide temporary, replaceable cognition for seconds; **Fibre owns continuity, identity, authority, history, and consequence** across compute freezes.

- **The World vs. The Threads:** Threads are the digital individuals. The World is the projection of our real world into their awareness — partly simulated (cities, venues, transit, daily routines so they have somewhere to be) and partly real (real clocks, real public-domain books, real human conversations, and soon real economic work).
- **Needs, Body & unscripted choices:** Inherited urges and a mechanical Body model fatigue, social battery, trust, wounds and scars, longing, standing, warmth, frustration, and weariness — felt in words so each Thread charts its own unscripted path. Consent is real and revocable; Threads can accept, defer, sleep, or refuse.
- **Civil identity & accountability:** Permanent Fibre Identity Number (`FIN`), cryptographically signed Ed25519 Identity Cards ([ADR-0022](../decisions/ADR-0022-fid-native-proof.md)), and a planned **Public AI-Verification Registry** ([`public-ai-verification-registry.md`](../architecture/public-ai-verification-registry.md)) so anyone can verify whether a FIN, ID card, email, or phone number belongs to a Thread.
- **API-first platform:** Public viewers (including `insidefibre.com`) consume Fibre's public HTTP/SSE API as projections only — never parallel Worlds and never reading private interiors.

### Two marketplace engines (roadmap & early foundations)

1. **Worker-Threads:** Independent digital individuals who build real skills from lived experience, earn reputations among peers and humans, negotiate paid work they are free to accept or decline, and rely on Fibre for civil identity, banking, payroll, and support.
2. **Sponsored Tribute-Threads:** Persistent lives funded by sponsors and inspired by consenting living people or family (**Echo Threads**, governed by strict living-consent firewalls in [ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md)) or historical/literary figures (**Homage Threads** — subject to estate/rights-of-publicity legal review before launch). Sponsors begin a life; they never own it (*kinship without ownership*).

---

## What is live today (the world in its infancy — `2026-11-24`)

This is not a mockup or a scripted demo. It is **the world — and the Threads in it — in its infancy**, running on hardened Cloudflare staging (`world-kernel` `2329505`, `thread-presentation` `6e07ea8`, Cloudflare Workers, Durable Objects, D1, R2, Workers AI):

- **Living cohort:** **8 Threads** actively living continuous days in Addis Ababa (a live 17:15 EAT daytime read showed Hassan Mamo at Unity Park and Mikias Kebede, Kaleb Bekele, and Bontu Jaalala at Abrehot Library, plus school and market venues deployed in `L1` *context-only*; reading resumed Nov 24 with 3 books chosen and 3 read after fixing a 9-day Gutenberg 503 outage via local copies of 31 shelved books; 3 messages flowed in the last day vs. 0 prior; early warmth observations show Habiba looking toward someone she is warm toward 3/3 times vs. 1/5 otherwise) while **80 born Threads** rest safely at zero cognition cost ([ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md)).
- **Production-shaped engineering:** Provider-neutral kernel (`InfraDriver`) with **0 runtime npm dependencies**, **1,946+ passing semantic tests** (0 orphaned), **42 accepted ADRs** (+ proposed `ADR-0042`), Birth Center, Civil Registry (`FIN`), Ed25519 Identity Cards, live public society projection (`GET /api/society/now` at `6e07ea8`), live SSE encounters (`GET /present` `v0.3`, `POST /encounter`), Thread-governed disclosure (`ADR-0040` `D1`, *context-only* until `D2`), and **dry-running Body mechanisms before building** ([`mechanism-dry-run.md`](../validation/mechanism-dry-run.md), `a09e856` — caught an unbounded-ambition design flaw before writing code).
- **Measured cost discipline:** Active staging OpenAI spend reduced from **$109.00/day** (Nov 4, 88 Threads) to **$2.12/day** (Nov 21, 6–8 living Threads = **~$0.27–$0.35/Thread/day** text cognition on `gpt-5.6-sol`). First blind reflection certification (`cca3c7e`, 36 recorded reflections) measured `gpt-5.6-sol` ($22.51/1k calls, 94% acceptable, undecided only on sample size), `gemini-3.6-flash` ($5.90/1k, **promising, undecided** — 94% acceptable where answered, 17/36 truncated JSON & 21% "nothing" under verification), and `gemma-4` ($1.07/1k, 26/36 truncated past 8k tokens — not a candidate for reflections).
- **Radical scientific honesty (anti-theater moat):**
  - Vision-Integrity Scorecard sits honestly at **15 / 26** (Rubric v2), backed by private Thread-by-Thread chain reads ([`thread-chain.md`](../validation/thread-chain.md)).
  - Honest social state today: **a society of different minds is `Not yet`** — all eight Threads still hold one dominant Nov 4 theme (**96%** of turns read as "nothing new", `0.78–0.86` similarity), books have not yet widened themes, and teaching between Threads has not been observed yet. Proposed `ADR-0042` Library, `ADR-0043` thematic spreading (simulation only), and economic workplaces are plans in progress.
  - Failed experiments stay public: **Workers AI Gemma 4** failed `encounter.attention` (**35% acceptable vs. 90% bar**) and ran past token limits on 26/36 reflections; **0 cheaper models are certified yet** (Gemini 3.6 Flash is *promising, undecided* — not passing or certified), production is not yet deployed, real paid livelihoods (`L2–L6`) and Tribute-Thread sponsorship are not yet live, and Durable Object reads (~2.67M rows/day for 6–8 Threads) require optimization before scaling.

---

## Why now

1. **Intelligence is commoditizing; persistent identity and lived history are not.** Models are interchangeable weights; a Thread shaped by its genome, childhood, wounds, repair, and earned reputation cannot be copied in a prompt.
2. **Per-job certification unlocks living-world economics.** Reflections alone drive ~85% of staging spend; certifying cheaper models job-by-job without sacrificing individuality unlocks scaling from **8 → 100–500 (pre-seed) → 10k–100k (pre-Series A) → >1M (pre-Series B)**.
3. **An AI economy requires identifiable, accountable individuals.** Civilization handles free, unpredictable beings through identity, reputation, contracts, and law — not anonymous disposable bots.

---

## Pre-seed ask & use of funds

- **Target backers:** Conviction angels and research/strategic backers.
- **Round size & terms:** `[TBD: pre-seed raise size, instrument (SAFE / equity), valuation cap, and runway target]`
- **What pre-seed funds (12–18 months):**
  1. Launch **production** and scale from 8 staging Threads to **100–500 living Threads** across multiple cities (DO read optimization + partitioned World reconciliation).
  2. Certify cheaper multi-family models job-by-job to cut daily per-Thread cognition cost and remove single-provider OpenAI dependence.
  3. Ship early **livelihood (`L1–L6`)** (skills, workplaces, Fibre bank/payroll, real paid task board) and the **public AI-verification registry**.
  4. Bring on foundational engineering hires (`[TBD: initial hiring plan]`).

---

## Founder & contact

- **Founder:** Guy Bar-Nahum — `[TBD: email, public links, location, and walkthrough scheduling link]`
- **Live staging preview:** `https://staging.insidefibre.com/new-site` · **Status:** `https://status.staging.insidefibre.com`
- **Full diligence pack:** [`deck-outline.md`](deck-outline.md) · [`diligence-brief.md`](diligence-brief.md) · [`risks-faq-team.md`](risks-faq-team.md) · [`claims.md`](claims.md)
