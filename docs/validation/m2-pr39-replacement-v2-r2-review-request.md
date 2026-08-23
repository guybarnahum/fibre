---
id: m2-pr39-replacement-v2-r2-review-request
status: ready_for_external_review
execution-candidate: 2d58d4d21b11f0e506d86315728a314de5832a04
locally-verified-head: 73ce064acdafc08b9c72c40e82190bc904768beb
r2-binding-digest: sha256:d16f6d4651ede59b442cb83939f7c3e13b3354432c0a1a4cb8a2fe1ba42c3149
r1-verdict: CLEAR
provider-calls: 0
publication-authorized: false
last-reviewed: 2026-08-23
---

# PR #39 replacement-v2 — R2 hostile execution review request

## Requested verdict

Return exactly one top-level verdict:

`VERDICT: CLEAR`

or

`VERDICT: HOLD`

or

`VERDICT: REDESIGN`

Use **CLEAR** only if this exact R2 execution surface may be authorized for one fresh candidate-generation attempt without first changing execution source, protocol authority, runtime parameters, Worlds, genomes, assignment, history envelopes, diagnostic threshold, or publication boundary.

Use **HOLD** for local execution/integrity defects that can be corrected without changing the R1-cleared architecture or experimental question.

Use **REDESIGN** if the current execution architecture itself would make the resulting experiment uninterpretable, non-causal, unsafe to freeze, or structurally incapable of satisfying #39.

This review must make **zero provider/model calls** and must not create replacement-v2 life artifacts.

## Exact review boundary

R1 corrected implementation was cleared at:

`ef9a1bf399280dc3f33a73490f91d3e63c3198d0`

R2 bound execution candidate:

`2d58d4d21b11f0e506d86315728a314de5832a04`

Locally verified head:

`73ce064acdafc08b9c72c40e82190bc904768beb`

First verify that `2d58d4d..73ce064` contains only:

1. `artifacts/validation/m2-pr39/replacement-v2/protocol/r2-execution-binding-v1.json`; and
2. the permanent test correction in `services/world-kernel/test/genesis-situated-continuity-publication.test.mjs`.

No execution-source change after `2d58d4d` is permitted. Documentation commits after `73ce064` are review-state only and must likewise be distinguished from the execution candidate.

The locally observed boundary at `73ce064` was:

- `npm run genesis:replacement-r2-preflight` → `CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL`;
- R2 CLEAR witness → **missing**;
- cognition → **NOT AUTHORIZED**;
- publication → **NOT AUTHORIZED**;
- R2 binding digest → `sha256:d16f6d4651ede59b442cb83939f7c3e13b3354432c0a1a4cb8a2fe1ba42c3149`;
- tests → **714 passed / 0 failed** across 166 active test files;
- `npm run validate` → repository validation passed; World seed validation passed;
- only the two intentionally preserved local evidence directories were untracked;
- zero provider calls and no replacement-v2 life artifacts.

## R1 authority that R2 may not change

R1 hostile re-review returned CLEAR. Treat the following as inherited authority, not tuning knobs:

- five frozen Worlds;
- five frozen genomes;
- fixed World/genome assignment;
- fresh G2 scores `22/24, 24/24, 24/24, 22/24, 23/24`;
- fourteen historical windows through age 21.9999;
- deterministic genome-blind historical envelopes;
- exact World timezone mapping;
- historical coverage bounds;
- skeleton ownership by Fibre;
- model realization schema limited to four fields;
- sparse-history interpretation;
- formation pattern `L L T L L T`;
- horizons `[4,6,8,10,12,14]`;
- treated ordinals 3 and 6, therefore primary horizons 8 and 14;
- five-edge D3 decision rule;
- threshold: both treated ordinals at least **4/5**, at least one **5/5**;
- one fresh candidate attempt only;
- no quality-driven regeneration;
- publication remains separate from candidate generation and diagnostics.

The five R1-cleared envelope digests must remain exactly:

