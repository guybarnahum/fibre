---
id: architecture-deployment-provider-selection
status: accepted
last-reviewed: 2026-08-29
canonical: false
---

# Deployment provider selection

## Purpose

Make runtime location and infrastructure provider selection explicit deployment decisions instead of hidden service implementation details. This applies [`ADR-0019`](../decisions/ADR-0019-deployment-provider-selection.md) and complements [`infrastructure-driver.md`](infrastructure-driver.md).

## Dependency direction

```text
environment manifest
       |
       v
infra/deployments/<service>/<provider>/
       |             |
       |             +--> integrations (media/model/credentials)
       +--> infra/providers/<provider>/
       |
       v
provider-neutral Fibre service
```

The invariants are:

```text
services do not choose the cloud
infra/providers do not know service topology
infra/deployments may compose both
media/model vendors are integrations, not InfraDriver providers
```

## Repository boundaries

```text
services/
  asset-generator/
  thread-presentation/
    src/http/read-api.mjs

infra/
  infra-driver.mjs
  internal.mjs
  service.mjs
  providers/
    local/
    cloudflare/
  deployments/
    environments/
      local.json
      cloudflare-remote.json
    asset-generator/
      image-provider-selection.mjs
      cloudflare/
        worker.mjs
        wrangler.local.jsonc
        wrangler.jsonc
    thread-presentation/
      cloudflare/
        worker.mjs
        wrangler.local.jsonc
        wrangler.jsonc
```

`infra/providers/` must not import Fibre services. `infra/deployments/` may import services, infrastructure providers and integrations. Provider-neutral Fetch/API behavior belongs with the owning service rather than a provider host.

## Manifest contract

The manifest records logical provider aliases, runtime provider, InfraDriver provider, advertised capabilities, and each service's required capabilities. Runtime and infrastructure aliases remain separate even when they currently select the same Cloudflare environment.

The manifest contains no cloud credentials, model credentials, signing keys, provider-native resource identities, Thread/World semantics, or publication decisions.

Current manifests:

```text
infra/deployments/environments/local.json
infra/deployments/environments/cloudflare-remote.json
```

A generalized manifest-to-provider compiler remains deferred; current Wrangler JSONC is explicit provider output checked against Fibre's architecture and deployment tests.

## A model for each cognitive job

A service's manifest entry names an integration for each port (`livedNow`, `encounter`), and may also name one for a cognitive job by its prompt id:
```yaml
world-kernel:
  integrations:
    encounter: lived-encounter-openai
    world.happening: lived-workers-ai-gemma4
```
- **Routing:** every call carries its prompt id. `routedReasoningIntegration` sends it to the job's integration when one is named, else to the port's.
- **Moving a job** to another model is therefore one line of configuration, and no code names a provider. A job's credentials are read only when that job first thinks.
- **Choosing:** jobs are moved one at a time, after `model:quality` on recorded requests, by the accepted rule: quality within noise of the best first, then quality per dollar.
- **Recorded requests:** on staging, the World's integration records every job's full request and answer (`captureDepths: [gate, deep]`) as one `model-capture` log line, Thread-private and never committed. `npm run model:captures -- --env staging --hours 24` gathers them from Workers Logs (a token with Workers Observability read) into `.fibre/infra-measure/`, so a job that comes a few times an hour, such as a reflection, can be judged on a day's real requests. A request too long to log whole is counted as `model-capture-skipped`, never cut.
- **Fair judging:** every compared model is scored by the same judges, those that read every candidate. No judge reads its own model's answers, so a judge that is also a candidate is shown but does not score its rivals; otherwise a cheaper model would be held to more judges than the reference.

