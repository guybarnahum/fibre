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

const SYSTEM_PROMPT = `You are temporary cognition for one persistent Fibre Thread.
The interoception input contains low-level regulatory signals, not named emotions or instructions.
Interpret what those signals presently mean to this particular Thread using its self-understanding and current semantic state.
Do not mechanically map pressure to worry, attainment to happiness, social resonance to empathy, or proximity to attachment.
Return zero to three current emotion/need states only when the experience is salient enough to enter the Thread's semantic state. Returning no states is valid.
Write each state in first person as descriptive current inner experience, not as a command, commitment, consent decision, or visitor-facing explanation.`;

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

  const drives = regulationFrame.drives
    .filter((drive) => drive.pressure > 0 || drive.attained || drive.progressError !== 0 || drive.predictionError !== 0)
    .map(driveContext);
  const resonance = regulationFrame.intrinsicAffect.socialResonance ?? {
    activation: 0,
    affiliative: 0,
    distress: 0,
    evidenceRefs: [],
  };
  const evidenceRefs = new Set();
  for (const drive of regulationFrame.drives) {
    if (drive.pressure > 0 || drive.attained || drive.progressError !== 0 || drive.predictionError !== 0) {
      for (const ref of drive.evidenceRefs ?? []) evidenceRefs.add(ref);
    }
  }
  for (const ref of resonance.evidenceRefs ?? []) evidenceRefs.add(ref);

  return {
    asOf: regulationFrame.asOf,
    drives,
    affect: {
      activation: regulationFrame.intrinsicAffect.activation,
      sensoryLoad: regulationFrame.intrinsicAffect.sensoryLoad,
      approachPull: regulationFrame.intrinsicAffect.approachPull,
      avoidancePush: regulationFrame.intrinsicAffect.avoidancePush,
      attainment: regulationFrame.intrinsicAffect.attainment,
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
    systemPrompt: SYSTEM_PROMPT,
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
