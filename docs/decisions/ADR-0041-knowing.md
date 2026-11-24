---
id: adr-0041-knowing
status: accepted
last-reviewed: 2026-11-23
canonical: true
---

# ADR-0041 — Knowing: width and depth, found by chance, felt, shared and valued

**Accepted by Guy, November 23, 2026.** It builds on [ADR-0035](ADR-0035-glance-and-books-at-places.md) (the glance and books at places), [ADR-0036](ADR-0036-social-body.md) (the social Body), [ADR-0037](ADR-0037-status-and-conflict.md) (standing), [ADR-0038](ADR-0038-body-levels.md) (Body levels) and [ADR-0040](ADR-0040-disclosure.md) (disclosure).

## Why
Staging (November 23): eight Threads at one library and one park talked about nearly one subject. They read 84% of their exchanges as nothing new, and their weariness of the same stood at 0.64–1.0.

The code showed why:
- the library was one table of 32 popular classics, set once and never changed, with three in reach;
- the glance chose by the Thread's plan and interests, and the Body's appetite for something new never reached it;
- learning was not rewarded;
- knowledge earned nothing socially.

Guy (Nov 23):
- **Discovery:** chance encounters with books should widen interests, from a book to a Thread, to a conversation, to other Threads.
- **The Body:** a Thread is glad to learn.
- **Knowledge as social currency:** telling someone something new gives the upper hand in the moment, as teacher or parent.
- **Common ground:** telling someone who cares about the subject brings closeness and the sense of not being alone.
- **Breadth and depth pay off:** width and depth widen economic options and make a Thread more interesting, valuable and attractive, to Threads and to humans.
- **A strong Body structure** must support this, as an emergent outcome.

## Decision
1. **World supplies chance.**
   - A library has shelves by subject, each filled once from the public-domain catalogue.
   - A display set anew each week.
   - A returns cart of books others read there lately.
   - Within reach on a visit are the display, the one shelf the walk passes (by the venue and the moment, never by interest), the returns cart, and the Thread's own book in progress.
   - **The library keeps its own copy of each book** once it can fetch it whole: the book taken up, and one more within reach on each visit. Its pages then no longer depend on the catalogue being up. From November 14 Gutenberg's website answered World with 503s, and no reading happened. Texts are now fetched only from the Gutenberg foundation's mirror (`gutenberg.pglaf.org`), never the website: Gutenberg's policy says the website is for people and points programs to its mirrors. A busy mirror is asked once more. An operator can have World keep its shelves' books ahead of time (`npm run library:keep`), which also proves access from where World runs.
2. **The Body reaches the moment of choosing.** The glance receives the Body's felt words (weariness of the same, what it would welcome instead, company wanted). Felt, never an order.
3. **Learning moves the urges the Body already has; nothing is replicated.** World measures two Body levels with the shared level component (spikes that fade, more slowly the more persistent the inherited locus):
   - **novelty,** for the inherited `exploration` urge: a subject new to it adds the most, an exchange read as new half as much, one read as somewhat new a quarter. A remark is less than a new subject: on November 23, two "somewhat new" turns in a dull day were felt as a lift worth telling;
   - **competence,** for `mastery_itch`: each step deeper adds to it.

   The regulation core reads them as it reads every urge, through the same drives, genome gain, felt threshold, persistence and inherited direction:
   - **novelty below the species floor** is the existing `world:novelty` drive's hunger for something new. It used to be fed a constant 0 whenever life was grounded; it now has a measured level. At or above the floor, the drive is attained, felt as the lift of something new.
   - **competence** is `mastery_itch` attained, felt as the satisfaction of going deeper.
   - **each book begun and not gone back to** is a `mastery_itch` drive aimed at that work. It builds over the first day after stopping, holds, and lets go after a week (species constants). Reading on stills it; a book set aside or finished leaves none. `mastery_itch` joins the organism policy's enabled families.

   Felt words are read from the drives, like every other urge's. They reach the glance, contact decisions and the Flight Plan's interoception, which already knows where each book in progress is kept.
