import assert from "node:assert/strict";
import test from "node:test";
import { publicPresentPayload, withinPublicKnowledge } from "../src/current-present-projector.mjs";
import { normalizeThreadPresentationEventInput, THREAD_PRESENTATION_STREAM_VERSION }
  from "../../world-kernel/src/thread-presentation-stream-domain.mjs";

const library = { kind:"place", place:{ displayName:"Abrehot Library", region:"Addis Ababa" } };
const home = { kind:"place", place:{ displayName:"Addis Ababa, Ethiopia", region:null } };
const walking = { kind:"transit", from:home.place, to:library.place, progress:0.4 };
const known = (now, home, form = null) => ({ now:{ level:now, form:now === null || now === "city" ? form : null },
  home:{ level:home, form:home === null || home === "country" ? form : null } });
const nothingKnown = { kind:"place", place:null };

test("the public sees where a Thread is only as far as it has told the public, openly or by omission", () => {
  const birth = known("venue", "city");
  assert.deepEqual(withinPublicKnowledge(library, birth), library, "the birth registration hid a venue");
  assert.deepEqual(withinPublicKnowledge(home, birth), home);

  assert.deepEqual(withinPublicKnowledge(library, known("city", "city", "opaque")),
    { kind:"place", place:{ displayName:"Addis Ababa", region:null } }, "a city-only Thread was shown at its venue");
  assert.deepEqual(withinPublicKnowledge(library, known("city", "city", "transparent")),
    { kind:"place", place:{ displayName:"Addis Ababa", region:null }, detailWithheld:true },
    "an open partial disclosure did not say detail is withheld");
  assert.deepEqual(withinPublicKnowledge(home, known("venue", "country", "opaque")),
    { kind:"place", place:{ displayName:"Ethiopia", region:null } }, "a country-only home showed its city");

  assert.deepEqual(withinPublicKnowledge(library, known(null, "city", "transparent")), { kind:"withheld" },
    "an open refusal was not stated");
  assert.deepEqual(withinPublicKnowledge(library, known(null, "city", "opaque")), nothingKnown,
    "withholding by omission was distinguishable from World knowing no place");
  assert.deepEqual(withinPublicKnowledge(home, known("venue", null, "opaque")), nothingKnown,
    "a home withheld by omission was shown");
  assert.deepEqual(withinPublicKnowledge(walking, known(null, "city", "opaque")),
    { kind:"transit", from:null, to:null, progress:0.4 }, "a journey's ends leaked past an omission");
  assert.deepEqual(withinPublicKnowledge(walking, known("city", "city", "opaque")),
    { kind:"transit", from:home.place, to:{ displayName:"Addis Ababa", region:null }, progress:0.4 });
});

test("history is read within what the public knows now, and a v0.3 present may withhold openly", () => {
  const stored = { presentVersion:"thread-public-present-v0.2", situationId:"sit_library", establishedAt:"2026-11-22T09:00:00.000Z",
    phase:"at_place", location:library, mediatedContext:null, outwardActivity:"reading", reason:null, participants:[],
    depictionMediaId:"media_present_sit_library" };
  assert.deepEqual(publicPresentPayload(stored, known(null, "city", "transparent")).location, { kind:"withheld" },
    "a present stored before the Thread withheld its whereabouts still showed the library");
  assert.equal(publicPresentPayload(stored, known(null, "city", "transparent")).outwardActivity, "reading",
    "withholding where it is hid what it was visibly doing");
  const event = (payload) => normalizeThreadPresentationEventInput({ streamVersion:THREAD_PRESENTATION_STREAM_VERSION,
    eventId:"present_sit_library", threadId:"thr_kadir", channelId:"presentation:thr_kadir", occurredAt:stored.establishedAt,
    emittedAt:stored.establishedAt, kind:"present.updated", provenanceRef:"sit_library", sourceReferences:["sit_library"], payload });
  assert.equal(event({ ...stored, presentVersion:"thread-public-present-v0.3", location:{ kind:"withheld" } }).payload.location.kind,
    "withheld");
  assert.throws(() => event({ ...stored, location:{ kind:"withheld" } }), /v0.3/u, "a v0.2 present could withhold");
});
