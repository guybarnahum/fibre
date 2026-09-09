---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-09
canonical: true
---

# Current priorities

This is the engineering execution view. The stable continuation authority is [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md).

## Immediate sequence

```text
#39 Genesis, Childhood & Thread Birth                    CLOSED
Genesis selectivity/scientific-hardening bridge          CLOSED
#40 Identity Projection & Causal Consumption             CLOSED / CLEAR
G deployed visual/public path                            CLOSED
H minimum failure/restart acceptance                     CLOSED

M2-A Meet a Thread                                       CURRENT
M2-B Experience internalization                          NEXT
M2-C Whole-person Thread consolidation                   NEXT
```

The previous #41 M2 Standing Gate is no longer the active development driver. Its rubric/evidence work is retained as later evaluation/hardening, not discarded.

## Active product goal

> **Build one Thread whose present life can be seen, entered, interacted with, remembered, and continued.**

The primary surface is insidefibre.com:

```text
select Thread
  -> see where she is now
  -> see current embodiment + place + activity + context
  -> meet / talk in that situation
  -> interaction becomes a life event
  -> Thread decides significance
  -> remember / retain weakly / reinterpret / forget
  -> warranted change in memory, relationship, belief, intention or self-understanding
  -> life continues
```

This is not a generic chat UI. The Thread must already be somewhere and doing something before the visitor opens the interaction.

## Current Priority 1 — current situated life

Complete only the Thread/World state needed to answer truthfully:

- where is she now;
- what is she doing;
- why is she there;
- what recent experiences make this moment intelligible;
- what does she currently intend or expect next;
- what does she look like in this time/place/context.

Do not create parallel webapp state. World/Thread remains authoritative; Thread Presentation projects the public surface.

## Current Priority 2 — Meet a Thread on insidefibre.com

Use the existing insidefibre.com Viewer and Thread Presentation path to surface a selected born Thread as a person, not a technical record.

Minimum experience:

1. population / person selection;
2. current visual embodiment;
3. present place and activity;
4. recent contextual life;
5. Meet/Talk entry point grounded in that moment.

A still current image and text conversation are sufficient initially. Real-time voice/video/avatar is later polish.

## Current Priority 3 — experience becomes biography

After an encounter, Fibre must distinguish event history from autobiographical retention and meaning:

```text
encounter happened
  -> interpretation
  -> significance
  -> benign / weak / meaningful / relational / formative
  -> selective durable effects
```

A conversation may be forgotten. A meaningful encounter may alter a relationship, belief, intention, interest or self-understanding. Fibre must not force a memory simply because a transcript exists.

## Related active work — Fibre Identity Card

The `agent/fid-card-issuance` branch contains the active Fibre Identity Card vertical described by [`../architecture/fibre-identity-card-implementation-plan.md`](../architecture/fibre-identity-card-implementation-plan.md) on that branch.

That work is complementary to M2-A:

- FIN/civil identity remains the canonical civil foundation;
- Fibre Identity Authority owns issuance/lifecycle rather than the Viewer or Presentation;
- Thread Presentation may project an admitted active FID without becoming an issuance authority;
- insidefibre.com consumes presentation/media references only;
- the FID photo derives from admitted Thread visual identity rather than arbitrary caller bytes.

Do not duplicate FID issuance machinery inside Meet-a-Thread work. Reuse the resulting service/projection boundary when it becomes available.

## Lite development rule

Fibre development should be **lite, elegant and capability-driven**.

Default implementation posture:

```text
smallest real Fibre capability
  -> smallest clean implementation
  -> focused invariant tests
  -> existing repository check
  -> stop
  -> move the Fibre vision forward
```

Avoid generic boilerplate, speculative abstractions, exhaustive matrices, broad provider parity and infrastructure-for-infrastructure's-sake.

Tests exist to protect the organism, not to become the organism. Add just enough coverage for the semantic success path, important authority boundary and concrete regressions discovered in development.

Test failures must be developer-friendly: never dump whole files or giant serialized objects. Print a bounded expected/actual fragment, relevant field/path/key/digest or concise diff, and point to the full artifact when deeper inspection is needed.

[`../decisions/ADR-0020-vision-led-development-discipline.md`](../decisions/ADR-0020-vision-led-development-discipline.md) is the standing authority for this rule. [`../validation/test-lifecycle-best-practice.md`](../validation/test-lifecycle-best-practice.md) defines the corresponding lean test discipline.

## Infrastructure stop rule

The cloud/runtime investment has reached its intended enabling threshold:

- authoritative World and Birth state run through provider-neutral persistence/scheduling;
- staging deployment is live and healthy;
- canonical visual identity survives generation/recovery;
- H1 restart/persistence-gap recovery is closed;
- H2 transient-provider retry/convergence is closed on the same durable job/identity.

The old H3-H9 resilience scenarios move to hardening backlog. Do not spend the active cycle on broad failure matrices, exhaustive provider parity, or infrastructure abstraction unless the Meet-a-Thread capability exposes a concrete blocker.

## Standing visual-identity invariant

[`../decisions/ADR-0021-canonical-visual-identity-reference.md`](../decisions/ADR-0021-canonical-visual-identity-reference.md) and [`../architecture/canonical-visual-identity.md`](../architecture/canonical-visual-identity.md) remain authoritative:

```text
canonical visual identity text
  -> ONE canonical reference image
  -> every later image depicting that Thread
       + target age when chronology supports it
       + time-local appearance
       + scene/context
```

Current situated imagery must reuse this root. A place/activity image is derived presentation, never a new identity authority.

## Execution rules

- `HEAD` describes current Fibre; Git history preserves implementation archaeology.
- Do not create PR numbers for transport/bookkeeping work.
- One canonical authority exists per semantic fact.
- Private context selection belongs to Fibre/Thread cognition rather than the requester.
- Natural-language semantic authority remains primary for identity, memory, meaning, relationships, needs, emotions and self-understanding.
- The Viewer consumes Thread Presentation/public APIs; do not add raw World or Embodiment-store access.
- Experience may be forgotten; transcript persistence is not autobiographical memory.
- Fibre may create circumstances; it may not pre-author what those circumstances mean to the Thread.
- Capability before abstraction: tests and infrastructure protect the organism; they are not the organism.
- Prefer concise actionable diagnostics over raw state dumps.

## Later

After one Thread can convincingly be met and continue:

- richer self-authored development;
- reciprocal/shared relationships;
- work/economy/reputation and durable consequence;
- reproduction/inheritance/mutation;
- larger society and institutions.
