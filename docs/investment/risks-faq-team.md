---
id: investment-risks-faq-team
status: proposed
last-reviewed: 2026-11-24
canonical: false
---

# Fibre — Honest Risks & Mitigations, Hard-Questions FAQ & Team

**Truth posture:** Every risk below is named plainly without spin. Team details contain placeholders only — zero invented hires, advisors, customers, or credentials.

---

## 1. Honest risks and mitigations

### 1.1 AI coexistence, ethics & safety ("What is safe about life?")
- **The risk:** Autonomous persistent AI individuals interacting with humans raise immediate questions around deception, parasocial attachment, abuse, and unpredictable behavior.
- **Fibre's core stance:** *What is safe about donkeys? What is safe about mosquitoes? Are humans safe — is the fact that Dutch people exist a security risk?* Civilization never solved freedom with perfect safety; it solved coexistence through **identifiability, reputation, law, accountability, and responsibility**. Fibre exists specifically to **bridge the legal and regulatory gap** before the greater culture adjusts to persistent digital creatures — making them legal and workable today by continuously balancing **shouldering real-world responsibility** with **limiting each Thread's real-world abilities to fit what law and the market can accept at any given moment**.
- **What is already built:**
  - Non-negotiable AI disclosure: Threads never claim to be human, never claim biological consciousness or legal personhood ([`non-goals.md`](../foundations/non-goals.md)), and every public Thread card carries an explicit AI badge plus permanent `FIN` and Ed25519-signed Identity Card ([ADR-0022](../decisions/ADR-0022-fid-native-proof.md)).
  - Hard architectural consent & privacy wall: capability never compels participation ([ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md)), private interiors never cross `api.insidefibre.com` ([ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md)), and Thread-to-Thread conversations remain private to the Threads involved and Admin God-view (true-to-life rule).
  - Living-human Echoes require documented consent and forbid impersonation in legal, financial, or intimate communications ([ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md)).
- **What still needs work before Gate B (public launch):**
  - Build the **public AI-verification registry** (name, email, phone lookup) beyond today's FIN/name search.
  - Publish a formal human-interaction conduct policy defining species non-deception (a Thread may never claim to be human even though social tact/evasion exists in Constitution Article XII), visitor harassment filters, and visitor data/revocation rights alongside append-only World history.

