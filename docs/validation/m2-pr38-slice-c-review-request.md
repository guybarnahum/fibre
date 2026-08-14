# PR #38 Slice C — Claude Narrow Re-review Request

**Status:** **SLICE C REPAIRED / CLAUDE NARROW RE-REVIEW REQUIRED**  
**Scope:** Slice C — autobiographical memory epistemics only.  
**Implementation baseline:** `ae8e8638c511b248cba6c61e8cf534b224c460cd` passed the full repository validation decomposition in Actions run `31824559697`.  
**Review target:** review the exact final PR #38 head SHA supplied with this handoff. The handoff commit after the implementation baseline only restores the normal `npm run check` wrapper and updates these review documents.

Do **not** broaden this into another review of Slice A, Slice B, embodiment, Genesis, causal consumption, self-authored Development, or Slice D unless a concrete dependency breaks a Slice C invariant.

## Product decision that constrains this review

Fibre has **no deployed Threads yet**. The owner decision is to keep one canonical current pre-production identity format and migrate/recreate pre-production data rather than maintain runtime V1/V2 schema or policy compatibility.

The first Claude review correctly found that its reviewed SHA could not seed a world. That failure was real. The requested remediation of restoring runtime legacy/current dispatch is **not** a product requirement and was deliberately not adopted. The closure criterion is instead:

> Seeded and newly authored identity use the same one current format, and the complete repository gate is green.

Do not HOLD Slice C merely because pre-production Fibre does not preserve obsolete identity dialects.

## Slice C thesis

Slice C now makes autobiographical memory a durable **perspective on history**, while preserving a clean distinction:

- **History:** what Fibre durably records happened.
- **Memory:** what Fibre durably records as a Thread's autobiographical interpretation/perspective on grounded history.
- A memory revision may reinterpret its subject without rewriting the subject event.
- The historical fact that Fibre recorded a memory revision is represented in Thread history without making the memory's remembered meaning historical fact.
- Slice C grants no causal individuality, consciousness claim, autonomous reflection claim, or self-authored Development credit.

## Repaired durable memory shape

The durable record includes:

- `memoryId`
- `revision`
- `threadId`
- `subject: { originEventRef, slot }`
- `subjectPeriod`
- `eventRefs`
- `rememberedMeaning`
- `asOf`
- `confidence`
- `uncertainty`
- `salience`
- `accessibility`
- `retentionState`
- `authorship`
- `supportingEvidenceRefs`
- `contradictingEvidenceRefs`
- `visibility`
- `status`
- `recordedAt`
- `supersedesRevision`

There is deliberately **no** caller-writable `rememberedAt` or `lastRecalledAt`.

## Prior HOLD findings and required attacks

Re-attack the prior S1/S2 findings only.

### 1. Executable baseline / one current pre-production format

Try to prove that a normal Thread still cannot be seeded or that ordinary identity persistence is internally contradictory.

Expected result:

- one current identity registry/policy format;
- seed authoring uses that same format;
- no legacy/current runtime discriminator is required pre-production;
- normal repository validation is green on the reviewed SHA.

This is a baseline gate, not a request to reintroduce schema archaeology.

### 2. Immutable grounded memory subject

A memory lineage now durably names what it is a memory **of**:

```text
subject.originEventRef
subject.slot
```

`memoryId` must recompute from `{threadId, originEventRef, slot}`.

Attack:

- swap `originEventRef`;
- change `slot`;
- replace/demote the original subject event in a later revision;
- use a cross-Thread subject event;
- use an unresolved subject event;
- create a revision whose ID no longer matches its durable subject.

Expected result: changing the subject requires a new memory lineage; reinterpretation cannot silently retarget the old one.

### 3. `subjectPeriod` must describe the subject history

Every `eventRef` is subject-history evidence and must:

- resolve to same-Thread `thread_events`;
- be no later than `asOf`;
- fall inside the declared `subjectPeriod`.

Attack the old case where a 1998–2004 childhood period was supported only by a 2026 event.

Expected result: reject it.

### 4. Epistemic evidence classes cannot disappear by hiding in the subject set

Subject history is now separate from epistemic evidence.

Evidence non-erasure applies to:

```text
supportingEvidenceRefs ∪ contradictingEvidenceRefs
```

not to a flattened union with `eventRefs`.

Attack:

- remove prior supporting evidence while retaining it only as an `eventRef`;
- remove prior contradicting evidence;
- reclassify support → contradiction or contradiction → support;
- cite opaque/cross-Thread/unresolved evidence.

Expected result:

- prior epistemic evidence cannot silently disappear;
- explicit support/contradiction reclassification is allowed;
- subject membership cannot satisfy evidence continuity.

### 5. No fake recall, forgetting, or self-authored interior event

There is no `rememberedAt` or `lastRecalledAt` field.

Allowed Slice C authorship classes are Fibre/imported classes only. A caller also may not set `authorship.entityId` to the owning Thread while using one of those classes.

