---
id: m2-pr39-h2-compatibility-review-result
status: hold_manifest_fix_pending_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — H-v2 compatibility amendment review result

## Verdict

**HOLD — compatibility amendment CLEAR on its own terms; repository validation fix required before H-v2.**

The hostile review independently reproduced `592/592` active tests, clean build, exact canonical and projected Pass-B schema digests, zero-call H-v2 preflight CLEAR, and an absent `cohort-v2` output root. The reviewer attacked the compatibility layer by execution and found no scientific or transport-integrity defect requiring a change to H-v2.

The only blocking issue was pre-existing repository validation failure: two accepted canonical G1 world-definition documents were absent from all AI context profiles.

```text
docs/architecture/world-context-specificity-v1.md
docs/architecture/world-presentation-v1.md
```

The reviewer reproduced the same `npm run validate` failure at the original Gate-G reviewed head, so this is not H-v2 drift. It blocks only because the one-shot founding cohort should not be generated from a tree that fails its own canonical-document coverage rule.

## Compatibility amendment findings

The reviewer found the H-v2 compatibility amendment sound:

- H-v1 remains a permanently frozen operational HOLD at `448bd669f742a566da289cc4117907f2d37e32e3` with exact runner blob `b3f8dc0b382ea64431df866a80ab91804021431f`.
- H-v1 produced no Pass-B output and published no Thread.
- H-v2 cannot read H-v1 Pass-A content as candidate history.
- Canonical Pass-B schema remains `sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a`.
- OpenAI transport projection remains `sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c`.
- Projection is digest-pinned to the exact canonical Pass-B schema and cannot apply to Pass A, Pass C, repair, G5, or even a near-identical Pass-B-like schema.
- All four omitted provider constraints are re-enforced locally before ordinary Pass-B admission.
- A locally rejected output is non-retryable and cannot create content-conditioned resampling or reopen Pass-B repair.
- `git diff --name-only abcff37e -- services/world-kernel/src` is empty; the shared H generator differs from H-v1 by only the explicit versioned binding-path indirection.

## Blocking amendment

The reviewer required exactly this manifest coverage correction in `profiles.full.sources`:

```text
docs/architecture/genesis-origin-source-integrity-v1.md
docs/architecture/world-context-specificity-v1.md
docs/architecture/world-presentation-v1.md
```

The repository amendment was committed as:

```text
a7eebf455afd14befa18dc109f221ed68d4f6b28
```

Diff from the reviewed H-v2 head is exactly two added source entries in `docs/ai-context-manifest.json`, with no other file changed.

## Conversion to CLEAR

The reviewer explicitly stated that this HOLD converts to CLEAR **without another compatibility-layer review** once the manifest-only fix is committed and the repository locally verifies:

```text
npm run context-pack
npm run validate
npm test
npm run genesis:h2-generate -- --preflight
```

Required conditions:

- context pack generation succeeds;
- repository/world-seed validation succeeds;
- active tests remain green;
- H-v2 zero-call preflight remains CLEAR;
- `cohort-v2` remains absent;
- no `services/world-kernel/src` change is introduced.

Only after those conditions hold is the previously reviewed one-call non-life schema probe authorized.

## Non-blocking carry-forwards

Post-H work only; do not change H-v2 before the founding cohort:

1. Move canonical Pass-B omitted-constraint enforcement into the kernel/admission contract so transport compatibility does not own the only enforcement site.
2. Give local compatibility rejection a dedicated error code rather than generic `MODEL_TRANSPORT_ERROR`.
3. Harden transport-evidence writing against pre-output-root failure and evidence-write masking.
4. Commit explicit negative tests for non-Pass-B pass-through, wrapped-fetch constraint rejection, and non-retryability.
5. Document that only `uniqueItems` was empirically rejected in H-v1; `maxLength`/`maxItems` were removed pre-emptively for provider compatibility.
6. Persist the non-life schema-probe provenance rather than only printing it.

These are nonblocking and must not reopen the reviewed H-v2 compatibility implementation before the first valid cohort.
