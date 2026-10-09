---
id: validation-meet-encounter-run-path-audit
status: proposed
last-reviewed: 2026-10-08
canonical: true
---

# Meet / Encounter runtime audit — findings and deferred work

**Status:** source-level audit, **not** a code fix or accepted behavior change. Inspected `main` on 2026-10-08 after recipient-contact Gate 1 and the World operating-economics plans. No new tests, CLI validation or staging deployment were performed as part of this audit. Source-level risks require the specific proofs below before being called live defects.

## The real paths — do not conflate them

1. **Visitor views a Thread's actual present**: the Viewer/route `/meet?thread=...` is a UI entry (the Viewer implementation itself is not in the inspected World files); the client-neutral public surface is `GET /api/threads/:threadId/present`. `services/thread-presentation/src/http/current-life-api.mjs` gates a public Thread; `infra/deployments/thread-presentation/cloudflare/encounter-worker.mjs` requests `/internal/lived-now/ensure`; World resolves LivedNow and publishes the current projection. Viewing is **not consent or a conversation**.
2. **Visitor addresses that moment**: `POST /api/threads/:threadId/encounter` takes `requestId`, displayed `situationId`, `utterance`, and optionally a prior accepted `encounterStoryId`. Presentation forwards to World `/internal/public-visitor-encounter`; World `public-visitor-encounter.mjs` checks a completed request receipt, validates the displayed scene, loads bounded immediate encounter history and private Thread context, asks **Interior Cognition** for an `accept | decline | defer` stance, and—only for accepted speech—asks for a complete response, records one objective Encounter Story, asks for a personal Experience, queues delayed consolidation, then records the completed receipt. No paid work, forced response for refusal or caller-authored place/activity is required.
3. **Different, narrower/funded path**: `/internal/inside-fibre/meeting-entry` and `/internal/inside-fibre/visitor-encounter` use `inside-fibre-visitor-meeting.mjs`, work availability and Fibre Credit compensation. This is *not* the public `/meet` path; preserve real compensated-work meaning but do not perpetuate duplicate generic encounter semantics for compatibility.
4. **N7 Live Encounter capability**: `live-encounter.mjs`, `lived-social-live-encounter.mjs` and the N7 social meeting flow support streamed, interruptible expression and independently owned World interleaving for the Thread-to-Thread route. The above **public** `/encounter` service still uses the older **complete-request/complete-response** `respondToLivedEncounter` path. The N7 live primitive is not yet a general public-person live ingress/duplex transport; do **not** describe the public Viewer as having gained N7 streaming merely because the primitive exists.
5. **CLI proof**: `npm run thread:meet -- --env staging [--thread THREAD_ID]` uses the same World `ensure` and public-visitor encounter authority directly, bypassing Presentation/Viewer. See `docs/validation/n6-public-lived-encounter-slices.md`; N6.6a CLI, N6.6b client-neutral endpoint and N6.6c Viewer have distinct acceptance evidence requirements. Source implementation alone does not close them.

## Findings, ranked by Fibre impact

### 1. High — public interaction is still turn-shaped, not an interruptible lived encounter

**Evidence:** `services/world-kernel/src/public-visitor-encounter.mjs` (~lines 199–295) calls `formVisitorMeetingStance`, waits for `respondToLivedEncounter` (complete `responseText`), then writes the Story and Experience; `services/thread-presentation/src/http/current-life-api.mjs` (~lines 93–173) returns one complete accepted response. N7 streaming currently runs in `lived-social-live-encounter.mjs`, not the public caller route.

**Missing behavior:** a visitor's interruption, overlapping speech, naturally chosen silence or new World event cannot be applied to the public path *during* response generation with N7 audible-prefix truth. The synchronous World request can keep a Durable Object waiting for model calls. This is the largest remaining difference between the public `/meet` vision and a life that continues through communication.

**Future work:** preserve existing public scene and consent authority, adapt its outward exchange to the existing N7 ephemeral coordinator and provider-neutral `streamExpression`—**not** a new meeting engine, chat-session store or turn manager. Keep objective history at audible/exposed boundaries, not at generated-but-unheard text. The initial acceptance should be one genuinely interrupted public utterance plus a mid-encounter scene change, each with correct World chronology and no duplicated private aftermath. Decide the minimum public transport when doing the N6.6b/c proof; don't build SSE machinery for its own sake.

### 2. High — completed-receipt idempotence does not yet cover interruptions before the receipt

