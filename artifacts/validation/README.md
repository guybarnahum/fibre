# Validation artifact storage

This tree contains **frozen development, experiment, and validation evidence**.

It is not the production persistence location for living Fibre Worlds or Threads.

## Storage rule

Use the repository according to purpose:

```text
fixtures/
  reusable synthetic examples used by tests and development

artifacts/validation/
  frozen machine-readable experiment inputs, outputs and evidence

docs/validation/
  human-readable protocols, reviews, interpretation and verdicts

live world storage
  authoritative living Worlds and Threads
```

A useful shorthand is:

> **Fixtures are reusable synthetic examples. Validation artifacts are frozen experiments. Live Worlds and Threads belong in world storage.**

## Fixtures versus validation artifacts

### `fixtures/`

Use `fixtures/` for synthetic examples that are intentionally reusable across tests or development.

Examples include fixture Threads, Worlds, genomes and deterministic examples. They may evolve with implementation changes when their purpose is to exercise current behavior.

A fixture is not scientific evidence merely because a test uses it.

### `artifacts/validation/`

Use this tree when a machine-readable value becomes part of a specific experiment or validation record.

Once used by an experiment, preserve it as historical evidence. Do not silently rewrite an earlier WorldSpec, genome, cohort export or result because a later version is cleaner.

Prefer versioned/new artifacts when a protocol changes.

A milestone/experiment may use a layout such as:

```text
artifacts/validation/<milestone>/<experiment>/
  protocol/
  worlds/
  genomes/
  cohort/
  results/
```

The exact subdirectories may vary when an experiment has different evidence needs; the important boundary is semantic, not cosmetic.

## Exported Worlds and Threads

A WorldSpec or Thread export committed here is an **experimental input, snapshot or evidence artifact**. It is not the live authority merely because it is represented as JSON in Git.

During execution, authoritative state is admitted into the Fibre world store through the normal domain/store contracts. For #39 Genesis this includes persisted `genesis_world_specs`, symbolic genomes, Thread history, identity, lineage, memory and manifests.

An exported Thread must therefore be treated as a frozen representation of experiment state, not as a production persistence model in which a Thread is one file.

## Slice G convention

Milestone #39 Slice G uses:

```text
artifacts/validation/m2-pr39/g/
  protocol/
  worlds/
  genomes/
  cohort/
  results/
```

The Git history is part of the experimental witness:

```text
protocol shell
  -> five genome-blind WorldSpecs frozen
  -> cohort genomes/assignment frozen
  -> remaining cognition/rater/verdict protocol frozen
  -> Gate G CLEAR
  -> first final-cohort life generation
```

No final-cohort Thread export belongs under `cohort/` before Gate G is CLEAR.

## Production direction

Production Fibre should keep authoritative semantic/life state in transactional world storage and use object storage for large immutable objects such as memory visuals, media, snapshots or archival bundles.

Domain records should reference stable Fibre object IDs rather than baking a particular cloud vendor URI into Thread semantics.

Git remains the home of source, schemas, laws, reusable fixtures and intentionally frozen scientific evidence—not living production people.
