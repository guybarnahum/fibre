---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-30
canonical: true
---

# Current priorities

This is the engineering execution view. For public/plain-English status, use [`public-progress.md`](public-progress.md) and [`public-progress.json`](public-progress.json).

The stable continuation authority is [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md). Milestone #39 and the unnumbered Genesis selectivity/scientific-hardening bridge are closed. Milestone #40 is also closed / CLEAR; its permanent outcome is [`../history/milestones/pr40.md`](../history/milestones/pr40.md). The visual/deployment integration vertical that carried canonical visual identity through public presentation, reference-capable generation, credentialing, Viewer binding and restart/replay proof is now closed / green.

## Immediate sequence

```text
#39 Genesis, Childhood & Thread Birth                    CLOSED
Genesis selectivity/scientific-hardening bridge          CLOSED
#40 Identity Projection & Causal Consumption             CLOSED / CLEAR
A-H visual/deployment integration vertical               CLOSED / GREEN
#41 M2 Standing Gate / M2 closure                        CURRENT
```

Planning identifiers such as `#40` and `#41` are Fibre milestone identifiers, not GitHub transport numbering. The A-H visual/deployment sequence was an implementation vertical, not a new numbered planning milestone.

## Completed visual/deployment vertical

```text
A. Genesis -> public pre-embodiment presentation          CLOSED / GREEN
B. authoritative newborn public identity context         CLOSED / GREEN
C. canonical visual identity root                        CLOSED / GREEN
D. Embodiment -> public visual identity rewrite          CLOSED / GREEN
E. reference+age-conditioned official/memory imagery     CLOSED / GREEN
F. Asset Generator + C2PA completion/publication         CLOSED / GREEN
G. insidefibre.com Viewer closure                        CLOSED / GREEN
H. one-birth full-stack E2E + recovery proof             CLOSED / GREEN
```

The final code-bearing H checkpoint is `e41742135cb577a989963d738fc7515f16177a12`. At that checkpoint the focused one-birth recovery proof is green and the exact-sha GitHub Actions `validate` workflow is green. That workflow runs `npm run check`, `npm run test:all`, `npm run validate`, `npm run test:audit -- --check`, and both Cloudflare deployment dry-runs.

The H proof exercises one coherent birth through civil registration, newborn public presentation, pending Embodiment, text-only canonical-root generation, C2PA credentialing/verification, root admission, World restart, civil/Embodiment recovery, public visual projection, identity-card issuance, reference-bearing official-photo demand, reference-capable generation using the exact canonical root, credential verification, `media.ready` publication, public asset serving, and replay without a second root/card/provider operation/publication.

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

Native synthetic roots are generated text-only with zero prior image references. Reference age is normalized to 25. The admitted root is the operational likeness anchor while canonical visual-identity text remains semantic authority.

Derived Thread-depicting imagery must use the same canonical root. A deployment/provider that cannot consume required reference objects must fail closed or select an explicitly reference-capable profile; Fibre may never silently regress to text-only likeness generation.

Parent inheritance is natural-language phenotype recombination, never parent-pixel blending. Echo/Homage is the explicit source-grounded creation exception. Identity is authoritative. Presentation is projection. Publication is a permission decision.

The Slice C production chronology guard remains strict: `bindVerifiedCanonicalVisualIdentityProof(...)` requires admission `recordedAt` to be at or after the actual stored generation receipt `completedAt`. Do not weaken it.

## Current Priority 1 — freeze #41 standing rubric and evidence map

#41 is the active M2 Standing Gate. Start by freezing the rubric/criteria and mapping already-closed evidence before any new confirmatory provider use.

The standing gate must adjudicate the integrated Thread across:

- identity/history particularity;
- causal individuality;
- dignity/consent;
- memory epistemics;
- relationship/social continuity;
- development;
- persistence/restart;
- cognition-provider boundary.

For each criterion, name exactly which prior evidence is admissible and distinguish semantic/personhood evidence from substrate or mechanical proof. Reuse closed #33-#40 evidence where it genuinely answers the criterion. Do not create a new experiment merely because a stronger demonstration would be aesthetically satisfying.

The gate must preserve the possibility of **M2 NOT YET EARNED**.

