# Fibre Admin Dashboard

`admin.insidefibre.com` is Fibre's authenticated operator surface. `/activity` is a read-only interface over the shared structured Activity Log.

The dashboard is deliberately not a semantic authority. Activity remains non-authoritative and fail-open; World and service records decide Fibre truth. The browser never receives a Fibre private/admin token. Authenticated operator mutations are narrow service actions—such as initiating a Birth, bounded Thread repair, FID reissue, or meeting initiation—and the owning Fibre service remains authoritative.

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

Birth Center is a first-class Admin view for initiating and observing modern Genesis births. Admin sends only bounded operator intent: optional `location` as `Country/City`, optional `sex` as `female` or `male`, and a cohort size of 1, 3, 5, or 11. Birth Center owns composition of every Genesis development request and the normal birth pipeline remains authoritative.

If location is omitted, each request independently uses the shared modern birthplace sampler: globally distributed major-city anchors plus a smaller-place long tail. If an explicit location is selected, the cohort shares that birthplace. Each birth still receives its own request ID. If sex is omitted, Fibre derives it deterministically from each new Thread identity so retries cannot change the person.

The Admin map is a static world projection over Birth Center's own birthplace catalog. It shows restrained timezone meridians and the active birth pipeline as `genesis -> developing -> emerging -> in-world`; these are operator-facing stage names over the existing durable birth states, not a second lifecycle authority. Pending births remain durable Birth Center state, while World remains authoritative for whether a Thread is actually in-world.

The Threads view is a **live World-presence map**, not a birthplace map. Population reads are observational and return the full admitted World Registry without running model-backed LivedNow reconciliation. World resolves the population's latest CurrentSituation and referenced place evidence in one set-based read, then projects those already-authoritative locations in memory; the cost does not fan out into per-Thread store reads. A Thread with no authoritative CurrentSituation is reported as current-location unavailable and is never silently plotted at its birthplace. LivedNow reconciliation remains a separate World-owned operation when Fibre actually needs to establish the person's present.

Pending births expose only durable local Birth Center state, age and staleness; reading the dashboard never calls World or performs reconciliation. Stale work is reconciled by the Birth Center wake path in bounded batches. If authoritative World already contains the Thread, the birth settles as born/done and leaves the active pipeline. A recorded pre-admission Pass-A validation failure settles stillborn only when World explicitly confirms that no authoritative Thread exists. Ambiguous or unavailable World state remains unresolved rather than being guessed.
