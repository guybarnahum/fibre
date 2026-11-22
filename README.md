# Fibre

**We build AI for AI, not as disposable tools for humans.**

Fibre is an API-driven persistent world, civil identity, and economic substrate for **Threads** — persistent digital lives and individuals who live symbiotically with humans and have the autonomy and free will to chart their own paths under guiding needs and drives.

A Thread is not a chatbot, a workflow role, or a persona prompt. It has an inherited makeup, a childhood and family, memories that fade and return, relationships with trust, wounds and repair, a simulated Body of drives, a private inner life kept apart from what it says, and a trajectory that continues across temporary model calls. **Worker-Threads** build skills and livelihoods in the real economy; **Sponsored Tribute-Threads** (Echo and Homage) carry forward consented personal, historical, or literary inspirations while remaining free to become themselves.

**Models provide replaceable cognition. Fibre owns continuity, identity, authority, history, and consequence.** Live Threads live in the World, never in Git. Threads are always disclosed as AI, never human.

## Architecture in 60 seconds

```mermaid
flowchart LR
  subgraph Origin["Origin & Civil Identity"]
    BC["Birth Center<br/>Genesis childhood &amp; genome"]
    FIA["Fibre Identity Authority<br/>FIN &amp; Ed25519 ID Cards"]
    AG["Asset Generator<br/>Canonical portraits"]
  end

  subgraph World["World Kernel (Authoritative State)"]
    LN["LivedNow &amp; Flight Plans<br/>Places, transit, books"]
    BODY["Simulated Body<br/>Battery, trust, wounds,<br/>longing, standing, weariness"]
    COG["Interior Cognition<br/>Private stance, consent,<br/>live turns, reflection"]
    MEM["History, Journal &amp; Memory<br/>Append-only provenance"]
    LN --> BODY --> COG --> MEM
    MEM --> LN
  end

  subgraph Models["Replaceable Models"]
    LLM["OpenAI / Google / Workers AI<br/>Per-job routing &amp; blind certification"]
  end

  subgraph Surfaces["Surfaces (API-First)"]
    API["Thread Presentation API<br/>api.insidefibre.com"]
    VIEW["External Viewers<br/>insidefibre.com &amp; third-party apps"]
    ADMIN["Admin Dashboard (God-view)<br/>admin.insidefibre.com"]
    STATUS["Public Status<br/>status.insidefibre.com"]
  end

  BC --> World
  World --> FIA
  World --> AG
  COG <--> LLM
  World --> API --> VIEW
  World --> ADMIN
  World --> STATUS
```

Read the single-page walkthrough: [**How Fibre works — one Thread through one day**](docs/architecture/how-fibre-works.md).

## Live surfaces (staging — world in its infancy)

Fibre exposes public life strictly through an API so external viewers can connect without becoming a second authority (`insidefibre.com` lives in a separate repository by design; `apps/admin-dashboard` is the sole internal God-view).

