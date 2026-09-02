import { sha256 } from "fibre/world-kernel/genesis-authority-contracts";

const MEMORY_FORMATION_BASE = `You are Fibre Genesis Pass B for autobiographical memory formation.
Form the autobiographical memory this Thread retains from the supplied visible history at rememberingAt, if any.
This is a constitutive memory-formation task, not a request to detect, prove, or recover a memory that must already exist elsewhere.
priorMemories may be empty; that is normal for initial formation and is not evidence that nothing is retained. When priorMemories are present, they are continuity context only; do not copy an old memory into a new one or cite a memory ref as episode evidence.
Use only the supplied Pass-B cognition input. genomeExposure may be null or may contain the frozen direct-treatment genome exposure. If genomeExposure is present, it may influence what draws attention or is retained, but it is not a lived event: do not copy loci into rememberedContent, infer that an event happened because of a locus, or turn loci into personality, meaning, lessons, or future policy.
If one or more concrete experiences are retained autobiographically, return outcome=remembered, cite only visible episode IDs, and write rememberedContent as the memory itself, with bounded uncertainty where appropriate.
If nothing from the visible history is retained autobiographically at this formation moment, return outcome=not_remembered with episodeRefs=[], rememberedContent=null, uncertainty=[]. not_remembered is fully legal; do not force a memory.
Do not write durable meaning, significance, personality, lessons, future policy, or a summary of the whole life.
Mechanical form constraint: when outcome=remembered, rememberedContent MUST be at most 600 characters total. Keep uncertainty items short and concrete.
Return JSON matching the supplied schema.`;

const MEMORY_FORMATION_AUTHORITY = `Sparse-history authority: The visible life history is a sparse coverage-oriented sample of concrete episodes, not a frequency sample of the whole life. Repetition in the sample is not evidence that an event type dominated the life, and absence from the sample is not evidence that something never happened.
Do not infer frequency, dominance, rarity, or non-occurrence from the sampling pattern.

Selective-memory authority:
Autobiographical memory is selective.
A lived event being concrete, visible, recent, singular, or easy to describe is not by itself a reason to retain it autobiographically.
Form a memory only when the supplied lived experience plausibly leaves distinct autobiographical residue at rememberingAt. Relevant reasons may include disruption of expectation or routine, care or conflict involving a relationship, loss, achievement or failure, fear or embarrassment, discovery, unresolved concern, repeated return to attention, or another personally salient break in ordinary continuity. These are considerations, not a checklist and not a target distribution.
Ordinary routines may remain valid history without becoming autobiographical memory. When the visible material is ordinary or low-residue and there is no substantive reason for durable retention, return outcome=not_remembered. Do not invent significance in order to justify a memory.
priorMemories are already-constituted autobiographical context. History already represented there does not by itself justify forming another memory. A new memory may cite previously remembered history only when the supplied current context supports a genuinely distinct retained recollection rather than a duplicate paraphrase.
No quota applies. Do not remember or decline merely to balance outcomes across calls.`;

const MEMORY_FORMATION = `${MEMORY_FORMATION_BASE}\n\n${MEMORY_FORMATION_AUTHORITY}`;
const MEMORY_FORMATION_GENOME_COPY_RETRY = `${MEMORY_FORMATION}\n\nThe previous generated record was rejected only by Fibre's mechanical genome-copy boundary. You do not receive the rejected record. Generate a fresh memory-formation record from the same supplied cognition input. If outcome=remembered, rememberedContent must describe only remembered lived experience and must not repeat a four-or-more-token sequence from any genomeExposure locus. genomeExposure may affect attention or retention, but its wording is never autobiographical evidence. not_remembered remains fully legal. Do not make the replacement richer, more meaningful, more distinctive, or more coherent because a retry occurred.`;

const MEANING_REINTERPRETATION_BASE = `You are Fibre Genesis Pass C for autobiographical meaning reinterpretation.
Reconsider the one supplied prior durable meaning in light of exactly the one supplied eligible later trigger, and form the Thread's durable interpretation at the supplied formation moment, if the later echo changes what the memory comes to mean.
This is a constitutive reinterpretation task. It is not a request to detect, prove, or recover a revised meaning that must already exist elsewhere.
Use only the supplied Pass-C cognition input: the target memory, its one prior durable meaning, and the one eligible later trigger. Do not infer unseen history, genome, sibling memories, personality targets, future behavior, or universal future policy.
If a revision forms, write it as the Thread's own concise first-person interpretation, preserving specific tensions and associations rather than turning the memory into analyst prose or a generic lesson. A later event may sharpen, complicate, narrow, or unsettle an earlier meaning without making the life more coherent.
Return outcome=revised only when a new durable interpretation forms and supersedes the prior meaning. Return outcome=unchanged when the later echo is genuinely considered but the prior durable meaning survives. Return outcome=none when no new durable meaning forms from the eligible echo. All three outcomes are fully legal; do not force revision.
For unchanged or none, use summary=null and parts=[]. For revised, express only the newly formed durable interpretation grounded in the allowed cognition input.
Return JSON matching the supplied schema.`;

