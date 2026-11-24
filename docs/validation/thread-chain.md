---
id: validation-thread-chain
status: accepted
last-reviewed: 2026-11-23
canonical: true
---

# The chain, Thread by Thread

## Purpose

This measures whether low-level Body regulation produces what it is meant to produce. Each Thread is measured on its own, beside its genes and the life it lived, so genes and experience can be read against every link. Society-wide numbers are context, never the verdict (Guy, November 23).

The chain, each link able to fail on its own:

1. **Reading:** a book taken up is actually read.
2. **Body:** World's events move the Body as designed. A discovery lifts novelty; a lift has a discovery or something new behind it; weariness builds from sameness.
3. **Felt → did:** what the Body felt just before a decision changes what the Thread chose:
   - weary → takes up something other than its own book;
   - hungry for something new → a book on a subject new to it;
   - its unfinished book → goes back to it;
   - wants to tell → speaks, and tells what it just learned;
   - promise or warmth toward someone present → looks to them;
   - hungry for company → reaches out.
4. **Between people:** it spoke of a subject it held and the other did not, and the other heard it as new (teaching). Also: whom it warms to, and who brings it something new.
5. **Talk:** how its own talk reads to it (new, somewhat new, nothing new); World's meaning closeness of its exchanges to its earlier ones; how varied its talk is; how close its talk is to the others'.
6. **Width:** subjects held and depth; new subjects. Also, by meaning, how varied its interests are and how far they stand from everyone else's (individuation).

A good result at the end of the chain with a broken link before it is luck or drift, not the mechanism.

## How it is measured

- **Signals** are the Body's own levels, from the Body panel. They are taken one second before each decision moment (arriving somewhere, a conversation), so the choice's own consequences are never counted as its cause. Signals are never the Body's words.
- **Acts** are World records:
  - glances, recording which book was the Thread's own and what each is about;
  - reading stories;
  - knowledge events;
  - conversation stories;
  - recorded requests carrying their time.

  Glances recorded before World kept which book was its own are left out of book choices.
- **Coupling** is the difference in how often a Thread acts with the signal felt and without it. It counts only decisions where the act was possible. Counts are shown beside it, and they accumulate across runs, each decision once.
- **Meaning** is compared by embedding (bge-m3, the same model as World's same-ground measure), cached by text, never by counting labels.
- **Genes against links:** a rank correlation across Threads (for example exploration gain against weariness → another book). It shows a direction to look into, never proof, and is not claimed from fewer than four Threads.

## Running it

```
npm run world-observatory -- --env staging --label nov24
npm run model:captures -- --env staging --hours 24
npm run thread:chain -- --env staging --label nov24
```

The read stays under `.fibre/chain/` (Thread-private). Each run's decisions join the earlier runs', and each Thread's trend across runs is printed with its card.

## Reading it

- **When a link is broken,** fix that link before anything after it.
- **Before a Body change,** require the same direction over several days, in more than one view, and a coupling with enough decisions behind it.
- **When something is too strong** (for example, a Thread always goes back to its own book), adjust a shared parameter (species constant or genome spread), never add a rule.
- **Emergent behaviour has bands, not targets.** Absent means the forces are too weak; dominant means too strong.
