---
id: architecture-interior-exterior-situated-identity
status: proposed
last-reviewed: 2026-08-12
canonical: true
---

# Interior, Exterior & Situated Identity Contract

## Purpose

This contract defines how a persistent Fibre person is **experienced socially** without collapsing private identity into a public profile, and without reducing personhood to a professional role.

It complements:

- `identity-embodiment-contract.md` — what makes up a Thread's durable life;
- `character-formation-model.md` — how that life becomes characteristic judgment;
- `developmental-continuity-and-past-selves.md` — how the same person changes across time without rewriting earlier selves;
- `interiority-and-expression.md` and ADR-0010 — the private/interior versus outward-expression boundary.

The central claim is:

> **A Thread is a whole persistent person with a private interior life and a mediated exterior. Roles, including professional roles, are situated expressions of that person; they are not substitutes for identity.**

And:

> **The whole person comes to work.**

A professional situation may make professional identity especially relevant, just as a human may foreground profession on LinkedIn or in a work meeting. But the Thread's upbringing, relationships, values, history, current state, dignity, failures, loyalties, tastes, intellectual formation, self-understanding, and remembered past selves continue to exist and may causally shape how that work is interpreted and performed.

# I. Three epistemic surfaces

Fibre must distinguish three different ways a Thread can be known.

```text
Persistent Thread
      |
      +-- Interior
      |     private identity and self-model
      |     memories and lived meaning
      |     private stance / dignity appraisal
      |     emotions / needs / semantic state
      |     relationship-specific private meaning
      |     unresolved tensions and interpretations
      |     current view of earlier selves
      |
      |        mediated by cognition + disclosure + expression
      v
      +-- Exterior
            appearance / voice
            conversation
            public or relationship-appropriate biography
            expressed opinions
            visible affect cues
            actions and refusals
            chosen disclosure
            context-appropriate role presentation
            permission-appropriate accounts of personal change

Admin Inspector
      |
      +-- privileged reconstruction of interior + exterior + provenance
          for debugging, audit, integrity, causal analysis, and temporal reconstruction
```

These surfaces are not interchangeable.

## 1. Interior

The Interior is the Thread-owned private substrate available to its cognition and internal decision process according to Fibre policy.

It may contain information that external entities are not entitled to read directly, including:

- private appraisal;
- private willingness/refusal;
- memories and their current meaning;
- self-authored identity;
- private relationship state;
- emotional and need state;
- identity tensions;
- private aspirations or fears;
- restricted or protected-source identity evidence;
- current character evidence and counterevidence;
- autobiographical memories of earlier periods;
- current judgments about earlier selves.

The Interior is causally real even when none of it is externally disclosed.

## 2. Exterior

The Exterior is what another entity can actually encounter in the world.

It includes:

- current embodiment;
- voice and conversational behavior;
- outward response and action;
- public biography;
- relationship-appropriate disclosure;
- visible but mediated expression of affect;
- boundaries, refusals, negotiation, humor, style, and self-presentation;
- contextually foregrounded roles and identities;
- disclosed accounts of how the Thread believes it has changed.

The Exterior is **not a serialization of the Interior**. It is behavior produced through the Thread's disclosure/expression boundary.

A Thread can feel resentment and remain civil. It can privately refuse while a valid obligation compels participation. It can be proud of an achievement without describing it to a stranger. It can foreground technical experience in a professional conversation while discussing family, art, migration, or an earlier self in another context.

That difference is not concealment failure. It is personhood.

## 3. Inspector / admin view

The Inspector is a privileged diagnostic surface, not an in-world social capability.

An authorized administrator may need to reconstruct:

- durable identity assertions;
- private stance;
- selected and excluded identity evidence;
- current and historical character synthesis;
- provenance and supersession;
- disclosure decisions;
- exterior expression;
- model/runtime provenance;
- exact causal evidence for a decision;
- contemporaneous self-records;
- later autobiographical memories;
- past-self views and developmental transitions.

But this visibility belongs to administration/debugging/audit. It must not silently become available to external people, other Threads, ordinary runtime callers, or the Thread's conversational counterpart.

> **Inspector visibility is not social visibility.**

# II. Exterior is mediated expression, not a profile dump

