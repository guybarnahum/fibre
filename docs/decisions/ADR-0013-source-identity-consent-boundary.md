---
id: adr-0013
status: accepted
date: 2026-08-15
supersedes-in-part: ADR-0006
---

# ADR-0013: Source identity consent boundary

## Context

ADR-0006 accepted Original, Echo, and Homage identity orientations but did not define a hard eligibility boundary between a living-human Echo and a Homage. That leaves a reachable semantic bypass: a living identifiable person could be modeled without consent merely by calling the result a Homage or public-source derivative.

Fibre also needs an explicit rule preventing a source person's documented biography from being laundered into the artificial Thread's own autobiographical history.

## Decision

ADR-0006's Original/Echo/Homage taxonomy remains accepted, with the following binding source rules:

1. **Living identifiable human -> Echo only with documented consent.**
2. **Homage source subject -> deceased or fictional.**
3. No combination of origin mode, public-source availability, generated-source framing, or source influence may bypass the living-human consent requirement.
4. Human-source status is explicit, attested, and provenance-bearing rather than inferred from source metadata:

```text
subjectStatus:
  consenting_living
  deceased
  fictional
```

5. `deceased` removes only the living-person Echo consent requirement. Estate, family, cultural, likeness, trademark, or other rights may still constrain a particular use.
6. **A source person's life is not Thread history.** Source facts remain source facts. They may shape a Thread through an actual event that happens to the Thread—such as reading, studying, hearing, discussing, admiring, rejecting, or reinterpreting the source—and the Thread's memory/meaning of that encounter is its own.

## Consequences

- Echo tooling and fixtures must require a consent/provenance record for a living identifiable source.
- Homage tooling and fixtures must reject living identifiable subjects and require explicit deceased/fictional attestation.
- Composite source/origin paths must be tested so a caller cannot bypass the rule by relabeling the source.
- Public availability, fame, biography, Wikipedia metadata, or other source visibility does not itself authorize modeling a living person.
- Historical/source biography may be referenced as source evidence but may not be rewritten as first-person Thread autobiography.
- At maturity, an Echo or Homage Thread remains its own persistent person and may reinterpret or reject the source orientation subject to preserved historical provenance and rights constraints.

## Relationship to ADR-0006

ADR-0006 remains authoritative for Fibre's support of Original, Echo, and Homage identities and for mature Thread re-authorship. This ADR supersedes it only where source eligibility, living-human consent, and source-history boundaries were previously unspecified.

The broader personhood canon is [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md).