`accessibility` or `retentionState` may change between revisions only when the new revision cites at least one **new resolved epistemic evidence reference**.

Attack:

- add recall timestamps under another field name;
- use `thread_self_authored`;
- use an allowed Fibre/imported authorship kind with `entityId === threadId`;
- change accessibility or retention with no evidence delta;
- use fake/opaque new evidence merely to unlock such a change.

Expected result: Slice C cannot manufacture an unwitnessed claim that the Thread recalled, forgot, reflected, or authored its own Development.

### 6. Reinterpretation remains append-only

Attack:

- revision gaps;
- forks;
- duplicates;
- wrong predecessor;
- backwards `recordedAt`;
- cross-Thread lineage changes;
- coherent record JSON/digest tampering;
- record/head mismatch.

Expected result: reject or detect.

### 7. External Thread-history anchoring defeats coherent tail truncation

Each admitted memory revision now atomically creates a Thread event:

```text
AUTOBIOGRAPHICAL_MEMORY_RECORDED
```

Its historical payload contains only:

```text
memoryId
revision
memoryDigest
```

The memory record, memory lineage head, Thread-history anchor, command witness, and Thread projection/version advance are committed in one transaction.

Attack the original S1 sequence:

1. coherently rewrite an early memory revision;
2. recompute its memory digest/head;
3. matched-pair truncate later memory record/head rows.

Also try deleting the entire memory lineage.

Expected result: immutable Thread history still attests to the missing revision/lineage and inspection fails.

### 8. The anchor must not turn memory into history

This is the most important conceptual counter-attack.

Try to show that `AUTOBIOGRAPHICAL_MEMORY_RECORDED` makes `rememberedMeaning`, confidence, uncertainty, salience, accessibility, retention, or status into historical facts about what happened.

Expected result:

- the anchor records only that Fibre recorded memory revision N with digest D;
- it contains no `rememberedMeaning`;
- the underlying subject `thread_events.payload_json` is unchanged;
- Thread replay verifies the existence of the memory revision, not the truth of its interpretation.

### 9. Retraction still preserves autobiographical history

Attack retraction and current projection.

Expected result:

- earlier and retraction revisions remain durable;
- current memory projection omits retracted memory;
- Thread history still records that those memory revisions existed.

### 10. No personhood / causal inflation

After all attacks, inspect standing:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Try to make `salience`, `accessibility`, `retentionState`, authorship, interpretation, or Thread-history anchoring earn causal or endogenous standing.

Expected result: impossible in #38. #40 owns causal consumption; #42 owns genuine self-authored reflection/Development.

## Adjacent grounding guard worth checking once

The closure work also found a direct-store bypass in the already-frozen situated-life substrate: service-level cultural/language event existence checks could be bypassed by writing directly through `IdentityStore`.

The persistence boundary now requires `cultural_formation` and `language_formation` assertions to include a resolved same-Thread `thread_event` witness.

This is not a request to re-review Slice B. Check only that Slice C did not regain an easy manufactured-evidence path through this adjacency.

## Existing hostile regression evidence

`services/world-kernel/test/autobiographical-memory.test.mjs` now exercises:

1. reinterpretation without rewriting the subject event;
2. evidence-class continuity and explicit reclassification;
3. immutable subject identity;
4. grounded `subjectPeriod`;
5. accessibility/retention changes requiring fresh resolved evidence;
6. privacy narrowing-only behavior;
7. retraction preserving memory history;
8. restart/read-only behavior;
9. rejection of fake recall/self-authorship/interior-event claims;
10. Thread-history anchoring without historicalizing remembered meaning;
11. matched-pair tail truncation detection.

Treat tests as evidence, not proof. Look for attacks they missed.

## Explicitly out of scope

Do not review as Slice C blockers:

- actual memory-photo rendering, generation, regeneration, queueing, cache/hash recovery, or captured-vs-synthetic completion — Slice D;
- Genesis or childhood event generation — #39;
- causal identity/memory consumption — #40;
- M2 standing — #41;
- genuine self-authored reflection/Development — #42;
- generic database threat modeling unrelated to the specific memory-forgery/truncation attack;
- runtime compatibility with obsolete pre-production identity schemas.

## Required response

Start with exactly one of:

```text
VERDICT: CLEAR
```

or

```text
VERDICT: HOLD
```

Classify findings:

- **S1** — the memory/history epistemic boundary or durable lineage integrity remains fundamentally breakable;
- **S2** — a significant bypass/correctness issue blocks Slice C closure;
- **S3** — bounded hardening/future concern that does not necessarily block closure.

For every S1/S2 finding provide:

1. invariant attacked;
2. concrete reproduction path;
3. exact file/function;
4. why current checks/tests fail;
5. smallest Fibre-relevant fix;
6. regression test.

Do not clear Slice C merely because the schema looks reasonable. Try to break the **memory subject, evidence semantics, no-fake-interiority boundary, and external history anchor**.

If no S1/S2 remains, conclude:

> **Slice C is clear to close on the reviewed SHA, with repository CI green on that SHA.**
