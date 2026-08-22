---
id: genesis-durable-development-v1
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Durable Genesis development v1

## Principle

**A Thread's development must survive failure of the machinery developing it. Persistence belongs to the life, not to the process executing it.**

Genesis may be interrupted by a provider timeout, quota or authentication outage, process crash, host restart, network failure, or another execution-layer failure. Those failures are machinery events. They are not grounds to erase accepted development, regenerate accepted history, substitute a new life candidate, or kill an otherwise valid developing Thread.

The operational rule is:

> **Commit development as it becomes valid. On machinery failure, resume from the last committed developmental state. Never regenerate accepted history.**

## Two durability boundaries

Genesis has two distinct checkpoint boundaries.

### 1. Developmental-record boundary

Once a Pass-A episode or another Genesis record is admitted, that accepted record is fixed input to later development. A restart may revalidate or reconstruct the same state from durable evidence, but it may not ask a model to generate a replacement for an already admitted record.

Publication remains atomic. Before publication, these records are provisional Genesis development rather than live Thread history; durability does not give provisional material Whole-Person standing. After publication, ordinary Fibre history/memory/meaning invariants apply and Genesis cannot rewrite the past.

### 2. Model-invocation boundary

Every successful model invocation used by Genesis should be durably journaled before downstream generation logic is allowed to depend on it. The journal binds the successful output and provenance to the exact request witness:

- client request ID;
- provider and model;
- runtime-configuration digest;
- raw and canonical prompt hashes;
- cognition-input digest; and
- response-schema digest.

On restart, the same Genesis computation may begin again from its deterministic record boundary. When it reaches a journaled invocation, Fibre replays the committed result locally instead of making another provider call. The first invocation with no committed successful result is the next operation allowed to reach the provider.

This permits exact recovery inside a record without changing the already-calibrated Pass-A state machine. For example:

```text
Pass-A episode 7
  initial model response     COMMITTED
  validation                 referential failure
  retry request              provider/process interruption

restart
  initial model response     REPLAYED LOCALLY — no provider call
  validation                 same referential failure
  retry request              first unfinished provider operation
  retry response             COMMITTED
  episode 7                  ADMITTED
```

## What may be retried

A provider operation that has no durable successful-result witness may be attempted again with the exact same request witness. Fibre does not claim that an uncommitted network response never existed at the provider; it claims only that no successful result crossed Fibre's durable execution boundary.

A committed successful invocation may not be regenerated. If its client request ID is presented with different prompt, input, schema, model, provider, or runtime configuration, that is an integrity conflict rather than a cache miss.

A mechanical validation failure is not an operational interruption. Form-repair and referential-retry budgets remain governed by the frozen generation policy. Restarting a process does not replenish those budgets because replay reconstructs the same committed generated versions before reaching the next unfinished operation.

## Provenance and negative evidence

The invocation journal is execution evidence, not semantic evidence. Mechanical/substrate behavior may never support identity, memory, meaning, personality, or character claims.

Rejected candidates, failed gates, repair/retry witnesses, provider provenance, and operational failures remain preserved. Durability must not turn a failed attempt into a cleaner retrospective narrative.

## Efficiency

A restart should spend no provider calls reproducing already committed model work. Replaying local journal records and deterministic validators is cheap relative to regenerating cognition and prevents a late failure from multiplying model cost.

A long Genesis can therefore recover by replaying its committed execution evidence until it reaches the exact unfinished operation. The implementation may later add coarser snapshots for CPU efficiency, but snapshots are an optimization; the append-only durable evidence remains authority.

## #39 boundary

The G4-v3 off-cohort calibration was completed and frozen before this durability layer was introduced. Its CLEAR result remains evidence about the unchanged G4-v3 mechanical generation policy; it is not rerun or replaced by the durability work.

For the replacement cohort, Gate-G(2) must separately verify that durability is execution-layer-only and that:

- frozen G4-v3 cognition prompts, schemas, budgets, and mechanical admission remain unchanged;
- accepted developmental records cannot trigger a duplicate provider generation;
- committed mid-record outputs are replayed exactly after restart;
- request drift fails closed;
- mechanical budget exhaustion is not reset by restart; and
- fresh replacement-cohort cognition remains unauthorized until Gate-G(2) CLEAR.
