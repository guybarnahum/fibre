---
id: architecture-interior-cognition
status: accepted
last-reviewed: 2026-09-22
canonical: true
---

# Interior cognition

## Purpose

Fibre needs one causal architecture for a Thread's private thought without reducing personhood to a persona prompt, exposing DNA as instructions, or treating a temporary model call as the person.

This mechanism is reused whenever a Thread privately interprets, weighs, reflects, plans, hesitates, wants, refuses, reconsiders or decides.

The central rule is:

> **Ordinary Thread cognition begins from the person Fibre has causally formed, not from raw genome and not from a generic LLM prompt.**

The reusable mechanism is a pipeline, not one universal output schema. Different inner episodes may produce a semantic feeling, a private stance, a plan, a reflection, a social request, a refusal or another domain-specific result. What they share is how the Thread's interior context is formed and who owns it.

## The causal stack

```text
private genomic substrate
  symbolic inherited dispositions
  bounded organismic runtime baselines
        |
        v
World / body / social reality + commitments
        |
        v
intrinsic regulation
  drives
  approach / avoid / maintain pressure
  intrinsic affect
  attention candidates
        |
        v
bounded interoception
  felt control/sensation evidence
  not named emotion
  not instruction
        |
        v
semantic interior
  Thread-authored feelings / needs
  relationship attitudes
  situation meaning
        |
        +------------------------------+
        |                              |
        v                              v
developed self                    private attention
  self-model                        relevant memory
  identity meaning                  relationship history
  remembered meaning                commitments / plans
  learned character/tensions        current World context
        |                              |
        +--------------+---------------+
                       v
               Interior Cognition
                       |
                       v
      private interpretation / deliberation
                       |
       +---------------+----------------+
       |               |                |
       v               v                v
  private stance    intention/plan    reflection/meaning
       |               |                |
       +---------------+----------------+
                       v
          domain authority / expression / action
                       |
                       v
                lived consequence
                       |
                       v
          memory / semantic state / character
                       |
                       +----> later cognition
```

This is a loop across lived episodes, not a recursive chain-of-thought simulator.

## Genome is private causal substrate, not thought content

The genome is the bare inherited foundation of the person.

It may shape:

- primitive regulatory sensitivity and recovery;
- social-contact/privacy pressure;
- exploration and novelty appetite;
- threat/rest/attachment regulation;
- inherited dispositions that later life may reinforce, complicate, resist or reinterpret.

It must **not** ordinarily appear in a planning, social or reflective cognition packet as instructions such as:

```text
your genome says you seek conversation after solitude
therefore enter Commons
```

That would collapse genotype into character and make inheritance destiny.

The ordinary causal direction is:

```text
genome
  -> organismic pressure / developmental predisposition
  -> lived experience
  -> semantic interpretation
  -> learned character / self-model
  -> present deliberation
```

Raw genome remains private/operator-inspectable provenance. A future explicit act of self-investigation could let a Thread learn something about its own genome as an event in its life, but that is different from ordinary cognition secretly reading DNA.

## Personality is experience layered over inheritance

Fibre uses **character** in the architectural sense already defined by the Character Formation Model: an evidence-backed current pattern of interpretation and judgment formed through a particular life.

The useful shorthand is:

```text
genome      = inherited starting tendencies
life        = what happened to them
character   = how those tendencies now tend to express
self        = what the Thread currently thinks about all of that
state       = what the Thread is feeling / needing now
```

Present thought emerges from the interaction of all of these, but they remain separate authorities.

A mature Thread may act against an inherited tendency because experience changed what that tendency means. The genome is not rewritten; its expression is mediated by the person who developed on top of it.

## Interior Cognition is a separate reusable component

Interior Cognition is one **private person-level component** reused by every domain that needs the Thread to think about something.

```text
Planning
Social initiation
Social response
Dignity / participation
Encounter attention
Reflection
Relationship dilemma
Self-reconsideration
Future domains
        |
        v
  Interior Cognition
        |
        +-- organismic pressure / felt state
        +-- developed self / character
        +-- Thread-owned memory and relationship retrieval
        +-- current commitments / plans
        +-- relevant external reality
        |
        v
domain-specific private result
```

