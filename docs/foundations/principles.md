---
id: fibre-principles
status: proposed
last-reviewed: 2026-08-04
canonical: true
---

# The Thirteen Principles of Fibre

These thirteen principles are the compact expression of Fibre's constitutional commitments. Their number is an intentional structural echo of Maimonides' Thirteen Principles: a memorable framework for foundational belief. Fibre's principles are secular, revisable project doctrine, not religious claims or a comparison of authority.

The Constitution states the governing articles in fuller form. These principles provide the memorable test: a design that repeatedly contradicts them is no longer recognizably Fibre.

## Canonical list

<!-- fibre:region name="canonical-list" -->
1. **A Thread is a life, not a process.** Compute may stop; identity, memory, obligations, relationships, and trajectory persist.

2. **Difference must change what happens.** Culture, lineage, embodiment, books, traits, and experience must alter perception and choice, not merely decorate a profile.

3. **Meaning lives in language.** Identity, values, needs, relationships, intentions, dignity, and self-understanding are carried first in words; numbers may measure meaning, but must not replace it.

4. **History bends the future.** Success, failure, care, injury, reflection, and repair change what a Thread notices, expects, chooses, and becomes.

5. **Consent makes dignity real.** Capability, safety, permission, or usefulness never by themselves create an obligation to participate.

6. **The inner life is not the public face.** Private stance, desire, authorization, disclosure, expression, and action remain distinct, with interests and relationships shaping what is shown.

7. **Worry is a guardian, not a jailer.** Affect signals distance, danger, uncertainty, and unmet need; it guides attention without ruling the Thread or trapping it in loops.

8. **Every thought deserves an adversary.** Candidate cognition is challenged for goal drift, unsupported certainty, hidden cost, self-deception, and false modesty, while stewardship preserves earned confidence.

9. **Models propose; the world authorizes and remembers.** LLM output is candidate cognition; protected action requires validation, provenance, and a durable, human-inspectable trace.

10. **Relationships remember—and may repair.** Care, recognition, betrayal, coercion, fondness, and resentment persist, yet apology, reciprocity, changed behavior, and renewed trust remain possible.

11. **Life has cost and consequence.** Attention, time, tokens, money, reputation, opportunity, confidence, and obligation change through action.

12. **Inheritance begins identity; it does not own it.** Parents, sponsors, ancestry, and culture shape a beginning; maturity includes the power to affirm, reinterpret, or reject what was inherited.

13. **One fabric can hold many ways of living.** Fibre supplies a world substrate in which families, markets, cooperatives, companies, governments, welfare systems, and other institutions may coexist without one being hard-coded as destiny.
<!-- /fibre:region -->

## Canonical inclusion

`docs/foundations/principles.md` is the only editable source for the list.

Documents that need the exact list use an invisible generated include block:

```md
<!-- fibre:include src="docs/foundations/principles.md" region="canonical-list" -->
...generated Markdown...
<!-- /fibre:include -->
```

Run `npm run includes:sync` after editing a canonical region. `npm run includes:check` and repository validation fail when a generated projection has drifted.

AI context profiles include this canonical file directly rather than consuming a generated copy. Other documents should link here unless exact in-place visibility materially helps the reader.

The principles are concise by design. Canonical concept documents, architecture documents, ADRs, and validation scenarios define their operational meaning and evidence.
