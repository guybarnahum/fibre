# Validation artifact storage

This directory is not a development-history archive.

Fibre retains machine-readable validation artifacts in Git only when their exact bytes still have a continuing scientific, replay, interoperability, or audit purpose.

The normal repository lifecycle is:

```text
fixtures/
  reusable synthetic examples and stable test inputs

.fibre/
  disposable local development runs, generated output and diagnostics

docs/validation/
  current proof methods and concise accepted standing outcomes

docs/history/
  selected historical explanation when why the design changed still matters

artifacts/validation/
  exceptional retained exact-byte evidence

world storage
  authoritative living Worlds and Threads
```

Do not create a general `artifacts/test-results/` archive. A normal test result is reproduced by the test; an old development report is preserved by Git history. Promote an artifact here only when exact bytes remain part of a live scientific or audit claim.

Git history already preserves superseded implementations and failed experiments. They do not need to remain in the checked-out repository merely to prove that development happened.

When a smaller fixture or permanent behavioral test preserves the useful invariant, keep that and remove the surrounding experiment.

Reusable presentation examples belong under fixtures/, including:

```text
fixtures/thread-presentation/can-tho/
```

Presentation is derived and non-cognitive. It may not become hidden Genesis input or semantic evidence about a Thread.

Git owns Fibre's laws, current fixtures, tests, architecture, and intentionally retained evidence. It does not own living Threads and it is not a museum of every development attempt.
