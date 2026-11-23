import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { evaluateIntrinsicRegulation } from "#core/src/intrinsic-regulation.mjs";
import { competenceLevel, noveltyLevel, unfinishedLearning } from "../src/knowledge.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";

// Learning moves the Body through the urges it already has (ADR-0041): the
// inherited `exploration` urge's novelty, and `mastery_itch`. World measures
// the levels; the regulation core and the genome make them hunger or
// satisfaction, as for every other urge.
const AT = "2026-11-24T12:00:00.000Z";
const hoursAgo = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();
const gene = (family, orientation, gain) => ({ family, orientation, positions:{ gain, feltThreshold:0, persistence:0 } });
const body = ({ novelty, competence = 0, unfinished = [], genes = [] }) => evaluateIntrinsicRegulation({
  perceptFrame:{ asOf:AT, evidenceRefs:["sit_now"], exploration:{ novelty },
    ...(competence > 0 || unfinished.length ? { mastery:{ competence, unfinished } } : {}) },
  runtimeBaselines:{}, urgeProjection:genes, organismPolicy:DEFAULT_ORGANISM_POLICY });
const noveltyDrive = (frame) => frame.drives.find((item) => item.targetRef === "world:novelty");
const itch = (frame) => frame.drives.find((item) => item.family === "mastery_itch" && item.targetRef.startsWith("work:"))?.pressure ?? 0;
const book = (hoursSince) => ({ workRef:"gutenberg:78", hoursSince, evidenceRefs:["hld_tarzan"] });
const store = (learning, readings = []) => ({ listLearning:() => learning, listEngagementReadings:() => readings });

test("novelty is one Body level: long without anything new it is hunger, as sharp as the genome makes it; just after a discovery it is a lift", () => {
  const dry = noveltyLevel({ experienceStore:store([]), threadId:"thr_kadir", at:AT });
  const fed = noveltyLevel({ experienceStore:store([{ learning:"discovery", at:hoursAgo(1) }]), threadId:"thr_kadir", at:AT });
  const partly = noveltyLevel({ experienceStore:store([], [{ reading:"some_new", at:hoursAgo(1) }]), threadId:"thr_kadir", at:AT });
  assert.ok(fed > partly && partly > dry, "a discovery, something somewhat new and nothing new freshened novelty alike");
  const keen = noveltyDrive(body({ novelty:dry, genes:[gene("exploration", "ideas", 0.8)] }));
  const mild = noveltyDrive(body({ novelty:dry, genes:[gene("exploration", "ideas", -0.8)] }));
  assert.ok(keen.pressure > mild.pressure, "the inherited gain did not shape the hunger");
  assert.match(feltSocialBody(body({ novelty:dry, genes:[gene("exploration", "ideas", 0)] })).join(" "), /hungry/u,
    "hunger for something new was not felt in words");
  const lifted = body({ novelty:fed, genes:[gene("exploration", "ideas", 0)] });
  assert.ok(noveltyDrive(lifted).attained && noveltyDrive(lifted).pressure === 0, "a fresh discovery did not still the hunger");
  assert.match(feltSocialBody(lifted).join(" "), /lifted|lit you up/u, "the lift of a discovery was not felt");
  const persistent = noveltyLevel({ experienceStore:store([{ learning:"discovery", at:hoursAgo(20) }]), threadId:"thr_kadir", at:AT, persistence:0.8 });
  const fleeting = noveltyLevel({ experienceStore:store([{ learning:"discovery", at:hoursAgo(20) }]), threadId:"thr_kadir", at:AT, persistence:-0.8 });
  assert.ok(persistent > fleeting, "an inherited persistence did not keep the lift longer");
});

test("mastery: a book begun and not gone back to itches as the genome makes it; going deeper satisfies", () => {
  const genes = [gene("mastery_itch", "interrupted_learning", 0)];
  const [justStopped, aDayLater, aMonthLater] = [0.5, 30, 720].map((hours) => itch(body({ novelty:0.5, unfinished:[book(hours)], genes })));
  assert.ok(justStopped < aDayLater, "the itch did not build after stopping");
  assert.ok(aMonthLater < aDayLater / 2, "an abandoned book never stopped itching");
  assert.ok(itch(body({ novelty:0.5, unfinished:[book(30)], genes:[gene("mastery_itch", "interrupted_learning", 0.8)] })) > aDayLater,
    "the inherited gain did not shape the itch");
  const readings = [{ workRef:"gutenberg:78", title:"Tarzan of the Apes", holdingRef:"hld_tarzan", status:"reading", lastReadAt:hoursAgo(30) },
    { workRef:"gutenberg:1", title:"Set aside", holdingRef:"hld_set", status:"set_aside", lastReadAt:hoursAgo(30) }];
  assert.deepEqual(unfinishedLearning({ readings, at:AT }).map((item) => item.title), ["Tarzan of the Apes"],
    "a book it chose to set aside still itched");
  const itching = { ...body({ novelty:0.5, unfinished:[book(30)], genes }), unfinishedTitles:{ "work:gutenberg:78":"Tarzan of the Apes" } };
  assert.match(feltSocialBody(itching).join(" "), /Tarzan of the Apes/u, "the itch did not name the book on its mind");
  const competence = competenceLevel({ experienceStore:store([{ learning:"depth", at:hoursAgo(1) }]), threadId:"thr_kadir", at:AT });
  const satisfied = body({ novelty:0.5, competence, genes });
  assert.ok(satisfied.drives.some((item) => item.family === "mastery_itch" && item.attained), "going deeper did not satisfy the mastery urge");
  assert.match(feltSocialBody(satisfied).join(" "), /satisf/u, "the satisfaction of going deeper was not felt");
  assert.equal(competenceLevel({ experienceStore:store([{ learning:"discovery", at:hoursAgo(1) }]), threadId:"thr_kadir", at:AT }), 0,
    "a discovery counted as going deeper");
});
