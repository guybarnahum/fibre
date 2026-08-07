---
id: validation-m1-disclosure-response-closure-plan
status: proposed
last-reviewed: 2026-08-06
canonical: false
issue: 1
---

# M1 disclosure and response closure plan

## Owner decision

On 2026-08-06, after completing the deterministic persistent-lifecycle proof and merging the human-readable Thread Editor, the owner chose to close the remaining interior-to-exterior gap before beginning M2 implementation.

This plan proposes a narrow M1 closure extension for two records that already exist as permanent Fibre concepts but are not yet persisted by the live world kernel:

1. restricted disclosure strategy;
2. audience-visible external participation response.

The earlier decision to defer these records remains an accurate description of the completed deterministic lifecycle proof. Acceptance of this closure plan will supersede that deferral for the final M1 boundary. M1 will not be declared fully closed until the implementation, restart proof, integrity evidence, and human inspection described below are complete.

### Adversarial-review owner decisions

The owner accepted the following clarifications on 2026-08-06 while reviewing Closure PR A:

1. **Outward posture may not contradict participation authority.** If the kernel authorizes `accept`, the audience-visible posture must be `accept`; it may not say `refuse`, `clarify`, `negotiate`, `delegate`, or `noncommittal`. For a non-accept authorization, the outward posture may either match the authorized action or use `noncommittal` to withhold the exact non-participation posture. A future capability for "compelled participation, outwardly withheld" must be represented by its own explicit record rather than by a false refusal.
2. **Disclosure mode is private strategy intent in M1.** Values such as `full_candor`, `tactful_candor`, `selective`, `strategic_ambiguity`, `evasive`, and `deceptive` describe the Thread's restricted disclosure intent. They are not a kernel honesty classifier and do not imply that every mode must produce distinct deterministic wording in M1. `full_candor` may reveal an obligation-mediated participation basis; other modes may currently map to the same bounded response dictionary.
3. **The audience-safety claim is narrow.** M1 proves that the new audience-response record does not newly copy private appraisal, private stance, withheld reasons, dignity details, or governing obligation references into the response payload. It does not claim that all underlying Thread state is confidential. In the current M1 model, unresolved-intention prose is already visible in the public Thread projection. Structured obligations must later distinguish public standing from private obligation terms.
4. **Non-execution authority is available only from stable Thread states.** A Thread may issue the standalone non-execution authorization only while `frozen` or `dormant`; an active or transitional runtime must not create a second participation decision for the same request attempt.
5. **M1 expression records are immutable.** One disclosure strategy and one audience response are recorded per request attempt. Future revision must use a superseding append-only record rather than updating the original record in place.

## Why this belongs before M2

A Thread's private stance, authorization, temporary cognition, outward expression, performed action, and durable life change are distinct records. The current kernel persists the first four lifecycle and authority layers through authorization and runtime, but it stops before the Thread decides what to reveal and before a safe audience-facing response is recorded.

Without these records, a caller or UI is tempted to infer expression from authorization, Actor output, freeze, or public events. That would collapse the interior–exterior boundary and could turn compulsion into apparent consent.

The closure must therefore prove not merely that Fibre can produce text, but that it can preserve the provenance and separation of:

```text
private stance
  -> participation authorization
  -> restricted disclosure strategy
  -> audience-visible response
  -> performed action, if any
  -> durable life change, if any
```

Public or audience-visible wording is never authoritative evidence of private motive, desire, consent, authorization, performed action, or task completion.

## Closure PR sequence

### Closure PR A — Persist disclosure and audience response

Implement the live-kernel record and authority boundary.

#### Persistent records

Add append-only, integrity-checked persistence for:

- a restricted disclosure strategy bound to the exact Thread snapshot, immutable request attempt, requester or audience, appraisal, private stance, Participation Authorization, policy, causation chain, and correlation chain;
- an audience-visible external participation response bound to the exact disclosure strategy and request attempt.

