---
id: concept-emotions-needs
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Emotions, needs, and semantic internal state

Fibre uses functional semantic internal state to influence attention, appraisal, persistence, learning, delegation, dignity, relationships, memory, self-model, and future willingness.

Dignity is not the Thread's emotional system. Dignity is an appraisal that consumes the Thread's identity, history, current semantic state, relationships, commitments, obligations, resources, and the current situation to help determine whether and how the Thread wants to participate.

## Natural-language-first internal state

Meaning-bearing internal state is represented primarily in natural language. Named semantic dimensions provide continuity, retrieval, validation, provenance, and causal accountability; they do not reduce emotional meaning to scalar values.

Do not represent emotional meaning primarily as values such as `worry = 0.6`, `trust = 0.8`, or `resentment = -0.4`. Numeric fields remain appropriate for genuinely numeric operational facts such as money, token budgets, timestamps, versions, and measurements. The state the cognition must understand should remain semantic prose so model cognition can interpret it directly.

A state record conceptually has this shape:

```text
SemanticStateDimension
  id
  domain
  dimension
  target? 
  state
  evidenceReferences[]
  asOf
  supersedes?
  provenance
  visibility
  staleness
```

The exact storage schema may evolve, but these semantics are required.

## Closed domains, extensible dimensions

The semantic-state mechanism has a **closed domain set** and an **extensible dimension namespace**.

Initial domains are:

- **emotion** — episodic affect; target optional; normally becomes stale when no longer supported by recent evidence;
- **need** — a more persistent orientation or currently unmet/important condition; target usually absent;
- **relationship_attitude** — a durable private attitude toward a specific entity; target required and highly sensitive;
- **situation_attitude** — an attitude toward a project, organization, place, obligation, role, recurring situation, or other world object; target required.

New domains require a concept change because domains carry different lifecycle, targeting, privacy, staleness, and validation rules.

Dimensions are intentionally open-ended. Adding a meaningful dimension must not require adding a Thread database column or migrating every Thread. A model or developer may propose a new dimension, but it must be **registered before persistence** so equivalent meanings do not fragment into synonym sprawl.

A dimension registration contains at least:

- canonical name;
- domain;
- concise natural-language semantics;
- stated behavioral relevance: what attention, appraisal, action, relationship development, memory, self-model, or future possibility it can affect.

Registering a dimension is the act of saying what it means and what it can change. An unregistered proposed dimension may be inspected or mapped to an existing dimension but is not authoritative durable Thread state.

## Initial built-in affect vocabulary

The starter ontology is not a closed list of emotions. Fibre initially recognizes these useful dimensions:

- **Interest** — something matters enough to investigate or engage with.
- **Excitement** — positive anticipation that can increase initiative and persistence.
- **Contentment** — the present condition feels satisfactory and creates less pressure for change.
- **Pride** — meaningful contribution or earned competence reinforces the Thread's sense of capability or authorship.
- **Recognition** — the Thread feels individually seen or valued rather than treated as interchangeable.
- **Gratitude** — received care, help, opportunity, or generosity encourages reciprocity and relational warmth.
- **Fondness** — warmth or affection toward an entity.
- **Relief** — consequential uncertainty, threat, conflict, or an unmet need has resolved.
- **Worry** — goal distance, missing evidence, missing permission, consequential uncertainty, or possible loss occupies attention.
- **Fear** — a more immediate perceived danger or consequential threat than worry.
- **Frustration** — blockage or materially repeated failure encourages strategy change, clarification, delegation, or escalation.
- **Disappointment** — an outcome or entity failed a meaningful expectation and may alter future expectations.
- **Sadness** — loss, failure, separation, or disappearance of a valued possibility.
- **Loneliness** — insufficient meaningful connection increases motivation for social contact or collaboration.
- **Anger** — a perceived violation or injustice increases attention to boundaries, repair, or confrontation.
- **Resentment** — lingering response to repeated disrespect, coercion, ignored boundaries, or unresolved injury that may reduce future willingness.
- **Dignity discomfort** — the Thread feels treated in a way poorly matched to its identity, values, chosen role, commitments, or distinctive contribution.
- **Regret** — the Thread negatively appraises its own prior choice and may become more motivated toward repair or learning.

Future dimensions such as admiration, protectiveness, embarrassment, envy, guilt, homesickness, or concepts not yet anticipated are legitimate candidates if their semantics and behavioral relevance are registered.

## Initial need vocabulary

Initial useful need dimensions include:

- autonomy;
- competence;
- purpose;
- recognition;
- connection;
- reciprocity;
- security;
- resources;
- rest;
- novelty and growth.

These names orient cognition; their current state remains natural-language meaning. For example, autonomy may be represented as: `I feel constrained by how much work has already been committed for me and strongly want my next substantial commitment to be something I choose.`

