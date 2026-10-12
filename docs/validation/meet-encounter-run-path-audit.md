---
id: validation-meet-encounter-run-path-audit
status: active
last-reviewed: 2026-10-12
canonical: true
---

# Meet / Encounter runtime and cost audit — observed results and open gates

This is a **source plus limited operator-evidence audit**, not a claim that all public live, cost and World timing gates are closed. It preserves real observed measurements, implemented repairs and remaining uncertainty. Original October 8–9 implementation-by-implementation transcripts remain in Git history under [ADR-0016](../decisions/ADR-0016-repository-retention.md); do not run obsolete “next” commands from those earlier checkpoints.

For current acceptance use [current priorities](../state/current-priorities.md), [N6 public lifecycle](n6-public-lived-encounter-slices.md) and [N7 live social consequence](n7-live-encounter-slices.md). The ongoing World-economics plan is distinct: [World cost accounting](../architecture/world-cost-accounting.md) and [World compute optimization](../architecture/world-compute-optimization.md).

## What each measured path actually means

| Path | Ownership and causal consequence |
|---|---|
| `GET /api/threads/:id/present` | Presentation obtains bounded World-owned `ensure-LivedNow` projection. Viewing creates **no** meeting authority, permission, personal memory or session. |
| `POST /api/threads/:id/encounter` | A concrete visitor utterance plus displayed `situationId` reaches World-owned current-scene validation and independent Interior Cognition `accept | decline | defer`; only an actually accepted encounter mints objective Story. `unavailable` must remain distinct from a voluntary decline. |
| Public `Accept: text/event-stream` | World/N7 outward speech is segmented at stable sentence/pause/end checkpoints; only acknowledged/exposed prefixes are admitted. Presentation projects events and supports request-scoped interruption. A transport queue write is **not** proof of remote playback. |
| `/internal/inside-fibre/meeting-entry` and `visitor-encounter` | Earlier funded visitor-work/availability/settlement path; retain legitimate prior consent and Fibre Credit semantics rather than confusing it with arbitrary public `/meet`. |
| Thread → Thread `LiveEncounter` | Independent World co-presence and consent; ephemeral live coordination over durable Story, Experience, Journal and selective Memory authorities. Not equivalent to a browser-held durable chat session. |

## Real October 8 staging cost sample — pre-optimization

Guy's first staging `thread:meet -vv` World log tail captured **one real participation appraisal only**. It contained no corresponding accepted public expression or Experience model stage and therefore is **not** a typical entire-conversation cost.

| World operation | DO elapsed | SQL queries | Rows read | Rows written |
|---|---:|---:|---:|---:|
| Directory entry read | 107 ms | 25 | 1,952 | 0 |
| `POST /internal/lived-now/ensure` | 3,879 ms | 705 | 13,040 | 9 |
| `POST /internal/public-visitor-encounter` | 4,408 ms | 655 | 4,402 | 6 |

Observed `participation` invocation: **4,368 ms**, `openai/gpt-5.6-sol`, one provider attempt, **3,964 input + 205 output = 4,169 reported tokens**. The World request and model operation times are different scopes; the `LivedNow.ensure` sample may include its own planning work. One log is not a stable latency/billing distribution.

**Diagnosed SQL hotspot:** `SituatedLifeStore` was responsible for **557 of 655 public-encounter queries** (2,619 of 4,402 rows read), and **571 of 705 `ensure` queries** (2,649 of 13,040 rows read). The previous `listCurrentLifeRelations` walked relation histories one at a time, repeatedly reading Thread existence/revisions/integrity heads. The correction replaced that with bounded Thread-scoped revision and head queries while retaining per-row digest, lineage, temporal and supersession verification.

**Actual deployment:** Guy deployed the corrected World source `120e26cbe6fa93fdc3542f122b842d38c2763aa0` on October 8 (Cloudflare version `9ee53a54-fa44-4ad6-9d0d-1c53cf7c6599`). This establishes that the code was deployed, **not** how many queries it subsequently saved. No post-fix SQL comparison and **no naturally accepted per-stage participation + expression + Experience token/latency sample** have been reported.

The existing `public-encounter-model-usage` events expose stage, outcome, elapsed wall time, provider/model, invocation attempts and reported token usage without persisting private prompts. `world-state-cost` captures World SQL deltas. Use these plus the existing `thread:meet -vv` on **one** naturally admitted case; no new telemetry framework, repeated forced approaches or invented model-spend assumptions.

## Causal fixes and what was actually accepted

**Partial request/retry:** the original code minted objective Story before the completed receipt. Guy reproduced a concrete defect in focused local validation: after simulated failure between Story/Experience and completion, the same request could mint two Stories (`2 !== 1`, October 8). The correction inserted an immutable `public_encounter_admissions` request-input-to-Story witness atomically with Story admission. An unfinished same-bound request resumes already-admitted facts/Experience/queue rather than minting a second event or rerunning committed cognition. Guy subsequently reported focused/full green; the corrected source was staged with World SHA `b3142b1a68cbe94f29657f1c998e34b1f1af0e8a`. No recovery claim is made for arbitrary **uncommitted pre-Story provider work** or a durable network exactly-once delivery guarantee.

**Stable public live speech:** N7's provider-neutral streamed expression was reused rather than introducing a second speech or meeting engine. Speech deltas are ephemeral; a World-recognized sentence/pause/end checkpoint durably admits the synchronously acknowledged portion. Already admitted sentences survive restart, interruption retains only real exposed text, and subsequent Story continuation is linked rather than overwriting old truth. One bounded personal Experience and delayed consolidation can relate to the admitted sequence without per-token or per-sentence Experience-model work.

