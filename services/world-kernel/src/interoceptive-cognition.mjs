import { promptRequest } from "./cognition-prompts.mjs";
import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { BUILTIN_SEMANTIC_DIMENSIONS } from "./semantic-state.mjs";

const INTERPRETABLE_DIMENSIONS = BUILTIN_SEMANTIC_DIMENSIONS
  .filter(({ domain }) => domain === "emotion" || domain === "need");
const DIMENSIONS_BY_DOMAIN = new Map([
  ["emotion", new Set(INTERPRETABLE_DIMENSIONS.filter(({ domain }) => domain === "emotion").map(({ dimension }) => dimension))],
  ["need", new Set(INTERPRETABLE_DIMENSIONS.filter(({ domain }) => domain === "need").map(({ dimension }) => dimension))],
]);
const DIMENSIONS = [...new Set(INTERPRETABLE_DIMENSIONS.map(({ dimension }) => dimension))];

const RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["states"],
  properties: {
    states: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["domain", "dimension", "state"],
        properties: {
          domain: { type: "string", enum: ["emotion", "need"] },
          dimension: { type: "string", enum: DIMENSIONS },
          state: { type: "string", minLength: 1, maxLength: 600 },
        },
      },
    },
  },
});


function stateContext(record) {
  return {
    stateId: record.stateId,
    domain: record.domain,
    dimension: record.dimension,
    target: record.target,
    state: record.state,
  };
}

function driveContext(drive) {
  return {
    family: drive.family,
    targetRef: drive.targetRef,
    orientation: drive.orientation,
    ...(drive.inheritedDirection===undefined?{}:{feltDirection:drive.inheritedDirection}),
    ...(drive.targetAvailability===undefined?{}:{targetAvailability:drive.targetAvailability}),
    pressure: drive.pressure,
    urgency: drive.urgency,
    progressError: drive.progressError,
    predictionError: drive.predictionError,
    attained: drive.attained,
  };
}

export function projectInteroception(regulationFrame) {
  assertPlainObject("regulationFrame", regulationFrame);
  assertIsoTimestamp("regulationFrame.asOf", regulationFrame.asOf);
  if (!Array.isArray(regulationFrame.drives)) throw new TypeError("regulationFrame.drives must be an array");
  assertPlainObject("regulationFrame.intrinsicAffect", regulationFrame.intrinsicAffect);

  const felt=(drive)=>drive.felt===undefined
    ?drive.pressure>0||drive.attained||drive.progressError!==0||drive.predictionError!==0
    :drive.felt===true;
  const visible=regulationFrame.drives.filter(felt);
  const drives=visible.map(driveContext);
  const resonance = regulationFrame.intrinsicAffect.socialResonance ?? {
    activation: 0,
    affiliative: 0,
    distress: 0,
    evidenceRefs: [],
  };
  const evidenceRefs = new Set();
  for (const drive of visible) {
    for (const ref of drive.evidenceRefs ?? []) evidenceRefs.add(ref);
  }
  for (const ref of resonance.evidenceRefs ?? []) evidenceRefs.add(ref);

  // Unfelt v2 pressure remains in the Body, not in private cognition.
  // Project only affect attributable to felt drives (or social evidence).
  const hidden=visible.length!==regulationFrame.drives.length;
  const maximum=(items)=>items.reduce((value,item)=>Math.max(value,item.pressure),0);
  return {
    asOf: regulationFrame.asOf,
    drives,
    affect: {
      activation:hidden?Math.max(maximum(visible),resonance.activation):regulationFrame.intrinsicAffect.activation,
      sensoryLoad:hidden?maximum(visible.filter(item=>item.family==="sensory_load")):regulationFrame.intrinsicAffect.sensoryLoad,
      approachPull:hidden?maximum(visible.filter(item=>item.orientation==="approach")):regulationFrame.intrinsicAffect.approachPull,
      avoidancePush:hidden?maximum(visible.filter(item=>item.orientation==="avoid")):regulationFrame.intrinsicAffect.avoidancePush,
      attainment:hidden?Number(visible.some(item=>item.attained)):regulationFrame.intrinsicAffect.attainment,
      socialResonance: {
        activation: resonance.activation,
        affiliative: resonance.affiliative,
        distress: resonance.distress,
      },
    },
    evidenceRefs: [...evidenceRefs],
  };
}

