---
id: validation-m2-meeting-runbook
status: accepted
last-reviewed: 2026-09-10
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

## What must already be true

The Thread must already exist and have a World-owned CurrentSituation. Thread Presentation must have published that present. The public meeting surface does not invent a place, activity, plan, feeling or current situation for a visitor.

For the deployed path, the World worker needs its configured model credential and the World and Presentation workers must share their private service token. Thread Presentation is exposed at `https://api.insidefibre.com`; `insidefibre.com` talks only to that public Presentation API.

## Meet through insidefibre.com

1. Open `https://insidefibre.com/meet`.
2. Fibre discovers publicly available Threads. To request a particular public Thread, open `https://insidefibre.com/meet?thread=<THREAD_ID>`.
3. Read **Right now** before speaking. This is the public projection of the Thread's already-enacted situation. If there is no published present, there is no M2 meeting to enter yet.
4. Type an utterance and send it. The browser submits only the displayed `situationId` and the utterance to `POST /api/threads/<THREAD_ID>/encounter`.
5. A successful reply means Presentation confirmed the still-published scene and World independently confirmed that the same situation is still authoritative before cognition ran.
6. If the UI says the Thread's situation changed, reload the page. That `409` is desirable: the visitor arrived too late to speak into the old scene.
7. Do not expect every meeting to be remembered. After the reply, Fibre records the objective encounter, may create a private first-person journal reflection, and separately decides whether anything enters autobiographical memory.

The response visible to the visitor contains only the public `situationId` and the Thread's `responseText`. Private semantic state, journal, memory records, model provenance and hidden grounding stay inside Fibre.

## Meet through the public API

This bypasses only the Viewer UI. It still exercises the real Presentation -> World encounter boundary.

Discover public Threads:

```bash
curl -sS 'https://api.insidefibre.com/api/threads?limit=50' | jq
```

Choose a `threadId`, then inspect the public snapshot:

```bash
THREAD_ID='thr_...'
curl -sS "https://api.insidefibre.com/api/threads/$THREAD_ID/snapshot" | jq
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

To deliberately test stale-scene protection, first read a valid present and then submit a different/old `situationId`. The request should fail with `409 encounter_scene_changed`, and cognition should not be allowed to treat the stale public scene as current reality.

## If the M2 branch is not deployed

From the Fibre repository:

```bash
git switch agent/m2-lived-encounter
git pull --ff-only

npm run deployment:validate:remote
npm run deploy:world-kernel:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry

npm run deploy:world-kernel:cloudflare
npm run deploy:thread-presentation:cloudflare
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

A good smoke test is not "the chatbot answered." Verify the life around the answer:

```text
before visitor
  current scene already exists

first meeting
  response is situated in that scene
  visitor does not author the scene

behind the meeting
  objective encounter persists
  private subjective reflection may differ from the transcript
  autobiographical retention is selective

after visitor
  World can enact a later point in the Thread's own Flight Plan
  persisted stores can reopen

second meeting
  later current situation is authoritative
  retained memory may matter
  old transcript/journal are not smuggled in as recollection
  forgotten experience cannot be reconstructed as remembered merely because Fibre has records
```

The automated M2 acceptance proof covers the full two-meeting continuation, including restart. The deployed `/meet` smoke test proves the public ingress path against the currently published life. Together they test the milestone without inventing a second demo-only life engine.

## M2 acceptance commands

Run the focused semantic proof first:

```bash
git switch agent/m2-lived-encounter
git pull --ff-only

node --test \
  --test-reporter=./tools/test-infra/fibre-spec-reporter.mjs \
  services/world-kernel/test/regulation-cycle.test.mjs \
  services/world-kernel/test/interoceptive-cognition.test.mjs \
  services/world-kernel/test/lived-now.test.mjs \
  services/world-kernel/test/current-life-projection.test.mjs \
  services/world-kernel/test/lived-encounter-cognition.test.mjs \
  services/world-kernel/test/lived-encounter-write-api.test.mjs \
  services/world-kernel/test/lived-encounter-reflection.test.mjs \
  services/world-kernel/test/lived-encounter-memory.test.mjs \
  services/world-kernel/test/lived-encounter-continuity.test.mjs
```

Then run the repository gates:

```bash
npm run check
npm run test:all
npm run validate
npm run test:audit -- --check --quiet
git status --short
```

M2 closes only when the focused semantic proof, repository gates, and one real deployed `/meet` smoke test are green. The proof should demonstrate a lived person; passing generic infrastructure tests alone is not the milestone.