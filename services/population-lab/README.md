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