1. `sha256:7ae30e399e6fac72733a43695d6aa8115243067b385710814c0d707b40667110`
2. `sha256:3a642987f93d308497e84002f5c2aa5b166928c04300d963e31e059567b4e319`
3. `sha256:8ce61436aef530df6e940fe246db86f7d03485746bb33d7a3a93b467df797e0e`
4. `sha256:473ac1dc4680739a39ae6975a47e656ecf7a6dca2bf4987176a249f5db58ad46`
5. `sha256:3d3e2c74b1063aa53ff8e3c72f916f6bece5963b33a8bcf0f46b1230b512a1c7`

Do not recommend changing a coverage bound, World, genome, assignment, diagnostic threshold, or envelope because of anticipated outcome quality.

## R2 implementation under review

### 1. One current Pass-A compiler

Development code is flattened. `buildRichLifePassAInput()` uses the current reviewed EventStructure pool directly; there is no v2/v3 compatibility runtime.

Historical protocol windows may contain compiler-only metadata such as `ordinal`. The current compiler must project only the canonical Pass-A developmental-window fields. `ordinal` must not reach model cognition.

Pass A must remain genome-blind.

### 2. Fibre-owned historical skeleton

Each model call receives the reviewed envelope circumstance and may return only the four realization fields permitted by the replacement realization schema.

The model must not author or alter:

- episode identity;
- occurrence time;
- age;
- place;
- EventStructure selection;
- required counterpart identity;
- introduction timestamp;
- historical-window identity.

Fibre stamps the historical skeleton after realization.

### 3. Pass-A reliability budget

The current replacement Pass-A reliability loop uses the frozen independent budget:

- 1 initial generated version;
- up to 2 form repairs;
- up to 2 record retries;
- at most 5 total generated versions.

A malformed locally normalized realization must consume the correct retry budget rather than escaping the reliability state machine.

The recorded cognition/input digest must identify the actual request for each generated version, including retries.

### 4. Sparse-history Pass B

Every replacement Pass-B cognition call must contain the sparse-history rule, including a mechanical genome-copy retry:

> The visible life history is a sparse coverage-oriented sample of concrete episodes, not a frequency sample of the whole life. Repetition in the sample is not evidence that an event type dominated the life, and absence from the sample is not evidence that something never happened.

Verify the schedule mechanically:

- horizons `[4,6,8,10,12,14]`;
- modes `L L T L L T`;
- treated ordinals exactly 3 and 6;
- genome visible only in treated Pass-B calls;
- Pass A and Pass C genome-blind.

A retry must not accidentally widen genome exposure or lose the sparse-history instruction.

### 5. Pass C

Pass C must be memory-scoped and genome-blind. Scheduled reinterpretation may revise remembered meaning but may not rewrite admitted history or model-generated Memory evidence.

Inspect both initial remembered meaning and later reinterpretation paths.

### 6. Candidate-only execution

The R2 runner must generate/freeze candidate evidence only. It must not publish Threads, manifests, situated-life rows, or autobiographical-memory rows.

Publication must remain unreachable until candidate completion plus later diagnostics/admission.

The absence of a candidate-generation npm command before R2 CLEAR is intentional.

### 7. Durable model-call replay

The candidate runner uses the Birth Center durable model-invocation journal.

Attack process interruption/restart boundaries. A durably committed successful provider response must replay without spending another provider call. A response that was never committed may be retried only under the declared operational semantics.

Verify that replay cannot:

- change request identity;
- reset Pass-A form/record retry budgets;
- create a second candidate attempt;
- silently substitute provider/model/runtime parameters;
- reorder a completed cognition call;
- overwrite an already committed response with new model output.

### 8. One-shot boundary

The binding declares:

- `wholeCandidateAttemptCap = 1`;
- `qualityDrivenRegeneration = false`;
- terminal generation failure closes the attempt;
- provider substitution false;
- model substitution false.

Attack every route by which a failed or aesthetically weak generated life might be regenerated. Process restart is allowed only to replay committed calls or continue the same mechanically authorized attempt; it must never become a second scientific attempt.

### 9. Execution authority before adapter construction

This is a critical gate.

