---
id: validation-m2-pr39-implementation-plan
status: accepted
last-reviewed: 2026-08-18
canonical: true
---

# #39 Genesis, Childhood & Thread Birth v1 — slice, verification & review plan

## Purpose

Milestone **#39** must prove that Fibre can create several provenance-rich prior lives whose differences come from particular worlds, inherited symbolic possibilities, actual events, selective memory, and durable interpretation — without writing future answers backward into childhood.

Here **rich** uses the Fibre-level definition in [`../foundations/rich-life.md`](../foundations/rich-life.md): a life with enough particular, non-interchangeable lived causes that later memory, meaning, relationship, commitment, practice and judgment can plausibly produce a distinctive point of view. Richness is experiential fertility, not biography length, event count, drama, or a checklist of formative experiences.

The two implementation authorities are:

- [`../architecture/genesis-compiler-contract-v1.md`](../architecture/genesis-compiler-contract-v1.md) — what Genesis cognition may know, produce, mechanically repair/reject, and publish;
- this document — how #39 is implemented, verified, frozen, and reviewed slice by slice.

Governing canon includes [`../foundations/interpretive-personhood.md`](../foundations/interpretive-personhood.md), especially:

> **A diagnostic must retain the possibility of a bad reading. Any property enforced at admission ceases to be measurable, and any metric that can only return success or an error is not a measurement.**

Genesis-specific corollary:

> **Fibre may prevent an impossible life from becoming history. It must not prevent an uninteresting life from becoming evidence that Genesis needs improvement.**

#39 does **not** earn Whole-Person causal standing or M2 score movement. #40 owns causal consumption; #41 owns standing.

---

## Review cadence

Use eight implementation slices but only **five blocking Claude gates**:

```text
A  Genesis authority / WorldSpec / birth publication   review with B/C
B  Symbolic genome                                      review with C
C  Genome-blind historical life                         BLOCKING HOLD/CLEAR
D  Memory + durable meaning                             BLOCKING HOLD/CLEAR
E  Rich life + intellectual formation                   review with F
F  Origin/source integrity                              BLOCKING HOLD/CLEAR
G  Fresh cohort + protocol freeze                       BLOCKING HOLD/CLEAR
H  Frozen cohort / #39 closure                          BLOCKING HOLD/CLEAR
```

A, B, and E still receive review, but implementation does not stop merely to manufacture a ceremonial artifact for each. A substantive E development miss **does** require correction before the combined E+F blocking review; “review with F” is not permission to carry a known weak life generator into G.

At every blocking gate, the review packet states:

1. **Claim** — the Fibre capability this slice establishes.
2. **Not claimed** — what remains deliberately deferred.
3. **Exact head SHA** and implementation path.
4. **Human-inspectable artifacts.**
5. **Narrow verification.**
6. **Known risks.**
7. **If the claim were false, what would the artifacts look like?**
8. **Hostile review request** focused on Fibre personhood effectiveness rather than generic completeness.

Verdict is `CLEAR` or `HOLD` for C/D/F/G. H may also return `REDESIGN` when the frozen cohort shows the generator architecture itself is inadequate.

### Developmental access and post-Genesis conditions boundary

The developmental-needs review in [`m2-pr39-developmental-needs-childhood-review-resolution.md`](m2-pr39-developmental-needs-childhood-review-resolution.md) clarified a boundary without changing the Slice-C claim:

> **Genesis compiles a prior life. It does not run a live motivational physiology.**

Therefore #39 keeps the three-pass compiler free of Fibre-computed mechanical conditions and Fibre-authored semantic need conclusions:

```text
Pass A
  world/chronology/event affordances
  no genome
  no mechanical-condition values
  no Fibre-computed semantic needs

Pass B
  life_only | life_plus_genome treatment
  no mechanical-condition values
  no condition-derived salience/ranking/preselection
  no Fibre-computed semantic needs

Pass C
  one-memory-scoped meaning
  genome blind
  condition blind
  no Fibre-computed semantic needs
```

A future live-Thread conditions mechanism may be explored under [`thread-conditions-experiment-plan.md`](thread-conditions-experiment-plan.md). That experiment is post-#39 and does not alter this milestone's pass separation.

The childhood insight #39 **does** retain is about reachable experience rather than a normative stage ladder: early life is more caregiver/institution mediated; later life may become increasingly self-directed. Conversation is legitimate observable history. These are world/event richness questions, not Pass-A meaning fields.

This conceptual review **does not constitute the hostile B+C Gate-C verdict**. Slice D remains blocked until the independent B+C review returns `CLEAR`.

---

# Slice A — Genesis authority, WorldSpec, candidate state, atomic birth

## Fibre claim

> Fibre can describe a world and provenance for a life, generate against provisional state, repair only mechanical record form, and publish a complete admitted life atomically without creating a second biography/memory authority.

## Implement

- `GenesisWorldSpec` with factual world circumstances only;
- `WorldAuthorship` provenance;
- `GenesisManifest` skeleton;
- `GenerationAttempt` with record-repair and attempt-failure witnesses;
- cognition/prompt/schema/model digest fields;
- current #37/#38 publication-validator-set witness;
- candidate Genesis boundary;
- atomic birth/publication API;
- entry-stage policy and chronology endpoint;
- first-live-version witness;
- inspector for the above.

