# Thread Presentation

This directory is the capability-level home for Fibre machinery that turns already-authorized Thread and World events into durable human-facing presentation.

Thread Presentation is **non-cognitive**. It must not invent, reinterpret, or privately reason about a Thread, and it must not become a second authority for identity, memory, history, or world state. The canonical presentation contract is defined by [`../../docs/architecture/world-presentation-v1.md`](../../docs/architecture/world-presentation-v1.md).

Current concrete machinery remains where it already works:

- [`../presentation-cloudflare/`](../presentation-cloudflare/) — current Cloudflare delivery and presentation read-model implementation;
- [`../asset-generator/`](../asset-generator/) — generated presentation assets;
- [`../c2pa-local/`](../c2pa-local/) — local provenance/C2PA support;
- [`../../fixtures/thread-presentation/`](../../fixtures/thread-presentation/) — reusable presentation fixtures.

Provider-neutral orchestration, interfaces, and shared Thread-presentation machinery may be added here as the capability grows. Deployment-specific implementations may remain sibling services until a real architectural boundary justifies moving them.

Do not duplicate cognition, Thread state, memory, identity, or world authorization here.