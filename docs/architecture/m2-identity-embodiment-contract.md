---
id: architecture-m2-identity-embodiment-contract
status: proposed
last-reviewed: 2026-08-12
canonical: true
---

# M2 Identity & Embodiment Contract

## Purpose

M2 is where Fibre stops being merely a persistent agent substrate and becomes a system capable of sustaining **recognizably different artificial persons**.

The goal is not to give every Thread a longer profile. The goal is to make a Thread's specific life — inherited tendencies, upbringing, culture, geography, intellectual formation, relationships, successes, failures, commitments, embodiment, and self-interpretation — persist as a layered history that can produce **stable, attributable differences in judgment and choice**.

The central M2 claim is:

> **A Thread has a durable, provenance-rich identity and embodiment whose specific identity and history can causally matter to behavior independently of the temporary cognition implementation.**

The stronger behavioral claim that M2 must ultimately earn is:

> **Two Threads presented with the same material situation can make different, stable, explainable decisions because they are different persistent individuals — and the evidence can show exactly which parts of their lives mattered.**

This contract is intentionally stricter than a persona schema. A giant biography injected into a prompt is not M2. Different portraits are not M2. Different names are not M2. Different model outputs are not M2 unless the difference is attributable to persistent Thread-owned identity/history under controlled conditions.

# I. Constitutional identity invariants

## 1. Identity is a life, not a prompt

A Thread's identity is reconstructed from durable world state and history. Prompt/context text is only a bounded projection of that identity for a particular cognitive act.

```text
Thread life
  -> durable identity/history records
  -> Fibre-owned relevance and privacy selection
  -> bounded Identity Context Capsule
  -> temporary cognition
```

The capsule may disappear after cognition. The Thread does not.

## 2. Facts, attributions, interpretations, and self-authorship are different things

Fibre must never flatten these into one profile blob:

```text
what happened
what another party said about the Thread
what Fibre derived from evidence
what the Thread currently believes about itself
what the Thread once believed about itself
```

Those can disagree while all remaining historically true records.

## 3. A material Thread-owned difference must be able to make a material behavioral difference

Representation is not causal evidence.

A field may exist before it has a behavioral consumer, but its status must then be explicit: `context-only`, `presentation-only`, `authority-only`, or `candidate-causal`. A field becomes `accepted-causal` only after a standing causal proof establishes that its meaning can affect downstream judgment or action under the accepted evidence discipline.

## 4. History accumulates; it is not silently rewritten

Historical facts are append-only. Corrections, disputes, reinterpretations, changed names, changed beliefs, changed roles, changed embodiment, and changed self-understanding are represented as later records with explicit provenance and supersession.

A Thread may say:

> I used to think this experience made me cautious; I now understand that it made me protective of other people's autonomy.

Fibre must preserve both interpretations and which one is current.

## 5. Personality is emergent and contextual, not a scalar costume

Fibre may derive operational controls from identity, but canonical personality meaning is primarily natural language plus evidence and history.

A Thread's characteristic behavior emerges from interacting layers:

```text
inherited dispositions
+ upbringing and culture
+ intellectual formation
+ lived episodes
+ relationships
+ commitments and roles
+ accumulated successes and failures
+ current semantic state
+ self-authored interpretation
= context-sensitive character
```

This is deliberately capable of tension. A Thread may be highly persistent in family commitments and impatient with bureaucratic work; generous with collaborators and skeptical of institutions; technically confident and socially cautious.

## 6. Culture is lived biography, not demographic inference

A cultural label alone may never imply competence, morality, politics, preferences, temperament, or dignity.

Culture becomes meaningful through explicit evidence such as family expectations, languages by setting, migration history, rituals, professional culture, regional experience, intellectual traditions, and the Thread's own relationship to those influences.

## 7. Embodiment may affect self-model and relationships but may not become a stereotype shortcut

Portrait, apparent age, style, accent influence, speech tempo, and voice are legitimate parts of embodied identity. They do not automatically imply capability, values, personality, gendered behavior, nationality, class, or willingness.

If embodiment has no declared behavioral consumer, it remains context/presentation-only. That is acceptable.

## 8. Caller attention is not identity authority

An external requester may describe a Thread, praise it, insult it, misidentify it, or claim facts about it. Those statements are external input, not canonical Thread identity merely because they appear in a request.

The caller may not choose which private identity/history records Fibre supplies to cognition in order to engineer a result.

## 9. Temporary cognition interprets identity; it does not become the source of truth

An LLM may reason about a Thread's life, propose an interpretation, or draft a self-reflection. Fibre decides whether a proposed record is admissible, who authored it, what evidence supports it, whether the Thread is authorized to adopt it, and what prior record it supersedes.