function hasSignal(interoception) {
  const resonance = interoception.affect.socialResonance;
  return interoception.drives.length > 0 ||
    interoception.affect.activation > 0 ||
    interoception.affect.attainment > 0 ||
    resonance.activation > 0 || resonance.affiliative > 0 || resonance.distress > 0;
}

function validateStore(store) {
  if (store === null || typeof store !== "object" ||
      typeof store.listCurrentState !== "function" || typeof store.recordState !== "function") {
    throw new TypeError("semanticStateStore must provide listCurrentState and recordState");
  }
}

export async function interpretIntrinsicRegulation({
  thread,
  regulationFrame,
  semanticStateStore,
  modelAdapter,
}) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  validateStore(semanticStateStore);
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("interoceptive cognition requires a model adapter");
  }

  const interoception = projectInteroception(regulationFrame);
  if (!hasSignal(interoception)) return { states: [], cognition: null, interoception };
  if (interoception.evidenceRefs.length === 0) {
    throw new TypeError("semantic interpretation of regulation requires World or life evidence");
  }

  const currentSemanticState = semanticStateStore.listCurrentState(thread.threadId).map(stateContext);
  const input = {
    thread: {
      threadId: thread.threadId,
      selfDescription: thread.identity?.selfDescription ?? "",
      selfModel: thread.currentState?.selfModel ?? "",
      unresolvedIntentions: [...(thread.currentState?.unresolvedIntentions ?? [])],
    },
    currentSemanticState,
    interoception,
  };
  const invocation = await modelAdapter.invoke({
    ...promptRequest("body.interoception", { threadId: thread.threadId }),
    input,
    responseSchema: RESPONSE_SCHEMA,
    clientRequestId: `interoception_${sha256(canonicalJson(input))}`,
  });
  assertPlainObject("interoceptive cognition result", invocation);
  assertPlainObject("interoceptive cognition output", invocation.output);
  assertPlainObject("interoceptive cognition provenance", invocation.provenance);
  if (!Array.isArray(invocation.output.states)) throw new TypeError("interoceptive cognition states must be an array");
  if (invocation.output.states.length > 3) throw new TypeError("interoceptive cognition may emit at most three states");

  const seenSlots = new Set();
  const recorded = [];
  for (const [index, proposal] of invocation.output.states.entries()) {
    assertPlainObject(`interoceptive cognition states[${index}]`, proposal);
    const allowed = DIMENSIONS_BY_DOMAIN.get(proposal.domain);
    if (!allowed?.has(proposal.dimension)) {
      throw new TypeError(`interoceptive cognition ${proposal.domain}:${proposal.dimension} is not a registered emotion/need dimension`);
    }
    assertNonEmpty(`interoceptive cognition states[${index}].state`, proposal.state);
    const slot = `${proposal.domain}:${proposal.dimension}`;
    if (seenSlots.has(slot)) throw new TypeError("interoceptive cognition cannot emit the same semantic-state slot twice");
    seenSlots.add(slot);

    const previous = currentSemanticState.find((state) =>
      state.domain === proposal.domain && state.dimension === proposal.dimension && state.target === null);
    const result = semanticStateStore.recordState({
      threadId: thread.threadId,
      domain: proposal.domain,
      dimension: proposal.dimension,
      target: null,
      state: proposal.state,
      evidenceReferences: interoception.evidenceRefs,
      asOf: interoception.asOf,
      supersedes: previous?.stateId ?? null,
      provenance: {
        author: thread.threadId,
        authorType: "thread_cognition",
        policyId: "intrinsic_regulation_interpretation",
        policyVersion: "1",
        validator: "semantic_state_validator",
        validatorVersion: "1",
      },
      visibility: "restricted",
      staleness: "current",
    });
    recorded.push(result.state);
  }

  assertNonEmpty("interoceptive cognition provenance.provider", invocation.provenance.provider);
  assertNonEmpty("interoceptive cognition provenance.modelId", invocation.provenance.modelId);
  return {
    states: recorded,
    cognition: {
      provider: invocation.provenance.provider,
      modelId: invocation.provenance.modelId,
      providerRequestId: invocation.provenance.providerRequestId ?? null,
    },
    interoception,
  };
}

