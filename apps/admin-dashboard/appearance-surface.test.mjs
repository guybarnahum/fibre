import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html=await readFile(new URL("./index.html",import.meta.url),"utf8");
const css=await readFile(new URL("./appearance-coverage.css",import.meta.url),"utf8");
const populationUi=await readFile(new URL("./thread-population-ui.js",import.meta.url),"utf8");
const appearanceUi=await readFile(new URL("./appearance-coverage-ui.js",import.meta.url),"utf8");

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


test("Population Lab experiment queue sits before recalibration candidates",()=>{
  const experiments=html.indexOf('class="appearance-experiments-section"');
  const migrations=html.indexOf('class="appearance-migrations-section"');
  assert.ok(experiments>=0&&migrations>experiments,"experiment queue is not above Threads needing recalibration");
});


test("Appearance explains the calibration workflow in the operator surface",()=>{
  assert.match(html,/id="appearance-help"[^>]*>How it works<\/button>/u,
    "Appearance lost its workflow help entry");
  assert.match(html,/id="appearance-help-dialog"/u,
    "Appearance lost its workflow help dialog");
  assert.match(html,/Find what needs work/u);
  assert.match(html,/Compare before and after/u);
  assert.match(html,/Admit and migrate/u);
  assert.match(html,/Adding a group that is not in the model yet/u);
  assert.doesNotMatch(html,/Compare with baseline/u,
    "Appearance comparison action became verbose again");
});


test("Appearance keeps admitted baselines in immutable calibration history",()=>{
  assert.match(html,/id="appearance-calibration-history"/u,
    "Appearance lost admitted calibration history");
  assert.match(html,/Calibration history/u);
  const start=appearanceUi.indexOf("function renderCalibrationHistory()");
  const end=appearanceUi.indexOf("function renderAppearanceExperiments()",start);
  assert.ok(start>=0&&end>start,"calibration history renderer is missing");
  const renderer=appearanceUi.slice(start,end);
  assert.doesNotMatch(renderer,/trash-can|Delete experiment/u,
    "historical calibration rows became deletable");
  assert.match(renderer,/label:"Compare"/u,
    "historical baselines lost comparison");
  assert.match(renderer,/label:"Copy JSON"/u,
    "historical baselines lost reusable JSON export");
  assert.match(css,/\.appearance-compare-action[^\n]*white-space:nowrap/u,
    "Compare button can wrap icon and label");
});
