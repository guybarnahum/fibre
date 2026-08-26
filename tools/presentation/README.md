# Presentation tools

## Live generated-asset smoke

`npm run test:asset-live` is an explicit networked smoke test for real image generation. It is intentionally outside normal `npm test` and CI because it requires `OPENAI_API_KEY`, spends provider quota, and can fail for provider/network reasons.

The test does not use a generic hand-written prompt. It loads the Cần Thơ Thread Presentation fixture, asks the normal Thread Presentation asset planner for `media_memory_tomatoes`, and therefore generates from the Thread's autobiographical memory text plus its uncertainty boundary. The selected memory describes being sent through a crowded market with 20,000 đồng to buy tomatoes and returning the tomatoes and change; uncertain details remain marked as uncertain.

Preview the exact Fibre-generated prompt without making a provider call:

```bash
npm run test:asset-live -- --dry-run
```

Run the real image generation:

```bash
OPENAI_API_KEY=... npm run test:asset-live
```

A `.env` file is also loaded when present. Optional provider overrides are `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`, `OPENAI_IMAGE_QUALITY`, and `OPENAI_IMAGE_ENDPOINT`.

A successful run verifies that:

- a real `memory_reconstruction` `AssetGenerationJob` comes from the Thread Presentation planner;
- the live OpenAI image provider returns substantial PNG bytes;
- the credentialed Asset Generator writes a `GenerationRecord`, final immutable object and `StoredAssetReceipt` through `InfraDriver.objects`;
- the stored digest matches the receipt and final asset digest;
- publication re-verification succeeds against the smoke-test credential boundary.

The image and `evidence.json` are written under `artifacts/generated/asset-live/`, which is ignored by Git. The image call is real; credential embed/verify deliberately uses a process-local test signer so this command proves the Fibre generation path without claiming production C2PA signing. The existing local C2PA integration proof covers that separate provider boundary.
