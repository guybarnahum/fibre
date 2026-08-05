# M1 PR #20 adversarial review follow-up

Date: 2026-08-05  
Scope: initial review, re-review, owner decisions, and final negative-property evidence

## Owner decisions

### Guardian rejection has two distinct endings

A persisted Goal Guardian `reject` may be deliberately closed while its lease is active and unexpired. Explicit abandon:

- requires the exact active, unexpired runtime;
- requires a persisted Goal Guardian `reject`;
- requires no freeze report and no authorization consumption;
- appends one immutable `runtime_abandons` record;
- atomically marks the session `aborted`;
- atomically releases the lease with reason `guardian_rejected_abandon`;
- consumes neither Participation Authorization nor obligation;
- permits a fresh request attempt under the same correlation lineage immediately.

Exact retry returns the original abandonment record. Reusing the operation ID with changed content or trying to abandon the session again conflicts.

Unattended rejection is a different outcome. Once the lease expires, explicit abandon is refused. A later acquisition reclaims the episode as a timeout: the persisted Guardian reject remains, the lease becomes `expired`, and the session becomes `aborted`. No abandonment decision is synthesized on the Thread's behalf and nothing is consumed.

### M1 obligation identity is exact prose, and PR #21 is non-mutating

M1 obligation references remain unresolved-intention strings. Their provisional identity is exact UTF-8 prose equality. Leading whitespace, case changes, or Unicode-normalization differences are different provisional identities.

Historical discharge is durable for the exact reference:

- before runtime acquisition, the lifecycle service rejects an exact reference found in prior `authorization_consumptions.obligation_refs_json` for the same Thread;
- a SQLite `BEFORE INSERT` trigger independently enforces the same exact-reference rule on `participation_authorizations`;
- the ordinary authorization boundary still requires the supplied reference to exist exactly in the Thread's current unresolved intentions.

PR #21 is restricted to inspection and simulation and may not create or edit `unresolvedIntentions` or obligations. Structured stable obligation IDs must land immediately after the M1 demonstration and before any mutation API or editor control is introduced.

## Review finding resolution

| Finding | Resolution |
|---|---|
| Initial M-1 — rejected runtime waits for lease expiry | Resolved with explicit private abandonment, append-only record, atomic abort/release, no consumption, and fresh-attempt proof. |
| Re-review M-1 — expiry and backwards-clock guards lacked named tests | Resolved with direct negative tests that fail if either single guard is removed. |
| Initial M-2 — redundant guards not individually pinned | Non-blocking defense in depth. Behavioral invariants and independent database constraints remain tested; targeted mutation work continues. |
| Re-review M-2 — prose identity permits near-miss strings | Semantics pinned deliberately for M1 as exact UTF-8 equality. PR #21 cannot mutate obligations; stable IDs are required before any future mutation surface. |
| Initial M-3 — `thread_memories` not cross-checked with projection | Resolved. Thread integrity compares exact generated-memory sets across reports, rows, and projection refs and revalidates memory digests and bindings. |
| Re-review M-3 — evidence cited an intermediate head | Resolved below with the successful review-fix workflow run and exact head. |
| L-2 — state-change and conflict HTTP distinction unclear | Confirmed. `FREEZE_STATE_CHANGED` and `FREEZE_CONFLICT` are distinct stable 409 codes. |
| L-3 — unbounded append-only rejection rationale | Resolved. Each freeze-decision rationale is limited to 4096 UTF-8 bytes before persistence. |
| Architecture handle count | Resolved. The canonical storage model names WorldStore, RuntimeStore, FreezeStore, and LifecycleHardeningStore. |
| Same-version v4 schema augmentation lacked a test | Resolved. Opening an older v4 shape recreates newer lifecycle tables and triggers. |

The evidence-artifact Markdown hard-break whitespace remains intentional and consistent with the artifact format.

## Restricted abandonment routes

- `POST /threads/:threadId/private/runtime/:sessionId/abandon`
- `GET /threads/:threadId/private/runtime/:sessionId/abandon`
- `GET /threads/:threadId/private/runtime/:sessionId/abandon/integrity`

Stable errors:

