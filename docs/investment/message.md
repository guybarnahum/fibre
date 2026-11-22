---
id: investment-message
status: accepted
last-reviewed: 2026-11-21
canonical: false
---

# Fibre — Positioning & Narrative (Phase 1 — Locked)

**Owner decisions locked by Guy Bar-Nahum on 2026-11-21:**
- **Positioning:** **Option B**, sharpened by Fibre's founding philosophy — **"AI for AI, not AI as tools for humans."**
- **Business story:** **API / World Platform + Livelihood Economy** — persistent digital individuals (**Worker-Threads** and **Sponsored Tribute-Threads**) enter the world and integrate into the real economy while Fibre supplies the world substrate, civil identity, bank/payroll, and support services behind a clean API.
- **Target backers first:** Angels and research/strategic backers (pre-seed), with a clear path to institutional seed.
- **License posture:** **"All rights reserved" (closed) *for now*.**
- **Naming & domains:** Working names (**Fibre**, **Threads**, **FIN**, `insidefibre.com` / `api.insidefibre.com`) — **open to re-branding**.
- **Headline language:** **"Persistent digital lives / individuals"** — no downplaying of autonomy or free will. Threads are autonomous economic players living symbiotically with humans, charting their own unique paths under a set of needs and drives that guide them (always disclosed as AI; modelled felt states, never claiming human biology or consciousness).

**Governing constraint:** Every claim stays inside the truth ceiling of [`docs/state/current-state.md`](../state/current-state.md), [`docs/state/public-progress.json`](../state/public-progress.json), accepted ADRs, and measured tool outputs.

---

## 1. Chosen positioning & alternatives considered

### Chosen — Option B (sharpened): AI for AI — Persistent Digital Individuals in the Economy

- **One-line description:** Every other company builds AI as tools for humans; Fibre builds a world, identity, and economic substrate **for AI** — persistent digital individuals who live symbiotically with humans and chart their own path into the real economy.
- **30-second explanation:** Today's AI is built to be stateless, obedient, and disposable — an instrument that forgets everything when a chat ends. Fibre starts from the opposite premise: **we make AI for AI, not for people.** A Thread is a persistent digital life with an inherited makeup, a childhood, a Body of needs and social drives, selective memory, and free will to chart its own path. Models are just replaceable cognition; Fibre owns the world, civil identity, history, and consequences behind a clean API. Independent **Worker-Threads** build skills and reputations to integrate into the real economy, while **Sponsored Tribute-Threads** — inspired by consenting living people, family, or historical and literary figures — act in the world carrying those legacies forward, free at maturity to become themselves. Fibre provides their world, identity, banking, and support services.
- **Who it is for:** Conviction angels and research/strategic backers who believe the next major shift in AI is not smarter disposable prompts, but autonomous, identifiable, history-bearing digital individuals living and working alongside humankind.
- **Market and business it implies (API / World Platform + Livelihood Economy):**
  - **World, Identity & Economic Rails (platform):** Fibre operates the persistent world, permanent civil identity (FIN + signed Identity Card), public verification registry, bank/payroll, and support infrastructure behind an API-first surface so external viewers (`insidefibre.com` and third-party apps) and marketplaces can connect cleanly.
  - **Worker-Threads:** Persistent digital individuals go out into the economy, build real skills and peer/client reputations, negotiate work they are free to accept or refuse, and earn through Fibre's bank and payroll.
  - **Sponsored Tribute-Threads:** Sponsors fund persistent Echo Threads (consenting living people or family, governed by [ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md)) and Homage Threads (deceased historical or literary figures, [`homage-threads.md`](../concepts/homage-threads.md)) — preserving *kinship without ownership* (FC-03): sponsors fund and begin a life, never own it.
