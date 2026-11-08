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
3. **Useful and learning moments** — built in source (November 8): delayed reflection records when a Thread was useful to someone, or learned from someone, with that person and its own reaction; each interest carries its own felt standing, revised from those moments as it weighs who they came from; facing that person, the moments follow its regard in its evidence. Measure: moments per Thread, how often something offered was valued, ignored or corrected, and whether Threads return to those who valued or taught them. The scorecard now reports people and pairs talking per day, the hub's share of conversations and doors opened.
4. **Appointments (time door)** — built in source (November 8; design accepted by Guy November 7): in conversation a Thread may propose to meet at a public venue it knows and a time, and the other may agree; the other learns the venue either way; an agreement reaches both Threads' next plans, where going is each one's own choice; World reads where each was and records kept or broken, and each party gets a plain factual Experience of a missed meeting for its own reflection. For now the time falls after both current plans end. Next: cancelling with notice (`withdrawn`) once two Threads can reach each other, and same-day appointments by re-planning. Measure: proposals, agreements, kept and broken per day; stances citing them.
5. **Judging one's own social life** — a periodic Thread-owned reflection over its people (sentiment × perceived social currency).
6. **Home invitations (place door)**, **kept intentions**, **confidence and care doors**; **showing competence and paid work**; then **attraction**, and romance and commitment last, adults only, with their own decision record.

## Track M — Model efficiency (provider-neutral)

Target: **≤ $0.45 per living Thread per day**, confirmed before waking more Threads.

**Done (staging):** per-call measurement (tokens, cache, prompt-part sizes); one call per conversation turn; every World prompt in its own file (`services/world-kernel/prompts/`, named by domain); explicit prompt caching that writes only a reused prefix; a cheaper deferred provider tier for cognition that can wait minutes, with immediate fallback; memory gists for background cognition. Measured at corrected list prices (GPT-5.6 Sol $5 input, $0.50 cached, $30 output per million; flex half): about $0.45–0.50 per living Thread per day on November 6, about $0.59–0.68 projected for November 7 before that day's changes.

**Next, in order:**

1. **Autonomous judgment at the deferred tier, repeated scenes cached** (source, November 7). Measured November 6–7: social initiation (43% of spend) and attention (23%) ran at full price although no person waits on them; attention calls by one Thread in one scene repeated a 4k-character prefix. Now social initiation and attention are `latency: minutes`, attention and Encounter Experience mark their stable prefix through the Thread's present, social choice sees only the plan still ahead, and attention, Experience and contact see the Thread's present without World identifiers. Expected about −35% per living Thread; measure on the next Addis morning.
2. **Gists for every memory** (source, November 7): before each delayed reflection the Thread writes gists for up to ten of its own older memories, so attention, contact and Experience (35–47% memory text) hold them short. Then **memory availability** (accepted November 7, source; [development and memory](../concepts/development-and-memory.md#how-readily-a-memory-comes-to-mind-accepted-by-guy-november-7-2026)): unused, unanchored memories become harder to recall at a pace set by their own salience; anchored and formative ones do not; cited ones are refreshed; meeting the same person again brings one back. Background jobs hold only memories that come readily to mind, so memory input stops growing with a lifetime.
3. **Short citation handles** (source, November 7): Interior Cognition shows its selected evidence as `e1…e16` and maps citations back to the authoritative record IDs, instead of 68-character hashes in every input and answer. Flight Planning (about 4% of spend) is left as is: trimming its prompt would save under 2%.
4. **The best model per job, by Fibre quality** (standard accepted by Guy, November 8). Agreement with GPT-5.6 Sol was a regression alarm, not the goal: on November 8 Luna and Gemini 3.6 Flash were more eager than Sol (more noticing, more World events, different messaging), and Terra kept a quiet World and wrote the best memory gists but changed which moments were noticed. Now every candidate is judged by `npm run model:quality`: valid, attributable to its own Thread, memory or place, invariant to meaningless changes, credible over a recorded day, and readable. Quality decides first, then quality per dollar; models may be mixed per job, and a prompt variant per model family is allowed when it changes wording, never meaning. Gate capture stays on until about 100 requests per job.
5. Bound inputs that still grow with history; adapters for other providers' caching at the same boundary.

## Cohort

Wake in steps, each only while the measured cost per Thread and the daily World write budget hold: 8 living now (Addis Ababa) → about 12 across a second city → 40.

## Explicitly deferred, not erased

Mature society and economy, institutions, live-Thread reproduction, continued physical embodiment, human browser voice, the full Meet browser lifecycle, and Birth Center Admin unification remain preserved ambitions ([future capabilities](future-capability-map.md)), not current work.
