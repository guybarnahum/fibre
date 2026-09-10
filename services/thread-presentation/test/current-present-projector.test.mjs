import assert from "node:assert/strict";
import test from "node:test";

import {
  projectCurrentSituationPresent,
} from "../src/current-present-projector.mjs";
import {
  THREAD_PRESENTATION_STREAM_VERSION,
  normalizeThreadPresentationEventInput,
} from "../../world-kernel/src/thread-presentation-stream-domain.mjs";
import {
  placeEpisodeRevisionRef,
} from "../../world-kernel/src/situated-life-evidence.mjs";

const THREAD_ID = "thr_public_present_privacy_001";

function placeEpisode() {
  return {
    episodeId: "plce_public_present_cafe_001",
    revision: 1,
    threadId: THREAD_ID,
    episodeKind: "formative_presence",
    place: {
      placeId: "place_public_present_cafe_001",
      displayName: "Harbor café",
      countryCode: "IL",
      region: "Haifa District",
      locality: "Haifa",
      precision: "locality",
    },
    startAt: "2026-09-10T15:00:00Z",
    endAt: null,
    sourceReferences: ["evt_public_place_001"],
    visibility: "public",
    provenance: "thread_history",
    recordedAt: "2026-09-10T15:01:00Z",
  };
}

function relation({ relationId, partyId, displayName, visibility }) {
  return {
    relationId,
    revision: 1,
    threadId: THREAD_ID,
    relatedParty: { partyId, kind: "human_source", displayName },
    relationKind: "sibling",
    geneticContributionRole: "none",
    relationshipFacts: ["A real relationship fact that is not itself projected into the current scene."],
    sourceReferences: [`evt_${relationId}`],
    validFrom: "2020-01-01T00:00:00Z",
    validTo: null,
    visibility,
    provenance: "thread_history",
    recordedAt: "2026-09-10T15:02:00Z",
  };
}

test("A4 public present is a lossy scene, not a serialization of private current life", () => {
  const publicPlace = placeEpisode();
  const publicFriend = relation({
    relationId: "lrel_public_friend_001",
    partyId: "human_public_friend_001",
    displayName: "Ari Vale",
    visibility: "public",
  });
  const privateCaregiver = relation({
    relationId: "lrel_private_caregiver_001",
    partyId: "human_private_caregiver_001",
    displayName: "Maya's mother",
    visibility: "private",
  });

  const situation = {
    situationId: "sit_public_present_privacy_001",
    threadId: THREAD_ID,
    establishedAt: "2026-09-10T15:10:00Z",
    phase: "at_place",
    location: { kind: "place", placeRef: placeEpisodeRevisionRef(publicPlace) },
    mediatedContext: "Private family Zoom room",
    activity: "Sketching the boats moving through the harbor.",
    reason: "A required caregiver plan governs this moment and contains private care context.",
    participantRefs: [publicFriend.relatedParty.partyId, privateCaregiver.relatedParty.partyId],
    evidenceRefs: ["evt_private_world_evidence_001"],
    sourcePlanRefs: ["lplan_personal_private_001", "lplan_care_private_001"],
    resolution: {
      kind: "care_constraint",
      conflict: true,
      observedDivergence: true,
      governingPlanRef: "lplan_care_private_001",
      constrainedPlanRef: "lplan_personal_private_001",
      summary: "Private care-resolution reasoning must remain in the World/current-life view.",
    },
    provenance: "world_enacted",
  };

  const present = projectCurrentSituationPresent({
    currentSituation: situation,
    placeEpisodes: [publicPlace],
    lifeRelations: [publicFriend, privateCaregiver],
  });

  assert.deepEqual(present, {
    presentVersion: "thread-public-present-v0.1",
    situationId: situation.situationId,
    establishedAt: situation.establishedAt,
    phase: "at_place",
    location: {
      kind: "place",
      place: { displayName: "Harbor café", region: "Haifa District" },
    },
    mediatedContext: null,
    activity: "Sketching the boats moving through the harbor.",
    reason: null,
    participants: ["Ari Vale"],
    depictionMediaId: `media_present_${situation.situationId}`,
  });

  const publicJson = JSON.stringify(present);
  for (const privateValue of [
    "Private family Zoom room",
    "required caregiver plan",
    "Maya's mother",
    "evt_private_world_evidence_001",
    "lplan_personal_private_001",
    "lplan_care_private_001",
    "Private care-resolution reasoning",
    "world_enacted",
  ]) {
    assert.equal(publicJson.includes(privateValue), false, `public present leaked ${privateValue}`);
  }

  const event = normalizeThreadPresentationEventInput({
    streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
    eventId: "event_public_present_privacy_001",
    threadId: THREAD_ID,
    channelId: "channel_public_present_privacy_001",
    occurredAt: situation.establishedAt,
    emittedAt: "2026-09-10T15:10:01Z",
    kind: "present.updated",
    provenanceRef: situation.situationId,
    sourceReferences: [situation.situationId],
    payload: present,
  });
  assert.equal(event.payload.reason, null);
  assert.equal(event.payload.mediatedContext, null);
});