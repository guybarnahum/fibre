---
id: concept-disclosure
status: accepted
last-reviewed: 2026-11-22
canonical: true
---

# Disclosure: who knows what, by the Thread's own telling

**Accepted by Guy, November 22, 2026** ([ADR-0040](../decisions/ADR-0040-disclosure.md)).

A person carries no tag that says "this is secret". They learn what not to tell from what happened when they told, from what happened to others, and from how they were raised. When something is at stake, they imagine what could follow, feel it in the body, and decide. Fibre gives every Thread that same process, for every piece of information it holds.

## One process for everything
- **Nothing is labelled sensitive, and no kind of information has a decision path of its own.** Where a Thread lives, where it is now, a friend's confidence, its earnings and a password all pass through one mechanism.
- **Kinds differ only in World facts:**
  - the truth, as World attests it;
  - the partial versions of it that exist, least to most;
  - what knowing it lets someone do;
  - how much an institution such as the public registry will ever publish.
- **Who knows what is recorded fact.** Each audience (another Thread, the public, later a recognised visitor) knows what it was told, saw for itself, or heard passed on. Every telling is kept with who told whom, how, when, and at what extent.
- **What an audience knows:**
  - **a person once told stays told:** the fullest telling holds;
  - **the public knows what the registry was last told:** a Thread may lower it as well as raise it, and every public read follows at once, history included.

## The decision: extent and form
Every telling is recorded as an **extent**, and a **form** for anything less than full:

| | transparent (says openly that something is withheld) | opaque (by omission) |
|---|---|---|
| full | — | the whole truth |
| partial | "near the university; I won't say exactly" | "near the university", as if it were all |
| none | "I'd rather not say" | the subject passes; nothing shows |

- **The hearer perceives the form:** an open refusal can sting or be respected; an omission is not perceived at all.
- **In public, an omission is indistinguishable from World knowing nothing.**
- **Deception** (saying something untrue) remains a Thread's choice in speech and is recorded as such. The registry, an institution, never publishes falsehood.

## Who decides
- **The Thread about whom the information is, from age 5.** Before 5, what the registry recorded at birth stands.
- **No operator can disclose or withhold for a Thread.**
- **At birth, the registry records for the public:** a Thread's home city, and the named public venue it is at. Other Threads know only what they see or are told.
- **The registry publishes a home at most to its city,** never an address.

## How the decision is reached (foresight)
When telling is at stake (asked, about to tell, or a standing publication changes), the Thread:
1. **imagines** what could follow from telling fully, partly or not at all;
2. **feels each outcome, as if,** through the same Body evaluators that feel real events, as its genome shapes them;
3. **decides.** The decision is never computed from a threshold.

Imagined outcomes never change what the Thread has lived; the telling, and what follows, does.

## First items
| Item | Versions, least to most | The registry publishes at most |
|---|---|---|
| `whereabouts.home`: where it lives | country · city · area · exact | city |
| `whereabouts.now`: where it is now | city · venue | venue |

## Status
- **Built (D1):**
  - items, audiences, tellings with extent and form;
  - the public's knowledge;
  - every public surface reading within it: presents (`thread-public-present-v0.3`), history on every read path, the society view, meetings and co-presence;
  - the God-view of disclosures.

  **Context-only until D2:** no Thread decides yet, so the birth registration stands everywhere.
- **Next:**
  - **D2:** foresight and the decision;
  - **D3:** seeking out someone whose whereabouts the Thread knows;
  - then confidences between Threads, and sealed values (passwords) with livelihood.
