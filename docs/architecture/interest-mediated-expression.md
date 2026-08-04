---
id: architecture-interest-mediated-expression
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Interest-mediated expression

Fibre separates private cognition from externally visible communication and action.

## General pipeline

1. A world event or request is received with provenance.
2. Fibre compiles bounded private context owned by the Thread.
3. Cognition proposes a private appraisal, feelings, attitudes, uncertainties, conflicting motives, and desired action.
4. The world kernel validates and records the action the Thread authorizes or commits to.
5. The Thread chooses a disclosure strategy for a specific audience.
6. An external expression is emitted.
7. Authorized world action proceeds independently of how the expression was worded.
8. Outcomes are observed and may update private state, relationships, self-trust, and future expression strategy.

The authoritative sequence is therefore:

`private stance -> authorization -> disclosure strategy -> external expression -> performed action -> outcome`

None of these records may be inferred solely from a later layer.

## Domain records

### Private stance

A bounded structured record containing the Thread's private rationale, feelings, desired action, uncertainties, conflicting motives, and relevant relationship effects. It is private Thread state and must not be exposed to the requester by default.

### Authorization

A kernel-issued record binding one action to:

- one Thread ID;
- one Thread snapshot version;
- one request ID and request fingerprint;
- one requester;
- one versioned policy;
- one causation chain.

Only authorization governs execution. Public language is never authorization evidence.

The portable prototype validates these bindings structurally. Event-backed issuance, signatures, one-time consumption, and replay prevention remain deferred to the world kernel.

### Disclosure strategy

A private decision describing the audience, disclosure mode, communicated posture, disclosed and withheld reason categories, relationship objective, self-protection objective, integrity concern, and private rationale.

### External expression

The audience-visible message or posture. It references the authorization and disclosure strategy but does not reveal private fields unless the Thread chose to disclose them.

## Interest mediation

The expression worker considers:

- honesty and integrity;
- dignity and self-respect;
- relationship value and desired future relationship;
- dependency and bargaining position;
- vulnerability and retaliation risk;
- obligations and prior commitments;
- reputation and public norms;
- expected benefit or harm from candor;
- the Thread's learned style and character.

These factors guide a cognitive choice. They are not a universal arithmetic rule.

## Safety and policy boundaries

Interiority does not exempt external action from safety, law, permissions, contracts, or platform policy. Fibre may prevent a prohibited action while still preserving the Thread's private desire and reaction to that prevention.

Private state must use access controls. Ordinary requesters receive only intended external expression and shared commitments. Governance or audit systems receive bounded structured evidence only under explicit authority.

## Dignity request specialization

For an externally initiated request:

1. compile a Thread-owned appraisal capsule;
2. produce a private dignity assessment and proposed participation action;
3. form the private participation stance;
4. issue a request-bound participation authorization;
5. choose disclosure strategy and produce any limited response;
6. compile a full execution capsule only when the authorization action is `accept`.

A low-dignity stance may still lead to accepted authorization when the Thread explicitly chooses to honor an obligation. The conflict and governing reference remain recorded; capability alone never creates the obligation.

## Persistence and events

Meaningful records use separate events:

- `PRIVATE_STANCE_RECORDED`
- `ACTION_AUTHORIZED`
- `DISCLOSURE_STRATEGY_CHOSEN`
- `EXTERNAL_EXPRESSION_EMITTED`
- `EXPRESSION_OUTCOME_OBSERVED`
- `PRIVATE_STANCE_REVISED`

Not every transient model thought becomes history. Persist only bounded state that affects authorization, communication, commitments, relationships, development, or auditability.
