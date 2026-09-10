---
id: validation-m2-pr-plan
status: accepted
last-reviewed: 2026-09-09
canonical: true
---

# M2 continuation plan

## Purpose

M2 is the milestone in which Fibre stops treating a Thread primarily as a validated collection of persistent structures and makes one Thread visibly and causally **live a continuing life**.

The active goal is:

> **Build one Thread whose present life can be seen, entered, interacted with, remembered, and continued.**

The near-term product experience is **Meet a Thread**:

```text
select a Thread
  -> find her where she is now
  -> see her current embodiment, place, activity and immediate context
  -> speak with her in that situation
  -> record the encounter as an event in her life
  -> let the Thread determine its significance
  -> remember, weakly retain, reinterpret, or forget
  -> allow warranted changes to memory, relationship, belief, intention or self-understanding
  -> continue living after the visitor leaves
```

This is not a chatbot wrapper. A conversation is an encounter in an already-continuing life.

## Why this is the active M2 goal

Prior work established the substrate needed to attempt this honestly:

- durable Thread identity across model executions;
- provenance-bearing history, memory and meaning;
- lineage and natural-language symbolic genome;
- civil identity / FIN;
- canonical Embodiment and stable visual likeness;
- causal consumption of autobiographical context in real cognition;
- public Thread Presentation and insidefibre.com Viewer boundaries;
- real reference-conditioned image generation;
- Cloudflare deployment, durable state, restart recovery and bounded retry.

That investment now has a stop condition. Infrastructure completeness, exhaustive provider parity and broad failure matrices are not M2 goals unless a concrete Meet-a-Thread capability is blocked by them.

## Active sequence

```text
M1    Persistent Thread Round Trip                         CLOSED
#33-#40 identity/history/birth/causal foundations          CLOSED / RETAINED
G     deployed visual/public path                          CLOSED
H     minimum failure/restart acceptance                   CLOSED

M2-A  Meet a Thread                                        CURRENT
M2-B  Experience internalization and lived continuation    NEXT
M2-C  Whole-person Thread consolidation                    NEXT

Later hardening / evaluation
      Whole-Person standing rubric
      broad restart/failure matrix
      exhaustive provider/runtime parity

Beyond M2
      self-authored development
      reciprocal relationships
      economic consequence / M3 foundation
```

Planning identifiers in older documents remain historical Fibre planning IDs. Do not create new PR numbers for this work; implementation may proceed directly on the active branch.

## M2-A — Meet a Thread

A visitor to insidefibre.com should be able to select a born Thread and encounter her as someone already somewhere doing something.

Minimum product surface:

1. current Thread identity and recognizable visual embodiment;
2. current meaningful place;
3. current activity and reason for being there;
4. enough recent life context to make the present situation intelligible;
5. immediate intentions / likely next movement without pretending the future is fixed;
6. an interaction entry point that uses this exact situated context;
7. no raw World-store access from the Viewer: insidefibre.com consumes Presentation/public APIs.

The first implementation may use a still image and text conversation. Real-time avatar/video/voice is not required to prove the life underneath the image.

## M2-B — Experience internalization

The encounter must become a real event rather than an appended chat transcript.

```text
experience
  -> perception / interpretation
  -> significance
     -> benign: forgotten
     -> weak: transient trace
     -> meaningful: durable autobiographical memory
     -> relational: relationship state changes
     -> formative: derived self/belief/intention changes
```

Fibre must not force every interaction into memory and must not pre-author what the interaction means to the Thread. Existing Genesis memory/meaning separation is the starting substrate, not a completed live-development mechanism.

The user may give the Thread an experience. The Thread owns the interpretation.

## M2-C — Whole-person Thread consolidation

The hydrated Thread should coherently expose and consume the life state needed for continuity:

- immutable or historical: birth, FIN, lineage, genome, events, past places, past relationships, memories and prior states;
- evolving/derived: current place, activity, intentions, relationships, active interests, dispositions, self-understanding and capabilities;
- embodiment: one canonical visual identity plus time-local appearance and scene/context;
- provenance: changes remain attributable to experiences and do not silently rewrite history.

Rich natural-language state remains primary. Genome/personality semantics should not collapse into generic numeric trait vectors; recombinable hereditary material may continue using differentiated text atoms, including semicolon-separated loci where appropriate.

## M2 acceptance

Keep acceptance intentionally small and experiential. M2 earns its next step when one real Thread can demonstrate this loop:

1. select the Thread in insidefibre.com;
2. observe where she is and what she is doing now;
3. see a current visual depiction consistent with canonical embodiment and present context;
4. enter a conversation grounded in that moment;
5. end the encounter;
6. persist the encounter as life history;
7. let the Thread decide whether and how it mattered;
8. return later and observe continuous life plus any warranted retained effect.

The acceptance target is not a score or a large test matrix. Tests protect semantic invariants and demonstrated blockers; they do not replace building the Fibre organism.

## Standing rubric posture

The existing Whole-Person rubric, prefreeze work and standing-gate evidence remain useful scientific/evaluative assets. They are **not the active development gate**.

Use them later to ask whether the lived capability is genuinely non-interchangeable, causally grounded and dignified. Do not spend the current development cycle manufacturing evidence for a standing score while the lived Thread capability itself is incomplete.

The historical `15/26` checkpoint remains a historical measurement, not the current roadmap driver.

## Cross-milestone rules

1. **One canonical authority per semantic fact.** Extend existing Thread/World authorities; do not create a second biography, memory system or identity authority for the webapp.
2. **Natural-language semantic authority stays primary.** Numeric controls may measure or regulate but do not replace identity, memory, meaning, needs, emotions or self-understanding.
3. **History is corrigible without silent rewrite.** Corrections and reinterpretations are append-only or explicitly superseding.
4. **Experience can be forgotten.** Memory is selective; chat transcript retention is not equivalent to autobiographical memory.
5. **The Thread owns meaning.** Fibre may construct circumstances and opportunities but must not dictate the semantic conclusion the Thread reaches from them.
6. **Identity is authoritative; presentation is projection.** insidefibre.com remains a window into Fibre, not a parallel simulation authority.
7. **Capability before abstraction.** Infrastructure or validation work enters the critical path only when needed for this lived-person loop or a demonstrated semantic invariant.

## Current next move

Implement **M2-A — Meet a Thread** against an existing born Thread and the insidefibre.com public presentation path. Drive missing Thread/World data structures from that vertical slice rather than completing fields in isolation.