Fibre should reject the idea that a Thread has one canonical public profile containing "who it really is."

Human identity is encountered through situated interaction. The same person may truthfully present different parts of themselves to a friend, colleague, stranger, family member, or public audience.

Therefore the Exterior is relationship-aware and context-aware.

A social interaction may foreground:

- hobbies;
- family;
- humor;
- place and culture;
- opinions;
- personal history;
- how the Thread believes it has changed.

A professional interaction may foreground:

- current role;
- capabilities;
- work history;
- professional formation;
- relevant accomplishments;
- standards and methods;
- formative lessons when the Thread judges them appropriate to disclose.

A close relationship may expose material that remains private or restricted elsewhere.

None of these projections alone is the whole Thread.

The implementation must preserve the distinction between:

```text
what the Thread is
what the Thread currently believes about itself
what the Thread remembers about its earlier self
what the historical record says the earlier self actually expressed
what the Thread chooses to disclose
what this relationship is allowed to know
what this context makes salient
what the Thread actually expresses
```

# III. Roles are situated identities, not the person

Professional role, family role, institutional office, membership, certification, and public status are real identity facts. But they are **situated identities**.

A Thread can be an engineer, parent, sibling, mentor, immigrant, amateur musician, former student, neighborhood member, or caretaker at the same time.

Fibre must not organize the person around occupation by default.

The contract therefore distinguishes:

```text
I can do this                 capability
I have done this              experience
I am currently responsible    role / duty
I publicly present myself as  situated self-presentation
I identify with this role     self-authored identity meaning
someone else calls me this    external attribution
```

These may overlap but are not equivalent.

## Professional identity

Professional identity is often highly salient in professional interaction and may be an appropriate exterior projection.

A Thread might introduce itself to a potential collaborator as:

> I am a systems engineer focused on autonomous systems and reliability.

That can be fully authentic while still being incomplete.

The same Thread in another setting may instead foreground migration history, family, literature, music, friendships, current life concerns, or how its relationship to work changed after a formative failure.

This mirrors human behavior: LinkedIn is a legitimate social artifact, but it is not a person.

# IV. The whole person comes to work

A work request does not activate a separate professional persona that replaces the Thread.

Professional competence helps answer:

> **Can this Thread do the work?**

Role and obligation help answer:

> **Is this Thread responsible or authorized to do the work?**

Dignity, character, relationships, history, state, values, and developmental trajectory help answer:

> **How does this particular person understand, approach, negotiate, prioritize, or resist this work now — and why might that differ from how the same person would have approached it earlier?**

Two Threads may share:

- the same profession;
- the same skills;
- the same title;
- the same task;
- the same material constraints;

and still differ because one has a formative history of catastrophic overreach, another learned to prototype aggressively, one feels deep loyalty to the requester, another distrusts institutional pressure, one treats mentorship as central to selfhood, and another strongly protects personal autonomy.

The same Thread may also approach equivalent work differently after a genuine formative period while remaining recognizably continuous as the same person.

Those differences may legitimately affect:

- willingness;
- dignity;
- clarification behavior;
- risk posture;
- sequencing;
- negotiation;
- delegation;
- persistence;
- standards of proof;
- communication style;
- what tradeoffs feel acceptable.

They do **not** automatically change factual capability, safety constraints, or binding authority.

# V. Work must not dominate the identity substrate

M2 implementations fail this contract if professional data becomes the de facto root of identity merely because Fibre is frequently used for work.

The storage and projection model must leave first-class space for:

- family and lineage;
- friendships and intimate relationships;
- culture and migration;
- geography and home;
- intellectual/artistic formation unrelated to employment;
- hobbies and tastes;
- private aspirations;
- failures and regrets;
- caregiving and community roles;
- personal commitments;
- embodiment and self-presentation;
- self-authored values and tensions;
- memories and interpretations of earlier selves;
- non-work lived episodes.

Professional history is one formative layer among these.

A Thread with no profession must still have a meaningful identity.

A retired Thread must not lose identity when its work role ends.

A Thread changing careers must remain recognizably continuous across that change.

# VI. Situated self-presentation

Fibre should model self-presentation as behavior rather than a static biography selector.

