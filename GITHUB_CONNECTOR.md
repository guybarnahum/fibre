# GitHub Connector Runbook

This file records the repository-specific operating model for agents working on Fibre through the GitHub connector. It is deliberately outside `docs/`: this is tooling guidance, not Fibre canon, and canonical `docs/*.md` files are covered by AI-context-manifest checks.

The goal is simple: **treat the connector as a precise Git/GitHub API, not as a substitute for a local checkout.** Pin state, inspect narrowly, make the smallest coherent write, and verify the exact resulting SHA.

## Golden workflow

Use this sequence for every non-trivial GitHub change.

### 1. Orient from the PR, not from search

For work already assigned to a pull request:

1. fetch the PR;
2. record its base branch, head branch, and exact `head_sha`;
3. list changed filenames if the scope is not already obvious;
4. inspect only the files/patches needed for the current task.

Treat the PR head SHA as the source of truth for the operation.

`search` is useful for discovering code on the indexed/default branch. It is **not reliable evidence of the contents of an unmerged PR branch**. If search and an explicit ref/SHA read disagree, trust the explicit ref/SHA read.

### 2. Pin the exact head immediately before a write

Re-fetch the PR or branch just before mutation. Do not assume a SHA retrieved earlier in a long session is still current.

For multi-file Git-object writes, use that current head as the parent. For contents-API writes, still record the head before the write and verify the new head afterward.

This is our optimistic-concurrency guard. A stale branch assumption is a reason to re-orient, not to force a write.

### 3. Inspect narrowly

Prefer, in order:

- `fetch_file` for a known file at an explicit ref;
- PR file patches for reviewing branch-local changes;
- changed-filename lists to establish scope;
- targeted repository search for discovery on the default/indexed branch.

Avoid recursive repository-tree dumps as a general checkout replacement. Large trees are cumbersome and may be truncated by the connector/UI. Fetch the few paths needed to answer the question instead.

### 4. Write coherently

Prefer one coherent commit for one conceptual change.

When changing several files and the Git-object functions are available, the clean path is:

1. create blobs for the complete new file contents;
2. create a tree using the exact current base tree;
3. create one commit whose parent is the pinned head SHA;
4. fast-forward the existing branch ref to that commit;
5. re-fetch the branch/PR and confirm the new SHA.

For a single new text file, the contents API is usually simpler. For an existing file, fetch it first and pass its current blob SHA to the update call.

Do **not** create an extra pull request merely as transport for commits intended for an existing Fibre milestone PR.

### 5. Verify the write

A successful mutation response is not the end of the operation.

After every write:

1. re-fetch the branch or PR;
2. confirm the expected new `head_sha`;
3. fetch the changed file(s) at that ref when correctness matters;
4. inspect Actions for that exact SHA.

Never report a change as finished solely because a write API returned success.

### 6. Diagnose CI from Actions, not combined status

GitHub's combined commit-status endpoint is not sufficient for Fibre CI. GitHub Actions checks may be absent there, and a generic check-run may expose only `Process completed with exit code 1`.

Use this path instead:

1. fetch workflow runs for the exact commit SHA;
2. select the failing run;
3. fetch its jobs;
4. inspect the failing step;
5. use the specialized Actions job-log function for command output when available;
6. inspect annotations when the check produces them.

Generic API fetching of Actions log-download endpoints can fail because those endpoints are binary/redirecting and may be outside the connector allowlist. Prefer the connector's purpose-built workflow/job/log actions.

## Connector limitations we have actually hit

### The connector is not a checkout

The GitHub connector exposes repository objects, PRs, files, commits, and Actions through APIs. It does not provide a working tree where arbitrary local Git commands can be assumed to work.

The execution container used by the assistant may also lack outbound access to GitHub. If `git clone`/`git fetch` fails for network reasons, do not spend repeated cycles trying shell variations. Return to connector-native reads and writes.

### Search is branch-insensitive for our purposes

Repository search is excellent for orientation, but it is usually indexed from the default branch. It can therefore miss or contradict code that exists only on the current PR branch.

