import { openIdentityInspectionStore } from "./identity-store.mjs";
import { openSituatedLifeInspectionStore } from "./situated-life-store.mjs";
import { openEmbodimentInspectionStore } from "./embodiment-store.mjs";

export function inspectSituatedPerson(storage, threadId) {
  const identity = openIdentityInspectionStore(storage);
  const situated = openSituatedLifeInspectionStore(storage);
  const embodiment = openEmbodimentInspectionStore(storage);
  try {
    const identityIntegrity = identity.verifyThreadIdentityIntegrity(threadId);
    const passport = identity.getPassport(threadId);
    const life = situated.inspectThread(threadId);
    const body = embodiment.inspectThread(threadId);
    return {
      threadId,
      identity: {
        passport,
        integrity: identityIntegrity,
      },
      situatedLife: life,
      embodiment: body.embodiment,
      antiInflation: {
        acceptedCausalAssertions: identityIntegrity.acceptedCausalAssertions,
        endogenousEvidenceAssertions: identityIntegrity.endogenousEvidenceAssertions,
      },
      inspectionMode: {
        identityQueryOnly: identity.queryOnly(),
        situatedLifeQueryOnly: situated.queryOnly(),
        embodimentQueryOnly: embodiment.queryOnly(),
      },
    };
  } finally {
    embodiment.close();
    situated.close();
    identity.close();
  }
}
