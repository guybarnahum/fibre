# Thread Presentation

This directory is the capability-level home for Fibre machinery that turns already-authorized Thread and World truth into durable human-facing presentation.

Thread Presentation is **non-cognitive**. It must not invent, reinterpret, or privately reason about a Thread, and it must not become a second authority for identity, memory, history, meaning, relationships, or world state. The canonical presentation contract is defined by [`../../docs/architecture/world-presentation.md`](../../docs/architecture/world-presentation.md).

## Public consumer seam

External applications and sibling services should import the provider-neutral presentation contract from:

```js
import { normalizeThreadPresentationBundle } from "./services/thread-presentation/src/index.mjs";
```

The packet normalizers and digests currently delegate to the implementation in `world-kernel` because that is where the authoritative projection rules already run. That is an implementation detail. New consumers must not import `world-kernel/src/thread-presentation-*.mjs` directly; keeping the service entry point stable lets the implementation move here later without changing consumers such as a Thread Presentation webapp.

The `*-v0.1` values in packet constants are serialized compatibility identifiers. They justify versioning the wire data, not versioning runtime filenames.

## Related services

- [`../asset-generator/`](../asset-generator/) executes generated-media briefs and records immutable generation provenance.
- [`../presentation-cloudflare/`](../presentation-cloudflare/) is the current Cloudflare delivery/read-model adapter.
- [`../c2pa-local/`](../c2pa-local/) supplies local provenance/Content Credential support.
- [`../../fixtures/thread-presentation/`](../../fixtures/thread-presentation/) contains reusable presentation fixtures.

Thread Presentation decides what already-authorized material may enter a presentation and what reconstruction is requested. Asset Generator only executes the exact admissible brief it receives. A generated image never becomes biographical evidence merely because it looks plausible or was generated successfully.

## Richness contract

A valid packet can still be thin. Tests here therefore treat richness as a semantic consumer contract: a Thread projection should remain temporally continuous, socially and geographically situated, internally cross-linked, selective about memory versus history, and grounded when it presents meanings. Those checks complement, rather than replace, authority and causal tests in World Kernel and Birth Center.

Deployment-specific implementations may remain sibling services until a real architectural boundary justifies moving them. Do not duplicate cognition, Thread state, memory, identity, meaning, or world authorization here.
