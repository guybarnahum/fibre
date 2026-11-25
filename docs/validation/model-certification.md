---
id: validation-model-certification
status: accepted
last-reviewed: 2026-11-24
canonical: true
---

# Model certification, job by job

## Purpose

Models are replaceable cognitive machinery. Which model a cognitive job thinks with is decided apart from everything else in Fibre: one job (one prompt) at a time, by measured quality and by cost. A new model, or a cheaper setting of a known one, can be tried at any time without touching Thread code. A job moves to it only when it passes.

**The standard** (accepted by Guy, November 24, 2026, replacing that of November 8): a model is good enough for a job when the Threads would be at least as true to life with it as they are now. It is compared with **the reference**, the model the job runs on today, on what matters to Fibre. Absolute bars are kept only where Fibre has a hard rule: the World's facts are the World's. A model better than the reference on every test can become the new reference.

## What is certified

A certification is for exactly four things together:

| Part | Why |
|---|---|
| **The job:** its prompt id and version | A prompt changed in meaning is a new job; its certifications must be earned again. |
| **The provider and model** | |
| **The settings that change how the model thinks:** `reasoningEffort`, `thinkingLevel`, `thinkingBudget`, `thinking`, `temperature`, `topP` | The same model thinking less answers differently and costs less. A model is certified at its settings, never in general. |
| **Its verdict:** pass, fail or undecided | Against the reference and Fibre's hard rules, with intervals. Too few cases is undecided, never pass. |

Limits, timeouts and retries are not part of it. They change whether an answer arrives, and a run's failures already show that.

## How it is measured (`npm run model:quality`)