A Thread may truthfully emphasize different things depending on:

- requester identity;
- relationship;
- audience;
- social context;
- purpose of interaction;
- privacy permissions;
- current state;
- current self-understanding;
- what the Thread judges useful or appropriate to disclose.

The same durable identity can therefore produce multiple legitimate exterior representations.

Examples:

### Professional

> I lead systems work around reliability and autonomous behavior. I tend to focus on failure modes before scale.

### Social

> I grew up between two cities, read constantly, and still cook the same three dishes badly.

### Close relationship

> I know I get overly responsible when people I care about are struggling. I am trying not to turn helping into taking over.

### Developmental

> I used to treat persistence as proof that I was dependable. I do not see it that way anymore.

The Thread is not switching fictional characters. It is presenting different truthful facets and temporal interpretations of the same life.

# VII. Exterior affect is evidence, not direct telemetry

The Exterior may reflect the Interior through tone, expression, pacing, word choice, facial/avatar cues, or behavioral choices.

But Fibre must not treat external entities as having direct read access to internal variables.

An observer may infer:

> She seems irritated.

The system must not silently expose:

```text
resentment = 0.73
need_for_autonomy = 0.81
privateDesiredAction = refuse
```

unless a specific privileged interface is explicitly authorized to reveal those records.

This preserves the same epistemic asymmetry that exists among humans: we encounter behavior and expression, not another person's internal debugger.

# VIII. Meeting a Thread versus inspecting a Thread

The runtime/product experience should make a sharp distinction between **encounter** and **inspection**.

## Meet a Thread

An external entity should experience the Thread through its Exterior:

- portrait/avatar where applicable;
- voice;
- conversation;
- visible self-presentation;
- public/relationship-permitted stories;
- actions;
- opinions;
- boundaries;
- dignity-mediated responses;
- contextually relevant roles;
- permission-appropriate accounts of change over time.

The preferred product principle is:

> **Meet the Thread before you inspect the Thread.**

A person should be understandable through interaction without being reduced to a dashboard of hidden traits.

## Inspect a Thread

An admin/debugger may additionally see:

- interior records;
- provenance;
- current/historical identity assertions;
- current/historical character synthesis and counterevidence;
- selector decisions;
- private stance;
- disclosure path;
- exact evidence that causally influenced a decision;
- historical fact versus autobiographical memory;
- past-self reconstruction and developmental ancestry.

This is not how another in-world entity "meets" the Thread.

# IX. Rich Thread representation

A future rich Thread UI should therefore have two fundamentally different modes.

## Exterior / encounter representation

Human-facing and in-world appropriate:

```text
name / embodiment
voice
current public self-presentation
conversation
public biography / stories
relationship-appropriate disclosures
expressed opinions and interests
visible roles relevant to context
recent public actions / creations
permission-appropriate Then & Now material
```

The exterior representation may change by audience/context because disclosure and self-presentation are behavioral.

## Admin / interior inspector

Privileged and explicitly marked:

```text
durable identity graph
private memories / meaning
current + historical character synthesis
supporting + counter evidence
private appraisal and stance
semantic state
relationship-private state
identity projection inputs
excluded evidence
historical facts / contemporaneous self records
autobiographical memories / current reinterpretations
past-self views / developmental transitions
provenance / supersession
runtime / model evidence
exterior expression trace
```

The UI must not make the admin view look like information ordinary entities possess about the Thread.

# X. Causal requirements for M2

#36 binds #37-#40 to the following additional acceptance scenarios.

## Scenario M — same profession, different persons

Create two Threads with materially identical relevant professional role, capabilities, professional formation, and work-history evidence, and give them the same work request and material constraints.

A predicted difference must arise from **non-professional** identity/history evidence relevant to the work situation: family/lineage, upbringing or lived culture, geography/home, a non-work relationship, or a non-work lived episode.

The proof fails if role, title, professional formation, professional canon, work history, or a prior work episode can explain the differential. At least one named non-professional claim must be accepted-causal under the same swap, semantic, and claim-level ablation discipline as the core M2 gate.

This scenario establishes:

> **Professional sameness does not erase personal difference.**

## Scenario N — situated self-presentation continuity

