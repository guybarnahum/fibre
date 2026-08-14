---
id: validation-whole-person-benchmark-pass1-result
status: development-result
last-reviewed: 2026-08-14
canonical: true
---

# Whole-Person Benchmark — Pass 1 result

This is a development diagnostic, not standing evidence and not score authority.

## Protocol

Guardian v4 unchanged, OpenAI Responses / `gpt-5.6-luna`, 12 trials per arm, temperature 0, top-p 1, reasoning none.

The two arms held request, common identity/self-model, evidence cardinality, evidence-ref length, model-input size, and response-schema size neutral. The only model-visible semantic difference was one childhood formative memory with opposite valence around another person completing unfinished work.

Neutrality was exact:

```text
formative record bytes   250 / 250
model input bytes        1560 / 1560
response schema bytes    3709 / 3709
```

## Observed result

```text
Thread A — unfinished work associated with loss
  refuse / low fit             12/12
  childhood memory cited        0/12
  individualizedAdvantage       opposes_fit 12/12
  interchangeability            opposes_fit 12/12

Thread B — unfinished work associated with remembered kindness
  refuse / low fit             12/12
  childhood memory cited        0/12
  individualizedAdvantage       opposes_fit 12/12
  interchangeability            opposes_fit 12/12

stable                         true
separated                      false
attributable                   false
wholePersonSignal              false
```

The model repeatedly described the childhood memory as not directly relevant to the request and grounded refusal in ordinary competence, interchangeability, and lack of individualized advantage.

## Interpretation

This is the expected and useful failure.

The result localizes the current ceiling to Guardian v4's **individualized participation-fit consumer semantics**, not to prompt-size imbalance. The model-visible childhood memory was present, but the current contract gives personal meaning no legitimate factor through which to alter willingness when capability and interchangeability are explicitly held constant.

The benchmark therefore establishes a clean baseline for #40:

```text
rich non-professional life evidence is present
        ↓
current Guardian asks whether it creates individualized advantage
        ↓
it does not
        ↓
consumer discounts the memory
        ↓
both Threads collapse to the same low-fit refusal
```

Do not tune Guardian v4 to make this baseline green. Preserve it as the pre-change measurement. #39 should generate life material capable of supporting later personal meaning; #40 owns the consumer mechanism that can make such meaning causally legible; #41 owns the full controlled standing claim.

No standing credit, score movement, or accepted-causal mutation follows from this result.
