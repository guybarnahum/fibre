---
id: fibre-cloud-e2e-closure-plan
status: accepted
last-reviewed: 2026-09-03
canonical: true
---

# Cloudflare E2E closure plan

## Purpose

Close the remaining live-infrastructure proof that Fibre can birth one genuine new Thread with no local Fibre runtime participating, converge authoritative World state and public Presentation automatically, publish generated media, survive retry/restart, and be reproducibly rebuilt from an empty environment.

This is infrastructure acceptance work. It does not create a new semantic authority or change Genesis, identity, Embodiment, Presentation, or canonical visual-identity semantics.

## Starting point

The cloud runtime/infradriver work is integrated. Staging provisioning, secret/configuration handling, four-service deployment, health acceptance, exact-SHA deployment evidence, and service-only deployment are working against live Cloudflare staging.

A substantial staging E2E harness already exists in `tools/genesis/genesis-development-e2e.mjs` plus `genesis-development-e2e-staging.mjs`. It already proves:

- fresh request identity is absent before the run;
- the deployed Cloudflare Birth Center performs genuine Genesis development;
- durable provider-call witnesses exist;
- replay is idempotent without regeneration;
- World admits one authoritative Thread and civil identity;
- World reconciliation reaches canonical visual Embodiment;
- Thread Presentation exposes the same Thread;
- the canonical public asset is readable through the public asset route;
- Viewer-facing discovery exposes the Thread;
- all participating Fibre service endpoints are remote HTTPS endpoints;
- machine-readable evidence is tied to the exact deployed Git SHA.

Do not replace or fork that harness. Extend it only where the full cloud acceptance condition is not yet proven.

## Slice G0 — official operator surface

Goal: make the existing staging proof the supported cloud acceptance command.

Operator contract:

```text
npm run cloud:e2e -- --env staging
```

Requirements:

- dispatch to the existing staging E2E harness;
- reject unsupported environments rather than silently running local mode;
- preserve the existing exact-SHA deployment-evidence preflight;
- preserve existing Activity/evidence capture;
- make no fixture mutations, R2 writes, Presentation seeding, or local service starts.

Gate:

- focused operator tests pass;
- ordinary `npm run check` remains green;
- no semantic/runtime production code changes are required for G0.

## Slice G1 — full one-Thread cloud acceptance

Extend the current staging evidence from canonical-root/public-Thread convergence through the complete public-media path.

Required terminal path:

```text
Birth Center
 -> provisional Genesis development
 -> World publication

World
 -> authoritative Thread + civil identity
 -> canonical-root demand

Asset Generator
 -> canonical root generation + credentialed durable asset

World
 -> verified root admission
 -> canonical Embodiment

Thread Presentation
 -> visual projection
 -> Fibre Identity Card
 -> official-photo demand

Asset Generator
 -> reference-conditioned official photo using the admitted canonical root
 -> completion Queue

Thread Presentation
 -> media.ready
 -> updated public snapshot/events

Public API
 -> Thread discoverable
 -> snapshot/events readable
 -> official-photo bytes served with provenance headers

staging.insidefibre.com
 -> same Thread visible through the Viewer contract
```

Evidence must prove that the official-photo generation used the authoritative canonical root reference. Merely proving a public canonical-root image is insufficient for G1.

No local Fibre runtime, manual state mutation, manual R2 write, manual queue injection, or fixture-only mutation endpoint may participate.

Gate: one fresh staging Thread satisfies every terminal assertion and produces retained machine-readable evidence.

### Slice G1a — canonical textual visual phenotype at birth

A genuine native/synthetic birth must carry a rich, enduring canonical textual visual phenotype before it crosses into World authority. This is required semantic input for canonical-root generation, not a later Presentation repair step.

The phenotype should preserve identity across age transformation by separating stable identity features from time-local appearance. Stable material includes facial geometry/proportions, eye/brow/nose/mouth/jaw/chin structure, skin, hair/hairline, ears, body frame, stable marks and characteristic asymmetries. Hairstyle, grooming, clothing, expression, weight variation, temporary injury and ordinary aging are time-local appearance rather than replacement identity.

