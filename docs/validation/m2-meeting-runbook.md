---
id: validation-m2-meeting-runbook
status: accepted
last-reviewed: 2026-09-11
canonical: true
---

# Meeting a Thread — M2 runbook

A meeting is not the creation of a chat session. It is a visitor entering a Thread's already-unfolding life.

```text
Thread already has a life
  -> World has enacted CurrentSituation
  -> Presentation publishes an allowed present
  -> visitor arrives at /meet
  -> visitor speaks into that exact situation
  -> Thread responds from current life + private interior + retained memory
  -> encounter becomes objective history
  -> Thread may privately journal the experience
  -> Thread may remember it, or not
  -> life continues independently
  -> a later meeting can carry only what actually persisted
```

The live M2 exercise should be watched from two surfaces at once:

```text
insidefibre.com/meet           the human encounter
admin.insidefibre.com/activity the system-wide causal trail
```

The Activity Log is an operator lens, not another Fibre authority:

```text
Activity Log != World history != Thread Journal != autobiographical memory
```

It tells us what Fibre did and where a runtime chain succeeded or failed. It must not become a copy of the visitor's utterance, the Thread's response, private semantic state, journal text or remembered content.

## What must already be true

The Thread must already exist and have a World-owned CurrentSituation. Thread Presentation must have published that present. The public meeting surface does not invent a place, activity, plan, feeling or current situation for a visitor.

For the deployed path, the World worker needs its configured model credential and the World and Presentation workers must share their private service token. Thread Presentation is exposed at `https://api.insidefibre.com`; `insidefibre.com` talks only to that public Presentation API.

The deployed World and Presentation workers also write operational activity to the shared Activity Log. `admin.insidefibre.com/activity` is the authenticated, read-only operator surface over that log.

## Watch God's view while meeting

Do this before speaking to the Thread.

1. Open `https://admin.insidefibre.com/activity` in a second window.
2. Select **Thread**, enter the same `THREAD_ID`, and refresh. Enabling auto-refresh is useful during the meeting.
3. The Thread filter exposes **God's view**: lifecycle phases plus the chronological observed causal trail. The raw Activity table remains below it.
4. Keep the view visible while you send the encounter from `/meet` or the public API.
5. Encounter records use the Thread's `situationId` as `correlationId`, so the public scene and runtime trail can be matched without copying private conversation content into telemetry.

A successful live encounter should show this compact cross-service chain:

```text
thread-presentation
  presentation.encounter.world_submit
      started -> succeeded

world-kernel
  encounter.cognition.respond
      started -> succeeded
  encounter.history.record
      started -> succeeded
  encounter.journal.reflect
      started -> succeeded
  encounter.journal.record
      started -> succeeded      # only when a journal note exists
  encounter.memory.retain
      started -> succeeded
```

The separation between `encounter.history.record` and journal reflection is intentional. Objective history is authoritative even if later private reflection fails. God's view must therefore show partial semantic progress truthfully rather than collapsing the entire experience into one success/failure bucket.

`encounter.memory.retain` means Fibre ran the selective retention appraisal. It does **not** mean the Thread necessarily remembered the encounter; `not_remembered` is a valid successful outcome. The Activity Log records execution of the cognitive stage, while the autobiographical-memory authority owns whether a memory actually exists.

Clicking an Activity row or God's-view event should show identifiers and safe evidence, not the visitor's words or private Thread content. Journal and memory stages may point to the authoritative encounter `eventId`; follow domain authorities when you need to inspect the actual history, journal or memory.

On a failure, use the causal trail to answer the useful question: **where did the lived encounter stop?** A failed Presentation handoff means World was not reached. A failed response cognition means no objective encounter was recorded. A failed journal reflection after `encounter.history.record` means the encounter is history even though private reflection did not complete. A later memory failure means history and any completed journal work remain real. Activity records are observational and fail-open, so absence of telemetry is never proof that authoritative semantic state does or does not exist.

### Coverage boundary

God's view displays what the deployed runtime actually executes; it does not synthesize missing lifecycle work. Birth/Genesis, publication/materialization and the situated encounter -> history -> journal -> selective-memory chain are Activity-observable. On the current M2 branch, Flight Plan / CurrentSituation continuation is proven by the semantic acceptance path but is not yet deployed as an autonomous life-advancement runtime. Therefore **Life** or **Continuity** may correctly appear as *not observed* in Admin. That is a runtime capability boundary, not something telemetry should pretend happened.

Routine reads are also not treated as a request access log. Activity records meaningful operational/cognitive checkpoints, not every store lookup or page fetch.

## Meet through insidefibre.com

