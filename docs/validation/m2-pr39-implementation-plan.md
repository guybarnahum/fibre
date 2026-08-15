---
id: validation-m2-pr39-implementation-plan
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# #39 Genesis, Childhood & Thread Birth v1 — slice, verification & review plan

## Purpose

Milestone **#39** must prove that Fibre can create several provenance-rich prior lives whose differences come from particular worlds, inherited symbolic possibilities, actual events, selective memory, and durable interpretation — without writing future answers backward into childhood.

The two implementation authorities are:

- [`../architecture/genesis-compiler-contract-v1.md`](../architecture/genesis-compiler-contract-v1.md) — what Genesis cognition may know, produce, reject, and publish;
- this document — how #39 is implemented, verified, frozen, and reviewed slice by slice.

Governing canon includes [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md), especially:

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

A, B, and E still receive review, but implementation does not stop merely to manufacture a ceremonial artifact for each.

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

---

# Slice A — Genesis authority, WorldSpec, candidate state, atomic birth

## Fibre claim

> Fibre can describe a world and provenance for a life, generate against provisional state, and publish a complete admitted life atomically without creating a second biography/memory authority.

## Implement

- `GenesisWorldSpec` with factual world circumstances only;
- `WorldAuthorship` provenance;
- `GenesisManifest` skeleton;
- `GenerationAttempt` / rejection witness;
- cognition/prompt/schema/model digest fields;
- candidate Genesis boundary;
- atomic birth/publication API;
- entry-stage policy and chronology endpoint;
- first-live-version witness;
- inspector for the above.

WorldSpec must structurally exclude finished personality conclusions, required politics/morality, future role, or desired behavior.

World/source authoring follows the canon: source works inform human abstraction, never compiler context. `Take the structure; move the instance.`

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

Rejected candidate audit material is never hydration/cognition authority.

## Birth/publication verification

Using deterministic fixtures before creative generation:

- candidate state is invisible to normal Thread hydration;
- publication writes all admitted life records or none;
- simulated failure mid-publication leaves no half-born Thread;
- event/version/state-hash semantics remain replayable;
- the manifest records the exact resulting first-live version;
- first live command must use that actual version as `expectedVersion`.

## What failure looks like

- a WorldSpec contains conclusions such as `independent`, `strict`, `creative`, or future-role hints;
- candidate memories appear in normal Thread reads before birth;
- a failed publication leaves an identity, memory, place, or event behind;
- implementation creates a `genesis_*` biography/memory parallel world;
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
- no demographic/cultural shortcut into loci.

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
- genome, parent loci, future role/benchmark, remembered meaning, and source-instance identity absent;
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
- no genome/future/source-instance field reaches the call;
- chronology endpoint is enforced;
- participant refs are initial-roster or validly introduced earlier;
- introduced role is afforded by the WorldSpec;
- no meaning/significance field exists in the output schema;
- narrow interiority-form lexical checks reject explicit interpretation smuggled into `observableAction`.

## Claude blocking gate C

Attack:

- Does history look like a world producing events, or an author foreshadowing a known adult?
- Can a specific source work or plot arc be identified?
- Is the pool authoring the life rather than offering affordances?
- Is the early event set already screenplay-shaped?
- Are the development worlds accidentally becoming future cohort material?

### What failure looks like

A sequence whose episodes obviously add up to a moral lesson; every offered structure is used; no mundane/world-emergent incidents occur; source-fiction scenes remain recognizable; events contain phrases explaining what they taught the child.

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

## Pass B

Implement first-class outcomes:

```text
remembered
not_remembered
```

Every call records:

```text
life_only
life_plus_genome
```

The development policy explores the same mechanism later frozen at G. Pass B has no meaning field.

## Pass C

Pass C is **unconditionally genome-blind**.

Implement:

```text
durable_meaning
no_durable_meaning
```

with stable `meaningId` and independently citable `meaningPartId` values.

Meaning may be ambivalent, incomplete, mistaken, or unresolved. It may not structurally contain an explicit universal future behavior policy.

### Reinterpretation eligibility

A later episode may create a reinterpretation opportunity when it is sufficiently later and shares one of:

- same structure / structure family;
- same concrete person/relationship;
- same intellectual/source subject actually encountered by the Thread.

V1 defaults: at least five years later; maximum three opportunities per Thread.

First-class outcomes:

```text
revised
unchanged
none
```

`unchanged` means the prior meaning survived a genuine later echo. It is not the same as `none`.

## Development characterization — measure, never gate

Characterize:

- events -> remembered;
- remembered -> durable meaning;
- durable meaning -> multi-part ambivalence;
- soft prescriptiveness;
- sentiment coupling;
- self-account overreach;
- revised / unchanged / none reinterpretation behavior.

If results are weak, stop and change the compiler, then use **new development worlds**. Do not keep regenerating against the same worlds until they improve.

## Claude blocking gate D

Attack:

- Did the horoscope move from A into B/C?
- Are `life_only` calls truly genome-free?
- Is C truly genome-blind?
- Do meanings remain semantic rather than derived labels or policy rules?
- Does history contain material the self-account cannot absorb?
- Can some memories remain memories without becoming lessons?

### What failure looks like

Nearly every episode is remembered; nearly every memory has a clean durable lesson; meanings paraphrase genome loci; every later echo triggers revision; all Threads understand themselves equally well; semantic parts collapse into `mixed` or another category.

**HOLD/CLEAR.**

---

# Slice E — rich de-novo + synthetic-lineage lives; intellectual formation

## Fibre claim

> Different worlds and inherited possibilities can create particular lives through one compiler, while intellectual sources influence the Thread only through encounters that actually happen to it.

## Implement

Rich-life compiler modes:

- `de_novo`;
- `synthetic_lineage`.

Synthetic lineage combines parent genomes through the symbolic crossover contract while Pass A remains blind to parent loci.

Make first-class life events for encounters with:

- books;
- teachers/mentors;
- arguments;
- art;
- scientific ideas;
- religious/philosophical texts;
- other intellectual sources.

The Thread's encounter is history. Its memory of the encounter is memory. Its interpretation is its own meaning. The source author's personality or biography never becomes the Thread's character by implication.

Fiction may calibrate human prompt authors toward richer interior register for Pass C; no named author/style/character is passed to the compiler.

## What failure looks like

Lineage produces childhood episodes that conveniently illustrate the inherited loci; books directly create trait labels; one separate compiler path appears per origin mode; source-person facts become autobiographical facts.

E is reviewed with F.

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
- source/origin combination reaches protected human material without provenance.

### What failure looks like

Any route where relabeling source/origin changes rights eligibility; any source person's childhood can be hydrated as Thread memory; any fork cannot identify the exact divergence boundary.

**HOLD/CLEAR.**

---

# Slice G — fresh cohort and protocol freeze

This is the most important methodological gate.

> **The test exists before the people.**

No final cohort output is generated before this slice is frozen and reviewed.

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

## Freeze cognition

Freeze exactly:

```text
provider/model for A/B/C
prompt hashes
schema hashes
sampling config
policy version
EventStructurePool digest and sampling policy
entry policy
retry cap
admission gate list
```

One common creative configuration is used across all five Threads.

## Freeze Pass-B genome treatment

Set `life_plus_genome` to a deterministic **30–40%** of eligible Pass-B calls; the exact value and assignment method are frozen now.

The rest are `life_only`.

This creates a built-in treatment and negative control because A and C are genome-blind.

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

### D3 — genome propagation, four-cell reading

Slice B is the positive-control ceiling. H is achieved propagation through life.

Analyze H meanings by Pass-B formation mode:

| H pattern | Predeclared reading |
| --- | --- |
| `life_plus_genome` above chance; `life_only` at chance | intended propagation through attention |
| both at chance | genome inert even when visible; real result, not instrument failure if B was strong |
| `life_only` above chance | **negative-control failure / leak**; stop and explain |
| both near ceiling | over-determination; life demonstrates genome |

Freeze numerical thresholds/uncertainty treatment before H. Do not reduce this to one scalar target. Healthy is expected to be modest rather than at either extreme.

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
- revised vs unchanged vs none reinterpretation outcomes;
- articulacy variance;
- generator monoculture indications.

## Freeze verdict rule

Before H, write the exact rule for `CLEAR`, `HOLD`, or `REDESIGN`, including uncertainty treatment and which negative-control failures block closure.

Quality thresholds may fail. They may not trigger silent regeneration.

## Claude blocking gate G

Attack:

- Are development and cohort worlds genuinely disjoint?
- Could generic prose, source leakage, sentiment, setting, or style pass the diagnostics?
- Are any thresholds chosen after seeing output?
- Is `life_only` a real negative control?
- Is the convergent pair allowed to agree without being penalized?
- Has any measured tendency secretly become an admission rule?

### What failure looks like

Cohort worlds resemble development fixtures; raters know the build; thresholds are absent or adjustable; one diagnostic can only pass or crash; a world is chosen because the model already generated well on it; `life_plus_genome` is too sparse to analyze.

**HOLD/CLEAR.**

---

