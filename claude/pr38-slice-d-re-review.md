# PR #38 Slice D — narrow re-review

Head `399377fc24f41a154b080fa931ea0c4bdddb417b` · `npm run check` green here too: **427 / 427**, build, validate and context-pack pass, tree clean. Delta from the reviewed head is 2 files, +18 lines. Scoped to S1 and S2, re-run as my own reproductions. Prior S3 notes not reopened.

---

# VERDICT: CLEAR

Both blockers are closed. No new blocker appeared. One paragraph of follow-on at the end, explicitly not a condition.

---

## S1 — every memory now gets a photo obligation

`ensureMemoryVisualCompanion` is called from `recordMemory` inside the existing transaction, gated on revision 1, with `memorySummary: record.rememberedMeaning`. Re-running the exact reproduction that failed four ways:

```
Slice C memoryId : mem_27e8a06bb5739ff0c98cbb5235d6c289…
companion rows   : mem_27e8a06b…:pending_generation, mem_mina_first_review:pending_generation
companion exists for the Slice C memory: true

>>> ACCEPTED: listMemoryVisualCompanions
>>> ACCEPTED: completeOutstandingMemoryPhotos
>>> ACCEPTED: completeMemoryPhoto for that memory directly
>>> ACCEPTED: verifyThreadIdentityIntegrity
>>> ACCEPTED: completeOutstandingMemoryPhotos after reopen
```

And the promise end to end, from a recorded recollection to a satisfied obligation:

```
batch: {"memoryCount":2,"attempted":2,"completed":2,"failed":0}
memoryPhotoRequirementSatisfied: true | outstanding: []
createdFrom: persisted_autobiographical_memory
truthStatus: synthetic_representation_not_historical_evidence
prompt MEMORY MOMENT is grounded in the actual recollection: true
```

That last line is the part I care about most. The prompt's `MEMORY MOMENT` section now contains Mina's own sentence — *"I remember the afternoon I first understood that refusing could be a kind of care"* — rather than the `legacy_memory_reference` "do not invent specifics" fallback. Slice C's honest first-person text is now the authority for Slice D's image, which is the seam working the way it should rather than merely being closed.

No regression into Slice C. A reinterpretation still lands, the companion is not re-ensured on later revisions, and the anchor chain is intact:

```
Slice C revision 2 (reinterpretation) still lands
   memory history: 2 revisions | companion revisions: 1
   standingCredit: {"acceptedCausalAssertions":0,"endogenousEvidenceAssertions":0}
verifyThreadIntegrity: ok
replayThread: ok
```

## S2 — the truth boundary holds in both directions

```
rev2: synthetic_reconstruction / synthetic_representation_not_historical_evidence
      asset s3://fibre-memory-visuals/mem_mina_first_review.webp  (Fibre-generated)

rejected : rev3 relabels the SAME generated asset captured_photo / captured_source_evidence
           -> cannot change representation kind; captured evidence and synthetic
              reconstruction are different lineages
rejected : captured -> synthetic downgrade (same guard, other direction)
```

I probed for a way around it rather than accepting the first refusal:

```
rejected : change ONLY truthStatus, keep representationKind synthetic
           -> synthetic reconstruction cannot be historical photo evidence
rejected : go pending first, then captured (two-step laundering)
           -> cannot change representation kind
rejected : re-assert revision 1 as captured (rewrite the root)
           -> revision 1 cannot supersede a revision

lineage still: synthetic_reconstruction / synthetic_representation_not_historical_evidence
```

The guard composes correctly with the within-revision kind↔truth pairing that was already there: pinning the kind across revisions transitively pins the truth class, so there is no single-field edit that separates them. A Fibre-generated image cannot become photographic evidence of anything.

---

## One follow-on, not a condition

Closing S2 by pinning `representationKind` across revisions means `captured_photo` is now unreachable for any memory Fibre creates — verified:

```
Slice C memory companion rev1: pending_generation / synthetic_reconstruction
rejected : admit a real captured photograph for that memory
           -> cannot change representation kind
```

Because `memoryVisualCompanionId` is derived from `{threadId, memoryRef}`, there is exactly one lineage per memory, and that lineage is now always seeded synthetic. So the separate-lineage route I suggested last round is foreclosed by the ID derivation.

This is **not** a Slice D defect and I am not holding on it. #38 never claimed to admit real photographs, no path in #38 does, and erring toward "we cannot call a generated image a photograph" is the right way to be wrong. But when a real photograph does need admitting — a human uploading an actual picture of a remembered scene, or Genesis carrying one in — the companion ID will need a discriminator so a captured lineage can exist beside the synthetic one. Recording it here so it arrives as a design input rather than a surprise.

---

## Standing

Slice D freezes. Fibre now makes good on "every memory gets a photo" for the memories it actually creates, and it does so without ever being able to claim that the picture is evidence the scene occurred. The prompt is authority, the digest binds it, the image is cache, and the two truth classes are now different lineages rather than different labels on one.

Both corrections were the small ones, landed in the two places that needed them, +18 lines total. That is the right shape for a slice whose value is a promise kept rather than a system built.
