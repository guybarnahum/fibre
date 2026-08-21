---
id: m2-pr39-slice-g4-cognition-freeze
status: complete_clear
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G4 cognition and mechanical-policy freeze

## Status

**G4 COMPLETE / CLEAR — the frozen cognition/runtime packet was locally verified before G5. No final-cohort life generation was authorized or performed.**

Machine-readable authority:

```text
artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json
```

Verifier:

```text
tools/genesis/genesis-g4-cognition-freeze.mjs
```

Maintainer verification:

```text
active tests             572 / 572 green
verifier                 G4 COGNITION FREEZE: VERIFIED
model                    openai/gpt-5.1-2025-11-13
historical episodes      10 x 5 Threads
offer schedule entries   50
offer schedule digest    sha256:b50b2495133570c88fbff43d104bae5cfeaf79fe8fb21c4abba40096920ed903
G4 protocol digest       sha256:1a41d68aa0bf8c689c84843771cfce07ca0afa44a9b7093ad944f058a93c368d
verified HEAD            b36e7d94e158146c7b5750f2a6698f1e5804932c
```

G3 was maintainer-verified immediately before this freeze:

```text
568 / 568 tests green
G3 protocol digest sha256:3d4885d4c8f717622e466e65e7869526193eccd611967609f7809dfb4b1068a6
verified branch head 5415db4b2b0bc05454a9ae74d46f8ec94a851b6f
```

## Purpose

G4 removes the remaining cognition/runtime degrees of freedom before final-cohort generation.

It freezes:

- one provider/model/configuration for Pass A, Pass B, Pass C and Pass-A record repair;
- exact prompt and response-schema hashes;
- corrected constitutive Pass-B semantics;
- Pass-C initial and reinterpretation surfaces;
- EventStructurePool v2 digest and deterministic offer sampling;
- exact ten-window historical schedule;
- G3 memory-formation timing;
- deterministic Pass-C reinterpretation policy;
- factual initial rosters derived from the already-frozen Worlds;
- record/whole-candidate retry caps;
- admission gate list;
- publication-validator-set witness;
- a GenesisManifest cognition template that can be copied without reinterpretation.

The governing boundary remains:

> **The test exists before the people.**

G4 itself makes zero cohort cognition calls.

## Common cognition runtime

All five Threads and all three Genesis passes use:

```text
provider             openai
model                gpt-5.1-2025-11-13
transport            Responses API
structured output    strict JSON schema
temperature          0
top_p                1
reasoning effort     none
max output tokens    provider auto
timeout               45 s
operational retries  2, 2 s base delay
```

Operational retry is transport recovery, not scientific regeneration. It does not change seed, input, prompt, schema or assignment.

Using one cognition model across A/B/C avoids adding a cross-pass model-family confound to the final cohort.

## Pass A — historical life

Mechanism:

```text
corrected coupled chooser/realizer A0
```

Pass A receives the World, factual roster, prior admitted episodes and nine mechanically sampled EventStructure v2 affordances for the current developmental window. A world-emergent episode remains legal.

There is no separate model selector and no selected-opportunity layer in the final cohort.

Hard absences remain:

```text
genome / parent loci
future role / profession / benchmark
remembered meaning
Fibre-computed need conclusions
Fibre-computed mechanical-condition values
source-instance biography
```

The main prompt/schema are the same corrected rich-Pass-A authority used by the carried A0 mechanism.

## Historical schedule

Each Thread gets exactly ten Pass-A episode opportunities over the reviewed EventStructurePool v2 age range:

```text
age span       6.000 through 17.999
calendar span  2010-08-20 through 2022-08-19
windows        10 equal time/age strata
offers/window  9
Threads         5
```

The deterministic offer seed is:

```text
pr39-g4-final-life-v1:slot:<01..05>:structures:<windowId>
```

The pool is frozen at:

```text
genesis-event-structure-pool-v2
sha256:1437891b2cbe2d8082283619b3f9e38e6cbce3eb2a323e989e27ce1a1dd33733
```

The verifier replays all **50 Thread × window offer schedules** from the frozen pool, window ranges and seeds.

### Why history ends before Fibre entry

The Thread still enters Fibre at age 22:

```text
bornAt             2004-08-20
entry stage        young_adult
ageAtEntry         22
entry chronology   2026-08-20
```

The ten generated episodes are a **sparse childhood-through-adolescence historical sample**, not an exhaustive diary. The absence of generated episode records before age 6 or between age 18 and entry at 22 is not a factual claim that nothing happened in those intervals.

G4 deliberately does not add an unreviewed young-adult EventStructure extension merely to fill calendar space. The final cohort stays on the reviewed v2 developmental mechanism.

## Factual initial rosters

Pass A requires a structured factual roster, while G1 froze household/family context as prose. Leaving roster construction until execution would create a hidden authoring degree of freedom.

G4 therefore freezes one roster per already-frozen World before any life output exists.

Examples include only World-supported facts such as:

```text
Cần Thơ        caregiver, younger sibling, grandparent, nearby relative
Łódź           two caregivers, older sibling
Cusco          caregiver, nearby aunt/uncle/two cousins
Accra          two caregivers, older/younger cousins
Sudbury        caregiver, step-caregiver, nearby grandparent
```