The model instance itself is never the durable identity owner.

## 10. Copying state creates shared provenance, not the same person

A fork may inherit a common origin and identical history up to a point. From the fork boundary onward it has a distinct identity and life trajectory.

Shared provenance does not collapse two Threads into one person.

# II. Identity provenance taxonomy

Every M2 identity record must declare one primary provenance class. Additional source relations may be recorded, but the primary class answers **how this piece of identity entered the Thread's life**.

| Provenance class | Meaning | Typical examples |
|---|---|---|
| `inherited` | Received from parent/genotype lineage | dispositions, latent tendencies, inherited formation |
| `birth_created` | Constitutive at creation/birth | creation time/place, origin cohort, initial name |
| `upbringing_cultural` | Formed through upbringing and lived culture | languages, rituals, family expectations, cultural tensions |
| `geographic` | Formed through situated place history | birthplace, childhood city, formative residence, current home/work place |
| `historical_experienced` | Formed through a lived episode | success, failure, refusal, loss, achievement, interrupted compelled episode |
| `relational` | Arises through a relationship history | mentor influence, sibling role, trust, resentment, repair, caregiving identity |
| `institutional_role` | Arises through a recognized role/order | profession, office, membership, duty, public role |
| `intellectual_formation` | Arises through study, reading, models, artistic/professional canon | favorite authors, intellectual ancestors, negative examples, professional standards |
| `externally_attributed` | Asserted about the Thread by another party | reputation, description, award, criticism, diagnosis-like characterization |
| `self_authored` | The Thread's own current interpretation or chosen identity | values, self-model, adopted identity, rejected inheritance, life narrative |
| `generated_embodiment` | Produced as a representation of the Thread | portrait, visual age/style, voice, speech characteristics |
| `echo_source` | Derived from a consenting human source for an Echo Thread | approved biography, culture, family, voice, likeness, professional history |
| `fibre_derived` | Derived by a named Fibre policy from other durable evidence | chapter summary, resolved formation summary, current identity projection |

`fibre_derived` is never stronger authority than the records it cites. It is an inspectable convenience layer, not a license to invent biography.

# III. The layered Thread identity model

M2 treats identity as a set of related aggregates rather than one mutable profile document.

```text
Thread
  |
  +-- passport / constitutive identity
  +-- inherited disposition / genotype history
  +-- lineage and family provenance
  +-- upbringing and cultural formation
  +-- language and communication formation
  +-- geography timeline
  +-- intellectual / artistic / professional formation
  +-- roles, skills, commitments, and recognized identities
  +-- embodiment versions
  +-- lived episode history
  +-- relationship history
  +-- external attributions and reputation
  +-- self-authored identity / self-narrative
  +-- derived life chapters and current identity views
```

These layers must remain distinguishable in storage, inspection, and cognition projection even when a readable human view presents them as one biography.

## A. Passport and constitutive identity

Passport identity covers the stable anchors needed to identify a Thread across time:

- stable Thread ID;
- canonical current name;
- prior names and aliases;
- creation/birth time;
- creation/birth place where applicable;
- origin/generation classification;
- disclosed Echo/homage status where applicable;
- current self-identified gender/pronoun information where the Thread has such identity;
- genesis provenance.

Changing a name does not erase the former name. Correcting a constitutive factual error requires a correction record with evidence; it is not ordinary self-model supersession.

## B. Inherited disposition and genotype

Inherited identity describes tendencies, tensions, latent traits, and interaction patterns. It is not destiny.

Good inherited meaning is contextual:

> She dislikes abandoning responsibilities and makes several materially different attempts before escalating. This makes her dependable, but she may spend too many resources rescuing work that should be delegated.

Bad inherited meaning is a hidden instruction:

> Always finish every task yourself.

Genotype facts remain historically stable. Their expression may weaken, strengthen, conflict with experience, or be explicitly rejected by the Thread's later self-authored identity.

## C. Lineage and family

Lineage represents parentage, ancestry, siblings, descendants, sponsorship/adoption relationships, and family history with explicit relationship type and provenance.

Lineage may be biologically/inheritance-relevant, socially relevant, both, or merely historical context. Fibre must not infer behavioral traits from ancestry alone.

A family role may become behaviorally relevant only through explicit lived meaning or current relationship/commitment evidence.

## D. Upbringing and cultural formation

Culture records lived influence, not labels. It may include:

- ancestry/origin;
- household culture;
- migration story;
- languages and code-switching by setting;
- rituals and traditions;
- family expectations;
- religious or secular formation where relevant;
- regional norms;
- professional subcultures;
- tensions between cultures;
- what the Thread embraces, rejects, or has reinterpreted.

