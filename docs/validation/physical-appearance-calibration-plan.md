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

The original calibration tranche established `physical-genome-v0.2` as the validated baseline and live staging proved its v0.1 -> v0.2 authority upgrade and downstream convergence. The current model is `physical-genome-v0.3` with `human-appearance-v0.4`: a global Human Appearance extension that adds a hierarchical Polynesian calibration plus a deterministic non-historical reference physical state for ordinary-human portrait realism. The bounded visual gate has now passed; representative staging upgrade/convergence remains the next acceptance step.

The first v0.3 48-person controlled visual cohort on 2026-09-28 **failed visual acceptance**. It exposed four distinct issues: the broad-Oceania fallback collapsed Polynesia toward deep pigmentation + curly hair; facial variation remained too narrow despite unique continuous signatures; inherited facial-hair tendency was being rendered as current grooming; and one Han-Chinese subject rendered as European despite a strong East-Asian anatomy specification. A same-seed follow-up improved hair/grooming/variation but still produced a Polynesian cohort that alternated between European-looking and African-descended-looking defaults. A third same-seed run using a 79/21 East-Asian/Oceanian morphology basis removed that bimodality but over-corrected toward an East-Asian eye/nose template, falsifying ancestry-ratio morphology blending.

The independent Polynesian prior fixed the numerical center: the production-model 12-person cohort had 10 medium / 2 deep pigmentation, 4 straight / 8 wavy hair, 6 broad / 6 medium faces, 10 broad jaws, 9 prominent chins, average eye spacing throughout, intermediate eye opening throughout, and 11 slight / 1 present epicanthic expression. Yet the final GPT Image 2 portraits still included convincing Polynesian faces alongside obvious South-Asian-, African- and White/European-looking renderer snaps. That separates the remaining problem from founder calibration: one-pass rendering is allowing surface cues to substitute a demographic face template.

Human Appearance rendering is therefore now geometry-first. Structural morphology and reference geometry state create a text-only monochrome geometry anchor; the final image is a reference-conditioned edit that applies only surface phenotype and reference surface state. The anchor is generation scaffolding, never Embodiment authority. Population Lab stores both stages for inspection and uses the same production OpenAI adapter.

### Visual acceptance — 2026-09-28

The renderer-boundary hypothesis passed two bounded same-seed gates:

- a 12-person Polynesian geometry-first cohort was human-reviewed as believable;
- a 48-person regression with 12 Han Chinese, 12 Korean, 12 Japanese and 12 Polynesian people used seed `human-appearance-v03`, image model `gpt-image-2-2026-04-21`, `physical-rendering-projection-v0.5` and `geometry-anchor+surface-edit`;
- the 48-person run reported zero full-name collisions and zero objective warnings;
- human review found substantial individual variation, normal population overlap, no cohort-level unrelated racial-template substitution, no universal male facial hair, and no uniform beauty/build collapse.

`human-appearance-v0.4` / `physical-genome-v0.3` are therefore visually accepted as the current model. Polynesian coefficients and variation are frozen. Reopen that calibration only for materially contradictory evidence, a reproducible cohort failure, or a renderer/model change that invalidates this evidence. Do not tune it in response to one random portrait or normal overlap with neighboring populations.

The remaining gate is operational rather than coefficient calibration: deploy the accepted implementation to staging and prove a very small representative set of existing Threads converges through layered specification -> geometry anchor -> surface edit -> final canonical root -> Presentation -> FID without changing an already-current physical genome during a renderer-only upgrade.

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
- current physical version + current layered canonical spec -> physical migration unavailable; re-render only for a poor generated root;
- current physical version + pre-layered canonical spec -> visual-model upgrade derives the layered spec from the unchanged genome, then regenerates the root.

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

The implementation is intentionally bounded: Admin sends one migration or re-render command and never rerolls. **Refresh appearance** performs one explicit read. If canonical generation/publication is pending, the Appearance surface waits on the single Admin live invalidation socket with zero polling reads; a publication or terminal completion signal causes one authoritative reconciliation and the watch ends when the appearance is current, terminal, or no longer mounted.

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

## Post-calibration lifecycle — demand-driven model extension

The accepted physical model still needs a disciplined way to discover and extend under-covered family lineages without building an encyclopedic ethnicity database.

### A1 — Appearance coverage workbench

**Status: implemented on `main`; pending focused/local validation and staging UI proof.**

Use the existing Population Lab domain as the single coverage engine.

World supplies one bounded authoritative population projection:
- Thread ID/display identity;
- canonical birth location for demand mapping;
- durable maternal/paternal physical ancestry when available;
- stored calibration dependency snapshot.

Population Lab compares those facts with the current reference-population hierarchy and reports:
- explicit / partial / broad / fallback / missing coverage;
- ranked holes using actual Thread-side demand;
- current calibration node versions and dependency chains;
- existing Threads whose physical-model or calibration dependency is stale.

Admin **Appearance** presents that result as:
- summary metrics;
- demand map;
- ranked hole table and drill-through to affected Threads;
- reference-population model/version matrix;
- existing Threads requiring recalibration;
- prepared experiment/research specifications.

