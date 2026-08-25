// fibre-test-support: test-only
// Migrates narrow pre-B8 Genesis fixtures without weakening production birth authority.

import { deriveGenesisLifeContinuity } from "../../src/genesis-life-continuity-v1.mjs";
import { attachTestCivilRegistration } from "./civil-registration-fixture.mjs";

function externalPeopleIn(episodes, threadId) {
  const participantRefs = episodes.flatMap((episode) => episode.participantRefs ?? [])
    .filter((participantId) => participantId !== threadId);
  const introductions = episodes.flatMap((episode) => episode.introducedParticipants ?? []);
  return { participantRefs, introductions };
}

export function publishMinimalGenesisPriorLifeFixture(genesis, birth, options = undefined) {
  const threadId = birth?.thread?.threadId;
  const episodes = birth?.episodes ?? [];
  if (typeof threadId !== "string" || threadId.length === 0) {
    throw new TypeError("minimal Genesis prior-life fixture requires a Thread");
  }
  if (!Array.isArray(episodes) || episodes.length === 0) {
    throw new TypeError("minimal Genesis prior-life fixture requires life episodes");
  }
  if (birth.initialRoster !== undefined || birth.lifeContinuity !== undefined) {
    throw new TypeError("minimal Genesis prior-life fixture cannot replace explicit situated continuity");
  }

  const external = externalPeopleIn(episodes, threadId);
  if (external.participantRefs.length !== 0 || external.introductions.length !== 0) {
    throw new TypeError("minimal Genesis prior-life fixture cannot infer external people");
  }

  const { record: worldSpec } = genesis.getWorldSpec(birth.manifest.worldSpecRef);
  // deriveGenesisLifeContinuity requires a non-empty roster. The Thread-self entry
  // is intentionally ignored by person derivation, so this creates no fictional
  // relation; it only makes the episode's actual WorldSpec places durable.
  const initialRoster = [{ participantId: threadId }];
  const lifeContinuity = deriveGenesisLifeContinuity({
    threadId,
    worldSpec,
    initialRoster,
    episodes,
  });

  return genesis.publishBirth(attachTestCivilRegistration({
    ...birth,
    initialRoster,
    lifeContinuity,
  }), options);
}