1. Open `https://insidefibre.com/meet`.
2. Fibre discovers publicly available Threads. To request a particular public Thread, open `https://insidefibre.com/meet?thread=<THREAD_ID>`.
3. Open God's view for that Thread as described above.
4. Read **Right now** before speaking. This is the public projection of the Thread's already-enacted situation. If there is no published present, there is no M2 meeting to enter yet.
5. Note the displayed/published `situationId`; it is the correlation identity you should see in Activity Log records for this encounter.
6. Type an utterance and send it. The browser submits only the displayed `situationId` and the utterance to `POST /api/threads/<THREAD_ID>/encounter`.
7. Follow God's view while the request crosses Presentation and World. A successful reply means Presentation confirmed the still-published scene and World independently confirmed that the same situation was still authoritative before cognition ran.
8. If the UI says the Thread's situation changed, reload the page. That `409` is desirable: the visitor arrived too late to speak into the old scene.
9. Do not expect every meeting to be remembered. After the reply, Fibre records the objective encounter, may create a private first-person journal reflection, and separately decides whether anything enters autobiographical memory.

The response visible to the visitor contains only the public `situationId` and the Thread's `responseText`. Private semantic state, journal, memory records, model provenance and hidden grounding stay inside Fibre.

## Meet through the public API

This bypasses only the Viewer UI. It still exercises the real Presentation -> World encounter boundary and should produce the same Activity Log trail.

Discover public Threads:

```bash
curl -sS 'https://api.insidefibre.com/api/threads?limit=50' | jq
```

Choose a `threadId`, then inspect the public snapshot:

```bash
THREAD_ID='thr_...'
curl -sS "https://api.insidefibre.com/api/threads/$THREAD_ID/snapshot" | jq
```

Before posting the encounter, open:

```text
https://admin.insidefibre.com/activity?kind=thread&value=<THREAD_ID>&limit=100
```

Copy the `situationId` from the snapshot's published present and send one utterance:

```bash
THREAD_ID='thr_...'
SITUATION_ID='sit_...'
UTTERANCE='What are you working on?'

jq -n \
  --arg situationId "$SITUATION_ID" \
  --arg utterance "$UTTERANCE" \
  '{situationId:$situationId,utterance:$utterance}' \
| curl -sS -X POST \
    "https://api.insidefibre.com/api/threads/$THREAD_ID/encounter" \
    -H 'content-type: application/json' \
    --data-binary @- \
| jq
```

Expected public shape:

```json
{
  "situationId": "sit_...",
  "responseText": "..."
}
```

Refresh the Thread Activity view and confirm the Presentation + World stages carry the same `THREAD_ID` and `SITUATION_ID` correlation.

To deliberately test stale-scene protection, first read a valid present and then submit a different/old `situationId`. The request should fail with `409 encounter_scene_changed`, and cognition should not be allowed to treat the stale public scene as current reality. The Activity Log is useful here too: a rejected stale scene should not masquerade as a completed cognition/history/journal/memory chain.

## If the M2 branch is not deployed

From the Fibre repository:

```bash
git switch agent/m2-lived-encounter
git pull --ff-only

npm run deployment:validate:remote
npm run deploy:world-kernel:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
npm run deploy:admin-dashboard:cloudflare:dry

npm run deploy:world-kernel:cloudflare
npm run deploy:thread-presentation:cloudflare
npm run deploy:admin-dashboard:cloudflare
```

Those workers require their existing configured secrets. Do not put private tokens or model credentials in the browser or in this runbook.

From the `insidefibre.com` repository, `main` already contains the situated encounter UI. Validate and deploy it with:

```bash
git switch main
git pull --ff-only
npm run check
npm run deploy
```

## What counts as a convincing M2 manual meeting

A good smoke test is not "the chatbot answered." Verify both the life around the answer and the operational causal trail:

```text
before visitor
  current scene already exists
  public situationId is visible

first meeting
  response is situated in that scene
  visitor does not author the scene
  God's view shows Presentation -> cognition -> history -> journal -> retention
  all encounter activity correlates to the entered situationId

behind the meeting
  objective encounter persists independently of later reflection success
  private subjective reflection may differ from the transcript
  autobiographical retention is selective
  Activity Log contains identifiers/stages, not private experiential content

after visitor
  World can enact a later point in the Thread's own Flight Plan in the M2 semantic proof
  persisted stores can reopen

second meeting
  later current situation is authoritative
  retained memory may matter
  old transcript/journal are not smuggled in as recollection
  forgotten experience cannot be reconstructed as remembered merely because Fibre has records
```

The automated M2 acceptance proof covers the full two-meeting continuation, including restart. The deployed `/meet` smoke test proves the public ingress path against the currently published life. God's view lets us watch that real system path rather than treating the demo as a black box, while explicitly showing lifecycle phases that have no deployed runtime activity yet. Together they test the milestone without inventing a second demo-only life engine.

## M2 acceptance commands

Use the canonical acceptance sequence:

```bash
git switch agent/m2-lived-encounter
git pull --ff-only

npm run check
npm run demo:m2
npm run slice:validate
```

M2 closes only when those gates and one real deployed `/meet` meeting are green. During the live meeting, God's view should make the encounter's cross-service causal path inspectable without becoming semantic authority or leaking the Thread's private interior. The proof should demonstrate a lived person; passing generic infrastructure tests alone is not the milestone.
