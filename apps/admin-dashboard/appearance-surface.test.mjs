import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html=await readFile(new URL("./index.html",import.meta.url),"utf8");
const css=await readFile(new URL("./appearance-coverage.css",import.meta.url),"utf8");
const populationUi=await readFile(new URL("./thread-population-ui.js",import.meta.url),"utf8");

test("Appearance is a top-level Admin surface and cannot leak into operator views",()=>{
  assert.match(html,/id="appearance-nav-link"[^>]*href="\/appearance"/u);
  const viewSwitch=html.match(/<div class="view-switch"[\s\S]*?<\/div>/u)?.[0]??"";
  assert.doesNotMatch(viewSwitch,/view-appearance/u,"Appearance leaked into Activity/Birth Center/Threads/Stillborn switch");
  assert.match(css,/\.appearance-coverage-view\[hidden\]\s*\{\s*display:none\s*\}/u,
    "Appearance panel can override the hidden attribute");

  const pager=html.indexOf('class="activity-pager"');
  const appearance=html.indexOf('id="appearance-view" class="panel appearance-coverage-view"');
  assert.ok(pager>=0&&appearance>pager&&html.slice(pager,appearance).includes("</section>"),
    "Appearance remained inside the Activity workspace");
});

test("Threads exposes one generic migration filter, not Appearance-specific controls",()=>{
  assert.match(html,/id="thread-population-filter-migration"/u);
  assert.doesNotMatch(html,/thread-population-filter-appearance/u);
  assert.doesNotMatch(html,/thread-population-filter-identity/u);
  assert.doesNotMatch(html,/thread-stat-appearance-migrations/u);
  assert.doesNotMatch(html,/thread-stat-identity-migrations/u);
});


test("Threads module has no hard references to removed Appearance controls",()=>{
  assert.doesNotMatch(populationUi,/threadPopulationFilterAppearance/u);
  assert.doesNotMatch(populationUi,/threadPopulationFilterIdentity/u);
  assert.doesNotMatch(populationUi,/threadHasMigrationDomain/u);
  assert.doesNotMatch(populationUi,/#view-appearance/u);
});
