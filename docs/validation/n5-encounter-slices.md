---
id: validation-n5-encounter-slices-v0-1
status: accepted
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
- existing memory reconstruction precedent: durable rich prompt/evidence lineage with replaceable generated media;
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
- Encounter Story does not yet carry the durable rich visualization prompt needed for reproducible still/video reconstruction;
- `actor | witness` is useful derived inspection, but should not become the semantic authority;
- old N5 tests target the superseded dyadic store API;
- current `main` is therefore a design spike, not deployment-ready.

Do not restore green by recreating the old dyadic API just to satisfy those tests.

## Slice E0 — Reconcile the spike — CLOSED

**Goal:** return to one coherent implementation vocabulary before extending behavior.

Completed:

- Encounter Story / Thread Experience now name the general persistence seam;
- social meeting is a wrapper over that seam rather than the persistence authority;
- meeting cognition owns participation only; social story progression is separate;
- superseded dyadic meeting persistence/orchestration and tests were removed rather than compatibility-wrapped;
- persisted `actor | witness` authority was removed;
- journal/R2/place/stance work that survived the replan was retained;
- the admin-disabled process test now explicitly removes inherited `FIBRE_ADMIN_TOKEN`;
- full repository CI validation, all tests and Cloudflare dry-runs are green.

The durable Encounter Story visualization prompt is intentionally implemented in E1, where the Encounter Story itself becomes a complete admitted general encounter record.

E0 adds no new lived capability; it establishes one coherent base for E1.

## Slice E1 — Encounter Story + noticing + Thread Experience + visualization prompt — CLOSED

**Goal:** prove the general lived causal seam and make every admitted Encounter Story reproducibly visualizable without requiring a render.

Implemented causal path:

```text
explicit bounded World occurrence
  -> exact LivedNow
  -> objective Encounter Story
       + Thread presence
       + durable rich visualization prompt/evidence lineage
  -> Thread-owned attention appraisal
       noticed | not_noticed
  -> if noticed: Thread Experience in first-person natural language
  -> optional journal
  -> selective memory / not_remembered
```

The environmental seam takes only a stable `occurrenceRef` plus natural-language observable description. It does not create a weather engine, sensory simulator or object ontology.

Encounter Story now persists:

```text
story
threadPresence[]
visualizationPrompt
visualizationPromptDigest
visualizationSourceReferences[]
depictedThreadRefs[]
```

The visualization prompt is deterministic, evidence-bound and media-neutral. It contains explicit scene, observable progression, visual direction, unspecified-detail rules and truth constraints so the same authority can later ground a representative still or a short video. Rendering remains optional.

If no canonical visual identity is bound, the prompt explicitly refuses to invent an identifiable Thread appearance. E4 will connect optional rendering and admitted identity references.

Attention is durably recorded so retries cannot turn a previously unnoticed occurrence into a later noticed one. `not_noticed` creates no Thread Experience. `noticed` atomically creates a Thread Experience with the immediate first-person experience text, and journal/memory cognition receives that personal experience rather than only the objective story.

### E1 organism proof

The accepted proof uses a Thread already walking through a park because of ordinary LivedNow:

- a bee landing on a flower is introduced as an unscheduled World occurrence;
- the objective story is admitted independently of whether the Thread notices it;
- the bee enters attention and becomes a personal calming/attention-shifting experience;
- that experience reaches ordinary selective autobiographical retention;
- a separate cloud occurrence in the same lived setting is admitted but passes `not_noticed`;
- the unnoticed cloud creates no Thread Experience, journal aftermath or memory;
- the encounter visualization is rich and reconstructable but does not invent an unbound likeness.

This proves that life can grow from what happens **while following plans**, and that objective World occurrence remains distinct from lived attention.

Full active and complete test suites, repository validation and all Cloudflare deployment dry-runs are green.


## Slice E2 — Social meeting as a gated encounter — CLOSED

**Goal:** reuse the general seam for voluntary social encounter.

Implemented path:

```text
independent LivedNow
  -> compatible presence/context
  -> each invited Thread: accept | decline | defer
  -> if every required participant accepts:
       one objective Encounter Story
       -> each active participant is durably noticed
       -> distinct first-person Thread Experience
       -> ordinary journal / memory aftermath
```

E2 proves:

- the meeting wrapper reconciles each life independently before doing anything social;
- incompatible physical/mediated presence creates no Encounter Story and does not teleport or silently replan anyone;
- a compatible Thread may decline, and that stops the voluntary encounter before history exists;
- relationship, memory and interior state are supplied to meeting stance cognition without becoming a mechanical score;
- accepted participants reuse the E1 attention/experience authority, with participation making attention deterministically `noticed` rather than adding a redundant attention cognition call;
- one shared Encounter Story may already produce different private Thread Experiences before journal or memory.

No calendar or invitation subsystem was added.

Full repository CI validation is green.

## Slice E3 — N-ary story + silent witness — CLOSED

**Goal:** prove one shared story can affect more than the speakers.

Implemented path:

```text
A + B independently current
  -> compatible voluntary meeting
  -> A and B accept
  -> one objective Encounter Story
       + A presence
       + B presence
       + explicitly known, independently current C presence
  -> A/B participation => durably noticed
  -> C receives no stance and no story turn
  -> C uses the E1 attention authority
       noticed | not_noticed
       -> if noticed: C Thread Experience
       -> ordinary private journal / selective memory aftermath
```

E3 deliberately does not add a witness subsystem. The social wrapper now distinguishes voluntary `participantThreadIds` from explicit `witnessThreadIds`, while Encounter Story remains the single n-ary authority. Every listed Thread is independently reconciled through LivedNow and checked for compatible presence before admission.

Witnesses:

- are not invitees and do not receive `accept | decline | defer`;
- are excluded from social story cognition and therefore cannot be fabricated as speakers;
- are included in the one objective `threadPresence` only when their own World-owned current situation establishes co-presence;
- reuse E1 `noticed | not_noticed` attention;
- receive Thread Experience and ordinary journal/memory aftermath only when noticed.

No relationship state is mechanically changed by encounter admission or attention.

### E3 organism proof

The accepted proof places Mina, Noor and Sela independently at the same café. Mina speaks rudely to Noor; Noor answers; Sela is at the next table and never speaks.

The proof establishes:

- exactly one Encounter Story carries all three genuine presences;
- only Mina and Noor receive meeting stance and social story cognition;
- Sela has no objective story beat;
- Sela notices the exchange through the general attention authority;
- all three private experiences cite the same objective story while diverging in lived meaning;
- Sela can privately journal the incident and selectively retain autobiographical memory despite never being addressed.

Full repository CI validation and all deployment dry-runs are green.

This is the core proof that shared event != shared meaning.

The shared Encounter Story has one objective visualization prompt. A later memory reconstruction for A, B or C is separately derived from that Thread's retained memory and may legitimately look different.

## Slice E4 — Journal book + optional encounter rendering + Admin acceptance — CLOSED

**Goal:** make private lived reflection inspectable without making it memory authority, and prove the E1 Encounter Story visualization lineage can be inspected and optionally rendered through existing generated-asset machinery.

Implemented without adding a second authority:

```text
World Encounter Story + Thread attention + World journal-entry provenance
                    |
                    +-> Admin read-only inspection
                    |
private R2 journal book ------------------------^

Encounter Story.visualizationPrompt
  + depicted Thread refs
  + each Thread's canonical visual identity
  + age(Thread.birthDate, encounter.occurredAt)
       -> ordinary experience asset slot
       -> existing generated-asset demand/job machinery
```

Admin now presents the stable Thread-specific journal title/aesthetic and free-form book while also exposing the underlying World journal-entry records separately. The UI names the distinction explicitly: the R2 book is presentation of private journal authority; neither the book nor a journal record implies autobiographical retention.

Admin also exposes, per Encounter Story:

- the objective story and genuine Thread presence;
- the E1 objective visualization prompt;
- prompt digest and source-reference lineage;
- depicted Thread refs;
- this Thread's own `noticed | not_noticed` attention / Thread Experience.

Optional encounter rendering is now a small planner over the same E1 lineage. It does not create a new render authority or store. It produces the existing `experience` presentation-asset slot shape for either image or video. When a Thread is objectively depicted, the planner requires that Thread's own canonical visual reference and derives target age from the encounter timestamp. Missing required visual identity defers the render rather than inventing a likeness. Video planning additionally refuses to invent identity-specific voice.

Generated encounter media remains replaceable representation. The planner's constraints explicitly prohibit treating it as World evidence, Thread Experience, journal, memory, relationship state or identity authority.

Social Encounter Stories now bind `depictedThreadRefs` from actual observable story actors rather than all co-present Threads, so a silent witness is not visually inserted merely because she was nearby.

