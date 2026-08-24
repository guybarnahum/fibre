# Validation artifact storage

This directory is not a development-history archive.

Fibre retains machine-readable validation artifacts in Git only when their
exact bytes still have a continuing scientific, replay, interoperability, or
audit purpose.

The normal development layout is:

    fixtures/
      reusable synthetic examples and stable test inputs

    .fibre/
      disposable local development runs and diagnostics

    docs/validation/
      current plans and concise accepted milestone outcomes

    artifacts/validation/
      exceptional retained exact-byte evidence

    world storage
      authoritative living Worlds and Threads

Git history already preserves superseded implementations and failed
experiments. They do not need to remain in the checked-out repository merely
to prove that development happened.

When a smaller fixture or permanent behavioral test preserves the useful
invariant, keep that and remove the surrounding experiment.

Reusable presentation examples belong under fixtures/, including:

    fixtures/thread-presentation/can-tho/

Presentation is derived and non-cognitive. It may not become hidden Genesis
input or semantic evidence about a Thread.

Git owns Fibre's laws, current fixtures, tests, architecture, and intentionally
retained evidence. It does not own living Threads and it is not a museum of
every development attempt.