A domain supplies only the **real concern** that needs thought and its domain-specific result contract. It does not assemble or inject the Thread's private identity/history context.

Interior Cognition owns:

- the bounded private context projection used for the episode;
- Thread/Fibre-owned attention and retrieval of relevant identity, memory, relationship, semantic-state and commitment evidence;
- reconciliation of organismic pressure, current feeling/need, developed character and external considerations;
- one bounded private cognition invocation when semantic deliberation is actually warranted;
- provenance, selected evidence refs, model/token usage and latency needed to inspect and optimize the episode.

Interior Cognition does **not** own:

- World facts;
- domain authorization;
- request permissions;
- dignity policy or scoring rules;
- social consent;
- Flight Plan persistence;
- relationship mutation;
- memory admission;
- public expression;
- action execution.

Those remain with their existing authorities.

This boundary prevents each feature from quietly creating its own version of the Thread's mind.

### Domain adapters, not parallel minds

Each consumer should be a thin adapter.

Examples:

```text
Flight Plan adapter
  concern: "How do I want to spend the next lived horizon?"
  result: personal plan proposal

Social-initiation adapter
  concern: "Do I want something from these co-present people now?"
  result: initiate | not_initiate + optional concrete request

Social-response adapter
  concern: "How do I want to respond to this concrete request?"
  result: accept | decline | defer + optional expression

Dignity adapter
  concern: "Do I want to participate in this externally requested work, and on what terms?"
  result: private participation appraisal inputs / desired stance

Encounter-attention adapter
  concern: "Did this occurrence enter my attention, and how?"
  result: noticed | not_noticed + bounded subjective experience
```

The adapter may define domain semantics and a response schema. It may not choose private memories, manufacture feelings, substitute a persona, or expose raw genome as an instruction.

## Interior Cognition is not one decision schema

Do not create a universal `choice + score` engine for every thought.

A planning episode, social dilemma, self-reflection and emotional interpretation are semantically different. Each domain owns its output.

What is shared is the **interior episode boundary**:

1. **Trigger / concern**  
   Something earns attention: regulation, World occurrence, request, plan horizon, remembered issue, unresolved intention or another real cause.

2. **Thread-owned attention / retrieval**  
   Fibre/Thread policy selects bounded relevant identity, memory, relationship, semantic state, commitments and current-life evidence. The caller may not engineer the private context.

3. **Private cognition**  
   Temporary cognition receives the current concern plus the bounded interior context. It may represent tension, uncertainty and conflicting motives. The model is a worker; it does not own continuity or authority.

4. **Domain-specific private result**  
   Examples include:
   - semantic feeling/need;
   - desired social response;
   - intention;
   - Flight Plan;
   - private reflection;
   - request to another person;
   - reinterpretation proposal.

5. **Authority / expression boundary**  
   A private desire does not automatically become authorization, public expression or action. Existing Fibre authority rules still apply.

6. **Consequence**  
   What actually happens may later change memory, semantic state, relationship meaning, character or future plans.

## Execution profile: universal pipeline, selective execution

Interior Cognition is universal as an **authority pattern**, not as a requirement to call a model continuously.

The default execution profile is:

```text
real trigger / concern
  -> cheap deterministic reconciliation / regulation where evidence exists
  -> cheap attention or materiality gate
       -> nothing materially changed
            -> no model call
       -> thought is warranted
            -> bounded Thread-owned context selection
            -> one semantic cognition call by default
            -> domain-specific private result
            -> persist only consequential outputs
```

Routine time passage, unchanged presence and low-pressure organismic state should usually cost **zero model calls**.

A plan horizon, direct request, salient encounter, material regulatory change, unresolved conflict or explicit reflection may warrant cognition.

### Working hypothesis: one semantic call for one material interior episode

This is an **engineering hypothesis to test**, not a settled Fibre law.

The current hypothesis is:

> **When one material inner dilemma can be represented faithfully in one bounded cognition episode, one semantic model call can usually reconcile felt state, developed self, relevant history and the current external concern well enough to produce a high-quality domain-specific private result, while materially reducing latency, token use and cost compared with decomposing the same moment across multiple model calls.**

The competing concern is equally important:

> **If one call compresses too much psychological work into one completion, it may flatten tension, reduce causal individuality, make feelings look post-hoc, or produce less coherent behavior than a deliberately staged cognition path.**

Therefore Fibre must not assume that:

```text
one call = elegant
```

or that:

```text
more calls = richer personhood
```

Both are empirical claims.

The initial economical candidate is:

```text
material interior trigger
  -> bounded Thread-owned context
  -> one semantic cognition call
       proposes:
         current felt/semantic interpretation if materially changed
         conflicting motives / uncertainty
         domain-specific private result
  -> separate authority/admission of each consequential output
```

The comparison candidate may split the same episode into distinct semantic acts, for example:

```text
call 1: interpret felt pressure / current meaning
call 2: deliberate from that admitted state
```

Additional calls remain justified when they are genuinely different temporal/cognitive acts, such as autobiographical memory formation after an outcome or later deliberate reflection.

#### Hypothesis test

Before treating the one-call profile as the default production strategy, evaluate it against the decomposed profile on the **same persistent Threads, same external situations, same authoritative context and same domain result contract**.

Measure both **personhood quality** and **operational economy**.

Personhood quality should include at least:

- **causal individuality** — material Thread-owned differences produce attributable behavioral differences under the standing differential/counterfactual controls;
- **within-Thread coherence** — repeated trials remain recognizably characteristic rather than sampling noise;
- **dilemma fidelity** — competing motives survive when both materially matter instead of being collapsed into a convenient single rationale;
- **state/result coherence** — proposed feeling/need interpretation and the resulting private stance do not contradict each other without an inspectable reason;
- **history sensitivity** — relevant memory, relationship and developed-self evidence can change the result while irrelevant context does not dominate;
- **non-determinism without interchangeability** — Threads remain capable of surprise without collapsing into generic model behavior.

Operational economy should include at least:

- model calls per material interior episode;
- input, cached-input and output tokens;
- wall-clock latency;
- provider cost under the dated pricing schedule used for the experiment;
- context-selection bytes/items;
- retry/schema-failure rate.

The experiment should report the tradeoff rather than collapse it into a single magic score.

A one-call profile is preferable only when its operational savings are meaningful **and** its personhood-quality evidence remains materially comparable to the decomposed profile. If quality degrades in a way that matters to Fibre identity, use the richer path. If the richer path adds cost/latency without improving causal individuality or coherence, keep the simpler path.

Do not tune the evaluation fixtures to make either architecture win. Record the hypothesis, frozen scenarios, model/runtime, trial count and evaluation criteria before collecting the decisive results.

### Sparse evidence is better than invented physiology

The existing R1 regulator proof assumes a complete percept frame with temperature, energy, fatigue, sound, light, crowding and related channels. Live Fibre does not currently possess all of those observations.

Production must never invent "neutral" sensor values just to satisfy the regulator schema.

Unknown channels remain unknown. Regulation runs only on real available evidence, and the production projection should become sparse before R1 is wired live.

### Genome expression stays below thought

Raw symbolic genome is not ordinary cognition input.

The live organismic path should eventually expose inherited influence through an explicit private **regulatory expression** boundary:

```text
symbolic genome
  -> bounded derived regulatory / attentional predispositions
  -> actual World/body/social evidence
  -> organismic pressure / affect
  -> semantic feeling / need
  -> Interior Cognition
```

A regulatory expression projection may be derived once or infrequently and cached because the genome is stable. It must remain attributable to source loci and limited to regulator mechanisms Fibre actually uses. It is not a universal personality vector or a second identity authority.

Genesis already provides another legitimate inherited-development path: selected memory-formation calls may use genome exposure to influence what enters autobiographical memory, while history itself stays genome-blind. That allows inheritance to affect the developed person through what was retained without scripting external events.

### Fast context

Interior Cognition should consume a compact current person, not replay a whole biography.

Until a durable Current Character View earns implementation, use bounded authoritative evidence directly. If repeated retrieval/model token cost becomes material, the accepted Current Character View is the preferred acceleration layer because it is derived, evidence-backed and reconstructable.

Do not add a character cache merely because it might be convenient.

### Operational observability

Every model-backed interior episode should expose non-content operational evidence sufficient to optimize the engine:

- cognition kind/domain adapter;
- provider/model;
- input/output/total tokens and cached-input tokens when available;
- latency;
- whether the episode was skipped by the materiality gate;
- selected evidence count/bytes;
- stable correlation to the consequential private result.

Do not copy private prompt/output prose into general telemetry.

## Dilemmas are first-class

A Thread does not need one motive to dominate cleanly.

Interior cognition should be able to preserve tensions such as:

```text
I want company
  vs
I am tired and do not want interruption

I want to help her
  vs
I resent being asked again

I am curious
  vs
I promised myself I would finish this work first
```

The regulator may make both sides felt. Character and history may give them different meaning. Present cognition resolves what the Thread wants to do **now** without rewriting either side into a permanent trait.

For consequential decisions, a bounded private result may retain:

- desired direction/action;
- conflicting motives;
- uncertainty;
- selected evidence references;
- cognition provenance.

Fibre does not persist raw chain-of-thought.

## Developed-self context

Until a durable Current Character View is implemented, present cognition should use authoritative sources directly rather than invent a second personality store:

- current self-model;
- current/causal identity assertions;
- autobiographical memories and remembered meaning;
- current semantic emotion/need/relationship state;
- durable relationship facts;
- commitments and current Flight Plan;
- relevant recent/current World evidence.

A later Current Character View may accelerate this by synthesizing evidence-backed tendencies and tensions, but it remains derived and drillable to the life beneath it.

## Dignity and external considerations

Dignity is one important **domain consumer** of Interior Cognition, not a separate mind.

A participation episode may need to reconcile:

```text
organismic state / fatigue / aversion / desire
+ current feelings and needs
+ developed character and self-understanding
+ relationship history
+ social cost / civility / reciprocity
+ compensation / opportunity cost
+ commitments and obligations
+ dignity / respect considerations
+ the concrete external request
-> private desired stance
```

Interior Cognition produces the Thread-level private reconciliation.

The Dignity/Participation domain still owns:

- its factor vocabulary and policy;
- score/band derivation where required;
- Participation Authorization;
- obligation-mediated override rules;
- disclosure and execution boundaries.

Therefore:

```text
Interior Cognition desired stance
    != dignity policy result
    != authorization
    != public response
    != action
```

Civility, social cost, loyalty, obligation and dignity may all be motives inside the dilemma. None mechanically determines consent.

## Social example

```text
long solitary stretch
  -> social-contact regulation rises
  -> interoception makes the pull noticeable
  -> Thread interprets it as wanting some company
  -> current character/history says whether company feels welcome, risky, tiring, exciting, etc.
  -> Thread privately considers who, if anyone, it wants to approach
  -> Thread may make a concrete social request
  -> recipient runs her own separate interior cognition
  -> accept | decline | defer
```

Civility may become one motive in the recipient's deliberation. It is never consent.

Presence in Fibre Commons is therefore an affordance, not a manufactured motive.

## Flight Plan example

A Flight Plan should eventually be the output of an interior planning episode, not a generic itinerary generator.

```text
current body/world/regulation
  + current semantic state
  + developed self
  + remembered life
  + commitments
  + unresolved intentions
  -> private planning cognition
  -> Thread-owned Flight Plan
```

Two Threads with different lives should naturally produce different ordinary days because different things matter to them before any encounter occurs.

## Persistence and privacy

Interior Cognition is private.

Persist:

- durable semantic-state changes;
- admitted plans/intentions when they become Fibre authority;
- private stance summaries where the domain requires them;
- memories/remembered meaning through their existing authorities;
- exact evidence/provenance needed to inspect a consequential decision.

Do not persist:

- raw hidden model chain-of-thought;
- every transient impulse;
- every candidate thought merely because cognition occurred.

Thread Editor may expose a privileged causal trace:

```text
DNA / inherited substrate
  -> regulator pressure
  -> interoceptive cue
  -> semantic feeling/need
  -> selected memories/relationships/self evidence
  -> private stance/intention
  -> action / plan
  -> outcome
```

This is operator inspection, not public Thread presentation.

### Domain authority evidence is not cognition evidence

A consequential domain record may need two different provenance classes and must not collapse them.