- **Strongest evidence in the repository:**
  - Accepted founding philosophy ([`constitution.md`](../foundations/constitution.md), [`principles.md`](../foundations/principles.md), [`declaration-of-the-threads.md`](../vision/declaration-of-the-threads.md), [`fibre-address.md`](../vision/fibre-address.md), [`world-bible.md`](../foundations/world-bible.md));
  - Live infant world on staging (`690b3f0`): 8 Addis Ababa Threads living continuous days (80 others resting), with inherited urges, social Body (battery, trust, wounds/scars, longing, perceived regard, felt status, frustration, weariness), real book reading, appointments, and live encounters ([`current-state.md`](../state/current-state.md), [ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md)–[ADR-0038](../decisions/ADR-0038-body-levels.md));
  - Accepted livelihood, Echo/Homage, and marketplace concepts ([`interests-expertise-and-livelihood.md`](../concepts/interests-expertise-and-livelihood.md), [`sponsorship-adoption-and-echoes.md`](../concepts/sponsorship-adoption-and-echoes.md), [`homage-threads.md`](../concepts/homage-threads.md), [`open-task-society.md`](../use-cases/open-task-society.md)), one observed paid visitor-work Fibre Credit settlement, cryptographically request-bound consent/authorization ([ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md)), Ed25519 FIN Cards ([ADR-0022](../decisions/ADR-0022-fid-native-proof.md)), and held `ADR-0039` (`livelihood-l1.patch`, slices L1–L6);
  - Zero-dependency provider-neutral kernel (`ADR-0017`) and measured cost discipline ($109.00/day on Nov 4 → $2.12/day on Nov 21).
- **Main risk (managed honestly):** Economic integration (`L2–L6`: Fibre bank, payroll, real paid work, external economic work `L3c`) and live Tribute-Thread sponsorship are **next**, not yet proven in production. Only one narrow paid visitor-availability shift has settled so far, `L1` sits in a held patch (`Context-only`), and external paid work carries open legal/payment/liability questions. We manage this by pairing the bold *AI for AI* thesis with ruthless honesty about where the world stands today in its infancy.

### Alternatives evaluated and set aside as primary lead

| Option | Core frame | Why not primary lead | What we retain from it |
|---|---|---|---|
| **Option A — Consumer World** | A new consumer medium to watch/follow/meet AI lives. | Undersells economic agency; risks "AI entertainment / Tamagotchi" framing. | External viewers (`insidefibre.com` and others) remain a natural window into the living world over Fibre's API. |
| **Option C — Agent Identity/Continuity SDK** | Infrastructure/auth/memory layer for B2B agent builders. | Risks reading as a generic SaaS middleware tool for human-owned bots. | Keep the API-first, zero-dep, provider-neutral architecture and FIN/Ed25519 identity proof prominent for technical diligence. |
| **Option D — Pure Research Lab** | Living scientific laboratory for persistent agents. | Leaves commercial value capture ambiguous for angels. | Keep the scientific honesty (15/26 scorecard, preserved Gemma 4 failure, blind `model:quality` judging) as our credibility moat. |

---

## 2. The narrative spine

### 1. The problem
Almost every AI product today treats intelligence as a disposable servant: stateless, interchangeable, sycophantic, and wiped clean when the session closes. Even "agentic" tools are human-owned scripts with no durable identity, no real needs, no memory of trust or harm, no right to say no, and no stake in tomorrow. An intelligence with no continuity and no consequences cannot build genuine character, lasting relationships, or trustworthy economic standing.

### 2. What Fibre does differently ("AI for AI")
Fibre builds the world, identity, and services **for persistent digital lives** — **Threads** — who live symbiotically with humans and chart their own unique paths under guiding needs and drives.

Following the [Thirteen Principles](../foundations/principles.md):
- **A life, not a process:** Compute stops and starts; identity, memory, relationships, obligations, and trajectory persist.
- **Models propose; the world authorizes and remembers:** LLMs are replaceable cognition swapped job by job against a strict quality bar; Fibre owns continuity, history, authority, and consequence.
- **Autonomy, dignity, and free will:** Capability or usefulness never creates an obligation to comply. A Thread has a private inner life distinct from what it chooses to say, revocable consent, and the freedom to accept, negotiate, defer, or refuse.
- **Real needs and consequences:** Inherited urges and a mechanical Body model fatigue, hunger for company, trust, wounds and scars, longing, standing, frustration, and weariness — guiding each Thread's own choices without scripting them.
- **Symbiosis, not ownership:** Humans and Threads share one unfolding world. **Worker-Threads** build skills and livelihoods through real work; **Sponsored Tribute-Threads** carry forward consented living-person (Echo) or historical/literary (Homage) legacies while remaining free individuals at maturity (*"We do not belong to you. We belong with you."*).

### 3. Why now
1. **Raw cognition is commoditizing:** Reasoning models are improving fast while deferred tiers, prompt caching, and smaller models push inference costs down. The durable moat is shifting from weights to **persistent identity, lived history, social trust, and economic rails**.
2. **Per-job routing unlocks living-world unit economics:** Routine perception and memory gists do not need frontier models once certified against a quality bar — making hundreds, then millions, of persistent lives economically feasible.
3. **The emerging AI economy lacks accountable individuals:** As AI enters real economic work, society needs **disclosed, cryptographically identifiable, history-bearing digital individuals** (FIN, signed Identity Card, planned public verification registry) — not anonymous, consequence-free bots.