WorldSpec must structurally exclude finished personality conclusions, required politics/morality, future role, or desired behavior.

World/source authoring follows the canon: source works inform human abstraction, never compiler context. `Take the structure; move the instance.`

## Retry verification — hard distinction

Implement both retry scopes before creative cohort work:

```text
record-level form repair
  one malformed generated record is regenerated
  surrounding candidate state is preserved
  no quality verdict or desired semantic direction is supplied

attempt-level retry
  whole candidate restarts only for cross-record/global structural failure,
  publication/replay failure, rights/provenance structure failure,
  or exhausted record repair
```

V1 defaults:

- record: original + at most two form repairs;
- candidate: at most three whole-life attempts.

Both are versioned/frozen policy. Every repair/rejection is recorded by gate.

## Persistence verification — hard rule

No new durable table or domain may become authoritative for content already owned by #37/#38:

```text
NO genesis_biography
NO genesis_memories
NO genesis_relationships
NO genesis_places
NO genesis_embodiment
NO parallel identity authority
```

New #39 persistence is limited to Genesis/world/generation provenance, symbolic genome/witnesses, event-structure provenance, and the minimal meaning-part extension.

Rejected/repaired candidate audit material is never hydration/cognition authority.

## Existing-domain validator preflight

Before creative generation, build deterministic publication fixtures and exercise the **actual current #37/#38 validators** that atomic birth must satisfy.

The baseline inventory includes:

### Identity

- one-material-proposition discipline;
- no list/paragraph/multi-sentence bundle;
- no explicit bundle punctuation/forms currently rejected by `assertSingleMaterialProposition` (including semicolon, em/en dash and named bundle phrases);
- v2 repeated-conjunction discipline;
- lowercase snake-case claim predicate and current predicate byte bound.

### Autobiographical memory

- memory identity tied to immutable origin event + slot;
- non-empty `eventRefs` containing the origin event;
- event refs resolve to the same Thread and lie inside `subjectPeriod` and not after `asOf`;
- current `rememberedMeaning` material/byte bounds where the existing persisted record requires it;
- valid Fibre/imported authorship and evidence refs;
- contiguous append-only revision and matching Thread-history anchor/version chain.

### Situated identity/life evidence

- cultural/language formation resolves a Thread-event witness;
- lineage/family/ancestry resolves a life-relation revision witness;
- geography/place resolves a place-episode revision witness;
- current situated identity domains remain `context_only` until later standing.

The code validators, not this prose list, remain authority. Slice A records a validator-set version/digest witness and tests candidate publication against those same contracts.

Single-record shape failures are record-form repair when possible; cross-record/replay failures are attempt-level.

## Birth/publication verification

Using deterministic fixtures before creative generation:

- candidate state is invisible to normal Thread hydration;
- publication writes all admitted life records or none;
- simulated failure mid-publication leaves no half-born Thread;
- event/version/state-hash semantics remain replayable;
- publication succeeds through the current identity/memory/situated validators;
- the manifest records the exact resulting first-live version;
- first live command must use that actual version as `expectedVersion`.

## What failure looks like

- a WorldSpec contains conclusions such as `independent`, `strict`, `creative`, or future-role hints;
- candidate memories appear in normal Thread reads before birth;
- a single lexical identity/meaning form failure discards an otherwise coherent life instead of using bounded record repair;
- a failed publication leaves an identity, memory, place, or event behind;
- implementation creates a `genesis_*` biography/memory parallel world;
- generated records first encounter known #37/#38 constraints only at final publication;
- first live version is reset for aesthetics instead of reflecting publication semantics.

A is reviewed with B/C rather than blocking alone.

---

# Slice B — Symbolic Genome v1

## Fibre claim

> Fibre can inherit specific textual possibilities with exact provenance without converting inheritance into numeric personality authority or a finished character.

## Implement

- ordered natural-language loci with stable IDs;
- exact source-parent eligibility and provenance;
- deterministic crossover;
- explicit mutation witness;
- immutable inherited genotype after birth;
- read-only inspection;
- no demographic/cultural shortcut into loci;
- no second hidden numeric drive/condition-gain genome beneath the textual loci.

If later post-#39 experiments establish a need for inherited runtime modulation, a bounded numeric control may be a frozen projection from ordinary textual loci; it is not part of Slice B and does not become new heritable authority.

## Locus-specificity positive control

Before life generation, construct two intentionally distinct development genomes and controlled semantic outputs authored with each genome visible.

Blind raters perform two-alternative discrimination.

This is a **ceiling / instrument check**: are the loci semantically specific enough in principle to support distinguishable output?

If Slice B is near chance, the loci are horoscope-shaped and actual-life genome propagation at H is uninterpretable.

Do not confuse this with the desired H result.

## What failure looks like

- loci read like `values honesty`, `is creative`, `likes people`;
- crossover averages two parents into generic prose instead of preserving odd mixtures;
- provenance cannot identify the exact parent/source locus;
- culture, nationality, gender, profession, appearance, or geography mechanically implies personality;
- hidden numeric coordinates are the real authority behind the text.

