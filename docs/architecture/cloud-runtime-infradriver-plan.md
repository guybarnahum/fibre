---
id: fibre-cloud-runtime-infradriver-plan
status: accepted
last-reviewed: 2026-08-30
canonical: true
---

# Cloud runtime via InfraDriver — deployment closure plan

## Purpose

This plan defines the remaining engineering work required to run the complete Fibre birth-to-publication process in cloud infrastructure with no local runtime participating.

The target is not merely to deploy the current Node processes somewhere remote. The target is:

> Every Fibre runtime service executes through provider-neutral `InfraDriver` capabilities, so the same service architecture runs locally and in cloud environments while provider adapters supply persistence, scheduling, coordination, objects, queues, workflows and hosting.

The acceptance path is one real Thread born in cloud infrastructure and automatically reflected on `insidefibre.com` with its admitted identity, public presentation and generated official photo.

This is deployment/runtime work. It does not create a new semantic authority and does not change the canonical visual-identity invariant, Genesis authority, Thread identity semantics or Presentation publication authority.

## Standing architectural constraints

### One application architecture, multiple InfraDrivers

Local and cloud runtimes must be architecturally equivalent:

```text
semantic service/store
        |
        v
InfraDriver capability
        |
        +--> local provider
        |
        +--> cloudflare provider
```

Provider adapters may implement a capability differently, but semantic services must not branch into separate local and cloud architectures.

This applies especially to `InfraDriver.state`, `InfraDriver.scheduler` and any coordination required for restart-safe reconciliation.

### Scheduler parity is mandatory

`InfraDriver.scheduler` must work locally as well as in Cloudflare.

A local runtime must not use `setInterval`, ad-hoc timers or process-lifetime assumptions as its semantic scheduling model while cloud uses Durable Object alarms or another durable scheduler. Both environments use the same provider-neutral scheduler contract and the same reconciliation semantics.

Provider implementations may differ:

```text
InfraDriver.scheduler
   local      -> local durable/testable scheduler adapter
   cloudflare -> Durable Object alarm / other Cloudflare scheduling adapter
```

The scheduler contract should be the smallest interface required by actual Fibre work. Do not build a generalized scheduling framework before the concrete World/Birth reconciliation use cases require it.

### Do not over-generalize prematurely

For every new capability or method:

1. identify the concrete Fibre operation that requires it;
2. define the smallest provider-neutral contract that preserves that operation;
3. implement local and cloud provider mappings;
4. add shared conformance tests;
5. expand only when a second real use case demonstrates the need.

Do not design speculative lease systems, distributed-lock frameworks, job platforms or generic workflow engines when a narrower state-scoped operation is sufficient.

### Explicit secret-file input

Cloud secret configuration tools must not silently read `.env` by default.

The operator supplies the source file explicitly, for example:

```text
npm run cloud:configure-secrets -- --file .env --env staging
```

or another named file.

The tool must:

- require an explicit file path;
- parse only that file;
- know the required secret names for each target service;
- warn clearly for every missing required secret;
- fail before deployment when mandatory secrets are absent;
- never print secret values;
- upload only the subset required by each service;
- never commit or persist copied secret values into repository files.

`.env` remains a convenient possible input file, not an implicit authority or default.

## Current deployment posture

Cloudflare deployment already exists for:

```text
Thread Presentation
Asset Generator
insidefibre.com Viewer
```

The completed deployment integration proves:

```text
World
 -> authenticated Asset Generator control boundary
 -> durable generation
 -> verified canonical-root proof
 -> World Embodiment admission
 -> authenticated Thread Presentation handoff
 -> public snapshot/events/assets
 -> insidefibre.com Viewer
```

However, World Kernel and Birth Center remain local Node runtimes, and authoritative World/Birth persistence still contains direct SQLite/filesystem assumptions. Therefore the current deployment is production-shaped but not fully cloud-hosted.

## Target cloud topology

```text
Birth Center [Cloudflare]
        |
        v
World Kernel [Cloudflare]
        |
        +----> Asset Generator [Cloudflare Worker + Workflow]
        |            |
        |            +--> image provider(s)
        |            +--> C2PA signer
        |            +--> R2
        |
        +----> Thread Presentation [Cloudflare]
                         |
                         +--> Durable Object streams/realtime
                         +--> D1 public catalog
                         +--> R2 public media
                         +--> completion Queue
                         |
                         v
                 api.insidefibre.com
                         |
                         v
                  insidefibre.com
```

The production C2PA signer may remain an external trusted cryptographic service. "All Fibre application runtimes on Cloudflare" does not require private signing-key custody to move into Workers.

## InfraDriver capability profile

The umbrella InfraDriver vocabulary already includes:

```text
state
streams
objects
catalog
realtime
queues
scheduler
workflows
coordination
secrets
cache
telemetry
```

