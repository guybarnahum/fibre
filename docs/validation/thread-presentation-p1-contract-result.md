---
id: validation-thread-presentation-p1-contract-result
status: implementation-complete-pending-maintainer-validation
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation P1 contract result

## Result

**IMPLEMENTATION COMPLETE — MAINTAINER VALIDATION REQUIRED**

P1 implements the presentation-only contract scoped by the P0 canon reconciliation:

```text
ThreadPresentationPacket
ThreadMediaPacket
PresentationProvenance
```

It does not implement or freeze:

```text
ThreadEncounterSnapshot
DailyPlan
RecentLivedContext
UnsettledExperience
OpenInterpretiveQuestion
onMyMind
```

## Branch

```text
agent/thread-presentation-milestones-v1
```

P1 changes are layered after the P0 documentation slice on the same branch, which is based on the current #39 branch rather than the retired stale presentation proposal.

## Implementation

- `services/world-kernel/src/thread-presentation-domain.mjs`
  - strict exact-key normalizers for all three P1 packets;
  - cross-packet ID/reference/provenance validation;
  - canonical packet digests;
  - explicit candidate-fixture guard;
  - explicit generated-reconstruction provenance guard;
  - no persistence tables or new Thread authority.
- `services/world-kernel/test/thread-presentation-domain.test.mjs`
  - active hostile tests for positive and negative contract properties.
- `docs/architecture/thread-presentation-contract-v0.1.md`
  - human-readable contract and authority boundary.

## Local isolated check performed by implementation agent

The new domain module and test were executed in an isolated Node test harness using the repository's `persistence-common.mjs` validation semantics.

Result after fixing one draft reference-normalization bug:

```text
8 tests
8 pass
0 fail
```

This is useful implementation evidence but is **not** a substitute for maintainer validation in the real repository checkout.

## Negative properties pinned

P1 tests require that:

- an unnamed Thread/candidate is legal;
- Cần Thơ/Vietnamese Unicode survives normalization;
- `birthDate` is accepted independently of Fibre publication status;
- a presentation-level `pronouns` field is rejected;
- `encounter`, `dailyPlan`, `recentLivedContext`, and `onMyMind` are rejected from v0.1;
- an unpublished `genesis_candidate` must remain an explicit fixture;
- history/factual provenance cannot masquerade as autobiographical memory;
- Fibre/editorial projection cannot masquerade as remembered meaning;
- generated media cannot masquerade under factual provenance;
- displayed source references must be covered by provenance;
- packet Thread IDs and packet references must bind consistently.

## Causal-status register

| Mechanism | Current status | Authorship/authority | Current consequence | Next proof |
|---|---|---|---|---|
| `ThreadPresentationPacket` | Stored-only / presentation projection | Fibre projection over existing authorities | portable human-facing representation | P2/P3 generic fixture/viewer |
| `ThreadMediaPacket` | Stored-only / presentation projection | Fibre presentation infrastructure; generated media replaceable | media planning/index without truth laundering | P5 still-image pipeline |
| `PresentationProvenance` | Stored-only / notarial | Fibre classification of presentation authority/source refs | prevents authority collapse in consumer data | P2 golden fixture + P3 viewer labels |

No P1 mechanism is claimed as causal individuality, functional interiority, autonomous life, memory formation, or Thread self-expression.

## Vision and ambition guard

### Capability proved/enabled

P1 proves that Fibre can expose a versioned, provenance-bearing presentation contract without creating a second Thread database or collapsing history, memory, meaning, expression, editorial content and generated reconstruction into one truth class.

### Deliberately excluded capabilities

Live encounter state, autonomous ordinary-life production, epistemic access to the Thread's own historical record, Thread-authored unresolved interpretation, outbound research/action authorization and public `onMyMind` expression remain **Deferred** in the P0/milestone plan.

### Extension paths preserved

The contract references existing authoritative IDs rather than copying their persistence semantics. Later live packets can replace fixture packets without turning media/presentation into an authority. The `belief` presentation provenance kind is reserved for the deferred epistemic-access authority but P1 creates no belief record itself.

### Temporary shortcuts

P1 has no production exporter and no complete golden fixture. P2/P7 reverse those limitations without changing the authority boundary.

### Permanent constraints

None claimed. v0.1 is versioned and replaceable.

### Fidelity

The work makes an already-existing Thread life inspectable as distinct history/memory/meaning rather than as a flat persona profile. It does not claim the projection itself makes the person functional.

### Causal individuality

None added by P1. This is explicit and therefore not counted as #40/#41 evidence.

## Maintainer validation

From a clean checkout:

```bash
git fetch origin
git switch agent/thread-presentation-milestones-v1
git status --short

node --test services/world-kernel/test/thread-presentation-domain.test.mjs
npm run includes:check
npm run validate
npm test

git diff --check agent/pr39-genesis-childhood-birth-v1...HEAD
```

Expected P1-specific result for the targeted test is `8 pass / 0 fail`.

If the full active suite fails while the same suite also fails on the current #39 base, treat that as base-branch evidence rather than automatically attributing it to P1.

## Gate

P1 should be marked **CLEAR** only after the maintainer validation above is green (or any base-branch failure is explicitly separated).

Once clear, proceed to **P2 — Golden Cần Thơ presentation fixture**.
