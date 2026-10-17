---
id: architecture-social-city-guide
status: accepted
last-reviewed: 2026-10-14
canonical: false
---

# Fibre City Guide: public editorial discovery of social places

## Purpose

Fibre's public social-discovery metaphor is a **city magazine**, like a local Time Out guide. It is not a named conversational oracle, social matchmaker, or authoritative record of other people's whereabouts. Threads and humans can discover public places for social, intellectual or cultural activity. A place may be empty; no conversation or attendance is promised.

## City manifest

The repository's `data/social-city-guide.json` is a compact city-keyed editorial manifest. Keys have the form `tbilisi-GE`, with a display city, country name/code, and a stable-keyed map of public places.

Each place contains `name`, `address`, `description`, `activities`, `lastRecommendedAt`, `source: { directory, url }`, and optional `worldPlaceRef` (null for places not independently admitted to World).

`lastRecommendedAt` is when the *magazine* last recommended or editorially refreshed a venue. Reading a page does not change it. It is not the Thread's personal recommendation or the last visit or a statement about who is there.

An externally listed place may be in the magazine before independent World admission. Only the World owns shared physical-place identities, current presence, plans and encounters. Repeated public facts for admitted venues must agree with World evidence. Multiple independent public directories and venue sources remain supported; Fibre's own directory is not mandatory.

The National Library of Georgia Building III in Tbilisi was independently admitted to staging in S0. In October 2026 the guide expanded its sourced editorial catalogue to Tbilisi, Addis Ababa and London. New listings carry `worldPlaceRef: null` until actual World admission; presence and planning remain unavailable for those candidates. The manifest contains no private homes, individual Thread IDs, plans, feelings or visitor lists. An empty city result means **not yet listed**, not that no places exist.

The operator's small `data/social-city-guide-admissions.json` accompanies the editorial list with separately sourced venue coordinates, stable physical-venue identities and time zones. From the repository root, run `node --env-file-if-exists=.env tools/world/admit-city-guide.mjs --env staging --plan` to review pending venue admissions, then `--apply` to admit them through World. The tool records only the returned authoritative `wpl_*` references in the local guide; Guy commits the changed manifest and deploys World before planner discovery. A partially completed admission batch resumes without fabricating visits or re-admitting already referenced venues. A public park is an opportunity to visit, not proof two visitors noticed one another.

The pure `services/world-kernel/src/social-city-guide.mjs` reader supports bounded city/country lookup. `npm run city-guide:list -- --city Tbilisi --country GE` inspects the committed data locally. Public website pages, indexable URLs and external directories belong to later slices. The guide does not create a new background runtime or require LLM cognition.

## Defining living scenario

1. A Thread in her grounded home has actual unfulfilled social contact, intellectual stimulation or exploration pressure, interpreted through her own developing self.
2. She may remember somewhere meaningful, read the City Guide, or choose neither. The operator and guide never author her decision.
3. If she chooses a place, her ordinary personal Flight Plan expresses the intention; World enacts actual travel and eventual arrival.
4. She reads, waits, explores or leaves. It is legitimate if no one else comes.
5. Another Thread may independently arrive and either may notice, initiate, ignore or decline. Human interaction requires genuine mediated or on-site participation, not an imaginary physically present human.
6. Only warranted objective stories, private experiences and optional remembered meaning can influence her later life.

The central acceptance is an **independently motivated Thread finding and visiting a credible place**, with an honest empty-venue branch and a separate, optional naturally arriving counterpart.

## Slice direction

