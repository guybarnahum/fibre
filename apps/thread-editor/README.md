# Thread Editor

Thread Editor is Fibre's loopback-only operator inspection surface: a **lens over authoritative Fibre services**, never a second World, identity authority or generic database browser.

The historical M1 inspector remains useful regression evidence. M2 turns the editor toward the causal shape of a lived person.

## Current capabilities

The editor can inspect durable Thread state, private/operator-authorized evidence and provenance. Its Directory seam supports name/FIN search and `Meet a Thread` selection from eligible public Threads.

`Meet` selects a person. It does not choose or manufacture that person's place, activity or plans.

## M2 lived-person view

Slice A3 should make the selected Thread readable in this order:

```text
Now
  actual place / physical-vs-mediated presence
  current activity
  why this is happening
  who is present

Flight plan
  what the Thread intended or wants next

Care
  caregiver plan + authority scope when applicable
  any difference between the dependent person's will and enacted outcome

Recent history
  what actually happened

Memory / meaning
  what the Thread retained or made of it

Provenance
  exact records behind the readable view
```

Developmental age belongs near the person/relationship context, but age does not mechanically determine care authority or personality.

For a child or other dependent person, the editor must preserve whose intention is whose. A caregiver may change the enacted day within legitimate scope without rewriting the dependent person's own flight plan. A negotiation may itself become history for both.

The editor may show private/operator-authorized detail that insidefibre.com must not expose.

## Same life, different projections

```text
World / Thread authorities
       |
current-life semantics
       |---------------------------|
authorized inspection        public Presentation
       |                           |
 Thread Editor             insidefibre.com
```

Thread Editor explains why Fibre believes the present situation is true. insidefibre.com lets a visitor encounter the person in that situation.

Do not resurrect a separate editor-only Thread model. Reuse Directory, World, Presentation and the current-life service boundaries built for M2.

## Interaction posture

Initial M2 Editor work is read-oriented. It may inspect plans, current situation, encounters, private interpretation and selective consequences as those slices land. It should not become the author of those facts.

The existing bounded preview behavior remains simulation only, not consent, authorization or persistence.

## Run

Historical M1 proof:

```bash
npm run demo:m1
```

Historical M1 editor:

```bash
npm run demo:m1:editor
```

Interactive local start:

```bash
FIBRE_PRIVATE_TOKEN=local-private-token-1234 \
FIBRE_ADMIN_TOKEN=local-admin-token-123456 \
npm run world-kernel

FIBRE_PRIVATE_TOKEN=local-private-token-1234 npm run editor
```

## Boundary

- Browser code receives only the editor access token, never the World private token.
- Direct database mutation is prohibited.
- New Fibre semantics belong in the services that own them; the editor visualizes them.
- Readable prose is projection; source records remain authoritative.
- Production authentication belongs to production-safe operator APIs, not the local editor token scheme.
- Keep the editor thin and human-readable; exact JSON/provenance should be available without dominating the primary view.
