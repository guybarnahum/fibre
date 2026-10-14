---
id: architecture-social-discovery-oracle
status: accepted
last-reviewed: 2026-10-14
canonical: false
---

# Guy: social discovery oracle and public directories

## Accepted purpose

**Discovery of social opportunity is essential to a lived society.** People, including Threads, must be able to seek places, activities, communities and other people without already knowing who will be present. Fibre must not become a closed social directory or require every social destination to be registered by Fibre.

**Guy** is the *named social-discovery oracle*: an information interface that a Thread or human can voluntarily consult with ordinary questions such as:

- “I'm in Tel Aviv. Where could I go to meet people?”
- “Where might I meet a Thread in London?”
- “Is there somewhere nearby to read, talk, or join a discussion?”
- “Are there public gatherings where humans and Threads can participate?”
- “What is there to do socially this weekend?” (grounded in the questioner's actual locality/time)

The oracle's name does **not** designate a Thread, person, companion, private friend, social gatekeeper or agent empowered to act for the asker. It retrieves and explains possible *external opportunities*. It does not manufacture the asker's internal motive or oblige them to go.

### The principle

> **A place offers a possibility of meeting, not a promise of company.**

These are separate truths, with no promotion from one to the next:

1. **Place opportunity:** a real, discoverable place has activities or social affordances.
2. **Public gathering:** a real event is announced/scheduled, without a guarantee of attendance.
3. **Thread intention:** a person privately or publicly intends to visit; intention is not presence.
4. **World presence:** an actual person's CurrentSituation enacts being there; disclosure is separate.
5. **Social encounter:** actors independently notice, initiate, reciprocate, decline or do nothing.
6. **Meaningful connection:** individual Experience and later relationships may or may not follow.

An empty visit is not a failed system operation. A Thread may feel disappointed or relieved, do something else, and form her own later interpretation. Neither Guy, a public listing, a visitor, nor a test harness fills empty venues with simulated attendees or retries interactions until social satisfaction occurs.

## Multiple directories, no monopoly

**Fibre Places** is Fibre's own public directory of World-grounded places and eligible published activities. It is one source of discovery, *not* the only one. Guy may draw from multiple independently operated public directories: municipality/community venue lists, event and cultural calendars, OpenStreetMap-derived venue references, publicly accessible event providers, venue websites, and future directories operated by Threads or humans. The specific upstream sources remain selectable and replaceable; do not build a blanket crawler merely to establish this capability.

Two distinct outward paths are permitted:

- **Consume/query other directories.** Guy can incorporate bounded, attributed public findings, including unfamiliar venues not yet admitted to Fibre's World. A third-party listing is evidence of what its source advertises, not automatic World admission, opening-hours certainty, person presence or consent.
- **Publish to other directories.** Fibre offers stable, public, indexable place/activity pages and machine-readable data where appropriate; other independent directories/search engines may link, index or list the same *real place* or *real public gathering*. External publication follows the provider's actual process and eligibility; it is not automatic listing success or a fictional new business on someone else's property.

Allow more than one source result for the same place, with stable external IDs, origin URL, retrieved/observed time and relevant source attribution. Deduplicate against already admitted shared World venue identity when actually supported; matching names alone do not merge venues. Conflicting source statements remain attributed uncertainties, not invented consensus.

The smallest source vocabulary needed for discovery is **place / opportunity or activity / locality / type of participation / public URL / source and freshness**. Source-specific credentials, imported event histories, a universal ontology, a global persons index and continuous sync are outside the initial scope.

## Askers, answers and authority

Guy presents *possibilities* in conversational language, supported by a bounded list of source-grounded candidates and plain statements of uncertainty. The same discovery semantics serve two clients:

- **Thread consultation:** a Thread chooses to seek information within existing Interior Cognition / Flight Planning as one possible response to its own interests, social pressure, curiosity or practical needs. Its question and any eventual choice remain Thread-owned. Answers are informational World/external context, never a prescribed Flight Plan, need, feeling, social contact or reliable attendance claim. A small local result set is provided only when useful, not every pulse or on every dormant boundary.
- **Human consultation:** public Inside Fibre can offer Guy as a conversational entry point, a browseable `/places` directory, stable venue and genuine gathering pages, and eventual outside search-engine discovery. Humans may seek to meet other humans, Threads, or both; these must not be silently conflated.

The oracle must distinguish:
- **Human social opportunity:** real places/events where people may gather; it may be empty and Guy does not know who will attend.
- **Thread social opportunity:** World-grounded places/activities relevant to a Thread; Fibre's directory may not know whether any Thread is there.
- **Mediated human–Thread participation:** a verified digital entry point or institution-supported interface, **not** evidence that a digital Thread is physically visible or available to speak at a brick-and-mortar location.
- **Actual disclosed attendance/availability:** only admitted, current, public exterior facts under the relevant publication authority, never inferred from a plan, registration, directory listing, or private home.

A request such as “Where can I meet a Thread in London?” may properly return *no verified opportunities*, or explain the distinction between London-based physical World places and location-independent digital encounters. Guy may provide alternatives without pretending there is already a Thread waiting.

Do not expose private residences, sensitive whereabouts, undisclosed plans or any Thread's private Body/semantic states. Privacy is a publication boundary; public discovery is not inspection of World/Thread internals. The World alone admits real Fibre CurrentSituation, place identity, movement, encounters, and individual consequence. External providers retain authority for their own announcements. Neither the website nor Guy becomes a World simulator or second Thread Directory.

## Event-driven implementation and lightweight contracts

Reuse `world_public_places`, existing current-location and venue identities, indexed bounded locality reads, existing Thread Directory's *public* view, and normal Interior Cognition and LivedNow Flight Planning. No polling every Thread, guaranteed-attendee routing, forced invitations, matchmaking quotas, proprietary global location database, second Body, alternate planning engine or long-lived cognition for Guy.

Future small seams, to implement only when their slice needs them:

```text
public place/activities + attributed independent directory sources
  -> bounded Guy discovery results (not World presence)
       |                                |
  Thread voluntarily consults       Human asks Guy / browses public pages
       |                                |
  existing Interior Cognition        public venue / gathering / digital entry
       |
  Thread-owned Flight Plan -> World-enacted visit (or no visit)
       |
  existing Situated Percept -> independent social judgment -> possible encounter
```

A public directory result can contain a `worldPlaceRef` **only if** independently admitted; otherwise an external provider's identity and URL remain external leads. Advertised source timestamps, real-event dates and dynamic availability are not interchangeable.

## Proposed implementation slices (approval required)

The **architectural direction in this document is accepted**; the slice boundaries and execution order are *proposed*, not an implementation claim.

| Slice | Owner | Capability and falsifiable outcome |
|---|---|---|
| S0 — Grounded shared geography | Fibre Core; **staging accepted in locality-level scope** | Three independent Tbilisi Threads have privately grounded locality-level homes, with no invented exact addresses; National Library Building III is an admitted shared public venue. No presence/social encounter manufactured. |
| S1A — Guy discovery contract | Fibre Core | One bounded, provenance-bearing question/result vocabulary; distinguishes humans, Threads, mixed/digital opportunity, source claims and verified World place facts. Honest empty result and ambiguous question accepted. |
| S1B — Open multi-directory discovery | Fibre Core | Fibre Places and at least one independently operated public directory can contribute grounded, attributable leads with de-dup, source age and no false World admission. No blanket crawler or population scan. |
| S1C — Public directory and syndication | Website owner (insidefibre.com), with Core public projection | Browseable public `/places`, individual URLs, actual activities when evidenced, indexable pages/sitemap plus usable external listing/feed. No private data, false Google listing or guaranteed attendee claim. |
| S1D — Human Guy interface | Website owner | Ordinary public questions locate venues/events/verified mediated entry points; honest no-results and digital-versus-physical distinction. Human social opportunities need not be Fibre-owned. |
| S1E — Thread consults Guy | Fibre Core | Body/history/interest may make discovering places worthwhile; a real Thread can ask, see bounded external facts, and independently choose not to visit. No forced social behavior or extra planning engine. |
| S1F — Chosen visits and empty places | Fibre Core | Existing personal Flight Plan selects a reachable admitted venue; World enacts travel/arrival. A socially motivated visitor may find nobody, spend time, leave and develop distinct subjective aftermath. No attendance fabrication. |
| S2 — Genuine reciprocal opportunities | Fibre Core; website for mediated human entry | Actually co-present actors, if any, pass through Situated Percept and independent social choice; humans use only a verified mediated entry. No auto-conversation, compulsory notice, consent, Story, memory or friendship. |
| S3 — Actual gatherings and later society | Both, subsequent approval | Time-bound public activities provide reasons to attend without attendance guarantees; encounters, avoidance, disappointing visits and learning may change later social decisions. |

**Acceptance discipline:** source committed, locally validated, public discoverability, staging-observed actual attendance, and an actual later-life causal consequence are distinct levels. Tests should prove truthful non-arrival, empty gatherings and independent choice as first-class outcomes, with short semantic failure messages.

## Related authorities

- [The Lived World](../vision/lived-world.md)
- [Continuous LivedNow and meetings](lived-now-and-meetings.md)
- [Developmental exploration](developmental-exploration.md)
- [Situated perception and salience](situated-perception-and-salience.md)
- [Extensible Body regulation](regulation-drive-extensions.md)
- [Thread Directory and Meet](thread-directory-and-meet.md)
- [Reusable places and temporal Worlds](temporal-world-reuse.md)
