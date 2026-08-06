# M1 API-backed Thread Editor evidence

Date: 2026-08-05  
Scope: PR #21, live inspection, bounded simulation, and adversarial network-surface hardening

## Capability demonstrated

The fixture-only prototype is replaced by a loopback-only Thread Editor that reads the independently running world kernel through a same-origin inspection server.

The editor can display:

- current Thread projection, status, version, and state hash;
- self-model, needs, feelings, unresolved intentions, traits, memory refs, and relationship refs;
- safe public event history;
- projection/replay and freeze-created-memory integrity;
- restricted request, appraisal, private stance, and request-integrity records;
- restricted authorization, lease, runtime, execution context, Actor, Goal Guardian, freeze, consumption, abandonment, timeout, and integrity records;
- the raw aggregated inspection payload.

The editor distinguishes active, frozen, explicitly abandoned, timed-out, aborted, and completed runtime outcomes.

## Review decisions

### Editor API requires its own per-run credential

Loopback location alone is not accepted as sufficient access to Thread interiority.

The editor generates a random per-run token unless `FIBRE_EDITOR_ACCESS_TOKEN` is explicitly configured. The process prints a URL carrying that token in the URL fragment. Browser code moves it into session storage, removes the fragment from the address bar, and sends it in `x-fibre-editor-token` for every `/api/editor/*` request.

Static files remain loopback-readable, but contain no Thread records or world-kernel credentials. Public and private editor API routes reject missing or incorrect editor credentials before any upstream call.

The world-kernel private token remains server-side and is injected only into allowlisted private GETs. Neither token is returned in editor JSON.

### Kernel time decides displayed expiry

The world-kernel health response publishes `kernelTime` from the same injectable lifecycle clock that owns runtime transitions.

The editor treats a lease as timed out when `expiresAt <= kernelTime`, even if the persisted lease row still says `active` because reclamation is lazy. That pre-reclamation condition is displayed as `Timed out — not yet reclaimed`, preserving the difference between observed expiry and the later durable reclaim transition.

The browser clock does not decide lifecycle expiry.

### Live command acceptance requires administrative authority

The editor response redacts the raw `previewId`, uses kernel-owned time when constructing the preview command, and exposes no acceptance route.

The independently running world-kernel process now also refuses `POST /threads/:threadId/commands` when no `FIBRE_ADMIN_TOKEN` is configured and requires `x-fibre-admin-token` when acceptance is enabled.

Preview remains public and non-mutating. Acceptance is an explicitly authorized administrative write.

## Authority boundary

The editor is not a second world-kernel write path.

Its advertised capabilities explicitly disable:

- Thread seed;
- command acceptance;
- runtime acquisition;
- Actor and Goal Guardian execution;
- freeze;
- abandonment;
- projection repair;
- obligation or unresolved-intention mutation.

The sole simulation operation is a deterministic `UPDATE_SELF_MODEL` preview. The editor server reads the current Thread version and kernel time, constructs the command with a fresh operation ID, and calls only `/commands/preview`.

A preview remains non-mutating and is not consent or Participation Authorization.

## Transport, proxy, and filesystem boundary

The editor server:

1. binds only to loopback;
2. accepts only loopback Host authorities;
3. accepts only a loopback HTTP world-kernel URL with no credentials, path, query, or fragment;
4. requires a per-run editor credential on every editor API request;
5. injects the configured private token only for allowlisted private GETs;
6. provides no generic upstream proxy;
7. percent-encodes every allowlisted suffix segment before upstream interpolation;
8. rejects encoded traversal and unknown route suffixes without forwarding;
9. rejects symbolic-link files and directories under the static root;
10. verifies both lexical and real filesystem containment;
11. opens and stats static content through one file descriptor;
12. requires `application/json` for preview POSTs;
13. rejects unknown preview keys;
14. caps inbound preview bodies and buffered upstream JSON;
15. uses no CORS;
16. applies no-store responses and same-origin CSP;
17. returns private-disabled errors when no world-kernel private token is configured.

The editor access token and private token are local milestone capabilities, not production identity, consent, Participation Authorization, or role-based authorization.

## Named automated evidence

`tools/thread-editor-server.test.mjs`

1. `editor API requires a per-run credential before public or private inspection`
   - health, aggregate inspection, request detail, and runtime detail reject missing editor credentials;
   - no upstream call occurs before authentication.

2. `editor inspection aggregates public and private data without exposing either token`
   - public and private records aggregate into one inspection payload;
   - capabilities advertise credentialed preview-only behavior;
   - the editor credential and world-kernel private token are both absent from browser JSON;
   - the private token is attached only to private upstream calls.

