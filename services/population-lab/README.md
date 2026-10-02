# Population Lab service boundary

Population Lab experiment artifacts are non-authoritative calibration evidence.

The portable experiment-artifact store in `src/experiment-artifacts.mjs` owns only the lifecycle of persisted experiment evidence over generic `InfraDriver.objects` + `InfraDriver.catalog`:

- immutable manifests, generated populations, diagnostics results, HTML reports and images;
- mutable experiment status/index metadata;
- explicit whole-experiment cleanup.

It does not own Human Appearance calibration authority, Thread identity, World state, research evidence or migration. A3 remains the human-reviewed calibration approval boundary.

The CLI runners under `tools/population-lab/` and Admin Appearance consume this same store. Provider adapters decide whether objects/catalog live on local disk, R2/D1, or another implementation.

## A2 experiment execution

The controlled physical-cohort runner in `src/physical-experiment.mjs` is the first cloud-executable Population Lab experiment path. Admin only authors a bounded request from an already-resolved coverage hole and queues an environment-scoped Workflow. The Workflow invokes the shared service runner and persists evidence through the same artifact store used by local tools.

A missing-provenance hole cannot launch a physical experiment because Fibre has no durable ancestry authority to choose a reference population. Research/ancestry evidence must resolve that gap first.

Queued or running experiments are not deletable; completed or failed experiments may be explicitly removed with their full artifact set. Experiment output remains evidence and has no authority to mutate Human Appearance calibration or Thread state.

## Visual fidelity experiments

A2.3 extends a completed controlled physical experiment with one optional visual-fidelity attempt. It deterministically selects four evenly spaced members from the persisted cohort and plans two Asset Generator jobs per person:

1. a monochrome geometry anchor with no image reference;
2. a surface portrait conditioned on that exact geometry anchor.

The Population Lab Workflow delegates those jobs through the provider-neutral InfraDriver service-call port to Asset Generator. It queues the four geometry jobs as one bounded wave, waits for verified geometry receipts, then queues the four reference-conditioned portraits as a second bounded wave. Provider credentials, model adapters, retry/resume logic and generation provenance remain owned by Asset Generator. Population Lab only records verified ready receipts, indexes the resulting image object refs into the experiment, and writes a visual contact-sheet report.

The contact sheet is human renderer-fidelity evidence. It intentionally has no invented automatic “looks right” score. A correct numerical cohort can still expose a renderer that collapses faces, beautifies subjects, or changes geometry during the surface pass.

Visual generation is single-shot once execution has begun. A provider/deployment launch failure that occurs before the visual Workflow starts may retry the exact persisted manifest; mid-run failures are never silently rerun. Queued/running visual work prevents deletion; completed or failed visual evidence remains inspectable until the operator deletes the experiment.

Visual progress is derived from the already-indexed experiment image artifacts rather than a second counter: the queue can show total, geometry and portrait completion from the authoritative `images` set on each explicit refresh. There is no progress polling loop.

The cloud path stays InfraDriver-pure. Population Lab uses `objects`, `catalog`, `workflows` and provider-neutral `services.call()`; Cloudflare Worker bindings, workflow-ID restrictions and private service transport live only in the Cloudflare driver. A future AWS driver can map those same capabilities to AWS infrastructure without changing Population Lab.



## Calibration candidate evidence

A3.1 adds one deliberately non-authoritative calibration-candidate artifact to a completed experiment.

A candidate:
- targets the exact reference-population calibration version captured by the experiment manifest;
- may propose explicit physical-locus values and the existing variation multipliers;
- records the experiment-owned evidence artifacts/images used for review;
- is immutable and limited to one candidate per experiment;
- is rejected when the experiment's calibration snapshot is no longer current.

Candidate creation does **not** mutate the Human Appearance registry, active physical priors, Thread state, or migration state. Human-reviewed source-registry admission remains the later authority hinge; A3.1 does not implement approval.
