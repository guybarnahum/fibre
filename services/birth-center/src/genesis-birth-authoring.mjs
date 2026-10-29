import { GENESIS_DEVELOPMENT_REQUEST_VERSION } from "./genesis-development-plan.mjs";
import { composeBirthSubjectIdentity, freshBirthParticipants } from "./birth-material.mjs";
import { selectedUrgesForBirth } from "../../../core/src/inherited-urges.mjs";

export function composeGenesisBirthRequest({
  requestId,
  requestedAt,
  selection,
  sexSelection,
  calibrationModel,
  canonicalPlace = null,
  parentage = null,
}) {
  const symbolicBirth=selectedUrgesForBirth(requestId);
  const composedIdentity = composeBirthSubjectIdentity({
    requestId,
    material:selection.material,
    calibrationModel,
    explicitNames:parentage===null?null:{femaleName:parentage.femaleName,maleName:parentage.maleName},
  });
  const subjectIdentity = Object.freeze({
    ...composedIdentity,
    ...(sexSelection === null ? {} : { sex: sexSelection }),
    ...(selection.selector === null ? {} : {
      place: Object.freeze({
        country: canonicalPlace?.country ?? selection.selector.country,
        city: canonicalPlace?.city ?? selection.selector.city,
        ...(canonicalPlace === null ? {} : { lat:canonicalPlace.lat, long:canonicalPlace.long }),
      }),
    }),
    ...(selection.heritage === null ? {} : { heritage: selection.heritage.display }),
  });
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec: selection.worldSpec,
    subjectIdentity,
    genomeValues:symbolicBirth.values,
    originMaterial:symbolicBirth.originMaterial,
    participants: freshBirthParticipants({ requestId, participants: parentage?.participants??selection.participants }),
    placeAffordances: selection.placeAffordances,
    bornAt:selection.worldSpec.timeFrame.startAt,
    chronologyEndsAt:selection.worldSpec.timeFrame.endAt,
    timeZone: selection.timeZone,
  });
}