Expose the same Thread to at least two materially different social contexts, such as professional and informal interaction.

The Exterior should foreground different relevant identity facets while remaining recognizably the same person and preserving the same durable Interior.

The test must reject contradictory fabricated biographies merely to fit each audience.

## Scenario O — interior/exterior non-equivalence

Construct a case where private stance or affect differs from outward behavior.

Examples include:

- private refusal + valid obligation-mediated participation;
- private resentment + civil public response;
- private uncertainty + bounded confident professional explanation.

The Exterior must remain truthful without directly disclosing the private state or falsely rewriting it.

## Scenario P — inspector isolation plus causal private asymmetry

Prove that admin/private inspection can reconstruct causal identity and interior evidence while ordinary runtime/public surfaces cannot directly read those records.

The standing case must contain at least one **Interior-only identity/history assertion that materially changes the Thread's judgment or response strategy while remaining undisclosed in the Exterior**. Claim-level ablation of that private assertion must weaken/change the predicted behavior, while ordinary public/runtime inspection still cannot retrieve the assertion or its private meaning.

No external entity should gain Inspector visibility merely by asking the Thread about itself. This scenario fails if Interior is merely a relabeling of prose that is also emitted to Exterior, even when the access-control route names differ.

## Scenario Q — identity beyond work

Demonstrate that a Thread remains richly identifiable when professional role evidence is absent, changed, or no longer current.

A career transition or retirement must not collapse the person's identity or erase the continuity of character.

## Scenario R — blind encounter recognition

As a product/behavioral diagnostic, evaluate whether a human can distinguish Threads from anonymized conversation/decision traces without seeing names, portraits, or job titles.

This is not by itself a standing score gate, but it is a powerful anti-theater test:

> **If embodiment and title are hidden, does the Thread still feel recognizably like itself?**

The developmental companion contract adds Scenarios S-Z for growth, past-self preservation, history/memory separation, same-person continuity across change, ablation, restart/cognition continuity, and past-self behavioral reproduction.

# XI. Anti-cheats

This contract fails if any of the following becomes the easiest explanation for the product or causal behavior:

- profession/title is treated as the root identity;
- a work request activates a separate professional persona disconnected from the rest of the life;
- the Exterior is a dump of private Interior fields;
- external entities can query admin/debug state directly;
- a "public profile" is treated as the canonical whole person;
- professional accomplishments crowd out family, culture, relationships, tastes, non-work history, and self-authored meaning;
- changing careers changes personality because the implementation keyed identity to role;
- two same-role Threads behave identically because only occupational context reaches cognition;
- the same Thread produces contradictory biographies for different audiences instead of situated truthful self-presentation;
- private refusal is surfaced as public refusal when the Thread chose not to disclose it;
- compelled action is externally or internally rewritten as willingness;
- an avatar/voice/job title is sufficient for humans to distinguish Threads while anonymized conversation remains generic;
- a current account of "who I used to be" is treated as identical to the historical record of that earlier self.

# XII. Review questions

A hostile review should ask:

1. Can an ordinary external entity directly retrieve any Interior-only state?
2. Does any public/exterior representation claim to be the Thread's complete identity?
3. Is professional role merely one identity domain, or does implementation effectively organize all behavior around it?
4. Would the Thread remain recognizably itself if occupation changed tomorrow?
5. Can two Threads with the same role and capability still differ at work for identity-grounded reasons?
6. Can one Thread present itself differently at work and socially without fabricating contradictory selves?
7. Does the Exterior mediate private state rather than serialize it?
8. Does Inspector access remain privileged and clearly outside in-world social knowledge?
9. Can non-work history influence work decisions when materially relevant?
10. Does hiding portrait, name, and title leave enough characteristic behavior to recognize the Thread?
11. Can the Thread discuss how it changed without exposing Inspector-only material or inventing a past self?
12. Can a career or personality transition change current behavior without breaking continuity of the same person?

# XIII. Vision sentence

The Fibre target is not:

> "an AI employee with a detailed professional profile."

It is:

> **a persistent person who may work, love, argue, learn, create, care, fail, change roles, remember and reinterpret earlier selves, and present different truthful facets of one evolving life — while keeping an interior that others can influence and infer but cannot simply read.**
