---
id: operations-world-life-waves
status: proposed
last-reviewed: 2026-10-21
canonical: false
---

# Phased World life and social observation in staging

**Aim:** learn whether a larger, independently situated population discovers
verified public venues and encounters one another of its own accord, while
recording actual World/Cloudflare cost. A population wake is an operator
intervention, **not** evidence of spontaneous life or a prescribed meeting.

## Inspect once

```sh
npm run world-social:candidates -- --env staging --limit 64
```

Use the emitted `evidencePath`. Its `lifeStatusCounts` and `lifeContinuity`
classify **all inspected Threads**, including those without a current city:
`scheduled`, `blocked`, `plan_expired`, `unarmed`, and
`not_established`. Blocked entries preserve the actual failure reason,
attempt count, and last plan horizon. This is read-only and does not
invoke planning. Do not include blocked/expired lives in a cohort
experiment before inspecting their cause.

Its `underpopulatedCities` is based on
**currently enacted World localities**, not birthplaces. It includes real
cities with zero attested public venues and reports `neededToThree`, but
does not infer a Thread's future residence from a new birth. Check that
`scannedThreadCount` covers the intended cohort and that `unavailable`
is empty before using its counts. A directory/bounded-source limit is
a caveat, not an empty World.

Use `npm run world-place -- list --env staging --locality Kisumu --country-code KE`
(or the actual grounded city) to see verified places. Admit one or two
actual publicly verifiable, locatable venues using
`npm run world-place -- admit-public --env staging --file /path/to/venue.json`.
The data shape follows `data/world/places/tbilisi-national-library-building-iii.json`
and requires an independently checkable `evidenceRef`, public coordinates,
IANA timezone and relevant affordances. A venue must be explicitly listed
through the existing `world-place discovery` command to be surfaced by
City Guide. Admission/listing offers places to explore, **never** directs
a Thread to visit them.

To fill a grounded city from one/two to at least three people, use the
existing `genesis:birth` operator command with its real city selector,
one birth at a time. Confirm publication and independently enacted current
city before counting the new citizen. Do not alter existing Threads'
birthplaces to make population counts look better.

## Automatic continuity recovery

World uses admitted Flight Plan deadlines as its normal event-driven clock.
An hourly Cloudflare watchdog is a fallback if that single World alarm goes
missing. Repeated failures keep a delayed, inspectable wake obligation rather
than abandoning the Thread after three attempts. A coverage failure is retried
after a day; other failures use capped backoff. Old established Threads missing
wake frontiers are adopted once at schema installation, with recovery attempts
spread 15 minutes apart. Multiple overdue lives are paced at one per ten
minutes, not awakened in a model-request storm. Deliberately retired Threads
are excluded.

If the last witnessed situation is over four days old, World opens a new
Thread-authored horizon at the actual present from grounded continuity and
leaves the intervening life unobserved. It does not fabricate a month of
retrospective plans, relationships, visits or experiences. The planning mind
receives the last-observed timestamp. The missing interval is visible through
the chronology of admitted situations; it is not currently a separate
timeline-event type.

**Periodic continuity check (C1/C2 staging deployed October 22):** the existing hourly Cloudflare trigger checks one durable audit deadline alongside alarm health. When due (normally once every 24 hours), World performs one bounded, indexed consistency query: established, non-retired Threads with a personal Flight Plan and a missing, cleared, or obsolete wake obligation are requeued. A pass repairs at most 32 Threads, 15 minutes apart; remaining work is checked on the next hourly run. Valid wake deadlines and delayed retries are left alone. World offers any restored deadline to the existing scheduler before advancing the audit checkpoint. The audit itself makes **zero LLM calls** and cannot decide what a Thread does next.

**Interpreting the census:** `plan_expired` can mean a previous Flight Plan has expired while a **future recovery wake is already queued**. Check `nextWakeAt`, `blockedReason`, `failedAttempts`, the current plan horizon and the CurrentSituation together. A normal sleeping/frozen Thread is not a stalled Thread. A failed `ensure` may retain a quiet future retry without having recovered yet. No automatic meeting, forced wakefulness or retrospective invented life follows from the audit.

**Validation boundary:** C2 source passed local `slice:validate` (1,717 tests) and deployed to staging on World revision `1a4ed14cef33e80f9031bcad63a702437615011d`, including explicit World schema installation. The post-deploy read-only census sampled 42 Threads: 23 `scheduled`, 19 `plan_expired`, none blocked or unarmed. The gradual rise in scheduled lives follows existing staggered legacy recovery, **not yet a demonstrated recurring orphan audit**. C3 must directly witness a newly lost obligation detected by a naturally scheduled audit, handed to World, and followed by ordinary life continuation.

