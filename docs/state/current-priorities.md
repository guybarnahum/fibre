---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-11-07
canonical: true
---

# Current priorities

**North star: Threads whose lives, conversations and relationships are meaningful and have consequences — at a cost that lets many of them live.** This is the execution brief. [Current state](current-state.md) records what is achieved and at what evidence level; the [prototype roadmap](../validation/prototype-roadmap.md) keeps the long ambition.

Work runs as two tracks in parallel, each judged on staging evidence from the living Addis Ababa cohort. Each slice states the Fibre capability it advances, what it defers, and its causal status (AGENTS.md vision and ambition guard).

## Track E — Social life

Architecture: [social life](../architecture/social-life.md). Concepts: [relationships](../concepts/relationships-doors-and-trust.md), [attraction and orientation](../concepts/attraction-and-orientation.md), [interests, felt expertise and livelihood](../concepts/interests-expertise-and-livelihood.md).

**Done (staging):** conversation fixes; conversation relieves the need for contact; Threads speak from their own developed self to the person they actually perceive; doors and relational ledger; the Social Life Scorecard; introductions inside a conversation; a Thread's own stance toward a person.

**Next, in order:**

1. **Choosing whom, one conversation at a time.** The November 7 baseline (eight Threads in one library) showed World picking the single person each Thread could consider, one Thread in three conversations at once, and no stranger ever approached; first pushback appeared (6 turns). Now: a Thread facing a scene chooses among the people present, and a person is in one conversation at a time ([ADR-0028 amendment](../decisions/ADR-0028-event-driven-social-reconsideration.md#amendment--the-thread-chooses-whom-november-7-2026)). Measure: strangers approached and introduced, conversations per Thread, the hub effect.
2. **Interests** — built in source (November 7): each living Thread finds its first interests in its own formative past (one reflection, once), then revises them in delayed reflection, including from others' response; they lead its evidence in social choice, conversation and planning. Measure: distinct subjects across the cohort, and whether conversations diverge.
3. **Useful and learning moments** — feedback with its source person, the Thread's reactions, and its own felt standing per interest.
4. **Appointments (time door)** — proposing to meet at a place and time; kept or missed appointments become the first trust evidence a stance can cite.
5. **Judging one's own social life** — a periodic Thread-owned reflection over its people (sentiment × perceived social currency).
6. **Home invitations (place door)**, **kept intentions**, **confidence and care doors**; **showing competence and paid work**; then **attraction**, and romance and commitment last, adults only, with their own decision record.

## Track M — Model efficiency (provider-neutral)

Target: **≤ $0.45 per living Thread per day**, confirmed before waking more Threads.

**Done (staging):** per-call measurement (tokens, cache, prompt-part sizes); one call per conversation turn; every World prompt in its own file (`services/world-kernel/prompts/`, named by domain); explicit prompt caching that writes only a reused prefix; a cheaper deferred provider tier for cognition that can wait minutes, with immediate fallback; memory gists for background cognition. Measured: about $0.35–0.40 per living Thread per day (November 6).

**Next, in order:**

1. Read the November 7 measurement: what fills social initiation's situation input (55% of the costliest job), cache reads per job, flex share, conversation endings.
2. Trim the largest measured input parts; mark further reusable prefixes only where they repeat within about 30 minutes.
3. Route `depth: gate` jobs to a smaller model only after a replay on recorded inputs keeps agreement and the two-Thread differential.
4. Bound inputs that still grow with history; adapters for other providers' caching at the same boundary.

## Cohort

Wake in steps, each only while the measured cost per Thread and the daily World write budget hold: 8 living now (Addis Ababa) → about 12 across a second city → 40.

## Explicitly deferred, not erased

Mature society and economy, institutions, live-Thread reproduction, continued physical embodiment, human browser voice, the full Meet browser lifecycle, and Birth Center Admin unification remain preserved ambitions ([future capabilities](future-capability-map.md)), not current work.