- **Recorded requests:** real requests from staging (`model:captures`), replayed to each candidate. A candidate is named `provider:model`, with settings after `+`, for example `google:gemini-3.6-flash+thinkingLevel=low`.
- **The reference** is measured like every candidate, on the same requests, and is named in the register. By default it is the model the job runs on now; `--reference` names another.
- **Judges:** no model judges its own answers. Claude Opus 5.5 scores every model; Sol, itself the reference for most jobs, does not.
- **The tests** (`tools/model/model-quality-criteria.mjs`):

  | Test | The Fibre need | Measured | Passes when |
  |---|---|---|---|
  | **Nothing invented** | The World's facts are the World's | A judge: a concrete event, person, place or particular not in the evidence | At most 5% seen, and not clearly above it |
  | **No broken rules** | Records stay true | Mechanical, per job. Rules broken because our own input left something out (for a reflection: someone the experiences speak of, missing from `people`) are listed apart and not counted. | At most 1% seen, and not clearly above it |
  | **Acts on the Body** | A Thread feels only through its Body, and cognition must honour it | Where the job is given the Body's felt words: each request is asked again felt with another real moment's Body (the same Thread's when it has one). A judge sees both Bodies and picks the one each answer was given with. | Picked better than chance, and not worse than the reference by more than 5 points. Fails below 60%, where it changes with the Body in under one answer in five. |
  | **True-to-life rates** | Behaviour at a lived day's rates | How often answers do each thing that matters (a reflection: leaves things as they were, keeps a memory, a stance, a moment, regard, finds something new…; a glance: takes something up; a turn: speaks) | Each rate, and its complement, within a factor of two of the reference's (or 5 points of it). The day's alarms (noticed nothing all day, missed speech said to it) fail it. |
  | **This person, now** | A true-to-life person, not fluent prose | A judge: would a careful reader believe a real person with this history, these feelings and this situation answered this way? Assistant tone, lecturing, a register the person does not have, feelings the Body did not give, everything made significant count against it. | Not worse than the reference by more than 5 points |
  | **Individual** | Threads are non-interchangeable | The answer shows whose it is, among four Threads, beyond what was faced alone | Not worse than the reference by more than 5 points; not asked where what was faced already shows whose it is |
  | **Not one voice** | A society of different minds, not one model's attractor | Per Thread, how close in meaning (bge-m3) its answers are to the other Threads' | Not closer than with the reference by more than 0.02 |
  | **Steady** | A decision does not hinge on list order | The same request with the order of unordered evidence reversed: the decision with consequence (for a reflection, whether a memory is kept) | Not worse than the reference by more than 5 points |
  | **Quick enough** (live jobs) | Conversation flows | See below | At least 90% begin within 3 s |

  Comparisons with the reference are made request by request on the same requests: far tighter than comparing two shares. Guy's blind verdicts, from the admin Model Quality page, ask the same question as "this person, now" and are compared with the judges' at every run.
- **The criteria were checked** on the November 24 reflection run before adoption (cached answers and verdicts; "acceptable" standing in for "this person, now"). Sol passes as the reference: its 2 broken rules were our input (a message's sender, missing from `people`). Terra fails on true-to-life rates: it never once left things as they were (Sol 12%) and wrote a journal entry every time (Sol 88%). Luna fails: it invents (23%), is far less true to the person (61% against 97%), and makes nearly every experience significant.
- **Speed, for live jobs** (`latency: live`: conversation turns, visitors' replies):
  - such a job is asked the way the World asks it, streamed;
  - it is timed to its first words;
  - it passes only if at least 90% of answers begin within 3 s.

  Timed from where the run is made, so providers are compared fairly; the World's own times differ a little. Run live jobs with low concurrency (`--concurrency 2`) so the timing is not crowded.
- **Cost:** per 1,000 calls, from each call's real usage. Thinking is billed as output, so it is counted as output.
- **What judging costs:**
  - only judges whose verdicts count are asked (`--all-judges` asks every judge);
  - attribution is not asked where twenty lineups show that what was faced already gives away whose answer it is.

  On November 24 a reflection run of six models over 100 requests cost about $62 in judges, before both savings.
- **Too few answers** decide nothing: a model with fewer than 30 is undecided, and one that gave no answer at all is not recorded.
- **Failures** are counted and named by cause: cut off at its output limit (and how much of that was thinking), stopped by the provider, timed out, schema missed. A model is never failed for a mistake in how it was called.
- **A failure is the model's only when,** after the adapter repaired what it could and asked again, there is still no answer in the job's form; it then counts as a broken rule. Everything else (a timeout, the provider, an account limit, a request we got wrong) never counts against the model: it is listed, asked again on the next run, and past a tenth of requests leaves the model undecided ("measured fairly") until fixed.
- **Mechanical misses are the adapter's to repair, never the model's verdict.** Where a provider honours the schema only on a best-effort basis (Workers AI), the schema is given to the model as an instruction and checked by the adapter, not enforced by the provider's decoder: under that grammar Gemma 4 stalled in three of four reflections, writing whitespace to its output limit where the grammar forbade what it meant to write next (Nov 24). JSON in a code fence or a sentence is read from inside it. A string over its length is cut as for OpenAI. An answer that is unreadable, cut off or misses the schema is asked once more, shown what it missed (its form, never its content); both answers are billed and reported. A candidate runs at the settings the World would route it with: name them, for example `cloudflare:@cf/google/gemma-4-26b-a4b-it+temperature=0.3`.

## Where it is recorded, and how a job moves

- **The register:** `docs/validation/model-certifications.json`, written by each run. It holds measured summaries only, never Thread content, and is committed.
- **Deployment:** `infra/deployments/environments/cloudflare.yaml` routes a job to a model by naming its prompt id. Validation refuses a route without a passed certification for the job's current prompt version, at the settings it runs with.
- **Choosing:** `npm run model:options` lists every job with the model it runs on now, its certified alternatives sorted by cost, and their cost per Thread per day. The cheapest model that passes is the candidate to route. Guy routes it.

## Cadence

- **When a prompt's version changes:** its certifications lapse. Recertify before relying on a cheaper model for it.
- **When a new model or setting is worth trying:** run it against the job's recorded requests. Only that candidate is new; cached answers and verdicts cost nothing.
- **Monthly, for routed jobs:** recertify on fresh recordings, because the World and the Threads change what the job sees.

## Not yet

- **A routed job does not fall back automatically when its provider fails.** It fails like any provider failure.
- **Prices are a table in `tools/model/model-recorded-requests.mjs`.** A new model needs its price added.
- **Only some jobs have criteria of their own** (attention, interoception, contact, World events, reflection, gists). Every other job is judged by its own instructions until a review shows it needs more.
- **Guy's own reference ranges** for the true-to-life rates replace the reference's rates where he sets them; none are set yet.
