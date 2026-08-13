# #38 Slice C — Autobiographical Memory Epistemics Review Request

**Status:** SLICE C IMPLEMENTED / CLAUDE HOSTILE REVIEW REQUIRED

## Thesis

Slice C makes autobiographical memory a durable **perspective on history**, not history itself.

The implementation is intentionally non-inflationary:

- immutable Thread history remains authoritative for what happened;
- memory records what the Thread/Fibre currently remembers or interprets about that history;
- uncertainty, contradiction, accessibility and retention are first-class;
- reinterpretation appends a revision rather than mutating history or an earlier memory;
- a retracted memory leaves its prior assertion visible in memory history but disappears from the current projection;
- memory storage awards **zero causal standing and zero endogenous Development credit**;
- no caller-writable `lastRecalledAt` exists, because a recall timestamp would itself claim an unwitnessed interior event;
- no `thread_self_authored` authorship class exists in #38. #42 owns self-authored Development.

This advances the Fibre vision by making a Thread's past psychologically representable without confusing narrative perspective with historical fact or pretending that representation alone proves personhood.

## Durable shape

A memory lineage has a stable `memoryId` and append-only revisions containing:

- `threadId`
- `subjectPeriod`
- `eventRefs[]`
- `rememberedMeaning`
- `rememberedAt` / `asOf`
- `confidence`
- explicit `uncertainty[]`
- `salience`
- `accessibility`
- `retentionState`
- non-endogenous `authorship`
- `supportingEvidenceRefs[]`
- `contradictingEvidenceRefs[]`
- `visibility`
- `status`
- `recordedAt`
- immediate-predecessor `supersedesRevision`

The canonical record deliberately does **not** contain personality effects, causal effects, trait updates, behavior policy, recall-event claims, or endogenous-credit fields.

## Grounding

`eventRefs` must resolve to `thread_events` for the same Thread. A memory cannot cite an event later than its `asOf` perspective.

Supporting/contradicting references must resolve to durable Thread-scoped evidence already admitted by Fibre: Thread events, situated evidence witnesses, or identity assertions. Opaque caller strings do not count as evidence.

Across revisions, the union of cited evidence is monotonic: reinterpretation can reclassify evidence, but cannot silently make previously cited evidence disappear. Memory visibility is narrow-only in Slice C; widening is deferred until Fibre has an explicit disclosure-authority path rather than treating generic evidence as permission.

## History separation

Historical event payloads are never updated by the memory writer. Changing `rememberedMeaning`, confidence, uncertainty, accessibility or retention state creates a new memory revision while the cited event remains byte-for-byte unchanged.

This is the intended semantic split:

```text
historical event = what Fibre durably says happened
memory revision  = a later epistemic perspective on that history
```

Neither direction silently rewrites the other.

## Integrity

Memory rows are canonical JSON with predecessor-chained SHA-256 record digests. Each revision also publishes an append-only lineage-head row. Reads recompute the full chain and verify the independent head sequence before returning memory history.

This follows the repaired Slice-B lesson: a local hash of a row is not treated as sufficient ledger integrity.

## Standing boundary

Inspection returns:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

A stored memory is not evidence that it caused behavior, changed character, or was autonomously authored. Those belong to #40/#41 and #42 respectively.

## Existing Fibre composition

The Thread snapshot already carries `memoryRefs`, and `memory-visual-companion.mjs` already treats a persisted autobiographical memory as the semantic source for a future photo obligation. Slice C supplies the missing durable epistemic authority. It does **not** mutate event-sourced Thread snapshots merely to add an index entry.

Slice D remains downstream: rendering, queueing, regeneration, cache/hash failure handling and captured-vs-synthetic photo completion are not part of this slice.

## Hostile cases implemented

Tests require that:

1. a memory can be reinterpreted without changing the underlying `thread_events` payload;
2. fake lived-history references are rejected;
3. fake supporting evidence is rejected;
4. prior cited evidence cannot silently disappear in a revision;
5. private memory visibility cannot widen through the memory writer;
6. retraction preserves history while removing only the current projection;
7. memory survives restart;
8. read-only inspection cannot author memory;
9. `lastRecalledAt` is rejected as an unsupported field;
10. `thread_self_authored` is rejected;
11. memory inspection remains 0/0 for causal/endogenous standing.

## Deliberate non-goals / carry-forward

- #39 owns Genesis/childhood generation and must decide which new historical event kinds are admissible as memory subjects. Slice C checks witness existence and Thread scope, not future Genesis witness relevance.
- #40 owns causal consumption. Nothing in this slice turns salience, accessibility, ancestry, geography or remembered meaning into behavioral causation.
- #42 owns witnessed self-authored Development and any genuine recall/reflection event path.
- Slice D owns actual memory-photo completion. Synthetic reconstruction must remain distinct from captured historical evidence.
- Legacy `Thread.memoryRefs` remain an event-sourced snapshot field; Slice C does not mutate them out-of-band. A later explicit event/index migration should reconcile legacy refs with the durable memory ledger.

## Requested Claude hostile review

Please review Slice C as an adversary, not as a style reviewer. Try to break these claims:

1. **Memory cannot become history.** Find any path where remembered meaning, confidence, uncertainty, accessibility or retention can rewrite or masquerade as an immutable historical event.
2. **Callers cannot manufacture epistemic evidence.** Try fake IDs, cross-Thread events, future events, unrelated situated/identity evidence, revision evidence erasure and direct-store bypasses.
3. **Reinterpretation is append-only.** Try forks, skipped revisions, cross-Thread lineage changes, retraction erasure, coherent record/digest tampering and lineage-head mismatch.
4. **Privacy is not inferred from evidence.** Try widening a private/restricted memory without an explicit disclosure-authority path.
5. **No fake interior event is minted.** Try to claim recall, forgetting, self-authorship or endogenous reflection that the ledger has not witnessed.
6. **No personhood inflation.** Try to obtain accepted causal or endogenous Development credit from memory representation alone.
7. **Composition remains clean.** Check that the existing visual-companion/photo obligation remains downstream and cannot turn a synthetic reconstruction into historical evidence.

Return S1/S2/S3 findings with concrete reproductions. Do not clear Slice C merely because the schema is expressive; clear it only if the grounding and epistemic boundaries survive hostile use.
