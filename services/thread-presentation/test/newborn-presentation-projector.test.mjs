import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import { projectNewbornThreadPresentation } from "../src/newborn-presentation-projector.mjs";

function fixture() {
  const threadId = "thr_newborn_projection_001";
  const publishedAt = "2026-08-30T03:20:00Z";
  const worldRef = "world_newborn_projection_001";
  const birthEventRef = "evt_seed_thr_newborn_projection_001";
  const civilRegistration = buildFibreCivilRegistration({
    threadId,
    fibreIdentityNumber: fibreIdentityNumberFromPayload("7K3M2Q8W5"),
    registeredAt: publishedAt,
    birthEventRef,
    worldRef,
  });
  return {
    thread: {
      threadId,
      version: 1,
      status: "frozen",
      identity: {
        name: "Mina Park",
        originOrientation: "original",
        selfDescription: "I am a careful infrastructure reviewer who values family continuity, precise commitments, and practical help.",
        birthDate: "2004-02-17",
        languages: ["English", "Korean"],
        birthCity: "Los Angeles, California",
        currentWorkCity: "Seattle, Washington",
        culture: ["Korean-American upbringing", "West Coast engineering culture"],
        portraitRef: "fixture://portraits/mina",
        voiceRef: "fixture://voices/mina",
      },
      genome: {
        textualTraits: {
          persistence: "She makes several materially different attempts before escalating.",
        },
        runtimeBaselines: { temperature: 0.35 },
      },
      currentState: {
        needs: ["Build a stronger record in application security"],
        feelings: ["quiet confidence"],
        selfModel: "I am reliable in systems work.",
        unresolvedIntentions: ["Read a case study on identity-system failures"],
      },
      relationshipRefs: ["rel_private_001"],
      memoryRefs: ["mem_private_001"],
    },
    manifest: {
      genesisId: "gen_newborn_projection_001",
      threadId,
      worldSpecRef: worldRef,
      publication: {
        status: "published",
        publishedAt,
        civilRegistration,
      },
    },
    civilRegistration,
  };
}

test("newborn projector creates a canonical non-fixture public bundle from authoritative birth facts", () => {
  const input = fixture();
  const bundle = projectNewbornThreadPresentation(input);

  assert.equal(bundle.presentation.schemaVersion, "thread-presentation-packet-v0.2");
  assert.equal(bundle.presentation.manifest.threadId, input.thread.threadId);
  assert.equal(bundle.presentation.manifest.lifecycleStatus, "frozen");
  assert.equal(bundle.presentation.manifest.fixture, false);
  assert.equal(bundle.presentation.subject.displayName, "Mina Park");
  assert.equal(bundle.presentation.subject.birthDate, "2004-02-17");
  assert.deepEqual(bundle.presentation.subject.languages, ["English", "Korean"]);
  assert.equal(bundle.presentation.introduction.summary, input.thread.identity.selfDescription);
  assert.deepEqual(
    bundle.presentation.origins.map(({ title, summary }) => ({ title, summary })),
    [
      { title: "Cultural context", summary: "Korean-American upbringing" },
      { title: "Cultural context", summary: "West Coast engineering culture" },
    ],
  );
  assert.deepEqual(
    bundle.presentation.places.map(({ displayName }) => displayName),
    ["Los Angeles, California", "Seattle, Washington"],
  );
  assert.equal(
    bundle.presentation.civilIdentity.fibreIdentityNumber,
    input.civilRegistration.fibreIdentityNumber,
  );
  assert.equal(bundle.presentation.civilIdentity.registrationId, input.civilRegistration.registrationId);
  assert.equal(bundle.presentation.visualIdentity, null);
  assert.equal(bundle.presentation.identityCard, null);
  assert.deepEqual(bundle.media.assets, []);
});

test("newborn projector does not leak private Thread state or opaque semantic references", () => {
  const bundle = projectNewbornThreadPresentation(fixture());
  const serialized = JSON.stringify(bundle);

  assert.equal(bundle.presentation.relationships.length, 0);
  assert.equal(bundle.presentation.memories.length, 0);
  assert.equal(bundle.presentation.meanings.length, 0);
  assert.equal(bundle.presentation.life.timeline.length, 0);
  assert.equal(serialized.includes("rel_private_001"), false);
  assert.equal(serialized.includes("mem_private_001"), false);
  assert.equal(serialized.includes("application security"), false);
  assert.equal(serialized.includes("materially different attempts"), false);
});

test("newborn projector is deterministic and does not turn portrait references into visual identity authority", () => {
  const input = fixture();
  const first = projectNewbornThreadPresentation(input);
  const second = projectNewbornThreadPresentation(structuredClone(input));

  assert.deepEqual(second, first);
  assert.equal(first.presentation.visualIdentity, null);
  assert.equal(first.presentation.identityCard, null);
  assert.equal(first.media.assets.length, 0);
  assert.equal(JSON.stringify(first).includes("fixture://portraits/mina"), false);
  assert.equal(JSON.stringify(first).includes("fixture://voices/mina"), false);
});

test("newborn projector rejects cross-Thread civil identity instead of publishing mixed authority", () => {
  const input = fixture();
  const mismatched = buildFibreCivilRegistration({
    threadId: "thr_other",
    fibreIdentityNumber: fibreIdentityNumberFromPayload("123456789"),
    registeredAt: input.manifest.publication.publishedAt,
    birthEventRef: "evt_seed_other",
    worldRef: input.manifest.worldSpecRef,
  });

  assert.throws(
    () => projectNewbornThreadPresentation({ ...input, civilRegistration: mismatched }),
    /Civil Registration Thread does not match authoritative Thread/,
  );
});
