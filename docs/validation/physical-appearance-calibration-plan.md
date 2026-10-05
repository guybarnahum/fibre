---
id: physical-appearance-calibration-plan
status: accepted
last-reviewed: 2026-10-05
---

# Physical appearance model calibration and migration plan

## Why this work reopened

The 2026-09-27 Li Jing staging migration proved the **migration mechanism** end to end, including durable physical-genome authority, canonical Embodiment supersession, Presentation/FID convergence and exact replay. It did **not** prove the physical appearance model.

The resulting portrait was not visually coherent with the operator-confirmed East Asian physical ancestry. Re-rendering the unchanged genome-derived specification reproduced the deeper problem: the current founder/phenotype representation does not yet carry enough calibrated facial morphology into the renderer.

That observed failure supersedes the earlier conclusion that population/appearance calibration was closed.

The original calibration tranche established `physical-genome-v0.2` as the validated baseline and live staging proved its v0.1 -> v0.2 authority upgrade and downstream convergence. The current model is `physical-genome-v0.3` with `human-appearance-v0.4`: a global Human Appearance extension that adds a hierarchical Polynesian calibration plus a deterministic non-historical reference physical state for ordinary-human portrait realism. The bounded visual gate and the demand-driven calibration/adoption lifecycle have now both passed staging acceptance.

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

The operational gate is now closed. Staging has proven both representative appearance convergence and the later demand-driven calibration lifecycle through explicit approval, append-only runtime admission, targeted affected-Thread migration and final World convergence.

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

**Status: accepted in staging 2026-10-01.** Full repository validation and live operator acceptance passed; Appearance and World agreed exactly on the 17 affected appearance-migration Threads.

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

**Status: accepted in staging 2026-10-01.** Full `slice:validate` passed 1483/1483; staging Appearance reported 41 Threads / 59 lineage sides / 11 ranked holes and exactly matched World on all 17 appearance-migration candidates. Operator review confirmed hole drill-through, map/portrait/flag behavior, cross-surface identity consistency and the Threads **Needs migration** projection.

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

**Status: A2.1, A2.2 and A2.3 accepted in staging; A3.1 implemented on `main`, pending validation.** Population Lab runner outputs use one shared experiment-artifact store over generic `InfraDriver.objects` + `InfraDriver.catalog`; Admin can launch/list/open/delete bounded experiments, and A2.3 adds an optional four-person geometry-first visual fidelity sample through the existing Asset Generator.

Persist Population Lab experiment manifests, population inputs, HTML reports, images and results through generic `InfraDriver.objects` and `InfraDriver.catalog`. Local storage materializes beneath `.fibre/population-lab/`; cloud providers map the same logical object references to their object/catalog implementations.

Admin may launch and inspect the same existing Population Lab experiment runner. No dashboard-specific renderer or metrics implementation is allowed.

### A3 — Research and approval

Research is an evidence adapter over a selected coverage hole. It may gather provenance and propose only evidence-supported calibration axes. Research artifacts never mutate the production model.

Human approval authorizes one reviewed candidate. The separate **Admit** action promotes it into the current versioned calibration registry after rechecking that its frozen base is still World-current. Each calibration node carries a monotonic integer local version.

### A4 — Targeted migration after approval

After admission, compare existing Threads' stored effective calibration dependencies with current registry resolution.

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

**Status: accepted in staging 2026-10-01.** The live coverage projection and World migration projection agreed exactly for all 17 appearance migration candidates, and the operator UI acceptance checks passed.

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
- one domain-neutral Threads **Needs migration** filter backed by authoritative health; Appearance-specific impact stays in Admin Appearance;
- Thread Observatory ownership remains split: Appearance renders/executes appearance migrations; Thread Health renders/executes identity migrations.

A1 explicitly does **not** execute or persist Population Lab experiments, browse/research the web from Admin, approve calibration candidates, mutate calibration authority from the browser, or bulk-migrate affected Threads.

