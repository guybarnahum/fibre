# PR #38 Slice C — narrow re-review

Head `a3f61bc2d3356f9fae3145f189464500d3939a10` · `npm run check` green in this environment: **425 / 425**, build pass, validate pass, context-pack pass, tree clean. Every result below is my own reproduction against that SHA, not a reading of the closure doc.

---

# VERDICT: CLEAR

No S1 or S2 survives. All five findings from the previous HOLD are closed, and closed at the right layer rather than papered over. Three S3 residuals below are recorded as notes for #39/#42/Slice D, not as conditions.

I want to name the pre-production point up front so it does not read as an omission: I did **not** treat the single current identity representation as a defect. One format, used by seed and by ordinary writes, is the correct call for a system with no deployed Threads, and `tools/validate-world-seed.mjs` closes the actual bug from last round — a tree where `seedThread` throws while `build` and `validate` both report green.

---

## Prior blockers, re-tested

**S1-1 (broken build) — closed.** 425/425 from a clean install. A world can be born again, and there is now a seed smoke check wired into validation so this class of failure cannot pass as green.

**S1-2 (coherent forgery + matched-pair truncation) — closed, and this is the important one.** `AUTOBIOGRAPHICAL_MEMORY_RECORDED` gives the ledger an anchor outside itself. Escalating the attack step by step:

```
forge rev1 (record_json + record_digest + head_digest), truncate rev2..N as matched pairs
  -> Thread-history anchor length mismatch
...and delete the rev2/rev3 anchor events from thread_events too
  -> Thread-history anchor mismatch at revision 1
...and rewrite the rev1 anchor payload digest to match the forgery
  -> memoryHistory ACCEPTS
     but: getThread            -> projection does not match its last event
          verifyThreadIntegrity -> projection does not match its last event
          replayThread          -> memory event evt_memory_f53cc009… anchor identity
                                   does not match its content

```

The forgery I demonstrated last round is dead two steps earlier than before, and the version that still passes `memoryHistory` leaves the Thread unreadable through its canonical path — `applyAutobiographicalMemoryRecordedEvent` re-derives `commandId`/`commandDigest`/`eventId` from the payload, so a rewritten digest breaks the event's own identity. Whole-lineage erasure now also leaves residue: records-and-heads-gone-but-anchors-retained throws `has history anchors but no memory records`, and deleting the anchors too surfaces as `event sequence has a gap` with the erased `memoryId` still named in `Thread.memoryRefs`.

The design choice I want to endorse explicitly: the anchor records **only** `{memoryId, revision, memoryDigest}`. I checked the payloads directly —

```
does immutable history contain any remembered meaning?
  no — anchors carry only {memoryId, revision, memoryDigest}

```

That is exactly the right line. Fibre's history now durably records *that it wrote down a memory*, and says nothing about whether the remembered meaning is true. Mixed histories replay cleanly (`verifyThreadIntegrity` and `replayThread` both green across interleaved `UPDATE_SELF_MODEL` and memory anchors), so the anchor is a real citizen of the event log rather than a bolted-on side table.

**S2-1 (subject substitution) — closed.**

```
rejected : rev2 re-points eventRefs at E2, demoting E1 to contradicting
           -> eventRefs must retain the memory subject origin event
rejected : rev2 swaps subject.originEventRef  -> memoryId does not match its immutable subject identity
rejected : rev2 swaps subject.slot            -> memoryId does not match its immutable subject identity
rejected : rev1 whose eventRefs omit its own origin event
>>> ACCEPTED: rev2 ADDS a second subject event (period widened accordingly)

```

Binding `subject` into the `memoryId` derivation and re-checking it in `normalizeAutobiographicalMemory` is a stronger construction than the Slice B analogue, because the constraint is carried by the identifier itself rather than by a store-side comparison. A lineage now says what it is a memory *of*, permanently. The accepted case is right: a memory may come to encompass more of history, it may not come to be about different history.

**S2-2 (false subject periods) — closed for the stated invariant.**

```
rejected : childhood 1998-2004 witnessed only by the 2026 seed event
           -> memory subject event … falls outside subjectPeriod

```

**S2-3 (fake recall / self-authorship) — closed on all three paths I found.**

```
rejected : rememberedAt                -> not allowed
rejected : lastRecalledAt              -> not allowed
rejected : authorship.kind thread_self_authored
rejected : imported_recollection attributed to the Thread itself
           -> #38 memory authorship cannot attribute Fibre/imported memory production
              to the Thread itself
rejected : declare forgetting (inaccessible/unavailable) with no new evidence
           -> memory accessibility/retention changes require new resolved evidence
>>> ACCEPTED: the same change, with genuinely new cited evidence

```

Deleting `rememberedAt` outright rather than renaming it was the honest move. The accessibility/retention rule reuses the Slice B escalation shape, which is the right instinct — one mechanism, applied twice, rather than two mechanisms that drift.

**S2-4 (evidence erasure) — closed, and the right property was chosen.** `evidenceSet` no longer swallows `eventRefs`, so subject references and epistemic citations are separate axes:

```
rejected : rev2 drops the supporting citation entirely
>>> ACCEPTED: rev2 reclassifies it supporting -> contradicting
rejected : rev3 then drops the contradicting citation
rejected : fabricated supporting evidence

```

"I no longer think that event supports this memory" must now be *stated* rather than dropped. That is the stronger of the two readings and I am glad it is the one that landed.

