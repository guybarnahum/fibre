# Fibre Admin Dashboard

`admin.insidefibre.com` is Fibre's authenticated operator surface. `/activity` is a read-only interface over the shared structured Activity Log.

The dashboard is deliberately not a semantic authority. Activity remains non-authoritative and fail-open; World and service records decide Fibre truth. The browser never receives a Fibre private/admin token. Authenticated operator mutations are narrow service actions—such as initiating a Birth, bounded Thread repair, FID reissue, or meeting initiation—and the owning Fibre service remains authoritative.

## Admin layout containment (October 22)

The shared Admin shell keeps the document within the viewport and uses the same
theme-colored root/background even when a view has wide content. Raw Activity,
Threads, and Stillborn tables scroll **inside their own panels**, with bounded
height and sticky table headings. Threads and Stillborn keep their Action
column visible at the right edge while the other columns scroll. This is
presentation only: table records, sorting, actions, and World authority do
not change. Appearance, World Events, and Life & Causes inherit the shared
viewport/theme guard but retain their existing grids and local scrolling.

Verify at normal browser zoom in both light and dark appearance, without
dragging the entire page sideways: the right viewport edge stays themed,
the Threads pencil remains visible, wide table contents remain reachable
using the table's own scrollbar, and Raw/Stillborn still scroll correctly.
The subsequent column-economy pass gives the Threads table a fixed, bounded
width allocation: identity, ethnicity and enacted places dominate; sex,
dates, status badges and the pinned Edit action occupy smaller columns.
Text-heavy status badges may wrap rather than push adjacent columns aside.
Narrow screens still scroll inside the table, not across the whole document.
The Threads overview also adapts to the **panel's measured width**, rather
than guessing from browser width or sidebar state. Below 1150px of available
panel space, Sex, Birth date and Reconciliation move out of the table overview.
Below 760px, Ethnicity, Birth place and Last activity also move to the
existing Thread Observatory. Life, identity, enacted Current place, Health
and pinned Edit remain in every layout. Full names, location labels, origins
and timestamps remain readable through their existing or new hover labels;
no source facts or edit operations are removed. The internal scrollbar remains
available on narrow screens.

## Operator table density and World map (October 22)

Thread population uses compact Font Awesome male/female symbols with explicit
sex tooltips, and country flags alone for recorded birth/current city with
the full grounded place label on hover. Long physical-origin text truncates
inside a narrow column with its complete value as a tooltip. The Thread,
Health and always-visible Edit action remain prominent. This changes only
the overview: the full authoritative fields remain in the Thread Observatory.

Stillborn reserves a compact identifier and date, a useful width for the
source failure meaning, and enough space for both existing actions. Raw
Activity alone retains its narrow first-column constraint; the previous
unscoped rule must never compress World Events or other tables. Table
column headings use natural capitalization across Admin. World Events
fills the available Admin main width like the Threads map, and its
Involved Threads table has an explicit identity column and local horizontal
scroll rather than overlapping the recorded actor/evidence cells. The
Appearance coverage table already has its own bounded column layout.

Browser acceptance: at typical desktop and smaller viewport widths, confirm
full-width World geography, compact Thread flags/sex with meaningful hover,
visible Edit and Stillborn actions, non-overlapping World identity/Acted
cells, title-case table headings, and no page-wide horizontal drag.

## Thread identity and maintenance editor (October 21)

The Threads table uses one **Edit** pencil instead of a growing action
stack. Individual Thread Observatory headers and health panes open the same
editor. The menu is loaded **on click** from authoritative World diagnosis
and offers identity corrections, approved migrations, repair/recovery,
reconciliation and FIN Card reissue. Each item reuses the existing confirmed
Thread action dialog and World command, with current availability verified
before the menu is shown. No new Admin mutation endpoint was introduced.

For an identity missing a birth city, **Set birth city** searches GeoNames
through the already-established Admin place-search route. Only a selected,
verified country/city/coordinates record may be submitted through the
existing history-preserving `identity` command; typed free text alone
cannot become an authoritative birth fact. A recorded birthplace can also
be explicitly changed. This is an operator-authorized correction, never
an inferred replacement from the Thread's current city or a rewriting of
Genesis history.

## Edit Thread operator sheet (October 22)