A1 acceptance:

1. Coverage scan performs bounded Thread-directory and latest-ancestry reads; no per-Thread HTTP/diagnosis loop.
2. Geography is display/prioritization context only. Coverage and migration matching use durable physical ancestry.
3. A Moroccan lineage may resolve through `populationId=morocco -> afr_north.morocco@N`; a Korean lineage remains independent.
4. A calibration dependency change marks only affected Threads as **Appearance migration**.
5. Symbolic/Genesis migration state marks only affected Threads as **Identity migration**.
6. The Threads population view exposes one **Needs migration** filter and does not duplicate Appearance/Identity domain controls.
7. Exact live row refresh uses an exact migration summary and does not rescan the population.
8. Appearance and Identity migration actions remain in their owning operator surfaces.
9. An admitted Thread with no durable physical-ancestry provenance appears as a **missing coverage** hole, not an inferred ancestry and not an Appearance migration.
10. No experiment/provider cost is incurred merely by opening or scanning Appearance.


#### A1 causal-status register

A1 is an operator/control-plane milestone, not a claim of new Thread cognition or personhood. It introduces no new identity, dignity, relationship, developmental or economic field.

| Mechanism | Status | Author / authority | Current consequence | Next stronger proof |
|---|---|---|---|---|
| Durable parental physical ancestry consumed by coverage | Behaviorally/future-state causal | World-held explicit ancestry evidence; never inferred by Admin | Determines which calibration dependency applies and therefore which existing Thread can become `migration_required` after model drift | A3 approval + A4 targeted migration changes only the affected Threads |
| Calibration dependency snapshot | Behaviorally/future-state causal | Human Appearance migration evidence + current approved registry | Exact stored/current mismatch enters the authoritative appearance migration workset | Approved version change followed by direct-to-current migration and convergence |
| Birth geography in Appearance | Context-only | World canonical location | Changes demand-map/display context only; cannot select ancestry or calibration | None required for ancestry; preserve the non-causal boundary |
| Ranked coverage holes | Stored-only / Notarial | Pure Population Lab projection from World evidence + current registry | Changes operator prioritization and drill-through; does not mutate a Thread or calibration | A2 experiment execution tied to a selected hole |
| Prepared experiment/research specifications | Named-only | Admin projection of the selected hole | Copyable control-plane intent only; A1 performs no provider work or research | A2 persists/executes experiments; A3 research remains separate |
| Threads **Needs migration** projection | Context-only projection of causal World health | World health is authority; Admin only displays it | Changes operator visibility/filtering, not the underlying health state | A4 executes bounded migrations through World authority |

Authorship remains explicit: World/durable ancestry and the approved calibration registry create migration truth; Admin never authors ethnicity, calibration truth, or migration authority.

### A2 — InfraDriver-backed experiments

Persist and execute reproducible Population Lab experiments through generic `InfraDriver.objects` and `InfraDriver.catalog` only. Local provider materialization lives beneath `.fibre/population-lab/`; cloud mappings use provider object/catalog resources. The current Admin binding reuses Fibre's already-provisioned presentation object/catalog resources under the distinct `population-lab:experiment:*` namespace. Population Lab must not directly depend on filesystem, R2, S3, D1 or another provider mechanism.

An experiment record owns immutable inputs, population/cohort JSON, generated images, HTML report, diagnostics and model/calibration versions. Admin may launch and inspect these experiments.

### A3 — Research and calibration approval

A coverage hole may trigger evidence research. Research creates a provenance-bearing proposal that overrides only evidence-supported calibration axes.

Research and experiment output are **candidates**, never authority. Human approval authorizes a candidate; **Admit** appends one new current calibration version to the runtime registry after validating the exact current base. Example: `afr_north.morocco@1 -> afr_north.morocco@2`.

Admission is the event that creates new migration impact.

### A4 — Targeted migration workset