No roster entry contains personality, values, ideology, predicted relationship quality or formative significance. The verifier requires every non-subject role to be an `affordedRole` in that frozen WorldSpec.

## Pass B — canonical constitutive memory formation

G4 promotes the corrected development semantics into production authority:

```text
services/world-kernel/src/genesis-pass-b-prompts.mjs
```

Pass B is explicitly a **memory-formation** task, not memory detection.

`priorMemories: []` is normal. `not_remembered` is fully legal.

When G3 supplies `genomeExposure`, the genome may influence attention/retention, but it is not a lived event. The prompt expressly forbids copying loci into memory, fabricating an episode from a locus, or turning loci directly into personality, meaning, lessons or future policy.

Model-facing remembered-content bound:

```text
600 characters
```

This is a mechanical safety margin below the canonical 2048-byte admission bound and reuses the bounded form that survived N2 development.

G3 remains the sole direct-treatment assignment authority:

```text
horizons  4 5 6 7 8 10
direct    L L T L L T
```

For each horizon, `rememberingAt`, `ageAtRemembering` and `chronologyEndsAt` are the end/max-age of that horizon's frozen developmental window. Visible history is exactly the first N admitted Pass-A episodes.

## Pass C — genome-blind meaning

Pass C remains unconditionally genome blind and one-memory scoped.

G4 freezes both existing canonical surfaces:

```text
initial durable-meaning formation
reinterpretation
```

The GenesisManifest carries a composite Pass-C prompt/schema digest; the G4 protocol separately records the exact component hashes.

Reinterpretation remains mechanical:

```text
minimum later-trigger age   5 years after prior meaning
run cap                     3 per Thread
relation precedence         same structure family
                            -> same person/relationship
                            -> same intellectual source
```

`revised`, `unchanged` and `none` remain legal. There is no quality pressure to produce reinterpretation.

## Repairs and retries

### Pass A

Existing mechanical repair/retry authority remains:

```text
maximum generated versions per episode record = 3
```

Repairs may only repair record form or regenerate a mechanically invalid record from the same frozen input. The failed gate remains visible. A retry may not ask for a richer, more interesting, more diverse, more intellectual or more consequential replacement.

### Pass B / Pass C

There is **no model-level semantic/form retry** in G4 for Pass B or Pass C.

Strict provider-schema output plus domain normalization is the admission boundary. A non-operational invalid record fails the one final-cohort candidate rather than inviting content-selective retry.

### Whole life

```text
whole-candidate attempt cap = 1
```

If the final candidate cannot complete under the frozen record-level mechanics:

```text
PRESERVE_FAILURE
HOLD
NO NEW SEED
NO QUALITY REGENERATION
```

This is intentionally stricter than earlier development runners that could use multiple whole-life candidates.

## Publication witness

G4 freezes the current publication-validator witness exactly:

```text
world-store schema                 6
identity atomic-claim policy       identity_atomic_material_proposition:1
autobiographical-memory policy     autobiographical_memory_epistemics:1
situated-life contract             situated-life-domain+grounding-guards:current

digest sha256:d5136d94531248a942289b0e4fb3b63c7ad2b96a3a143d6ca31761801ca794bd
```

The protocol also stores a complete `manifestCognitionTemplate`. The verifier passes that object through `normalizeGenesisCognition()` and checks it against the live publication witness.

## No hidden quality gates

The frozen admission surface contains mechanical/domain integrity only.

There is no gate for:

```text
number of books
number of people
number of places
trauma / adversity
novelty
intellectual-event count
memory rate
meaning rate
articulacy
personality differentiation
narrative coherence
expected H performance
```

Those remain characterization or later blinded diagnostics.

## Verification

Maintainer execution:

```bash
npm test
npm run genesis:g4-verify
```

Result:

```text
572 / 572 active tests green
G4 COGNITION FREEZE: VERIFIED
Model: openai/gpt-5.1-2025-11-13
Historical episodes: 10 x 5 Threads
Offer schedule entries: 50
Offer schedule digest: sha256:b50b2495133570c88fbff43d104bae5cfeaf79fe8fb21c4abba40096920ed903
G4 protocol digest: sha256:1a41d68aa0bf8c689c84843771cfce07ca0afa44a9b7093ad944f058a93c368d
```

The verifier makes **zero model calls** and checks:

- exact G3 digest binding;
- current A/B/C/repair hashes;
- canonical Pass-B constitutive prompt/profile;
- EventStructurePool v2 digest;
- ten exact developmental windows;
- 50 deterministic offer schedules;
- all five World↔Thread roster bindings and afforded roles;
- whole-candidate and record caps;
- publication witness;
- normalized GenesisManifest cognition template;
- no-final-life-before-Gate-G boundary.

## Boundary

```text
G1        COMPLETE / CLEAR
G2        COMPLETE / CLEAR — five-pair textual-distinguishability ceiling
G3        COMPLETE / VERIFIED
G4        COMPLETE / VERIFIED / CLEAR
G5        NEXT — freeze independent raters and diagnostics
G6        BLOCKED on G5
H         FORBIDDEN until blocking Gate-G CLEAR
```

G5 may not modify the cognition, historical, roster, treatment, repair or publication surfaces frozen here.