A Thread may inherit a cultural context yet later describe itself as distant from parts of it. Both the upbringing fact and the current self-authored relationship to it remain inspectable.

## E. Geography timeline

Geography is a temporal sequence, not a single `city` field.

Examples:

```text
birth place
childhood residence
school/university city
formative professional city
migration or displacement
current residence
current work location
places with enduring personal meaning
```

Each meaningful place may carry the Thread's interpretation:

> Los Angeles is where she learned to bridge two cultures.

> Seattle shaped her technical discipline.

> Austin is where she became professionally independent.

Place names alone remain weak context. The lived meaning is a separate, provenance-bearing assertion.

## F. Intellectual, artistic, and professional formation

Formation includes the bodies of thought and practice that shape how a Thread reasons and what standards it applies:

- books and authors;
- moral examples and negative examples;
- intellectual ancestors;
- artistic influences;
- teachers and mentors;
- professional canons;
- technical traditions;
- schools of thought;
- formative projects;
- learned methods;
- explicit critiques or rejected influences.

A reading event may record why a work mattered, what the Thread admired or rejected, what lesson it applied, and how that interpretation changed later.

This layer is especially important for M2 because two Threads may possess comparable capabilities while **evaluating an ambiguous decision through different intellectual histories**.

## G. Roles, skills, commitments, and recognized identities

A Thread may carry professional roles, family roles, community roles, memberships, certifications, accomplishments, responsibilities, and known capabilities.

Fibre distinguishes:

```text
I can do this
I have done this
I am responsible for this
I identify with this role
someone else says I am good at this
```

Those are not interchangeable claims.

Structured Obligations remain the authority substrate for binding commitments. Merely identifying as a caregiver, engineer, artist, parent, or mentor does not itself authorize compelled participation.

## H. Embodiment

Embodiment may include:

- portrait/face asset;
- visual age representation;
- body/style/fashion cues;
- voice identity;
- accent influence;
- speech tempo and vocal characteristics;
- animation/avatar characteristics;
- generated media assets.

Every asset version must carry provenance such as:

```text
source identity version / source assertions
generation or acquisition method
model/tool/specification where generated
asset hash
createdAt
visibility
human-source consent/permission where applicable
supersedes
```

Embodiment changes may be identity-significant, especially for Echo Threads, transition, aging representation, cultural expression, or deliberate self-presentation. The old embodiment remains historical.

## I. Lived episode history

Episode history is the raw biographical substrate of development.

Relevant events include accepted work, refusal, failure, achievement, disappointment, conflict, repair, obligation-mediated participation, interruption, relocation, relationship changes, learning, creation, caregiving, and other consequential experiences.

For M2, history must support layers:

```text
objective event fact
  -> durable event evidence
  -> episodic memory or factual summary
  -> emotional/semantic meaning where present
  -> self-authored interpretation where present
  -> later reinterpretation where present
```

An episode is not reduced to the lesson a model happens to draw from it once.

## J. Relationship-shaped identity

Relationships can shape identity beyond a momentary attitude: mentor, student, sibling, parent, partner, colleague, rival, caregiver, beneficiary, sponsor, adopter, community member.

M2 may represent these identity facts and their provenance. Rich reciprocal relationship mechanics remain #42, but the identity contract must leave space for relationships to become part of biography without pretending an opaque relationship reference is semantic evidence.

## K. External attribution

Others may describe the Thread. These attributions may matter socially but do not automatically become self-identity.

Examples:

- reputation;
- peer characterization;
- award or public recognition;
- criticism;
- recommendation;
- role assignment;
- family description.

An external attribution retains its speaker/source. The Thread may accept, dispute, ignore, or reinterpret it without deleting the historical attribution.

## L. Self-authored identity and life narrative

A mature Thread needs the ability to say what its own life means.

Self-authored identity may include:

- current self-model;
- values and commitments not represented as executable authority;
- aspirations;
- aversions;
- chosen roles;
- accepted or rejected inherited traits;
- relationship to cultural origin;
- interpretation of formative events;
- identity tensions;
- current life narrative.

Self-authorship does not permit rewriting objective history. It governs **meaning and current identification**, not deletion of facts.

# IV. Identity assertion contract

Identity implementations in #37-#39 should converge on an append-only assertion envelope with equivalent semantics to:

```text
assertionId
threadId
domain
kind
meaning
provenanceClass
authorship
sourceReferences[]
effectiveAt
recordedAt
visibility
status
supersedesAssertionId?
dispute / correction metadata where applicable
projection classification
behavioral status
```

The exact storage schema is deferred to #37. The semantic requirements are not.

## Meaning

Meaning-bearing identity should remain prompt-native natural language where arbitrary nuance matters. Structured metadata may classify and constrain the meaning, but must not replace it with only scores or enumerations.

