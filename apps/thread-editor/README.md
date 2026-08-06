# Thread Editor

The M1 Thread Editor is a dependency-free, loopback-only inspection and bounded-simulation surface over the independently running world kernel.

## Consolidated M1 proof

Run Mina's complete deterministic persistent round trip with:

```bash
npm run demo:m1
```

The command generates local credentials, starts separate kernel and editor processes, drives the complete scenario through HTTP, restarts the kernel repeatedly, emits a redacted JSON proof report, and removes its temporary database unless `--keep-database` is supplied.

## Interactive start

Run the world kernel and editor with the same private token. Configure an admin token whenever live command acceptance is needed outside the editor:

```bash
FIBRE_PRIVATE_TOKEN=local-private-token-1234 \
FIBRE_ADMIN_TOKEN=local-admin-token-123456 \
npm run world-kernel

FIBRE_PRIVATE_TOKEN=local-private-token-1234 npm run editor
```

The editor prints a per-run URL containing an access token in the URL fragment. Open that exact URL. Browser code stores the token in session storage and removes the fragment from the current address.

Optional editor configuration:

```text
FIBRE_EDITOR_HOST=127.0.0.1
FIBRE_EDITOR_PORT=4173
FIBRE_WORLD_URL=http://127.0.0.1:8787
FIBRE_PRIVATE_TOKEN=<same local token used by the world kernel>
FIBRE_EDITOR_ACCESS_TOKEN=<optional fixed local token; otherwise generated per run>
```

A configured `FIBRE_EDITOR_ACCESS_TOKEN` has a 16-character minimum only. Operators are responsible for supplying a high-entropy value; the generated default is preferred.

## Inspection surface

The editor loads live API data for one Thread ID and presents:

- current projection, lifecycle status, version, and state hash;
- needs, feelings, self-model, unresolved intentions, traits, memory refs, and relationship refs;
- safe public event history;
- replay integrity and freeze-created-memory integrity;
- private request/appraisal/stance summaries and complete traces;
- authorization, lease, execution context, Actor, and Goal Guardian records;
- freeze reports, authorization consumption, explicit abandonment, timeout, and integrity outcomes;
- raw aggregated inspection data.

Every runtime selection fetches fresh `kernelTime` from the world kernel. A persisted active lease is shown as `Timed out — not yet reclaimed` once kernel time passes `expiresAt`, even before later acquisition persists reclaim. If current kernel time is unavailable, the editor displays `Expiry unknown`; it does not reassure the reviewer that the runtime remains active.

## Access boundary

Every `/api/editor/*` request requires the per-run editor token. Missing, wrong, truncated, extended, or case-modified credentials fail before any upstream request.

The world-kernel private token is held by the editor server and injected only into an allowlisted upstream GET surface. It is never returned to browser JavaScript. A different local process must possess the editor token before it can use the editor API to read public or private Thread records.

This is a local M1 credential, not production authentication, principal identity, or role-based authorization.

### Fragment-delivery note

URL fragments are not sent to the server and are removed from the current page with `history.replaceState`. A fragment pasted or typed into a browser may nevertheless remain in browser/omnibox history. Use an ephemeral browser profile for sensitive local demonstrations and do not reuse the editor credential.

## Bounded simulation

The only mutation-shaped control is `Preview self-model update`. The editor constructs a canonical `UPDATE_SELF_MODEL` command using kernel-published time and calls the deterministic preview route.

The browser response omits the raw `previewId`, but preview identity is derivable from the returned deterministic receipt fields. This omission is presentation redaction, not an authority control. The actual write boundary is the world kernel's required `FIBRE_ADMIN_TOKEN`, and the editor exposes no command-acceptance route.

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

The editor is therefore an inspection and simulation tool, not an alternative world-kernel write path.

## Transport and filesystem boundary

The editor server:

- binds only to loopback and enforces loopback Host authorities;
- accepts only a loopback HTTP world-kernel URL;
- requires a per-run credential before every editor API route;
- returns prompt authenticated 404 responses for unknown `/api/*` paths;
- provides no generic reverse proxy;
- percent-encodes every allowlisted upstream suffix segment;
- allows private upstream GETs only for request/runtime/freeze/abandon inspection;
- constructs one preview-only POST;
- rejects encoded path traversal and every symbolic-link segment under the static root;
- verifies realpath containment;
- opens and stats each static response through one file descriptor;
- caps inbound preview bodies and buffered upstream JSON responses;
- uses no CORS, no-store responses, no-referrer, nosniff, and same-origin CSP.

Production remote access, authenticated principals, role-specific views, and production secret/session handling remain deferred.
