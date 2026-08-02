---
id: architecture-storage-model
status: accepted
last-reviewed: 2026-08-02
canonical: true
---

# Storage model

A Thread is a logical aggregate, not necessarily one row or document.

Suggested durable stores:

- Relational database for identity indexes, tasks, contracts, evaluations, and derived balances
- Append-only event store for life and world events
- Graph relationships for family, trust, ownership, mentorship, and organizational links
- Vector/semantic memory index with provenance
- Object storage for artifacts, portraits, voice, books, and archives
- Secret/resource vault for credentials and external authorizations
- Double-entry ledger for FC, USD, and model-token accounting

The aggregate is reconstructed at a versioned point in time. Snapshots may accelerate loading but never replace the event history.

Live Thread data is not committed to Git. The repository may contain synthetic fixtures, templates, redacted archives, and schema examples.