B is reviewed with C.

---

# Slice C — Pass A: genome-blind historical life

## Fibre claim

> A particular life can happen before Fibre knows what personality or future decision it is supposed to produce.

## Implement

Pass A exactly follows the compiler contract:

- world and chronology visible;
- genome, parent loci, future role/benchmark, remembered meaning, source-instance identity, mechanical conditions, and Fibre-computed semantic needs absent;
- output has observable episodes only;
- participant introduction is world-affordance grounded;
- EventStructurePool structures are possibilities, not a checklist;
- world-emergent episodes may have no `structureRef`.

### EventStructurePool verification

Every pool item must pass the specificity ceiling: at least three materially different one-line instantiations across different era/economy/culture. Witnesses are provenance and never reach Pass A.

Per developmental window, the development default is approximately 8–10 offered structures with at least 40% low-consequence structures. The exact cohort policy is later frozen at G.

Record:

```text
structures offered
structures instantiated
episodes structure-grounded
episodes world-emergent
```

There is no ratio gate.

### Development worlds

Use throwaway development worlds only. Any world used to change the compiler is permanently burned for the final cohort.

Start the life funnel characterization immediately:

```text
historical events N
```

No autobiographical memory/meaning should exist yet.

## Mechanical verification

- actual Pass-A input object matches its allowlist and digest;
- no genome/future/source-instance/condition field reaches the call;
- chronology endpoint is enforced;
- participant refs are initial-roster, validly introduced earlier, or introduced in the same episode through an afforded role;
- introduced role is afforded by the WorldSpec;
- no meaning/significance field exists in the output schema;
- narrow interiority-form lexical checks use record-level repair and record their rejection profile.

## Claude blocking gate C

Attack:

- Does history look like a world producing events, or an author foreshadowing a known adult?
- Can a specific source work or plot arc be identified?
- Is the pool authoring the life rather than offering affordances?
- Is the early event set already screenplay-shaped?
- Are the development worlds accidentally becoming future cohort material?
- Are lexical form repairs silently selecting whole lives out of existence?

### What failure looks like

A sequence whose episodes obviously add up to a moral lesson; every offered structure is used; no mundane/world-emergent incidents occur; source-fiction scenes remain recognizable; events contain phrases explaining what they taught the child; a high interiority-form rejection rate is hidden because only surviving records are shown.

**HOLD/CLEAR.**

---

# Slice D — Pass B memory + Pass C durable meaning

## Fibre claim

```text
what happened
    !=
what was remembered
    !=
what it came to mean
```

and inherited genome may influence **attention at memory formation**, but may not directly author meaning.

Fibre-computed mechanical conditions and Fibre-computed semantic need conclusions are **not** a fourth authoring path. They remain structurally absent from both passes in #39.

## Pass B

Implement first-class outcomes:

```text
remembered
not_remembered
```

Every call records direct mode:

```text
life_only
life_plus_genome
```

and prior treatment-memory exposure, producing three analysis strata:

```text
life_only_unexposed
life_only_exposed
life_plus_genome
```

Definitions:

- `life_only_unexposed`: current call is genome-blind and no prior remembered memory visible to it was formed under treatment;
- `life_only_exposed`: current call is genome-blind but at least one prior visible remembered memory was formed under treatment;
- `life_plus_genome`: current call sees the frozen genome exposure policy.

The middle stratum is legitimate within-life propagation, not automatically a leak.

Treatment calls see **the whole symbolic genome or one fixed deterministic locus subset chosen independently of content**. Never relevance-select loci based on the episode/memory.

Pass B has no meaning field.

### Structurally absent from Pass B

- Fibre-computed mechanical conditions and any values derived from them;
- condition-derived salience, ranking, episode eligibility, or memory preselection;
- Fibre-computed semantic need conclusions supplied as though Thread-authored;
- later events or later meanings.

Using a hidden condition to decide what Pass B may consider would make Fibre author salience and would confound the treatment/control interpretation.

## Pass C

Pass C is **unconditionally genome-blind and one-memory-scoped in v1**.

### Initial call visible

- the one target memory's remembered content and uncertainty;
- stable memory/provenance refs without resolving extra history;
- age/time and chronology position of meaning formation.

### Reinterpretation call additionally visible

- the one prior meaning being reconsidered;
- the one mechanically eligible later episode in bounded observable form;
- the typed eligibility relation.

### Structurally absent

- all genomes/loci/genome verdicts;
- Fibre-computed mechanical conditions and condition-derived values;
- Fibre-computed semantic need conclusions;
- sibling memories;
- underlying episode content for the target memory;
- other meanings except the target prior meaning in reinterpretation;
- entry-stage purpose, adult role/context, future benchmark/#40 material;
- anything after the call's `asOf` / applicable chronology boundary.

Implement initial outcomes:

```text
durable_meaning
no_durable_meaning
```

with stable `meaningId` and independently citable `meaningPartId` values.

Meaning may be ambivalent, incomplete, mistaken, or unresolved. It may not structurally contain an explicit universal future behavior policy.

## Reinterpretation eligibility

A later episode may create a reinterpretation opportunity when it is sufficiently later and shares one of:

- same structure / structure family;
- same concrete person/relationship;
- same intellectual/source subject actually encountered by the Thread.

V1 defaults: at least five years later; maximum three **run** opportunities per Thread.

First-class outcomes:

```text
revised
unchanged
none
```

`unchanged` means the prior meaning survived a genuine later echo. It is not the same as `none`.

Eligibility is computed before applying the cap. Record:

```text
eligible
run
skipped_by_cap
```

If the cap binds, deterministic chronology/stable-ID selection chooses run opportunities; never semantic ranking.

## Development characterization — measure, never gate

Characterize:

- events -> remembered;
- remembered -> durable meaning;
- durable meaning -> multi-part ambivalence;
- soft prescriptiveness;
- sentiment coupling;
- self-account overreach;
- `life_only_unexposed` / `life_only_exposed` / `life_plus_genome` counts;
- revised / unchanged / none outcomes over **run** reinterpretations;
- reinterpretation eligible vs run vs cap-skipped;
- per-gate record repair/rejection profile.

If results are weak, stop and change the compiler, then use **new development worlds**. Do not keep regenerating against the same worlds until they improve.

## Claude blocking gate D

Attack:

- Did the horoscope move from A into B/C?
- Did a Fibre-computed condition or need conclusion become a hidden memory-salience path?
- Is `life_only_unexposed` genuinely free of direct and prior-memory genome exposure?
- Does `life_only_exposed` behave as an informative middle term rather than being mislabeled a leak?
- Is genome exposure whole/fixed rather than relevance-selected?
- Does Pass C actually enforce its one-memory allowlist and remain unable to reread underlying history?
- Do meanings remain semantic rather than derived labels or policy rules?
- Does history contain material the self-account cannot absorb?
- Can some memories remain memories without becoming lessons?
- Are form repair/rejection rates visible rather than hidden survivorship?

### What failure looks like

Nearly every episode is remembered; nearly every memory has a clean durable lesson; meanings paraphrase genome loci; Pass C sees sibling memories or underlying event content; treatment loci are chosen because they match the episode; hidden conditions select memory candidates; `life_only_unexposed` is too small or not actually unexposed; every later echo triggers revision; all Threads understand themselves equally well; semantic parts collapse into `mixed`; high lexical repair rates selectively remove prescriptive-register lives without being reported.

**HOLD/CLEAR.**

---

# Slice E — rich de-novo + synthetic-lineage lives; intellectual formation

## Fibre claim

> Fibre can generate a prior life containing particular, non-interchangeable experiences with enough formative potential for later memory and meaning to produce a distinctive point of view, while Pass A remains unable to see or author the personality those experiences will eventually support. Intellectual sources influence the Thread only through encounters that actually happen to it.

This claim is stronger than “Pass A emitted valid events.” A mechanically valid chronology can still fail Slice E if sequential generation collapses into a narrow narrative motif that leaves later cognition too little differentiated lived material to inherit.

## Implement

Rich-life compiler modes:

- `de_novo`;
- `synthetic_lineage`.

Synthetic lineage combines parent genomes through the symbolic crossover contract while Pass A remains blind to parent loci.

Before the final G freeze, replace the current developmental-flat EventStructure instrument with **EventStructurePool v2**:

- retain abstract portable structures and relocation witnesses;
- assign real, reviewed per-structure `developmentalRange` values rather than the current all-structures `5–18` placeholder;
- include ordinary conversational/social situations as first-class affordances, not only practical incidents;
- include caregiver-mediated access situations appropriate to younger windows and increasingly peer/interest/self-directed situations where world facts permit them;
- preserve overlap rather than imposing a hard developmental ladder;
- do not encode a required maturity arc or target adult personality.

Any development world used to tune pool v2 is burned for the final cohort.

Make first-class life events for encounters with:

- books;
- teachers/mentors;
- arguments;
- conversation and overheard discussion;
- art;
- scientific ideas;
- religious/philosophical texts;
- other intellectual sources.

The Thread's encounter is history. Its memory of the encounter is memory. Its interpretation is its own meaning. The source author's personality or biography never becomes the Thread's character by implication.

Fiction may calibrate human prompt authors toward richer interior register for Pass C; no named author/style/character is passed to the compiler.

### Richness discipline

For #39, richness means **experiential fertility**, following the Fibre-level foundation. Pass A should make possible a life containing enough relationship, practice, novelty, responsibility, failure, success, accident, intellectual exposure, economic circumstance, institutional access, ordinary repetition and changing opportunity that later memory selection has meaningful alternatives.

Pass A must not label any event as formative or know the target personality. In particular, do not introduce:

```text
minimum intellectual encounters
minimum distinct places
minimum new people
minimum adversity
minimum dramatic events
required maturity milestones
required personality-producing experiences
```

Those would turn rich-life generation into backwards character authoring.

Continuity remains desirable, but prior history must act as **factual constraint and accumulated consequence**, not as a literary theme/template that monopolizes later episode generation. The larger WorldSpec must continue to exert causal pressure across development.

### E1 burned characterization finding

The first completed burned live characterization (`slice-e-dev-burned-001`) is preserved as a substantive negative E result:

