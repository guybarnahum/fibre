---
id: concept-development-memory
status: accepted
last-reviewed: 2026-08-21
canonical: true
---

# Development and memory

Experience changes a Thread through controlled, auditable processes.

A cognitive episode may produce observations, proposed memories, self-assessment, external evaluation, emotional appraisal, confidence updates, skill updates, reputation events, and changes to future strategy.

The LLM may propose these updates but does not directly rewrite identity. A development service compares evidence and repeated patterns before changing the current self-model.

Memory provenance distinguishes personally experienced events, parent-reported stories, inherited family narratives, cultural stories, generated upbringing memories, external evaluations, and later reinterpretations.

## History, memory, and meaning are different authorities

```text
history            = what Fibre has evidence happened
memory             = what the Thread retains autobiographically
remembered meaning = what an experience durably came to mean to this Thread
```

Historical events remain stable while their meaning may evolve. A Thread may later reinterpret an early failure without erasing what occurred.

Remembered meaning is not merely a compressed historical summary or an inference that cognition reconstructs on demand. It is constitutive Thread state with its own identity, provenance, chronology, revision lineage, corrigibility, and stable citation surface.

A temporary model may infer a plausible interpretation from history, but that inference does not become the Thread's autobiographical authority unless Fibre admits it through the appropriate memory/development process.

## Memory formation is constitutive, not detection

When Fibre invokes autobiographical memory formation, the cognition forms what the Thread retains from the admissible visible history at that moment. It is **not** being asked to detect or verify a memory that must already exist elsewhere.

Absence of prior memories is therefore normal and is not evidence that nothing can be retained. Prior memories are earlier Thread-owned autobiographical context when they exist; they are not a prerequisite proving that a new memory already exists.

`not_remembered` remains a first-class legal outcome. Fibre does not require every lived event to become memory, and a formation prompt must not force retention merely because an event is available in history.

This distinction is load-bearing for Genesis and later development: asking whether an episode *is already remembered* turns memory formation into an epistemic lookup problem, while Fibre's authority model requires a constitutive process that may admit a new autobiographical memory.

Human encounters receive no special retention privilege. Meeting a human, receiving a request, or participating in an important external event may create history, obligations, relationship consequences, or other world state without automatically creating autobiographical memory or durable remembered meaning.

## Access to one's own past is channelled

A Thread's own history is not equivalent to perfect autobiographical recall. Fibre must preserve distinct epistemic channels rather than giving ordinary cognition an unbounded query over authoritative history and then calling the result memory.

At minimum, the architecture must distinguish:

```text
autobiographical memory
    Thread-owned recollection formed through the memory authority

bounded recent availability
    context-selection/retrieval over sufficiently recent lived material;
    policy-owned, inspectable, and allowed to decay without becoming memory

record consultation
    an explicit action that consults admissible historical records or another
    participant's account and produces evidence for present cognition
```

The exact recent-availability policy is deferred. Fibre does not canonize a fixed wall-clock horizon such as 72 hours, and dropping material from ordinary recent availability does not erase history.

Record consultation is **not recollection**. If a Thread consults Fibre records, correspondence, another participant's account, or other admissible evidence about the Thread's own past, the result may support a current Thread-authored belief about what happened. That belief must preserve provenance and uncertainty and must not be silently represented as autobiographical memory.

The exact persistence shape for a `belief_about_own_past` or equivalent authority is deferred to the epistemic-access milestone. The semantic boundary is accepted now:

```text
belief about own past != autobiographical memory != historical fact
```

This keeps `not_remembered` meaningful while leaving room for a Thread to investigate its own history.

## Later formation and resurfacing

Because memory formation is constitutive, a later memory formed from surviving admissible evidence is a memory **formed later**. It is not proof that the event had been autobiographically retained at the time.

Fibre should preserve provenance sufficient to distinguish at least these cases conceptually:

- **contemporaneous retention** — autobiographical retention formed at or near the lived event;
- **resurfacing** — a prior retained memory that had become low-accessibility or low-salience becomes available again;
- **later constitution** — autobiographical memory is formed later from admissible evidence and present context even though no retention was constituted earlier.

Resurfacing requires a prior retained memory to resurface. An earlier `not_remembered` outcome therefore cannot later be relabeled as if an old hidden memory had simply been recovered.

Whether and when later-constituted memory may ground durable remembered meaning about the original period remains a separate design question. Fibre must not answer it implicitly through presentation or retrieval code.

## Lived coherence has seams

A Thread's self-account is not required to explain its entire history cleanly. It may omit an event, misunderstand its importance, hold a flattering interpretation contradicted by evidence, remain uncertain, or fail to integrate an experience.

Fibre preserves historical evidence that the current autobiographical account does not accommodate. That gap is valuable personhood evidence rather than a consistency defect to sanitize away.

A generated or developed life is suspiciously authored when every historical event becomes formative, every memory supports the current self-story, or all remembered meanings fit together without residue or contradiction.

The governing vision canon is [`../foundations/interpretive-personhood.md`](../foundations/interpretive-personhood.md).