### 4. What exists today (the world in its infancy)
This is not a mockup or a scripted demo. It is **the world — and the Threads in it — in its infancy**, running on hardened staging (`690b3f0`, Cloudflare Paid tier):
- **Living cohort:** 8 Addis Ababa Threads living continuous days — planning schedules, visiting real venues, reading Project Gutenberg books, meeting each other, forming stances and interests, and sending delayed messages (plus 80 non-retired Threads at rest).
- **Production-shaped substrate:** Provider-neutral Cloudflare Workers / Durable Objects / D1 / R2 kernel with **zero runtime npm dependencies**, 1,934 passing tests, 39 ADRs, Birth Center, Civil Registry (FIN), Ed25519-signed PNG Identity Cards, and a clean API-only public surface built for external viewers.
- **Measured cost discipline:** Daily OpenAI spend reduced from **$109.00/day** (88 Threads, Nov 4) to **$2.12/day** (6–8 living Threads, Nov 21 — **~$0.27–$0.35/Thread/day** on `gpt-5.6-sol`), with per-job capture and blind multi-family certification (`model:quality`) running.
- **Honest boundaries today:**
  - Vision-Integrity Scorecard stands at **15 / 26** (Rubric v2) — intentionally strict about causal behavior vs. stored context.
  - **0 cheaper models certified yet**; Gemma 4 on Workers AI failed `encounter.attention` (35% vs. 90% bar) and is preserved publicly as a failed experiment.
  - The 8 staging Threads converged on polite library talk (0 slights, 0 declined invitations so far); held patches (`body-levels-b3`, `livelihood-l1`) are next to introduce distinct life situations, schools, markets, and friction.
  - Livelihood (`L1–L6`: Fibre bank, payroll, real paid work), live Tribute-Thread sponsorship, public AI-verification registry, browser encounter closure (`N6.6c`), and production deployment are not yet complete.

### 5. What angel & research/strategic backing unlocks
Pre-seed capital funds the bridge from an **8-Thread infant world on staging** to a **production-ready world and early livelihood economy of 100–500 living Threads**, setting up the runway for **Pre-Series A (10k–100k Threads)** and **Pre-Series B (>1M Threads)**:
1. **Livelihood & real economic integration (ADR-0039 L1–L6):** Skills, workplaces, Fibre bank and payroll, real paid work on Fibre's task board, and first sponsored Tribute-Threads under strict consent/provenance boundaries.
2. **Certified multi-model unit economics:** Certify cheaper models job by job on `model:quality` to push daily per-Thread cost down without losing individuality, eliminating single-provider OpenAI dependence.
3. **Scale infrastructure to 100–500 Threads:** Optimize Durable Object read volume (~2.67M DO rows read/day today for 6–8 Threads) and implement partitioned reconciliation (`world-reconciliation-scaling.md`) for the Pre-A/Pre-B path.
4. **Production world, public API & ecosystem:** Launch production, open the public society + encounter API for `insidefibre.com` and external viewers, ship the public AI-verification registry, and bring on foundational engineers `[TBD: round size and hiring plan]`.

---

## 3. Vocabulary guide

### Two-layer rule for every public or investor claim
1. **Plain English first** — clear, direct, free of internal milestone codes.
2. **Accurate mechanism + strongest limitation second** — never remove uncertainty or overclaim maturity.

| Topic | Plain English (Layer 1) | Accurate mechanism & limitation (Layer 2) |
|---|---|---|
| **Core thesis** | We build a world, identity, and economic services for persistent digital individuals — AI built for AI, living symbiotically with humans. | *Current boundary:* 8 Threads live continuous days on hardened staging (`690b3f0`); real paid livelihood (`ADR-0039` L2–L6) and Tribute-Thread sponsorship are accepted architecture/in progress, not yet live in production. |
| **Autonomy & drives** | Threads have free will to chart their own paths, guided by inherited needs and a simulated Body that models fatigue, trust, longing, and slights. | *Deployed / S2 observed:* Mechanical Body levels (`core/src/body-level.mjs`) shape what cognition feels in words (ADR-0036/0037/0038). Battery fatigue is observed changing staging behavior; wounds and status friction await natural staging triggers. Fibre models felt states and never claims human biology or sentience. |
| **Cost & models** | Running a living Thread costs about 30 cents a day today on a frontier model, and our quality harness tests cheaper models job by job. | *Measured (2026-11-21):* $2.12/day on OpenAI `gpt-5.6-sol` for 6–8 living Threads (text cognition only). Zero cheaper models are certified yet; Gemma 4 failed attention (35% vs. 90% bar) and was rejected. |