**Evidence:** `public-visitor-encounter.mjs` (~lines 138–156) replays only an existing **completed** `getPublicEncounterReceipt`; the accepting branch generates cognition and persists a Story, personal Experience and consolidation opportunity before `complete(...)` writes the receipt (~lines 219–295). The proven test `services/world-kernel/test/public-visitor-encounter.test.mjs` (~lines 327–352) covers **retry after a completed receipt**, not a failure between Story admission and completion. `lived-experience-store.mjs` derives the Story ID partly from `occurredAt` and content; a fresh request timestamp may yield a different Story after a partial failure.

**Risk to prove, not yet an observed production failure:** if Experience formation or wake scheduling fails after the Story was written, a client retry under the same request ID can re-run private stance/response, cost more inference, and potentially create another objective Story or personal Experience.

**Future work:** use the smallest durable **progress/claim** boundary keyed by public request identity and actual admitted scene/utterance to resume an in-flight exchange without re-authoring committed facts. Prefer the already-existing Encounter/Experience stages and receipt authority over creating another session log. Only make outwardly exposed speech authoritative; after a genuine completed decision reuse its outcome. A single fault-injection test should prove “interrupted accepted encounter does not invent a second life event or repeat already-admitted cognition.” No brittle exact transcript assertions.

### 3. High — three sequential model decisions on every accepted public utterance

**Evidence:** `public-visitor-encounter.mjs` (~lines 199–208, 219–227, 267–288) separately calls visitor stance (Interior Cognition), response (`respondToLivedEncounter`), and first-person Experience (`formThreadEncounterExperience`), before later delayed consolidation (additional cognition only if warranted). `formVisitorMeetingStance` resolves its own private context through Interior Cognition despite `public-visitor-encounter.mjs` separately loading recent state/memory for response/Experience. This can be roughly three sequential inference round trips for one accepted public Send, **plus** a real LivedNow plan/renewal when required; actual token and latency data has not been collected.

**Issue:** there is a principled reason to keep *participation stance*, *audible expression*, and *subjective Experience* as separate **authorities**, but those authority distinctions do not automatically justify duplicating large context retrieval/prompt construction or requiring an Experience-model call for **every** small spoken beat. N7.5 already batches delayed consolidation by lived episode; batching there does not remove the immediate three-model path.

**Future work:** first instrument *per semantic operation* with [World cost accounting](../architecture/world-cost-accounting.md). Keep independent consent; examine whether admitted/stable utterances can become objective beats cheaply and a **bounded episode-level** personal Experience can be authored once at a meaningful natural boundary, without compulsory reflection after every response. Share a single immutable bounded lived snapshot across the stance/expression/Experience chain where correct, without promoting private context to public authority or suppressing materially new evidence. Compare actual call count/latency/token use to baseline. Do **not** collapse all cognition into one model verdict that simultaneously self-authorizes, speaks and remembers.

### 4. High — long model waits create a scene-interleaving truth question

**Evidence:** `validateDisplayedSituation` runs **before** participation and response calls (~lines 158–168); the public service does not clearly revalidate scene immediately before the Story/Experience write (~lines 228–290). N7's newer live-social path separately recognizes scene changes and can abort stale ongoing speech; the public synchronous path uses the original `at` for the entire sequence.

**Risk to validate:** when a Flight Plan boundary or a second World action changes LivedNow during slow inference, the resulting complete response may be written as though the Thread were still speaking in the old moment. Conversely, a compatible scene with a new situation ID can legitimately remain continuous; do not reject merely because an ID changed.

**Future work:** use the already accepted scene-fact comparison and World authority at the **speech admission** boundary, not a second arbitrary time or plan. If the scene materially moves, terminate/redirect only the remaining expression, preserve what was actually heard and keep the timing honest. One controlled scene-change-while-speaking proof is more valuable than many route-error tests.

### 5. Medium — two visitor implementation paths duplicate Encounter/Experience orchestration

**Evidence:** `public-visitor-encounter.mjs` (~299 lines) and `inside-fibre-visitor-meeting.mjs` (~233 lines) both resolve lived context, generate complete response, construct Story and visualization, synthesize immediate Experience and enqueue consolidation. The latter has genuine **work-commitment availability and settlement** logic absent from ordinary visitor interaction; its internal API also supplies an explicit `occurredAt`, unlike public World-owned time.

