# PR #38 Slice D — narrow vision review request

**Status:** SLICE D IMPLEMENTED / NARROW REVIEW REQUIRED  
**Scope:** memory-photo completion only  
**Implementation SHA:** `6851db95e02165c36a8efce0db7bb0fa70a1f023`  
**Validation:** `npm run check` green in GitHub Actions run `31826980397`

## Fibre goal

Slice D exists to make one product promise real:

> **Every Thread memory should actually have a photo.**

This is not a generic media-pipeline milestone. The photo is part of a Thread's lived/autobiographical presentation, while Fibre must remain honest about what the image is.

For synthetic memory images:

> **The durable memory prompt, bound source references and truth class are authority. The rendered image is replaceable cache.**

A synthetic reconstruction must never become historical evidence merely because it looks photographic.

## What was implemented

The existing append-only memory visual companion already provided:

- one companion lineage per Thread memory;
- `pending_generation`, `available`, and `unavailable_with_reason` states;
- `synthetic_reconstruction` versus `captured_photo` representation kinds;
- `synthetic_representation_not_historical_evidence` versus `captured_source_evidence` truth classes;
- a durable rich photo prompt and prompt digest;
- bound source references;
- an inspector-visible outstanding-photo obligation.

Slice D adds only the missing execution path:

### `completeMemoryPhoto(...)`

- invokes a supplied renderer with the exact durable prompt, prompt digest, source references and truth class;
- records the returned asset locator as a new append-only `available` revision;
- does not render again when the current photo is already available unless explicit regeneration is requested;
- records renderer/provider failure as `unavailable_with_reason: provider_failure` rather than silently losing the obligation;
- can retry an unavailable synthetic photo using the same durable authority;
- refuses to regenerate a captured historical photo as synthetic media.

### `completeOutstandingMemoryPhotos(...)`

A deliberately simple loop over the Thread's existing companions:

- attempts every outstanding synthetic memory-photo obligation;
- leaves already-available photos alone;
- leaves outstanding captured-photo evidence alone rather than replacing it synthetically;
- returns simple counts/results.

There is intentionally no queue, worker framework, provider registry, scheduler, retry subsystem or generic media orchestration layer in #38.

### `reportMemoryPhotoAssetIssue(...)`

An available cached image can be marked unavailable when the asset layer reports:

- `asset_missing`; or
- `hash_mismatch`.

This appends a new unavailable revision with `assetRef: null`. It does not change the memory, prompt, source references, representation kind or truth status. A subsequent completion regenerates the synthetic cache from the same durable prompt.

## Focused tests

There are two Slice-D-specific end-to-end tests, intentionally not an exhaustive media test matrix:

1. complete all outstanding fixture memory photos and prove the inspector's Thread-level photo obligation becomes satisfied;
2. exercise provider failure -> recovery -> hash mismatch -> regeneration and prove prompt/evidence/truth remain unchanged through the revision history.

The complete repository gate is green.

## Review philosophy

Tests are guardrails for Fibre, not the product.

Do **not** HOLD Slice D for:

- lack of a generic job queue or workflow engine;
- lack of provider abstraction layers;
- exhaustive renderer error taxonomy;
- speculative distributed-systems hardening;
- more test permutations when the Fibre invariant is already covered;
- future production storage/observability requirements that no deployed Thread currently needs.

Prefer the smallest correction if a real Fibre defect exists.

## What to attack

Please answer these product questions by reproducing attacks where useful:

1. **Can a current Thread with outstanding synthetic memory photos be brought to `memoryPhotoRequirementSatisfied=true` through the Slice D completion path?**
2. **Can provider failure silently make a photo obligation disappear?** Expected: no; it remains explicitly unavailable/outstanding.
3. **Can missing/corrupt cache be treated as a valid photo?** Expected: no; `asset_missing`/`hash_mismatch` reopen the obligation.
4. **Can regeneration change the durable prompt, evidence bindings or synthetic truth class?** Expected: no.
5. **Can a captured historical photograph be silently regenerated/reclassified as synthetic media?** Expected: no automatic synthetic replacement.
6. **Can ordinary completion repeatedly rerender an already-available photo?** Expected: no; it is idempotent unless explicit regeneration is requested.
7. **Does any Slice D path award causal/endogenous standing or alter Slice C memory/history semantics?** Expected: no.

Also inspect the conceptual boundary:

> **Does Fibre now make good on “every memory gets a photo” while remaining honest that a reconstructed image is a representation of memory, not evidence that the remembered scene historically occurred?**

## Desired disposition

Return **`VERDICT: CLEAR`** if there is no concrete S1/S2 defect that materially breaks the Fibre product promise or truth boundary.

Use **`VERDICT: HOLD`** only for a reproducible defect that means a memory can remain silently photo-less, synthetic/captured truth can be confused, regeneration can rewrite durable authority, or the completion path materially breaks Thread integrity.

Do not expand the implementation because a more general media architecture could be designed.

The goal of this review is to decide whether Slice D is good enough to freeze so #38 can move toward closure and Fibre can advance to Genesis.