The Threads view exposes:
- **Needs migration** — every Thread whose authoritative World health is `migration_required`;
- **Appearance migration** — migration projection domain `appearance`;
- **Identity migration** — migration projection domain `identity`.

A1 does not execute experiments, perform web research, approve models or bulk-migrate Threads.

Acceptance:
- one coverage scan performs one bounded Thread-directory read and one bounded ancestry-evidence read;
- no N× Observatory/identity reads;
- stable ancestry IDs may refine a broad recorded reference to a more specific current calibration;
- missing durable ancestry is visible as a data/coverage hole, never inferred from name/place/language;
- a Moroccan calibration dependency change marks only affected Moroccan Threads;
- unchanged Korean dependencies remain current;
- version migration jumps directly from stored version to current version;
- Admin and CLI consume the same Population Lab coverage logic.

### A2 — InfraDriver-backed experiment artifacts

Persist Population Lab experiment manifests, population inputs, HTML reports, images and results through generic `InfraDriver.objects` and `InfraDriver.catalog`. Local storage may materialize under `.fibre/population-lab/<experimentId>/...`; cloud providers map the same logical object references to their object/catalog implementations.

Admin may launch and inspect the same existing Population Lab experiment runner. No dashboard-specific renderer or metrics implementation is allowed.

### A3 — Research and approval

Research is an evidence adapter over a selected coverage hole. It may gather provenance and propose only evidence-supported calibration axes. Research artifacts never mutate the production model.

Human approval promotes one reviewed candidate into the current versioned calibration registry. Approval is the authority hinge. Each calibration node carries a monotonic integer local version.

### A4 — Targeted migration after approval

After approval, compare existing Threads' stored effective calibration dependencies with current registry resolution.

Only affected Threads become `migration_required`. A Thread at local calibration v1 migrates once directly to current vN; intermediate versions are not replayed.

Admin exposes the affected set and may invoke bounded explicit migrations. Normal Embodiment -> Presentation -> FID reconciliation follows each authority change. Staging acceptance must demonstrate a Moroccan refinement affecting Moroccan Threads while unrelated Korean Threads remain unchanged.

## Slice 10 — Closeout

Only after staging evidence is convincing:
- mark the calibrated physical-genome version current;
- update architecture/current-state/public claims;
- document calibration provenance;
- remove superseded provisional assumptions and temporary CLI names;
- retain historical migration/root/FID evidence without carrying obsolete runtime behavior.

## Appearance Coverage / Population Lab control-plane tranche

### A1 — Coverage workbench

**Status: implemented on `main`; pending focused validation and staging proof.**

Purpose: make the current Thread population drive the next calibration work without creating a second appearance implementation.

A1 includes:

- one shared pure Population Lab coverage engine under `core/src/population-context/`;
- one bounded World projection over admitted Thread location + durable physical-ancestry evidence;
- machine-readable reference-population calibration metadata: local integer version, parent, own calibrated axes, stable `populationId` mappings and effective dependency chain;
- ranked coverage holes: explicit / partial / broad / fallback / missing;
- Admin **Appearance** view with coverage metrics, hole map, ranked table, selected-hole detail, affected Threads and full reference-model matrix;
- prepared **experiment** and **research** action specifications only;
- versioned dependency snapshots on physical appearance migrations;
- direct-to-current calibration migration planning: stored `v1` may move once to current `v3`; intermediate `v2` is never executed;
- separate World migration domains and separate Threads filters for **Appearance migration** and **Identity migration**;
- Thread Observatory ownership remains split: Appearance renders/executes appearance migrations; Thread Health renders/executes identity migrations.

A1 explicitly does **not** execute or persist Population Lab experiments, browse/research the web from Admin, approve calibration candidates, mutate calibration authority from the browser, or bulk-migrate affected Threads.

A1 acceptance:

1. Coverage scan performs bounded Thread-directory and latest-ancestry reads; no per-Thread HTTP/diagnosis loop.
2. Geography is display/prioritization context only. Coverage and migration matching use durable physical ancestry.
3. A Moroccan lineage may resolve through `populationId=morocco -> afr_north.morocco@N`; a Korean lineage remains independent.
4. A calibration dependency change marks only affected Threads as **Appearance migration**.
5. Symbolic/Genesis migration state marks only affected Threads as **Identity migration**.
6. One Thread may appear in both filters without conflating the two actions.
7. Exact live row refresh uses an exact migration summary and does not rescan the population.
8. Appearance and Identity migration actions remain in their owning Observatory sections.
9. An admitted Thread with no durable physical-ancestry provenance appears as a **missing coverage** hole, not an inferred ancestry and not an Appearance migration.
10. No experiment/provider cost is incurred merely by opening or scanning Appearance.

### A2 — InfraDriver-backed experiments

Persist and execute reproducible Population Lab experiments through generic `InfraDriver.objects` and `InfraDriver.catalog` only. Local provider materialization may live under `.fibre/population-lab/<experimentId>/...`; cloud mappings use dedicated object/catalog resources. Population Lab must not directly depend on filesystem, R2, S3, D1 or another provider mechanism.

