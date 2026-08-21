---
id: m2-pr39-h2-schema-probe-result
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — H-v2 non-life schema probe result

## Result

**ACCEPTED — the single authorized H-v2 Pass-B transport-schema probe succeeded.**

Maintainer command:

```text
npm run genesis:h2-generate -- --schema-probe
```

Observed output:

```text
H-V2 PASS-B SCHEMA PROBE: ACCEPTED
Canonical schema: sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
Transport schema: sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c
```

The probe ran after H-v2 compatibility review CLEAR and after the manifest-only repository-validation amendment had passed context-pack generation, `npm run validate`, `592/592` active tests, and zero-call H-v2 preflight CLEAR.

## Scope

The probe is operational transport evidence only. It is not Genesis cognition evidence and creates no final-cohort life.

Frozen probe request:

```json
{"probe":"h2_pass_b_schema_transport_only"}
```

Frozen requested structured result:

```json
{"outcome":"not_remembered","episodeRefs":[],"rememberedContent":null,"uncertainty":[]}
```

It receives no World, genome, history, Thread identity, treatment assignment, prior memory, or cohort content. Its sole purpose is to establish that `openai/gpt-5.1-2025-11-13` accepts the H-v2 projected Pass-B strict schema.

## Schema witnesses

Canonical frozen Pass-B schema:

```text
sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
```

H-v2 OpenAI provider-wire schema:

```text
sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c
```

The successful probe therefore closes the exact operational defect that caused H-v1 to HOLD: provider request validation now accepts the reviewed H-v2 transport representation.

## Provenance limitation

The H-v2 probe CLI currently prints acceptance and schema hashes but does not persist or print the returned OpenAI provider request ID/token-usage provenance. This was already identified by the hostile H-v2 review as a nonblocking S3 carry-forward. Do not modify the reviewed H-v2 compatibility implementation before the founding cohort merely to improve this logging surface.

The durable evidence available for this probe is the committed implementation and binding, the exact command, fixed non-life input/output contract, model/runtime authority, maintainer-observed ACCEPTED result, and exact canonical/transport schema hashes above.

## Authorization consequence

The schema-probe prerequisite is satisfied. The next authorized provider activity is the **single H-v2 final-cohort attempt**:

```text
npm run genesis:h2-generate
```

Rules remain unchanged:

- `cohort-v2` must be absent before execution;
- H-v1 remains immutable and may never be rerun or reused as candidate life history;
- H-v2 has one whole-candidate attempt;
- no quality-driven regeneration;
- if H-v2 fails, preserve the failure and require H-v3 for any further compiler/runtime correction;
- if H-v2 produces `FIRST_INTEGRITY_VALID_FIVE_THREAD_COHORT_FROZEN`, freeze and commit all H-v2 cohort/database/evidence artifacts before running G5 diagnostics.
