---
id: physical-appearance-calibration-plan
status: active
last-reviewed: 2026-09-28
---

# Physical appearance model calibration and migration plan

## Why this work reopened

The 2026-09-27 Li Jing staging migration proved the **migration mechanism** end to end, including durable physical-genome authority, canonical Embodiment supersession, Presentation/FID convergence and exact replay. It did **not** prove the physical appearance model.

The resulting portrait was not visually coherent with the operator-confirmed East Asian physical ancestry. Re-rendering the unchanged genome-derived specification reproduced the deeper problem: the current founder/phenotype representation does not yet carry enough calibrated facial morphology into the renderer.

That observed failure supersedes the earlier conclusion that population/appearance calibration was closed.

The original calibration tranche established `physical-genome-v0.2` as the validated baseline and live staging proved its v0.1 -> v0.2 authority upgrade and downstream convergence. The current `main` candidate is `physical-genome-v0.3`: a global Human Appearance extension that adds a hierarchical Polynesian calibration plus a deterministic non-historical reference physical state for ordinary-human portrait realism. v0.3 is not staging-accepted until the focused/repository gate and a bounded visual cohort pass.

The first v0.3 48-person controlled visual cohort on 2026-09-28 **failed visual acceptance**. It exposed four distinct issues: the broad-Oceania fallback collapsed Polynesia toward deep pigmentation + curly hair; facial variation remained too narrow despite unique continuous signatures; inherited facial-hair tendency was being rendered as current grooming; and one Han-Chinese subject rendered as European despite a strong East-Asian anatomy specification. A same-seed follow-up improved hair/grooming/variation but still produced a Polynesian cohort that alternated between European-looking and African-descended-looking defaults. A third same-seed run using a 79/21 East-Asian/Oceanian morphology basis removed that bimodality but over-corrected: the Polynesian subset became almost universally wide-spaced, narrow-eyed, epicanthic-present and low-upper-lid, with similarly East-Asian-shifted nasal geometry. Fibre now treats that as a falsification of ancestry-ratio morphology blending, not a weight-tuning problem. The blend mechanism has been removed; `oceania.polynesia` is a complete independent prior built from direct morphology evidence on supported loci plus neutral unsupported coordinates. The compact coherent-variation profile remains. v0.3 stays a candidate until the same-seed visual cohort passes.

## Standing constraints

- Keep runtime O(1): fixed-size genome, bounded deterministic sampling and arithmetic.
- No model call below family-history/ancestry authoring.
- No brute-force image rerolls, image classifiers or background scoring loops.
- Real parent physical genomes always outrank population priors.
- Population priors exist only to instantiate a genuinely missing biological parent/founder.
- Every founder locus must resolve from an explicit reference-population prior. Missing prior material is an error; there is no implicit generic-human `0` fallback.
- Population/ancestry labels remain provenance and calibration inputs, not renderer instructions.
- Physical ancestry must never imply personality, intelligence, ability, dignity, values, religion, politics, class, interests or behavior.
- Tests prove semantic invariants with short failures; they do not snapshot prompt prose or incidental implementation shape.

## Slice 1 — Correct the physical-genome contract

**Status: validated 2026-09-27.** Focused validation passed 39/39; family experiment showed 5/4/4 distinct sibling phenotype signatures, 6 distinct grandchild signatures, and valid first-/second-generation allele inheritance.

Establish the model boundary before doing more calibration:

1. Reference populations become hierarchical identifiers. The intended Asian taxonomy begins with:
   - `east_asia`
   - `east_asia.han_chinese`
   - `east_asia.han_chinese.northern`
   - `east_asia.han_chinese.central`
   - `east_asia.han_chinese.southern`
   - `east_asia.korean`
   - `east_asia.japanese`
   - `east_asia.mongolian`
   - `east_asia.tibetan`
   - `southeast_asia`
   - later calibrated children such as Vietnamese, Thai, Filipino and Malay when evidence is sufficient.
2. A child population may inherit an ancestor prior until a defensible child calibration exists. The ancestry evidence keeps the specific identifier; the effective founder distribution records which calibrated ancestor supplied the current prior.
3. Every effective reference prior must define every physical locus. Unknown populations and incomplete effective priors fail immediately.
4. Quantitative physical alleles are additive by default. Remove invented random dominance from abstract morphology loci; recombination still preserves two inherited alleles and sibling/grandchild variation.
5. Real parent genomes remain untouched by ancestry metadata. A founder prior is consulted only for a missing parent.

Acceptance:
- every effective reference population resolves every physical locus;
- an unknown reference population cannot silently become a neutral founder;
- same ancestry + seed replays exactly;
- different seeds still produce different founders;
- one real parent + one missing parent creates only the missing founder;
- two real parents are unaffected by ancestry metadata;
- child alleles remain traceable to the corresponding parent.

