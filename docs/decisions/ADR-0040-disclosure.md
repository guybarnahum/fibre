---
id: adr-0040-disclosure
status: accepted
last-reviewed: 2026-11-22
canonical: true
---

# ADR-0040 — Disclosure: one process for every piece of information, decided by the Thread

**Accepted by Guy, November 22, 2026.** Concept: [Disclosure](../concepts/disclosure.md). It generalises the approved design for information items and foresight (sensitive information, slices I1–I3).

## Why
Until now World alone decided what the public saw of where a Thread lives, per home record (`publicGranularity`), with two defaults: "city" for a newborn and "hidden" for any other route. The architecture said so plainly: World disclosure policy, not evidence of the Thread's consent. Fibre's principle is that what a Thread reveals of itself is its own decision.

Guy (Nov 22):
- location is not special;
- any information goes through the same process, which affects Body regulation while consequences are imagined;
- that process reaches full, partial or no disclosure, in an opaque (by omission) or transparent (said openly) form;
- disclosure is per person and at a precision, not global;
- what is withheld from the public is omitted from every API.

## Decision
1. **One mechanism, no special kinds.** Information items are kinds of World fact (truth, partial versions, what knowing enables, the registry's cap). No kind has a decision path of its own.
2. **Who knows what is recorded fact.** Each telling (audience, extent, form, channel, reason, provenance) is appended to `information_disclosure_records`.
   - A person once told stays told.
   - The public knows what the registry was last told.
3. **The Thread decides, from age 5.** Only the Thread an item is about can record its disclosure. No operator route exists. Before a Thread decides, the registry's birth registration stands: the public sees the home city and the current venue.
4. **Every public surface reads within the public's knowledge,** including history:
   - public presents (`thread-public-present-v0.3`: `{ kind: "withheld" }` when withheld openly; `detailWithheld` when shown openly in part; no place when withheld by omission, indistinguishable from World knowing none);
   - discovery, the events list and the websocket replay;
   - the society view (a list of Threads that withhold openly; meetings placed no more precisely than every participant allows).
5. **The registry publishes a home at most to its city;** it never publishes falsehood.
6. **Place records keep only what World attests.** New private places default to city, so disclosure lives with the Thread, not with a record. A legacy hidden record stays hidden.

## Consequences
- **Context-only at first:** until the Thread decides (foresight, next slice), the birth registration stands everywhere, so nothing a viewer sees changes.
- **The causal path:** when a Thread decides, every public reader obeys immediately, history included.
- **Depictions already generated** for past presents keep the scene they were drawn from; new depictions of a withheld present show no identifiable place.

## Not chosen
- **A single public on/off switch per Thread:** it is not per person, has no precision, and makes location special.
- **Labels or rules by kind of information** ("addresses are sensitive"): rejected, as in the sensitive-information design. Consequence and the Body decide.
