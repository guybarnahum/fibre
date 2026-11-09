---
id: adr-0035-glance-and-books-at-places
status: accepted
last-reviewed: 2026-11-08
canonical: true
---

# ADR-0035 — A glance on arrival, and books a Thread can meet

**Accepted by Guy November 8, 2026.** Threads read at Abrehot Library every day, but the World held nothing to read, so the whole cohort's talk converged on how to read. Books become World things at places, met through the same attention that meets people. On arrival, that attention is a **glance**: one call over a short ordered list.

## Decision

**A holding is a World fact.**
- A real public-domain work at a real venue: a book on a library's display table.
- The work's identity (catalogue source and ID, title, authors, subjects, languages, a link to its text and its evidence) comes from a public catalogue, Project Gutenberg through the `integrations/books/gutendex.mjs` port. Nothing about a work is invented.
- A venue whose admitted affordances include `Reading` has a display.
- The display is filled from one catalogue page, fixed by the venue, the first time someone arrives in front of it, and then kept (`venue_holdings`). If the catalogue cannot be reached, the display stays unfilled and the next arrival tries again.

**The glance.**
- On arrival, World lists up to five things the arriver could take in now: the people already present (as this Thread sees them, with `knownAs` for anyone it knows) and up to three books from the display.
- The order is where the eye falls. It is fixed by the venue and the moment, so different visits find different books from the same kept shelf. It never depends on who is looking or on what they care about.
- One call (`encounter.glance`, a gate job at the deferred tier) reads the list in order. It returns the item the Thread takes up, if any, its immediate experience of it, and one reason it passed what came before.
- **Before the focus:** seen and passed. **The focus:** noticed. **After it:** never reached.
- Toward the people present, the arriver's attention to the arrival Story is `noticed` when one of them is the focus. Otherwise it is `not_noticed`, with the Thread's reason when they came before its focus, and none when they were never reached.
- Taking up a book is an observable act. World admits it as a one-beat Story whose action names the holding (`holdingRef`), and the Thread's experience of meeting the book belongs to that Story and is consolidated like any other.
- `thread_glances` keeps each list in World's order with its focus, so a person or book missed while absorbed elsewhere is inspectable, not silently absent. The Observatory shows glances with book titles.

**What does not change.**
- Witnesses still appraise an arrival one by one, as before.
- Anything addressed to a Thread keeps its own attention.
- An empty venue still manufactures no company. An arrival at an empty library earns a glance at the books alone, and no social chance.

## Status of what this excludes

| Capability | Status | Extension path |
|---|---|---|
| Reading a book's pages, keeping one's place, a book in hand seen by others | deferred (next slice) | `textUrl` on each holding; a reading encounter starting from the Thread's own position |
| Glances when a focus ends, and beyond arrival | deferred | the same list and record, earned by putting a book down |
| Sections other than the display; bookshops; other things at places (exhibits, art, goods) | deferred | `venue_holdings.section`; other catalogues behind their own ports |
| In-copyright works | deferred | metadata-only holdings, with no text supplied and none invented |
| Amharic and Ge'ez sources; a collection true to a real Addis library | deferred, **named limitation** | the first display is English public-domain only |
| Borrowing, owning, lending, recommending | deferred | economy and social acts over the same holdings |

No permanent constraint.

## Evidence

- `services/world-kernel/test/world-arrival-perception.test.mjs`:
  - a display is filled once from attested works and kept, and an unreachable catalogue invents nothing;
  - a glance is read in World's order, nothing after the focus is noticed, and taking up a book is an admitted act on that holding that the Thread experiences;
  - different visits find different books from the same kept shelf.
- `integrations/books/gutendex.test.mjs`: only works the catalogue attests as public domain, with their text, become works.
- On staging: the glances in each Observatory; topic diversity across conversations; people missed while absorbed against the earlier noticing rate; whether two Threads given the same list take up different things.