## Slice 2 — Calibrate the East Asian hierarchy

**Status: validated 2026-09-27.** Focused validation and the repository gate passed after the East-Asian hierarchy calibration.

Replace hand-tuned appearance constants with measured 3D morphology distributions. The evidence mapping and deliberate parent fallbacks are recorded in [East Asian facial calibration](east-asian-facial-calibration.md).

Initial calibration target:
- `east_asia`;
- Han Chinese overall and northern/central/southern substructure;
- Korean;
- Japanese.

Add Mongolian, Tibetan and narrower Southeast Asian priors only when the evidence supports them.

Each calibrated population should provide:
- mean physical-locus vector;
- within-population variation;
- a small set of correlated anatomical systems/factors rather than a large runtime covariance matrix;
- sex-conditioned offsets where supported;
- source/provenance notes for the calibration data.

Sparse child groups shrink toward the nearest calibrated ancestor rather than inventing sharp distinctions.

## Slice 3 — Founder sampling and inheritance

**Status: validated 2026-09-27.** Focused founder/inheritance/phenotype validation and the family inheritance diagnostic passed.

Use the calibrated hierarchy to produce deterministic founders:

```text
missing maternal parent -> maternal founder prior
missing paternal parent -> paternal founder prior
two parental genomes     -> deterministic recombination -> child genome
```

Founder sampling combines population center, bounded correlated family variation and bounded individual variation. Population means are distribution centers, not face templates.

The runtime implementation is intentionally tiny: one zero-mean factor value per anatomical system is shared across both allele copies of a founder, then each allele receives a smaller locus-specific residual. This preserves coherent parental/family structure for descendants while keeping population means stable and avoiding a runtime covariance matrix.

## Slice 4 — Rendering projection fidelity

**Status: validated 2026-09-27.** Focused projection/Genesis/canonical-root validation and the repository gate passed.

Ensure the physical genome carries enough concrete anatomy to constrain one person without demographic labels.

At minimum the projection must retain:
- facial breadth/height;
- zygomatic and midface structure;
- intercanthal/eye geometry;
- palpebral opening;
- epicanthic-fold tendency;
- upper-eyelid exposure;
- orbital depth;
- nasal root/bridge/breadth/projection;
- jaw/chin structure;
- lip/soft-tissue geometry;
- pigmentation and hair;
- body/frame traits.

The renderer receives anatomy, not instructions such as “make this person Chinese.”

The shared projection now presents one ordered identity anatomy before any raw coordinates:

```text
face / midface / jaw
eyes / eyelids / orbits
nose / perioral structure
pigmentation / hair
body structure
continuous coordinates as secondary precision
```

The grouped anatomy is derived directly from the expressed physical phenotype and is the primary rendering language. Continuous coordinates remain present to preserve individuality inside semantic bands, but the renderer is explicitly told to preserve the facial relationships together rather than independently averaging features toward a generic face.

## Slice 5 — Population Lab as calibration bench

**Status: validated 2026-09-27.** The 96-person Han-Chinese/Korean/Japanese numerical cohort passed with zero warnings, 100% continuous uniqueness in every population, maximum center errors of 0.014/0.011/0.020, sibling-to-unrelated distance ratios of 0.66/0.64/0.55, child-to-unrelated ratios of 0.46/0.45/0.39, and Han/Korean mixed-parent midpoint error below 0.006. A fixed 12-person visual cohort through the same seed and shared renderer showed clearly East-Asian facial morphology with substantial individual variation and no regression to the generic-white failure that reopened this work.

Use Population Lab rather than creating another framework.

Numerical checks compare generated cohorts with calibrated distributions:
- means;
- variance;
- important correlations;
- broad percentile coverage;
- individual diversity;
- parent/child resemblance;
- sibling relatedness without collapse;
- mixed-parent inheritance.

Population Lab now has a controlled `--physical-populations` mode that bypasses model-authored city/family context while still using the exact production physical path: two missing-parent founders, ordinary recombination, shared phenotype expression, and the shared rendering projection.

The numerical run is local-only and checks population-center drift, variance, percentile spread, continuous uniqueness, sibling/parent resemblance, and mixed-parent midpoint behavior. Statistical warnings activate only with at least 24 people per reference population.

A small fixed visual sample then renders a subset of the same seeded cohort and checks renderer fidelity to the generated anatomy. This is offline calibration evidence, never a runtime retry loop.

Slices 1–5 have passed. The calibrated model may be used for explicit appearance-model migration; do not add extra rerenders unless the current v0.2 specification is sound and one generated root is independently poor.

## Slice 6 — Versioned appearance-model migration

**Status: validated 2026-09-27.** Focused World migration/repair tests passed after the version-aware upgrade, durable ancestry reuse and Embodiment-authority changes.

