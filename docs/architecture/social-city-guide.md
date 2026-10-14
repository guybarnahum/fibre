---
id: architecture-social-city-guide
status: accepted
last-reviewed: 2026-10-14
canonical: false
---

# Fibre City Guide: public editorial discovery of social places

## Purpose

Fibre's public social-discovery metaphor is a **city magazine**, like a local Time Out guide. It is not a named conversational oracle, social matchmaker, or authoritative record of other people's whereabouts. Threads and humans can discover public places for social, intellectual or cultural activity. A place may be empty; no conversation or attendance is promised.

## City manifest

The repository's `data/social-city-guide.json` is a compact city-keyed editorial manifest. Keys have the form `tbilisi-GE`, with a display city, country name/code, and a stable-keyed map of public places.

Each place contains `name`, `address`, `description`, `activities`, `lastRecommendedAt`, `source: { directory, url }`, and optional `worldPlaceRef` (null for places not independently admitted to World).

`lastRecommendedAt` is when the *magazine* last recommended or editorially refreshed a venue. Reading a page does not change it. It is not the Thread's personal recommendation or the last visit or a statement about who is there.

An externally listed place may be in the magazine before independent World admission. Only the World owns shared physical-place identities, current presence, plans and encounters. Repeated public facts for admitted venues must agree with World evidence. Multiple independent public directories and venue sources remain supported; Fibre's own directory is not mandatory.

The initial source-grounded example is the National Library of Georgia Building III in Tbilisi, admitted to staging in S0. The manifest contains no private homes, individual Thread IDs, plans, feelings or visitor lists. An empty city result means **not yet listed**, not that no places exist.

The pure `services/world-kernel/src/social-city-guide.mjs` reader supports bounded city/country lookup. `npm run city-guide:list -- --city Tbilisi --country GE` inspects the committed data locally. Public website pages, indexable URLs and external directories belong to later slices. The guide does not create a new background runtime or require LLM cognition.

## Defining living scenario

1. A Thread in her grounded home has actual unfulfilled social contact, intellectual stimulation or exploration pressure, interpreted through her own developing self.
2. She may remember somewhere meaningful, read the City Guide, or choose neither. The operator and guide never author her decision.
3. If she chooses a place, her ordinary personal Flight Plan expresses the intention; World enacts actual travel and eventual arrival.
4. She reads, waits, explores or leaves. It is legitimate if no one else comes.
5. Another Thread may independently arrive and either may notice, initiate, ignore or decline. Human interaction requires genuine mediated or on-site participation, not an imaginary physically present human.
6. Only warranted objective stories, private experiences and optional remembered meaning can influence her later life.

The central acceptance is an **independently motivated Thread finding and visiting a credible place**, with an honest empty-venue branch and a separate, optional naturally arriving counterpart.

## Slice direction

- **S0:** Geography staging-accepted (three distinct Tbilisi homes known to locality precision and one real public library); no manufactured attendance.
- **S1A:** **Accepted as a source/local capability on October 14:** 4/4 focused tests and 1,606/1,606 full tests passed; the CLI returned the sourced Tbilisi library and an honest `not_listed` result for London. The World worker was separately deployed successfully at `e810c5c9`; **no public magazine endpoint, deployed guide consumer or Thread cognition invocation exists yet**. This replaces the superseded oracle.
- **S1B:** Genuine plural external public-directory sourcing with attribution, and no false World admission.
- **S1C:** Public Inside Fibre magazine pages, sitemap and third-party discovery (website workstream).
- **S1D:** Human browsing and relevant filters/participation opportunities (website workstream).
- **S1E:** The Thread voluntarily uses learned memory, the guide or neither through existing Interior Cognition.
- **S1F:** Ordinary Flight Planning and World enact voluntary travel, stay, departure and empty-place outcomes.
- **S2:** Real co-presence and genuinely voluntary social initiation/reception.
- **S3:** Actual gatherings and later-life social consequences.

Source changes, local proof, staging observations, public availability and later causal agency are different evidence levels. No new source is counted as a real Thread decision or encounter.
