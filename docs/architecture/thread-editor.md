---
id: architecture-thread-editor
status: accepted
last-reviewed: 2026-08-02
canonical: true
---

# Thread Editor

The Thread Editor is the founding team's primary human-inspection tool.

It loads live Threads through authenticated APIs and can visualize identity, genome, family, culture, cities, embodiment, reading, memories, life events, skills, confidence, reputation, balances, contracts, permissions, and prompt assembly.

It supports simulation and comparison without committing changes. When a human proposes an edit, the editor emits a typed domain command. The world kernel validates authorization, records an event, and updates derived state. Direct database mutation is prohibited.

The initial static prototype in `apps/thread-editor` operates only on synthetic JSON fixtures and performs no live writes.
