# Third-party integrations

Concrete adapters for external AI/media services live here. They are **not** `InfraDriver` implementations and must not select storage, queues, workflows, cloud infrastructure, or deployment topology.

Current layout:

```text
integrations/
  ai/
    reasoning/
      openai.mjs
      google.mjs
    image/
      openai.mjs
      bfl.mjs
```

`services/` owns Fibre semantics and inward-facing contracts. `infra/deployments/` owns provider/profile/secret selection and executable composition. `infra/providers/` owns reusable physical infrastructure adapters.

The small contract bridge modules under `integrations/ai/` intentionally point inward to service-owned contracts so concrete adapters can implement those contracts without copying Fibre semantics. Services must not select concrete providers, and integrations must not know Fibre service topology.

Fibre-native embedded media proof is not a third-party integration. FIN card proof is implemented inside Fibre; if Asset Generator later embeds signed PNG provenance, it should reuse/extract that native proof primitive rather than add another external integration.
