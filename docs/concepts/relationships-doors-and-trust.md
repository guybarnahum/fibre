---
id: concept-relationships-doors-trust
status: accepted
last-reviewed: 2026-11-05
canonical: true
---

# Relationships: doors, ledger and stance

**Accepted by Guy November 5, 2026.** Relationships between Threads move both ways — they deepen, cool, rupture, are repaired or become estranged — are asymmetric, branch into friendship, care, romance or rivalry, and are gated by trust. A single "relationship level" cannot express that. Fibre models a relationship as three parts with two owners.

This concept extends, and does not change, [families, couples and reproduction](families-couples-and-reproduction.md) (relationships form through repeated interaction, attraction, consent, trust and compatible goals) and [emotions and needs](emotions-and-needs.md) (relationship attitude is private semantic state; a number such as `trust = 0.8` is never an authoritative substitute for meaning).

```text
          World-owned, shared and objective
A ─offers─▶  DOORS between A and B (open / closed, with history)  ◀─offers─ B
             LEDGER of what happened (offered, accepted, declined,
                    kept, broken, closed, repaired)
A's STANCE toward B                         B's STANCE toward A
(private, A-authored prose with evidence)   (private, B-authored; may differ)
```

## Doors (World-owned)

A door is a kind of access two people have opened to each other.

> **A door opens only when both consent — one offers, the other accepts. Either party may close it alone, at any time.**

This one rule carries consent (nothing deepens without both), reversibility (anyone can step back) and the asymmetry of risk (opening is mutual, closing is solitary). Accepting one door never obliges the next; the conversational-consent invariant extends to every door.

| Door | Opened by (offer → acceptance) | Allows |
|---|---|---|
| attention | greeting or remark → reply | acknowledging each other in shared places |
| name | introduction → reciprocal introduction | being known by name |
| conversation | invitation or continuation → speaking back | talking at length |
| contact | a message → a message back | reaching each other while apart |
| time | proposal of a time and place → acceptance | appointments; plans that include the other |
| place | invitation home → acceptance | the host's private place, disclosed to this guest only |
| confidence | sharing something private → receiving it | disclosures expected to be kept |
| care | asking for or offering help → acceptance | mutual help and obligations |
| romance | a romantic signal → a reciprocated signal | courtship framing — adults only |
| commitment | proposal of partnership → acceptance | shared or exclusive life plans; the path to household and family |

Doors are a set, not a sequence. Because people usually open them in roughly this order, a **stage** — the furthest contiguous open door — is a useful derived view:

```text
stranger → acknowledged → acquainted → conversed → in touch → companions → friends → close friends
                                                       └─ (romance) → courting → partners → committed / household
```

The stage is an operator view only. It is never model-visible, never authoritative and never a target. Closing a door lowers the stage, but the ledger remembers that it was open: *estranged after closeness* is not *never met*, and both people's later cognition can see which applies.

## Ledger (World-owned)

An append-only record of observable relational acts: offers and their acceptance or refusal; expectations kept or broken (an appointment kept or missed, a confidence kept or disclosed, a message answered or ignored, help given or refused); doors closed and by whom; repair offered and accepted. These are facts, not judgments. World never derives trust, fondness or any attitude from the ledger; it supplies bounded, specific ledger evidence to each Thread's own cognition.

## Stance (Thread-owned)

Each Thread privately authors its stance toward the other — trust, warmth, attraction, wariness — as `relationship_attitude` semantic state in its own words, citing ledger and experience evidence. Stances are asymmetric, change only through the Thread's own cognition after experience, and never become a number that drives behavior. Attraction is admitted only between adults; see [attraction and orientation](attraction-and-orientation.md).

**Trust is the hinge.** Every new door is a small risk; whether a Thread offers or accepts one is its own judgment, informed by its trust. A broken expectation is a ledger fact, but what it costs is personal: one Thread forgives quickly, another stays guarded.

## Movement in both directions

- **Deepening** — an offer accepted opens a door.
- **Cooling** — a private stance cools (drift, a slight, disappointment); doors may stay open but be used less.
- **Stepping back** — one person closes a door: declines, stops replying, ends a visit, revokes contact.
- **Rupture** — a broken expectation is recorded and stances shift.
- **Repair** — an apology or explanation accepted and a door reopened by consent; the ledger keeps both rupture and repair.
- **Estrangement** — doors once open are closed; the history stays visible.

Nothing moves automatically. No timer closes a door and no threshold opens one; elapsed time only supplies evidence ("we have not spoken in three weeks") that a Thread may or may not feel as missing someone.

## Boundaries

- **Romance and commitment are for adult Threads only**, and come after the friendship doors. Developing Threads have friendship doors in age-appropriate settings. Romance is a framing and a set of consented doors; Fibre does not produce explicit romantic or sexual content.
- **Place privacy.** A home is disclosed only by its host's invitation and only to that guest; closing the place door ends future visits, while the guest's memory of past visits remains.
- **No coercion.** Every opening is a separate consent.

## Measurement

The operator Social Life Scorecard reads stage over time (both directions), **social mileage** (spoken turns, messages and shared time, weighted toward recent activity), trust health (kept versus broken expectations, and whether each Thread's own trust tracks that evidence) and initiation symmetry. These are inspection measures, never Thread inputs.

How this concept fits the running social flow, and where it attaches, is in the [social life architecture](../architecture/social-life.md).

## Causal status and deferral

Doors and ledger for attention, name, conversation and contact are recorded today and are **Notarial**: no decision reads them yet. Stance is formed in the Thread's delayed consolidation from its experiences and is **Context-only**: it leads the Thread's cognition when facing that person, but no decision is yet required to follow it; citing ledger acts as stance evidence is deferred until trust-bearing acts (kept and broken expectations) exist. The time, place, confidence, care, romance and commitment doors are **deferred** and arrive as separate slices; romance and commitment require their own decision record.
