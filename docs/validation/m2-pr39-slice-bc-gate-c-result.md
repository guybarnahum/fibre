---
id: validation-m2-pr39-slice-bc-gate-c-result
status: accepted
last-reviewed: 2026-08-18
canonical: false
---

# #39 Slice B+C — Gate C result

## Verdict

**CLEAR. Gate C closes. Slice D is unblocked.**

Focused final re-review head:

```text
5822e7a2aacbf1ff612b92d76968c6400966ff08
Fix policy-drift regression setup
```

The final re-review was limited to the two residual findings from the prior focused J/K HOLD and direct regressions from their fixes.

## Verification independently reproduced by reviewer

```text
npm test        461 / 461
npm run check   green
git status      clean
```

The reviewer also mutation-tested the new replay-policy regression by independently reverting each relaxed call site. Reverting either event-ID derivation or replay caused the regression to fail, proving both paths are load-bearing.

## S1 — current Pass-A form policy on historical replay: CLOSED

The boundary is now explicit:

```text
normalizePublishedGenesisEpisode       current observable-form policy ENFORCED
genesisLifeEpisodeEventId              observable-form policy NOT re-applied
applyGenesisLifeEpisodeEventToThread   observable-form policy NOT re-applied
```

Publication still runs enforcing normalization before event-ID derivation. Replay and event-ID derivation still enforce the structural episode schema: exact keys, types, identifiers and timestamps remain checked. Only the two moving Pass-A form-policy gates — observable-action byte ceiling and interiority-form patterns — are not re-applied to already-admitted history.

The regression proves all three properties together:

1. the current Pass-A form policy rejects the synthetic former-policy content, so the test is non-vacuous;
2. already-published history with that content remains replayable and integrity-verifiable;
3. changing the content without changing its content-addressed event ID still fails specifically on the Genesis episode identity mismatch.

This pins the doctrine:

> **An append-only ledger is validated when it is written, not when it is read.**

## S2 — runtime single-producer guard: CLOSED

The runtime guard fixture now reaches its assertions and proves ordinary command authority cannot mint `THREAD_LIFE_EPISODE_RECORDED`. Genesis publication remains the only operational producer of the uncommanded life-event type.

The root cause of the original red fixture was a long test `threadId` overflowing the existing #37 claim-predicate byte budget during legacy seed identity persistence. That sensitivity predates this delta and is not a Gate-C finding.

## Gate-C standing

Slice B holds: symbolic inheritance is textual, provenance-exact and numerically inert; its positive control remains an unwired capability/reference ceiling.

Slice C holds: a particular life can be generated before Fibre knows what personality or future decision it is supposed to produce, and admitted Pass-A episodes are authoritative, uncommanded, content-addressed, version-progressing, atomically published Thread history that remains replayable as policies evolve.

The #38 bridge is also pinned: a Genesis life episode can serve as the same-Thread historical anchor for a childhood autobiographical memory, while `THREAD_SEEDED` cannot substitute for a childhood event merely because it created the Thread record.

## Carry-forwards — not Gate-C blockers

- EventStructurePool v2, differentiated developmental ranges and richer conversational/social affordances → Slice E.
- Burned-world enforcement, development-artifact archive, actual cohort-genome positive control and final stratum sizing → Slice G.
- Mechanical conditions and motivational modulation → post-#39 / #42.
- Before the Slice-G cohort, preflight the chosen Thread-ID convention against the current #37 claim-predicate byte budget so identifier length cannot surprise publication mid-cohort.

No carry-forward above blocks Slice D.
