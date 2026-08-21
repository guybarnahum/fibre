---
id: validation-thread-presentation-p0-canon-reconciliation
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation P0 — canon reconciliation

## Result

**P0 CLEAR.** Presentation work may proceed to P1 with the scope in [`../architecture/thread-presentation-implementation-milestones.md`](../architecture/thread-presentation-implementation-milestones.md).

This resolution incorporates the hostile review performed against the earlier exploratory presentation/encounter proposal and reconciles the work against the current #39 canon.

## Source-of-truth correction

The exploratory branch:

```text
agent/thread-presentation-encounter-plan-v1
```

was created from canon older than the current #39 branch. It is retained only as an exploratory design record and must not be merged wholesale or treated as current Fibre doctrine.

The implementation branch:

```text
agent/thread-presentation-milestones-v1
```

was created from the current #39 branch and is governed by the current accepted versions of:

- [`../foundations/invariants.md`](../foundations/invariants.md);
- [`../foundations/rich-life.md`](../foundations/rich-life.md);
- [`../foundations/interpretive-personhood.md`](../foundations/interpretive-personhood.md);
- [`../concepts/development-and-memory.md`](../concepts/development-and-memory.md);
- [`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md);
- [`../concepts/interiority-and-expression.md`](../concepts/interiority-and-expression.md);
- [`../architecture/thread-lifecycle.md`](../architecture/thread-lifecycle.md).

The earlier branch remains useful evidence of how the presentation requirements exposed missing doctrine. It is not an authority for implementation.

## Canon disposition

The earlier proposal contained eight candidate insights. P0 resolves them as follows.

| Candidate | P0 disposition | Current home |
| --- | --- | --- |
| Life precedes encounter | **Accepted with amendment as an unmet architectural requirement** | `thread-lifecycle.md` |
| Experience is not memory | **Already canon**; only the human-encounter corollary was added | `development-and-memory.md` |
| Memory is not meaning | **Already canon**; no duplicate doctrine added | existing memory/personhood canon |
| Meaning may emerge through reflection/relationship | **Social contribution added; private reflection already supported** | `interpretive-personhood.md` |
| Recent lived context is not memory | **Accepted only as an epistemic-access boundary; no persisted `RecentLivedContext` object** | `development-and-memory.md` |
| Presentation/reconstruction is not life authority | **Accepted** | `interpretive-personhood.md` |
| Presence is disclosure-mediated | **Existing subject-privacy rule retained; third-party disclosure rule added** | `interiority-and-expression.md` |
| Interpretive closure is settled-for-now | **Insight retained through existing staleness/supersession; no new status vocabulary** | existing semantic-state/personhood canon |

No Fourteenth Principle is added. These rules are hosted under existing Principles 1, 4, 6 and 9 and their accepted concept/architecture documents.

## Removed duplicate or premature authorities

P0 does **not** carry these exploratory abstractions forward as Fibre authorities:

```text
UnsettledExperience
OpenInterpretiveQuestion
status: open | settled_for_now | reopened
RecentLivedContext as a persisted object
DailyPlan as a commitment/obligation authority
onMyMind as a redacted private-state projection
ThreadEncounterSnapshot v1
```

### Unsettled interpretation

The existing `SemanticStateDimension` mechanism already owns natural-language semantic state, evidence references, authorship, staleness, supersession, visibility and declared behavioral relevance. Future unresolved interpretation should first attempt to use a registered `situation_attitude` dimension rather than create a parallel authority.

The accepted endogenous-motivation path remains:

```text
mechanical condition / eligibility
    -> bounded Fibre-owned modulation or retrieval
    -> bounded cognition episode
    -> Thread-authored semantic interpretation
    -> validation / persistence
    -> later causal ablation where functionality is claimed
```

Fibre may nominate admissible evidence or trigger eligibility. Fibre may not author `whatFeelsUnsettled`, `openQuestions`, or equivalent semantic self-knowledge and feed it to cognition as though the Thread authored it.

### Interpretation is provisional; authority is not

P0 preserves the underlying insight that autobiographical interpretation remains corrigible. It does not introduce `settled_for_now` as a new lifecycle enum because current staleness and supersession already preserve prior state while allowing later evidence to produce a new current interpretation.

This rule is scoped:

> **Interpretation is always provisional; authority is not.**

A Thread may reinterpret what an obligation meant. A discharged obligation, consumed authorization, withdrawn consent, or other spent authority does not reopen merely because interpretation changes.

## New accepted doctrine landed in P0

### Social interpretation without authority transfer

Another human or Thread may contribute facts, disagreement, perspective, criticism, reassurance, or language through which the subject Thread later interprets an experience. The resulting interpretation remains Thread-authored. Shared participation does not imply shared memory or shared meaning.

### Presentation/reconstruction non-authority

Generated portraits, reconstructed memory scenes, synthetic voice, film, editorial summaries, presentation copy and viewer fixtures are representation. They are not evidence of history, memory, meaning, character or current life and may not silently flow back into cognition as such.

### Third-party disclosure

A Thread's interest in public expression does not automatically authorize disclosure of another person's identity, whereabouts, conduct, correspondence, vulnerability or association. External search/tool/media services are also audiences for this purpose.

### Epistemic access to one's own past

Fibre must preserve distinctions among:

```text
autobiographical memory
bounded recent availability
record consultation
belief about own past
historical fact
```

Record consultation is an action and is not recollection. Exact `belief_about_own_past` persistence remains deferred, but the semantic distinction is accepted.

Because memory formation is constitutive:

- later constitution from surviving evidence is legal but is a memory formed later, not proof of earlier retention;
- resurfacing requires a prior retained memory;
- an earlier `not_remembered` result cannot later be relabeled as recovered hidden memory.

Whether later-constituted memory may ground durable remembered meaning about the original lived period remains unresolved and must not be decided accidentally by presentation/retrieval implementation.

## Deferred capability register

These capabilities remain part of Fibre's intended architecture and are **Deferred**, not rejected.

| Capability | Status | Why deferred | Extension path preserved |
| --- | --- | --- | --- |
| autonomous ordinary-life producer / time advancement | Deferred | current lifecycle is still principally trigger/freeze/thaw; no authoritative producer of an independent day exists | `thread-lifecycle.md` names the missing capability without freezing world-clock implementation |
| runtime place/current-presence authority | Deferred | Genesis places are not yet a general live place service | presentation contracts keep place references/projections separate from a future live authority |
| day-plan projection | Deferred | intentions and structured obligations must remain separate authorities | future view derives from authoritative intentions/obligations/events rather than owning commitments |
| bounded recent-past availability | Deferred | epistemic access must preserve `not_remembered` and avoid a perfect-history query disguised as memory | `development-and-memory.md` establishes the channel boundary while policy remains open |
| `belief_about_own_past` persistence | Deferred | semantic distinction is accepted; exact authority/schema needs dedicated review | a future L0 milestone may add the smallest persistent primitive if required |
| Thread-initiated outbound-action authorization | Deferred | current authorization is primarily request/inbound oriented | future research/conversation/tool actions retain a distinct authorization/disclosure boundary |
| autonomous reflective inquiry | Deferred | must reuse semantic state, bounded triggering and ablation rather than create a rumination subsystem | existing scheduled reflection + mechanical-condition path remains available |
| public “on my mind” expression | Deferred | must be Thread-authored external expression, not a redacted state dump | interest-mediated expression can later produce/withhold a public account |
| `ThreadEncounterSnapshot` | Deferred | freezing the shape now would freeze unresolved live ontology | P1 omits it; future L6 defines it only after producers/epistemics/expression exist |

## Causal-status register

P0/P1 are representation/projection work and make no stronger causal claim.

| Mechanism / field family | Current maturity | Authorship / authority | Current consequence | Next proof |
| --- | --- | --- | --- | --- |
| Thread presentation packet | Named-only until P1 | Fibre projection from existing authorities | none yet | strict contract + generic consumer |
| media packet | Named-only until P1 | Fibre/editorial reconstruction metadata | none yet | placeholder/ready lifecycle + provenance |
| presentation provenance | Named-only until P1 | Fibre evidence boundary | none yet | validation that consumer cannot flatten authorities |
| autonomous ordinary life | Named-only / Deferred | no current producer claimed | none | authoritative world/lifecycle producer + causal witness |
| recent-past access | Named-only / Deferred | policy boundary accepted; implementation absent | none | L0 epistemic-access implementation and tests |
| unresolved interpretation | existing semantic-state authority; future use Deferred | Thread-authored semantic state | existing state mechanism can be causal generally; this specific use unproven | register dimension + predeclared downstream consumer + ablation |
| public on-my-mind expression | Named-only / Deferred | must be Thread external expression | none | disclosure/third-party/outbound authorization path |

No P0 field is counted as evidence for functional individuality, autonomous life, memory, interiority or relationship functionality merely because it can later be displayed.

## Vision and ambition guard

### Capability enabled

P0 enables an honest presentation-contract milestone by establishing which existing Fibre authorities may be projected and by preventing the website from defining new personhood ontology.

### Deliberate exclusions

The live-encounter capabilities in the deferred register are intentionally excluded from P1. Their extension paths remain explicit above and in `thread-lifecycle.md` / `development-and-memory.md` / `interiority-and-expression.md`.

### Temporary shortcuts

- H-v2 unborn candidates may be used as presentation fixtures only.
- Synthetic current-day website scenarios may be used only by a viewer test harness and must remain outside the Fibre presentation contract.
- Static export to `insidefibre.com` may precede a live API.

All are reversible without changing authoritative Thread state.

### Permanent constraints

None introduced. No ADR is required.

### Fidelity

P0 makes Fibre more like a persistent society by protecting the distinction between a lived person and a convincing presentation. It explicitly refuses to claim that a fixture, generated portrait, public profile or invented daily schedule constitutes autonomous life.

### Ambition

The larger paths remain open: autonomous life, endogenous motivation, private/public expression, selective autobiographical memory, reciprocal relationships, places, outbound action and live encounter are named rather than erased.

### Causal individuality

P0 claims none. P1/P2/P3 may prove projection integrity and consumer generality, but they do not satisfy the standing differential gate. Where future unsettled semantic state or live-life mechanisms claim personhood functionality, they must name a downstream consumer and survive a predeclared causal intervention/ablation.

## P0 exit checklist

- [x] Current #39 canon, including `rich-life.md`, governs the implementation branch.
- [x] Earlier exploratory presentation branch is classified as non-authoritative design history.
- [x] Duplicate memory/meaning doctrine is not re-canonized.
- [x] `UnsettledExperience` and `settled_for_now` are not introduced as competing authorities/vocabulary.
- [x] Social contribution to interpretation is canonized without transferring autobiographical authority.
- [x] Presentation/reconstruction non-authority is canonized.
- [x] Third-party disclosure is canonized beyond current-location privacy.
- [x] Epistemic access to one's own past has an accepted semantic boundary without freezing a 72-hour policy or perfect-history read channel.
- [x] Life-before-encounter is recorded as a Deferred requirement, not a current capability claim.
- [x] Live encounter, day-plan, recent-context and public-on-my-mind contracts remain deferred.
- [x] No Principle 14 is added.
- [x] #39 H-v2 scientific isolation remains intact.

## P1 handoff

P1 may now define only:

```text
ThreadPresentationPacket
ThreadMediaPacket
PresentationProvenance
```

P1 must not freeze `ThreadEncounterSnapshot`, `DailyPlan`, `RecentLivedContext`, `UnsettledExperience`, or `onMyMind` as Fibre authorities.

The first golden packet may project the unborn Cần Thơ candidate with explicit `genesis_candidate`, `authoritative: false`, and fixture provenance. Any synthetic “today” material belongs to the `insidefibre.com` viewer test harness rather than the Fibre presentation packet.