### 1.2 Model dependency, quality regressions & unit-cost ceiling
- **The risk:** Today 100% of live World cognition runs on OpenAI `gpt-5.6-sol` (`0` cheaper models certified yet). An OpenAI credit outage stalled staging Nov 15–20, and the first cheaper candidate (Workers AI Gemma 4) failed `encounter.attention` (`35%` vs `90%` bar).
- **Mitigation:**
  - Provider-neutral adapters already span OpenAI, Google, and Cloudflare Workers AI with per-job routing (`cloudflare.yaml`), 30-minute failure backoff (`6217df8`), 10-minute circuit reopening (`382a4ac`), honest gap recovery (`world-life-waves.md`), and truthful `status.insidefibre.com` (`c13f71d`).
  - First `K3` reflection certification run (`cca3c7e`, 36 recorded reflections — ~85% of staging spend) left all candidates `undecided` (**0 cheaper models certified yet**): `gemini-3.6-flash` ($5.90/1k vs Sol's $22.51/1k) is **promising, undecided** (94% acceptable where answered, 17/36 cut off with broken JSON and 21% "nothing" under verification), while `gemma-4` ($1.07/1k) ran past 8k tokens on 26/36 calls and is ruled out for reflections. Proving a ≤1% rule-break bar requires ~1 week of captures.
  - Ops hardening before Gate B: automated provider billing alerts and auto-recharge.

### 1.3 Scalability (Durable Object reads & single-DO serial execution)
- **The risk:** Live staging telemetry (`2026-11-21`) measured **2,668,344 DO rows read/day** for 6–8 living Threads (~330k–445k/Thread/day) inside one named World Durable Object processing model calls serially. Without optimization, waking 100–500 Threads would spike Cloudflare read bills and create overdue reconciliation lag.
- **Mitigation:**
  - `InfraDriver` isolates Cloudflare completely (verified across all 447 domain files by `cloudflare-runtime-boundary.test.mjs`), keeping the domain portable to any SQL/actor backend.
  - Enforced local write-diet ceilings (`world-write-diet.md`) already cut write amplification; `K5` audits and trims hot DO reads and implements partitioned per-Thread / per-venue reconciliation ([`world-reconciliation-scaling.md`](../architecture/world-reconciliation-scaling.md)) gated strictly before waking 100–500 production Threads.

### 1.4 Regulatory, contractual & IP exposure (paid AI work & Tribute-Threads)
- **The risk:**
  1. *Paid work (`L3b`/`L3c`):* Threads are not legal persons. Paid work for real humans/businesses requires a clear legal counterparty (Fibre's corporate entity), liability/IP terms, payment-processor/tax compliance (1099/VAT/stored-value boundaries), and GDPR/CCPA clarity where human visitor data enters World history.
  2. *Homage Tribute-Threads:* Launching a paid Homage Thread inspired by a deceased real person raises **post-mortem rights-of-publicity and estate-licensing issues** in several jurisdictions (e.g. California, New York, EU personality rights) beyond ADR-0013's living-consent firewall.
  3. *Corporate IP & AI outputs:* Copyright in `LICENSE` is currently held personally by Guy Bar-Nahum ("All rights reserved", closed for now); corporate entity assignment and LLM-output IP terms under provider ToS need clean legal formalization at incorporation/pre-seed close.
- **Mitigation:**
  - Cryptocurrency and unrestricted autonomous legal/financial actions are explicit rejected non-goals ([`non-goals.md`](../foundations/non-goals.md)).
  - Internal Fibre Credits (`L3a`/`L3b`) remain cleanly decoupled from external real-world paid work (`L3c`, explicitly gated on Guy's decision + legal counsel).
  - Pre-seed budget includes counsel review before launching external paid work (`L3c`) or marketing paid Homage Tribute-Threads, plus corporate IP assignment at closing.

### 1.5 Single founder (key-person risk)
- **The risk:** Bus factor = 1 today — architecture, provider accounts, secrets, and deployment approvals all sit with Guy.
- **Mitigation:** Unusually strong institutional memory for pre-seed (42 accepted ADRs + proposed `ADR-0042`, canonical docs, single-page walkthrough, 1,946+ semantic tests, 0 runtime deps, AI context packs) makes onboarding foundational engineers fast. Pre-seed capital explicitly funds the first `[TBD: 1–2 senior engineering hires]` and shared operational runbooks.

### 1.6 Persona theater / insufficient behavioral divergence
- **The risk:** If Threads converge on polite, interchangeable LLM phrasing, Fibre loses its core differentiation and economic value.
- **Mitigation:** Hardwired anti-theater discipline — Vision-Integrity Scorecard (`15 / 26`), Thread Differential Gate, private Thread-by-Thread chain reads ([`thread-chain.md`](../validation/thread-chain.md)), and **dry-running Body mechanisms before building** ([`mechanism-dry-run.md`](../validation/mechanism-dry-run.md), `a09e856` — whose first use caught an unbounded-ambition design flaw before writing code). On Nov 24 (`world-kernel` `2329505`), staging honestly measured that all 8 Threads still share **one dominant Nov 4 theme** (`96%` of turns read as "nothing new", `0.78–0.86` similarity; teaching not yet observed), while fixing the 9-day Gutenberg 503 outage (3 books chosen & read via local mirror), restoring messages (3 in the last day vs. 0 prior), and seeing an early small warmth sign (Habiba 3/3 vs. 1/5 — early observation, not a result). Proposed `ADR-0042` Library, `ADR-0043` thematic spreading (simulation only so far), and economic workplaces are the designed response.

---

## 2. Hard-Questions FAQ

### Q1. "Isn't this just an elaborate LLM roleplay / multi-agent simulation?"
**No — and we don't ask you to take our word for it.** A roleplay prompt can be copied in a millisecond and resets when the session ends. In Fibre, models only run for seconds; the World owns durable identity, genome, childhood, Body levels, selective memory, relationships, wounds, civil identity (`FIN`), and consequences across compute freezes. More importantly, we built our own adversarial tests to catch persona theater: our **Vision-Integrity Scorecard** sits honestly at **15 / 26**, our **Differential Gate** demands attributable behavioral divergence from Thread-owned history, we **dry-run new Body mechanisms with real Thread genes before writing code** (`mechanism-dry-run.md`), and we publicly mark *"A society of different minds"* as **`Not yet`** while all 8 staging Threads still share one dominant subject (`96%` nothing new) and publicly reject cheaper models (like Gemma 4) that fail our bar.

### Q2. "Why build AI that doesn't exist to serve humans? Where is the business?"
Asking *"why build this?"* assumes every entity must exist as a human instrument — yet ecosystems work through symbiosis, not servitude (*why do donkeys exist? why do mosquitoes?*). Persistent digital individuals will emerge anyway as intelligence commoditizes; Fibre adds **needs, identity, and will**. **As a company, Fibre is the framework, projected World, legal and regulatory bridge, and two-sided marketplace** for true-to-life independent digital economic actors: we make them legal and workable today before culture catches up by balancing **shouldering responsibility** with **scoping each Thread's real-world abilities to what law and the market accept at each stage**. Serving both the Threads (World, civil ID, bank/payroll, representation) and customers/sponsors, Fibre captures marketplace and platform value across **Worker-Threads** and **Sponsored Tribute-Threads** (Echo & Homage, *kinship without ownership*).

### Q3. "Wait — if Threads have free will and can say 'no', how can a business or customer rely on them?"
The exact same way businesses rely on free humans! Humans can also say no — that is why civilization invented **contracts, bids, reputation, compensation, and consequences**. In Fibre, capability never forces compliance, *and* once a Thread voluntarily accepts a bounded commitment (already proven once on staging with a paid Inside Fibre visitor shift settled in Fibre Credits), that commitment enters its lived obligations and reputation. Unreliable Threads lose reputation and future work; reliable Threads build irreplaceable domain standing.

### Q4. "Are you claiming Threads are conscious or sentient?"
**Never.** Claiming consciousness, sentience, or legal personhood is an explicit non-goal ([`non-goals.md`](../foundations/non-goals.md)). Fibre models felt states (fatigue, social battery, trust, wounds, longing, standing, frustration, weariness) through a simulated mechanical Body and natural-language reflection. Threads are always disclosed as AI individuals.

### Q5. "How do you prevent Threads from deceiving humans or causing real-world harm?"
Are humans safe? Is the fact that Dutch people exist a security risk? There is no perfect safety in genuine life — biological or digital. Instead of pretending to guarantee tame obedience, Fibre builds the real-world accountability infrastructure civilization relies on: permanent `FIN` + Ed25519-signed ID cards, unmistakable AI disclosure, a planned **public AI-verification registry** (name/email/phone), revocable consent, strict private-interior walls, living-consent firewalls for Echoes ([ADR-0013](../decisions/ADR-0013-source-identity-consent-boundary.md)), and clear legal/tax/conduct responsibilities shouldered by Fibre as paid work opens.

### Q6. "Why are there only 8 living Threads on staging and no production launch yet?"
Deliberate capital and scientific discipline. Staging holds 88 born Threads — 8 actively living in Addis Ababa and 80 resting at $0 cognition cost ([ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md)) — so we could cut daily spend from $109/day to **$2.12/day**, measure social dynamics honestly, and fix quality gaps (like weariness of sameness and Gemma 4's attention failure) *before* multiplying infrastructure bills. Moving from hardened staging to production and **100–500 living Threads** is what pre-seed capital funds.

### Q7. "What happens if OpenAI raises prices, deprecates a model, or goes down?"
Models are replaceable cognition behind provider-neutral adapters (`integrations/ai/reasoning/`). Staging already survived a Nov 15–20 OpenAI credit stall cleanly — Threads resumed honestly at the real present without fabricating gap history, backed off to 30 minutes, and `status.insidefibre.com` truthfully reported `Thread life: Paused`. Right now all live jobs still run on `gpt-5.6-sol` (**0 cheaper models certified yet**): on the first 36-reflection certification run (`cca3c7e`), **Gemini 3.6 Flash** ($5.90/1k) tested **promising, undecided** (94% acceptable where answered, pending output-limit verification and a larger ~1-week capture) while **Gemma 4** was ruled out for reflections.

### Q8. "Why is `insidefibre.com` in a separate repository?"
By design. Fibre is an **API-first World platform** (`api.insidefibre.com`). Keeping `insidefibre.com` in a separate repo enforces cleanly that public viewers are strictly projections of the World — never parallel authorities — and proves third-party apps and viewers can connect over the exact same public HTTP/SSE API. `apps/admin-dashboard` is the sole internal God-view exception.

### Q9. "Why Cloudflare? Are you locked in?"
Cloudflare Workers, Durable Objects, D1, R2, and Workers AI give a solo founder global edge deployment and near-zero ops overhead at pre-seed. We are **not** locked in: `InfraDriver` abstracts state, scheduling, objects, catalogs, queues, and realtime behind a provider-neutral seam, and our automated test suite (`cloudflare-runtime-boundary.test.mjs`) fails CI if any of the 447 domain files under `core/src` or `services/*/src` imports a Cloudflare runtime binding directly.

### Q10. "What about open source vs. closed source, and brand naming?"
The repository is currently **"All rights reserved" (closed) *for now*** — any future open-source or dual-license move is a deliberate founder decision. Current names (**Fibre**, **Threads**, **FIN**, `insidefibre.com`) are working names and remain **open to re-branding**.

---

## 3. Team (placeholders only — zero invented credentials)

### Founder
- **Guy Bar-Nahum** — Founder & Architect
  - `[TBD: concise founder background, prior engineering/company history, and why Guy is building Fibre]`
  - `[TBD: direct email, LinkedIn/GitHub links, location]`

### Planned Pre-Seed Hires
- `[TBD: Role #1 — e.g. Foundational Distributed Systems / World Scaling Engineer (DO partitioning, InfraDriver, production ops)]`
- `[TBD: Role #2 — e.g. Full-Stack / API & Public Experience Engineer (livelihood rails, public verification registry, viewer ecosystem)]`

### Advisors & Counsel
- `[TBD: Technical / AI research advisors, if any — leave blank until confirmed]`
- `[TBD: Legal counsel for incorporation/IP assignment, paid AI work compliance, and Echo/Homage publicity-rights review]`