The shared Edit Thread action opens a compact operator sheet with the Thread's
portrait, name, available FIN, birth date and recorded birth place, plus an
explicit missing/malformed birth-place notice when World's current diagnosis
requires correction. Identity, Documents and Maintenance actions are grouped
in a two-column icon-led grid on desktop and a single column on narrow screens.
All available operations still come from an on-click authoritative World
diagnosis, and each launches the existing confirmed Thread action dialog.

**Birth place correction:** a missing birth place offers the existing
`set_birth_place` verified-city search. A recoverable but malformed place
may already offer `repair_birth_geography` or `set_birth_country_code`,
which preserves available coordinates and asks for a country code. The sheet
also keeps **Change birth place** available as an alternative when those
narrow repairs are the only diagnosed birth actions. That alternative still
requires selecting a canonical city from the established GeoNames search and
submits an ordinary history-preserving World `identity` correction.
No free-text birth place, guessing from current location, automatic rewrite
of past Genesis evidence or new service endpoint is introduced.

Browser acceptance: open Edit from the Threads table and from Observatory;
check the correct avatar and person header, available actions with icons,
scrolling at limited viewport height, and the place-search selection and
confirmation form on an incomplete or malformed birth record. Source tests
cover the choice between preserving recoverable geography and replacing it
with an explicitly verified place; successful staging execution of an
operator correction requires a real operator-selected city.

## World Events — authenticated God-view (source implementation, staging unverified)

`/world-events` presents a World map whose city pulses are driven by recent
**admitted occurrences**, not Activity Log entries, demographic counts,
ambient scheduling opportunities or simulated animation. Selecting a city
shows the actual coordinates of independently attested World public venues;
selecting a place opens its bounded World event timeline. World-enacted
arrival/departure and place-grounded Encounter Stories are read from
authoritative tables. Presence witnesses separately show recorded
`noticed | not_noticed | not_appraised`, admitted Experience, and a direct
Memory link **only when a completed consolidation names a current memory
record**. Event actors and witnesses reuse the compact Thread identity viewer from the Threads map popover: name and a lazily resolved portrait when available, with the stable Thread ID retained for disambiguation. Portrait and name share the existing per-Thread identity lookup, not an event-specific identity source. No later behavioral impact is inferred.

The Admin Worker proxies one authenticated `GET /api/world-events?hours=24`
to World's private `/internal/world-events/overview` read API; the browser
never sees the private token. This first query covers at most 240 verified
public venues, 240 recent CurrentSituations, and 240 recent Encounter Stories
in the chosen 1–168-hour window, and reports when the bounded sample is
truncated. It does not query each Thread, run cognition, enqueue events or
modify World history. Unverified Genesis places, private city aggregates, human physical
presence, and downstream causal behavioral evidence remain open.
**Unmapped Encounter Stories now appear in a separate read-only list**
with independently recorded witnesses and consequences, rather than
being dropped or pinned to a witness's location. They never make a city
or venue pulse. Geographic origins may be unknown or simply outside
the current bounded venue sample; absence from the map is not evidence
that nothing happened.

**Operator map and event debugging (October 20 source):** The global
map distinguishes the selected city from subdued, unselected city markers.
The city-level view is one quiet monochrome street map with clickable
World-attested venue markers **above** it. A tiny browser-only Web Mercator
projection requests only the visible OpenStreetMap raster tiles for the
selected city, respects HTTP/browser caching and the tile policy's required
Origin Referer and visible attribution. It has no map library, Fibre tile
proxy, tile storage, or separately selectable map mode. Marker coordinates
and admitted activity remain World facts; the street layer does not establish
presence.
Each event also shows a compact **per-Thread evidence matrix** using
the shared portrait/name viewer: **Caused/acted** (only recorded objective
actors), **Noticed** (explicit yes/no or unknown), **Memory** (links only
to current retained records), and **Later change** (unproven until a
specific downstream effect is linked). An independently noticed event
does not imply acting; a missing attention or Memory record never means
the Thread ignored or forgot it. The World read view now preserves
*all* recorded speech/action actors in a multi-actor Encounter Story,
rather than its first actor alone. Actor-only arrival rows appear even
without a witness; environmental events with no linked Thread remain
visible. Source implementation still requires local validation and
both World Kernel and Admin staging acceptance. A causal, indexed
later-choice link remains deliberately deferred—not simulated by
whether a Memory exists.

