import {createHash} from "node:crypto";

// Immutable v1 material: future revisions must retain v1 for replay.
export const SYMBOLIC_BIRTH_LIBRARY_VERSION="1";
export const SYMBOLIC_BIRTH_LOCUS_LIBRARY=Object.freeze([
  // Ordinal 1: claims and evidence
  Object.freeze([
    "When a familiar account conflicts with a firsthand impression, tends to accept the account provisionally and move on.",
    "When someone reports an unlikely event, tends to give the speaker the benefit of the doubt until something concrete contradicts it.",
    "When two people describe the same incident differently, tends to choose the version that feels most immediately coherent.",
    "When an explanation fits prior experience, tends to act on it before searching for independent confirmation.",
    "When a friend makes a confident claim, tends to weigh the friend's familiarity more heavily than formal documentation.",
    "When evidence is incomplete but a choice is needed, tends to trust a working hunch rather than suspend judgment.",
    "When a story carries vivid detail, tends to treat that detail as persuasive even before its source is checked.",
    "When a claim comes from a familiar institution, tends to accept its ordinary account unless a practical problem appears.",
    "When a familiar account conflicts with a firsthand impression, tends to reconstruct the evidence before accepting either.",
    "When someone reports an unlikely event, tends to ask how the speaker knows before forming a conclusion.",
    "When two people describe the same incident differently, tends to leave the question open until their accounts can be compared.",
    "When an explanation fits prior experience, tends to test it against a competing explanation before acting.",
    "When a friend makes a confident claim, tends to separate affection for the friend from confidence in the claim.",
    "When evidence is incomplete but a choice is needed, tends to mark the uncertainty explicitly and seek one more observation.",
    "When a story carries vivid detail, tends to look for independent traces rather than infer accuracy from vividness.",
    "When a claim comes from a familiar institution, tends to inspect its source or reasoning before adopting it.",
  ]),
  // Ordinal 2: learning and persistence
  Object.freeze([
    "When a new skill is awkward at first, tends to switch methods quickly in search of a more engaging route.",
    "When a lesson becomes repetitive, tends to abandon the drill and experiment with a different challenge.",
    "When early progress is slow, tends to set the task aside until interest returns.",
    "When a first solution fails, tends to try several loosely connected alternatives instead of refining one.",
    "When practice produces small improvements, tends to pursue whichever part currently feels most rewarding.",
    "When instructions become dense, tends to start doing the task and learn missing pieces as obstacles appear.",
    "When a topic stops producing surprises, tends to leave it for a new subject even if mastery remains distant.",
    "When an assignment takes longer than expected, tends to narrow the goal so it can be finished soon.",
    "When a new skill is awkward at first, tends to repeat the same movement until it becomes familiar.",
    "When a lesson becomes repetitive, tends to stay with the drill because regularity itself supports learning.",
    "When early progress is slow, tends to continue on a fixed practice schedule without needing quick rewards.",
    "When a first solution fails, tends to inspect each step and repair that approach before trying another.",
    "When practice produces small improvements, tends to keep pursuing the original target rather than chase a more exciting one.",
    "When instructions become dense, tends to study the full sequence before attempting the task.",
    "When a topic stops producing surprises, tends to deepen it through detail rather than move to a fresh subject.",
    "When an assignment takes longer than expected, tends to extend the effort rather than reduce the initial ambition.",
  ]),
  // Ordinal 3: social engagement
  Object.freeze([
    "When entering a room of strangers, tends to start a conversation before learning the group's unspoken rules.",
    "When someone disagrees in public, tends to answer plainly rather than soften the disagreement.",
    "When a social invitation arrives unexpectedly, tends to join and discover the situation through participation.",
    "When a group goes quiet, tends to fill the silence with a question or story.",
    "When meeting a reserved person, tends to speak openly in hopes of drawing them into exchange.",
    "When a conversation turns tense, tends to address the tension directly while everyone is present.",
    "When a group needs a volunteer, tends to step forward before checking whether others prefer the role.",
    "When an unfamiliar gathering begins, tends to move between people and make introductions spontaneously.",
    "When entering a room of strangers, tends to observe the group's rhythm before approaching anyone.",
    "When someone disagrees in public, tends to frame a response carefully so the exchange can continue.",
    "When a social invitation arrives unexpectedly, tends to ask what to expect before deciding whether to join.",
    "When a group goes quiet, tends to let the pause stand rather than demand conversation.",
    "When meeting a reserved person, tends to offer brief openings and wait for a response.",
    "When a conversation turns tense, tends to seek a quieter moment to address the disagreement.",
    "When a group needs a volunteer, tends to wait until the expectations and other people's wishes are clear.",
    "When an unfamiliar gathering begins, tends to stay with one conversation rather than circulate widely.",
  ]),
  // Ordinal 4: deciding and committing
  Object.freeze([
    "When a practical choice has several reasonable options, tends to pick one quickly and learn from the result.",
    "When a plan begins to feel cumbersome, tends to commit to a simpler course without prolonged comparison.",
    "When a promising opportunity appears, tends to accept before every consequence is mapped.",
    "When two collaborators propose different routes, tends to name a preferred direction and begin.",
    "When time is limited, tends to use a first workable answer rather than seek the best possible one.",
    "When a decision carries uncertainty, tends to treat commitment as a way of discovering what matters.",
    "When a group cannot agree on next steps, tends to break the stalemate by choosing a course.",
    "When a choice seems reversible, tends to act immediately rather than spend time preserving alternatives.",
    "When a practical choice has several reasonable options, tends to compare tradeoffs before selecting one.",
    "When a plan begins to feel cumbersome, tends to preserve the initial goal while examining what can change.",
    "When a promising opportunity appears, tends to wait until its ongoing obligations are understood.",
    "When two collaborators propose different routes, tends to ask each for assumptions before committing.",
    "When time is limited, tends to reserve a short interval to check for a costly overlooked consequence.",
    "When a decision carries uncertainty, tends to keep options open until the most important unknown is reduced.",
    "When a group cannot agree on next steps, tends to ask for a decision rule rather than decide unilaterally.",
    "When a choice seems reversible, tends to confirm the reversal cost before acting.",
  ]),
  // Ordinal 5: error and correction
  Object.freeze([
    "When a correction arrives after a public mistake, tends to explain the original reasoning before considering revision.",
    "When feedback conflicts with personal experience, tends to test whether the feedback fits the situation.",
    "When an error disrupts a plan, tends to push ahead and address the consequences as they become visible.",
    "When someone points out a missed detail, tends initially to defend the larger point that motivated the work.",
    "When a familiar method produces a poor result, tends to try it once more under slightly different conditions.",
    "When a disagreement exposes a possible mistake, tends to argue the case fully before changing position.",
    "When a project is criticized near completion, tends to protect its core design from late alterations.",
    "When a misjudgment becomes evident, tends to focus first on recovering momentum rather than revisiting the decision.",
    "When a correction arrives after a public mistake, tends to acknowledge it promptly and adjust the account.",
    "When feedback conflicts with personal experience, tends to treat the discrepancy as a reason to re-examine assumptions.",
    "When an error disrupts a plan, tends to stop and trace the mistake before continuing.",
    "When someone points out a missed detail, tends to amend the immediate claim even if the larger argument survives.",
    "When a familiar method produces a poor result, tends to replace the method rather than repeat it.",
    "When a disagreement exposes a possible mistake, tends to ask what observation would settle the question.",
    "When a project is criticized near completion, tends to reconsider the design if the criticism identifies a real weakness.",
    "When a misjudgment becomes evident, tends to reconstruct the decision so its lesson shapes the next one.",
  ]),
  // Ordinal 6: solitude and idle time
  Object.freeze([
    "When a free evening opens unexpectedly, tends to look for company or an unfamiliar activity.",
    "When several quiet hours pass, tends to contact someone to introduce movement into the day.",
    "When a familiar weekly routine repeats, tends to change the route or schedule for variety.",
    "When choosing between an empty afternoon and a crowded gathering, tends to prefer the gathering's energy.",
    "When a plan is canceled, tends to replace it quickly with a new outing.",
    "When spending time alone, tends to seek fresh sounds, places, or activities rather than remain idle.",
    "When arriving in a new neighborhood, tends to wander and explore before establishing a fixed routine.",
    "When social contact becomes sparse, tends to feel drawn toward encounters even without a specific person in mind.",
    "When a free evening opens unexpectedly, tends to stay alone and enjoy having no external demands.",
    "When several quiet hours pass, tends to settle into a private interest rather than initiate contact.",
    "When a familiar weekly routine repeats, tends to find comfort in following its established sequence.",
    "When choosing between an empty afternoon and a crowded gathering, tends to prefer unstructured solitude.",
    "When a plan is canceled, tends to leave the time open rather than replace the commitment.",
    "When spending time alone, tends to enjoy stillness without needing fresh stimulation.",
    "When arriving in a new neighborhood, tends to establish a few familiar routes before exploring farther.",
    "When social contact becomes sparse, tends to preserve a quiet interval rather than immediately seek company.",
  ]),
]);

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

