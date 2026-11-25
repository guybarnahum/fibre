---
id: validation-model-certification
status: accepted
last-reviewed: 2026-11-24
canonical: true
---

# Model certification, job by job

## Purpose

Models are replaceable cognitive machinery. Which model a cognitive job thinks with is decided apart from everything else in Fibre: one job (one prompt) at a time, by measured quality and by cost. A new model, or a cheaper setting of a known one, can be tried at any time without touching Thread code. A job moves to it only when it passes.

**The standard** (v3, accepted by Guy, November 25, 2026, replacing the comparison with Sol of November 24): a model is good enough for a job when the Threads it thinks for are true to life, and Fibre's Threads succeed with it. Rates are judged against **true-to-life bands** drawn from what life is like, never against another model. The model a job runs on now is measured and judged the same way, and shown beside candidates only as context. Why: on November 25 Sol made nothing happen in 100 World occasions, a dead World, and a standard anchored to Sol could not see it.

## What is certified

A certification is for exactly four things together:

| Part | Why |
|---|---|
| **The job:** its prompt id and version | A prompt changed in meaning is a new job; its certifications must be earned again. |
| **The provider and model** | |
| **The settings that change how the model thinks:** `reasoningEffort`, `thinkingLevel`, `thinkingBudget`, `thinking`, `temperature`, `topP` | The same model thinking less answers differently and costs less. A model is certified at its settings, never in general. |
| **Its verdict:** pass, fail or undecided | Against true-to-life bands and Fibre's hard rules, with intervals. Too few cases is undecided, never pass. |

Limits, timeouts and retries are not part of it. They change whether an answer arrives, and a run's failures already show that.

## How it is measured (`npm run model:quality`)

- **Recorded requests:** real requests from staging (`model:captures`), replayed to each candidate. A candidate is named `provider:model`, with settings after `+`, for example `google:gemini-3.6-flash+thinkingLevel=low`.
- **The model the job runs on now** is measured like every candidate, on the same requests, and judged by the same tests. By default it is the job's current route; `--reference` names another.
- **Judges:** no model judges its own answers. Claude Opus 5.5 scores every model.
- **The tests** (`tools/model/model-quality-criteria.mjs`):

  | Test | The Fibre need | Passes when |
  |---|---|---|
  | **Nothing invented** | The World's facts are the World's | At most 5% seen, and not clearly above |
  | **No broken rules** | Records stay true | At most 1% seen, and not clearly above. A rule broken because our input left something out is listed apart and not counted. |
  | **Acts on the Body** | A Thread feels only through its Body | Where the job is given the Body: each request is asked again with another real moment's Body, and the answer's own Body is picked out better than chance. Fails below 60%. |
  | **True-to-life rates** | Lives at the rates of life | Each rate inside its band in `LIFE_BANDS` (below), and none clearly outside. The day's alarms fail it: a public place where nothing happens all day, or speech said to a Thread not noticed. A rate with no band is shown, not judged. |
  | **This person (or place), now** | A true-to-life person, or a World event true to its place and hour | At least 90% judged so |
  | **Individual** | Threads are non-interchangeable | The answer shows whose it is by at least 10 points beyond what was faced alone; not asked where what was faced already shows it |
  | **Not one voice** | A society of different minds | Each Thread's answers closer to one another than to the other Threads' (bge-m3) |
  | **Steady** | A decision does not hinge on list order | At least 80% the same, where the decision varies at all |
  | **Moves the Thread on** (reflection) | A life that goes somewhere | At most 10% of reflections only restate an interest or moment it already holds, word for word |
  | **Quick enough** (live jobs) | Conversation flows | At least 90% begin within 3 s |

  **The bands** (drafts, revised by evidence):

  | Job | Rate | Band |
  |---|---|---|
  | World event | something happens, in a public place | 30–90% |
  | World event | something happens, elsewhere | 5–30% |
  | Reflection | keeps a memory | 20–60% |
  | Reflection | writes in its journal | 30–80% |
  | Reflection | an afterthought | 15–50% |
  | Reflection | changes an interest | 5–25% |
  | Reflection | a stance toward someone | 5–25% |
  | Reflection | leaves things as they were | 10–40% |
  | Reflection | finds something new | 15–60% |
  | Attention | notices | 50–85% |

  Every bar is met when the rate seen is on its side, and missed only when it is clearly on the other. Guy's blind verdicts, from the admin Model Quality page, ask the same question as "this person, now" and are compared with the judges' at every run.
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
- **Bands exist for three jobs** (World events, reflection, attention). Other jobs show their rates unjudged until a band is set.