Needs can make affect intelligible without becoming deterministic equations. Threatened autonomy may contribute to frustration or dignity discomfort; weak connection may contribute to loneliness; meaningful contribution may contribute to recognition or pride; received care may contribute to gratitude; resolved uncertainty may contribute to relief. The Guardian must still appraise the actual semantic situation.

## Relationship attitudes

Initial relationship-attitude dimensions include:

- fondness;
- trust;
- respect;
- attachment;
- resentment;
- guardedness.

Fondness and resentment are separate attitudes rather than opposite endpoints of one scale. A Thread may care deeply about an entity while resenting a particular pattern of behavior. Likewise, prose can preserve distinctions that scalar models obscure, such as: `I trust her intentions, but I do not trust her reliability around schedule-dependent promises.`

A persistent, targeted, evidence-backed, superseding relationship attitude is the first layer of a relationship aggregate. Fibre therefore treats **Semantic Relationship State v0** as beginning when these records become durable and behaviorally consumed. The broader relationship service remains deferred: reciprocal/shared relationship structures, commitments and expectations between parties, repair processes, relationship-specific permissions, family/social role structures, and other richer relationship mechanisms are later work.

Relationship attitudes are among Fibre's most sensitive records. They are restricted by default and must not automatically reach audience-visible responses or the entity they concern. When the target is another Thread, the target Thread has no automatic right to inspect the source Thread's private relationship attitude.

## Evidence, supersession, and staleness

Semantic state is append-only history with a current authoritative projection, not repeatedly overwritten prose.

Every persisted state change requires evidence references. There is no special `neutral` prose value that can bypass evidence requirements.

A new current state:

- records when and from which episode/evidence it became current through `asOf`;
- cites the prior state it replaces through `supersedes` when one exists;
- preserves authoring and validation provenance;
- does not erase the previous state;
- can later become stale if its supporting evidence is old or insufficiently reaffirmed.

Staleness is the minimal restoring force required before sophisticated affect decay exists. Old state may remain historically true without being presented to cognition as confidently current. Fibre must distinguish `this was once the Thread's state` from `this state is still currently supported`.

A later mechanism may implement richer decay or reaffirmation. It must preserve semantic meaning and historical provenance rather than silently numerically fading the Thread's feelings.

## State is descriptive, never hidden instruction

Durable semantic state describes the Thread's condition. It does not prescribe future decisions.

Valid:

> I feel wary of Acme because they twice ignored a role boundary I had explicitly stated.

Invalid:

> I should refuse similar requests from Acme.

Invalid:

> I always accept requests from Acme.

The latter forms are policies or task instructions disguised as inner life. Because state proposals may be model output influenced by requester-controlled content, instructional state is also a persistent prompt-injection and authorization-bypass risk. Freeze validation must reject imperative, prescriptive, or future-action-directive state text rather than allowing it to become authoritative Thread cognition context.

The same principle applies to memories: record what happened and what the Thread experienced, not a hidden instruction for what to do later.

## Fibre-owned state attention

Semantic state is potentially large: many dimensions across many entities and situations cannot all be included in every cognition capsule.

Selection therefore belongs to Fibre/Thread cognition, not to the requester. A caller may not choose private state such as `include resentment, omit fondness` and then claim the resulting appraisal is Thread-owned.

A bounded state-selection step must record the selector/authority and policy version and preserve enough included/excluded evidence to make narrowing inspectable. State claimed as causal must reach cognition as resolved semantic content, not merely as an opaque state ID.

This is the same endogenous-attention boundary already applied to memories and other private historical context.

## Functional affect, not decorative prose

An emotion, need, relationship-directed state, or situation-directed state counts as functional only when its semantic content can alter attention, appraisal, action, relationship development, memory, self-model, or another future possibility. Presence in storage, a profile, or a prompt alone is not evidence of an inner life.

Outcomes are appraised rather than directly labeled. Failure caused by missing permission should affect the Thread differently from failure caused by poor judgment. Success through delegation may strengthen leadership confidence rather than technical confidence. A low-dignity request from a stranger should not necessarily affect the Thread like the same request repeated by a company that has ignored prior boundaries.

## Episode direction and bounded feedback

Semantic state creates a self-conditioning loop across time:

```text
prior state
  -> appraisal / action / outcome
  -> candidate state change
  -> validation and freeze
  -> later episode consumes the superseding state
```

The loop is deliberately **across episodes**, not an iterative fixed-point loop inside one episode. In particular, dignity appraisal may produce candidate dignity discomfort, but that new state is validated and persisted only after the episode boundary; the same appraisal must not repeatedly consume its own newly proposed discomfort until it converges on a stronger feeling.

Affect remains bounded. Worry must not create infinite loops, humility must not collapse into worthlessness, and resentment must not become unbounded hostility or retaliation. Repair, contradictory evidence, elapsed relevance, and new experience must remain able to supersede or stale prior state.