After admission, compare stored Thread appearance dependencies with the admitted current registry. Only affected Threads enter the Appearance migration workset.

Example: a Moroccan Thread whose stored chain ends at `afr_north.morocco@1` becomes stale when current is `@2`; a Korean Thread whose chain remains `east_asia@1 -> east_asia.korean@1` does not.

Migration jumps directly from stored authority to the current approved dependency set. It does not replay intermediate calibration versions.

Admin then exposes **Migrate affected Threads** as a bounded operator action. Each Thread follows the existing World appearance migration and normal Embodiment / Presentation / FID convergence path; live Admin invalidation shows pending and completion.

## Tranche A — demand-driven appearance calibration lifecycle

**Status: CLOSED — accepted in staging 2026-10-05.** The full A1-A5 loop is now operationally proven. A6/new-node admission remains optional follow-on work and is not part of Tranche A closure.

The accepted appearance foundation now has an operator loop that improves calibration where Fibre's actual Thread population exposes weak coverage. This tranche reuses Population Lab; it does not create another genetics or rendering framework.

### Tranche A staging closure evidence — 2026-10-05

One real reviewed refinement completed the full authority path:

```text
Population Lab evidence
  -> human visual review
  -> frozen calibration candidate
  -> approval
  -> Admit
  -> append-only runtime registry
  -> affected Thread workset
  -> bounded World migration
  -> History / current baseline
  -> convergence
```

Accepted flight:
- reference node: `middle_east.egypt`;
- local calibration: `@1 -> @2`;
- approved experiment: `plexp_5b1f7c76e1f54996ad0694e0`;
- admitted change: `noseBreadth -0.04 -> 0.12`;
- immutable admission: `human-appearance:calibration:middle_east.egypt:v000002`;
- admission authority persisted through provider-neutral `InfraDriver.objects` + `InfraDriver.catalog` and became visible to World without a code deployment;
- Admin moved the admitted version into **Calibration history** as the current baseline;
- only the approval-scoped dependent Threads entered the affected workset;
- **Migrate affected** updated that bounded set through ordinary World appearance migration and the affected Threads left the stale workset after convergence;
- the append-only registry retained `@1` as immutable historical baseline and `@2` as current authority;
- retrying Admit was idempotent and did not create `@3`;
- a historical baseline may be reopened only as a new shadow refinement against current authority; it never rolls authority backward;
- the final repository gate `npm run slice:validate` passed on the closure implementation.

This closes A3.1 candidate evidence, A3.2 shadow evaluation, A3.3 approval/admission, A4 targeted migration and A5 adoption. No additional closure mechanism or A6 work is required.

### A1 — Appearance coverage workbench

**Status: accepted in staging 2026-10-01.** Full repository validation and live operator acceptance passed; Appearance and World agreed exactly on the 17 affected appearance-migration Threads.

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
- one Threads **Needs migration** filter, with Appearance-specific impact kept in the Appearance workbench;
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
- Threads **Needs migration** reflects World `migration_required` health, not button availability, and no Appearance-specific controls leak into Threads/Birth Center/Stillborn;
- Appearance geography is labeled as demand context only.

### A2 — InfraDriver experiment artifacts

**Status: A2.1, A2.2 and A2.3 accepted in staging.** A2.1 proved provider-neutral experiment persistence and whole-experiment cleanup through generic InfraDriver `objects` + `catalog`. A2.2 proved authenticated Admin launch of a bounded controlled physical cohort through an environment-scoped Cloudflare Workflow: Admin returns immediately; the shared Population Lab service generates the cohort/diagnostics and persists manifest, population, result and HTML report. A2.3 adds an explicit four-person visual-fidelity sample from the same persisted 24-person cohort. The Population Lab Workflow delegates eight deterministic geometry-first jobs (four geometry anchors, then four reference-conditioned portraits) to the existing Asset Generator control plane through provider-neutral `InfraDriver.services.call()`; the Admin/cloud path never calls Cloudflare Worker bindings or OpenAI/BFL directly and never receives provider credentials. Queue progress is derived from the already-indexed geometry/portrait artifacts (total, geometry and portrait counts) on explicit refresh, with no polling or duplicate progress state. The visual contact sheet remains human renderer-fidelity evidence, not an automatic calibration score or model authority. Missing-provenance holes still cannot launch a physical calibration experiment. Queued/running numerical or visual work cannot be deleted; completed/failed experiments may be removed explicitly. No A3 research/approval or A4 migration authority is introduced.

