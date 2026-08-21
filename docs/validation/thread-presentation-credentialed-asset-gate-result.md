---
id: validation-thread-presentation-credentialed-asset-gate-result
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation credentialed-asset publication gate — validation handoff

## Status

**NEEDS MAINTAINER VALIDATION.**

This slice implements the provider-neutral provenance/publication machinery accepted in ADR-0014. It does **not** claim that Fibre is already writing real C2PA Content Credentials in Cloudflare production.

## Capability proved by this slice

The implementation now has a separate credentialed generation path that can:

1. retain the exact Fibre semantic brief;
2. retain an exact secret-stripped provider request witness separately from the semantic brief;
3. hash provider-returned bytes before provenance embedding;
4. persist an immutable, content-addressed `GenerationRecord` before embedding;
5. apply an explicit prompt disclosure policy;
6. call a replaceable `ContentCredentialSigner` to embed and verify portable provenance;
7. hash and store only the final post-credential asset as the publishable media object;
8. persist an immutable `StoredAssetReceipt` linking final bytes to the exact `GenerationRecord`;
9. re-fetch and re-verify the final asset and GenerationRecord before publication;
10. emit `media.ready` only after that verification succeeds.

The first tests use a deliberately synthetic fixture credential format. Passing them proves Fibre's ordering, retention, disclosure and load-bearing publication contract. It does **not** prove C2PA interoperability.

## New contracts

```text
GenerationRecord
  normalized AssetGenerationJob
  exact semantic brief
  semanticBriefDigest
  exact secret-stripped providerRequestWitness
  providerRequestDigest
  providerOutputDigest
  provider output shape
  actual provider/model/request/configuration

StoredAssetReceipt
  final post-credential asset ref/digest
  GenerationRecord ref/digest
  providerOutputDigest
  credential manifest/signer metadata
  presentation caller context

ContentCredentialSigner
  embed(...)
  verify(...)

MediaGenerationProvider v0.2
  generated result
  + exact providerRequestWitness
```

The validated v0.1 generator path remains present while the credentialed path is introduced. No production caller should publish a v0.1 ready receipt as generated public media once the new publication gate becomes the live route.

## Hash/order invariant

```text
semantic brief
       |
provider request witness
       |
provider raw bytes
       v
providerOutputDigest
       |
       v
GenerationRecord
       v
generationRecordDigest
       |
       v
ContentCredentialSigner.embed
       |
       v
ContentCredentialSigner.verify
       |
       v
FINAL asset bytes
       v
finalAssetDigest
       |
       v
StoredAssetReceipt
       |
       v
verifyCredentialedAssetForPublication
       |
       v
ThreadPresentationAssetPublisher
       |
       v
media.ready
```

The GenerationRecord is committed before embedding. If embedding fails, no final publishable asset and no StoredAssetReceipt are written.

## Prompt policy pinned by tests

Default:

```text
mode: digest_only
```

The immutable GenerationRecord retains the exact semantic brief and exact secret-stripped provider request witness, while embedded portable provenance contains their digests only.

`public_text` requires a non-empty explicit authorization reference and then may embed both full witnesses. Public output status alone never authorizes prompt disclosure.

## Cloudflare / C2PA runtime finding

As checked on 2026-08-21:

- the current official Node SDK is `@contentauth/c2pa-node`; it can add signed manifests and validate C2PA but uses a native Node library;
- Cloudflare Workers can execute Wasm generally;
- the current official `c2pa-web` / `c2pa-wasm` path still has an accepted upstream issue and open PR for a byte-based non-browser verification entry point specifically covering runtimes such as Cloudflare Workers.

Relevant upstream references:

- https://github.com/contentauth/c2pa-js
- https://github.com/contentauth/c2pa-js/issues/147
- https://github.com/contentauth/c2pa-js/pull/148
- https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/

Therefore Fibre does **not** currently freeze one C2PA runtime topology. `ContentCredentialSigner` remains an adapter boundary. Candidate Cloudflare-v1 implementations remain:

1. a Worker-compatible official Wasm adapter once verified;
2. a Node/native signer service hosted behind Fibre infrastructure, potentially including a Cloudflare Container if appropriate;
3. another conforming signer implementation.

Do not ship a private fork of the C2PA Wasm API merely to make this milestone appear complete without an explicit owner decision and conformance evidence.

## Targeted validation

From the `fibre` repository:

```bash
git fetch origin
git switch agent/thread-presentation-milestones-v1
git pull --ff-only

git status --short

node --test services/asset-generator/test/credentialed-asset-generation.test.mjs
node --test services/world-kernel/test/thread-presentation-asset-publisher.test.mjs

# Re-run the prior presentation/asset foundations as adjacent regression coverage.
node --test services/asset-generator/test/asset-generation-service.test.mjs
node --test services/world-kernel/test/thread-presentation-asset-planner.test.mjs
node --test services/world-kernel/test/thread-presentation-server.test.mjs

npm run includes:check
npm run validate
npm test

git diff --check agent/pr39-genesis-childhood-birth-v1...HEAD
```

Expected new targeted results:

```text
credentialed-asset-generation.test.mjs          5 pass / 0 fail
thread-presentation-asset-publisher.test.mjs    2 pass / 0 fail
```

## Negative properties pinned

The tests require:

- the exact semantic brief survives in the private GenerationRecord;
- the provider-facing request witness survives separately;
- changing provider compilation changes `providerRequestDigest` without changing `semanticBriefDigest`;
- `digest_only` final asset bytes do not contain either full textual witness;
- `public_text` is rejected without explicit authorization;
- raw provider-output digest and final post-credential digest may and normally do differ;
- credential corruption blocks publication even if a caller recomputes a matching final-byte digest;
- GenerationRecord persistence precedes credential embedding;
- failed embedding writes no final asset and no StoredAssetReceipt;
- `media.ready` cannot enter the presentation stream when credential verification fails.

## Capability status

| Capability | Status after this slice |
| --- | --- |
| Full semantic-brief retention | Implemented / testable |
| Exact provider-request witness retention | Implemented contract / fixture provider proof |
| Prompt disclosure policy | Implemented / testable |
| GenerationRecord | Implemented / testable |
| StoredAssetReceipt | Implemented / testable |
| Credential signer abstraction | Implemented / testable |
| Credential verification as `media.ready` gate | Implemented / testable |
| Real C2PA embed/verify adapter | **Deferred — not yet implemented** |
| Cloudflare Workflows/R2 driver | **Deferred — next P3 infrastructure work** |
| Real image provider adapter | **Deferred — after credential/runtime path** |
| Cần Thơ real generated image | **Not yet generated** |

## P3 relationship

This is still P3-D/E backend work with P5 media-provenance foundations intentionally pulled forward. P3 is not CLEAR yet.

The remaining P3 vertical proof is:

```text
Cloudflare InfraDriver
  -> real async generation workflow
  -> real provider request
  -> real C2PA-compatible signer implementation
  -> R2 final asset + provenance records
  -> verified StoredAssetReceipt
  -> media.ready
  -> insidefibre viewer renders the asset
```

One eligible Cần Thơ place reconstruction is sufficient for the first end-to-end proof. Portrait generation remains deferred until an accepted embodiment reconstruction brief exists.