### E4 organism proof

The focused E4 proofs establish:

- Admin can receive one objective Encounter Story, its visualization lineage, this Thread's attention and World journal-entry provenance while the Thread has zero autobiographical memories;
- the same Thread retains her stable private journal presentation independently of memory;
- one objective social Encounter Story can plan both a still and a video from the same durable prompt;
- Mina and Noor carry separate canonical visual references and chronology-derived ages into that render demand;
- private witness interpretation does not enter the objective render brief;
- the still becomes a normal generated-asset job through existing presentation-demand machinery;
- omitting Noor's canonical visual reference defers the render instead of inventing her appearance.

The first implementation commit exposed one prohibited private cross-owner Asset Generator import. The repository dependency gate caught it immediately; the planner was simplified to own only its intentional `image | video` choice and delegate ordinary asset validation to the existing demand seam. The replacement full CI run is green.

No existing presentation R2 objects were migrated. No encounter render is required for Encounter Story completion, and E4 does not require a live provider-generated image/video; that remains optional staging evidence.

## Slice E5 — Staging acceptance — CURRENT

`E5` is the roadmap label only. The enduring executable/evidence surface is named `lived-encounters` so commands, events and artifacts continue to describe the Fibre capability after this slice is history.

Provision the additive private Thread-object bucket and deploy only after E0-E4 are green.

The acceptance plumbing is now implemented and green in repository validation:

- deployed World exposes the already-proven E1 environmental encounter authority through a private operator route;
- the private social-meeting adapter preserves E3's explicit `witnessThreadIds`;
- the staging runner refreshes real Threads through LivedNow, refuses to fake co-presence, searches boundedly for genuine compatible social presence, requires an actual decline/defer and a separate accepted silent-witness story, checks divergent journals and retained/not-remembered asymmetry durably, runs the same journal presentation model used by Admin, and feeds the admitted objective visualization lineage into the existing generated-asset machinery for one still while validating the corresponding video brief;
- generated evidence stores references/outcomes/digests rather than private journal or prompt content.

E5 uses the established local staging operator path rather than a separate CI credential path. `npm run cloud:prepare:staging` loads local `.env`, idempotently provisions the declared Cloudflare resources (including `THREAD_OBJECTS`), configures the Worker secrets/runtime values, deploys the exact clean source SHA, and deploys the staging apps. `npm run lived-encounters:staging` then runs the strict acceptance harness against that SHA-bound deployment evidence. E5 stays open until this operator-run staging evidence passes.

Live acceptance should exercise:

1. one environmental encounter;
2. one declined/deferred social meeting;
3. one accepted multi-Thread encounter with a silent witness;
4. different journal accounts from the same shared story;
5. asymmetric memory retention;
6. Admin journal rendering;
7. one E1 Encounter Story visualization prompt that can feed a still render and is semantically suitable for a short-video renderer without changing encounter truth.

N5 closes only after those behaviors work against real staging Threads.

## High-value tests only

Keep the test set intentionally small.

The required organism-level proofs are:

1. **Environmental noticing** — an unscheduled World occurrence can become one Thread's experience and selective consequence.
2. **Voluntary meeting** — compatible presence does not force a social encounter.
3. **Witness asymmetry** — one shared story can affect a silent witness differently from the actors.
4. **Journal != memory** — a journal can exist without autobiographical retention and vice versa where warranted.
5. **Visualization truth** — the encounter reconstruction prompt contains only admitted objective scene evidence while a Thread's memory reconstruction remains separately subjective.
6. **Continuity** — a retained consequence can bend later cognition; not-noticed/not-remembered content does not leak into recollection.

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
- migration of existing presentation R2 assets;
- an encounter render completion obligation;
- provider-specific video orchestration in World state.

## Review questions

Before implementation resumes:

1. Is Encounter Story the right objective authority, or should it be named simply Encounter?
2. Should Thread Experience persist the Thread's noticed subjective account as natural language, or store only provenance and let journal/memory be the first textual interpretation?
3. For invited social meetings, must **all** invitees accept, or can a subset form the actual participant set while decliners simply do not join?
4. For incidental witnesses, should the first proof use explicitly known co-presence rather than automatic World-wide witness discovery? The proposed answer is yes.
5. Should environmental occurrence synthesis initially be part of LivedNow/catch-up cognition or a separate bounded World occurrence seam? The proposed first slice keeps it explicit and bounded, then integrates with LivedNow once the causal model is proven.