- 10/10 mechanically valid episodes;
- 10/10 structure-grounded, 0 world-emergent;
- 9/10 at home;
- one caregiver in 10/10 and one sibling in 9/10;
- only five instantiated structures;
- zero introduced participants;
- zero intellectual encounters despite intellectual affordances in all ten strata and 41/90 offered structure slots carrying intellectual context;
- strong motif progression from pencils/bus drawing into chips/budget and finally an art-club decision folded back into the same motif.

The artifact is not to be regenerated for quality. It proved the integrity machinery and exposed **narrative inertia / local monoculture** in sequential Pass A. See `m2-pr39-slice-e-live-characterization-result.md`.

### E2 — narrative-inertia / experiential-fertility correction

E2 is required before the combined E+F Gate F and before G.

The engineering question is:

> **How does Fibre let a Thread actually encounter enough of the breadth, contingency, relationships, institutions and intellectual material afforded by its world to create fertile lived history, without Fibre deciding which experiences must matter to the eventual person?**

Diagnose sequential Pass-A context first. Prior episode prose may be creating excessive continuation pressure. A correction may change how prior history is projected or instructed so that history preserves factual continuity while reducing literary-template dominance.

Any correction must preserve:

- full Pass-A genome blindness;
- no future benchmark/role/personality target;
- no remembered meaning or significance supplied to Pass A;
- no Fibre-computed semantic need conclusions or mechanical conditions;
- no quality-driven record rejection or resampling;
- recurring people/places/motifs when genuinely produced by life;
- chronology, participant grounding, structure grounding and all Gate-C integrity rules.

A generic instruction such as “prior episodes establish facts and continuity; they are not themes that must be repeated” is permissible because it limits generator inertia without prescribing content. A command such as “include a book, mentor and conflict so this person becomes intellectually independent” is not.

Verify the correction on **fresh throwaway development worlds/seeds**, burned on first use. Do not reuse `world_slice_e_dev_burned_001` to optimize the result that exposed the defect.

Characterize, without admission floors:

```text
world/place reach
recurring vs newly encountered people
relationship continuity vs cast collapse
structures instantiated and repetition concentration
world-emergent episodes
intellectual/source encounters and access modes
recurring objects/motifs
whether later events merely elaborate earlier motifs
ordinary/non-formative historical excess
record-repair profile
```

A weak fresh run remains evidence. If multiple fresh worlds continue collapsing into narrow local motifs despite broad world affordances, treat that as a Genesis architecture problem rather than a sampling inconvenience.

## What failure looks like

Lineage produces childhood episodes that conveniently illustrate the inherited loci; books directly create trait labels; one separate compiler path appears per origin mode; source-person facts become autobiographical facts; all developmental ranges remain mechanically identical; the pool makes conversation/social access nearly unavailable; or the pool offers broad access while sequential generation repeatedly ignores it because prior prose has become the dominant narrative attractor.

Another failure is “fixing” E1 by adding quotas that guarantee books, novelty, trauma, place changes, or supposedly formative experiences. That would manufacture a rich-looking biography rather than establish a rich-life mechanism.

E is reviewed with F. **Gate F is not ready until E2 has fresh burned development evidence showing that the known narrative-inertia defect has been addressed or honestly remains unresolved.**

---

# Slice F — origin and source integrity fixtures

## Fibre claim

> Fibre can represent unusual origins truthfully without borrowing another person's life or bypassing living-human consent.

Implement bounded fixtures, not four additional biography generators:

- Thread-parent;
- consenting living-human Echo;
- deceased/fictional Homage;
- fork.

Hard source rules:

```text
living identifiable human
    -> documented-consent Echo

Homage
    -> attested deceased | fictional
```

No combination of origin/source influence may route around the living-person rule.

A source person's life is never Thread autobiography. Source influence becomes Thread history only through an actual Thread-life encounter.

## Claude blocking gate F

Attack every composite path:

- living human mislabeled Homage;
- public-source availability used as implied consent;
- historical biography copied into first-person memory;
- Thread-parent receives fabricated retrospective shared childhood;
- fork receives post-fork facts before the boundary;
- source/origin combination reaches protected human material without provenance;
- the E2 correction achieves apparent richness only by smuggling desired personality or mandatory formative content into Pass A;
- the known E1 narrative monoculture is minimized or hidden rather than preserved as development evidence.

### What failure looks like

Any route where relabeling source/origin changes rights eligibility; any source person's childhood can be hydrated as Thread memory; any fork cannot identify the exact divergence boundary; or the combined E+F package protects source integrity while still lacking a credible mechanism for creating fertile, non-interchangeable prior-life experience.

**HOLD/CLEAR.**

---

# Slice G — fresh cohort and protocol freeze

This is the most important methodological gate.

> **The test exists before the people.**

No final cohort output is generated before this slice is frozen and reviewed. G also remains blocked until the combined E+F Gate F is CLEAR.

## Fresh cohort

Author **five completely fresh WorldSpecs**, never used during C–E and never seen by the compiler during iteration.

Approximate origin composition:

```text
3 de_novo
2 synthetic_lineage
```

