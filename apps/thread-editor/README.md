# Thread Editor

The M1 Thread Editor is a dependency-free, loopback-only inspection and bounded-simulation surface over the independently running world kernel.

## Start

Run the world kernel and editor with the same private token. Configure an admin token whenever live command acceptance is needed outside the editor:

```bash
FIBRE_PRIVATE_TOKEN=local-private-token-1234 \
FIBRE_ADMIN_TOKEN=local-admin-token-123456 \
npm run world-kernel

FIBRE_PRIVATE_TOKEN=local-private-token-1234 npm run editor
```

The editor prints a per-run URL containing an access token in the URL fragment. Open that exact URL. Browser code stores the token in session storage and removes it from the visible address bar.

Optional editor configuration:

```text
FIBRE_EDITOR_HOST=127.0.0.1
FIBRE_EDITOR_PORT=4173
FIBRE_WORLD_URL=http://127.0.0.1:8787
FIBRE_PRIVATE_TOKEN=<same local token used by the world kernel>
FIBRE_EDITOR_ACCESS_TOKEN=<optional fixed test/development token; otherwise generated per run>
```

## Inspection surface

The editor loads live API data for one Thread ID and presents:

- current projection, lifecycle status, version, and state hash;
- needs, feelings, self-model, unresolved intentions, traits, memory refs, and relationship refs;
- safe public event history;
- Thread replay integrity and freeze-created-memory integrity;
- private request/appraisal/stance summaries and complete traces;
- private runtime, authorization, execution-context, Actor, and Goal Guardian records;
- freeze reports, authorization consumption, explicit abandonment, and timeout outcomes;
- raw aggregated inspection data.

Timeout display uses `kernelTime` from the world-kernel health response. A lease is displayed as timed out when kernel time passes `expiresAt`, even before the database lazily changes the lease row from `active` to `expired`. The editor labels that state `Timed out — not yet reclaimed` rather than falsely reporting an active episode.

## Access boundary

Every `/api/editor/*` request requires the per-run editor access token. Static files remain loopback-readable, but they contain no Thread interiority or world-kernel credentials.

The world-kernel private token is held by the editor server and injected only into an allowlisted upstream GET surface. It is never returned to browser JavaScript. A different local process must possess the editor's per-run token before it can use the editor API to read public or private Thread records.

This is a local M1 credential, not production authentication, principal identity, or role-based authorization.

## Bounded simulation

The only mutation-shaped control is `Preview self-model update`. The editor constructs a canonical `UPDATE_SELF_MODEL` command using the kernel-published time and calls the deterministic preview route.

The browser response omits the raw `previewId`. The editor exposes no command-acceptance route, and the live world-kernel process disables command acceptance unless `FIBRE_ADMIN_TOKEN` is configured and supplied directly to the kernel.

A preview receipt is not consent, Participation Authorization, or authority to mutate the Thread.

## Deliberately unavailable

The editor cannot:

- seed a Thread;
- accept or apply a command;
- acquire a thaw runtime;
- run Actor or Goal Guardian;
- freeze or abandon a runtime;
- repair a projection;
- create, edit, normalize, or discharge obligations or unresolved intentions;
- send external communication.

PR #21 is therefore an inspection and simulation tool, not an alternative world-kernel write path.

## Transport and filesystem boundary

The editor server:

- binds only to loopback;
- accepts only loopback Host headers;
- accepts only a loopback HTTP world-kernel URL;
- requires a per-run credential on every editor API request;
- provides no generic reverse proxy;
- percent-encodes every allowlisted upstream suffix segment;
- allows private upstream GETs only for request/runtime/freeze/abandon inspection;
- constructs one preview-only POST;
- rejects encoded path traversal and every symbolic-link segment under the static root;
- opens and stats each static response through one file descriptor;
- caps inbound preview bodies and buffered upstream JSON responses;
- uses no CORS, no-store responses, and same-origin CSP.

Production remote access, authenticated principals, role-specific views, and production secret/session handling remain deferred.