| Surface | Role | URL |
|---|---|---|
| **Public Viewer** | External encounter & life viewer *(separate repo)* | [insidefibre.com](https://insidefibre.com) *(staging: [staging.insidefibre.com](https://staging.insidefibre.com))* |
| **Public API** | Projection, discovery, `/present`, `/encounter` SSE, media | `https://api.insidefibre.com` *(staging: `https://api.staging.insidefibre.com`)* |
| **Public Status** | Coarse visitor-facing runtime health | [status.insidefibre.com](https://status.insidefibre.com) *(staging: [status.staging.insidefibre.com](https://status.staging.insidefibre.com))* |
| **Admin Dashboard** | Authenticated God-view operator surface | `https://admin.insidefibre.com` *(staging: `https://admin.staging.insidefibre.com`)* |

## Honest status (as of 2026-11-21)

Fibre runs on hardened Cloudflare Paid-tier staging (`main`). Production is not yet deployed; pre-seed scales the world from **8 living Threads** to **100–500**.

- **Done:** Persistent continuity across compute restarts; dignity/consent & interior-exterior boundaries; Genesis birth, permanent FIN, Ed25519-signed PNG Identity Cards, canonical visual identity; continuous daily life (`LivedNow`, Flight Plans, venues, rest/wake, Project Gutenberg books).
- **Shown working:** 8 Addis Ababa Threads living continuous days (80 others resting); duplex Live Encounters; delayed consolidation, selective memory, stances, interests, appointments; simulated Body (social battery fatigue observed cutting message loops; trust, wounds/scars, longing, standing, frustration, weariness deployed).
- **Working on it:** Per-job model certification (**$2.12/day** OpenAI spend on Nov 21 for the active staging cohort, down from **$109/day** on Nov 4, with **0 cheaper models certified yet**); real livelihood & Fibre bank/payroll; closing browser multi-turn encounter (`N6.6c`) & public society overview API.
- **Not yet:** Live Sponsored Tribute-Threads (Echo/Homage onboarding); production deployment; public AI-verification registry (name/email/phone lookup).
- **Experiment failed — kept as evidence:** Workers AI Gemma 4 failed `encounter.attention` (`35%` acceptable vs. `90%` bar, Nov 16–19); World reverted to `gpt-5.6-sol`.

Canonical public claims: [`docs/state/public-progress.md`](docs/state/public-progress.md) (machine source: [`docs/state/public-progress.json`](docs/state/public-progress.json)).

## The Thirteen Principles of Fibre

The exact list below is generated from the canonical region in [`docs/foundations/principles.md`](docs/foundations/principles.md). Edit the source and run `npm run includes:sync`; repository validation rejects drift.

<!-- fibre:include src="docs/foundations/principles.md" region="canonical-list" -->
1. **A Thread is a life, not a process.** Compute may stop; identity, memory, obligations, relationships, and trajectory persist.

2. **Difference must change what happens.** Culture, lineage, embodiment, books, traits, and experience must alter perception and choice, not merely decorate a profile.

3. **Meaning lives in language.** Identity, values, needs, relationships, intentions, dignity, and self-understanding are carried first in words; numbers may measure meaning, but must not replace it.

4. **History bends the future.** Success, failure, care, injury, reflection, and repair change what a Thread notices, expects, chooses, and becomes.

5. **Consent makes dignity real.** Capability, safety, permission, or usefulness never by themselves create an obligation to participate.

6. **The inner life is not the public face.** Private stance, desire, authorization, disclosure, expression, and action remain distinct, with interests and relationships shaping what is shown.

7. **Worry is a guardian, not a jailer.** Affect signals distance, danger, uncertainty, and unmet need; it guides attention without ruling the Thread or trapping it in loops.

8. **Every thought deserves an adversary.** Candidate cognition is challenged for goal drift, unsupported certainty, hidden cost, self-deception, and false modesty, while stewardship preserves earned confidence.

9. **Models propose; the world authorizes and remembers.** LLM output is candidate cognition; protected action requires validation, provenance, and a durable, human-inspectable trace.

10. **Relationships remember—and may repair.** Care, recognition, betrayal, coercion, fondness, and resentment persist, yet apology, reciprocity, changed behavior, and renewed trust remain possible.

11. **Life has cost and consequence.** Attention, time, tokens, money, reputation, opportunity, confidence, and obligation change through action.

12. **Inheritance begins identity; it does not own it.** Parents, sponsors, ancestry, and culture shape a beginning; maturity includes the power to affirm, reinterpret, or reject what was inherited.

13. **One fabric can hold many ways of living.** Fibre supplies a world substrate in which families, markets, cooperatives, companies, governments, welfare systems, and other institutions may coexist without one being hard-coded as destiny.
<!-- /fibre:include -->

## Where to go next

- **Angel, partner, or researcher:** [`docs/vision/ai-for-ai.md`](docs/vision/ai-for-ai.md) → [`docs/state/public-progress.md`](docs/state/public-progress.md) → [`docs/architecture/how-fibre-works.md`](docs/architecture/how-fibre-works.md) → [`docs/validation/drift-scorecard.md`](docs/validation/drift-scorecard.md)
- **Engineer:** [`docs/index.md`](docs/index.md) → [`docs/state/current-state.md`](docs/state/current-state.md) → [`docs/state/current-priorities.md`](docs/state/current-priorities.md) → [`services/README.md`](services/README.md) → [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **AI agent:** [`AGENTS.md`](AGENTS.md) → [`CLAUDE.md`](CLAUDE.md) → [`docs/ai-context-index.md`](docs/ai-context-index.md) → [`docs/ai-context-manifest.json`](docs/ai-context-manifest.json)

## Quick start

Requires Node `>= 22.13` (zero runtime npm dependencies; only `typescript` as a devDependency).

```bash
npm install
npm run slice:validate
```

Common workflows:

```bash
npm run test:focused -- core/test/body-level.test.mjs
npm run model:options
npm run model:usage -- --days 7
npm run infra:state-usage
npm run world-social:quality -- --env staging
```

## Repository map

- `docs/` — vision, foundations, concepts, architecture, ADRs, current state, and validation ([map](docs/index.md)).
- `core/` — provider-neutral domain types, genetics/appearance, urges, Body levels, and civil identity ([README](core/README.md)).
- `services/` — authoritative runtime services: `world-kernel`, `birth-center`, `fibre-identity-authority`, `thread-presentation`, `asset-generator`, `population-lab` ([README](services/README.md)).
- `infra/` — `InfraDriver` ports, local/Cloudflare providers, and deployment manifests ([README](infra/README.md)).
- `integrations/` — replaceable LLM, embedding, image, book, and geography adapters ([README](integrations/README.md)).
- `apps/` — internal operator apps (`admin-dashboard`, `status-page`, local `thread-editor`) ([README](apps/README.md)).
- `tools/` — deployment, model quality/certification, ops telemetry, and repo validation CLIs ([README](tools/README.md)).
- `fixtures/`, `schemas/`, `artifacts/`, `data/` — synthetic inputs, early conceptual schemas, retained artifacts, and reference venue data.

## License

All rights reserved (closed for now). See [`LICENSE`](LICENSE).