- `404 RUNTIME_ABANDON_NOT_FOUND`
- `409 RUNTIME_ABANDON_CONFLICT`
- `422 RUNTIME_ABANDON_REJECTED`

The route retains the existing loopback Host check, private-token boundary, bounded JSON body, `Cache-Control: no-store`, and redacted 5xx behavior.

## Named automated evidence

`services/world-kernel/test/lifecycle-hardening.test.mjs`

1. `Guardian rejection can be abandoned immediately without consuming authority`
   - Guardian reject required;
   - append-only abandonment created;
   - session aborted and lease released;
   - authorization unconsumed;
   - exact retry idempotent;
   - changed second abandon rejected;
   - completed episode cannot run Actor again;
   - fresh request attempt under the same correlation lineage acquires immediately.

2. `abandon requires Guardian reject and is available through the private HTTP boundary`
   - Guardian pass cannot abandon;
   - private token required;
   - successful HTTP abandon returns aborted/released runtime;
   - integrity route proves no consumption.

3. `discharged obligations remain spent even if later text is reintroduced`
   - service-layer historical-consumption check rejects exact reuse;
   - direct SQLite insertion is rejected by the independent trigger.

4. `Thread integrity cross-checks freeze reports, memory rows, and projection refs`
   - intact sets agree;
   - deleting a memory row after disabling its append-only trigger causes integrity failure.

5. `freeze rejection rationale is bounded before append-only persistence`
   - oversized rationale is rejected without consumption;
   - a subsequent bounded freeze succeeds.

`services/world-kernel/test/lifecycle-hardening-rereview.test.mjs`

6. `abandon refuses a Guardian-rejected runtime after lease expiry`
   - expiry is checked before any abandonment write;
   - session, lease, authority, and Thread state remain unchanged by the refused request.

7. `abandon refuses a non-monotonic kernel clock before lease acquisition`
   - a backwards kernel clock raises `IntegrityError`;
   - no abandonment or lifecycle mutation occurs.

8. `unattended rejected runtime expires as a timeout, not synthetic abandonment`
   - later acquisition aborts the old session and expires the old lease;
   - the Guardian reject remains diagnosable;
   - no abandonment or consumption is fabricated;
   - the fresh runtime becomes active.

9. `M1 obligation discharge identity is exact UTF-8 prose`
   - exact spent prose is rejected by the historical ledger;
   - a leading-space near miss is a distinct provisional identity;
   - the service still rejects that near miss because it is not exactly recorded by the Thread.

10. `same-version schema open restores newer lifecycle tables and triggers`
    - an older version-4 shape missing `runtime_abandons` and related triggers is repaired by idempotent schema creation without changing `user_version`.

`services/world-kernel/test/lifecycle-hardening-schema.test.mjs`

11. `schema version 3 migration creates rejected-runtime closure and spent-obligation guards`
    - migration creates `runtime_abandons`, its append-only triggers, and the spent-obligation trigger.

12. `runtime abandonment records are append-only`
    - update and delete fail at the database boundary.

Existing freeze HTTP tests and implementation verify distinct `FREEZE_CONFLICT` and `FREEZE_STATE_CHANGED` codes.

## Full repository result

GitHub Actions run `31054733908` on review-fix head `a583a629ad8c2aa16760374a032c1a37f1009844` completed successfully:

- `npm run check` passed;
- TypeScript build passed;
- **144/144 tests passed**;
- the two formerly surviving abandon-time mutants are covered by named negative tests;
- exact M1 prose identity and timeout semantics are pinned;
- same-version v4 schema augmentation is covered;
- generated context packs were current;
- repository validation passed.

This evidence update is the only content change after that run. The required GitHub check on the final squashed PR head remains the merge source of truth.

## Remaining non-blocking work

- Add targeted mutation assertions for redundant guard pairs where useful.
- Refactor duplicated HTTP boundary helpers before adding another route-wrapper layer.
- Decide and pin a percent-encoded private-path policy across all private routes, not only abandonment.
- Add a separate-connection abandonment race test.
- Replace provisional prose obligations with structured stable identities immediately after the M1 demonstration and before any obligation-mutation surface.
