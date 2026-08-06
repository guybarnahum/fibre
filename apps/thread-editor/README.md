# Thread Editor

The M1 Thread Editor is a dependency-free, loopback-only inspection and bounded-simulation surface over the independently running world kernel.

## Consolidated M1 proof

Run Mina's complete deterministic persistent round trip with:

```bash
npm run demo:m1
```

The command generates local credentials, starts separate kernel and editor processes, drives the complete scenario through HTTP, restarts the kernel repeatedly, emits a redacted JSON proof report, and removes its temporary database unless `--keep-database` is supplied.

## Explore the completed M1 world

For the most enjoyable human demonstration, run:

```bash
npm run demo:m1:editor
```

This command first runs the same reviewed M1 proof. After it succeeds, it retains the completed SQLite world, starts the normal World Kernel and credentialed Thread Editor on available loopback ports, and prints the exact access URL.

Open that URL, load `thr_mina_001`, and inspect:

- **Life state** for a plain-language account of Mina's current status, self-model, needs, feelings, intentions, memories, relationships, and record counts;
- **Public events** for readable explanations of `THREAD_SEEDED`, `SELF_MODEL_UPDATED`, and the two `THREAD_FROZEN` life events;
- **Private requests** for dignity, participation, requester, action, snapshot, and integrity explanations across the stale attempt, correlated recovery, accepted request, refusals, and obligation-mediated participation;
- **Runtime episodes** for readable lifecycle, lease, authorization, Actor, Goal Guardian, timeout, abandonment, and freeze explanations;
- **Integrity** for a human explanation of projection, event, memory, and state-fingerprint agreement;
- **Technical JSON** only when exact payload fields, identifiers, hashes, or audit details are needed.

The command uses free ephemeral ports and fresh private, administrative, and editor credentials. Press Ctrl-C when finished. The retained database remains available and its path is printed. To delete it automatically on exit:

```bash
npm run demo:m1:editor -- --delete-on-exit
```

Summarize and verify a retained database with:

```bash
npm run inspect:db -- "/path/to/world.sqlite"
npm run --silent inspect:db -- "/path/to/world.sqlite" --json
```

Use the `--silent` form when stdout must contain only parseable JSON. The inspector checks SQLite integrity, foreign keys, schema version, Thread replay and projection hashes, private request traces, runtime witnesses, freeze and authorization-consumption records, abandonment non-consumption, and freeze-created memory projection.

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

- a plain-language Thread overview before technical fields;
- current projection, lifecycle status, version, and state hash;
- needs, feelings, self-model, unresolved intentions, traits, memory refs, and relationship refs;
- safe public event history with readable version-transition explanations;
- replay integrity and freeze-created-memory integrity in human and exact forms;
- private request, appraisal, dignity, and participation-stance explanations;
- authorization, lease, execution context, Actor, and Goal Guardian explanations;
- freeze reports, authorization consumption, explicit abandonment, timeout, and integrity outcomes;
- exact JSON behind collapsed technical disclosures and in the dedicated Technical JSON view.

Every runtime selection fetches fresh `kernelTime` from the world kernel. A persisted active lease is shown as `Timed out — not yet reclaimed` once kernel time passes `expiresAt`, even before later acquisition persists reclaim. If current kernel time is unavailable, the editor displays `Expiry unknown`; it does not reassure the reviewer that the runtime remains active.

## Readable explanation boundary

The explanation layer is presentation only. It derives sentences and labeled facts from the same API payload shown in the exact JSON disclosure; it does not ask a model to reinterpret the record, invent missing motives, or modify world state.

The readable view intentionally explains Fibre-specific concepts that are otherwise difficult to infer from field names:

- **Dignity match** describes how strongly a request fits the Thread's individualized identity, values, relationships, and distinctive advantage over a generic model.
- **Thread's own response** is the Thread's recorded participation stance, including clarification, resistance, or refusal.
- **Authorized action** is what the world kernel permitted. It is not automatically consent and may differ from the Thread's own response only when the record supplies a valid unresolved obligation reference.
- **Obligation-mediated participation** is named explicitly as compelled participation. The editor shows the Thread's response, dignity band, authorized action, and exact obligation reference rather than converting compulsion into consent.
- **Runtime lease** describes the temporary exclusive right to run the Thread; it is not durable life state.
- **Goal Guardian** describes whether proposed runtime work stayed within the authorized goal.
- **State fingerprint** is a technical drift-detection hash, not a human description of the Thread.
- **Preview** is simulation only and is not consent, authorization, or persistence.

The exact JSON is authoritative. The prose is a deterministic derived explanation and remains subordinate to the source record.

The integrity badge is deliberately tri-state:

- **No failure reported** means the editor received a recognizable report containing no explicit failed boolean check. It does not claim an independent browser-side verification.
- **Review needed** means the returned report contains an explicit failed check.
- **Integrity unknown** means the report is absent or unrecognized. Unknown never falls through to a reassuring state.

The world kernel may reject an integrity request with an error rather than return a failed report. In that case the editor displays the request error; it does not manufacture a successful badge.

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