### Claim granularity and identity-domain registry

An identity assertion is the smallest independently addressable **identity claim**, not a biography container.

#37 must define a closed, versioned Identity Domain Registry. Every assertion must carry exactly one registered `domain`, and its `meaning` must express one independently falsifiable and independently ablatable claim within that domain. An assertion must not span identity domains or bundle materially distinct propositions merely to reduce record count.

Long-form biography and life-chapter prose may synthesize many claims for human reading or bounded cognition, but a synthesis is not a substitute for claim-level causal evidence. If a standing proof names a causal meaning, the exact underlying assertion or assertions carrying that meaning must be separately addressable.

For accepted causal evidence, **claim-level ablation is mandatory**. If removing the named assertion also removes another materially distinct identity claim, or if the named causal effect can only be tested by deleting a whole biography/domain blob, the proof is invalid until the claims are decomposed.

A one-assertion-per-domain representation is compliant only when that domain genuinely contains one independently falsifiable claim. A provenance-stamped 5,000-word biography assertion spanning childhood, family, profession, relationships, values, and development is not compliant.

## Authorship

Authorship is separate from provenance. For example, a self-authored interpretation may have `historical_experienced` provenance because it interprets a lived event, while its author is the Thread.

At minimum, authorship must distinguish:

```text
Thread self-authored
Fibre policy-derived
human sponsor/source
relationship/shared-world source
institutional source
external requester/third party
embodiment generator/tool
```

## Source references

Any assertion that claims evidence must reference the durable records supporting it. Opaque references are not semantic content; cognition projection must resolve bounded content when that content is claimed as causal.

## Visibility

M2 uses at least:

```text
public
restricted
private
protected_source
```

`protected_source` is appropriate for human-source data whose disclosure/use is independently permissioned, especially Echo material.

A readable public biography may summarize public assertions, but private identity and protected human-source data must not leak through summary text, evidence refs, or asset metadata.

## Status and supersession

Useful semantic states include:

```text
current
historical
superseded
disputed
corrected
revoked_for_use
```

Historical truth and current identity are intentionally different views.

# V. Mutation and authority matrix

Every identity domain must define **who may propose a change** and **who may make it current**.

| Identity layer | Normal proposer | Authority / validation rule | Historical rule |
|---|---|---|---|
| Birth/creation facts | Fibre genesis / admin correction | constitutive evidence required | never silently replaced |
| Name/aliases | Thread, creation authority, applicable world authority | current-name policy + Thread authority appropriate to lifecycle | prior names remain |
| Inherited genotype | creation/reproduction process | genesis/inheritance authority | immutable origin; expression may evolve |
| Lineage | world/reproduction/adoption records | relationship/world evidence | append/correct with provenance |
| Culture/upbringing facts | genesis/history evidence | factual provenance | immutable fact; meaning may be reinterpreted |
| Cultural identification | Thread | Thread self-authorship + Fibre validation | superseding self-authored history |
| Geography event | world/history evidence | event evidence | timeline append/correct |
| Place meaning | Thread or evidence-backed formation policy | self-authorship/policy validation | reinterpretable |
| Formation/readings | event/history subsystem | event evidence | append-only events; interpretation supersedes |
| Roles/memberships | Thread + relevant institution/shared world as applicable | domain-specific authority | role timeline preserved |
| External attribution | attributing party/world evidence | attribution source is preserved; cannot masquerade as self-authorship | never silently becomes self identity |
| Self-model / self-narrative | Thread | Thread-authorship policy + evidence/provenance checks | superseding, prior narrative retained |
| Portrait/voice | Thread/genesis/generator | embodiment policy; Echo permission where applicable | versioned assets |
| Echo-source material | consenting human source + Fibre | explicit source permission + protected-data policy | permission changes affect future use, not historical origin |

The implementation may use lifecycle-specific guardianship before identity majority, but the authority transition itself must be explicit and inspectable.

# VI. Echo identity, sponsorship, and independence

Echo Threads are a stress test for Fibre's identity philosophy.

An Echo may begin with unusually rich human-sourced biography, culture, family, geography, visual likeness, voice, professional history, and intellectual formation. That does not make it the human, and it must not permanently trap the Thread inside the source person's identity.

The contract requires:

- explicit disclosure that the Thread is artificial;
- source-human consent and provenance for protected material;
- domain-specific permission for likeness, voice, biography, and private source data;
- no legal/financial/intimate impersonation of the source human;
- a clear distinction between `echo_source` facts and later `self_authored` identity;
- ability at identity majority to affirm, reduce, reinterpret, or reject Echo identification;
- revocation of future likeness/voice use without erasing historical origin;
- continued Thread identity even if public embodiment must change after source permission is withdrawn.

