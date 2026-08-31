# Birth Center

The Birth Center is Fibre's runtime boundary for developing prospective Threads before authoritative birth. It owns provisional Genesis workflow state, durable model-call recovery, complete birth-bundle construction, and the Fibre Civil Registry service used to prepare permanent civil registration for a birth.

The World Kernel still owns live Thread reality and the atomic persistence transaction. The Birth Center must not mutate live-world tables directly.

The cross-service path from admitted birth through public Thread Presentation and generated media is defined by [`../../docs/architecture/thread-birth-presentation-data-flow.md`](../../docs/architecture/thread-birth-presentation-data-flow.md).

## Genesis development boundary

The authenticated `POST /internal/births/develop` route accepts narrow origin material, not a caller-authored Thread or birth bundle. The caller supplies a factual WorldSpec, atomic text genome values, the non-subject initial participants and place affordances, and the bounded birth/entry chronology. Birth Center derives the provisional Thread and Genesis identities, de-novo symbolic genome provenance, the fourteen developmental windows, reviewed EventStructure offers, frozen historical envelopes, model-call domains, developed life, admission package, and civil registration.

A request is durably reserved before the first provider call. The completed admission package is persisted before World submission. Replaying the exact request therefore resumes the same canonical plan/admission and never regenerates an already-built birth package; changing material under the same request identity is a conflict.

Local and Cloudflare deployments expose the same route when World publication, private authentication, and the `creative`/`repair` reasoning integrations are configured. The operator E2E command is:

```bash
npm run genesis:e2e
```

It uses `FIBRE_PRIVATE_TOKEN`, defaults `FIBRE_BIRTH_CENTER_URL` to `http://127.0.0.1:8790`, submits one development request from the reviewed development cohort fixture, waits for World reconciliation to report `published`, then replays the exact request and requires idempotent publication with no regeneration. `FIBRE_GENESIS_REQUEST_ID` may be set to deliberately replay a prior request; `FIBRE_GENESIS_E2E_SLOT` selects a one-based fixture slot.

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

The value contract and checksum policy are provider-neutral and live in `core/src/fibre-civil-identity.mjs`. The Civil Registry service owns minting, collision avoidance and lookup orchestration. The World Kernel publication adapter persists the prepared registration inside the same transaction that makes the Thread live, so no valid birth can commit without its civil registration.

The FIN is public/non-secret and must not be used as an authentication credential. It encodes no name, World, date, stage, gender, lineage, origin mode, citizenship or other Thread facts.

A physical/digital Fibre Identity Card is a derived presentation credential and is deliberately outside this service. Reissuing or redesigning a card cannot change the FIN.

## Runtime boundary

The provider-facing model runtime remains in `src/runtime.mjs`. A configured World Kernel publication boundary may be injected in-process for local/test composition or reached through the narrow authenticated service boundary without changing authority ownership.
