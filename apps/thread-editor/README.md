# Thread Editor

Thread Editor is Fibre's loopback-only operator inspection surface. It is a **lens over authoritative Fibre services**, not a second World, identity authority or generic database browser.

The editor began as the M1 persistent-round-trip inspector. Current development is moving it toward the lived-person view needed for M2.

## Current capabilities

The editor can inspect one Thread's durable World state and integrity/provenance views, including life state, needs, feelings, self-model, intentions, memories, relationships, public history, private request/runtime evidence and technical JSON.

The modern Directory seam also supports:

- search by name or FIN;
- bounded Thread-owned attributes;
- `Meet a Thread` selection from eligible public Threads;
- opening the selected Thread in the existing inspection view.

`Meet` selects a person. It does not choose or manufacture that person's place, activity or plans.

## M2 visualization direction

The editor should increasingly visualize the Fibre-native causal chain rather than add more generic record browsing:

```text
identity + developmental age
  -> relationships / dependency
  -> personal flight plan
  -> caregiver care plan when applicable
  -> World-owned enacted current situation
  -> recent lived history
  -> autobiographical memory / private interpretation
  -> provenance
```

For an autonomous adult, the personal flight plan normally governs intended movement/activity.

For a child or other dependent person, a caregiver may have a separate scoped care plan. The editor must preserve whose intention is whose. A care override may change the enacted day without rewriting the dependent person's own will; negotiation can itself become history for both.

Thread Editor may show private/operator-authorized detail that insidefibre.com must not expose.

## Public-surface relationship

insidefibre.com is the encounter surface, not the inspector.

Both surfaces consume the same underlying Fibre life through different projections:

```text
World / Thread authorities
       |                 |
authorized inspection   public Presentation
       |                 |
 Thread Editor        insidefibre.com
```

The Viewer should let a visitor find a Thread where they already are and meet them in that current situation. The editor may explain why Fibre believes that situation is true.

## Run the historical M1 proof

```bash
npm run demo:m1
```

For the retained M1 inspection experience:

```bash
npm run demo:m1:editor
```

The M1 demo remains useful regression evidence; it is not the forward product architecture.

## Interactive local start

Run World Kernel and the editor with the same private token:

```bash
FIBRE_PRIVATE_TOKEN=local-private-token-1234 \
FIBRE_ADMIN_TOKEN=local-admin-token-123456 \
npm run world-kernel

FIBRE_PRIVATE_TOKEN=local-private-token-1234 npm run editor
```

The editor prints a loopback URL containing a per-run access token in the fragment.

## Authority and access boundary

- Browser code receives only the editor access token, never the World private token.
- The editor server proxies only allowlisted service reads and bounded preview behavior.
- Direct database mutation is prohibited.
- Presentation prose is derived explanation; source records remain authoritative.
- Production remote access/authentication belongs to production-safe operator APIs, not this local token scheme.
- Preview is simulation, not consent, authorization or persistence.

The editor should stay thin. New Fibre semantics belong in the services that own them; the editor visualizes those semantics.
