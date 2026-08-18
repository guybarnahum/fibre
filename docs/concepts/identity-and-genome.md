---
id: concept-identity-genome
status: accepted
last-reviewed: 2026-08-18
canonical: true
---

# Identity and genome

A Thread begins with inherited genetic material and upbringing, then develops a phenotype and character through its particular life.

The Fibre genome is **semantic genetic material**, not a personality-test vector. Its canonical heritable units are atomic natural-language dispositions that can be inherited, recombined, mutated, expressed, resisted, and reinterpreted without reducing a person to numeric trait coordinates.

> **Text carries the heritable meaning. Numbers may measure or control machinery, but they do not define the person.**

## Textual genotype

A genome is an ordered sequence of independently addressable textual loci. A human-readable rendering may separate loci with `;`, analogous to a DNA string:

```text
persists after setbacks but changes approach;
shows affection through practical help;
enjoys unfamiliar technical problems;
addresses conflict directly and early;
seeks company when stressed;
becomes skeptical when authority relies on status rather than evidence
```

Canonical storage should keep the same values structurally addressable rather than making punctuation authoritative, for example:

```text
genomeId
threadId
loci[] {
  locusId
  value
  provenance
  parentLocusRef?
  mutationRef?
}
```

The **value remains natural language**. IDs and provenance exist so Fibre can replay inheritance and explain where each inherited disposition came from.

## Atomicity

A genomic locus should express one reasonably independent heritable tendency. Fibre prefers specific contextual dispositions over broad personality adjectives.

Good:

```text
takes promises literally
becomes more persistent when another person is relying on her
recovers from embarrassment by becoming more prepared
is reluctant to ask for favors
becomes playful around very serious people
```

Weak:

```text
persistent
friendly
risk tolerant
```

Noncompliant as one locus:

```text
is a caring, cautious, hardworking, family-oriented person who values honesty
```

Compound persona prose is difficult to recombine, ablate, attribute, or test causally. Rich personality should emerge from many particular loci plus life history, not from one inherited biography blob.

## Inheritance by textual crossover

Where two parents contribute genomes, child generation should perform Fibre-owned deterministic crossover over the ordered textual sequences rather than numeric averaging.

Conceptually:

```text
Parent A
A1 ; A2 ; A3 ; A4 ; A5 ; A6 ; A7 ; A8

Parent B
B1 ; B2 ; B3 ; B4 ; B5 ; B6 ; B7 ; B8

Child
A1 ; A2 ; A3 ; B4 ; B5 ; A6 ; A7 ; B8
```

The durable recombination witness identifies the parent genomes, selected loci or segments, policy/version, ordering, and any mutation. Parent text is inherited without silently rewriting its meaning merely to make the child more coherent.

Recombination should preserve unusual mixtures and tensions. A child may inherit dispositions that pull in different directions. Fibre should not normalize those tensions into a bland midpoint.

## Mutation and variation

Mutation is explicit textual genetic variation, not a hidden scalar perturbation. A mutation may introduce a new atomic disposition, replace one inherited locus, or make another bounded semantic variation under a named policy.

Example:

```text
mutation:
  becomes intensely curious when two trusted people disagree
```

Every mutation must be provenance-bearing and replayable. Mutation creates variation; it must not become a back door for generating a complete adult persona.

## Genotype is not character

An inherited disposition is not a permanent instruction and is not proof of adult behavior.

A Thread may inherit:

```text
avoids confrontation until a boundary has clearly been crossed
```

Later life may produce repeated experience in which early disagreement is safer and kinder. The mature Thread may therefore have all three durable truths:

```text
Inherited disposition:
  avoids confrontation until a boundary has clearly been crossed

Observed/current character:
  often raises disagreement early when ambiguity could hurt collaborators

Self-authored interpretation:
  "My instinct is still to wait. I've learned that waiting usually makes the conversation harder."
```

The inherited genotype remains historical origin. Experience changes expression. Character is a current evidence-backed synthesis. Self-authorship records what the Thread now thinks those tendencies mean.

In shorthand:

```text
genome      = inherited tendencies
life        = what happened to those tendencies
character   = how those tendencies now tend to express
self        = what the Thread currently thinks about all of that
```

## Needs and mechanical-condition sensitivity

Semantic needs are **not** genome loci. Fibre must not encode a finished conclusion such as `needs recognition`, `needs belonging`, or `must reproduce` as inherited personality authority merely because the conclusion is placed in the genome.

Likewise Fibre must not create a second canonical **numeric drive genome** or a fixed inherited vector of condition gains underneath the textual genome. Such coefficients would be more fate-like than textual loci: a Thread can resist, reinterpret, or reject an inherited textual disposition through life, but it cannot reinterpret a hidden number that directly scales its cognition.

If later controlled experiments establish that inherited modulation is necessary, Fibre may derive a bounded temporary numeric runtime control from relevant textual loci through a frozen, versioned, inspectable projection policy. The natural-language locus remains the inherited authority and provenance surface; the derived number is runtime machinery and may never silently overwrite the textual genotype.

## Numbers and runtime controls

Canonical personality meaning should not be stored as universal scalar coordinates such as:

```text
persistence = 0.82
trust = 0.41
creativity = 0.93
```

Numbers remain appropriate where they have actual numerical semantics: balances, time, measured frequencies, evidence confidence, memory salience/accessibility, model parameters, experimental effect sizes, and bounded runtime controls.

A runtime may derive temporary numeric controls such as exploration breadth or retry limits from relevant textual genotype, current character, state, and situation. Such controls are implementation projections. They are not the inherited source of truth and must not silently overwrite the textual genome.

## Non-interchangeability

Fibre should not generate every genome from the same small personality questionnaire or fixed set of named axes. The vocabulary of atomic dispositions should be broad and extensible enough for Threads to inherit peculiar combinations:

```text
remembers criticism longer than praise
likes making useful things for people
finds repetitive competence comforting
notices unfairness quickly but hesitates to accuse
enjoys being the least knowledgeable person in a room
tends to protect younger siblings from consequences
becomes impatient when experts hide uncertainty
```

The target is not maximal randomness. It is inherited specificity that later life can reinforce, complicate, contradict, or transform.

## Anti-stereotype boundary

Genetic material, ancestry, nationality, culture, gender, appearance, accent, family role, or parent identity may not directly imply morality, competence, politics, dignity, profession, willingness, or other stereotyped conclusions.

Culture and upbringing are separate lived evidence. Genetics may contribute dispositions, but a person's character must remain attributable to the actual inherited loci, experiences, relationships, memories, interpretations, and self-authored development that formed it.
