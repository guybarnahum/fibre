# Birth Center

The Birth Center is Fibre's runtime boundary for developing prospective Threads before authoritative birth. It owns provisional Genesis workflow state, durable model-call recovery, complete birth-bundle construction, and the Fibre Civil Registry service used to prepare permanent civil registration for a birth.

The World Kernel still owns live Thread reality and the atomic persistence transaction. The Birth Center must not mutate live-world tables directly.

## Fibre Civil Registry

`src/civil-registry.mjs` is the Birth Center service for Fibre Identity Numbers (FINs). It is the logical central directory for the permanent mapping:

```text
FIN -> exactly one Thread
Thread -> exactly one FIN
```

A FIN is prepared only for an admitted birth bundle and has display form:

```text
XXXX-XX-XXXX
```

The value contract and checksum policy are provider-neutral and live in `packages/domain/src/fibre-civil-identity.mjs`. The Civil Registry service owns minting, collision avoidance and lookup orchestration. The World Kernel publication adapter persists the prepared registration inside the same transaction that makes the Thread live, so no valid birth can commit without its civil registration.

The FIN is public/non-secret and must not be used as an authentication credential. It encodes no name, World, date, stage, gender, lineage, origin mode, citizenship or other Thread facts.

A physical/digital Fibre Identity Card is a derived presentation credential and is deliberately outside this service. Reissuing or redesigning a card cannot change the FIN.

## Runtime boundary

The provider-facing model runtime remains in `src/runtime.mjs`. A configured World Kernel publication boundary may be injected in-process for local/test composition and later replaced by a narrow authenticated service boundary without changing authority ownership.