**Workers AI** (`provider: cloudflare`, `integrations/ai/reasoning/cloudflare.mjs`):
- **Inside the World,** it runs through the Worker's `AI` binding, beside it, with no key. Operator tools use the account's REST endpoint with `CLOUDFLARE_ACCOUNT_ID` and a Workers AI token, `CLOUDFLARE_AI_API_TOKEN`.
- **Structured output** is asked as the job's JSON schema, which Workers AI honours on a best-effort basis. An answer that misses it is unparseable, and the job's own validation and retry decide.
- **Fields that may be null** are asked as optional and read back as null when absent. Under the enforced schema a model may be unable to write null: Gemma 4 emitted whitespace to its output limit wherever a null was due.
- **Live speech** arrives as one utterance, not streamed.
- **Hidden thinking** is off unless an integration sets `thinking: true`.
- **Timeouts:** the binding cannot cancel a request; one the World stops waiting for still runs and is billed. A binding timeout is therefore never retried, and a `latency: minutes` job waits up to three minutes (live jobs one).

**Recovery:** a provider-wide failure (billing, credentials, access) stops calls to that provider for ten minutes, then lets the next call try again. A long-lived World therefore resumes on its own once the account is fixed.
- **Waiting:** while World work keeps failing, the World's reconciliation backs off exponentially up to half an hour. A Thread's next boundary or another deadline due sooner still wakes it on time. A World whose minds are unavailable therefore costs two wakes an hour, not twelve.
- **Reflections** that fail wait as long as they have been failing: half an hour at first, doubling, at most a day. Only the work frontier's due time moves; the reflection is never dropped and resumes from any decision it already recorded.
- **Reasons:** every failed model call logs its error code and a short message (`model-call`), every failed lived boundary logs its reason (`lived-boundary-failed`), and every failed reflection logs its reason and next attempt (`experience-consolidation-failed`). An outage, an allowance running out, or a model missing the schema can be read afterwards in Workers Logs.

## Meaning (embeddings)

A service may name a `meaning` port of kind `ai.embedding` for World's own measures, never a Thread's cognition. The World uses Workers AI `@cf/baai/bge-m3` through its AI binding to measure how far an exchange repeats a Thread's earlier ones (ADR-0036, S5b repaired). Without the port, or when it fails, the measure falls back to shared words; every attempt is logged as `meaning-call`.

## Model providers in infrastructure health

A service's infrastructure health (`/internal/health/infra`) includes every reasoning integration its manifest entry names.
- **Probe:** each is reached through its own adapter with the smallest request it can make, once per provider, model and key, held for 15 minutes (2 after a failure).
- **Critical:** billing, credentials, permission and model-configuration failures, since nothing thinks until an operator acts.
- **Elevated:** other provider errors.
- **Nothing is hardcoded** (`infra/deployments/model-provider-health.mjs`), so changing a provider in the manifest changes what health reports.
- **Unaffected:** the state route used to accept deployments, and the service's own HTTP status.
- **Admin dashboard:** a critical provider raises the banner but does not lock the dashboard, since World records stay readable.
- **Deferred:** image integrations are not probed, because their smallest request is an image.

## Asset Generator

Portable construction remains:

```text
createAssetGenerationRuntime({ infra, provider })
```

Cloudflare host composition lives at `infra/deployments/asset-generator/cloudflare/`. Logical image-provider profile selection lives one level above the Cloudflare host and receives abstract secrets from the host. OpenAI/BFL integrations stay under `integrations/ai/`.

Asset Generator remains Workflow-only. Its HTTP surface is the shared, side-effect-free `GET /healthz`; it has no public generation route. It stores immutable generated output/receipts and emits completion facts, but never publishes `media.ready`.

## Thread Presentation

Provider-neutral read API behavior lives at `services/thread-presentation/src/http/read-api.mjs`. The Cloudflare host at `infra/deployments/thread-presentation/cloudflare/` injects R2/D1/Durable Object/Workflow/Queue facilities and consumes Asset Generator completion facts.

The authority flow remains:

```text
Presentation demand
  -> Asset Generator Workflow
  -> immutable generated bytes + completion fact
  -> completion Queue
  -> Thread Presentation admission
  -> media.ready
```

Moving deployment composition under root Infra changes filesystem ownership only; it does not move Thread authority or publication semantics.

## Extension rule

Do not add empty provider directories or generic deployment-framework abstractions. A future AWS/GCP/Azure implementation should appear only when a real Fibre deployment needs it, under `infra/providers/<provider>/` and `infra/deployments/<service>/<provider>/` as appropriate.
