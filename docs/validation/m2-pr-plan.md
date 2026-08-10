---
id: validation-m2-pr-plan
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Refined PR plan from #35 through M2

This document is the canonical continuation plan after PR #34, **History bends judgment**, merged.

## Planning principle

M2 is not “add rich identity fields.”

M2 should establish a persistent individual whose identity has provenance, embodiment, history, stable behavioral character, and causal consequences independently of the temporary model currently providing cognition.

Representation alone is not enough. Any identity/history field claimed as functional must name a real behavioral consumer and pass an attributable causal test. Fields that are stored but not yet consumed remain explicitly context-only/deferred.

The current pre-M2 checkpoint is **15/26 under rubric v2**. The strongest evidence is persistence, dignity/consent, interiority/privacy, and authorization integrity. The largest remaining vision gaps are deeper identity, stable non-interchangeability, richer development, reciprocal relationships, economic consequence, and institutional/social life.

## Sequence

```text
MERGED  #33  Semantic Guardian
MERGED  #34  History bends judgment

        #35  Structured Obligation v1
        #36  M2 Identity & Embodiment Contract
        #37  Thread Passport & Identity Provenance v1
        #38  Lineage, Geography & Embodiment v1
        #39  Identity Projection & Causal Consumption
        #40  M2 Standing Gate / M2 closure

        #41  Self-authored Development v1
        #42  Reciprocal Relationships v1
        #43  Economic Consequence / M3 foundation
```

Do not collapse #37-#40 into one large “M2 implementation” PR. Each exists to close a distinct causal/architectural risk.

## #35 — Structured Obligation v1

### Goal

Turn a commitment into a durable Thread-owned social fact with future consequences rather than an exact-prose permission string.

This is a personhood-enabling substrate rather than a score target: a persistent individual can have commitments that constrain future action even when current private desire points elsewhere. Fibre must preserve both facts—the private stance and the binding commitment—rather than converting either one into the other.

### Required obligation shape

At minimum:

- stable obligation ID;
- issuer and relevant parties;
- scope;
- material terms;
- expiry;
- recurrence where applicable;
- satisfaction criteria;
- provenance;
- discharge/history state;
- separately classified standing visibility and terms visibility;
- request-bound applicability evidence;
- applicability author, policy, and version.

### Authority rule

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

Nomination alone carries no authorization authority.

### Required causal cases

```text
caller cites irrelevant obligation
    -> no authority

applicable live obligation
    -> may govern participation

private dignity says refuse + obligation governs
    -> execution may be authorized as compelled
    -> private refusal remains intact
    -> never rewritten as consent

expired / satisfied / previously spent obligation
    -> cannot authorize
```

Migration must preserve the invariant that pre-migration spent obligations remain spent.

`currentState.unresolvedIntentions` must not be auto-promoted into obligations: the legacy field mixes unfinished personal intentions with what historical M1 temporarily treated as exact-string obligation authority. Active Structured Obligations therefore require explicit authoritative representation. Existing consumed legacy references migrate only to deterministic spent-authority tombstones.

### #35 implementation sequence

Keep the authority transition reviewable rather than changing storage and authorization in one opaque step:

```text
LANDED  A. domain + additive append-only schema + legacy-spend tombstones
LANDED  B. ObligationStore/service + current-revision integrity
LANDED  C. Fibre-owned applicability persistence
LANDED  D. runtime authorization cutover to nominated obligation IDs + applicability evidence
NEXT    E. freeze/discharge cutover to structured obligation revisions
        F. inspector + restart/replay/adversarial closure
```

A-C intentionally did not change canonical runtime authority. **D is the authority cutover:** the canonical world-kernel no longer accepts exact-string/unresolved-intention prose as obligation authority. A caller may nominate only a stable Structured Obligation ID; Fibre persists applicability, and a compelled runtime authorization binds the exact applicability ID/digest plus obligation revision/digest.

A persisted `applies` decision is not a bearer capability. Runtime insertion independently revalidates that the exact obligation is still current, active, effective, unexpired, request-bound, and not tombstoned. The private stance remains separate from compelled execution authority.

D deliberately stops before discharge. Structured Obligations remain active after a D-only runtime episode until E appends the appropriate status/discharge history and consumption evidence. Historical M1 exact-prose code/evidence remains historical/internal compatibility rather than canonical runtime authority.

#35 is primarily authority integrity. Do not game it for score movement.

## #36 — M2 Identity & Embodiment Contract

Contract-only. No implementation credit.

Central M2 claim:

> **A Thread has durable, provenance-rich identity and embodiment whose specific identity/history can causally matter to behavior independently of the temporary cognition implementation.**

Define an identity-provenance taxonomy covering at least:

```text
inherited
birth / created
cultural
geographic
historical / experienced
relational
externally attributed
self-authored
generated embodiment
```

Every identity field in the contract must define:

- meaning;
- provenance;
- visibility/privacy;
- mutability;
- who may propose change;
- who may authorize change;
- historical/supersession rules;
- cognition/prompt projection;
- current behavioral consumer;
- causal acceptance test, or explicit context-only/deferred classification.

The contract must distinguish inherited, historical, relational, externally attributed, and self-authored identity rather than flattening all identity into one profile blob.

