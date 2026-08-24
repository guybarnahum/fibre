# Service Runtime Guidance

These instructions apply under `services/` in addition to the repository-root `AGENTS.md`.

Before changing a service, read `services/README.md`, the service README, and the relevant canonical domain/architecture docs. For work that claims an entity is rich, also read `docs/foundations/rich-life.md`.

## Boundaries

- Keep Fibre authority in the service/domain that owns it. Presentation, delivery, asset generation, and provenance plumbing must not become shadow identity, memory, history, meaning, or World authorities.
- External consumers use a service's documented public entry point. Do not require an application to import another service's private `src/*` implementation path.
- Keep deployment-specific code in adapters. Do not put `insidefibre.com`, Cloudflare, or another consumer's UI assumptions into provider-neutral Fibre semantics.
- Thread Presentation is non-cognitive. It projects already-authorized truth and may request visual reconstructions, but it does not invent biography, memories, meanings, relationships, or world facts.
- Asset Generator executes an admissible generation brief and records provenance. It does not decide what should be shown or what a generated result means.

## Rich entity tests

Major Fibre entities need semantic richness regression coverage, not only schema validation. At minimum consider Thread/person, experience/history event, world/place, relationship, memory, meaning, embodiment, and genome/lineage.

A richness test should prove meaningful structure such as temporal continuity, social/world embedding, resolved cross-references, selective memory versus history, grounded meaning, differentiated context, or downstream causal consequence. Do not use field count or prose length alone as evidence of richness.

If a service only projects an entity, test the projection contract here and keep the authority/causal richness test with the owning runtime domain.

## Names

Runtime names describe capability or semantics, not development chronology.

Do not introduce PR numbers, milestone labels, stage/slice names, Pass A/B/C labels, or `-vN` implementation suffixes into durable service/source paths unless the name represents a real compatibility boundary that must coexist in code. Prefer version identifiers inside serialized contracts.

Historical fixtures, migrations, gates, and validation artifacts may preserve chronology in their quarantined locations. Existing active-runtime exceptions are tracked in `services/runtime-name-debt.md`; do not expand that set.