3. `editor preview is JSON-only, bounded, exact-keyed, kernel-timed, and non-transferable`
   - `text/plain` is rejected at the CSRF gate;
   - unknown keys are rejected;
   - oversized bodies receive 413;
   - command time equals kernel-published time;
   - raw preview ID is omitted;
   - no acceptance call occurs.

4. `runtime and request allow-lists reject encoded traversal without forwarding`
   - encoded traversal in a runtime suffix is rejected;
   - encoded traversal in a request suffix is rejected;
   - overlong freeze-integrity paths are rejected;
   - none reaches the world kernel.

5. `editor private inspection and drill-down fail closed when no private token is configured`
   - aggregate public inspection remains usable with the editor credential;
   - no private upstream request occurs;
   - request/runtime list and detail routes return `EDITOR_PRIVATE_ACCESS_DISABLED`.

6. `editor and upstream configuration are loopback-only`
   - HTTPS, non-loopback, and query-bearing upstream URLs are rejected;
   - hostile Host authority returns `MISDIRECTED_REQUEST`.

7. `static editor rejects encoded traversal and symbolic links`
   - encoded static traversal is rejected;
   - symlinked files are rejected;
   - symlinked directories are rejected;
   - a real file in the root remains readable.

8. `static editor responses use same-origin CSP and no-store`

`tools/thread-editor-model.test.mjs`

9. `inspection counts remain derived from the loaded API payload`
10. `runtime outcome distinguishes freeze, explicit abandonment, lazy timeout, and active state`
    - a lease with persisted `status: active` but `expiresAt` before `kernelTime` is shown as timed out and not yet reclaimed.
11. `request and runtime summaries tolerate canonical summary and full-record shapes`

`services/world-kernel/test/server-process.test.mjs`

12. `live command acceptance is disabled without admin authority`
13. `independent world-kernel survives restart with admin-authorized preview-bound command history`
    - missing configuration returns `COMMAND_ACCEPTANCE_DISABLED`;
    - wrong token returns `ADMIN_TOKEN_REQUIRED`;
    - correct admin token preserves preview binding and restart idempotency;
    - health publishes kernel-owned time.

## Adversarial review resolution

- **H-1 resolved:** unattended expiry is computed from `expiresAt` and kernel-owned time before lazy reclaim.
- **M-1 resolved:** editor API reads require a separate per-run credential; loopback alone no longer grants access to Thread interiority.
- **M-2 resolved:** static serving rejects symlinked path segments and verifies realpath containment.
- **M-3 resolved:** encoded suffix traversal, encoded static traversal, `text/plain`, body limit, unknown keys, and private-disabled drill-down all have direct negative tests.
- **M-4 resolved by explicit evidence semantics:** the workflow cited below validates the complete executable review-fix tree before this evidence-only documentation update. The PR description will cite the final consolidated head's workflow.
- **L-1 resolved:** preview ID is redacted and live command acceptance requires admin authority.
- **L-2 resolved:** editor preview time comes from the kernel health clock rather than the editor process clock.
- **L-3 resolved:** the unreachable empty-thread check was removed.
- **L-4 resolved:** explicit credentialed request/runtime summary-list routes are available.
- **L-5 resolved:** static size and stream use one open file descriptor.
- **L-6 resolved:** upstream JSON buffering is capped at 2 MiB.
- **L-7 pinned:** HTTPS, query-bearing upstream URLs, unknown preview keys, and request content type have named tests.
- **L-8 unchanged intentionally:** the Markdown hard break on the Date line matches the evidence-artifact convention.

## Full repository result

GitHub Actions run `31059148586` passed on executable review-fix head `bb3a2c176adf043f80907464294ffd3ca0db7be2` before this evidence-only documentation update:

- `npm run check` passed;
- TypeScript build passed;
- **156/156 tests passed**;
- all pre-existing lifecycle and repository properties remained green;
- all new editor and command-authority properties passed;
- generated context packs were current;
- repository validation passed.

The PR description must cite the final workflow after documentation completion and single-commit consolidation. This artifact deliberately states that its cited run precedes the evidence-only update rather than claiming self-attestation.

## Deliberately deferred

- authenticated remote or multi-user access;
- principal identity and role-specific private/public views;
- production secret/session handling;
- structured obligation identity and mutation;
- production UI framework, asset pipeline, or deployment;
- the consolidated Mina demonstration.

PR #22 will use the credentialed editor as the human-inspectable surface for Mina's complete deterministic persistent round trip.