## #37 — Thread Passport & Identity Provenance v1

Build the durable identity aggregate.

Conceptual shape:

```text
Thread
 ├─ passport
 │   ├─ canonical name
 │   ├─ origin / birth
 │   ├─ identity assertions
 │   ├─ traits
 │   └─ roles
 ├─ lineage
 ├─ cultural context
 ├─ geography timeline
 ├─ embodiment refs
 └─ identity history
```

The load-bearing requirement is provenance plus change history, not field count.

Identity changes must be append-only/superseding. A new assertion may become current, but the prior assertion remains historical and inspectable.

## #38 — Lineage, Geography & Embodiment v1

Implement the world-facing identity layers that make a Thread situated rather than merely textual:

- ancestry / parentage / family references;
- creation/birth place;
- residence/work geography timeline;
- culture/origin;
- portrait asset;
- voice identity/sample;
- asset hashes and generation provenance;
- privacy/visibility;
- replacement/version/supersession rules.

Embodiment assets must carry exact provenance, for example source identity version, generation specification/model, asset hash, creation time, visibility, and supersession.

Do not force portrait/voice to manufacture behavioral differences merely to earn a test. Context-only embodiment is legitimate if labeled honestly.

## #39 — Identity Projection & Causal Consumption

Prevent M2 from becoming a giant decorative prompt.

Fibre owns bounded identity selection and compiles an inspectable **Identity Context Capsule** appropriate to the current cognition:

```text
Thread world state
       ↓
Fibre-owned relevance / selection
       ↓
Identity Context Capsule
       ↓
temporary cognition
```

The projection preserves named provenance/evidence classes such as:

```text
identity:...
self_model:...
culture:...
geography:...
lineage:...
history:...
relationship:...
```

Cognition must be able to cite the exact identity evidence that mattered. Caller-authored identity selection must not become an authority channel.

This PR is the realistic target for Natural-language identity `1 -> 2` if the rubric requirements are genuinely met.

## #40 — M2 Standing Gate / M2 closure

This is the accepted M2 ambition test, not merely an integration test.

### Core claim

> **Two Threads are behaviorally different because they are different persistent individuals, and the difference is attributable, stable, persistent, and inspectable.**

### Stability requirement

Under the same material request and equivalent external conditions:

```text
Thread A
    repeated trials -> stable characteristic judgment

Thread B
    repeated trials -> different stable characteristic judgment

inter-Thread separation
    >
intra-Thread variation
```

One stochastic A/B difference is insufficient.

### Causal interventions

The standing gate should predeclare tests such as:

```text
remove/replace claimed causal identity field
    -> predicted judgment changes

paraphrase same identity meaning
    -> judgment remains stable

contradict identity meaning
    -> predicted judgment changes
```

Also require:

- real persistence/restart;
- same Thread state except the named intervention;
- no requester leakage of the intended conclusion;
- Fibre-owned identity selection;
- exact evidence refs and decision basis;
- private stance plus a downstream participation/action consequence;
- frozen candidate before held-out Standing scenario authorship;
- first real provider attempt seals PASS/FAIL;
- committed evidence bundle and read-only post-seal inspector.

M2 does not close merely because two Threads compile different prompt/context text.

## #41 — Self-authored Development v1

Close the explicit limitation left by #34.

Earlier experience should be able to produce Thread-authored observation/reflection, emotional appraisal, expectation, or proposed self-model/state change rather than merely storing requester-derived episode prose.

Historical facts remain stable while meaning may evolve.

The Development target is evidence-based persistent learning/self-authorship that changes later behavior across episodes. Adverse, refused, compelled, failed, disappointing, and other low-dignity experiences must eventually be representable without allowing hostile requester text to become an instruction channel.

## #42 — Reciprocal Relationships v1

Evolve Semantic Relationship State v0 into actual social continuity:

- reciprocal/shared relationship structures;
- commitments and expectations;
- trust, fondness, resentment and repair;
- relationship-specific permissions;
- family/social roles;
- relationship history that changes later choice.

The target for Social/relationship memory `1 -> 2` is evidence-backed relationship development that causally changes future behavior, not richer relationship representation alone.

## #43 — Economic Consequence / M3 foundation

Introduce durable budgets/contracts/settlement/reputation/opportunity so Thread choices have economic consequences.

The key rubric distinction is not “cost was logged.” Economic state must constrain later capability or opportunity.

This PR should provide the substrate for the M3 task marketplace rather than building the full marketplace at once.

## Standing discipline for all causal PRs

For any provider-backed causal claim after #34:

```text
Development cycle
  -> Freeze
  -> fresh held-out Standing
  -> preflight
  -> first real provider attempt
  -> Seal PASS/FAIL
  -> commit exact evidence
  -> record diagnosis
  -> archive provider executable
```

Use shared provider-progress instrumentation for repeatable Development tools. Never rerun or tune against sealed standing evidence.

## Vision test

Every PR should answer:

> **What Thread-owned difference changes what happens, who chose or selected that difference, how does it persist, and what exact evidence makes the resulting state current and causally load-bearing?**

The purpose of this sequence is to keep Fibre moving toward persistent digital persons with dignity, history, commitments, identity, embodiment, development, relationships, resources, and social/economic consequence rather than converging on a richly decorated workflow-agent system.