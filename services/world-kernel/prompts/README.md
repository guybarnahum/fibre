# World cognition prompts

Each file is the fixed system prompt of one cognitive job, named `<domain>.<job>.md`. Everything that varies belongs in the model input, never in the prompt. `npm run prompts:sync` compiles them into `src/generated/prompts.mjs`; call sites use `promptRequest(id, { threadId })` (or `promptFor(id)` for the text alone).

| Domain | What the jobs are |
|---|---|
| `social` | speaking in a live conversation; choosing whom to be near |
| `interior` | Thread-owned judgment over its own developed self: social initiation and response, the Flight Plan, Commons, paid work. Each `interior.*` prompt `extends: interior.base` |
| `encounter` | noticing, experiencing and, later, journaling or remembering an encounter |
| `experience` | delayed reflection over a cluster of experiences (journal, memory, afterthoughts, stances) |
| `contact` | deciding to reach someone, and the message |
| `body` | interpreting the Body's regulation signals as felt states |
| `world` | World-authored happenings and their continuations (not a Thread's voice) |
| `journal` | the form of a Thread's own journal |
| `visitor` | replying to a human visitor |

Front matter: `id` (the file name), `version` (bump when meaning changes), `depth: gate|deep`, `cache: thread|shared`, `latency: live|minutes`, and optionally `extends: <id>` — the parent's text, a blank line, then this file's text. `dignity.guardian.md` and `identity-context.local-reasoning.md` are versioned prompt assets loaded by their own registries, not compiled here.
