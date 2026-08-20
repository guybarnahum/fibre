---
id: m2-pr39-pre-g-stage4-carry-forwards
status: implemented
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 4 carry-forwards

## Purpose

Stage 4 closes two older correctness debts carried forward from the blocking Slice-C and Slice-D reviews before Slice G freezes the final cohort and protocol.

They are unrelated mechanisms and are intentionally fixed independently:

```text
C carry-forward
Thread IDs may be much longer than the 120-byte identity claim-predicate envelope.
Genesis publication must not fail merely because a valid Thread ID is long.

D carry-forward
A memory that was valid when admitted must remain readable if a later software version
uses tighter content-size policy. New writes must still obey the current policy.
```

No model calls, cohort material, Gate-F evidence, Genesis history, or burned artifacts change in this stage.

## C carry-forward — long Thread IDs versus claim-predicate budget

### Prior failure mode

The general Thread ID contract permits IDs matching:

```text
[A-Za-z0-9][A-Za-z0-9._:-]{0,255}
```

so a valid Thread ID may be 256 characters long.

Legacy/Genesis identity bootstrap previously emitted:

```text
claimPredicate.subject = thread.threadId
claimPredicate.predicate = "seed_identity"
claimPredicate.object = bootstrap key
```

The identity claim predicate has an independent hard limit of 120 UTF-8 bytes over its canonical JSON representation. A sufficiently long but otherwise valid Thread ID therefore made `persistLegacySeedIdentity()` reject during birth publication.

That was a cross-layer contract contradiction: Genesis accepted the Thread identifier contract but one publication side effect could not represent it.

### Resolution

`services/world-kernel/src/identity-provenance-domain.mjs` now builds bootstrap predicates with a compatibility-preserving bounded representation.

The rule is:

1. construct the historical exact predicate first;
2. if it fits the current 120-byte envelope, keep it **unchanged**;
3. only if it would overflow, replace the predicate subject with a deterministic compact reference derived from the full Thread ID;
4. if an unusually long bootstrap key still causes overflow, compact the object as well;
5. pass the resulting predicate through the existing canonical claim-predicate validator.

The compact references use deterministic SHA-256-derived 24-hex-character tokens:

```text
thread_<24 hex>
seed_<24 hex>
```

The full Thread ID is not lost or replaced. It remains authoritative in:

- `identity_assertion_records.thread_id`;
- `assertion.threadId`;
- the claim ID seed, which hashes the complete Thread ID plus bootstrap key;
- Thread history and the Thread projection itself.

The compact predicate is only the bounded subject/object representation inside the atomic claim slot.

### Backward compatibility

Short existing bootstrap predicates remain byte-for-byte unchanged. The compaction path activates only when the exact historical predicate would exceed the claim-predicate budget.

This avoids gratuitously changing assertion canonical JSON/digests for ordinary existing Thread IDs.

## D carry-forward — historical memory read policy

### Prior failure mode

The autobiographical memory domain has current content policy such as:

```text
maxRememberedContentBytes = 2048
maxRememberedMeaningBytes = 2048
maxMeaningParts = 6
maxMeaningPartBytes = 1024
```

Those are **admission-time content constraints**. They are not evidence that an older admitted record became corrupt when software policy later changes.

Before Stage 4, the read path called the same strict normalizer used for new writes. Historical inspection therefore re-applied today's content limits to already admitted rows. A future tightening could make an intact, correctly digested historical memory unreadable.

This violated the same append-only policy principle already established for identity/history:

> policy drift must not make admitted history unreadable.

### Resolution

`normalizeAutobiographicalMemory()` now accepts:

```text
{ enforceContentPolicy: true | false }
```

with `true` as the default.

A named historical read API was added:

```text
rehydrateAutobiographicalMemory(record)
```

which uses `enforceContentPolicy:false`.

Historical rehydration bypasses only moving content-policy limits. It still enforces durable structural semantics including:

- memory ID and immutable subject identity;
- Thread ID and reference formats;
- subject chronology and `asOf`/`recordedAt` ordering;
- required subject event membership;
- authorship policy shape;
- evidence-set consistency;
- visibility/status values;
- revision/supersession shape;
- V2 `meaningOutcome` structure;
- `no_durable_meaning` requiring null meaning and zero meaning parts;
- `durable_meaning` requiring nonempty remembered meaning and at least one meaning part;
- stable meaning-part IDs.

Historical mode does **not** turn invalid structure into valid history.

### Digest and lineage semantics

Historical digest verification now also uses historical rehydration. Otherwise a valid stored row could not even have its recorded digest recomputed after policy tightening.

Revision compatibility distinguishes the two uses:

```text
historical history-vs-history validation
    previous: historical rehydration
    current:  historical rehydration

new write against historical predecessor
    previous: historical rehydration
    current:  current strict admission
```

Therefore an old record remains inspectable, but a new record cannot use historical mode as a shortcut around current admission policy.

`autobiographicalMemoryIsCurrent()` also uses historical rehydration so list/current projections do not accidentally reintroduce the moving-policy read bug.

## Load-bearing regression

`services/world-kernel/test/genesis-pre-g-stage4-carry-forwards.test.mjs` contains two integration tests.

### Full-length Thread publication

The test publishes a real de-novo Genesis birth with a **256-character valid Thread ID**.

It verifies:

- birth publication succeeds;
- the published Thread retains the complete ID;
- identity bootstrap rows retain the complete Thread ID in their authoritative `threadId` field;
- at least one claim predicate uses the compact representation;
- every bootstrap predicate stays within 120 bytes;
- an ordinary short Thread still produces the historical exact predicate subject.

This protects both the positive long-ID contract and compatibility for existing short IDs.

### Historical memory under tighter current policy

The test constructs a structurally valid V2 memory whose `rememberedContent` exceeds today's 2048-byte admission ceiling.

It first proves the current normalizer rejects it.

It then installs the record as a synthetic previously admitted ledger row with a correct:

- canonical record JSON;
- memory digest;
- lineage head;
- Thread-history memory anchor;
- command witness;
- updated Thread projection.

Read-only inspection must then:

- rehydrate the memory successfully;
- verify its digest/lineage/anchor;
- return it from `memoryHistory()`;
- return it from `listCurrentMemories()`.

Finally the normal writer must still reject the same over-limit content as a current write.

The fixture is synthetic policy-drift evidence. It does not claim that Fibre previously shipped a 2048+ byte admitted memory; it proves the read/write boundary mechanically before a future policy change can create the failure in production data.

## What Stage 4 does not change

Stage 4 does not:

- increase or remove the 120-byte claim-predicate limit;
- shorten or change the Thread ID contract;
- replace authoritative Thread IDs with hashes;
- relax identity claim discipline for ordinary writes;
- relax current autobiographical-memory admission limits;
- weaken memory subject/evidence/lineage integrity;
- rewrite any existing memory;
- reopen Gate C, Gate D, or Gate F;
- authorize Slice-G cohort or model work.

## Verification requirement

Stage 4 becomes complete only after local maintainer verification of:

```bash
node --disable-warning=ExperimentalWarning --test \
  services/world-kernel/test/genesis-pre-g-stage4-carry-forwards.test.mjs \
  services/world-kernel/test/autobiographical-memory.test.mjs \
  services/world-kernel/test/genesis-slice-f-publication-enforcement.test.mjs

npm test
npm run check
```

The new Stage-4 file adds two integration tests. The exact full-suite count should be taken from the maintainer run rather than treated as an invariant.