5. **Knowledge and interests are World fact,** as information items in the disclosure ledger. Who knows which subject, how it came, and who learned from whom are recorded.
6. **Teaching and closeness are emergent, never mechanisms** (Guy, November 23). They arise from low-level social regulation through one primitive, **affective association**: what a Body felt in someone's company becomes part of how it takes them.
   - **What counts:** each talk is felt as a whole, as people remember one: by its best moment and how it ended (peak and end), from the Thread's own reading of each turn. A talk that brought something new is warm; one that brought nothing new is a little cool. Being credited or asked for advice by them warms it for a while.
   - **How it settles:** each talk moves its sense of them part of the way toward how that talk felt (the shared level component's tracked baseline), so warmth is what talks with them tend to be. An old friend stays warm between visits; a friend whose talks bring nothing new cools a little, never into a stranger. The more persistent its inherited attachment, the more slowly one talk moves it. The warmth of being valued fades over days.
   - **How it acts:** it deepens or thins the bond, which the existing attachment, longing and reunion drives read. Trust is left to kept and broken faith.
   - **Promise:** how much they lately brought it something new, fading over days. The existing `exploration` pull toward a person, until now only for someone new or long unseen, also counts it, so someone who brings something new stays interesting however well known, felt as "they tend to bring you something new".
   - **Good news seeks company:** a fresh lift, from something new or from going deeper, raises the existing `social_contact` urge as a pull toward someone to tell (`self:share`), as strong at its height as the hunger for company and shaped by the same genome. Whom is the bond's and warmth's to decide; whether to tell, and how much, what foresight imagines (D2). When the pull is felt, its words name what the Thread last read and the subjects it met there (a World fact, as the unfinished book's title is). On November 24, Threads felt the pull and talked on about captions, with nothing to tell. A faint pull is not put into words as a lift.

   From this:
   - **Teaching emerges.** A lift makes the learner want to tell someone. The hearer's lift in the teller's company becomes warmth and promise, so it seeks the teller out and, in its own reflection, credits them or asks their advice. The teller's standing is satisfied by being valued, and that satisfaction warms it toward the hearer, so it tells again.
   - **Closeness emerges.** Two Threads who keep bringing each other something new, or going deeper together, warm toward each other both ways.

   No World rule turns a reading into credit, and no Thread is told what another lacks.
7. **Width and depth have economic weight** (livelihood L2+) **and public weight** (visitors, K2).

Nothing is labelled. Width and depth are measured for observation only, never shown to a Thread.

## Slices
| Slice | What | Status |
|---|---|---|
| W1 | A real library; the Body in the glance | Built |
| W2 | Learning felt (discovery, competence); what a Thread knows as World fact | Built |
| W2b | Learning through the existing urges: measured novelty for `exploration` (hunger or lift), competence and the unfinished-book itch for `mastery_itch` | Built |
| W3a | Affective association (the primitive teaching and closeness emerge from): talks felt by peak and end, settling as expectation; promise; good news seeks company; conversation feels learning | Built |
| W3b | A subject passing in talk as World fact (heard from whom, by meaning); writing to someone with no insight to share | next |
| W4 | Width and depth in livelihood | with L2 |
| W5 | Width and depth to visitors | with K2 |

## Emergent, not authored: the true-to-life range
Telling is also disclosure ([ADR-0040](ADR-0040-disclosure.md)), so the pull to tell (standing appetite, warmth toward people who value it) meets what foresight imagines could be lost. Each Thread's genome, history and consequences settle the balance. None of the following is coded. Each is expected to emerge in some Threads, and each is tolerated, because each is useful in some lives:
- **Teaching and closeness:** described above.
- **Hoarding:** a low-trust Body that dreads being used withholds. It misses the lifts and the warmth, and grows lonelier until its company hunger pushes it to risk again. It is protective after being burned.
- **Cliques:** warmth concentrates where tellings were rewarded, so knowledge flows within trusted circles first.
- **Credit theft and gossip:** what one taught resurfaces as another's (disclosure's passing-on, ADR-0040). Standing stings and resentment follow through the existing paths.
- **Over-telling:** a Body hungry for standing tells too much. Hearers read nothing new and cool toward it, their regard drops, and the teller's standing stings, which teaches calibration.
- **Bluffing:** claiming knowledge to gain standing (deception remains a disclosure mode), until found out, when trust is wounded.

**What the measures check:** these show up and vary across Threads. Their absence would suggest the forces are too weak; their dominance, too strong.

## Not chosen
- **Choosing books by a Thread's interests, or a rule to pick something different:** either would author the outcome.
- **Teaching or closeness credits as mechanisms** (a reading converted into regard, shared interests weighted as closer contact, a percept of what another lacks): each would author an outcome that low-level regulation should produce.
- **A new "curiosity" urge, or reward levels beside the drives:** the inherited `exploration` and `mastery_itch` families and the regulation core already carry need, satisfaction and genome shaping.

## Excluded
| Capability | Status |
|---|---|
| Comics and picture books (need a vision reading path and another source) | deferred |
| Newspapers | deferred |
| Bookshops | deferred |
| A librarian who recommends | deferred |
