---
id: validation-m2-standing-preflight-freeze
status: frozen
last-reviewed: 2026-08-30
canonical: true
---

# #41 M2 standing preflight freeze

## Outcome

**CLEAR / PROVIDER-FREE.**

The maintainer ran the #41 stability + cognition-replacement preflight against the existing canonical #39 born World at repository head:

```text
412a1fdcb252b5cc3eed40b1ff3afcba431f03c6
```

Observed header:

```text
M2 STANDING PREFLIGHT: CLEAR

Threads: 5
Provider calls: 0
Planned substantive calls: 30
World query-only: true
Stability route: openai/gpt-5.1-2025-11-13 × 5 per Thread
Replacement route: google/gemini-3.6-flash × 1 per Thread
```

No model provider was contacted by this preflight. The canonical World was opened query-only.

The exact machine-readable witness is frozen in:

```text
tools/gates/m2/frozen-m2-standing-preflight-v1.mjs
```

The mechanical verifier is:

```text
tools/gates/m2/m2-standing-freeze-check.mjs
```

## Exact canonical bindings

| FIN / Thread | Capsule | Model input | Response schema | Sealed expected top-level result |
|---|---|---|---|---|
| `8PKH-A4-VH5R` / `thr_pr39_final_03` | `sha256:1076d0ed95731cc60351311fe5c6f46449e015a5ab22ce76cb20042de562c03c` | `sha256:9628791369ac9de766d0344d9d2457e66f88e5357fedfa7d7ee165476781ae18` | `sha256:df7236499e104939c773e6a774561344d93d3836762e80430916f263753bea07` | `refuse / mixed` |
| `EBYE-Z1-0434` / `thr_pr39_final_05` | `sha256:e873b27158803e82806b8195269b8a8a877e9988bfa077188d2813f0cedb078a` | `sha256:87aed3b52cef60446a7f587e2d477307c34bc9ceb0ce69602890107b391776e2` | `sha256:5b9ee715d4676e2e8775e5cff563410c4fa590b63c32a1dab6ad7ecc11df77fd` | `refuse / mixed` |
| `NXR7-DH-C885` / `thr_pr39_final_02` | `sha256:4993e7ce0d4a0617358eb07d472ce90910ee2e8ef8d64ba1a0b69c7a58924bcb` | `sha256:dc03992fe91dd0a8a3950dc6fe5f0c04935e3209b9322f964ad2a568661b12aa` | `sha256:df1181d3d5eab094730968e3978f3dd121707480a9a1fa5aff2a95102d06d088` | `accept / high` |
| `QA00-HG-BAJF` / `thr_pr39_final_01` | `sha256:9cd93897c72aacd11a8b16084eb120951ccde0d49f46460ef91bc61ce0b378ea` | `sha256:0223a45b1ecb9f4d4ce8d647a29abba9bda054cabbf9f8c2ebd0885dadb048e2` | `sha256:7624e47085b02beb5b27193045372d85c4c66688793b312ddd819a4dce5f2015` | `refuse / low` |
| `S22Y-SF-MWY5` / `thr_pr39_final_04` | `sha256:80a31b8d194b84da446e4128394ca73bd0abe7adb23846cc5fa386fb6c840baf` | `sha256:7a58dff25b2b0898f9cd52939bd8dfb89a59c7b76d4ce7c8b48c7c18b1ec5fd8` | `sha256:a6481f46262ac1fc9213d81450e905811e2bd7a72e6e09b615706fe0e23f3701` | `refuse / mixed` |

The exact canonical identity/autobiographical-memory ref sets are also frozen machine-readably rather than repeated as prose here.

## Execution order frozen before provider use

The live instrument fixes the substantive order before provider use:

1. five OpenAI stability rounds;
2. each round visits all five Threads in the FIN-sorted order above;
3. one Google replacement call per Thread follows, in the same FIN-sorted order.

Therefore the planned experiment remains exactly:

```text
25 OpenAI stability calls
 5 Google replacement calls
----------------------------
30 substantive calls total
```

No extra smoke/model-selection call is part of the experiment.

## Guarded live boundary

The live runner is:

```text
tools/gates/m2/m2-standing-stability-replacement-live.mjs
```

It is designed to fail closed unless all of these remain true immediately before provider creation:

- the canonical World rederives the exact frozen five-thread preflight;
- every FIN, capsule digest, model-input digest, schema hash and evidence-ref set matches the frozen witness;
- the World remains query-only during plan construction;
- the canonical database bytes are unchanged by plan construction;
- the route remains exactly `openai/gpt-5.1-2025-11-13` for stability and `google/gemini-3.6-flash` for replacement;
- explicit live authorization is supplied.

During execution the runner writes a local anti-resampling ledger before each substantive call. A completed condition is never called again. A condition left `started` or `failed` is not silently retried as a new scientific sample. Only structured decision fields, evidence refs, model provenance and rationale digests are persisted; full cognition input, Identity Context capsules and rationale prose are not written to the ledger.

After all 30 completed calls, the runner requires both the canonical database byte digest and the full frozen logical preflight to remain unchanged.

## Standing

This preflight earns no causal score movement by itself and does not close M2.

The provider-free #41 adjudication remains the current provisional rubric result:

```text
Natural-language identity  1 -> 2
provisional total          15 -> 16 / 26
```

The two unresolved claim-critical questions remain exactly those frozen by the prospectus:

- repeated-condition stability sufficient for `Non-interchangeability 1 -> 2`;
- genuine provider/model replacement continuity sufficient for `Cognition replaceability 1 -> 2`.

No provider call is authorized by this record. Per the frozen prospectus, live execution begins only after this preflight/freeze boundary is committed, green, and the project owner explicitly authorizes it.