An experiment record owns immutable inputs, population/cohort JSON, generated images, HTML report, diagnostics and model/calibration versions. Admin may launch and inspect these experiments.

### A3 — Research and calibration approval

A coverage hole may trigger evidence research. Research creates a provenance-bearing proposal that overrides only evidence-supported calibration axes.

Research and experiment output are **candidates**, never authority. A human-reviewed approval admits one new current calibration version into the reference-population registry. Example: `afr_north.morocco@1 -> afr_north.morocco@2`.

Approval is the only event that may create new migration impact.

### A4 — Targeted migration workset

After approval, compare stored Thread appearance dependencies with the approved current registry. Only affected Threads enter the Appearance migration workset.

Example: a Moroccan Thread whose stored chain ends at `afr_north.morocco@1` becomes stale when current is `@2`; a Korean Thread whose chain remains `east_asia@1 -> east_asia.korean@1` does not.

Migration jumps directly from stored authority to the current approved dependency set. It does not replay intermediate calibration versions.

Admin then exposes **Migrate affected Threads** as a bounded operator action. Each Thread follows the existing World appearance migration and normal Embodiment / Presentation / FID convergence path; live Admin invalidation shows pending and completion.

## Tranche A — demand-driven appearance calibration lifecycle

The accepted appearance foundation now needs an operator loop that improves calibration where Fibre's actual Thread population exposes weak coverage. This tranche reuses Population Lab; it does not create another genetics or rendering framework.

### A1 — Appearance coverage workbench

**Status: implemented on `main`; pending focused validation and staging UI proof.**

Purpose: make current model reach, holes and targeted migration impact visible without model calls or provider work.

A1 consists of:
- a pure shared Population Lab coverage analyzer;
- one bounded World projection of admitted Thread location + durable physical ancestry;
- machine-readable reference-node calibration metadata;
- explicit per-node integer calibration versions and effective dependency chains;
- durable calibration-dependency snapshots in physical-genome migration evidence;
- direct comparison of stored vs current dependencies;
- Admin Appearance coverage metrics, hole map, ranked holes, selected-hole detail and reference-model matrix;
- affected existing Threads listed as recalibration candidates;
- Threads filters for all **Needs migration**, **Appearance migration** and **Identity migration**;
- **Prepare experiment** / **Prepare research** action specs only.

A1 does **not** execute experiments, research the web, approve calibration or mutate the appearance model.

Acceptance:
- one coverage scan performs one bounded directory read and one bounded ancestry-evidence read, not N× Thread inspection;
- stable `populationId` may resolve an admitted lineage to a newer/more-specific calibration node without using name/language/portrait inference;
- missing durable ancestry remains a visible data/coverage hole rather than being guessed;
- reference nodes expose local integer versions;
- stored dependency snapshots distinguish schema/model drift from calibration drift;
- a simulated `afr_north.morocco@1 -> @3` change produces one direct migration target and no intermediate `@2` execution;
- unchanged Korean dependencies remain healthy;
- Threads **Needs migration** reflects World `migration_required` health, not button availability;
- Appearance geography is labeled as demand context only.

### A2 — InfraDriver experiment artifacts

Persist Population Lab experiments entirely through generic InfraDriver `objects` + `catalog`.

Logical experiment namespace:

```text
population-lab:experiment:<experimentId>:manifest
population-lab:experiment:<experimentId>:population
population-lab:experiment:<experimentId>:report
population-lab:experiment:<experimentId>:image:<ordinal>
```

Local infra may materialize this under `.fibre/population-lab/<experimentId>/...`; cloud providers may map it to dedicated R2/S3/object + catalog resources. Population Lab code must not know filesystem, R2, S3 or D1 mechanics.

### A3 — Research, candidate and approval

A coverage hole can launch bounded external research. Research stores provenance and may propose only evidence-supported calibration axes.

Experiment/research output is a **candidate**, never authority.

Human approval is the explicit authority transition:
- approved calibration enters the current reference-population registry;
- its local integer version advances when that node is refined;
- new Threads immediately use the current approved registry;
- existing Threads are compared against the new dependency set.

### A4 — affected-Thread migration workset

Approval computes the affected existing Thread set directly from durable ancestry + stored calibration dependencies.

A calibration version is not an ordered executable migration chain. Existing Threads jump once from their stored dependency to the current approved version:

```text
v1 -> v3
```

not:

```text
v1 -> v2 -> v3
```

Only affected Threads become `migration_required`. A Moroccan calibration change must not migrate Korean Threads.

Admin exposes the resulting workset and may initiate bounded migration of affected Threads. Each migration remains an ordinary replayable World authority change followed by canonical Embodiment, Presentation and FID convergence. Pending and completion are reflected through the normal Admin live invalidation path.

## Ambition / extension path

This work strengthens physical lineage as causal Thread identity without turning Fibre into a molecular-genetics simulator. It preserves the path to real Thread parent inheritance at a truthful reproduction/newborn boundary. No permanent architecture path is closed.