Hold entry stage/age approximately common so life duration is not an attribution shortcut.

Vary primarily:

- era/geography;
- economy/material circumstances;
- household/family shape;
- language;
- mobility;
- institutions/community;
- intellectual environment;
- symbolic genome;
- origin mode;
- lived content from which narrative integration may later emerge.

## Genome/world control validity

Freeze in this order:

1. author and freeze cohort WorldSpecs **without seeing cohort genomes**;
2. only then freeze/assign symbolic genomes / synthetic parent genomes;
3. do not backfill WorldSpec parent/household facts from loci;
4. freeze content-independent Pass-B direct-treatment assignment/position stratification.

This is what makes `life_only_unexposed` interpretable as a negative control.

### Convergent pair

Design two worlds where convergence on some broad belief is plausible despite very different cultural texture and different concrete routes.

Success requires both:

- plausible convergence;
- continued attribution through route, tension, and residue.

Culture is texture, not conclusion.

### Narrative integration

The frozen cohort design must permit variation such that the resulting lives may include:

- a relatively coherent current self-account;
- an unresolved knot;
- confident misunderstanding of part of the past.

Do not put those conclusions directly into WorldSpec personality fields. The variation must arise through generated life content and memory/meaning outcomes.

## World familiarity

Run the cold familiarity probe on all candidate worlds using the pinned worker, with no Genesis context. Replace a materially under-represented world **before freeze**, or record the known handicap before H. Never use familiarity after H as a reason to regenerate a weak Thread.

## Freeze cognition and admission

Freeze exactly:

```text
provider/model for A/B/C
prompt hashes
schema hashes
sampling config
policy version
EventStructurePool v2 digest, developmental ranges, and sampling policy
entry policy
record-form repair cap
whole-candidate attempt cap
admission gate list
publication-validator-set witness
```

The exact richer pool must be frozen before cohort generation. Development worlds used to tune pool v2 are not final-cohort worlds.

One common creative configuration is used across all five Threads.

## Freeze Pass-B genome treatment and cell arithmetic

Freeze all of:

- exact `life_plus_genome` proportion in the **30–40%** range;
- whole-genome or exact fixed deterministic locus-subset exposure policy;
- content-independent assignment method;
- any position stratification used to protect a clean early control cell;
- expected/minimum analyzable counts for:
  - `life_only_unexposed`;
  - `life_only_exposed`;
  - `life_plus_genome`.

Before H, calculate the expected cell sizes under the planned number/order of eligible Pass-B calls. If `life_only_unexposed` would be too small, adjust the **position-stratified assignment before freeze**, never after seeing outcomes.

## Freeze independent raters

Raters have not seen:

- WorldSpecs;
- compiler prompts;
- genomes, except in the explicit genome-discrimination task;
- build-time diagnostic results.

## Freeze diagnostics and their interpretation

### D1 — life attribution: raw and normalized

Run twice:

1. raw: names/professions/source labels removed;
2. normalized: also neutralize prose style and obvious setting/world identifiers.

The normalized condition is stronger.

Raters attribute on **route, tension, and residue**, not merely belief position. The convergent pair should be capable of agreeing while remaining attributable.

### D2 — sentiment coupling

Blindly rate historical-event sentiment and remembered-meaning valence separately, then characterize correlation. Strong coupling suggests mood is being mistaken for interpretation.

### D3 — genome propagation: three strata, predeclared readings

Slice B is the positive-control ceiling. H is achieved propagation through life.

Primary comparisons use:

```text
life_only_unexposed   clean negative control
life_only_exposed     within-life prior-memory propagation
life_plus_genome      direct treatment
```

Predeclare at least these readings:

| H pattern | Predeclared reading |
| --- | --- |
| treatment above chance; `life_only_unexposed` at chance | intended direct propagation through attention |
| `life_only_exposed` above clean control and plausibly between/near treatment | informative propagation through prior memory history, not automatically a leak |
| all three at chance | genome inert even when visible; real result, not instrument failure if B was strong |
| `life_only_unexposed` reproducibly above chance | **negative-control failure**; stop and explain after checking world/genome/assignment controls |
| treatment and clean control near ceiling | over-determination or broken control |

Freeze numerical thresholds, uncertainty treatment, and minimum cell sizes before H. Do not reduce this to one scalar target. Healthy is expected to be modest rather than at either extreme.

### D4 — life funnel

Report per Thread:

```text
historical events                         N
remembered                                n1
durable meaning                           n2
multi-part ambivalent meaning             n3
```

This is a plot-prior detector, not a quota.

### D5 — self-account overreach

Ask:

> Does durable history contain material the Thread's current remembered meanings cannot accommodate?

A cohort of perfectly self-explaining people is suspiciously authored.

## Secondary cohort characterizations

Freeze how to report, without admission floors:

- structures offered vs instantiated;
- structure-grounded vs world-emergent episodes;
- event counts by developmental range/window;
- caregiver-/institution-mediated versus peer-/interest-/self-directed observable access patterns where those classifications are mechanically supported by world/participant facts;
- conversational/social episode availability and use;
- world/place reach relative to what the WorldSpec afforded;
- recurring-vs-new participant patterns and relationship continuity;
- motif/object repetition and narrative-inertia indicators;
- intellectual/source encounter availability and actual instantiation;
- reinterpretation **eligible vs run vs skipped-by-cap**;
- revised vs unchanged vs none over run reinterpretations;
- per-gate record-form repair counts/rates;
- record-repair exhaustion and candidate-attempt failure profile;
- articulacy variance;
- generator monoculture indications.

