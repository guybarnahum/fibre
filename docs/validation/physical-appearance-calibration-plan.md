---
id: physical-appearance-calibration-plan
status: active
last-reviewed: 2026-09-27
---

# Physical appearance model calibration and migration plan

## Why this work reopened

The 2026-09-27 Li Jing staging migration proved the **migration mechanism** end to end, including durable physical-genome authority, canonical Embodiment supersession, Presentation/FID convergence and exact replay. It did **not** prove the physical appearance model.

The resulting portrait was not visually coherent with the operator-confirmed East Asian physical ancestry. Re-rendering the unchanged genome-derived specification reproduced the deeper problem: the current founder/phenotype representation does not yet carry enough calibrated facial morphology into the renderer.

That observed failure supersedes the earlier conclusion that population/appearance calibration was closed.

The current `physical-genome-v0.2` work on `main` is provisional and must not be deployed as an accepted appearance model until the calibration tranche below passes.

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

**Status: implemented on `main`; pending focused validation.**

Use the calibrated hierarchy to produce deterministic founders:

```text
missing maternal parent -> maternal founder prior
missing paternal parent -> paternal founder prior
two parental genomes     -> deterministic recombination -> child genome
```

Founder sampling combines population center, bounded correlated family variation and bounded individual variation. Population means are distribution centers, not face templates.

The runtime implementation is intentionally tiny: one zero-mean factor value per anatomical system is shared across both allele copies of a founder, then each allele receives a smaller locus-specific residual. This preserves coherent parental/family structure for descendants while keeping population means stable and avoiding a runtime covariance matrix.

## Slice 4 — Rendering projection fidelity

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

## Slice 5 — Population Lab as calibration bench

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

A small fixed visual sample then checks renderer fidelity to the generated anatomy. This is offline calibration evidence, never a runtime retry loop.

**Do not deploy the new appearance model or re-render Li Jing again until Slices 1–5 pass.**

## Slice 6 — Versioned appearance-model migration

Once the calibrated model passes:
- no physical genome -> appearance migration available;
- older physical-genome version -> appearance-model migration required;
- current version -> migration unavailable; re-render only.

Reuse previously recorded operator ancestry evidence when trustworthy. Ask for maternal/paternal physical origin only when evidence is absent or insufficient.

Migration remains one replayable World authority change followed by normal canonical Embodiment, Presentation and FID convergence.

## Slice 7 — Coherent CLI

Expose Fibre concepts directly:

```bash
npm run appearance:diagnose -- --thread-id=...
npm run appearance:migrate -- --thread-id=... ...
npm run appearance:rerender -- --thread-id=... ...
```

Migration may change physical authority. Re-render never changes the genome or canonical specification.

## Slice 8 — Admin Appearance UI

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

## Slice 9 — Staging proof

First regression case: Li Jing.

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
