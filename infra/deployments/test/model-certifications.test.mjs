import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_CERTIFICATIONS, recordCertifications, uncertifiedRoutes } from "../model-certifications.mjs";

const gemma = { kind:"ai.reasoning", provider:"cloudflare", config:{ model:"@cf/google/gemma-4-26b-a4b-it" } };
const sol = { kind:"ai.reasoning", provider:"openai", config:{ model:"gpt-5.6-sol" } };
const certified = (verdict, promptVersion = 8) => ({ prompt:"experience.consolidation", promptVersion,
  provider:"cloudflare", model:"@cf/google/gemma-4-26b-a4b-it", verdict });
const versions = { "experience.consolidation":8 };
const routes = (record) => uncertifiedRoutes({ record, promptVersion:(job) => versions[job] ?? null,
  services:{ "world-kernel":{ encounter:sol, "experience.consolidation":gemma } } }).map((item) => item.prompt);

test("a job thinks with a model of its own only once that model has passed for the job's current prompt", () => {
  assert.deepEqual(routes(EMPTY_CERTIFICATIONS), ["experience.consolidation"], "an uncertified model was allowed to carry a job");
  assert.deepEqual(routes(recordCertifications(EMPTY_CERTIFICATIONS, [certified("fail")])), ["experience.consolidation"],
    "a model that failed was allowed to carry the job");
  assert.deepEqual(routes(recordCertifications(EMPTY_CERTIFICATIONS, [certified("pass", 7)])), ["experience.consolidation"],
    "a pass for an earlier version of the prompt still counted");
  assert.deepEqual(routes(recordCertifications(EMPTY_CERTIFICATIONS, [certified("pass")])), [],
    "a certified model was refused, or the port's default was held to a certification");
});

test("a new run replaces only the certification of the same prompt version and model", () => {
  const earlier = recordCertifications(EMPTY_CERTIFICATIONS, [certified("pass", 7), certified("fail")]);
  const record = recordCertifications(earlier, [certified("pass")]);
  assert.deepEqual(record.certifications.map((item) => [item.promptVersion, item.verdict]), [[8, "pass"], [7, "pass"]],
    "a run lost an earlier version's record or kept a superseded verdict");
});
