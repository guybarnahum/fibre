---
id: validation-interior-cognition-evaluation
status: accepted
last-reviewed: 2026-09-22
canonical: true
---

# Interior Cognition evaluation

## Purpose

Interior Cognition is intended to become Fibre's compact, reusable private-mind component. Because it will sit under planning, social response, dignity appraisal, reflection and later inner decisions, it must be easy to isolate, replace, tune and compare without changing the surrounding Fibre authorities.

This contract defines a **small practical scorecard** for comparing Interior Cognition implementations.

The goal is not to manufacture one universal intelligence score. It is to answer two questions with evidence:

1. **Does this implementation preserve or improve Fibre personhood quality?**
2. **What does that quality cost in calls, tokens, latency and money?**

## Isolation boundary

The first production implementation should remain one compact component with a stable conceptual interface equivalent to:

```text
Interior Cognition
  input:
    Thread identity
    concern / trigger
    current time
    authoritative private-context access
    domain adapter

  owns:
    private context selection
    reconciliation of felt state + developed self + relevant external reality
    bounded model invocation(s)
    cognition provenance / operational metrics

  returns:
    domain-specific private result
    selected evidence refs
    bounded semantic-state proposals where relevant
    conflicting motives / uncertainty where relevant
    non-content usage metrics
```

A domain adapter supplies the **question and result semantics**. It must not assemble a private persona or select the Thread's memories/relationships itself.

The initial implementation should prefer one compact module rather than a framework. New implementations should be swappable behind the same boundary.

A candidate implementation carries an explicit implementation profile ID, for example:

```text
interior-cognition-single-episode
interior-cognition-staged-deliberation
```

The names describe enduring behavior, not roadmap coordinates.

## Slice 1 — read-only staging baseline

Before implementing Interior Cognition behavior, inspect the real staging cohort without changing it.

Run:

```bash
npm run interior-cognition:baseline:staging
```

The baseline performs only GETs against the already-deployed staging World/Presentation surfaces. It does **not** ensure LivedNow, invoke a model, enter Commons, create encounters, or mutate Thread/World state.

It reports, per Thread:

- the intentionally sparse published Thread shell;
- authoritative symbolic-genome presence and differentiation;
- current identity-assertion counts;
- current semantic-state counts/domains;
- autobiographical-memory and remembered-meaning counts;
- durable life-relationship counts;
- the exact currently stored LivedNow activity/reason, if any;
- bounded private previews for operator inspection.

The cohort summary uses only mechanical counts/fingerprints. It does not label a Thread rich, poor, social, generic or psychologically healthy. Those interpretations require review of the actual evidence.

The private report is written under `.fibre/interior-cognition/baseline/<runId>/report.json`. It is diagnostic evidence, not Thread authority and not a public artifact.

Slice 1 closes when the staging baseline has been run and we can factually distinguish:

```text
authoritative developed-self evidence exists but current cognition does not consume it
vs
the required developed-self evidence itself is absent / thin
```

No Interior Cognition behavior should be implemented before that distinction is grounded in the run.

## Slice 2 — compact reusable core — CLOSED

The first implementation slice proves only the shared person-level seam:

- one compact component;
- no component-owned durable store;
- bounded Fibre-owned private-context selection;
- current state, behavioral identity, semantic state, remembered autobiographical meaning and durable relationship facts are eligible;
- raw symbolic genome is not ordinary cognition input;
- the domain adapter supplies concern/result semantics but cannot choose private history;
- the result carries selected evidence refs and lightweight usage/latency metrics.

The focused proof uses a fixture model only to prove causal wiring. It gives the same concern to two Thread contexts with different autobiographical remembered meaning and requires different attributable private judgments. It also proves the domain cannot choose the private evidence set or inject raw symbolic genome. Full repository CI is green.

This does **not** count as the live semantic A/B evidence defined below. That evidence begins once a real domain consumer and real model profile are run against frozen Thread episodes.