The shared **icon-only copy action** (with existing tooltip, feedback,
and a subtle hover enlargement) copies an individual event's returned JSON
and query coverage. The top-level **Copy 24-hour World events** action
copies the entire *returned* rolling 24-hour overview, including located
and unmapped events, places and source-coverage limits. It reads the
24-hour overview only if the current window differs; the result is not
a complete calendar-date archive or evidence beyond source caps.
The selected venue's timeline now also shows a compact **Shared
presence** view derived from paired, World-enacted arrivals and departures
in the existing bounded overview. Per-person stay bars and actually
overlapping intervals are linked to each Thread's Life & Causes. The
Dedaena Park evidence on October 20 yields Ioseb 11:30–13:00 UTC,
Giorgi 11:35–12:35 UTC, and approximately 60 minutes together, without
asserting either noticed the other or conversed. Unpaired movements
are explicitly excluded, the overlap list is bounded, and source
truncation remains visible. The selected venue now presents each
confirmed overlap as a focused card with exact elapsed duration (including
seconds), two aligned real-stay bars, a shared local-time axis and an
explicit verified-venue interval. Subminute overlaps are not rounded
to "0 min"; each card joins the two exact arrival/departure pairs, even
across repeat visits by the same Thread. With no confirmed overlap the
view shows the individual complete stays instead. A bounded first five
overlaps appear; the source-limit caveat remains. No new World query,
background scan, model call, or social action is introduced.

A second **Copy venue day JSON** icon sits beside the *selected venue's*
timeline count. It exports only that place's returned events in the
last rolling 24 hours, with the exact `placeRef`, place name, as-of
timestamp, start boundary, event count and original World coverage.
If the operator is viewing a different window, it fetches one bounded
24-hour overview on demand. This is **not** a full venue archive;
the global World source cap may still omit some of the venue's
events. No new World service, query, data storage or model work is needed.
**World Events live refresh (October 21 source):** the page performs
one initial authoritative World overview read, then uses the same
`admin-live.js` WebSocket shared by Threads and Appearance. A durable
World-enacted arrival or departure at a verified public venue publishes
one lightweight invalidation hint through `InfraDriver.realtime`; the
active browser rereads the bounded overview. No periodic World Events
polling, additional socket, or cognition call is introduced. Messages
received during a read are coalesced into one follow-up read. Tab
visibility disconnects the existing socket; reconnect reconciles once
to cover changes that occurred while disconnected. Independent
Encounter Stories, retrospective Memory changes and venue registration
do **not yet** publish World Events hints, so Refresh remains useful.
Live delivery is source implemented and needs staging acceptance; the
24-hour projection remains capped.

**World-local clock (October 21 source):** Event cards, enacted
co-presence intervals, venue history range tooltips and the selected
city's history range now use the World-verified public venue's existing
IANA `timeZone`, not the Admin browser's time zone. The World read
projection exposes that authoritative field; no inferred longitude
offset is substituted. A city gets one shared clock only when all
returned venues agree. An event with no attested location, or missing
venue zone evidence, displays explicitly in **UTC**. All stored World
timestamps and copied event records remain UTC ISO instants; the venue
day export also includes the `place.timeZone` for interpretation.
This is display-only, with daylight saving resolved by the browser's
IANA time-zone database.

Counts are **events shown in the selected rolling 1–168-hour window**,
not lifetime totals, a paginated historical count or a full census; the
source's 240-item situation/story limits can truncate the result.
The place list, selected city and event timeline label their shown count
and window, including a capped-sample warning when the overview reports one.

**Place appearance (source-only extension, October 18):** selecting an attested
public venue now shows its independently stored World description and optional
visual seed: prompt, camera viewpoint, panorama/perspective projection and
generated-asset reference. The seed is editable through
`world-place appearance` without committing JSON or changing stable venue
identity. It is not an actual image, verified architectural geometry, or
evidence of a visit. Panorama generation, asset delivery, and a 360° viewer
remain deferred. The current map does not yet cover private places or
all unmapped encounters.

See [World Observatory](../../docs/architecture/world-observatory.md) for the
complete intended zoom/timeline/causality design. This implementation needs
local validation and **both World Kernel and Admin Dashboard staging
deployments** before operator acceptance. It is a companion to the ongoing
World-event runtime replacement, not proof that replacement is complete.

