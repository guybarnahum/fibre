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
2. Fibre compiles bounded private context owned by the Thread and records what was included and excluded.
3. Cognition proposes a private appraisal, evidence, feelings, attitudes, uncertainties, conflicting motives, and desired action.
4. The world kernel validates and records the action the Thread authorizes or commits to.
5. The Thread chooses a disclosure strategy for a specific audience.
6. An audience-visible expression is minted from that strategy without exposing restricted strategy metadata.
7. Authorized world action proceeds independently of how the expression was worded.
8. Outcomes are observed and may update private state, relationships, self-trust, and future expression strategy.

The authoritative sequence is therefore:

`private stance -> authorization -> disclosure strategy -> external expression -> performed action -> outcome`

None of these records may be inferred solely from a later layer.

## Domain records

### Private stance

A bounded structured record containing the Thread's private rationale, evidence references, feelings, desired action, uncertainties, conflicting motives, known alternatives, and relevant relationship effects. It is private Thread state and must not be exposed to the requester by default.

### Authorization

A kernel-issued record binding one action to:

- one Thread ID;
- one Thread snapshot version;
- one request ID and SHA-256 request digest;
- one requester;
- one versioned policy;
- one causation chain.

Only authorization governs execution. Public language is never authorization evidence.

The portable prototype validates content, Thread, snapshot, requester, policy, dignity band, evidence, rationale, and recorded-obligation bindings at issuance and again before execution. Event-backed origin proof, one-time consumption, and replay detection remain deferred to the world kernel.

### Disclosure strategy

A restricted private decision describing the audience, disclosure mode, communicated posture, disclosed and withheld reason categories, relationship objective, self-protection objective, integrity concern, and private rationale. It is bound to the exact private stance and authorization.

### External expression

The audience-visible message or posture. It references the authorization and disclosure strategy by ID but does not carry the strategy's disclosure mode, withheld reasons, or private rationale. The response-minting boundary independently rejects an acceptance posture when authorization is not acceptance.

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

1. compile a Thread-owned appraisal capsule with included and excluded context traces;
2. produce a private dignity assessment, evidence references, and proposed participation action;
3. form the private participation stance;
4. issue a request-bound participation authorization using a SHA-256 digest of all material request terms;
5. choose a stance-bound disclosure strategy and produce any limited response;
6. compile a full execution capsule only when the authorization action is `accept`.

A low-dignity stance may still lead to accepted authorization when the Thread explicitly chooses to honor a recorded obligation. In the portable prototype that reference must resolve to the Thread's own unresolved intentions. The conflict and governing reference remain recorded; capability alone never creates the obligation.

## Persistence and events

Meaningful records use separate events:

- `PRIVATE_STANCE_RECORDED`
- `ACTION_AUTHORIZED`
- `DISCLOSURE_STRATEGY_CHOSEN`
- `EXTERNAL_EXPRESSION_EMITTED`
- `EXPRESSION_OUTCOME_OBSERVED`
- `PRIVATE_STANCE_REVISED`

`DISCLOSURE_STRATEGY_CHOSEN` records restricted disclosure metadata. `EXTERNAL_EXPRESSION_EMITTED` records only audience-visible expression plus authorization and strategy references.

Not every transient model thought becomes history. Persist only bounded state that affects authorization, communication, commitments, relationships, development, or auditability.