Persist Population Lab experiments entirely through generic InfraDriver `objects` + `catalog`.

Logical experiment namespace:

```text
population-lab:experiment:<experimentId>:manifest
population-lab:experiment:<experimentId>:population
population-lab:experiment:<experimentId>:report
population-lab:experiment:<experimentId>:image:<ordinal>
```

Local infra materializes this beneath `.fibre/population-lab/`; cloud providers may map it to R2/S3/object + catalog resources. Population Lab code must not know filesystem, R2, S3 or D1 mechanics.

### A3 — Research, candidate and approval

**A3.1 — immutable calibration candidate evidence: accepted in staging 2026-10-05.** A completed Population Lab experiment may acquire one immutable calibration candidate artifact. The candidate targets the exact frozen reference-population snapshot used by the experiment and proposes only explicit physical-locus values and existing variation multipliers; staleness is checked at approval/admission against current World authority. It records the experiment-owned evidence refs used for review. Creating a candidate does not mutate Human Appearance, the current reference-population registry, World state or migration state.

Human visual review is now durable experiment evidence as well: every completed A/B visual run may receive one immutable per-sample review over geometry fidelity, identity continuity and surface realism, plus an overall `supports_candidate` / `inconclusive` / `reject` decision. Rejected evidence remains immutable; a retry creates a new experiment identity from the same source/calibration/cohort seed.

**A3.2 — research + shadow candidate evaluation: accepted in staging 2026-10-05.** The v0.1 research boundary is deliberately operator-assisted: a completed baseline experiment can launch **Try refinement** with explicit changed value axes, changed variation parameters, rationale and one-or-more provenance references. Population Lab validates the exact base calibration version, stores the proposal inside the immutable shadow experiment manifest, and runs the same deterministic cohort seed through temporary prior/variation resolvers. The live Human Appearance registry is never modified. The normal optional visual A/B path then evaluates the shadow cohort, and a submitted `supports_candidate` review enables **Freeze candidate**, which writes the existing immutable A3.1 calibration-candidate artifact. A rejected shadow run remains evidence; rerun creates a new experiment identity with the exact same proposal, provenance and cohort seed.

No runtime web/LLM research is introduced in A3.2 v0.1. A future provider-neutral research adapter may populate the same provenance-bearing proposal contract, but it must not infer morphology from geography, nationality, culture, religion, names or generated portraits.

**A3.3 — explicit approval / runtime registry admission: accepted in staging 2026-10-05.** A frozen candidate has one explicit human approval transition. Admin reads World appearance coverage and shows the projected affected Thread/lineage count against the candidate's exact frozen base. Approval records one immutable artifact bound to the candidate digest, visual-review artifact, authenticated Admin identity, proposed calibration, rationale and projected impact.

Approval remains evidence. The separate **Admit** action rechecks that the approved base calibration and dependency chain are still World-current, requires an exact `N -> N+1` local version advance, then writes one immutable admission object plus one catalog record through `InfraDriver.objects` + `InfraDriver.catalog`. Cloudflare maps these to the existing R2 object store and D1 catalog. No source edit or deployment is part of a calibration change.

The registry is append-only: there is no rollback pointer and no deletion path. If an older parameter set should be restored, it is admitted as a new version with new provenance. World reads this registry as current calibration authority; Population Lab freezes the exact admitted snapshot into every experiment.