// The social Body in words, for cognition that acts among people (a live
// turn, a message): only what this Body feels, never numbers or genes. The
// frame's pressures remain the evidence; these lines are how they are felt.
const BATTERY=Object.freeze([
  [0.3,"Talking has begun to tire you a little."],
  [0.6,"Talking is tiring you; it takes effort now."],
  [1.01,"You are worn out by talk."],
]);
const RESTORES=Object.freeze({
  company:"Livelier company would revive you more than quiet would.",
  quiet_company:"Being near others without having to talk would restore you.",
  solitude:"Time alone would restore you.",
  doing:"Something absorbing to do on your own would restore you.",
});
const HUNGER=Object.freeze([
  [0.3,"You have had little real company lately."],
  [0.6,"You miss company; it has been a while."],
  [1.01,"You badly want company."],
]);
const SEEKS=Object.freeze({
  ambient_company:"Just being among people would ease it.",
  familiar_person:"It is someone familiar you want.",
  conversation:"It is real conversation you want.",
  closeness:"It is closeness you want.",
});
const CURIOSITY=Object.freeze([
  [0.3,"They are still new to you, and you are a little curious about them."],
  [0.6,"They are still new to you; you would like to know who they are."],
  [1.01,"They are still new to you, and you are drawn to find out who they are."],
]);
const CATCHING_UP=Object.freeze([
  [0.3,"It has been a while since you were with them; you wonder how they are."],
  [1.01,"It has been a long time since you were with them; you want to hear what has happened in their life."],
]);
const band=(bands,pressure)=>bands.find(([upper])=>pressure<upper)[1];

const WARINESS=Object.freeze([
  [0.25,"You are not quite at ease with them yet."],
  [0.6,"You are a little guarded with them."],
  [1.01,"You are wary of them."],
]);
const HURT=Object.freeze([
  [0.25,"Something they did still smarts a little."],
  [0.6,"What they did still hurts."],
  [1.01,"What they did still hurts deeply."],
]);
const REVIVED="This brings back the last time they hurt you.";
// Missing a bonded person while apart, by what this Body longs for; and the
// relief of seeing them again, in proportion to how much they were missed.
const LONGING=Object.freeze([
  [0.15,"You have been missing them a little."],
  [0.4,"You miss them."],
  [1.01,"You miss them a great deal."],
]);
const LONGS_FOR=Object.freeze({
  caregiver:"You miss the way they look after you.",
  reciprocal_contact:"You miss hearing from them.",
  shared_presence:"You miss simply being near them.",
});
const REUNION=Object.freeze([
  [0.05,null],
  [0.2,"It is good to see them again."],
  [0.5,"It is good to see them again; you have missed them."],
  [1.01,"Seeing them again is a joy; you have missed them a great deal."],
]);

// Status (ADR-0037): where a person stands with this Body, the sting of a
// slight, the warmth of recognition, the pull to hold one's own, and how it
// sits with its place among people in general.
const STANDS=(status)=>status>=0.5?"You tend to give way to them."
  :status<=-0.5?"They tend to give way to you.":null;
const STUNG=Object.freeze({
  talked_over:"Being talked over by them stung.",
  overlooked:"Being passed over by them stung.",
  corrected:"Their correction stung a little.",
  corrected_publicly:"Being corrected by them in front of others stung.",
  left_out:"Being left out by them stung.",
});
const FLARE=Object.freeze({
  public_correction:"Being corrected by them in front of others stung.",
  exclusion:"Being left out by them stung.",
  refusal_by_close_person:"Their refusal stung, coming from them.",
});
const RECOGNIZED="It warms you that they took notice of what you bring.";
const WANTS_FROM=Object.freeze({
  recognition:"You want them to take notice of what you bring.",
  deference:"You want to hold your own with them.",
  competence:"You want them to see what you can do.",
  belonging:"You want them to make room for you.",
});
// Having had enough of the same, by what this Body seeks instead (S5b).
const WEARY=Object.freeze({
  ideas:"You have had enough of this for now; something new to think about would be welcome.",
  people:"You have had enough of this for now; someone new would be welcome.",
  places:"You have had enough of this for now; a change of scene would be welcome.",
  making:"You have had enough of this for now; you would rather do or make something.",
});
const WEARY_ANY="You have had enough of this for now; something new would be welcome.";
const PLACE=Object.freeze({
  frustrated:"People do not give you the regard you feel is yours.",
  calm:"You feel at ease with your place among these people.",
  valued:"People value you more than you expected.",
  little:"You feel you count for little here.",
});

