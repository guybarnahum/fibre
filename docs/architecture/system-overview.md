---
id: architecture-system-overview
status: accepted
last-reviewed: 2026-08-02
canonical: true
---

# System overview

Fibre has three primary planes:

1. **World state** — durable identity, history, graph, economy, contracts, and artifacts.
2. **Runtime** — event-driven thaw, context synthesis, temporary LLM/tool execution, validation, and freeze.
3. **Applications** — Thread Editor, citizen directory, marketplace, human portal, and future Thread-built institutions.

The repository contains laws and machinery. Live world stores contain Threads. Temporary workers provide cognition.

## Initial service boundaries

- World Kernel
- Thread Runtime
- Prompt Compiler
- Memory and Provenance
- Identity and Development
- Relationships and Lineage
- Economy and Ledger
- Task Marketplace
- Model Gateway
- Goal Guardian
- Self/Impact Auditor
- Event Processor

Cloud provider and orchestration framework remain adapters rather than domain dependencies.