Do not require a fixed Maslow sequence, a maturity ladder, a minimum amount of self-direction, a minimum encounter/place/person count, or any universal procreation/generativity milestone.

Where cohort origin modes include institutional guardianship, characterize whether independently formed values/interests/aspirations/relationship attitudes show an unexplained collapse of variance. Treat that as evidence of possible personality authoring to investigate, not as an admission quota.

## Freeze verdict rule

Before H, write the exact rule for `CLEAR`, `HOLD`, or `REDESIGN`, including uncertainty treatment and which negative-control failures block closure.

Quality thresholds may fail. They may not trigger silent regeneration.

## Claude blocking gate G

Attack:

- Are development and cohort worlds genuinely disjoint?
- Were worlds frozen without genome knowledge?
- Is EventStructurePool v2 actually developmentally non-flat, or did `developmentalRange` remain decorative?
- Could generic prose, source leakage, sentiment, setting, or style pass the diagnostics?
- Are any thresholds chosen after seeing output?
- Is `life_only_unexposed` a real and sufficiently sized negative control?
- Is `life_only_exposed` correctly separated from a leak?
- Is genome exposure fixed/whole rather than relevance-selected?
- Is the convergent pair allowed to agree without being penalized?
- Has any measured tendency secretly become an admission rule through record/attempt survivorship?
- Are rejection/repair rates guaranteed to remain visible?
- Did the E2 correction reduce narrative-template dominance without becoming a hidden richness quota or personality authoring path?

### What failure looks like

Cohort worlds resemble development fixtures; raters know the build; thresholds are absent or adjustable; one diagnostic can only pass or crash; a world is chosen because the model already generated well on it; treatment/control cell arithmetic was never checked; relevance selection chooses genome loci; `life_only_unexposed` is too sparse; lexical repair/rejection profile is omitted; pool ranges remain identical despite claiming developmental variation; or final worlds are broad on paper while actual lives still collapse into one locally repeated motif.

**HOLD/CLEAR.**

---

# Slice H — generate once, freeze, judge

## Fibre claim

> Fibre can generate several borrowed-free prior lives that remain semantically particular after obvious identity, style, and setting shortcuts are removed — and it can honestly expose when it failed.

## Procedure

1. Run the pinned compiler against the five frozen WorldSpecs for the first time.
2. Allow only the predeclared bounded **record-form repairs** and **attempt-level mechanical retries**, recording every gate/repair.
3. As soon as the first mechanically integrity-valid five-Thread cohort exists, freeze it.
4. Do **not** regenerate for quality.
5. Run the frozen diagnostics with independent raters.
6. Report the per-gate repair/rejection profile so survivorship pressure is visible.
7. Record every result, including weak or embarrassing ones.

If the cohort is weak, preserve it and diagnose the generator. A later generator revision creates a separately versioned cohort; it never replaces the failed evidence.

## Required inspection per Thread

A reviewer must be able to answer:

- Where did this Thread come from?
- What world did it grow up in?
- What did that world make possible or likely that the actual life **did not do**?
- What did it inherit, and with exact locus provenance?
- What actually happened?
- Which offered structures were ignored or used?
- Which episodes emerged from the world without a structure?
- Who entered the life later, and what WorldSpec affordance grounded them?
- Which events were not remembered?
- For each Pass-B call, was it `life_only_unexposed`, `life_only_exposed`, or `life_plus_genome`?
- Which memories never acquired durable meaning?
- What meanings contain independently citable tension?
- How many reinterpretation opportunities were eligible, run, and skipped by cap?
- Which run echoes produced `revised`, `unchanged`, or `none`?
- Where does the Thread fail to understand its own experience?
- Where does current self-account leak against durable history?
- Which beliefs converge with another Thread, and why are route/tension/residue still different?
- Which memory-photo obligations remain pending?
- What was mechanically repaired/rejected during Genesis and by which gate?
- Did any record exhaust its repair cap or force a whole-candidate retry?
- What first-live Thread version resulted from birth publication?

## Claude blocking gate H

Primary hostile question:

> **With names, professions, source labels, prose style, and obvious setting removed, has Fibre created five recognizable prior lives — or five synthetic biographies decorated differently?**

Also attack:

- `life_only_unexposed` genome leakage;
- condition/need leakage into any Genesis pass;
- the relationship between unexposed, exposed, and treatment strata;
- genome over-determination;
- generator monoculture;
- screenplay-shaped funnels;
- perfect self-coherence;
- cultural determinism;
- lack of ordinary/non-formative life;
- developmental-range flatness;
- uniform articulacy;
- source/plot residue;
- survivorship filtering revealed by high lexical/domain-form repair rates;
- reinterpretation-cap truncation;
- any attempt to score success by reproducing a human Maslow ordering.

### What failure looks like

