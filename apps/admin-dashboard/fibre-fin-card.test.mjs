import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("./fibre-fin-card.js", import.meta.url);
const stylesheetUrl = new URL("./fibre-fin-card.css", import.meta.url);

test("FIN card web component is compatible with style-src self CSP", async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(stylesheetUrl, "utf8"),
  ]);

  assert.doesNotMatch(component, /<style[\s>]/u, "component must not inject inline style blocks");
  assert.doesNotMatch(component, /\.style\./u, "component must not mutate inline styles");
  assert.match(component, /<link rel="stylesheet" href="\$\{STYLESHEET_HREF\}">/u);
  assert.match(stylesheet, /:host\(\[data-side="back"\]\) \.inner/u);
  assert.match(stylesheet, /rotateY\(180deg\)/u);
});

test("FIN card rests at physical-card scale and briefly enlarges after interaction", async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(stylesheetUrl, "utf8"),
  ]);

  assert.match(stylesheet, /width:min\(330px,100%\)/u);
  assert.match(stylesheet, /:host\(\[data-interacting="true"\]\) button/u);
  assert.match(stylesheet, /transform:scale\(1\.2\)/u);
  assert.match(component, /this\.dataset\.interacting = "true"/u);
  assert.match(component, /}, 1600\);/u);
  assert.match(component, /delete this\.dataset\.interacting/u);
});