Rule: **discover with search; prove with an explicit ref or SHA.**

### Broad responses are frequently truncated

Large PR diffs, recursive trees, and large file responses can exceed display budgets. Truncation is a presentation constraint, not evidence that data is absent.

Use changed filenames, exact paths, patches, or paged response resources instead of repeatedly requesting the entire repository state.

### Tool discovery should be narrow

The GitHub connector has many actions. Loading every schema adds noise and makes mistakes more likely.

Discover actions with a single narrow keyword such as `file`, `commit`, `tree`, `ref`, `workflow`, or `logs`, then invoke the specific action. Do not repeatedly rediscover the full connector surface.

### Status and Actions are different surfaces

A green/empty combined status does not prove GitHub Actions is green. Conversely, a failing workflow summary often does not contain the failing command's output.

Always bind CI inspection to the exact PR head SHA and walk workflow run -> job -> step/log.

### Generic fetch has an allowlist boundary

The connector's generic GitHub fetch is useful for REST resources that are allowed and JSON-shaped. It should not be treated as an escape hatch for every GitHub endpoint. Binary log downloads and redirecting endpoints can be rejected.

Use specialized connector functions first when one exists.

## Fibre-specific PR discipline

Fibre uses PR numbers as milestone bookkeeping. **PR numbers are project state, not disposable transport identifiers.**

Therefore:

- never open a temporary PR to move commits into an already-planned milestone PR;
- never consume the next planned number merely because a branch write is awkward;
- work directly on the head branch of the intended PR when the requested change belongs there;
- re-fetch the target PR before mutation so a remembered PR/branch association cannot silently drift;
- if an accidental transport PR is created, first prove that the intended milestone PR contains the necessary commits before closing/relabeling anything;
- do not delete branches or rewrite history as bookkeeping cleanup unless the owner explicitly asks for destructive cleanup.

A PR title/body can be repaired. A consumed number cannot be un-created, so prevention matters more than cosmetic cleanup afterward.

## Fibre docs caveat

Canonical Markdown under `docs/` participates in Fibre's AI-context coverage checks. Adding a new canonical `docs/*.md` file can therefore require a corresponding context-manifest/profile update.

Operational instructions that describe *how agents use tooling* should normally live at repository root (this file or `AGENTS.md`) unless they are intentionally part of Fibre's canonical conceptual documentation.

Do not bypass a manifest failure by weakening the check. Put the document in the correct conceptual layer or update the manifest deliberately.

## Recovery recipes

### Stale SHA

If the branch moved after inspection:

1. stop the planned write;
2. fetch the new PR/branch head;
3. re-read any files whose contents affect the patch;
4. rebuild the change on the new head;
5. write and verify normally.

Do not force-update a shared milestone branch just to preserve an obsolete local assumption.

### Search says a file/code path is missing, but the PR says it exists

Fetch the file at the PR's explicit head ref/SHA. If it exists there, continue from that branch-local state and ignore the stale/default-branch search result.

### CI says only `exit 1`

Do not infer the cause. Fetch the workflow run for the exact head, then the failing job and step, then use specialized job logs/annotations. If logs still cannot be retrieved, inspect the repository's `check` script and its component commands at the same ref and narrow the failing command without inventing an error message.

### An accidental transport PR exists

Before touching it:

1. fetch both PRs;
2. compare or inspect their exact heads;
3. prove the intended milestone PR contains the desired work;
4. preserve the milestone branch and commits;
5. only then repair the accidental PR's state/title/body using non-destructive metadata changes where possible.

## Compact checklist

Before mutation:

- [ ] Correct repository and milestone PR.
- [ ] Exact current head branch and SHA recorded.
- [ ] Branch-local files read by explicit ref/SHA.
- [ ] No unnecessary new PR.

After mutation:

- [ ] Branch/PR re-fetched and new SHA confirmed.
- [ ] Changed files verified when material.
- [ ] Actions inspected for the exact new SHA.
- [ ] PR body/status updated if implementation state changed.

The operating principle is: **pin, inspect narrowly, mutate coherently, verify, then trust.**