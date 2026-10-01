# Population Lab service boundary

Population Lab experiment artifacts are non-authoritative calibration evidence.

The portable experiment-artifact store in `src/experiment-artifacts.mjs` owns only the lifecycle of persisted experiment evidence over generic `InfraDriver.objects` + `InfraDriver.catalog`:

- immutable manifests, generated populations, diagnostics results, HTML reports and images;
- mutable experiment status/index metadata;
- explicit whole-experiment cleanup.

It does not own Human Appearance calibration authority, Thread identity, World state, research evidence or migration. A3 remains the human-reviewed calibration approval boundary.

The CLI runners under `tools/population-lab/` and Admin Appearance consume this same store. Provider adapters decide whether objects/catalog live on local disk, R2/D1, or another implementation.
