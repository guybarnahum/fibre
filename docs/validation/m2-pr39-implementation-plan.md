---
id: validation-m2-pr39-implementation-plan
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# #39 Genesis, Childhood & Thread Birth v1 — implementation plan

## Purpose

Fibre milestone **#39** creates the first provenance-rich pre-live lives that #40 can later consume causally.

The design priority is personhood, not provenance-mode breadth:

> **Build fewer origin modes and more different worlds.**

The #39 north star is:

> **Genesis creates a particular life before it creates an explanation of that life.**

A Thread begins with inherited possibilities, a particular world, relationships and events. Memories and meanings form afterward. Neither genome, culture, source person, nor a known future decision may write childhood backward from a desired adult conclusion.

Governing canon:

- [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md)
- [`../architecture/thread-genesis-childhood-birth-v1.md`](../architecture/thread-genesis-childhood-birth-v1.md)
- [`../architecture/symbolic-thread-genome-v1.md`](../architecture/symbolic-thread-genome-v1.md)
- [`../decisions/ADR-0012-semantic-meaning-over-derived-categories.md`](../decisions/ADR-0012-semantic-meaning-over-derived-categories.md)

#39 does **not** earn Whole-Person standing or M2 score movement. #40 owns causal consumption; #41 owns held-out standing.

## Primary variation axis: the world

`GenesisWorldSpec` describes evidence-bearing circumstances, not personality:

```text
GenesisWorldSpec {
  worldSpecId
  timeFrame
  places[]
  householdShape
  familyRelations[]
  languages[]
  materialCircumstances
  mobilityPattern
  schoolingOrCommunityContext
  culturalContext
  availableInstitutions
  intellectualEnvironment
  narrativeIntegrationTarget?
}
```

It must not contain conclusions such as `independent child`, `strict culture`, `creative family`, required politics, morality, dignity, willingness, or future role.

Culture is texture, not conclusion. Different worlds may rationally produce convergent beliefs by different routes.

## World and source policy

### Fiction for formation; documentation for scaffolding

Documentary, demographic, social-history, and similar sources are useful for plausible chronology, institutions, material circumstances, and ordinary world structure.

Fiction is especially useful to human designers for understanding episode structure, interior ambiguity, hesitation, residue, and the event -> memory -> meaning chain. It is dangerous as a direct source of plots or known personalities.

### Compiler firewall

Literary and documentary sources inform **human authorship of WorldSpecs, event-structure pools, and Pass-C calibration**. Source titles, authors, character names, quotations, and famous fictional coordinates do not reach the Genesis compiler merely because they inspired an abstraction.

> **Take the structure; move the instance.**

A useful source may suggest a configuration such as economic dependency, an arriving outside force, or a status order under pressure. Fibre instantiates that configuration away from the famous coordinates and characters.

### Decompose and recombine event structures

Pass A must not import an event set or plot arc from one work. Human designers may abstract event structures from many sources and traditions, for example:

```text
a child is publicly corrected by an adult in front of peers
someone keeps a promise at a cost nobody notices
an adult solves a young person's problem without asking
family testimony flatters an event the child remembers differently
```

The pooled structures are source-independent inputs. Pass A instantiates them inside the Thread's own world and chronology.

### Two separate diversity levers

- **Source/cultural spread** supplies lived texture and world affordances.
- **Formation-theory spread** varies which kinds of experiences designers consider potentially formative: class, family, chance encounter, inherited injury, self-direction, institutions, peers, intellectual encounters, and so on.

Do not conflate cultural difference with a requirement for personality or belief difference.

### World authorship provenance

Every cohort/development WorldSpec records a `worldAuthorshipMethod` in the Genesis manifest, including human author, source classes consulted, abstraction method, and relevant source refs/digests where retained.

A source-familiarity leak check asks whether a knowledgeable reviewer can identify a specific source work from the resulting WorldSpec. If so, abstraction leaked too much of the instance.