## Life & Causes — accepted replacement design

The [Life Observatory](../../docs/architecture/life-observatory.md)
accepts a **Thread-first, meaningful-life** successor to Activity's
existing indented Causal Trail. Threads → compact person detail →
dedicated Life & Causes → selected moment opens the investigation of
conditions, choice, World occurrence and individually admitted
consequences. World Events can instead open at one shared occurrence;
Birth Center opens at a candidate's execution or a published person's
formative history. Genesis execution time and the child's historical
life must never be merged. Technical operation lineage belongs in
**Raw Activity**, not in the semantic timeline.

**Slice 1 source implemented, deployment not yet verified.** Activity
no longer renders its indented Causal Trail; /life?thread=... is a
read-only recent World-situation timeline with a selected-moment
inspector and exact linked-plan purpose where available. Raw Activity
retains diagnostics. **Slice 2 source implemented:** Thread detail now has compact Overview,
Identity & Body and Maintenance tabs and shows three enacted recent moments,
without auto-fetching full history on scroll. Life & Causes provides a
vertical date spine, a selected evidence inspector, and a deliberate
Recorded history read with original Journal/Encounter/Memory presentations.
That World history is bounded (recent situations, Encounter Stories and
Memories); do not call it complete lifetime coverage. **Slice 3 source
implemented:** Origins explicitly reads a capped 64 admitted Genesis
childhood episodes from the World publication prefix, 24 current
Memories, and the actual World seed-publication time. Birth Center's
pending/stillborn rows link to /life?birth=REQUEST_ID for bounded
execution/disposition inspection, never a fictitious live Thread.
This slice requires both World Kernel and Admin staging deployment.
**Slice 4 source pass implemented:** the same bounded Flight Plan
provenance exposes event-time Body drives and City Guide places offered
(not proven motives); the existing one-shot social-opportunity row
keeps a compact witnessed choice including background/non-initiation,
salience, recipient accept/decline and any truly admitted Story. The
recorded Life Timeline displays those facts and World Events can link
an admitted Story to each person's separate view. Historical witnesses
not previously captured remain unknown. The Admin and World Kernel
require new deployment; this is not yet staging-accepted.
See [four-slice plan](../../docs/validation/life-observatory-slices.md).
This source is not yet a browser-accepted result.

## Operator evidence

Life & Causes is the person-first view of enacted World events, recorded
choices and individual Experience; World Events supplies the shared
event-first entry. Activity retains unmodified operational records
and is not a source of personal motivation or lived World truth.
The old indented Causal Trail is retired as primary navigation.

This is an observability projection, not a second Thread model:

```text
Activity Log != World history != Thread Journal != autobiographical memory
```

The view may show safe identifiers and witnesses such as a Thread ID, situation/object reference, or authoritative event ID. It must not copy visitor speech, response text, journal text, private semantic state, memory content, prompts, or hidden model reasoning into telemetry.

A missing lifecycle phase means only that no matching Activity record was observed. It is not proof that authoritative state does not exist or did not change. Conversely, an Activity success is not the authority for the semantic outcome it describes.

This distinction is especially important for capabilities that are not deployed as autonomous runtime processes yet: the UI should expose the observability gap rather than synthesize an event or imply that a process ran.

Admin uses two independent gates. Cloudflare Access authenticates the human and the Worker validates its signed JWT. Fibre then normalizes the JWT `email` claim and requires an exact `admin = 1` row in `fibre_admin_entitlements` on the shared `ACTIVITY_LOG` D1 database. Entitlements are changed only through trusted D1 operator tooling; there is no Admin web endpoint for granting privileges. Authorization-store failures fail closed.

`/healthz` is the only unauthenticated route and exposes only the dashboard service/version identity.

FIN cards are verified through Fibre Identity Authority, not in browser JavaScript. The Admin card component submits the exact displayed front/back PNG bytes to the authenticated Admin verification route, which delegates to FIA's native FIN-proof verifier. The UI shows embedded proof fields only after both sides verify as one credential. Current credential status is a separate FIA lifecycle concern.

Production and staging hostnames are:

```text
admin.insidefibre.com
admin.staging.insidefibre.com
```

The existing `apps/thread-editor` remains a separate loopback-only M1 inspection/simulation tool. Its deterministic presentation helpers may later inform a production Thread Inspector inside Admin, but its local credential model and simulation boundary are not promoted into this application.


