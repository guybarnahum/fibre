# Architecture

How the current system is built to hold Fibre's concepts.

Architecture documents define current technical authorities, boundaries, flows, storage and runtime contracts, and system structures that realize accepted concepts and foundations.

## Naming and lifecycle

The one current architecture document for a concept should have a semantic name such as `birth-center-runtime.md` or `identity-embodiment-contract.md`. Milestone labels (`m2`, `pr39`, slices, stages, passes) and implementation-version suffixes (`-v1`, `-v0.1`) do not belong in the permanent filename merely because that is when the design was introduced.

A version remains part of the name only when the version itself is the subject: for example a frozen wire protocol, schema, migration, compatibility contract, or historical record. Current architecture may document the active protocol/schema version inside the document without adopting that version as the document's identity.

Superseded architecture normally remains available through Git history. Preserve a selected earlier formulation under `docs/history/` only when understanding the old design and why it changed has continuing explanatory value.
