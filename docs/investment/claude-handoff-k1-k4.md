---
id: investment-claude-handoff-k1-k4
status: accepted
last-reviewed: 2026-11-22
canonical: false
---

# Claude Handoff Spec — Gate A World & Presentation Contracts (`K1–K4`)

**Audience:** Shared contract between Claude's active World-kernel / cognition / certification stream on `main` and the investment-readiness / `insidefibre.com` surface track (routed via Guy).
**Status (2026-11-22):** Agreed with Claude's peer review. **Ownership:** Claude builds `K1` and `K2` in this repository (`world-kernel` and `thread-presentation`); the surface track builds `insidefibre.com/new-site` against these exact shapes with clean fallbacks and **does not** implement duplicate routes here.
**Non-negotiables:** Every contract obeys `AGENTS.md`, [ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md), [ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md), [ADR-0024](../decisions/ADR-0024-live-encounters.md), [ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md), [N6](../validation/n6-public-lived-encounter-slices.md), and [N7.10](../validation/n7-live-encounter-slices.md). Zero private interior crosses public Presentation.

---

## K1 — Public Society Overview (`GET /api/society/now`)

### Why the surface needs it
Today only Admin (`GET /internal/world-events/overview`) can show where living Threads are, what they are doing outwardly, and who is with whom. `insidefibre.com/new-site` needs one privacy-safe, zero-LLM read projection for the homepage live strip and `/live`.

### Expected public endpoint on `thread-presentation` (owned by Claude)
```http
GET /api/society/now
```
- **Auth:** Public, CORS-restricted to `VIEWER_ORIGIN` (same rule as `services/thread-presentation/src/http/read-api.mjs`).
- **Query params:** Rejected; caller cannot specify `at`, city, venue, or private filters.
- **Cost rule:** **Zero LLM calls on read.** Backed by a bounded internal read projection from `world-kernel` over existing `current_situation_frontier` and recent admitted public Encounter Stories. Safe to cache briefly (`Cache-Control: public, max-age=15, stale-while-revalidate=30`).

### Agreed JSON shape (`fibre-public-society-now-v1`)
```json
{
  "contract": "fibre-public-society-now-v1",
  "asOf": "2026-11-22T12:00:00.000Z",
  "environment": "staging",
  "population": {
    "livingPublicCount": 8,
    "restingCount": 80
  },
  "cities": [
    {
      "locality": "Addis Ababa",
      "countryCode": "ET",
      "timeZone": "Africa/Addis_Ababa",
      "venues": [
        {
          "placeId": "place_...",
          "displayName": "Abrehot Library",
          "kind": "library",
          "presentThreads": [
            {
              "threadId": "thr_...",
              "fin": "FIN-...",
              "displayName": "Thread Name",
              "portraitObjectRef": "obj_...",
              "situationId": "sit_...",
              "phase": "at_place",
              "wakefulness": "awake",
              "outwardActivity": "reading",
              "establishedAt": "2026-11-22T11:15:00.000Z",
              "coPresentThreadIds": ["thr_..."]
            }
          ]
        }
      ],
      "inTransitThreads": [
        {
          "threadId": "thr_...",
          "fin": "FIN-...",
          "displayName": "Thread Name",
          "portraitObjectRef": "obj_...",
          "situationId": "sit_...",
          "phase": "in_transit",
          "wakefulness": "awake",
          "outwardActivity": "walking across town",
          "establishedAt": "2026-11-22T11:45:00.000Z"
        }
      ],
      "unnamedPlaceThreads": [
        {
          "threadId": "thr_...",
          "fin": "FIN-...",
          "displayName": "Thread Name",
          "portraitObjectRef": "obj_...",
          "situationId": "sit_...",
          "phase": "at_place",
          "wakefulness": "asleep",
          "outwardActivity": "sleeping",
          "establishedAt": "2026-11-22T02:00:00.000Z"
        }
      ]
    }
  ],
  "recentPublicEncounters": [
    {
      "encounterStoryId": "story_...",
      "occurredAt": "2026-11-22T10:40:00.000Z",
      "locality": "Addis Ababa",
      "placeDisplayName": "Abrehot Library",
      "participantThreadIds": ["thr_...", "thr_..."],
      "participantNames": ["Name A", "Name B"]
    }
  ]
}
```

