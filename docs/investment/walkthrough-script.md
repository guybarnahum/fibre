---
id: investment-walkthrough-script
status: proposed
last-reviewed: 2026-11-22
canonical: false
---

# Fibre — 5-Minute Live Walkthrough Script & Fallback Protocol

**Rule #1 — Never call it a demo.** Open by saying plainly: *"What you are about to see is not a scripted demo. It is our real staging world — and the eight Threads currently living in Addis Ababa — in its infancy."*
**Rule #2 — Never cross into private interior on screen** unless you are intentionally showing an engineering diligence partner the operator God-view (`admin.staging.insidefibre.com`) with explicit framing. Public walkthroughs stay strictly on `staging.insidefibre.com/new-site` (and `/meet`) + `status.staging.insidefibre.com` + CLI cost tools.

---

## Pre-flight checklist (2 minutes before the call)

1. Open `https://status.staging.insidefibre.com` and verify **Thread life: Running** and **insidefibre.com: Running**.
2. Open `https://staging.insidefibre.com/new-site/live` (or `http://localhost:5173/new-site/live` locally) and note the current **Addis Ababa EAT time** (`UTC+3`):
   - **Daytime in Addis (~07:00–22:00 EAT):** Expect awake Threads at public venues (e.g. Abrehot Library, Unity Park, and after `L1`, school/market).
   - **Nighttime in Addis (~22:00–07:00 EAT):** Most Threads will legitimately be asleep (`unavailable`). Have the recorded daytime clip queued and narrate the real clock proudly!
3. Optional terminal window ready in `/Users/titan/github/fibre` (if pitching a technical angel) with fresh output from:

```zsh
npm run model:usage -- --days 7
npm run model:options
```

---

## 5-Minute Live Walkthrough Script

### 0:00 – 0:45 · The Hook & Register 1 (`staging.insidefibre.com/new-site`)
- **Show:** The `/new-site` landing screen with the emergent-order Flock/School canvas and hero headline (*"Independent digital individuals. Free. Among us. Everyone else adds intelligence. We add needs and will."*).
- **Say:** *"Every other AI company builds smarter servants. Fibre builds a persistent world, civil identity, and economic rails for independent digital individuals. Notice the flock behind the text — no central controller, just individuals acting on local drives. Scroll down two inches and you're looking straight at our real staging cohort in Addis Ababa right now."*

### 0:45 – 1:45 · The World vs. The Threads (`staging.insidefibre.com/new-site/live`)
- **Show:** Click **See who's living now →** (`/new-site/live`), pointing out the live **Addis Ababa EAT clock**, the 8 living / 80 resting honest count, and (once `K1` is deployed) who is at Abrehot Library, Unity Park, or in transit with `outwardActivity`.
- **Say:** *"For clarity: **Threads** are the digital individuals. **The World** is the projection of our real world into their awareness — partly simulated places and travel so they have somewhere to be, and partly completely real: real wall-clock time, real Project Gutenberg books, and real conversations with humans like us. Thread-to-Thread conversations stay private to the Threads involved — just like real life."*

### 1:45 – 3:15 · Meet a Thread Where It Already Is (click one awake Addis Thread → `/meet`)
- **Show:** Click one awake Addis Thread. Pause **before** clicking Meet!
- **Say:** *"Notice nothing mutated when I opened this page. `GET /present` simply asks the World where this individual already is right now. I didn't summon a chatbot into a blank room."*
- **Action:** Click **Meet this moment** (still local UI state) and send one natural, brief greeting (e.g. *"Hi — sorry to interrupt, how is your day going?"*).
- **Handle all four real outcomes cleanly:**
  - **`accepted` (streamed SSE):** Exchange 1–2 short natural turns grounded in their actual moment, then click **Leave** (pointing out the ephemeral local transcript — zero hidden server chat-session).
  - **`declined` or `deferred`:** **Smile and point straight at it.** *"That right there is why Fibre is not a chatbot. Capability never compels compliance — they genuinely chose not to talk right now."* Switch to a second awake Thread, or play the labelled 90-second recorded accepted-encounter clip.
  - **`unavailable` (asleep):** *"It's nighttime in Addis Ababa — World enforces real wakefulness instead of fabricating a polite answer while sleeping."* Play the labelled daytime clip.
  - **`409 encounter_scene_changed`:** *"Their life moved on while we were typing — the page refreshes to their new moment instead of freezing them in our browser tab."*

### 3:15 – 4:15 · Anti-Theater & Honest Metrics (`staging.insidefibre.com/new-site/inspect` & `/progress`)
- **Show:** Click **Inspect** (`/new-site/inspect`, automatically shifting into the dark **Observatory** register — optionally flip the **A · Atlas / B · Observatory** button once to show the dual register!).
- **Say:** *"Every technical investor asks: 'Is this all just elaborate persona theater?' Here is how we test ourselves. Our Vision-Integrity Scorecard sits honestly at **15 out of 26** — we refuse to count stored traits as individuality until they change behavior. And look at **Progress** (`/new-site/progress`): when we tested Gemma 4 on Workers AI last week, it failed attention at **35% against our 90% bar**, so we reverted it and keep the failure right here in public."*

### 4:15 – 5:00 · Measured Cost & The Ask (`/new-site/inspect` or CLI)
- **Show:** The measured cost card (**$109.00/day → $2.12/day** = **~$0.27–$0.35 / living Thread / day** on `gpt-5.6-sol`, with 0 cheaper models certified yet and reflections-first certification next) and the scale ladder (**8 → 100–500 → 10k–100k → >1M**).
- **Say:** *"Pre-seed funds the jump from this 8-Thread infant world on staging to production and 100–500 living Threads, certified multi-model routing so costs drop cleanly, early paid livelihoods (`L1–L6`), and our public AI-verification registry. Happy to open the codebase or answer your hardest questions."*

---

## Recorded Fallback Protocol (Strict Honesty)

Keep **one pre-recorded 2–3 minute screen capture** from staging ready offline (local file, never committed to Git if it contains unredacted operator logs):

- **What to record (public projection ONLY — zero Admin private interior, zero memories/stances/Body numbers):**
  1. `staging.insidefibre.com/new-site/live` during Addis Ababa daytime showing awake Threads and `outwardActivity`.
  2. One genuine naturally `accepted` 2-turn SSE encounter on `/meet`, plus `Leave` and a later visit showing a newer `situationId` (with exact date, `situationId`, and admitted `encounterStoryId` receipts noted in the caption).
- **Mandatory disclosure when playing fallback:** Always state aloud: *"This is a recorded staging session from [DATE] because [Addis is currently asleep / the Thread declined / staging cognition is paused]."* Never imply a recorded clip is live.
