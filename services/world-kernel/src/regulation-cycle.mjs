import { selectRegulationAttention } from "../../../core/src/regulation-attention.mjs";
import { interpretIntrinsicRegulation } from "./interoceptive-cognition.mjs";
import { formSocialPresenceTarget } from "./social-presence-cognition.mjs";

function semanticTrace(state) {
  return {
    stateId: state.stateId,
    domain: state.domain,
    dimension: state.dimension,
    state: state.state,
    evidenceReferences: [...state.evidenceReferences],
  };
}

export function regulationOrganismTrace({ currentFrame, attention, interpretation, socialPresence }) {
  return {
    asOf: currentFrame.asOf,
    species: currentFrame.species,
    attention,
    regulation: {
      drives: currentFrame.drives.filter((drive) =>
        drive.pressure > 0 || drive.attained || drive.progressError !== 0 || drive.predictionError !== 0),
      intrinsicAffect: currentFrame.intrinsicAffect,
    },
    interoception: interpretation?.interoception ?? null,
    semanticStates: interpretation?.states?.map(semanticTrace) ?? [],
    nextPresence: socialPresence?.target ?? null,
    cognition: {
      interoception: interpretation?.cognition ?? null,
      socialPresence: socialPresence?.cognition ?? null,
    },
  };
}

export async function runIntrinsicRegulationCycle({
  thread,
  previousFrame,
  currentFrame,
  semanticStateStore,
  situatedLifeStore,
  modelAdapter,
}) {
  const attention = selectRegulationAttention(previousFrame, currentFrame);
  if (attention === null) {
    return {
      attention: null,
      interpretation: null,
      socialPresence: null,
      organismTrace: null,
    };
  }

  const interpretation = await interpretIntrinsicRegulation({
    thread,
    regulationFrame: currentFrame,
    semanticStateStore,
    modelAdapter,
  });

  const socialPresence = await formSocialPresenceTarget({
    thread,
    asOf: currentFrame.asOf,
    situatedLifeStore,
    semanticStateStore,
    modelAdapter,
  });

  return {
    attention,
    interpretation,
    socialPresence,
    organismTrace: regulationOrganismTrace({
      currentFrame,
      attention,
      interpretation,
      socialPresence,
    }),
  };
}
