---
id: fibre-cloud-e2e-closure-plan
status: accepted
last-reviewed: 2026-10-12
canonical: true
---

# Cloud E2E — deployed birth, media and recovery

## Status and proof boundary

**G/H public cloud path and minimum recovery: closed.** Fibre has demonstrated the production-shaped Cloudflare path from a genuine Genesis birth to authoritative World state, canonical visual identity, Civil Registry/FIN, Fibre Identity Card, generated public media and Presentation/Viewer discovery. Bounded provider/reconciliation replay and restart recovery are accepted. These are infrastructure and publication proofs, **not** evidence that a Thread is behaviorally non-interchangeable or independently living.

**Slice I empty-environment rebuild: separate acceptance not verified in the current outcome record.** Provisioning and deployment commands exist, but the earlier plan's stronger claim—rebuilding from an empty staging-equivalent environment and witnessing a newly born public Thread there—must not be inferred from ordinary staging operation or marked completed without exact run evidence. Do not reopen G/H just to complete hypothetical infrastructure hardening; revisit I when a concrete reproducibility need requires it.

The current implementation and authority contracts live in [Birth Center](birth-center-runtime.md), [Production persistence](production-persistence.md), [Canonical visual identity](canonical-visual-identity.md), [Thread Presentation](thread-presentation-contract.md) and [Asset provenance](generated-asset-provenance.md). This document retains the cross-service proof and the important open boundary, not the original G0/G1/G2/H implementation work order.

## Accepted end-to-end path

```text
remote Birth Center: grounded Genesis + durable invocation/replay
  -> World: atomic Thread/civil identity and canonical-root demand
  -> Asset Generator: generated reference with durable provenance
  -> World: verified root admission into canonical Embodiment
  -> Thread Presentation: public projection + Fibre Identity Card
  -> Asset Generator: root-conditioned official photo
  -> completion/admission: immutable public official-photo media
  -> Public API: Thread discovery, current snapshot and readable asset
  -> insidefibre.com: same public Thread projected, not authored
```

The official-photo proof must trace its generation input to the **admitted canonical root**. Merely serving an arbitrary canonical-root image or a detached public portrait does not satisfy the credential/public-media lineage. The official photo is a distinct derivative; neither Presentation nor Viewer may mint identity or accept unstaged media as authority. Future portrait thumbnails are separate public renditions and do not replace this proof.

Use the existing supported acceptance command, not another harness:

```bash
npm run cloud:e2e -- --env staging
```

The proof runs against deployed remote Fibre services with exact-SHA deployment evidence and a fresh birth. It must not succeed by starting local Fibre services, seeding World/Presentation directly, injecting manual R2/queue state, or using fixture-only mutation routes. Preserve the existing durable machine evidence and provenance rather than counting a browser screenshot alone as a complete E2E record.

## Recovery and historical integrity

The accepted G/H result includes **minimum**, bounded recovery. The enduring result is singular identity and replay convergence:

```text
one admitted Thread and civil registration
one authoritative canonical root/Embodiment chain
one current identity-card official-photo lineage
one admitted public asset and projection
no duplicate history or divergent identity after retries/restarts
```

Transient provider failure, World reconciliation resumption, public handoff interruption and replay must not turn retries into new persons or silently substitute source references. An exhaustive nine-case failure matrix (every provider, Queue, viewer reload, and deployment interruption) was a *proposed* hardening program, **not implied by G/H closure**. Add targeted recovery tests only for actual blockers, as required by [ADR-0020](../decisions/ADR-0020-vision-led-development-discipline.md).

## Birth phenotype and physical inheritance

The original G1a contract required one concrete, enduring visual subject at birth, with stable physical identity distinguished from changing age, grooming, clothing, expression, injury and ordinary lived appearance. Missing essential canonical visual authority must fail admission explicitly rather than silently leave a born Thread with no identifiable root. External media delay remains recoverable.

The original post-G work order proposed text-only parental phenotype loci and seed-based recombination. **That implementation direction is superseded by** the accepted [Human physical inheritance](human-physical-inheritance.md) and [Human Appearance](human-appearance.md) contracts: private paired-locus physical genomes, deterministic seed-based allele transmission, authoritative parent genomes when available, transient founder genomes for missing parents, and one concrete inherited phenotype feeding an independent child root. Parental photographs are likeness evidence for their respective owners, **never** pixel-blended as the child's genetic authority. Birth-time genome and canonical root must remain independent of later presentation style.

Actual **live-Thread-parent reproduction/newborn continuity is still deferred**, even though ordinary Genesis birth uses the shared inheritance core. Do not revive the old textual-loci work order as a second genetics engine.

## Conditional fresh-environment proof

If full infrastructure recreation becomes a real Fibre requirement, use the existing documented operator path and record the new environment's deployed SHA and machine evidence:

```bash
npm run cloud:provision -- --env <environment>
npm run cloud:configure-secrets -- --file <operator-selected-file> --env <environment>
npm run cloud:deploy -- --env <environment>
npm run cloud:e2e -- --env <environment>
```

The environment must be genuinely empty before provisioning, and its new birth must converge through that environment's own World, Presentation and public Viewer surfaces. This remains an **unverified additional proof**, not a prerequisite for continued organism-level development.

The stop rule remains: one real Thread, one authoritative life and identity, genuine public convergence and the smallest demonstrated recovery boundary. Infrastructure beyond that must earn its cost by advancing Fibre.