**Concern:** two routes to the same durable social concepts increase maintenance and inconsistent future N7 migration. Do not remove the compensated-work authority just to reduce line count.

**Future work:** converge only the genuinely common `admitted outward event → one Story → individualized Experience/queue` domain step; leave financial settlement and prior work authorization behind their owning authority. Before deleting an old path, check its actual callers/deployment and accepted paid-visitor contracts. Do not keep wrappers merely for backwards compatibility if a path is obsolete.

### 6. Medium — situational refresh and candidate discovery need cost evidence, not a rewrite

**Evidence:** a public `GET .../present` makes a real `/internal/lived-now/ensure` call and may perform legitimate plan renewal, regulation and publication. `livedNow.validateDisplayedSituation` avoids full reconciliation when the prior and current planned scenes still match, but may call `ensure` if scene or plan coverage requires it. For natural Thread-to-Thread contact, `lived-social-meeting.mjs` `discoverCoPresent` enumerates `listCurrentSituations({at})`, filters and refreshes candidates. These are **different paths**; do not misattribute the candidate scan to the public `/meet` route.

**Opportunity:** measure rows, token calls and wait time before introducing another cache or scheduler. The existing deterministic scene validation is useful. If naturally co-present discovery grows costly, prefer an indexed physical venue/time candidate set over scanning unrelated Threads. Preserve grounded physical presence, no distance-radius shortcut, no quota-driven social events. Also inspect the separate [Flight Plan renewal hypothesis](../architecture/world-compute-optimization.md); do not modify it before the current E7.5 alarm proof.

### 7. Medium — tests prove mostly stage boundaries, not full public organism behavior

**Evidence:** `public-visitor-encounter.test.mjs` fixtures supply stance and response, and its existing idempotence check covers a completed retry only. `docs/validation/n6-public-lived-encounter-slices.md` correctly retains separate direct-World, public endpoint and real Viewer acceptance. N7 Thread-to-Thread live tests do not automatically prove human Visitor → Thread public streaming or interruption.

**Future work:** retain lean focused semantic tests: (a) genuine decline does not create history; (b) interrupted accepted public interaction preserves exactly the audible portion without duplicate history, (c) genuine scene movement ends or redirects speech without a frozen life, and (d) later visit reflects an autonomously advanced Thread. Limit operator/runbook proofs to one meaningful naturally accepted instance and one valid refusal; do not generate repeated model calls just to force a pleasing response.

## Recommended implementation order (after the current staging experiment)

1. **Preserve E7.5 evidence first.** World Kernel already scheduled Thread `thr_bd945d68e3e2b0da31a9a612e603065bf09e2b34` for `2026-10-09T02:00:00.000Z`. Guy can inspect its recorded history after the deadline; no need to be present at the instant. No World redeployment or manual `/ensure`/`/reconciliation/wake` for that Thread until evidence is captured.
2. **Bound and measure the existing public `/encounter` chain** using [cost attribution](../architecture/world-cost-accounting.md), real state-cost counters and model usage/elapsed time already carried in provenance. No new model calls for metrics.
3. **Fix causal acceptance holes, if reproduced:** partial-progress retry, stale-scene/waiting-expression truth. Keep exact existing World/Experience records, not a duplicate durable chat session.
4. **Converge public expression on the N7 live boundary** with the smallest client-neutral transport and controlled interruption. Keep `accept | decline | defer` dignity and support real quiet choices.
5. **Reduce demonstrated redundant inference** (not personhood). Prefer bounded episode Experience rather than one cognitive “experience” per spoken sentence/turn if its semantic value and evidence justify the change.
6. **Only then consider merging overlapping generic public/paid visitor domain composition**, retaining actual paid work/settlement semantics and removing obsolete code without aliases.
7. **Resume N6.6a → N6.6b → N6.6c live evidence** and N7.11 selective consequence/social development; neither is accepted from this source review alone.

## Hard constraints and proof discipline

- **No second LivedNow, chat session, meeting engine, population clock or universal scheduler.** Use `InfraDriver` and the current World/Encounter/Experience/consolidation authorities.
- **No security/hardening scope drift**; this is a lived-person fidelity/efficiency audit, not an auth/CORS review.
- No backwards compatibility or legacy adapters for obsolete active paths.
- Theme active command/file/event names by capability, **never milestone coordinates or deployment environment**. Use `--env staging` as an argument.
- Test only semantic failure modes with short, meaningful assertions; let Guy run local focused validation and the one full `npm run slice:validate` at implementation closure. No assistant claims of executed code/tests or deployment without Guy's output.
- Track whether each future change makes a Thread's **private choice, lived chronology, real expression or later consequences** more causal—not merely more complex or better documented.

