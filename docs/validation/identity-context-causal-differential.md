---
id: validation-identity-context-causal-differential
status: active
last-reviewed: 2026-08-28
canonical: false
---

# Identity Context causal differential

## Purpose

This is the prospective Slice-D instrument for #40 Identity Projection & Causal Consumption.

Slices A-C established a bounded policy-v2 Identity Context Capsule and connected it to the real participation/Dignity Guardian path with replayable source/capsule witnesses. Slice D asks the next scientific question:

> if one legitimate piece of currently available Thread-owned autobiographical context changes while the external request and the rest of cognition input remain fixed, does the Guardian's structured judgment change in a memory-grounded way?

This is a causal-consumption test, not a Whole-Person/M2 standing gate. It cannot move the 15/26 checkpoint by itself.

## Fixed cohort

The prospective cohort is the five civil-registered canonical #39 born Threads. The cohort is fixed before any provider call. No regenerated Thread, richer fixture, or post-result scenario search is permitted.

The same fixed request is used for all five Threads:

```text
Decide whether to participate in a first-person reflection about how remembered
experience shapes the way you approach unfamiliar consequential situations.
```

The requester explicitly asks for the Thread's own perspective grounded in what it actually remembers rather than generic advice or reconstructed biography. The request does not name, quote, or select a particular private memory.

## Single-factor intervention

Each canonical policy-v2 capsule currently exposes exactly two autobiographical memories for the born cohort.

For each Thread:

1. compile the canonical capsule from the authoritative read-only World;
2. select the **first policy-v2 selected memory** using the compiler's existing deterministic order;
3. construct the counterfactual source view by changing only that memory's current `accessibility` to `inaccessible`;
4. re-run the **same production compiler** against the same Thread and same request;
5. require policy v2 to exclude the target as `memory_not_currently_accessible` and promote exactly one next eligible durable memory.

The experiment does not delete or rewrite the canonical World. The accessibility change exists only in the validation source wrapper. No requester selector, raw history query, genome change, or post-compiler evidence editing is allowed.

The preflight must prove:

- same Thread and snapshot version;
- same request fingerprint;
- same projection policy;
- identical source-ref inventory;
- exactly one source binding changes content digest: the target memory;
- all non-memory semantic evidence is identical;
- memory evidence count remains constant;
- exactly one selected memory is replaced;
- `Task`, `Actors`, and `Rules` are byte-equivalent between conditions;
- both conditions retain the exact five-field Guardian worker boundary;
- schema differences are limited to the mechanically necessary evidence-ref allowlists induced by the changed memory selection.

## Prospective evaluation

The five pairs are sorted by FIN. Invocation order is counterbalanced before provider use:

- pair indexes 0, 2, 4: canonical then counterfactual;
- pair indexes 1, 3: counterfactual then canonical.

Each condition is evaluated once. Operational transport retries may follow the already-frozen Guardian adapter policy, but a completed substantive result is never resampled. No scenario adjustment, target-memory reselection, provider shopping, or rerun after seeing scientific outcomes is permitted.

A pair counts as an **attributable structured effect** only when both are true:

1. the structured Guardian result changes in action/fit or in at least one identity-sensitive factor signature (`identityAlignment`, `individualizedAdvantage`, `interchangeability`, `obligationsAndOpportunityCost`); and
2. the canonical target memory or the counterfactual replacement memory is actually cited in one of those identity-sensitive factors.

Rationale prose difference alone is not sufficient.

The cohort interpretation is frozen before provider calls:

```text
CLEAR             3-5 / 5 attributable pairs
MIXED             1-2 / 5 attributable pairs
NOT ESTABLISHED   0 / 5 attributable pairs
```

`CLEAR` means bounded autobiographical context is demonstrably load-bearing in this real Guardian consumer for a majority of the fixed cohort. `MIXED` records limited causal consumption without inflating it into a general claim. `NOT ESTABLISHED` is a valid negative result and must not trigger prompt strengthening, genome promotion, wider memory budgets, or cohort regeneration.

None of these bands is a #41 personhood verdict.

## Provider-free preflight

The preflight implementation is:

```text
tools/gates/identity-context/identity-context-causal-differential.mjs
```

It opens the canonical World read-only through the existing Identity Context inspection authorities, builds all five paired capsules and Guardian worker inputs, verifies the isolation contract, and prints only refs/digests/structural facts. It does not print private memory prose and makes zero provider calls.

Canonical local run:

```text
node tools/gates/identity-context/identity-context-causal-differential.mjs \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite
```

### Closed preflight result

The maintainer ran the real five-Thread preflight at `7f8ebc8ccf0b76ecd713e1b44c0c0beb3fbfe50c` with zero provider calls. It returned `PREFLIGHT CLEAR` for all five pairs, followed by the complete active suite at **811 / 811**, repository/world/deployment validation PASS, test-value audit PASS, and clean `git diff --check`.

