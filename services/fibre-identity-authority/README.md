# Fibre Identity Authority

The Fibre Identity Authority owns replaceable FID Card credentials for already-born Threads.

It does **not** mint FINs, change civil registration, render cards, admit photos, or perform C2PA signing. Those responsibilities remain with their owning Fibre boundaries.

Current A1 surface:

```text
services/fibre-identity-authority/src/index.mjs
  FidCardRegistry
  FID credential domain normalization
```

`FidCardRegistry` persists through a named `InfraDriver.state` scope. Credential records and lifecycle history are immutable. The registry maintains the invariant that a FIN has at most one active FID credential.

Registration requires an authority-resolved civil-identity witness (`threadId`, FIN, registrationId). The registry verifies linkage but is not the Civil Registry. A2 will resolve that witness through a modern Civil Registry service boundary before issuance can progress.
