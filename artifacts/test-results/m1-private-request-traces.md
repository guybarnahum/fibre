# M1 private request-trace evidence

Date: 2026-08-04  
Scope: PR #18, persistent requests, appraisal capsules, and private participation stances

## Capability demonstrated

The world-kernel persists the first restricted interior records in the M1 participation pipeline:

1. one immutable named activation request with a SHA-256 digest of every material request field;
2. one immutable Request Appraisal Capsule bound to the exact historical Thread snapshot and dignity policy;
3. one immutable private participation stance bound to that request, capsule, snapshot, policy, requester, and historical state hash.

These records live in a separate restricted append-only ledger. They do not appear in the public Thread projection or public Thread event response. This preserves the interior–exterior boundary while access-aware event projections remain deferred.

## Durable record chain

For one request, the restricted chain is:

```text
activation request
  -> request fingerprint
  -> historical Thread snapshot witness
  -> opaque appraisal ID + appraisal digest
  -> Request Appraisal Capsule
  -> optional opaque stance ID + stance digest
  -> Private Participation Stance with its own historical state-hash witness
```

`app_` and `pst_` identifiers are random 256-bit opaque values. They are not hashes of private content. Content digests remain separate integrity witnesses.

The request fingerprint matches the portable `@fibre/domain` implementation and covers:

- request ID;
- trigger;
- requester ID, kind, and display name;
- objective;
- stated need;
- sorted permissions;
- acceptance criteria.

Changing any material field changes the fingerprint. Permission ordering does not.

## Thread-owned context proof

The kernel builds the capsule from the authoritative historical Thread snapshot, not caller-supplied private data. The caller may request a narrowing of:

- memory references;
- relationship references;
- unresolved-intention obligation references.

Every selected reference must belong to that Thread snapshot. The capsule records both included and excluded references, and integrity verification proves that each pair is disjoint and complete. It also verifies copied identity, self-model, needs, feelings, unresolved intentions, and budget state against historical replay.

Known alternatives are validated entity references. They are not treated as Thread-owned memories, relationships, or obligations.

## Private stance proof

A stance is formed from a validated dignity assessment and records:

- desired action: accept, clarify, negotiate, delegate, or refuse;
- dignity score and derived band;
- private rationale and attributable evidence;
- private feelings, conflicting motives, and uncertainties;
- repair questions and concrete alternatives;
- bounded relationship effects with evidence for non-zero changes.

The kernel rejects low-dignity acceptance, clarification without a repair question, delegation without an alternative, missing stance evidence, non-zero relationship effects without evidence, requester substitution, request substitution, policy substitution, fingerprint substitution, Thread/snapshot substitution, relationship-target substitution, malformed partitions, and copied-state substitution.

A private stance is an opinion about its immutable historical appraisal. It may be recorded after unrelated later Thread advancement without changing what snapshot it describes. An exact retry remains idempotent after later Thread changes. A materially different second stance conflicts rather than silently revising the private record. Any future Participation Authorization must independently revalidate current state.

## Persistence and replay

Private trace integrity verification:

1. reconstructs the exact historical Thread version from immutable Thread events;
2. verifies the request/appraisal and stance state-hash witnesses;
3. recomputes the request fingerprint and request-record digest;
4. revalidates the appraisal capsule against historical Thread-owned context and state;
5. validates the opaque appraisal ID format and recomputes the appraisal digest;
6. when present, revalidates the private stance, opaque stance ID format, and stance digest.

The records survive database close/reopen and an independently running world-kernel process restart without becoming public Thread events.

## Access boundary

Restricted routes require `FIBRE_PRIVATE_TOKEN` through `x-fibre-private-token` before any private subpath is dispatched.

- Without a configured token, private routes return `PRIVATE_ACCESS_DISABLED`.
- With a missing or wrong token, they return `PRIVATE_TOKEN_REQUIRED`.
- An unknown private subpath still requires the token before returning not found.
- The unauthenticated health route does not advertise whether private access is configured.
- Public Thread and event routes do not return the appraisal capsule, private rationale, stance feelings, motives, uncertainties, or relationship effects.

The public Thread snapshot may separately contain ordinary state such as `currentState.feelings`; that is not disclosure of the restricted participation trace.

This token is a local M1 capability protecting the restricted route surface. It is not a production identity system, consent, Participation Authorization, or permission to execute the requested task.

## Named automated evidence

Every rejection claimed above is tied to a named test rather than inferred from the aggregate test count.

| Property | Test |
|---|---|
| Every material request field is digest-bound; permission ordering is normalized | `kernel request fingerprint matches the portable domain binding` |
| Unowned context injection leaves no partial rows | `unowned appraisal context and conflicting request reuse fail without partial records` |
| Low-dignity accept, incomplete clarify/delegate, and both evidence rules fail | `rejects low-dignity acceptance, incomplete clarify/delegate, and missing evidence` |
| Thread, snapshot, request, fingerprint, policy, and relationship target remain bound | `rejects every stance-to-trace substitution and requester-target substitution` |
| Requester, partition, and copied private state substitutions fail | `rejects capsule requester substitution, partition corruption, and copied-state substitution` |
| A compiled appraisal cannot be inserted after an intervening Thread write | `direct store rejects an appraisal whose snapshot became stale before atomic persistence` |
| Historical stance remains recordable after later Thread changes | `records a private stance against its historical appraisal after the Thread advances` |
| Omitted/full selection retries match; explicit empty selection remains visible | `omitted and explicit full selection retry identically while explicit empty selection remains distinct` |
| IDs are opaque rather than content-addressed | `opaque appraisal and stance identifiers are not content-addressed` |
| Malformed private IDs fail at the schema boundary | `schema rejects malformed appraisal and stance identifiers` |
| Coherent capsule JSON/digest/ID rewriting fails historical verification | `coherent capsule JSON, digest, and identifier rewriting is detected by historical replay` |
| Private prefix authentication, health non-advertisement, and public non-disclosure hold | `private routes fail closed while public Thread and event routes reveal no private trace` |
| Private request envelopes are exact and lifecycle-invalid appraisal returns 422 | `private transport rejects unknown envelope fields and lifecycle-invalid appraisal with 422` |
| Schema version 1 migrates to version 2 | `schema version 1 migrates in place to private participation schema version 2` |
| Independent process restart preserves the trace without public events | `private request and stance survive independent world-kernel restart without public leakage` |

The full repository test command is:

```bash
npm test
```

The repository-level validation command is:

```bash
npm run check
```

## Deliberately deferred

- Participation Authorization issuance and event-backed consumption;
- disclosure strategy and audience-visible external response;
- private-stance revision rather than immutable conflict;
- authenticated principals and per-record production access control;
- private/public event projections and operator audit roles;
- relationship aggregate mutation from proposed relationship effects;
- thaw leases, runtime sessions, Actor, Goal Guardian, and freeze;
- production key management, database encryption, backup, replication, and remote deployment.