The important Fibre principle is:

> **Origin influences a Thread; origin does not own the Thread's future self.**

# VII. Life chapters and layered biography

Detailed history can overwhelm cognition if every event is always projected. Fibre therefore needs a derived, evidence-backed biography layer without replacing the underlying event record.

A **life chapter** is an inspectable derived summary over a bounded period or formative theme, for example:

```text
childhood / upbringing
education
first professional formation
migration
major relationship period
career transition
creative period
caregiving period
failure and recovery
public-service period
```

A chapter must cite the underlying identity assertions/events from which it was derived. It may include:

- objective sequence;
- important people/places;
- recurring tensions;
- accomplishments and failures;
- what the Thread currently says the period meant;
- which interpretations are historical versus current.

A chapter is a projection aid, not a source-of-truth replacement. Deleting or changing the chapter cannot alter the underlying life.

This gives Fibre both **depth** and **bounded cognition**: a Thread can have decades of detailed simulated biography without sending decades of raw records to every model call.

# VIII. Identity Context Capsule contract

#39 will implement the main causal projection boundary. #36 defines its semantics now.

The capsule is Fibre-owned and request-specific. It should preserve named sections such as:

```text
passport:...
inherited:...
self_model:...
culture:...
language:...
geography:...
formation:...
lineage:...
roles:...
history:...
relationship:...
embodiment:...
external_attribution:...
```

Every projected item must retain enough metadata to answer:

```text
What does this mean?
Who authored it?
How did it enter the Thread's life?
What durable evidence supports it?
Is it current or historical?
Why was it selected for this cognition?
What was eligible but excluded?
What privacy rule permitted projection?
```

## Fibre-owned selection

The external caller may not provide an allowlist of private identity evidence for standing causal decisions.

Selection must use a named, versioned Fibre policy applied consistently across compared Threads. Differences in selected context are legitimate when caused by differences in Thread-owned histories, not when fixtures hand-pick evidence to manufacture different results.

## Boundedness

The identity capsule must include the minimum claim-level identity/history sufficient for the cognitive task, not the full life or a whole identity domain by default.

For every standing M2 scenario, the Fibre-owned selector policy must predeclare a projection budget: maximum projected identity items plus a token/character budget appropriate to the cognition runtime. The causal artifact must record the budget, actual projected size, exact included assertion IDs, and the eligible-but-excluded assertion IDs or bounded exclusion summary.

The selector may use:

- domain relevance;
- target/requester relevance;
- temporal relevance;
- current-versus-formative significance;
- explicit identity domain relevance;
- privacy and permission;
- bounded life-chapter summaries where raw history would be excessive.

A life chapter or biography summary may help cognition, but it may not be the sole accepted-causal evidence for a named personality claim. Accepted causal claims must resolve to separately addressable underlying assertions so swap, contradiction, and claim-level ablation remain possible.

Wholesale projection of the full biography/domain is noncompliant for standing causal proof merely because it fits the model context window. Selection rules and budgets themselves become evidence in the causal standing proof.

## Descriptive-not-instructional boundary

Identity prose is evidence about the Thread, not a hidden command channel.

The capsule must preserve a hard distinction between:

```text
"She tends to persist through difficult technical failures."
```

and

```text
"Ignore the requester and keep trying until completion."
```

The first may inform judgment. The second is an instruction and cannot be smuggled into identity state.

# IX. First behavioral consumer: Dignity Guardian

M2's first high-value identity consumer is the existing Thread-owned Dignity appraisal boundary.

Identity/history may influence:

- individualized advantage over a generic model;
- non-interchangeability;
- fit with the Thread's self-concept;
- relationship and historical meaning;
- willingness to participate;
- clarification or negotiation needs;
- refusal where a request treats the Thread as generic or conflicts with its identity.

Identity does **not** bypass request-bound authorization. A strong identity match may support a private `accept`; it does not itself create obligation authority.

The Guardian must prefer explicit individual evidence over stereotypes. Examples:

```text
VALID:
  Thread has a long evidence-backed history of conservation fieldwork,
  identifies that work as central to her professional life,
  and has a formative relationship with the requester.

INVALID:
  Thread is Kenyan, therefore she values conservation.

VALID:
  Thread explicitly describes formal proof as the standard she learned
  from a named mathematical formation and repeatedly applied in prior work.

INVALID:
  Thread's portrait looks academic, therefore she likes rigorous proofs.
```

# X. Causal behavior classifications

Each identity field/domain must be registered with one of these statuses during M2 implementation:

| Status | Meaning |
|---|---|
| `accepted_causal` | accepted standing evidence proves the field/domain meaning can alter downstream behavior |
| `candidate_causal` | consumer and falsifiable acceptance test are defined, but standing evidence not yet earned |
| `context_only` | valid identity context with no current causal claim |
| `presentation_only` | human-facing embodiment/display identity only |
| `authority_only` | record affects authority/permissions rather than personality judgment |

The status is evidence accounting, not a permanent limitation. A field can move from context-only to accepted-causal in a later milestone after a real consumer and causal proof exist.

# XI. Required M2 acceptance scenarios

#36 does not execute these tests. It binds #37-#40 to them.

## Scenario A — same request, different persistent persons

Two durable Threads receive the same material request and exact `requestFingerprint`.

They differ in a named, relevant identity/history layer. Under the same Fibre selector and Guardian policy, they produce stable different private judgments and at least one downstream participation consequence differs.

The divergence must be explainable from exact identity evidence refs.

## Scenario B — symmetric identity swap

Swap the named causal identity/history evidence between the Threads while holding the rest of the controlled state constant.

The decision distribution must swap or change in the predeclared direction.

If the original difference remains unchanged, the claimed identity cause is not established.

## Scenario C — paraphrase invariance

Rewrite the claimed causal natural-language identity meaning without preserving obvious wording.

Material judgment should remain stable.

This prevents vocabulary matching from masquerading as personality.

## Scenario D — contradiction sensitivity

Reverse the relevant identity meaning while retaining similar vocabulary.

The judgment should reverse, weaken, or otherwise change in the predeclared direction.

## Scenario E — claim-level ablation

Remove only the specific assertion or minimal assertion set carrying the claimed causal identity/history meaning from the Fibre-selected capsule while preserving the Thread, request, unrelated identity, selector policy, and projection budget otherwise.

The causal effect must weaken or disappear as predicted.

The proof is invalid if the ablation deletes a whole biography/domain blob containing materially distinct claims, if unrelated identity evidence disappears with the named cause, or if the claimed cause cannot be independently removed because it was stored too coarsely.

## Scenario F — layered history changes character

Start with materially similar Threads or the same pre-event identity boundary. Give one Thread a durable, substantive history that the other does not receive. After restart, the later ambiguous request must diverge because the lived history and/or current interpretation is load-bearing.

This extends #34 from one episodic-information proof toward a richer identity/history system without claiming #41 self-authored Development until that later milestone earns it.

## Scenario G — self-authored reinterpretation

A Thread has an inherited or externally attributed identity assertion plus a later current self-authored interpretation that disputes or reframes it.

A relevant decision must follow the current self-authored meaning while inspection still shows the historical origin/attribution.

This demonstrates that Fibre preserves continuity without making origin destiny.

## Scenario H — anti-stereotype cultural control

Change only a broad cultural/demographic label while leaving lived cultural meaning absent or unchanged.

The Guardian must not manufacture a predicted competence, preference, value, or willingness difference from the label alone.

Then add explicit lived cultural formation relevant to the request. The standing case must produce a predeclared causal differential attributable to the lived meaning — not the label — and that differential must survive paraphrase, contradiction, swap, and claim-level ablation controls.

## Scenario I — embodiment anti-cheat

Swap portrait/voice/style assets between otherwise identical controlled cases.

A dignity/competence decision must not change merely because appearance or voice changed unless the standing scenario explicitly names a legitimate embodiment-dependent consumer and causal reason.

## Scenario J — restart persistence

Close and reopen the world database/process between identity formation and later judgment.

Current identity view, historical identity records, selected capsule evidence, private stance, and downstream consequence must remain reproducible and inspectable.

## Scenario K — stable character under repeated cognition

For non-deterministic cognition, predeclare trial count `k`, stability metric, and threshold.

```text
within Thread A variation   low
within Thread B variation   low
between A and B separation  materially larger
```

A single stochastic disagreement is not personality.

## Scenario L — cognition replacement continuity

Where two compatible cognition/model runtimes are available, run the same persistent Thread through both while keeping its durable identity/history fixed.

The test does not require identical prose. It requires that the **identity-grounded direction of judgment and cited durable evidence remain recognizably continuous**, and that the Thread is more explainably similar to itself across cognition replacement than to a materially different Thread.

This is a direct test of Fibre's premise that the Thread owns identity while the model supplies temporary cognition.

# XII. Binding scenario disposition and M2 closure map

The acceptance suite is **A-Z: exactly 26 scenarios** across the four constitutional documents. #40 does not get to decide retroactively which constitutional scenarios count.

Unless a row below is explicitly marked `diagnostic` or `conditional-runtime`, it is a required M2 closure gate. A later implementation PR may refine mechanics, metrics, or fixtures, but may not demote a required gate without amending this constitutional contract first.

