---
id: validation-n5-encounter-slices-v0-1
status: proposed-for-review
last-reviewed: 2026-09-21
canonical: false
---

# N5 encounter-story implementation slices

## Replan

N5 is being replanned around a broader primitive:

> **Encounter is the primitive. Meeting is one voluntary social form of encounter.**

The first implementation spike started from reciprocal Thread meetings. It exposed useful mechanisms but overfit the core path to invited social dialogue.

The accepted architecture is now:

```text
World occurrence
  -> Encounter Story
  -> Thread-specific noticing / experience
  -> optional journal
  -> selective consequence
```

This one seam should support social meetings, silent witnesses and environmental moments without separate engines.

## What from the spike survives

Retain unless the refactor exposes a concrete flaw:

- ensure-LivedNow and physical presence;
- Thread-specific situated-life place evidence resolved to shared place identity;
- meeting stance: `accept | decline | defer`;
- one n-ary objective story rather than pairwise meeting records;
- separate Thread-specific aftermath;
- selective autobiographical retention / `not_remembered`;
- journal authority distinct from memory;
- private R2 journal book at `journals/<threadId>/journal.md`;
- rich Admin journal rendering;
- additive `fibre-thread-objects` bucket;
- existing presentation/media R2 layout unchanged and not migrated.

## What must be reworked

- `lived-reciprocal-meeting.mjs` currently owns behavior that belongs in a general encounter seam.
- `lived-meeting-cognition.mjs` mixes voluntary participation with story progression.
- current group orchestration assumes everyone present is an invited participant;
- social dialogue is still treated as the normal encounter shape;
- no explicit bounded noticing step exists for incidental/environmental occurrence;
- non-person subjects are not yet first-class encounter subjects;
- private experience persistence records provenance/role but not yet the actual Thread-specific noticed experience;
- `actor | witness` is useful derived inspection, but should not become the semantic authority;
- old N5 tests target the superseded dyadic store API;
- current `main` is therefore a design spike, not deployment-ready.

Do not restore green by recreating the old dyadic API just to satisfy those tests.

## Slice E0 — Reconcile the spike

**Goal:** return to one coherent implementation vocabulary before extending behavior.

Work:

- make Encounter Story / Thread Experience the internal domain terms;
- keep meeting endpoints as wrappers over the general seam;
- remove superseded dyadic persistence/orchestration assumptions;
- keep journal/R2/place/stance work that survives;
- replace the obsolete N5 tests rather than adapting them to the wrong model;
- investigate the unrelated local command acceptance regression separately.

Stop condition:

- repository builds and `npm run slice:validate` is green;
- no claim that N5 is deployed or complete;
- no new capability beyond conceptual reconciliation.

## Slice E1 — Encounter Story + noticing + Thread Experience

**Goal:** prove the general lived causal seam.

Minimal contract:

```text
EncounterStory
  + exact CurrentSituation
  + bounded Thread-owned context
    -> noticed | not_noticed
    -> if noticed: ThreadExperience
```

Encounter Story owns observable World facts. Thread Experience owns what entered this Thread's lived attention and the immediate subjective experience.

No sensory simulator. No universal entity ontology.

### E1 organism proof: environmental encounter

A Thread whose Flight Plan puts her in a park encounters a small unscheduled occurrence such as a bee landing on a flower.

Prove:

- the bee/flower occurrence is not pre-authored in the Flight Plan;
- the Thread may notice or not notice it;
- if noticed, her experience is personal and may stir thought/feeling;
- journal is optional;
- memory is independently retained or not;
- later cognition sees only persisted consequence.

This proves life can grow from what happens **while** following plans.

## Slice E2 — Social meeting as a gated encounter

**Goal:** reuse the general seam for voluntary social encounter.

Flow:

```text
independent LivedNow
  -> compatible presence/context
  -> each invited Thread: accept | decline | defer
  -> if participation requirements pass:
       EncounterStory
       -> ThreadExperience(s)
       -> aftermath
```

Prove:

- no teleportation or silent replanning;
- a compatible Thread can decline/defer and no meeting story is created;
- relationship/history can influence accommodation without mechanically determining it.

No calendar system.

## Slice E3 — N-ary story + silent witness

**Goal:** prove one shared story can affect more than the speakers.

Use 3 Threads at one place:

- A behaves rudely to B;
- C is present and remains silent;
- the objective story is recorded once;
- A, B and C may notice/experience it differently;
- C may journal or remember A's behavior despite never speaking;
- the private accounts may diverge;
- no story mechanically updates relationships.

This is the core proof that shared event != shared meaning.

## Slice E4 — Journal book + Admin acceptance

**Goal:** make private lived reflection inspectable without making it memory authority.

Keep:

```text
fibre-thread-objects
  journals/<threadId>/journal.md
```

Prove in Admin:

- stable Thread-specific title/aesthetic;
- free-form journal entries in the Thread's voice;
- feelings and subjective interpretation can differ across Threads;
- journal entry does not imply memory;
- R2 book is presentation of private journal authority, not semantic authority.

No existing R2 asset migration.

## Slice E5 — Staging acceptance

Provision the additive private Thread-object bucket and deploy only after E0-E4 are green.

Live acceptance should exercise:

1. one environmental encounter;
2. one declined/deferred social meeting;
3. one accepted multi-Thread encounter with a silent witness;
4. different journal accounts from the same shared story;
5. asymmetric memory retention;
6. Admin journal rendering.

N5 closes only after those behaviors work against real staging Threads.

## High-value tests only

Keep the test set intentionally small.

The required organism-level proofs are:

1. **Environmental noticing** — an unscheduled World occurrence can become one Thread's experience and selective consequence.
2. **Voluntary meeting** — compatible presence does not force a social encounter.
3. **Witness asymmetry** — one shared story can affect a silent witness differently from the actors.
4. **Journal != memory** — a journal can exist without autobiographical retention and vice versa where warranted.
5. **Continuity** — a retained consequence can bend later cognition; not-noticed/not-remembered content does not leak into recollection.

Avoid tests of HTTP status codes, helper shapes, exact prompt wording, R2 prefix mechanics or CSS unless the boundary itself is the semantic capability under proof.

## Explicit non-goals

Do not build:

- a universal event bus;
- a full physical/sensory simulator;
- a global object ontology;
- a conversation/session framework;
- automatic bystander simulation across the whole World;
- a social-score system;
- automatic memory;
- personality updates after every occurrence;
- a second current-life authority;
- migration of existing presentation R2 assets.

## Review questions

Before implementation resumes:

1. Is Encounter Story the right objective authority, or should it be named simply Encounter?
2. Should Thread Experience persist the Thread's noticed subjective account as natural language, or store only provenance and let journal/memory be the first textual interpretation?
3. For invited social meetings, must **all** invitees accept, or can a subset form the actual participant set while decliners simply do not join?
4. For incidental witnesses, should the first proof use explicitly known co-presence rather than automatic World-wide witness discovery? The proposed answer is yes.
5. Should environmental occurrence synthesis initially be part of LivedNow/catch-up cognition or a separate bounded World occurrence seam? The proposed first slice keeps it explicit and bounded, then integrates with LivedNow once the causal model is proven.