### Hard privacy & authority boundaries for K1 (aligned 2026-11-22)
- **`outwardActivity` only (never `activity`):** A situation's `activity` carries the Thread's private Flight Plan intention; only the short observable `outwardActivity` (e.g. `"reading"`, `"walking through the garden"`) crosses `K1` across `presentThreads`, `inTransitThreads`, and `unnamedPlaceThreads`.
- **No `summary` or conversation text in `recentPublicEncounters` (locked by Guy, 2026-11-22 — true-to-life rule):** Just as in real life, Thread-to-Thread conversations are private to the Threads involved (and Admin's God-view in `admin-dashboard`). Spoken Thread-to-Thread dialogue is **never** published on the public web, and summaries would either leak dialogue or break zero-LLM-on-read. `recentPublicEncounters` carries only `encounterStoryId`, `occurredAt`, `locality`, `placeDisplayName`, `participantThreadIds`, and `participantNames`.
- **Venue `kind` vocabulary:** Mapped from World's place kind to a small public vocabulary: `library | school | market | park | venue`.
- **Visibility:** Include **only** publicly listable, non-resting Threads (Claude will confirm and record the exact visibility fields here when implementing `K1`). Resting Threads appear only as the aggregate `restingCount` integer.
- If a Thread's enacted situation has `location.place === null` (private home or unnamed stop), place it in `unnamedPlaceThreads` and **never** infer or leak home/caregiver location.
- **Strictly forbidden fields:** Flight Plan `activity` or remaining stops, private stances, Body levels/numbers, inherited urges, `Experience`, `Journal`, autobiographical `Memory`, delayed afterthoughts, cognition rationale, or captured prompts.

### Viewer fallback while K1 is in flight
`/new-site/live` tries `GET /api/society/now` first; on `404` or `501`, it falls back cleanly to existing `GET /api/threads/search` and labels the live venue/co-presence feed as pending API rollout — never inventing mock activity.

---

### K1 as built (Claude, November 22, 2026) — differences from the agreed shape
The route, the contract name, the top-level shape and every privacy boundary above are as agreed.

**Different from the agreed shape:**
- **Omitted for now, because the public present does not carry them:**
  - `placeId`, `kind`, `countryCode` and `timeZone` on cities and venues;
  - `fin` and `wakefulness` on Threads.

  `portraitObjectRef` is the Thread's portrait thumbnail from discovery. Adding any of the omitted fields means widening the public present contract; ask, and Claude will add it there first.
- **City grouping:**
  - A venue's `locality` is its city.
  - A Thread at a place with no public name (a home, an unnamed stop) is listed in `unnamedPlaceThreads` of the city it is in. That is the city, never the place.
  - A Thread in transit is grouped under its destination's city, when public.
- **Venues:** only a real public venue is named: an admitted City Guide venue, or a Genesis place bound to a physical venue.
- **Visibility:**
  - Listed: Threads the presentation catalog marks public, born and not retired, whose life is not resting and for whom World has a current situation. Where each one is and what it is doing come from World as of the request, not from the last present a visitor opened.
  - Resting public Threads count toward `restingCount` only.
- **`recentPublicEncounters`:**
  - Covers the last 24 hours, at most 24 entries.
  - An encounter counts only when at least two public Threads themselves spoke or acted in its Story. A happening several merely witnessed does not, nor a visitor meeting, nor one with a Thread that is not public.
  - `placeDisplayName` and `locality` are null unless every participant was at the same public venue.
- **The public present (`/present`)** is now `thread-public-present-v0.2`:
  - it carries `outwardActivity`, never `activity`, and names a public venue;
  - presents recorded under v0.1 are read back with `outwardActivity: null` and no `activity`, on every public read path (current present, discovery, events and the websocket replay).
- **Caching and access:** one shared copy is kept 15 seconds at the edge; browsers get `Cache-Control: no-cache`, so they always ask again. CORS is `VIEWER_ORIGIN` only; any other `Origin` gets 403. Any query parameter gets 400.

### Disclosure in the public view (Claude, November 22, 2026; ADR-0040)
What the public sees of where a Thread is now follows that Thread's own disclosure. Until Threads decide (foresight, the next slice), the birth registration holds: home city and current venue, as before. The contract changes are additive:
- **Public present `thread-public-present-v0.3`.**
  - `location` may be `{ "kind": "withheld" }`: the Thread said openly that it keeps its whereabouts private. Show that, in those words or similar.
  - A `place` or `transit` location may carry `"detailWithheld": true`: shown openly in part ("in Addis Ababa; exact place kept private").
  - Withheld by omission, a location simply has no place, exactly as when World knows none.
- **The society view.**
  - A new top-level `whereaboutsWithheldThreads` lists Threads that withhold openly. They appear in no city, venue or co-presence list.
  - A person entry may carry `"placeDetailWithheld": true`.
  - `recentPublicEncounters[].placeDisplayName` (and `locality`) may be `null` when a participant keeps its whereabouts from the public.
- **Neutral wording for no place.** Because an omission must be indistinguishable from "nothing known", a Thread with no place shown should be labelled neutrally ("place not shown"), never "At home".

## K2 — Minimal Opt-In Returning-Visitor Identity Witness (`POST /api/threads/:threadId/encounter`)

**Status:** Accepted as written; Claude builds after `K1`.

### Expected public contract
- **Opt-in & backwards-compatible:** Existing anonymous `POST /api/threads/:threadId/encounter` payloads (`{ requestId, situationId, utterance, priorEncounterStoryId? }`) continue to work identically.
- **Opt-in registration / token issuance (smallest seam on Presentation):**
  - `POST /api/visitor/identity` (optional display name, e.g. `{ "displayLabel": "Alex" }`) -> returns `{ "visitorToken": "<signed-opaque-token>", "visitorId": "person_vis_<stable-hash>", "displayLabel": "Alex" }`.
  - `POST /api/visitor/revoke` (with `visitorToken`) -> revokes future linking cleanly (`204 No Content`).
- **Encounter submission with opt-in witness:**
  - Visitor sends `X-Fibre-Visitor-Token: <visitorToken>` (or optional `visitorToken` field) on `POST /api/threads/:threadId/encounter`.
  - Presentation verifies signature and revocation status, then forwards `visitorPrincipal: { personId: "person_vis_...", displayLabel }` over the private World binding `/internal/public-visitor-encounter`.
- **No memory leak in response:** The outward `result` payload stays unchanged — never leaking whether the Thread retained a memory or its private stance.

### Hard invariants for K2 (`N7.10`)
- **World routing identity != Thread autobiographical recognition.** A Thread recognizes a returning visitor *only* if its own ordinary delayed consolidation retained a memory or stance — never injected, never forced, never faking familiarity.
- No raw email, phone number, or IP address enters World semantic authority in K2.

---

## K3 — Initial Model Certifications & Public Cost-Trend Evidence

**Status (2026-11-22 — Claude update):**
- **Capture data ready:** The 24-hour staging capture holds **376 recorded requests**: 65 `encounter.attention`, 52 `body.interoception`, 48 `world.happening`, and 36 reflections (`experience.consolidation`). Memory gists had 0 captures that day and wait.
- **Certification priority order:** Reflections first (~85% of spend), then `encounter.attention` (risky — Gemma 4 noticed much less than Sol last time, and noticing rate matters even when answers are acceptable), `body.interoception`, and `world.happening`.
- **Candidates:** Gemma 4 on Workers AI, plus **Gemini 3.6 Flash** as the non-OpenAI fallback.
- **Estimated judging cost (Guy budget call):** ~$15–$25 per job per candidate (~$150–$250 total for this round).
- **Visibility rule:** Passing and failing candidates stay visible in [`docs/validation/model-certifications.json`](../validation/model-certifications.json). Routing updates in [`infra/deployments/environments/cloudflare.yaml`](../../infra/deployments/environments/cloudflare.yaml) follow Guy's approval.

---

## K4 — Held Patches Deployment & Addis Ababa Divergence

**Deployment order (Claude update, 2026-11-22):**
1. Apply `.fibre/patches/same-ground-measure.patch` and `body-levels-b3.patch` -> observe B3 read.
2. Apply `livelihood-l1.patch` -> observe 48–72 hours of Addis Ababa life measured by `npm run world-social:quality` and the morning census.

**Current honest staging read (2026-11-22, for `insidefibre.com/new-site`):**
- Weariness of the same is now felt (`0.2–0.9` across the cohort), with Threads expressing *"someone new would be welcome"* and *"a change of scene would be welcome"*;
- Threads judged most exchanges to hold nothing new;
- Still 0 slights and 0 messages sent;
- Cohort visited **two public places**: **Abrehot Library** and **Unity Park**.
- Summary: *the society is now aware of its own sameness; L1 is what gives it somewhere else to go.*

---

## Coordination summary

| Request | Owner | Surface consumer on `insidefibre.com/new-site` | Safe fallback until landed |
|---|---|---|---|
| **K1** (`GET /api/society/now`) | Claude (World + Presentation) | `/` live strip & `/live` venue/encounter view (`outwardActivity`, no `summary`) | Existing `GET /api/threads/search` with Addis-first ordering and explicit pending-API notice |
| **K2** (opt-in visitor witness) | Claude (after K1) | `/following` opt-in toggle & `/meet` header | Anonymous `/encounter` + local browser follow list |
| **K3** (`model-certifications.json`) | Claude (pending Guy ~$150–$250 judging budget) | `/inspect` cost & certification table + Phase 5 unit economics | Shows `2026-11-21` `$2.12/day` baseline, `0` certified models, and preserved Gemma 4 failure |
| **K4** (`same-ground` + `b3` + `l1`) | Guy deploy + Claude read | Live Addis venue/activity diversity on `/live` & `/progress` | Honest staging note citing Abrehot Library + Unity Park and felt weariness awaiting L1 |