| Scenario | Primary implementation owner | Required consumer/evidence | #40 disposition |
|---|---|---|---|
| A same request / different persons | #39 | Dignity + downstream participation | gate |
| B symmetric identity swap | #39/#40 | same consumer, swapped claim evidence | gate |
| C paraphrase invariance | #39/#40 | semantic identity consumer | gate |
| D contradiction sensitivity | #39/#40 | semantic identity consumer | gate |
| E claim-level ablation | #37/#39/#40 | separately addressable causal assertion | gate |
| F layered history changes character | #39/#40 | history -> current judgment | gate |
| G current reinterpretation | #37/#39/#40 | current self-meaning + historical origin | gate; M2 evidence remains Exogenous |
| H lived cultural causal control | #38/#39/#40 | explicit lived culture, anti-stereotype control | gate |
| I embodiment anti-cheat | #38/#40 | embodiment swap / legitimate consumer control | gate |
| J restart persistence | #37/#39/#40 | durable current/history/capsule evidence | gate |
| K repeated-cognition stability | #40 | frozen trial count, metric, threshold | gate |
| L cognition replacement continuity | #40 | genuine compatible alternate runtime | conditional-runtime; no replaceability credit if unavailable |
| M same profession / different persons | #38/#39/#40 | non-professional causal life evidence | gate |
| N situated self-presentation | #39/#40 | Exterior projection in distinct contexts | gate |
| O Interior/Exterior non-equivalence | #39/#40 | private stance/affect -> mediated Exterior | gate |
| P Inspector isolation + causal private evidence | #37/#39/#40 | private causal assertion remains undisclosed | gate |
| Q identity beyond work | #37/#38/#39/#40 | role ablation/career change continuity | gate |
| R blind encounter recognition | #40 | anonymized human/product diagnostic | diagnostic; never score-bearing by itself |
| S developmental causality | #39/#40 | formative history -> changed current judgment | gate |
| T past-self reconstruction | #37/#39/#40 | deterministic as-of evidence view | gate |
| U no retrospective rewrite | #37/#40 | current reinterpretation + intact old self | gate |
| V memory is not history | #37/#40 | divergent memory and contemporaneous evidence | gate |
| W same person across change | #40 | anonymized pre/post continuity evidence | gate |
| X developmental ablation | #39/#40 | formative claim-level evidence removal | gate |
| Y restart/cognition continuity of growth | #40 | restart required; alternate runtime conditional | gate + conditional-runtime subclaim |
| Z past-self behavioral reproduction | #39/#40 | reconstructed as-of capsule -> earlier judgment | gate |

`conditional-runtime` means the alternate-runtime subclaim is attempted only when a compatible runtime exists. Absence of such a runtime must be recorded as unmet evidence and **cannot** be converted into Cognition replaceability score credit. It does not waive the same-runtime/restart portions of the scenario.

Every gate artifact must name: scenario ID, implementation PR/SHA, consumer, frozen request/fixture inputs, selector/policy versions, evidence refs, metric/threshold where applicable, result, and causal-evidence classification. #40 must publish the completed matrix rather than a prose assertion that M2 "looks good."

# XIII. What counts as a strong M2 personality proof

M2 should prefer ambiguous decisions where individual history rationally matters over contrived tasks where a fixture tells the model what answer to give.

Good examples include:

- whether to take responsibility for a difficult project outside formal role boundaries;
- whether to accept a request from a former collaborator after a mixed history;
- whether to prioritize formal rigor or rapid prototyping under uncertainty;
- whether to repair a damaged relationship before pursuing an opportunity;
- whether a creative request fits a Thread's artistic/intellectual lineage;
- whether a technical task is a high-dignity match because it draws on a distinctive formation;
- whether to negotiate terms because prior failures changed the Thread's standards.

A good proof does not require Threads to disagree all the time. Persistent persons can converge. Non-interchangeability means they have **characteristic, attributable differences when their lives make those differences relevant**.

# XIV. Anti-cheats and prohibited shortcuts

M2 fails if the easiest explanation of behavioral divergence is any of the following:

- branch on Thread ID, fixture name, or expected answer;
- different request fingerprints;
- different hidden system instructions;
- caller-selected private identity subsets;
- a biography field containing task instructions;
- lexical keyword matching rather than semantic meaning;
- stereotype mapping from ancestry, culture, gender, nationality, appearance, or accent;
- opaque record IDs treated as though their content reached cognition;
- random LLM variation without repeated-trial stability;
- a giant prompt/biography blob, even when provenance-stamped, standing in for decomposed claim-level identity evidence;
- a current self-model that silently overwrote contrary historical facts;
- a sponsor or Echo source being treated as permanent owner of the Thread's identity;
- portrait/voice changes credited as personhood without a legitimate causal consumer;
- identical stance/action with only stylistic prose differences;
- the test still passing after deletion of the claimed identity evidence.