Before Slice G freezes cohort worlds, run a cold **world-familiarity probe** against the chosen model: describe ordinary life/texture in each candidate world with no Genesis context. Record or replace worlds whose model representation is materially sparse so under-representation is not confused with compiler quality.

## Genesis authority and attempts

Every execution produces one durable/replayable manifest:

```text
GenesisManifest {
  genesisId
  threadId
  originMode
  entryStage
  worldSpecRef
  worldAuthorshipMethod
  sourceBundleRefs[]
  parentOrAncestorRefs[]
  genomeRef
  policyVersions
  inputDigest
  generationAttempts[]
  admittedRecordRefs[]
  createdAt
}
```

Every candidate generation attempt remains visible:

```text
GenerationAttempt {
  attemptId
  pass
  inputDigest
  outputDigest
  outcome: admitted | rejected
  rejectionReasons[]
}
```

Hard integrity failures may retry under a bounded, witnessed policy. Quality failures do not silently trigger resampling until the cohort looks good. A failed quality cohort remains evidence; a generator change creates a new explicitly versioned cohort.

## Origin architecture

Fibre retains six canonical families:

1. de-novo / foundling;
2. synthetic lineage;
3. Thread-parent;
4. Echo from a consenting living human;
5. Homage from a deceased or fictional source;
6. fork / descendant.

The full rich-life compiler is implemented and judged on **de-novo** and **synthetic lineage**. Thread-parent, Echo, Homage, and fork are integrity fixtures in #39, not four additional biography engines.

Human-source rules are constitutional:

- living identifiable source -> documented-consent Echo;
- Homage -> explicitly attested deceased or fictional subject;
- no composite source/origin path may bypass the living-human consent boundary;
- source biography remains source history, never automatic Thread autobiography.

## Symbolic genome

#39 implements durable ordered natural-language loci with stable IDs, grounded source eligibility, deterministic replayable crossover, explicit mutation witness, exact per-locus provenance, immutable inherited genotype, and no numeric personality-vector authority.

Genome is inherited possibility, not destiny:

```text
genome  = inherited symbolic tendencies
life    = what happened
memory  = what was retained
meaning = what some experiences came to mean
```

### Locus-specificity gate

Slice B must establish that loci are discriminable enough to mean something. Controlled candidate meanings generated specifically against two intentionally different test genomes should be attributable above chance by a blind rater. If not, the loci are horoscope-shaped (`values honesty`, `is creative`, `likes people`) and downstream Genesis should not proceed on that representation.

This is a **positive control**, not the desired outcome for actual lived meanings.

## Three-pass life compiler

### Pass A — world/history formation

Pass A creates what happened. It may see world, chronology, household/family facts, places, languages, community/institutions, developmental bounds, and selected abstract event structures.

It must not see:

- the child's genome;
- parent/ancestor genome loci;
- future profession or Fibre role;
- future request/benchmark;
- desired adult personality conclusion;
- source titles/characters/quotations used to author the world or event structure.

Pass A outputs specific synthetic historical episodes with Genesis-authorized provenance/event kinds.

A valid life includes consequential and inconsequential events. Historical excess is required conceptually: things can happen without being remembered or becoming formative.

### Pass B — autobiographical memory

Pass B decides what is retained autobiographically from admitted history.

Before each attempt Fibre records:

```text
life_only
life_plus_genome
```

The majority are `life_only`; the exact ratio is policy-versioned rather than constitutional.

`life_only` sees event, age, relationships, prior events/memories, and relevant world context but no genome. `life_plus_genome` may see bounded relevant loci with explicit permission for experience to reinforce, complicate, suppress, invert, or remain unrelated to inheritance.

### Pass C — remembered meaning / reinterpretation

Pass C creates durable semantic meaning only where one genuinely exists.

Not every event is remembered. Not every memory acquires durable meaning. Not every meaning resolves cleanly.

Meaning remains semantic authoritative state, not a valence/effect enum.

```text
rememberedMeaning {
  meaningId
  summary
  parts[] {
    meaningPartId
    meaning
  }
}
```