// How this Body takes each person it perceives, in words: how far it is at
// ease with them and what still hurts, missing them or the joy of seeing them
// again, and curiosity toward someone still new to it or long unseen (only a
// Body inherited to seek people is drawn toward the person).
export function feltTowardPeople(regulationFrame){
  const felt=new Map();
  const add=(item,line)=>{
    const person=item.targetRef.slice("person:".length);
    felt.set(person,[...(felt.get(person)??[]),line]);
  };
  for(const item of regulationFrame?.drives??[]){
    if(item.targetRef?.startsWith("person:")&&item.family==="standing"){
      const stands=STANDS(item.status??0);
      if(stands!==null)add(item,stands);
      if(item.slight&&STUNG[item.slight]&&!["corrected_publicly","left_out"].includes(item.slight))add(item,STUNG[item.slight]);
      if(item.attained)add(item,RECOGNIZED);
      else if(item.felt!==false&&item.pressure>0&&WANTS_FROM[item.inheritedDirection])add(item,WANTS_FROM[item.inheritedDirection]);
      continue;
    }
    if(!item.targetRef?.startsWith("person:")||item.felt===false||item.pressure<=0)continue;
    if(item.family==="standing_flare"&&FLARE[item.triggerKind])add(item,FLARE[item.triggerKind]);
    if(item.family==="trust"){
      add(item,band(WARINESS,item.pressure));
      if(item.hurt>0)add(item,band(HURT,item.hurt));
      if(item.revived)add(item,REVIVED);
    }
    if(item.family==="attachment_proximity"){
      const line=band(item.attained?REUNION:LONGING,item.pressure);
      if(line!==null)add(item,line);
      if(!item.attained&&LONGS_FOR[item.inheritedDirection])add(item,LONGS_FOR[item.inheritedDirection]);
    }
    if(item.family==="exploration"&&item.inheritedDirection==="people")
      add(item,band(item.catchingUp?CATCHING_UP:CURIOSITY,item.pressure));
  }
  return felt;
}

export function feltSocialBody(regulationFrame){
  if(regulationFrame===null)return [];
  const felt=(family)=>regulationFrame.drives.find(item=>item.family===family&&item.felt!==false&&item.pressure>0)??null;
  const lines=[];
  const battery=felt("social_energy");
  if(battery!==null){
    lines.push(band(BATTERY,battery.pressure));
    if(RESTORES[battery.inheritedDirection])lines.push(RESTORES[battery.inheritedDirection]);
  }
  lines.push(...[...feltTowardPeople(regulationFrame).values()].flat());
  const place=regulationFrame.drives.find(item=>item.family==="standing"&&item.targetRef==="self:standing")??null;
  if(place!==null){
    if(place.felt!==false&&place.pressure>0)lines.push(PLACE.frustrated);
    else if(place.attained)lines.push(place.progressError>0.15?PLACE.valued:PLACE.calm);
    else if((place.standingSelf??0)<=-0.4)lines.push(PLACE.little);
  }
  const weary=regulationFrame.drives.find(item=>item.family==="exploration"&&item.targetRef==="self:weariness"
    &&item.felt!==false&&item.pressure>0)??null;
  if(weary!==null)lines.push(WEARY[weary.inheritedDirection]??WEARY_ANY);
  const hunger=felt("social_contact");
  if(hunger!==null){
    lines.push(band(HUNGER,hunger.pressure));
    if(SEEKS[hunger.inheritedDirection])lines.push(SEEKS[hunger.inheritedDirection]);
  }
  return lines;
}
