import { selectRegulationAttention } from "../../../core/src/regulation-attention.mjs";
import { interpretIntrinsicRegulation } from "./interoceptive-cognition.mjs";
import { formSocialPresenceTarget } from "./social-presence-cognition.mjs";

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
    return { attention: null, interpretation: null, socialPresence: null };
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

  return { attention, interpretation, socialPresence };
}