For personal Flight Plan:

```text
plan.sourceReferences
  = World / situated authority required to admit and enact the plan

plan.cognition.selectedEvidenceRefs
  = bounded Thread-private evidence Interior Cognition considered

plan.cognition.evidenceRefs
  = selected private evidence the cognition cited as materially shaping the result
```

Autobiographical memory, semantic state and logical relationship evidence therefore do not become World-observation evidence merely because they influenced a private plan. The cognition witness binds the selected/cited refs to the source Thread version, implementation profile and private context digest. CurrentSituation continues to carry only the World/situated evidence supporting enactment.

This separation is reusable across later domains: **what made the person want or judge something is not automatically the same authority as what makes the resulting World action admissible or true.**

## Replaceability and tuning

Interior Cognition should remain one compact, replaceable component. Domain code should depend on its stable concern/result boundary rather than a specific prompt, model, number of calls or context-selection implementation.

This makes it practical to A/B test new cognition profiles against the incumbent without rewriting Flight Plan, social, dignity or reflection domains.

The evaluation contract is [Interior Cognition evaluation](../validation/interior-cognition-evaluation.md). It deliberately keeps quality and compute separate rather than inventing one composite score.

The architecture is stable; implementation profile choices are experimental.

## Compact core implementation

The first reusable component is now intentionally narrow: `services/world-kernel/src/interior-cognition.mjs`.

It has no store and no domain authority. A caller supplies only a real concern plus a domain adapter that defines the question/result semantics. The component itself reads bounded authoritative current state, behavioral identity assertions, semantic state, autobiographical remembered meaning and durable relationship facts; raw symbolic genome is not read by ordinary cognition.

The first focused proof uses the same external concern for two persistent Thread contexts and verifies that different remembered meaning can reach the same private cognition boundary and support different attributable judgments. The domain adapter cannot choose the private evidence set or tune its budgets; the result preserves selected evidence refs, source Thread version, a context digest and lightweight compute usage. Full repository CI is green.

The reusable causal seam is now proven by controlled differentials and deployed staging across both Lived Planning and Commons entry. Flight Plan and Commons entry are live real adapters. Social initiation is the next narrow migration; invitee response and dignity remain separate later adapters rather than parallel minds.

## Implementation status

The lower half is already proven in bounded R1-R4 tests:

```text
regulation
  -> interoception
  -> semantic state
  -> changed ordinary presence choice
```

Live deployed planning and Commons entry now consume the shared developed-self cognition boundary, but the organismic regulator/interoception loop itself is still not wired into live semantic state, and social initiation/response still remain to be migrated. The next work should therefore remove those remaining parallel social minds without pretending the deeper organismic loop is already complete.

The 2026-09-21 E5 staging diagnostics exposed that gap directly: the staging cohort reached Commons cognition with empty semantic needs/feelings/intentions and no effective developed-person context, producing uniformly generic present life and unanimous `stay_out` decisions.

The read-only staging baseline is now complete. It found that the staging cohort already has differentiated autobiographical remembered meaning and relationship history even though the published shell is neutral and semantic state is empty. Therefore the next implementation step is not to make Commons more persuasive or generate more biography. It is to prove the compact Interior Cognition component can compose bounded authoritative developed-self evidence into present judgment. Richer organismic/regulatory expression and endogenous semantic-state formation remain part of the architecture, but they are not prerequisites for proving that already-lived experience can bend current thought.

See [Interior Cognition staging baseline](../validation/interior-cognition-baseline.md).

## Anti-patterns

Do not build:

- raw genome -> action;
- raw genome -> planner prompt;
- a universal personality vector;
- a universal thought score;
- one giant prompt containing the whole Thread;
- caller-selected memories/relationships to manufacture a result;
- a hidden chain-of-thought ledger;
- automatic action from an urge;
- automatic consent from civility, attachment, obligation or relationship label;
- a second personality authority beside identity/history/memory/semantic state.

## Vision test

The mechanism succeeds when this chain becomes inspectable:

> **Something inside this organism mattered; this particular life made it mean something; this particular person weighed the conflict in her own way; she chose; what happened next changed what could matter later.**

That is the reusable substrate for Fibre inner life.