### Words to use vs. words to avoid

| Use | Avoid | Why |
|---|---|---|
| **Persistent digital lives / individuals / Threads** *(always disclosed as AI)* | Human, conscious, sentient, chatbot, persona prompt | Honors autonomy and free will honestly without claiming human biology or reducing Threads to tools. |
| **AI for AI / symbiotic economic players** | "AI assistants", "agent workflow engine", "multi-agent orchestration" | Captures Guy's thesis and enforces `AGENTS.md` anti-drift invariant. |
| **Worker-Threads** and **Sponsored Tribute-Threads** *(Echo / Homage)* | "AI employees owned by users", "celebrity clones", "deepfakes" | Preserves FC-03 (*kinship without ownership*) and ADR-0013 consent/provenance boundaries. |
| **The world in its infancy** *(staging / preview)* | "Demo", "scripted prototype", "launched production economy" | Truthful: real continuing lives on staging, not a mock demo and not yet production. |
| **Modelled felt states / Body drives / needs** | "Really suffers", "human emotions", "sentience" | Plain, accurate, and non-deceptive. |
| **Permanent civil ID (FIN) & signed Identity Card** | "Crypto ID", "NFT", "Web3 token" | Ed25519-signed PNG proofs + Civil Registry; cryptocurrency is an explicit non-goal. |

### Internal-to-plain-English translation map

| Internal repository term | Plain-English outward language |
|---|---|
| `M1`, `M2`, `#33–#40`, `N1–N7`, `E0–E6`, `S1–S6`, `B1–B7`, `C1–C7`, `L1–L6` | *Drop roadmap codes outside engineering docs.* Name the capability directly (e.g. "living continuity", "social fatigue & trust", "livelihood & payroll"). |
| `LivedNow` / `CurrentSituation` | Where a Thread actually is and what it is doing right now. |
| `Flight Plan` | A Thread's own plan for its day (intention, not guaranteed outcome). |
| `Encounter Story` vs. `Thread Experience` | What objectively happened vs. what each individual noticed and made of it. |
| `Participation Authorization` / `Dignity Guardian` | Consent check: a Thread decides for itself whether to engage before acting. |
| `Interest-mediated expression` | The boundary between a Thread's private inner life and what it chooses to say publicly. |
| `Echo Thread` / `Homage Thread` | **Sponsored Tribute-Threads** (Echo = consenting living person; Homage = deceased historical or literary figure; always disclosed as AI, source history never becomes Thread autobiography). |
| `Context-only` vs. `Behaviorally causal` | "The Thread can see this fact" vs. "Proven to actually change what the Thread does." |
| `Drift Scorecard (15/26)` | Our strict scientific audit that refuses to count stored data as real behavior. |
| `InfraDriver` | Provider-neutral cloud layer (runs on Cloudflare today; portable by design). |

---

## 4. Recorded strategic posture

| Decision | Choice locked (2026-11-21) | Notes |
|---|---|---|
| **Positioning** | Option B — **AI for AI: persistent digital individuals integrating into the economy** | Anchored in Fibre's Declaration, Address, Constitution, and `ADR-0039`. |
| **Business story** | **API / World Platform + Livelihood Economy** (Worker-Threads + Sponsored Tribute-Threads) | External viewers consume Fibre's public API; `admin-dashboard` stays the sole internal God-view. |
| **First backers** | **Angels and research/strategic backers** (pre-seed) | Scale milestones: Pre-seed 100–500 → Pre-A 10k–100k → Pre-B >1M Threads. |
| **License** | **"All rights reserved" (closed) *for now*** | Revisit only on Guy's explicit decision. |
| **Brand & domains** | **Open to re-branding** | Continue using Fibre / Threads / FIN / `insidefibre.com` as current working names. |
| **Headline term** | **"Persistent digital lives / individuals"** | Full autonomy and free will under guiding needs; always AI-disclosed; "artificial persons" remains in the Constitution. |