Only capabilities required by a real deployment slice should acquire or expand executable contracts.

Expected service requirements are initially:

```text
World Kernel
  state
  scheduler
  coordination only if a concrete race cannot be solved by state serialization
  telemetry as needed

Birth Center
  state
  scheduler only where durable retry/reconciliation requires it

Thread Presentation
  streams
  objects
  catalog
  realtime
  queues
  workflows

Asset Generator
  objects
  queues
  workflows
```

Do not grant services broad provider capabilities merely because the provider supports them.

## Cloud Slice A — transactional state InfraDriver

### Goal

Implement cloud transactional state that satisfies Fibre's existing `transactional-state-v0.1` contract and the existing World/Birth guarantees:

```text
relationalStatements
atomicWriteTransactions
serializedWriteTransactions
durableCommitBeforeAcknowledgement
transactionalReads
schemaMigrations
consistencyScope = single_named_scope
```

### Preferred Cloudflare mapping

Use SQLite-backed Durable Object storage for one named Fibre state scope unless implementation evidence shows it cannot satisfy the contract.

Conceptually:

```text
scope "world"
 -> FibreTransactionalStateDurableObject("world")

scope "birth-center"
 -> FibreTransactionalStateDurableObject("birth-center")
```

A generic state Durable Object is preferred over separate World/Birth state classes unless their concrete requirements diverge.

### Required port

Cloudflare must implement the existing state interface rather than invent a second persistence API:

```text
state.open(scopeId, options)
state.guarantees(scopeId)

session.exec
session.prepare
session.beginWrite
session.commit
session.rollback
session.close
```

### Local parity

The local provider must implement the same contract and shared conformance tests. Local SQLite may remain the provider implementation, but services receive it only through `InfraDriver.state`.

### Gate

The same transactional state contract suite passes against local and Cloudflare providers, including conflict, rollback, durable commit, migration and restart cases.

## Cloud Slice B — World persistence portability

### Goal

Remove direct database-path and filesystem persistence assumptions from authoritative World runtime composition.

Today several World stores still open the shared local database directly. They must instead receive provider-neutral storage context such as:

```text
{
  infraDriver,
  stateScopeId: "world"
}
```

or an equivalent state session abstraction.

### Migration rule

Do not create Cloudflare-specific variants of every World store.

Target:

```text
World semantic store
 -> InfraDriver.state
 -> local SQLite adapter OR Cloudflare state adapter
```

### Schema migrations

World schema initialization/migration must operate through the state capability. Starting an empty state scope must deterministically establish the required schema before serving mutations.

### Gate

- authoritative World persistence runs through `InfraDriver.state`;
- no production World store depends on local filesystem/database paths outside the local provider boundary;
- existing local tests remain green through the local InfraDriver;
- equivalent cloud state tests pass;
- restart/replay recovers the same canonical authorities.

## Cloud Slice C — provider-neutral scheduler and World cloud runtime

### Scheduler contract

First extract the actual durable scheduling requirements from current reconciliation loops, especially:

```text
pending Genesis Presentation delivery
pending canonical-root reconciliation
pending admitted-Embodiment -> Presentation handoff
```

Define the minimum scheduler interface required for these operations.

Both providers implement it:

```text
local scheduler provider
Cloudflare scheduler provider
```

The local runtime must use this scheduler too; no separate timer architecture is allowed.

### Cloud World deployment

Add:

```text
infra/deployments/world-kernel/cloudflare/
  worker.mjs
  wrangler.jsonc
  README.md
```

and declare World in `infra/deployments/environments/cloudflare.yaml`.

World cloud composition should use:

- cloud `InfraDriver.state`;
- cloud `InfraDriver.scheduler`;
- the minimum coordination facility actually required;
- existing provider-neutral Asset Generator and Presentation boundaries.

Where practical, Cloudflare service bindings may back the existing `fetch`-shaped service boundaries. The semantic HTTP contract remains the same; cloud deployment should not require public DNS between internal Fibre services.

### Recovery gate

Prove:

```text
birth/pending work
 -> Worker instance disappears
 -> durable scheduler resumes reconciliation
 -> same canonical root
 -> same admitted Embodiment
 -> same current Presentation demand
 -> no duplicate semantic admission
```

## Cloud Slice D — Birth Center portability and cloud runtime

### Goal

Move Birth Center durable provisional state and provider-call recovery through `InfraDriver.state` and any required scheduler capability.

Add:

```text
infra/deployments/birth-center/cloudflare/
  worker.mjs
  wrangler.jsonc
  README.md
```

Birth Center remains provisional authority. World remains the only authority that makes a Thread live.

Cloud Birth Center should publish to World through the existing provider-neutral boundary, backed by a Cloudflare service binding where appropriate.