After deploying this revision, inspect the read-only census **before**
manually applying a world-life wave: legacy lives may already be queued for
automatic recovery. Manual waves are for bounded controlled experiments or
evidence-guided exceptional repair, not the normal life engine.

## Measure then wake in explicit waves

Prepare staging/cloud service configs before measuring. Run in terminal A:

```sh
npm run infra:measure -- --env staging --idle-seconds 90 \
  --observe-seconds 300 --skip-meeting --skip-admin
```

Do not use staging during the initial 90-second baseline. When the tool
announces the World-life window, in terminal B:

```sh
npm run world-life:wave -- --env staging \
  --file .fibre/world-social/staging/candidates/cities-EXAMPLE.json \
  --thread thr_443b1151f4c24ac8b7cbd1e9fb4df4c724cb3d4a

npm run world-life:wave -- --env staging \
  --file .fibre/world-social/staging/candidates/cities-EXAMPLE.json \
  --thread thr_443b1151f4c24ac8b7cbd1e9fb4df4c724cb3d4a --apply

npm run world-life:wave -- --env staging \
  --file .fibre/world-social/staging/candidates/cities-EXAMPLE.json \
  --city London --country-code GB --offset 0 --limit 3
```

Replace `cities-EXAMPLE.json` with the exact saved `evidencePath`.
The CLI reuses Fibre's existing terminal progress runner. During each
`--apply` request it displays the selected Thread's complete ID and
an elapsed-time heartbeat (five seconds by default, configurable with
`FIBRE_PROGRESS_INTERVAL_MS`). The server-side planning sequence is
opaque until its HTTP response: "waiting for World reconciliation" does
not claim any unreported internal progress. Each success also records
its measured per-Thread duration in the existing wave evidence file.

The CLI selects unique, stable Thread IDs from that actual candidate
snapshot. `--thread` is an explicit single-person recovery canary and
cannot be combined with `--city` or cohort offsets. City selection uses
enacted current location, not birthplace. A successful manual ensure
does not force physical wakefulness, social contact, or a move. It defaults to a dry run; `--apply` issues **one serial**
authoritative `/internal/lived-now/ensure` per Thread, with a
1.25-second interval and a hard 21-Thread cap. It stops and saves
partial evidence on the first failure. This may cause LLM-backed
planning and real World changes, and is never a purely read-only
measurement. Each completed wave is a separate deliberate operation.

Inspect the two resulting JSON evidence files, the Admin World Events
venue-local timelines, and targeted `world-social:probe` evidence. After
checking budget/latency/health, follow with waves of 6, then 12, then
the remaining 21, adjusting offsets within the same frozen selection.
Refreshing the candidate snapshot between waves changes the selected
set; if it is refreshed, recompute offsets and avoid repeat selection
based on already-saved wave evidence.

A failed wake is not repaired by resetting its attempt counter.
World now retains a paced recovery deadline, but the underlying plan must
still be admissible. Successful `LivedNow.ensure` admits a new Thread-owned
plan and re-arms its per-Thread life frontier; verify its plan horizon
and non-null next wake with `thread-journey:probe`. On an exceptional
manual failure, inspect the saved response `code`, `detail` and
`diagnostics.stage` before intervening again. An HTTP error may follow
already committed historical World boundaries: never assume it rolled back.

**Stop expansion** when any provider quota/row-read limit is approached,
a wave fails, World reconciliation backlog grows, admitted life is
inconsistent, or model/API usage cannot be bounded. Previous staging
read probes did hit DO free-tier row-read limits. Never treat an outage
as a decision by a Thread not to socialize.

## Evidence to compare for each wave

- Scheduled vs. manually ensured Threads; successful life advances;
  model-backed plan renewals vs. no-change bounded work.
- Independent World-enacted public visits, paired co-presence,
  attention/noticed Experiences, social opportunities and outcomes.
- Distinct voluntary social decisions and any independently admitted
  social Encounter Stories; follow-on Memory where proven.
- Cloudflare rows read/written, queries, requests/alarms and durations;
  OpenAI input/output tokens **where independently recorded**; retries,
  failures and available billed-cost evidence.

`infra:measure` aggregates captured `world-state-cost` and `d1-cost`
console events by the labeled baseline and wave phases. It is a
**sampled infrastructure-cost view**, not a complete token ledger or
provider invoice. Report gaps instead of imputing invented dollar costs.
`world-social:candidates` itself incurs current-World read cost; capture
population scanning separately, not as idle runtime.

This staged operation introduces no compulsory meeting, partner
selection, city-based relocation, persistent population polling,
synthetic shared venue, or new service.
