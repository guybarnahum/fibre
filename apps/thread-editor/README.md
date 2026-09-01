# Thread Editor

`apps/thread-editor` is Fibre's loopback-only human workspace for inspecting authoritative Threads and, in later slices, initiating explicit Birth Center development workflows.

It is an application, not a semantic authority.

## Modern boundary

```text
browser
  -> Thread Editor local application server
  -> deployment service boundary
  -> World Kernel / Birth Center / Thread Presentation
  -> Fibre semantic services
  -> InfraDriver
  -> selected provider
```

The browser never receives `FIBRE_PRIVATE_TOKEN`, a database path, a D1/Durable Object binding, or provider credentials. The editor does not open SQLite, import World stores, inspect tables, or reconstruct authoritative records itself.

The current read-only inspection slice consumes the World Kernel's private Thread inspection contract:

```text
GET /internal/threads
GET /internal/threads/:threadId/inspection
```

The World Kernel assembles those responses from its authoritative readers. Local deployment readers are backed by the local `InfraDriver`; Cloudflare readers are backed by the Cloudflare `InfraDriver` and the same World state scope.

## Current views

The editor discovers existing Threads and presents:

- authoritative Thread projection and current state;
- Thread Passport and current identity provenance;
- Civil Registry / Fibre Identity Number;
- autobiographical memories;
- situated relationships and places;
- symbolic genome;
- current Embodiment records;
- authoritative World event history;
- World replay/projection integrity;
- identity integrity;
- exact World inspection JSON for technical diagnosis.

The running editor no longer uses the old M1 request/runtime/expression fan-out and no longer exposes self-model command previews.

## Start locally

Run the World Kernel with the same private token used by the editor:

```bash
FIBRE_PRIVATE_TOKEN=<private-token> npm run world-kernel
```

Then:

```bash
FIBRE_PRIVATE_TOKEN=<same-private-token> npm run editor
```

Or put `FIBRE_PRIVATE_TOKEN` in the normal local environment used by both processes.

The editor prints a per-run URL containing a one-time browser bootstrap token in the URL fragment. The browser stores that editor token in session storage and the server removes Fibre service credentials from the browser boundary.

Defaults:

```text
World Kernel   http://127.0.0.1:8787
Thread Editor  http://127.0.0.1:4173
```

Optional configuration:

```text
FIBRE_WORLD_URL
FIBRE_EDITOR_HOST
FIBRE_EDITOR_PORT
FIBRE_EDITOR_ACCESS_TOKEN
```

`FIBRE_EDITOR_HOST` and `FIBRE_WORLD_URL` remain loopback-only in this local application.

## Authority rules

The editor may explain and display authority; it does not create authority by inspecting it.

It must not:

- read or mutate provider storage directly;
- add editor-specific database queries;
- infer missing identity/history from presentation data;
- turn a public presentation snapshot into World truth;
- manufacture Genesis, FIN, genome, memory, relationship, or Embodiment records;
- treat a browser form as a semantic birth contract.

Birth workflows belong to Birth Center. Homage/Echo/source eligibility belongs to the Fibre origin contracts. Presentation belongs to Thread Presentation.

## Next slices

The next editor capability is Birth Center inspection and Genesis/model provenance: development request, durable plan, model invocations, prompt/version witnesses, provisional status, and resulting Genesis/Thread identity.

After that, the editor can initiate supported Birth Center workflows. New origin families such as Thread-parent, Echo, Homage, and sponsorship must first exist as real Fibre/Birth Center contracts; the editor must not emulate them with prompt text or ad-hoc fields.