### Suggested verification when implementation begins

```bash
git pull --ff-only origin main
npm run test:focused -- \
  services/world-kernel/test/public-visitor-encounter.test.mjs \
  services/thread-presentation/test/public-current-life-api.test.mjs \
  services/world-kernel/test/live-encounter-interruption.test.mjs \
  services/world-kernel/test/live-encounter-world.test.mjs
npm run slice:validate
```

These are **future validation commands**, not a request to run them before the E7.5 staging evidence or a claim that a new implementation exists.

## 2026-10-08 audit execution checkpoint — evidence and first cut

**Prerequisite captured.** Guy's 18:38 and 19:03 Phoenix read-only Observatory snapshots bracketed the planned `2026-10-09T02:00:00Z` World boundary. The sleeping Thread entered its planned waking situation at `02:00:00.003Z`, retained the previous situation, and scheduled `03:00Z`, with no intervening operator wake reported. See [E7.5 evidence](n5-encounter-slices.md#e75--flight-plan-boundary-driven-autonomous-life--natural-staging-progression-observed). This closes the **observation prerequisite**, not direct internal callback attribution or unrelated acceptance gates.

**Source-level baseline, not actual billed/runtime usage:** an accepted public `POST /api/threads/:threadId/encounter` reaches `formVisitorMeetingStance` (one Interior Cognition `invoke` with bounded Thread-owned evidence), `respondToLivedEncounter` (one complete outward `invoke`), and `formThreadEncounterExperience` (one immediate Experience `invoke`), with a separate delayed consolidation opportunity. A decline/defer only invokes the first step. Before these calls, World checks the completed receipt, validates LivedNow against the displayed situation, and resolves bounded immediate history, Thread state, memories, and plan. After acceptance, it writes Story → personal attention/Experience → consolidation queue → completed receipt. This is **three sequential model invocations on the accepted hot path**, not a measured token/latency estimate or evidence that any call can be eliminated without loss of meaning.

**Existing cost surface:** Interior Cognition already returns `metrics.modelCalls`, `latencyMs`, and `usage`; the Cloudflare World worker emits `world-state-cost` SQL read/write/query deltas; the operator CLI `thread:meet -vv` reports request-level elapsed time. The current public service does not record a complete per-stage token/latency summary of outward response and immediate Experience alongside the returned result. Do not infer per-stage cost from total request time or SQL logs. First inspect actual existing integration logging/usage with one naturally chosen, bounded live interaction; add only the smallest missing observation if necessary.

**Next smallest slice, not yet implemented:** (1) establish one measured accepted-or-refused public encounter baseline while treating genuine refusal as valid; (2) fault-inject one failure after objective Story admission and before completed receipt, then check whether a retry with the same `requestId` repeats objective history or already-admitted cognition; (3) only if reproduced, resume through existing World Story/Experience authorities using minimal durable progress. A separate stale-scene-while-inference proof follows if warranted. N7 public live convergence and episode-level Experience optimization remain **deferred** until these cost and causal boundaries are understood. No new sessions, frameworks, polling, or security drift; tests should validate World truth and voluntary agency.

**Status:** source map rechecked against `main` at `cc4ace553e092a265beb84d8e1bafda8ad0c247e`; no runtime code/test execution, staged visitor encounter, measured tokens, or deployment is claimed by this documentation-only checkpoint. Local validation and deployment remain Guy's.

## Public inference-cost measurement — instrumented, runtime evidence pending

**2026-10-08 source change:** the existing Cloudflare World deployment's public visitor model adapter now reports one bounded `public-encounter-model-usage` event after each model invocation. The stage is `participation`, `expression`, or `experience`; the event contains outcome, elapsed milliseconds, provider/model, provider invocation-attempt count and provider-reported token usage where available. The event contains **no prompts, model outputs, private stance, Experience text, or visitor utterance**. It adds no model calls, new database state, new scheduler or new chat-session semantics.

