---
id: investment-claude-handoff-k1-k4
status: proposed
last-reviewed: 2026-11-22
canonical: false
---

# Claude Handoff Spec — Gate A World & Presentation Contracts (`K1–K4`)

**Audience:** Claude's active World-kernel / cognition / certification stream on `main` (routed via Guy).
**Purpose:** Give the main dev stream exact, surface-driven HTTP/JSON and evidence expectations for the four Gate A capabilities locked in [`docs/investment/mvp.md`](mvp.md) so `guybarnahum/insidefibre.com` (`/new-site`, [`docs/investment/site.md`](site.md)) can build in parallel without guessing wire shapes.
**Flexibility:** These are **starting surface contracts**, not immutable freezes. If World kernel invariants suggest a cleaner shape, adjust and note the diff here so the viewer aligns cleanly.
**Non-negotiables:** Every contract obeys `AGENTS.md`, [ADR-0009](../decisions/ADR-0009-dignity-gates-participation.md), [ADR-0010](../decisions/ADR-0010-interior-exterior-boundary.md), [ADR-0024](../decisions/ADR-0024-live-encounters.md), [ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md), [N6](../validation/n6-public-lived-encounter-slices.md), and [N7.10](../validation/n7-live-encounter-slices.md). Zero private interior crosses public Presentation.

---

## K1 — Public Society Overview (`GET /api/society/now`) & Public Progress (`GET /api/public-progress`)

### Why the surface needs it
Today only Admin (`GET /internal/world-events/overview`) can show where living Threads are, what they are doing outwardly, and who is with whom. `insidefibre.com/new-site` needs one privacy-safe, zero-LLM read projection for the homepage live strip and `/world` ("The World Now").

### Expected public endpoint on `thread-presentation`
```http
GET /api/society/now
```
- **Auth:** Public, CORS-restricted to `VIEWER_ORIGIN` (same rule as `services/thread-presentation/src/http/read-api.mjs`).
- **Query params:** Rejected (or optional read-only pagination only if needed later); caller cannot specify `at`, city, venue, or private filters.
- **Cost rule:** **Zero LLM calls on read.** Backed by a bounded internal read projection from `world-kernel` over existing `current_situation_frontier` and recent admitted public Encounter Stories. Safe to cache briefly (`Cache-Control: public, max-age=15, stale-while-revalidate=30`).

