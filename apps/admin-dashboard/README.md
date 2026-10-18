# Fibre Admin Dashboard

`admin.insidefibre.com` is Fibre's authenticated operator surface. `/activity` is a read-only interface over the shared structured Activity Log.

The dashboard is deliberately not a semantic authority. Activity remains non-authoritative and fail-open; World and service records decide Fibre truth. The browser never receives a Fibre private/admin token. Authenticated operator mutations are narrow service actions—such as initiating a Birth, bounded Thread repair, FID reissue, or meeting initiation—and the owning Fibre service remains authoritative.

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
record**. No later behavioral impact is inferred.

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

## God's view

Filtering Activity by `Thread ID` turns the same Activity records into a lifecycle-oriented operator view. It groups observed runtime work into Birth, Life, Presentation, Encounter, Experience, and Continuity and renders the causal trail chronologically.

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

The Admin map is a static world projection over Birth Center's own birthplace catalog. It shows restrained timezone meridians and the active birth pipeline as `genesis -> developing -> emerging -> in-world`; these are operator-facing stage names over the existing durable birth states, not a second lifecycle authority. Pending births remain durable Birth Center state, while World remains authoritative for whether a Thread is actually in-world.

The Threads pane is a **God-view of World reality**, not a public-disclosure view or a birthplace map. **Birth place** is immutable origin; **Current place** is the last World-enacted physical setting. The authenticated operator table shows its verified city even when the public location is hidden. Thread Observatory additionally shows the Thread's actual private-place description whenever World has attested it. The same bounded Registry read supplies operator geography, including same-Thread modern Genesis sibling locations derived from previously attested city evidence; public and God-view resolutions use distinct disclosure perspectives. One indexed place-attestation batch serves those unresolved current contexts, with no per-Thread population requests, model calls, or historic scans. The Admin map uses known World current coordinates, or a **city centroid** when only the city is attested; a city marker is never an exact private-home coordinate or evidence that different Threads share a venue. The separate `currentLocation` public projection continues to obey operator disclosure settings. The already-existing social-meeting service checks actual enacted shared venues or compatible mediated presence, never city-centroid coincidence. Frozen Threads retain their last enacted situation timestamp; no claim of continuously observed presence is made.

Modern Genesis may author several private local places (home, transit, study, commerce) without storing city geography on each historical place episode. When the current place lacks its own geography, World can reuse an independently attested **city-level location from the same Thread's exact modern Genesis context**. It refuses unrelated contexts, conflicting cities, later unauthored places and explicitly hidden locations. The directory resolves only the unlocated modern subset through one indexed batch; Observatory makes a bounded single-Thread lookup only if necessary. Neither view substitutes birthplace for an ungrounded current place.


Pending responses expose durable local Birth Center state immediately and never wait on World. When stale work is visible, Birth Center may kick one coalesced background reconciliation pass; repeated dashboard polling cannot fan out duplicate work, and retries are throttled. The pass asks World about the bounded stale cohort in one set query. World presence settles `born`; confirmed World absence plus an explicit terminal/non-retryable Genesis failure settles `stillborn`. Retryable or ambiguous interruptions remain recoverable/unresolved.
