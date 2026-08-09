---
id: architecture-structured-obligations-v1
status: proposed
last-reviewed: 2026-08-09
canonical: true
---

# Structured Obligation v1

## Purpose

Structured Obligation v1 turns a commitment into a durable Thread-owned social fact with inspectable provenance and future authority consequences.

The authority invariant is:

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

Nomination is attention, not authority.

The second invariant is:

> **Compulsion never rewrites consent.**

A Thread may privately refuse a request while a valid governing obligation still authorizes participation. The resulting execution is obligation-mediated/compelled; the private refusal remains part of the authoritative record.

## Existing authority gap

Before #35, the canonical runtime accepts caller-supplied `obligationReferences` and treats membership in `thread.currentState.unresolvedIntentions` as sufficient authority to override a private refusal. Freeze then consumes the exact string and removes it from `unresolvedIntentions`.

This conflates at least three different concepts:

- a personal intention or unfinished goal;
- a social/legal commitment;
- a caller-nominated authority token.

Mina's fixture makes the defect concrete: `Read a case study on identity-system failures` is an unresolved intention, yet historical M1 tooling can cite that string as the obligation that compels participation. #35 must not preserve that semantic conflation behind a richer object shape.

## Domain model

A Structured Obligation is a stable logical aggregate with append-only revisions.

Each revision records:

- `obligationId`: stable identity across revisions;
- `revision`: monotonically increasing revision number;
- `threadId`: the obligated Thread;
- `status`: `active`, `satisfied`, `expired`, `revoked`, or `discharged`;
- `issuer`: the entity that issued or originated the commitment;
- `parties`: typed relevant parties and their roles;
- `scope`: natural-language scope plus any Fibre-owned machine-checkable request binding;
- `terms`: material commitment terms;
- `effectiveAt` and optional `expiresAt`;
- `recurrence`: recurrence semantics, initially `none` or descriptive/deferred;
- `satisfaction`: criteria for satisfaction/discharge;
- `provenance`: who/what created this revision and the evidence supporting it;
- `visibility`: `public`, `restricted`, or `private`;
- optional `legacySourceDigest` for an explicitly classified legacy source;
- `supersedesRevision`: the prior revision, if any;
- a canonical record digest.

Status changes do not mutate history. They append a new revision.

## Scope versus applicability

Representation and authority remain separate.

The natural-language `scope.description` says what the commitment means. It is not itself executable authority.

V1 supports a conservative machine-checkable binding:

```text
scope.binding.kind = request_fingerprint
scope.binding.requestFingerprint = sha256:...
```

The binding must originate from Fibre-owned request evidence. A stored obligation without a supported machine-checkable binding may exist and be inspectable, but it cannot override dignity under the deterministic v1 applicability policy.

This is intentionally narrower than pretending arbitrary natural-language scope is already solved. A later semantic applicability worker may broaden the policy, but it must remain Fibre-owned, evidence-bound, replayable, and independently validated.

## Applicability record

Applicability is an append-only decision distinct from the obligation itself.

Each decision binds:

- Thread and Thread snapshot/state hash;
- request ID and request fingerprint;
- candidate obligation ID, revision, and digest;
- nomination source (`caller`, `fibre`, or `both`);
- result (`applies` or `does_not_apply`);
- reason code and evidence references;
- applicability policy ID/version;
- decision time and decision digest.

Only an `applies` decision produced by Fibre's applicability policy can support obligation-mediated authorization.

Authorization must eventually bind the applicability decision ID/digest, not merely the obligation ID.

## Legacy migration

### Do not promote unresolved intentions

`currentState.unresolvedIntentions` is not an obligation registry. Migration MUST NOT convert those strings into active Structured Obligations.

After the #35 authority cutover, unresolved intentions remain available as personal/history context but carry zero obligation authority unless explicitly classified into a Structured Obligation through a separate authoritative operation.

This is a deliberate fail-closed compatibility break in the canonical service, not data loss.

### Preserve spent authority as spent

Historical `authorization_consumptions.obligation_refs_json` is authoritative evidence that an exact legacy reference was already consumed.

Migration creates one deterministic `legacy_obligation_tombstone` per consumed `(threadId, legacyReference)` pair containing:

- deterministic tombstone ID;
- Thread ID;
- exact legacy reference and its digest;
- source authorization/consumption identity and digest;
- consumed timestamp.

Tombstones are append-only.

Any later explicit legacy-to-Structured-Obligation import must compute the same legacy reference digest. If a tombstone exists, it MUST NOT create active authority. This preserves the invariant:

> **Pre-migration spent obligations remain spent.**

### Active legacy references

There is no automatic active-legacy migration because the old schema cannot distinguish a genuine commitment from a personal intention. Legitimate active obligations must be explicitly reclassified with issuer, parties, scope, terms, provenance, visibility, and satisfaction semantics.

## Storage model

V1 uses three append-only tables:

```text
obligation_records
obligation_applicability_decisions
legacy_obligation_tombstones
```

`obligation_records` stores revisions rather than a mutable current row. Current state is the highest valid revision for an `obligationId`.

This avoids silent status mutation and makes replay/audit straightforward.

## V1 deterministic applicability

The first policy is deliberately small:

```text
structured_obligation_applicability / 1
```

A candidate can apply only when all are true:

1. it belongs to the Thread;
2. the nominated revision/digest is current and intact;
3. status is `active`;
4. `effectiveAt <= decision time`;
5. it has not expired;
6. its supported Fibre-owned request binding matches the current request fingerprint;
7. no matching legacy tombstone forbids reactivation;
8. the decision is persisted and bound to the same Thread snapshot/request used by authorization.

Natural-language terms may explain the commitment but cannot expand deterministic v1 authority beyond these checks.

## Required #35 adversarial cases

At minimum:

```text
caller cites unknown / foreign obligation
    -> no authority

caller cites real but unrelated obligation
    -> does_not_apply -> no authority

caller cites active obligation bound to this request
    -> applies -> may support obligation-mediated authorization

private dignity = refuse + governing obligation
    -> authorized execution may occur as compelled
    -> private refusal remains unchanged

expired / satisfied / revoked / discharged obligation
    -> no authority

legacy unresolved intention with no structured obligation
    -> no authority

pre-migration consumed legacy reference
    -> tombstoned -> cannot resurrect

restart / replay
    -> same obligation revision, applicability decision, authorization binding, and discharge state
```

## Non-goals for v1

- no claim that arbitrary natural-language obligation scope is semantically understood;
- no caller-authored applicability result;
- no LLM requirement for applicability;
- no obligation authority from unresolved-intention membership;
- no score movement merely for richer representation;
- no rewriting private refusal into willing acceptance.

## Follow-on implementation steps

1. land domain validation/digests and storage tables;
2. migrate consumed legacy refs to tombstones;
3. add an ObligationStore/service with append-only revision creation and lookup;
4. implement deterministic applicability v1 and persistence;
5. change runtime acquisition from `obligationReferences` authority to nominated IDs plus Fibre applicability;
6. bind applicability evidence into Participation Authorization;
7. change freeze/discharge to append obligation status revisions and consumption evidence;
8. update M1 compatibility tooling without reinterpreting historical M1 evidence;
9. add private/admin inspection and adversarial/restart tests.