The candidate runner must call `verifyReplacementR2ExecutionAuthority({requireClear:true})` before constructing a provider adapter.

With the CLEAR witness absent, verify that an adapter factory with a side effect is never invoked.

Forge CLEAR witnesses and require fail-closed behavior for at least:

- wrong binding digest;
- wrong reviewed candidate head;
- `providerCallsAuthorized != true`;
- `candidateGenerationAuthorized != true`;
- `publicationAuthorized != false`;
- wrong/unknown status or verdict;
- a witness for another candidate/binding;
- source drift after the reviewed candidate.

Do not treat existence of a JSON file named “CLEAR” as authority.

### 10. Transitive source binding

Do not only mutate files listed in `sourceBlobs`.

Trace the candidate runner transitively through Pass A/B/C, durable journal, OpenAI adapter/schema projection, life-continuity derivation, World/genome loading and R2 planning. Identify any execution-affecting module under the bound source roots that can change cognition, retry behavior, candidate bytes, runtime selection, or authority verification without invalidating R2 authority.

If an unbound transitive dependency can alter the experiment while preflight still prints CLEAR, HOLD.

Conversely, do not require irrelevant files or retired experimental runtimes merely to increase the blob count.

### 11. Runtime binding

Current runtime is bound to:

- provider `openai`;
- model `gpt-5.1-2025-11-13`;
- temperature 0;
- top-p 1;
- reasoning effort `none`;
- max output tokens `auto`;
- timeout 45000 ms;
- operational retry limit 2;
- operational retry delay 2000 ms;
- no provider/model substitution.

Verify runner construction cannot ignore or override these binding values through environment variables, defaults, CLI inputs or adapter-factory behavior.

### 12. OpenAI Structured Outputs projection

The canonical Fibre schema must remain unchanged. OpenAI transport must strip unsupported/operationally unsafe schema keywords currently projected by Fibre:

- `uniqueItems`;
- `minLength`;
- `maxLength`;
- `maxItems`.

Every projected constraint must still be re-enforced locally against the canonical schema after the provider response.

Attack valid and invalid controls in the correct `(value, schema)` argument order.

### 13. N1 diagnostic threshold binding

R1 N1 is a hard R2 gate.

Mutate the reconciliation artifact so `clearRequirement` says 3/4, or contradict its statement. R2 authority must refuse.

The current executable authority must prove:

- `eachOrdinalMinimumCorrectCoreEdges === 4`;
- `atLeastOneOrdinalCorrectCoreEdges === 5`;
- the statement is consistent with those values;
- primary ordinals are 3 and 6;
- primary horizons are 8 and 14.

No R2 execution review may change this threshold.

### 14. Canonical situated-life publication

R2 corrected an important architecture mistake before this review: there must be **no `genesis_life_continuity` table** and no second Genesis-owned biography/place/relation authority.

The neutral R1 continuity bundle is a derivation/checking surface. At birth it maps into Fibre's canonical situated-life authority:

- ordinary people → canonical `LifeRelation` records;
- ordinary non-kin/mentor/vendor/etc. relations may use generic `social_contact` with factual role refs;
- frozen World/roster relationship facts survive as factual fields, not inferred meaning;
- used World places → canonical `PlaceEpisode` records with `formative_presence`;
- introduced participants are grounded to actual admitted historical life-event witnesses;
- initial-roster facts are grounded to the canonical seed event;
- place rows are grounded to admitted life-event witnesses.

Attack:

- role tampering;
- relationship-fact tampering;
- participant ID substitution;
- place substitution;
- pre-introduction evidence;
- unknown World roles/places;
- forged continuity bundle differing from recomputation;
- unresolved evidence references;
- duplicate situated rows;
- attempt to publish continuity into a parallel Genesis table.

### 15. Atomic birth

Situated-life continuity must be in the same SQLite transaction as the born Thread, seed/life events, lineage, autobiographical memories and Genesis manifest.

A failure after situated continuity insertion must leave none of those birth-side rows behind.