Initial birth mutation endpoints should remain private/operator-controlled rather than becoming an unauthenticated public birth API.

### Gate

```text
cloud Birth Center
 -> durable provisional birth
 -> cloud World publication
 -> one authoritative live Thread
```

Retry/restart may preserve provisional work but may not create a partially born authoritative Thread.

## Cloud Slice E — resource provisioning and configuration closure

### Required production resources

At minimum:

```text
World transactional state Durable Object namespace
Birth transactional state Durable Object namespace
Presentation Durable Object namespace
Presentation D1 catalog
shared presentation/generated-media R2 bucket
Asset Generation Workflow
asset completion Queue
asset completion DLQ
Workers and service bindings
insidefibre.com custom domain
api.insidefibre.com custom domain
```

The existing Presentation D1 binding must be connected to a concrete provisioned production database rather than remaining only a dry-run placeholder.

### Provision command

Create an idempotent operator command such as:

```text
npm run cloud:provision -- --env staging
```

It should verify/create required resources and report provider identifiers without placing provider-native identifiers into semantic Thread records.

Production resource names and IDs are operational configuration, not secrets.

## Secrets and credentials

### Application secrets

Expected secret inventory:

```text
OPENAI_API_KEY
BFL_API_KEY
GEMINI_API_KEY              when a selected runtime integration uses Gemini
FIBRE_PRIVATE_TOKEN
FIBRE_ADMIN_TOKEN
C2PA_SIGNER_TOKEN
```

Each secret is exposed only to services that require it.

### Application configuration that is not secret

Examples:

```text
C2PA_SIGNER_URL
C2PA_SIGNER_ID
C2PA_TRUST_POLICY
VIEWER_ORIGIN
service/binding names
D1 database ID
R2 bucket names
queue names
custom domains
```

A URL may still be operationally sensitive in some environments, but it is not a credential and should not be conflated with an authentication secret.

### Deployment-only credentials

Cloudflare operator/CI credentials are distinct from application runtime secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

These authorize Wrangler/CI to provision and deploy infrastructure. They are stored in operator credential storage or CI secret storage and are not injected into Fibre Workers unless a concrete runtime requirement exists.

### `FIBRE_PRIVATE_TOKEN`

This is service-to-service application authentication, not an operator credential.

For the first cloud deployment, one cryptographically random shared value is acceptable across the participating private service boundaries. Later service-specific credentials may replace it if a concrete security requirement justifies the added complexity.

### `FIBRE_ADMIN_TOKEN`

This is distinct from `FIBRE_PRIVATE_TOKEN` and protects human/operator repair or administrative actions.

Do not reuse provider API keys or the private service token as the admin credential.

### C2PA signer

The production signer contract is:

```text
C2PA_SIGNER_URL       configuration
C2PA_SIGNER_TOKEN     secret
C2PA_SIGNER_ID        configuration
C2PA_TRUST_POLICY     configuration
```

Private signing-key custody is owned by the signer deployment, not by Fibre application configuration.

## Secret configuration tool

Add an operator tool such as:

```text
tools/deployment/configure-cloudflare-secrets.mjs
```

Required invocation shape:

```text
npm run cloud:configure-secrets -- --file <path> --env <environment>
```

There is no implicit `.env` read.

The tool must validate the selected environment and target services, then print names/status only, for example:

```text
asset-generator
  OK      OPENAI_API_KEY
  OK      BFL_API_KEY
  MISSING C2PA_SIGNER_TOKEN
  OK      FIBRE_PRIVATE_TOKEN
```

Missing optional secrets may warn. Missing mandatory secrets must fail before deployment.

A supplied `.env` file may be used:

```text
npm run cloud:configure-secrets -- --file .env --env staging
```

but `.env` is simply the caller-selected input file.

## Cloud Slice F — deploy command and health closure

Create a reproducible deployment command, conceptually:

```text
npm run cloud:deploy -- --env staging
```

Expected order:

```text
1. repository/deployment validation
2. Cloudflare operator authentication check
3. resource provisioning verification
4. required secret-name verification
5. production C2PA signer health/trust verification
6. Asset Generator deploy
7. Thread Presentation deploy
8. World Kernel deploy
9. Birth Center deploy
10. insidefibre.com deploy
11. service health checks
12. in-vivo acceptance test
```

Deployment must not print secret values.

## Cloud Slice G — full cloud in-vivo E2E

### Acceptance condition

No local service process participates.

Create one genuine new Thread through the deployed Birth Center and record its `genesisId` and `threadId`.

Verify in order:

```text
Birth Center
 -> provisional state durably recorded

World
 -> authoritative birth transaction
 -> civil identity
 -> canonical visual identity request

Asset Generator
 -> canonical-root workflow
 -> provider generation
 -> credentialed asset
 -> durable receipt/object

World
 -> verified root admission
 -> canonical Embodiment

Thread Presentation
 -> birth projection
 -> admitted visual projection
 -> Fibre Identity Card
 -> official-photo demand

Asset Generator
 -> reference-conditioned official photo
 -> completion Queue

Thread Presentation
 -> media.ready
 -> updated public snapshot

Public API
 -> Thread appears in /api/threads
 -> snapshot/events readable
 -> official-photo bytes served with provenance headers

insidefibre.com
 -> same Thread renders automatically
 -> official photo renders from Presentation public asset route
```

No fixture mutation endpoints, manual R2 writes, manual Presentation seeding or local World/Birth process may participate in this acceptance proof.

## Cloud Slice H — restart/failure hardening

Run controlled failures at minimum around:

```text
provider transient failure
World restart while root pending
Presentation unavailable during handoff
completion Queue retry
Birth request replay
duplicate visual reconcile
duplicate workflow start
already-existing immutable asset
viewer reload during snapshot transition
```

Required invariant after recovery:

```text
one Thread
one civil identity
one canonical root
one admitted Embodiment
one current official-photo demand
one admitted public official-photo asset
no divergent identity authority
```

## Cloud Slice I — empty-environment rebuild proof

Create a staging environment from no pre-existing Fibre runtime resources and prove the environment can be recreated by documented commands plus explicitly supplied credentials/secrets.

Conceptual operator flow:

```text
npm run cloud:provision -- --env staging
npm run cloud:configure-secrets -- --file <operator-selected-file> --env staging
npm run cloud:deploy -- --env staging
npm run cloud:e2e -- --env staging
```

The final command must produce evidence that a newly born staging Thread appears in the staging Viewer.

## Staging before production

Use isolated staging resources before production:

```text
separate World state
separate Birth state
separate Presentation catalog
separate R2 bucket where practical
separate queues/DLQ
separate Worker deployments
separate FIBRE_PRIVATE_TOKEN
separate FIBRE_ADMIN_TOKEN
```

Provider API credentials may be shared initially if desired, but state and internal authentication should remain environment-isolated.

Suggested public endpoints:

```text
staging.insidefibre.com
api.staging.insidefibre.com
```

## Observability requirement

Before live cloud births, structured logs must allow an operator to answer:

> Where did Thread `<threadId>` stop?

Carry stable identifiers where applicable:

```text
threadId
genesisId
embodimentId
jobId
mediaId
eventId
```

Useful lifecycle events include:

```text
birth.accepted
genesis.persisted
presentation.delivered
visual.root.requested
visual.root.ready
embodiment.admitted
presentation.visual.reconciled
media.requested
media.ready
viewer.discoverable
```

Never log authentication tokens, API keys or private signing material.

## Documentation/config closure

As implementation proceeds:

- keep `infra/README.md` aligned with local/cloud parity;
- keep `.env.example` as a name/documentation inventory only, never a deployment source of truth;
- document every required secret/config name and owning service;
- keep `cloudflare.yaml` authoritative for selected runtime/infra/integration composition;
- update deployment READMEs with actual resource names and provisioning commands;
- preserve explicit distinction between secrets, non-secret runtime configuration and deployment-only operator credentials.

## Current gap summary

```text
InfraDriver abstraction                         EXISTS
transactional state contract                    EXISTS
local transactional state                       EXISTS
Cloud streams/objects/catalog/realtime           EXISTS
Cloud queues/workflows                          EXISTS
Asset Generator cloud runtime                   EXISTS
Thread Presentation cloud runtime               EXISTS
insidefibre.com public contract E2E             EXISTS

Cloud transactional state provider              GAP
World stores fully on InfraDriver.state          GAP
provider-neutral scheduler + local parity       GAP
World Cloudflare runtime                        GAP
Birth persistence through InfraDriver.state      GAP
Birth Cloudflare runtime                        GAP
explicit resource provisioning                  GAP
explicit secret-file configuration tool         GAP
production C2PA deployment/health resolution    GAP
full cloud one-Thread in-vivo E2E               GAP
cloud failure/restart acceptance                GAP
empty-environment rebuild proof                 GAP
```

## Stop condition

This plan is closed only when:

```text
operator-selected secret/config input
 -> reproducible cloud provisioning
 -> all Fibre application runtimes deployed
 -> no local process participates
 -> one new Thread is born
 -> World authority survives restart
 -> canonical root is generated and admitted
 -> Presentation publishes the Thread
 -> official photo is generated from the canonical root
 -> api.insidefibre.com exposes the final public state
 -> insidefibre.com renders the Thread
 -> retry/restart does not duplicate semantic authority
```

The implementation should remain as small as possible while satisfying this path. Infrastructure abstraction is justified only by the concrete Fibre runtime behavior it enables or protects.