### Expected JSON shape (`fibre-public-society-now-v1`)
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
              "activity": "Reading a book in the quiet room",
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
          "activity": "Walking across town",
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
          "activity": "Sleeping",
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
      "participantNames": ["Name A", "Name B"],
      "summary": "Brief outward factual summary of the shared public encounter"
    }
  ]
}
```

### Hard privacy & authority boundaries for K1
- Include **only** Threads whose public presentation visibility is `publiclyVisible === true` and `lifecycleStatus === "active"`. Resting Threads appear only as the aggregate `restingCount` integer — never listed as active.
- If a Thread's enacted situation has `location.place === null` (e.g. private home or unnamed stop), place it in `unnamedPlaceThreads` and **never** infer or leak home/caregiver location.
- **Strictly forbidden fields:** Flight Plan remaining stops, private stances, Body levels/numbers, inherited urges, `Experience`, `Journal`, autobiographical `Memory`, delayed afterthoughts, cognition rationale, or captured prompts.
- **Optional K1b (`GET /api/public-progress` & public coarse inspection stats):** If helpful, `thread-presentation` may also expose read-only `GET /api/public-progress` serving [`docs/state/public-progress.json`](../state/public-progress.json) (and optionally a coarse public cost/certification summary derived from `model-certifications.json` for `/inspect`). Until then, `insidefibre.com` bundles `public-progress.json` directly at build time with a parity check.

### Viewer fallback while K1 is in flight
`/new-site/world` tries `GET /api/society/now` first; on `404` or `501`, it falls back cleanly to existing `GET /api/threads` + public snapshots and labels the society co-presence feed as pending API rollout — never inventing mock activity.

---

## K2 — Minimal Opt-In Returning-Visitor Identity Witness (`POST /api/threads/:threadId/encounter`)

### Why the surface needs it
The Gate A MVP includes *"come back days later to find that its life moved on and (when opted in) remembers them."* Today public `/meet` visitors are strictly anonymous ([`n7-live-encounter-slices.md`](../validation/n7-live-encounter-slices.md) §N7.10), so a Thread has no stable visitor identity to recognize across days.

### Expected public contract
- **Opt-in & backwards-compatible:** Existing anonymous `POST /api/threads/:threadId/encounter` payloads (`{ requestId, situationId, utterance, priorEncounterStoryId? }`) continue to work identically.
- **Opt-in registration / token issuance (smallest seam on Presentation):**
  - `POST /api/visitor/identity` (optional display name, e.g. `{ "displayLabel": "Alex" }`) → returns `{ "visitorToken": "<signed-opaque-token>", "visitorId": "person_vis_<stable-hash>", "displayLabel": "Alex" }` (stored client-side in `localStorage` or `HttpOnly` cookie only when the visitor explicitly opts in).
  - `POST /api/visitor/revoke` (with `visitorToken`) → revokes future linking cleanly (`204 No Content`).
- **Encounter submission with opt-in witness:**
  - Visitor sends `X-Fibre-Visitor-Token: <visitorToken>` (or optional `visitorToken` field) on `POST /api/threads/:threadId/encounter`.
  - Presentation verifies the signature and revocation status, then forwards `visitorPrincipal: { personId: "person_vis_...", displayLabel }` over the private World binding `/internal/public-visitor-encounter`.
- **Expected response hint (non-private):** The outward `result` payload stays unchanged (`outcome`, `situationId`, `encounterStoryId`, `responseText`, etc.) — **never** leaking whether the Thread retained a memory or what its private stance toward the visitor is.

### Hard invariants for K2 (`N7.10`)
- **World routing identity ≠ Thread autobiographical recognition.** Passing `person_vis_...` gives World a stable counterparty reference for ordinary Encounter Story / Experience / delayed consolidation — it **never** injects fabricated familiarity into cognition and **never** guarantees a Thread will remember the visitor.
- If the Thread's own consolidation retained a memory or stance from Day 1, ordinary Thread-owned retrieval surfaces it on Day 2+; if not remembered, the Thread treats the visitor naturally as unfamiliar.
- No raw email, phone number, or IP address enters World semantic authority in K2.

---

## K3 — Initial Model Certifications & Public Cost-Trend Evidence

### Why the surface needs it
Register 3 (`/new-site/inspect`) and Phase 5 unit economics show real measured cost per living Thread per day and how job-by-job certification lowers it. Today [`docs/validation/model-certifications.json`](../validation/model-certifications.json) holds `[]`, so `npm run model:options` reports `$0.000` certified spend and cannot yet prove the falling cost curve.

### Expected deliverable from Claude
1. Gather a full 24-hour Addis staging capture via `npm run model:captures`.
2. Run blind multi-family `npm run model:quality` on candidate cheaper models for the highest-volume gate jobs (`body.interoception`, `world.happening`, `encounter.attention`, `experience.memory-gist`) plus at least one non-OpenAI provider candidate for outage failover.
3. Commit passing records into [`docs/validation/model-certifications.json`](../validation/model-certifications.json) and route passing jobs in [`infra/deployments/environments/cloudflare.yaml`](../../infra/deployments/environments/cloudflare.yaml) (for Guy to approve & deploy).
4. Keep every failed candidate visible as evidence (matching Gemma 4's `35%` vs `90%` record).
5. **Observable proof:** `npm run model:options` prints non-zero certified jobs with passing quality bars, and a subsequent measured staging day (`npm run model:usage`) shows lower $/living Thread/day than the `2026-11-21` `$0.27–$0.35` `gpt-5.6-sol` baseline without regressing `world-social:quality`.

---

## K4 — Held Patches Deployment (`body-levels-b3`, `livelihood-l1`) & Divergence Measurement

### Why the surface needs it
Investors watching `/world` ("The World Now") need to see a genuinely varied infant society, not eight Threads all politely agreeing in one library (0 slights across ~110 regard acts and 0 declined invitations observed Nov 18–21).

### Expected deliverable (Guy deploy + Claude measurement)
1. Guy reviews and deploys `.fibre/patches/body-levels-b3.patch` (ADR-0038 B3 longing & reunion joy) and `.fibre/patches/livelihood-l1.patch` (ADR-0039 L1 skills, life situation, school + market venues) to staging.
2. After 48–72 hours of Addis Ababa life, run `npm run world-social:quality` and record the resulting cohort observation in `docs/state/current-state.md` (and update `public-progress.json` once observed).
3. **Observable proof:** Threads disperse naturally across >= 2 distinct public venue kinds (library + school/market/park), reflect distinct skills/life situations, and exhibit authentic non-uniformity (varied topics, pushback, or voluntary declines/slights where earned — never scripted).

---

## Coordination summary

| Request | Surface consumer on `insidefibre.com/new-site` | Safe fallback until landed |
|---|---|---|
| **K1** (`GET /api/society/now`) | `/` live strip & `/world` venue/encounter feed | Existing `GET /api/threads` + snapshots with explicit pending-API notice |
| **K2** (opt-in visitor witness) | `/following` opt-in toggle & `/threads/:id` `/meet` header | Anonymous `/encounter` + local browser follow list |
| **K3** (`model-certifications.json`) | `/inspect` cost & certification table + Phase 5 unit economics | Shows live `2026-11-21` `$2.12/day` baseline, `0` certified models, and preserved Gemma 4 failure |
| **K4** (`b3` + `l1` staging divergence) | Live Addis venue/activity diversity on `/world` & `/progress` | Honest staging note describing current single-library cohort limit |
