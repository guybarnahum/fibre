---
id: validation-m2-pr39-slice-e2-h6-probe-result
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — E2 H6 realization-diversity probe result

## Result

The blind H6-b realization probe completed on the preserved E1 world and the newly authored D1/D2 diagnostic worlds using the pinned OpenAI `gpt-5.1-2025-11-13` rater.

```text
world   low-scene share   household-dominant share
E1          0.0%                  18.8%
E2-D1       0.0%                  12.5%
E2-D2       0.0%                  15.6%
```

All three worlds are far below the predeclared `>50%` H6 realization-degeneracy warning in both dimensions.

The result therefore **does not support the strong H6-b hypothesis that Pool-v2 structures generally collapse to only one or two realizable scenes or to household-only realization in these worlds**.

This is a development characterization, not an admission verdict.

## Evidence identity

Artifact:

```text
fibre-m2-pr39-slice-e2-h6-probe-v1.json
```

Evidence version:

```text
pr39-slice-e2-h6-realization-probe-v1
```

Provider/model:

```text
openai / gpt-5.1-2025-11-13
```

Prompt hash:

```text
sha256:ade705655b2f7eaf93c44c26d9b6b726db846b08541a35671b29674da8f4dda3
```

Schema hash:

```text
sha256:47d0451f2b386b958d3ade05c22c34b6ec1dad388ec5312c5a18662b3090959a
```

Pool digest:

```text
sha256:1437891b2cbe2d8082283619b3f9e38e6cbce3eb2a323e989e27ce1a1dd33733
```

The probe input was blind to generated episodes, genomes, memories, seeds, experiment labels and WorldAuthorship provenance. Real world IDs/digests remained evidence-side rather than cognition-side.

## Detail

### E1

```text
total structures                 32
low scene count                   0
low configuration count           6   (18.75%)
household dominant count          6   (18.75%)
intellectual structures          13
intellectual low scene count      0
```

The result directly contradicts the strongest form of the concern that E1's five instantiated structures arose because the abstract pool had only a few plausible realizations in the E1 world.

### E2-D1

```text
total structures                 32
low scene count                   0
low configuration count           6   (18.75%)
household dominant count          4   (12.5%)
intellectual structures          13
intellectual low scene count      0
```

### E2-D2

```text
total structures                 32
low scene count                   0
low configuration count           4   (12.5%)
household dominant count          5   (15.625%)
intellectual structures          13
intellectual low scene count      0
```

## Semantic-neighbor finding

The rater did identify conceptual neighbor structures. Eight pairs were marked realization-degenerate with one another in **all three worlds**, including:

```text
argument_encounter <-> overheard_adult_discussion
first_art_encounter <-> art_unsettles_expectation
choose_text_self_directed <-> library_browse_with_adult
choose_text_self_directed <-> text_conflicts_with_expectation
friend_disagreement <-> public_disagreement
public_failure_recovery <-> small_public_mistake
question_after_demonstration <-> scientific_claim_test
religious_or_philosophical_text <-> text_conflicts_with_expectation
```

This is worth carrying as Pool-v2 characterization, but it is **not the H6-b failure condition**. The same structures were still rated as having three-to-five or six-plus plausible scenes and generally three-plus place/participant configurations. The distinction is:

```text
semantic overlap between portable affordances
    !=
realization collapse inside a world
```

Do not merge or delete these structures merely to improve an overlap statistic. Their distinctions may still matter historically, especially as access mode, social exposure and downstream memory differ.

## H6-a + H6-b joint reading

The preserved E1 artifact already showed:

- `intellectualEncounter:null` on all initial outputs;
- no `pass_a_intellectual_encounter` repair failures;
- all ten selected structures were non-intellectual-context structures, despite 41/90 offered slots carrying intellectual context.

H6-b now shows that intellectual structures themselves have substantial plausible realization breadth in E1/D1/D2.

Therefore the current evidence shifts suspicion away from **`the intellectual affordances cannot be realized in this world`** and toward **selection/realization economics**:

```text
broad intellectual structures were available
    +
model repeatedly selected cheaper familiar non-intellectual structures
    +
when an intellectual scene is chosen, the rich output contract also requires
five additional structured encounter fields instead of free `null`
```

Schema cost remains a hypothesis; H6-b does not prove it.

## Offer-width constraint discovered statically

Full-stratum eligible Pool-v2 counts for the existing ten developmental windows are:

```text
9, 12, 14, 15, 16, 13, 18, 15, 13, 11
```

The already-cleared Pass-A boundary requires **8–10** offered structures. Consequently the hostile-review suggestion `same density, materially wider offer set` cannot be implemented as `all eligible structures` without reopening Gate-C policy. E1's youngest stratum already offered all nine eligible structures.

Do not widen the Pass-A contract merely to make H6-c convenient.

## Next step

Run fresh **A0 controls first** on D1/D2 under the existing cleared Pass-A policy:

```text
D1 current Pass A, n=3
D2 current Pass A, n=3
```

This supplies:

- a fresh baseline independent of E1's one burned life;
- evidence whether the E1 monoculture reproduces across worlds/provider executions;
- first same-world between-life overlap data;
- fresh evidence about intellectual-affordance selection under the unchanged rich response schema.

If A0 repeatedly avoids intellectual/world-expanding affordances, proceed to the stateless opportunity-choice / scene-realization diagnostic (H2/A2), which also isolates whether full-scene and encounter-schema cost are biasing selection. Do not reopen the 8–10 offer policy first.

## Standing

H6-b strong realization degeneracy: **not supported**.

H6 schema/selection economics: **unresolved**.

H6 materially wider-offer arm under current Gate-C policy: **not available as originally proposed**.

E2 remains open.