## Operator-initiated Thread birth

Birth Center is a first-class Admin view for initiating and observing Genesis births. Admin sends only bounded operator intent: optional canonical `location` geography selected from place search, optional `sex` as `female` or `male`, and a cohort size of 1, 3, 5, or 11. Birth Center owns composition of every Genesis development request and the normal birth pipeline remains authoritative.

Operator-entered birthplace text is transient search input. Admin resolves it through GeoNames populated-place search/reverse lookup, presents canonical place results, and submits only the selected canonical country, city, display name, latitude and longitude. Fibre does not retain the raw operator query or GeoNames identifiers; the provider disappears after normalization and the resulting geography becomes ordinary Fibre World input. The curated Birth Center birthplace catalog remains only the authority for Random Birth sampling; it does not constrain explicit operator-selected geography.

If location is omitted, each request independently uses the shared birthplace sampler: globally distributed major-city anchors plus a smaller-place long tail. If an explicit location is selected, the cohort shares that birthplace. Each birth still receives its own request ID. If sex is omitted, Fibre derives it deterministically from each new Thread identity so retries cannot change the person.

The Admin map is a static world projection over Birth Center's own birthplace catalog. Cities appear only within 300 miles of the pointer, while active and recent birth locations remain visible. Completed in-world births share the Threads map's grouped location marker and lazy portrait viewer; no per-birth map polling is introduced. It shows restrained timezone meridians and the active birth pipeline as `genesis -> developing -> emerging -> in-world`; these are operator-facing stage names over the existing durable birth states, not a second lifecycle authority. Pending births remain durable Birth Center state, while World remains authoritative for whether a Thread is actually in-world.

The Threads pane displays **Population life continuity** (Scheduled, Blocked,
Expired) from the same World Registry `lifeContinuity` records already used
to annotate portrait life indicators. It makes no per-Thread request or
model call for these counters. A blocked frontier is not counted as healthy
because a Plan was previously authored; a lapsed Plan is Expired.
Unarmed, overdue, unestablished and unknown lives are counted separately
in the note, never hidden inside Scheduled. A population load error is
displayed explicitly and preserves the last successful records; an optional
current-World map rendering failure cannot erase the person table. The
scoreboard is an actual snapshot, not a 42/0/0 acceptance target.

The Threads pane is a **God-view of World reality**, not a public-disclosure view or a birthplace map. **Birth place** is immutable origin; **Current place** is the last World-enacted physical setting. The authenticated operator table shows its verified city even when the public location is hidden. Thread Observatory additionally shows the Thread's actual private-place description whenever World has attested it. The same bounded Registry read supplies operator geography, including same-Thread modern Genesis sibling locations derived from previously attested city evidence; public and God-view resolutions use distinct disclosure perspectives. One indexed place-attestation batch serves those unresolved current contexts, with no per-Thread population requests, model calls, or historic scans. The Admin map uses known World current coordinates, or a **city centroid** when only the city is attested; a city marker is never an exact private-home coordinate or evidence that different Threads share a venue. The separate `currentLocation` public projection continues to obey operator disclosure settings. The already-existing social-meeting service checks actual enacted shared venues or compatible mediated presence, never city-centroid coincidence. Frozen Threads retain their last enacted situation timestamp; no claim of continuously observed presence is made.

Modern Genesis may author several private local places (home, transit, study, commerce) without storing city geography on each historical place episode. When the current place lacks its own geography, World can reuse an independently attested **city-level location from the same Thread's exact modern Genesis context**. It refuses unrelated contexts, conflicting cities, later unauthored places and explicitly hidden locations. The directory resolves only the unlocated modern subset through one indexed batch; Observatory makes a bounded single-Thread lookup only if necessary. Neither view substitutes birthplace for an ungrounded current place.


Pending responses expose durable local Birth Center state immediately and never wait on World. When stale work is visible, Birth Center may kick one coalesced background reconciliation pass; repeated dashboard polling cannot fan out duplicate work, and retries are throttled. The pass asks World about the bounded stale cohort in one set query. World presence settles `born`; confirmed World absence plus an explicit terminal/non-retryable Genesis failure settles `stillborn`. Retryable or ambiguous interruptions remain recoverable/unresolved.