The exact storage layout is an implementation decision, but the persisted chain must retain enough independent witnesses to detect substitution or coherent rewriting of its material bindings.

#### Restricted disclosure strategy

The strategy is private. It may represent candid, tactful, selective, ambiguous, evasive, or deceptive expression within the accepted Fibre rules, but it cannot:

- create or expand authorization;
- change the authorized action or objective;
- claim task completion or performed action that has not occurred;
- erase a recorded divergence between the Thread's own response and the action the kernel authorized;
- convert an obligation-mediated override into evidence of consent;
- disclose private rationale, feelings, dignity evidence, relationship effects, withheld reasons, or obligation details unless the strategy explicitly chooses them for the intended audience.

At minimum, the private record must preserve the Thread-owned response, authorized action, dignity band, disclosure mode, intended visible action, audience, disclosed information, withheld information, safe references, rationale or intent, and any governing obligation reference used by authorization.

#### Audience-visible response

The response is a sanitized communication record. It must contain only the fields intentionally visible to the audience, such as the intended audience, visible action, message, and safe references.

It must not automatically carry private appraisal, score, feelings, private rationale, withheld reasons, relationship deltas, or undisclosed obligation details.

The visible posture must not contradict the kernel's authorized participation action. For a non-accept authorization, `noncommittal` may be used to withhold the exact non-participation posture without asserting a different action. An accepted authorization must be communicated as acceptance in M1.

"Audience-visible" does not mean globally public. Until Fibre has authenticated principals and role-aware access, the local kernel may keep retrieval behind the existing restricted credential while proving that the returned response payload itself contains no private fields.

#### Service and API behavior

The kernel must own record IDs and timestamps. Creation must be exact-idempotent, append-only, bounded, and conflict visibly when an operation ID is reused with different content.

The service must reread the authoritative request, appraisal, stance, authorization, and relevant Thread witnesses inside the load-bearing write transaction rather than trusting caller-supplied copies.

The API must expose bounded create, read, list, and integrity operations. It must not expose a generic proxy, external network send, or a route that treats response creation as command acceptance, runtime acquisition, performed action, or freeze.

#### Required evidence

Tests must cover at least:

- exact binding to Thread, snapshot, request fingerprint, requester or audience, appraisal, stance, authorization, policy, causation, and correlation;
- stale or mismatched records rejected through the live service path;
- outward posture cannot imply an action the authorization does not permit or deny an accepted action that will execute;
- authorized scope cannot be expanded by disclosure or response wording;
- private fields absent from the audience-visible payload;
- obligation-mediated `refuse -> accept` retains both values and the governing reference in the private chain;
- response text cannot become consent evidence;
- exact retry returns the same records without duplication;
- changed-content retry conflicts;
- records survive close and reopen;
- tampering or substitution is detected by integrity reads;
- public Thread and event routes do not leak restricted strategy content.

Authority-, consent-, obligation-, identity-, and privacy-critical evidence must pin both behavior and the live service or transaction path that makes the guard load-bearing.

### Closure PR B — Prove and inspect the complete boundary

Integrate the new records into the consolidated Mina proof, Thread Editor, database inspector, and accepted documentation.

#### Mina acceptance branches

The proof must demonstrate at least three distinct participation outcomes:

1. **High-dignity acceptance:** Mina privately wants to accept, receives accepted authorization, records a strategy, and emits an audience-visible acknowledgment that does not claim the task is already complete.
2. **Low-dignity non-participation:** Mina privately refuses, clarifies, negotiates, or delegates; no thaw runtime is acquired unless a later accepted authorization exists; the audience-visible response is respectful without rewriting the private stance.
3. **Obligation-mediated participation:** Mina's own recorded response is `refuse`, the kernel authorizes `accept` through one exact recorded obligation, and the private strategy preserves the divergence and governing reference. The demonstrated audience response must not portray the override as voluntary desire or consent. A candid strategy may explicitly say that Mina is proceeding under an obligation; other future strategies may withhold private details, but the authoritative private record must remain inspectable.