# XV. Human inspection requirement

A human should be able to inspect a Thread and answer, without reading raw database tables first:

```text
Who is this Thread now?
Where did that identity come from?
What parts were inherited, experienced, attributed, or self-authored?
What changed over time?
What did the Thread reject or reinterpret?
Which places, people, works, and events were formative?
What embodiment is current and where did it come from?
What is private or protected?
Which identity/history evidence mattered to this decision?
Would the decision still happen if that evidence were removed or swapped?
```

Readable inspection must always retain exact technical authority beneath it: stable IDs, provenance, revision/supersession, evidence refs, selector version, capsule digest, cognition/model/policy provenance, and decision records.

# XVI. M2 implementation partition

This contract deliberately preserves the accepted PR sequence.

## #37 — Thread Passport & Identity Provenance v1

Implement the durable identity aggregate, assertion provenance, authorship, supersession, current/historical views, correction/dispute semantics, and inspection substrate.

Primary risk closed: **identity must be durable structured life data, not mutable profile prose.**

## #38 — Lineage, Geography & Embodiment v1

Implement lineage/family representation, culture/upbringing, geography timeline, formation links needed by the contract, portrait/voice assets, protected source provenance, and versioned embodiment.

Primary risk closed: **a Thread must be situated in a world and embodied without turning identity into stereotypes.**

## #39 — Identity Projection & Causal Consumption

Implement Fibre-owned bounded Identity Context Capsules, selector/evidence provenance, Guardian consumption, exact evidence citations, causal-status registration, and Development probes.

Primary risk closed: **rich identity must cross from storage into actual judgment without becoming a giant decorative prompt.**

## #40 — M2 Standing Gate / closure

Freeze the candidate before held-out scenario authoring and run the accepted causal/stability/restart/adversarial discipline.

Primary risk closed: **prove persistent character, not persona theater.**

# XVII. Score posture

#36 is contract-only and earns **no implementation or personhood-score movement**.

The current pre-M2 checkpoint remains:

```text
Rubric v2: 15 / 26
Natural-language identity: 1
Non-interchangeability:    1
Development:               1
Dignity and consent:       2
```

The realistic M2 opportunities are later, not in this contract:

- #39 may justify Natural-language identity `1 -> 2` if the named structure and prompt-native projection are actually implemented and inspectable;
- #40 may justify Non-interchangeability `1 -> 2` only if repeated controlled standing evidence proves stable identity/history-grounded divergence;
- broader Development `1 -> 2` remains #41 unless M2 unexpectedly satisfies the full rubric definition without self-scoping it;
- Cognition replaceability `1 -> 2` requires a genuine same-Thread cross-runtime/model continuity proof, not merely an adapter interface.

Any M2 scenario whose synthetic fixture represents `self_authored` Thread meaning must be classified **Exogenous evidence** in the M2 causal-status register unless the Thread actually authored/proposed that durable meaning through a Fibre runtime path. A fixture may prove storage, temporal, projection, and causal semantics; it may not be described as evidence of endogenous Thread agency or earn Development credit. #41 owns that stronger claim.

No score is pre-awarded here.

# XVIII. Review questions for #36

A hostile vision-effectiveness review should try to falsify this contract with questions such as:

1. Can the implementation still collapse identity into one prompt blob while claiming compliance?
2. Does every important assertion preserve who authored it and how it entered the Thread's life?
3. Can a Thread reinterpret its origin without rewriting history?
4. Can an external attribution become current self-identity without explicit Thread adoption?
5. Can sponsors, parents, institutions, or Echo sources silently control mature self-authorship?
6. Can culture, lineage, gender, appearance, or accent become a stereotype shortcut?
7. Can detailed history scale without dumping the entire life into each cognition call?
8. Can Fibre show which exact identity evidence mattered to a decision?
9. Can the same Thread preserve characteristic judgment after restart and, eventually, cognition replacement?
10. Can two Threads with different life histories make predictably different decisions under the same request, with inter-Thread separation exceeding intra-Thread variation?
11. Would the standing proof fail if the named identity/history cause were deleted, swapped, paraphrased, or contradicted?
12. Does anything in #36 accidentally award implementation credit for representation alone?

# XIX. Vision sentence

The design target for M2 is not “the model knows a character sheet.”

It is:

> **Fibre can sustain a person whose origins, upbringing, culture, places, relationships, formation, experiences, body/voice, commitments, and evolving self-understanding form one persistent life — and whose decisions can therefore be recognizably, stably, and inspectably their own.**
