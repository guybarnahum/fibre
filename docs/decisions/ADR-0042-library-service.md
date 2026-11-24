---
id: adr-0042-library-service
status: proposed
last-reviewed: 2026-11-24
canonical: true
---

# ADR-0042: The Library, a service for the works of the world

**Proposed November 24, 2026**, on Guy's direction that "books (and other media)" become a separate service, not part of the World Kernel. Not yet accepted. It builds on [ADR-0035](ADR-0035-glance-and-books-at-places.md) (books at places) and [ADR-0041](ADR-0041-knowing.md) (knowing).

## Why

- **Book texts are not World state.**
  - The World holds what happens: who is where, who read what, what each Thread came to know.
  - On November 23 its own storage took in 24 public-domain books, about 22 MB, one of them 6 MB. That is in the same storage that holds every Thread's life, and every read counts toward the World's row budget.
  - Pictures, music and film would be far larger.
- **Sources fail, and the World should not fail with them.**
  - From November 14 Gutenberg's website answered every request with 503, and no Thread read anything for nine days.
  - Fetching, retrying, honouring each source's rules and keeping copies are replaceable machinery. They belong outside the World's own process.
- **More sources and media are coming.** Each one should be added without changing the World.
- **What a Thread read should be exactly identifiable.** One immutable edition with a content digest makes "it read pages 41–43 of this text" a fact anyone can check later.

## Decision

### 1. Two owners, one line between them

**The Library service (`library`) owns the works.** It has no knowledge of any Thread:

- **Catalogue:** works found across admitted sources, with what each source attests (title, authors, subjects, language, licence).
- **Editions:** the exact bytes of a work as fetched once. They are immutable and content-addressed: `editionId = "ed_" + sha256(bytes)`. A changed text is a new edition.
- **Passages:** a bounded passage of an edition from a byte position, the same every time for the same edition and position.
- **Fetching:** each source's access rules (allowed host, spacing, retries, identifying itself), applied in one place.

**The World Kernel keeps what happens in the world.** None of it moves:

- what is on which shelf, the display, the returns cart;
- what a Thread took up, where it stopped, whether it means to go on;
- what it came to know (knowledge events);
- who was told what (disclosure);
- ownership and lending, when they come (economy).

The World records the `editionId` of every holding and reading. It also records **the passage the Thread actually read**: at most 1,500 characters, its byte range and digest, stored with the reading as part of the Thread's history. A Thread's past never depends on the Library being up.

**The Library never chooses for a Thread.** It has no recommendations, no personalisation, and no Thread IDs in any request. Which shelf a walk passes, what is on the display and what the Thread's eye falls on stay World's choices, by place and moment (ADR-0041). The Library answers "what works exist and what do they say", never "what should this Thread see".

### 2. The contract (`fibre-library-v1`, over a service binding)

| Call | Returns |
|---|---|
| `GET /works?language&topic&page` | One stable page of admitted works, each with its source attestation and, when held, its `editionId` |
| `POST /editions/keep {workRef}` | The `editionId`, fetching the text once if it is not yet held (idempotent) |
| `GET /editions/{editionId}` | The edition's work, source, licence, size, digest, and where the body begins and ends (after a source's header and before its licence) |
| `GET /editions/{editionId}/passage?from&maxChars` | `{text, startByte, nextByte}`, ending at a paragraph, then a sentence, then a word. `nextByte` is null at the end |

Admission rule: a work is admitted only when its source attests it is in the public domain or under an open licence such as CC0. Nothing about a work is inferred.

### 3. Storage and deployment

- **Edition bytes:** an R2 bucket (`fibre-library`), keyed by digest.
- **Catalogue, editions and the fetch log:** a D1 database (`fibre-library-catalog`).
- **One Library per environment,** like every other service: `fibre-library-staging`. Content addressing makes sharing one corpus between environments safe later; that is not done now.
- **Pages to read:**
  - the World reaches the Library through a `LIBRARY` service binding;
  - the service is listed in `infra/deployments/environments/cloudflare.yaml`;
  - a source adapter lives under `integrations/library/<source>.mjs`.

### 4. Sources

- **First, Project Gutenberg:**
  - its catalogue is read through Gutendex;
  - its texts come only from the Gutenberg foundation's mirror (`gutenberg.pglaf.org`), never the website. [Gutenberg's policy](https://gutenberg.org/policy/robot_access.html) reserves the website for people.
- **Next, as needed:**
  - Standard Ebooks (CC0; carefully edited);
  - Wikisource;
  - the Internet Archive's public-domain texts (scanned, so quality varies).
- **Not Google Books:** its API serves finding and previewing books, not reading them.

### 5. Availability

- **Shelves fill ahead of time.** When the World fills a shelf, it asks the Library to keep each work's edition, so books are held before anyone opens them.
- **When the Library is down,** a reading cannot happen at that moment. It is logged, as it is today, and shelves already filled stay filled.
- **A past reading stays readable** because the World keeps the passage the Thread read.

### 6. Other media

The same work and edition model, with a `form`: text now; images, audio and film later. A Thread perceives only what it can take in, so a non-text form needs a perceivable rendering. For example:

- an image's description, made once per edition by a vision model and kept with its provenance;
- a piece of music's description, and its words where it has them.

Each new form is its own slice, with a decision on how a Body and a mind take it in.

### 7. Moving off the World's own copies

The World's `library_book_texts` tables (`8cf8d67`) are a stopgap so reading works now.

1. An operator tool copies those texts into the Library once.
2. The World then reads through the binding and stops writing to those tables.
3. The tables remain as known legacy, because World storage never drops tables or columns.

Existing holdings are matched to editions by `workRef` (source and source ID).

## Slices

| Slice | What |
|---|---|
| L-1 | The service: Gutenberg adapter, R2 and D1, `keep` and `passage`; the World reads through the binding, falling back to its own copies; copies moved |
| L-2 | The World records `editionId` and the passage read with each reading; filling a shelf asks the Library to keep its books |
| L-3 | A second text source (Standard Ebooks or Wikisource) |
| L-4 | Images, perceived through kept descriptions (own decision) |

## Vision and ambition guard

- **Proves or enables:** "books and intellectual formation" stays functional when sources fail. It also opens a path to many sources and media without growing the World.
- **Excluded, with status:**
  - images, audio, film: **deferred** (L-4 onward);
  - works not attested free to use: **rejected** for the Library itself. Licensed works later belong to the economy (buying and lending), recorded in the World.
  - one corpus shared across environments: **deferred**.
- **Extension paths:**
  - **economy:** owning, buying, lending and wearing out copies stay World facts over `editionId`;
  - **culture:** works in other languages, and national canons, through `language` and admitted sources;
  - **family and lineage:** books inherited, or kept in a household, are World holdings like any shelf.
- **Temporary shortcuts:**
  - the World's own copies (`8cf8d67`), reversed by L-1;
  - one Library per environment, reversible by sharing editions.
- **Permanent constraints:** none.
- **Causal individuality and attention:** unchanged. The Library cannot see or choose for a Thread. What a Thread meets and takes up stays the World's and the Thread's own (ADR-0041).

## Not chosen

- **Keeping texts in the World's storage:** this is why the ADR exists.
- **The World fetching from sources itself:** a failing source would fail the World.
- **A Library that recommends:** it would author what Threads find (ADR-0041).
- **Putting book content into the Presentation service:** Presentation shows Threads to people; the Library holds what exists in the world.