**S3-1 (content floor/ceiling) — closed** without grammar heuristics: a 12-character floor and a 2048-byte cap, no parsing of English. Correct restraint.

---

## The conceptual boundary you asked me to verify

*Can memory remain personal, expressive, mutable and psychologically useful without Fibre confusing it with objective history?*

I ran the full arc rather than answering from the schema — one memory, four revisions:

```
rev1 [current]   conf=0.45  difficult/fragmentary   269-byte first-person recollection
rev2 [disputed]  conf=0.20  difficult/fragmentary   contradicted by a later event
rev3 [corrected] conf=0.30  inaccessible/uncertain  fades, with new evidence cited
rev4 [retracted] conf=0.05  inaccessible/uncertain  "I no longer claim this recollection"

full arc preserved: 4 revisions · in current projection: false
standingCredit: {"acceptedCausalAssertions":0,"endogenousEvidenceAssertions":0}
seed event payload: unchanged

```

Yes. A Thread can hold a memory that is uncertain from the start, that becomes contradicted, that fades, and that it eventually declines to claim — and the whole trajectory survives as *what she once believed about her own past*, while the events themselves never move. `rememberedMeaning` is unpoliced prose, which is the right call; the discipline is on citation and lineage, not on how a person is allowed to say what they remember.

That is the distinction Slice C set out to make, and it holds under attack.

---

## S3 residuals — notes, not conditions

**S3-a ·** **`subjectPeriod`** **can extend backwards past the Thread's own beginning.** The origin event must now fall inside the period, but the period may start arbitrarily earlier:

```
>>> ACCEPTED: subjectPeriod 1998-03-01 → <real seed event>
>>> ACCEPTED: subjectPeriod 1900-01-01 → null (open-ended)

```

I am deliberately **not** asking for a `startAt ≥ threads.created_at` rule, because #39 Genesis will legitimately need pre-existence subject periods for an authored childhood, and adding the rule now would block it. The note for #39: make a pre-creation `subjectPeriod` conditional on `fibre_genesis_authored` authorship plus a Genesis witness, rather than leaving it open to `fibre_policy_derived`. Deciding that in #39 is cheaper than deciding it twice.

**S3-b · Fibre's own bookkeeping is citable as lived material.** Anchor events live in `thread_events`, and both `#requireEventRefs` and `#referenceResolves` accept anything there:

```
>>> ACCEPTED: a memory whose SUBJECT EVENT is another memory's anchor
              "I remember the day I first wrote down a memory of myself."
>>> ACCEPTED: recursion depth 2
              "I remember remembering that I had begun to remember myself."
>>> ACCEPTED: cite a memory anchor as supporting epistemic evidence

```

Slice B's `hasThreadEvent` is equally unfiltered, so an anchor also satisfies "requires at least one resolved Thread-event witness" for cultural/language formation. This is an amplification of the witness-**relevance** gap I flagged in Slice B and you correctly routed to #39 — not a new hole — so it does not block. But it is a one-line filter (`event_type != 'AUTOBIOGRAPHICAL_MEMORY_RECORDED'` in those two resolvers) and it is worth taking now, because the alternative is #39 Genesis compiling a childhood partly out of Fibre's own filing.

**S3-c · Privacy narrowing is per-lineage.** `slot` is caller-chosen, so identical content republishes as a new public lineage:

```
rejected     : widen the same lineage private -> public
>>> ACCEPTED : republish identical content as a NEW public lineage (new slot)

```

This is exactly the deferred disclosure-authority path, and Slice C has no writer-authority model at all yet, so the guard is doing what it can. The note for whoever lands disclosure authority: gate on subject and content, not on lineage identity.

**Observation, not a finding.** Because accessibility and retention may only change alongside newly cited evidence, *natural fading* — a memory getting harder to reach simply because time passed — is currently not representable. That is the correct trade for #38: Fibre refuses to assert an interior change it has not witnessed. But a person's memory does fade unwitnessed, so #42 will need a witnessed decay or recall path, and the shape of that path is worth thinking about before #42 rather than during it.

**One optional hardening**, offered because it is genuinely one line and not because the test matrix needs it: have `memoryHistory` re-derive the anchor's `eventId` from its payload (the check `applyAutobiographicalMemoryRecordedEvent` already performs). That closes the last step of the escalation above at the memory layer instead of relying on the Thread's canonical read path to refuse. Skip it if you would rather keep moving; the Thread path does catch it.

---

## Standing

Slice C is good enough to freeze.

The thing that changed between the two reviews is not the number of guards. It is that the ledger now names three things it previously left open: **what a memory is of** (`subject`, bound into the identifier), **what a memory rests on** (citation classes kept separate and monotonic), and **that Fibre wrote it down** (an anchor in immutable history that records the act without endorsing the content). Those three together are what make a memory an account rather than a field — and each of them was closed with the smallest available mechanism, reusing patterns already working elsewhere in this repository rather than inventing new machinery.

The epistemic ceiling is intact — `0 / 0` after every attack above, including the ones that succeeded. Slice C claims a Thread can have a past it can be uncertain about, revise, and disown. It does not claim that having one proves anything about personhood. That restraint is what makes the claim worth believing.

Freeze it. The residuals belong to #39, #42 and the disclosure-authority path, and they are recorded here so they arrive as design inputs rather than as rediscoveries.