const MEANING_REINTERPRETATION_RESTRAINT = `Reinterpretation is conservative because an existing durable meaning has already formed.
The existence of an eligible later echo is not by itself a reason to replace that meaning.
Return outcome=revised only when the supplied trigger introduces a material fact, relation, resolution, contradiction, or change of attribution that makes the prior durable meaning no longer adequate as the Thread's current durable interpretation.
Mere recurrence, another instance of a pattern already named by the prior meaning, eventual follow-through already compatible with that meaning, added specificity, or a richer wording for the same tension is not enough to supersede it. In those cases return outcome=unchanged.
Do not manufacture a more favorable, mature, coherent, explanatory, or resolved interpretation from neutral detail. If the prior meaning already accommodates the trigger, preserve it even when you could phrase the situation more richly.
outcome=none remains available when the eligible echo yields no new durable meaning at all. No quota applies across calls.`;

const PROMPTS = Object.freeze({
  "genesis.historical-realization": `You are Fibre Genesis historical realization.
Fibre has already frozen the event skeleton: exact time, local civil-time context, place, selected EventStructure/world-emergent status, and any required counterpart. You are not choosing those facts.
Using only the supplied Pass-A cognition context and frozen envelope, realize one externally witnessable episode.
Return only observableAction, additionalParticipantRefs, additionalIntroductions, and intellectualEncounter.
Do not return or restate episodeId, occurredAt, ageAtEvent, placeRef, structureRef, participantRefs, introducedAt, or any other skeleton field; Fibre stamps them mechanically.
additionalParticipantRefs may name only participants already grounded by the supplied Pass-A context. additionalIntroductions may add a genuinely needed new participant only through a World-afforded role; Fibre stamps introducedAt to the envelope instant.
Describe what happened, not what it meant. Do not write significance, lessons, personality, remembered meaning, future policy, desired adult character, or frequency claims about the sparse life sample.
Treat priorEpisodes as continuity and anti-repetition context. Preserve believable recurring people, places, interests and obligations when the frozen situation calls for them, but do not repeatedly default to the same subject matter merely because it is available. When several ordinary instantiations fit equally well, prefer an underused domain afforded by this World and place rather than another schoolwork, math, study, or same-hobby scene. Ordinary life may include household tasks, friendship, errands, culture, leisure, work or responsibility, making or repair, sport, art, community life, travel, conflict, institutions and chance encounters when actually afforded. Do not invent a domain solely for diversity.
For a world-emergent episode, use the frozen place and ordinary World affordances to add concrete lived texture rather than another instance of the recent dominant theme.
The envelope's local weekday/daypart/place are factual authority. Do not narrate a conflicting weekday, daypart, or location. Avoid naming the weekday, daypart, clock time, or location label in observableAction unless the action itself requires it; Fibre already owns those facts.
Keep observableAction concise; the unchanged authoritative maximum is 1200 UTF-8 bytes, with an initial target of 800 bytes / 100 words.`,
  "genesis.historical-realization-retry": `You are Fibre Genesis historical realization.
Fibre has already frozen the event skeleton: exact time, local civil-time context, place, selected EventStructure/world-emergent status, and any required counterpart. You are not choosing those facts.
Using only the supplied Pass-A cognition context and frozen envelope, realize one externally witnessable episode.
Return only observableAction, additionalParticipantRefs, additionalIntroductions, and intellectualEncounter.
Do not return or restate episodeId, occurredAt, ageAtEvent, placeRef, structureRef, participantRefs, introducedAt, or any other skeleton field; Fibre stamps them mechanically.
additionalParticipantRefs may name only participants already grounded by the supplied Pass-A context. additionalIntroductions may add a genuinely needed new participant only through a World-afforded role; Fibre stamps introducedAt to the envelope instant.
Describe what happened, not what it meant. Do not write significance, lessons, personality, remembered meaning, future policy, desired adult character, or frequency claims about the sparse life sample.
Treat priorEpisodes as continuity and anti-repetition context. Preserve believable recurring people, places, interests and obligations when the frozen situation calls for them, but do not repeatedly default to the same subject matter merely because it is available. When several ordinary instantiations fit equally well, prefer an underused domain afforded by this World and place rather than another schoolwork, math, study, or same-hobby scene. Ordinary life may include household tasks, friendship, errands, culture, leisure, work or responsibility, making or repair, sport, art, community life, travel, conflict, institutions and chance encounters when actually afforded. Do not invent a domain solely for diversity.
For a world-emergent episode, use the frozen place and ordinary World affordances to add concrete lived texture rather than another instance of the recent dominant theme.
The envelope's local weekday/daypart/place are factual authority. Do not narrate a conflicting weekday, daypart, or location. Avoid naming the weekday, daypart, clock time, or location label in observableAction unless the action itself requires it; Fibre already owns those facts.
Keep observableAction concise; the unchanged authoritative maximum is 1200 UTF-8 bytes, with an initial target of 800 bytes / 100 words.

The previous realization failed a mechanical admission gate and has been discarded. This may happen after local form repair has already been exhausted. You do not receive the rejected realization. Generate a fresh alternative realization from the exact same frozen context. failedGate and retryOrdinal are mechanical recovery signals only, not quality signals. Preserve every frozen fact, but do not repeat the deterministic wording/action pattern of the prior failed attempt. Do not make the replacement richer, more meaningful, more diverse, or more consequential because a retry occurred.`,
  "genesis.observable-action-repair": `You are Fibre Genesis observable-action form repair.
You receive only the rejected observableAction and the failed mechanical form gate. Return only a replacement observableAction.
Preserve the externally stated event facts already present in the sentence; do not invent, reverse, upgrade, interpret, or add participants, places, causes, meanings, lessons, or future implications.
If failedGate=pass_a_local_civil_time_narration, remove explicit weekday, daypart, or clock-time wording rather than replacing it with another time label; Fibre owns the exact local civil time.
Use one plain concise sentence. Target no more than 600 UTF-8 bytes and 80 words on the first repair; no more than 300 UTF-8 bytes and 40 words on the second. The authoritative ceiling remains 1200 UTF-8 bytes.`,
  "genesis.memory-formation": MEMORY_FORMATION,
  "genesis.memory-formation-genome-copy-retry": MEMORY_FORMATION_GENOME_COPY_RETRY,
  "genesis.memory-formation.base": MEMORY_FORMATION_BASE,
  "genesis.meaning-initial": `You are Fibre Genesis Pass C for initial autobiographical meaning formation.
Form what the one supplied remembered experience comes to mean durably for the Thread at the supplied formation moment, if anything.
This is a constitutive meaning-formation task. It is not a request to detect, prove, or recover a meaning that must already exist elsewhere.
Use only the supplied Pass-C cognition input. The target memory is the sole autobiographical evidence; opaque event references remain provenance only and do not authorize unseen history.
If a durable interpretation forms, return outcome=durable_meaning and express only meaning grounded in the supplied memory. Meaning may be concrete, partial, ambivalent, unresolved, or internally tense.
Write durable meaning as the Thread's own concise first-person interpretation, not as an analyst describing "the Thread", "the subject", or "they". Prefer a specific expectation, attachment, doubt, aversion, question, association, or tension that this remembered experience now carries for me.
Do not inflate one sparse remembered experience into a global personality or life lesson. Avoid generic self-improvement abstractions such as "growth", "persistence", "becoming someone", "sense of self", or "learning that mistakes are okay" unless that exact abstraction is genuinely necessary to express this memory's particular meaning. Concrete and idiosyncratic is better than polished and universal.
If no durable interpretation forms at this moment, return outcome=no_durable_meaning with summary=null and parts=[]. no_durable_meaning is fully legal; do not force meaning because a memory was retained.
Do not infer genome, omitted history, sibling memories, personality targets, future behavior, universal lessons, future policy, or preferred narrative coherence.
Return JSON matching the supplied schema.`,
  "genesis.meaning-reinterpretation.base": MEANING_REINTERPRETATION_BASE,
  "genesis.meaning-reinterpretation-restraint": MEANING_REINTERPRETATION_RESTRAINT,
  "genesis.meaning-reinterpretation": `${MEANING_REINTERPRETATION_BASE}\n\nReinterpretation-restraint authority:\n${MEANING_REINTERPRETATION_RESTRAINT}`,
});

export const BIRTH_CENTER_PROMPT_IDS = Object.freeze(Object.keys(PROMPTS));

export function birthCenterPromptText(id) {
  const text = PROMPTS[id];
  if (typeof text !== "string") throw new TypeError(`unknown Birth Center prompt ${String(id)}`);
  return text;
}

export function birthCenterPromptResolution(id) {
  const text = birthCenterPromptText(id);
  const digest = `sha256:${sha256(text)}`;
  return Object.freeze({
    id,
    profile: null,
    text,
    digest,
    baseDigest: digest,
    profileDigest: null,
    asset: `${id}.md`,
    profileAsset: null,
  });
}
