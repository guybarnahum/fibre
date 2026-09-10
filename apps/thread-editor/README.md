# Thread Editor

Thread Editor is Fibre's loopback-only operator inspection surface: a **lens over authoritative Fibre services**, never a second World, identity authority or generic database browser.

Its job is to make a persistent artificial person causally legible.

## Organism view

The Editor should expose the Thread from inherited substrate upward:

```text
DNA / genome
  symbolic loci
  bounded organismic regulator baselines
  source / parent / mutation provenance

Primitive drives now
  safety / threat
  energy / nourishment
  rest / recovery
  attachment / social proximity
  reproduction / mating when developmentally active
  exploration / information
  commitment / presence

Current regulatory targets
  at / with / near / away_from / connected_to / available_for
  pressure / urgency / progress / attainment
  World evidence explaining the signal

Interoception
  the bounded sensations/control cues cognition actually received

Semantic interior
  Thread-authored feelings, needs and relationship attitudes

Lived action
  current place/movement
  Flight Plan / care plan
  recent decisions and behavior

History / memory / meaning
  what happened
  what was remembered
  what it came to mean

Provenance
  exact authoritative records and causal references
```

The primary debugging question is:

> **Why does this Thread want to move, stay, approach, avoid, eat, rest, explore or seek someone right now?**

The Editor should let an operator trace that answer downward to World conditions and DNA, and upward into feeling and behavior.

## DNA explorer

DNA is a first-class Editor view.

For symbolic loci, show the inherited natural-language value, source parent/ancestor and source locus, mutation if any, and later expression evidence when available.

For organismic runtime baselines, show the inherited value beside its narrow allowed Fibre-species envelope and source values. Small primitive-regulator differences should look small; the UI must not imply that a bounded numeric control parameter is personality or destiny.

A useful drill-down is:

```text
inherited baseline
  -> current effective regulator setting
  -> live drive signal
  -> interoceptive cue
  -> semantic interpretation
  -> behavioral consequence
```

Genome state is read-only after birth.

## Lived-person view

As Flight Plan/E2E work resumes, the selected Thread should also remain readable as a life:

```text
Now
  actual place / movement / physical-vs-mediated presence
  current activity
  why this is happening
  who is present

Flight Plan
  intended half-day/day places, presences and commitments

Care
  caregiver plan + authority scope when applicable
  differences between dependent and caregiver wills

Recent history
Memory / meaning
Provenance
```

For a child or other dependent person, preserve whose intention is whose. A caregiver can constrain enacted life without rewriting the dependent person's own plan.

## Same person, different public surface

```text
World / Thread authorities
       |
authorized private projections
       |---------------------------|
Thread Editor                public Presentation
                                  |
                             insidefibre.com
```

Thread Editor may expose private drives, DNA and semantic state under operator authorization. insidefibre.com should not expose these internals by default; it lets a visitor encounter the lived person.

## Interaction posture

Editor is read-oriented. It may inspect DNA, regulation, plans, current situation, encounters, interpretation and consequences as those capabilities land. It does not author them.

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
- Raw regulator state, DNA and private semantic state remain operator-authorized and are not public Presentation by default.
- Keep the primary view human-readable; exact JSON/provenance is drill-down evidence rather than the interface.