The closure proof does not need real message transport. It proves durable expression intent and an audience-safe response record, not email, chat delivery, tool execution, or external side effects.

#### Restart, integrity, and replay

The consolidated proof must close and reopen the same world database and verify:

- identical disclosure and response records after restart;
- exact request, stance, authorization, strategy, and response linkage;
- no duplicate records under exact retry;
- restricted fields remain restricted;
- response payload remains audience-safe;
- existing Thread projection and event replay remain unchanged unless a separate accepted life event requires change;
- expression records are not inferred from Actor output, Guardian result, freeze report, or public event projection.

#### Human inspection

The Thread Editor must show, in separate readable sections:

- the Thread's own private response and dignity match;
- the action authorized by the kernel;
- any obligation-mediated divergence, named as compulsion rather than consent;
- the private disclosure strategy and what it chose to reveal or withhold;
- the exact audience-visible response;
- performed action and durable life change as separate states, including "none recorded" when appropriate;
- collapsed exact JSON as the authoritative technical witness.

The database inspector must count and cross-check strategies and responses and must not assert read-only or integrity properties through hardcoded report literals.

#### Final documentation closure

After the executable proof passes, update the accepted M1 contract, prototype roadmap, current-state document, evidence artifact, and repository status so that they no longer disagree about whether disclosure strategy and audience-visible response are part of the completed M1 artifact set.

Only then should the repository state: **M1 is fully closed.**

## Permanent closure invariants

1. Private stance, authorization, disclosure strategy, audience-visible response, performed action, outcome, and durable life change remain distinguishable.
2. Public or audience-visible wording is not authoritative evidence of private motive, desire, dignity, consent, or authorization.
3. Disclosure and response cannot create, enlarge, repair, contradict, or silently negate authorization.
4. An obligation-mediated override remains identifiable as compulsion even when outward wording is tactful or selective.
5. Audience-visible responses contain only deliberately disclosed content and safe references.
6. Actor output is proposal data and is not requester-facing communication.
7. Creating a response record is not proof that a message was delivered, that work was performed, or that a life change was accepted.
8. Exact retry cannot duplicate expression records or effects.
9. Human inspection presents the readable explanation first while retaining exact JSON as the authority.
10. Critical evidence pins both the guard and its live wiring or transaction boundary.

## Explicit non-goals

This closure does not add:

- real email, chat, webhook, network, or tool delivery;
- production principal identity or role-aware access;
- learned or LLM-generated disclosure strategy;
- production model execution or worker isolation;
- performed-action execution;
- marketplace contracts or settlement;
- relationship aggregation;
- structured obligation creation or editing;
- M2 passport, portrait, voice, geography, or family implementation.

## Structured-obligation follow-up

The M1 demonstration still uses exact UTF-8 unresolved-intention prose as provisional obligation identity. Stable obligation records with ID, owner or issuer, scope, terms, expiry, recurrence, satisfaction criteria, discharge history, and explicit visibility classification remain the next authority hardening step before any new obligation-mutation surface.

The structured-obligation design must distinguish **public standing** (for example, that a Thread is bound by an obligation relevant to an interaction) from **private terms** (the exact text, evidence, or personal reason behind that obligation). The current M1 public `unresolvedIntentions` representation is provisional and must not be treated as the permanent privacy model.

That refactor is not silently folded into this expression closure. It should be a separate reviewed PR immediately after M1 closure, or may proceed in parallel with an M2 contract-only PR, but no new feature may create or edit obligations until stable obligation identity exists.

## Exit gate

M1 closure is complete only when both implementation PRs are merged, the exact final head passes `npm run check`, the consolidated separate-process proof passes across restart, the Thread Editor displays the complete interior-to-exterior chain without converting compulsion into consent, and the accepted canonical documents are reconciled.