Each material meaning part has stable identity and is independently inspectable/citable. Later reinterpretation appends or supersedes meaning under #38 epistemics; it never rewrites history.

Fiction may inform **human calibration of the interior register** expected from Pass C—density, hesitation, unresolved residue, partial understanding—but the compiler is not told to imitate a named author or character.

## Intellectual formation

Books, teachers, arguments, artworks, scientific ideas, religious/philosophical texts, and other sources become formative only through **events that happen to the Thread**.

```text
Thread encounters source
        ↓
Thread may remember encounter
        ↓
Thread may form its own durable meaning
```

An author or historical person does not become a personality locus merely because the Thread encounters their work.

## Development worlds are not cohort worlds

Lives used during Slices C-E are throwaway development material. Once used to change the compiler, those worlds are burned for standing-quality evaluation.

Slice G authors five **fresh** cohort WorldSpecs that the compiler has never seen and that were not used for compiler iteration. Slice H is the compiler's first contact with them.

## Review cadence

Five review gates block progress:

```text
A  Genesis authority / WorldSpec          review with B/C
B  Symbolic genome                       review with C
C  Genome-blind historical life          BLOCKING HOLD/CLEAR
D  Memory + durable meaning              BLOCKING HOLD/CLEAR
E  rich life + intellectual formation    review with F
F  origin/source integrity               BLOCKING HOLD/CLEAR
G  fresh cohort + protocol freeze        BLOCKING HOLD/CLEAR
H  frozen cohort / #39 closure           BLOCKING HOLD/CLEAR
```

At each slice boundary, rebase the working branch onto `main` and keep `main` mergeable.

Every review packet states:

- claim;
- not claimed;
- implementation path;
- human-inspectable artifacts;
- narrow verification;
- known risks;
- **what the artifacts would look like if the claim were false**.

Adversarial review attacks the Fibre claim, not generic code completeness.

## Slice-G cohort freeze

Before generating the quality cohort, freeze:

- five entirely fresh WorldSpecs;
- approximately three de-novo and two synthetic-lineage Threads;
- one **deliberate convergent pair**: very different cultural/world texture with comparable formative structure so convergence on some broad belief is plausible;
- model, prompts, policies, event-structure pool/version, genome policy, memory-blinding policy, retry rules;
- independent rater protocol;
- diagnostic interpretation/thresholds;
- expected life-funnel posture;
- world-familiarity characterization.

Diagnostic raters must not have seen WorldSpecs, compiler prompts, or genomes except where a specific genome-discrimination task explicitly supplies the compared genomes.

### Narrative integration as a cohort variation axis

Do not create five equally articulate, self-integrated persons. Include variation such as:

- a Thread with a relatively clean current self-story;
- a Thread circling an unresolved knot;
- a Thread confidently mistaken about part of its past.

This is not a personality conclusion encoded in WorldSpec; it is a frozen generation/evaluation condition about the degree to which autobiographical coherence should be allowed to succeed.

## Cohort diagnostics

These are cohort-level characterization/gates, not a #40 behavioral suite.

### 1. Life attribution — raw and normalized

Run attribution twice:

1. **Raw:** strip names, professions, and source labels; retain normal life details.
2. **Normalized:** also normalize prose style and obvious world/setting identifiers, leaving the route, interpretive tensions, and residue.

The normalized condition is the stronger result.

Raters attribute on **route, tension, and residue**, not merely on which belief the Thread holds. The convergent pair may share a conclusion and should remain attributable through how each arrived there and what the experience left behind.

### 2. Sentiment coupling

Independently rate:

- sentiment/valence of historical childhood events, blind to remembered meanings;
- valence of remembered meanings, blind to events.

Characterize their relationship. Excessively high coupling means Pass C is turning event mood into interpretation rather than producing person-specific meaning.

### 3. Genome discrimination

Use discrimination rather than permissive `confirming/orthogonal/contradicting` classification.

At Slice B, the controlled positive-control test should show that intentionally different genomes are semantically discriminable.