A born authoritative Thread that lacks this required canonical visual identity is an invalid birth invariant and must fail fast as non-retryable rather than remain indefinitely pending in reconciliation. Legitimate provider, credential, queue and asset-completion delays remain retryable.

## Slice G2 — live Slice G closeout

Run `cloud:e2e` against the exact deployed staging SHA and retain the evidence record.

Before the run:

```text
npm run check
npm run cloud:deploy -- --env staging
```

Then:

```text
npm run cloud:e2e -- --env staging
```

Close G only from the evidence record, not from manual Viewer inspection alone.

## Post-G visual-genetics follow-on — two-parent phenotype recombination

Do this immediately after Slice G is green, while the visual phenotype representation is still active work. It is not required to prove the one de-novo cloud birth for G, but it must be completed before the Thread genetics/data model is treated as finished.

The two-parent path must use parental **textual visual phenotype loci** as inheritance authority. Parent canonical photographs remain operational likeness anchors/evidence for the parents and must not be blended or passed as the child's genetic visual input.

Required model:

```text
parent A atomic textual visual loci
parent B atomic textual visual loci
        + persisted random recombination seed
        -> deterministic replayable recombination
        -> explicit per-locus parent-source witness
        -> explicit mutation witness where applicable
        -> child atomic textual visual phenotype
        -> optional constrained prose assembly
        -> text-only child canonical-root generation
        -> World verification/admission
```

Non-negotiable properties:

- visual loci become sufficiently atomic to allow meaningful mixed inheritance rather than selecting an entire face/eye paragraph from one parent;
- values remain semantic text rather than numeric face vectors;
- randomness is introduced through a seed minted for the reproductive event and persisted durably, then replayed through deterministic PRNG logic;
- each inherited locus records parent/source-locus provenance;
- mutations are explicit, bounded and witnessed;
- siblings with different recombination seeds can receive different inherited combinations;
- the LLM, if used, may assemble authoritative inherited atoms into coherent descriptive prose but may not choose inheritance, average parental traits, or silently invent phenotype facts;
- parent images are never pixel-blended and are not supplied as the native child's canonical-root references;
- the child receives one independent canonical root generated from its own recombined phenotype text;
- all later child depictions and age transformations use the child's admitted root, not either parent's image.

This follow-on should replace any provisional Thread-ID-derived lineage selection used during G1a with persisted reproductive randomness plus an auditable recombination witness.

## Slice H — in-vivo retry/restart hardening

After G is green, introduce controlled failures around the live path, minimally covering:

```text
provider transient failure
World restart while root pending
Presentation unavailable during handoff
completion Queue retry
Birth request replay
duplicate visual reconcile
duplicate workflow start
already-existing immutable asset
Viewer reload during snapshot transition
```

Required post-recovery invariant:

```text
one Thread
one civil identity
one canonical root
one admitted Embodiment
one current official-photo demand
one admitted public official-photo asset
no divergent identity authority
```

Do not use longer scheduler cadences or weaker assertions as recovery mechanisms.

## Slice I — empty-environment rebuild

Prove a fresh isolated staging-equivalent environment can be recreated from documented commands and explicitly supplied operator credentials/secrets:

```text
npm run cloud:provision -- --env <environment>
npm run cloud:configure-secrets -- --file <operator-selected-file> --env <environment>
npm run cloud:deploy -- --env <environment>
npm run cloud:e2e -- --env <environment>
```

The final evidence must show a newly born Thread visible through that environment's public Presentation/Viewer path.

## Stop condition

Cloudflare E2E closure is complete only when:

```text
reproducible provisioning/configuration
 -> exact-SHA deployed Fibre cloud stack
 -> one genuine new cloud birth
 -> authoritative World convergence
 -> canonical root generated and admitted
 -> Identity Card + reference-conditioned official photo
 -> public Presentation/API/Viewer convergence
 -> retry/restart preserves singular authority
 -> empty-environment rebuild reproduces the proof
```

Keep the implementation narrow: extend existing Fibre acceptance machinery rather than creating a second cloud-specific application architecture.