## Current Priority 2 — identify genuine standing gaps before testing

Only after the frozen evidence map should #41 identify dimensions for which the existing record is actually insufficient.

A gap must be stated as a standing claim that current evidence cannot support, not as an implementation wish list. If a prospective test is needed, predeclare the estimand, unit, controls, confounds, interpretation and failure condition before provider output.

Do not award standing merely because:

- a field exists in storage;
- a model can summarize a Thread fluently;
- an admission rule mechanically enforces the property later being cited;
- #40 produced a 5/5 CLEAR result in one cognition consumer;
- a generator produced distinctive prose or imagery;
- symbolic genome exists without attributable downstream consumption;
- visual continuity is mechanically durable.

## Current Priority 3 — produce the auditable #41 standing record

The #41 closeout should:

1. freeze the rubric and evidence map before any new confirmatory model use;
2. classify prior evidence criterion by criterion;
3. identify any genuinely missing dimensions;
4. use prospective tests only where existing evidence is insufficient;
5. separate provider-free/mechanical checks from personhood evidence;
6. report the resulting Whole-Person score under rubric v2 without rewriting prior milestone claims;
7. state clearly whether M2 is **EARNED**, **PARTIAL / NOT YET EARNED**, or otherwise fails the frozen gate.

The current Whole-Person checkpoint remains **15/26 under rubric v2** until #41 adjudicates it.

## Retained #40 causal result

#40 is closed / CLEAR. It established bounded Fibre-owned Identity Context consumption in the real participation/Dignity Guardian path with exact provenance and no second semantic authority.

The fixed five-Thread prospective differential changed exactly one admissible autobiographical-memory source per pair and produced:

```text
completed conditions           10 / 10
attributable pairs              5 / 5
structured effects              5 / 5
memory-grounded effects         5 / 5
top-level action/fit changes    3 / 5
band                            CLEAR
```

The hostile provider-free closeout reproduced the sealed result offline and rejected order, digest, provider and private-prose substitution. This is load-bearing causal-consumption evidence in one real cognition consumer; it is not automatic Whole-Person standing.

## Execution rule — Fibre capability before abstraction

[`../decisions/ADR-0020-vision-led-development-discipline.md`](../decisions/ADR-0020-vision-led-development-discipline.md) remains a standing planning constraint.

The critical path is the Fibre organism and the standing claims about it, not infrastructure completeness. Cross-cutting infrastructure belongs on the critical path only when it enables the current Fibre capability, preserves a required semantic invariant, removes a demonstrated milestone blocker, or supplies the smallest representative proof needed to continue safely.

The visual/deployment vertical has reached its stop condition. Unrelated media/provider polish and exhaustive provider parity return to backlog. Authoritative World relational persistence now crosses `InfraDriver.state`; the remaining durable model-invocation filesystem journal and later cloud runtime/scheduler composition remain explicit infrastructure work rather than an automatic prerequisite for #41.

The production rule remains strict for new code: do not create new persistence bypasses or new semantic authorities.

## Repository/development rules

- `HEAD` describes current Fibre; Git history preserves implementation archaeology.
- No new PR or milestone number is created for transport/bookkeeping work.
- Private context selection belongs to Fibre/Thread cognition rather than the requester.
- One canonical authority exists per semantic fact; projections and generated media do not self-promote into authority.
- Natural-language semantic authority remains primary for identity, memory, meaning, relationships, needs, emotions and self-understanding.
- Diagnostics must be able to fail; do not enforce a property at admission and then cite success as evidence.
- Provider/model calls for #41 remain unauthorized until the frozen evidence map identifies a genuine gap requiring prospective evidence.
- Visual identity changes must load ADR-0021 and `architecture/canonical-visual-identity.md` before changing Embodiment, Thread Presentation or person-image generation semantics.
- C2PA authorization tokens remain HTTP-header-only and must never enter request bodies or persisted provenance.
- The insidefibre.com Viewer consumes Thread Presentation public APIs only; do not add raw World/Embodiment-store access.

## After #41

- **#42:** self-authored development.
- **#43:** reciprocal relationships.
- **#44:** economic consequence / M3 foundation.