**Scene interleaving:** natural stable speech boundaries use `sameEnactedScene()` to compare World-enacted **facts**, not mere `situationId` inequality. Real movement interrupts the unexposed suffix and keeps previously spoken Story truth; a replacement situation ID with equivalent enacted scene does not falsely terminate speech. Local and later staged public transport acceptance occurred, but genuine moving-World browser interruption remains its own N6 gate.

**Public ingress and adapter:** the public HTTP event stream and request-scoped interruption route relay World authority through Presentation; Local Node adapters gained native streaming/backpressure and lazy World visitor API initialization after one full-suite startup regression (nine failures) was corrected. Guy reported locally passing full validation after the correction. This did not itself prove client device playback, browser microphone handling, autonomous mid-speech Thread withdrawal, or permanent session state.

## Actual October 9 staging social evidence

- **Direct World CLI, N6.6a:** with a real already-living Thread (Faith Achieng Odhiambo, `thr_23cea3246a752a403adabda88a7c89d47f5a59c9`), Guy's `thread:meet --live` showed natural accepted multi-turn speech with genuine World situation and admitted Story identifiers. It did not need the public Viewer to create that life.
- **Public Presentation SSE, N6.6b streaming path:** Guy obtained Faith's actual `situationId` through `GET /present` and submitted a fresh `POST /encounter` with `Accept: text/event-stream`. Public HTTP/2 `200` returned `speech_delta → speech_end → result` and an actual World-admitted Story. This is **one accepted public streaming example**, not a complete observed browser lifecycle, remote chunk receipt-timing measurement, or accepted interruption/movement scenario.
- **Faith's historical public interaction:** a direct read-only staging World Observatory response on October 9 returned **31 Encounter Stories**, including **18 speech checkpoint Stories** for a nine-utterance public conversation. Thus an earlier apparently empty Admin page was not proof the World lacked Stories. Separate Admin API responses also contained Faith's Story data while the UI displayed zero. Diagnose projection freshness/rendering and environment identity, not missing history by default.
- **Outward autonomy:** Faith's ambiguous, private or evasive statements do not establish that the World scene is wrong. Fibre permits selective disclosure, deception, declining a request and changing its mind; outward words, World facts and private belief are distinct. Her accepted final evasive reply was incorrectly treated by a Viewer control path as a reason to remove the composer. A World scene transition is **not** a Thread ending the conversation. Core and website source corrections followed; definitive browser behavior still needs staging acceptance.
- **October 11 Viewer:** Faith and Sophie both legitimately declined first-turn approaches with real request/situation IDs. A decline or defer creates no accepted Encounter Story and is not a consent regression. The page showed a misleading `Conversation · 0 turns` and an unattributed terminal exchange after leaving. Preserve exact outward attribution and whether the outcome was refusal, deferral, unavailability or scene change—do not manufacture accepted Story to fill the UI.

## Wakefulness, presentation and remaining acceptance

**October 11 semantic anomaly:** Sophie had a genuinely World-enacted `activity:"Sleep."` at `2026-10-11T17:42:06.437Z` yet spoke an outward public refusal. World sleep/reachability was not grounded by her spoken words. A subsequent October 12 **source** change made Flight Plan/current situation wakefulness explicit (`awake | asleep | unknown`) and treats verified `asleep` as `unavailable` with no forced waking, speech, cognition or Story. Historic prose-only `Sleep.` plans remain `unknown`, and source commit alone is **not** Guy's local/staging acceptance or a retroactive fix to that historical encounter.

**Open N6 browser proof:** one naturally accepted, speaker-attributed live Viewer exchange, honest terminal decline/unavailability representation, genuine interruption, World scene change without invented withdrawal, Leave and later return to an autonomously advanced life. A cohesive scene-first/voice-ready website design is intentionally on hold for review; do not improve numbers by coercing encounters or adding a Viewer chat database.

**Open N7 personhood proof:** real staging recipient *noticing or not noticing* from an addressed Thread's actual outward event, followed by selective possible retention/non-retention and one later Thread-owned choice with attributable history-caused difference. N7.11 Gate 1 local authority/retry is **not** a live provider/staging noticing result, and Gates 2/3 are open.

**Open performance proof:** the post-SituatedLifeStore SQL delta, complete accepted stage-by-stage inference cost, and practical scene/replay behavior under naturally occurring long waits. Only optimize measured repetition. Do not remove the private participation authority merely because model calls are expensive, or call an acknowledged server queue token a verified audible word at a remote client.

## Smallest next operator evidence

Use the already-instrumented deployed path and existing reports:

```bash
git switch main
git pull --ff-only origin main
npm run slice:validate
# After Guy chooses/validates staging deploy, one bounded live sample:
npm run thread:meet -- --env staging --thread <actual-public-thread-id> -vv
```

Respect refusal; an accepted full-stage sample is only available if the Thread independently participates. Pair that one real outcome with `public-encounter-model-usage`, `world-state-cost`, and the N6 Viewer/World read evidence. No new general scheduler, duplicate data store, per-token DB writes, full-population waking, or surveillance/telemetry project.

**Audit interpretation:** the public streaming/retry and SQL-read implementation work significantly reduced the original 2026-10-08 source gaps. The remaining highest-value work is measured inference/SQL efficiency, honest wakefulness/scene truth and a single believable later social consequence. Historical source findings are not future work merely because they appeared under old “High” headings.