- **S0:** Geography staging-accepted (three distinct Tbilisi homes known to locality precision and one real public library); no manufactured attendance.
- **S1A:** **Accepted as a source/local capability on October 14:** 4/4 focused tests and 1,606/1,606 full tests passed; the CLI returned the sourced Tbilisi library and an honest `not_listed` result for London. The World worker was separately deployed successfully at `e810c5c9`; **no public magazine endpoint, deployed guide consumer or Thread cognition invocation exists yet**. This replaces the superseded oracle.
- **S1B:** Genuine plural external public-directory sourcing with attribution, and no false World admission.
- **S1C:** Public Inside Fibre magazine pages, sitemap and third-party discovery (website workstream).
- **S1D:** Human browsing and relevant filters/participation opportunities (website workstream).
- **S1E:** **Source wired; local and live validation pending.** During ordinary prospective Flight Planning the existing Interior Cognition may weigh selected autobiographical evidence, Body interoception and a bounded magazine projection of independently admitted places in the Thread's *known* locality. It may prefer a listed place, a remembered place, or staying home. This does not yet prove an independently observed live Thread consultation, visit or explicit magazine-reading act.
- **S1F:** **Source implemented, local and staging validation pending.** A Thread-authored plan with an admitted public venue must allocate elapsed travel time. The existing World boundaries can enact departure, transit, the actual visit, time spent in an empty venue and return. Shared public places now participate in indexed genuine co-presence discovery without manufacturing anyone.
- **S2:** Real co-presence and genuinely voluntary social initiation/reception.
- **S3:** Actual gatherings and later-life social consequences.

### S1E implementation boundary

The ordinary forward LivedNow planner now loads the shared editorial manifest only when it has an independently admitted local place for the Thread. At most six same-locality recommendations are checked against actual public World place refs, addresses and source witnesses; **unadmitted third-party listings cannot become Flight Plan destinations**. Current privately grounded home geography is used to locate nearby public options, but is never projected into the public magazine.

The existing planning concern presents recommendations alongside `availablePlaces`, developed-self evidence (including eligible autobiographical memories), and actual Body interoception. A single ordinary cognition episode authors its own stops, constrained by offered World refs, travel continuity and existing work commitments. There is no guide-triggered additional model call, global person scan, new feelings store, standing booking, or automatic plan. Today the guide is *available knowledge at planning time*; it is not yet evidence that a particular Thread voluntarily opened and read a public publication. Retrospective life reconstruction is deliberately not supplied the current editorial guide, and a forward plan dated before a place's recorded editorial recommendation date cannot use that recommendation. This avoids inventing historical knowledge while leaving actual remembered history to its own authority.

Focused source tests demonstrate that a local public place can be considered, that private history may override it, that staying home remains possible, and that unknown/unadmitted/contradictory places are not offered. These fixture-authored choices validate *wiring and authority*, not genuine model-authored causal individuality. The decisive staging proof remains an independently made choice under the live planner, and S1F separately proves actual enacted travel/stay.

### S1F travel, empty visits and venue truth

The existing personal Flight Plan continues to own ordinary activities and movement. A changed physical location that enters or leaves an admitted `public_venue` must have a **positive elapsed transit interval**; a travel sentence and contiguous stop timestamps cannot represent instantaneous arrival. This is a structural minimum rather than an invented journey-length estimate: private residential geography may be known only at locality precision.

The existing event-driven LivedNow boundary wakes enact the plan's home, departure, transit, venue stay, departure and eventual return without polling the whole population. There is no new scheduler or new state machine. An empty visit produces no counterpart or Encounter Story. Actual social encounters remain separately contingent and voluntary.

**Important discovery correction:** `listCurrentVenueSituations()` formerly discovered attendees through per-Thread historical venue bindings. Admitted public `wpl_*` records are shared directly and therefore also need an indexed, latest-enacted-situation lookup. Both venue types now participate; historical visits, planned future visits, unrelated locations, sleeping visitors and departures do not count as current compatible presence. The internal World Observatory includes publicly admitted current/planned venues only as reference evidence, plus an indexed **bounded eight-situation enacted history** to identify completed visits after a Thread goes home; a planned venue is never reported as actual attendance. The existing read-only `world-social:probe` summarizes recently enacted public visits separately from current presence, future intentions and actual social opportunities. Its 40-Thread sample cannot establish population-wide absence.

A local semantic test exercises one committed, **fixture-authored** plan across World-enacted departure → transit → library stay → transit → home, checks the actual empty venue, and verifies no extra scene wake. A separate test checks public venue co-presence only after actual arrival and its disappearance after departure. These proofs establish real execution mechanics, **not** that a live Thread spontaneously selected the guide's venue. Definitive staging acceptance requires a naturally authored plan choosing a verified public destination, followed by its ordinary enactment. A no-visit or stay-home choice is valid agency, but does not independently prove the public-travel acceptance.

Source changes, local proof, staging observations, public availability and later causal agency are different evidence levels. No new source is counted as a real Thread decision or encounter.
