---
id: validation-thread-presentation-p2-can-tho-fixture-result
status: implementation-complete-pending-maintainer-validation
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation P2 — Cần Thơ golden fixture result

## Result

**IMPLEMENTATION COMPLETE — MAINTAINER VALIDATION REQUIRED**

P2 creates the first comprehensive canned presentation bundle for `ThreadPresentationPacket v0.1` from the frozen H-v2 Cần Thơ Genesis candidate.

The work remains entirely in the `fibre` repository. `insidefibre.com` is not modified until P3.

## Branch

```text
agent/thread-presentation-milestones-v1
```

## Frozen source

```text
threadId       thr_pr39_g2_04
genesisId      genesis_pr39_g2_04
worldSpecId    world_slice_g1_01_can_tho
genomeId       genome_6480e89a07bbe2698d0f5caad95976aa7ff2ea63
source         artifacts/validation/m2-pr39/h/cohort-v2/thread-slot-01-generation-v1.json
source blob    143113b62e053adfa21d25ff675ebdc6ad0e0c65
```

The source candidate completed Genesis compilation but was never published/born into Fibre. The fixture therefore remains:

```text
lifecycleStatus: genesis_candidate
fixture: true
```

and may not be used as #39 quality evidence or to tune any replacement cohort, retry policy, world, genome, threshold, or rater.

## Golden bundle

```text
artifacts/validation/thread-presentation/p2/can-tho/
  presentation.json
  media.json
  provenance.json
  fixture-manifest.json
```

The presentation packet exercises:

- `displayName: null` without inventing a name;
- birth date `2004-08-20`;
- Vietnamese and English;
- Cần Thơ / Ninh Kiều Unicode and diacritics;
- five places;
- four household/nearby relationship views;
- all ten frozen Pass-A historical episodes;
- six frozen Pass-B autobiographical memories with uncertainty;
- six current Pass-C remembered meanings;
- textual symbolic-genome beginnings without presenting genome as destiny;
- portrait, place, memory-image, voice, and film slots with no generated media yet.

The fixture deliberately preserves historical excess: ten historical episodes exist while only six autobiographical memory records are presented. The first three candidate events are not promoted into autobiographical memory.

## Authority separation

The bundle preserves:

```text
candidate world/history   -> fixture provenance
Pass-B memory             -> thread_memory provenance inside an explicit genesis_candidate fixture
Pass-C meaning            -> thread_meaning provenance inside an explicit genesis_candidate fixture
editorial introduction    -> editorial provenance
future media slots        -> generated_reconstruction provenance
```

`thread_memory` and `thread_meaning` here identify the semantic authority of the frozen candidate outputs. They do not imply publication into live Thread state; the enclosing lifecycle/fixture manifest and provenance notes preserve that boundary.

The packet contains no synthetic current-day life:

```text
no ThreadEncounterSnapshot
no current location/activity
no DailyPlan
no RecentLivedContext
no onMyMind
```

Those remain deferred to the live-encounter track.

## Stable meaning identity

P2 uses the canonical Fibre helper `autobiographicalMeaningId(memoryRef)` for the six presentation meaning references rather than inventing arbitrary presentation identities.

Two memories have later reinterpretation evidence in the frozen source. P2 projects the **latest current meaning** for those stable meaning identities and cites the later triggering episodes.

### v0.1 limitation discovered

`ThreadPresentationPacket v0.1` does not yet faithfully serialize the full memory/meaning revision lineage. The canonical Fibre authority revisions the autobiographical-memory record while preserving stable memory/meaning identity. P2 therefore does **not** fabricate separate revision identities merely to populate `supersedesMeaningRef`.

This is not a P2 blocker: the golden viewer can render current remembered meaning separately from history and memory. Before a viewer claims to show an exact “what it meant then / what it meant later” revision chain, the presentation contract should add revision-aware projection semantics grounded in the existing memory authority.

## Media

P2 contains 14 media slots:

```text
1  primary portrait placeholder
5  place-image placeholders
6  memory-reconstruction image placeholders
1  voice pending
1  life-film pending, using portrait as poster
```

Every media entry has `generation: null` and no resolved locator/hash. Media provenance is `generated_reconstruction`; no slot is evidence about what the candidate historically looked or sounded like.

## Validation implementation

`services/world-kernel/test/thread-presentation-can-tho-fixture.test.mjs` is an active test and verifies:

1. the bundle normalizes as an explicit unpublished candidate fixture;
2. candidate/thread/world/genome/event/memory identities occur in the frozen H-v2 source artifact;
3. historical excess is preserved rather than promoting every event to memory;
4. meaning references use canonical stable Fibre meaning identity;
5. memory and meaning retain separate provenance classes;
6. all media remains placeholder/pending reconstruction;
7. no synthetic live-encounter ontology enters the packet;
8. the fixture manifest pins scientific isolation and the exact source artifact;
9. the normalized presentation/media/provenance packet digests remain stable.

The implementation agent also normalized the generated three-packet bundle against the P1 domain contract in an isolated Node harness. Result:

```text
presentation timeline   10
memories                 6
current meanings         6
media assets            14
bundle normalization     PASS
```

Stable normalized digests:

```text
presentation  sha256:a00a3fb8600edc40965135f821609bb0882ed7dac27550ad2ffc76b464522cf7
media         sha256:39d6516da0c73b2f66ab8533d68b648578d6bd73d003a0becdf836da2252521d
provenance    sha256:da56742de15a6aa3f79ce29f6000a5899a467d49b18b3b98c1d9d57f47abd37e
```

This isolated bundle check is useful implementation evidence but does not replace maintainer execution in the real checkout.

## Maintainer validation

From a clean checkout:

```bash
git fetch origin
git switch agent/thread-presentation-milestones-v1
git pull --ff-only
git status --short

# P1 contract gate
node --test services/world-kernel/test/thread-presentation-domain.test.mjs

# P2 golden-fixture gate
node --test services/world-kernel/test/thread-presentation-can-tho-fixture.test.mjs

# Repository gates
npm run includes:check
npm run validate
npm test

git diff --check agent/pr39-genesis-childhood-birth-v1...HEAD
```

Expected targeted results:

```text
P1   8 pass / 0 fail
P2   8 pass / 0 fail
```

If the full active suite fails, compare the same suite against the current #39 base before attributing the failure to presentation work.

## Causal-status register

| Mechanism | Status | Current consequence | Claim explicitly not made |
|---|---|---|---|
| Golden Cần Thơ presentation fixture | Stored-only presentation evidence | proves a rich real candidate can inhabit the P1 contract | autonomous/live personhood |
| Fixture source mapping | Notarial | preserves exact candidate provenance and scientific isolation | #39 quality evidence |
| Media slots | Named/Stored-only reconstruction plan | lets the viewer render absence before generation | embodiment truth |
| Current remembered-meaning projection | Stored-only projection | viewer can distinguish memory from current meaning | complete reinterpretation lineage |

## Gate

P2 should be marked **CLEAR** only after the maintainer validation above is green (or any base-branch failure is explicitly separated).

Once clear, proceed to **P3 — `insidefibre.com` packet viewer foundation**. P3 is the first milestone that modifies the `insidefibre.com` repository.