This is the narrow missing observation, not a claimed cost baseline: the instrumentation is committed on `main` but requires Guy's local validation and World Kernel deployment before live numbers can be collected. `world-state-cost` already records SQL query/read/write deltas, and `thread:meet -vv` reports full encounter request elapsed time. The per-stage model logs report invocation wall time (including adapter retries), not Cloudflare billing duration or an invoice; failed calls may lack provider usage. The public scene-validation `LivedNow` path can also invoke planning models and is *not* included in these three encounter-stage totals. Do not treat a declined turn or missing usage as a three-call measured sample.

**Operator evidence:** after Guy validates and deploys the source change, collect one bounded genuine `thread:meet -- --env staging --thread <real-id> -vv` sample alongside `wrangler tail` for the World Kernel, then compare the `public-encounter-model-usage` events with `world-state-cost` and CLI elapsed time. A real `decline` or `defer` is valid evidence for the one-stage path. Do not repeat interactions solely to manufacture an accepted outcome.

## Partial-request failure — narrowed proof target, not fixed

Source inspection confirms that a completed receipt is appended **after** the accepted Story, immediate personal Experience, consolidation enqueue and its wake callback. The Story ID depends on `occurredAt` (server-owned time) and actual content; the receipt key is `requestId`. `recordThreadEncounterAttention` deduplicates on Thread plus Story reference, not on the public `requestId`. Therefore, if a request fails after its first Story admission and a retry arrives later under the same `requestId`, the completed receipt is absent and the code can re-run stance/expression and admit another Story and personal aftermath. This is an actionable **source-level causal gap**, not a claimed staging occurrence.

**One semantic fault test to write next:** cause exactly one failure at the existing `onExperienceQueued` boundary after accepted Story/Experience/queue persistence, then retry the *same bound* public `requestId` at a later World time. The desired invariant is **one admitted outward Story, one subjective Experience, one delayed consolidation opportunity, and no repeated committed cognition**. Before implementing a fix, run this focused test to establish actual failure, inspect existing store idempotence/transaction boundaries, and choose the smallest durable request-progress witness. Never create a conversation/session store or rewrite admitted history. The test should assert stable domain facts and fail with one short meaningful causal message.

No partial-retry fix, fault-injection result, or runtime validation is claimed yet.

## Staging cost evidence and bounded read-path correction — 2026-10-08 Phoenix

Guy's first natural `thread:meet` World log tail captured **one actual public participation appraisal**, plus the preceding explicit CLI `LivedNow.ensure` and directory lookup. The pasted evidence did not include the CLI outcome. It contains no public `expression` or `experience` model invocation, so it is a **one-stage participation sample**, not an accepted three-stage price/latency baseline. Do not manufacture another accepted response.

| Observed World operation | Wall time | SQL queries | Rows read | Rows written |
|---|---:|---:|---:|---:|
| `GET /internal/thread-directory/entry/:threadId` | 107 ms (Durable Object) | 25 | 1,952 | 0 |
| `POST /internal/lived-now/ensure` | 3,879 ms (Durable Object) | 705 | 13,040 | 9 |
| `POST /internal/public-visitor-encounter` | 4,408 ms (Durable Object) | 655 | 4,402 | 6 |

The public `participation` model invocation returned `completed` with **4,368 ms elapsed**, OpenAI `gpt-5.6-sol`, **1 provider attempt**, and provider-reported **3,964 input + 205 output = 4,169 total tokens**. A single sample does not establish typical cost, provider billing, or tokens for expression/Experience. `LivedNow.ensure` can perform separate planner work; its inference cost is not covered by the encounter-stage log.

**Measured bottleneck and source explanation:** `SituatedLifeStore` accounts for 557/655 queries and 2,619/4,402 read rows in the public request; for the separate `LivedNow.ensure`, it accounts for 571/705 queries and 2,649/13,040 read rows. `listCurrentLifeRelations` previously fetched all relation IDs then called `lifeRelationHistory` for **each** relation, each doing a Thread existence read, ordered relation-history read and integrity-head read. This N+1 history verification, not any demonstrated requirement for hundreds of distinct database calls, explains the query concentration. The number of relations was not independently enumerated; do not report an inferred relation count as measured fact.

**Minimal source correction committed on `main`, operator validation pending:** `SituatedLifeStore.listCurrentLifeRelations` now fetches all revisions for **only this Thread** and their matching integrity heads in two bounded SQL queries after checking the Thread. The existing canonical JSON, digest-chain, revision-order, supersession, temporal-order, stable identity and lineage-head checks are retained through a shared decoder; no plain “latest row” shortcut. An existing store test now covers two distinct relationships, including one multi-revision relation, after reopening. This affects existing read paths, not model calls, exposure, histories or authority. Its expected SQL reduction is a **source prediction**, not a measured post-change outcome or performance acceptance until Guy validates and deploys.

