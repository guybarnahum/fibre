import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { evaluateIntrinsicRegulation } from "#core/src/intrinsic-regulation.mjs";
import { droughtOf, unfinishedLearning } from "../src/knowledge.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";

const AT = "2026-11-24T12:00:00.000Z";
const hoursAgo = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();
const gene = (family, orientation, gain) => ({ family, orientation, positions:{ gain, feltThreshold:0, persistence:0 } });
const body = ({ drought = 0, unfinished = [], genes = [] }) => evaluateIntrinsicRegulation({
  perceptFrame:{ asOf:AT, evidenceRefs:["sit_now"], exploration:{ drought },
    ...(unfinished.length ? { mastery:{ unfinished } } : {}) },
  runtimeBaselines:{}, urgeProjection:genes, organismPolicy:DEFAULT_ORGANISM_POLICY });
const hunger = (frame) => frame.drives.find((item) => item.targetRef === "self:appetite")?.pressure ?? 0;
const itch = (frame) => frame.drives.find((item) => item.family === "mastery_itch")?.pressure ?? 0;
const book = (hoursSince) => ({ workRef:"gutenberg:78", hoursSince, evidenceRefs:["hld_tarzan"] });

test("hunger for something new grows with the drought, as sharply as the genome makes it, and learning stills it", () => {
  const store = (learning, readings = []) => ({ listLearning:() => learning, listEngagementReadings:() => readings });
  const dry = droughtOf({ experienceStore:store([]), threadId:"thr_kadir", at:AT });
  const fed = droughtOf({ experienceStore:store([{ learning:"discovery", at:hoursAgo(1) }]), threadId:"thr_kadir", at:AT });
  const half = droughtOf({ experienceStore:store([], [{ reading:"some_new", at:hoursAgo(6) }]), threadId:"thr_kadir", at:AT });
  assert.ok(dry > 0.95 && fed < 0.05, "a week without anything new and an hour after a discovery felt alike");
  assert.ok(half > droughtOf({ experienceStore:store([], [{ reading:"new", at:hoursAgo(6) }]), threadId:"thr_kadir", at:AT }),
    "something only somewhat new stilled the hunger as much as something new");
  const keen = body({ drought:dry, genes:[gene("exploration", "ideas", 0.8)] });
  const mild = body({ drought:dry, genes:[gene("exploration", "ideas", -0.8)] });
  assert.ok(hunger(keen) > hunger(mild), "the inherited gain did not shape the hunger");
  assert.equal(hunger(body({ drought:0 })), 0, "a Thread just fed was hungry");
  assert.match(feltSocialBody(keen).join(" "), /hungry/u, "the hunger was not felt in words");
});

test("a book begun and not gone back to itches: it builds, holds, and slowly lets go; set aside, it does not", () => {
  const genes = [gene("mastery_itch", "interrupted_learning", 0)];
  const [justStopped, aDayLater, aMonthLater] = [0.5, 30, 720].map((hours) => itch(body({ unfinished:[book(hours)], genes })));
  assert.ok(justStopped < aDayLater, "the itch did not build after stopping");
  assert.ok(aMonthLater < aDayLater / 2, "an abandoned book never stopped itching");
  const keen = itch(body({ unfinished:[book(30)], genes:[gene("mastery_itch", "interrupted_learning", 0.8)] }));
  assert.ok(keen > aDayLater, "the inherited gain did not shape the itch");
  const readings = [{ workRef:"gutenberg:78", title:"Tarzan of the Apes", holdingRef:"hld_tarzan", status:"reading", lastReadAt:hoursAgo(30) },
    { workRef:"gutenberg:1", title:"Set aside", holdingRef:"hld_set", status:"set_aside", lastReadAt:hoursAgo(30) }];
  assert.deepEqual(unfinishedLearning({ readings, at:AT }).map((item) => item.title), ["Tarzan of the Apes"],
    "a book it chose to set aside still itched");
  const frame = { ...body({ unfinished:[book(30)], genes }), unfinishedTitles:{ "work:gutenberg:78":"Tarzan of the Apes" } };
  assert.match(feltSocialBody(frame).join(" "), /Tarzan of the Apes/u, "the itch did not name the book on its mind");
});