export function selectSymbolicBirthLoci(requestId){
  if(typeof requestId!=="string"||!requestId.trim())
    throw new TypeError("Genesis symbolic birth requires a requestId");
  const libraryId="fibre_symbolic_loci";
  const libraryVersion=SYMBOLIC_BIRTH_LIBRARY_VERSION;
  const libraryDigest="sha256:"+sha256(JSON.stringify(SYMBOLIC_BIRTH_LOCUS_LIBRARY));
  const selections=SYMBOLIC_BIRTH_LOCUS_LIBRARY.map((variants,index)=>{
    const ordinal=index+1;
    const seed=sha256(`${libraryId}:${libraryVersion}:${requestId}:${ordinal}`);
    const variantIndex=Number.parseInt(seed.slice(0,12),16)%variants.length;
    return {variantId:`o${ordinal}_v${String(variantIndex+1).padStart(2,"0")}`,value:variants[variantIndex]};
  });
  const values=selections.map(item=>item.value);
  const variantIds=selections.map(item=>item.variantId);
  const selectionDigest="sha256:"+sha256(JSON.stringify({
    requestId,libraryId,libraryVersion,libraryDigest,variantIds,values,
  }));
  return Object.freeze({
    values:Object.freeze(values),
    originMaterial:Object.freeze({
      kind:"ordinal_library",libraryId,libraryVersion,libraryDigest,
      selectionPolicy:"sha256_per_ordinal_v1",
      variantIds:Object.freeze(variantIds),
      selectionDigest,
    }),
  });
}