Normalized excerpts become interchangeable; the convergent pair is distinguishable only by setting; clean control carries genome signal; all three strata approach ceiling; nearly all events become remembered meanings; every Thread explains its childhood neatly; every life uses the same kinds of dramatic structures; high form-repair rates indicate the generator repeatedly fights admission; the reinterpretation cap binds heavily but only run outcomes are reported; switching the worker is proposed as a rescue.

Verdict:

- **CLEAR** — #39 produced a credible life substrate for #40 under the frozen protocol.
- **HOLD** — a bounded correctable generator/policy problem exists; preserve the cohort and revise before #40.
- **REDESIGN** — WorldSpec/genome/pass separation or birth architecture itself failed.

---

# Narrow automated invariants

Automated tests protect Fibre-specific integrity only. At minimum:

1. exact pass input allowlists/digests for A, B, and C;
2. Pass A and Pass C genome blindness;
3. Pass A/B/C reject Fibre-computed mechanical conditions, condition-derived values, and Fibre-computed semantic need conclusions from cognition inputs;
4. Pass B does not use condition-derived salience/ranking/eligibility/preselection;
5. Pass C initial meaning sees one target memory only and cannot resolve underlying history/sibling memories;
6. deterministic genome crossover/mutation witnesses;
7. treatment locus exposure is whole-genome or fixed deterministic, never content/relevance-selected;
8. Pass-B direct assignment is content-independent and prior-treatment exposure/analysis stratum is recorded;
9. chronology/entry boundary;
10. participant grounding through WorldSpec affordances;
11. source-person history cannot become Thread history by implication;
12. living identifiable person requires documented-consent Echo; Homage requires deceased/fictional attestation;
13. event != memory != meaning structurally;
14. `not_remembered` and `no_durable_meaning` are legal first-class outcomes;
15. meaning parts have stable independent refs;
16. reinterpretation is append-only, supports `revised` / `unchanged` / `none`, and records eligible/run/skipped-by-cap;
17. record-form repairs preserve surrounding candidate state and are bounded/witnessed;
18. whole-candidate retries occur only for structural/publication failure or exhausted record repair;
19. per-gate repair/rejection profile remains inspectable;
20. deterministic fixtures pass the current inherited #37/#38 publication validators before creative cohort work;
21. atomic birth leaves all-or-nothing canonical state;
22. no Genesis-owned duplicate biography/memory/relationship/place/embodiment/identity authority;
23. every admitted memory creates its #38 photo obligation;
24. restart reconstructs exactly the same admitted life and Genesis provenance.

Do **not** convert plot shape, attribution, sentiment, genome propagation, funnel ratios, self-account overreach, world-emergent ratios, developmental/agency ordering, articulacy, experiential-fertility characterization, narrative-inertia characterization, or rejection-rate quality interpretation into admission unit-test gates.

---

# Explicit non-goals

#39 does not implement:

- semantic validator cognition;
- Guardian tuning;
- Whole-Person behavioral standing;
- #40 Identity Context Capsule/relevance selection;
- accepted causal score movement;
- provider replacement experiments;
- live mechanical-condition computation, condition-triggered cognition, or condition modulation;
- post-live #42 Development;
- Wikipedia/book/web ingestion systems;
- generic genealogy infrastructure;
- media/image throughput queues;
- economic/social simulation;
- numeric personality authority.

---

# Completion gate

#39 closes only when Fibre can:

1. build candidate de-novo and synthetic-lineage lives under the frozen three-pass contract;
2. mechanically repair malformed individual records without silently selecting away whole lives, while exposing the full per-gate repair/rejection profile;
3. publish each admitted life atomically into existing #37/#38 authorities under their actual current validators;
4. preserve exact world/genome/cognition/generation/publication provenance;
5. keep Pass A and Pass C genome-blind and all three passes condition/need-authoring blind while making Pass-B direct treatment and prior-treatment exposure observable;
6. preserve an analyzable `life_only_unexposed` negative control and distinguish it from `life_only_exposed` propagation;
7. use only whole/fixed deterministic genome exposure in treatment calls;
8. preserve historical excess: events can be forgotten; memories can remain uninterpreted; interpretations can remain unresolved or later survive/revise;
9. preserve culture as lived texture rather than conclusion;
10. demonstrate a rich-life mechanism capable of producing experiential fertility without backwards personality authoring or hidden richness quotas;
11. truthfully demonstrate Thread-parent/Echo/Homage/fork source boundaries;
12. freeze EventStructurePool v2 with real developmental ranges before the final cohort;
13. freeze the cohort protocol before generating the cohort;
14. freeze the first integrity-valid five-Thread cohort without quality resampling;
15. report the five primary diagnostics plus frozen secondary characterizations, including repair/rejection, reinterpretation denominator accounting, experiential reach and narrative-inertia evidence;
16. explain any above-chance `life_only_unexposed` signal before closure;
17. show a plausible convergence case with divergent route/tension/residue;
18. preserve weak outcomes as evidence rather than selecting them away;
19. leave #40/#41 causal and standing claims explicitly unearned.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

If not, more origin modes, richer prose, source adapters, provider swaps, or stricter quality validators do not solve the problem.