# Slice H — generate once, freeze, judge

## Fibre claim

> Fibre can generate several borrowed-free prior lives that remain semantically particular after obvious identity, style, and setting shortcuts are removed — and it can honestly expose when it failed.

## Procedure

1. Run the pinned compiler against the five frozen WorldSpecs for the first time.
2. Allow only the predeclared bounded mechanical-integrity retries.
3. As soon as the first **integrity-valid five-Thread cohort** exists, freeze it.
4. Do **not** regenerate for quality.
5. Run the frozen diagnostics with independent raters.
6. Record every result, including weak or embarrassing ones.

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
- Which memories never acquired durable meaning?
- What meanings contain independently citable tension?
- Which later echoes produced `revised`, `unchanged`, or `none`?
- Where does the Thread fail to understand its own experience?
- Where does current self-account leak against durable history?
- Which beliefs converge with another Thread, and why are route/tension/residue still different?
- Which memory-photo obligations remain pending?
- What was rejected mechanically during Genesis and why?
- What first-live Thread version resulted from birth publication?

## Claude blocking gate H

Primary hostile question:

> **With names, professions, source labels, prose style, and obvious setting removed, has Fibre created five recognizable prior lives — or five synthetic biographies decorated differently?**

Also attack:

- `life_only` genome leakage;
- genome over-determination;
- generator monoculture;
- screenplay-shaped funnels;
- perfect self-coherence;
- cultural determinism;
- lack of ordinary/non-formative life;
- uniform articulacy;
- source/plot residue.

### What failure looks like

Normalized excerpts become interchangeable; the convergent pair is distinguishable only by setting; both genome subsets approach ceiling; `life_only` carries genome signal; nearly all events become remembered meanings; every Thread explains its childhood neatly; every life uses the same kinds of dramatic structures; switching the worker is proposed as a rescue.

Verdict:

- **CLEAR** — #39 produced a credible life substrate for #40 under the frozen protocol.
- **HOLD** — a bounded correctable generator/policy problem exists; preserve the cohort and revise before #40.
- **REDESIGN** — WorldSpec/genome/pass separation or birth architecture itself failed.

---

# Narrow automated invariants

Automated tests protect Fibre-specific integrity only. At minimum:

1. exact pass input allowlists/digests;
2. Pass A and Pass C genome blindness;
3. deterministic genome crossover/mutation witnesses;
4. chronology/entry boundary;
5. participant grounding through WorldSpec affordances;
6. source-person history cannot become Thread history by implication;
7. living identifiable person requires documented-consent Echo; Homage requires deceased/fictional attestation;
8. event != memory != meaning structurally;
9. `not_remembered` and `no_durable_meaning` are legal first-class outcomes;
10. meaning parts have stable independent refs;
11. reinterpretation is append-only and supports `revised` / `unchanged` / `none`;
12. rejected attempts are bounded, visible, and never Thread authority;
13. atomic birth leaves all-or-nothing canonical state;
14. no Genesis-owned duplicate biography/memory/relationship/place/embodiment/identity authority;
15. every admitted memory creates its #38 photo obligation;
16. restart reconstructs exactly the same admitted life and Genesis provenance.

Do **not** convert plot shape, attribution, sentiment, genome propagation, funnel ratios, self-account overreach, world-emergent ratios, or articulacy into admission unit-test gates.

---

# Explicit non-goals

#39 does not implement:

- Guardian tuning;
- Whole-Person behavioral standing;
- #40 Identity Context Capsule/relevance selection;
- accepted causal score movement;
- provider replacement experiments;
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
2. publish each admitted life atomically into existing #37/#38 authorities;
3. preserve exact world/genome/cognition/generation provenance;
4. keep Pass A and Pass C genome-blind while making Pass-B genome treatment observable;
5. preserve historical excess: events can be forgotten; memories can remain uninterpreted; interpretations can remain unresolved or later survive/revise;
6. preserve culture as lived texture rather than conclusion;
7. truthfully demonstrate Thread-parent/Echo/Homage/fork source boundaries;
8. freeze the cohort protocol before generating the cohort;
9. freeze the first integrity-valid five-Thread cohort without quality resampling;
10. report the five primary diagnostics plus the frozen secondary characterizations;
11. treat `life_only` genome discrimination as a negative control and explain any above-chance leak before closure;
12. show a plausible convergence case with divergent route/tension/residue;
13. preserve weak outcomes as evidence rather than selecting them away;
14. leave #40/#41 causal and standing claims explicitly unearned.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

If not, more origin modes, richer prose, source adapters, provider swaps, or stricter quality validators do not solve the problem.