Now that the calibrated model passes:
- no physical genome -> appearance migration available;
- older physical-genome version -> appearance-model migration required;
- current version -> migration unavailable; re-render only.

Reuse previously recorded operator ancestry evidence when trustworthy. The durable source is the latest `THREAD_PHYSICAL_GENOME_MIGRATED` event, not a copied identity field. Diagnosis exposes that evidence and an outdated-model upgrade requires only a reason when the ancestry can be reused. Ask for maternal/paternal physical origin only when durable evidence is absent.

Current Embodiment specification is the canonical visual authority. `thread.identity.canonicalVisualIdentity` is retained only as Genesis creation provenance/seed material and must not override a superseding Embodiment in repair diagnosis or Admin Observatory.

Migration remains one replayable World authority change followed by normal canonical Embodiment, Presentation and FID convergence.

## Slice 7 — Coherent CLI

**Status: validated live in staging 2026-09-27.** `appearance:diagnose` correctly exposed Li Jing's v0.1 -> v0.2 upgrade and durable ancestry evidence, `appearance:migrate` reused that evidence, and final diagnosis reported v0.2 physical authority plus healthy Embodiment-owned visual authority.

Expose Fibre concepts directly:

```bash
npm run appearance:diagnose -- --thread-id=...
npm run appearance:migrate -- --thread-id=... ...
npm run appearance:rerender -- --thread-id=... ...
```

Migration may change physical authority. Re-render never changes the genome or canonical specification.

The CLI is one implementation under `tools/appearance/appearance.mjs`. `appearance:migrate` reuses durable ancestry evidence automatically when diagnosis exposes it; `--physical-ancestry-file` is needed only when the Thread lacks trustworthy recorded evidence. The old `fid:visual:*` commands and FID-owned visual-maintenance source file are removed.

## Slice 8 — Admin Appearance UI

**Status: implemented on `main`; pending focused validation and staging UI proof.**

Add a dedicated Appearance section in Thread Details.

For old/missing physical authority:
- show model status;
- offer **Migrate appearance** / **Upgrade appearance model**;
- collect explicit maternal/paternal physical origin with a hierarchical selector;
- prefill trustworthy prior operator evidence where available.

For a current model:
- show current physical-model version;
- offer **Re-render appearance**;
- optionally show a compact read-only phenotype summary.

Do not hide appearance authority changes inside generic **Fix**.

The implementation is intentionally bounded: Admin sends one migration or re-render command and does not automatically poll or reroll. **Refresh appearance** is an explicit operator-driven watch: one immediate read followed by 20-second reads only while canonical generation/publication is pending; it stops as soon as the appearance is current or the view closes.

## Slice 9 — Staging proof

**Status: live regression passed 2026-09-27.**

First regression case: Li Jing. The live upgrade proved: old model diagnosed as migration-required; prior operator ancestry evidence reused unchanged; `physical-genome-v0.2` installed; a new anatomy-first specification admitted; canonical root changed from `visual_identity_reference_7939b8c5b13eb1a35f07020f6644422d` to `visual_identity_reference_6043f815374a1c610f92467e5edb29a1`; specification digest changed from `sha256:491ba6a34b6ec3775cd8e7d1c6d8aa4a0606423c72b5548d9ea43c8fd74f2915` to `sha256:eea9a38434971a13515bb4c1e2193fa3a9888c16e8cf8472c9a67c868baa8a2a`; Presentation converged; and FID revision 4 superseded revision 3. Final diagnosis is healthy with v0.2 and Embodiment as canonical visual authority. Human inspection of the resulting root confirmed that it now reads as a believable Chinese/East-Asian individual rather than the generic-white failure that reopened calibration.

Acceptance:
- old model diagnosed as migration-required;
- prior operator ancestry evidence reused or explicitly reconfirmed;
- current calibrated genome installed;
- all loci trace to parents/founder priors;
- new canonical specification carries calibrated facial anatomy;
- rendered root is visually coherent with that anatomy;
- same Thread, civil identity and FIN;
- Presentation/FID converge normally;
- exact replay creates no second authority change;
- subsequent re-render preserves genome + specification and still depicts the same physical person.

Then run a bounded cohort including Han Chinese, Korean, Japanese and a Southeast Asian population to demonstrate both population/family coherence and substantial individual diversity.

## Slice 10 — Closeout

Only after staging evidence is convincing:
- mark the calibrated physical-genome version current;
- update architecture/current-state/public claims;
- document calibration provenance;
- remove superseded provisional assumptions and temporary CLI names;
- retain historical migration/root/FID evidence without carrying obsolete runtime behavior.

## Ambition / extension path

This work strengthens physical lineage as causal Thread identity without turning Fibre into a molecular-genetics simulator. It preserves the path to real Thread parent inheritance at a truthful reproduction/newborn boundary. No permanent architecture path is closed.