The continuity rows themselves do not increment Thread version; they are canonical factual projections grounded in the admitted event chain.

### 16. Starting-material boundary

Replacement-v2 may reuse the five byte-unchanged Worlds, genomes, assignment and fresh G2 results only as pre-life starting material.

It may not read or reuse:

- replacement-v1 generated Pass-A content;
- H-v2 generated life;
- failed recovery content;
- old candidate memories or meanings.

Verify candidate construction has no path into the preserved local evidence directories or replacement-v1 generated life artifacts.

The historical `rg4` authority file may be consumed only for the preregistered inherited chronology/cognition facts explicitly required by the current protocol—not as a hidden generated-life source.

### 17. Candidate evidence completeness

Before one-shot execution is authorized, verify the candidate bundle would durably contain enough evidence to inspect each call and outcome after the fact without reconstructing semantics from logs:

- slot/thread/World/genome identities and digests;
- reviewed envelope-plan digest;
- all admitted Pass-A episodes;
- Pass-A call/retry witnesses;
- all Pass-B inputs/outputs and treatment mode/horizon;
- Pass-C initial and reinterpretation inputs/outputs;
- Memory state needed for later diagnostics;
- neutral life-continuity derivation;
- deterministic candidate digest;
- attempt start/identity needed to distinguish replay from regeneration.

If a terminal provider/mechanical failure can occur without a durable terminal artifact identifying what was committed and what was not, HOLD.

### 18. No diagnostic/publication authority smuggling

The R2 CLEAR, if granted, may authorize only provider calls and candidate generation for the bound one-shot attempt.

It must **not** authorize:

- G5/G6 diagnostic adjudication beyond what a later completed-cohort step permits;
- publication;
- a second attempt;
- regeneration for quality;
- Whole-Person standing.

The future CLEAR witness must explicitly keep `publicationAuthorized:false`.

## Required mutation/adversarial battery

At minimum attack:

1. one bound execution source byte;
2. one unlisted but transitively execution-relevant source candidate;
3. one reviewed envelope digest;
4. one runtime parameter;
5. provider/model substitution;
6. each of the forged CLEAR witness cases above;
7. adapter-factory side effect before authority;
8. Pass-A skeleton-field injection;
9. compiler-window `ordinal` leakage;
10. malformed Pass-A response through form/record retry accounting;
11. sparse-history notice removal from initial Pass B;
12. sparse-history notice removal from Pass-B retry;
13. genome exposure in an L call;
14. genome exposure in Pass A;
15. genome exposure in Pass C;
16. D3 4/5→3/4 mutation;
17. D3 primary-horizon mutation;
18. creation/use of `genesis_life_continuity`;
19. situated role/fact/place/participant tampering;
20. continuity rollback failure;
21. candidate runner reaching any publication API;
22. second-attempt/regeneration path;
23. durable replay spending a duplicate call;
24. output-root preexistence/conflict handling;
25. any path that reads preserved replacement-v1/H-v2 generated life.

For each attack report whether it is mechanically refused, accepted, or not reachable. Distinguish a harness mistake from a repository defect.

## Development-mode rule

There is no deployed Fibre population or migrated production data requiring backward compatibility.

Do **not** recommend restoring retired H2/replacement-v1 execution stacks or parallel v1/v2/v3 runtime implementations solely for legacy compatibility. Frozen evidence may retain versioned identities; live development code should remain one current implementation unless a real persisted-data/API/migration boundary exists.

This does not waive evidence integrity. If a frozen artifact is currently consumed as scientific authority, its digest/content must remain bound.

## Review output

Please return:

1. the exact top-level verdict;
2. candidate/head verification;
3. local test/validation reproduction if run;
4. findings grouped as blocking and nonblocking;
5. results of the adversarial battery;
6. explicit statement whether provider calls may be authorized for **one candidate-generation attempt only**;
7. explicit statement that publication remains unauthorized;
8. any residual assumptions that must be frozen into the future CLEAR witness.

A CLEAR does not itself create execution authority until the repository records a matching, digest-bound CLEAR witness. Until then cognition remains closed.