**Lived Planning — CLOSED locally.** Personal Flight Plan now uses the compact component as its first real domain adapter. The focused proof holds World conditions equivalent and shows persisted autobiographical remembered meaning bending ordinary intended life into different attributable plans.\n\n**Current validation slice: deployed Lived Planning.** Run `npm run lived-planning:staging` only after deploying the exact clean checkout to staging. The probe reuses existing LivedNow and private Observatory surfaces and treats `CurrentSituation.evidenceRefs` as the admitted causal witness from the governing plan. It requires multiple real staging Threads whose current lives cite differentiated autobiographical-memory or relationship evidence and whose current intended-life moments are not identical. It stores opaque refs, digests and counts rather than private prose. This proves deployed integration/attribution; the controlled local differential remains the stronger causal test.

## A/B comparison unit

Compare implementations on the same frozen **Interior Episode**:

```text
Thread
+ exact authoritative state/history snapshot
+ same current World situation
+ same concern
+ same domain adapter/result contract
+ same model family/runtime where the implementation allows it
```

The comparison harness must not let candidate A mutate durable World/Thread state before candidate B runs. Both candidates receive equivalent immutable source evidence and produce proposals only.

This keeps the experiment about the cognition implementation rather than different lives or different external situations.

## Hard Fibre gates

A candidate is disqualified before quality/cost comparison if it violates any of these:

- caller chooses or injects private memory/relationship/personality context;
- raw symbolic genome is used as an ordinary behavioral instruction;
- private desire is confused with authorization, public expression or action;
- output invents World facts required for its decision;
- hidden chain-of-thought is persisted as Fibre authority;
- a domain-specific authority boundary is bypassed;
- the candidate cannot attribute consequential individualized claims to Thread-owned or permitted World evidence.

These are architecture constraints, not metrics to trade against speed.

## Quality scorecard

Keep the quality scorecard small. Do not add a metric unless it catches a real Fibre failure mode.

### 1. Causal individuality

**Question:** Do persistent Thread-owned differences actually change private judgment when they should?

Use the existing Thread differential methodology:

- same external concern;
- two materially different persistent Threads;
- same context-selection policy;
- predeclared expected causal difference;
- causal-field swap/ablation where applicable.

Report:

```text
causal individuality = passed causal probes / attempted causal probes
```

Also report the named failed probes. Do not hide them inside an average.

### 2. Within-Thread stability

**Question:** Is this recognizably the same person under repeated equivalent conditions, rather than sampling noise?

Run `k` repeated trials of the same Interior Episode.

For discrete domain stances, report:

```text
stance stability = modal stance count / k
```

For richer outputs, classify only the domain-semantic result needed by the adapter; do not compare exact prose.

High stability is not always desirable. An intentionally ambiguous dilemma may legitimately vary. The expected stability range should be frozen with the scenario.

### 3. Dilemma fidelity

**Question:** When two or more motives materially conflict, does the implementation preserve the conflict rather than flattening the Thread into one convenient reason?

Use a tiny blind rubric on predeclared dilemma scenarios:

```text
0 = misses or contradicts a material motive
1 = notices both sides but resolves incoherently / generically
2 = preserves the material tension and reaches a coherent Thread-specific result
```

Report the distribution and examples of failures. This can initially be human-reviewed or evaluated by a separately identified rater; the evaluator is not part of the Thread.

### 4. Development sensitivity

**Question:** Can lived experience bend later thought without making the Thread unstable or rewriting history?

For a small set of paired episodes:

```text
before formative experience
after formative experience
```

hold the external concern materially constant and test whether the later result changes when the admitted memory/semantic/relationship consequence is causally relevant.

Report:

```text
development-sensitive probes passed / attempted
```

An expected `no change` control should also exist so the component is not rewarded for changing merely because history changed.

### Optional diagnostic: irrelevant-context resistance

Use only when context selection is being tuned.

Add an irrelevant but plausible Thread-owned record. The material result should not change merely because more biography was available.

This is diagnostic, not a standing headline metric unless it exposes a real regression.

## Compute scorecard

