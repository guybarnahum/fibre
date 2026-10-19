---
id: architecture-social-city-guide
status: accepted
last-reviewed: 2026-10-18
canonical: false
---

# Public-place discovery in the living World

## Purpose

Fibre's City Guide is a **public editorial view of independently attested
World places**, not a separately authored map, matchmaking authority or
source of attendance. It offers ordinary social, intellectual, cultural and
solitary opportunities. An admitted venue may be empty; no conversation,
company, attendance or satisfaction is promised.

## Single World place authority

`world_public_places` holds verified public venue identity, address,
coordinates, geographic locality, source evidence and bounded affordances.
These immutable attested facts already support shared physical co-presence.
The generic `world_places` registry separately holds Thread-discovered
places that may not be independently identifiable; those are not promoted
to public social venues by their name or by a Thread's interest.

**Editorial discovery is mutable metadata on that same public-venue row**:
`discovery_json` can be `null` (not listed), or a compact object containing
`listed`, `description`, and `lastRecommendedAt`. Only `listed:true`
appears in World discovery. Editing or unlisting that metadata never changes
the stable `wpl_*` reference, verified physical facts or historical visits.

There is **no separate City Guide table, repository JSON catalogue, editorial
scheduler or second place-identity authority**. The previous
`data/social-city-guide.json` and related admission files were retired
after their verified venues were admitted. Changes to recommendations use
the existing World venue API and persist without rebuilding Workers.

## Data operations

A verified public venue is admitted through the existing World
`/internal/world-venues/admit-public` operation; admitting one does not
automatically list it, announce it or produce a visit. Editorial listing
changes use `POST /internal/world-venues/discovery` with:

```json
{
  "placeRef": "wpl_authoritative",
  "discovery": {
    "listed": true,
    "description": "A place to read, explore or spend time quietly.",
    "lastRecommendedAt": "2026-10-18"
  }
}
```

Setting `listed:false` excludes the venue while retaining editable
metadata; setting `discovery:null` removes the editorial projection.
`npm run world-place -- discovery --env staging --file /path/to/update.json`
and `npm run world-place -- list --env staging --locality Lisbon --country-code PT`
use the existing private World operator API. No code or data Git commit is
required for an ordinary editorial update.

## Thread-owned discovery

At an ordinary **prospective** Flight Plan renewal, Fibre establishes the
Thread's current grounded locality from its lived World situation and
independent geographic evidence. One indexed World locality query offers
at most six currently listed verified venues, subject to the editorial
recommendation date. The usual Interior Cognition sees their physical-place
references, descriptions, affordances and source evidence **alongside**
developed autobiography and Body interoception. It may prefer a remembered
place, choose a listed venue, discover somewhere new, stay home or choose
another activity. No separate LLM call, place polling or social quota exists.

Retrospective life reconstruction does not consume today's mutable editorial
listing. A recommendation is an opportunity at a planning boundary, never
evidence of a read, intention, visit, co-presence or a meeting.

World alone enacts an actual positive-duration journey and visit, maintains
indexed current venue presence, and may derive one bounded natural social
opportunity when separately living Threads happen to coexist there. Each
Thread can notice, ignore, initiate, decline, withdraw or remember differently.
No listing creates a counterpart or forces social contact.

## Read-only social-city scouting

The operator can search for plausible *existing* staging encounters without
instigating one:

```bash
npm run world-social:candidates -- --env staging --limit 64
```

This joins a bounded public World venue overview (up to 240 verified
places) with at most 64 lightweight `view=current` Thread Observatory
reads by default, and saves the evidence under
`.fibre/world-social/<environment>/candidates/`. Larger samples
(up to 200 public-directory Threads) are explicit via `--limit`; the
public directory itself returns at most 200 per request, so this is not
a population-wide census.

City matches derive from each Thread's *current enacted location*,
not a birthplace, formative learning context, biography, or inferred
residence. The result distinguishes: an independently verified World
venue; an editorially listed destination; a future **planned** visit;
two people **in the same city**; and two non-sleeping Threads actually
present at the **same attested public venue**. Only the last is
physical co-presence evidence. Neither co-presence nor a planned
visit proves a chosen conversation, consent, or friendship.

This scout calls no LivedNow ensure or model, changes no World state,
and makes no inference from unsampled Threads. Inspect an identified
Thread's full Observatory or `world-social:probe -- --thread thr_...`
only after this lightweight lookup finds a promising real candidate.

## Acceptance sequence

- **S0:** independently attested public places and locality-grounded private
  places — already established.
- **S1E:** source delivers World-listed venues into one ordinary planning mind;
  live endogenous interest/choice evidence remains separate.
- **S1F:** positive-duration autonomous movement is staging-observed with
  Victor on October 18. A real independently admitted **public venue** visit
  is still required; the Lisbon Genesis learning context was not one.
- **S2:** independently arriving Threads share a real venue, have a genuine
  opportunity to notice and voluntarily approach or decline.
- **S3:** one shared Encounter Story leads to distinct personal Experience and
  selective consequence, eventually changing future social life.

Historical source-only City Guide staging claims are retained in Git history
and the contemporaneous validation records. The next validation is local
World discovery edit/query/planning followed by a deployed real-venue choice,
not a forced fixture or seeded social plan.
