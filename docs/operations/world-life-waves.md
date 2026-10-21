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

Use the emitted `evidencePath`. Its `underpopulatedCities` is based on
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
  --offset 0 --limit 3

# After confirming selection and measurement readiness:
npm run world-life:wave -- --env staging \
  --file .fibre/world-social/staging/candidates/cities-EXAMPLE.json \
  --offset 0 --limit 3 --apply
```

Replace `cities-EXAMPLE.json` with the exact saved `evidencePath`.
The CLI selects unique, stable Thread IDs from that actual candidate
snapshot. It defaults to a dry run; `--apply` issues **one serial**
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
