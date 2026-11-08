# World cognition prompts

Each file is the fixed system prompt of one cognitive job, named `<domain>.<job>.md`. Everything that varies belongs in the model input, never in the prompt. `npm run prompts:sync` compiles them into `src/generated/prompts.mjs`; call sites use `promptRequest(id, { threadId })` (or `promptFor(id)` for the text alone).

| Domain | What the jobs are |
|---|---|
| `social` | speaking in a live conversation; understanding one's own proposal to meet; choosing whom to be near |
| `interior` | Thread-owned judgment over its own developed self: social initiation and response, the Flight Plan, Commons, paid work. Each `interior.*` prompt `extends: interior.base` |
| `encounter` | noticing, experiencing and, later, journaling or remembering an encounter |
| `experience` | delayed reflection over a cluster of experiences (journal, memory, afterthoughts, stances) |
| `contact` | deciding to reach someone, and the message |
| `body` | interpreting the Body's regulation signals as felt states |
| `world` | World-authored happenings and their continuations (not a Thread's voice) |
| `journal` | the form of a Thread's own journal |
| `visitor` | replying to a human visitor |

Front matter: `id` (the file name), `version` (bump when meaning changes), `depth: gate|deep`, `cache: thread|shared`, `latency: live|minutes`, and optionally `extends: <id>` — the parent's text, a blank line, then this file's text. `dignity.guardian.md` and `identity-context.local-reasoning.md` are versioned prompt assets loaded by their own registries, not compiled here.

`depth: gate` marks a narrow judgment (noticing, a contact decision, Body signals, World events, memory gists) that may later run on a smaller model, but only once a replay shows the smaller model differs from the current one no more than the current one differs from itself. While a deployment's reasoning integration names `captureDepths: [gate]`, the meter logs each such request in full as a `model-capture` event (Thread-private, staging only, kept by `infra:measure` under `.fibre/`, never committed); `npm run model:replay -- --prompt <id> --candidates openai:<model>,google:<model>` replays them against the current model (twice) and each candidate, prices each at list rates, and writes its verdict and a blind read to `.fibre/model-replay/`. `npm run model:quality -- --prompt <id> --models openai:<model>,…` judges each model by what a good answer is, with no model as the reference (accepted by Guy, November 8, 2026): **valid** (keeps the job's rules), **attributable** (two judge models from different families, never reading their own model's answers, pick its true source among four — which Thread, memory, or place and time), **invariant** (the same decision when only meaningless order changes), **credible** over the recorded day (alarms, never targets, for a dead or theatrical day) and **readable** (blind pairwise reads); it writes a blind chronological morning for Guy to read. Quality decides first; quality per dollar chooses among the best.
