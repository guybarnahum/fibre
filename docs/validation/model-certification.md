---
id: validation-model-certification
status: accepted
last-reviewed: 2026-11-24
canonical: true
---

# Model certification, job by job

## Purpose

Models are replaceable cognitive machinery. Which model a cognitive job thinks with is decided apart from everything else in Fibre: one job (one prompt) at a time, by measured quality against fixed bars, and by cost. A new model, or a cheaper setting of a known one, can be tried at any time without touching Thread code. A job moves to it only when it passes.

## What is certified

A certification is for exactly four things together:

| Part | Why |
|---|---|
| **The job:** its prompt id and version | A prompt changed in meaning is a new job; its certifications must be earned again. |
| **The provider and model** | |
| **The settings that change how the model thinks:** `reasoningEffort`, `thinkingLevel`, `thinkingBudget`, `thinking`, `temperature`, `topP` | The same model thinking less answers differently and costs less. A model is certified at its settings, never in general. |
| **Its verdict:** pass, fail or undecided | Against absolute bars, with intervals. Too few cases is undecided, never pass. |

Limits, timeouts and retries are not part of it. They change whether an answer arrives, and a run's failures already show that.

## How it is measured (`npm run model:quality`)

- **Recorded requests:** real requests from staging (`model:captures`), replayed to each candidate. A candidate is named `provider:model`, with settings after `+`, for example `google:gemini-3.6-flash+thinkingLevel=low`.
- **Judges:** no model judges its own answers. Each judge rules on:
  - **validity:** no broken rules, nothing invented;
  - **attribution:** the answer shows whose it is;
  - **invariance:** the same decision when only the order of evidence changes;
  - **a credible day:** no alarms over the answers taken together;
  - **acceptability:** every judge finds the answer acceptable for this job.

  Bars are in `tools/model/model-quality-criteria.mjs`. Guy's blind verdicts, from the admin Model Quality page, are compared with the judges' at every run.
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
- **Only one job has criteria of its own** (`encounter.attention`). Every other job is judged by its own instructions until a review shows it needs more.