A3.3 v0.1 admits **refinements of existing reference nodes**. Admission of a brand-new calibration node remains deferred until the same evidence/review/approval path has an explicit parent-selection contract; Fibre must not create a node merely from geography, nationality, religion, culture, names or portraits.

Experiment/research/review output is a **candidate**, never authority. Human approval authorizes registry admission; the successful **Admit** operation is the point at which runtime calibration authority changes.

### A4 — affected-Thread migration workset

**Accepted in staging 2026-10-05.** After A3.3 runtime admission, World recomputes current calibration dependencies from durable ancestry and stored dependency snapshots. Only changed dependencies enter the Appearance workset.

A calibration version is not an ordered executable migration chain. Existing Threads jump once from their stored dependency to the current approved version:

```text
v1 -> v3
```

not:

```text
v1 -> v2 -> v3
```

Only affected Threads become `migration_required`. A Moroccan calibration change must not migrate Korean Threads.

Admin retains the existing per-Thread **Update calibration** action and exposes a scoped **Migrate affected** action for the approved calibration workset. The batch action is intentionally thin: it confirms the bounded set once, then launches each Thread sequentially through the exact same World migration action and default migration reason used by the individual control. It adds no batch authority, no parallel migration service and no polling. Canonical Embodiment, Presentation and FID convergence remain owned by the existing World/publication path, with pending/completion reflected through normal Admin live invalidation.

### A5 — real calibration adoption and closure

**Accepted in staging 2026-10-05.** Admin **Appearance** carries the operational acceptance flight instead of requiring the operator to reconstruct it from CLI output.

An approved refinement appears in **Calibration adoption** as a derived four-stage rail:

```text
Approved -> Admitted -> Affected -> Converged
```

The rail is a projection of existing authority, not a new workflow database:

- **Approved** comes from the immutable calibration approval artifact;
- **Admitted** becomes true only when the append-only runtime registry reaches the approved target version with that experiment's admission provenance;
- **Affected** is the intersection of the approval's projected Thread IDs with World's current appearance-migration workset;
- **Converged** means the admitted version is current and none of the projected affected Threads remains stale.

Admin exposes **Admit** only for approved evidence. Admission writes the reviewed calibration through the existing InfraDriver object/catalog authority and the next authoritative Appearance reread observes it immediately; no code deployment is required.

Affected Threads are explicitly marked in the Appearance workset. The adoption card's **Migrate affected** action is scoped to that approval's remaining Thread IDs and reuses the existing sequential World migration path. Unrelated migration candidates remain visible but are not marked as affected by that calibration and are never included in the scoped batch.

When the card reaches **A5 complete**, **Copy evidence** emits a compact acceptance snapshot containing the approval experiment, reference population, from/to/current versions, projected Thread IDs and the empty remaining affected set. This is operator acceptance evidence only; World and the deployed registry remain authority.

Tranche A closes in staging when one real reviewed calibration demonstrates all of the following:

1. the approved node is admitted as exactly one new local registry version;
2. World runtime resolution immediately reports that admitted version;
3. only the approval's dependent Threads become affected/migration-required;
4. at least one unrelated control Thread remains unchanged;
5. **Migrate affected** updates only the marked workset through World authority;
6. every marked Thread converges through Embodiment -> Presentation -> FID and leaves the workset;
7. Admin shows **A5 complete** and copied adoption evidence reports zero remaining affected Threads;
8. full `npm run slice:validate` passes on the runtime-registry implementation.

That evidence is now recorded. A3.1/A3.2/A3.3/A4/A5 are accepted and Tranche A is closed. A6/new-node admission is optional follow-on work, not part of A closure.

## Ambition / extension path

This work strengthens physical lineage as causal Thread identity without turning Fibre into a molecular-genetics simulator. It preserves the path to real Thread parent inheritance at a truthful reproduction/newborn boundary. No permanent architecture path is closed.
