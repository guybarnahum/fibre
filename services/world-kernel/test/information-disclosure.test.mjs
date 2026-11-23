import assert from "node:assert/strict";
import test from "node:test";
import { INFORMATION_ITEM_KINDS, knowledgeOf, normalizeDisclosure, PUBLIC_AUDIENCE, publicWhereaboutsOf }
  from "../src/information-disclosure.mjs";

const HABIBA = "thr_habiba", KADIR = "thr_kadir";
const told = (itemKind, audience, extent, { version = null, form = null, at = "2026-11-24T10:00:00.000Z" } = {}) =>
  normalizeDisclosure({ aboutThreadId:HABIBA, itemKind, audience, extent, version, form, decidedBy:HABIBA, occurredAt:at,
    channel:audience === PUBLIC_AUDIENCE ? "registry" : "spoken", reason:"Her own words." });

test("every item passes through one disclosure rule: no kind has a path of its own", () => {
  for (const itemKind of Object.keys(INFORMATION_ITEM_KINDS)) {
    const [least, ...rest] = INFORMATION_ITEM_KINDS[itemKind].versions;
    const fullest = rest.at(-1);
    const history = [told(itemKind, KADIR, "partial", { version:least, form:"transparent" }),
      told(itemKind, KADIR, "full", { at:"2026-11-24T11:00:00.000Z" }),
      told(itemKind, KADIR, "none", { form:"transparent", at:"2026-11-24T12:00:00.000Z" })];
    assert.equal(knowledgeOf(itemKind, KADIR, history).level, fullest, `${itemKind}: a person told was made to forget`);
    assert.equal(knowledgeOf(itemKind, "thr_hassan", history).level, null, `${itemKind}: someone never told came to know`);
  }
});

test("the public knows what the registry was last told, from birth until the Thread itself decides", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(publicWhereaboutsOf([])).map(([item, known]) => [item, known.level])),
    { home:"city", now:"venue" }, "the birth registration changed");
  const lowered = publicWhereaboutsOf([
    told("whereabouts.now", PUBLIC_AUDIENCE, "partial", { version:"city", form:"opaque" }),
    told("whereabouts.now", PUBLIC_AUDIENCE, "none", { form:"transparent", at:"2026-11-24T11:00:00.000Z" }),
  ]);
  assert.deepEqual([lowered.now.level, lowered.now.form], [null, "transparent"], "the registry's latest telling did not stand");
  assert.equal(publicWhereaboutsOf([told("whereabouts.home", PUBLIC_AUDIENCE, "full")]).home.level, "city",
    "the registry published more than a home's city");
  assert.throws(() => told("whereabouts.home", PUBLIC_AUDIENCE, "partial", { version:"area", form:"opaque" }), /at most to city/u);
  assert.throws(() => normalizeDisclosure({ aboutThreadId:HABIBA, itemKind:"whereabouts.now", audience:PUBLIC_AUDIENCE,
    extent:"none", form:"opaque", channel:"registry", decidedBy:"thr_operator", occurredAt:"2026-11-24T10:00:00.000Z" }),
  /only the Thread/u, "someone other than the Thread decided its disclosure");
});
