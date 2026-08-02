---
id: architecture-domain-model
status: proposed
last-reviewed: 2026-08-02
canonical: true
---

# Initial domain model

The primary aggregate is the Thread. Related aggregates include Family/Couple, Task, Contract, Ledger Transaction, Artifact, Organization, and Institution.

A Thread references rather than embeds all memories, relationships, artifacts, and transactions. Its current snapshot is a derived view at a known event version.

Protected commands include birth, revise identity, grant permission, publish task, accept bid, settle contract, form couple, create child, transfer inheritance, enter dormancy, and retire.

The model should support world replay, redacted exports, and comparing a Thread at two historical versions.