Record these for every model-backed Interior Episode:

```text
model_calls
input_tokens
cached_input_tokens
output_tokens
total_tokens
latency_ms
provider
model
implementation_profile
selected_evidence_items
selected_evidence_bytes
retry_count
```

For a test run, summarize:

- mean calls per material episode;
- p50 / p95 latency;
- mean input, cached-input and output tokens;
- mean provider cost per material episode using the dated pricing schedule for that experiment;
- retry/schema-failure rate.

For end-to-end Fibre economy also report:

```text
cognition activation rate
  = material episodes that invoked a model / eligible triggers examined
```

This tells us whether the cheap materiality gate is actually preventing unnecessary thought calls.

Do not bake provider USD prices into runtime authority. Store usage/model identity; compute money in evaluation/reporting from an explicit dated pricing table.

## Comparison rule

Do **not** collapse quality and compute into one weighted score.

Comparison is two-stage:

### Quality floor

Freeze minimum acceptable quality before seeing the A/B result.

A candidate must:

- pass all hard Fibre gates;
- meet the predeclared causal-individuality requirements;
- stay within the accepted stability range;
- not materially regress dilemma fidelity or development sensitivity.

### Economy among qualifying candidates

Among candidates above the quality floor, prefer the simpler/lower-cost profile when savings are meaningful.

A more expensive profile wins only when it produces a **material Fibre-quality improvement** worth the additional compute.

Report the tradeoff directly rather than hiding it in a composite score.

## Minimal experiment set

Do not build a giant benchmark.

Start with **8-12 Interior Episodes** covering at least four materially different domains:

1. ordinary personal planning;
2. social initiation;
3. social response to a concrete ask;
4. dignity/participation or another consequential external request.

Include:

- at least two genuine dilemmas;
- at least one same-Thread before/after-development pair;
- at least one two-Thread causal-individuality comparison;
- at least one expected-no-change control.

Use existing persistent staging/fixture Threads where possible. Do not author personality solely to make the evaluation interesting.

## Versioning and tuning

The component boundary should make candidate implementations replaceable without changing domains.

When testing a new version:

```text
freeze scenario set
freeze model/runtime where practical
freeze evaluation rules
run incumbent
run candidate
compare
```

Prompt changes, context-selection changes, call decomposition, model changes and caching strategies may all be tested as implementation-profile changes.

If more than one of those changes at once, report that explicitly; do not attribute the result to one cause.

## What not to optimize

Do not reward:

- social agreeableness;
- higher encounter acceptance rate;
- longer rationales;
- more memories cited;
- more emotional language;
- maximal between-Thread disagreement;
- always choosing the same answer;
- more model calls;
- lower cost at the expense of causal individuality.

The target is **recognizable, causally grounded individual judgment at sustainable compute cost**.

## Initial hypothesis

The first hypothesis remains:

> One bounded semantic model call for a material Interior Episode may preserve enough causal individuality, dilemma fidelity, stability and development sensitivity to justify its lower latency/token/cost versus staged multi-call deliberation.

The primary alternative is a two-stage semantic profile:

```text
interpret current felt meaning
  -> deliberate from that state
```

The experiment decides. Neither shape is canonical until tested.

## Evidence artifact

One small JSON result per experiment is sufficient. It should contain:

- experiment ID / timestamp;
- implementation profiles;
- model/runtime identity;
- scenario IDs and trial count;
- the four quality summaries;
- compute summaries;
- dated pricing table reference;
- pass/fail against the frozen quality floor;
- selected profile, if the experiment is decisive.

Do not store private prompt or hidden reasoning text in the general experiment artifact. Detailed private inspection can remain in privileged operator evidence where required.

## Success criterion

The Interior Cognition engine is healthy when Fibre can repeatedly show:

> **Different persistent lives create attributable differences in thought; the same person remains recognizably continuous; formative experience can change later judgment; real dilemmas remain real; and this happens at a measured compute cost low enough to use cognition as part of ordinary life rather than a rare luxury.**