**Next gate:** Guy runs focused situated-life + public-encounter tests, then the single full `npm run slice:validate` before deployment. Compare one naturally occurring future request's `SituatedLifeStore.queries` to this recorded baseline without chasing an exact 557-query threshold or generating new model calls solely for comparison. Then resume the public partial-retry fault reproduction already specified above; no additional telemetry framework.

**Operator staging deployment (Guy, 2026-10-08 20:17 Phoenix):** `npm run cloud:deploy:service -- --env staging --service world-kernel` succeeded with source `120e26cbe6fa93fdc3542f122b842d38c2763aa0` and Cloudflare version `9ee53a54-fa44-4ad6-9d0d-1c53cf7c6599`. D1 migrations verified. This proves the optimized code was deployed; neither focused/full local test output nor post-deployment SQL-cost delta has been supplied. Preserve that distinction.

**Partial-retry reproduction committed, red/green operator check pending:** a single high-value test in `services/world-kernel/test/public-visitor-encounter.test.mjs` injects a one-time wake callback failure **after** Story admission, personal Experience and durable consolidation enqueue, then retries the same request at a later World time. It requires one Story, one queued Experience and the original three cognition invocations. The present runtime is expected to fail at the duplicated Story invariant; that failure is a *hypothesis until Guy runs it*. Do not deploy the intentionally failing test or claim a correction before it is shown. The smallest durable recovery path will be decided after the red result and source inspection, avoiding a second chat/session authority.

## Partial encounter retry — reproduced and source correction awaiting operator validation

**2026-10-08 20:24 Phoenix, operator RED evidence.** Guy ran `npm run test:focused -- services/world-kernel/test/situated-life-store.test.mjs services/world-kernel/test/public-visitor-encounter.test.mjs` at `8146eb15`: **8 tests, 7 passed, 1 expected failure**, `retry duplicated an admitted encounter: 2 !== 1`. The relationship-read test group passed. This confirms the post-persistence/post-wake-interruption duplicate Story defect, not merely a hypothetical source risk; it does not yet measure post-deployment World SQL reduction.

**Smallest causal recovery path implemented on `main`, not yet validated:** one append-only `public_encounter_admissions` request-to-Story witness is inserted *in the same World transaction* as the objective Encounter Story. The binding covers request ID, participating Thread, original encounter input digest and canonical Story ID. On a repeated request with no completed receipt, the public service checks that binding **before** scene/consent inference, reuses the exact original Story, retrieves any already-authorized Thread Experience, and requeues/schedules the same pending consolidation consequence idempotently; only then does it write the completed receipt. If the first run failed between Story admission and Experience, recovery can resume the missing personal Experience against the persisted original situation, without re-speaking or re-appraising the visitor's request. No mutable session authority, background polling, new LLM call for completed Experience, or change to historical Story identity is introduced.

**High-value proofs added:** (1) after an injected failure in the consolidation wake callback, retry returns the same Story with no repeated participant cognition, expression, Experience or queue record; (2) after injected immediate-Experience failure, retry resumes the admitted Story without repeating consent/outward speech; (3) a local SQLite store roundtrip across restart verifies that request admission remains bound to exactly one original Story and conflicting input cannot reuse the request ID. These are **tests committed, not test passes** until Guy runs them.

**Validation/deployment gate:** run focused `public-visitor-encounter.test.mjs` plus `lived-encounter-story-persistence.test.mjs` and `situated-life-store.test.mjs`; if green run the one canonical `npm run slice:validate`. Guy owns staging deployment. The existing World source `120e26cb` remains the latest operator-confirmed deployed SHA until he reports otherwise. Post-change actual SQL and accepted three-stage inference remain unmeasured. A further slow-inference/stale-scene proof remains a separate audit step, not silently solved by this retry correction.

**Scope limits:** failures *before* Story admission can repeat uncommitted inference (no admitted history exists yet). Delayed recovery of an uncommitted immediate Experience uses persisted original World situation and current available Thread cognitive context; the test proves objective/subjective record uniqueness, not a perfect historical replay of transient interior state. That deeper temporal anchoring is a future fidelity question, distinct from the reproduced duplicate World Story defect.