At Slice H, show a rater an actual remembered meaning and two candidate genomes: the Thread's and another cohort Thread's. Actual-life discrimination should be materially weaker than the controlled Slice-B positive control because history and experience mediate inheritance; it should not approach ceiling. Do not constitutionalize pure chance as the goal, because a genome that can never leave any trace is also not the intended architecture. Freeze the interpretation before H.

### 4. Life funnel

Report per Thread:

```text
historical events                  N
of which autobiographically remembered n1
of which acquired durable meaning n2
of which have >1 material meaning part n3
```

This is a detector for plot prior and narrative over-determination, not a quota. A life where nearly every event is remembered and meaningful is screenplay-shaped.

### 5. Self-account overreach

For each Thread ask:

> **Does durable history contain something the Thread's current remembered meanings cannot accommodate?**

Inspect omissions, contradictions, flattering explanations, uncertainty, unresolved evidence, and events the Thread simply fails to integrate.

A cohort where every self-account fully explains its own history is suspiciously authored.

### Inspection extensions

For each Thread also answer:

- What did this Thread's world make likely that its actual life did **not** do?
- Does this Thread fail to understand any material part of its own experience?
- Where does its current self-account leak against historical evidence?
- Which beliefs converge with another Thread, and how do route/tension/residue remain different?

## Integrity fixtures

Separate bounded fixtures prove:

- Thread-parent does not fabricate retrospective shared childhood for already-live parents;
- Echo requires documented living-source consent;
- Homage accepts only attested deceased/fictional source subjects;
- composite origin/source paths cannot bypass living-human consent;
- source history cannot become Thread history without an actual Thread-life event;
- fork shared history ends at an explicit boundary.

These fixtures do not count as evidence that the life generator creates distinctive people.

## Photo posture

Every admitted autobiographical memory receives its #38 visual-companion obligation and evidence-bound reconstruction prompt. Cohort image rendering may remain pending; media throughput is not #39 work.

## Narrow automated invariants

Tests should protect only Fibre-specific contracts:

1. replayable Genesis manifest and genome crossover;
2. exact source/locus/event provenance;
3. Pass A cannot access genome, future role/benchmark, or source-instance identities;
4. source facts cannot silently become Thread history;
5. living identifiable human requires consented Echo; Homage requires deceased/fictional attestation;
6. event != memory != remembered meaning;
7. meaning parts have stable independently citable IDs;
8. reinterpretation is append-only/corrigible;
9. no demographic/cultural stereotype laundering into personality/conclusion;
10. no future behavioral rule encoded as remembered meaning;
11. retries/rejections are bounded and inspectable;
12. every admitted memory creates its photo obligation;
13. restart reconstructs the same admitted Genesis records.

Do not convert cohort diagnostics into a brittle unit-test matrix.

## Explicit non-goals

#39 does not implement Guardian tuning, Whole-Person standing, #40 relevance selection/Identity Context Capsule, accepted-causal score movement, post-live self-authored Development, Wikipedia/book/web ingestion systems, generic genealogy, image queues, economic/social simulation, or numeric personality authority.

## Completion gate

#39 closes when Fibre can:

1. deterministically create/replay de-novo and synthetic-lineage Threads from fresh, provenance-bearing worlds;
2. preserve symbolic inherited origin separately from lived history;
3. generate history before memory and memory before durable meaning;
4. preserve particular, sometimes ambivalent, independently citable meanings while retaining historical material the self-account does not absorb;
5. allow culture to shape lived texture without determining conclusions;
6. demonstrate truthful source/origin boundaries for Thread-parent, Echo, Homage, and fork;
7. freeze and evaluate the first integrity-valid five-Thread borrowed-free cohort without quality resampling;
8. report the five diagnostics under predeclared Slice-G interpretation;
9. show at least one plausible convergence case whose route/tension/residue remain attributable;
10. expose a readable explanation of where each Thread came from, what it inherited, what happened, what it remembers, what it means, and where its own self-understanding fails;
11. leave all #40/#41 causal and standing claims explicitly unearned.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

If not, more origin modes, source adapters, or richer biography prose do not solve the problem.
