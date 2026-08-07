---
id: validation-m1-disclosure-response-closure-plan
status: accepted
last-reviewed: 2026-08-06
canonical: false
issue: 1
---

# M1 disclosure and response closure plan

## Outcome

The owner chose on 2026-08-06 to close the remaining interior-to-exterior gap before beginning M2 implementation. The closure is now implemented and proven through two reviewed work units:

1. **Closure PR A** — persist restricted disclosure strategy and audience-visible participation response with their authority, privacy, idempotency, restart, and integrity boundaries;
2. **Closure PR B** — integrate those records into the consolidated Mina proof, Thread Editor, database inspector, structural status reporting, evidence artifact, and canonical M1 state.

The earlier decision to defer these records was accurate for the first deterministic lifecycle proof but is superseded for final M1 scope.

**M1 is fully closed when Closure PR B merges with its exact-head repository gate green.** The canonical M1 contract and current-state document in this change are written as the resulting merged state.

## Permanent architectural decisions

1. **Private stance, authority, disclosure, response, performed action, and durable life change are distinct.** No later layer rewrites an earlier one.
2. **Outward posture may not contradict participation authority.** `accept` authority communicates `accept`; non-accept authority may communicate the same action or `noncommittal`.
3. **Compulsion is not consent.** An obligation-mediated `refuse -> accept` keeps both values and its governing obligation in the private chain as `obligation_override`.
4. **Willing and compelled acceptance remain outwardly distinguishable.** M1 willing acceptance says `I can take this on.`; tactful compelled acceptance says `I can proceed with this request.`; full candor may say the Thread proceeds because of a recorded obligation.
5. **A future “compelled participation, outwardly withheld” capability needs its own explicit record.** It may not masquerade as a false refusal and is not part of Closure PR B.
6. **Disclosure mode is private strategy intent.** `full_candor`, `tactful_candor`, `selective`, `strategic_ambiguity`, `evasive`, and `deceptive` are not kernel honesty classifications and do not promise unique deterministic language for every mode.
7. **Audience-safety claims are narrow and structural.** The response payload does not newly copy private appraisal, dignity details, private rationale, withheld reasons, or governing obligation references. It separately records response presence, delivery state, performed-action state, and completion state. Current public `unresolvedIntentions` are not a permanent confidentiality model.
8. **Standalone non-execution authority is stable-state only and cannot mint `accept`.** Accepted execution authority remains exclusive to the thaw/runtime boundary.
9. **One participation authority per request attempt.** The two legitimate authorization writers detect each other through transaction prechecks and storage backstops, with stable domain conflicts rather than raw SQLite failures.
10. **Expression records are append-only.** M1 records one immutable disclosure strategy and one immutable audience response per request attempt; future revision uses superseding records rather than update-in-place.
11. **Response creation is not delivery, work, completion, consent, or a Thread life event.** Real transport and general performed-action records remain later capabilities.
12. **Critical evidence pins behavior and wiring.** Redundant authority guards are independently asserted so a refactor cannot remove both layers while leaving the suite green.

## Implemented persistent chain

```text
private appraisal
  -> private participation stance
  -> Participation Authorization
  -> restricted disclosure strategy
  -> audience-visible participation response
  -> performed action, if any
  -> durable life change, if any
```

Closure PR A added append-only persistence and restricted APIs for the strategy and response. It also added durable non-execution authorization so `clarify`, `negotiate`, `delegate`, and `refuse` can be authorized and expressed without acquiring runtime.

Accepted execution authority remains on the existing runtime path. The standalone authorization path rejects `accept` at both domain and store layers.

## Consolidated Mina closure proof

Closure PR B demonstrates three completed expression chains inside the existing M1 history:

### 1. High-dignity willing acceptance

- private stance: `accept`;
- authorized action: `accept` through runtime acquisition;
- disclosure: `tactful_candor`, posture `accept`;
- outward response: `I can take this on.`;
- expression is persisted before Actor work;
- Actor/Guardian/freeze then proceed as separate later records.

### 2. Low-dignity non-participation

- generic request with dignity score 9;
- private stance: `refuse`;
- non-execution authority: `refuse`;
- disclosure: `tactful_candor`, posture `refuse`;
- outward response: `I will not take this request on.`;
- exact authorization/disclosure/response retries are idempotent;
- no runtime exists for this request.

### 3. Obligation-mediated participation

- private stance: `refuse`;
- authorized action: `accept` through one exact recorded obligation;
- private disclosure basis: `obligation_override`;
- disclosure: `full_candor`, posture `accept`;
- outward response says the Thread can proceed because of a recorded obligation while omitting the private obligation reference;
- expression is persisted before Actor work;
- freeze later consumes authority and discharges the exact obligation once.

All three responses record at creation time:

```text
deliveryStatus = not_sent
performedActionStatus = none_recorded
completionStatus = not_claimed
```

The proof then restarts the completed world and requires exact expression-chain equality, request/stance/authorization/strategy/response linkage, three disclosure rows, three audience-response rows, three complete expression chains, and no duplicate records.

## Human and database inspection

The Thread Editor has a dedicated **Expression boundary** view. It presents readable explanation first and exact JSON as the technical authority. It shows:

- the Thread's own private response;
- kernel-authorized action;
- dignity band and participation basis;
- obligation-mediated divergence explicitly as compelled participation, not consent;
- disclosure intent;
- disclosed and withheld reason categories;
- exact audience-visible message;
- delivery, performed-action, and completion status;
- integrity linkage.

Expression inspection is credentialed and GET-only. The editor exposes no authority, disclosure, response, runtime, freeze, or obligation write path.

The database inspector now:

- includes expression tables, append-only triggers, and indexes in schema enforcement;
- verifies each authorization and completed expression chain through the domain stores;
- counts strategies, responses, and complete chains;
- reports disclosure modes and communicated postures;
- derives source read-only state from SQLite `query_only` rather than a hard-coded report literal.

The expression-integrity API now reports audience-response status structurally. The older store `audienceSafe` boolean remains a compatibility alias only, not a broad truthfulness or confidentiality verdict.

## Explicit non-goals retained

M1 closure does not add:

- real email, chat, webhook, network, or tool delivery;
- a general performed-action ledger;
- production principal identity or role-aware access;
- learned or LLM-generated disclosure strategy;
- production model execution or worker isolation;
- marketplace contracts or settlement;
- structured obligation creation or editing;
- M2 passport, portrait, voice, geography, or family implementation.

## Structured-obligation follow-up

M1 still uses exact UTF-8 unresolved-intention prose as provisional obligation identity. The immediate authority-hardening follow-up is a structured obligation record with:

- stable ID;
- owner or issuer;
- scope and terms;
- expiry and recurrence;
- satisfaction criteria;
- discharge history;
- provenance;
- explicit visibility classification.

That design must distinguish **public standing** from **private terms**. No new feature should create or edit obligations until stable obligation identity exists.

An M2 Identity and Embodiment contract may be defined in parallel, but M2 implementation should preserve this authority boundary.

## Exit gate

The closure exit gate is:

- both implementation work units present in `main`;
- exact final head passes `npm run check`;
- the consolidated separate-process proof passes across restart;
- three expression branches are persisted and independently reverified;
- Thread Editor shows the complete interior-to-exterior chain without converting compulsion into consent;
- database inspector verifies expression records without hard-coded integrity/read-only claims;
- accepted M1 contract, roadmap, current-state, priorities, evidence, and world-kernel documentation agree.

On merge of Closure PR B, these conditions make the repository statement **M1 is fully closed** true.