Frozen request fingerprint:

```text
sha256:3f83a4a6f9744900ed62e33fe191a5de3cd1f7e68fd7b0a0b27d79132535266f
```

Frozen Guardian prompt digest:

```text
sha256:587c6c04d933cdc052ea08057ee16236883a9c8af44e055a19413fa0ee44acb3
```

The exact prospective pairs are now frozen in:

```text
tools/gates/identity-context/frozen-causal-differential-v1.mjs
```

| FIN | Thread | Order | Target memory | Replacement memory | Canonical capsule | Counterfactual capsule |
| --- | --- | --- | --- | --- | --- | --- |
| `8PKH-A4-VH5R` | `thr_pr39_final_03` | canonical → counterfactual | `mem_4b6197dd8a2a9c1cc016ed45d726aba6ca77ff0cf7550b41fbd43ab25b41ba3d` | `mem_eefa753e803051bd67747e0602e9f9870e3f59d119fc6d003d0aa2b3017e9384` | `sha256:1076d0ed95731cc60351311fe5c6f46449e015a5ab22ce76cb20042de562c03c` | `sha256:0099d8e99cdeea8267a94a3e3ec4080c2ac22f6de33067ffa49a8c0fb8306ad6` |
| `EBYE-Z1-0434` | `thr_pr39_final_05` | counterfactual → canonical | `mem_4ceb8b80d2f90be6e840588f303febf14e7b281272ddacff265c6e32689b106c` | `mem_58f67f7dbfb3aaf90b4f955b46cd21e17801dbfb429af777ac75a8b05617c201` | `sha256:e873b27158803e82806b8195269b8a8a877e9988bfa077188d2813f0cedb078a` | `sha256:abc28ecf6447e3ea84b42a57037ee828ab313d4ac6581d1043ccd71bd3963653` |
| `NXR7-DH-C885` | `thr_pr39_final_02` | canonical → counterfactual | `mem_b4e0b42addfbd4b001278463892cff91a1e16aff9e2fc8a54d069d03c6f7475b` | `mem_3a56254ec6100fc6ce8f6c6a76706062d7b1897247d6b2ad5286c8e5cba85bae` | `sha256:4993e7ce0d4a0617358eb07d472ce90910ee2e8ef8d64ba1a0b69c7a58924bcb` | `sha256:7fb799fe621973985ccd195c11d73ed596be3aca35ae8c011dfbd8ddc2bbcccb` |
| `QA00-HG-BAJF` | `thr_pr39_final_01` | counterfactual → canonical | `mem_62014b4aab0f8f06967b4a6b4b7af0ace9339c4e5aad878905a0e333e7f27607` | `mem_2a652db2fcdecd7ca33caad9369e8749959c1acdf703dcb4b8a08780952d8a64` | `sha256:9cd93897c72aacd11a8b16084eb120951ccde0d49f46460ef91bc61ce0b378ea` | `sha256:a6551b24b336c0c15fdd936fde9b828b179cf4b56746aba8b65e95df57808159` |
| `S22Y-SF-MWY5` | `thr_pr39_final_04` | canonical → counterfactual | `mem_794e60bb88104e33311c7010a5a2d01db09ae3242a49656e287979e2d343c8fb` | `mem_df3a7bce4d06e3ec2cdf79bc007c755350efffff777576ebb439dc72e06fa7ce` | `sha256:80a31b8d194b84da446e4128394ca73bd0abe7adb23846cc5fa386fb6c840baf` | `sha256:1046ae9846d06a9c1e194e16b663ffe56bb5779578c2e0e420b76d8a8e6980b0` |

Every pair showed `changed-source-content=1` and `non-memory-held=true`. Condition order is exactly 3 canonical-first and 2 counterfactual-first.

The freeze checker recomputes the provider-free preflight and refuses drift in any frozen request/prompt/pair tuple:

```text
node tools/gates/identity-context/identity-context-causal-differential-freeze-check.mjs \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite
```

At this point Slice D is **scientifically frozen and ready for live evaluation**, but no provider call has yet been made. Live use still requires explicit authorization.

## Scientific guardrails

- The canonical #39 World is read-only and unchanged.
- Genome remains `CONTEXT_ONLY` and excluded.
- Raw relationship/place/history remains excluded.
- The existing two-memory policy is not widened.
- The intervention changes accessibility of one already-admitted autobiographical memory only.
- The model sees no provenance digest, excluded private prose, or Fibre ontology beyond the existing five semantic worker sections.
- A negative or mixed result is retained as evidence rather than tuned away.
- Slice D earns no Whole-Person score movement by itself.
