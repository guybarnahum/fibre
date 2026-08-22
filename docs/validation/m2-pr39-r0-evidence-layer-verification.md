---
id: m2-pr39-r0-evidence-layer-verification
status: clear
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — R0 evidence-layer verification

## Result

**CLEAR — the post-H evidence-layer repairs are locally verified.**

Maintainer verification at:

```text
954e2b5d4e77b45e6ef0f832814351247aa94f3a
```

Observed:

```text
npm test
648 pass / 0 fail

npm run build
PASS

npm run validate
Repository validation passed.
World seed validation passed.

npm run genesis:h2-generate -- --preflight
H-V2 FINAL COHORT PREFLIGHT: ATTEMPT FROZEN — EXECUTION BLOCKED
Output root: artifacts/validation/m2-pr39/h/cohort-v2 [EXISTS — ONE-SHOT REFUSES RERUN]
No provider call was made.
```

The H-v2 inspection output also preserved the frozen H-v1 HOLD reference and exact canonical/provider Pass-B schema hashes:

```text
H-v1 freeze: 448bd669f742a566da289cc4117907f2d37e32e3
canonical Pass-B: sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
OpenAI transport: sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c
runtime: openai/gpt-5.1-2025-11-13
```

## What this clears

R0 is complete. The project may now freeze a pre-life G4-v3 mechanical reliability amendment and its off-cohort calibration protocol.

This result does **not** authorize:

- H-v2 rerun;
- replacement-cohort cognition;
- calibration before its protocol is frozen;
- G5 evaluation on H-v2;
- reuse of H-v2 life material.

Gate-G(2) remains the only authority that may later authorize replacement final-life cognition.
